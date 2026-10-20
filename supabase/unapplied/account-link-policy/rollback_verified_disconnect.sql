-- Local-only, before rollback_link_guard.sql. Archive unresolved receipts
-- before any separately approved hosted rollback. No Auth/provider deletion.
BEGIN;
DROP FUNCTION IF EXISTS public.play_prepare_twitch_disconnect(text,uuid);
DROP FUNCTION IF EXISTS public.play_finish_twitch_disconnect(uuid);
DROP FUNCTION IF EXISTS public.play_cancel_twitch_disconnect(uuid);
DROP FUNCTION IF EXISTS public.play_twitch_disconnect_state();
DROP FUNCTION public.play_disconnect_twitch(text);
ALTER FUNCTION private.play_disconnect_twitch_before_policy(text) RENAME TO play_disconnect_twitch;
ALTER FUNCTION private.play_disconnect_twitch(text) SET SCHEMA public;
DO $$ DECLARE permission record; BEGIN
  FOR permission IN SELECT a.grantee,a.is_grantable,r.rolname
    FROM private.twitch_link_policy_settings s CROSS JOIN LATERAL aclexplode(s.disconnect_prior_acl) a
    LEFT JOIN pg_roles r ON r.oid=a.grantee WHERE s.singleton AND a.privilege_type='EXECUTE'
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.play_disconnect_twitch(text) TO %s%s',
      CASE WHEN permission.grantee=0 THEN 'PUBLIC' ELSE quote_ident(permission.rolname) END,
      CASE WHEN permission.is_grantable THEN ' WITH GRANT OPTION' ELSE '' END);
  END LOOP;
END $$;
ALTER TABLE private.twitch_link_policy_settings DROP COLUMN disconnect_prior_acl;
DROP FUNCTION private.require_twitch_disconnect_actor();
DROP TABLE private.twitch_disconnect_requests;
COMMIT;
