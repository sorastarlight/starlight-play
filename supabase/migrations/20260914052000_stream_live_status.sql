-- Honest Twitch live detection. Stale stream_status is UNKNOWN, never treated as live.

alter table public.stream_status
  add column if not exists source text,
  add column if not exists checked_at timestamptz,
  add column if not exists last_error text,
  add column if not exists eventsub_online boolean not null default false,
  add column if not exists eventsub_offline boolean not null default false;

create or replace function private.stream_live_state()
returns jsonb
language plpgsql
stable
as $$
declare
  s public.stream_status;
  known boolean;
begin
  select * into s from public.stream_status where id = 1;
  known := s.checked_at is not null and s.checked_at > now() - interval '15 minutes';
  return jsonb_build_object(
    'live', known and coalesce(s.is_live, false),
    'known', known,
    'stale', not known,
    'flag', coalesce(s.is_live, false),
    'source', s.source,
    'checkedAt', s.checked_at,
    'error', s.last_error,
    'title', s.title,
    'viewers', s.viewer_count,
    'startedAt', s.started_at,
    'eventSubReady', coalesce(s.eventsub_online, false) and coalesce(s.eventsub_offline, false)
  );
end;
$$;

create or replace function private.stream_is_live()
returns boolean
language sql
stable
as $$
  select coalesce((private.stream_live_state()->>'live')::boolean, false);
$$;

create or replace function private.apply_stream_status(p_event jsonb)
returns jsonb
language plpgsql
as $$
declare
  ev jsonb := coalesce(p_event, '{}'::jsonb);
  err text := nullif(btrim(coalesce(ev->>'error', '')), '');
begin
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

  update public.stream_status
    set is_live = coalesce((ev->>'is_live')::boolean, false),
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
  return private.stream_live_state() || jsonb_build_object('ok', true);
end;
$$;

