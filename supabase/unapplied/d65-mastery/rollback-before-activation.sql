-- D65 rollback for an inactive, empty draft.
-- Refuses once activation has been set or any cosmetic event exists.
-- Does not update catches, species_mastery, mastery_ledger, or Rankings.

DO $do$
BEGIN
  IF to_regclass('private.species_mastery_activation') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM private.species_mastery_activation WHERE activated_at IS NOT NULL
     ) THEN
    RAISE EXCEPTION 'refusing rollback: mastery recording was activated; disable it instead'
      USING ERRCODE = '55000';
  END IF;
  IF to_regclass('public.species_mastery_events') IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.species_mastery_events) THEN
    RAISE EXCEPTION 'refusing rollback: mastery events exist'
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
