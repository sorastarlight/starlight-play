-- Strict four-phase encounter engine:
--   JOIN 30s -> ITEM 30s -> BALL 30s -> CAPTURE 15s -> RESULTS
-- Every phase gate, throw commit, and result line is decided by the server clock.

update public.site_config
   set game_settings = coalesce(game_settings, '{}'::jsonb) || jsonb_build_object(
        'joinSeconds', 30,
        'prepareSeconds', 30,
        'throwSeconds', 30,
        'revealSeconds', 15
      )
 where id = 1;

alter table public.encounter_players
  add column if not exists prep_at timestamptz,
  add column if not exists ball_at timestamptz,
  add column if not exists throw_processed boolean not null default false,
  add column if not exists result_reason text;

-- Balls picked under the old rules were already spent at selection time.
update public.encounter_players
   set throw_processed = true
 where ball is not null and throw_processed = false;

create or replace function private.a_or_an(p_label text)
returns text
language sql
immutable
as $$
  select case
    when coalesce(p_label, '') = '' then ''
    when left(lower(p_label), 1) in ('a', 'e', 'i', 'o', 'u') then 'an ' || p_label
    else 'a ' || p_label
  end;
$$;

create or replace function private.bag_item_qty(p_uid uuid, p_item text)
returns int
language sql
stable
as $$
  select case p_item
    when 'berry' then i.berry
    when 'bait' then i.bait
    when 'pokeball' then i.pokeball
    when 'greatball' then i.greatball
    when 'ultraball' then i.ultraball
    else coalesce((i.balls->>p_item)::int, 0)
  end
  from public.inventories i
  where i.user_id = p_uid;
$$;

-- One builder for every encounter, however it was triggered.
create or replace function private.round_deadlines(p_settings jsonb, p_start timestamptz)
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'join',    p_start + make_interval(secs => s.j),
    'prepare', p_start + make_interval(secs => s.j + s.p),
    'throw',   p_start + make_interval(secs => s.j + s.p + s.b),
    'reveal',  p_start + make_interval(secs => s.j + s.p + s.b + s.c)
  )
  from (
    select
      coalesce((p_settings->>'joinSeconds')::double precision, 30) as j,
      coalesce((p_settings->>'prepareSeconds')::double precision, 30) as p,
      coalesce((p_settings->>'throwSeconds')::double precision, 30) as b,
      coalesce((p_settings->>'revealSeconds')::double precision, 15) as c
  ) s;
$$;

-- Phase gates. One second of slack absorbs network latency, nothing more.
create or replace function private.join_window_open(r public.encounter_rounds)
returns boolean
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  clk timestamptz;
begin
  if r is null or coalesce(r.cancelled, false) or private.round_paused(r) then
    return false;
  end if;
  if r.deadlines is null then
    return private.round_phase(r) = 'join';
  end if;
  clk := coalesce(r.paused_at, now());
  return clk < (r.deadlines->>'join')::timestamptz + interval '1 second';
end;
$$;

create or replace function private.prepare_action_ok(r public.encounter_rounds)
returns boolean
language plpgsql
stable
as $$
declare
  clk timestamptz;
begin
  if r is null or coalesce(r.cancelled, false) or private.round_paused(r) then
    return false;
  end if;
  if r.deadlines is null then
    return private.round_phase(r) = 'prepare';
  end if;
  clk := coalesce(r.paused_at, now());
  return clk >= (r.deadlines->>'join')::timestamptz - interval '1 second'
     and clk <  (r.deadlines->>'prepare')::timestamptz + interval '1 second';
end;
$$;

create or replace function private.throw_action_ok(r public.encounter_rounds)
returns boolean
language plpgsql
stable
as $$
declare
  clk timestamptz;
begin
  if r is null or coalesce(r.cancelled, false) or private.round_paused(r) then
    return false;
  end if;
  if r.deadlines is null then
    return private.round_phase(r) = 'throw';
  end if;
  clk := coalesce(r.paused_at, now());
  return clk >= (r.deadlines->>'prepare')::timestamptz - interval '1 second'
     and clk <  (r.deadlines->>'throw')::timestamptz + interval '1 second';
end;
$$;

create or replace function private.phase_banner(p_round uuid, p_key text, p_message text)
returns void
language plpgsql
as $$
begin
  insert into public.play_console_log (round_id, kind, item, message)
  select p_round, 'phase', p_key, p_message
  where not exists (
    select 1 from public.play_console_log l
    where l.round_id = p_round and l.kind = 'phase' and l.item = p_key
  )
  on conflict do nothing;
