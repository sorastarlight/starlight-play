-- Stream Encounter Director: when it is safe to start the next encounter.
-- Does not calculate catches, balls, berries, honey, or inventory rewards.

alter table public.encounter_rounds
  add column if not exists trigger_source text,
  add column if not exists pause_reasons jsonb not null default '[]'::jsonb;

create table if not exists private.stream_director (
  id int primary key default 1 check (id = 1),
  status text not null default 'OFFLINE',
  stream_mode text not null default 'NORMAL',
  auto_enabled boolean not null default true,
  rpg_session_active boolean not null default false,
  session_id uuid,
  session_started_at timestamptz,
  manual_hold boolean not null default false,
  hold_until timestamptz,
  hold_reason text,
  next_encounter_at timestamptz,
  last_encounter_started_at timestamptz,
  last_encounter_completed_at timestamptz,
  last_encounter_id uuid,
  last_encounter_source text,
  delay_reason text,
  queued jsonb,
  last_tick_at timestamptz,
  post_ad_until timestamptz,
  overdue_from timestamptz,
  encounters_auto int not null default 0,
  encounters_manual int not null default 0,
  encounters_event int not null default 0,
  encounters_delayed_ads int not null default 0,
  encounters_paused_ads int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists private.stream_sessions (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  mode text,
  note text,
  stats jsonb not null default '{}'::jsonb
);

create table if not exists private.director_events (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  action text not null,
  reason text,
  details jsonb not null default '{}'::jsonb,
  admin_id uuid
);

create table if not exists private.twitch_ad_state (
  id int primary key default 1 check (id = 1),
  data_available boolean not null default false,
  source text not null default 'unknown',
  next_ad_at timestamptz,
  next_ad_duration_sec int,
  last_ad_at timestamptz,
  ad_active boolean not null default false,
  active_started_at timestamptz,
  active_expected_end_at timestamptz,
  snooze_count int not null default 0,
  snooze_refresh_at timestamptz,
  preroll_free_sec int,
  last_refresh_at timestamptz,
  is_automatic boolean,
  manage_available boolean not null default false,
  stale boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists private.twitch_ad_auth (
  id int primary key default 1 check (id = 1),
  access_token text,
  scopes text,
  connected boolean not null default false,
  last_error text,
  updated_at timestamptz not null default now()
);

insert into private.stream_director (id) values (1) on conflict (id) do nothing;
insert into private.twitch_ad_state (id) values (1) on conflict (id) do nothing;
insert into private.twitch_ad_auth (id) values (1) on conflict (id) do nothing;

create index if not exists director_events_at_idx on private.director_events (at desc);

revoke all on private.stream_director from public, anon, authenticated;
revoke all on private.stream_sessions from public, anon, authenticated;
revoke all on private.director_events from public, anon, authenticated;
revoke all on private.twitch_ad_state from public, anon, authenticated;
revoke all on private.twitch_ad_auth from public, anon, authenticated;

create or replace function private.director_defaults()
returns jsonb
language sql
immutable
as $$
  select '{
    "encounterDirectorEnabled": true,
    "autoEncountersEnabled": true,
    "initialDelayMin": 8,
    "initialDelayMax": 12,
    "normalIntervalMin": 10,
    "normalIntervalTarget": 13,
    "normalIntervalMax": 16,
    "maxQuietMinutes": 20,
    "preAdSafetySeconds": 180,
    "postAdCooldownSeconds": 30,
    "postAdRandomDelayMin": 30,
    "postAdRandomDelayMax": 90,
    "resultBufferSeconds": 15,
    "encounterSafetyBuffer": 30,
    "pauseEncounterDuringAds": true,
    "automaticAdSnoozeEnabled": false,
    "unknownAdFallbackDuration": 180,
    "resumeGraceMin": 30,
    "resumeGraceMax": 90,
    "staleAdSeconds": 120,
    "fallbackAdScheduleEnabled": false,
    "fallbackAdEveryMinutes": 60,
    "fallbackAdDurationSeconds": 180,
    "modes": {
      "NORMAL": {"min": 10, "target": 13, "max": 16, "auto": true, "label": "Standard encounter pacing."},
      "HIGH_ACTION": {"min": 14, "target": 17, "max": 20, "auto": true, "label": "Less frequent interruptions."},
      "STORY": {"auto": false, "label": "Automatic encounters paused."},
      "REACTION": {"auto": false, "label": "Automatic encounters paused for reaction content."},
      "COLLAB": {"min": 12, "target": 15, "max": 18, "auto": true, "label": "Longer encounter spacing."},
      "BRB": {"auto": false, "label": "No new automatic encounters."},
      "SPECIAL_EVENT": {"min": 8, "target": 10, "max": 14, "auto": true, "label": "Uses event configuration."}
    }
  }'::jsonb;
$$;

create or replace function private.director_config()
returns jsonb
language plpgsql
stable
as $$
declare
  raw jsonb;
begin
  raw := coalesce(private.game_settings()->'encounterDirector', '{}'::jsonb);
  return private.director_defaults() || raw;
end;
$$;

create or replace function private.director_num(p_cfg jsonb, p_key text, p_fallback numeric)
returns numeric
language sql
immutable
as $$
  select coalesce(nullif(p_cfg->>p_key, '')::numeric, p_fallback);
$$;

create or replace function private.director_log(p_action text, p_reason text default null, p_details jsonb default '{}'::jsonb, p_admin uuid default null)
returns void
language plpgsql
as $$
begin
  insert into private.director_events (action, reason, details, admin_id)
  values (p_action, p_reason, coalesce(p_details, '{}'::jsonb), p_admin);
end;
$$;

create or replace function private.director_interval_minutes(p_min numeric, p_target numeric, p_max numeric)
returns numeric
language plpgsql
as $$
declare
  t numeric := (random() + random()) / 2.0;
  lo numeric := least(p_min, p_max);
  hi numeric := greatest(p_min, p_max);
begin
  if hi <= lo then return lo; end if;
  return lo + t * (hi - lo);
end;
$$;

create or replace function private.director_mode_cfg(p_mode text)
returns jsonb
language plpgsql
stable
as $$
declare
  cfg jsonb := private.director_config();
  mode text := upper(replace(coalesce(p_mode, 'NORMAL'), ' ', '_'));
begin
  if mode in ('HIGH-ACTION', 'HIGH_ACTION_GAMEPLAY') then mode := 'HIGH_ACTION'; end if;
  if mode in ('STORY_CUTSCENE', 'CUTSCENE') then mode := 'STORY'; end if;
  if mode in ('REACTION_DIRECT', 'DIRECT') then mode := 'REACTION'; end if;
  if mode = 'SPECIAL' then mode := 'SPECIAL_EVENT'; end if;
  return coalesce(cfg->'modes'->mode, cfg->'modes'->'NORMAL', '{}'::jsonb) || jsonb_build_object('key', mode);
end;
$$;

create or replace function private.director_required_window_seconds(p_band text default 'COMMON')
returns int
language plpgsql
stable
as $$
declare
  cfg jsonb := private.director_config();
  base int;
begin
  base := greatest(180, coalesce(private.director_num(cfg, 'preAdSafetySeconds', 180), 180)::int);
  return case upper(coalesce(p_band, 'COMMON'))
    when 'RARE' then greatest(base, 210)
    when 'VERY_RARE' then greatest(base, 240)
    when 'ULTRA_RARE' then greatest(base, 240)
    when 'SHINY' then greatest(base, 240)
    when 'LEGENDARY' then greatest(base, 300)
    when 'LEGENDARY_EVENT' then greatest(base, 300)
    else base
  end;
end;
$$;

create or replace function private.director_refresh_ad_end()
returns private.twitch_ad_state
language plpgsql
as $$
declare
  a private.twitch_ad_state;
  cfg jsonb := private.director_config();
begin
  select * into a from private.twitch_ad_state where id = 1;
  if a.ad_active and a.active_expected_end_at is not null and now() >= a.active_expected_end_at then
    update private.twitch_ad_state
      set ad_active = false,
          last_ad_at = coalesce(active_expected_end_at, now()),
          updated_at = now()
      where id = 1
      returning * into a;
    update private.stream_director
      set post_ad_until = now() + make_interval(secs => private.director_num(cfg, 'postAdCooldownSeconds', 30)),
          updated_at = now()
      where id = 1;
    perform private.director_log('POST_AD_COOLDOWN_STARTED', 'AD_ENDED', jsonb_build_object('seconds', private.director_num(cfg, 'postAdCooldownSeconds', 30)));
  end if;
  if a.last_refresh_at is null or a.last_refresh_at < now() - make_interval(secs => private.director_num(cfg, 'staleAdSeconds', 120)) then
    a.stale := a.source = 'twitch';
  else
    a.stale := false;
  end if;
  return a;
end;
$$;

create or replace function private.director_safe_window(p_band text default 'COMMON')
returns jsonb
language plpgsql
as $$
declare
  a private.twitch_ad_state;
  need int := private.director_required_window_seconds(p_band);
  until_ad int;
  state text := 'UNKNOWN';
  reason text := 'Twitch ad schedule unavailable.';
begin
  a := private.director_refresh_ad_end();
  if a.ad_active then
    return jsonb_build_object(
      'state', 'UNSAFE', 'safe', false, 'reason', 'Twitch ad break is active.',
      'requiredSeconds', need, 'secondsUntilAd', 0, 'nextAdAt', a.next_ad_at, 'source', a.source, 'stale', a.stale
    );
  end if;
  if a.next_ad_at is null then
    if a.data_available and a.source = 'twitch' then
      state := 'SAFE';
      reason := 'No upcoming ad on the current Twitch schedule.';
      until_ad := 86400;
    else
      state := 'UNKNOWN';
      reason := 'Twitch ad schedule unavailable.';
      until_ad := null;
    end if;
  else
    until_ad := greatest(0, floor(extract(epoch from (a.next_ad_at - now())))::int);
    if until_ad < need then
      state := 'UNSAFE';
      reason := format('Next Twitch ad begins in %s.', private.director_clock(until_ad));
    elsif until_ad < need + 60 then
      state := 'SHORT';
      reason := 'Manual encounter may be interrupted.';
    else
      state := 'SAFE';
      reason := 'Enough time for a full encounter.';
    end if;
  end if;
  return jsonb_build_object(
    'state', state,
    'safe', state = 'SAFE',
    'reason', reason,
    'requiredSeconds', need,
    'availableSeconds', until_ad,
    'secondsUntilAd', until_ad,
    'nextAdAt', a.next_ad_at,
    'source', a.source,
    'stale', a.stale
  );
end;
$$;

create or replace function private.director_clock(p_seconds int)
returns text
language plpgsql
immutable
as $$
declare
  s int := greatest(0, coalesce(p_seconds, 0));
begin
  if s >= 3600 then
    return format('%sh %sm', s / 3600, (s % 3600) / 60);
  end if;
  if s >= 60 then
    return format('%sm %ss', s / 60, s % 60);
  end if;
  return format('%ss', s);
end;
$$;

create or replace function private.director_has_reason(p_reasons jsonb, p_reason text)
returns boolean
language sql
immutable
as $$
  select coalesce(p_reasons, '[]'::jsonb) ? p_reason;
$$;

create or replace function private.director_pause_round(p_round uuid, p_reason text, p_message text)
returns void
language plpgsql
as $$
declare
  r public.encounter_rounds;
  reasons jsonb;
begin
  select * into r from public.encounter_rounds where id = p_round;
  if r is null or r.cancelled or r.resolved or not private.round_is_active(r) then
    return;
  end if;
  reasons := coalesce(r.pause_reasons, '[]'::jsonb);
  if private.director_has_reason(reasons, p_reason) and r.paused_at is not null then
    return;
  end if;
  if not private.director_has_reason(reasons, p_reason) then
    reasons := reasons || jsonb_build_array(p_reason);
  end if;
  update public.encounter_rounds
    set pause_reasons = reasons,
        paused_at = coalesce(paused_at, now()),
        last_action = coalesce(p_message, 'Encounter paused'),
        updated_at = now()
    where id = r.id;
  if p_reason = 'AD' then
    perform private.staff_console(r.id, 'pause', null, 'The encounter has been paused for a Twitch ad break.');
    update private.stream_director set encounters_paused_ads = encounters_paused_ads + 1, updated_at = now() where id = 1;
  else
    perform private.staff_console(r.id, 'pause', null, coalesce(p_message, 'Encounter paused.'));
  end if;
  perform private.director_log('ENCOUNTER_PAUSED', p_reason, jsonb_build_object('roundId', r.id, 'phase', private.round_phase(r)));
end;
$$;

create or replace function private.director_resume_round(p_round uuid, p_reason text)
returns void
language plpgsql
as $$
declare
  r public.encounter_rounds;
  reasons jsonb;
  delta interval;
begin
  select * into r from public.encounter_rounds where id = p_round;
  if r is null or r.paused_at is null then
    return;
  end if;
  reasons := coalesce(r.pause_reasons, '[]'::jsonb) - p_reason;
  if reasons <> '[]'::jsonb then
    update public.encounter_rounds
      set pause_reasons = reasons, updated_at = now()
      where id = r.id;
    return;
  end if;
  delta := now() - r.paused_at;
  update public.encounter_rounds
    set deadlines = jsonb_build_object(
          'join', (deadlines->>'join')::timestamptz + delta,
          'prepare', (deadlines->>'prepare')::timestamptz + delta,
          'throw', (deadlines->>'throw')::timestamptz + delta,
          'reveal', (deadlines->>'reveal')::timestamptz + delta
        ),
        ends_at = ends_at + delta,
        paused_at = null,
        pause_reasons = '[]'::jsonb,
        last_action = 'The encounter is resuming!',
        updated_at = now()
    where id = r.id;
  perform private.staff_console(r.id, 'resume', null, 'The encounter is resuming!');
  perform private.director_log('ENCOUNTER_RESUMED', p_reason, jsonb_build_object('roundId', r.id));
end;
$$;

create or replace function private.director_active_round()
returns public.encounter_rounds
language plpgsql
as $$
declare
  r public.encounter_rounds;
begin
  r := private.sync_latest_round();
  if private.round_is_active(r) then
    return r;
  end if;
  return null;
end;
$$;

create or replace function private.launch_community_round(
  p_dex int,
  p_gender text,
  p_shiny boolean,
  p_source text,
  p_test boolean default false
)
returns public.encounter_rounds
language plpgsql
as $$
declare
  r public.encounter_rounds;
  settings jsonb;
  chosen_dex int;
  chosen_name text;
  chosen_variant text := 'normal';
  chosen_gender text;
  t timestamptz := now();
  deadlines jsonb;
begin
  r := private.sync_latest_round();
  if private.round_is_active(r) then
    raise exception 'A community round is already running.';
  end if;
  settings := private.game_settings();
  if p_dex is null then
    chosen_dex := floor(random() * 151 + 1)::int;
  else
    chosen_dex := p_dex;
  end if;
  if chosen_dex < 1 or chosen_dex > 151 then
    raise exception 'Choose a Pokédex number from 1 to 151.';
  end if;
  select name into chosen_name from public.species where dex = chosen_dex;
  if p_gender in ('Male', 'Female', 'Genderless') then
    chosen_gender := p_gender;
  else
    chosen_gender := private.lgpe_roll_gender(chosen_dex, floor(random() * 2147483647)::int, null);
  end if;
  if p_shiny is true then
    chosen_variant := case when chosen_gender = 'Female' then 'shiny-female' else 'shiny' end;
  elsif p_shiny is false then
    chosen_variant := case when chosen_gender = 'Female' then 'female' else 'normal' end;
  elsif random() < (1.0 / 4096.0) then
    chosen_variant := case when chosen_gender = 'Female' then 'shiny-female' else 'shiny' end;
  else
    chosen_variant := case when chosen_gender = 'Female' then 'female' else 'normal' end;
  end if;
  deadlines := private.round_deadlines(settings, t);
  insert into public.encounter_rounds (
    phase, hidden, pokemon, dex, name, variant, gender, started_at, deadlines, rules, resolved, cancelled, last_action, ends_at, trigger_source, source
  ) values (
    'join', false,
    jsonb_build_object('dex', chosen_dex, 'name', chosen_name, 'variant', chosen_variant, 'gender', chosen_gender, 'location', private.lgpe_habitat(chosen_dex)),
    chosen_dex, chosen_name, chosen_variant, chosen_gender, t, deadlines, settings, false, false,
    chosen_name || ' appeared!',
    (deadlines->>'join')::timestamptz,
    p_source,
    case when p_test then 'test' else coalesce(p_source, 'director') end
  ) returning * into r;
  return r;
end;
$$;

create or replace function private.director_schedule_next(p_kind text default 'normal')
returns timestamptz
language plpgsql
as $$
declare
  d private.stream_director;
  cfg jsonb := private.director_config();
  mode jsonb;
  mins numeric;
  at timestamptz;
begin
  select * into d from private.stream_director where id = 1;
  mode := private.director_mode_cfg(d.stream_mode);
  if p_kind = 'first' then
    mins := private.director_interval_minutes(
      private.director_num(cfg, 'initialDelayMin', 8),
      10,
      private.director_num(cfg, 'initialDelayMax', 12)
    );
  elsif p_kind = 'grace' then
    mins := private.director_interval_minutes(
      private.director_num(cfg, 'resumeGraceMin', 30) / 60.0,
      1,
      private.director_num(cfg, 'resumeGraceMax', 90) / 60.0
    );
  elsif p_kind = 'post_ad' then
    mins := (
      private.director_num(cfg, 'postAdCooldownSeconds', 30)
      + private.director_interval_minutes(
          private.director_num(cfg, 'postAdRandomDelayMin', 30) / 60.0,
          1,
          private.director_num(cfg, 'postAdRandomDelayMax', 90) / 60.0
        ) * 60
    ) / 60.0;
  else
    mins := private.director_interval_minutes(
      coalesce((mode->>'min')::numeric, private.director_num(cfg, 'normalIntervalMin', 10)),
      coalesce((mode->>'target')::numeric, private.director_num(cfg, 'normalIntervalTarget', 13)),
      coalesce((mode->>'max')::numeric, private.director_num(cfg, 'normalIntervalMax', 16))
    );
  end if;
  at := now() + make_interval(secs => (mins * 60));
  update private.stream_director
    set next_encounter_at = at, overdue_from = null, updated_at = now()
    where id = 1;
  return at;
end;
$$;

create or replace function private.director_start_now(
  p_dex int,
  p_gender text,
  p_shiny boolean,
  p_source text,
  p_test boolean default false
)
returns public.encounter_rounds
language plpgsql
as $$
declare
  r public.encounter_rounds;
  d private.stream_director;
begin
  r := private.launch_community_round(p_dex, p_gender, p_shiny, p_source, p_test);
  select * into d from private.stream_director where id = 1;
  update private.stream_director
    set last_encounter_started_at = now(),
        last_encounter_id = r.id,
        last_encounter_source = p_source,
        queued = case when p_test then queued else null end,
        encounters_auto = encounters_auto + case when p_source = 'AUTO' then 1 else 0 end,
        encounters_manual = encounters_manual + case when p_source in ('ADMIN', 'ADMIN_SPECIFIC') then 1 else 0 end,
        encounters_event = encounters_event + case when p_source = 'QUEUED_SPECIAL' then 1 else 0 end,
        updated_at = now()
    where id = 1;
  if not p_test then
    perform private.director_schedule_next('normal');
  end if;
  perform private.director_log(
    'AUTO_ENCOUNTER_STARTED',
    p_source,
    jsonb_build_object('roundId', r.id, 'dex', r.dex, 'name', r.name, 'variant', r.variant, 'test', p_test)
  );
  return r;
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
  mode jsonb;
  safe_win jsonb;
  status text;
  reason text;
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
  select coalesce(is_live, false) into live from public.stream_status where id = 1;
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
    status := 'OFFLINE';
    reason := 'OFFLINE';
  elsif a.ad_active then
    status := 'AD_ACTIVE';
    reason := 'AD_ACTIVE';
  elsif r is not null then
    status := 'ENCOUNTER_ACTIVE';
    reason := 'ACTIVE_ENCOUNTER';
  elsif d.manual_hold then
    status := 'MANUAL_HOLD';
    reason := 'MANUAL_HOLD';
  elsif d.post_ad_until is not null and now() < d.post_ad_until then
    status := 'POST_AD_COOLDOWN';
    reason := 'POST_AD_COOLDOWN';
  elsif d.post_ad_until is not null and now() >= d.post_ad_until and d.overdue_from is not null then
    update private.stream_director set post_ad_until = null, updated_at = now() where id = 1;
    perform private.director_schedule_next('grace');
    status := 'WAITING_FOR_NEXT_ENCOUNTER';
    reason := 'NOT_DUE';
  elsif coalesce(mode->>'auto', 'true') <> 'true' then
    status := 'MANUAL_HOLD';
    reason := 'STREAM_MODE';
  elsif not d.auto_enabled or coalesce((cfg->>'autoEncountersEnabled')::boolean, true) is not true then
    status := 'MANUAL_HOLD';
    reason := 'MANUAL_HOLD';
  elsif d.queued is not null then
    band := case when d.queued->>'kind' = 'SPECIAL' then 'LEGENDARY_EVENT' else 'COMMON' end;
    safe_win := private.director_safe_window(band);
    if coalesce((safe_win->>'safe')::boolean, false) is not true then
      status := 'AD_PENDING';
      reason := case when safe_win->>'state' = 'UNSAFE' then 'UPCOMING_AD' else 'UNKNOWN_AD' end;
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
      perform private.director_log('AUTO_ENCOUNTER_DELAYED', reason, safe_win);
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
        status := 'ENCOUNTER_ACTIVE';
        reason := 'QUEUED_SPECIAL';
      else
        r := private.director_start_now(null, null, null, 'AUTO', false);
        status := 'ENCOUNTER_ACTIVE';
        reason := 'QUEUED_RANDOM';
      end if;
    end if;
  elsif d.next_encounter_at is null then
    perform private.director_schedule_next(case when d.session_started_at is null then 'first' else 'normal' end);
    status := 'WAITING_FOR_NEXT_ENCOUNTER';
    reason := 'NOT_DUE';
  elsif now() < d.next_encounter_at then
    status := 'WAITING_FOR_NEXT_ENCOUNTER';
    reason := 'NOT_DUE';
  else
    safe_win := private.director_safe_window(band);
    if coalesce((safe_win->>'safe')::boolean, false) is not true then
      status := 'AD_PENDING';
      reason := case when safe_win->>'state' = 'UNSAFE' then 'UPCOMING_AD' else 'UNKNOWN_AD' end;
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
      perform private.director_log('AUTO_ENCOUNTER_DELAYED', reason, safe_win);
    elsif d.auto_enabled and coalesce(mode->>'auto', 'true') = 'true' then
      r := private.director_start_now(null, null, null, 'AUTO', false);
      status := 'ENCOUNTER_ACTIVE';
      reason := 'AUTO';
    else
      status := 'WAITING_FOR_NEXT_ENCOUNTER';
      reason := 'NOT_DUE';
    end if;
  end if;

  update private.stream_director
    set status = status,
        delay_reason = reason,
        last_tick_at = now(),
        updated_at = now()
    where id = 1;

  return jsonb_build_object('status', status, 'reason', reason, 'roundId', r.id);
end;
$$;

create or replace function private.director_tick_if_due()
returns void
language plpgsql
as $$
declare
  last timestamptz;
begin
  select last_tick_at into last from private.stream_director where id = 1;
  if last is null or last < now() - interval '10 seconds' then
    perform private.director_tick();
  end if;
end;
$$;

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
    when 'QUEUED_SPECIAL' then 'A special encounter is queued for the next safe window.'
    when 'NO_ELIGIBLE_PLAYERS' then 'No eligible Trainers are present.'
    when 'UNKNOWN_AD' then 'Twitch ad information is unavailable.'
    else coalesce(p_reason, 'Waiting.')
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
  select coalesce(is_live, false) into live from public.stream_status where id = 1;
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
      'eventSub', case when a.source = 'twitch' then 'Polling + EventSub ready' else 'Not subscribed for ads' end,
      'streamSession', case when d.rpg_session_active then 'Active' when live then 'Twitch live, RPG session idle' else 'Idle' end
    ),
    'recentEncounters', hist,
    'recentDirectorEvents', logs,
    'permissions', jsonb_build_object('control', true)
  );
end;
$$;