create or replace function public.service_set_stream_status(p_event jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return private.apply_stream_status(p_event);
end;
$$;

revoke all on function private.apply_stream_status(jsonb) from public, anon, authenticated;
revoke all on function public.service_set_stream_status(jsonb) from public, anon, authenticated;
grant execute on function private.apply_stream_status(jsonb) to service_role;
grant execute on function public.service_set_stream_status(jsonb) to service_role;

create or replace function private.director_friendly_reason(p_reason text)
returns text
language sql
immutable
as $$
  select case p_reason
    when 'NOT_DUE' then 'Waiting for the next encounter window.'
    when 'UPCOMING_AD' then 'Waiting until after the upcoming Twitch ad.'
    when 'AD_ACTIVE' then 'Twitch ad break is active.'
    when 'POST_AD_COOLDOWN' then 'Giving viewers a moment to return after the ad.'
    when 'MANUAL_HOLD' then 'Automatic encounters are paused.'
    when 'STREAM_MODE' then 'Automatic encounters are paused for the current stream mode.'
    when 'ACTIVE_ENCOUNTER' then 'An encounter is already active.'
    when 'OFFLINE' then 'The stream is offline.'
    when 'STREAM_STATUS_UNKNOWN' then 'Twitch live status has not been checked recently.'
    when 'QUEUED_SPECIAL' then 'A special encounter is queued for the next safe window.'
    when 'NO_ELIGIBLE_PLAYERS' then 'No eligible Trainers are present.'
    when 'UNKNOWN_AD' then 'Twitch ad information is unavailable.'
    when 'DIRECTOR_OFF' then 'The encounter director is turned off.'
    else coalesce(p_reason, 'Waiting.')
  end;
$$;

create or replace function private.director_tick()
returns jsonb
language plpgsql
as $$
declare
  d private.stream_director;
  a private.twitch_ad_state;
  cfg jsonb := private.director_config();
  r public.encounter_rounds;
  live boolean;
  live_state jsonb;
  mode jsonb;
  safe_win jsonb;
  dir_status text;
  dir_reason text;
  queued jsonb;
  band text := 'COMMON';
begin
  if coalesce((cfg->>'encounterDirectorEnabled')::boolean, true) is not true then
    update private.stream_director set status = 'OFFLINE', delay_reason = 'DIRECTOR_OFF', last_tick_at = now(), updated_at = now() where id = 1;
    return jsonb_build_object('status', 'OFFLINE', 'reason', 'DIRECTOR_OFF');
  end if;

  select * into d from private.stream_director where id = 1 for update;
  a := private.director_refresh_ad_end();
  r := private.director_active_round();
  live_state := private.stream_live_state();
  live := coalesce((live_state->>'live')::boolean, false);
  mode := private.director_mode_cfg(d.stream_mode);

  if d.manual_hold and d.hold_until is not null and now() >= d.hold_until then
    update private.stream_director
      set manual_hold = false, hold_until = null, hold_reason = null, updated_at = now()
      where id = 1;
    perform private.director_schedule_next('grace');
    perform private.director_log('HOLD_EXPIRED', 'MANUAL_HOLD', '{}'::jsonb);
    select * into d from private.stream_director where id = 1;
  end if;

  if r is not null then
    if r.resolved or r.cancelled or private.round_phase(r) = 'closed' then
      update private.stream_director
        set last_encounter_completed_at = now(), updated_at = now()
        where id = 1 and last_encounter_id = r.id;
      if d.next_encounter_at is null or d.next_encounter_at < now() then
        if d.last_encounter_source is distinct from 'TEST' then
          perform private.director_schedule_next('normal');
        end if;
      end if;
      r := null;
    end if;
  end if;

  if r is not null and a.ad_active and coalesce((cfg->>'pauseEncounterDuringAds')::boolean, true) then
    perform private.director_pause_round(r.id, 'AD', 'Encounter paused for an ad break.');
  elsif r is not null and not a.ad_active and (d.post_ad_until is null or now() >= d.post_ad_until) then
    perform private.director_resume_round(r.id, 'AD');
  end if;

  if live and not d.rpg_session_active then
    insert into private.stream_sessions (mode) values (d.stream_mode) returning id into d.session_id;
    update private.stream_director
      set rpg_session_active = true,
          session_id = d.session_id,
          session_started_at = now(),
          stream_mode = 'NORMAL',
          auto_enabled = true,
          updated_at = now()
      where id = 1;
    if d.next_encounter_at is null then
      perform private.director_schedule_next('first');
    end if;
    perform private.director_log('SESSION_STARTED', 'STREAM_LIVE', '{}'::jsonb);
    select * into d from private.stream_director where id = 1;
  end if;

  if not live and not d.rpg_session_active then
    dir_status := 'OFFLINE';
    dir_reason := case when coalesce((live_state->>'known')::boolean, false) then 'OFFLINE' else 'STREAM_STATUS_UNKNOWN' end;
  elsif a.ad_active then
    dir_status := 'AD_ACTIVE';
    dir_reason := 'AD_ACTIVE';
  elsif r is not null then
    dir_status := 'ENCOUNTER_ACTIVE';
    dir_reason := 'ACTIVE_ENCOUNTER';
  elsif d.manual_hold then
    dir_status := 'MANUAL_HOLD';
    dir_reason := 'MANUAL_HOLD';
  elsif d.post_ad_until is not null and now() < d.post_ad_until then
    dir_status := 'POST_AD_COOLDOWN';
    dir_reason := 'POST_AD_COOLDOWN';
  elsif d.post_ad_until is not null and now() >= d.post_ad_until and d.overdue_from is not null then
    update private.stream_director set post_ad_until = null, updated_at = now() where id = 1;
    perform private.director_schedule_next('grace');
    dir_status := 'WAITING_FOR_NEXT_ENCOUNTER';
    dir_reason := 'NOT_DUE';
  elsif coalesce(mode->>'auto', 'true') <> 'true' then
    dir_status := 'MANUAL_HOLD';
    dir_reason := 'STREAM_MODE';
  elsif not d.auto_enabled or coalesce((cfg->>'autoEncountersEnabled')::boolean, true) is not true then
    dir_status := 'MANUAL_HOLD';
    dir_reason := 'MANUAL_HOLD';
  elsif d.queued is not null then
    band := case when d.queued->>'kind' = 'SPECIAL' then 'LEGENDARY_EVENT' else 'COMMON' end;
    safe_win := private.director_safe_window(band);
    if coalesce((safe_win->>'safe')::boolean, false) is not true then
      dir_status := 'AD_PENDING';
      dir_reason := case when safe_win->>'state' = 'UNSAFE' then 'UPCOMING_AD' else 'UNKNOWN_AD' end;
      if d.overdue_from is null then
        update private.stream_director
          set overdue_from = now(),
              encounters_delayed_ads = encounters_delayed_ads + 1,
              next_encounter_at = coalesce(a.next_ad_at, now())
                + make_interval(secs => coalesce(a.next_ad_duration_sec, 180)
                  + private.director_num(cfg, 'postAdCooldownSeconds', 30)
                  + private.director_interval_minutes(0.5, 1, 1.5) * 60)
        where id = 1;
      end if;
      perform private.director_log('AUTO_ENCOUNTER_DELAYED', dir_reason, safe_win);
    else
      queued := d.queued;
      if queued->>'kind' = 'SPECIAL' then
        r := private.director_start_now(
          (queued->>'dex')::int,
          queued->>'gender',
          case when queued ? 'shiny' and queued->>'shiny' is not null then (queued->>'shiny')::boolean else null end,
          'QUEUED_SPECIAL',
          false
        );
        dir_status := 'ENCOUNTER_ACTIVE';
        dir_reason := 'QUEUED_SPECIAL';
      else
        r := private.director_start_now(null, null, null, 'AUTO', false);
        dir_status := 'ENCOUNTER_ACTIVE';
        dir_reason := 'QUEUED_RANDOM';
      end if;
    end if;
  elsif d.next_encounter_at is null then
    perform private.director_schedule_next(case when d.session_started_at is null then 'first' else 'normal' end);
    dir_status := 'WAITING_FOR_NEXT_ENCOUNTER';
    dir_reason := 'NOT_DUE';
  elsif now() < d.next_encounter_at then
    dir_status := 'WAITING_FOR_NEXT_ENCOUNTER';
    dir_reason := 'NOT_DUE';
  else
    safe_win := private.director_safe_window(band);
    if coalesce((safe_win->>'safe')::boolean, false) is not true then
      dir_status := 'AD_PENDING';
      dir_reason := case when safe_win->>'state' = 'UNSAFE' then 'UPCOMING_AD' else 'UNKNOWN_AD' end;
      if d.overdue_from is null then
        update private.stream_director
          set overdue_from = now(),
              encounters_delayed_ads = encounters_delayed_ads + 1,
              next_encounter_at = coalesce(a.next_ad_at, now())
                + make_interval(secs => coalesce(a.next_ad_duration_sec, 180)
                  + private.director_num(cfg, 'postAdCooldownSeconds', 30)
                  + private.director_interval_minutes(0.5, 1, 1.5) * 60)
        where id = 1;
      end if;
      perform private.director_log('AUTO_ENCOUNTER_DELAYED', dir_reason, safe_win);
    elsif d.auto_enabled and coalesce(mode->>'auto', 'true') = 'true' then
      r := private.director_start_now(null, null, null, 'AUTO', false);
      dir_status := 'ENCOUNTER_ACTIVE';
      dir_reason := 'AUTO';
    else
      dir_status := 'WAITING_FOR_NEXT_ENCOUNTER';
      dir_reason := 'NOT_DUE';
    end if;
  end if;

  update private.stream_director
    set status = dir_status,
        delay_reason = dir_reason,
        last_tick_at = now(),
        updated_at = now()
    where id = 1;

  return jsonb_build_object('status', dir_status, 'reason', dir_reason, 'roundId', r.id);
end;
$$;

create or replace function private.director_dashboard()
returns jsonb
language plpgsql
as $$
declare
  d private.stream_director;
  a private.twitch_ad_state;
  r public.encounter_rounds;
  safe_win jsonb;
  live boolean;
  live_state jsonb;
  cfg jsonb := private.director_config();
  mode jsonb;
  hist jsonb;
  logs jsonb;
  auth_row private.twitch_ad_auth;
begin
  perform private.director_tick_if_due();
  select * into d from private.stream_director where id = 1;
  select * into a from private.twitch_ad_state where id = 1;
  select * into auth_row from private.twitch_ad_auth where id = 1;
  r := private.director_active_round();
  live_state := private.stream_live_state();
  live := coalesce((live_state->>'live')::boolean, false);
  safe_win := private.director_safe_window(
    case when r is not null and coalesce(r.variant, '') ~* 'shiny' then 'SHINY'
         when r is not null then private.spawn_band(r.dex)
         when d.queued->>'kind' = 'SPECIAL' then 'LEGENDARY_EVENT'
         else 'COMMON' end
  );
  mode := private.director_mode_cfg(d.stream_mode);
  select coalesce(jsonb_agg(row_to_json(x)::jsonb), '[]'::jsonb) into hist from (
    select er.started_at as at, er.dex, er.name, er.variant, er.gender, er.trigger_source as trigger,
           private.spawn_band(er.dex) as rarity,
           (select count(*) from public.encounter_players ep where ep.round_id = er.id) as joined,
           (select count(*) filter (where coalesce(ep.caught, false)) from public.encounter_players ep where ep.round_id = er.id) as caught,
           case when er.cancelled then 'Cancelled' when er.resolved then 'Complete' when private.round_is_active(er) then 'Active' else 'Closed' end as status,
           er.pause_reasons
    from public.encounter_rounds er
    where coalesce(er.source, '') is distinct from 'test'
    order by er.started_at desc nulls last
    limit 20
  ) x;
  select coalesce(jsonb_agg(row_to_json(x)::jsonb), '[]'::jsonb) into logs from (
    select at, action, reason, details from private.director_events order by at desc, id desc limit 50
  ) x;
  return jsonb_build_object(
    'stream', jsonb_build_object(
      'twitchLive', live,
      'liveKnown', coalesce((live_state->>'known')::boolean, false),
      'liveStale', coalesce((live_state->>'stale')::boolean, true),
      'liveSource', live_state->>'source',
      'liveCheckedAt', live_state->>'checkedAt',
      'liveError', live_state->>'error',
      'liveTitle', live_state->>'title',
      'viewers', live_state->'viewers',
      'eventSubLive', coalesce((live_state->>'eventSubReady')::boolean, false),
      'rpgSession', d.rpg_session_active,
      'startedAt', d.session_started_at,
      'mode', d.stream_mode,
      'modeLabel', mode->>'label',
      'modeAuto', coalesce((mode->>'auto')::boolean, true),
      'intervalMin', mode->>'min',
      'intervalMax', mode->>'max'
    ),
    'director', jsonb_build_object(
      'status', d.status,
      'autoEnabled', d.auto_enabled,
      'manualHold', d.manual_hold,
      'holdUntil', d.hold_until,
      'holdReason', d.hold_reason,
      'delayReason', d.delay_reason,
      'delayText', private.director_friendly_reason(d.delay_reason),
      'nextEncounterAt', d.next_encounter_at,
      'lastStartedAt', d.last_encounter_started_at,
      'encountersAuto', d.encounters_auto,
      'encountersManual', d.encounters_manual,
      'encountersEvent', d.encounters_event,
      'encountersDelayedAds', d.encounters_delayed_ads,
      'encountersPausedAds', d.encounters_paused_ads
    ),
    'activeEncounter', case when r is null then null else private.public_round_json(r) || jsonb_build_object(
      'triggerSource', r.trigger_source,
      'pauseReasons', r.pause_reasons,
      'pausedForBreak', private.director_has_reason(r.pause_reasons, 'AD'),
      'rarity', private.spawn_band(r.dex)
    ) end,
    'queuedSpecial', d.queued,
    'adState', jsonb_build_object(
      'status', case when a.ad_active then 'ACTIVE' when a.next_ad_at is not null and a.next_ad_at < now() + interval '15 minutes' then 'UPCOMING' when a.data_available then 'CLEAR' else 'UNKNOWN' end,
      'dataAvailable', a.data_available,
      'source', a.source,
      'connected', coalesce(auth_row.connected, false),
      'manageAvailable', a.manage_available,
      'nextAdAt', a.next_ad_at,
      'nextAdDurationSec', a.next_ad_duration_sec,
      'lastAdAt', a.last_ad_at,
      'adActive', a.ad_active,
      'activeStartedAt', a.active_started_at,
      'activeExpectedEndAt', a.active_expected_end_at,
      'snoozeCount', a.snooze_count,
      'snoozeRefreshAt', a.snooze_refresh_at,
      'prerollFreeSec', a.preroll_free_sec,
      'lastRefreshAt', a.last_refresh_at,
      'stale', a.stale,
      'authorizationNeeded', not coalesce(auth_row.connected, false)
    ),
    'safeWindow', safe_win,
    'config', jsonb_build_object(
      'normalMin', private.director_num(cfg, 'normalIntervalMin', 10),
      'normalMax', private.director_num(cfg, 'normalIntervalMax', 16),
      'preAdSafetySeconds', private.director_num(cfg, 'preAdSafetySeconds', 180),
      'postAdCooldownSeconds', private.director_num(cfg, 'postAdCooldownSeconds', 30),
      'autoSnooze', coalesce((cfg->>'automaticAdSnoozeEnabled')::boolean, false)
    ),
    'health', jsonb_build_object(
      'director', 'Healthy',
      'twitchAds', case when auth_row.connected then 'Connected' when a.source = 'fallback' then 'Fallback' else 'Read access not connected' end,
      'twitchLive', case
        when live then 'Twitch live'
        when coalesce((live_state->>'known')::boolean, false) then 'Twitch offline'
        else 'Twitch live status unknown'
      end,
      'eventSub', case
        when a.source = 'twitch' and coalesce((live_state->>'eventSubReady')::boolean, false) then 'Ads + live EventSub'
        when coalesce((live_state->>'eventSubReady')::boolean, false) then 'Live EventSub ready'
        when a.source = 'twitch' then 'Ad EventSub ready'
        else 'Not subscribed'
      end,
      'streamSession', case when d.rpg_session_active then 'Active' when live then 'Twitch live, RPG session idle' else 'Idle' end
    ),
    'recentEncounters', hist,
    'recentDirectorEvents', logs,
    'permissions', jsonb_build_object('control', true)
  );
end;
$$;

create or replace function private.stream_live_self_test()
returns table(name text, passed boolean, detail text)
language plpgsql
as $$
declare
  saved public.stream_status;
  st jsonb;
begin
  select * into saved from public.stream_status where id = 1;

  update public.stream_status
    set is_live = true, checked_at = now() - interval '2 days', source = 'stale_test', last_error = null
    where id = 1;
  st := private.stream_live_state();
  name := 'stale live flag is not treated as live';
  passed := coalesce((st->>'live')::boolean, true) is not true and coalesce((st->>'stale')::boolean, false);
  detail := st->>'stale';
  return next;

  update public.stream_status
    set is_live = true, checked_at = now(), source = 'helix', last_error = null
    where id = 1;
  st := private.stream_live_state();
  name := 'fresh helix live is treated as live';
  passed := coalesce((st->>'live')::boolean, false);
  detail := st->>'source';
  return next;

  update public.stream_status
    set is_live = false, checked_at = now(), source = 'helix', last_error = null
    where id = 1;
  st := private.stream_live_state();
  name := 'fresh helix offline is known offline';
  passed := coalesce((st->>'live')::boolean, true) is not true and coalesce((st->>'known')::boolean, false);
  detail := st->>'known';
  return next;

  update public.stream_status
    set is_live = saved.is_live,
        title = saved.title,
        viewer_count = saved.viewer_count,
        started_at = saved.started_at,
        source = saved.source,
        checked_at = saved.checked_at,
        last_error = saved.last_error,
        eventsub_online = saved.eventsub_online,
        eventsub_offline = saved.eventsub_offline,
        updated_at = saved.updated_at
    where id = 1;
exception when others then
  update public.stream_status
    set is_live = saved.is_live,
        title = saved.title,
        viewer_count = saved.viewer_count,
        started_at = saved.started_at,
        source = saved.source,
        checked_at = saved.checked_at,
        last_error = saved.last_error,
        eventsub_online = saved.eventsub_online,
        eventsub_offline = saved.eventsub_offline,
        updated_at = saved.updated_at
    where id = 1;
  raise;
end;
$$;
