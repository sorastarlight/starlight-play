-- Pause/resume live encounters, gift +1 items to joiners, and clear the public console.

alter table public.encounter_rounds
  add column if not exists paused_at timestamptz;

create or replace function private.round_paused(r public.encounter_rounds)
returns boolean
language sql
stable
as $$
  select r is not null and r.paused_at is not null;
$$;

create or replace function private.round_phase(r public.encounter_rounds)
returns text
language plpgsql
stable
as $$
declare
  clk timestamptz;
begin
  if r is null or r.cancelled then
    return 'closed';
  end if;
  if r.deadlines is null then
    return coalesce(r.phase, 'closed');
  end if;
  clk := coalesce(r.paused_at, now());
  if clk < (r.deadlines->>'join')::timestamptz then return 'join'; end if;
  if clk < (r.deadlines->>'prepare')::timestamptz then return 'prepare'; end if;
  if clk < (r.deadlines->>'throw')::timestamptz then return 'throw'; end if;
  if clk < (r.deadlines->>'reveal')::timestamptz then return 'reveal'; end if;
  return 'closed';
end;
$$;

create or replace function private.phase_display_ends(r public.encounter_rounds, ph text)
returns timestamptz
language sql
stable
as $$
  select case
    when r.paused_at is not null
      then private.phase_ends_at(r, ph) + (now() - r.paused_at)
    else private.phase_ends_at(r, ph)
  end;
$$;

create or replace function private.settle_if_needed(r public.encounter_rounds)
returns public.encounter_rounds
language plpgsql
as $$
declare
  rec public.encounter_players%rowtype;
  rules jsonb;
  bait_count int;
  player_count int;
  shared numeric;
  v_odds numeric;
  v_roll numeric;
  v_caught boolean;
  pending boolean;
  clk timestamptz;
begin
  if r is null then
    return r;
  end if;
  select exists (
    select 1 from public.encounter_players ep
    where ep.round_id = r.id and ep.result is null
  ) into pending;
  if r.cancelled and not pending then
    return r;
  end if;
  clk := coalesce(r.paused_at, now());
  if not r.cancelled and (r.deadlines is null or clk < (r.deadlines->>'throw')::timestamptz) then
    return r;
  end if;
  if r.resolved and not pending then
    return r;
  end if;

  rules := coalesce(r.rules, private.game_settings());
  select count(*)::int, count(*) filter (where prep = 'bait')::int
    into player_count, bait_count
    from public.encounter_players
    where round_id = r.id;
  shared := coalesce((rules->>'maxBaitBonus')::numeric, 0) * bait_count / greatest(player_count, 1);

  for rec in
    select * from public.encounter_players
    where round_id = r.id and result is null
  loop
    if rec.ball is null then
      update public.encounter_players ep
        set result = 'No throw', caught = false
        where ep.round_id = rec.round_id and ep.user_id = rec.user_id;
      continue;
    end if;
    if rec.ball = 'masterball' then
      v_odds := 1;
      v_caught := true;
      v_roll := 0;
    else
      v_odds := least(
        coalesce((rules->>'maxCatchChance')::numeric, 0.9),
        private.ball_catch_chance(rules, rec.ball)
          + shared
          + case when rec.prep = 'berry' then coalesce((rules->>'berryBonus')::numeric, 0) else 0 end
      );
      v_roll := random();
      v_caught := v_roll < v_odds;
    end if;
    update public.encounter_players ep
      set chance = v_odds, roll = v_roll, caught = v_caught,
          result = case when v_caught then 'Caught' else 'Escaped' end
      where ep.round_id = rec.round_id and ep.user_id = rec.user_id;
    if v_caught and not exists (
      select 1 from public.catches c
      where c.round_id = rec.round_id and c.user_id = rec.user_id
    ) then
      insert into public.catches (user_id, dex, name, variant, gender, ball, round_id, source_key)
      values (
        rec.user_id, r.dex, r.name, r.variant, r.gender, rec.ball, rec.round_id,
        'play:' || rec.round_id::text || ':' || rec.user_id::text
      );
    end if;
  end loop;

  update public.encounter_rounds
    set resolved = true, last_action = 'Results locked in', updated_at = now()
    where id = r.id
    returning * into r;
  return r;
