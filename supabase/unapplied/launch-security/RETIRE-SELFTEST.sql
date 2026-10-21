-- Obsolete frame QA endpoint; no runtime callers. Do not execute the function.
begin;
do $guard$ begin
 if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.phase5_identity_selftest()')) is distinct from '75b08e01fa171f084446fb0e4b06a718' then raise exception 'Retired selftest source drift'; end if;
end $guard$;
revoke execute on function public.phase5_identity_selftest() from public, anon, authenticated;
commit;
