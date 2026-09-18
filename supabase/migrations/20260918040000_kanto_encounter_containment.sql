-- Kanto v1.0 encounter release containment.
--
-- ROOT CAUSE:
--   20260918030000_national_organized_roster.sql introduced acquisitionModel
--   version 'v2-national' and widened spawn_pick_random_dex / spawn_species_eligible
--   / kanto_availability_json from dex 1..151 to 1..1025.
--   20260918030100_national_spawn_eligible.sql then explicitly rewrote
--   spawn_species_eligible to 1..1025 ("fix national spawn eligibility").
--
--   National *catalog* expansion was intentional. Coupling ordinary encounter
--   eligibility to that catalog was accidental for Kanto v1.0.
--
-- FIX:
--   Restore Kanto release containment at the authoritative spawn layer:
--     private.normal_spawn_max_dex() = 151
--     private.spawn_species_eligible
--     private.spawn_candidate_bands
--     private.spawn_pick_random_dex
--     private.kanto_availability_json (reporting)
--
-- PRESERVE:
--   National species/forms catalog (species rows remain).
--   Explicit Admin/debug launch of a chosen national dex via
--   launch_community_round(p_dex => N) still allows 1..1025.
--   Random / Director AUTO (p_dex null) cannot select >151.
--   Non-base forms remain out of spawn (variants only).
--   female_visual_dex unchanged.
--   SPRITE_BUILD / LOCATION_BUILD unchanged.

create or replace function private.normal_spawn_max_dex()
returns integer
language sql
immutable
as $$
  -- Kanto v1.0 release boundary. Catalog may exceed this; ordinary random
  -- encounters must not. Raise deliberately when a future region releases.
  select 151;
$$;

revoke all on function private.normal_spawn_max_dex() from public, anon, authenticated;

create or replace function private.spawn_species_eligible(p_dex integer, p_allow_special boolean)
returns boolean
language sql
stable
as $function$
  select exists (
    select 1
    from public.species s
    where s.dex = p_dex
      and s.dex between 1 and private.normal_spawn_max_dex()
      and coalesce(s.spawn_weight, 0) > 0
      and (
        p_allow_special
        or (coalesce(s.is_legendary, false) = false and coalesce(s.mythical, false) = false)
      )
      and private.spawn_species_effective_weight(s.dex) > 0
  );
$function$;

create or replace function private.spawn_candidate_bands(p_allow_special boolean default false)
returns jsonb
language plpgsql
stable
as $function$
declare
  band text;
  bands jsonb := '[]'::jsonb;
  n int;
  max_dex int := private.normal_spawn_max_dex();
begin
  for band in
    select unnest(array['COMMON', 'UNCOMMON', 'RARE', 'VERY_RARE', 'ULTRA_RARE', 'LEGENDARY', 'EVENT'])
  loop
    if not p_allow_special and band in ('LEGENDARY', 'EVENT') then
      continue;
    end if;
    if private.spawn_band_weight(band) <= 0 then
      continue;
    end if;
    select count(*)::int into n
    from public.species s
    where s.dex between 1 and max_dex
      and private.spawn_band(s.dex) = band
      and private.spawn_species_eligible(s.dex, p_allow_special);
    if coalesce(n, 0) > 0 then
      bands := bands || jsonb_build_array(jsonb_build_object(
        'key', band,
        'weight', private.spawn_band_weight(band)
      ));
    end if;
  end loop;
  return bands;
end;
$function$;

create or replace function private.spawn_pick_random_dex()
returns integer
language plpgsql
as $function$
declare
  allow_special boolean := private.spawn_allow_special();
  bands jsonb;
  pool jsonb;
  picked text;
  max_dex int := private.normal_spawn_max_dex();
begin
  bands := private.spawn_candidate_bands(allow_special);
  loop
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
     where s.dex between 1 and max_dex
       and private.spawn_band(s.dex) = picked
       and private.spawn_species_eligible(s.dex, allow_special);

    if pool is not null and jsonb_array_length(pool) > 0 then
      return private.spawn_weighted_key(pool)::int;
    end if;

    -- Selected band had no remaining eligible species (e.g. recent-spawn
    -- dampening). Drop the band and retry. Never escape into unreleased
    -- generations as a fallback.
    bands := private.spawn_omit_band(bands, picked);
  end loop;
