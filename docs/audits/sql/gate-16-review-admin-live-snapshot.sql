-- REVIEW ARTIFACT ONLY. DO NOT APPLY.
-- Gate 1.6: optional SELECT-only Live RPG snapshot for the preview.
-- Frontend isolation shipped without this function. Preview shows UNAVAILABLE
-- until an owner-approved apply of a true-read snapshot.
--
-- Requirements:
--   * is_play_admin / require_hub FIRST
--   * no director_tick, director_tick_if_due, settle_due_rounds, director_start_now
--   * no stream_status writes, no session begin/end
--   * GRANT authenticated only
--   * do not return secrets or per-trainer dossiers
--
-- Rollback: drop public.admin_live_snapshot(); preview already works without it.

create or replace function public.admin_live_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  live boolean;
  known boolean;
  title text;
  rpg boolean;
  session_started timestamptz;
  director_status text;
  enc jsonb;
begin
  if not private.is_play_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select
    s.is_live,
    s.checked_at is not null,
    s.title
    into live, known, title
    from public.stream_status s
   where s.id = 1;

  select
    d.rpg_session_active,
    d.session_started_at,
    d.status
    into rpg, session_started, director_status
    from private.stream_director d
   where d.id = 1;

  -- Do not call director_active_round / sync_latest_round / public_round_json
  -- until those helpers are proven SELECT-only. Read the latest non-test row.
  select jsonb_build_object(
    'id', r.id,
    'dex', r.dex,
    'name', r.name,
    'phase', r.phase,
    'variant', r.variant,
    'cancelled', r.cancelled,
    'resolved', r.resolved,
    'startedAt', r.started_at
  )
    into enc
    from public.encounter_rounds r
   where coalesce(r.source, '') is distinct from 'test'
   order by r.started_at desc nulls last
   limit 1;

  return jsonb_build_object(
    'ok', true,
    'observation', true,
    'twitch', jsonb_build_object(
      'live', live,
      'known', coalesce(known, false),
      'title', title
    ),
    'rpgSession', jsonb_build_object(
      'active', coalesce(rpg, false),
      'startedAt', session_started
    ),
    'directorStatus', director_status,
    'activeEncounter', enc
  );
end;
$$;

revoke all on function public.admin_live_snapshot() from public, anon;
grant execute on function public.admin_live_snapshot() to authenticated;

-- Verification after an approved apply (not now):
-- 1) pg_proc.prosrc must not contain settle_due_rounds or director_tick
-- 2) has_function_privilege('anon', 'public.admin_live_snapshot()', 'EXECUTE') is false
-- 3) preview allowlist may add ONLY this name after a second frontend gate
-- 4) do not replace admin_live_dashboard used by admin-live.js
