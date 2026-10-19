-- Narrow security repair; no account changes are executed by this migration.
BEGIN;
DO $check$
BEGIN
 IF (SELECT md5(prosrc) FROM pg_proc WHERE oid='public.admin_disconnect_twitch(uuid,text)'::regprocedure) <> 'f51b54c3c819b0d01b9e5ad1a132354a' THEN
  RAISE EXCEPTION 'admin_disconnect_twitch prerequisite drifted';
 END IF;
END $check$;
DO $patch$
DECLARE definition text;
BEGIN
 SELECT pg_get_functiondef('public.admin_disconnect_twitch(uuid,text)'::regprocedure) INTO definition;
 definition := replace(definition, 'if private.play_staff_role() <> ''owner'' then', 'if auth.uid() IS NULL OR private.play_staff_role() IS DISTINCT FROM ''owner'' then');
 EXECUTE definition;
END $patch$;
REVOKE ALL ON FUNCTION public.admin_disconnect_twitch(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_disconnect_twitch(uuid,text) TO authenticated;
COMMIT;
