-- A19-GENVAL UNAPPLIED PRODUCTION ARTIFACT (issue #25)
-- DO NOT RUN against live Supabase or any connected project.
-- Additive / idempotent. Does not DROP tables or functions.
-- Local teardown lives in local/000_teardown.sql. Fixture helpers live in
-- local/010_fixture.sql. Not a migration. Must never be copied into
-- supabase/migrations/ without a separate production GENVAL-apply authorization.
-- Does not replace private.stamp_catch_row.
-- Does not INSERT/UPDATE/DELETE public.catches.

BEGIN;

CREATE SCHEMA IF NOT EXISTS private;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Fail closed if a leftover table has an incompatible ticket_id type.
DO $compat$
BEGIN
  IF to_regclass('private.streamlink_hidden_tickets') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_attribute a
      JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'private'
        AND c.relname = 'streamlink_hidden_tickets'
        AND a.attname = 'ticket_id'
        AND NOT a.attisdropped
        AND a.atttypid = 'uuid'::regtype
    ) THEN
      RAISE EXCEPTION 'incompatible private.streamlink_hidden_tickets (ticket_id must be uuid)';
    END IF;
  END IF;
END
$compat$;

CREATE TABLE IF NOT EXISTS private.streamlink_hidden_tickets (
  ticket_id uuid PRIMARY KEY,
  content_build text NOT NULL,
  form_id integer NOT NULL,
  ctx text NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  redeemed_at timestamptz,
  issued_by name NOT NULL DEFAULT session_user,
  specimen_id uuid,
  specimen_digest bytea,
  CONSTRAINT streamlink_hidden_tickets_ctx CHECK (ctx IN ('grant', 'event')),
  CONSTRAINT streamlink_hidden_tickets_expiry CHECK (expires_at > issued_at)
);

ALTER TABLE private.streamlink_hidden_tickets
  ADD COLUMN IF NOT EXISTS specimen_id uuid;
ALTER TABLE private.streamlink_hidden_tickets
  ADD COLUMN IF NOT EXISTS specimen_digest bytea;

ALTER TABLE private.streamlink_hidden_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.streamlink_hidden_tickets FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.streamlink_hidden_tickets FROM public, anon, authenticated;

DO $pol$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname = 'private'
      AND tablename = 'streamlink_hidden_tickets'
      AND policyname = 'streamlink_hidden_tickets_owner'
  ) THEN
    EXECUTE format(
      'CREATE POLICY streamlink_hidden_tickets_owner ON private.streamlink_hidden_tickets FOR ALL TO %I USING (true) WITH CHECK (true)',
      current_user
    );
  END IF;
END
$pol$;

