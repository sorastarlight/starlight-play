-- A19-REF UNAPPLIED ARTIFACT
-- DO NOT RUN against live Supabase or any connected project.
-- Not a migration. Must never be copied into supabase/migrations/ without A19-SCHEMA.
-- Source of truth until then: data/gen9-ref/*.json

BEGIN;

CREATE TABLE IF NOT EXISTS ref_meta (
  content_build text PRIMARY KEY,
  ruleset_id text NOT NULL,
  pokeapi_commit text NOT NULL,
  built_at timestamptz NOT NULL,
  applied_to_live boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS ref_natures (
  id integer PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  up_stat text,
  down_stat text
);

CREATE TABLE IF NOT EXISTS ref_species (
  dex integer PRIMARY KEY,
  slug text,
  gender_rate integer,
  base_friendship integer,
  capture_rate integer,
  hatch_counter integer,
  is_legendary boolean NOT NULL DEFAULT false,
  is_mythical boolean NOT NULL DEFAULT false,
  mapping_status text NOT NULL
);

CREATE TABLE IF NOT EXISTS ref_forms (
  form_id integer PRIMARY KEY,
  dex integer NOT NULL REFERENCES ref_species(dex),
  form_key text NOT NULL,
  form_label text,
  kind text,
  is_base boolean NOT NULL,
  pokeapi_pokemon_id integer,
  mapping_status text NOT NULL,
  types text[] NOT NULL DEFAULT '{}',
  height_m numeric,
  weight_kg numeric,
  hp integer, atk integer, def integer, spa integer, spd integer, spe integer,
  learnset_status text NOT NULL,
  learnset_version_group text,
  learnset_resolution text
);

CREATE TABLE IF NOT EXISTS ref_abilities (
  ability_id integer PRIMARY KEY,
  slug text NOT NULL,
  generation integer,
  is_main_series boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS ref_form_abilities (
  form_id integer NOT NULL REFERENCES ref_forms(form_id),
  slot text NOT NULL,
  ability_id integer NOT NULL REFERENCES ref_abilities(ability_id),
  is_hidden boolean NOT NULL,
  PRIMARY KEY (form_id, slot, ability_id)
);

CREATE TABLE IF NOT EXISTS ref_moves (
  move_id integer PRIMARY KEY,
  slug text NOT NULL,
  type text,
  damage_class text,
  pp integer,
  power integer,
  accuracy integer
);

CREATE TABLE IF NOT EXISTS ref_learnsets (
  form_id integer NOT NULL REFERENCES ref_forms(form_id),
  version_group text NOT NULL,
  method text NOT NULL,
  level integer NOT NULL DEFAULT 0,
  move_id integer NOT NULL REFERENCES ref_moves(move_id),
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ref_evolutions (
  from_dex integer NOT NULL REFERENCES ref_species(dex),
  to_dex integer NOT NULL REFERENCES ref_species(dex),
  trigger text,
  min_level integer,
  item_id integer,
  held_item_id integer,
  trade_species_id integer
);

CREATE TABLE IF NOT EXISTS ref_obtain (
  form_id integer PRIMARY KEY REFERENCES ref_forms(form_id),
  dex integer NOT NULL,
  channel text NOT NULL,
  normal_encounter_enabled boolean NOT NULL,
  admin_targetable boolean NOT NULL,
  event_targetable boolean NOT NULL,
  enabled boolean NOT NULL DEFAULT true
);

COMMIT;
