-- A19-GENVAL UNAPPLIED ARTIFACT (issue #25)
-- DO NOT RUN against live Supabase or any connected project.
-- Not a migration. Must never be copied into supabase/migrations/ without a
-- separate production GENVAL-apply authorization.
-- Does not replace private.stamp_catch_row.
-- Does not INSERT/UPDATE/DELETE public.catches.

BEGIN;

CREATE SCHEMA IF NOT EXISTS private;

-- Server-owned hidden-ability tickets. Callers cannot INSERT (REVOKE below).
-- p_allow_hidden on generate is ignored; a matching ticket is required.
CREATE TABLE IF NOT EXISTS private.streamlink_hidden_tickets (
  ticket text PRIMARY KEY,
  content_build text NOT NULL,
  form_id integer NOT NULL,
  ctx text NOT NULL,
  CONSTRAINT streamlink_hidden_tickets_ctx CHECK (ctx IN ('grant', 'event'))
);

ALTER TABLE private.streamlink_hidden_tickets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.streamlink_hidden_tickets FROM public, anon, authenticated;

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

-- Fixture mode: deterministic md5(seed). Production mode: requires
-- SET LOCAL starlight.catcher_nonce (32+ hex from server gen_random_bytes).
-- Never use a public round id as the only entropy (see seed_rejected).
CREATE OR REPLACE FUNCTION private.streamlink_roll_u32(p_seed text, p_label text)
RETURNS bigint
LANGUAGE plpgsql
STABLE
SET search_path TO pg_catalog
AS $fn$
DECLARE
  mode text;
  nonce text;
BEGIN
  mode := coalesce(current_setting('starlight.genval_mode', true), '');
  IF mode = 'fixture' THEN
    RETURN private.streamlink_fixture_u32(p_seed, p_label);
  END IF;
  nonce := coalesce(current_setting('starlight.catcher_nonce', true), '');
  IF length(nonce) < 32 THEN
    RETURN NULL;
  END IF;
  RETURN private.streamlink_fixture_u32(p_seed || ':' || nonce, p_label);
END
$fn$;

CREATE OR REPLACE FUNCTION private.streamlink_seed_rejected(p_seed text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SET search_path TO pg_catalog
AS $fn$
DECLARE
  round_id text;
BEGIN
  IF p_seed IS NULL OR btrim(p_seed) = '' THEN
    RETURN true;
  END IF;
  round_id := coalesce(current_setting('starlight.round_id', true), '');
  IF round_id <> '' AND p_seed = round_id THEN
    RETURN true;
  END IF;
  RETURN false;
END
$fn$;

CREATE OR REPLACE FUNCTION private.streamlink_hidden_ticket_ok(
  p_ticket text,
  p_content_build text,
  p_form_id integer,
  p_ctx text
) RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO pg_catalog
AS $fn$
  SELECT EXISTS (
    SELECT 1
    FROM private.streamlink_hidden_tickets t
    WHERE t.ticket = p_ticket
      AND t.content_build = p_content_build
      AND t.form_id = p_form_id
      AND t.ctx = p_ctx
  );
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
STABLE
SECURITY DEFINER
SET search_path TO pg_catalog
AS $fn$
DECLARE
  build text := coalesce(p_content_build, 'sl-ref-20261013-227b573');
  form private.ref_forms%ROWTYPE;
  spec private.ref_species%ROWTYPE;
  nat private.ref_natures%ROWTYPE;
  errors text[] := ARRAY[]::text[];
  hidden_ok boolean := false;
  slots text[];
  pick int;
  ability_id int;
  ability_slot text;
  iv_hp int; iv_atk int; iv_def int; iv_spa int; iv_spd int; iv_spe int;
  nature_id int;
  gender text;
  moves jsonb;
  hp_max int;
  n_atk numeric := 1; n_def numeric := 1; n_spa numeric := 1; n_spd numeric := 1; n_spe numeric := 1;
  roll bigint;
  legacy text[];
BEGIN
  -- p_allow_hidden is intentionally unused (GV hidden-harden).
  IF p_allow_hidden IS NULL THEN
    NULL;
  END IF;

  IF p_ctx IS NULL OR p_ctx NOT IN ('generate', 'catch', 'grant', 'event', 'rebuild') THEN
    errors := array_append(errors, 'bad-ctx');
  END IF;
  IF private.streamlink_seed_rejected(p_seed) THEN
    errors := array_append(errors, 'bad-seed');
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

  roll := private.streamlink_roll_u32(p_seed, 'nature');
  IF roll IS NULL THEN
    errors := array_append(errors, 'missing-catcher-nonce');
  END IF;

  IF array_length(errors, 1) IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'errors', to_jsonb(errors));
  END IF;

  hidden_ok := private.streamlink_hidden_ticket_ok(p_hidden_ticket, build, p_form_id, p_ctx);
  IF hidden_ok AND EXISTS (
    SELECT 1 FROM private.ref_form_abilities a
    WHERE a.content_build = build AND a.form_id = p_form_id AND a.slot = 'hidden'
  ) THEN
    slots := ARRAY['hidden']::text[];
  ELSE
    hidden_ok := false;
    SELECT coalesce(array_agg(a.slot ORDER BY a.slot), ARRAY[]::text[])
      INTO slots
    FROM private.ref_form_abilities a
    WHERE a.content_build = build AND a.form_id = p_form_id
      AND a.slot IN ('1', '2');
  END IF;
  IF slots IS NULL OR array_length(slots, 1) IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'errors', jsonb_build_array('no-legal-ability'));
  END IF;
  pick := (private.streamlink_roll_u32(p_seed, 'ability') % array_length(slots, 1))::int;
  ability_slot := slots[pick + 1];
  SELECT a.ability_id INTO ability_id
  FROM private.ref_form_abilities a
  WHERE a.content_build = build AND a.form_id = p_form_id AND a.slot = ability_slot;

  nature_id := (private.streamlink_roll_u32(p_seed, 'nature') % 25)::int + 1;
  SELECT * INTO nat FROM private.ref_natures WHERE content_build = build AND id = nature_id;
  iv_hp := (private.streamlink_roll_u32(p_seed, 'iv-hp') % 32)::int;
  iv_atk := (private.streamlink_roll_u32(p_seed, 'iv-atk') % 32)::int;
  iv_def := (private.streamlink_roll_u32(p_seed, 'iv-def') % 32)::int;
  iv_spa := (private.streamlink_roll_u32(p_seed, 'iv-spa') % 32)::int;
  iv_spd := (private.streamlink_roll_u32(p_seed, 'iv-spd') % 32)::int;
  iv_spe := (private.streamlink_roll_u32(p_seed, 'iv-spe') % 32)::int;
  gender := private.streamlink_gender(spec.gender_rate, private.streamlink_roll_u32(p_seed, 'gender'));
  moves := private.streamlink_level_up_slice(build, p_form_id, p_level);
  IF moves IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'errors', jsonb_build_array('unresolved-learnset'));
  END IF;

  IF nat.up_stat = 'atk' THEN n_atk := 1.1; ELSIF nat.down_stat = 'atk' THEN n_atk := 0.9; END IF;
  IF nat.up_stat = 'def' THEN n_def := 1.1; ELSIF nat.down_stat = 'def' THEN n_def := 0.9; END IF;
  IF nat.up_stat = 'spa' THEN n_spa := 1.1; ELSIF nat.down_stat = 'spa' THEN n_spa := 0.9; END IF;
  IF nat.up_stat = 'spd' THEN n_spd := 1.1; ELSIF nat.down_stat = 'spd' THEN n_spd := 0.9; END IF;
  IF nat.up_stat = 'spe' THEN n_spe := 1.1; ELSIF nat.down_stat = 'spe' THEN n_spe := 0.9; END IF;

  hp_max := private.streamlink_hp_max(form.hp, iv_hp, 0, p_level);

  SELECT coalesce(array_agg(x->>'name'), ARRAY[]::text[])
    INTO legacy
  FROM jsonb_array_elements(moves) x;

  RETURN jsonb_build_object(
    'ok', true,
    'formId', form.form_id,
    'dex', form.dex,
    'level', p_level,
    'natureId', nature_id,
    'abilityId', ability_id,
    'abilitySlot', ability_slot,
    'ivs', jsonb_build_object('hp', iv_hp, 'atk', iv_atk, 'def', iv_def, 'spa', iv_spa, 'spd', iv_spd, 'spe', iv_spe),
    'evs', jsonb_build_object('hp', 0, 'atk', 0, 'def', 0, 'spa', 0, 'spd', 0, 'spe', 0),
    'moveSlots', moves,
    'legacyMoves', to_jsonb(legacy),
    'gender', gender,
    'shiny', coalesce(p_shiny, false),
    'friendship', spec.streamlink_base_friendship,
    'hpMax', hp_max,
    'hpCurrent', hp_max,
    'status', NULL,
    'heldItem', NULL,
    'gigantamaxFactor', false,
    'heightM', form.height_m,
    'weightKg', form.weight_kg,
    'rulesetId', 'streamlink-gen9-xgen',
    'contentBuild', build,
    'hiddenGrant', hidden_ok,
    'stats', jsonb_build_object(
      'hp', hp_max,
      'atk', private.streamlink_stat(form.atk, iv_atk, 0, p_level, n_atk),
      'def', private.streamlink_stat(form.def, iv_def, 0, p_level, n_def),
      'spa', private.streamlink_stat(form.spa, iv_spa, 0, p_level, n_spa),
      'spd', private.streamlink_stat(form.spd, iv_spd, 0, p_level, n_spd),
      'spe', private.streamlink_stat(form.spe, iv_spe, 0, p_level, n_spe)
    ),
    'errors', '[]'::jsonb
  );
