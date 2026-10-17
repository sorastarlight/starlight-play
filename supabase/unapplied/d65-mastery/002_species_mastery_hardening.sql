-- D65 Species Mastery hardening. BRANCH DRAFT. DO NOT APPLY to hosted Supabase.
-- Runs after supabase/unapplied/d64-mastery/001_species_mastery_events.sql.
-- Does not backfill, hook settlement, or modify points, Rankings, odds, or economy.
-- Installing this file does not activate recording. activated_at stays null.

CREATE TABLE private.species_mastery_activation (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  activated_at timestamptz,
  disabled_at timestamptz,
  CONSTRAINT species_mastery_activation_order CHECK (
    disabled_at IS NULL OR (activated_at IS NOT NULL AND disabled_at >= activated_at)
  )
);

COMMENT ON TABLE private.species_mastery_activation IS
  'Server clock for cosmetic mastery. Null activated_at means recording is off. Not a client setting.';

CREATE FUNCTION private.species_mastery_activation_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO pg_catalog
AS $fn$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'mastery activation cannot be deleted' USING ERRCODE = '55000';
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.activated_at IS NOT NULL OR NEW.disabled_at IS NOT NULL THEN
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
  IF OLD.disabled_at IS NULL AND NEW.disabled_at IS NOT NULL THEN
    IF NEW.activated_at IS NULL THEN
      RAISE EXCEPTION 'mastery recording cannot be disabled before activation' USING ERRCODE = '55000';
    END IF;
    IF NEW.disabled_at < clock_timestamp() - interval '5 seconds'
       OR NEW.disabled_at > clock_timestamp() + interval '5 seconds' THEN
      RAISE EXCEPTION 'mastery disablement must be the server clock' USING ERRCODE = '55000';
    END IF;
  END IF;
  RETURN NEW;
END;
$fn$;

CREATE TRIGGER species_mastery_activation_guard
  BEFORE INSERT OR UPDATE OR DELETE ON private.species_mastery_activation
  FOR EACH ROW EXECUTE FUNCTION private.species_mastery_activation_guard();

INSERT INTO private.species_mastery_activation (singleton) VALUES (true);

CREATE FUNCTION private.species_mastery_caught_at_freeze()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO pg_catalog
AS $fn$
BEGIN
  IF NEW.caught_at IS DISTINCT FROM OLD.caught_at THEN
    RAISE EXCEPTION 'capture timestamp is immutable' USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$fn$;

CREATE TRIGGER species_mastery_caught_at_freeze
  BEFORE UPDATE OF caught_at ON public.catches
  FOR EACH ROW EXECUTE FUNCTION private.species_mastery_caught_at_freeze();

COMMENT ON FUNCTION private.species_mastery_caught_at_freeze() IS
  'Rejects changes to catches.caught_at. Does not rewrite the row. Inserts may still supply a timestamp.';

ALTER TABLE private.species_mastery_activation ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.species_mastery_activation FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.species_mastery_activation FROM PUBLIC, anon, authenticated;

CREATE TABLE private.species_mastery_outbox (
  catch_id uuid PRIMARY KEY,
  enqueued_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'rejected')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error text,
  delivered_at timestamptz
);

COMMENT ON TABLE private.species_mastery_outbox IS
  'Durable intent to record cosmetic mastery. Not a settlement hook and not a points ledger.';

ALTER TABLE private.species_mastery_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.species_mastery_outbox FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.species_mastery_outbox FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.species_mastery_events_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, private
AS $fn$
DECLARE
  specimen public.catches%ROWTYPE;
  activated_at timestamptz;
  disabled_at timestamptz;
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

  SELECT a.activated_at, a.disabled_at
    INTO activated_at, disabled_at
  FROM private.species_mastery_activation AS a
  WHERE a.singleton
  FOR SHARE;
  IF activated_at IS NULL OR disabled_at IS NOT NULL THEN
    RAISE EXCEPTION 'mastery event rejected: recording is not active' USING ERRCODE = '23514';
  END IF;
  IF specimen.caught_at IS NULL
     OR specimen.caught_at = 'infinity'::timestamptz
     OR specimen.caught_at = '-infinity'::timestamptz
     OR specimen.caught_at > clock_timestamp() + interval '2 minutes' THEN
    RAISE EXCEPTION 'mastery event rejected: capture timestamp is missing or ambiguous' USING ERRCODE = '23514';
  END IF;
  IF specimen.caught_at < activated_at THEN
    RAISE EXCEPTION 'mastery event rejected: catch predates activation' USING ERRCODE = '23514';
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

COMMENT ON FUNCTION private.record_species_mastery_event(uuid) IS
  'Server-only cosmetic event. Rejects catches from before activation. Not called by settlement.';

