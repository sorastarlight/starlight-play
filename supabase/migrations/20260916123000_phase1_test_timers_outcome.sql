-- Phase 1 proof support: Admin Test Mode short timers + optional deterministic
-- TEST outcomes + admin capture inspect. Production durations and RNG unchanged
-- unless trigger_source = TEST.

create or replace function private.launch_community_round(
  p_dex integer,
  p_gender text,
  p_shiny boolean,
  p_source text,
  p_test boolean default false
)
returns encounter_rounds
language plpgsql
as $function$
declare
  r public.encounter_rounds;
  settings jsonb;
  chosen_dex int;
  chosen_name text;
  chosen_variant text := 'normal';
  chosen_gender text;
  chosen_level int;
  round_id uuid := gen_random_uuid();
  t timestamptz := now();
  deadlines jsonb;
  female_look boolean;
  test_out text;
begin
  r := private.sync_latest_round();
  if private.round_is_active(r) then
    raise exception 'A community round is already running.';
  end if;
  settings := private.game_settings();
  if p_test then
    settings := coalesce(settings, '{}'::jsonb) || jsonb_build_object(
      'rewardMode', 'test',
      'testMode', true,
      'joinSeconds', 6,
      'prepareSeconds', 6,
      'throwSeconds', 6,
      'revealSeconds', 8
    );
    test_out := nullif(btrim(current_setting('play.test_outcome', true)), '');
    if test_out in ('catch', 'escape') then
      settings := settings || jsonb_build_object('testOutcome', test_out);
    end if;
    if current_setting('play.test_rewards', true) = 'true' then
      settings := settings || jsonb_build_object('testRewards', true);
    end if;
  end if;
  if p_dex is null then
    chosen_dex := private.spawn_pick_random_dex();
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
  female_look := chosen_gender = 'Female' and chosen_dex = any (private.female_visual_dex());
  if p_shiny is true then
    chosen_variant := case when female_look then 'shiny-female' else 'shiny' end;
  elsif p_shiny is false then
    chosen_variant := case when female_look then 'female' else 'normal' end;
  elsif random() < (1.0 / 4096.0) then
    chosen_variant := case when female_look then 'shiny-female' else 'shiny' end;
  else
    chosen_variant := case when female_look then 'female' else 'normal' end;
  end if;
  deadlines := private.round_deadlines(settings, t);
  chosen_level := private.encounter_pokemon_level(chosen_dex, round_id);
  insert into public.encounter_rounds (
    id, phase, hidden, pokemon, dex, name, variant, gender, started_at, deadlines, rules, resolved, cancelled, last_action, ends_at, trigger_source, source
  ) values (
    round_id, 'join', false,
    jsonb_build_object('dex', chosen_dex, 'name', chosen_name, 'variant', chosen_variant, 'gender', chosen_gender, 'location', private.lgpe_habitat(chosen_dex), 'level', chosen_level),
    chosen_dex, chosen_name, chosen_variant, chosen_gender, t, deadlines, settings, false, false,
    case when p_test then '[TEST MODE] ' else '' end || chosen_name || ' appeared!',
    (deadlines->>'join')::timestamptz,
    p_source,
    'play'
  ) returning * into r;
  return r;
end;
$function$;

create or replace function private.round_is_test(p_round uuid)
returns boolean
language sql
stable
as $function$
  select coalesce((select rules->>'rewardMode' from public.encounter_rounds where id = p_round), 'live') = 'test'
     and coalesce((select (rules->>'testRewards') from public.encounter_rounds where id = p_round), '') is distinct from 'true';
$function$;

create or replace function private.settle_if_needed(r encounter_rounds)
returns encounter_rounds
language plpgsql
as $function$
declare
  rec public.encounter_players%rowtype;
  cfg jsonb;
  calc jsonb;
  bait_count int;
  player_count int;
  owns boolean;
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
  test_out text;
