BEGIN;
DO $guard$ BEGIN
IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('public.admin_store_create_draft(jsonb)') AND md5(pg_get_functiondef(oid))='999ea1f6d8366e0bbfc40eb2e7fb9e25' AND prosecdef AND provolatile='v' AND proconfig=ARRAY['search_path=pg_catalog'] AND proacl::text='{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'Mart draft rollback drift.'; END IF;
END $guard$;
DROP FUNCTION public.admin_store_create_draft(jsonb);
COMMIT;
