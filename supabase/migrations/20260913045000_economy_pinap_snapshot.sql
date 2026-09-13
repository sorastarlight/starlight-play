-- Pinap payouts stay on the ledger. Round JSON exposes types for specialist hints.
-- Store wallet reports Daily Trainer Supply readiness.

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

  throw_line := private.announce_throws(r.id);
  if throw_line is not null then
    update public.encounter_rounds
      set last_action = throw_line, updated_at = now()
      where id = r.id
      returning * into r;
  end if;

  if reveal_at is not null and clk < reveal_at then
    return r;
  end if;
  if r.deadlines is null and private.round_phase(r) = 'reveal' then
    return r;
  end if;

  cfg := private.capture_config();
  select count(*)::int, count(*) filter (where prep = 'bait')::int
    into player_count, bait_count
    from public.encounter_players
    where round_id = r.id;

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

    select exists (
      select 1 from public.catches c where c.user_id = rec.user_id and c.dex = r.dex
    ) into owns;

    calc := private.capture_chance(
      r.dex,
      rec.ball,
      case when rec.prep = 'bait' then null else rec.prep end,
      bait_count,
      player_count,
      rec.prep = 'bait',
      owns,
      r.variant = 'shiny',
      1.0,
      clk,
      cfg
    );
    v_odds := (calc->>'finalChance')::numeric;
    if coalesce((calc->>'guaranteed')::boolean, false) then
      v_roll := 0;
      v_caught := true;
    else
      v_roll := private.secure_random();
      v_caught := v_roll < v_odds;
    end if;

    update public.encounter_players ep
      set chance = v_odds, roll = v_roll, caught = v_caught,
          result = case when v_caught then 'Caught' else 'Escaped' end,
          result_reason = case when v_caught then 'caught' else 'escaped' end
      where ep.round_id = rec.round_id and ep.user_id = rec.user_id;

    insert into public.capture_log (
      round_id, user_id, dex, species_name, variant, gender, is_shiny, is_female,
      canonical_catch_rate, base_chance, ball_key, ball_multiplier, ball_condition_met,
      berry_key, berry_multiplier, honey_contributors, honey_participants, honey_multiplier,
      honey_contributor_multiplier, shiny_multiplier, event_multiplier, other_multiplier,
      raw_chance, final_chance, capture_roll, success, detail
    )
    values (
      r.id, rec.user_id, r.dex, r.name, r.variant, r.gender,
      r.variant = 'shiny', r.gender = 'Female',
      (calc->>'catchRate')::int, (calc->>'baseChance')::numeric,
      calc->'ball'->>'key', (calc->'ball'->>'multiplier')::numeric,
      (calc->'ball'->>'conditionMet')::boolean,
      calc->'berry'->>'key', (calc->'berry'->>'multiplier')::numeric,
      (calc->'honey'->>'contributors')::int, (calc->'honey'->>'participants')::int,
      (calc->'honey'->>'multiplier')::numeric,
      (calc->>'honeyContributorMultiplier')::numeric,
      (calc->>'shinyMultiplier')::numeric, (calc->>'eventMultiplier')::numeric,
      (calc->>'otherMultiplier')::numeric,
      (calc->>'rawChance')::numeric, v_odds, v_roll, v_caught, calc
    )
    on conflict (round_id, user_id) do nothing;

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
$function$;

create or replace function private.public_round_json(r encounter_rounds)
returns jsonb
language plpgsql
stable
as $function$
declare
  ph text;
  participants int;
  prepared int;
  thrown int;
  bait_count int;
  honey_calc jsonb;
  activity jsonb;
  honey jsonb;
  catchers jsonb;
  throwers jsonb;
  settled boolean;
  species_types text[];
begin
  if r is null then
    return null;
  end if;
  ph := private.round_phase(r);
  select s.types into species_types from public.species s where s.dex = r.dex;
  select
    count(*)::int,
    count(*) filter (where prep is not null)::int,
    count(*) filter (where ball is not null)::int,
    count(*) filter (where prep = 'bait')::int
  into participants, prepared, thrown, bait_count
  from public.encounter_players
  where round_id = r.id;
  honey_calc := private.capture_honey_modifier(bait_count, participants);
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
  select coalesce(jsonb_agg(jsonb_build_object(
      'name', coalesce(private.trainer_label(ep.user_id), 'Trainer'),
      'ball', ep.ball
    ) order by coalesce(private.trainer_label(ep.user_id), 'Trainer')), '[]'::jsonb)
    into throwers
    from public.encounter_players ep
    where ep.round_id = r.id and ep.ball is not null;
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
    'overlayPhase', r.phase,
    'paused', private.round_paused(r),
    'hidden', r.hidden,
    'cancelled', r.cancelled,
    'resolved', r.resolved,
    'pausedAt', r.paused_at,
    'dex', r.dex,
    'name', r.name,
    'variant', r.variant,
    'gender', r.gender,
    'types', coalesce(to_jsonb(species_types), '[]'::jsonb),
    'location', coalesce(nullif(r.pokemon->>'location', ''), private.lgpe_habitat(r.dex)),
    'startedAt', r.started_at,
    'endsAt', private.phase_display_ends(r, ph),
    'deadlines', r.deadlines,
    'participants', participants,
    'prepared', prepared,
    'thrown', thrown,
    'honeyContributors', bait_count,
    'honeyParticipants', participants,
    'honeyMultiplier', (honey_calc->>'multiplier')::numeric,
    'baitBonusPercent', round(100 * ((honey_calc->>'multiplier')::numeric - 1), 1),
    'lastAction', r.last_action,
    'activity', activity,
    'honeyTrainers', coalesce(honey, '[]'::jsonb),
    'throwers', coalesce(throwers, '[]'::jsonb),
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
$function$;

create or replace function public.play_store()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
  inv public.inventories;
  pass boolean := false;
  supply jsonb;
  hours numeric;
begin
  if uid is not null then
    inv := private.ensure_inventory(uid);
    select starlight_pass into pass from public.profiles where id = uid;
  end if;
  supply := private.economy_config()->'dailySupply';
  hours := coalesce((supply->>'cooldownHours')::numeric, 20);
  return private.play_snapshot(uid) || jsonb_build_object(
    'ok', true,
    'catalog', private.store_catalog() || jsonb_build_object('avatars', private.premium_avatar_catalog()),
    'wallet', case when inv.user_id is null then null else jsonb_build_object(
      'coins', inv.coins,
      'capacity', private.bag_capacity(uid),
      'used', private.item_total(inv),
      'dailyReady', pass and (inv.pass_daily_at is null or inv.pass_daily_at < now() - interval '20 hours'),
      'weeklyReady', pass and (inv.pass_weekly_at is null or inv.pass_weekly_at < now() - interval '6 days'),
      'dailySupplyReady', inv.daily_supply_at is null or inv.daily_supply_at <= now() - (interval '1 hour' * hours),
      'dailySupplyAt', inv.daily_supply_at
    ) end
  );
end;
$function$;
