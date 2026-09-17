-- Phase 10: Special Encounter events. Reuses Phase 1 JOIN→PREPARE→THROW→RESULT.
-- Does not change Phase 9 capture odds or ordinary spawn weights.

create table if not exists private.special_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  dex integer not null check (dex between 1 and 151),
  variant_policy text not null default 'NORMAL_ROLL',
  location_key text,
  location_label text,
  title text not null,
  subtitle text,
  announcement text,
  starts_at timestamptz,
  ends_at timestamptz,
  encounter_count integer not null default 1 check (encounter_count between 1 and 12),
  rounds_launched integer not null default 0,
  last_round_id uuid,
  last_round_at timestamptz,
  next_round_at timestamptz,
  auto_advance boolean not null default true,
  eligibility jsonb not null default '{"mode":"all_signed_in"}'::jsonb,
  visibility text not null default 'PUBLIC',
  presentation jsonb not null default '{}'::jsonb,
  status text not null default 'DRAFT',
  repeat_policy text not null default 'ADMIN',
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  notes text,
  constraint special_events_type_chk check (event_type in (
    'LEGENDARY', 'MYTHICAL', 'SPECIAL', 'CELEBRATION', 'SEASONAL', 'COMMUNITY', 'ADMIN_TEST'
  )),
  constraint special_events_variant_chk check (variant_policy in (
    'NORMAL_ROLL', 'DISABLED', 'FORCED_SHINY'
  )),
  constraint special_events_vis_chk check (visibility in ('PUBLIC', 'HIDDEN')),
  constraint special_events_status_chk check (status in (
    'DRAFT', 'SCHEDULED', 'LIVE', 'WAITING_FOR_STREAM', 'NEEDS_ADMIN', 'COMPLETED', 'CANCELLED'
  )),
  constraint special_events_repeat_chk check (repeat_policy in (
    'ADMIN', 'SEASONAL', 'ROTATION', 'ANNIVERSARY'
  ))
);

create unique index if not exists special_events_one_live
  on private.special_events ((true))
  where status = 'LIVE';

create index if not exists special_events_status_starts
  on private.special_events (status, starts_at);

create table if not exists private.special_event_rounds (
  event_id uuid not null references private.special_events(id) on delete cascade,
  round_id uuid not null,
  round_index integer not null,
  started_at timestamptz not null default now(),
  primary key (event_id, round_index),
  unique (round_id)
);

revoke all on private.special_events from public, anon, authenticated;
revoke all on private.special_event_rounds from public, anon, authenticated;

create or replace function private.special_event_preset(p_dex int)
returns jsonb
language plpgsql
stable
as $$
declare
  nm text;
  legendary boolean;
  mythical boolean;
