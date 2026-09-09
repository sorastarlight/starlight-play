-- Let's Go unique individuals, OT/met data, and extra Poké Balls.

alter table public.catches
  add column if not exists ot_user_id uuid,
  add column if not exists ot_name text,
  add column if not exists ot_number int,
  add column if not exists met_level int,
  add column if not exists met_location text,
  add column if not exists height_m numeric(6,2),
  add column if not exists weight_kg numeric(6,1),
  add column if not exists friendship int;

create or replace function private.lgpe_gender_rate(p_dex int)
returns int
language sql
immutable
as $$
  select (ARRAY[
    1,1,1,1,1,1,1,1,1,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,8,8,8,0,0,0,6,6,6,6,6,6,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,2,2,4,4,4,2,2,2,2,2,2,4,4,4,4,4,4,4,4,4,4,4,4,-1,-1,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,-1,-1,4,4,4,4,0,0,4,4,4,4,4,8,4,8,4,4,4,4,-1,-1,4,4,8,2,2,4,0,4,4,4,-1,1,1,1,1,-1,1,1,1,1,1,1,-1,-1,-1,4,4,4,-1,-1
  ])[greatest(p_dex, 1)];
$$;

create or replace function private.lgpe_habitat(p_dex int)
returns text
language sql
immutable
as $$
  select case
    when p_dex between 1 and 9 then 'Pallet Town'
    when p_dex in (10,11,12,13,14,15,25,26) then 'Viridian Forest'
    when p_dex in (16,17,18,19,20) then 'Route 1'
    when p_dex in (21,22,39,40) then 'Route 3'
    when p_dex in (23,24,27,28) then 'Route 4'
    when p_dex in (29,30,31,32,33,34,56,57) then 'Route 22'
    when p_dex in (35,36,41,42,46,47,74,75,76) then 'Mt. Moon'
    when p_dex in (37,38,58,59) then 'Route 7'
    when p_dex in (43,44,45,69,70,71,48,49) then 'Route 2'
    when p_dex in (50,51) then 'Diglett''s Cave'
    when p_dex in (52,53) then 'Route 8'
    when p_dex in (54,55,60,61,62,118,119,129,130) then 'Route 6'
    when p_dex in (63,64,65,96,97) then 'Route 11'
    when p_dex in (66,67,68,104,105,115) then 'Rock Tunnel'
    when p_dex in (72,73,90,91,98,99,116,117,120,121) then 'Route 19'
    when p_dex in (77,78,133,134) then 'Route 17'
    when p_dex in (79,80,86,87,131,144) then 'Seafoam Islands'
    when p_dex in (81,82,100,101,125,135,145) then 'Power Plant'
    when p_dex in (83,84,85,123,143) then 'Route 12'
    when p_dex in (88,89,109,110) then 'Pokémon Mansion'
    when p_dex in (92,93,94) then 'Pokémon Tower'
    when p_dex in (95,111,112,126,136,146) then 'Victory Road'
    when p_dex in (102,103,147,148,149) then 'Safari Zone'
    when p_dex in (106,107) then 'Saffron City'
    when p_dex in (108,114,127,128) then 'Route 18'
    when p_dex in (113,124) then 'Route 10'
    when p_dex = 122 then 'Route 2'
    when p_dex = 132 then 'Route 13'
    when p_dex = 137 then 'Silph Co.'
    when p_dex in (138,139,140,141,142) then 'Cinnabar Lab'
    when p_dex = 150 then 'Cerulean Cave'
    when p_dex = 151 then 'Faraway place'
    else 'Kanto'
  end;
$$;

