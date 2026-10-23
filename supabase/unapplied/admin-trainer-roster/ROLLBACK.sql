BEGIN;
DO $guard$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('public.admin_trainer_pokemon(uuid,text,integer,jsonb)') AND md5(pg_get_functiondef(oid))='87826acc977c4de0191dc981d992b53a' AND prosecdef AND provolatile='s' AND proconfig=ARRAY['search_path=pg_catalog'] AND proacl::text='{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'Roster rollback drift.'; END IF;
END $guard$;
DROP FUNCTION public.admin_trainer_pokemon(uuid,text,integer,jsonb);
COMMIT;
