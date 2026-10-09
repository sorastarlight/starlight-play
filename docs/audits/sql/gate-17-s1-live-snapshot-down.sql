-- REVIEW ARTIFACT ONLY. DO NOT APPLY WITHOUT OWNER APPROVAL.
-- Gate 1.7 S1 rollback: drop public.admin_live_snapshot().
--
-- Safe while the preview still uses the UNAVAILABLE fallback and does not
-- call this RPC. If a later frontend gate adds it to READ_RPCS, roll the
-- frontend back first (or keep the UNAVAILABLE fallback on missing RPC).
--
-- Does not touch:
--   admin_live_dashboard, admin_overview, apply_stream_status,
--   director helpers, encounter rows, grants on other functions,
--   stream_status, stream_director, staff_roles.
--
-- Gameplay data is not modified. Legacy Live Operations stays intact.
-- No extra tables or types are created by the up migration, so none remain.

drop function if exists public.admin_live_snapshot();
