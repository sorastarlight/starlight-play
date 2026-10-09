-- REVIEW ARTIFACT ONLY. DO NOT APPLY WITHOUT OWNER APPROVAL.
-- Gate 1.7 S1 v2: public.admin_live_snapshot() — SELECT-only Live Operations status.
--
-- This is not a replacement for public.admin_live_dashboard().
-- Do not call director helpers, settlement, or stream lifecycle writers.
-- Do not bundle R1 / R2 / R4 / R12 / R18.
--
-- v2 corrections:
--   * Current encounter is only stream_director.last_encounter_id when that
--     row is still open. No latest-by-started_at fallback.
--   * encounter_rounds has no session_id; do not invent a session join.
--   * awaiting settlement is UNAVAILABLE (JSON null), not a guessed boolean.
--   * last_tick_at is a recorded director field, not snapshot freshness.
--   * asOf is the observation timestamp.
--   * search_path is pg_catalog; relations are schema-qualified.
--   * Preflight refuses a different existing contract.
--   * No service_role EXECUTE grant.
--
-- Rollback: docs/audits/sql/gate-17-s1-live-snapshot-down.sql

do $preflight$
declare
  rec record;
begin
  select
    pg_catalog.pg_get_function_identity_arguments(p.oid) as args,
    p.provolatile,
    p.prosecdef,
    pg_catalog.pg_get_userbyid(p.proowner) as owner,
    p.prosrc
    into rec
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname = 'admin_live_snapshot';

  if rec.prosrc is not null then
    if rec.args is distinct from ''
       or rec.provolatile is distinct from 's'
       or rec.prosecdef is not true
       or rec.owner is distinct from 'postgres'
       or rec.prosrc not like '%gate-17-s1-v2%' then
      raise exception 'preflight: public.admin_live_snapshot() already exists with a different contract. Inspect live SQL before replacing.';
    end if;
  end if;
end;
$preflight$;

create or replace function public.admin_live_snapshot()
returns pg_catalog.jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
declare
  s public.stream_status;
  d private.stream_director;
  sess private.stream_sessions;
  r public.encounter_rounds;
  director_found boolean := false;
  session_found boolean := false;
  twitch_known boolean := false;
  twitch_state text;
  rpg_state text;
  as_of timestamptz := pg_catalog.now();
  current_open boolean := false;
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
  elsif d.rpg_session_active then
    rpg_state := 'ACTIVE';
  else
    rpg_state := 'INACTIVE';
  end if;

  if director_found and d.session_id is not null then
    select * into sess from private.stream_sessions where id = d.session_id;
    session_found := found;
  end if;

  -- Authoritative current pointer is last_encounter_id only.
  -- encounter_rounds has no session_id. Do not select the latest historical row.
  if director_found and d.last_encounter_id is not null then
    select * into r from public.encounter_rounds er where er.id = d.last_encounter_id;
  end if;
  if r.id is not null then
    current_open := coalesce(r.cancelled, false) = false
                and coalesce(r.resolved, false) = false
                and coalesce(r.phase, '') is distinct from 'closed';
  end if;

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'observation', true,
    'contract', 'gate-17-s1-v2',
    'asOf', as_of,
    'twitch', pg_catalog.jsonb_build_object(
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
    'rpgSession', pg_catalog.jsonb_build_object(
      'state', rpg_state,
      'active', case
        when not director_found then null
        else d.rpg_session_active
      end,
      'sessionId', d.session_id,
      'startedAt', d.session_started_at,
      'directorRowPresent', director_found,
      'sessionRowPresent', session_found,
      'sessionEndedAt', sess.ended_at
    ),
    'director', pg_catalog.jsonb_build_object(
      'status', d.status,
      'lastTickAt', d.last_tick_at,
      'updatedAt', d.updated_at
    ),
    'currentEncounter', case
      when current_open then pg_catalog.jsonb_build_object(
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
      else null
    end,
    'lastEncounter', case
      when r.id is null then null
      else pg_catalog.jsonb_build_object(
        'id', r.id,
        'phase', r.phase,
        'name', r.name,
        'dex', r.dex,
        'variant', r.variant,
        'cancelled', coalesce(r.cancelled, false),
        'resolved', coalesce(r.resolved, false),
        'inProgress', current_open,
        'startedAt', r.started_at,
        'endsAt', r.ends_at,
        'lastAction', r.last_action,
        'paused', r.paused_at is not null,
        'source', r.source
      )
    end,
    'settlement', pg_catalog.jsonb_build_object(
      'awaiting', null,
      'state', 'UNAVAILABLE'
    )
  );
end;
$$;

alter function public.admin_live_snapshot() owner to postgres;

revoke all on function public.admin_live_snapshot() from public;
revoke all on function public.admin_live_snapshot() from anon;
revoke all on function public.admin_live_snapshot() from service_role;
grant execute on function public.admin_live_snapshot() to authenticated;
