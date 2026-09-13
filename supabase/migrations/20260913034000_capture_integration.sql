-- Capture integration: bag helpers, prepare/settlement, snapshot payloads and store catalog
-- rewritten so every Berry in public.capture_berries behaves like a first class item.

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
  reward_coins int;
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

    -- Ownership has to be read before this round's catch is written.
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

      -- Pinap style Berries pay a small bonus on a successful catch.
      reward_coins := floor(
        coalesce((calc->'berry'->>'rewardBonus')::numeric, 0)
        * coalesce((cfg->>'rewardBonusCoins')::numeric, 10)
      )::int;
      if coalesce(reward_coins, 0) > 0 then
        update public.inventories
          set coins = coins + reward_coins, updated_at = now()
          where user_id = rec.user_id;
      end if;
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

create or replace function private.capture_berry_keys()
returns text[]
language sql
stable
as $function$
  select coalesce(array_agg(key order by sort_order, key), '{}'::text[])
  from public.capture_berries
  where key <> all (private.core_item_keys());
$function$;

create or replace function private.stream_prep_item(item text)
returns text
language sql
stable
as $function$
  select case when item = 'bait' then 'bait' else 'berry' end;
$function$;

create or replace function private.capture_items_json()
returns jsonb
language sql
stable
as $function$
  select jsonb_build_object(
    'berries', coalesce((
      select jsonb_agg(jsonb_build_object(
        'key', b.key,
        'name', b.name,
        'sprite', b.sprite,
        'tier', b.tier,
        'rarity', b.rarity,
        'description', coalesce(b.rpg_description, b.canonical_flavor_text),
        'storeAvailable', b.store_available,
        'price', b.shop_price
      ) order by b.sort_order, b.name)
      from public.capture_berries b
      where b.enabled and b.capture_enabled
    ), '[]'::jsonb),
    'honey', jsonb_build_object(
      'key', 'bait',
      'name', 'Honey',
      'sprite', 'honey.png',
      'description', 'Shared with everyone. The more Trainers who add Honey, the better the whole group''s chances.'
    )
  );
$function$;

create or replace function private.grant_known(p_uid uuid, p_grants jsonb)
returns void
language plpgsql
as $function$
declare
  inv public.inventories;
  cap int;
  add_items int;
  add_bonus int;
  extra_add int;
  berry_add int;
  k text;
  n int;
  room int;
begin
  inv := private.ensure_inventory(p_uid);
  add_bonus := greatest(coalesce((p_grants->>'bag_bonus')::int, 0), 0);
  room := private.bag_capacity_max() - private.bag_capacity(p_uid);
  if add_bonus > 0 and room <= 0 then
    raise exception 'Bag space is already at the 10,000 item maximum.';
  end if;
  if add_bonus > room then
    add_bonus := greatest(room, 0);
  end if;
  extra_add := coalesce((
    select sum(greatest(coalesce(value::int, 0), 0))
    from jsonb_each_text(coalesce(p_grants, '{}'::jsonb))
    where key = any (private.extra_ball_keys())
  ), 0);
  berry_add := coalesce((
    select sum(greatest(coalesce(value::int, 0), 0))
    from jsonb_each_text(coalesce(p_grants, '{}'::jsonb))
    where key = any (private.capture_berry_keys())
  ), 0);
  add_items := coalesce((p_grants->>'berry')::int, 0)
    + coalesce((p_grants->>'bait')::int, 0)
    + coalesce((p_grants->>'pokeball')::int, 0)
    + coalesce((p_grants->>'greatball')::int, 0)
    + coalesce((p_grants->>'ultraball')::int, 0)
    + coalesce((p_grants->>'lure')::int, 0)
    + extra_add
    + berry_add;
  cap := private.bag_capacity(p_uid) + add_bonus;
  if private.item_total(inv) + add_items > cap then
    raise exception 'Inventory is full. Buy a Pouch on the Store or use some items first.';
  end if;
  update public.inventories
    set berry = berry + coalesce((p_grants->>'berry')::int, 0),
        bait = bait + coalesce((p_grants->>'bait')::int, 0),
        pokeball = pokeball + coalesce((p_grants->>'pokeball')::int, 0),
        greatball = greatball + coalesce((p_grants->>'greatball')::int, 0),
        ultraball = ultraball + coalesce((p_grants->>'ultraball')::int, 0),
        lure = lure + coalesce((p_grants->>'lure')::int, 0),
        coins = coins + coalesce((p_grants->>'coins')::int, 0),
        bag_bonus = bag_bonus + add_bonus,
        updated_at = now()
    where user_id = p_uid;
  foreach k in array private.extra_ball_keys() loop
    n := coalesce((p_grants->>k)::int, 0);
    if n > 0 then
      update public.inventories
        set balls = jsonb_set(
          coalesce(balls, '{}'::jsonb),
          array[k],
          to_jsonb(coalesce((balls->>k)::int, 0) + n)
        ),
        updated_at = now()
      where user_id = p_uid;
    end if;
  end loop;
  foreach k in array private.capture_berry_keys() loop
    n := coalesce((p_grants->>k)::int, 0);
    if n > 0 then
      update public.inventories
        set berries = jsonb_set(
          coalesce(berries, '{}'::jsonb),
          array[k],
          to_jsonb(coalesce((berries->>k)::int, 0) + n)
        ),
        updated_at = now()
      where user_id = p_uid;
    end if;
  end loop;
end;
$function$;