END
$fn$;

CREATE OR REPLACE FUNCTION private.assert_streamlink_legal(p_mon jsonb, p_ctx text)
RETURNS jsonb
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
  move_ok boolean;
  pin_pp int;
  n_slots int;
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
  IF v_build IS NULL OR btrim(v_build) = '' THEN
    RETURN jsonb_build_object('ok', false, 'errors', jsonb_build_array('legacy-row'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM private.ref_meta m WHERE m.content_build = v_build) THEN
    errors := array_append(errors, 'unknown-pin');
  END IF;
  IF coalesce(p_mon->>'rulesetId', '') IS DISTINCT FROM 'streamlink-gen9-xgen' THEN
    errors := array_append(errors, 'bad-ruleset');
  END IF;

  v_form_id := (p_mon->>'formId')::int;
  v_dex := (p_mon->>'dex')::int;
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
  IF form.learnset_status IS DISTINCT FROM 'resolved' THEN
    errors := array_append(errors, 'unresolved-learnset');
  END IF;
  IF private.streamlink_form_blocked(v_build, v_form_id) THEN
    errors := array_append(errors, 'g1-c1-blocked');
  END IF;
  IF p_ctx IS NOT NULL AND NOT private.streamlink_obtain_ok(v_build, p_ctx, v_form_id) THEN
    errors := array_append(errors, 'obtain-denied');
  END IF;

  v_nature_id := (p_mon->>'natureId')::int;
  IF v_nature_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM private.ref_natures n WHERE n.content_build = v_build AND n.id = v_nature_id
  ) THEN
    errors := array_append(errors, 'bad-nature');
  END IF;

  v_ability_id := (p_mon->>'abilityId')::int;
  v_ability_slot := p_mon->>'abilitySlot';
  IF v_ability_slot IS NULL OR v_ability_slot NOT IN ('1', '2', 'hidden') THEN
    errors := array_append(errors, 'bad-ability-slot');
  ELSIF NOT EXISTS (
    SELECT 1 FROM private.ref_form_abilities a
    WHERE a.content_build = v_build AND a.form_id = v_form_id
      AND a.slot = v_ability_slot AND a.ability_id = v_ability_id
  ) THEN
    errors := array_append(errors, 'illegal-ability');
  ELSIF v_ability_slot = 'hidden' THEN
    IF p_ctx NOT IN ('grant', 'event') THEN
      errors := array_append(errors, 'hidden-not-authorized');
    ELSIF coalesce(p_mon->>'hiddenGrant', 'false') IS DISTINCT FROM 'true' THEN
      errors := array_append(errors, 'hidden-not-authorized');
    END IF;
  END IF;

  v_level := (p_mon->>'level')::int;
  IF v_level IS NULL OR v_level < 1 OR v_level > 100 THEN
    errors := array_append(errors, 'bad-level');
  END IF;

  gender := p_mon->>'gender';
  IF spec.gender_rate = -1 AND gender IS DISTINCT FROM 'Genderless' THEN
    errors := array_append(errors, 'gender');
  ELSIF spec.gender_rate = 0 AND gender IS DISTINCT FROM 'Male' THEN
    errors := array_append(errors, 'gender');
  ELSIF spec.gender_rate = 8 AND gender IS DISTINCT FROM 'Female' THEN
    errors := array_append(errors, 'gender');
  ELSIF spec.gender_rate NOT IN (-1, 0, 8) AND gender NOT IN ('Male', 'Female') THEN
    errors := array_append(errors, 'gender');
  END IF;

  iv_hp := (p_mon#>>'{ivs,hp}')::int; iv_atk := (p_mon#>>'{ivs,atk}')::int;
  iv_def := (p_mon#>>'{ivs,def}')::int; iv_spa := (p_mon#>>'{ivs,spa}')::int;
  iv_spd := (p_mon#>>'{ivs,spd}')::int; iv_spe := (p_mon#>>'{ivs,spe}')::int;
  IF iv_hp IS NULL OR iv_atk IS NULL OR iv_def IS NULL
     OR iv_spa IS NULL OR iv_spd IS NULL OR iv_spe IS NULL
     OR iv_hp NOT BETWEEN 0 AND 31 OR iv_atk NOT BETWEEN 0 AND 31
     OR iv_def NOT BETWEEN 0 AND 31 OR iv_spa NOT BETWEEN 0 AND 31
     OR iv_spd NOT BETWEEN 0 AND 31 OR iv_spe NOT BETWEEN 0 AND 31 THEN
    errors := array_append(errors, 'iv-range');
  END IF;

  ev_hp := coalesce((p_mon#>>'{evs,hp}')::int, 0);
  ev_atk := coalesce((p_mon#>>'{evs,atk}')::int, 0);
  ev_def := coalesce((p_mon#>>'{evs,def}')::int, 0);
  ev_spa := coalesce((p_mon#>>'{evs,spa}')::int, 0);
  ev_spd := coalesce((p_mon#>>'{evs,spd}')::int, 0);
  ev_spe := coalesce((p_mon#>>'{evs,spe}')::int, 0);
  IF ev_hp NOT BETWEEN 0 AND 252 OR ev_atk NOT BETWEEN 0 AND 252
     OR ev_def NOT BETWEEN 0 AND 252 OR ev_spa NOT BETWEEN 0 AND 252
     OR ev_spd NOT BETWEEN 0 AND 252 OR ev_spe NOT BETWEEN 0 AND 252 THEN
    errors := array_append(errors, 'ev-range');
  ELSIF ev_hp + ev_atk + ev_def + ev_spa + ev_spd + ev_spe > 510 THEN
    errors := array_append(errors, 'ev-total');
  END IF;

  v_friendship := (p_mon->>'friendship')::int;
  IF v_friendship IS NULL OR v_friendship < 0 OR v_friendship > 255 THEN
    errors := array_append(errors, 'friendship');
  END IF;

  IF p_mon ? 'heldItem' AND p_mon->>'heldItem' IS NOT NULL AND p_mon->>'heldItem' <> '' THEN
    errors := array_append(errors, 'held-item');
  END IF;

  n_slots := coalesce(jsonb_array_length(p_mon->'moveSlots'), 0);
  IF n_slots > 4 THEN
    errors := array_append(errors, 'too-many-moves');
  END IF;
  IF p_mon->'moveSlots' IS NOT NULL AND jsonb_typeof(p_mon->'moveSlots') = 'array' THEN
    FOR slot IN SELECT value FROM jsonb_array_elements(p_mon->'moveSlots')
    LOOP
      v_move_id := (slot->>'moveId')::int;
      v_vg := slot->>'versionGroup';
      v_method := slot->>'method';
      v_pp := (slot->>'pp')::int;
      v_pp_max := (slot->>'ppMax')::int;
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
      IF v_vg IS DISTINCT FROM form.learnset_version_group THEN
        errors := array_append(errors, 'move-vg');
      END IF;
      SELECT EXISTS (
        SELECT 1 FROM private.ref_learnsets l
        WHERE l.content_build = v_build AND l.form_id = v_form_id
          AND l.version_group = form.learnset_version_group
          AND l.move_id = v_move_id
          AND (v_method IS NULL OR l.method = v_method)
      ) INTO move_ok;
      IF NOT move_ok THEN
        errors := array_append(errors, 'illegal-move');
      END IF;
    END LOOP;
  END IF;

  IF form.hp IS NOT NULL AND iv_hp IS NOT NULL AND v_level IS NOT NULL
     AND p_mon ? 'hpMax' AND p_mon->>'hpMax' IS NOT NULL THEN
    v_hp_max := private.streamlink_hp_max(form.hp, iv_hp, ev_hp, v_level);
    IF (p_mon->>'hpMax')::int IS DISTINCT FROM v_hp_max THEN
      errors := array_append(errors, 'hp-max');
    END IF;
    IF p_mon ? 'hpCurrent' AND p_mon->>'hpCurrent' IS NOT NULL THEN
      v_hp_cur := (p_mon->>'hpCurrent')::int;
      IF v_hp_cur < 0 OR v_hp_cur > v_hp_max THEN
        errors := array_append(errors, 'hp-current');
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'ok', array_length(errors, 1) IS NULL,
    'errors', to_jsonb(coalesce(errors, ARRAY[]::text[]))
  );
END
$fn$;

DO $rev$
DECLARE
  r text;
  sig text;
  sigs text[] := ARRAY[
    'private.streamlink_fixture_u32(text, text)',
    'private.streamlink_roll_u32(text, text)',
    'private.streamlink_seed_rejected(text)',
    'private.streamlink_hidden_ticket_ok(text, text, integer, text)',
    'private.streamlink_form_blocked(text, integer)',
    'private.streamlink_obtain_ok(text, text, integer)',
    'private.streamlink_gender(integer, bigint)',
    'private.streamlink_hp_max(integer, integer, integer, integer)',
    'private.streamlink_stat(integer, integer, integer, integer, numeric)',
    'private.streamlink_level_up_slice(text, integer, integer)',
    'private.generate_streamlink_mon(integer, integer, text, text, boolean, boolean, text, text)',
    'private.assert_streamlink_legal(jsonb, text)'
  ];
BEGIN
  FOREACH sig IN ARRAY sigs LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM public', sig);
    FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM %I', sig, r);
      END IF;
    END LOOP;
  END LOOP;
END
$rev$;

COMMENT ON FUNCTION private.generate_streamlink_mon(integer, integer, text, text, boolean, boolean, text, text) IS
  'A19-GENVAL specimen JSON only. p_allow_hidden is ignored. Hidden requires a server-owned ticket. No catch writes.';
COMMENT ON FUNCTION private.assert_streamlink_legal(jsonb, text) IS
  'A19-GENVAL legality check. Does not write catches. Hidden needs hiddenGrant=true from a ticketed generate.';
COMMENT ON TABLE private.streamlink_hidden_tickets IS
  'Server-owned HA tickets. REVOKE INSERT from client roles. Not a caller boolean.';

COMMIT;
