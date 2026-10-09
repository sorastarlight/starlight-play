-- REVIEW ARTIFACT ONLY. DO NOT APPLY WITHOUT OWNER APPROVAL.
-- Gate 1.7 S1 v2 rollback: drop public.admin_live_snapshot().
--
-- Preflight creates no objects. Dropping the function removes its EXECUTE
-- grants. Legacy Live Operations, director SQL, and gameplay rows are untouched.
--
-- Safe while the preview still uses the UNAVAILABLE fallback and does not
-- call this RPC. If a later frontend gate adds it to READ_RPCS, roll that
-- frontend back first (or keep the UNAVAILABLE fallback on missing RPC).

drop function if exists public.admin_live_snapshot();
