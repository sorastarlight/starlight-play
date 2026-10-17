-- D65 destructive rollback. Drops the cosmetic ledger, including earned events.
-- Refuses unless this session sets:
--   SET starlight.confirm_mastery_destructive_rollback = 'BACKUP_VERIFIED';
-- Does not update catches, species_mastery, mastery_ledger, or Rankings.
-- Not the routine recovery path after activation. Use disable_species_mastery_recording.

DO $do$
BEGIN
  IF current_setting('starlight.confirm_mastery_destructive_rollback', true)
     IS DISTINCT FROM 'BACKUP_VERIFIED' THEN
    RAISE EXCEPTION 'destructive mastery rollback refused: backup confirmation is missing'
      USING ERRCODE = '55000';
  END IF;
END
$do$;

DROP TRIGGER IF EXISTS species_mastery_caught_at_freeze ON public.catches;
DROP FUNCTION IF EXISTS private.species_mastery_caught_at_freeze();
DROP FUNCTION IF EXISTS private.deliver_species_mastery_outbox(integer);
DROP FUNCTION IF EXISTS private.reconcile_species_mastery_outbox(integer);
DROP FUNCTION IF EXISTS private.note_species_mastery_catch(uuid);
DROP FUNCTION IF EXISTS private.enqueue_species_mastery_event(uuid);
DROP FUNCTION IF EXISTS private.disable_species_mastery_recording();
DROP FUNCTION IF EXISTS private.activate_species_mastery_events();
DROP TABLE IF EXISTS private.species_mastery_outbox;
DROP TRIGGER IF EXISTS species_mastery_activation_guard ON private.species_mastery_activation;
DROP FUNCTION IF EXISTS private.species_mastery_activation_guard();
DROP TABLE IF EXISTS private.species_mastery_activation;
DROP VIEW IF EXISTS public.species_mastery_progress;
DROP FUNCTION IF EXISTS private.record_species_mastery_event(uuid);
DROP TRIGGER IF EXISTS species_mastery_events_guard ON public.species_mastery_events;
DROP FUNCTION IF EXISTS private.species_mastery_events_guard();
DROP TABLE IF EXISTS public.species_mastery_events;