begin
  if r is null or r.cancelled then return r; end if;
  if r.paused_at is not null then return r; end if;
  if not pg_try_advisory_xact_lock(hashtextextended(r.id::text, 0)) then return r; end if;
  select * into r from public.encounter_rounds where id = r.id;
  if r is null or r.cancelled or r.paused_at is not null then return r; end if;
  select exists (select 1 from public.encounter_players ep where ep.round_id = r.id and ep.result is null) into pending;
  if pending = false and r.resolved then return r; end if;
  clk := now();
  species := coalesce(nullif(btrim(r.name), ''), 'the Pokémon');
  if r.deadlines is not null then
    join_at := (r.deadlines->>'join')::timestamptz;
    prepare_at := (r.deadlines->>'prepare')::timestamptz;
    throw_at := coalesce((r.deadlines->>'throw')::timestamptz, (r.deadlines->>'reveal')::timestamptz);
    reveal_at := (r.deadlines->>'reveal')::timestamptz;
  end if;
  if join_at is not null and clk >= join_at then
    if not exists (select 1 from public.encounter_players where round_id = r.id) then
      insert into public.play_console_log (round_id, kind, message)
      select r.id, 'cancelled', 'No Trainers joined the encounter. The wild ' || species || ' wandered away!'
      where not exists (select 1 from public.play_console_log l where l.round_id = r.id and l.kind = 'cancelled')
      on conflict do nothing;
      update public.encounter_rounds set cancelled = true, hidden = true, phase = 'closed', resolved = true, paused_at = null,
        last_action = 'No Trainers joined. The wild ' || species || ' wandered away!', updated_at = now() where id = r.id returning * into r;
      return r;
    end if;
    perform private.phase_banner(r.id, 'prepare', 'Trainers are preparing their items…');
  end if;
  if prepare_at is not null and clk >= prepare_at then
    perform private.phase_banner(r.id, 'throw', 'Trainers are choosing their Poké Balls!');
  end if;
  if r.deadlines is not null then
    if throw_at is not null and clk < throw_at then return r; end if;
  elsif private.round_phase(r) in ('join', 'prepare', 'throw') then
    return r;
  end if;
  throw_line := private.announce_throws(r.id);
  if throw_line is not null then
    update public.encounter_rounds set last_action = throw_line, updated_at = now() where id = r.id returning * into r;
  end if;
  if reveal_at is not null and clk < reveal_at then return r; end if;
  if r.deadlines is null and private.round_phase(r) = 'reveal' then return r; end if;
  cfg := private.capture_config();
  test_out := case
    when coalesce(r.trigger_source, '') = 'TEST' then nullif(btrim(coalesce(r.rules->>'testOutcome', '')), '')
    else null
  end;
  select count(*)::int, count(*) filter (where prep = 'bait')::int into player_count, bait_count from public.encounter_players where round_id = r.id;
  for rec in select * from public.encounter_players where round_id = r.id and result is null for update loop
    who := coalesce(private.trainer_label(rec.user_id), 'A trainer');
    if rec.ball is null or rec.result_reason = 'no_ball_left' then
      update public.encounter_players ep set result = 'No throw', caught = false, result_reason = coalesce(ep.result_reason, 'no_ball')
      where ep.round_id = rec.round_id and ep.user_id = rec.user_id;
      continue;
    end if;
    select exists (select 1 from public.catches c where c.user_id = rec.user_id and c.dex = r.dex) into owns;
    calc := private.capture_chance(r.dex, rec.ball, case when rec.prep = 'bait' then null else rec.prep end, bait_count, player_count, rec.prep = 'bait', owns, private.variant_is_shiny(r.variant), 1.0, clk, cfg);
    v_odds := (calc->>'finalChance')::numeric;
    -- TEST-ONLY deterministic settlement. Production RNG path is unchanged.
    if test_out = 'catch' then
      v_roll := 0; v_caught := true;
    elsif test_out = 'escape' then
      v_roll := 1; v_caught := false;
    elsif coalesce((calc->>'guaranteed')::boolean, false) then
      v_roll := 0; v_caught := true;
    else
      v_roll := private.secure_random(); v_caught := v_roll < v_odds;
    end if;
    update public.encounter_players ep set chance = v_odds, roll = v_roll, caught = v_caught, result = case when v_caught then 'Caught' else 'Escaped' end, result_reason = case when v_caught then 'caught' else 'escaped' end where ep.round_id = rec.round_id and ep.user_id = rec.user_id;
    insert into public.capture_log (round_id, user_id, dex, species_name, variant, gender, is_shiny, is_female, canonical_catch_rate, base_chance, ball_key, ball_multiplier, ball_condition_met, berry_key, berry_multiplier, honey_contributors, honey_participants, honey_multiplier, honey_contributor_multiplier, shiny_multiplier, event_multiplier, other_multiplier, raw_chance, final_chance, capture_roll, success, detail)
    values (r.id, rec.user_id, r.dex, r.name, r.variant, r.gender, private.variant_is_shiny(r.variant), r.gender = 'Female', (calc->>'catchRate')::int, (calc->>'baseChance')::numeric, calc->'ball'->>'key', (calc->'ball'->>'multiplier')::numeric, (calc->'ball'->>'conditionMet')::boolean, calc->'berry'->>'key', (calc->'berry'->>'multiplier')::numeric, (calc->'honey'->>'contributors')::int, (calc->'honey'->>'participants')::int, (calc->'honey'->>'multiplier')::numeric, (calc->>'honeyContributorMultiplier')::numeric, (calc->>'shinyMultiplier')::numeric, (calc->>'eventMultiplier')::numeric, (calc->>'otherMultiplier')::numeric, (calc->>'rawChance')::numeric, v_odds, v_roll, v_caught, calc || jsonb_build_object('testOutcome', test_out))
    on conflict (round_id, user_id) do nothing;
    if v_caught then
      insert into public.play_console_log (round_id, user_id, display_name, kind, item, message)
      select r.id, rec.user_id, who, 'caught', species, '⭐ ' || who || ' caught ' || species || '!'
      where not exists (select 1 from public.play_console_log l where l.round_id = r.id and l.user_id = rec.user_id and l.kind = 'caught') on conflict do nothing;
    else
      insert into public.play_console_log (round_id, user_id, display_name, kind, item, message)
      select r.id, rec.user_id, who, 'escaped', species, '✖ ' || who || ' was unable to catch ' || species || '. Better luck next encounter!'
      where not exists (select 1 from public.play_console_log l where l.round_id = r.id and l.user_id = rec.user_id and l.kind = 'escaped') on conflict do nothing;
    end if;
    if v_caught and not exists (select 1 from public.catches c where c.round_id = rec.round_id and c.user_id = rec.user_id) then
      insert into public.catches (user_id, dex, name, variant, gender, ball, round_id, source_key)
      values (rec.user_id, r.dex, r.name, r.variant, r.gender, rec.ball, rec.round_id, 'play:' || rec.round_id::text || ':' || rec.user_id::text)
      on conflict do nothing;
    end if;
  end loop;
  update public.encounter_rounds set resolved = true, paused_at = null, last_action = coalesce(throw_line, last_action, 'Results locked in'), updated_at = now() where id = r.id returning * into r;
  return r;