end;
$$;

-- PHASE 1: join, and only during the join window.
create or replace function public.play_join(p_round_id uuid default null)
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
  already boolean;
begin
  if uid is null then
    raise exception 'Sign in to join.' using errcode = '42501';
  end if;
  r := private.load_play_round(p_round_id);
  if private.round_paused(r) then
    raise exception 'The encounter is paused.';
  end if;
  if not private.join_window_open(r) then
    raise exception 'Joining has closed for this encounter. Get ready for the next one!';
  end if;
  insert into public.inventories (user_id) values (uid) on conflict (user_id) do nothing;
  perform private.mark_seen(uid, r.dex);
  already := exists (select 1 from public.encounter_players where round_id = r.id and user_id = uid);
  if r.source = 'mixitup' then
    select c.twitch_user_id, c.twitch_login into twitch_user, twitch_name from private.current_twitch() c;
    if twitch_user is null or twitch_name is null then
      raise exception 'Sign in with Twitch to join the live encounter.';
    end if;
    if not already then
      perform private.enqueue_stream_command('join', jsonb_build_object('user', twitch_user, 'name', twitch_name));
    end if;
  end if;
  if already then
    return private.play_snapshot(uid, r.id) || jsonb_build_object(
      'ok', true,
      'message', 'You have joined the encounter! Please wait while other Trainers join you.'
    );
  end if;
  insert into public.encounter_players (round_id, user_id) values (r.id, uid);
  perform private.log_activity(r.id, uid, 'joined', null);
  update public.encounter_rounds
    set last_action = coalesce(private.trainer_label(uid), 'A trainer') || ' joined the encounter!',
        updated_at = now()
    where id = r.id;
  return private.play_snapshot(uid, r.id) || jsonb_build_object(
    'ok', true,
    'message', 'You have joined the encounter! Please wait while other Trainers join you.'
  );
end;
$$;

-- PHASE 2: Berry / Honey, joined Trainers only.
create or replace function public.play_prepare(p_item text, p_round_id uuid default null)
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
  mine public.encounter_players%rowtype;
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  if p_item not in ('berry', 'bait') then
    raise exception 'Use a Berry or Honey during preparation.';
  end if;
  r := private.load_play_round(p_round_id);
  if private.round_paused(r) then
    raise exception 'The encounter is paused.';
  end if;
  if not private.prepare_action_ok(r) then
    raise exception 'Items can only be chosen during the item phase.';
  end if;
  select * into mine from public.encounter_players
    where round_id = r.id and user_id = uid for update;
  if not found then
    raise exception 'You had to join this encounter during its join window.';
  end if;
  if mine.prep is not null then
    raise exception 'You already used that action. No additional item spent.';
  end if;
  if mine.ball is not null or mine.result is not null then
    raise exception 'Your choices for this encounter are already locked in.';
  end if;
  perform private.spend_bag_item(uid, p_item);
  if r.source = 'mixitup' then
    select c.twitch_user_id, c.twitch_login into twitch_user, twitch_name from private.current_twitch() c;
    if twitch_user is null or twitch_name is null then
      raise exception 'Sign in with Twitch to use items on the live encounter.';
    end if;
    perform private.enqueue_stream_command('prepare', jsonb_build_object('user', twitch_user, 'name', twitch_name, 'item', p_item));
  end if;
  update public.encounter_players
    set prep = p_item, prep_at = now()
    where round_id = r.id and user_id = uid;
  perform private.log_activity(r.id, uid, 'prepared', p_item);
  update public.encounter_rounds
    set last_action = coalesce(private.trainer_label(uid), 'A trainer') || ' has prepared an item!',
        updated_at = now()
    where id = r.id;
  return private.play_snapshot(uid, r.id) || jsonb_build_object(
    'ok', true,
    'message', 'You have selected ' || private.item_label(p_item)
      || '! Please wait while the other Trainers make their choices.'
  );
end;
$$;

