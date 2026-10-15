-- A19-WIRE UNAPPLIED ARTIFACT (issues #25 / #18, D45)
-- DO NOT RUN against live Supabase or project dtflmlbjhttoewqgkujf.
-- Not a migration. Must never be copied into supabase/migrations/.
-- Does not replace private.stamp_catch_row.
-- Does not enable the production switch.
-- Client flags and session GUCs cannot activate WIRE.
-- GV7: new StreamLink public_id uses SL. Existing LG ids stay.

BEGIN;

CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS private.streamlink_wire_switch (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO private.streamlink_wire_switch (id, enabled)
VALUES (1, false)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE private.streamlink_wire_switch ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.streamlink_wire_switch FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.streamlink_wire_switch FROM public, anon, authenticated;
DO $pol$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname = 'private'
      AND tablename = 'streamlink_wire_switch'
      AND policyname = 'streamlink_wire_switch_owner'
  ) THEN
    EXECUTE format(
      'CREATE POLICY streamlink_wire_switch_owner ON private.streamlink_wire_switch FOR ALL TO %I USING (true) WITH CHECK (true)',
      current_user
    );
  END IF;
END
$pol$;

CREATE OR REPLACE FUNCTION private.streamlink_wire_is_enabled()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO pg_catalog
AS $fn$
DECLARE
  v_on boolean;
BEGIN
  -- Intentionally ignore current_setting('starlight.wire_genval') and every
  -- other GUC / client flag. Only the named switch table can enable WIRE.
  SELECT s.enabled INTO v_on
  FROM private.streamlink_wire_switch s
  WHERE s.id = 1;
  RETURN coalesce(v_on, false);
END
$fn$;

CREATE OR REPLACE FUNCTION private.streamlink_wire_set_enabled(p_enabled boolean)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO pg_catalog
AS $fn$
BEGIN
  IF p_enabled IS NULL THEN
    RAISE EXCEPTION 'wire-switch-null';
  END IF;
  UPDATE private.streamlink_wire_switch
     SET enabled = p_enabled,
         updated_at = now()
   WHERE id = 1;
  RETURN p_enabled;
END
$fn$;

CREATE OR REPLACE FUNCTION private.streamlink_protected_trainer(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO pg_catalog
AS $fn$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;
  IF to_regclass('public.profiles') IS NULL THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = p_user_id
      AND (
        lower(coalesce(p.twitch_login, '')) IN ('sorastarlight', 'twinklephoenixstar')
        OR lower(coalesce(p.username, '')) IN ('sorastarlight', 'twinklephoenixstar')
      )
  );
END
$fn$;

CREATE OR REPLACE FUNCTION private.streamlink_next_public_id(p_prefix text)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO pg_catalog
AS $fn$
DECLARE
  prefix text := upper(coalesce(nullif(btrim(p_prefix), ''), 'SL'));
BEGIN
  IF prefix NOT IN ('SL', 'LG') THEN
    RAISE EXCEPTION 'bad-public-id-prefix';
  END IF;
  RETURN prefix || lpad(nextval('public.catch_serial')::text, 8, '0');
END
$fn$;

-- Bound complete: HA redeem uses the preallocated catches.id (WIRE-BIND).
-- generate_streamlink_mon keeps calling the original 11-arg complete.
CREATE OR REPLACE FUNCTION private.streamlink_complete_specimen_bound(
  p_prep jsonb,
  p_shiny boolean,
  p_nature_id integer,
  p_ability_pick bigint,
  p_iv_hp integer,
  p_iv_atk integer,
  p_iv_def integer,
  p_iv_spa integer,
  p_iv_spd integer,
  p_iv_spe integer,
  p_gender_roll bigint,
  p_specimen_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO pg_catalog
AS $fn$
BEGIN
  RETURN private.streamlink_complete_and_bind(
    p_prep, p_shiny, p_nature_id, p_ability_pick,
    p_iv_hp, p_iv_atk, p_iv_def, p_iv_spa, p_iv_spd, p_iv_spe,
    p_gender_roll, p_specimen_id
  );
END
$fn$;

-- HA path: complete the specimen ourselves and bind the preallocated catch id.
CREATE OR REPLACE FUNCTION private.streamlink_complete_and_bind(
  p_prep jsonb,
  p_shiny boolean,
  p_nature_id integer,
  p_ability_pick bigint,
  p_iv_hp integer,
  p_iv_atk integer,
  p_iv_def integer,
  p_iv_spa integer,
  p_iv_spd integer,
  p_iv_spe integer,
  p_gender_roll bigint,
  p_specimen_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO pg_catalog
AS $fn$
DECLARE
  v_build text;
  v_form_id int;
  ability_id int;
  ability_slot text;
  nature_id int := p_nature_id;
  nat private.ref_natures%ROWTYPE;
  gender text;
  moves jsonb;
  hp_max int;
  n_atk numeric := 1; n_def numeric := 1; n_spa numeric := 1; n_spd numeric := 1; n_spe numeric := 1;
  legacy text[];
  mon jsonb;
  ticket_uuid uuid;
  digest bytea;
  bind_st text;
  slots text[];
  pick int;
BEGIN
  IF p_specimen_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'errors', jsonb_build_array('missing-specimen-id'));
  END IF;
  IF p_prep IS NULL OR (p_prep->>'ok') IS DISTINCT FROM 'true' THEN
    RETURN coalesce(p_prep, jsonb_build_object('ok', false, 'errors', jsonb_build_array('bad-prep')));
  END IF;
  v_build := p_prep->>'build';
  v_form_id := private.streamlink_json_int(p_prep->'formId');
  SELECT coalesce(array_agg(x), ARRAY[]::text[])
    INTO slots
  FROM jsonb_array_elements_text(p_prep->'slots') x;
  IF slots IS NULL OR array_length(slots, 1) IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'errors', jsonb_build_array('no-legal-ability'));
  END IF;
  pick := ((p_ability_pick % array_length(slots, 1)) + array_length(slots, 1)) % array_length(slots, 1);
  ability_slot := slots[pick + 1];
  SELECT a.ability_id INTO ability_id
  FROM private.ref_form_abilities a
  WHERE a.content_build = v_build AND a.form_id = v_form_id AND a.slot = ability_slot;
  SELECT * INTO nat FROM private.ref_natures WHERE content_build = v_build AND id = nature_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'errors', jsonb_build_array('bad-nature'));
  END IF;
  gender := private.streamlink_gender(private.streamlink_json_int(p_prep->'genderRate'), p_gender_roll);
  moves := private.streamlink_level_up_slice(v_build, v_form_id, private.streamlink_json_int(p_prep->'level'));
  IF moves IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'errors', jsonb_build_array('unresolved-learnset'));
  END IF;
  IF nat.up_stat = 'atk' THEN n_atk := 1.1; ELSIF nat.down_stat = 'atk' THEN n_atk := 0.9; END IF;
  IF nat.up_stat = 'def' THEN n_def := 1.1; ELSIF nat.down_stat = 'def' THEN n_def := 0.9; END IF;
  IF nat.up_stat = 'spa' THEN n_spa := 1.1; ELSIF nat.down_stat = 'spa' THEN n_spa := 0.9; END IF;
  IF nat.up_stat = 'spd' THEN n_spd := 1.1; ELSIF nat.down_stat = 'spd' THEN n_spd := 0.9; END IF;
  IF nat.up_stat = 'spe' THEN n_spe := 1.1; ELSIF nat.down_stat = 'spe' THEN n_spe := 0.9; END IF;
  hp_max := private.streamlink_hp_max(
    private.streamlink_json_int(p_prep->'hp'), p_iv_hp, 0,
    private.streamlink_json_int(p_prep->'level')
  );
  SELECT coalesce(array_agg(x->>'name'), ARRAY[]::text[])
    INTO legacy
  FROM jsonb_array_elements(moves) x;

  mon := jsonb_build_object(
    'ok', true,
    'formId', v_form_id,
    'dex', private.streamlink_json_int(p_prep->'dex'),
    'level', private.streamlink_json_int(p_prep->'level'),
    'natureId', nature_id,
    'abilityId', ability_id,
    'abilitySlot', ability_slot,
    'ivs', jsonb_build_object('hp', p_iv_hp, 'atk', p_iv_atk, 'def', p_iv_def, 'spa', p_iv_spa, 'spd', p_iv_spd, 'spe', p_iv_spe),
    'evs', jsonb_build_object('hp', 0, 'atk', 0, 'def', 0, 'spa', 0, 'spd', 0, 'spe', 0),
    'moveSlots', moves,
    'legacyMoves', to_jsonb(legacy),
    'gender', gender,
    'shiny', coalesce(p_shiny, false),
    'friendship', private.streamlink_json_int(p_prep->'friendship'),
    'hpMax', hp_max,
    'hpCurrent', hp_max,
    'status', NULL,
    'heldItem', NULL,
    'gigantamaxFactor', false,
    'heightM', p_prep->'heightM',
    'weightKg', p_prep->'weightKg',
    'rulesetId', 'streamlink-gen9-xgen',
    'contentBuild', v_build,
    'hiddenGrant', false,
    'hiddenTicketId', NULL,
    'hiddenSpecimenId', NULL,
    'catchId', p_specimen_id,
    'stats', jsonb_build_object(
      'hp', hp_max,
      'atk', private.streamlink_stat(private.streamlink_json_int(p_prep->'atk'), p_iv_atk, 0, private.streamlink_json_int(p_prep->'level'), n_atk),
      'def', private.streamlink_stat(private.streamlink_json_int(p_prep->'def'), p_iv_def, 0, private.streamlink_json_int(p_prep->'level'), n_def),
      'spa', private.streamlink_stat(private.streamlink_json_int(p_prep->'spa'), p_iv_spa, 0, private.streamlink_json_int(p_prep->'level'), n_spa),
      'spd', private.streamlink_stat(private.streamlink_json_int(p_prep->'spd'), p_iv_spd, 0, private.streamlink_json_int(p_prep->'level'), n_spd),
      'spe', private.streamlink_stat(private.streamlink_json_int(p_prep->'spe'), p_iv_spe, 0, private.streamlink_json_int(p_prep->'level'), n_spe)
    ),
    'errors', '[]'::jsonb
  );

  IF coalesce((p_prep->>'hiddenPending')::boolean, false) THEN
    ticket_uuid := (p_prep->>'ticketUuid')::uuid;
    digest := private.streamlink_specimen_digest(mon);
    bind_st := private.streamlink_bind_hidden_ticket(ticket_uuid, p_specimen_id, digest);
    IF bind_st IS DISTINCT FROM 'ok' THEN
      IF bind_st = 'replay' THEN
        RETURN jsonb_build_object('ok', false, 'errors', jsonb_build_array('hidden-ticket-replay'));
      END IF;
      IF bind_st = 'expired' THEN
        RETURN jsonb_build_object('ok', false, 'errors', jsonb_build_array('hidden-ticket-expired'));
      END IF;
      RETURN jsonb_build_object('ok', false, 'errors', jsonb_build_array('hidden-not-authorized'));
    END IF;
    mon := mon || jsonb_build_object(
      'hiddenGrant', true,
      'hiddenTicketId', ticket_uuid,
      'hiddenSpecimenId', p_specimen_id
    );
  END IF;
  RETURN mon;
