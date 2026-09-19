-- Rebuild species.family_id (+ candy species key) from enabled evolution_rules.
-- Fixes Sandshrew→Pikachu and the class of base_dex/+1/+2 heuristic bugs.

-- 1) Authoritative membership from enabled Kanto rules.
with expected as (
  select distinct family_id, from_dex as dex
    from public.evolution_rules
   where enabled
     and from_dex between 1 and 151
  union
  select distinct family_id, to_dex
    from public.evolution_rules
   where enabled
     and to_dex between 1 and 151
)
update public.species s
   set family_id = e.family_id,
       family_candy_species_id = e.family_id
  from expected e
 where s.dex = e.dex
   and (
     s.family_id is distinct from e.family_id
     or s.family_candy_species_id is distinct from e.family_id
   );

-- 2) Singleton / unevolved Kanto species: family_id = self when no rule membership.
update public.species s
   set family_id = s.dex,
       family_candy_species_id = coalesce(s.family_candy_species_id, s.dex)
 where s.dex between 1 and 151
   and not exists (
     select 1 from public.evolution_rules r
      where r.enabled
        and (r.from_dex = s.dex or r.to_dex = s.dex)
   )
   and (s.family_id is distinct from s.dex or s.family_candy_species_id is null);

-- 3) Integrity: no enabled-rule species may disagree with rule family_id.
do $$
declare
  bad int;
  pika int;
  sand int;
begin
  select count(*) into bad
    from public.species s
    join (
      select distinct family_id, from_dex as dex from public.evolution_rules where enabled and from_dex between 1 and 151
      union
      select distinct family_id, to_dex from public.evolution_rules where enabled and to_dex between 1 and 151
    ) e on e.dex = s.dex
   where s.family_id is distinct from e.family_id;
  if bad <> 0 then
    raise exception 'evolution family rebuild left % mismatched species', bad;
  end if;

  select count(*) into pika from public.species where family_id = 25 and dex between 1 and 151;
  if pika <> 2 then
    raise exception 'Pikachu family must have exactly 2 Kanto members (got %)', pika;
  end if;
  if exists (select 1 from public.species where family_id = 25 and dex in (27, 28)) then
    raise exception 'Sandshrew/Sandslash must not be in Pikachu family';
  end if;

  select count(*) into sand from public.species where family_id = 27 and dex in (27, 28);
  if sand <> 2 then
    raise exception 'Sandshrew family must contain 27 and 28 (got %)', sand;
  end if;

  -- Eevee Kanto trio only among 1..151 for family 133
  if exists (
    select 1 from public.species
     where family_id = 133 and dex between 1 and 151
       and dex not in (133, 134, 135, 136)
  ) then
    raise exception 'Eevee Kanto family contains unexpected members';
  end if;
end $$;
