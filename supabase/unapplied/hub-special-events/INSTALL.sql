do $guard$ begin
if md5(pg_get_functiondef('private.is_play_admin()'::regprocedure)) is distinct from 'e1449c28be1cd6f6c5208638d5a1df6f' then raise exception 'Special event contract drift';end if;
if md5(pg_get_functiondef('private.stream_live_state()'::regprocedure)) is distinct from 'a983bfca1852b95e2aa7c9c846abf57c' then raise exception 'Special event contract drift';end if;
if md5(pg_get_functiondef('private.admin_special_event_live_json()'::regprocedure)) is distinct from '168c3feae58f579f194a1d00c0f83091' then raise exception 'Special event contract drift';end if;
if md5(pg_get_functiondef('private.special_event_preset(integer)'::regprocedure)) is distinct from '66ae3f5fca336f78a6b8c05f027d9c3e' then raise exception 'Special event contract drift';end if;
if md5(pg_get_functiondef('admin_special_event_command(text,jsonb)'::regprocedure)) is distinct from '7b3a55e3a84ab766e24b99cebdd6b6f7' then raise exception 'Special event contract drift';end if;
if md5(pg_get_functiondef('admin_special_event_analytics(uuid)'::regprocedure)) is distinct from 'ee4f24d0d6c313e660e0467532033bf2' then raise exception 'Special event contract drift';end if;
if md5(pg_get_functiondef('private.kanto_availability_json()'::regprocedure)) is distinct from '444eb38f147ddb574b776c9088c2b921' then raise exception 'Special event contract drift';end if;
if md5(pg_get_functiondef('private.canonical_form_id(integer,integer)'::regprocedure)) is distinct from 'ac1f716815eeaefeed5fcee5f765124e' then raise exception 'Special event contract drift';end if;
if md5(pg_get_functiondef('private.assert_form_launchable(integer,integer,text)'::regprocedure)) is distinct from '94504d0950984e12612883d9d885a55c' then raise exception 'Special event contract drift';end if;
if md5(pg_get_functiondef('private.special_event_round_meta(private.special_events)'::regprocedure)) is distinct from '965de6b13430d33f477c15f0566ef613' then raise exception 'Special event contract drift';end if;
if md5(pg_get_functiondef('private.special_event_admin_json(private.special_events)'::regprocedure)) is distinct from '57a13ef2af85fa07a380b18d7127d32d' then raise exception 'Special event contract drift';end if;
if md5(pg_get_functiondef('private.special_event_start_round(uuid)'::regprocedure)) is distinct from '408371f186353340ec0fa76380d4fa5c' then raise exception 'Special event contract drift';end if;
if md5(pg_get_functiondef('private.special_event_upsert(jsonb)'::regprocedure)) is distinct from '43fc55f3a9ff2a7c8883e4d41db518ad' then raise exception 'Special event contract drift';end if;
if to_regclass('private.hub_event_changes') is not null then raise exception 'Event packet already installed';end if;end $guard$;
CREATE OR REPLACE FUNCTION private.special_event_upsert(p_payload jsonb)
 RETURNS private.special_events
 LANGUAGE plpgsql
AS $function$
declare
  e private.special_events;
  payload jsonb := coalesce(p_payload, '{}'::jsonb);
  preset jsonb;
  v_id uuid := nullif(payload->>'id', '')::uuid;
  v_dex int;
  v_form int;
  pref_gender text;
  forced_g text;
  v_presentation jsonb;
begin
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
  v_form := private.canonical_form_id(
    v_dex,
    coalesce(nullif(payload->>'formId', '')::int, nullif(payload->>'pokemonFormId', '')::int, e.pokemon_form_id, v_dex)
  );
  perform private.assert_form_launchable(v_dex, v_form, 'SPECIAL_EVENT');

  select forced_gender into forced_g from public.pokemon_forms where pokemon_form_id = v_form;
  pref_gender := coalesce(
    nullif(btrim(payload->>'gender'), ''),
    nullif(btrim(payload->'presentation'->>'gender'), '')
  );
  if forced_g is not null then
    if pref_gender is not null
       and pref_gender in ('Male', 'Female', 'Genderless')
       and pref_gender is distinct from forced_g then
      raise exception 'Form % requires gender % (got %).', v_form, forced_g, pref_gender;
    end if;
    pref_gender := forced_g;
  end if;

  v_presentation := coalesce(payload->'presentation', '{}'::jsonb);
  if pref_gender is not null then
    v_presentation := v_presentation || jsonb_build_object('gender', pref_gender);
  end if;
  payload := payload || jsonb_build_object('presentation', v_presentation);

  preset := private.special_event_preset(v_dex);
  if v_id is null then
    insert into private.special_events (
      event_type, dex, pokemon_form_id, variant_policy, location_key, location_label, title, subtitle, announcement,
      starts_at, ends_at, encounter_count, auto_advance, visibility, presentation, status, repeat_policy, created_by, notes
    ) values (
      coalesce(nullif(upper(payload->>'eventType'), ''), preset->>'eventType'),
      v_dex,
      v_form,
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
      v_presentation,
      'DRAFT',
      coalesce(nullif(upper(payload->>'repeatPolicy'), ''), preset->>'repeatPolicy'),
      auth.uid(),
      nullif(payload->>'notes', '')
    ) returning * into e;
  else
    update private.special_events
       set event_type = coalesce(nullif(upper(payload->>'eventType'), ''), event_type),
           dex = v_dex,
           pokemon_form_id = v_form,
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
           presentation = v_presentation,
           repeat_policy = coalesce(nullif(upper(payload->>'repeatPolicy'), ''), repeat_policy),
           notes = case when payload ? 'notes' then nullif(payload->>'notes', '') else notes end,
           updated_at = now()
     where id = e.id
     returning * into e;
  end if;
  return e;
