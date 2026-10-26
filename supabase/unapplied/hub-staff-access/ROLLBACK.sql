do $guard$ begin
if md5(pg_get_functiondef('private.hub_staff_access_context(uuid)'::regprocedure)) is distinct from '7b5be3ddf466fe36444f11f3a07b2ddb' then raise exception 'Staff access rollback source drift';end if;
if md5(pg_get_functiondef('public.admin_staff_access_read(uuid)'::regprocedure)) is distinct from '2e7547140e42f7d55de2cc6fa33f43d9' then raise exception 'Staff access rollback source drift';end if;
if md5(pg_get_functiondef('public.admin_staff_access_save(jsonb)'::regprocedure)) is distinct from '40d32f3d47ad122f7436a0b5916ff647' then raise exception 'Staff access rollback source drift';end if;
if md5(pg_get_functiondef('public.admin_set_role(uuid,text)'::regprocedure)) is distinct from '599b6e1efbc72b651b438f4a7be11afd' then raise exception 'Staff access rollback source drift';end if;
end $guard$;
CREATE OR REPLACE FUNCTION public.admin_set_role(p_user uuid, p_role text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  actor text := private.play_staff_role();
  target text;
  wanted text := lower(btrim(coalesce(p_role, '')));
begin
  perform private.require_hub();
  if p_user is null then
    raise exception 'Pick a trainer.';
  end if;
  if wanted not in ('player', 'moderator', 'admin') then
    raise exception 'Role must be player, moderator, or admin.';
  end if;
  if p_user = auth.uid() then
    raise exception 'You cannot change your own role.';
  end if;
  target := coalesce(private.play_staff_role(p_user), 'player');
  if target = 'owner' then
    raise exception 'The stream owner role cannot be changed here.';
  end if;
  if wanted = 'admin' and actor <> 'owner' then
    raise exception 'Only the stream owner can grant admin.';
  end if;
  if actor not in ('owner', 'admin') then
    raise exception 'Moderators can view trainers, but cannot change roles.';
  end if;
  if wanted = 'player' then
    delete from public.staff_roles where user_id = p_user;
  else
    insert into public.staff_roles (user_id, role)
    values (p_user, wanted)
    on conflict (user_id) do update set role = excluded.role;
  end if;
  return public.admin_list_users('', 0) || jsonb_build_object(
    'ok', true,
    'message', format('Role updated to %s.', wanted)
  );
end;
$function$
;
revoke all on function public.admin_staff_access_save(jsonb),public.admin_staff_access_read(uuid),private.hub_staff_access_context(uuid) from public,anon,authenticated;
-- Retain all staff roles and private audit rows; no automatic role reversal.
