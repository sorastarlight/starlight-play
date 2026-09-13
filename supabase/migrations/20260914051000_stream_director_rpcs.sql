-- Director public RPCs, pause wrapping, snapshot flags, tests.

create or replace function public.admin_live_dashboard()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not private.is_play_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return private.director_dashboard();
end;
$$;

create or replace function public.admin_director_command(p_action text, p_payload jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
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
      raise exception 'Pick a Pokémon to queue.';
    end if;
    update private.stream_director
      set queued = jsonb_build_object(
        'kind', 'SPECIAL',
        'dex', (payload->>'dex')::int,
        'name', (select name from public.species where dex = (payload->>'dex')::int),
        'gender', payload->>'gender',
        'shiny', payload->'shiny',
        'queuedAt', now()
      ),
      updated_at = now()
      where id = 1;
    perform private.director_log('QUEUE_SPECIAL', payload->>'dex', payload, auth.uid());
    msg := format('%s queued.', coalesce((select name from public.species where dex = (payload->>'dex')::int), 'Pokémon'));
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
    r := private.director_start_now(
      nullif(payload->>'dex', '')::int,
      payload->>'gender',
      case when payload ? 'shiny' then (payload->>'shiny')::boolean else null end,
      case when p_action = 'start_test' then 'TEST' when payload->>'dex' is not null then 'ADMIN_SPECIFIC' else 'ADMIN' end,
      p_action = 'start_test'
    );
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
    -- Token is stored only in private.twitch_ad_auth. Never returned.
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
$$;

create or replace function private.director_ingest_ad_schedule(p_schedule jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  data jsonb := coalesce(p_schedule, '{}'::jsonb);
  next_at timestamptz;
begin
  next_at := nullif(data->>'next_ad_at', '')::timestamptz;
  update private.twitch_ad_state
    set data_available = true,
        source = 'twitch',
        next_ad_at = next_at,
        next_ad_duration_sec = nullif(data->>'duration','')::int,
        last_ad_at = nullif(data->>'last_ad_at','')::timestamptz,
        snooze_count = coalesce(nullif(data->>'snooze_count','')::int, snooze_count),
        snooze_refresh_at = nullif(data->>'snooze_refresh_at','')::timestamptz,
        preroll_free_sec = nullif(data->>'preroll_free_time','')::int,
        last_refresh_at = now(),
        stale = false,
        updated_at = now()
    where id = 1;
  perform private.director_log('AD_SCHEDULE_UPDATED', 'TWITCH', jsonb_build_object('nextAdAt', next_at));
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function private.director_ad_begin(p_event jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  ev jsonb := coalesce(p_event, '{}'::jsonb);
  dur int := coalesce(nullif(ev->>'duration_seconds','')::int, 180);
  started timestamptz := coalesce(nullif(ev->>'started_at','')::timestamptz, now());
begin
  update private.twitch_ad_state
    set ad_active = true,
        source = 'twitch',
        data_available = true,
        active_started_at = started,
        active_expected_end_at = started + make_interval(secs => dur),
        last_ad_at = started,
        is_automatic = coalesce((ev->>'is_automatic')::boolean, true),
        last_refresh_at = now(),
        stale = false,
        updated_at = now()
    where id = 1;
  perform private.director_log('TWITCH_AD_STARTED', case when coalesce((ev->>'is_automatic')::boolean, true) then 'AUTOMATIC' else 'MANUAL' end, ev);
  perform private.director_tick();
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function private.director_ads_token()
returns text
language sql
security definer
set search_path to 'public'
as $$
  select access_token from private.twitch_ad_auth where id = 1;
$$;

create or replace function public.admin_start_round(p_dex integer default null, p_gender text default null, p_shiny boolean default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  a private.twitch_ad_state;
  r public.encounter_rounds;
begin
  if not private.is_play_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  a := private.director_refresh_ad_end();
  if a.ad_active then
    raise exception 'A Twitch ad break is running. Wait, or use Stream Session after the ad.';
  end if;
  r := private.director_start_now(p_dex, p_gender, p_shiny, case when p_dex is null then 'ADMIN' else 'ADMIN_SPECIFIC' end, false);
  return private.play_snapshot(auth.uid()) || jsonb_build_object(
    'ok', true,
    'message', r.name || ' appeared! Trainers can join on the Play page.'
  );
end;
$$;

create or replace function public.admin_pause_round()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  r public.encounter_rounds;
begin
  perform private.require_hub();
  r := private.director_active_round();
  if r is null then
    raise exception 'Start an encounter first.';
  end if;
  perform private.director_pause_round(r.id, 'ADMIN', 'Encounter paused.');
  return private.admin_overview() || jsonb_build_object('ok', true, 'message', 'Encounter paused. Timer and trainer actions are frozen.');
end;
$$;

create or replace function public.admin_resume_round()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  r public.encounter_rounds;
begin
  perform private.require_hub();
  r := private.sync_latest_round();
  if r is null then
    raise exception 'Start an encounter first.';
  end if;
  perform private.director_resume_round(r.id, 'ADMIN');
  return private.admin_overview() || jsonb_build_object('ok', true, 'message', 'Encounter resumed.');
end;
$$;

create or replace function public.play_sync(p_round_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  perform private.director_tick_if_due();
  return coalesce(private.play_snapshot(auth.uid(), p_round_id), '{}'::jsonb)
    || jsonb_build_object('console', private.play_console_json(100));
end;
$$;

create or replace function public.play_state()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  perform private.director_tick_if_due();
  return coalesce(private.play_snapshot(auth.uid()), '{}'::jsonb)
    || jsonb_build_object('console', private.play_console_json(100));
end;
$$;

create or replace function private.public_round_json(r encounter_rounds)
returns jsonb
language plpgsql
stable
as $function$
declare
  ph text; participants int; prepared int; thrown int; bait_count int; honey_calc jsonb; activity jsonb; honey jsonb; catchers jsonb; throwers jsonb; settled boolean; species_types text[];
begin
  if r is null then return null; end if;
  ph := private.round_phase(r);
  select s.types into species_types from public.species s where s.dex = r.dex;
  select count(*)::int, count(*) filter (where prep is not null)::int, count(*) filter (where ball is not null)::int, count(*) filter (where prep = 'bait')::int
    into participants, prepared, thrown, bait_count from public.encounter_players where round_id = r.id;
  honey_calc := private.capture_honey_modifier(bait_count, participants);
  select coalesce(jsonb_agg(row_to_json(x)::jsonb), '[]'::jsonb) into activity from (
    select a.display_name as name, a.kind, a.item, a.created_at as at from public.encounter_activity a where a.round_id = r.id order by a.created_at desc, a.id desc limit 40) x;
  select coalesce(jsonb_agg(jsonb_build_object('name', coalesce(private.trainer_label(ep.user_id), 'Trainer')) order by coalesce(private.trainer_label(ep.user_id), 'Trainer')), '[]'::jsonb)
    into honey from public.encounter_players ep where ep.round_id = r.id and ep.prep = 'bait';
  select coalesce(jsonb_agg(jsonb_build_object('name', coalesce(private.trainer_label(ep.user_id), 'Trainer'), 'ball', ep.ball) order by coalesce(private.trainer_label(ep.user_id), 'Trainer')), '[]'::jsonb)
    into throwers from public.encounter_players ep where ep.round_id = r.id and ep.ball is not null;
  select exists (select 1 from public.encounter_players ep where ep.round_id = r.id and ep.result is not null) into settled;
  if settled then
    select coalesce(jsonb_agg(jsonb_build_object('name', coalesce(private.trainer_label(ep.user_id), 'Trainer'), 'ball', ep.ball) order by coalesce(private.trainer_label(ep.user_id), 'Trainer')), '[]'::jsonb)
      into catchers from public.encounter_players ep where ep.round_id = r.id and coalesce(ep.caught, false);
  else catchers := '[]'::jsonb; end if;
  return jsonb_build_object(
    'id', r.id, 'source', r.source, 'phase', ph, 'overlayPhase', r.phase, 'paused', private.round_paused(r), 'hidden', r.hidden, 'cancelled', r.cancelled, 'resolved', r.resolved, 'pausedAt', r.paused_at,
    'pausedForBreak', private.director_has_reason(coalesce(r.pause_reasons, '[]'::jsonb), 'AD'),
    'pauseReasons', coalesce(r.pause_reasons, '[]'::jsonb),
    'triggerSource', r.trigger_source,
    'dex', r.dex, 'name', r.name, 'variant', r.variant, 'gender', r.gender, 'types', coalesce(to_jsonb(species_types), '[]'::jsonb),
    'location', coalesce(nullif(r.pokemon->>'location', ''), private.lgpe_habitat(r.dex)), 'startedAt', r.started_at, 'endsAt', private.phase_display_ends(r, ph), 'deadlines', r.deadlines,
    'participants', participants, 'prepared', prepared, 'thrown', thrown, 'honeyContributors', bait_count, 'honeyParticipants', participants,
    'honeyMultiplier', (honey_calc->>'multiplier')::numeric, 'baitBonusPercent', round(100 * ((honey_calc->>'multiplier')::numeric - 1), 1),
    'lastAction', r.last_action, 'activity', activity, 'honeyTrainers', coalesce(honey, '[]'::jsonb), 'throwers', coalesce(throwers, '[]'::jsonb), 'catchers', coalesce(catchers, '[]'::jsonb),
    'results', case when settled then (select jsonb_build_object('caught', count(*) filter (where coalesce(caught, false))::int, 'escaped', count(*) filter (where result = 'Escaped')::int, 'noThrow', count(*) filter (where coalesce(result, '') = 'No throw')::int, 'catchers', coalesce(catchers, '[]'::jsonb)) from public.encounter_players where round_id = r.id) else null end
  );
end;
$function$;

create or replace function private.director_simulate(p_hours numeric default 4, p_ad_every_min numeric default 60, p_ad_sec numeric default 180)
returns jsonb
language plpgsql
stable
as $$
declare
  cfg jsonb := private.director_config();
  t numeric := 0;
  next_enc numeric;
  next_ad numeric := p_ad_every_min;
  starts int := 0;
  delayed int := 0;
  interrupted int := 0;
  gaps numeric[] := '{}';
  last_start numeric := null;
  window_need numeric := private.director_num(cfg, 'preAdSafetySeconds', 180) / 60.0;
  enc_len numeric := (30+30+30+15+15) / 60.0;
  post_ad numeric := private.director_num(cfg, 'postAdCooldownSeconds', 30) / 60.0;
begin
  next_enc := private.director_interval_minutes(
    private.director_num(cfg, 'initialDelayMin', 8), 10, private.director_num(cfg, 'initialDelayMax', 12)
  );
  while t < p_hours * 60 loop
    if next_ad <= next_enc and next_ad <= p_hours * 60 then
      t := next_ad;
      next_ad := next_ad + p_ad_every_min;
      if last_start is not null and t < last_start + enc_len then
        interrupted := interrupted + 1;
      end if;
      next_enc := greatest(next_enc, t + (p_ad_sec / 60.0) + post_ad + 1);
    else
      if next_enc + window_need > next_ad then
        delayed := delayed + 1;
        next_enc := next_ad + (p_ad_sec / 60.0) + post_ad + 1;
      else
        starts := starts + 1;
        if last_start is not null then
          gaps := gaps || (next_enc - last_start);
        end if;
        last_start := next_enc;
        t := next_enc;
        next_enc := next_enc + private.director_interval_minutes(
          private.director_num(cfg, 'normalIntervalMin', 10),
          private.director_num(cfg, 'normalIntervalTarget', 13),
          private.director_num(cfg, 'normalIntervalMax', 16)
        );
      end if;
    end if;
    t := t + 0.25;
    if starts > 80 then exit; end if;
  end loop;
  return jsonb_build_object(
    'hours', p_hours,
    'encounters', starts,
    'delayedByAds', delayed,
    'interrupted', interrupted,
    'averageGapMinutes', case when array_length(gaps, 1) > 0 then round((select avg(g) from unnest(gaps) g)::numeric, 1) else null end
  );
end;
$$;

create or replace function public.admin_director_simulate(p_hours numeric default 4, p_ad_every_min numeric default 60, p_ad_sec numeric default 180)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not private.is_play_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return private.director_simulate(p_hours, p_ad_every_min, p_ad_sec);
end;
$$;

create or replace function private.director_self_test()
returns table(name text, passed boolean, detail text)
language plpgsql
as $$
declare
  w jsonb;
  sim jsonb;
  saved private.twitch_ad_state;
begin
  select * into saved from private.twitch_ad_state where id = 1;
  update private.twitch_ad_state
    set ad_active = true, active_expected_end_at = now() + interval '3 minutes', source = 'fallback', data_available = true, next_ad_at = now() + interval '3 minutes'
    where id = 1;
  w := private.director_safe_window('COMMON');
  name := 'auto encounter does not start while ad active';
  passed := coalesce(w->>'state','') = 'UNSAFE';
  detail := w->>'state';
  return next;

  update private.twitch_ad_state
    set ad_active = false, next_ad_at = now() + interval '2 minutes', source = 'fallback', data_available = true
    where id = 1;
  w := private.director_safe_window('COMMON');
  name := 'auto encounter does not start inside pre-ad unsafe window';
  passed := coalesce((w->>'safe')::boolean, true) is not true;
  detail := w->>'reason';
  return next;

  update private.twitch_ad_state
    set next_ad_at = now() + interval '20 minutes', ad_active = false, source = 'twitch', data_available = true, last_refresh_at = now(), stale = false
    where id = 1;
  w := private.director_safe_window('COMMON');
  name := 'auto encounter starts when safe';
  passed := coalesce((w->>'safe')::boolean, false);
  detail := w->>'state';
  return next;

  name := 'pause reasons stack without dropping AD';
  passed := private.director_has_reason('["AD","ADMIN"]'::jsonb, 'AD')
        and private.director_has_reason((('["AD","ADMIN"]'::jsonb) - 'ADMIN'), 'AD');
  detail := 'AD+ADMIN';
  return next;

  name := 'required window is at least 3 minutes';
  passed := private.director_required_window_seconds('COMMON') >= 180;
  detail := private.director_required_window_seconds('COMMON')::text;
  return next;

  name := 'legendary window is stricter';
  passed := private.director_required_window_seconds('LEGENDARY') >= private.director_required_window_seconds('COMMON');
  detail := private.director_required_window_seconds('LEGENDARY')::text;
  return next;

  sim := private.director_simulate(4, 60, 180);
  name := 'simulator returns encounter count without writing rounds';
  passed := coalesce((sim->>'encounters')::int, 0) > 0;
  detail := sim->>'encounters';
  return next;

  update private.twitch_ad_state
    set data_available = saved.data_available,
        source = saved.source,
        next_ad_at = saved.next_ad_at,
        next_ad_duration_sec = saved.next_ad_duration_sec,
        last_ad_at = saved.last_ad_at,
        ad_active = saved.ad_active,
        active_started_at = saved.active_started_at,
        active_expected_end_at = saved.active_expected_end_at,
        snooze_count = saved.snooze_count,
        snooze_refresh_at = saved.snooze_refresh_at,
        preroll_free_sec = saved.preroll_free_sec,
        last_refresh_at = saved.last_refresh_at,
        is_automatic = saved.is_automatic,
        manage_available = saved.manage_available,
        stale = saved.stale,
        updated_at = now()
    where id = 1;
end;
$$;

create or replace function public.service_director_ads_token()
returns text
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return private.director_ads_token();
end;
$$;

create or replace function public.service_director_ingest_ad_schedule(p_schedule jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return private.director_ingest_ad_schedule(p_schedule);
end;
$$;

create or replace function public.service_director_ad_begin(p_event jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return private.director_ad_begin(p_event);
end;
$$;

create or replace function public.service_director_save_ads_auth(p_token text, p_scopes text, p_manage boolean)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update private.twitch_ad_auth
    set access_token = p_token, scopes = p_scopes, connected = true, last_error = null, updated_at = now()
    where id = 1;
  update private.twitch_ad_state
    set manage_available = coalesce(p_manage, false), updated_at = now()
    where id = 1;
end;
$$;

revoke all on function private.director_ads_token() from public, anon, authenticated;
revoke all on function private.director_ingest_ad_schedule(jsonb) from public, anon, authenticated;
revoke all on function private.director_ad_begin(jsonb) from public, anon, authenticated;
revoke all on function public.service_director_ads_token() from public, anon, authenticated;
revoke all on function public.service_director_ingest_ad_schedule(jsonb) from public, anon, authenticated;
revoke all on function public.service_director_ad_begin(jsonb) from public, anon, authenticated;
revoke all on function public.service_director_save_ads_auth(text, text, boolean) from public, anon, authenticated;
grant execute on function private.director_ads_token() to service_role;
grant execute on function private.director_ingest_ad_schedule(jsonb) to service_role;
grant execute on function private.director_ad_begin(jsonb) to service_role;
grant execute on function public.service_director_ads_token() to service_role;
grant execute on function public.service_director_ingest_ad_schedule(jsonb) to service_role;
grant execute on function public.service_director_ad_begin(jsonb) to service_role;
grant execute on function public.service_director_save_ads_auth(text, text, boolean) to service_role;

update public.site_config
set game_settings = coalesce(game_settings, '{}'::jsonb) || jsonb_build_object(
  'encounterDirector', coalesce(game_settings->'encounterDirector', '{}'::jsonb) || private.director_defaults()
)
where id = 1;

revoke all on function public.admin_live_dashboard() from public, anon;
revoke all on function public.admin_director_command(text, jsonb) from public, anon;
revoke all on function public.admin_director_simulate(numeric, numeric, numeric) from public, anon;
grant execute on function public.admin_live_dashboard() to authenticated;
grant execute on function public.admin_director_command(text, jsonb) to authenticated;
grant execute on function public.admin_director_simulate(numeric, numeric, numeric) to authenticated;
grant execute on function public.play_sync(uuid) to authenticated, anon;
grant execute on function public.play_state() to authenticated, anon;
