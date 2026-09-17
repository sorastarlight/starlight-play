-- Phase 10 RPCs, public round metadata, health, achievements, self-test.
-- QA never starts a live Legendary/Mythical round against Sora.

create or replace function private.public_round_json(r encounter_rounds)
returns jsonb
language plpgsql
stable
as $function$
declare
  ph text; participants int; prepared int; thrown int; bait_count int; honey_calc jsonb; activity jsonb; honey jsonb; catchers jsonb; throwers jsonb; settled boolean; species_types text[];
  shown_level int;
  se jsonb;
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
  shown_level := coalesce(nullif(r.pokemon->>'level', '')::int, private.encounter_pokemon_level(r.dex, r.id));
  if shown_level is not null and shown_level < 1 then shown_level := null; end if;
  se := case when coalesce(r.rules->'specialEvent'->>'id', '') = '' then null else r.rules->'specialEvent' end;
  return jsonb_build_object(
    'id', r.id, 'source', r.source, 'phase', ph, 'overlayPhase', r.phase, 'paused', private.round_paused(r), 'hidden', r.hidden, 'cancelled', r.cancelled, 'resolved', r.resolved, 'pausedAt', r.paused_at,
    'pausedForBreak', private.director_has_reason(coalesce(r.pause_reasons, '[]'::jsonb), 'AD'),
    'pauseReasons', coalesce(r.pause_reasons, '[]'::jsonb),
    'triggerSource', r.trigger_source,
    'dex', r.dex, 'name', r.name, 'variant', r.variant, 'gender', r.gender, 'level', shown_level, 'types', coalesce(to_jsonb(species_types), '[]'::jsonb),
    'location', coalesce(nullif(r.pokemon->>'location', ''), private.lgpe_habitat(r.dex)), 'startedAt', r.started_at, 'endsAt', private.phase_display_ends(r, ph), 'deadlines', r.deadlines,
    'updatedAt', r.updated_at, 'serverNow', now(),
    'participants', participants, 'prepared', prepared, 'thrown', thrown, 'honeyContributors', bait_count, 'honeyParticipants', participants,
    'honeyMultiplier', (honey_calc->>'multiplier')::numeric, 'baitBonusPercent', round(100 * ((honey_calc->>'multiplier')::numeric - 1), 1),
    'lastAction', r.last_action, 'activity', activity, 'honeyTrainers', coalesce(honey, '[]'::jsonb), 'throwers', coalesce(throwers, '[]'::jsonb), 'catchers', coalesce(catchers, '[]'::jsonb),
    'specialEvent', se,
    'results', case when settled then (select jsonb_build_object('caught', count(*) filter (where coalesce(caught, false))::int, 'escaped', count(*) filter (where result = 'Escaped')::int, 'noThrow', count(*) filter (where coalesce(result, '') = 'No throw')::int, 'catchers', coalesce(catchers, '[]'::jsonb)) from public.encounter_players where round_id = r.id) else null end
  );
end;
$function$;

create or replace function private.special_event_player_payload()
returns jsonb
language plpgsql
stable
as $$
declare
  live private.special_events;
  upcoming jsonb;
  live_card jsonb;
begin
  select * into live from private.special_events where status = 'LIVE' order by updated_at desc limit 1;
  live_card := private.special_event_public_card(live, false);
  select coalesce(jsonb_agg(private.special_event_public_card(e, false) order by e.starts_at), '[]'::jsonb)
    into upcoming
    from private.special_events e
   where e.status in ('SCHEDULED', 'WAITING_FOR_STREAM', 'LIVE')
     and private.special_event_public_card(e, false) is not null;
  return jsonb_build_object(
    'live', live_card,
    'upcoming', coalesce(upcoming, '[]'::jsonb),
    'serverNow', now()
  );
end;
$$;

create or replace function public.play_special_events()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  return jsonb_build_object('ok', true) || private.special_event_player_payload();
end;
$$;

grant execute on function public.play_special_events() to anon, authenticated;

