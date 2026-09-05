create table if not exists public.species (
  dex int primary key check (dex between 1 and 151),
  name text not null
);

insert into public.species (dex, name) values
(1, $$Bulbasaur$$),
(2, $$Ivysaur$$),
(3, $$Venusaur$$),
(4, $$Charmander$$),
(5, $$Charmeleon$$),
(6, $$Charizard$$),
(7, $$Squirtle$$),
(8, $$Wartortle$$),
(9, $$Blastoise$$),
(10, $$Caterpie$$),
(11, $$Metapod$$),
(12, $$Butterfree$$),
(13, $$Weedle$$),
(14, $$Kakuna$$),
(15, $$Beedrill$$),
(16, $$Pidgey$$),
(17, $$Pidgeotto$$),
(18, $$Pidgeot$$),
(19, $$Rattata$$),
(20, $$Raticate$$),
(21, $$Spearow$$),
(22, $$Fearow$$),
(23, $$Ekans$$),
(24, $$Arbok$$),
(25, $$Pikachu$$),
(26, $$Raichu$$),
(27, $$Sandshrew$$),
(28, $$Sandslash$$),
(29, $$Nidoran♀$$),
(30, $$Nidorina$$),
(31, $$Nidoqueen$$),
(32, $$Nidoran♂$$),
(33, $$Nidorino$$),
(34, $$Nidoking$$),
(35, $$Clefairy$$),
(36, $$Clefable$$),
(37, $$Vulpix$$),
(38, $$Ninetales$$),
(39, $$Jigglypuff$$),
(40, $$Wigglytuff$$),
(41, $$Zubat$$),
(42, $$Golbat$$),
(43, $$Oddish$$),
(44, $$Gloom$$),
(45, $$Vileplume$$),
(46, $$Paras$$),
(47, $$Parasect$$),
(48, $$Venonat$$),
(49, $$Venomoth$$),
(50, $$Diglett$$),
(51, $$Dugtrio$$),
(52, $$Meowth$$),
(53, $$Persian$$),
(54, $$Psyduck$$),
(55, $$Golduck$$),
(56, $$Mankey$$),
(57, $$Primeape$$),
(58, $$Growlithe$$),
(59, $$Arcanine$$),
(60, $$Poliwag$$),
(61, $$Poliwhirl$$),
(62, $$Poliwrath$$),
(63, $$Abra$$),
(64, $$Kadabra$$),
(65, $$Alakazam$$),
(66, $$Machop$$),
(67, $$Machoke$$),
(68, $$Machamp$$),
(69, $$Bellsprout$$),
(70, $$Weepinbell$$),
(71, $$Victreebel$$),
(72, $$Tentacool$$),
(73, $$Tentacruel$$),
(74, $$Geodude$$),
(75, $$Graveler$$),
(76, $$Golem$$),
(77, $$Ponyta$$),
(78, $$Rapidash$$),
(79, $$Slowpoke$$),
(80, $$Slowbro$$),
(81, $$Magnemite$$),
(82, $$Magneton$$),
(83, $$Farfetch'd$$),
(84, $$Doduo$$),
(85, $$Dodrio$$),
(86, $$Seel$$),
(87, $$Dewgong$$),
(88, $$Grimer$$),
(89, $$Muk$$),
(90, $$Shellder$$),
(91, $$Cloyster$$),
(92, $$Gastly$$),
(93, $$Haunter$$),
(94, $$Gengar$$),
(95, $$Onix$$),
(96, $$Drowzee$$),
(97, $$Hypno$$),
(98, $$Krabby$$),
(99, $$Kingler$$),
(100, $$Voltorb$$),
(101, $$Electrode$$),
(102, $$Exeggcute$$),
(103, $$Exeggutor$$),
(104, $$Cubone$$),
(105, $$Marowak$$),
(106, $$Hitmonlee$$),
(107, $$Hitmonchan$$),
(108, $$Lickitung$$),
(109, $$Koffing$$),
(110, $$Weezing$$),
(111, $$Rhyhorn$$),
(112, $$Rhydon$$),
(113, $$Chansey$$),
(114, $$Tangela$$),
(115, $$Kangaskhan$$),
(116, $$Horsea$$),
(117, $$Seadra$$),
(118, $$Goldeen$$),
(119, $$Seaking$$),
(120, $$Staryu$$),
(121, $$Starmie$$),
(122, $$Mr. Mime$$),
(123, $$Scyther$$),
(124, $$Jynx$$),
(125, $$Electabuzz$$),
(126, $$Magmar$$),
(127, $$Pinsir$$),
(128, $$Tauros$$),
(129, $$Magikarp$$),
(130, $$Gyarados$$),
(131, $$Lapras$$),
(132, $$Ditto$$),
(133, $$Eevee$$),
(134, $$Vaporeon$$),
(135, $$Jolteon$$),
(136, $$Flareon$$),
(137, $$Porygon$$),
(138, $$Omanyte$$),
(139, $$Omastar$$),
(140, $$Kabuto$$),
(141, $$Kabutops$$),
(142, $$Aerodactyl$$),
(143, $$Snorlax$$),
(144, $$Articuno$$),
(145, $$Zapdos$$),
(146, $$Moltres$$),
(147, $$Dratini$$),
(148, $$Dragonair$$),
(149, $$Dragonite$$),
(150, $$Mewtwo$$),
(151, $$Mew$$)
on conflict (dex) do update set name = excluded.name;

alter table public.species enable row level security;

drop policy if exists "public can read species" on public.species;
create policy "public can read species"
  on public.species for select to anon, authenticated
  using (true);

grant select on public.species to anon, authenticated;

create table if not exists public.encounter_players (
  round_id uuid not null references public.encounter_rounds(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  prep text,
  ball text,
  result text,
  chance numeric,
  roll numeric,
  caught boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (round_id, user_id)
);

alter table public.encounter_players enable row level security;

drop policy if exists "users can read own encounter actions" on public.encounter_players;
create policy "users can read own encounter actions"
  on public.encounter_players for select to authenticated
  using (user_id = auth.uid());

grant select on public.encounter_players to authenticated;

create or replace function private.keep_bits_off()
returns trigger
language plpgsql
as $$
begin
  new.bits_store_enabled := false;
  return new;
end;
$$;

drop trigger if exists keep_bits_off on public.site_config;
create trigger keep_bits_off
  before insert or update on public.site_config
  for each row execute procedure private.keep_bits_off();

create or replace function private.item_label(item text)
returns text
language sql
immutable
as $$
  select case item
    when 'berry' then 'Berry'
    when 'bait' then 'Bait'
    when 'pokeball' then 'Poké Ball'
    when 'greatball' then 'Great Ball'
    when 'ultraball' then 'Ultra Ball'
    else coalesce(item, '')
  end;
$$;

create or replace function private.game_settings()
returns jsonb
language sql
stable
as $$
  select game_settings from public.site_config where id = 1;
$$;

create or replace function private.round_phase(r public.encounter_rounds)
returns text
language plpgsql
stable
as $$
begin
  if r is null or r.cancelled then
    return 'closed';
  end if;
  if r.deadlines is null then
    return coalesce(r.phase, 'closed');
  end if;
  if now() < (r.deadlines->>'join')::timestamptz then return 'join'; end if;
  if now() < (r.deadlines->>'prepare')::timestamptz then return 'prepare'; end if;
  if now() < (r.deadlines->>'throw')::timestamptz then return 'throw'; end if;
  if now() < (r.deadlines->>'reveal')::timestamptz then return 'reveal'; end if;
  return 'closed';
end;
$$;

create or replace function private.phase_ends_at(r public.encounter_rounds, ph text)
returns timestamptz
language sql
stable
as $$
  select case ph
    when 'join' then (r.deadlines->>'join')::timestamptz
    when 'prepare' then (r.deadlines->>'prepare')::timestamptz
    when 'throw' then (r.deadlines->>'throw')::timestamptz
    when 'reveal' then (r.deadlines->>'reveal')::timestamptz
    else (r.deadlines->>'reveal')::timestamptz
  end;
$$;

create or replace function private.latest_round()
returns public.encounter_rounds
language sql
stable
as $$
  select * from public.encounter_rounds
  order by coalesce(started_at, updated_at) desc, updated_at desc
  limit 1;
$$;

create or replace function private.round_is_active(r public.encounter_rounds)
returns boolean
language sql
stable
as $$
  select r is not null and not r.cancelled and private.round_phase(r) <> 'closed';
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
  odds numeric;
  roll numeric;
  caught boolean;
begin
  if r is null or r.cancelled or r.resolved then
    return r;
  end if;
  if now() < (r.deadlines->>'throw')::timestamptz then
    return r;
  end if;

  rules := coalesce(r.rules, private.game_settings());
  select count(*)::int, count(*) filter (where prep = 'bait')::int
    into player_count, bait_count
  from public.encounter_players
  where round_id = r.id;
  shared := coalesce((rules->>'maxBaitBonus')::numeric, 0) * bait_count / greatest(player_count, 1);

  for rec in select * from public.encounter_players where round_id = r.id
  loop
    if rec.ball is null then
      update public.encounter_players
        set result = 'No throw', caught = false
        where round_id = rec.round_id and user_id = rec.user_id;
      continue;
    end if;
    odds := least(
      coalesce((rules->>'maxCatchChance')::numeric, 0.9),
      coalesce((rules->'ballChances'->>rec.ball)::numeric, 0)
        + shared
        + case when rec.prep = 'berry' then coalesce((rules->>'berryBonus')::numeric, 0) else 0 end
    );
    roll := random();
    caught := roll < odds;
    update public.encounter_players
      set chance = odds, roll = roll, caught = caught, result = case when caught then 'Caught' else 'Escaped' end
      where round_id = rec.round_id and user_id = rec.user_id;
    if caught then
      insert into public.catches (user_id, dex, name, variant, gender, ball)
      values (rec.user_id, r.dex, r.name, r.variant, r.gender, rec.ball);
    end if;
  end loop;

  update public.encounter_rounds
    set resolved = true, last_action = 'Results locked in', updated_at = now()
    where id = r.id
    returning * into r;
  return r;
end;
$$;

create or replace function private.sync_latest_round()
returns public.encounter_rounds
language plpgsql
as $$
declare
  r public.encounter_rounds;
  ph text;
begin
  perform pg_advisory_xact_lock(87231001);
  r := private.latest_round();
  r := private.settle_if_needed(r);
  if r is null then
    return r;
  end if;
  ph := private.round_phase(r);
  update public.encounter_rounds
    set phase = ph,
        ends_at = private.phase_ends_at(r, ph),
        updated_at = now()
    where id = r.id
    returning * into r;
  return r;
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

  return jsonb_build_object(
    'id', r.id,
    'phase', ph,
    'hidden', r.hidden,
    'cancelled', r.cancelled,
    'resolved', r.resolved,
    'dex', r.dex,
    'name', r.name,
    'variant', r.variant,
    'gender', r.gender,
    'startedAt', r.started_at,
    'endsAt', private.phase_ends_at(r, ph),
    'deadlines', r.deadlines,
    'participants', participants,
    'prepared', prepared,
    'thrown', thrown,
    'baitBonusPercent', round(100 * shared, 1),
    'lastAction', r.last_action,
    'results', case when r.resolved then (
      select jsonb_build_object(
        'caught', count(*) filter (where caught)::int,
        'escaped', count(*) filter (where result = 'Escaped')::int,
        'noThrow', count(*) filter (where coalesce(result, '') = 'No throw')::int
      )
      from public.encounter_players
      where round_id = r.id
    ) else null end
  );
end;
$$;

create or replace function private.play_snapshot(p_uid uuid)
returns jsonb
language plpgsql
as $$
declare
  r public.encounter_rounds;
  bag jsonb;
  me jsonb;
  pass jsonb;
  settings jsonb;
  is_admin boolean;
  visible jsonb;
begin
  r := private.sync_latest_round();
  is_admin := p_uid is not null and private.is_play_admin();
  settings := private.game_settings();

  if p_uid is not null then
    select jsonb_build_object(
      'berry', i.berry, 'bait', i.bait, 'pokeball', i.pokeball,
      'greatball', i.greatball, 'ultraball', i.ultraball
    ) into bag
    from public.inventories i where i.user_id = p_uid;

    select jsonb_build_object(
      'active', p.starlight_pass,
      'source', p.pass_source,
      'checkedAt', p.pass_checked_at
    ) into pass
    from public.profiles p where p.id = p_uid;

    if r is not null then
      select jsonb_build_object(
        'joined', true,
        'prep', ep.prep,
        'ball', ep.ball,
        'result', ep.result,
        'chance', ep.chance,
        'caught', ep.caught
      ) into me
      from public.encounter_players ep
      where ep.round_id = r.id and ep.user_id = p_uid;
    end if;
  end if;

  if r is not null and (not r.hidden or is_admin) then
    visible := private.public_round_json(r);
  end if;

  return jsonb_build_object(
    'round', visible,
    'me', me,
    'bag', bag,
    'pass', pass,
    'isAdmin', is_admin,
    'settings', jsonb_build_object(
      'joinSeconds', settings->>'joinSeconds',
      'prepareSeconds', settings->>'prepareSeconds',
      'throwSeconds', settings->>'throwSeconds',
      'revealSeconds', settings->>'revealSeconds',
      'ballChances', settings->'ballChances',
      'berryBonus', settings->'berryBonus',
      'maxBaitBonus', settings->'maxBaitBonus',
      'maxCatchChance', settings->'maxCatchChance'
    ),
    'channel', (select broadcaster_twitch_login from public.site_config where id = 1),
    'bitsStoreEnabled', false,
    'live', (select is_live from public.stream_status where id = 1)
  );
end;
$$;

create or replace function public.play_state()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  return private.play_snapshot(auth.uid());
end;
$$;

create or replace function public.play_sync()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  return private.play_snapshot(auth.uid());
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
begin
  if uid is null then
    raise exception 'Sign in to join.' using errcode = '42501';
  end if;
  r := private.sync_latest_round();
  if not private.round_is_active(r) or private.round_phase(r) <> 'join' or r.hidden then
    raise exception 'Joining is closed. Wait for the next encounter.';
  end if;
  insert into public.inventories (user_id)
  values (uid)
  on conflict (user_id) do nothing;
  if exists (select 1 from public.encounter_players where round_id = r.id and user_id = uid) then
    raise exception 'You already joined; no extra items granted.';
  end if;
  insert into public.encounter_players (round_id, user_id)
  values (r.id, uid);
  update public.encounter_rounds
    set last_action = 'A trainer joined', updated_at = now()
    where id = r.id;
  return private.play_snapshot(uid) || jsonb_build_object('ok', true, 'message', 'You joined! Wait for preparation, then use a Berry or Bait.');
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
  spent int;
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  if p_item not in ('berry', 'bait') then
    raise exception 'Use a Berry or Bait during preparation.';
  end if;
  r := private.sync_latest_round();
  if not private.round_is_active(r) or private.round_phase(r) <> 'prepare' or r.hidden then
    raise exception 'That action is only available during the prepare phase.';
  end if;
  if not exists (select 1 from public.encounter_players where round_id = r.id and user_id = uid) then
    raise exception 'You must join this encounter during its join window.';
  end if;
  if exists (select 1 from public.encounter_players where round_id = r.id and user_id = uid and prep is not null) then
    raise exception 'You already used that action. No additional item spent.';
  end if;

  if p_item = 'berry' then
    update public.inventories set berry = berry - 1, updated_at = now()
      where user_id = uid and berry > 0;
  else
    update public.inventories set bait = bait - 1, updated_at = now()
      where user_id = uid and bait > 0;
  end if;
  get diagnostics spent = row_count;
  if spent = 0 then
    raise exception 'You have no % left. No item spent.', private.item_label(p_item);
  end if;

  update public.encounter_players set prep = p_item where round_id = r.id and user_id = uid;
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
  spent int;
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  if p_item not in ('pokeball', 'greatball', 'ultraball') then
    raise exception 'Choose a Poké Ball, Great Ball, or Ultra Ball.';
  end if;
  r := private.sync_latest_round();
  if not private.round_is_active(r) or private.round_phase(r) <> 'throw' or r.hidden then
    raise exception 'That action is only available during the throw phase.';
  end if;
  if not exists (select 1 from public.encounter_players where round_id = r.id and user_id = uid) then
    raise exception 'You must join this encounter during its join window.';
  end if;
  if exists (select 1 from public.encounter_players where round_id = r.id and user_id = uid and prep is null) then
    raise exception 'Use a berry or bait during preparation before throwing a ball.';
  end if;
  if exists (select 1 from public.encounter_players where round_id = r.id and user_id = uid and ball is not null) then
    raise exception 'You already used that action. No additional item spent.';
  end if;

  if p_item = 'pokeball' then
    update public.inventories set pokeball = pokeball - 1, updated_at = now()
      where user_id = uid and pokeball > 0;
  elsif p_item = 'greatball' then
    update public.inventories set greatball = greatball - 1, updated_at = now()
      where user_id = uid and greatball > 0;
  else
    update public.inventories set ultraball = ultraball - 1, updated_at = now()
      where user_id = uid and ultraball > 0;
  end if;
  get diagnostics spent = row_count;
  if spent = 0 then
    raise exception 'You have no % left. No item spent.', private.item_label(p_item);
  end if;

  update public.encounter_players set ball = p_item where round_id = r.id and user_id = uid;
  update public.encounter_rounds
    set last_action = 'A trainer used ' || private.item_label(p_item), updated_at = now()
    where id = r.id;
  return private.play_snapshot(uid) || jsonb_build_object('ok', true, 'message', 'Your throw is locked in. Results appear at the end of this phase.');
end;
$$;

create or replace function public.admin_start_round(p_dex int default null)
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
  if random() < 0.02 then
    chosen_variant := 'shiny';
  end if;
  chosen_gender := case when random() < 0.5 then 'Male' else 'Female' end;
  deadlines := jsonb_build_object(
    'join', t + make_interval(secs => coalesce((settings->>'joinSeconds')::double precision, 30)),
    'prepare', t + make_interval(secs => coalesce((settings->>'joinSeconds')::double precision, 30) + coalesce((settings->>'prepareSeconds')::double precision, 20)),
    'throw', t + make_interval(secs => coalesce((settings->>'joinSeconds')::double precision, 30) + coalesce((settings->>'prepareSeconds')::double precision, 20) + coalesce((settings->>'throwSeconds')::double precision, 15)),
    'reveal', t + make_interval(secs => coalesce((settings->>'joinSeconds')::double precision, 30) + coalesce((settings->>'prepareSeconds')::double precision, 20) + coalesce((settings->>'throwSeconds')::double precision, 15) + coalesce((settings->>'revealSeconds')::double precision, 12))
  );
  insert into public.encounter_rounds (
    phase, hidden, pokemon, dex, name, variant, gender, started_at, deadlines, rules, resolved, cancelled, last_action, ends_at
  ) values (
    'join', false,
    jsonb_build_object('dex', chosen_dex, 'name', chosen_name, 'variant', chosen_variant, 'gender', chosen_gender),
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
  if not private.is_play_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  r := private.sync_latest_round();
  if r is null or r.cancelled then
    raise exception 'No active community round.';
  end if;
  if not r.resolved then
    for rec in select * from public.encounter_players where round_id = r.id
    loop
      if rec.prep = 'berry' then
        update public.inventories set berry = berry + 1, updated_at = now() where user_id = rec.user_id;
      elsif rec.prep = 'bait' then
        update public.inventories set bait = bait + 1, updated_at = now() where user_id = rec.user_id;
      end if;
      if rec.ball = 'pokeball' then
        update public.inventories set pokeball = pokeball + 1, updated_at = now() where user_id = rec.user_id;
      elsif rec.ball = 'greatball' then
        update public.inventories set greatball = greatball + 1, updated_at = now() where user_id = rec.user_id;
      elsif rec.ball = 'ultraball' then
        update public.inventories set ultraball = ultraball + 1, updated_at = now() where user_id = rec.user_id;
      end if;
    end loop;
  end if;
  update public.encounter_rounds
    set cancelled = true, hidden = true, phase = 'closed', last_action = 'Round cancelled', updated_at = now()
    where id = r.id;
  return private.play_snapshot(auth.uid()) || jsonb_build_object('ok', true, 'message', 'Community round closed. Unresolved items were refunded.');
end;
$$;

create or replace function public.admin_hide_round(p_hidden boolean)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  r public.encounter_rounds;
begin
  if not private.is_play_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  r := private.sync_latest_round();
  if r is null then
    raise exception 'No encounter to hide.';
  end if;
  update public.encounter_rounds
    set hidden = p_hidden, last_action = case when p_hidden then 'Hidden from viewers' else 'Shown to viewers' end, updated_at = now()
    where id = r.id;
  return private.play_snapshot(auth.uid()) || jsonb_build_object(
    'ok', true,
    'message', case when p_hidden then 'Encounter hidden from the public Play page.' else 'Encounter is visible on the Play page.' end
  );
end;
$$;

create or replace function public.admin_refill_test()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  r public.encounter_rounds;
  settings jsonb;
  changed int;
begin
  if not private.is_play_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  r := private.sync_latest_round();
  if private.round_is_active(r) then
    raise exception 'Finish or cancel the community round before refilling test items.';
  end if;
  settings := private.game_settings();
  update public.inventories i
    set berry = greatest(i.berry, coalesce((settings->'starterItems'->>'berry')::int, 10)),
        bait = greatest(i.bait, coalesce((settings->'starterItems'->>'bait')::int, 10)),
        pokeball = greatest(i.pokeball, coalesce((settings->'starterItems'->>'pokeball')::int, 10)),
        greatball = greatest(i.greatball, coalesce((settings->'starterItems'->>'greatball')::int, 5)),
        ultraball = greatest(i.ultraball, coalesce((settings->'starterItems'->>'ultraball')::int, 3)),
        updated_at = now();
  get diagnostics changed = row_count;
  return private.play_snapshot(auth.uid()) || jsonb_build_object(
    'ok', true,
    'message', format('Free test refill: topped up %s trainer bag(s). Collections were left alone.', changed)
  );
end;
$$;

create or replace function public.admin_save_game_settings(p_settings jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
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
  foreach k in array array['pokeball','greatball','ultraball']
  loop
    v := (p_settings->'ballChances'->>k)::numeric;
    if v is null or v < 0 or v > 1 then
      raise exception 'Ball odds must be between 0 and 1.';
    end if;
    next_settings := jsonb_set(next_settings, array['ballChances', k], to_jsonb(v));
  end loop;
  foreach k in array array['berryBonus','maxBaitBonus','maxCatchChance']
  loop
    v := (p_settings->>k)::numeric;
    if v is null or v < 0 or v > 1 then
      raise exception '% must be between 0 and 1.', k;
    end if;
    next_settings := jsonb_set(next_settings, array[k], to_jsonb(v));
  end loop;
  update public.site_config
    set game_settings = next_settings, bits_store_enabled = false, updated_at = now()
    where id = 1;
  return private.play_snapshot(auth.uid()) || jsonb_build_object('ok', true, 'message', 'Encounter timings and odds saved. Bits purchases stay off.');
end;
$$;

create or replace function public.admin_save_channel(p_login text, p_client_id text default null, p_broadcaster_id text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not private.is_play_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.site_config
    set broadcaster_twitch_login = lower(btrim(coalesce(p_login, ''))),
        twitch_client_id = coalesce(p_client_id, twitch_client_id),
        twitch_broadcaster_id = coalesce(p_broadcaster_id, twitch_broadcaster_id),
        updated_at = now()
    where id = 1;
  return private.play_snapshot(auth.uid()) || jsonb_build_object('ok', true, 'message', 'Stream channel settings saved.');
end;
$$;

create or replace function public.admin_set_pass(p_login text, p_active boolean)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  updated int;
begin
  if not private.is_play_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.profiles
    set starlight_pass = p_active,
        pass_source = case when p_active then 'admin' else null end,
        pass_checked_at = now(),
        updated_at = now()
    where lower(twitch_login) = lower(btrim(p_login));
  get diagnostics updated = row_count;
  if updated = 0 then
    raise exception 'No Play trainer matches that Twitch login yet.';
  end if;
  return jsonb_build_object(
    'ok', true,
    'message', case when p_active then 'Starlight Pass granted.' else 'Starlight Pass removed.' end
  );
end;
$$;

create or replace function private.admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  r public.encounter_rounds;
  cfg public.site_config%rowtype;
begin
  if not private.is_play_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  r := private.latest_round();
  select * into cfg from public.site_config where id = 1;
  return jsonb_build_object(
    'trainers', (select count(*)::int from public.profiles),
    'passes', (select count(*)::int from public.profiles where starlight_pass),
    'channel', cfg.broadcaster_twitch_login,
    'twitchClientId', cfg.twitch_client_id,
    'twitchBroadcasterId', cfg.twitch_broadcaster_id,
    'live', (select is_live from public.stream_status where id = 1),
    'settings', cfg.game_settings,
    'bitsStoreEnabled', false,
    'round', private.public_round_json(r)
  );
end;
$$;

grant execute on function public.play_state() to anon, authenticated;
grant execute on function public.play_sync() to anon, authenticated;
grant execute on function public.play_join() to authenticated;
grant execute on function public.play_prepare(text) to authenticated;
grant execute on function public.play_throw(text) to authenticated;
grant execute on function public.admin_start_round(int) to authenticated;
grant execute on function public.admin_cancel_round() to authenticated;
grant execute on function public.admin_hide_round(boolean) to authenticated;
grant execute on function public.admin_refill_test() to authenticated;
grant execute on function public.admin_save_game_settings(jsonb) to authenticated;
grant execute on function public.admin_save_channel(text, text, text) to authenticated;
grant execute on function public.admin_set_pass(text, boolean) to authenticated;
grant execute on function public.admin_overview() to authenticated;
grant execute on function public.is_play_admin() to anon, authenticated;
