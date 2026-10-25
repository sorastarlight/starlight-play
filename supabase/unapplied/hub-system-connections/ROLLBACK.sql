do $guard$ begin
if md5(pg_get_functiondef('public.admin_save_channel(text,text,text)'::regprocedure)) is distinct from '2c786c70529d94acbc4e9d54f92d48fb' then raise exception 'Connection rollback source drift';end if;
if md5(pg_get_functiondef('public.admin_save_github_token(text)'::regprocedure)) is distinct from '9611cfbbbe73b2d70a47771ac84b4dbc' then raise exception 'Connection rollback source drift';end if;
if md5(pg_get_functiondef('public.admin_save_twitch_client_secret(text)'::regprocedure)) is distinct from 'd08cafde1b8197dc51f14442a8b70972' then raise exception 'Connection rollback source drift';end if;
if md5(pg_get_functiondef('public.admin_system_connections_read()'::regprocedure)) is distinct from '07a94e9f6d04b8de2b5cc3c834df1606' then raise exception 'Connection rollback source drift';end if;
if md5(pg_get_functiondef('public.admin_system_channel_save(text,jsonb)'::regprocedure)) is distinct from '8e5fca8a35a63a1c169a4c58eb7e5ac2' then raise exception 'Connection rollback source drift';end if;
end $guard$;
CREATE OR REPLACE FUNCTION public.admin_save_channel(p_login text, p_client_id text DEFAULT NULL::text, p_broadcaster_id text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform private.require_owner();
  update public.site_config
    set broadcaster_twitch_login = lower(btrim(coalesce(p_login, ''))),
        twitch_client_id = coalesce(p_client_id, twitch_client_id),
        twitch_broadcaster_id = coalesce(p_broadcaster_id, twitch_broadcaster_id),
        updated_at = now()
    where id = 1;
  return private.play_snapshot(auth.uid()) || jsonb_build_object('ok', true, 'message', 'Stream channel settings saved.');
end;
$function$
;
CREATE OR REPLACE FUNCTION public.admin_save_github_token(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform private.require_owner();
  if btrim(coalesce(p_token, '')) = '' then
    raise exception 'Paste a GitHub token with Contents write on the Play repo.';
  end if;
  update private.stream_bridge
    set github_token = btrim(p_token)
    where id = 1;
  return jsonb_build_object('ok', true, 'message', 'GitHub token saved. It will not be shown again.');
end;
$function$
;
CREATE OR REPLACE FUNCTION public.admin_save_twitch_client_secret(p_secret text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform private.require_owner();
  if btrim(coalesce(p_secret, '')) = '' then
    raise exception 'Paste the Play Twitch Client Secret from the Starlight Play app.';
  end if;
  update private.stream_bridge
    set twitch_client_secret = btrim(p_secret)
    where id = 1;
  return jsonb_build_object('ok', true, 'message', 'Play Twitch Client Secret saved. It will not be shown again.');
end;
$function$
;
revoke execute on function public.admin_system_connections_read(),public.admin_system_channel_save(text,jsonb) from public,anon,authenticated;
-- Retain connection audit and all current settings/credentials;no credential rotation or data restoration occurs.
