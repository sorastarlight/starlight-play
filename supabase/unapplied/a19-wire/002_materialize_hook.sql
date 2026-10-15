-- A19-WIRE UNAPPLIED materialize hook (issues #25 / #18, D45)
-- DO NOT RUN against live Supabase or project dtflmlbjhttoewqgkujf.
-- Switch-off uses stamp INSERT. Switch-on calls persist_streamlink_catch.
-- Does not replace private.stamp_catch_row.
-- Does not spend balls, berries, honey, or PokéCoins.

BEGIN;

CREATE OR REPLACE FUNCTION private.materialize_streamlink_catch(
  p_user_id uuid,
  p_form_id integer,
  p_level integer,
  p_ctx text,
  p_source_key text,
  p_ball text DEFAULT 'poke',
  p_round_id uuid DEFAULT NULL,
  p_shiny boolean DEFAULT false,
  p_content_build text DEFAULT 'sl-ref-20261013-227b573',
  p_hidden_ticket text DEFAULT NULL,
  p_variant text DEFAULT 'normal',
  p_name text DEFAULT NULL,
  p_gender text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO pg_catalog
AS $fn$
DECLARE
  v_dex int;
  v_name text;
  inserted uuid;
  v_public text;
BEGIN
  IF private.streamlink_wire_is_enabled() THEN
    RETURN private.persist_streamlink_catch(
      p_user_id, p_form_id, p_level, p_ctx, p_source_key, p_ball, p_round_id,
      p_shiny, p_content_build, p_hidden_ticket, p_variant, p_name, p_gender
    );
  END IF;

  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'errors', jsonb_build_array('missing-user'), 'path', 'stamp');
  END IF;
  IF p_ctx IS NULL OR p_ctx NOT IN ('catch', 'grant', 'event') THEN
    RETURN jsonb_build_object('ok', false, 'errors', jsonb_build_array('bad-ctx'), 'path', 'stamp');
  END IF;
  IF p_source_key IS NULL OR btrim(p_source_key) = '' THEN
    RETURN jsonb_build_object('ok', false, 'errors', jsonb_build_array('missing-source-key'), 'path', 'stamp');
  END IF;
  IF p_ctx IN ('grant', 'event') AND private.streamlink_protected_trainer(p_user_id) THEN
    RETURN jsonb_build_object('ok', false, 'errors', jsonb_build_array('protected-trainer'), 'path', 'stamp');
  END IF;

  SELECT f.dex, initcap(replace(s.slug, '-', ' '))
    INTO v_dex, v_name
  FROM private.ref_forms f
  JOIN private.ref_species s
    ON s.content_build = f.content_build AND s.dex = f.dex
  WHERE f.content_build = coalesce(p_content_build, 'sl-ref-20261013-227b573')
    AND f.form_id = p_form_id;
  v_dex := coalesce(v_dex, p_form_id);
  v_name := coalesce(nullif(btrim(p_name), ''), v_name, 'Pokemon');

  BEGIN
    INSERT INTO public.catches (
      user_id, dex, name, variant, gender, ball, round_id, source_key, level, pokemon_form_id
    ) VALUES (
      p_user_id,
      v_dex,
      v_name,
      coalesce(nullif(btrim(p_variant), ''), 'normal'),
      coalesce(nullif(btrim(p_gender), ''), 'M'),
      coalesce(nullif(btrim(p_ball), ''), 'poke'),
      p_round_id,
      p_source_key,
      p_level,
      p_form_id
    )
    RETURNING id, public_id INTO inserted, v_public;
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'ok', false,
      'errors', jsonb_build_array('already-settled'),
      'replay', true,
      'path', 'stamp'
    );
  END;

  RETURN jsonb_build_object(
    'ok', true,
    'catchId', inserted,
    'publicId', v_public,
    'path', 'stamp'
  );
END
$fn$;

DO $rev$
DECLARE
  r text;
  sig text := 'private.materialize_streamlink_catch(uuid, integer, integer, text, text, text, uuid, boolean, text, text, text, text, text)';
BEGIN
  EXECUTE format('ALTER FUNCTION %s OWNER TO CURRENT_USER', sig);
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM public', sig);
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM %I', sig, r);
    END IF;
  END LOOP;
END
$rev$;

COMMENT ON FUNCTION private.materialize_streamlink_catch(uuid, integer, integer, text, text, text, uuid, boolean, text, text, text, text, text) IS
  'Settle/grant materialize. Switch off: stamp INSERT + LG public_id. Switch on: persist GENVAL + SL public_id. Odds and inventory stay in the caller.';

COMMIT;
