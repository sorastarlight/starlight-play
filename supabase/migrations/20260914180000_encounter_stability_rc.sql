-- Encounter stability: result hold from settlement, cancelled no-join window,
-- Director settlement without a Play tab, idempotent prepare/throw retries.
-- Does not change catch rates, ball/berry/honey math, spawn, or phase durations.

create or replace function private.round_on_play(r public.encounter_rounds)
returns boolean
language plpgsql
stable
as $$
declare
  hold interval := interval '12 seconds';
  unresolved_keep interval := interval '2 minutes';
  ph text;
begin
  if r is null then
    return false;
  end if;
  if r.paused_at is not null then
    return true;
  end if;
  if coalesce(r.cancelled, false) then
    return now() < coalesce(r.updated_at, r.started_at, now()) + hold;
  end if;
  ph := private.round_phase(r);
  if coalesce(r.hidden, false) and (coalesce(r.resolved, false) or ph in ('reveal', 'closed')) then
    return false;
  end if;
  if coalesce(r.resolved, false) then
    return now() < coalesce(r.updated_at, (r.deadlines->>'reveal')::timestamptz, r.ends_at, now()) + hold;
  end if;
  if r.deadlines is not null then
    return now() < coalesce((r.deadlines->>'reveal')::timestamptz, r.ends_at, '-infinity'::timestamptz) + unresolved_keep;
  end if;
  return ph <> 'closed';
end;
$$;

create or replace function private.director_tick_if_due()
returns void
language plpgsql
as $$
declare
  last timestamptz;
begin
  perform private.settle_due_rounds();
  select last_tick_at into last from private.stream_director where id = 1;
  if last is null or last < now() - interval '10 seconds' then
    perform private.director_tick();
  end if;
end;
$$;

create or replace function private.public_round_json(r encounter_rounds)
returns jsonb
language plpgsql
stable
as $function$
declare
  ph text; participants int; prepared int; thrown int; bait_count int; honey_calc jsonb; activity jsonb; honey jsonb; catchers jsonb; throwers jsonb; settled boolean; species_types text[];
  shown_level int;
begin
  if r is null then return null; end if;
  ph := private.round_phase(r);
  select s.types into species_types from public.species s where s.dex = r.dex;
  select count(*)::int, count(*) filter (where prep is not null)::int, count(*) filter (where ball is not null)::int, count(*) filter (where prep = 'bait')::int
    into participants, prepared, thrown, bait_count from public.encounter_players where round_id = r.id;
  honey_calc := private.capture_honey_modifier(bait_count, participants);
  select coalesce(jsonb_agg(row_to_json(x)::jsonb), '[]'::jsonb) into activity from (
    select a.display_name as name, a.kind, a.item, a.created_at as at from public.encounter_activity a where a.round_id = r.id order by a.created_at desc, a.id desc limit 40) x;
  select coalesce(jsonb_agg(jsonb_build_object('name', coalesce(private.trainer_label(ep.user_id), 'Trainer')) order by coalesce(private.trainer_label(ep.user_id), 'Trainer')), '[]'::jsonb)
    into honey from public.encounter_players ep where ep.round_id = r.id and ep.prep = 'bait';
  select coalesce(jsonb_agg(jsonb_build_object('name', coalesce(private.trainer_label(ep.user_id), 'Trainer'), 'ball', ep.ball) order by coalesce(private.trainer_label(ep.user_id), 'Trainer')), '[]'::jsonb)
    into throwers from public.encounter_players ep where ep.round_id = r.id and ep.ball is not null;
  select exists (select 1 from public.encounter_players ep where ep.round_id = r.id and ep.result is not null) into settled;
  if settled then
    select coalesce(jsonb_agg(jsonb_build_object('name', coalesce(private.trainer_label(ep.user_id), 'Trainer'), 'ball', ep.ball) order by coalesce(private.trainer_label(ep.user_id), 'Trainer')), '[]'::jsonb)
      into catchers from public.encounter_players ep where ep.round_id = r.id and coalesce(ep.caught, false);
  else catchers := '[]'::jsonb; end if;
  shown_level := coalesce(nullif(r.pokemon->>'level', '')::int, private.encounter_pokemon_level(r.dex, r.id));
  if shown_level is not null and shown_level < 1 then shown_level := null; end if;
  return jsonb_build_object(
    'id', r.id, 'source', r.source, 'phase', ph, 'overlayPhase', r.phase, 'paused', private.round_paused(r), 'hidden', r.hidden, 'cancelled', r.cancelled, 'resolved', r.resolved, 'pausedAt', r.paused_at,
    'pausedForBreak', private.director_has_reason(coalesce(r.pause_reasons, '[]'::jsonb), 'AD'),
    'pauseReasons', coalesce(r.pause_reasons, '[]'::jsonb),
    'triggerSource', r.trigger_source,
    'dex', r.dex, 'name', r.name, 'variant', r.variant, 'gender', r.gender, 'level', shown_level, 'types', coalesce(to_jsonb(species_types), '[]'::jsonb),
    'location', coalesce(nullif(r.pokemon->>'location', ''), private.lgpe_habitat(r.dex)), 'startedAt', r.started_at, 'endsAt', private.phase_display_ends(r, ph), 'deadlines', r.deadlines,
    'updatedAt', r.updated_at, 'serverNow', now(),
    'participants', participants, 'prepared', prepared, 'thrown', thrown, 'honeyContributors', bait_count, 'honeyParticipants', participants,
    'honeyMultiplier', (honey_calc->>'multiplier')::numeric, 'baitBonusPercent', round(100 * ((honey_calc->>'multiplier')::numeric - 1), 1),
    'lastAction', r.last_action, 'activity', activity, 'honeyTrainers', coalesce(honey, '[]'::jsonb), 'throwers', coalesce(throwers, '[]'::jsonb), 'catchers', coalesce(catchers, '[]'::jsonb),
    'results', case when settled then (select jsonb_build_object('caught', count(*) filter (where coalesce(caught, false))::int, 'escaped', count(*) filter (where result = 'Escaped')::int, 'noThrow', count(*) filter (where coalesce(result, '') = 'No throw')::int, 'catchers', coalesce(catchers, '[]'::jsonb)) from public.encounter_players where round_id = r.id) else null end
  );
