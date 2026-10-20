-- Local-only rollback for issue17 guard. NOT a production authorization.
-- Preserves Auth users/identities, application connections, existing audit rows.
-- Archive new exception configuration before any separately approved hosted rollback.
BEGIN;
DROP TRIGGER IF EXISTS twitch_link_identity_guard ON auth.identities;
DROP TRIGGER IF EXISTS twitch_link_connection_guard ON public.twitch_connections;
DROP FUNCTION IF EXISTS public.owner_twitch_link_exception(uuid,boolean,integer,text,text,text,bigint);
DROP FUNCTION IF EXISTS public.play_twitch_link_policy();
DROP FUNCTION IF EXISTS private.guard_twitch_link_identity();
DROP FUNCTION IF EXISTS private.require_twitch_policy_actor();
DROP FUNCTION IF EXISTS private.twitch_link_slots(uuid);
DROP FUNCTION IF EXISTS private.twitch_link_serial(uuid,text);
DROP FUNCTION IF EXISTS private.twitch_link_limit(uuid);
DROP FUNCTION IF EXISTS private.twitch_link_policy_active(uuid);
DROP INDEX IF EXISTS public.twitch_connections_numeric_id_idx;
DROP FUNCTION IF EXISTS private.twitch_numeric_id(text);
DROP TABLE IF EXISTS private.twitch_link_exceptions;
DROP TABLE IF EXISTS private.twitch_link_mutex;
DROP TABLE IF EXISTS private.twitch_link_policy_settings;
COMMIT;