end;
$function$;

create or replace function private.kanto_availability_json()
returns jsonb
language sql
stable
as $$
  with bands as (
    select s.dex, s.name, private.spawn_band(s.dex) as band, s.is_legendary, coalesce(s.mythical, false) as mythical
    from public.species s
    where s.dex between 1 and private.normal_spawn_max_dex()
  ),
  catalog as (
    select count(*)::int as n from public.species where dex between 1 and 1025
  )
  select jsonb_build_object(
    'normal', coalesce((
      select jsonb_agg(jsonb_build_object('dex', dex, 'name', name, 'band', band) order by dex)
      from bands where band not in ('LEGENDARY', 'EVENT')
    ), '[]'::jsonb),
    'evolutionOnly', '[]'::jsonb,
    'special', coalesce((
      select jsonb_agg(jsonb_build_object('dex', dex, 'name', name, 'band', band, 'mythical', mythical) order by dex)
      from bands where band in ('LEGENDARY', 'EVENT')
    ), '[]'::jsonb),
    'unavailable', '[]'::jsonb,
    'counts', jsonb_build_object(
      'normal', (select count(*) from bands where band not in ('LEGENDARY', 'EVENT')),
      'evolutionOnly', 0,
      'special', (select count(*) from bands where band in ('LEGENDARY', 'EVENT')),
      'unavailable', 0,
      'total', private.normal_spawn_max_dex()
    ),
    'acquisitionModel', jsonb_build_object(
      'version', 'v1-kanto-release',
      'ordinaryEncounterEligible', 146,
      'specialEventOnly', 5,
      'specialSpecies', jsonb_build_array(144, 145, 146, 150, 151),
      'evolutionRequiredFor151', false,
      'releaseScope', 'kanto',
      'normalSpawnMaxDex', private.normal_spawn_max_dex(),
      'nationalDexMax', 1025,
      'nationalCatalogSpecies', (select n from catalog),
      'evolution', 'alternate acquisition/progression for species that can also spawn normally; not required for 151/151. National catalog may exceed release scope without enabling ordinary encounters.'
    )
  );
$$;

-- Integrity: Kanto release containment must hold while national catalog remains.
do $$
declare
  ordinary int;
  special int;
  post int;
  catalog int;
  model text;
  max_dex int;
begin
  select private.normal_spawn_max_dex() into max_dex;
  if max_dex <> 151 then
    raise exception 'normal_spawn_max_dex expected 151, got %', max_dex;
  end if;

  select count(*)::int into ordinary
  from public.species s
  where s.dex between 1 and max_dex
    and coalesce(s.spawn_weight, 0) > 0
    and coalesce(s.is_legendary, false) = false
    and coalesce(s.mythical, false) = false;

  select count(*)::int into special
  from public.species s
  where s.dex in (144, 145, 146, 150, 151);

  select count(*)::int into post
  from public.species s
  where s.dex > max_dex
    and private.spawn_species_eligible(s.dex, false);

  select count(*)::int into catalog from public.species;
  model := private.kanto_availability_json()->'acquisitionModel'->>'version';

  if ordinary <> 146 then
    raise exception 'Kanto ordinary structural set expected 146, got %', ordinary;
  end if;
  if special <> 5 then
    raise exception 'Kanto special set expected 5, got %', special;
  end if;
  if post <> 0 then
    raise exception 'Post-Kanto ordinary eligible expected 0, got %', post;
  end if;
  if catalog < 1000 then
    raise exception 'National catalog unexpectedly shrunk: %', catalog;
  end if;
  if model is distinct from 'v1-kanto-release' then
    raise exception 'acquisitionModel.version expected v1-kanto-release, got %', model;
  end if;
  if private.spawn_species_eligible(144, false)
     or private.spawn_species_eligible(145, false)
     or private.spawn_species_eligible(146, false)
     or private.spawn_species_eligible(150, false)
     or private.spawn_species_eligible(151, false) then
    raise exception 'Phase 10 specials leaked into ordinary eligibility';
  end if;
  if private.spawn_species_eligible(152, false)
     or private.spawn_species_eligible(251, false)
     or private.spawn_species_eligible(1000, false) then
    raise exception 'Post-Kanto species leaked into ordinary eligibility';
  end if;
end $$;
