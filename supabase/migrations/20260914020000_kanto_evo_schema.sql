-- Canonical vs RPG evolution fields. Does not touch player Candy or collections.

create table if not exists public.evolution_config (
  id int primary key default 1,
  balance_version int not null default 1,
  enabled_generations int[] not null default '{1}'
);
insert into public.evolution_config (id, balance_version, enabled_generations)
values (1, 1, '{1}')
on conflict (id) do update
  set balance_version = excluded.balance_version,
      enabled_generations = excluded.enabled_generations;

alter table public.evolution_rules
  add column if not exists rpg_method text,
  add column if not exists canonical_trigger text,
  add column if not exists canonical_min_level int,
  add column if not exists canonical_item text,
  add column if not exists canonical_trade_required boolean not null default false,
  add column if not exists generation_introduced int not null default 1,
  add column if not exists notes text;

alter table public.species
  add column if not exists family_candy_species_id int;

update public.species
   set family_candy_species_id = coalesce(family_id, dex)
 where family_candy_species_id is null;

alter table public.evolution_log
  add column if not exists trade_used boolean not null default false;

create or replace function private.evo_enabled_generations()
returns int[]
language sql
stable
as $$
  select coalesce((select enabled_generations from public.evolution_config where id = 1), '{1}'::int[]);
$$;

create or replace function private.family_has_enabled_evo(p_family int)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
      from public.evolution_rules r
     where r.family_id = p_family
       and r.enabled
       and r.to_dex between 1 and 151
       and r.generation_introduced = any (private.evo_enabled_generations())
  );
$$;