-- PHASE 3: choose a ball. The ball is reserved here and spent when the phase ends.
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
  mine public.encounter_players%rowtype;
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
    raise exception 'Poké Balls can only be chosen during the Poké Ball phase.';
  end if;
  select * into mine from public.encounter_players
    where round_id = r.id and user_id = uid for update;
  if not found then
    raise exception 'You had to join this encounter during its join window.';
  end if;
  if mine.ball is not null then
    raise exception 'You already used that action. No additional item spent.';
  end if;
  if mine.result is not null then
    raise exception 'This encounter already has results.';
  end if;
  if coalesce(private.bag_item_qty(uid, p_item), 0) < 1 then
    raise exception 'You have no % left. No item spent.', private.item_label(p_item);
  end if;

  stream_item := private.stream_throw_item(p_item);
  if r.source = 'mixitup' then
    select c.twitch_user_id, c.twitch_login into twitch_user, twitch_name from private.current_twitch() c;
    if twitch_user is null or twitch_name is null then
      raise exception 'Sign in with Twitch to throw on the live encounter.';
    end if;
    perform private.enqueue_stream_command('throw', jsonb_build_object('user', twitch_user, 'name', twitch_name, 'item', stream_item));
  end if;

  who := coalesce(private.trainer_label(uid), 'A trainer');
  line := who || ' has chosen ' || private.a_or_an(private.item_label(p_item)) || ' and is ready to throw!';

  update public.encounter_players
    set ball = p_item, ball_at = now()
    where round_id = r.id and user_id = uid;
  perform private.log_activity(r.id, uid, 'selected', p_item);
  update public.play_console_log l
    set message = line
    where l.round_id = r.id and l.user_id = uid and l.kind = 'selected'
      and coalesce(l.message, '') = '';
  update public.encounter_rounds
    set last_action = line, updated_at = now()
    where id = r.id;
  return private.play_snapshot(uid, r.id) || jsonb_build_object(
    'ok', true,
    'message', 'You have chosen ' || private.item_label(p_item)
      || '! Please wait while the other Trainers make their choices.'
  );
end;
$$;

-- End of PHASE 3: commit every throw exactly once and spend the ball here.
create or replace function private.announce_throws(p_round uuid)
returns text
language plpgsql
as $$
declare
  rec public.encounter_players%rowtype;
  who text;
  line text;
  last_line text;
begin
  for rec in
    select ep.* from public.encounter_players ep
    where ep.round_id = p_round
      and ep.ball is not null
      and ep.throw_processed = false
    order by coalesce(private.trainer_label(ep.user_id), 'Trainer'), ep.user_id
    for update
  loop
    who := coalesce(private.trainer_label(rec.user_id), 'A trainer');
    begin
      perform private.spend_bag_item(rec.user_id, rec.ball);
    exception when others then
      update public.encounter_players ep
        set throw_processed = true, result_reason = 'no_ball_left'
        where ep.round_id = rec.round_id and ep.user_id = rec.user_id;
      insert into public.play_console_log (round_id, user_id, display_name, kind, item, message)
      select p_round, rec.user_id, who, 'timeout', rec.ball,
             '⌛ ' || who || ' ran out of ' || private.item_label(rec.ball) || 's before the throw.'
      where not exists (
        select 1 from public.play_console_log l
        where l.round_id = p_round and l.user_id = rec.user_id and l.kind = 'timeout'
      )
      on conflict do nothing;
      continue;
    end;
    update public.encounter_players ep
      set throw_processed = true
      where ep.round_id = rec.round_id and ep.user_id = rec.user_id;
    line := who || ' has thrown ' || private.a_or_an(private.item_label(rec.ball)) || '!';
    perform private.log_activity(p_round, rec.user_id, 'threw', rec.ball);
    update public.play_console_log l
      set message = line
      where l.round_id = p_round
        and l.user_id = rec.user_id
        and l.kind = 'threw'
        and coalesce(l.message, '') = '';
    last_line := line;
  end loop;

  -- Joined Trainers who never readied a ball get called out, but keep no result yet.
  for rec in
    select ep.* from public.encounter_players ep
    where ep.round_id = p_round and ep.ball is null and ep.result is null
  loop
    who := coalesce(private.trainer_label(rec.user_id), 'A trainer');
    insert into public.play_console_log (round_id, user_id, display_name, kind, item, message)
    select p_round, rec.user_id, who, 'timeout', null,
           '⌛ ' || who || ' did not choose a Poké Ball in time.'
    where not exists (
      select 1 from public.play_console_log l
      where l.round_id = p_round and l.user_id = rec.user_id and l.kind = 'timeout'
    )
    on conflict do nothing;
  end loop;

  return last_line;
end;
$$;

-- The state machine. Each transition runs once, under a per-round lock.
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
  join_at timestamptz;
  prepare_at timestamptz;
  throw_at timestamptz;
  reveal_at timestamptz;
  throw_line text;
  who text;
  species text;
