-- A19-REF-REVIEW UNAPPLIED ARTIFACT (issue #21)
-- DO NOT RUN against live Supabase or any connected project.
-- Not a migration. Must never be copied into supabase/migrations/ without A19-SCHEMA.
-- Proposed revision of supabase/unapplied/a19-ref/001_create_ref_tables.sql
-- Addresses: public Data API exposure, missing RLS/REVOKE, missing content_build
-- lineage, missing unique/PK, missing ON CONFLICT, dual friendship columns.

BEGIN;

CREATE SCHEMA IF NOT EXISTS private;

-- Server-only. Do not add `private` to the PostgREST exposed schemas.
CREATE TABLE IF NOT EXISTS private.ref_meta (
  content_build text PRIMARY KEY,
  ruleset_id text NOT NULL,
  pokeapi_commit text NOT NULL,
  built_at timestamptz NOT NULL,
  applied_to_live boolean NOT NULL DEFAULT false,
  license_note text,
  CONSTRAINT ref_meta_not_live_default CHECK (applied_to_live = false)
);

CREATE TABLE IF NOT EXISTS private.ref_natures (
  content_build text NOT NULL REFERENCES private.ref_meta(content_build),
  id integer NOT NULL,
  slug text NOT NULL,
  name text NOT NULL,
  up_stat text,
  down_stat text,
  PRIMARY KEY (content_build, id),
  UNIQUE (content_build, slug)
);

CREATE TABLE IF NOT EXISTS private.ref_species (
  content_build text NOT NULL REFERENCES private.ref_meta(content_build),
  dex integer NOT NULL,
  slug text NOT NULL,
  gender_rate integer NOT NULL,
  pokeapi_base_friendship integer NOT NULL,
  streamlink_base_friendship integer NOT NULL,
  capture_rate integer,
  hatch_counter integer,
  is_legendary boolean NOT NULL DEFAULT false,
  is_mythical boolean NOT NULL DEFAULT false,
  mapping_status text NOT NULL,
  PRIMARY KEY (content_build, dex),
  UNIQUE (content_build, slug),
  CONSTRAINT ref_species_gender_rate CHECK (gender_rate IN (-1, 0, 1, 2, 4, 6, 8)),
  CONSTRAINT ref_species_friendship CHECK (
    pokeapi_base_friendship BETWEEN 0 AND 255
    AND streamlink_base_friendship BETWEEN 0 AND 255
  )
);

CREATE TABLE IF NOT EXISTS private.ref_forms (
  content_build text NOT NULL REFERENCES private.ref_meta(content_build),
  form_id integer NOT NULL,
  dex integer NOT NULL,
  form_key text NOT NULL,
  form_label text,
  kind text NOT NULL,
  is_base boolean NOT NULL,
  pokeapi_pokemon_id integer,
  mapping_status text NOT NULL,
  types text[] NOT NULL DEFAULT '{}',
  height_m numeric,
  weight_kg numeric,
  hp integer, atk integer, def integer, spa integer, spd integer, spe integer,
  learnset_status text NOT NULL,
  learnset_version_group text,
  learnset_resolution text,
  PRIMARY KEY (content_build, form_id),
  FOREIGN KEY (content_build, dex) REFERENCES private.ref_species(content_build, dex)
);

CREATE TABLE IF NOT EXISTS private.ref_abilities (
  content_build text NOT NULL REFERENCES private.ref_meta(content_build),
  ability_id integer NOT NULL,
  slug text NOT NULL,
  generation integer,
  is_main_series boolean NOT NULL DEFAULT true,
  PRIMARY KEY (content_build, ability_id),
  UNIQUE (content_build, slug)
);

CREATE TABLE IF NOT EXISTS private.ref_form_abilities (
  content_build text NOT NULL REFERENCES private.ref_meta(content_build),
  form_id integer NOT NULL,
  slot text NOT NULL,
  ability_id integer NOT NULL,
  is_hidden boolean NOT NULL,
  PRIMARY KEY (content_build, form_id, slot, ability_id),
  FOREIGN KEY (content_build, form_id) REFERENCES private.ref_forms(content_build, form_id),
  FOREIGN KEY (content_build, ability_id) REFERENCES private.ref_abilities(content_build, ability_id)
);

CREATE TABLE IF NOT EXISTS private.ref_moves (
  content_build text NOT NULL REFERENCES private.ref_meta(content_build),
  move_id integer NOT NULL,
  slug text NOT NULL,
  type text,
  damage_class text,
  pp integer,
  power integer,
  accuracy integer,
  PRIMARY KEY (content_build, move_id),
  UNIQUE (content_build, slug),
  CONSTRAINT ref_moves_pp CHECK (pp IS NULL OR pp > 0)
);

CREATE TABLE IF NOT EXISTS private.ref_learnsets (
  content_build text NOT NULL REFERENCES private.ref_meta(content_build),
  form_id integer NOT NULL,
  version_group text NOT NULL,
  method text NOT NULL,
  level integer NOT NULL DEFAULT 0,
  move_id integer NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  PRIMARY KEY (content_build, form_id, version_group, method, level, move_id, sort_order),
  FOREIGN KEY (content_build, form_id) REFERENCES private.ref_forms(content_build, form_id),
  FOREIGN KEY (content_build, move_id) REFERENCES private.ref_moves(content_build, move_id)
);

CREATE TABLE IF NOT EXISTS private.ref_evolutions (
  content_build text NOT NULL REFERENCES private.ref_meta(content_build),
  from_dex integer NOT NULL,
  to_dex integer NOT NULL,
  trigger text,
  min_level integer,
  item_id integer,
  held_item_id integer,
  trade_species_id integer,
  PRIMARY KEY (content_build, from_dex, to_dex, trigger),
  FOREIGN KEY (content_build, from_dex) REFERENCES private.ref_species(content_build, dex),
  FOREIGN KEY (content_build, to_dex) REFERENCES private.ref_species(content_build, dex)
);

CREATE TABLE IF NOT EXISTS private.ref_obtain (
  content_build text NOT NULL REFERENCES private.ref_meta(content_build),
  form_id integer NOT NULL,
  dex integer NOT NULL,
  channel text NOT NULL,
  normal_encounter_enabled boolean NOT NULL,
  admin_targetable boolean NOT NULL,
  event_targetable boolean NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  PRIMARY KEY (content_build, form_id),
  FOREIGN KEY (content_build, form_id) REFERENCES private.ref_forms(content_build, form_id)
);

-- Defense in depth even though `private` should stay unexposed.
ALTER TABLE private.ref_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.ref_natures ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.ref_species ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.ref_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.ref_abilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.ref_form_abilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.ref_moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.ref_learnsets ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.ref_obtain ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.ref_evolutions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON SCHEMA private FROM public, anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA private FROM public, anon, authenticated;
GRANT USAGE ON SCHEMA private TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA private TO postgres;

-- Example idempotent pin row. Values are illustrative of ON CONFLICT, not a live seed.
INSERT INTO private.ref_meta (
  content_build, ruleset_id, pokeapi_commit, built_at, applied_to_live, license_note
) VALUES (
  'sl-ref-20261013-227b573',
  'streamlink-gen9-xgen',
  '227b573712414a86ba299d322fa398fbb2893edc',
  '2026-10-14T01:00:29.309Z',
  FALSE,
  'PokéAPI code is MIT. CSV extract is a fan compilation of factual game data, not a Nintendo product.'
)
ON CONFLICT (content_build) DO UPDATE
SET ruleset_id = EXCLUDED.ruleset_id,
    pokeapi_commit = EXCLUDED.pokeapi_commit,
    built_at = EXCLUDED.built_at,
    applied_to_live = FALSE;

-- Leave public.lgpe_species in place. Do not drop or rewrite it here.
-- Full learnset load should use COPY or batched INSERT in a later A19-SCHEMA file.

COMMIT;
