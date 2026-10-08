-- REVIEW ARTIFACT ONLY. DO NOT APPLY.
-- Gate 1.5 / R1: move settlement behind require_hub on public.admin_overview.
-- Live today (verified): settle_due_rounds() runs BEFORE private.admin_overview()'s require_hub.
-- EXECUTE currently includes anon. Pair with gate-15-review-revoke-anon.sql.
--
-- Current grants (LIVE): anon, authenticated, postgres, service_role
-- Desired grants: authenticated, postgres, service_role
-- Callers: play-site/js/admin.js loadHub; play-site/js/admin-tools.js standalone boot
-- Not called by admin-next.js
-- Player play_sync / play_state already call director_tick_if_due → settle_due_rounds
--
-- Expected failure after apply: unauthenticated PostgREST rpc admin_overview → 42501, no settle.
-- Rollback: restore the previous public.admin_overview body (settle first).

create or replace function public.admin_overview()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Guard first. Settlement is staff-only and no longer reachable with the anon key.
  perform private.require_hub();
  perform private.settle_due_rounds();
  return coalesce(private.admin_overview(), '{}'::jsonb)
    || jsonb_build_object('console', private.play_console_json(250));
end;
$$;

revoke all on function public.admin_overview() from public, anon;
grant execute on function public.admin_overview() to authenticated;

-- Verification (run after an approved apply — not now):
-- select has_function_privilege('anon', 'public.admin_overview()', 'EXECUTE'); -- expect false
-- select has_function_privilege('authenticated', 'public.admin_overview()', 'EXECUTE'); -- expect true
-- Confirm live body starts with require_hub by inspecting pg_proc.prosrc.
