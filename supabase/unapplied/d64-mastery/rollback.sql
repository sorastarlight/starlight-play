-- Disposable rollback for the D64 draft. Drops only the new event objects.
-- Does not update catches, species_mastery, mastery_ledger, or Rankings.

DROP VIEW IF EXISTS public.species_mastery_progress;
DROP FUNCTION IF EXISTS private.record_species_mastery_event(uuid);
DROP TRIGGER IF EXISTS species_mastery_events_guard ON public.species_mastery_events;
DROP FUNCTION IF EXISTS private.species_mastery_events_guard();
DROP TABLE IF EXISTS public.species_mastery_events;
