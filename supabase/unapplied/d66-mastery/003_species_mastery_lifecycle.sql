-- D66 Species Mastery lifecycle. BRANCH DRAFT. DO NOT APPLY to hosted Supabase.
-- Runs after d64 001 and d65 002. Does not change settlement, points, Rankings, or caught_at values.
-- caught_at remains the stored display time. Mastery eligibility uses the server insert clock below.

CREATE TABLE private.catch_insert_authority (
  catch_id uuid PRIMARY KEY,
  inserted_at timestamptz NOT NULL,
  CONSTRAINT catch_insert_authority_finite CHECK (
    inserted_at > '-infinity'::timestamptz
    AND inserted_at < 'infinity'::timestamptz
  )
);

COMMENT ON TABLE private.catch_insert_authority IS
  'Server clock at specimen insert. Not a client timestamp and not a rewrite of catches.caught_at.';

CREATE FUNCTION private.catch_insert_authority_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO pg_catalog, public
AS $fn$
DECLARE
  inserted_xid bigint;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'insertion authority cannot be deleted' USING ERRCODE = '55000';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'insertion authority is immutable' USING ERRCODE = '55000';
  END IF;
  IF NEW.inserted_at < clock_timestamp() - interval '5 seconds'
     OR NEW.inserted_at > clock_timestamp() + interval '5 seconds' THEN
    RAISE EXCEPTION 'insertion authority must be the server clock' USING ERRCODE = '55000';
  END IF;
  SELECT c.xmin::text::bigint INTO inserted_xid
  FROM public.catches AS c
  WHERE c.id = NEW.catch_id;
  IF inserted_xid IS DISTINCT FROM txid_current() THEN
    RAISE EXCEPTION 'insertion authority must be recorded with the specimen' USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$fn$;

CREATE TRIGGER catch_insert_authority_guard
  BEFORE INSERT OR UPDATE OR DELETE ON private.catch_insert_authority
  FOR EACH ROW EXECUTE FUNCTION private.catch_insert_authority_guard();

CREATE FUNCTION private.record_catch_insert_authority()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, private
AS $fn$
BEGIN
  INSERT INTO private.catch_insert_authority (catch_id, inserted_at)
  VALUES (NEW.id, clock_timestamp());
  RETURN NULL;
END;
$fn$;

CREATE TRIGGER catch_insert_authority
  AFTER INSERT ON public.catches
  FOR EACH ROW EXECUTE FUNCTION private.record_catch_insert_authority();

ALTER TABLE private.catch_insert_authority ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.catch_insert_authority FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.catch_insert_authority FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.catch_insert_authority_guard() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.record_catch_insert_authority() FROM PUBLIC;

ALTER TABLE private.species_mastery_activation
  ADD COLUMN lifecycle text NOT NULL DEFAULT 'inactive'
    CHECK (lifecycle IN ('inactive', 'active', 'paused', 'draining', 'closed')),
  ADD COLUMN paused_at timestamptz,
  ADD COLUMN drain_started_at timestamptz,
  ADD COLUMN closed_at timestamptz;

COMMENT ON COLUMN private.species_mastery_activation.lifecycle IS
  'inactive, active, paused, draining, or closed. One activation clock. Pause can resume. Closed cannot.';

