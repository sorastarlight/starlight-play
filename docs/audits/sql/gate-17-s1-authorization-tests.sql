-- REVIEW ARTIFACT ONLY. DO NOT RUN ON PRODUCTION.
-- Gate 1.7 S1 authorization / read-only checks for admin_live_snapshot.
-- Intended for a clone, local stack, or idle QA database after an approved apply.
--
-- Do not invoke admin_live_dashboard, admin_overview, or other tick/settle RPCs.
-- Do not mutate Sora, Twinkle, or player accounts.
-- Wrap in a transaction and ROLLBACK. Snapshot is SELECT-only; rollback still
-- proves the session made no intentional writes.

-- A. Default EXECUTE
-- expect: false, false
-- select has_function_privilege('anon', 'public.admin_live_snapshot()', 'EXECUTE');
-- select has_function_privilege('public', 'public.admin_live_snapshot()', 'EXECUTE');
-- expect: true, false
-- select has_function_privilege('authenticated', 'public.admin_live_snapshot()', 'EXECUTE');
-- select has_function_privilege('service_role', 'public.admin_live_snapshot()', 'EXECUTE');

-- B. Function body must not tick or settle
-- expect: zero rows
-- select 1
--   from pg_proc p
--   join pg_namespace n on n.oid = p.pronamespace
--  where n.nspname = 'public'
--    and p.proname = 'admin_live_snapshot'
--    and p.prosrc ~* '(director_tick|director_tick_if_due|director_dashboard|settle_due_rounds|admin_overview|admin_live_dashboard|admin_director_command|admin_start_round|apply_stream_status)';

-- C. Anonymous — role switch, expect 42501, no snapshot fields
-- begin;
--   set local role anon;
--   select public.admin_live_snapshot();
-- rollback;

-- D. Authenticated nonstaff — set request.jwt.claim.sub to a viewer UUID
--    that is not in staff_roles and is not the broadcaster.
-- begin;
--   set local role authenticated;
--   select set_config('request.jwt.claim.sub', '<nonstaff-uuid>', true);
--   select set_config('request.jwt.claim.role', 'authenticated', true);
--   select public.admin_live_snapshot();
-- rollback;

-- E. Authorized staff — PlayTester / dedicated QA staff UUID only.
-- begin;
--   set local role authenticated;
--   select set_config('request.jwt.claim.sub', '<qa-staff-uuid>', true);
--   select set_config('request.jwt.claim.role', 'authenticated', true);
--   select public.admin_live_snapshot();
-- rollback;
-- Capture encounter_rounds.updated_at / stream_director.updated_at /
-- stream_status.updated_at before and after. They must be unchanged.

-- F. Repeated reads
-- Call E three times in one transaction. asOf may move; sessionId, encounter
-- id, rpgSession.active, twitch.state must stay coherent with the same rows.
-- updated_at columns must still be unchanged.

-- G. Missing rows (clone only)
-- Temporarily hide stream_director id=1 inside a transaction that rolls back.
-- Expect rpgSession.state = UNKNOWN and active JSON null, not INACTIVE.
