do $guard$ begin
if md5(pg_get_functiondef('public.admin_director_command(text,jsonb)'::regprocedure)) is distinct from '275819eada17b74badc050c062dee4b1' or md5(pg_get_functiondef('public.admin_live_snapshot()'::regprocedure)) is distinct from '569ed582aba602c6645ffadecdc24a0d' or md5(pg_get_functiondef('private.director_start_from_payload(text,jsonb)'::regprocedure)) is distinct from '969980eab2d9e403cb1faf2238dcb271' then raise exception 'Operations source drift';end if;
if to_regprocedure('public.admin_hub_operations_read()') is not null then raise exception 'Operations API already exists';end if;
end $guard$;
create function private.hub_operations_state() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare d private.stream_director;a private.twitch_ad_state;r public.encounter_rounds;active jsonb;begin
select * into d from private.stream_director where id=1;if not found then raise exception 'Encounter controls are unavailable.' using errcode='22023';end if;
select * into a from private.twitch_ad_state where id=1;
select * into r from public.encounter_rounds where id=d.last_encounter_id;
if r.id is not null and not coalesce(r.cancelled,false) and not coalesce(r.resolved,false) and coalesce(r.phase,'')<>'closed' then active:=jsonb_build_object('id',r.id,'phase',r.phase,'name',r.name,'paused',r.paused_at is not null);end if;
return jsonb_build_object('mode',d.stream_mode,'autoEnabled',d.auto_enabled,'sessionActive',d.rpg_session_active,'sessionId',d.session_id,'manualHold',d.manual_hold,'holdUntil',d.hold_until,'holdReason',d.hold_reason,'nextEncounterAt',d.next_encounter_at,'queue',d.queued,'encounter',active,'ads',jsonb_build_object('active',a.ad_active,'nextAt',a.next_ad_at,'expectedEndAt',a.active_expected_end_at,'stale',a.stale,'dataAvailable',a.data_available,'source',a.source,'lastRefreshAt',a.last_refresh_at));end $$;
revoke all on function private.hub_operations_state() from public,anon,authenticated;
create function public.admin_hub_operations_read() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare controls jsonb;choices jsonb;begin
if private.is_play_admin() is not true then raise exception 'Staff access required.' using errcode='42501';end if;
controls:=private.hub_operations_state();
select coalesce(jsonb_agg(jsonb_build_object('dex',f.dex,'formId',f.pokemon_form_id,'name',s.name,'form',f.form_label,'gender',f.forced_gender) order by f.dex,f.is_base desc,f.pokemon_form_id),'[]'::jsonb) into choices from public.pokemon_forms f join public.species s on s.dex=f.dex where f.admin_targetable and f.dex between 1 and 151;
return jsonb_build_object('ok',true,'asOf',now(),'controls',controls,'revision',md5(controls::text),'snapshot',public.admin_live_snapshot(),'pokemon',choices);end $$;
revoke all on function public.admin_hub_operations_read() from public,anon;grant execute on function public.admin_hub_operations_read() to authenticated;
create function public.admin_hub_operations_command(p_revision text,p_action text,p_payload jsonb default '{}'::jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare controls jsonb;d private.stream_director;payload jsonb:=coalesce(p_payload,'{}'::jsonb);keys text[];allowed text[];reply jsonb;f public.pokemon_forms;begin
if private.is_play_admin() is not true then raise exception 'Staff access required.' using errcode='42501';end if;
if p_action is null or p_action not in ('pause_auto','resume_auto','set_mode','return_normal','queue_special','queue_random','cancel_queue','start_random','start_specific','start_test','force_start','pause_encounter','resume_encounter','cancel_encounter','mark_ad_started','mark_ad_ended','set_next_ad') then raise exception 'Unsupported encounter action.' using errcode='22023';end if;
if jsonb_typeof(payload)<>'object' or p_revision is null or p_revision!~'^[a-f0-9]{32}$' then raise exception 'Reload encounter controls before acting.' using errcode='22023';end if;
select * into d from private.stream_director where id=1 for update nowait;if not found then raise exception 'Encounter controls are unavailable.' using errcode='22023';end if;
perform 1 from private.twitch_ad_state where id=1 for update nowait;
perform 1 from public.encounter_rounds where id=d.last_encounter_id for update nowait;
if private.is_play_admin() is not true then raise exception 'Staff access required.' using errcode='42501';end if;
controls:=private.hub_operations_state();if md5(controls::text) is distinct from p_revision then raise exception 'Encounter state changed. Reload and review again.' using errcode='40001';end if;
allowed:=case when p_action='pause_auto' then array['minutes','reason'] when p_action='set_mode' then array['mode'] when p_action in ('queue_special','start_specific','start_test','force_start') then array['dex','formId','gender','shiny'] when p_action='mark_ad_started' then array['durationSec'] when p_action='set_next_ad' then array['nextAdAt','durationSec'] else array[]::text[] end;
if exists(select 1 from jsonb_object_keys(payload) k where not(k=any(allowed))) then raise exception 'Unexpected encounter settings.' using errcode='22023';end if;
if p_action='pause_auto' then if coalesce(payload->>'minutes','0')!~'^[0-9]{1,4}$' or coalesce((payload->>'minutes')::int,0)>1440 or length(coalesce(payload->>'reason',''))>200 then raise exception 'Use a pause from zero to 1440 minutes.' using errcode='22023';end if;end if;
if p_action='set_mode' and coalesce(payload->>'mode','') not in ('NORMAL','HIGH_ACTION','STORY','REACTION','COLLAB','BRB','SPECIAL_EVENT') then raise exception 'Choose a listed stream mode.' using errcode='22023';end if;
if p_action in ('queue_special','start_specific') or payload?'dex' then
if coalesce(payload->>'dex','')!~'^[0-9]{1,3}$' or coalesce(payload->>'formId',payload->>'dex','')!~'^[0-9]{1,6}$' then raise exception 'Choose a supported Pokemon.' using errcode='22023';end if;
select * into f from public.pokemon_forms where dex=(payload->>'dex')::int and pokemon_form_id=coalesce((payload->>'formId')::int,(payload->>'dex')::int) and admin_targetable and dex between 1 and 151;
if not found then raise exception 'This Pokemon form is not available for encounters.' using errcode='22023';end if;
if payload?'gender' and payload->>'gender' is not null and payload->>'gender' not in ('Male','Female','Genderless') then raise exception 'Choose a valid gender.' using errcode='22023';end if;
if f.forced_gender is not null and payload->>'gender' is not null and f.forced_gender<>payload->>'gender' then raise exception 'That form has a fixed gender.' using errcode='22023';end if;
end if;
if payload?'shiny' and jsonb_typeof(payload->'shiny') not in ('boolean','null') then raise exception 'Choose random, ordinary or Shiny.' using errcode='22023';end if;
if p_action in ('mark_ad_started','set_next_ad') then
if coalesce(payload->>'durationSec','180')!~'^[0-9]{1,3}$' or coalesce((payload->>'durationSec')::int,180) not between 30 and 900 then raise exception 'Use an ad duration from30 to900 seconds.' using errcode='22023';end if;end if;
if p_action='set_next_ad' and (payload->>'nextAdAt' is null or (payload->>'nextAdAt')::timestamptz<now() or (payload->>'nextAdAt')::timestamptz>now()+interval '24 hours') then raise exception 'Choose an ad time in the next24 hours.' using errcode='22023';end if;
if p_action in ('pause_encounter','resume_encounter','cancel_encounter') and controls->'encounter'='null'::jsonb then raise exception 'No active encounter. Reload before acting.' using errcode='22023';end if;
if p_action in ('start_random','start_specific','start_test','force_start') and controls->'encounter'<>'null'::jsonb then raise exception 'An encounter is already active.' using errcode='22023';end if;
reply:=public.admin_director_command(p_action,payload);
return jsonb_build_object('ok',reply->'ok','message','Command acknowledged. Reload to check the result.');
end $$;
revoke all on function public.admin_hub_operations_command(text,text,jsonb) from public,anon;grant execute on function public.admin_hub_operations_command(text,text,jsonb) to authenticated;