begin
  select s.name, s.is_legendary, coalesce(s.mythical, false)
    into nm, legendary, mythical
    from public.species s where s.dex = p_dex;
  if nm is null then
    raise exception 'Unknown species.';
  end if;
  if p_dex = 144 then
    return jsonb_build_object(
      'eventType', 'LEGENDARY', 'variantPolicy', 'NORMAL_ROLL', 'visibility', 'PUBLIC',
      'title', 'THE FROZEN LEGEND AWAKENS', 'subtitle', nm,
      'announcement', 'A Legendary encounter is scheduled. Join during the stream to participate.',
      'locationKey', 'seafoam-islands', 'locationLabel', 'Seafoam Islands',
      'encounterCount', 3, 'repeatPolicy', 'SEASONAL'
    );
  elsif p_dex = 145 then
    return jsonb_build_object(
      'eventType', 'LEGENDARY', 'variantPolicy', 'NORMAL_ROLL', 'visibility', 'PUBLIC',
      'title', 'THE STORM CALLS', 'subtitle', nm,
      'announcement', 'A Legendary encounter is scheduled. Join during the stream to participate.',
      'locationKey', 'power-plant', 'locationLabel', 'Power Plant',
      'encounterCount', 3, 'repeatPolicy', 'SEASONAL'
    );
  elsif p_dex = 146 then
    return jsonb_build_object(
      'eventType', 'LEGENDARY', 'variantPolicy', 'NORMAL_ROLL', 'visibility', 'PUBLIC',
      'title', 'THE SKY BURNS', 'subtitle', nm,
      'announcement', 'A Legendary encounter is scheduled. Join during the stream to participate.',
      'locationKey', 'victory-road', 'locationLabel', 'Victory Road',
      'encounterCount', 3, 'repeatPolicy', 'SEASONAL'
    );
  elsif p_dex = 150 then
    return jsonb_build_object(
      'eventType', 'LEGENDARY', 'variantPolicy', 'NORMAL_ROLL', 'visibility', 'PUBLIC',
      'title', 'THE CAVE STIRS', 'subtitle', nm,
      'announcement', 'A Legendary encounter is scheduled. Join during the stream to participate.',
      'locationKey', 'cerulean-cave', 'locationLabel', 'Cerulean Cave',
      'encounterCount', 3, 'repeatPolicy', 'SEASONAL'
    );
  elsif p_dex = 151 then
    return jsonb_build_object(
      'eventType', 'MYTHICAL', 'variantPolicy', 'NORMAL_ROLL', 'visibility', 'HIDDEN',
      'title', 'A MYTH RETURNS', 'subtitle', nm,
      'announcement', 'A special stream moment is being prepared.',
      'locationKey', 'faraway-place', 'locationLabel', 'Faraway place',
      'encounterCount', 1, 'repeatPolicy', 'ANNIVERSARY'
    );
  elsif mythical then
    return jsonb_build_object(
      'eventType', 'MYTHICAL', 'variantPolicy', 'NORMAL_ROLL', 'visibility', 'HIDDEN',
      'title', 'MYTHICAL ENCOUNTER', 'subtitle', nm,
      'announcement', 'A special stream moment is being prepared.',
      'locationKey', null, 'locationLabel', private.lgpe_habitat(p_dex),
      'encounterCount', 1, 'repeatPolicy', 'ADMIN'
    );
  elsif legendary then
    return jsonb_build_object(
      'eventType', 'LEGENDARY', 'variantPolicy', 'NORMAL_ROLL', 'visibility', 'PUBLIC',
      'title', 'LEGENDARY ENCOUNTER', 'subtitle', nm,
      'announcement', 'A Legendary encounter is scheduled. Join during the stream to participate.',
      'locationKey', null, 'locationLabel', private.lgpe_habitat(p_dex),
      'encounterCount', 3, 'repeatPolicy', 'SEASONAL'
    );
  else
    return jsonb_build_object(
      'eventType', 'SPECIAL', 'variantPolicy', 'NORMAL_ROLL', 'visibility', 'PUBLIC',
      'title', 'SPECIAL ENCOUNTER', 'subtitle', nm,
      'announcement', 'A special encounter is scheduled.',
      'locationKey', null, 'locationLabel', private.lgpe_habitat(p_dex),
      'encounterCount', 1, 'repeatPolicy', 'ADMIN'
    );
  end if;
end;
$$;

create or replace function private.kanto_availability_json()
returns jsonb
language sql
stable
as $$
  with bands as (
    select s.dex, s.name, private.spawn_band(s.dex) as band, s.is_legendary, coalesce(s.mythical, false) as mythical
    from public.species s
    where s.dex between 1 and 151
  )
  select jsonb_build_object(
    'normal', coalesce((
      select jsonb_agg(jsonb_build_object('dex', dex, 'name', name, 'band', band) order by dex)
      from bands where band not in ('LEGENDARY', 'EVENT')
    ), '[]'::jsonb),
    'evolutionOnly', '[]'::jsonb,
    'special', coalesce((
      select jsonb_agg(jsonb_build_object('dex', dex, 'name', name, 'band', band, 'mythical', mythical) order by dex)
      from bands where band in ('LEGENDARY', 'EVENT')
    ), '[]'::jsonb),
    'unavailable', '[]'::jsonb,
    'counts', jsonb_build_object(
      'normal', (select count(*) from bands where band not in ('LEGENDARY', 'EVENT')),
      'evolutionOnly', 0,
      'special', (select count(*) from bands where band in ('LEGENDARY', 'EVENT')),
      'unavailable', 0,
      'total', 151
    )
  );
$$;

create or replace function private.special_event_admin_json(e private.special_events)
returns jsonb
language plpgsql
stable
as $$
declare
  nm text;
  remaining int;
  live_conflict uuid;
