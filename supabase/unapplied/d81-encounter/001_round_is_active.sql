-- D81 public launch-guard correction. UNAPPLIED DRAFT. DO NOT APPLY.
-- DO NOT RUN against live Supabase or project dtflmlbjhttoewqgkujf.
-- Not a migration. Must never be copied into supabase/migrations/.
-- Replaces only private.round_is_active(encounter_rounds).
-- Keeps language sql, volatility stable, security invoker, owner, grants, and search_path.
-- CREATE OR REPLACE does not call the function and does not open a round.

BEGIN;

CREATE OR REPLACE FUNCTION private.round_is_active(r public.encounter_rounds)
RETURNS boolean
LANGUAGE sql
STABLE
AS $fn$
  select r.id is not null
     and not r.cancelled
     and private.round_phase(r) <> 'closed';
$fn$;

COMMIT;