end;
$$;

create or replace function private.staff_console(
  p_round uuid, p_kind text, p_item text, p_message text
)
returns void
language plpgsql
as $$
declare
  act_id bigint;
begin
  insert into public.encounter_activity (round_id, user_id, display_name, kind, item)
  values (
    p_round,
    auth.uid(),
    coalesce(private.trainer_label(auth.uid()), 'Staff'),
    p_kind,
    p_item
  )
  returning id into act_id;
  update public.play_console_log
    set message = p_message
    where source_activity_id = act_id;
end;
$$;

create or replace function private.public_round_json(r public.encounter_rounds)
returns jsonb
language plpgsql
stable
as $$
declare
  ph text;
  participants int;
  prepared int;
  thrown int;
  bait_count int;
  rules jsonb;
  shared numeric;
  activity jsonb;
  honey jsonb;
  catchers jsonb;
  settled boolean;
begin
  if r is null then
    return null;
  end if;
  ph := private.round_phase(r);
  rules := coalesce(r.rules, private.game_settings());
  select
    count(*)::int,
    count(*) filter (where prep is not null)::int,
    count(*) filter (where ball is not null)::int,
    count(*) filter (where prep = 'bait')::int
  into participants, prepared, thrown, bait_count
  from public.encounter_players
  where round_id = r.id;
  shared := coalesce((rules->>'maxBaitBonus')::numeric, 0) * bait_count / greatest(participants, 1);
  select coalesce(jsonb_agg(row_to_json(x)::jsonb), '[]'::jsonb)
    into activity
    from (
      select a.display_name as name, a.kind, a.item, a.created_at as at
      from public.encounter_activity a
      where a.round_id = r.id
      order by a.created_at desc, a.id desc
      limit 40
    ) x;
  select coalesce(jsonb_agg(jsonb_build_object(
      'name', coalesce(private.trainer_label(ep.user_id), 'Trainer')
    ) order by coalesce(private.trainer_label(ep.user_id), 'Trainer')), '[]'::jsonb)
    into honey
    from public.encounter_players ep
    where ep.round_id = r.id and ep.prep = 'bait';
  select exists (
    select 1 from public.encounter_players ep
    where ep.round_id = r.id and ep.result is not null
  ) into settled;
  if settled then
    select coalesce(jsonb_agg(jsonb_build_object(
        'name', coalesce(private.trainer_label(ep.user_id), 'Trainer'),
        'ball', ep.ball
      ) order by coalesce(private.trainer_label(ep.user_id), 'Trainer')), '[]'::jsonb)
      into catchers
      from public.encounter_players ep
      where ep.round_id = r.id and coalesce(ep.caught, false);
  else
    catchers := '[]'::jsonb;
  end if;

  return jsonb_build_object(
    'id', r.id,
    'source', r.source,
    'phase', ph,
    'paused', private.round_paused(r),
    'pausedAt', r.paused_at,
    'hidden', r.hidden,
    'cancelled', r.cancelled,
    'resolved', r.resolved,
    'dex', r.dex,
    'name', r.name,
    'variant', r.variant,
    'gender', r.gender,
    'location', coalesce(nullif(r.pokemon->>'location', ''), private.lgpe_habitat(r.dex)),
    'startedAt', r.started_at,
    'endsAt', private.phase_display_ends(r, ph),
    'deadlines', r.deadlines,
    'participants', participants,
    'prepared', prepared,
    'thrown', thrown,
    'baitBonusPercent', round(100 * shared, 1),
    'lastAction', r.last_action,
    'activity', activity,
    'honeyTrainers', coalesce(honey, '[]'::jsonb),
    'catchers', coalesce(catchers, '[]'::jsonb),
    'results', case when settled then (
      select jsonb_build_object(
        'caught', count(*) filter (where coalesce(caught, false))::int,
        'escaped', count(*) filter (where result = 'Escaped')::int,
        'noThrow', count(*) filter (where coalesce(result, '') = 'No throw')::int,
        'catchers', coalesce(catchers, '[]'::jsonb)
      )
      from public.encounter_players
      where round_id = r.id
    ) else null end
  );
