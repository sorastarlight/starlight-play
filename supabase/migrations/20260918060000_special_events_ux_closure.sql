-- Special Events UX closure: safe delete + optional preferred gender on start.
-- Forward-only. Does not alter ordinary spawn / containment.

create or replace function private.special_event_delete(p_id uuid, p_confirm boolean default false)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  e private.special_events;
  snap jsonb;
begin
  -- Authorization is enforced by public.admin_special_event_command (is_play_admin).
  if coalesce(p_confirm, false) is not true then
    raise exception 'Confirm deleting this Special Event.';
  end if;
  select * into e from private.special_events where id = p_id for update;
  if e.id is null then
    raise exception 'Special Event not found.';
  end if;
  if e.status in ('LIVE', 'WAITING_FOR_STREAM') then
    raise exception 'End or cancel the active event before deleting it.';
  end if;
  snap := private.special_event_admin_json(e);
  -- Join rows cascade; encounter_rounds / catches remain intact.
  delete from private.special_events where id = e.id;
  perform private.director_log(
    'SPECIAL_EVENT_DELETED',
    e.event_type,
    jsonb_build_object('eventId', e.id, 'dex', e.dex, 'formId', e.pokemon_form_id, 'status', e.status),
    auth.uid()
  );
  return jsonb_build_object('ok', true, 'deleted', snap, 'message', 'Event definition deleted. Encounter history was kept.');
end;
$$;

revoke all on function private.special_event_delete(uuid, boolean) from public, anon, authenticated;

-- Patch start_round to honor preferred gender from presentation.gender when set.
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
  fid int;
  preferred_gender text;
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
  fid := private.canonical_form_id(e.dex, coalesce(e.pokemon_form_id, e.dex));
  preferred_gender := nullif(btrim(coalesce(e.presentation->>'gender', '')), '');
  if preferred_gender is not null and preferred_gender not in ('Male', 'Female', 'Genderless') then
    preferred_gender := null;
  end if;
  perform set_config('play.special_event_id', e.id::text, true);
  perform set_config('play.special_variant_policy', e.variant_policy, true);
  perform set_config('play.special_location', loc, true);
  perform set_config('play.special_form_id', fid::text, true);
  perform set_config('play.special_event_json', private.special_event_round_meta(e)::text, true);
  shiny := case e.variant_policy
    when 'FORCED_SHINY' then true
    when 'DISABLED' then false
    else null
  end;
  r := private.director_start_now(
    e.dex,
    preferred_gender,
    shiny,
    'SPECIAL_EVENT',
    e.event_type = 'ADMIN_TEST',
    fid
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
    jsonb_build_object('eventId', e.id, 'roundId', r.id, 'roundIndex', next_index, 'dex', e.dex, 'formId', fid, 'gender', preferred_gender)
  );
  return r;
end;
$$;

-- Wire delete into admin_special_event_command without rewriting the whole body.
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
  pref_gender text;
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
    -- Persist preferred gender into presentation without a schema column.
    pref_gender := nullif(btrim(coalesce(payload->>'gender', '')), '');
    if pref_gender is not null then
      payload := payload || jsonb_build_object(
        'presentation',
        coalesce(payload->'presentation', '{}'::jsonb) || jsonb_build_object('gender', pref_gender)
      );
    end if;
    e := private.special_event_upsert(payload);
    return jsonb_build_object('ok', true, 'event', private.special_event_admin_json(e), 'message', 'Event saved.');
  end if;

  if action = 'delete' then
    if v_id is null then
      raise exception 'Pick a Special Event.';
    end if;
    return private.special_event_delete(v_id, coalesce((payload->>'confirm')::boolean, false));
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
      'formId', r.pokemon_form_id,
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
    if e.status = 'LIVE' then
      raise exception 'End the live event instead of cancelling it mid-round.';
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

revoke execute on function public.admin_special_event_command(text, jsonb) from public, anon;
grant execute on function public.admin_special_event_command(text, jsonb) to authenticated;
