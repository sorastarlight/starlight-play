-- A19-WIRE local-only failure injection. Disposable clusters only.
-- Must never be copied into 001/002/003 or supabase/migrations/.
-- Production settle (003) has no hook and must not call this function.

BEGIN;

CREATE OR REPLACE FUNCTION private.streamlink_after_materialize_hook()
RETURNS void
LANGUAGE plpgsql
SET search_path TO pg_catalog
AS $$
BEGIN
  IF current_setting('starlight.wire_test_fail', true) = 'after-materialize' THEN
    RAISE EXCEPTION 'injected-after-materialize';
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION private.streamlink_test_after_catch_inject()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO pg_catalog
AS $$
BEGIN
  PERFORM private.streamlink_after_materialize_hook();
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS streamlink_test_after_catch_inject ON public.catches;
CREATE TRIGGER streamlink_test_after_catch_inject
  AFTER INSERT ON public.catches
  FOR EACH ROW
  EXECUTE FUNCTION private.streamlink_test_after_catch_inject();

COMMENT ON FUNCTION private.streamlink_after_materialize_hook() IS
  'LOCAL HARNESS ONLY. Raises when starlight.wire_test_fail=after-materialize.';

COMMIT;
