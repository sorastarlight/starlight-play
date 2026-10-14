-- A19-GENVAL LOCAL-ONLY FIXTURE HELPERS (issue #25)
-- DO NOT RUN against live Supabase or any connected project.
-- Disposable local Postgres only. Not part of the production install artifact.
-- Requires production 001_generate_and_assert.sql to be applied first.

BEGIN;

CREATE OR REPLACE FUNCTION private.streamlink_fixture_u32(p_seed text, p_label text)
RETURNS bigint
LANGUAGE sql
IMMUTABLE
SET search_path TO pg_catalog
AS $fn$
  SELECT (
    ('x' || substr(md5(p_seed || chr(31) || p_label), 1, 8))::bit(32)::bigint
  ) & 4294967295;
$fn$;

CREATE OR REPLACE FUNCTION private.generate_streamlink_mon_fixture(
  p_form_id integer,
  p_level integer,
  p_ctx text,
  p_seed text,
  p_allow_hidden boolean DEFAULT false,
  p_shiny boolean DEFAULT false,
  p_content_build text DEFAULT 'sl-ref-20261013-227b573',
  p_hidden_ticket text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO pg_catalog
AS $fn$
DECLARE
  prep jsonb;
BEGIN
  IF p_allow_hidden IS NULL THEN
    NULL;
  END IF;
  IF p_seed IS NULL OR btrim(p_seed) = '' THEN
    RETURN jsonb_build_object('ok', false, 'errors', jsonb_build_array('bad-seed'));
  END IF;
  prep := private.streamlink_generate_prepare(p_form_id, p_level, p_ctx, p_content_build, p_hidden_ticket);
  IF (prep->>'ok') IS DISTINCT FROM 'true' THEN
    RETURN prep;
  END IF;
  RETURN private.streamlink_complete_specimen(
    prep,
    p_shiny,
    (private.streamlink_fixture_u32(p_seed, 'nature') % 25)::int + 1,
    private.streamlink_fixture_u32(p_seed, 'ability'),
    (private.streamlink_fixture_u32(p_seed, 'iv-hp') % 32)::int,
    (private.streamlink_fixture_u32(p_seed, 'iv-atk') % 32)::int,
    (private.streamlink_fixture_u32(p_seed, 'iv-def') % 32)::int,
    (private.streamlink_fixture_u32(p_seed, 'iv-spa') % 32)::int,
    (private.streamlink_fixture_u32(p_seed, 'iv-spd') % 32)::int,
    (private.streamlink_fixture_u32(p_seed, 'iv-spe') % 32)::int,
    private.streamlink_fixture_u32(p_seed, 'gender')
  );
END
$fn$;

DO $rev$
DECLARE
  r text;
  sig text;
  sigs text[] := ARRAY[
    'private.streamlink_fixture_u32(text, text)',
    'private.generate_streamlink_mon_fixture(integer, integer, text, text, boolean, boolean, text, text)'
  ];
BEGIN
  FOREACH sig IN ARRAY sigs LOOP
    EXECUTE format('ALTER FUNCTION %s OWNER TO CURRENT_USER', sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM public', sig);
    FOREACH r IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM %I', sig, r);
      END IF;
    END LOOP;
  END LOOP;
END
$rev$;

COMMENT ON FUNCTION private.generate_streamlink_mon_fixture(integer, integer, text, text, boolean, boolean, text, text) IS
  'LOCAL-ONLY deterministic generator. Not shipped in production 001. REVOKE from client roles.';

COMMIT;
