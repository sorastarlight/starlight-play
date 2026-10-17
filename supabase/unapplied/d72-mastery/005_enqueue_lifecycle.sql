-- D72 Species Familiarity enqueue lifecycle. UNAPPLIED DRAFT. DO NOT APPLY.
-- DO NOT RUN against live Supabase or project dtflmlbjhttoewqgkujf.
-- Not a migration. Must never be copied into supabase/migrations/.
-- Runs after the installed D64-D67 files. Does not activate recording.
-- New outbox rows are admitted only while lifecycle is active or paused.
-- Inactive, draining, and closed reject new work. Updates of queued rows stay allowed.
-- The activation cutoff is not moved.

BEGIN;

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
  PERFORM 1 FROM public.catches WHERE id = p_catch_id FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'mastery outbox rejected: specimen is not on file' USING ERRCODE = '23514';
  END IF;
  SELECT a.lifecycle INTO lifecycle
  FROM private.species_mastery_activation AS a
  WHERE a.singleton
  FOR SHARE;
  IF lifecycle IS DISTINCT FROM 'active' AND lifecycle IS DISTINCT FROM 'paused' THEN
    RAISE EXCEPTION 'mastery outbox rejected: recording is not open' USING ERRCODE = '23514';
  END IF;
  INSERT INTO private.species_mastery_outbox (catch_id)
  VALUES (p_catch_id)
  ON CONFLICT (catch_id) DO NOTHING;
  RETURN p_catch_id;
END;
$fn$;

COMMENT ON FUNCTION private.enqueue_species_mastery_event(uuid) IS
  'Queues one catch while recording is active or paused. Locks the activation row before insert. Does not move the cutoff.';

CREATE OR REPLACE FUNCTION private.species_mastery_outbox_admit()
RETURNS trigger
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
  IF lifecycle IS DISTINCT FROM 'active' AND lifecycle IS DISTINCT FROM 'paused' THEN
    RAISE EXCEPTION 'mastery outbox rejected: recording is not open' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS species_mastery_outbox_admit ON private.species_mastery_outbox;
CREATE TRIGGER species_mastery_outbox_admit
  BEFORE INSERT ON private.species_mastery_outbox
  FOR EACH ROW EXECUTE FUNCTION private.species_mastery_outbox_admit();

REVOKE ALL ON FUNCTION private.enqueue_species_mastery_event(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.species_mastery_outbox_admit() FROM PUBLIC, anon, authenticated;

COMMIT;
