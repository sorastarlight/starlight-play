-- Form-aware Pokémon identity for Admin / Special Event encounters (Kanto v1.0).
-- Facing (Front/Back) is rendering-only and is NEVER stored as form identity.
-- Normal spawn remains BASE-only within private.normal_spawn_max_dex().


create table if not exists public.pokemon_forms (
  pokemon_form_id integer primary key,
  dex integer not null references public.species(dex),
  form_key text not null,
  form_label text not null,
  kind text not null,
  is_base boolean not null default false,
  has_front boolean not null default false,
  has_shiny_front boolean not null default false,
  has_female_front boolean not null default false,
  has_back boolean not null default false,
  admin_targetable boolean not null default false,
  event_targetable boolean not null default false,
  normal_encounter_enabled boolean not null default false,
  asset_status text not null default 'catalog_only',
  origin_gen1 boolean not null default false,
  catch_rate integer null,
  unique (dex, form_key)
);

create index if not exists pokemon_forms_dex_idx on public.pokemon_forms (dex);
create index if not exists pokemon_forms_admin_idx on public.pokemon_forms (dex) where admin_targetable;
create index if not exists pokemon_forms_event_idx on public.pokemon_forms (dex) where event_targetable;

revoke all on table public.pokemon_forms from public;
grant select on table public.pokemon_forms to anon, authenticated, service_role;

alter table public.encounter_rounds
  add column if not exists pokemon_form_id integer references public.pokemon_forms(pokemon_form_id);

alter table public.catches
  add column if not exists pokemon_form_id integer references public.pokemon_forms(pokemon_form_id);

alter table private.special_events
  add column if not exists pokemon_form_id integer references public.pokemon_forms(pokemon_form_id);

create index if not exists encounter_rounds_form_idx on public.encounter_rounds (pokemon_form_id);
create index if not exists catches_form_idx on public.catches (pokemon_form_id);

-- Seed / refresh authoritative form catalog from Organized Showdown PokemonFormId.