begin
  select name into nm from public.species where dex = e.dex;
  remaining := greatest(e.encounter_count - e.rounds_launched, 0);
  select id into live_conflict
    from private.special_events
   where status = 'LIVE' and id is distinct from e.id
   limit 1;
  return jsonb_build_object(
    'id', e.id,
    'eventType', e.event_type,
    'dex', e.dex,
    'name', nm,
    'variantPolicy', e.variant_policy,
    'locationKey', e.location_key,
    'locationLabel', coalesce(e.location_label, private.lgpe_habitat(e.dex)),
    'title', e.title,
    'subtitle', e.subtitle,
    'announcement', e.announcement,
    'startsAt', e.starts_at,
    'endsAt', e.ends_at,
    'encounterCount', e.encounter_count,
    'roundsLaunched', e.rounds_launched,
    'remainingRounds', remaining,
    'lastRoundId', e.last_round_id,
    'lastRoundAt', e.last_round_at,
    'nextRoundAt', e.next_round_at,
    'autoAdvance', e.auto_advance,
    'eligibility', e.eligibility,
    'visibility', e.visibility,
    'presentation', e.presentation,
    'status', e.status,
    'repeatPolicy', e.repeat_policy,
    'createdBy', e.created_by,
    'createdAt', e.created_at,
    'updatedAt', e.updated_at,
    'notes', e.notes,
    'serverNow', now(),
    'collision', live_conflict,
    'availability', case
      when private.spawn_band(e.dex) in ('LEGENDARY', 'EVENT') then 'SPECIAL'
      else 'NORMAL'
    end
  );
end;
$$;

create or replace function private.special_event_public_card(e private.special_events, p_admin boolean default false)
returns jsonb
language plpgsql
stable
as $$
declare
  nm text;
  remaining int;
  mine jsonb;
  uid uuid := auth.uid();
begin
  if e.id is null then
    return null;
  end if;
  if not p_admin and e.visibility = 'HIDDEN' and e.rounds_launched < 1 then
    return null;
  end if;
  select name into nm from public.species where dex = e.dex;
  remaining := greatest(e.encounter_count - e.rounds_launched, 0);
  if uid is not null then
    select jsonb_build_object(
      'participated', count(*) > 0,
      'caught', count(*) filter (where coalesce(ep.caught, false)) > 0,
      'escaped', count(*) filter (where ep.result = 'Escaped') > 0
    ) into mine
    from private.special_event_rounds ser
    join public.encounter_players ep on ep.round_id = ser.round_id and ep.user_id = uid
    where ser.event_id = e.id;
  end if;
  return jsonb_build_object(
    'id', e.id,
    'eventType', e.event_type,
    'status', e.status,
    'title', e.title,
    'subtitle', case when not p_admin and e.visibility = 'HIDDEN' and e.rounds_launched < 1 then null else e.subtitle end,
    'announcement', e.announcement,
    'dex', e.dex,
    'name', nm,
    'locationLabel', coalesce(e.location_label, private.lgpe_habitat(e.dex)),
    'locationKey', e.location_key,
    'startsAt', e.starts_at,
    'endsAt', e.ends_at,
    'remainingRounds', remaining,
    'roundsLaunched', e.rounds_launched,
    'encounterCount', e.encounter_count,
    'visibility', e.visibility,
    'repeatPolicy', e.repeat_policy,
    'serverNow', now(),
    'mine', coalesce(mine, jsonb_build_object('participated', false, 'caught', false, 'escaped', false))
  );
end;
$$;

create or replace function private.special_event_round_meta(e private.special_events)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'id', e.id,
    'eventType', e.event_type,
    'title', e.title,
    'subtitle', e.subtitle,
    'variantPolicy', e.variant_policy,
    'locationKey', e.location_key,
    'remainingRounds', greatest(e.encounter_count - e.rounds_launched - 1, 0),
    'roundIndex', e.rounds_launched + 1,
    'encounterCount', e.encounter_count,
    'visibility', e.visibility
  );
$$;

create or replace function private.launch_community_round(
  p_dex integer,
  p_gender text,
  p_shiny boolean,
  p_source text,
  p_test boolean default false
)
returns encounter_rounds
language plpgsql
as $function$
declare
  r public.encounter_rounds;
  settings jsonb;
  chosen_dex int;
  chosen_name text;
  chosen_variant text := 'normal';
  chosen_gender text;
  chosen_level int;
  round_id uuid := gen_random_uuid();
  t timestamptz := now();
  deadlines jsonb;
  female_look boolean;
  test_out text;
  loc text;
  sev jsonb;
  vpol text;