end;
$function$;

create or replace function public.admin_test_start(p_payload jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  payload jsonb := coalesce(p_payload, '{}'::jsonb);
  outcome text := lower(btrim(coalesce(payload->>'outcome', payload->>'testOutcome', '')));
  r public.encounter_rounds;
begin
  perform private.require_hub();
  if outcome <> '' and outcome not in ('catch', 'escape') then
    raise exception 'Test outcome must be catch, escape, or empty.';
  end if;
  perform set_config('play.test_outcome', outcome, true);
  perform set_config('play.test_rewards', case when coalesce((payload->>'rewards')::boolean, (payload->>'testRewards')::boolean, false) then 'true' else '' end, true);
  r := private.director_start_now(
    nullif(payload->>'dex', '')::int,
    payload->>'gender',
    case when payload ? 'shiny' then (payload->>'shiny')::boolean else null end,
    'TEST',
    true
  );
  return jsonb_build_object(
    'ok', true,
    'roundId', r.id,
    'dex', r.dex,
    'name', r.name,
    'variant', r.variant,
    'gender', r.gender,
    'triggerSource', r.trigger_source,
    'deadlines', r.deadlines,
    'testMode', true,
    'testOutcome', r.rules->>'testOutcome',
    'testRewards', coalesce((r.rules->>'testRewards')::boolean, false),
    'message', 'TEST MODE encounter started.'
  );
end;
$function$;

create or replace function public.admin_test_act(p_user uuid, p_kind text, p_item text default null, p_round uuid default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  kind text := lower(btrim(coalesce(p_kind, '')));
  snap jsonb;
begin
  perform private.require_hub();
  if p_user is null then
    raise exception 'Pick the Play Tester account.';
  end if;
  if not exists (
    select 1 from public.profiles pr
    where pr.id = p_user and pr.username = 'playtester'
  ) then
    raise exception 'admin_test_act is limited to the Play Tester account.';
  end if;
  if kind not in ('join', 'prepare', 'throw') then
    raise exception 'Kind must be join, prepare, or throw.';
  end if;
  perform set_config('request.jwt.claim.sub', p_user::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object(
    'sub', p_user::text,
    'role', 'authenticated',
    'aud', 'authenticated'
  )::text, true);
  if kind = 'join' then
    snap := public.play_join(p_round);
  elsif kind = 'prepare' then
    snap := public.play_prepare(p_item, p_round);
  else
    snap := public.play_throw(p_item, p_round);
  end if;
  return coalesce(snap, '{}'::jsonb) || jsonb_build_object('ok', true, 'actedAs', p_user, 'kind', kind, 'item', p_item);
end;
$function$;

create or replace function public.admin_capture_inspect(p_round uuid default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  rid uuid := p_round;
  r public.encounter_rounds;
  rows jsonb;
  honey jsonb;
  players jsonb;
begin
  perform private.require_hub();
  if rid is null then
    select id into rid from public.encounter_rounds order by started_at desc limit 1;
  end if;
  select * into r from public.encounter_rounds where id = rid;
  if r is null then
    raise exception 'No round to inspect.';
  end if;
  select coalesce(jsonb_agg(to_jsonb(cl) order by cl.created_at), '[]'::jsonb)
    into rows
    from public.capture_log cl
   where cl.round_id = rid;
  select coalesce(jsonb_agg(jsonb_build_object(
      'userId', ep.user_id,
      'name', coalesce(private.trainer_label(ep.user_id), 'Trainer'),
      'prep', ep.prep,
      'ball', ep.ball,
      'result', ep.result,
      'caught', ep.caught,
      'chance', ep.chance,
      'roll', ep.roll
    ) order by coalesce(private.trainer_label(ep.user_id), 'Trainer')), '[]'::jsonb)
    into players
    from public.encounter_players ep
   where ep.round_id = rid;
  select jsonb_build_object(
      'contributors', count(*) filter (where prep = 'bait'),
      'participants', count(*),
      'names', coalesce(jsonb_agg(coalesce(private.trainer_label(user_id), 'Trainer')) filter (where prep = 'bait'), '[]'::jsonb)
    )
    into honey
    from public.encounter_players
   where round_id = rid;
  return jsonb_build_object(
    'ok', true,
    'roundId', r.id,
    'dex', r.dex,
    'name', r.name,
    'variant', r.variant,
    'gender', r.gender,
    'level', r.pokemon->>'level',
    'location', r.pokemon->>'location',
    'triggerSource', r.trigger_source,
    'testOutcome', r.rules->>'testOutcome',
    'honey', honey,
    'players', players,
    'captureLog', rows
  );
end;
$function$;

revoke all on function public.admin_test_start(jsonb) from public, anon;
revoke all on function public.admin_test_act(uuid, text, text, uuid) from public, anon;
revoke all on function public.admin_capture_inspect(uuid) from public, anon;
grant execute on function public.admin_test_start(jsonb) to authenticated;
grant execute on function public.admin_test_act(uuid, text, text, uuid) to authenticated;
grant execute on function public.admin_capture_inspect(uuid) to authenticated;

notify pgrst, 'reload schema';
