-- A19-SCHEMA UNAPPLIED ARTIFACT (issue #22)
-- DO NOT RUN against live Supabase or any connected project.
-- Not a migration. Must never be copied into supabase/migrations/ without a
-- separate production schema-apply authorization.
-- Replaces the #20 public.ref_* draft and hardens the #21 private.ref_* review.

BEGIN;

CREATE SCHEMA IF NOT EXISTS private;

-- Server-only reference pin. Do not add `private` to PostgREST exposed schemas.
-- `source_kind` describes the artifact. It is NOT a live-apply lock or registry.

CREATE TABLE IF NOT EXISTS private.ref_meta (
  content_build text PRIMARY KEY,
  ruleset_id text NOT NULL,
  pokeapi_commit text NOT NULL,
  built_at timestamptz NOT NULL,
  source_kind text NOT NULL DEFAULT 'offline-pin',
  pin_manifest_sha256 text,
  license_note text,
  CONSTRAINT ref_meta_source_kind CHECK (source_kind IN ('offline-pin', 'loaded-unwired'))
);

CREATE TABLE IF NOT EXISTS private.ref_natures (
  content_build text NOT NULL REFERENCES private.ref_meta(content_build) ON DELETE CASCADE,
  id integer NOT NULL,
  slug text NOT NULL,
  name text NOT NULL,
  up_stat text,
  down_stat text,
  PRIMARY KEY (content_build, id),
  UNIQUE (content_build, slug),
  CONSTRAINT ref_natures_stats CHECK (
    (up_stat IS NULL AND down_stat IS NULL)
    OR (up_stat IS NOT NULL AND down_stat IS NOT NULL AND up_stat <> down_stat)
  )
);

CREATE TABLE IF NOT EXISTS private.ref_species (
  content_build text NOT NULL REFERENCES private.ref_meta(content_build) ON DELETE CASCADE,
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
  content_build text NOT NULL REFERENCES private.ref_meta(content_build) ON DELETE CASCADE,
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
  FOREIGN KEY (content_build, dex) REFERENCES private.ref_species(content_build, dex),
  CONSTRAINT ref_forms_learnset_status CHECK (learnset_status IN ('resolved', 'unresolved')),
  CONSTRAINT ref_forms_stats CHECK (
    hp IS NULL OR (hp > 0 AND atk > 0 AND def > 0 AND spa > 0 AND spd > 0 AND spe > 0)
  )
);

CREATE TABLE IF NOT EXISTS private.ref_abilities (
  content_build text NOT NULL REFERENCES private.ref_meta(content_build) ON DELETE CASCADE,
  ability_id integer NOT NULL,
  slug text NOT NULL,
  generation integer,
  is_main_series boolean NOT NULL DEFAULT true,
  PRIMARY KEY (content_build, ability_id),
  UNIQUE (content_build, slug)
);

CREATE TABLE IF NOT EXISTS private.ref_form_abilities (
  content_build text NOT NULL REFERENCES private.ref_meta(content_build) ON DELETE CASCADE,
  form_id integer NOT NULL,
  slot text NOT NULL,
  ability_id integer NOT NULL,
  is_hidden boolean NOT NULL,
  PRIMARY KEY (content_build, form_id, slot),
  FOREIGN KEY (content_build, form_id) REFERENCES private.ref_forms(content_build, form_id),
  FOREIGN KEY (content_build, ability_id) REFERENCES private.ref_abilities(content_build, ability_id),
  CONSTRAINT ref_form_abilities_slot CHECK (slot IN ('1', '2', 'hidden'))
);

CREATE TABLE IF NOT EXISTS private.ref_moves (
  content_build text NOT NULL REFERENCES private.ref_meta(content_build) ON DELETE CASCADE,
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
  content_build text NOT NULL REFERENCES private.ref_meta(content_build) ON DELETE CASCADE,
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
  content_build text NOT NULL REFERENCES private.ref_meta(content_build) ON DELETE CASCADE,
  evo_uid text NOT NULL,
  from_dex integer NOT NULL,
  to_dex integer NOT NULL,
  trigger text NOT NULL,
  min_level integer,
  item_id integer,
  held_item_id integer,
  trade_species_id integer,
  PRIMARY KEY (content_build, evo_uid),
  FOREIGN KEY (content_build, from_dex) REFERENCES private.ref_species(content_build, dex),
  FOREIGN KEY (content_build, to_dex) REFERENCES private.ref_species(content_build, dex)
);

CREATE TABLE IF NOT EXISTS private.ref_obtain (
  content_build text NOT NULL REFERENCES private.ref_meta(content_build) ON DELETE CASCADE,
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

-- G1/C1 policy rows. Generator (later) must read these; this file does not implement it.
CREATE TABLE IF NOT EXISTS private.ref_form_policies (
  content_build text NOT NULL REFERENCES private.ref_meta(content_build) ON DELETE CASCADE,
  form_id integer NOT NULL,
  policy_id text NOT NULL,
  persist_as text NOT NULL,
  wild_allowed boolean NOT NULL DEFAULT false,
  grant_allowed boolean NOT NULL DEFAULT false,
  transform text,
  notes text,
  PRIMARY KEY (content_build, form_id),
  FOREIGN KEY (content_build, form_id) REFERENCES private.ref_forms(content_build, form_id),
  CONSTRAINT ref_form_policies_persist CHECK (persist_as IN ('base', 'self')),
  CONSTRAINT ref_form_policies_id CHECK (policy_id IN ('G1', 'C1'))
);

CREATE INDEX IF NOT EXISTS ref_forms_dex_idx
  ON private.ref_forms (content_build, dex);
CREATE INDEX IF NOT EXISTS ref_learnsets_form_vg_idx
  ON private.ref_learnsets (content_build, form_id, version_group);
CREATE INDEX IF NOT EXISTS ref_form_abilities_form_idx
  ON private.ref_form_abilities (content_build, form_id);
CREATE INDEX IF NOT EXISTS ref_obtain_channel_idx
  ON private.ref_obtain (content_build, channel);
CREATE INDEX IF NOT EXISTS ref_evolutions_from_idx
  ON private.ref_evolutions (content_build, from_dex);

-- Least privilege on these tables only. Do not REVOKE USAGE on schema private
-- (existing SECURITY DEFINER RPCs already live there).
DO $lock$
DECLARE
  t text;
  names text[] := ARRAY[
    'ref_meta', 'ref_natures', 'ref_species', 'ref_forms', 'ref_abilities',
    'ref_form_abilities', 'ref_moves', 'ref_learnsets', 'ref_evolutions',
    'ref_obtain', 'ref_form_policies'
  ];
BEGIN
  FOREACH t IN ARRAY names LOOP
    EXECUTE format('ALTER TABLE private.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON TABLE private.%I FROM public, anon, authenticated', t);
  END LOOP;
END
$lock$;

COMMENT ON TABLE private.ref_meta IS
  'Offline Gen IX pin metadata. source_kind is descriptive, not an apply-to-live lock.';
COMMENT ON TABLE private.ref_form_policies IS
  'Approved G1/C1 persist-as-base and fail-closed wild/grant rules. Not a generator.';
COMMENT ON TABLE private.ref_species IS
  'pokeapi_base_friendship is the pin. streamlink_base_friendship is the F1 derived value.';

-- CREATE TABLE IF NOT EXISTS must not hide a mismatched older layout.
DO $guard$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'private' AND table_name = 'ref_meta' AND column_name = 'source_kind'
  ) THEN
    RAISE EXCEPTION 'private.ref_meta exists without source_kind; refuse mismatched layout';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'private' AND table_name = 'ref_species' AND column_name = 'streamlink_base_friendship'
  ) THEN
    RAISE EXCEPTION 'private.ref_species exists without streamlink_base_friendship; refuse mismatched layout';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'private' AND table_name = 'ref_form_policies'
  ) THEN
    RAISE EXCEPTION 'private.ref_form_policies missing; refuse incomplete A19-SCHEMA layout';
  END IF;
END
$guard$;

-- Leave public.lgpe_species in place. Do not drop or rewrite it.
-- No SECURITY DEFINER functions and no public RPCs in this file.

COMMIT;
