CREATE OR REPLACE FUNCTION public.admin_disconnect_twitch(p_user uuid, p_twitch_user_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ declare ident text := btrim(coalesce(p_twitch_user_id, '')); c public.twitch_connections%rowtype; begin if private.play_staff_role() <> 'owner' then raise exception 'Only the owner can force-unlink a Twitch identity.'; end if; select * into c from public.twitch_connections where user_id = p_user and twitch_user_id = ident; if c.id is null then raise exception 'That Twitch account is not linked.'; end if; if c.is_primary and exists (select 1 from public.twitch_connections where user_id = p_user and confirmed and twitch_user_id <> ident) then raise exception 'Choose another Primary Twitch account before disconnecting this one.'; end if; delete from public.twitch_connections where id = c.id; perform private.sync_primary_twitch(p_user); perform private.account_audit_write('ADMIN_IDENTITY_CHANGE', p_user, ident, jsonb_build_object('op', 'disconnect', 'login', c.twitch_login)); return public.admin_user_account(p_user) || jsonb_build_object('message', 'Twitch account disconnected. RPG progress is unchanged.'); end; $function$

