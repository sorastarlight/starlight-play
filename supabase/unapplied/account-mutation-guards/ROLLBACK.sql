BEGIN;
DO $guard$ BEGIN
IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='public.play_set_nickname(uuid,text)'::regprocedure AND md5(prosrc)='22626f4b7f13b465a9ccb0a92fd36543' AND proacl::text='{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' AND proconfig=ARRAY['search_path=public'] AND prosecdef=true AND provolatile='v' AND pg_get_userbyid(proowner)='postgres') THEN RAISE EXCEPTION 'Account mutation source or privilege drift'; END IF;
IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='public.play_set_twitch_flags(text,boolean,boolean,text)'::regprocedure AND md5(prosrc)='a9ad783164e1022dcb846f5884afb663' AND proacl::text='{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' AND proconfig=ARRAY['search_path=public'] AND prosecdef=true AND provolatile='v' AND pg_get_userbyid(proowner)='postgres') THEN RAISE EXCEPTION 'Account mutation source or privilege drift'; END IF;
IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='private.profile_has_password(uuid)'::regprocedure AND md5(prosrc)='192c2c6046da4a0495a67b3bc94ea889' AND proacl is null AND proconfig=ARRAY['search_path=public'] AND prosecdef=true AND provolatile='s' AND pg_get_userbyid(proowner)='postgres') THEN RAISE EXCEPTION 'Account mutation source or privilege drift'; END IF;
IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='private.twitch_login_methods(uuid)'::regprocedure AND md5(prosrc)='f1aecf38646cad7b1db155ac3543927c' AND proacl is null AND proconfig is null AND prosecdef=false AND provolatile='s' AND pg_get_userbyid(proowner)='postgres') THEN RAISE EXCEPTION 'Account mutation source or privilege drift'; END IF;
IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='private.twitch_link_serial(uuid,text)'::regprocedure AND md5(prosrc)='bd33762ce70084cd40477d17d5a07271' AND proacl::text='{postgres=X/postgres}' AND proconfig=ARRAY['search_path=pg_catalog'] AND prosecdef=true AND provolatile='v' AND pg_get_userbyid(proowner)='postgres') THEN RAISE EXCEPTION 'Account mutation source or privilege drift'; END IF;
END $guard$;
CREATE OR REPLACE FUNCTION public.play_set_nickname(p_catch_id uuid, p_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  uid uuid := auth.uid();
  nick text := btrim(coalesce(p_name, ''));
  c public.catches;
begin
  if uid is null then raise exception 'Sign in first.' using errcode = '42501'; end if;
  if char_length(nick) > 12 then raise exception 'Nicknames can be 12 characters, like Let’s Go.'; end if;
  if nick <> '' and nick !~ '^[A-Za-z0-9 .''-]+$' then
    raise exception 'Nicknames can use letters, numbers, spaces, periods, hyphens, and apostrophes.';
  end if;
  select * into c from public.catches where id = p_catch_id and user_id = uid and transferred_at is null;
  if c.id is null then raise exception 'That Pokémon is not in your storage.'; end if;
  update public.catches set nickname = nullif(nick, '') where id = c.id;
  return public.play_storage() || jsonb_build_object('ok', true, 'message', case when nick = '' then 'Nickname cleared.' else 'Nickname saved.' end);
end;
$function$
;
CREATE OR REPLACE FUNCTION public.play_set_twitch_flags(p_twitch_user_id text, p_gameplay_enabled boolean DEFAULT NULL::boolean, p_login_enabled boolean DEFAULT NULL::boolean, p_connection_type text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ declare uid uuid := auth.uid(); ident text := btrim(coalesce(p_twitch_user_id, '')); kind text := lower(btrim(coalesce(p_connection_type, ''))); begin if uid is null then raise exception 'Sign in first.' using errcode = '42501'; end if; if kind <> '' and kind not in ('player', 'secondary', 'bot', 'utility') then raise exception 'Unknown connection type.'; end if; if p_login_enabled is false and not private.profile_has_password(uid) and private.twitch_login_methods(uid) <= 1 and exists (select 1 from public.twitch_connections where user_id = uid and twitch_user_id = ident and confirmed and login_enabled) then raise exception 'Add an email login before disabling the only Twitch sign-in method.'; end if; update public.twitch_connections set gameplay_enabled = coalesce(p_gameplay_enabled, gameplay_enabled), login_enabled = coalesce(p_login_enabled, login_enabled), connection_type = case when kind = '' then connection_type else kind end, updated_at = now() where user_id = uid and twitch_user_id = ident and confirmed; if not found then raise exception 'That Twitch account is not linked to this Trainer.'; end if; if kind in ('bot', 'utility') then update public.twitch_connections set gameplay_enabled = coalesce(p_gameplay_enabled, false), login_enabled = coalesce(p_login_enabled, false), updated_at = now() where user_id = uid and twitch_user_id = ident; end if; perform private.account_audit_write('TWITCH_FLAGS_CHANGED', uid, ident, jsonb_build_object('gameplay', p_gameplay_enabled, 'login', p_login_enabled, 'type', kind)); return public.play_account_state() || jsonb_build_object('message', 'Twitch connection updated.'); end; $function$
;
COMMIT;
