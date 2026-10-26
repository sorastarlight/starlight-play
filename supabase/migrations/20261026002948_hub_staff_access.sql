do $guard$ begin
if md5(pg_get_functiondef('public.admin_set_role(uuid,text)'::regprocedure)) is distinct from '0b0abd09046c5dff18fe680ec7fe9396' then raise exception 'Staff role contract drift';end if;
if md5(pg_get_functiondef('private.is_play_admin()'::regprocedure)) is distinct from 'e1449c28be1cd6f6c5208638d5a1df6f' then raise exception 'Staff role contract drift';end if;
if md5(pg_get_functiondef('private.play_staff_role(uuid)'::regprocedure)) is distinct from 'bbb6dc90f6d4a7790774ece8179dfd49' then raise exception 'Staff role contract drift';end if;
if md5(pg_get_functiondef('private.require_hub()'::regprocedure)) is distinct from '0d3c14b0c96fbc20f27ca4a85cab5d25' then raise exception 'Staff role contract drift';end if;
if to_regclass('private.hub_staff_access_changes') is not null then raise exception 'Staff access packet already installed';end if;end $guard$;
create table private.hub_staff_access_changes(request_id uuid primary key,actor_id uuid not null,target_id uuid not null,intent jsonb not null,before_state jsonb not null,after_state jsonb not null,created_at timestamptz not null default now());
alter table private.hub_staff_access_changes enable row level security;
revoke all on private.hub_staff_access_changes from public,anon,authenticated;
create function private.hub_staff_access_context(p_user uuid) returns jsonb language plpgsql stable set search_path='' as $$
declare actor uuid:=auth.uid();ar text:=private.play_staff_role();tr text;label text;v jsonb;begin
 if actor is null or ar not in ('owner','admin','moderator') or ar is null then raise exception 'Staff access required.' using errcode='42501';end if;
 select coalesce(nullif(p.display_name,''),nullif(p.username,''),'Trainer') into label from public.profiles p where p.id=p_user;
 if not found then raise exception 'Trainer not found.' using errcode='22023';end if;
 tr:=coalesce(private.play_staff_role(p_user),'player');
 v:=jsonb_build_object('actorId',actor,'actorRole',ar,'trainerId',p_user,'trainerName',label,'role',tr);
 return v||jsonb_build_object('revision',md5(v::text),'choices',case when actor=p_user or tr='owner' or ar='moderator' then '[]'::jsonb when ar='owner' then '["player","moderator","admin"]'::jsonb else '["player","moderator"]'::jsonb end);
end $$;
revoke all on function private.hub_staff_access_context(uuid) from public,anon,authenticated;
create function public.admin_staff_access_read(p_user uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare v jsonb;begin v:=private.hub_staff_access_context(p_user);
 return v||jsonb_build_object('history',coalesce((select jsonb_agg(x.r order by x.created_at desc) from(select c.created_at,jsonb_build_object('createdAt',c.created_at,'before',c.before_state->>'role','after',c.after_state->>'role','reason',c.intent->>'reason') r from private.hub_staff_access_changes c where c.target_id=p_user order by c.created_at desc limit 20)x),'[]'::jsonb));end $$;
revoke all on function public.admin_staff_access_read(uuid) from public,anon;
grant execute on function public.admin_staff_access_read(uuid) to authenticated;
create function public.admin_staff_access_save(p_intent jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare target uuid;request uuid;wanted text;v jsonb;after_v jsonb;old private.hub_staff_access_changes%rowtype;begin
 if auth.uid() is null or coalesce(private.play_staff_role(),'player') not in ('owner','admin') then raise exception 'Only the owner and admins can change staff access.' using errcode='42501';end if;
 if jsonb_typeof(p_intent) is distinct from 'object' or (select count(*) from jsonb_object_keys(p_intent))<>5 or not(p_intent ?& array['trainerId','requestId','revision','role','reason']) or jsonb_typeof(p_intent->'reason') is distinct from 'string' or length(btrim(p_intent->>'reason')) not between 3 and 1000 or jsonb_typeof(p_intent->'role') is distinct from 'string' then raise exception 'Review the role and add a staff reason.' using errcode='22023';end if;
 begin target:=(p_intent->>'trainerId')::uuid;request:=(p_intent->>'requestId')::uuid;exception when invalid_text_representation then raise exception 'Reload the trainer before saving.' using errcode='22023';end;
 if target is null or request is null then raise exception 'Reload the trainer before saving.' using errcode='22023';end if;
 -- Serialize all Hub role writes, including missing staff-role rows, and channel configuration changes.
 perform 1 from public.site_config where id=1 for update nowait;if not found then raise exception 'Game settings are unavailable.' using errcode='22023';end if;
 perform 1 from public.profiles where id in(auth.uid(),target) order by id for update nowait;
 perform 1 from public.staff_roles where user_id in(auth.uid(),target) order by user_id for update nowait;
 perform 1 from public.twitch_connections where user_id in(auth.uid(),target) order by id for update nowait;
 perform 1 from auth.identities where user_id in(auth.uid(),target) order by id for update nowait;
 v:=private.hub_staff_access_context(target);wanted:=p_intent->>'role';
 if not ((v->'choices') ? wanted) then raise exception 'This role change is not allowed.' using errcode='42501';end if;
 select * into old from private.hub_staff_access_changes where request_id=request;
 if found then
  if old.actor_id<>auth.uid() or old.target_id<>target or old.intent<>p_intent then raise exception 'This request was already used.' using errcode='22023';end if;
  return jsonb_build_object('status','saved','requestId',request,'trainerId',target,'replayed',true);
 end if;
 if p_intent->>'revision' is distinct from v->>'revision' then raise exception 'Staff access changed. Reload before saving.' using errcode='40001';end if;
 if wanted=v->>'role' then raise exception 'Choose a different role.' using errcode='22023';end if;
 if wanted='player' then delete from public.staff_roles where user_id=target;
 else insert into public.staff_roles(user_id,role) values(target,wanted) on conflict(user_id) do update set role=excluded.role;end if;
 after_v:=private.hub_staff_access_context(target);
 insert into private.hub_staff_access_changes(request_id,actor_id,target_id,intent,before_state,after_state) values(request,auth.uid(),target,p_intent,v,after_v);
 return jsonb_build_object('status','saved','requestId',request,'trainerId',target,'role',wanted);
end $$;
revoke all on function public.admin_staff_access_save(jsonb) from public,anon;
grant execute on function public.admin_staff_access_save(jsonb) to authenticated;
create or replace function public.admin_set_role(p_user uuid,p_role text) returns jsonb language plpgsql security definer set search_path='public' as $$begin raise exception 'Use Staff access in the Trainer record to review and record this change.' using errcode='22023';end $$;