begin
  r := private.sync_latest_round();
  if private.round_is_active(r) then
    raise exception 'A community round is already running.';
  end if;
  if exists (select 1 from private.special_events where status = 'LIVE')
     and nullif(current_setting('play.special_event_id', true), '') is null
     and coalesce(p_source, '') is distinct from 'TEST' then
    raise exception 'A Special Event is live. Normal encounters cannot overwrite it.';
  end if;
  settings := private.game_settings();
  if p_test then
    settings := coalesce(settings, '{}'::jsonb) || jsonb_build_object(
      'rewardMode', 'test',
      'testMode', true,
      'joinSeconds', 6,
      'prepareSeconds', 6,
      'throwSeconds', 6,
      'revealSeconds', 8
    );
    test_out := nullif(btrim(current_setting('play.test_outcome', true)), '');
    if test_out in ('catch', 'escape') then
      settings := settings || jsonb_build_object('testOutcome', test_out);
    end if;
    if current_setting('play.test_rewards', true) = 'true' then
      settings := settings || jsonb_build_object('testRewards', true);
    end if;
  end if;
  if p_dex is null then
    chosen_dex := private.spawn_pick_random_dex();
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
  female_look := chosen_gender = 'Female' and chosen_dex = any (private.female_visual_dex());
  vpol := upper(coalesce(nullif(current_setting('play.special_variant_policy', true), ''), ''));
  if vpol = 'FORCED_SHINY' then
    p_shiny := true;
  elsif vpol = 'DISABLED' then
    p_shiny := false;
  end if;
  if p_shiny is true then
    chosen_variant := case when female_look then 'shiny-female' else 'shiny' end;
  elsif p_shiny is false then
    chosen_variant := case when female_look then 'female' else 'normal' end;
  elsif random() < (1.0 / 4096.0) then
    chosen_variant := case when female_look then 'shiny-female' else 'shiny' end;
  else
    chosen_variant := case when female_look then 'female' else 'normal' end;
  end if;
  loc := coalesce(nullif(current_setting('play.special_location', true), ''), private.lgpe_habitat(chosen_dex));
  begin
    sev := nullif(current_setting('play.special_event_json', true), '')::jsonb;
  exception when others then
    sev := null;
  end;
  if sev is not null then
    settings := coalesce(settings, '{}'::jsonb) || jsonb_build_object('specialEvent', sev);
  end if;
  deadlines := private.round_deadlines(settings, t);
  chosen_level := private.encounter_pokemon_level(chosen_dex, round_id);
  insert into public.encounter_rounds (
    id, phase, hidden, pokemon, dex, name, variant, gender, started_at, deadlines, rules, resolved, cancelled, last_action, ends_at, trigger_source, source
  ) values (
    round_id, 'join', false,
    jsonb_build_object('dex', chosen_dex, 'name', chosen_name, 'variant', chosen_variant, 'gender', chosen_gender, 'location', loc, 'level', chosen_level),
    chosen_dex, chosen_name, chosen_variant, chosen_gender, t, deadlines, settings, false, false,
    case when p_test then '[TEST MODE] ' else '' end || chosen_name || ' appeared!',
    (deadlines->>'join')::timestamptz,
    p_source,
    'play'
  ) returning * into r;
  return r;
end;
$function$;

create or replace function private.director_start_now(
  p_dex integer,
  p_gender text,
  p_shiny boolean,
  p_source text,
  p_test boolean default false
)
returns encounter_rounds
language plpgsql
as $function$
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
        encounters_event = encounters_event + case when p_source in ('QUEUED_SPECIAL', 'SPECIAL_EVENT') then 1 else 0 end,
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
$function$;

create or replace function private.special_event_start_round(p_id uuid)
returns public.encounter_rounds
language plpgsql
as $$
declare
  e private.special_events;
  r public.encounter_rounds;
  next_index int;
  shiny boolean;
  loc text;