CREATE OR REPLACE FUNCTION private.species_mastery_activation_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO pg_catalog
AS $fn$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'mastery activation cannot be deleted' USING ERRCODE = '55000';
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.activated_at IS NOT NULL OR NEW.disabled_at IS NOT NULL
       OR NEW.lifecycle IS DISTINCT FROM 'inactive' THEN
      RAISE EXCEPTION 'mastery activation must be inserted inactive' USING ERRCODE = '55000';
    END IF;
    RETURN NEW;
  END IF;
  IF OLD.activated_at IS NOT NULL AND NEW.activated_at IS DISTINCT FROM OLD.activated_at THEN
    RAISE EXCEPTION 'mastery activation cutoff is immutable' USING ERRCODE = '55000';
  END IF;
  IF OLD.activated_at IS NULL AND NEW.activated_at IS NOT NULL THEN
    IF NEW.activated_at < clock_timestamp() - interval '5 seconds'
       OR NEW.activated_at > clock_timestamp() + interval '5 seconds' THEN
      RAISE EXCEPTION 'mastery activation cutoff must be the server clock' USING ERRCODE = '55000';
    END IF;
  END IF;
  IF OLD.disabled_at IS NOT NULL AND NEW.disabled_at IS DISTINCT FROM OLD.disabled_at THEN
    RAISE EXCEPTION 'mastery disablement is immutable' USING ERRCODE = '55000';
  END IF;
  IF NEW.lifecycle IS DISTINCT FROM OLD.lifecycle THEN
    IF NOT (
      (OLD.lifecycle = 'inactive' AND NEW.lifecycle = 'active')
      OR (OLD.lifecycle = 'active' AND NEW.lifecycle = 'paused')
      OR (OLD.lifecycle = 'paused' AND NEW.lifecycle = 'active')
      OR (OLD.lifecycle IN ('active', 'paused') AND NEW.lifecycle = 'draining')
      OR (OLD.lifecycle IN ('active', 'paused', 'draining') AND NEW.lifecycle = 'closed')
    ) THEN
      RAISE EXCEPTION 'mastery lifecycle transition is not allowed' USING ERRCODE = '55000';
    END IF;
    IF NEW.lifecycle = 'paused'
       AND (NEW.paused_at IS NULL
            OR NEW.paused_at < clock_timestamp() - interval '5 seconds'
            OR NEW.paused_at > clock_timestamp() + interval '5 seconds') THEN
      RAISE EXCEPTION 'mastery pause must be the server clock' USING ERRCODE = '55000';
    END IF;
    IF NEW.lifecycle = 'draining'
       AND (NEW.drain_started_at IS NULL
            OR NEW.drain_started_at < clock_timestamp() - interval '5 seconds'
            OR NEW.drain_started_at > clock_timestamp() + interval '5 seconds') THEN
      RAISE EXCEPTION 'mastery drain must be the server clock' USING ERRCODE = '55000';
    END IF;
    IF NEW.lifecycle = 'closed'
       AND (NEW.closed_at IS NULL
            OR NEW.closed_at < clock_timestamp() - interval '5 seconds'
            OR NEW.closed_at > clock_timestamp() + interval '5 seconds') THEN
      RAISE EXCEPTION 'mastery close must be the server clock' USING ERRCODE = '55000';
    END IF;
  END IF;
  RETURN NEW;
END;
$fn$;

CREATE OR REPLACE FUNCTION private.activate_species_mastery_events()
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, private
AS $fn$
DECLARE
  opened timestamptz;
BEGIN
  UPDATE private.species_mastery_activation
  SET activated_at = clock_timestamp(),
      lifecycle = 'active'
  WHERE singleton AND activated_at IS NULL AND lifecycle = 'inactive'
  RETURNING activated_at INTO opened;
  IF opened IS NULL THEN
    RAISE EXCEPTION 'mastery recording is already activated' USING ERRCODE = '55000';
  END IF;
  RETURN opened;
END;
$fn$;

CREATE FUNCTION private.pause_species_mastery_delivery()
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, private
AS $fn$
DECLARE
  marked timestamptz;
BEGIN
  UPDATE private.species_mastery_activation
  SET lifecycle = 'paused',
      paused_at = clock_timestamp()
  WHERE singleton AND lifecycle = 'active'
  RETURNING paused_at INTO marked;
  IF marked IS NULL THEN
    RAISE EXCEPTION 'mastery delivery can be paused only while active' USING ERRCODE = '55000';
  END IF;
  RETURN marked;
END;
$fn$;

CREATE FUNCTION private.resume_species_mastery_delivery()
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, private
AS $fn$
DECLARE
  opened timestamptz;
BEGIN
  UPDATE private.species_mastery_activation
  SET lifecycle = 'active'
  WHERE singleton AND lifecycle = 'paused'
  RETURNING activated_at INTO opened;
  IF opened IS NULL THEN
    RAISE EXCEPTION 'mastery delivery can resume only from a pause' USING ERRCODE = '55000';
  END IF;
  RETURN opened;
END;
$fn$;

COMMENT ON FUNCTION private.resume_species_mastery_delivery() IS
  'Resumes the same activation period. Does not move the cutoff and cannot reopen a closed period.';

