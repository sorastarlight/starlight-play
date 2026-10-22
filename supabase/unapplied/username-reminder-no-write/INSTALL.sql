BEGIN;SET LOCAL lock_timeout='5s';DO $guard$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='public.play_request_username_reminder(text)'::regprocedure AND md5(prosrc)='c6a012250389fb43669d40dbc2e1ae56' AND proacl::text='{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' AND proconfig=ARRAY['search_path=public'] AND pg_get_userbyid(proowner)='postgres' AND prosecdef=true AND provolatile='v') THEN RAISE EXCEPTION 'Reminder source/ACL drift';END IF;END $guard$;CREATE OR REPLACE FUNCTION public.play_request_username_reminder(p_email text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ begin return jsonb_build_object('ok', true, 'message', 'Username reminder emails are not available. Sign in with your email address and password, or use your linked Twitch account. Your username is on My Account.'); end; $function$
;COMMIT;