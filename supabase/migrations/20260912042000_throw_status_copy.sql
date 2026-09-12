-- Selecting a ball announces readiness. The actual "threw a …" lines wait
-- until Throw ends so every trainer sees them together.

alter table public.encounter_activity drop constraint if exists encounter_activity_kind_check;
alter table public.encounter_activity
  add constraint encounter_activity_kind_check
  check (kind = any (array[
    'joined'::text, 'prepared'::text, 'selected'::text, 'threw'::text,
    'pause'::text, 'resume'::text, 'gift'::text
  ]));

create or replace function public.play_throw(p_item text, p_round_id uuid default null)
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
  who text;
  line text;
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  if not private.is_throw_ball(p_item) then
    raise exception 'Choose a Poké Ball from your bag.';
  end if;
  r := private.load_play_round(p_round_id);
  if private.round_paused(r) then
    raise exception 'The encounter is paused.';
  end if;
  if not private.throw_action_ok(r) then
    raise exception 'That action is only available during the throw phase.';
  end if;
  if not exists (select 1 from public.encounter_players where round_id = r.id and user_id = uid) then
    raise exception 'You must join this encounter during its join window.';
  end if;
  if exists (select 1 from public.encounter_players where round_id = r.id and user_id = uid and ball is not null) then
    raise exception 'You already used that action. No additional item spent.';
  end if;
  if exists (select 1 from public.encounter_players where round_id = r.id and user_id = uid and result is not null) then
    raise exception 'This encounter already has results.';
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

  who := coalesce(private.trainer_label(uid), 'A trainer');
  line := who || ' has selected their Poké Ball and is ready to throw!';

  update public.encounter_players set ball = p_item where round_id = r.id and user_id = uid;
  perform private.log_activity(r.id, uid, 'selected', p_item);
  update public.encounter_rounds
    set last_action = line, updated_at = now()
    where id = r.id;
  return private.play_snapshot(uid, r.id) || jsonb_build_object('ok', true, 'message', line);
end;
$$;

create or replace function private.announce_throws(p_round uuid)
returns text
language plpgsql
as $$
declare
  rec record;
  who text;
  line text;
  last_line text;
begin
  for rec in
    select ep.user_id, ep.ball
    from public.encounter_players ep
    where ep.round_id = p_round
      and ep.ball is not null
      and not exists (
        select 1 from public.encounter_activity a
        where a.round_id = ep.round_id and a.user_id = ep.user_id and a.kind = 'threw'
      )
    order by coalesce(private.trainer_label(ep.user_id), 'Trainer'), ep.user_id
  loop
    who := coalesce(private.trainer_label(rec.user_id), 'A trainer');
    line := who || ' threw a ' || private.item_label(rec.ball);
    perform private.log_activity(p_round, rec.user_id, 'threw', rec.ball);
    last_line := line;
  end loop;
  return last_line;
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
  throw_at timestamptz;
  throw_line text;
begin
  if r is null or r.cancelled then
    return r;
  end if;
  select exists (
    select 1 from public.encounter_players ep
    where ep.round_id = r.id and ep.result is null
  ) into pending;
  clk := coalesce(r.paused_at, now());
  if r.paused_at is not null then
    return r;
  end if;
  if pending = false and r.resolved then
    return r;
  end if;
  if r.deadlines is not null then
    throw_at := coalesce((r.deadlines->>'throw')::timestamptz, (r.deadlines->>'reveal')::timestamptz);
    if throw_at is not null and clk < throw_at then
      return r;
    end if;
  elsif private.round_phase(r) in ('join', 'prepare', 'throw') then
    return r;
  end if;

  throw_line := private.announce_throws(r.id);

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
    set resolved = true,
        paused_at = null,
        last_action = coalesce(throw_line, case
          when last_action ~* 'joined' then 'Results locked in'
          else coalesce(nullif(btrim(last_action), ''), 'Results locked in')
        end),
        updated_at = now()
    where id = r.id
    returning * into r;
  return r;
end;
$$;

create or replace function private.mirror_round_to_console()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  kind text;
  message text;
begin
  if tg_op = 'INSERT' then
    kind := 'appeared';
    message := coalesce(nullif(btrim(new.name), ''), 'A Pokémon') || ' appeared!';
  elsif new.cancelled and not coalesce(old.cancelled, false) then
    kind := 'cancelled';
    message := 'Encounter cancelled.';
  elsif new.resolved and not coalesce(old.resolved, false) then
    kind := 'resolved';
    message := 'Results locked in.';
  elsif new.hidden is distinct from old.hidden then
    kind := 'hidden';
    message := case when new.hidden then 'Encounter hidden from viewers.' else 'Encounter shown to viewers.' end;
  else
    return new;
  end if;
  insert into public.play_console_log (round_id, kind, message)
  values (new.id, kind, message);
  return new;
end;
$$;

grant execute on function public.play_throw(text, uuid) to authenticated, anon;

notify pgrst, 'reload schema';
