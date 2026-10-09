-- REVIEW ARTIFACT ONLY. DO NOT APPLY WITHOUT OWNER APPROVAL.
-- Gate 1.7 S1: public.admin_live_snapshot() — SELECT-only Live Operations status.
--
-- This is not a replacement for public.admin_live_dashboard().
-- Do not call director helpers, settlement, or stream lifecycle writers.
-- Do not bundle R1 / R2 / R4 / R12 / R18.
--
-- After an approved apply, verify:
--   1) pg_proc.prosrc has no director_tick / settle_due_rounds / apply_stream_status
--   2) has_function_privilege('anon', 'public.admin_live_snapshot()', 'EXECUTE') is false
--   3) has_function_privilege('public', 'public.admin_live_snapshot()', 'EXECUTE') is false
--   4) admin-next.js allowlist may add this name only in a later frontend gate
--
-- Rollback: docs/audits/sql/gate-17-s1-live-snapshot-down.sql

create or replace function public.admin_live_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  s public.stream_status;
  d private.stream_director;
  r public.encounter_rounds;
  director_found boolean := false;
  twitch_known boolean := false;
  twitch_state text;
  rpg_state text;
  as_of timestamptz := now();
  awaiting boolean := false;
  in_progress boolean := false;
  director_freshness text;
begin
  if not private.is_play_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select * into s from public.stream_status where id = 1;
  twitch_known := s.checked_at is not null and s.checked_at > as_of - interval '15 minutes';
  if s.id is null then
    twitch_state := 'UNKNOWN';
  elsif not twitch_known and s.checked_at is not null then
    twitch_state := 'STALE';
  elsif not twitch_known then
    twitch_state := 'UNKNOWN';
  elsif coalesce(s.is_live, false) then
    twitch_state := 'LIVE';
  else
    twitch_state := 'OFFLINE';
  end if;

  select * into d from private.stream_director where id = 1;
  director_found := found;
  if not director_found then
    rpg_state := 'UNKNOWN';
    director_freshness := 'UNKNOWN';
  else
    if d.rpg_session_active then
      rpg_state := 'ACTIVE';
    else
      rpg_state := 'INACTIVE';
    end if;
    if d.last_tick_at is null then
      director_freshness := 'UNKNOWN';
    elsif d.last_tick_at > as_of - interval '2 minutes' then
      director_freshness := 'FRESH';
    else
      director_freshness := 'STALE';
    end if;
  end if;

  if director_found and d.last_encounter_id is not null then
    select * into r
      from public.encounter_rounds er
     where er.id = d.last_encounter_id
       and coalesce(er.source, '') is distinct from 'test';
  end if;
  if r.id is null then
    select * into r
      from public.encounter_rounds er
     where coalesce(er.source, '') is distinct from 'test'
     order by er.started_at desc nulls last
     limit 1;
  end if;

  if r.id is not null then
    in_progress := coalesce(r.cancelled, false) = false
               and coalesce(r.resolved, false) = false;
    awaiting := in_progress
            and r.paused_at is null
            and r.deadlines is not null
            and coalesce(r.started_at, r.updated_at) > as_of - interval '2 hours'
            and as_of >= coalesce(
              (r.deadlines->>'throw')::timestamptz,
              (r.deadlines->>'reveal')::timestamptz,
              '-infinity'::timestamptz
            );
  end if;

  return jsonb_build_object(
    'ok', true,
    'observation', true,
    'asOf', as_of,
    'twitch', jsonb_build_object(
      'state', twitch_state,
      'live', case twitch_state
        when 'LIVE' then true
        when 'OFFLINE' then false
        else null
      end,
      'known', twitch_known,
      'stale', twitch_state = 'STALE',
      'checkedAt', s.checked_at,
      'source', s.source,
      'title', s.title
    ),
    'rpgSession', jsonb_build_object(
      'state', rpg_state,
      'active', case
        when not director_found then null
        else d.rpg_session_active
      end,
      'sessionId', d.session_id,
      'startedAt', d.session_started_at,
      'directorRowPresent', director_found
    ),
    'director', jsonb_build_object(
      'status', d.status,
      'lastTickAt', d.last_tick_at,
      'updatedAt', d.updated_at,
      'freshness', director_freshness
    ),
    'encounter', case
      when r.id is null then jsonb_build_object(
        'present', false,
        'inProgress', false,
        'awaitingSettlement', false,
        'id', null,
        'phase', null,
        'name', null,
        'dex', null,
        'variant', null,
        'cancelled', null,
        'resolved', null,
        'startedAt', null,
        'endsAt', null,
        'lastAction', null,
        'paused', false,
        'source', null
      )
      else jsonb_build_object(
        'present', true,
        'inProgress', in_progress,
        'awaitingSettlement', awaiting,
        'id', r.id,
        'phase', r.phase,
        'name', r.name,
        'dex', r.dex,
        'variant', r.variant,
        'cancelled', coalesce(r.cancelled, false),
        'resolved', coalesce(r.resolved, false),
        'startedAt', r.started_at,
        'endsAt', r.ends_at,
        'lastAction', r.last_action,
        'paused', r.paused_at is not null,
        'source', r.source
      )
    end
  );
end;
$$;

revoke all on function public.admin_live_snapshot() from public;
revoke all on function public.admin_live_snapshot() from anon;
grant execute on function public.admin_live_snapshot() to authenticated;
grant execute on function public.admin_live_snapshot() to service_role;