create or replace function public.play_sync(p_round_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  perform private.director_tick_if_due();
  return coalesce(private.play_snapshot(auth.uid(), p_round_id), '{}'::jsonb)
    || jsonb_build_object(
      'console', private.play_console_json(100),
      'supportAlert', private.public_support_alert(),
      'specialEvent', private.special_event_player_payload()
    );
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
    || jsonb_build_object(
      'console', private.play_console_json(100),
      'supportAlert', private.public_support_alert(),
      'specialEvent', private.special_event_player_payload()
    );
end;
$$;

create or replace function private.admin_special_event_live_json()
returns jsonb
language plpgsql
stable
as $$
declare
  live private.special_events;
  next_e private.special_events;
  stuck private.special_events;
begin
  select * into live from private.special_events where status = 'LIVE' order by updated_at desc limit 1;
  select * into next_e
    from private.special_events
   where status in ('SCHEDULED', 'WAITING_FOR_STREAM')
   order by starts_at nulls last
   limit 1;
  select * into stuck
    from private.special_events
   where status in ('NEEDS_ADMIN', 'WAITING_FOR_STREAM')
   order by updated_at desc
   limit 1;
  return jsonb_build_object(
    'active', case when live.id is null then null else private.special_event_admin_json(live) end,
    'nextScheduled', case when next_e.id is null then null else private.special_event_admin_json(next_e) end,
    'stuck', case when stuck.id is null then null else private.special_event_admin_json(stuck) end,
    'liveCount', (select count(*) from private.special_events where status = 'LIVE'),
    'availability', private.kanto_availability_json()->'counts'
  );
end;
$$;

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
  return private.director_dashboard() || jsonb_build_object(
    'specialEvent', private.admin_special_event_live_json()
  );
end;
$$;

create or replace function private.special_event_upsert(p_payload jsonb)
returns private.special_events
language plpgsql
as $$
declare
  e private.special_events;
  payload jsonb := coalesce(p_payload, '{}'::jsonb);
  preset jsonb;
  v_id uuid := nullif(payload->>'id', '')::uuid;
  v_dex int;
begin
  v_dex := coalesce(nullif(payload->>'dex', '')::int, e.dex);
  if v_id is not null then
    select * into e from private.special_events where id = v_id for update;
    if e.id is null then
      raise exception 'Special Event not found.';
    end if;
    if e.status not in ('DRAFT', 'SCHEDULED', 'NEEDS_ADMIN', 'WAITING_FOR_STREAM') then
      raise exception 'Only draft, scheduled, or waiting events can be edited.';
    end if;
  end if;
  v_dex := coalesce(nullif(payload->>'dex', '')::int, e.dex);
  if v_dex is null then
    raise exception 'Pick a Pokémon.';
  end if;
  preset := private.special_event_preset(v_dex);
  if v_id is null then
    insert into private.special_events (
      event_type, dex, variant_policy, location_key, location_label, title, subtitle, announcement,
      starts_at, ends_at, encounter_count, auto_advance, visibility, presentation, status, repeat_policy, created_by, notes
    ) values (
      coalesce(nullif(upper(payload->>'eventType'), ''), preset->>'eventType'),
      v_dex,
      coalesce(nullif(upper(payload->>'variantPolicy'), ''), preset->>'variantPolicy'),
      coalesce(nullif(payload->>'locationKey', ''), preset->>'locationKey'),
      coalesce(nullif(payload->>'locationLabel', ''), preset->>'locationLabel'),
      coalesce(nullif(btrim(payload->>'title'), ''), preset->>'title'),
      coalesce(nullif(btrim(payload->>'subtitle'), ''), preset->>'subtitle'),
      coalesce(nullif(btrim(payload->>'announcement'), ''), preset->>'announcement'),
      nullif(payload->>'startsAt', '')::timestamptz,
      nullif(payload->>'endsAt', '')::timestamptz,
      coalesce(nullif(payload->>'encounterCount', '')::int, (preset->>'encounterCount')::int, 1),
      coalesce((payload->>'autoAdvance')::boolean, true),
      coalesce(nullif(upper(payload->>'visibility'), ''), preset->>'visibility'),
      coalesce(payload->'presentation', '{}'::jsonb),
      'DRAFT',
      coalesce(nullif(upper(payload->>'repeatPolicy'), ''), preset->>'repeatPolicy'),
      auth.uid(),
      nullif(payload->>'notes', '')
    ) returning * into e;
  else
    update private.special_events
       set event_type = coalesce(nullif(upper(payload->>'eventType'), ''), event_type),
           dex = v_dex,
           variant_policy = coalesce(nullif(upper(payload->>'variantPolicy'), ''), variant_policy),
           location_key = coalesce(nullif(payload->>'locationKey', ''), location_key),
           location_label = coalesce(nullif(payload->>'locationLabel', ''), location_label),
           title = coalesce(nullif(btrim(payload->>'title'), ''), title),
           subtitle = coalesce(nullif(btrim(payload->>'subtitle'), ''), subtitle),
           announcement = coalesce(nullif(btrim(payload->>'announcement'), ''), announcement),
           starts_at = case when payload ? 'startsAt' then nullif(payload->>'startsAt', '')::timestamptz else starts_at end,
           ends_at = case when payload ? 'endsAt' then nullif(payload->>'endsAt', '')::timestamptz else ends_at end,
           encounter_count = coalesce(nullif(payload->>'encounterCount', '')::int, encounter_count),
           auto_advance = coalesce((payload->>'autoAdvance')::boolean, auto_advance),
           visibility = coalesce(nullif(upper(payload->>'visibility'), ''), visibility),
           presentation = coalesce(payload->'presentation', presentation),
           repeat_policy = coalesce(nullif(upper(payload->>'repeatPolicy'), ''), repeat_policy),
           notes = case when payload ? 'notes' then nullif(payload->>'notes', '') else notes end,
           updated_at = now()
     where id = e.id
     returning * into e;
  end if;
  return e;
end;
$$;

create or replace function public.admin_special_event_command(p_action text, p_payload jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  payload jsonb := coalesce(p_payload, '{}'::jsonb);
  action text := lower(btrim(coalesce(p_action, '')));
  e private.special_events;
  r public.encounter_rounds;
  v_id uuid := nullif(payload->>'id', '')::uuid;
  listed jsonb;
  live_state jsonb;
  live boolean;
begin
  if not private.is_play_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  if action in ('list', 'catalog', 'health') then
    select coalesce(jsonb_agg(private.special_event_admin_json(x) order by
      case x.status
        when 'LIVE' then 0 when 'WAITING_FOR_STREAM' then 1 when 'NEEDS_ADMIN' then 2
        when 'SCHEDULED' then 3 when 'DRAFT' then 4 else 5
      end, x.starts_at nulls last, x.created_at desc), '[]'::jsonb)
      into listed
      from private.special_events x;
    return jsonb_build_object(
      'ok', true,
      'events', listed,
      'live', private.admin_special_event_live_json(),
      'availability', private.kanto_availability_json(),
      'presets', jsonb_build_object(
        '144', private.special_event_preset(144),
        '145', private.special_event_preset(145),
        '146', private.special_event_preset(146),
        '150', private.special_event_preset(150),
        '151', private.special_event_preset(151)
      ),
      'serverNow', now()
    );
  end if;

  if action = 'preset' then
    return jsonb_build_object('ok', true, 'preset', private.special_event_preset((payload->>'dex')::int));
  end if;

  if action = 'preview' then
    return jsonb_build_object(
      'ok', true,
      'preview', true,
      'granted', false,
      'event', coalesce(payload, '{}'::jsonb),
      'message', 'Visual-only preview. No encounter was created.'
    );
  end if;

  if action in ('create', 'save') then
    e := private.special_event_upsert(payload);
    return jsonb_build_object('ok', true, 'event', private.special_event_admin_json(e), 'message', 'Event saved.');
  end if;

  if v_id is null then
    raise exception 'Pick a Special Event.';
  end if;
  select * into e from private.special_events where id = v_id for update;
  if e.id is null then
    raise exception 'Special Event not found.';
  end if;

  if action = 'schedule' then
    if e.status not in ('DRAFT', 'NEEDS_ADMIN', 'CANCELLED') then
      raise exception 'Only draft or recovered events can be scheduled.';
    end if;
    if coalesce(e.starts_at, nullif(payload->>'startsAt', '')::timestamptz) is null then
      raise exception 'Set a start date and time.';
    end if;
    update private.special_events
       set status = 'SCHEDULED',
           starts_at = coalesce(nullif(payload->>'startsAt', '')::timestamptz, starts_at),
           ends_at = coalesce(nullif(payload->>'endsAt', '')::timestamptz, ends_at),
           updated_at = now()
     where id = e.id
     returning * into e;
    perform private.director_log('SPECIAL_EVENT_SCHEDULED', e.event_type, jsonb_build_object('eventId', e.id, 'dex', e.dex), auth.uid());
    return jsonb_build_object('ok', true, 'event', private.special_event_admin_json(e), 'message', 'Event scheduled.');
  end if;

  if action in ('start_now', 'repeat') then
    if coalesce((payload->>'confirm')::boolean, false) is not true then
      raise exception 'Confirm this live Special Event action.';
    end if;
    live_state := private.stream_live_state();
    live := coalesce((live_state->>'live')::boolean, false);
    if action = 'start_now' and e.status in ('CANCELLED', 'COMPLETED') then
      raise exception 'This event is already %.', e.status;
    end if;
    if action = 'start_now' and not live and e.event_type is distinct from 'ADMIN_TEST' then
      update private.special_events set status = 'WAITING_FOR_STREAM', updated_at = now() where id = e.id returning * into e;
      return jsonb_build_object(
        'ok', true,
        'event', private.special_event_admin_json(e),
        'message', 'Stream is offline. Event is waiting for the stream instead of consuming a Legendary round.'
      );
    end if;
    if action = 'repeat' and e.status is distinct from 'LIVE' then
      raise exception 'Repeat is only available during a live event.';
    end if;
    r := private.special_event_start_round(e.id);
    select * into e from private.special_events where id = e.id;
    return jsonb_build_object(
      'ok', true,
      'event', private.special_event_admin_json(e),
      'roundId', r.id,
      'dex', r.dex,
      'name', r.name,
      'message', r.name || ' appeared!'
    );
  end if;

  if action = 'cancel' then
    if coalesce((payload->>'confirm')::boolean, false) is not true then
      raise exception 'Confirm cancelling this Special Event.';
    end if;
    if e.status = 'COMPLETED' then
      raise exception 'Completed events cannot be cancelled.';
    end if;
    update private.special_events
       set status = 'CANCELLED', next_round_at = null, updated_at = now()
     where id = e.id
     returning * into e;
    perform private.director_log('SPECIAL_EVENT_CANCELLED', e.event_type, jsonb_build_object('eventId', e.id, 'dex', e.dex), auth.uid());
    return jsonb_build_object('ok', true, 'event', private.special_event_admin_json(e), 'message', 'Event cancelled.');
  end if;

  if action = 'end' then
    if coalesce((payload->>'confirm')::boolean, false) is not true then
      raise exception 'Confirm ending this Special Event.';
    end if;
    if e.status not in ('LIVE', 'WAITING_FOR_STREAM', 'NEEDS_ADMIN', 'SCHEDULED') then
      raise exception 'This event is not running.';
    end if;
    update private.special_events
       set status = 'COMPLETED', next_round_at = null, updated_at = now()
     where id = e.id
     returning * into e;
    perform private.director_log('SPECIAL_EVENT_ENDED', e.event_type, jsonb_build_object('eventId', e.id, 'dex', e.dex), auth.uid());
    return jsonb_build_object('ok', true, 'event', private.special_event_admin_json(e), 'message', 'Event ended.');
  end if;

  raise exception 'Unknown Special Event action.';
end;
$$;

grant execute on function public.admin_special_event_command(text, jsonb) to authenticated;

create or replace function public.admin_special_event_analytics(p_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  e private.special_events;
  stats jsonb;
begin
  if not private.is_play_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_id is not null then
    select * into e from private.special_events where id = p_id;
    if e.id is null then
      raise exception 'Special Event not found.';
    end if;
    select jsonb_build_object(
      'eventId', e.id,
      'dex', e.dex,
      'rounds', e.rounds_launched,
      'participants', count(distinct ep.user_id),
      'attempts', count(*),
      'captures', count(*) filter (where coalesce(ep.caught, false)),
      'escapes', count(*) filter (where ep.result = 'Escaped'),
      'escapeRate', case when count(*) = 0 then 0 else round(100.0 * count(*) filter (where ep.result = 'Escaped') / count(*), 1) end,
      'balls', coalesce((
        select jsonb_object_agg(coalesce(ball, 'none'), n)
        from (
          select ep2.ball, count(*)::int as n
          from private.special_event_rounds ser2
          join public.encounter_players ep2 on ep2.round_id = ser2.round_id
          where ser2.event_id = e.id
          group by ep2.ball
        ) b
      ), '{}'::jsonb),
      'berries', coalesce((
        select jsonb_object_agg(coalesce(prep, 'none'), n)
        from (
          select ep2.prep, count(*)::int as n
          from private.special_event_rounds ser2
          join public.encounter_players ep2 on ep2.round_id = ser2.round_id
          where ser2.event_id = e.id
          group by ep2.prep
        ) b
      ), '{}'::jsonb),
      'honeyContributions', count(*) filter (where ep.prep = 'bait')
    ) into stats
    from private.special_event_rounds ser
    left join public.encounter_players ep on ep.round_id = ser.round_id
    where ser.event_id = e.id;
    return jsonb_build_object('ok', true, 'event', private.special_event_admin_json(e), 'stats', stats);
  end if;
  select jsonb_build_object(
    'eventsHeld', count(*) filter (where status in ('COMPLETED', 'LIVE')),
    'participants', (
      select count(distinct ep.user_id)
      from private.special_event_rounds ser
      join public.encounter_players ep on ep.round_id = ser.round_id
    ),
    'attempts', (
      select count(*)
      from private.special_event_rounds ser
      join public.encounter_players ep on ep.round_id = ser.round_id
    ),
    'captures', (
      select count(*)
      from private.special_event_rounds ser
      join public.encounter_players ep on ep.round_id = ser.round_id
      where coalesce(ep.caught, false)
    )
  ) into stats
  from private.special_events;
  return jsonb_build_object('ok', true, 'stats', stats);
end;
$$;

grant execute on function public.admin_special_event_analytics(uuid) to authenticated;

create or replace function public.admin_special_event_health()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  live_n int;
  stuck_n int;
  next_e private.special_events;
  last_e private.special_events;
  status text := 'HEALTHY';
  detail text := 'No Special Event is live.';
begin
  if not private.is_play_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select count(*)::int into live_n from private.special_events where status = 'LIVE';
  select count(*)::int into stuck_n from private.special_events where status in ('NEEDS_ADMIN', 'WAITING_FOR_STREAM');
  select * into next_e from private.special_events where status = 'SCHEDULED' order by starts_at nulls last limit 1;
  select * into last_e from private.special_events where status = 'COMPLETED' order by updated_at desc limit 1;
  if live_n > 1 then
    status := 'ACTION NEEDED';
    detail := 'More than one Special Event is marked LIVE.';
  elsif stuck_n > 0 then
    status := 'WARNING';
    detail := 'A Special Event is waiting for stream or needs admin action.';
  elsif live_n = 1 then
    status := 'HEALTHY';
    detail := 'A Special Event is live. Normal auto encounters are paused.';
  elsif next_e.id is not null then
    status := 'HEALTHY';
    detail := 'Next scheduled Special Event is set.';
  end if;
  return jsonb_build_object(
    'status', status,
    'detail', detail,
    'liveCount', live_n,
    'stuckCount', stuck_n,
    'nextScheduled', case when next_e.id is null then null else private.special_event_admin_json(next_e) end,
    'lastCompleted', case when last_e.id is null then null else private.special_event_admin_json(last_e) end,
    'availability', private.kanto_availability_json()->'counts'
  );
end;
$$;

grant execute on function public.admin_special_event_health() to authenticated;

create or replace function private.achievement_progress(p_uid uuid, p_row public.progression_achievements)
returns int
language plpgsql
stable
as $function$
declare
  extra jsonb := coalesce(p_row.extra, '{}'::jsonb);
  n int := 0;
begin
  if p_row.requirement_type = 'TOTAL_CATCHES' then
    select count(*)::int into n from public.catches where user_id = p_uid and round_id is not null;
  elsif p_row.requirement_type = 'UNIQUE_SPECIES' then
    select count(distinct dex)::int into n from public.catches where user_id = p_uid;
  elsif p_row.requirement_type = 'SHINY_SPECIES' then
    select count(distinct dex)::int into n from public.catches where user_id = p_uid and variant like '%shiny%';
  elsif p_row.requirement_type = 'FEMALE_VARIANTS' then
    select count(distinct c.dex)::int into n from public.catches c
     where c.user_id = p_uid and (c.variant like '%female%' or c.gender = 'Female') and c.dex = any (private.female_visual_dex());
  elsif p_row.requirement_type = 'ENCOUNTERS_JOINED' then
    select count(*)::int into n from public.encounter_players where user_id = p_uid;
  elsif p_row.requirement_type = 'HONEY_CONTRIBUTIONS' then
    select count(*)::int into n from public.encounter_players where user_id = p_uid and prep = 'bait';
  elsif p_row.requirement_type = 'SPECIALIST_BALL_CATCHES' then
    select count(*)::int into n from public.capture_log where user_id = p_uid and success and ball_condition_met and ball_key = extra->>'ball';
  elsif p_row.requirement_type = 'OPTIMAL_CATCHES' then
    select count(*)::int into n from public.capture_log where user_id = p_uid and success and ball_condition_met
      and ball_key not in ('pokeball','greatball','ultraball','masterball','premierball');
  elsif p_row.requirement_type = 'RARITY_CAPTURES' then
    select count(*)::int into n from public.capture_log where user_id = p_uid and success
      and canonical_catch_rate <= coalesce((extra->>'maxCatchRate')::int, 255)
      and canonical_catch_rate >= coalesce((extra->>'minCatchRate')::int, 0);
  elsif p_row.requirement_type = 'LEGENDARY_CATCHES' then
    select count(*)::int into n from public.catches c join public.species s on s.dex = c.dex where c.user_id = p_uid and s.is_legendary;
  elsif p_row.requirement_type = 'SPECIES_SET' then
    select count(distinct c.dex)::int into n
      from public.catches c
     where c.user_id = p_uid
       and c.dex in (select jsonb_array_elements_text(extra->'dex')::int);
  elsif p_row.requirement_type = 'LOW_ODDS_CAPTURE' then
    select count(*)::int into n from public.capture_log where user_id = p_uid and success
      and final_chance <= coalesce((extra->>'maxChance')::numeric, 0.05);
  elsif p_row.requirement_type = 'SPECIES_CATCH_COUNT' then
    select coalesce(max(cnt), 0) into n from (select count(*)::int as cnt from public.catches where user_id = p_uid group by dex) s;
  elsif p_row.requirement_type = 'FAILED_CATCHES' then
    select count(*)::int into n from public.capture_log where user_id = p_uid and success = false;
  elsif p_row.requirement_type = 'CATCH_STREAK' then
    select coalesce(best_catch_streak, 0) into n from public.trainer_stats where user_id = p_uid;
  elsif p_row.requirement_type = 'EVOLUTIONS' then
    select coalesce(evolved, 0) into n from public.trainer_stats where user_id = p_uid;
  elsif p_row.requirement_type = 'TRADES' then
    select coalesce(trades_done, 0) into n from public.trainer_stats where user_id = p_uid;
  elsif p_row.requirement_type = 'SPECIES_MASTERED' then
    select count(*)::int into n from public.species_mastery where user_id = p_uid and rank >= 5;
  elsif p_row.requirement_type = 'DUPLICATE_CATCHES' then
    select coalesce(sum(cnt - 1), 0)::int into n from (
      select count(*)::int as cnt from public.catches where user_id = p_uid and round_id is not null group by dex
    ) s where cnt > 1;
  else
    n := 0;
  end if;
  return coalesce(n, 0);
end;
$function$;

insert into public.progression_achievements (
  id, name, description, category, requirement_type, target_value, extra, rewards, hidden, enabled, sort_order
) values (
  'kanto-legend-set',
  'Kanto Legends',
  'Catch Articuno, Zapdos, Moltres, and Mewtwo.',
  'epic',
  'SPECIES_SET',
  4,
  '{"dex":[144,145,146,150]}'::jsonb,
  '{}'::jsonb,
  false,
  true,
  476
)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  requirement_type = excluded.requirement_type,
  target_value = excluded.target_value,
  extra = excluded.extra;

create or replace function private.phase10_special_selftest()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  failed text := '';
  counts jsonb;
  hidden_id uuid;
  public_id uuid;
  hidden_card jsonb;
  public_card jsonb;
  src text;
  chance numeric;
begin
  counts := private.kanto_availability_json()->'counts';
  if coalesce((counts->>'normal')::int, 0) <> 146 then failed := failed || format('normal=%s; ', counts->>'normal'); end if;
  if coalesce((counts->>'special')::int, 0) <> 5 then failed := failed || format('special=%s; ', counts->>'special'); end if;
  if coalesce((counts->>'evolutionOnly')::int, 0) <> 0 then failed := failed || 'evo-only; '; end if;
  if coalesce((counts->>'unavailable')::int, 0) <> 0 then failed := failed || 'unavail; '; end if;

  chance := private.capture_base_chance(3);
  if chance is distinct from 0.04 then failed := failed || format('cr3=%s; ', chance); end if;

  if private.spawn_band(144) is distinct from 'LEGENDARY' then failed := failed || 'articuno band; '; end if;
  if private.spawn_band(151) is distinct from 'LEGENDARY' then failed := failed || 'mew band; '; end if;

  src := pg_get_functiondef('private.launch_community_round(integer,text,boolean,text,boolean)'::regprocedure);
  if src not ilike '%specialEvent%' then failed := failed || 'launch missing specialEvent; '; end if;
  if src not ilike '%A Special Event is live%' then failed := failed || 'launch missing collision guard; '; end if;

  src := pg_get_functiondef('private.director_tick()'::regprocedure);
  if src not ilike '%special_event_director_tick%' then failed := failed || 'tick unwired; '; end if;

  insert into private.special_events (event_type, dex, title, subtitle, visibility, status, encounter_count)
  values ('MYTHICAL', 151, 'QA HIDDEN MEW', 'Mew', 'HIDDEN', 'SCHEDULED', 1)
  returning id into hidden_id;
  hidden_card := private.special_event_public_card((select s from private.special_events s where s.id = hidden_id), false);
  if hidden_card is not null then failed := failed || 'hidden leaked; '; end if;
  if coalesce(hidden_card->>'name', '') ilike '%mew%' then failed := failed || 'hidden mew name; '; end if;

  insert into private.special_events (event_type, dex, title, subtitle, visibility, status, encounter_count, starts_at)
  values ('LEGENDARY', 144, 'THE FROZEN LEGEND AWAKENS', 'Articuno', 'PUBLIC', 'SCHEDULED', 3, now() + interval '7 days')
  returning id into public_id;
  public_card := private.special_event_public_card((select s from private.special_events s where s.id = public_id), false);
  if public_card is null then failed := failed || 'public missing; '; end if;
  if coalesce(public_card->>'name', '') not ilike '%articuno%' then failed := failed || 'public name; '; end if;

  if exists (
    select 1 from private.store_items
    where status = 'published'
      and (
        grants ? 'articuno' or grants ? 'mew' or grants ? 'mewtwo'
        or coalesce(grants->>'legendary', '') <> ''
      )
  ) then failed := failed || 'paid legendary sku; '; end if;

  delete from private.special_events where id in (hidden_id, public_id);

  if failed <> '' then
    return jsonb_build_object('ok', false, 'failed', failed);
  end if;
  return jsonb_build_object('ok', true, 'counts', counts);
end;
$function$;

do $$
declare
  result jsonb;
begin
  result := private.phase10_special_selftest();
  if coalesce((result->>'ok')::boolean, false) is not true then
    raise exception 'Phase 10 self-test failed: %', result->>'failed';
  end if;
end;
$$;
