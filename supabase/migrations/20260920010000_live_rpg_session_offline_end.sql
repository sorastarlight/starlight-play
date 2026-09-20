-- Live RPG must end when Twitch goes offline, and must not auto-restart after a
-- manual End Session while the channel is still live.
--
-- Before: director_tick started a session whenever live && !rpg_session_active,
-- so Ending session during a normal (non-RPG) livestream immediately restarted.
-- Offline never cleared rpg_session_active, so auto encounters could continue.

create or replace function private.director_cancel_active_round(p_message text default 'Encounter ended because the stream went offline.')
returns boolean
language plpgsql
as $function$
declare
  r public.encounter_rounds;
  rec public.encounter_players%rowtype;
begin
  r := private.director_active_round();
  if r is null or coalesce(r.cancelled, false) then
    return false;
  end if;
  if not coalesce(r.resolved, false) then
    for rec in select * from public.encounter_players where round_id = r.id
    loop
      perform private.restore_bag_item(rec.user_id, rec.prep);
      if rec.throw_processed and rec.result_reason is distinct from 'no_ball_left' then
        perform private.restore_bag_item(rec.user_id, rec.ball);
      end if;
    end loop;
  end if;
  update public.encounter_rounds
     set cancelled = true,
         resolved = true,
         hidden = true,
         phase = 'closed',
         paused_at = null,
         last_action = left(coalesce(p_message, 'Encounter cancelled.'), 200),
         updated_at = now()
   where id = r.id;
  perform private.staff_console(r.id, 'cancel', null, coalesce(p_message, 'Encounter cancelled.'));
  return true;
end;
$function$;

create or replace function private.director_begin_rpg_session(p_reason text default 'STREAM_LIVE')
returns boolean
language plpgsql
as $function$
declare
  d private.stream_director;
  sid uuid;
begin
  select * into d from private.stream_director where id = 1 for update;
  if d.rpg_session_active then
    return false;
  end if;
  insert into private.stream_sessions (mode) values (d.stream_mode) returning id into sid;
  update private.stream_director
     set rpg_session_active = true,
         session_id = sid,
         session_started_at = now(),
         stream_mode = 'NORMAL',
         -- Keep a manual pause across go-live; otherwise arm auto for RPG streams.
         auto_enabled = case when d.manual_hold then d.auto_enabled else true end,
         updated_at = now()
   where id = 1;
  if d.next_encounter_at is null then
    perform private.director_schedule_next('first');
  end if;
  perform private.director_log('SESSION_STARTED', coalesce(p_reason, 'STREAM_LIVE'), '{}'::jsonb);
  return true;
end;
$function$;

create or replace function private.director_end_rpg_session(p_reason text default 'STREAM_OFFLINE')
returns boolean
language plpgsql
as $function$
declare
  d private.stream_director;
begin
  select * into d from private.stream_director where id = 1 for update;
  if not d.rpg_session_active and d.session_id is null and d.next_encounter_at is null and d.queued is null then
    return false;
  end if;

  perform private.director_cancel_active_round(
    case
      when coalesce(p_reason, '') = 'STREAM_OFFLINE' then 'Encounter ended because the stream went offline.'
      else 'Encounter ended with the Live RPG session.'
    end
  );

  if d.session_id is not null then
    update private.stream_sessions
       set ended_at = now(),
           stats = jsonb_build_object(
             'auto', d.encounters_auto,
             'manual', d.encounters_manual,
             'event', d.encounters_event,
             'delayedAds', d.encounters_delayed_ads,
             'pausedAds', d.encounters_paused_ads,
             'endedReason', coalesce(p_reason, 'STREAM_OFFLINE')
           )
     where id = d.session_id and ended_at is null;
  end if;

  update private.stream_director
     set rpg_session_active = false,
         session_id = null,
         next_encounter_at = null,
         queued = null,
         overdue_from = null,
         status = 'OFFLINE',
         delay_reason = case
           when coalesce(p_reason, '') = 'STREAM_OFFLINE' then 'OFFLINE'
           else coalesce(p_reason, 'OFFLINE')
         end,
         updated_at = now()
   where id = 1;

  perform private.director_log('SESSION_ENDED', coalesce(p_reason, 'STREAM_OFFLINE'), '{}'::jsonb);
  return true;
end;
$function$;

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

  -- Edge-triggered session control: start only on offline->live, end on live->offline.
  -- Manual End Session while still live must stick until the next go-live edge.
  if next_live and not prev_live then
    perform private.director_begin_rpg_session('STREAM_LIVE');
  elsif prev_live and not next_live then
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

create or replace function private.director_tick()
returns jsonb
language plpgsql
as $function$
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
  se_tick jsonb;
  known_offline boolean;
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
  known_offline := coalesce((live_state->>'known')::boolean, false)
    and not coalesce((live_state->>'flag')::boolean, false);
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

  -- Safety: known offline must end the RPG session even if EventSub/Helix edge was missed.
  -- Do NOT auto-start here -- that restarts sessions after a manual End while still live.
  if known_offline and d.rpg_session_active then
    perform private.director_end_rpg_session('STREAM_OFFLINE');
    select * into d from private.stream_director where id = 1;
    r := private.director_active_round();
  end if;

  if not live then
    dir_status := 'OFFLINE';
    dir_reason := case when coalesce((live_state->>'known')::boolean, false) then 'OFFLINE' else 'STREAM_STATUS_UNKNOWN' end;
    se_tick := private.special_event_director_tick(false);
    if coalesce(se_tick->>'reason', '') in ('SPECIAL_EVENT_OFFLINE', 'SPECIAL_EVENT_START_FAILED') then
      dir_status := coalesce(se_tick->>'status', dir_status);
      dir_reason := coalesce(se_tick->>'reason', dir_reason);
    end if;
  elsif not d.rpg_session_active then
    -- Twitch is live but staff ended (or never started) the RPG session.
    dir_status := 'MANUAL_HOLD';
    dir_reason := 'SESSION_IDLE';
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
  else
    se_tick := private.special_event_director_tick(live);
    if coalesce((se_tick->>'blockAuto')::boolean, false) then
      dir_status := coalesce(se_tick->>'status', 'SPECIAL_EVENT');
      dir_reason := coalesce(se_tick->>'reason', 'SPECIAL_EVENT');
      if se_tick->>'roundId' is not null then
        select * into r from public.encounter_rounds where id = (se_tick->>'roundId')::uuid;
      end if;
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
  end if;

  update private.stream_director
    set status = dir_status,
        delay_reason = dir_reason,
        last_tick_at = now(),
        updated_at = now()
    where id = 1;

  return jsonb_build_object('status', dir_status, 'reason', dir_reason, 'roundId', r.id);
end;
$function$;


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
    when 'SESSION_IDLE' then 'Twitch is live, but the Live RPG session is stopped.'
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
