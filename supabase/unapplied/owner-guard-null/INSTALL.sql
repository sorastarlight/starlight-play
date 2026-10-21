BEGIN;
DO $guard$ BEGIN
IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='private.can_manage_secrets()'::regprocedure AND md5(prosrc)='80885dfc198813a58af32b0ef4c366a1' AND proacl is null AND proconfig=ARRAY['search_path=public'] AND pg_get_userbyid(proowner)='postgres' AND prosecdef=true AND provolatile='s') THEN RAISE EXCEPTION 'Owner guard source/permission drift'; END IF;
IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='private.require_owner()'::regprocedure AND md5(prosrc)='66c8e48e91f75dfb0f88854ed75140ce' AND proacl is null AND proconfig is null AND pg_get_userbyid(proowner)='postgres' AND prosecdef=false AND provolatile='s') THEN RAISE EXCEPTION 'Owner guard source/permission drift'; END IF;
IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='public.admin_issue_bridge_token()'::regprocedure AND md5(prosrc)='4ccfaa96210594ab90c49f4460a5b617' AND proacl::text='{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}' AND proconfig=ARRAY['search_path=public'] AND pg_get_userbyid(proowner)='postgres' AND prosecdef=true AND provolatile='v') THEN RAISE EXCEPTION 'Owner guard source/permission drift'; END IF;
IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='public.admin_save_channel(text,text,text)'::regprocedure AND md5(prosrc)='a76d9f5e4f42c87bbafa6768bdbd98c4' AND proacl::text='{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}' AND proconfig=ARRAY['search_path=public'] AND pg_get_userbyid(proowner)='postgres' AND prosecdef=true AND provolatile='v') THEN RAISE EXCEPTION 'Owner guard source/permission drift'; END IF;
IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='public.admin_save_github_token(text)'::regprocedure AND md5(prosrc)='c8807a70c8761cb32fa82a8248864f55' AND proacl::text='{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}' AND proconfig=ARRAY['search_path=public'] AND pg_get_userbyid(proowner)='postgres' AND prosecdef=true AND provolatile='v') THEN RAISE EXCEPTION 'Owner guard source/permission drift'; END IF;
IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='public.admin_save_twitch_client_secret(text)'::regprocedure AND md5(prosrc)='dd03ef4fa4166fe60c45b0a22ea19316' AND proacl::text='{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}' AND proconfig=ARRAY['search_path=public'] AND pg_get_userbyid(proowner)='postgres' AND prosecdef=true AND provolatile='v') THEN RAISE EXCEPTION 'Owner guard source/permission drift'; END IF;
IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='private.play_staff_role(uuid)'::regprocedure AND md5(prosrc)='56cd588e9e8affdb6a29e7225b92919a' AND proacl is null AND proconfig=ARRAY['search_path=public'] AND pg_get_userbyid(proowner)='postgres' AND prosecdef=true AND provolatile='s') THEN RAISE EXCEPTION 'Owner guard source/permission drift'; END IF;
END $guard$;
CREATE OR REPLACE FUNCTION private.require_owner()
 RETURNS void
 LANGUAGE plpgsql
 STABLE
AS $function$
begin
  if private.can_manage_secrets() is not true then
    raise exception 'not allowed' using errcode = '42501';
  end if;
end;
$function$
;
COMMIT;
