-- D67 catch safety. BRANCH DRAFT. DO NOT APPLY to hosted Supabase.
-- Runs after the unapplied D64, D65, and D66 files.
-- Removes the AFTER INSERT authority write. That second insert can abort a valid catch.
-- The server clock is assigned on the specimen row itself, in BEFORE INSERT, with no extra statement.
-- Optional outbox work stays outside that assignment. Settlement is not hooked.
-- Apply this file in one transaction. The trigger drop is first so a partial run
-- removes the catch-loss path before the new stamp exists. Mastery then fails closed.

DROP TRIGGER IF EXISTS catch_insert_authority ON public.catches;

CREATE OR REPLACE FUNCTION private.record_catch_insert_authority()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO pg_catalog
AS $fn$
BEGIN
  -- Retired. Inserting into another table from this trigger can roll back the catch.
  RETURN NULL;
END;
$fn$;

COMMENT ON FUNCTION private.record_catch_insert_authority() IS
  'No-op. D66 attached this to catches and a failure there aborted the specimen.';

ALTER TABLE public.catches
  ADD COLUMN server_inserted_at timestamptz;

COMMENT ON COLUMN public.catches.server_inserted_at IS
  'Server clock assigned at insert. Null on rows that already existed. Not a client timestamp and not caught_at.';

CREATE FUNCTION private.stamp_catch_server_inserted_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO pg_catalog
AS $fn$
BEGIN
  NEW.server_inserted_at := clock_timestamp();
  RETURN NEW;
END;
$fn$;

CREATE TRIGGER catch_server_inserted_at
  BEFORE INSERT ON public.catches
  FOR EACH ROW EXECUTE FUNCTION private.stamp_catch_server_inserted_at();

CREATE FUNCTION private.freeze_catch_server_inserted_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO pg_catalog
AS $fn$
BEGIN
  IF NEW.server_inserted_at IS DISTINCT FROM OLD.server_inserted_at THEN
    RAISE EXCEPTION 'server insertion time is immutable' USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$fn$;

CREATE TRIGGER catch_server_inserted_at_freeze
  BEFORE UPDATE OF server_inserted_at ON public.catches
  FOR EACH ROW EXECUTE FUNCTION private.freeze_catch_server_inserted_at();

REVOKE ALL ON FUNCTION private.stamp_catch_server_inserted_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.freeze_catch_server_inserted_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.record_catch_insert_authority() FROM PUBLIC;

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

  inserted_at := specimen.server_inserted_at;
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
  WHERE c.server_inserted_at IS NOT NULL
    AND c.server_inserted_at >= opened
    AND c.server_inserted_at <= clock_timestamp() + interval '2 minutes'
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
  ORDER BY c.server_inserted_at, c.id
  LIMIT p_limit
  ON CONFLICT (catch_id) DO NOTHING;
  GET DIAGNOSTICS inserted = ROW_COUNT;
  RETURN inserted;
END;
$fn$;