end;
$$;

create or replace function public.play_join()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  r public.encounter_rounds;
  uid uuid := auth.uid();
  twitch_user text;
  twitch_name text;
  ph text;
  already boolean;
begin
  if uid is null then
    raise exception 'Sign in to join.' using errcode = '42501';
  end if;
  r := private.sync_latest_round();
  if private.round_paused(r) then
    raise exception 'The encounter is paused.';
  end if;
  ph := private.round_phase(r);
  if not private.round_is_active(r) or ph not in ('join', 'prepare') or r.hidden then
    raise exception 'Joining is closed. Wait for the next encounter.';
  end if;
  insert into public.inventories (user_id) values (uid) on conflict (user_id) do nothing;
  perform private.mark_seen(uid, r.dex);
  already := exists (select 1 from public.encounter_players where round_id = r.id and user_id = uid);
  if r.source = 'mixitup' then
    select c.twitch_user_id, c.twitch_login into twitch_user, twitch_name from private.current_twitch() c;
    if twitch_user is null or twitch_name is null then
      raise exception 'Sign in with Twitch to join the live encounter.';
    end if;
    if not already or ph = 'prepare' then
      perform private.enqueue_stream_command('join', jsonb_build_object('user', twitch_user, 'name', twitch_name));
    end if;
  end if;
  if already then
    return private.play_snapshot(uid) || jsonb_build_object('ok', true, 'message', 'You already joined. Wait for preparation, then use a Berry or Honey.');
  end if;
  insert into public.encounter_players (round_id, user_id) values (r.id, uid);
  perform private.log_activity(r.id, uid, 'joined', null);
  update public.encounter_rounds set last_action = 'A trainer joined', updated_at = now() where id = r.id;
  return private.play_snapshot(uid) || jsonb_build_object('ok', true, 'message', 'You joined! Wait for preparation, then use a Berry or Honey.');
end;
$$;

