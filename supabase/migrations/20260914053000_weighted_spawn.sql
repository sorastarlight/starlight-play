-- Weighted spawn for automatic and Admin Random launches.
-- Specific Admin picks still bypass this. Rolls happen only at launch.

create or replace function private.spawn_defaults()
returns jsonb
language sql
immutable
as $$
  select '{
    "bandWeights": {
      "COMMON": 50,
      "UNCOMMON": 28,
      "RARE": 15,
      "VERY_RARE": 5,
      "ULTRA_RARE": 2,
      "LEGENDARY": 0,
      "EVENT": 0
    },
    "allowLegendaryAuto": false,
    "allowEventAuto": false,
    "recentWindow": 8,
    "sameAsLastMultiplier": 0,
    "recentSpeciesMultiplier": 0.25,
    "recentFamilyMultiplier": 0.6
  }'::jsonb;
$$;

create or replace function private.spawn_config()
returns jsonb
language sql
stable
as $$
  select private.spawn_defaults() || coalesce(private.game_settings()->'spawnBalance', '{}'::jsonb);
$$;

create or replace function private.spawn_allow_special()
returns boolean
language plpgsql
stable
as $$
declare
  cfg jsonb := private.spawn_config();
  mode text;
begin
  select stream_mode into mode from private.stream_director where id = 1;
  return coalesce((cfg->>'allowLegendaryAuto')::boolean, false)
      or coalesce((cfg->>'allowEventAuto')::boolean, false)
      or mode = 'SPECIAL_EVENT';
end;
$$;

create or replace function private.spawn_band_weight(p_band text)
returns numeric
language sql
stable
as $$
  select coalesce(nullif(private.spawn_config()->'bandWeights'->>p_band, '')::numeric, 0);
$$;

create or replace function private.spawn_recent_dex()
returns int[]
language sql
stable
as $$
  select coalesce(array_agg(dex), '{}'::int[])
  from (
    select er.dex
    from public.encounter_rounds er
    where coalesce(er.source, '') is distinct from 'test'
      and coalesce(er.cancelled, false) = false
      and er.dex is not null
    order by er.started_at desc nulls last
    limit greatest(coalesce((private.spawn_config()->>'recentWindow')::int, 8), 0)
  ) x;
$$;

create or replace function private.spawn_recent_families()
returns int[]
language sql
stable
as $$
  select coalesce(array_agg(distinct fam), '{}'::int[])
  from (
    select coalesce(s.family_id, er.dex) as fam
    from public.encounter_rounds er
    join public.species s on s.dex = er.dex
    where coalesce(er.source, '') is distinct from 'test'
      and coalesce(er.cancelled, false) = false
    order by er.started_at desc nulls last
    limit greatest(coalesce((private.spawn_config()->>'recentWindow')::int, 8), 0)
  ) x;
$$;

create or replace function private.spawn_species_effective_weight(p_dex int)
returns numeric
language plpgsql
stable
as $$
declare
  cfg jsonb := private.spawn_config();
  w numeric;
  recent int[];
  families int[];
  last_dex int;
  fam int;
begin
  select greatest(coalesce(spawn_weight, 0), 0), coalesce(family_id, dex)
    into w, fam
    from public.species
   where dex = p_dex;
  if w <= 0 then
    return 0;
  end if;
  recent := private.spawn_recent_dex();
  families := private.spawn_recent_families();
  last_dex := case when array_length(recent, 1) >= 1 then recent[1] else null end;
  if last_dex is not null and last_dex = p_dex then
    w := w * coalesce((cfg->>'sameAsLastMultiplier')::numeric, 0);
  elsif recent is not null and p_dex = any(recent) then
    w := w * coalesce((cfg->>'recentSpeciesMultiplier')::numeric, 0.25);
  elsif fam is not null and fam = any(families) then
    w := w * coalesce((cfg->>'recentFamilyMultiplier')::numeric, 0.6);
  end if;
  return greatest(w, 0);
end;
$$;

create or replace function private.spawn_weighted_key(p_rows jsonb)
returns text
language plpgsql
stable
as $$
declare
  rec jsonb;
  total numeric := 0;
  cursor numeric;
  w numeric;
begin
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    return null;
  end if;
  for rec in select value from jsonb_array_elements(p_rows)
  loop
    w := coalesce(nullif(rec->>'weight', '')::numeric, 0);
    if w > 0 then
      total := total + w;
    end if;
  end loop;
  if total <= 0 then
    return null;
  end if;
  cursor := random() * total;
  for rec in select value from jsonb_array_elements(p_rows)
  loop
    w := coalesce(nullif(rec->>'weight', '')::numeric, 0);
    if w <= 0 then
      continue;
    end if;
    cursor := cursor - w;
    if cursor <= 0 then
      return rec->>'key';
    end if;
  end loop;
  return p_rows->-1->>'key';
end;
$$;

create or replace function private.spawn_pick_random_dex()
returns int
language plpgsql
as $$
declare
  allow_special boolean := private.spawn_allow_special();
  band text;
  bands jsonb := '[]'::jsonb;
  pool jsonb;
  picked text;
  n int;
  try int := 0;