end;
$function$;

create or replace function public.play_prepare(p_item text, p_round_id uuid default null::uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  r public.encounter_rounds;
  uid uuid := auth.uid();
  twitch_user text;
  twitch_name text;
  mine public.encounter_players%rowtype;
  chosen text := coalesce(nullif(btrim(p_item), ''), 'none');
  who text;
  msg text;
  line text;
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  if not private.is_prep_item(chosen) then
    raise exception 'Use a Berry, Honey, or skip during the item phase.';
  end if;
  r := private.load_play_round(p_round_id);
  if private.round_paused(r) then
    raise exception 'The encounter is paused.';
  end if;
  if not private.prepare_action_ok(r) then
    raise exception 'That phase has ended.';
  end if;
  select * into mine from public.encounter_players
    where round_id = r.id and user_id = uid for update;
  if not found then
    raise exception 'You had to join this encounter during its join window.';
  end if;
  if mine.prep is not null then
    if mine.prep = chosen then
      if chosen = 'none' then
        msg := 'You chose not to use an item. Please wait while the other Trainers make their choices.';
      elsif chosen = 'bait' then
        msg := 'You have contributed Honey! Please wait while the other Trainers make their choices.';
      else
        msg := 'You have selected ' || private.item_label(chosen)
          || '! Please wait while the other Trainers make their choices.';
      end if;
      return private.play_snapshot(uid, r.id) || jsonb_build_object('ok', true, 'message', msg);
    end if;
    raise exception 'That item was already used.';
  end if;
  if mine.ball is not null or mine.result is not null then
    raise exception 'Your choices for this encounter are already locked in.';
  end if;
  if chosen <> 'none' then
    perform private.spend_bag_item(uid, chosen);
  end if;
  if r.source = 'mixitup' and chosen <> 'none' then
    select c.twitch_user_id, c.twitch_login into twitch_user, twitch_name from private.current_twitch() c;
    if twitch_user is null or twitch_name is null then
      raise exception 'Sign in with Twitch to use items on the live encounter.';
    end if;
    perform private.enqueue_stream_command('prepare', jsonb_build_object('user', twitch_user, 'name', twitch_name, 'item', private.stream_prep_item(chosen)));
  end if;
  update public.encounter_players
    set prep = chosen, prep_at = now()
    where round_id = r.id and user_id = uid;
  who := coalesce(private.trainer_label(uid), 'A trainer');
  if chosen = 'none' then
    perform private.log_activity(r.id, uid, 'prepared', 'none');
    line := who || ' is ready.';
    msg := 'You chose not to use an item. Please wait while the other Trainers make their choices.';
  elsif chosen = 'bait' then
    perform private.log_activity(r.id, uid, 'prepared', chosen);
    line := who || ' added Honey to the encounter!';
    msg := 'You have contributed Honey! Please wait while the other Trainers make their choices.';
  else
    perform private.log_activity(r.id, uid, 'prepared', chosen);
    line := who || ' has prepared an item!';
    msg := 'You have selected ' || private.item_label(chosen)
      || '! Please wait while the other Trainers make their choices.';
  end if;
  update public.encounter_rounds
    set last_action = line, updated_at = now()
    where id = r.id;
  return private.play_snapshot(uid, r.id) || jsonb_build_object('ok', true, 'message', msg);
end;
$function$;

create or replace function public.play_throw(p_item text, p_round_id uuid default null::uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  r public.encounter_rounds;
  uid uuid := auth.uid();
  twitch_user text;
  twitch_name text;
  stream_item text;
  mine public.encounter_players%rowtype;
  who text;
  line text;
  borrowed boolean := false;
  chosen text := p_item;
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  if chosen = 'standard' then
    chosen := 'pokeball';
    borrowed := true;
  end if;
  if not private.is_throw_ball(chosen) then
    raise exception 'Choose a Poké Ball from your bag.';
  end if;
  r := private.load_play_round(p_round_id);
  if private.round_paused(r) then
    raise exception 'The encounter is paused.';
  end if;
  if not private.throw_action_ok(r) then
    raise exception 'That phase has ended.';
  end if;
  select * into mine from public.encounter_players
    where round_id = r.id and user_id = uid for update;
  if not found then
    raise exception 'You had to join this encounter during its join window.';
  end if;
  if mine.ball is not null then
    if mine.ball = chosen then
      return private.play_snapshot(uid, r.id) || jsonb_build_object(
        'ok', true,
        'message', 'You have chosen ' || private.item_label(chosen)
          || '! Please wait while the other Trainers make their choices.'
      );
    end if;
    raise exception 'That item was already used.';
  end if;
  if mine.result is not null then
    raise exception 'This encounter already has results.';
  end if;
  if coalesce(private.bag_item_qty(uid, chosen), 0) < 1 then
    if chosen = 'pokeball' and coalesce(private.throwable_total(uid), 0) < 1 then
      borrowed := true;
    else
      raise exception 'You no longer have that item available.';
    end if;
  end if;

  stream_item := private.stream_throw_item(chosen);
  if r.source = 'mixitup' then
    select c.twitch_user_id, c.twitch_login into twitch_user, twitch_name from private.current_twitch() c;
    if twitch_user is null or twitch_name is null then
      raise exception 'Sign in with Twitch to throw on the live encounter.';
    end if;
    perform private.enqueue_stream_command('throw', jsonb_build_object('user', twitch_user, 'name', twitch_name, 'item', stream_item));
  end if;

  who := coalesce(private.trainer_label(uid), 'A trainer');
  line := who || ' has chosen ' || private.a_or_an(private.item_label(chosen)) || ' and is ready to throw!';

  update public.encounter_players
    set ball = chosen,
        ball_at = now(),
        result_reason = case when borrowed then 'standard_throw' else result_reason end
    where round_id = r.id and user_id = uid;
  perform private.log_activity(r.id, uid, 'selected', chosen);
  update public.play_console_log l
    set message = line
    where l.round_id = r.id and l.user_id = uid and l.kind = 'selected'
      and coalesce(l.message, '') = '';
  update public.encounter_rounds
    set last_action = line, updated_at = now()
    where id = r.id;
  return private.play_snapshot(uid, r.id) || jsonb_build_object(
    'ok', true,
    'message', 'You have chosen ' || private.item_label(chosen)
      || '! Please wait while the other Trainers make their choices.'
  );
end;
$function$;

notify pgrst, 'reload schema';
