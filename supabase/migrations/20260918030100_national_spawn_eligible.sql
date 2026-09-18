-- Fix national spawn eligibility (was still hard-capped at 151).
create or replace function private.spawn_species_eligible(p_dex integer, p_allow_special boolean)
returns boolean
language sql
stable
as $function$
  select exists (
    select 1
    from public.species s
    where s.dex = p_dex
      and s.dex between 1 and 1025
      and coalesce(s.spawn_weight, 0) > 0
      and (
        p_allow_special
        or (coalesce(s.is_legendary, false) = false and coalesce(s.mythical, false) = false)
      )
      and private.spawn_species_effective_weight(s.dex) > 0
  );
$function$;
