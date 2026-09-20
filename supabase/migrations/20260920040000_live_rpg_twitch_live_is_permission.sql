-- Twitch LIVE is permission, not Live RPG session authority.
--
-- rc37 stopped director_tick from auto-restarting after a manual End while
-- still live, and ended the RPG when Twitch went offline. It still auto-started
-- the Live RPG on every offline→live edge, which activates the Pokémon RPG
-- during ordinary (non-RPG) Twitch streams.
--
-- Preferred asymmetric model:
--   Twitch LIVE  → permits RPG (does NOT start it)
--   Twitch OFFLINE → ends RPG if active
--   Explicit admin Start → begins RPG
--   Explicit admin End → stops RPG while Twitch may remain LIVE

create or replace function private.apply_stream_status(p_event jsonb)
returns jsonb
language plpgsql
as $function$
declare
  ev jsonb := coalesce(p_event, '{}'::jsonb);
  err text := nullif(btrim(coalesce(ev->>'error', '')), '');
  prev_live boolean := false;
  next_live boolean := false;
  state jsonb;
begin
  select coalesce(is_live, false) into prev_live from public.stream_status where id = 1;

  -- Errors / unknown Helix responses update diagnostics only.
  -- They must NOT invent a LIVE or OFFLINE edge, and must NOT start/end RPG.
  if err is not null then
    update public.stream_status
      set last_error = err,
          source = coalesce(nullif(ev->>'source', ''), source),
          eventsub_online = case when ev ? 'eventsub_online' then coalesce((ev->>'eventsub_online')::boolean, eventsub_online) else eventsub_online end,
          eventsub_offline = case when ev ? 'eventsub_offline' then coalesce((ev->>'eventsub_offline')::boolean, eventsub_offline) else eventsub_offline end,
          updated_at = now()
      where id = 1;
    return private.stream_live_state() || jsonb_build_object('ok', false, 'message', err);
  end if;

  next_live := coalesce((ev->>'is_live')::boolean, false);

  update public.stream_status
    set is_live = next_live,
        title = ev->>'title',
        viewer_count = nullif(ev->>'viewer_count', '')::int,
        started_at = nullif(ev->>'started_at', '')::timestamptz,
        source = coalesce(nullif(ev->>'source', ''), 'helix'),
        checked_at = now(),
        last_error = null,
        eventsub_online = case when ev ? 'eventsub_online' then coalesce((ev->>'eventsub_online')::boolean, eventsub_online) else eventsub_online end,
        eventsub_offline = case when ev ? 'eventsub_offline' then coalesce((ev->>'eventsub_offline')::boolean, eventsub_offline) else eventsub_offline end,
        updated_at = now()
    where id = 1;

  -- LIVE is permission only. Do NOT begin an RPG session on offline→live.
  -- Confirmed offline still ends an active RPG session server-side.
  if prev_live and not next_live then
    perform private.director_end_rpg_session('STREAM_OFFLINE');
  end if;

  begin
    perform private.director_tick();
  exception when others then
    null;
  end;

  state := private.stream_live_state();
  return state || jsonb_build_object('ok', true);
end;
$function$;

-- Permanent invariant check (safe: restores prior stream_status + director flags).
do $proof$
declare
  prev_status public.stream_status;
  prev_dir private.stream_director;
  d private.stream_director;
  tick jsonb;