begin
  if not pg_try_advisory_xact_lock(hashtextextended(p_id::text, 10)) then
    raise exception 'This Special Event is already starting.';
  end if;
  select * into e from private.special_events where id = p_id for update;
  if e.id is null then
    raise exception 'Special Event not found.';
  end if;
  if e.status in ('CANCELLED', 'COMPLETED', 'DRAFT') then
    raise exception 'This Special Event cannot start rounds in status %.', e.status;
  end if;
  if exists (select 1 from private.special_events where status = 'LIVE' and id is distinct from e.id) then
    raise exception 'Another Special Event is already live.';
  end if;
  if private.director_active_round() is not null then
    raise exception 'An encounter is already active.';
  end if;
  next_index := e.rounds_launched + 1;
  if next_index > e.encounter_count then
    raise exception 'All encounters for this event have already started.';
  end if;
  if exists (select 1 from private.special_event_rounds where event_id = e.id and round_index = next_index) then
    raise exception 'This event round already started.';
  end if;
  loc := coalesce(e.location_label, private.lgpe_habitat(e.dex));
  perform set_config('play.special_event_id', e.id::text, true);
  perform set_config('play.special_variant_policy', e.variant_policy, true);
  perform set_config('play.special_location', loc, true);
  perform set_config('play.special_event_json', private.special_event_round_meta(e)::text, true);
  shiny := case e.variant_policy
    when 'FORCED_SHINY' then true
    when 'DISABLED' then false
    else null
  end;
  r := private.director_start_now(
    e.dex,
    null,
    shiny,
    'SPECIAL_EVENT',
    e.event_type = 'ADMIN_TEST'
  );
  insert into private.special_event_rounds (event_id, round_id, round_index)
  values (e.id, r.id, next_index);
  update private.special_events
     set rounds_launched = next_index,
         last_round_id = r.id,
         last_round_at = now(),
         next_round_at = null,
         status = 'LIVE',
         updated_at = now()
   where id = e.id;
  perform private.director_log(
    'SPECIAL_EVENT_ROUND',
    e.event_type,
    jsonb_build_object('eventId', e.id, 'roundId', r.id, 'roundIndex', next_index, 'dex', e.dex)
  );
  return r;
end;
$$;

create or replace function private.special_event_complete_if_done(p_id uuid)
returns void
language plpgsql
as $$
declare
  e private.special_events;
  active boolean;
begin
  select * into e from private.special_events where id = p_id for update;
  if e.id is null or e.status not in ('LIVE', 'WAITING_FOR_STREAM') then
    return;
  end if;
  active := private.director_active_round() is not null;
  if e.rounds_launched >= e.encounter_count and not active then
    update private.special_events
       set status = 'COMPLETED', next_round_at = null, updated_at = now()
     where id = e.id;
  elsif e.ends_at is not null and now() >= e.ends_at and not active and e.rounds_launched >= 1 then
    update private.special_events
       set status = 'COMPLETED', next_round_at = null, updated_at = now()
     where id = e.id;
  end if;
end;
$$;

create or replace function private.special_event_director_tick(p_live boolean)
returns jsonb
language plpgsql
as $$
declare
  e private.special_events;
  r public.encounter_rounds;
  active public.encounter_rounds;