create or replace function public.play_prepare(p_item text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  r public.encounter_rounds;
  uid uuid := auth.uid();
  twitch_user text;
  twitch_name text;
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  if p_item not in ('berry', 'bait') then
    raise exception 'Use a Berry or Honey during preparation.';
  end if;
  r := private.sync_latest_round();
  if private.round_paused(r) then
    raise exception 'The encounter is paused.';
  end if;
  if not private.round_is_active(r) or private.round_phase(r) <> 'prepare' or r.hidden then
    raise exception 'That action is only available during the prepare phase.';
  end if;
  if not exists (select 1 from public.encounter_players where round_id = r.id and user_id = uid) then
    raise exception 'You must join this encounter during its join window.';
  end if;
  if exists (select 1 from public.encounter_players where round_id = r.id and user_id = uid and prep is not null) then
    raise exception 'You already used that action. No additional item spent.';
  end if;
  perform private.spend_bag_item(uid, p_item);
  if r.source = 'mixitup' then
    select c.twitch_user_id, c.twitch_login into twitch_user, twitch_name from private.current_twitch() c;
    if twitch_user is null or twitch_name is null then
      raise exception 'Sign in with Twitch to use items on the live encounter.';
    end if;
    perform private.enqueue_stream_command('prepare', jsonb_build_object('user', twitch_user, 'name', twitch_name, 'item', p_item));
  end if;
  update public.encounter_players set prep = p_item where round_id = r.id and user_id = uid;
  perform private.log_activity(r.id, uid, 'prepared', p_item);
  update public.encounter_rounds
    set last_action = 'A trainer used ' || private.item_label(p_item), updated_at = now()
    where id = r.id;
  return private.play_snapshot(uid) || jsonb_build_object('ok', true, 'message', 'Preparation complete. Choose your ball when throws open.');
end;
$$;

create or replace function public.play_throw(p_item text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  r public.encounter_rounds;
  uid uuid := auth.uid();
  twitch_user text;
  twitch_name text;
  stream_item text;
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  if not private.is_throw_ball(p_item) then
    raise exception 'Choose a Poké Ball from your bag.';
  end if;
  r := private.sync_latest_round();
  if private.round_paused(r) then
    raise exception 'The encounter is paused.';
  end if;
  if not private.round_is_active(r) or private.round_phase(r) <> 'throw' or r.hidden then
    raise exception 'That action is only available during the throw phase.';
  end if;
  if not exists (select 1 from public.encounter_players where round_id = r.id and user_id = uid) then
    raise exception 'You must join this encounter during its join window.';
  end if;
  if exists (select 1 from public.encounter_players where round_id = r.id and user_id = uid and prep is null) then
    raise exception 'Use a Berry or Honey during preparation before throwing a ball.';
  end if;
  if exists (select 1 from public.encounter_players where round_id = r.id and user_id = uid and ball is not null) then
    raise exception 'You already used that action. No additional item spent.';
  end if;

  perform private.spend_bag_item(uid, p_item);
  stream_item := private.stream_throw_item(p_item);

  if r.source = 'mixitup' then
    select c.twitch_user_id, c.twitch_login into twitch_user, twitch_name from private.current_twitch() c;
    if twitch_user is null or twitch_name is null then
      raise exception 'Sign in with Twitch to throw on the live encounter.';
    end if;
    perform private.enqueue_stream_command('throw', jsonb_build_object('user', twitch_user, 'name', twitch_name, 'item', stream_item));
  end if;

  update public.encounter_players set ball = p_item where round_id = r.id and user_id = uid;
  perform private.log_activity(r.id, uid, 'threw', p_item);
  update public.encounter_rounds
    set last_action = 'A trainer used ' || private.item_label(p_item), updated_at = now()
    where id = r.id;
  return private.play_snapshot(uid) || jsonb_build_object('ok', true, 'message', 'Your throw is locked in. Results appear at the end of this phase.');
end;
$$;

create or replace function public.admin_pause_round()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  r public.encounter_rounds;
begin
  perform private.require_hub();
  r := private.sync_latest_round();
  if not private.round_is_active(r) then
    raise exception 'Start an encounter first.';
  end if;
  if private.round_paused(r) then
    return private.admin_overview() || jsonb_build_object('ok', true, 'message', 'The encounter is already paused.');
  end if;
  update public.encounter_rounds
    set paused_at = now(),
        last_action = 'Encounter paused',
        updated_at = now()
    where id = r.id;
  perform private.staff_console(r.id, 'pause', null, 'Encounter paused.');
  return private.admin_overview() || jsonb_build_object('ok', true, 'message', 'Encounter paused. Timer and trainer actions are frozen.');
end;
$$;

create or replace function public.admin_resume_round()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  r public.encounter_rounds;
  delta interval;
begin
  perform private.require_hub();
  r := private.sync_latest_round();
  if r is null or r.cancelled then
    raise exception 'Start an encounter first.';
  end if;
  if r.paused_at is null then
    return private.admin_overview() || jsonb_build_object('ok', true, 'message', 'The encounter is already running.');
  end if;
  delta := now() - r.paused_at;
  update public.encounter_rounds
    set deadlines = jsonb_build_object(
          'join', (deadlines->>'join')::timestamptz + delta,
          'prepare', (deadlines->>'prepare')::timestamptz + delta,
          'throw', (deadlines->>'throw')::timestamptz + delta,
          'reveal', (deadlines->>'reveal')::timestamptz + delta
        ),
        ends_at = ends_at + delta,
        paused_at = null,
        last_action = 'Encounter resumed',
        updated_at = now()
    where id = r.id;
  perform private.staff_console(r.id, 'resume', null, 'Encounter resumed.');
  return private.admin_overview() || jsonb_build_object('ok', true, 'message', 'Encounter resumed.');
end;
$$;

create or replace function public.admin_clear_console()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  perform private.require_hub();
  delete from public.play_console_log where id is not null;
  delete from public.encounter_activity where id is not null;
  return private.admin_overview() || jsonb_build_object(
    'ok', true,
    'message', 'Public encounter log cleared.',
    'console', private.play_console_json(250)
  );
end;
$$;

create or replace function public.admin_gift_catalog()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  perform private.require_hub();
  return jsonb_build_object(
    'ok', true,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'key', coalesce(nullif(i.extra->>'ballKey', ''), (
          select e.key from jsonb_each(coalesce(i.grants, '{}'::jsonb)) e
          where coalesce(e.value::text, '0') not in ('0', 'null')
          limit 1
        )),
        'name', btrim(
          regexp_replace(
            regexp_replace(i.name, '\s*(x|' || chr(215) || ')\s*\d+\s*$', '', 'i'),
            '\s*\+\d+\s*$',
            ''
          )
        ),
        'sprite', coalesce(nullif(i.sprite, ''), i.thumb),
        'floor', c.name,
        'kind', c.kind
      ) order by c.sort, i.sort, i.name)
      from private.store_items i
      join private.store_categories c on c.id = i.category_id
      where c.kind in ('coins', 'balls')
        and i.visible
        and c.visible
        and coalesce(i.grants, '{}'::jsonb) <> '{}'::jsonb
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.admin_gift_joined(p_key text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  r public.encounter_rounds;
  v_key text;
  grants jsonb;
  uid uuid;
  given int := 0;
  skipped int := 0;
  joiners int := 0;
  label text;
begin
  perform private.require_hub();
  v_key := btrim(lower(coalesce(p_key, '')));
  if v_key = '' then
    raise exception 'Pick a supply or Poké Ball.';
  end if;
  if v_key not in ('berry', 'bait', 'lure', 'pokeball', 'greatball', 'ultraball', 'bag_bonus')
     and not (v_key = any (private.extra_ball_keys())) then
    raise exception 'That item cannot be gifted.';
  end if;
  r := private.sync_latest_round();
  if not private.round_is_active(r) then
    raise exception 'Start an encounter first.';
  end if;
  select count(*)::int into joiners from public.encounter_players where round_id = r.id;
  if joiners < 1 then
    raise exception 'No trainers have joined this encounter yet.';
  end if;
  grants := jsonb_build_object(v_key, 1);
  label := case v_key
    when 'bag_bonus' then 'Bag space'
    when 'lure' then 'Poké Radar'
    else private.item_label(v_key)
  end;
  for uid in select user_id from public.encounter_players where round_id = r.id loop
    begin
      perform private.grant_known(uid, grants);
      given := given + 1;
    exception when others then
      skipped := skipped + 1;
    end;
  end loop;
  update public.encounter_rounds
    set last_action = format('Staff sent +1 %s', label),
        updated_at = now()
    where id = r.id;
  perform private.staff_console(
    r.id,
    'gift',
    v_key,
    format('Sent +1 %s to %s trainer%s%s.',
      label,
      given,
      case when given = 1 then '' else 's' end,
      case when skipped > 0 then format(' (%s bag%s full)', skipped, case when skipped = 1 then '' else 's' end) else '' end
    )
  );
  return private.admin_overview() || jsonb_build_object(
    'ok', true,
    'given', given,
    'skipped', skipped,
    'message', format('Gave +1 %s to %s trainer%s who joined.', label, given, case when given = 1 then '' else 's' end)
  );
end;
$$;

revoke all on function public.admin_pause_round() from public, anon;
revoke all on function public.admin_resume_round() from public, anon;
revoke all on function public.admin_clear_console() from public, anon;
revoke all on function public.admin_gift_catalog() from public, anon;
revoke all on function public.admin_gift_joined(text) from public, anon;
grant execute on function public.admin_pause_round() to authenticated;
grant execute on function public.admin_resume_round() to authenticated;
grant execute on function public.admin_clear_console() to authenticated;
grant execute on function public.admin_gift_catalog() to authenticated;
grant execute on function public.admin_gift_joined(text) to authenticated;