end;
$function$
;
create table private.hub_event_changes(request_id uuid primary key,actor_id uuid not null,event_id uuid not null,intent jsonb not null,before_state jsonb,after_state jsonb not null,result jsonb not null,created_at timestamptz not null default now());
alter table private.hub_event_changes enable row level security;
revoke all on private.hub_event_changes from public,anon,authenticated;
CREATE FUNCTION private.hub_special_event_dispatch(p_action text, p_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;
revoke all on function private.hub_special_event_dispatch(text,jsonb) from public,anon,authenticated;
create function public.admin_hub_events_read() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare events jsonb;choices jsonb;begin
 if auth.uid() is null or private.is_play_admin() is not true then raise exception 'Staff access required.' using errcode='42501';end if;
 if (select count(*) from private.special_events)>500 then raise exception 'The event archive needs a paged review before loading.';end if;
 select coalesce(jsonb_agg(private.special_event_admin_json(e)||jsonb_build_object('revision',md5(to_jsonb(e)::text)) order by e.updated_at desc),'[]'::jsonb) into events from private.special_events e;
 select coalesce(jsonb_agg(jsonb_build_object('dex',f.dex,'formId',f.pokemon_form_id,'name',s.name,'form',f.form_label,'forcedGender',f.forced_gender) order by f.dex,f.pokemon_form_id),'[]'::jsonb) into choices from public.pokemon_forms f join public.species s on s.dex=f.dex where (f.is_base or (f.event_targetable and f.asset_status='ready')) and f.dex between 1 and 151;
 return jsonb_build_object('ok',true,'asOf',now(),'events',events,'pokemon',choices,'recentChanges',coalesce((select jsonb_agg(x.r order by x.created_at desc) from(select created_at,jsonb_build_object('requestId',request_id,'eventId',event_id,'action',intent->>'action','createdAt',created_at)r from private.hub_event_changes order by created_at desc limit 20)x),'[]'::jsonb));
end $$;
revoke all on function public.admin_hub_events_read() from public,anon;grant execute on function public.admin_hub_events_read() to authenticated;
create function public.admin_hub_events_command(p_intent jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare action text;request uuid;event_id uuid;details jsonb;payload jsonb;e private.special_events;before_state jsonb;after_state jsonb;reply jsonb;receipt jsonb;old private.hub_event_changes%rowtype;k text;begin
 if auth.uid() is null or private.is_play_admin() is not true then raise exception 'Staff access required.' using errcode='42501';end if;
 if jsonb_typeof(p_intent) is distinct from 'object' or (select count(*) from jsonb_object_keys(p_intent))<>5 or not(p_intent?&array['requestId','eventId','revision','action','details']) then raise exception 'Review this event action first.' using errcode='22023';end if;
 action:=p_intent->>'action';if action is null or action not in ('save','schedule','start_now','repeat','cancel','end') then raise exception 'Choose a supported event action.' using errcode='22023';end if;
 begin request:=(p_intent->>'requestId')::uuid;event_id:=(p_intent->>'eventId')::uuid;exception when invalid_text_representation then raise exception 'Reload the event before acting.' using errcode='22023';end;
 if request is null then raise exception 'Review the event action first.' using errcode='22023';end if;
 details:=p_intent->'details';if jsonb_typeof(details) is distinct from 'object' then raise exception 'Event details unavailable.' using errcode='22023';end if;
 perform 1 from private.stream_director where id=1 for update nowait;if not found then raise exception 'Stream controls are unavailable.' using errcode='22023';end if;
 perform 1 from private.twitch_ad_state where id=1 for update nowait;
 select * into old from private.hub_event_changes where request_id=request;
 if found then if old.actor_id<>auth.uid() or old.intent<>p_intent then raise exception 'This request was already used.' using errcode='22023';end if;return old.result||jsonb_build_object('replayed',true);end if;
 if event_id is not null then select * into e from private.special_events where id=event_id for update nowait;if not found then raise exception 'Event not found.' using errcode='22023';end if;before_state:=to_jsonb(e);if p_intent->>'revision' is distinct from md5(before_state::text) then raise exception 'The event changed. Reload before acting.' using errcode='40001';end if;
 elsif action<>'save' or p_intent->>'revision' is distinct from 'new' then raise exception 'Save an event draft first.' using errcode='22023';end if;
 if private.is_play_admin() is not true then raise exception 'Staff access changed.' using errcode='42501';end if;
 if action='save' then
  if event_id is null and(select count(*) from private.special_events)>=500 then raise exception 'The event archive needs a paged review before adding another draft.' using errcode='22023';end if;
  foreach k in array array['dex','formId','encounterCount'] loop if jsonb_typeof(details->k) is distinct from 'number' then raise exception 'Use whole values for Pokemon and encounter count.' using errcode='22023';end if;end loop;
  if (select count(*) from jsonb_object_keys(details))<>17 or not(details?&array['dex','formId','encounterCount','autoAdvance','startsAt','endsAt','eventType','variantPolicy','visibility','title','subtitle','announcement','locationKey','locationLabel','repeatPolicy','notes','gender']) then raise exception 'Reload the complete event details before saving.' using errcode='22023';end if;
  foreach k in array array['eventType','variantPolicy','visibility','title','subtitle','announcement','locationKey','locationLabel','repeatPolicy','notes','gender'] loop if jsonb_typeof(details->k) is distinct from 'string' or length(details->>k)>2000 then raise exception 'Use supported text fields.' using errcode='22023';end if;end loop;
  if (details->>'dex')!~'^[0-9]{1,3}$' or (details->>'dex')::int not between 1 and 151 or (details->>'formId')!~'^[0-9]{1,6}$' or (details->>'encounterCount')!~'^[0-9]{1,2}$' or (details->>'encounterCount')::int not between 1 and 12 or jsonb_typeof(details->'autoAdvance') is distinct from 'boolean' then raise exception 'Choose a supported Pokemon and 1 to12 encounters.' using errcode='22023';end if;
  if not exists(select 1 from public.pokemon_forms f where f.dex=(details->>'dex')::int and f.pokemon_form_id=(details->>'formId')::int and (f.is_base or(f.event_targetable and f.asset_status='ready'))) then raise exception 'This Pokemon form is not available.' using errcode='22023';end if;
  if details->>'eventType' not in ('LEGENDARY','MYTHICAL','SPECIAL','CELEBRATION','SEASONAL','COMMUNITY','ADMIN_TEST') or details->>'variantPolicy' not in ('NORMAL_ROLL','DISABLED','FORCED_SHINY') or details->>'visibility' not in ('PUBLIC','HIDDEN') or details->>'repeatPolicy' not in ('ADMIN','SEASONAL','ROTATION','ANNIVERSARY') or details->>'gender' not in ('','Male','Female','Genderless') then raise exception 'Choose the listed event options.' using errcode='22023';end if;
  foreach k in array array['title','subtitle','announcement','locationKey','locationLabel'] loop if length(btrim(details->>k)) not between 1 and 500 then raise exception 'Complete the event title,announcement and location.' using errcode='22023';end if;end loop;
  foreach k in array array['startsAt','endsAt'] loop if jsonb_typeof(details->k) not in ('null','string') then raise exception 'Choose valid event dates.' using errcode='22023';end if;if details->>k is not null then perform (details->>k)::timestamptz;end if;end loop;
  if details->>'endsAt' is not null and (details->>'startsAt' is null or (details->>'endsAt')::timestamptz<=(details->>'startsAt')::timestamptz) then raise exception 'End time must follow the start time.' using errcode='22023';end if;
  payload:=details||jsonb_build_object('id',event_id,'presentation',coalesce(e.presentation,'{}'::jsonb)-'gender');
 else if details<>'{}'::jsonb then raise exception 'Reload before using this event action.' using errcode='22023';end if;payload:=jsonb_build_object('id',event_id,'confirm',true);
  if action='schedule' and (e.starts_at is null or e.starts_at<=now()) then raise exception 'Save a future start time before scheduling.' using errcode='22023';end if;
 end if;
 reply:=private.hub_special_event_dispatch(action,payload);
 if coalesce((reply->>'ok')::boolean,false) is not true then raise exception 'Event action was not acknowledged.';end if;
 event_id:=(reply->'event'->>'id')::uuid;if event_id is null then raise exception 'Event result could not be verified.';end if;
 select to_jsonb(x) into after_state from private.special_events x where x.id=event_id;
 receipt:=jsonb_build_object('status','saved','requestId',request,'eventId',event_id,'action',action,'event',reply->'event');
 insert into private.hub_event_changes(request_id,actor_id,event_id,intent,before_state,after_state,result)values(request,auth.uid(),event_id,p_intent,before_state,after_state,receipt);
 return receipt;
end $$;
revoke all on function public.admin_hub_events_command(jsonb) from public,anon;grant execute on function public.admin_hub_events_command(jsonb) to authenticated;
create or replace function public.admin_special_event_command(p_action text,p_payload jsonb default '{}'::jsonb) returns jsonb language plpgsql security definer set search_path='public' as $$begin
 if lower(btrim(coalesce(p_action,''))) in ('list','catalog','health','preset','preview') then return private.hub_special_event_dispatch(p_action,p_payload);end if;
 raise exception 'Use Special Events in the Admin Hub to review and record this action.' using errcode='22023';end $$;
