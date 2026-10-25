do $guard$ begin
if md5(pg_get_functiondef('private.hub_operations_state()'::regprocedure)) is distinct from '13a6ed5e0bc981beabe8e916b6223963' then raise exception 'Operations rollback source drift';end if;
if md5(pg_get_functiondef('public.admin_hub_operations_read()'::regprocedure)) is distinct from '4be51fdc6f414c0fc8c4cf7289b01d4a' then raise exception 'Operations rollback source drift';end if;
if md5(pg_get_functiondef('public.admin_hub_operations_command(text,text,jsonb)'::regprocedure)) is distinct from '90308c60dbc4c766e265ecb2e396bea8' then raise exception 'Operations rollback source drift';end if;
end $guard$;
revoke execute on function public.admin_hub_operations_read(),public.admin_hub_operations_command(text,text,jsonb) from public,anon,authenticated;
-- Existing Director routines and current operational data are retained.
