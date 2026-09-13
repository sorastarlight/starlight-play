-- Fill Ultra Rare with a small non-Legendary set. Empty bands are
-- dropped and remaining weights are used; they never cancel a launch
-- while another band still has eligible species.

alter table public.species
  add column if not exists spawn_band_override text;

alter table public.species
  drop constraint if exists species_spawn_band_override_chk;

alter table public.species
  add constraint species_spawn_band_override_chk
  check (
    spawn_band_override is null
    or spawn_band_override in ('COMMON', 'UNCOMMON', 'RARE', 'VERY_RARE', 'ULTRA_RARE', 'LEGENDARY', 'EVENT')
  );

update public.species
   set spawn_band_override = 'ULTRA_RARE'
 where dex in (1, 4, 7, 133, 149)
   and coalesce(is_legendary, false) = false
   and coalesce(mythical, false) = false;

create or replace function private.spawn_band(p_dex int)
returns text
language sql
stable
as $$
  select case
    when coalesce(s.is_legendary, false) then 'LEGENDARY'
    when coalesce(s.mythical, false) then 'EVENT'
    when s.spawn_band_override in ('COMMON', 'UNCOMMON', 'RARE', 'VERY_RARE', 'ULTRA_RARE', 'LEGENDARY', 'EVENT')
      then s.spawn_band_override
    when coalesce(s.catch_rate, 45) >= 200 then 'COMMON'
    when coalesce(s.catch_rate, 45) >= 90 then 'UNCOMMON'
    when coalesce(s.catch_rate, 45) >= 45 then 'RARE'
    when coalesce(s.catch_rate, 45) >= 15 then 'VERY_RARE'
    else 'ULTRA_RARE'
  end
  from public.species s
  where s.dex = p_dex;
$$;

create or replace function private.spawn_omit_band(p_bands jsonb, p_band text)
returns jsonb
language sql
immutable
as $$
  select coalesce(
    (
      select jsonb_agg(value)
      from jsonb_array_elements(coalesce(p_bands, '[]'::jsonb))
      where value->>'key' is distinct from p_band
    ),
    '[]'::jsonb
  );
$$;

create or replace function private.spawn_species_eligible(p_dex int, p_allow_special boolean)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.species s
    where s.dex = p_dex
      and s.dex between 1 and 151
      and coalesce(s.spawn_weight, 0) > 0
      and (
        p_allow_special
        or (coalesce(s.is_legendary, false) = false and coalesce(s.mythical, false) = false)
      )
      and private.spawn_species_effective_weight(s.dex) > 0
  );
$$;

create or replace function private.spawn_candidate_bands(p_allow_special boolean default false)
returns jsonb
language plpgsql
stable
as $$
declare
  band text;
  bands jsonb := '[]'::jsonb;
  n int;
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
    where s.dex between 1 and 151
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
$$;

create or replace function private.spawn_pick_random_dex()
returns int
language plpgsql
as $$
declare
  allow_special boolean := private.spawn_allow_special();
  bands jsonb;
  pool jsonb;
  picked text;
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
     where s.dex between 1 and 151
       and private.spawn_band(s.dex) = picked
       and private.spawn_species_eligible(s.dex, allow_special);

    if pool is not null and jsonb_array_length(pool) > 0 then
      return private.spawn_weighted_key(pool)::int;
    end if;

    -- Selected band had no remaining eligible species. Drop it and
    -- pick again from the leftover weights. Do not cancel the launch.
    bands := private.spawn_omit_band(bands, picked);
  end loop;
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
  ultra int := 0;
  band text;
  bands jsonb;
  rec jsonb;
  empty_n int;
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

  picked := private.spawn_weighted_key(private.spawn_omit_band(
    '[{"key":"COMMON","weight":50},{"key":"ULTRA_RARE","weight":2}]'::jsonb,
    'ULTRA_RARE'
  ));
  name := 'empty band is dropped and remaining weights are used';
  passed := picked = 'COMMON';
  detail := picked;
  return next;

  name := 'omitting the last band does not invent a species';
  passed := private.spawn_weighted_key(private.spawn_omit_band(
    '[{"key":"ULTRA_RARE","weight":2}]'::jsonb,
    'ULTRA_RARE'
  )) is null;
  detail := 'renormalize, do not fallback or invent';
  return next;

  bands := private.spawn_candidate_bands(false);
  empty_n := 0;
  for rec in select value from jsonb_array_elements(bands)
  loop
    select count(*)::int into i
    from public.species s
    where private.spawn_band(s.dex) = rec->>'key'
      and private.spawn_species_eligible(s.dex, false);
    if coalesce(i, 0) = 0 then
      empty_n := empty_n + 1;
    end if;
  end loop;
  name := 'candidate bands never include an empty weighted band';
  passed := empty_n = 0
        and exists (select 1 from jsonb_array_elements(bands) e where e->>'key' = 'ULTRA_RARE')
        and not exists (select 1 from jsonb_array_elements(bands) e where e->>'key' in ('LEGENDARY', 'EVENT'));
  detail := bands::text;
  return next;

  name := 'ultra rare has a small non-legendary Kanto set';
  passed := (
    select count(*) = 5
    from public.species s
    where private.spawn_band(s.dex) = 'ULTRA_RARE'
      and s.dex in (1, 4, 7, 133, 149)
      and coalesce(s.is_legendary, false) = false
  ) and not exists (
    select 1 from public.species s
    where s.dex in (144, 145, 146, 150, 151)
      and private.spawn_band(s.dex) is distinct from 'LEGENDARY'
  );
  detail := 'starters + Eevee + Dragonite';
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
    elsif band = 'ULTRA_RARE' then
      ultra := ultra + 1;
    end if;
  end loop;
  name := 'ordinary random rolls exclude legendary and event';
  passed := legend = 0;
  detail := legend::text;
  return next;

  name := 'ordinary random rolls prefer common over very rare';
  passed := common > very_rare;
  detail := format('%s common / %s very rare / %s ultra rare', common, very_rare, ultra);
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
