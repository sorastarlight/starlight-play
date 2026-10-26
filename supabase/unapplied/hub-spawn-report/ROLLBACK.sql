do $guard$ begin if md5(pg_get_functiondef('public.admin_spawn_rules_read()'::regprocedure)) is distinct from '5db2eaa1e94098a130bfe71f776f0e99' then raise exception 'Spawn report rollback source drift';end if;end $guard$;
revoke all on function public.admin_spawn_rules_read() from public,anon,authenticated;
-- No gameplay/configuration/player changes to reverse.
