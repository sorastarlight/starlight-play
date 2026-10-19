-- Staff-only grant adapter derived from live canonical persister md5 0d1724fb07b156d6124b2f0f556303a4.
-- Only name and entry guard differ; canonical random generation, validation and insertion remain unchanged.
-- The existing persister and global WIRE switch are not modified.
BEGIN;
CREATE OR REPLACE FUNCTION private.persist_staff_gift(p_user_id uuid, p_form_id integer, p_level integer, p_ctx text, p_source_key text, p_ball text DEFAULT 'poke'::text, p_round_id uuid DEFAULT NULL::uuid, p_shiny boolean DEFAULT false, p_content_build text DEFAULT 'sl-ref-20261013-227b573'::text, p_hidden_ticket text DEFAULT NULL::text, p_variant text DEFAULT 'normal'::text, p_name text DEFAULT NULL::text, p_gender text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  catch_id uuid;
  prep jsonb;
  mon jsonb;
  legal jsonb;
  ticket_uuid uuid;
  v_name text;
  v_variant text;
  v_public text;
  legacy text[];
  inserted uuid;
BEGIN
  PERFORM private.require_staff_edit();
  IF p_ctx IS DISTINCT FROM 'grant' OR p_source_key IS NULL OR p_source_key NOT LIKE 'grant:staff-reward:%' THEN
    RAISE EXCEPTION 'Only audited staff gift requests are accepted.' USING ERRCODE='42501';
  END IF;
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'errors', jsonb_build_array('missing-user'));
  END IF;
  IF p_ctx IS NULL OR p_ctx NOT IN ('catch', 'grant', 'event') THEN
    RETURN jsonb_build_object('ok', false, 'errors', jsonb_build_array('bad-ctx'));
  END IF;
  IF p_source_key IS NULL OR btrim(p_source_key) = '' THEN
    RETURN jsonb_build_object('ok', false, 'errors', jsonb_build_array('missing-source-key'));
  END IF;
  IF p_ctx = 'catch' AND p_source_key NOT LIKE 'play:%' THEN
    RETURN jsonb_build_object('ok', false, 'errors', jsonb_build_array('bad-source-key'));
  END IF;
  IF p_ctx = 'grant' AND p_source_key NOT LIKE 'grant:%' THEN
    RETURN jsonb_build_object('ok', false, 'errors', jsonb_build_array('bad-source-key'));
  END IF;
  IF p_ctx = 'event' AND p_source_key NOT LIKE 'event:%' THEN
    RETURN jsonb_build_object('ok', false, 'errors', jsonb_build_array('bad-source-key'));
  END IF;
  IF p_ctx IN ('grant', 'event') AND private.streamlink_protected_trainer(p_user_id) THEN
    RETURN jsonb_build_object('ok', false, 'errors', jsonb_build_array('protected-trainer'));
  END IF;

  catch_id := gen_random_uuid();
  prep := private.streamlink_generate_prepare(
    p_form_id, p_level, p_ctx, coalesce(p_content_build, 'sl-ref-20261013-227b573'), p_hidden_ticket
  );
  IF (prep->>'ok') IS DISTINCT FROM 'true' THEN
    RETURN prep;
  END IF;

  mon := private.streamlink_complete_and_bind(
    prep,
    coalesce(p_shiny, false),
    (private.streamlink_secure_u32() % 25)::int + 1,
    (private.streamlink_secure_u32() % 2147483647)::int,
    (private.streamlink_secure_u32() % 32)::int,
    (private.streamlink_secure_u32() % 32)::int,
    (private.streamlink_secure_u32() % 32)::int,
    (private.streamlink_secure_u32() % 32)::int,
    (private.streamlink_secure_u32() % 32)::int,
    (private.streamlink_secure_u32() % 32)::int,
    private.streamlink_secure_u32(),
    catch_id
  );
  IF (mon->>'ok') IS DISTINCT FROM 'true' THEN
    RETURN mon;
  END IF;

  IF (prep->>'ticketUuid') IS NOT NULL AND btrim(prep->>'ticketUuid') <> '' THEN
    ticket_uuid := (prep->>'ticketUuid')::uuid;
  END IF;
  legal := private.assert_streamlink_legal(mon, p_ctx, ticket_uuid);
  IF (legal->>'ok') IS DISTINCT FROM 'true' THEN
    RETURN legal;
  END IF;

  SELECT initcap(replace(s.slug, '-', ' '))
    INTO v_name
  FROM private.ref_species s
  WHERE s.content_build = prep->>'build'
    AND s.dex = private.streamlink_json_int(prep->'dex');
  v_name := coalesce(nullif(btrim(p_name), ''), v_name, 'Pokemon');
  v_variant := CASE
    WHEN coalesce(p_shiny, false) THEN 'shiny'
    ELSE coalesce(nullif(btrim(p_variant), ''), 'normal')
  END;
  v_public := private.streamlink_next_public_id('SL');
  SELECT coalesce(array_agg(x), ARRAY[]::text[])
    INTO legacy
  FROM jsonb_array_elements_text(mon->'legacyMoves') x;

  BEGIN
    INSERT INTO public.catches (
      id, user_id, dex, name, variant, gender, ball, round_id, source_key,
      public_id, level, pokemon_form_id,
      iv_hp, iv_atk, iv_def, iv_spa, iv_spd, iv_spe,
      av_hp, av_atk, av_def, av_spa, av_spd, av_spe,
      moves, friendship, height_m, weight_kg,
      nature_id, ability_id, ability_slot,
      ev_hp, ev_atk, ev_def, ev_spa, ev_spd, ev_spe,
      move_slots, ruleset_id, content_build,
      hp_current, hp_max, status, held_item, gigantamax_factor
    ) VALUES (
      catch_id,
      p_user_id,
      private.streamlink_json_int(mon->'dex'),
      v_name,
      v_variant,
      coalesce(nullif(btrim(p_gender), ''), mon->>'gender'),
      coalesce(nullif(btrim(p_ball), ''), 'poke'),
      p_round_id,
      p_source_key,
      v_public,
      private.streamlink_json_int(mon->'level'),
      private.streamlink_json_int(mon->'formId'),
      private.streamlink_json_int(mon#>'{ivs,hp}'),
      private.streamlink_json_int(mon#>'{ivs,atk}'),
      private.streamlink_json_int(mon#>'{ivs,def}'),
      private.streamlink_json_int(mon#>'{ivs,spa}'),
      private.streamlink_json_int(mon#>'{ivs,spd}'),
      private.streamlink_json_int(mon#>'{ivs,spe}'),
      0, 0, 0, 0, 0, 0,
      legacy,
      private.streamlink_json_int(mon->'friendship'),
      (mon->>'heightM')::numeric,
      (mon->>'weightKg')::numeric,
      private.streamlink_json_int(mon->'natureId'),
      private.streamlink_json_int(mon->'abilityId'),
      mon->>'abilitySlot',
      0, 0, 0, 0, 0, 0,
      mon->'moveSlots',
      mon->>'rulesetId',
      mon->>'contentBuild',
      private.streamlink_json_int(mon->'hpCurrent'),
      private.streamlink_json_int(mon->'hpMax'),
      NULL,
      NULL,
      false
    )
    RETURNING id INTO inserted;
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'ok', false,
      'errors', jsonb_build_array('already-settled'),
      'replay', true,
      'path', 'wire'
    );
  END;

  RETURN jsonb_build_object(
    'ok', true,
    'catchId', inserted,
    'publicId', v_public,
    'path', 'wire',
    'mon', mon
  );
END
$function$;

REVOKE ALL ON FUNCTION private.persist_staff_gift(uuid,integer,integer,text,text,text,uuid,boolean,text,text,text,text,text) FROM PUBLIC,anon,authenticated,service_role;
COMMIT;