CREATE FUNCTION private.begin_species_mastery_drain()
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, private
AS $fn$
DECLARE
  marked timestamptz;
BEGIN
  UPDATE private.species_mastery_activation
  SET lifecycle = 'draining',
      drain_started_at = clock_timestamp()
  WHERE singleton AND lifecycle IN ('active', 'paused')
  RETURNING drain_started_at INTO marked;
  IF marked IS NULL THEN
    RAISE EXCEPTION 'mastery drain can start only from active or paused delivery' USING ERRCODE = '55000';
  END IF;
  RETURN marked;
END;
$fn$;

CREATE OR REPLACE FUNCTION private.disable_species_mastery_recording()
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, private
AS $fn$
BEGIN
  RETURN private.begin_species_mastery_drain();
END;
$fn$;

COMMENT ON FUNCTION private.disable_species_mastery_recording() IS
  'Starts the drain. Stops new work and still delivers rows queued before the drain. Does not delete events.';

CREATE FUNCTION private.close_species_mastery_activation()
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, private
AS $fn$
DECLARE
  marked timestamptz;
BEGIN
  UPDATE private.species_mastery_activation
  SET lifecycle = 'closed',
      closed_at = clock_timestamp()
  WHERE singleton AND lifecycle IN ('active', 'paused', 'draining')
  RETURNING closed_at INTO marked;
  IF marked IS NULL THEN
    RAISE EXCEPTION 'mastery activation cannot be closed from this state' USING ERRCODE = '55000';
  END IF;
  RETURN marked;
END;
$fn$;

COMMENT ON FUNCTION private.close_species_mastery_activation() IS
  'Permanent close of this activation period. Pending outbox rows stay. Delivery stops. No second period.';

DO $do$
DECLARE
  cname text;
BEGIN
  SELECT con.conname INTO cname
  FROM pg_constraint AS con
  WHERE con.conrelid = 'private.species_mastery_outbox'::regclass
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) ILIKE '%status%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE private.species_mastery_outbox DROP CONSTRAINT %I', cname);
  END IF;
END
$do$;

ALTER TABLE private.species_mastery_outbox
  ADD CONSTRAINT species_mastery_outbox_status_check
  CHECK (status IN ('pending', 'delivered', 'rejected', 'exhausted'));

CREATE OR REPLACE FUNCTION private.species_mastery_events_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, private
AS $fn$
DECLARE
  specimen public.catches%ROWTYPE;
  activated_at timestamptz;
  lifecycle text;
  drain_started_at timestamptz;
  inserted_at timestamptz;
  queued_at timestamptz;
  logged boolean;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'mastery events are immutable' USING ERRCODE = '55000';
  END IF;

  SELECT * INTO specimen FROM public.catches WHERE id = NEW.catch_id FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'mastery event rejected: specimen is not on file' USING ERRCODE = '23514';
  END IF;
  IF NEW.trainer_id IS DISTINCT FROM specimen.user_id
     OR NEW.dex IS DISTINCT FROM specimen.dex
     OR NEW.round_id IS DISTINCT FROM specimen.round_id
     OR NEW.source_key IS DISTINCT FROM specimen.source_key THEN
    RAISE EXCEPTION 'mastery event rejected: event does not match the specimen' USING ERRCODE = '23514';
  END IF;
  IF specimen.round_id IS NULL THEN
    RAISE EXCEPTION 'mastery event rejected: no encounter round' USING ERRCODE = '23514';
  END IF;

  SELECT a.activated_at, a.lifecycle, a.drain_started_at
    INTO activated_at, lifecycle, drain_started_at
  FROM private.species_mastery_activation AS a
  WHERE a.singleton
  FOR SHARE;
  IF activated_at IS NULL OR lifecycle IS DISTINCT FROM 'active' AND lifecycle IS DISTINCT FROM 'draining' THEN
    RAISE EXCEPTION 'mastery event rejected: recording is not active' USING ERRCODE = '23514';
  END IF;

  SELECT authority.inserted_at INTO inserted_at
  FROM private.catch_insert_authority AS authority
  WHERE authority.catch_id = specimen.id
  FOR SHARE;
  IF inserted_at IS NULL
     OR inserted_at = 'infinity'::timestamptz
     OR inserted_at = '-infinity'::timestamptz
     OR inserted_at > clock_timestamp() + interval '2 minutes' THEN
    RAISE EXCEPTION 'mastery event rejected: insertion time is not server-authoritative' USING ERRCODE = '23514';
  END IF;
  IF inserted_at < activated_at THEN
    RAISE EXCEPTION 'mastery event rejected: specimen predates activation' USING ERRCODE = '23514';
  END IF;
  IF lifecycle = 'draining' THEN
    SELECT o.enqueued_at INTO queued_at
    FROM private.species_mastery_outbox AS o
    WHERE o.catch_id = specimen.id
      AND o.status = 'pending'
      AND o.enqueued_at <= drain_started_at;
    IF queued_at IS NULL THEN
      RAISE EXCEPTION 'mastery event rejected: recording is closed to new work' USING ERRCODE = '23514';
    END IF;
  END IF;

  IF specimen.source_key IS NULL
     OR split_part(specimen.source_key, ':', 1) <> 'play'
     OR split_part(specimen.source_key, ':', 2) IS DISTINCT FROM specimen.round_id::text
     OR split_part(specimen.source_key, ':', 3) IS DISTINCT FROM specimen.user_id::text
     OR split_part(specimen.source_key, ':', 4) <> '' THEN
    RAISE EXCEPTION 'mastery event rejected: source key is not this play capture' USING ERRCODE = '23514';
  END IF;
  IF private.round_is_test(specimen.round_id) THEN
    RAISE EXCEPTION 'mastery event rejected: test round' USING ERRCODE = '23514';
  END IF;

  PERFORM 1
  FROM public.capture_log
  WHERE round_id = specimen.round_id
    AND user_id = specimen.user_id
  FOR SHARE;
  SELECT true INTO logged
  FROM public.capture_log
  WHERE round_id = specimen.round_id
    AND user_id = specimen.user_id
    AND success IS TRUE
    AND (dex IS NULL OR dex = specimen.dex);
  IF logged IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'mastery event rejected: capture was not successful' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$fn$;