begin
  if r is null or r.cancelled then
    return r;
  end if;
  if r.paused_at is not null then
    return r;
  end if;
  if not pg_try_advisory_xact_lock(hashtextextended(r.id::text, 0)) then
    return r;
  end if;
  select * into r from public.encounter_rounds where id = r.id;
  if r is null or r.cancelled or r.paused_at is not null then
    return r;
  end if;

  select exists (
    select 1 from public.encounter_players ep
    where ep.round_id = r.id and ep.result is null
  ) into pending;
  if pending = false and r.resolved then
    return r;
  end if;

  clk := now();
  species := coalesce(nullif(btrim(r.name), ''), 'the Pokémon');
  if r.deadlines is not null then
    join_at := (r.deadlines->>'join')::timestamptz;
    prepare_at := (r.deadlines->>'prepare')::timestamptz;
    throw_at := coalesce((r.deadlines->>'throw')::timestamptz, (r.deadlines->>'reveal')::timestamptz);
    reveal_at := (r.deadlines->>'reveal')::timestamptz;
  end if;

  -- End of PHASE 1. Nobody joined, so the encounter ends here.
  if join_at is not null and clk >= join_at then
    if not exists (select 1 from public.encounter_players where round_id = r.id) then
      insert into public.play_console_log (round_id, kind, message)
      select r.id, 'cancelled',
             'No Trainers joined the encounter. The wild ' || species || ' wandered away!'
      where not exists (
        select 1 from public.play_console_log l
        where l.round_id = r.id and l.kind = 'cancelled'
      )
      on conflict do nothing;
      update public.encounter_rounds
        set cancelled = true,
            hidden = true,
            phase = 'closed',
            resolved = true,
            paused_at = null,
            last_action = 'No Trainers joined. The wild ' || species || ' wandered away!',
            updated_at = now()
        where id = r.id
        returning * into r;
      return r;
    end if;
    perform private.phase_banner(r.id, 'prepare', 'Trainers are preparing their items…');
  end if;

  if prepare_at is not null and clk >= prepare_at then
    perform private.phase_banner(r.id, 'throw', 'Trainers are choosing their Poké Balls!');
  end if;

  if r.deadlines is not null then
    if throw_at is not null and clk < throw_at then
      return r;
    end if;
  elsif private.round_phase(r) in ('join', 'prepare', 'throw') then
    return r;
  end if;

  -- End of PHASE 3: commit the throws.
  throw_line := private.announce_throws(r.id);
  if throw_line is not null then
    update public.encounter_rounds
      set last_action = throw_line, updated_at = now()
      where id = r.id
      returning * into r;
  end if;

  -- PHASE 4 is still running: results stay hidden.
  if reveal_at is not null and clk < reveal_at then
    return r;
  end if;
  if r.deadlines is null and private.round_phase(r) = 'reveal' then
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
    for update
  loop
    who := coalesce(private.trainer_label(rec.user_id), 'A trainer');
    if rec.ball is null or rec.result_reason = 'no_ball_left' then
      update public.encounter_players ep
        set result = 'No throw',
            caught = false,
            result_reason = coalesce(ep.result_reason, 'no_ball')
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
          result = case when v_caught then 'Caught' else 'Escaped' end,
          result_reason = case when v_caught then 'caught' else 'escaped' end
      where ep.round_id = rec.round_id and ep.user_id = rec.user_id;
    if v_caught then
      insert into public.play_console_log (round_id, user_id, display_name, kind, item, message)
      select r.id, rec.user_id, who, 'caught', species, '⭐ ' || who || ' caught ' || species || '!'
      where not exists (
        select 1 from public.play_console_log l
        where l.round_id = r.id and l.user_id = rec.user_id and l.kind = 'caught'
      )
      on conflict do nothing;
    else
      insert into public.play_console_log (round_id, user_id, display_name, kind, item, message)
      select r.id, rec.user_id, who, 'escaped', species,
             '✖ ' || who || ' was unable to catch ' || species || '. Better luck next encounter!'
      where not exists (
        select 1 from public.play_console_log l
        where l.round_id = r.id and l.user_id = rec.user_id and l.kind = 'escaped'
      )
      on conflict do nothing;
    end if;
    if v_caught and not exists (
      select 1 from public.catches c
      where c.round_id = rec.round_id and c.user_id = rec.user_id
    ) then
      insert into public.catches (user_id, dex, name, variant, gender, ball, round_id, source_key)
      values (
        rec.user_id, r.dex, r.name, r.variant, r.gender, rec.ball, rec.round_id,
        'play:' || rec.round_id::text || ':' || rec.user_id::text
      )
      on conflict do nothing;
    end if;
  end loop;

  update public.encounter_rounds
    set resolved = true,
        paused_at = null,
        last_action = coalesce(throw_line, last_action, 'Results locked in'),
        updated_at = now()
    where id = r.id
    returning * into r;
  return r;
