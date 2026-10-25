do $guard$ begin if md5(pg_get_functiondef('public.admin_director_command(text,jsonb)'::regprocedure)) is distinct from '275819eada17b74badc050c062dee4b1' then raise exception 'Director rollback source drift';end if;end $guard$;
CREATE OR REPLACE FUNCTION public.admin_director_command(p_action text, p_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  payload jsonb := coalesce(p_payload, '{}'::jsonb);
  d private.stream_director;
  a private.twitch_ad_state;
  r public.encounter_rounds;
  safe_win jsonb;
  hold_mins int;
  next_at timestamptz;
  msg text := 'Updated.';
begin
  if not private.is_play_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select * into d from private.stream_director where id = 1;
  a := private.director_refresh_ad_end();
  r := private.director_active_round();

  if p_action = 'tick' then
    perform private.director_tick();
    msg := 'Director refreshed.';
  elsif p_action = 'start_session' then
    if d.session_id is null or not d.rpg_session_active then
      insert into private.stream_sessions (mode) values (d.stream_mode) returning id, started_at into d.session_id, d.session_started_at;
    end if;
    update private.stream_director
      set rpg_session_active = true,
          session_id = coalesce(session_id, d.session_id),
          session_started_at = coalesce(session_started_at, now()),
          stream_mode = 'NORMAL',
          auto_enabled = true,
          updated_at = now()
      where id = 1;
    if d.next_encounter_at is null then
      perform private.director_schedule_next('first');
    end if;
    perform private.director_log('SESSION_STARTED', null, '{}'::jsonb, auth.uid());
    msg := 'RPG session started.';
  elsif p_action = 'end_session' then
    if r is not null then
      raise exception 'An encounter is currently active. End the session after it finishes.';
    end if;
    update private.stream_sessions
      set ended_at = now(),
          stats = jsonb_build_object(
            'auto', d.encounters_auto, 'manual', d.encounters_manual, 'event', d.encounters_event,
            'delayedAds', d.encounters_delayed_ads, 'pausedAds', d.encounters_paused_ads
          )
      where id = d.session_id;
    update private.stream_director
      set rpg_session_active = false, session_id = null, next_encounter_at = null, queued = null, updated_at = now()
      where id = 1;
    perform private.director_log('SESSION_ENDED', null, '{}'::jsonb, auth.uid());
    msg := 'RPG session ended.';
  elsif p_action = 'pause_auto' then
    hold_mins := coalesce(nullif(payload->>'minutes', '')::int, 0);
    update private.stream_director
      set auto_enabled = false,
          manual_hold = true,
          hold_reason = coalesce(payload->>'reason', 'Manual hold'),
          hold_until = case when hold_mins > 0 then now() + make_interval(mins => hold_mins) else null end,
          updated_at = now()
      where id = 1;
    perform private.director_log('PAUSE_AUTO', 'MANUAL_HOLD', payload, auth.uid());
    msg := 'Automatic encounters paused.';
  elsif p_action = 'resume_auto' then
    update private.stream_director
      set auto_enabled = true, manual_hold = false, hold_until = null, hold_reason = null, updated_at = now()
      where id = 1;
    perform private.director_schedule_next('grace');
    perform private.director_log('RESUME_AUTO', null, '{}'::jsonb, auth.uid());
    msg := 'Automatic encounters resumed.';
  elsif p_action = 'set_mode' then
    update private.stream_director
      set stream_mode = upper(replace(coalesce(payload->>'mode', 'NORMAL'), ' ', '_')),
          updated_at = now()
      where id = 1;
    if upper(replace(coalesce(payload->>'mode', ''), ' ', '_')) in ('REACTION', 'STORY', 'BRB') then
      update private.stream_director set next_encounter_at = null where id = 1;
    elsif d.stream_mode in ('REACTION', 'STORY', 'BRB') then
      perform private.director_schedule_next('grace');
    end if;
    perform private.director_log('SET_MODE', payload->>'mode', payload, auth.uid());
    msg := format('Stream Mode changed to %s.', coalesce(payload->>'mode', 'NORMAL'));
  elsif p_action = 'return_normal' then
    update private.stream_director
      set stream_mode = 'NORMAL', auto_enabled = true, manual_hold = false, hold_until = null, hold_reason = null, updated_at = now()
      where id = 1;
    perform private.director_schedule_next('grace');
    perform private.director_log('RETURN_NORMAL', null, '{}'::jsonb, auth.uid());
    msg := 'Returned to Normal mode.';
  elsif p_action = 'queue_special' then
    if payload->>'dex' is null then
      raise exception 'Pick a Pok�mon to queue.';
    end if;
    update private.stream_director
      set queued = jsonb_build_object(
        'kind', 'SPECIAL',
        'dex', (payload->>'dex')::int,
        'formId', coalesce(nullif(payload->>'formId', '')::int, (payload->>'dex')::int),
        'name', private.form_display_name((payload->>'dex')::int, coalesce(nullif(payload->>'formId', '')::int, (payload->>'dex')::int)),
        'gender', payload->>'gender',
        'shiny', payload->'shiny',
        'queuedAt', now()
      ),
      updated_at = now()
      where id = 1;
    perform private.director_log('QUEUE_SPECIAL', payload->>'dex', payload, auth.uid());
    msg := format('%s queued.', private.form_display_name((payload->>'dex')::int, coalesce(nullif(payload->>'formId', '')::int, (payload->>'dex')::int)));
  elsif p_action = 'queue_random' then
    update private.stream_director
      set queued = jsonb_build_object('kind', 'RANDOM', 'queuedAt', now()),
          updated_at = now()
      where id = 1;
    perform private.director_log('QUEUE_RANDOM', null, '{}'::jsonb, auth.uid());
    msg := 'A random encounter will launch at the next safe window.';
  elsif p_action = 'cancel_queue' then
    update private.stream_director set queued = null, updated_at = now() where id = 1;
    perform private.director_log('CANCEL_QUEUE', null, '{}'::jsonb, auth.uid());
    msg := 'Queued encounter cancelled.';
  elsif p_action in ('start_random', 'start_specific', 'start_test', 'force_start') then
    if r is not null then
      raise exception 'An encounter is already active.';
    end if;
    safe_win := private.director_safe_window(case when coalesce((payload->>'shiny')::boolean, false) then 'SHINY' else 'COMMON' end);
    if a.ad_active and p_action <> 'start_test' then
      raise exception 'A Twitch ad break is running. Wait until it ends.';
    end if;
    if p_action <> 'force_start' and p_action <> 'start_test' and coalesce((safe_win->>'safe')::boolean, false) is not true and coalesce((payload->>'anyway')::boolean, false) is not true then
      raise exception '%', coalesce(safe_win->>'reason', 'That phase is not safe yet.')
        using errcode = 'P0001';
    end if;
    r := private.director_start_from_payload(p_action, payload);
    msg := r.name || ' appeared!';
  elsif p_action = 'pause_encounter' then
    if r is null then raise exception 'Start an encounter first.'; end if;
    perform private.director_pause_round(r.id, 'ADMIN', 'Encounter temporarily paused.');
    msg := 'Encounter paused.';
  elsif p_action = 'resume_encounter' then
    if r is null then raise exception 'Start an encounter first.'; end if;
    perform private.director_resume_round(r.id, 'ADMIN');
    msg := 'Encounter resumed.';
  elsif p_action = 'mark_ad_started' then
    update private.twitch_ad_state
      set ad_active = true,
          source = case when source = 'twitch' then source else 'fallback' end,
          data_available = true,
          active_started_at = now(),
          active_expected_end_at = now() + make_interval(secs => coalesce(nullif(payload->>'durationSec', '')::int, 180)),
          is_automatic = false,
          updated_at = now()
      where id = 1;
    perform private.director_log('TWITCH_AD_STARTED', 'MANUAL', payload, auth.uid());
    perform private.director_tick();
    msg := 'Ad marked as started.';
  elsif p_action = 'mark_ad_ended' then
    update private.twitch_ad_state
      set ad_active = false, last_ad_at = now(), updated_at = now()
      where id = 1;
    update private.stream_director
      set post_ad_until = now() + make_interval(secs => private.director_num(private.director_config(), 'postAdCooldownSeconds', 30)),
          updated_at = now()
      where id = 1;
    perform private.director_log('TWITCH_AD_ENDED', 'MANUAL', '{}'::jsonb, auth.uid());
    perform private.director_tick();
    msg := 'Ad marked as ended.';
  elsif p_action = 'set_next_ad' then
    next_at := (payload->>'nextAdAt')::timestamptz;
    update private.twitch_ad_state
      set next_ad_at = next_at,
          next_ad_duration_sec = coalesce(nullif(payload->>'durationSec', '')::int, 180),
          source = 'fallback',
          data_available = next_at is not null,
          last_refresh_at = now(),
          stale = false,
          updated_at = now()
      where id = 1;
    perform private.director_log('SET_NEXT_AD', 'FALLBACK', payload, auth.uid());
    msg := 'Fallback ad time saved.';
  elsif p_action = 'cancel_encounter' then
    if r is null then raise exception 'No encounter to cancel.'; end if;
    perform public.admin_cancel_round();
    perform private.director_log('CANCEL_ENCOUNTER', r.name, jsonb_build_object('roundId', r.id), auth.uid());
    msg := 'Encounter cancelled.';
  elsif p_action = 'snooze_ad' then
    raise exception 'Snooze must be confirmed by Twitch. Use Connect Twitch Ads, then Snooze next ad.';
  elsif p_action = 'refresh_ads' then
    perform private.director_tick();
    msg := 'Ad status refreshed from cached Director state.';
  elsif p_action = 'save_ads_token' then
    if coalesce(payload->>'accessToken', '') = '' then
      raise exception 'Twitch ad authorization still needs to be connected.';
    end if;
    update private.twitch_ad_auth
      set access_token = payload->>'accessToken',
          scopes = payload->>'scopes',
          connected = true,
          last_error = null,
          updated_at = now()
      where id = 1;
    perform private.director_log('ADS_AUTH_SAVED', null, jsonb_build_object('scopes', payload->>'scopes'), auth.uid());
    msg := 'Twitch ad authorization saved. Refresh ads from the staff function next.';
  else
    raise exception 'Unknown Director command.';
  end if;

  return private.director_dashboard() || jsonb_build_object('ok', true, 'message', msg);
end;
$function$
;