begin
  select * into prev_status from public.stream_status where id = 1;
  select * into prev_dir from private.stream_director where id = 1;

  -- Ensure idle baseline for the proof.
  update private.stream_director
     set rpg_session_active = false,
         session_id = null,
         next_encounter_at = null,
         queued = null,
         status = 'OFFLINE',
         delay_reason = 'OFFLINE',
         updated_at = now()
   where id = 1;
  update public.stream_status
     set is_live = false,
         checked_at = now(),
         last_error = null,
         updated_at = now()
   where id = 1;

  -- CASE 2 / 8: offline → live must NOT start RPG.
  perform private.apply_stream_status(jsonb_build_object(
    'is_live', true,
    'source', 'lifecycle_proof',
    'title', 'permission-only proof'
  ));
  select * into d from private.stream_director where id = 1;
  if d.rpg_session_active then
    raise exception 'lifecycle proof failed: Twitch LIVE auto-started RPG session';
  end if;

  -- CASE 12: Director Auto ON + RPG IDLE => tick stays SESSION_IDLE, no spawn.
  update private.stream_director
     set auto_enabled = true,
         manual_hold = false,
         updated_at = now()
   where id = 1;
  tick := private.director_tick();
  if coalesce(tick->>'reason', '') is distinct from 'SESSION_IDLE' then
    raise exception 'lifecycle proof failed: expected SESSION_IDLE, got %', tick;
  end if;
  select * into d from private.stream_director where id = 1;
  if d.rpg_session_active then
    raise exception 'lifecycle proof failed: director_tick recreated RPG session';
  end if;

  -- CASE 3: explicit start while live.
  if not private.director_begin_rpg_session('ADMIN_START') then
    raise exception 'lifecycle proof failed: explicit start did not begin session';
  end if;
  select * into d from private.stream_director where id = 1;
  if not d.rpg_session_active then
    raise exception 'lifecycle proof failed: RPG not active after explicit start';
  end if;

  -- CASE 4: explicit end while still live — tick must not resurrect.
  perform private.director_end_rpg_session('ADMIN');
  update public.stream_status set is_live = true, checked_at = now(), updated_at = now() where id = 1;
  tick := private.director_tick();
  tick := private.director_tick();
  select * into d from private.stream_director where id = 1;
  if d.rpg_session_active then
    raise exception 'lifecycle proof failed: tick resurrected session after manual end';
  end if;
  if coalesce(tick->>'reason', '') is distinct from 'SESSION_IDLE' then
    raise exception 'lifecycle proof failed: post-end reason %, expected SESSION_IDLE', tick;
  end if;

  -- CASE 9: duplicate LIVE event while already live — still idle.
  perform private.apply_stream_status(jsonb_build_object('is_live', true, 'source', 'lifecycle_proof_dup'));
  select * into d from private.stream_director where id = 1;
  if d.rpg_session_active then
    raise exception 'lifecycle proof failed: duplicate LIVE started RPG';
  end if;

  -- CASE 10: UNKNOWN / error must not start or end via edge invention.
  perform private.apply_stream_status(jsonb_build_object('error', 'helix unavailable', 'source', 'lifecycle_proof_err'));
  select * into d from private.stream_director where id = 1;
  if d.rpg_session_active then
    raise exception 'lifecycle proof failed: error payload started RPG';
  end if;

  -- Restore prior rows (do not leave proof residue).
  update public.stream_status
     set is_live = prev_status.is_live,
         title = prev_status.title,
         viewer_count = prev_status.viewer_count,
         started_at = prev_status.started_at,
         source = prev_status.source,
         checked_at = prev_status.checked_at,
         last_error = prev_status.last_error,
         eventsub_online = prev_status.eventsub_online,
         eventsub_offline = prev_status.eventsub_offline,
         updated_at = now()
   where id = 1;

  update private.stream_director
     set rpg_session_active = prev_dir.rpg_session_active,
         session_id = prev_dir.session_id,
         session_started_at = prev_dir.session_started_at,
         auto_enabled = prev_dir.auto_enabled,
         manual_hold = prev_dir.manual_hold,
         hold_until = prev_dir.hold_until,
         hold_reason = prev_dir.hold_reason,
         next_encounter_at = prev_dir.next_encounter_at,
         queued = prev_dir.queued,
         overdue_from = prev_dir.overdue_from,
         status = prev_dir.status,
         delay_reason = prev_dir.delay_reason,
         stream_mode = prev_dir.stream_mode,
         updated_at = now()
   where id = 1;

  -- Reconcile tick against restored Twitch flag without auto-starting.
  begin
    perform private.director_tick();
  exception when others then
    null;
  end;
end;
$proof$;