create or replace function private.store_catalog()
returns jsonb
language sql
stable
as $function$
  select jsonb_build_object(
    'rule', 'Bits and PokéCoins grant exactly the items listed. Poké Balls and Berries change your catch chance; nothing here guarantees a catch except the Master Ball.',
    'coins', coalesce((
      select jsonb_agg(private.store_item_json(i) order by i.sort, i.name)
      from private.store_items i
      join private.store_categories c on c.id = i.category_id
      where c.kind = 'coins' and i.visible and c.visible
    ), '[]'::jsonb),
    'balls', coalesce((
      select jsonb_agg(private.store_item_json(i) order by i.sort, i.name)
      from private.store_items i
      join private.store_categories c on c.id = i.category_id
      where c.kind = 'balls' and i.visible and c.visible
    ), '[]'::jsonb),
    'bits', coalesce((
      select jsonb_agg(private.store_item_json(i) order by i.sort, i.name)
      from private.store_items i
      join private.store_categories c on c.id = i.category_id
      where c.kind = 'bits' and i.visible and c.visible
    ), '[]'::jsonb),
    'floors', private.store_floors()
  );
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
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  if not private.is_prep_item(p_item) then
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
    perform private.enqueue_stream_command('prepare', jsonb_build_object('user', twitch_user, 'name', twitch_name, 'item', private.stream_prep_item(p_item)));
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
begin
  if r is null then
    return null;
  end if;
  ph := private.round_phase(r);
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

create or replace function private.play_snapshot(p_uid uuid, p_round_id uuid default null::uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  r public.encounter_rounds;
  bag jsonb;
  me jsonb;
  pass jsonb;
  settings jsonb;
  enc jsonb;
  is_admin boolean;
  staff_role text;
  visible jsonb;
  inv public.inventories;
  radar_on boolean;
begin
  perform set_config('row_security', 'off', true);
  r := private.load_play_round(p_round_id);
  if r is not null then
    r := coalesce(private.settle_if_needed(r), r);
  end if;
  staff_role := case when p_uid is not null then private.play_staff_role(p_uid) else null end;
  is_admin := staff_role is not null;
  settings := private.game_settings();
  if p_uid is not null then
    perform private.ensure_broadcaster_pass(p_uid);
    inv := private.ensure_inventory(p_uid);
    radar_on := coalesce(inv.lure_until, '-infinity'::timestamptz) > now();
    if inv.lure_armed is distinct from radar_on then
      update public.inventories
        set lure_armed = radar_on, updated_at = now()
        where user_id = p_uid;
      inv.lure_armed := radar_on;
    end if;
    if r is not null and coalesce(r.cancelled, false) = false and private.round_phase(r) <> 'closed' then
      perform private.mark_seen(p_uid, r.dex);
    end if;
    bag := jsonb_build_object(
      'berry', inv.berry, 'bait', inv.bait, 'pokeball', inv.pokeball,
      'greatball', inv.greatball, 'ultraball', inv.ultraball,
      'lure', inv.lure, 'coins', inv.coins,
      'capacity', private.bag_capacity(p_uid),
      'used', private.item_total(inv),
      'lureArmed', radar_on,
      'lureUntil', inv.lure_until
    ) || coalesce(inv.balls, '{}'::jsonb) || coalesce(inv.berries, '{}'::jsonb);
    select
      jsonb_build_object('active', p.starlight_pass, 'source', p.pass_source, 'checkedAt', p.pass_checked_at),
      private.normalize_encounter_settings(p.encounter_settings)
      into pass, enc
      from public.profiles p
      where p.id = p_uid;
    if r is not null then
      select jsonb_build_object(
          'joined', true,
          'prep', ep.prep,
          'ball', ep.ball,
          'result', ep.result,
          'chance', ep.chance,
          'caught', ep.caught
        )
        into me
        from public.encounter_players ep
        where ep.round_id = r.id and ep.user_id = p_uid;
    end if;
  end if;
  visible := private.public_round_json(r);
  return jsonb_build_object(
    'round', visible,
    'me', me,
    'youJoined', me is not null,
    'bag', bag,
    'pass', pass,
    'trainer', private.trainer_card(p_uid),
    'ownedAvatarPacks', private.owned_avatar_packs_json(p_uid),
    'encounterSettings', enc,
    'isAdmin', is_admin,
    'staffRole', staff_role,
    'canManageSecrets', staff_role = 'owner',
    'captureItems', private.capture_items_json(),
    'settings', jsonb_build_object(
      'joinSeconds', settings->>'joinSeconds',
      'prepareSeconds', settings->>'prepareSeconds',
      'throwSeconds', settings->>'throwSeconds',
      'revealSeconds', settings->>'revealSeconds',
      'captureBalance', settings->'captureBalance'
    ),
    'channel', (select broadcaster_twitch_login from public.site_config where id = 1),
    'bitsStoreEnabled', false,
    'bitsCatalogEnabled', true,
    'coinShopEnabled', true,
    'live', (select is_live from public.stream_status where id = 1),
    'console', private.play_console_json(100)
  );
end;
$function$;

-- The legacy flat catch odds are gone; only the phase clocks live here now.
create or replace function public.admin_save_game_settings(p_settings jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  next_settings jsonb;
  keys text[] := array['joinSeconds','prepareSeconds','throwSeconds','revealSeconds'];
  k text;
  v numeric;
begin
  if not private.is_play_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  next_settings := coalesce(private.game_settings(), '{}'::jsonb);
  foreach k in array keys
  loop
    v := (p_settings->>k)::numeric;
    if v is null or v < 5 or v > 180 then
      raise exception '% must be between 5 and 180 seconds.', k;
    end if;
    next_settings := jsonb_set(next_settings, array[k], to_jsonb(v));
  end loop;
  update public.site_config
    set game_settings = next_settings, bits_store_enabled = false, updated_at = now()
    where id = 1;
  return private.play_snapshot(auth.uid()) || jsonb_build_object('ok', true, 'message', 'Encounter timings saved. Bits purchases stay off.');
end;
$function$;