end;
$$;

-- Cancelling refunds only what was actually spent.
create or replace function public.admin_cancel_round()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  r public.encounter_rounds;
  rec public.encounter_players%rowtype;
begin
  perform private.require_hub();
  r := private.load_play_round(null);
  if r is null or r.cancelled then
    raise exception 'No encounter to cancel.';
  end if;
  if not r.resolved then
    for rec in select * from public.encounter_players where round_id = r.id
    loop
      perform private.restore_bag_item(rec.user_id, rec.prep);
      if rec.throw_processed and rec.result_reason is distinct from 'no_ball_left' then
        perform private.restore_bag_item(rec.user_id, rec.ball);
      end if;
    end loop;
  end if;
  update public.encounter_rounds
    set cancelled = true,
        hidden = true,
        phase = 'closed',
        paused_at = null,
        last_action = 'Encounter cancelled',
        updated_at = now()
    where id = r.id;
  perform private.staff_console(r.id, 'cancel', null, 'Encounter cancelled.');
  return private.admin_overview() || jsonb_build_object('ok', true, 'message', 'Encounter cancelled.');
end;
$$;

-- Manual starts use the shared deadline builder.
create or replace function public.admin_start_round(p_dex integer default null, p_gender text default null, p_shiny boolean default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  r public.encounter_rounds;
  settings jsonb;
  chosen_dex int;
  chosen_name text;
  chosen_variant text := 'normal';
  chosen_gender text;
  t timestamptz := now();
  deadlines jsonb;
begin
  if not private.is_play_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  r := private.sync_latest_round();
  if private.round_is_active(r) then
    raise exception 'A community round is already running.';
  end if;
  settings := private.game_settings();
  if p_dex is null then
    chosen_dex := floor(random() * 151 + 1)::int;
  else
    chosen_dex := p_dex;
  end if;
  if chosen_dex < 1 or chosen_dex > 151 then
    raise exception 'Choose a Pokédex number from 1 to 151.';
  end if;
  select name into chosen_name from public.species where dex = chosen_dex;
  if p_gender in ('Male', 'Female', 'Genderless') then
    chosen_gender := p_gender;
  else
    chosen_gender := private.lgpe_roll_gender(chosen_dex, floor(random() * 2147483647)::int, null);
  end if;
  if p_shiny is true then
    chosen_variant := case when chosen_gender = 'Female' then 'shiny-female' else 'shiny' end;
  elsif p_shiny is false then
    chosen_variant := case when chosen_gender = 'Female' then 'female' else 'normal' end;
  elsif random() < (1.0 / 4096.0) then
    chosen_variant := case when chosen_gender = 'Female' then 'shiny-female' else 'shiny' end;
  else
    chosen_variant := case when chosen_gender = 'Female' then 'female' else 'normal' end;
  end if;
  deadlines := private.round_deadlines(settings, t);
  insert into public.encounter_rounds (
    phase, hidden, pokemon, dex, name, variant, gender, started_at, deadlines, rules, resolved, cancelled, last_action, ends_at
  ) values (
    'join', false,
    jsonb_build_object('dex', chosen_dex, 'name', chosen_name, 'variant', chosen_variant, 'gender', chosen_gender, 'location', private.lgpe_habitat(chosen_dex)),
    chosen_dex, chosen_name, chosen_variant, chosen_gender, t, deadlines, settings, false, false,
    chosen_name || ' appeared!',
    (deadlines->>'join')::timestamptz
  ) returning * into r;
  return private.play_snapshot(auth.uid()) || jsonb_build_object(
    'ok', true,
    'message', chosen_name || ' appeared! Trainers can join on the Play page.'
  );
end;
$$;

create unique index if not exists play_console_log_round_phase_uniq
  on public.play_console_log (round_id, kind, item)
  where kind = 'phase';

create unique index if not exists play_console_log_round_cancelled_uniq
  on public.play_console_log (round_id, kind)
  where kind = 'cancelled';

create unique index if not exists play_console_log_round_result_uniq
  on public.play_console_log (round_id, user_id, kind)
  where kind in ('caught', 'escaped', 'timeout');