CREATE OR REPLACE FUNCTION private.enqueue_species_mastery_event(p_catch_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, private
AS $fn$
DECLARE
  lifecycle text;
BEGIN
  IF p_catch_id IS NULL THEN
    RAISE EXCEPTION 'mastery outbox rejected: missing specimen' USING ERRCODE = '23514';
  END IF;
  SELECT a.lifecycle INTO lifecycle
  FROM private.species_mastery_activation AS a
  WHERE a.singleton
  FOR SHARE;
  IF lifecycle NOT IN ('active', 'paused') THEN
    RAISE EXCEPTION 'mastery outbox rejected: recording is not accepting work' USING ERRCODE = '23514';
  END IF;
  PERFORM 1 FROM public.catches WHERE id = p_catch_id FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'mastery outbox rejected: specimen is not on file' USING ERRCODE = '23514';
  END IF;
  INSERT INTO private.species_mastery_outbox (catch_id)
  VALUES (p_catch_id)
  ON CONFLICT (catch_id) DO NOTHING;
  RETURN p_catch_id;
END;
$fn$;

CREATE OR REPLACE FUNCTION private.reconcile_species_mastery_outbox(p_limit integer DEFAULT 25)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, private
AS $fn$
DECLARE
  opened timestamptz;
  lifecycle text;
  inserted integer;
BEGIN
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 200 THEN
    p_limit := 25;
  END IF;
  SELECT activated_at, a.lifecycle INTO opened, lifecycle
  FROM private.species_mastery_activation AS a
  WHERE a.singleton
  FOR SHARE;
  IF opened IS NULL OR lifecycle NOT IN ('active', 'paused') THEN
    RETURN 0;
  END IF;
  INSERT INTO private.species_mastery_outbox (catch_id)
  SELECT c.id
  FROM public.catches AS c
  JOIN private.catch_insert_authority AS authority ON authority.catch_id = c.id
  WHERE authority.inserted_at >= opened
    AND authority.inserted_at <= clock_timestamp() + interval '2 minutes'
    AND c.source_key IS NOT NULL
    AND split_part(c.source_key, ':', 1) = 'play'
    AND split_part(c.source_key, ':', 2) = c.round_id::text
    AND split_part(c.source_key, ':', 3) = c.user_id::text
    AND split_part(c.source_key, ':', 4) = ''
    AND c.round_id IS NOT NULL
    AND NOT private.round_is_test(c.round_id)
    AND EXISTS (
      SELECT 1
      FROM public.capture_log AS log
      WHERE log.round_id = c.round_id
        AND log.user_id = c.user_id
        AND log.success IS TRUE
        AND (log.dex IS NULL OR log.dex = c.dex)
    )
    AND NOT EXISTS (
      SELECT 1 FROM private.species_mastery_outbox AS queued WHERE queued.catch_id = c.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.species_mastery_events AS earned WHERE earned.catch_id = c.id
    )
  ORDER BY authority.inserted_at, c.id
  LIMIT p_limit
  ON CONFLICT (catch_id) DO NOTHING;
  GET DIAGNOSTICS inserted = ROW_COUNT;
  RETURN inserted;
END;
$fn$;

CREATE OR REPLACE FUNCTION private.deliver_species_mastery_outbox(p_limit integer DEFAULT 25)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, private
AS $fn$
DECLARE
  pending record;
  lifecycle text;
  drain_started_at timestamptz;
  delivered integer := 0;
  next_attempts integer;
BEGIN
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 200 THEN
    p_limit := 25;
  END IF;
  SELECT a.lifecycle, a.drain_started_at INTO lifecycle, drain_started_at
  FROM private.species_mastery_activation AS a
  WHERE a.singleton
  FOR SHARE;
  IF lifecycle NOT IN ('active', 'draining') THEN
    RETURN 0;
  END IF;
  FOR pending IN
    SELECT o.catch_id, o.attempts
    FROM private.species_mastery_outbox AS o
    WHERE o.status = 'pending'
      AND o.attempts < 8
      AND (lifecycle <> 'draining' OR o.enqueued_at <= drain_started_at)
    ORDER BY o.enqueued_at, o.catch_id
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  LOOP
    BEGIN
      PERFORM private.record_species_mastery_event(pending.catch_id);
      UPDATE private.species_mastery_outbox
      SET status = 'delivered',
          delivered_at = clock_timestamp(),
          last_error = NULL
      WHERE catch_id = pending.catch_id;
      delivered := delivered + 1;
    EXCEPTION
      WHEN SQLSTATE '23514' THEN
        UPDATE private.species_mastery_outbox
        SET status = 'rejected',
            attempts = attempts + 1,
            last_error = SQLERRM
        WHERE catch_id = pending.catch_id;
      WHEN OTHERS THEN
        next_attempts := pending.attempts + 1;
        UPDATE private.species_mastery_outbox
        SET attempts = next_attempts,
            status = CASE WHEN next_attempts >= 8 THEN 'exhausted' ELSE 'pending' END,
            last_error = SQLERRM
        WHERE catch_id = pending.catch_id;
    END;
  END LOOP;
  RETURN delivered;
END;
$fn$;

CREATE FUNCTION private.requeue_species_mastery_outbox(p_catch_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, private
AS $fn$
DECLARE
  lifecycle text;
BEGIN
  SELECT a.lifecycle INTO lifecycle
  FROM private.species_mastery_activation AS a
  WHERE a.singleton
  FOR SHARE;
  IF lifecycle NOT IN ('active', 'paused', 'draining') THEN
    RAISE EXCEPTION 'mastery outbox cannot be requeued in this state' USING ERRCODE = '55000';
  END IF;
  UPDATE private.species_mastery_outbox
  SET status = 'pending',
      attempts = 0,
      last_error = NULL
  WHERE catch_id = p_catch_id
    AND status = 'exhausted';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'mastery outbox row is not exhausted' USING ERRCODE = '23514';
  END IF;
  RETURN p_catch_id;
END;
$fn$;

REVOKE ALL ON FUNCTION private.pause_species_mastery_delivery() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.resume_species_mastery_delivery() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.begin_species_mastery_drain() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.close_species_mastery_activation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.requeue_species_mastery_outbox(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.activate_species_mastery_events() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.disable_species_mastery_recording() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.enqueue_species_mastery_event(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.reconcile_species_mastery_outbox(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.deliver_species_mastery_outbox(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.record_species_mastery_event(uuid) FROM PUBLIC, anon, authenticated;
