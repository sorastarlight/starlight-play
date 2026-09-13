-- Fix Stream Session: director_tick variables named status/reason collided with columns.

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