begin
  loop
    try := try + 1;
    bands := '[]'::jsonb;
    for band in
      select unnest(array['COMMON', 'UNCOMMON', 'RARE', 'VERY_RARE', 'ULTRA_RARE', 'LEGENDARY', 'EVENT'])
    loop
      if not allow_special and band in ('LEGENDARY', 'EVENT') then
        continue;
      end if;
      if private.spawn_band_weight(band) <= 0 then
        continue;
      end if;
      select count(*)::int into n
      from public.species s
      where s.dex between 1 and 151
        and coalesce(s.spawn_weight, 0) > 0
        and private.spawn_band(s.dex) = band
        and (
          allow_special
          or (coalesce(s.is_legendary, false) = false and coalesce(s.mythical, false) = false)
        );
      if coalesce(n, 0) > 0 then
        bands := bands || jsonb_build_array(jsonb_build_object(
          'key', band,
          'weight', private.spawn_band_weight(band)
        ));
      end if;
    end loop;

    picked := private.spawn_weighted_key(bands);
    if picked is null then
      raise exception 'No eligible Pokémon are configured for a random encounter.';
    end if;

    select coalesce(jsonb_agg(jsonb_build_object(
             'key', s.dex::text,
             'weight', private.spawn_species_effective_weight(s.dex)
           ) order by s.dex), '[]'::jsonb)
      into pool
      from public.species s
     where s.dex between 1 and 151
       and coalesce(s.spawn_weight, 0) > 0
       and private.spawn_band(s.dex) = picked
       and (
         allow_special
         or (coalesce(s.is_legendary, false) = false and coalesce(s.mythical, false) = false)
       )
       and private.spawn_species_effective_weight(s.dex) > 0;

    if pool is not null and jsonb_array_length(pool) > 0 then
      return private.spawn_weighted_key(pool)::int;
    end if;
    if try >= 8 then
      raise exception 'No eligible Pokémon are configured for a random encounter.';
    end if;
  end loop;
end;
$$;

create or replace function private.launch_community_round(
  p_dex int,
  p_gender text,
  p_shiny boolean,
  p_source text,
  p_test boolean default false
)
returns public.encounter_rounds
language plpgsql
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
  r := private.sync_latest_round();
  if private.round_is_active(r) then
    raise exception 'A community round is already running.';
  end if;
  settings := private.game_settings();
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
    phase, hidden, pokemon, dex, name, variant, gender, started_at, deadlines, rules, resolved, cancelled, last_action, ends_at, trigger_source, source
  ) values (
    'join', false,
    jsonb_build_object('dex', chosen_dex, 'name', chosen_name, 'variant', chosen_variant, 'gender', chosen_gender, 'location', private.lgpe_habitat(chosen_dex)),
    chosen_dex, chosen_name, chosen_variant, chosen_gender, t, deadlines, settings, false, false,
    chosen_name || ' appeared!',
    (deadlines->>'join')::timestamptz,
    p_source,
    case when p_test then 'test' else coalesce(p_source, 'director') end
  ) returning * into r;
  return r;
end;
$$;

create or replace function private.spawn_self_test()
returns table(name text, passed boolean, detail text)
language plpgsql
as $$
declare
  picked text;
  dex int;
  i int;
  legend int := 0;
  common int := 0;
  very_rare int := 0;
  band text;
begin
  picked := private.spawn_weighted_key('[{"key":"COMMON","weight":100},{"key":"LEGENDARY","weight":0}]'::jsonb);
  name := 'zero-weight legendary band is never selected';
  passed := picked = 'COMMON';
  detail := picked;
  return next;

  picked := private.spawn_weighted_key('[{"key":"25","weight":10},{"key":"150","weight":0}]'::jsonb);
  name := 'zero-weight species is never selected';
  passed := picked = '25';
  detail := picked;
  return next;

  for i in 1..80 loop
    dex := private.spawn_pick_random_dex();
    band := private.spawn_band(dex);
    if band in ('LEGENDARY', 'EVENT') then
      legend := legend + 1;
    end if;
    if band = 'COMMON' then
      common := common + 1;
    elsif band = 'VERY_RARE' then
      very_rare := very_rare + 1;
    end if;
  end loop;
  name := 'ordinary random rolls exclude legendary and event';
  passed := legend = 0;
  detail := legend::text;
  return next;

  name := 'ordinary random rolls prefer common over very rare';
  passed := common > very_rare;
  detail := format('%s common / %s very rare', common, very_rare);
  return next;

  name := 'queued random payload does not pre-roll a dex';
  passed := not exists (
    select 1 from private.stream_director
    where queued->>'kind' = 'RANDOM' and queued ? 'dex'
  );
  detail := 'queue stays species-less until launch';
  return next;
end;
$$;

update public.species
   set spawn_weight = greatest(coalesce(catch_rate, 45), 1)
 where dex between 1 and 151
   and spawn_weight = 1;

update public.site_config
   set game_settings = coalesce(game_settings, '{}'::jsonb)
     || jsonb_build_object(
          'spawnBalance',
          private.spawn_defaults() || coalesce(game_settings->'spawnBalance', '{}'::jsonb)
        )
 where id = 1;
