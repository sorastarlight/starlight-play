-- D81 rollback for private.round_is_active. UNAPPLIED. DO NOT APPLY.
-- DO NOT RUN against live Supabase or project dtflmlbjhttoewqgkujf.
-- Not a migration. Must never be copied into supabase/migrations/.
-- Restores the hosted body whose prosrc md5 is 5732cc462502e346843eedb76fada494.
-- Restoring this body brings back the composite IS NOT NULL defect.
-- Do not roll back while a round is open unless a second launch is acceptable.

BEGIN;

CREATE OR REPLACE FUNCTION private.round_is_active(r public.encounter_rounds)
RETURNS boolean
LANGUAGE sql
STABLE
AS $fn$
  select r is not null and not r.cancelled and private.round_phase(r) <> 'closed';
$fn$;

COMMIT;
