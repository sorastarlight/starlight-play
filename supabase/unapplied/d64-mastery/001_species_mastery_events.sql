-- D64 Species Mastery event ledger. BRANCH DRAFT. DO NOT APPLY to hosted Supabase.
-- Additive only. Does not alter species_mastery, mastery_ledger, catches, capture odds,
-- settlement, inventories, or Rankings. Does not backfill. Does not hook settlement.
-- A play: prefix alone is not eligibility. The guard also requires a successful
-- capture_log row, a live round, and a source key of play:<round uuid>:<trainer uuid>.

CREATE TABLE public.species_mastery_events (
  catch_id uuid PRIMARY KEY,
  trainer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dex integer NOT NULL CHECK (dex >= 1 AND dex <= 1025),
  round_id uuid NOT NULL,
  source_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT species_mastery_events_round_trainer_key UNIQUE (round_id, trainer_id),
  CONSTRAINT species_mastery_events_source_key_key UNIQUE (source_key)
);

COMMENT ON TABLE public.species_mastery_events IS
  'Cosmetic eligible play catches. One row per specimen. Not the points mastery ladder.';

-- catch_id is not a foreign key. Oak QA hard-deletes catch rows, and a restrictive
-- key would block that delete. A cascading key would erase retained mastery.
-- Release sets transferred_at and leaves the catch row in place.
-- The guard below rejects an event that does not match the specimen at insert time.

CREATE INDEX species_mastery_events_trainer_dex_idx
  ON public.species_mastery_events (trainer_id, dex);

CREATE FUNCTION private.species_mastery_events_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, private
AS $fn$
DECLARE
  specimen public.catches%ROWTYPE;
  logged boolean;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'mastery events are immutable' USING ERRCODE = '55000';
  END IF;

  SELECT * INTO specimen FROM public.catches WHERE id = NEW.catch_id;
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

  SELECT success IS TRUE INTO logged
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

CREATE TRIGGER species_mastery_events_guard
  BEFORE INSERT OR UPDATE ON public.species_mastery_events
  FOR EACH ROW EXECUTE FUNCTION private.species_mastery_events_guard();

CREATE FUNCTION private.record_species_mastery_event(p_catch_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, private
AS $fn$
DECLARE
  specimen public.catches%ROWTYPE;
BEGIN
  IF p_catch_id IS NULL THEN
    RAISE EXCEPTION 'mastery event rejected: missing specimen' USING ERRCODE = '23514';
  END IF;
  SELECT * INTO specimen FROM public.catches WHERE id = p_catch_id FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'mastery event rejected: specimen is not on file' USING ERRCODE = '23514';
  END IF;
  INSERT INTO public.species_mastery_events (catch_id, trainer_id, dex, round_id, source_key)
  VALUES (specimen.id, specimen.user_id, specimen.dex, specimen.round_id, specimen.source_key);
  RETURN specimen.id;
EXCEPTION
  WHEN unique_violation THEN
    IF EXISTS (
      SELECT 1 FROM public.species_mastery_events WHERE catch_id = p_catch_id
    ) THEN
      RETURN p_catch_id;
    END IF;
    RAISE;
END;
$fn$;

COMMENT ON FUNCTION private.record_species_mastery_event(uuid) IS
  'Server-only insert of one cosmetic mastery event. Not called by settlement in D64. Do not loop historical catches.';

REVOKE ALL ON FUNCTION private.species_mastery_events_guard() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.record_species_mastery_event(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.record_species_mastery_event(uuid) FROM anon, authenticated;

ALTER TABLE public.species_mastery_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.species_mastery_events FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS species_mastery_events_own ON public.species_mastery_events;
CREATE POLICY species_mastery_events_own
  ON public.species_mastery_events
  FOR SELECT
  USING (trainer_id = (SELECT auth.uid()));

REVOKE ALL ON TABLE public.species_mastery_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.species_mastery_events TO authenticated;

CREATE VIEW public.species_mastery_progress
WITH (security_invoker = true) AS
SELECT
  trainer_id,
  dex,
  count(*)::integer AS eligible_captures,
  CASE
    WHEN count(*) >= 20 THEN 5
    WHEN count(*) >= 12 THEN 4
    WHEN count(*) >= 6 THEN 3
    WHEN count(*) >= 3 THEN 2
    WHEN count(*) >= 1 THEN 1
    ELSE 0
  END AS tier_level,
  CASE
    WHEN count(*) >= 20 THEN 'Expert'
    WHEN count(*) >= 12 THEN 'Specialist'
    WHEN count(*) >= 6 THEN 'Experienced'
    WHEN count(*) >= 3 THEN 'Acquainted'
    WHEN count(*) >= 1 THEN 'Familiar'
    ELSE 'Unmastered'
  END AS tier_name
FROM public.species_mastery_events
GROUP BY trainer_id, dex;

COMMENT ON VIEW public.species_mastery_progress IS
  'Read-only cosmetic tiers. Does not read or write species_mastery.points and is not a Rankings source.';

REVOKE ALL ON TABLE public.species_mastery_progress FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.species_mastery_progress TO authenticated;