CREATE FUNCTION private.activate_species_mastery_events()
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, private
AS $fn$
DECLARE
  opened timestamptz;
BEGIN
  UPDATE private.species_mastery_activation
  SET activated_at = clock_timestamp()
  WHERE singleton AND activated_at IS NULL
  RETURNING activated_at INTO opened;
  IF opened IS NULL THEN
    RAISE EXCEPTION 'mastery recording is already activated' USING ERRCODE = '55000';
  END IF;
  RETURN opened;
END;
$fn$;

COMMENT ON FUNCTION private.activate_species_mastery_events() IS
  'Sets the cutoff to the server clock. Takes no timestamp argument. Not part of migration install.';

CREATE FUNCTION private.disable_species_mastery_recording()
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, private
AS $fn$
DECLARE
  closed timestamptz;
BEGIN
  UPDATE private.species_mastery_activation
  SET disabled_at = clock_timestamp()
  WHERE singleton AND activated_at IS NOT NULL AND disabled_at IS NULL
  RETURNING disabled_at INTO closed;
  IF closed IS NULL THEN
    RAISE EXCEPTION 'mastery recording cannot be disabled before activation' USING ERRCODE = '55000';
  END IF;
  RETURN closed;
END;
$fn$;

COMMENT ON FUNCTION private.disable_species_mastery_recording() IS
  'Stops new cosmetic events. Does not delete events, catches, or points.';

CREATE FUNCTION private.enqueue_species_mastery_event(p_catch_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, private
AS $fn$
BEGIN
  IF p_catch_id IS NULL THEN
    RAISE EXCEPTION 'mastery outbox rejected: missing specimen' USING ERRCODE = '23514';
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

CREATE FUNCTION private.note_species_mastery_catch(p_catch_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, private
AS $fn$
BEGIN
  PERFORM private.enqueue_species_mastery_event(p_catch_id);
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$fn$;

COMMENT ON FUNCTION private.note_species_mastery_catch(uuid) IS
  'Optional same-transaction note. A false return must not roll back the catch. This is not a settlement hook.';

CREATE FUNCTION private.reconcile_species_mastery_outbox(p_limit integer DEFAULT 25)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, private
AS $fn$
DECLARE
  opened timestamptz;
  closed timestamptz;
  inserted integer;
BEGIN
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 200 THEN
    p_limit := 25;
  END IF;
  SELECT activated_at, disabled_at INTO opened, closed
  FROM private.species_mastery_activation
  WHERE singleton
  FOR SHARE;
  IF opened IS NULL OR closed IS NOT NULL THEN
    RETURN 0;
  END IF;
  INSERT INTO private.species_mastery_outbox (catch_id)
  SELECT c.id
  FROM public.catches AS c
  WHERE c.caught_at IS NOT NULL
    AND c.caught_at >= opened
    AND c.caught_at <= clock_timestamp() + interval '2 minutes'
    AND NOT EXISTS (
      SELECT 1 FROM private.species_mastery_outbox AS o WHERE o.catch_id = c.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.species_mastery_events AS e WHERE e.catch_id = c.id
    )
  ORDER BY c.caught_at, c.id
  LIMIT p_limit
  ON CONFLICT (catch_id) DO NOTHING;
  GET DIAGNOSTICS inserted = ROW_COUNT;
  RETURN inserted;
END;
$fn$;

CREATE FUNCTION private.deliver_species_mastery_outbox(p_limit integer DEFAULT 25)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, private
AS $fn$
DECLARE
  pending record;
  opened timestamptz;
  closed timestamptz;
  delivered integer := 0;
BEGIN
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 200 THEN
    p_limit := 25;
  END IF;
  SELECT activated_at, disabled_at INTO opened, closed
  FROM private.species_mastery_activation
  WHERE singleton
  FOR SHARE;
  IF opened IS NULL OR closed IS NOT NULL THEN
    RETURN 0;
  END IF;
  FOR pending IN
    SELECT catch_id
    FROM private.species_mastery_outbox
    WHERE status = 'pending'
    ORDER BY enqueued_at, catch_id
    LIMIT p_limit
    FOR UPDATE
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
        UPDATE private.species_mastery_outbox
        SET attempts = attempts + 1,
            last_error = SQLERRM
        WHERE catch_id = pending.catch_id;
    END;
  END LOOP;
  RETURN delivered;
END;
$fn$;

REVOKE ALL ON FUNCTION private.species_mastery_activation_guard() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.species_mastery_caught_at_freeze() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.activate_species_mastery_events() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.disable_species_mastery_recording() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.enqueue_species_mastery_event(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.note_species_mastery_catch(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.reconcile_species_mastery_outbox(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.deliver_species_mastery_outbox(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.species_mastery_events_guard() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.record_species_mastery_event(uuid) FROM PUBLIC, anon, authenticated;