CREATE OR REPLACE FUNCTION private.streamlink_json_int(p jsonb)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO pg_catalog
AS $fn$
BEGIN
  IF p IS NULL OR jsonb_typeof(p) IS DISTINCT FROM 'number' THEN
    RETURN NULL;
  END IF;
  IF (p #>> '{}') !~ '^-?[0-9]+$' THEN
    RETURN NULL;
  END IF;
  RETURN (p #>> '{}')::integer;
EXCEPTION WHEN others THEN
  RETURN NULL;
END
$fn$;

CREATE OR REPLACE FUNCTION private.streamlink_sha256(p_text text)
RETURNS bytea
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO pg_catalog
AS $fn$
BEGIN
  IF to_regprocedure('extensions.digest(bytea, text)') IS NOT NULL THEN
    RETURN extensions.digest(convert_to(p_text, 'UTF8'), 'sha256');
  END IF;
  IF to_regprocedure('public.digest(bytea, text)') IS NOT NULL THEN
    RETURN public.digest(convert_to(p_text, 'UTF8'), 'sha256');
  END IF;
  RAISE EXCEPTION 'pgcrypto digest(sha256) is required';
END
$fn$;

-- Canonical combat identity. Ignores hiddenGrant, hiddenTicketId, hiddenSpecimenId, stats.
CREATE OR REPLACE FUNCTION private.streamlink_specimen_digest(p_mon jsonb)
RETURNS bytea
LANGUAGE sql
IMMUTABLE
SET search_path TO pg_catalog
AS $fn$
  SELECT private.streamlink_sha256(
    jsonb_build_object(
      'contentBuild', p_mon->>'contentBuild',
      'formId', private.streamlink_json_int(p_mon->'formId'),
      'dex', private.streamlink_json_int(p_mon->'dex'),
      'level', private.streamlink_json_int(p_mon->'level'),
      'natureId', private.streamlink_json_int(p_mon->'natureId'),
      'abilityId', private.streamlink_json_int(p_mon->'abilityId'),
      'abilitySlot', p_mon->>'abilitySlot',
      'ivs', jsonb_build_object(
        'hp', private.streamlink_json_int(p_mon#>'{ivs,hp}'),
        'atk', private.streamlink_json_int(p_mon#>'{ivs,atk}'),
        'def', private.streamlink_json_int(p_mon#>'{ivs,def}'),
        'spa', private.streamlink_json_int(p_mon#>'{ivs,spa}'),
        'spd', private.streamlink_json_int(p_mon#>'{ivs,spd}'),
        'spe', private.streamlink_json_int(p_mon#>'{ivs,spe}')
      ),
      'evs', jsonb_build_object(
        'hp', private.streamlink_json_int(p_mon#>'{evs,hp}'),
        'atk', private.streamlink_json_int(p_mon#>'{evs,atk}'),
        'def', private.streamlink_json_int(p_mon#>'{evs,def}'),
        'spa', private.streamlink_json_int(p_mon#>'{evs,spa}'),
        'spd', private.streamlink_json_int(p_mon#>'{evs,spd}'),
        'spe', private.streamlink_json_int(p_mon#>'{evs,spe}')
      ),
      'moves', (
        SELECT coalesce(jsonb_agg(
          jsonb_build_object(
            'moveId', private.streamlink_json_int(s->'moveId'),
            'method', s->>'method',
            'versionGroup', s->>'versionGroup'
          ) ORDER BY private.streamlink_json_int(s->'moveId')
        ), '[]'::jsonb)
        FROM jsonb_array_elements(
          CASE WHEN jsonb_typeof(p_mon->'moveSlots') = 'array' THEN p_mon->'moveSlots' ELSE '[]'::jsonb END
        ) s
      ),
      'gender', p_mon->>'gender',
      'shiny', CASE WHEN p_mon->'shiny' = 'true'::jsonb THEN true ELSE false END,
      'friendship', private.streamlink_json_int(p_mon->'friendship')
    )::text
  );
$fn$;

CREATE OR REPLACE FUNCTION private.streamlink_secure_u32()
RETURNS bigint
LANGUAGE sql
VOLATILE
SET search_path TO pg_catalog
AS $fn$
  SELECT (
    ('x' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))::bit(32)::bigint
  ) & 4294967295;
$fn$;

CREATE OR REPLACE FUNCTION private.streamlink_form_blocked(p_content_build text, p_form_id integer)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO pg_catalog
AS $fn$
  SELECT EXISTS (
    SELECT 1
    FROM private.ref_form_policies p
    WHERE p.content_build = p_content_build
      AND p.form_id = p_form_id
      AND p.wild_allowed IS NOT TRUE
      AND p.grant_allowed IS NOT TRUE
  );
$fn$;

CREATE OR REPLACE FUNCTION private.streamlink_obtain_ok(
  p_content_build text,
  p_ctx text,
  p_form_id integer
) RETURNS boolean
LANGUAGE plpgsql
STABLE
SET search_path TO pg_catalog
AS $fn$
DECLARE
  o private.ref_obtain%ROWTYPE;
BEGIN
  SELECT * INTO o
  FROM private.ref_obtain
  WHERE content_build = p_content_build AND form_id = p_form_id;
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  IF p_ctx IN ('evolve', 'trade', 'edit') THEN
    RETURN o.enabled;
  END IF;
  IF NOT o.enabled THEN
    RETURN false;
  END IF;
  IF p_ctx IN ('generate', 'catch', 'rebuild') THEN
    RETURN o.normal_encounter_enabled;
  END IF;
  IF p_ctx = 'grant' THEN
    RETURN o.admin_targetable;
  END IF;
  IF p_ctx = 'event' THEN
    RETURN o.event_targetable;
  END IF;
  RETURN false;
END
$fn$;

CREATE OR REPLACE FUNCTION private.streamlink_gender(p_gender_rate integer, p_roll bigint)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO pg_catalog
AS $fn$
  SELECT CASE
    WHEN p_gender_rate = -1 THEN 'Genderless'
    WHEN p_gender_rate = 0 THEN 'Male'
    WHEN p_gender_rate = 8 THEN 'Female'
    WHEN (p_roll % 8) < p_gender_rate THEN 'Female'
    ELSE 'Male'
  END;
$fn$;

CREATE OR REPLACE FUNCTION private.streamlink_hp_max(
  p_base integer,
  p_iv integer,
  p_ev integer,
  p_level integer
) RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path TO pg_catalog
AS $fn$
  SELECT floor((2 * p_base + p_iv + floor(p_ev / 4.0)) * p_level / 100.0)::int + p_level + 10;
$fn$;

CREATE OR REPLACE FUNCTION private.streamlink_stat(
  p_base integer,
  p_iv integer,
  p_ev integer,
  p_level integer,
  p_nature numeric
) RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path TO pg_catalog
AS $fn$
  SELECT floor((floor((2 * p_base + p_iv + floor(p_ev / 4.0)) * p_level / 100.0) + 5) * p_nature)::int;
$fn$;

CREATE OR REPLACE FUNCTION private.streamlink_level_up_slice(
  p_content_build text,
  p_form_id integer,
  p_level integer
) RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path TO pg_catalog
AS $fn$
  WITH form AS (
    SELECT learnset_version_group AS vg, learnset_status
    FROM private.ref_forms
    WHERE content_build = p_content_build AND form_id = p_form_id
  ),
  ranked AS (
    SELECT l.move_id, l.level, l.sort_order, m.slug, m.pp, f.vg,
           row_number() OVER (ORDER BY l.level, l.sort_order, l.move_id) AS rn,
           count(*) OVER () AS n
    FROM form f
    JOIN private.ref_learnsets l
      ON l.content_build = p_content_build
     AND l.form_id = p_form_id
     AND l.version_group = f.vg
     AND l.method = 'level-up'
     AND l.level <= p_level
    JOIN private.ref_moves m
      ON m.content_build = p_content_build AND m.move_id = l.move_id
    WHERE f.learnset_status = 'resolved' AND f.vg IS NOT NULL
  ),
  last4 AS (
    SELECT * FROM ranked WHERE rn > n - 4
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'moveId', move_id,
    'pp', pp,
    'ppMax', pp,
    'method', 'level-up',
    'versionGroup', vg,
    'name', slug
  ) ORDER BY level, sort_order, move_id), '[]'::jsonb)
  FROM last4;
$fn$;

CREATE OR REPLACE FUNCTION private.issue_streamlink_hidden_ticket(
  p_form_id integer,
  p_ctx text,
  p_content_build text DEFAULT 'sl-ref-20261013-227b573',
  p_ttl_seconds integer DEFAULT 3600
) RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO pg_catalog
AS $fn$
DECLARE
  build text := coalesce(p_content_build, 'sl-ref-20261013-227b573');
  v_id uuid;
  v_exp timestamptz;
BEGIN
  IF p_ctx IS NULL OR p_ctx NOT IN ('grant', 'event') THEN
    RETURN jsonb_build_object('ok', false, 'errors', jsonb_build_array('bad-ctx'));
  END IF;
  IF p_ttl_seconds IS NULL OR p_ttl_seconds < 1 OR p_ttl_seconds > 86400 THEN
    RETURN jsonb_build_object('ok', false, 'errors', jsonb_build_array('bad-ttl'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM private.ref_form_abilities a
    WHERE a.content_build = build AND a.form_id = p_form_id AND a.slot = 'hidden'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'errors', jsonb_build_array('no-hidden-slot'));
  END IF;
  IF private.streamlink_form_blocked(build, p_form_id)
     OR NOT private.streamlink_obtain_ok(build, p_ctx, p_form_id) THEN
    RETURN jsonb_build_object('ok', false, 'errors', jsonb_build_array('obtain-denied'));
  END IF;
  v_id := gen_random_uuid();
  v_exp := now() + make_interval(secs => p_ttl_seconds);
  INSERT INTO private.streamlink_hidden_tickets (
    ticket_id, content_build, form_id, ctx, expires_at, issued_by
  ) VALUES (
    v_id, build, p_form_id, p_ctx, v_exp, session_user
  );
  RETURN jsonb_build_object(
    'ok', true,
    'ticketId', v_id,
    'expiresAt', v_exp,
    'formId', p_form_id,
    'ctx', p_ctx,
    'contentBuild', build
  );
END
$fn$;

-- Lock + classify a ticket. Does not redeem.
CREATE OR REPLACE FUNCTION private.streamlink_lock_hidden_ticket(
  p_ticket uuid,
  p_content_build text,
  p_form_id integer,
  p_ctx text
) RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO pg_catalog
AS $fn$
DECLARE
  v_red timestamptz;
  v_exp timestamptz;
  v_form integer;
  v_ctx text;
  v_build text;
BEGIN
  IF p_ticket IS NULL THEN
    RETURN 'missing';
  END IF;
  SELECT t.redeemed_at, t.expires_at, t.form_id, t.ctx, t.content_build
    INTO v_red, v_exp, v_form, v_ctx, v_build
  FROM private.streamlink_hidden_tickets t
  WHERE t.ticket_id = p_ticket
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN 'unknown';
  END IF;
  IF v_red IS NOT NULL THEN
    RETURN 'replay';
  END IF;
  IF v_exp <= now() THEN
    RETURN 'expired';
  END IF;
  IF v_build IS DISTINCT FROM p_content_build
     OR v_form IS DISTINCT FROM p_form_id
     OR v_ctx IS DISTINCT FROM p_ctx THEN
    RETURN 'mismatch';
  END IF;
  RETURN 'ok';
END
$fn$;

-- Atomic redeem + bind to one specimen digest. Ticket must already be locked.
CREATE OR REPLACE FUNCTION private.streamlink_bind_hidden_ticket(
  p_ticket uuid,
  p_specimen_id uuid,
  p_digest bytea
) RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO pg_catalog
AS $fn$
DECLARE
  v_id uuid;
BEGIN
  IF p_ticket IS NULL OR p_specimen_id IS NULL OR p_digest IS NULL THEN
    RETURN 'missing';
  END IF;
  UPDATE private.streamlink_hidden_tickets t
     SET redeemed_at = now(),
         specimen_id = p_specimen_id,
         specimen_digest = p_digest
   WHERE t.ticket_id = p_ticket
     AND t.redeemed_at IS NULL
     AND t.expires_at > now()
     AND t.specimen_digest IS NULL
  RETURNING t.ticket_id INTO v_id;
  IF v_id IS NOT NULL THEN
    RETURN 'ok';
  END IF;
  IF EXISTS (
    SELECT 1 FROM private.streamlink_hidden_tickets t
    WHERE t.ticket_id = p_ticket AND t.redeemed_at IS NOT NULL
  ) THEN
    RETURN 'replay';
  END IF;
  IF EXISTS (
    SELECT 1 FROM private.streamlink_hidden_tickets t
    WHERE t.ticket_id = p_ticket AND t.expires_at <= now()
  ) THEN
    RETURN 'expired';
  END IF;
  RETURN 'mismatch';
END
$fn$;

CREATE OR REPLACE FUNCTION private.streamlink_generate_prepare(
  p_form_id integer,
  p_level integer,
  p_ctx text,
  p_content_build text,
  p_hidden_ticket text
) RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO pg_catalog
AS $fn$
DECLARE
  build text := coalesce(p_content_build, 'sl-ref-20261013-227b573');
  form private.ref_forms%ROWTYPE;
  spec private.ref_species%ROWTYPE;
  errors text[] := ARRAY[]::text[];
  ticket_uuid uuid;
  ticket_st text;
  hidden_pending boolean := false;
  slots text[];
BEGIN
  IF p_ctx IS NULL OR p_ctx NOT IN ('generate', 'catch', 'grant', 'event', 'rebuild') THEN
    errors := array_append(errors, 'bad-ctx');
  END IF;
  IF p_level IS NULL OR p_level < 1 OR p_level > 100 THEN
    errors := array_append(errors, 'bad-level');
  END IF;

  SELECT * INTO form FROM private.ref_forms WHERE content_build = build AND form_id = p_form_id;
  IF NOT FOUND THEN
    errors := array_append(errors, 'unknown-form');
  END IF;
  IF form.form_id IS NOT NULL THEN
    SELECT * INTO spec FROM private.ref_species WHERE content_build = build AND dex = form.dex;
    IF NOT FOUND THEN
      errors := array_append(errors, 'unknown-species');
    END IF;
    IF form.learnset_status IS DISTINCT FROM 'resolved' OR form.learnset_version_group IS NULL THEN
      errors := array_append(errors, 'unresolved-learnset');
    END IF;
    IF private.streamlink_form_blocked(build, p_form_id) THEN
      errors := array_append(errors, 'g1-c1-blocked');
    END IF;
    IF NOT private.streamlink_obtain_ok(build, coalesce(p_ctx, ''), p_form_id) THEN
      errors := array_append(errors, 'obtain-denied');
    END IF;
  END IF;

  IF p_hidden_ticket IS NOT NULL AND btrim(p_hidden_ticket) <> '' THEN
    BEGIN
      ticket_uuid := p_hidden_ticket::uuid;
    EXCEPTION WHEN others THEN
      errors := array_append(errors, 'hidden-ticket-invalid');
      ticket_uuid := NULL;
    END;
  END IF;

  IF array_length(errors, 1) IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'errors', to_jsonb(errors));
  END IF;

  IF ticket_uuid IS NOT NULL THEN
    ticket_st := private.streamlink_lock_hidden_ticket(ticket_uuid, build, p_form_id, p_ctx);
    IF ticket_st = 'ok' THEN
      hidden_pending := true;
    ELSIF ticket_st = 'replay' THEN
      RETURN jsonb_build_object('ok', false, 'errors', jsonb_build_array('hidden-ticket-replay'));
    ELSIF ticket_st = 'expired' THEN
      RETURN jsonb_build_object('ok', false, 'errors', jsonb_build_array('hidden-ticket-expired'));
    ELSE
      RETURN jsonb_build_object('ok', false, 'errors', jsonb_build_array('hidden-not-authorized'));
    END IF;
  END IF;

  IF hidden_pending AND EXISTS (
    SELECT 1 FROM private.ref_form_abilities a
    WHERE a.content_build = build AND a.form_id = p_form_id AND a.slot = 'hidden'
  ) THEN
    slots := ARRAY['hidden']::text[];
  ELSE
    hidden_pending := false;
    ticket_uuid := NULL;
    SELECT coalesce(array_agg(a.slot ORDER BY a.slot), ARRAY[]::text[])
      INTO slots
    FROM private.ref_form_abilities a
    WHERE a.content_build = build AND a.form_id = p_form_id
      AND a.slot IN ('1', '2');
  END IF;
  IF slots IS NULL OR array_length(slots, 1) IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'errors', jsonb_build_array('no-legal-ability'));
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'build', build,
    'formId', form.form_id,
    'dex', form.dex,
    'level', p_level,
    'ctx', p_ctx,
    'ticketUuid', ticket_uuid,
    'hiddenPending', hidden_pending,
    'slots', to_jsonb(slots),
    'genderRate', spec.gender_rate,
    'friendship', spec.streamlink_base_friendship,
    'hp', form.hp,
    'atk', form.atk,
    'def', form.def,
    'spa', form.spa,
    'spd', form.spd,
    'spe', form.spe,
    'heightM', form.height_m,
    'weightKg', form.weight_kg
  );
END
$fn$;

CREATE OR REPLACE FUNCTION private.streamlink_complete_specimen(
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
  p_gender_roll bigint
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
  specimen_id uuid;
  digest bytea;
  bind_st text;
  slots text[];
  pick int;
BEGIN
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
    specimen_id := gen_random_uuid();
    digest := private.streamlink_specimen_digest(mon);
    bind_st := private.streamlink_bind_hidden_ticket(ticket_uuid, specimen_id, digest);
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
      'hiddenSpecimenId', specimen_id
    );
  END IF;
  RETURN mon;
END
$fn$;

CREATE OR REPLACE FUNCTION private.generate_streamlink_mon(
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
  -- p_allow_hidden is intentionally unused.
  -- p_seed is intentionally unused (not an entropy source).
  IF p_allow_hidden IS NULL OR p_seed IS NULL THEN
    NULL;
  END IF;
  prep := private.streamlink_generate_prepare(p_form_id, p_level, p_ctx, p_content_build, p_hidden_ticket);
  IF (prep->>'ok') IS DISTINCT FROM 'true' THEN
    RETURN prep;
  END IF;
  RETURN private.streamlink_complete_specimen(
    prep,
    p_shiny,
    (private.streamlink_secure_u32() % 25)::int + 1,
    (private.streamlink_secure_u32() % 2147483647)::int,
    (private.streamlink_secure_u32() % 32)::int,
    (private.streamlink_secure_u32() % 32)::int,
    (private.streamlink_secure_u32() % 32)::int,
    (private.streamlink_secure_u32() % 32)::int,
    (private.streamlink_secure_u32() % 32)::int,
    (private.streamlink_secure_u32() % 32)::int,
    private.streamlink_secure_u32()
  );
END
$fn$;

CREATE OR REPLACE FUNCTION private.assert_streamlink_legal(
  p_mon jsonb,
  p_ctx text,
  p_hidden_auth uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO pg_catalog
AS $fn$
DECLARE
  errors text[] := ARRAY[]::text[];
  v_build text;
  v_form_id int;
  v_dex int;
  form private.ref_forms%ROWTYPE;
  spec private.ref_species%ROWTYPE;
  v_nature_id int;
  v_ability_id int;
  v_ability_slot text;
  v_level int;
  v_friendship int;
  v_hp_max int;
  v_hp_cur int;
  ev_hp int; ev_atk int; ev_def int; ev_spa int; ev_spd int; ev_spe int;
  iv_hp int; iv_atk int; iv_def int; iv_spa int; iv_spd int; iv_spe int;
  gender text;
  slot jsonb;
  v_move_id int;
  v_vg text;
  v_method text;
  v_pp int;
  v_pp_max int;
  pin_pp int;
  v_learn_level int;
  n_slots int;
  seen int[] := ARRAY[]::int[];
  evs jsonb;
  ivs jsonb;
  v_digest bytea;
BEGIN
  IF p_ctx IS NULL OR p_ctx NOT IN (
    'generate', 'catch', 'grant', 'event', 'evolve', 'trade', 'edit', 'rebuild'
  ) THEN
    errors := array_append(errors, 'bad-ctx');
  END IF;
  IF p_mon IS NULL OR jsonb_typeof(p_mon) IS DISTINCT FROM 'object' THEN
    RETURN jsonb_build_object('ok', false, 'errors', jsonb_build_array('bad-mon'));
  END IF;
  IF coalesce(p_mon->>'protectedAccount', 'false') IN ('true', 't', '1') AND p_ctx = 'edit' THEN
    errors := array_append(errors, 'protected-account');
  END IF;

  v_build := p_mon->>'contentBuild';
  IF v_build IS NULL OR btrim(v_build) = '' OR jsonb_typeof(p_mon->'contentBuild') IS DISTINCT FROM 'string' THEN
    RETURN jsonb_build_object('ok', false, 'errors', jsonb_build_array('legacy-row'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM private.ref_meta m WHERE m.content_build = v_build) THEN
    errors := array_append(errors, 'unknown-pin');
  END IF;
  IF coalesce(p_mon->>'rulesetId', '') IS DISTINCT FROM 'streamlink-gen9-xgen' THEN
    errors := array_append(errors, 'bad-ruleset');
  END IF;

  v_form_id := private.streamlink_json_int(p_mon->'formId');
  IF p_mon->'formId' IS NULL THEN
    errors := array_append(errors, 'missing-form-id');
  ELSIF v_form_id IS NULL THEN
    errors := array_append(errors, 'bad-form-id');
  END IF;
  v_dex := private.streamlink_json_int(p_mon->'dex');
  IF p_mon->'dex' IS NULL THEN
    errors := array_append(errors, 'missing-dex');
  ELSIF v_dex IS NULL THEN
    errors := array_append(errors, 'bad-dex');
  END IF;
  v_level := private.streamlink_json_int(p_mon->'level');
  IF p_mon->'level' IS NULL THEN
    errors := array_append(errors, 'missing-level');
  ELSIF v_level IS NULL OR v_level < 1 OR v_level > 100 THEN
    errors := array_append(errors, 'bad-level');
  END IF;
  v_nature_id := private.streamlink_json_int(p_mon->'natureId');
  IF p_mon->'natureId' IS NULL THEN
    errors := array_append(errors, 'missing-nature');
  ELSIF v_nature_id IS NULL THEN
    errors := array_append(errors, 'bad-nature');
  END IF;
  v_ability_id := private.streamlink_json_int(p_mon->'abilityId');
  IF p_mon->'abilityId' IS NULL THEN
    errors := array_append(errors, 'missing-ability');
  ELSIF v_ability_id IS NULL THEN
    errors := array_append(errors, 'bad-ability');
  END IF;
  v_friendship := private.streamlink_json_int(p_mon->'friendship');
  IF p_mon->'friendship' IS NULL THEN
    errors := array_append(errors, 'missing-friendship');
  ELSIF v_friendship IS NULL OR v_friendship < 0 OR v_friendship > 255 THEN
    errors := array_append(errors, 'friendship');
  END IF;

  IF v_form_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'errors', to_jsonb(errors));
  END IF;

  SELECT * INTO form FROM private.ref_forms f WHERE f.content_build = v_build AND f.form_id = v_form_id;
  IF NOT FOUND THEN
    errors := array_append(errors, 'unknown-form');
    RETURN jsonb_build_object('ok', false, 'errors', to_jsonb(errors));
  END IF;
  IF v_dex IS DISTINCT FROM form.dex THEN
    errors := array_append(errors, 'form-dex-mismatch');
  END IF;
  SELECT * INTO spec FROM private.ref_species s WHERE s.content_build = v_build AND s.dex = form.dex;
  IF NOT FOUND THEN
    errors := array_append(errors, 'unknown-species');
  END IF;
  IF form.learnset_status IS DISTINCT FROM 'resolved' OR form.learnset_version_group IS NULL THEN
    errors := array_append(errors, 'unresolved-learnset');
  END IF;
  IF private.streamlink_form_blocked(v_build, v_form_id) THEN
    errors := array_append(errors, 'g1-c1-blocked');
  END IF;
  IF p_ctx IS NOT NULL AND NOT private.streamlink_obtain_ok(v_build, p_ctx, v_form_id) THEN
    errors := array_append(errors, 'obtain-denied');
  END IF;

  IF v_nature_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM private.ref_natures n WHERE n.content_build = v_build AND n.id = v_nature_id
  ) THEN
    errors := array_append(errors, 'bad-nature');
  END IF;

  v_ability_slot := p_mon->>'abilitySlot';
  IF p_mon->'abilitySlot' IS NULL OR jsonb_typeof(p_mon->'abilitySlot') IS DISTINCT FROM 'string' THEN
    errors := array_append(errors, 'missing-ability-slot');
  ELSIF v_ability_slot NOT IN ('1', '2', 'hidden') THEN
    errors := array_append(errors, 'bad-ability-slot');
  ELSIF v_ability_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM private.ref_form_abilities a
    WHERE a.content_build = v_build AND a.form_id = v_form_id
      AND a.slot = v_ability_slot AND a.ability_id = v_ability_id
  ) THEN
    errors := array_append(errors, 'illegal-ability');
  ELSIF v_ability_slot = 'hidden' THEN
    -- hiddenGrant / hiddenTicketId / hiddenSpecimenId in JSON are not authorization.
    v_digest := private.streamlink_specimen_digest(p_mon);
    IF p_ctx NOT IN ('grant', 'event') OR p_hidden_auth IS NULL OR v_digest IS NULL THEN
      errors := array_append(errors, 'hidden-not-authorized');
    ELSIF NOT EXISTS (
      SELECT 1 FROM private.streamlink_hidden_tickets t
      WHERE t.ticket_id = p_hidden_auth
        AND t.content_build = v_build
        AND t.form_id = v_form_id
        AND t.ctx = p_ctx
        AND t.redeemed_at IS NOT NULL
        AND t.specimen_digest IS NOT NULL
        AND t.specimen_digest = v_digest
    ) THEN
      errors := array_append(errors, 'hidden-not-authorized');
    END IF;
  END IF;

  gender := CASE WHEN jsonb_typeof(p_mon->'gender') = 'string' THEN p_mon->>'gender' ELSE NULL END;
  IF spec.gender_rate IS NOT NULL THEN
    IF spec.gender_rate = -1 AND gender IS DISTINCT FROM 'Genderless' THEN
      errors := array_append(errors, 'gender');
    ELSIF spec.gender_rate = 0 AND gender IS DISTINCT FROM 'Male' THEN
      errors := array_append(errors, 'gender');
    ELSIF spec.gender_rate = 8 AND gender IS DISTINCT FROM 'Female' THEN
      errors := array_append(errors, 'gender');
    ELSIF spec.gender_rate NOT IN (-1, 0, 8) AND gender NOT IN ('Male', 'Female') THEN
      errors := array_append(errors, 'gender');
    END IF;
  END IF;

  ivs := p_mon->'ivs';
  IF ivs IS NULL THEN
    errors := array_append(errors, 'missing-ivs');
  ELSIF jsonb_typeof(ivs) IS DISTINCT FROM 'object' THEN
    errors := array_append(errors, 'bad-ivs');
  ELSE
    iv_hp := private.streamlink_json_int(ivs->'hp');
    iv_atk := private.streamlink_json_int(ivs->'atk');
    iv_def := private.streamlink_json_int(ivs->'def');
    iv_spa := private.streamlink_json_int(ivs->'spa');
    iv_spd := private.streamlink_json_int(ivs->'spd');
    iv_spe := private.streamlink_json_int(ivs->'spe');
    IF ivs->'hp' IS NULL OR ivs->'atk' IS NULL OR ivs->'def' IS NULL
       OR ivs->'spa' IS NULL OR ivs->'spd' IS NULL OR ivs->'spe' IS NULL THEN
      errors := array_append(errors, 'missing-iv');
    ELSIF iv_hp IS NULL OR iv_atk IS NULL OR iv_def IS NULL
       OR iv_spa IS NULL OR iv_spd IS NULL OR iv_spe IS NULL THEN
      errors := array_append(errors, 'bad-iv');
    ELSIF iv_hp NOT BETWEEN 0 AND 31 OR iv_atk NOT BETWEEN 0 AND 31
       OR iv_def NOT BETWEEN 0 AND 31 OR iv_spa NOT BETWEEN 0 AND 31
       OR iv_spd NOT BETWEEN 0 AND 31 OR iv_spe NOT BETWEEN 0 AND 31 THEN
      errors := array_append(errors, 'iv-range');
    END IF;
  END IF;

  evs := p_mon->'evs';
  IF evs IS NULL THEN
    errors := array_append(errors, 'missing-evs');
  ELSIF jsonb_typeof(evs) IS DISTINCT FROM 'object' THEN
    errors := array_append(errors, 'bad-evs');
  ELSE
    ev_hp := private.streamlink_json_int(evs->'hp');
    ev_atk := private.streamlink_json_int(evs->'atk');
    ev_def := private.streamlink_json_int(evs->'def');
    ev_spa := private.streamlink_json_int(evs->'spa');
    ev_spd := private.streamlink_json_int(evs->'spd');
    ev_spe := private.streamlink_json_int(evs->'spe');
    IF evs->'hp' IS NULL OR evs->'atk' IS NULL OR evs->'def' IS NULL
       OR evs->'spa' IS NULL OR evs->'spd' IS NULL OR evs->'spe' IS NULL THEN
      errors := array_append(errors, 'missing-ev');
    ELSIF ev_hp IS NULL OR ev_atk IS NULL OR ev_def IS NULL
       OR ev_spa IS NULL OR ev_spd IS NULL OR ev_spe IS NULL THEN
      errors := array_append(errors, 'bad-ev');
    ELSIF ev_hp NOT BETWEEN 0 AND 252 OR ev_atk NOT BETWEEN 0 AND 252
       OR ev_def NOT BETWEEN 0 AND 252 OR ev_spa NOT BETWEEN 0 AND 252
       OR ev_spd NOT BETWEEN 0 AND 252 OR ev_spe NOT BETWEEN 0 AND 252 THEN
      errors := array_append(errors, 'ev-range');
    ELSIF ev_hp + ev_atk + ev_def + ev_spa + ev_spd + ev_spe > 510 THEN
      errors := array_append(errors, 'ev-total');
    END IF;
  END IF;

  IF p_mon ? 'heldItem' AND jsonb_typeof(p_mon->'heldItem') IS DISTINCT FROM 'null'
     AND coalesce(p_mon->>'heldItem', '') <> '' THEN
    errors := array_append(errors, 'held-item');
  END IF;

  IF p_mon->'moveSlots' IS NULL THEN
    errors := array_append(errors, 'missing-move-slots');
  ELSIF jsonb_typeof(p_mon->'moveSlots') IS DISTINCT FROM 'array' THEN
    errors := array_append(errors, 'bad-move-slots');
  ELSE
    n_slots := jsonb_array_length(p_mon->'moveSlots');
    IF n_slots > 4 THEN
      errors := array_append(errors, 'too-many-moves');
    END IF;
    FOR slot IN SELECT value FROM jsonb_array_elements(p_mon->'moveSlots')
    LOOP
      IF jsonb_typeof(slot) IS DISTINCT FROM 'object' THEN
        errors := array_append(errors, 'bad-move-slot');
        CONTINUE;
      END IF;
      v_move_id := private.streamlink_json_int(slot->'moveId');
      IF slot->'moveId' IS NULL THEN
        errors := array_append(errors, 'missing-move-id');
        CONTINUE;
      ELSIF v_move_id IS NULL THEN
        errors := array_append(errors, 'bad-move-id');
        CONTINUE;
      END IF;
      IF v_move_id = ANY (seen) THEN
        errors := array_append(errors, 'duplicate-move');
      ELSE
        seen := array_append(seen, v_move_id);
      END IF;
      IF jsonb_typeof(slot->'method') IS DISTINCT FROM 'string'
         OR coalesce(slot->>'method', '') = '' THEN
        errors := array_append(errors, 'missing-move-method');
        CONTINUE;
      END IF;
      v_method := slot->>'method';
      IF v_method NOT IN ('level-up', 'machine', 'egg', 'tutor') THEN
        errors := array_append(errors, 'illegal-move-method');
        CONTINUE;
      END IF;
      v_vg := CASE WHEN jsonb_typeof(slot->'versionGroup') = 'string' THEN slot->>'versionGroup' ELSE NULL END;
      IF v_vg IS DISTINCT FROM form.learnset_version_group THEN
        errors := array_append(errors, 'move-vg');
      END IF;
      v_pp := private.streamlink_json_int(slot->'pp');
      v_pp_max := private.streamlink_json_int(slot->'ppMax');
      SELECT m.pp INTO pin_pp
      FROM private.ref_moves m
      WHERE m.content_build = v_build AND m.move_id = v_move_id;
      IF pin_pp IS NULL THEN
        errors := array_append(errors, 'unknown-move');
        CONTINUE;
      END IF;
      IF v_pp_max IS DISTINCT FROM pin_pp OR v_pp IS NULL OR v_pp <= 0 OR v_pp > pin_pp THEN
        errors := array_append(errors, 'pp');
      END IF;
      v_learn_level := NULL;
      SELECT l.level INTO v_learn_level
      FROM private.ref_learnsets l
      WHERE l.content_build = v_build AND l.form_id = v_form_id
        AND l.version_group = form.learnset_version_group
        AND l.move_id = v_move_id
        AND l.method = v_method
      ORDER BY l.level
      LIMIT 1;
      IF NOT FOUND THEN
        errors := array_append(errors, 'illegal-move');
      ELSIF v_method = 'level-up' AND (v_level IS NULL OR v_learn_level > v_level) THEN
        errors := array_append(errors, 'overlevel-move');
      END IF;
    END LOOP;
  END IF;

  IF p_mon->'hpMax' IS NULL THEN
    errors := array_append(errors, 'missing-hp-max');
  ELSIF private.streamlink_json_int(p_mon->'hpMax') IS NULL THEN
    errors := array_append(errors, 'bad-hp-max');
  END IF;
  IF p_mon->'hpCurrent' IS NULL THEN
    errors := array_append(errors, 'missing-hp-current');
  ELSIF private.streamlink_json_int(p_mon->'hpCurrent') IS NULL THEN
    errors := array_append(errors, 'bad-hp-current');
  END IF;
  IF form.hp IS NOT NULL AND iv_hp IS NOT NULL AND ev_hp IS NOT NULL AND v_level IS NOT NULL
     AND private.streamlink_json_int(p_mon->'hpMax') IS NOT NULL THEN
    v_hp_max := private.streamlink_hp_max(form.hp, iv_hp, ev_hp, v_level);
    IF private.streamlink_json_int(p_mon->'hpMax') IS DISTINCT FROM v_hp_max THEN
      errors := array_append(errors, 'hp-max');
    END IF;
    IF private.streamlink_json_int(p_mon->'hpCurrent') IS NOT NULL THEN
      v_hp_cur := private.streamlink_json_int(p_mon->'hpCurrent');
      IF v_hp_cur < 0 OR v_hp_cur > v_hp_max THEN
        errors := array_append(errors, 'hp-current');
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'ok', array_length(errors, 1) IS NULL,
    'errors', to_jsonb(coalesce(errors, ARRAY[]::text[]))
  );
EXCEPTION WHEN others THEN
  RETURN jsonb_build_object('ok', false, 'errors', jsonb_build_array('malformed-json'));
END
$fn$;

DO $rev$
DECLARE
  r text;
  sig text;
  sigs text[] := ARRAY[
    'private.streamlink_json_int(jsonb)',
    'private.streamlink_sha256(text)',
    'private.streamlink_specimen_digest(jsonb)',
    'private.streamlink_secure_u32()',
    'private.streamlink_form_blocked(text, integer)',
    'private.streamlink_obtain_ok(text, text, integer)',
    'private.streamlink_gender(integer, bigint)',
    'private.streamlink_hp_max(integer, integer, integer, integer)',
    'private.streamlink_stat(integer, integer, integer, integer, numeric)',
    'private.streamlink_level_up_slice(text, integer, integer)',
    'private.issue_streamlink_hidden_ticket(integer, text, text, integer)',
    'private.streamlink_lock_hidden_ticket(uuid, text, integer, text)',
    'private.streamlink_bind_hidden_ticket(uuid, uuid, bytea)',
    'private.streamlink_generate_prepare(integer, integer, text, text, text)',
    'private.streamlink_complete_specimen(jsonb, boolean, integer, bigint, integer, integer, integer, integer, integer, integer, bigint)',
    'private.generate_streamlink_mon(integer, integer, text, text, boolean, boolean, text, text)',
    'private.assert_streamlink_legal(jsonb, text, uuid)'
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

COMMENT ON FUNCTION private.generate_streamlink_mon(integer, integer, text, text, boolean, boolean, text, text) IS
  'A19-GENVAL production specimen JSON. Entropy is gen_random_uuid. p_seed and p_allow_hidden are ignored. Hidden binds a ticket to one specimen digest. No catch writes.';
COMMENT ON FUNCTION private.assert_streamlink_legal(jsonb, text, uuid) IS
  'A19-GENVAL legality check. JSON hiddenGrant/hiddenTicketId/hiddenSpecimenId are ignored. Hidden requires p_hidden_auth bound to this specimen digest.';
COMMENT ON FUNCTION private.issue_streamlink_hidden_ticket(integer, text, text, integer) IS
  'Server-only HA ticket issuer. REVOKE from public/anon/authenticated/service_role.';
COMMENT ON TABLE private.streamlink_hidden_tickets IS
  'One-time HA tickets bound to one specimen_digest at redeem. RLS forced. No client DML.';

COMMIT;
