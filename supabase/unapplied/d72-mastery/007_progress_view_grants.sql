-- D72 Species Familiarity progress-view privileges. UNAPPLIED DRAFT. DO NOT APPLY.
-- DO NOT RUN against live Supabase or project dtflmlbjhttoewqgkujf.
-- Not a migration. Must never be copied into supabase/migrations/.
-- Removes non-SELECT grants that Supabase default privileges left on
-- public.species_mastery_progress for authenticated.
-- Keeps SELECT. Does not change security_invoker, RLS, points, or Rankings.

BEGIN;

REVOKE ALL ON TABLE public.species_mastery_progress FROM authenticated;
GRANT SELECT ON TABLE public.species_mastery_progress TO authenticated;

COMMIT;