begin
  active := private.director_active_round();

  update private.special_events
     set status = 'WAITING_FOR_STREAM', updated_at = now()
   where status = 'SCHEDULED'
     and starts_at is not null
     and starts_at <= now()
     and p_live is not true;

  update private.special_events
     set status = 'NEEDS_ADMIN', updated_at = now()
   where status = 'WAITING_FOR_STREAM'
     and ends_at is not null
     and ends_at < now()
     and rounds_launched = 0;

  select * into e
    from private.special_events
   where status = 'LIVE'
   order by updated_at desc
   limit 1;

  if e.id is null then
    select * into e
      from private.special_events
     where status in ('SCHEDULED', 'WAITING_FOR_STREAM')
       and starts_at is not null
       and starts_at <= now()
     order by starts_at
     limit 1;
  end if;

  if e.id is null then
    return jsonb_build_object('blockAuto', false);
  end if;

  if e.status in ('SCHEDULED', 'WAITING_FOR_STREAM') then
    if p_live is not true then
      if e.status is distinct from 'WAITING_FOR_STREAM' then
        update private.special_events set status = 'WAITING_FOR_STREAM', updated_at = now() where id = e.id;
      end if;
      return jsonb_build_object(
        'blockAuto', true,
        'status', 'WAITING_FOR_STREAM',
        'reason', 'SPECIAL_EVENT_OFFLINE',
        'eventId', e.id
      );
    end if;
    if active is not null then
      return jsonb_build_object(
        'blockAuto', true,
        'status', 'ENCOUNTER_ACTIVE',
        'reason', 'ACTIVE_ENCOUNTER',
        'eventId', e.id
      );
    end if;
    begin
      r := private.special_event_start_round(e.id);
      return jsonb_build_object(
        'blockAuto', true,
        'status', 'ENCOUNTER_ACTIVE',
        'reason', 'SPECIAL_EVENT',
        'eventId', e.id,
        'roundId', r.id
      );
    exception when others then
      return jsonb_build_object(
        'blockAuto', true,
        'status', 'NEEDS_ADMIN',
        'reason', 'SPECIAL_EVENT_START_FAILED',
        'eventId', e.id,
        'detail', sqlerrm
      );
    end;
  end if;

  perform private.special_event_complete_if_done(e.id);
  select * into e from private.special_events where id = e.id;

  if e.status = 'COMPLETED' then
    return jsonb_build_object('blockAuto', false, 'status', 'COMPLETED', 'eventId', e.id);
  end if;

  if active is not null then
    return jsonb_build_object(
      'blockAuto', true,
      'status', 'ENCOUNTER_ACTIVE',
      'reason', 'SPECIAL_EVENT',
      'eventId', e.id,
      'roundId', active.id
    );
  end if;

  if e.rounds_launched < e.encounter_count then
    if e.auto_advance and (e.next_round_at is null or e.next_round_at <= now()) then
      if e.next_round_at is null and e.last_round_at is not null then
        update private.special_events
           set next_round_at = e.last_round_at + interval '90 seconds', updated_at = now()
         where id = e.id;
        return jsonb_build_object(
          'blockAuto', true,
          'status', 'SPECIAL_EVENT',
          'reason', 'SPECIAL_EVENT_GAP',
          'eventId', e.id
        );
      end if;
      if p_live is not true then
        return jsonb_build_object(
          'blockAuto', true,
          'status', 'WAITING_FOR_STREAM',
          'reason', 'SPECIAL_EVENT_OFFLINE',
          'eventId', e.id
        );
      end if;
      begin
        r := private.special_event_start_round(e.id);
        return jsonb_build_object(
          'blockAuto', true,
          'status', 'ENCOUNTER_ACTIVE',
          'reason', 'SPECIAL_EVENT',
          'eventId', e.id,
          'roundId', r.id
        );
      exception when others then
        return jsonb_build_object(
          'blockAuto', true,
          'status', 'NEEDS_ADMIN',
          'reason', 'SPECIAL_EVENT_START_FAILED',
          'eventId', e.id,
          'detail', sqlerrm
        );
      end;
    end if;
    return jsonb_build_object(
      'blockAuto', true,
      'status', 'SPECIAL_EVENT',
      'reason', 'SPECIAL_EVENT_GAP',
      'eventId', e.id
    );
  end if;

  return jsonb_build_object('blockAuto', true, 'status', 'SPECIAL_EVENT', 'reason', 'SPECIAL_EVENT', 'eventId', e.id);
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
    when 'STREAM_STATUS_UNKNOWN' then 'Twitch live status has not been checked recently.'
    when 'QUEUED_SPECIAL' then 'A special encounter is queued for the next safe window.'
    when 'NO_ELIGIBLE_PLAYERS' then 'No eligible Trainers are present.'
    when 'UNKNOWN_AD' then 'Twitch ad information is unavailable.'
    when 'DIRECTOR_OFF' then 'The encounter director is turned off.'
    when 'SPECIAL_EVENT' then 'A Special Event encounter is active. Normal auto encounters are paused.'
    when 'SPECIAL_EVENT_OFFLINE' then 'A scheduled Special Event is waiting for the stream to go live.'
    when 'SPECIAL_EVENT_GAP' then 'Waiting for the next Special Event encounter this stream.'
    when 'SPECIAL_EVENT_START_FAILED' then 'Special Event encounter creation failed. Admin action needed.'
    when 'SPECIAL_EVENT_NEEDS_ADMIN' then 'A scheduled Special Event needs admin action.'
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
  se_tick jsonb;
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
    se_tick := private.special_event_director_tick(false);
    if coalesce(se_tick->>'reason', '') in ('SPECIAL_EVENT_OFFLINE', 'SPECIAL_EVENT_START_FAILED') then
      dir_status := coalesce(se_tick->>'status', dir_status);
      dir_reason := coalesce(se_tick->>'reason', dir_reason);
    end if;
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
$$;