create or replace function private.lgpe_level_bounds(p_dex int)
returns int[]
language sql
immutable
as $$
  select case private.lgpe_habitat(p_dex)
    when 'Pallet Town' then array[3,5]
    when 'Route 1' then array[2,5]
    when 'Viridian Forest' then array[3,7]
    when 'Route 2' then array[3,7]
    when 'Route 3' then array[6,10]
    when 'Mt. Moon' then array[6,12]
    when 'Route 4' then array[6,12]
    when 'Route 22' then array[3,8]
    when 'Diglett''s Cave' then array[15,22]
    when 'Route 5' then array[7,12]
    when 'Route 6' then array[7,13]
    when 'Route 7' then array[14,17]
    when 'Route 8' then array[15,20]
    when 'Route 11' then array[12,16]
    when 'Rock Tunnel' then array[13,18]
    when 'Route 19' then array[15,25]
    when 'Route 17' then array[16,22]
    when 'Seafoam Islands' then array[22,30]
    when 'Power Plant' then array[22,32]
    when 'Route 12' then array[22,27]
    when 'Pokémon Mansion' then array[26,32]
    when 'Pokémon Tower' then array[13,18]
    when 'Victory Road' then array[36,42]
    when 'Safari Zone' then array[22,30]
    when 'Saffron City' then array[5,10]
    when 'Route 18' then array[22,28]
    when 'Route 10' then array[16,20]
    when 'Route 13' then array[24,29]
    when 'Silph Co.' then array[16,20]
    when 'Cinnabar Lab' then array[5,15]
    when 'Cerulean Cave' then array[46,56]
    when 'Faraway place' then array[30,30]
    else array[5,20]
  end;
$$;

create or replace function private.lgpe_roll_gender(p_dex int, p_seed int, p_current text)
returns text
language plpgsql
immutable
as $$
declare
  rate int := private.lgpe_gender_rate(p_dex);
  cur text := coalesce(p_current, '');
begin
  if rate = -1 then
    return 'Genderless';
  end if;
  if rate = 0 then
    return 'Male';
  end if;
  if rate = 8 then
    return 'Female';
  end if;
  if cur in ('Male', 'Female') then
    return cur;
  end if;
  if (abs(p_seed) % 8) < rate then
    return 'Female';
  end if;
  return 'Male';
end;
$$;

create or replace function private.stamp_catch_row(c public.catches)
returns public.catches
language plpgsql
as $$
declare
  seed int;
  bounds int[];
  size_roll int;
  scale numeric;
  jitter numeric;
  trainer public.profiles%rowtype;
begin
  if c.public_id is null or btrim(c.public_id) = '' then
    c.public_id := 'LG' || lpad(nextval('public.catch_serial')::text, 8, '0');
  end if;
  seed := abs(('x' || substr(md5(c.id::text), 1, 8))::bit(32)::int);
  bounds := private.lgpe_level_bounds(c.dex);
  if c.level is null then
    c.level := bounds[1] + (seed % (greatest(bounds[2] - bounds[1], 0) + 1));
  end if;
  if c.iv_hp is null then c.iv_hp := (('x' || substr(md5(c.id::text || 'hp'), 1, 2))::bit(8)::int) % 32; end if;
  if c.iv_atk is null then c.iv_atk := (('x' || substr(md5(c.id::text || 'atk'), 1, 2))::bit(8)::int) % 32; end if;
  if c.iv_def is null then c.iv_def := (('x' || substr(md5(c.id::text || 'def'), 1, 2))::bit(8)::int) % 32; end if;
  if c.iv_spa is null then c.iv_spa := (('x' || substr(md5(c.id::text || 'spa'), 1, 2))::bit(8)::int) % 32; end if;
  if c.iv_spd is null then c.iv_spd := (('x' || substr(md5(c.id::text || 'spd'), 1, 2))::bit(8)::int) % 32; end if;
  if c.iv_spe is null then c.iv_spe := (('x' || substr(md5(c.id::text || 'spe'), 1, 2))::bit(8)::int) % 32; end if;
  if c.av_hp is null then c.av_hp := 0; end if;
  if c.av_atk is null then c.av_atk := 0; end if;
  if c.av_def is null then c.av_def := 0; end if;
  if c.av_spa is null then c.av_spa := 0; end if;
  if c.av_spd is null then c.av_spd := 0; end if;
  if c.av_spe is null then c.av_spe := 0; end if;
  if c.size_class is null or c.size_class not in ('XS','S','M','L','XL') then
    size_roll := seed % 256;
    c.size_class := case
      when size_roll < 12 then 'XS'
      when size_roll < 72 then 'S'
      when size_roll < 184 then 'M'
      when size_roll < 244 then 'L'
      else 'XL'
    end;
  end if;
  if c.moves is null or cardinality(c.moves) = 0 then
    c.moves := private.lgpe_pick_moves(c.dex, c.level);
  end if;
  c.gender := private.lgpe_roll_gender(c.dex, seed, c.gender);
  if c.met_level is null then
    c.met_level := c.level;
  end if;
  if c.met_location is null or btrim(c.met_location) = '' then
    c.met_location := private.lgpe_habitat(c.dex);
  end if;
  if c.friendship is null then
    c.friendship := 0;
  end if;
  scale := case c.size_class
    when 'XS' then 0.81
    when 'S' then 0.91
    when 'L' then 1.09
    when 'XL' then 1.21
    else 1.0
  end;
  jitter := 0.97 + ((seed / 23) % 7) * 0.01;
  if c.height_m is null then
    c.height_m := round((0.4 + (c.dex % 17) * 0.08) * scale * jitter, 2);
  end if;
  if c.weight_kg is null then
    c.weight_kg := round((5.0 + (c.dex % 29) * 1.7) * scale * jitter, 1);
  end if;
  if c.ot_user_id is null then
    c.ot_user_id := c.user_id;
  end if;
  if c.ot_name is null or btrim(c.ot_name) = '' or c.ot_number is null then
    select * into trainer from public.profiles where id = coalesce(c.ot_user_id, c.user_id);
    if c.ot_name is null or btrim(c.ot_name) = '' then
      c.ot_name := coalesce(nullif(btrim(trainer.display_name), ''), nullif(trainer.twitch_login, ''), 'Trainer');
    end if;
    if c.ot_number is null and trainer.id is not null then
      c.ot_number := 10000 + (abs(hashtext(trainer.id::text)) % 90000);
    end if;
  end if;
  return c;