END
$fn$;

CREATE OR REPLACE FUNCTION private.persist_streamlink_catch(
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
  IF NOT private.streamlink_wire_is_enabled() THEN
    RETURN jsonb_build_object('ok', false, 'errors', jsonb_build_array('wire-disabled'), 'path', 'stamp');
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
$fn$;

DO $rev$
DECLARE
  r text;
  sig text;
  sigs text[] := ARRAY[
    'private.streamlink_wire_is_enabled()',
    'private.streamlink_wire_set_enabled(boolean)',
    'private.streamlink_protected_trainer(uuid)',
    'private.streamlink_next_public_id(text)',
    'private.streamlink_complete_specimen_bound(jsonb, boolean, integer, bigint, integer, integer, integer, integer, integer, integer, bigint, uuid)',
    'private.streamlink_complete_and_bind(jsonb, boolean, integer, bigint, integer, integer, integer, integer, integer, integer, bigint, uuid)',
    'private.persist_streamlink_catch(uuid, integer, integer, text, text, text, uuid, boolean, text, text, text, text, text)'
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

COMMENT ON TABLE private.streamlink_wire_switch IS
  'Named WIRE activation. Default false. GUCs and client flags are ignored.';
COMMENT ON FUNCTION private.persist_streamlink_catch(uuid, integer, integer, text, text, text, uuid, boolean, text, text, text, text, text) IS
  'Server-only GENVAL persist. Preallocates catches.id, binds HA tickets to that uuid, dual-writes legacy display fields, SL public_id. Does not spend inventory or change capture odds.';

COMMIT;
