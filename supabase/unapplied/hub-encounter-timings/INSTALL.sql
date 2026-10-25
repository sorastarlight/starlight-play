do $guard$ begin
 if md5(pg_get_functiondef('public.admin_save_game_settings(jsonb)'::regprocedure)) is distinct from '04370512580090a4962d47c3385326a6' or md5(pg_get_functiondef('private.game_settings()'::regprocedure)) is distinct from '3963b75b9790583ba5aab40e2d120eae' or md5(pg_get_functiondef('private.enqueue_stream_command(text,jsonb)'::regprocedure)) is distinct from 'bfbb29e100a331b22640f08702b46da5' then raise exception 'Timing contract source drift';end if;
 if to_regclass('private.hub_timing_changes') is not null then raise exception 'Timing migration conflicts';end if;
end $guard$;
create table private.hub_timing_changes(id uuid primary key default gen_random_uuid(),actor_id uuid not null,before_state jsonb not null,after_state jsonb not null,command_id uuid,created_at timestamptz not null default now());
alter table private.hub_timing_changes enable row level security;
revoke all on private.hub_timing_changes from public,anon,authenticated;
create function private.hub_timing_values() returns jsonb language plpgsql stable set search_path='' as $$
declare source jsonb:=private.game_settings();result jsonb:='{}';k text;v numeric;begin
 foreach k in array array['joinSeconds','prepareSeconds','throwSeconds','revealSeconds'] loop
  if jsonb_typeof(source->k) is distinct from 'number' then raise exception 'Stored encounter timing is unavailable.' using errcode='22023';end if;
  v:=(source->>k)::numeric;if v<5 or v>180 or v<>trunc(v) then raise exception 'Stored encounter timing needs review.' using errcode='22023';end if;
  result:=result||jsonb_build_object(k,v::int);
 end loop;return result;end $$;
revoke all on function private.hub_timing_values() from public,anon,authenticated;
create function public.admin_encounter_timings_read() returns jsonb language plpgsql security definer set search_path='' as $$
declare values jsonb;begin if private.is_play_admin() is not true then raise exception 'Staff access required.' using errcode='42501';end if;
 values:=private.hub_timing_values();return jsonb_build_object('ok',true,'config',values,'revision',md5(values::text));end $$;
revoke all on function public.admin_encounter_timings_read() from public,anon;
grant execute on function public.admin_encounter_timings_read() to authenticated;
create function public.admin_encounter_timings_save(p_revision text,p_settings jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare before_values jsonb;after_values jsonb;k text;v numeric;command uuid;begin
 if private.is_play_admin() is not true or auth.uid() is null then raise exception 'Staff access required.' using errcode='42501';end if;
 if jsonb_typeof(p_settings) is distinct from 'object' or p_settings='{}'::jsonb or exists(select 1 from jsonb_object_keys(p_settings) x where x not in ('joinSeconds','prepareSeconds','throwSeconds','revealSeconds')) then raise exception 'Choose only encounter timing changes.' using errcode='22023';end if;
 perform 1 from public.site_config where id=1 for update;
 if not found then raise exception 'Game settings are unavailable.' using errcode='22023';end if;
 before_values:=private.hub_timing_values();if p_revision is distinct from md5(before_values::text) then raise exception 'Encounter timings changed. Reload before saving.' using errcode='40001';end if;
 after_values:=before_values;
 for k in select jsonb_object_keys(p_settings) loop
  if jsonb_typeof(p_settings->k) is distinct from 'number' then raise exception 'Use whole seconds from 5 to 180.' using errcode='22023';end if;
  v:=(p_settings->>k)::numeric;if v<5 or v>180 or v<>trunc(v) then raise exception 'Use whole seconds from 5 to 180.' using errcode='22023';end if;
  after_values:=after_values||jsonb_build_object(k,v::int);
 end loop;
 if after_values=before_values then raise exception 'No timing changes.' using errcode='22023';end if;
 update public.site_config set game_settings=coalesce(game_settings,'{}'::jsonb)||after_values,updated_at=now() where id=1;
 if exists(select 1 from private.stream_bridge where id=1 and token_hash is not null) then command:=private.enqueue_stream_command('settings',after_values);end if;
 insert into private.hub_timing_changes(actor_id,before_state,after_state,command_id) values(auth.uid(),before_values,after_values,command);
 return jsonb_build_object('ok',true,'config',after_values,'revision',md5(after_values::text),'message',case when command is not null then 'Encounter timings saved and stream PC settings queued.' else 'Encounter timings saved on Play. No stream PC connection is configured.' end,'commandQueued',command is not null);
end $$;
revoke all on function public.admin_encounter_timings_save(text,jsonb) from public,anon;
grant execute on function public.admin_encounter_timings_save(text,jsonb) to authenticated;
create or replace function public.admin_save_game_settings(p_settings jsonb) returns jsonb language plpgsql security definer set search_path='' as $$begin
 if private.is_play_admin() is not true then raise exception 'Staff access required.' using errcode='42501';end if;
 raise exception 'Open Game settings / Encounter timing to review and save timings.' using errcode='22023';end $$;