end;
$$;

create or replace function private.catch_json(c public.catches)
returns jsonb
language plpgsql
stable
as $$
declare
  spec public.lgpe_species;
  listed boolean;
  st_hp int;
  st_atk int;
  st_def int;
  st_spa int;
  st_spd int;
  st_spe int;
begin
  select * into spec from public.lgpe_species where dex = c.dex;
  listed := exists (select 1 from public.trade_listings t where t.catch_id = c.id and t.status = 'open');
  st_hp := private.lgpe_stat(spec.hp, c.iv_hp, c.av_hp, c.level, true);
  st_atk := private.lgpe_stat(spec.atk, c.iv_atk, c.av_atk, c.level, false);
  st_def := private.lgpe_stat(spec.def, c.iv_def, c.av_def, c.level, false);
  st_spa := private.lgpe_stat(spec.spa, c.iv_spa, c.av_spa, c.level, false);
  st_spd := private.lgpe_stat(spec.spd, c.iv_spd, c.av_spd, c.level, false);
  st_spe := private.lgpe_stat(spec.spe, c.iv_spe, c.av_spe, c.level, false);
  return jsonb_build_object(
    'id', c.id,
    'publicId', c.public_id,
    'dex', c.dex,
    'name', c.name,
    'nickname', c.nickname,
    'variant', c.variant,
    'gender', c.gender,
    'ball', c.ball,
    'caughtAt', c.caught_at,
    'level', coalesce(c.level, 12),
    'size', coalesce(c.size_class, 'M'),
    'types', coalesce(spec.types, '{}'::text[]),
    'moves', coalesce(c.moves, '{}'::text[]),
    'ivs', jsonb_build_object('hp', coalesce(c.iv_hp, 0), 'atk', coalesce(c.iv_atk, 0), 'def', coalesce(c.iv_def, 0), 'spa', coalesce(c.iv_spa, 0), 'spd', coalesce(c.iv_spd, 0), 'spe', coalesce(c.iv_spe, 0)),
    'avs', jsonb_build_object('hp', coalesce(c.av_hp, 0), 'atk', coalesce(c.av_atk, 0), 'def', coalesce(c.av_def, 0), 'spa', coalesce(c.av_spa, 0), 'spd', coalesce(c.av_spd, 0), 'spe', coalesce(c.av_spe, 0)),
    'stats', jsonb_build_object('hp', st_hp, 'atk', st_atk, 'def', st_def, 'spa', st_spa, 'spd', st_spd, 'spe', st_spe),
    'cp', greatest(10, floor((st_atk * sqrt(greatest(st_def, 1)) * sqrt(greatest(st_hp, 1)) * power((least(coalesce(c.level, 1), 40)::numeric / 40.0) * 0.7903, 2)) / 10)),
    'otName', c.ot_name,
    'otNumber', c.ot_number,
    'otUserId', c.ot_user_id,
    'metLevel', coalesce(c.met_level, c.level),
    'metLocation', c.met_location,
    'heightM', c.height_m,
    'weightKg', c.weight_kg,
    'friendship', coalesce(c.friendship, 0),
    'listed', listed,
    'transferredAt', c.transferred_at
  );
end;
$$;

create or replace function private.extra_ball_keys()
returns text[]
language sql
immutable
as $$
  select array[
    'premierball','luxuryball','healball','friendball','loveball','nestball','netball',
    'repeatball','timerball','diveball','duskball','quickball','fastball','lureball',
    'moonball','heavyball','levelball','safariball','sportball','cherishball',
    'gsball','ashball','cloneball','darkball','oldball',
    'hisuipokeball','hisuigreatball','hisuiultraball','hisuiheavyball',
    'featherball','wingball','jetball','leadenball','gigatonball','originball','strangeball'
  ];
$$;

create or replace function private.stream_throw_item(item text)
returns text
language sql
immutable
as $$
  select case
    when item in ('greatball','safariball','sportball','hisuigreatball','wingball','leadenball') then 'greatball'
    when item in ('ultraball','hisuiultraball','jetball','gigatonball') then 'ultraball'
    else 'pokeball'
  end;
$$;

create or replace function private.item_label(item text)
returns text
language sql
immutable
as $$
  select case item
    when 'berry' then 'Berry'
    when 'bait' then 'Honey'
    when 'pokeball' then 'Poké Ball'
    when 'greatball' then 'Great Ball'
    when 'ultraball' then 'Ultra Ball'
    when 'premierball' then 'Premier Ball'
    when 'luxuryball' then 'Luxury Ball'
    when 'healball' then 'Heal Ball'
    when 'friendball' then 'Friend Ball'
    when 'loveball' then 'Love Ball'
    when 'nestball' then 'Nest Ball'
    when 'netball' then 'Net Ball'
    when 'repeatball' then 'Repeat Ball'
    when 'timerball' then 'Timer Ball'
    when 'diveball' then 'Dive Ball'
    when 'duskball' then 'Dusk Ball'
    when 'quickball' then 'Quick Ball'
    when 'fastball' then 'Fast Ball'
    when 'lureball' then 'Lure Ball'
    when 'moonball' then 'Moon Ball'
    when 'heavyball' then 'Heavy Ball'
    when 'levelball' then 'Level Ball'
    when 'safariball' then 'Safari Ball'
    when 'sportball' then 'Sport Ball'
    when 'cherishball' then 'Cherish Ball'
    when 'gsball' then 'GS Ball'
    when 'ashball' then 'Ash''s Poké Ball'
    when 'cloneball' then 'Clone Ball'
    when 'darkball' then 'Dark Ball'
    when 'oldball' then 'Old Ball'
    when 'hisuipokeball' then 'Hisui Poké Ball'
    when 'hisuigreatball' then 'Hisui Great Ball'
    when 'hisuiultraball' then 'Hisui Ultra Ball'
    when 'hisuiheavyball' then 'Hisui Heavy Ball'
    when 'featherball' then 'Feather Ball'
    when 'wingball' then 'Wing Ball'
    when 'jetball' then 'Jet Ball'
    when 'leadenball' then 'Leaden Ball'
    when 'gigatonball' then 'Gigaton Ball'
    when 'originball' then 'Origin Ball'
    when 'strangeball' then 'Strange Ball'
    when 'lure' then 'Lure'
    else coalesce(item, '')
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
  if random() < (1.0 / 4096.0) then
    chosen_variant := 'shiny';
  end if;
  chosen_gender := private.lgpe_roll_gender(chosen_dex, floor(random() * 2147483647)::int, null);
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

update public.catches set dex = dex;

