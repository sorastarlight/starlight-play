do $guard$ begin
 if md5(pg_get_functiondef('public.admin_save_channel(text,text,text)'::regprocedure)) is distinct from 'f261a0688629b22ddb69c0464f140dea' or md5(pg_get_functiondef('public.admin_save_github_token(text)'::regprocedure)) is distinct from '5fa4f5eb9abf098c67f55a3b397c3168' or md5(pg_get_functiondef('public.admin_save_twitch_client_secret(text)'::regprocedure)) is distinct from 'a3fc45aec9d6a10987e2588cd451eee6' or md5(pg_get_functiondef('private.require_owner()'::regprocedure)) is distinct from '8df58c13480f9e0dff597c672358f7db' or md5(pg_get_functiondef('private.can_manage_secrets()'::regprocedure)) is distinct from 'c5c0ae8179a86d16558f2d70bbf1ab8e' then raise exception 'System connection source drift';end if;
 if to_regclass('private.hub_connection_changes') is not null or to_regprocedure('public.admin_system_connections_read()') is not null then raise exception 'System connection migration conflicts';end if;end $guard$;
create table private.hub_connection_changes(id uuid primary key default gen_random_uuid(),actor_id uuid not null,action text not null check(action in ('channel','github_token','twitch_secret')),before_public jsonb,after_public jsonb,created_at timestamptz not null default now());
alter table private.hub_connection_changes enable row level security;
revoke all on private.hub_connection_changes from public,anon,authenticated;
create function public.admin_system_connections_read() returns jsonb language plpgsql security definer set search_path='' as $$
declare owner_access boolean;channel jsonb;bits_enabled boolean;bridge jsonb;github_set boolean;secret_set boolean;begin
 if private.is_play_admin() is not true then raise exception 'Staff access required.' using errcode='42501';end if;
 owner_access:=private.can_manage_secrets() is true;
 select jsonb_build_object('login',broadcaster_twitch_login,'clientId',twitch_client_id,'broadcasterId',twitch_broadcaster_id),bits_store_enabled into channel,bits_enabled from public.site_config where id=1;
 if channel is null then raise exception 'Channel settings are unavailable.' using errcode='22023';end if;
 select jsonb_build_object('configured',token_hash is not null,'lastSeenAt',seen_at,'online',coalesce(seen_at>now()-interval '8 seconds',false)),nullif(btrim(github_token),'') is not null,nullif(btrim(twitch_client_secret),'') is not null into bridge,github_set,secret_set from private.stream_bridge where id=1;
 return jsonb_build_object('ok',true,'checkedAt',now(),'canRetryBits',coalesce(private.play_staff_role() in ('owner','admin'),false),'bitsPurchasesEnabled',coalesce(bits_enabled,false),'canManageConnections',owner_access,'channel',channel,'channelRevision',md5(channel::text),'bridge',coalesce(bridge,jsonb_build_object('configured',false,'lastSeenAt',null,'online',false)),'githubConfigured',case when owner_access then coalesce(github_set,false) else null end,'twitchSecretConfigured',case when owner_access then coalesce(secret_set,false) else null end);
end $$;
revoke all on function public.admin_system_connections_read() from public,anon;
grant execute on function public.admin_system_connections_read() to authenticated;
create or replace function public.admin_save_channel(p_login text,p_client_id text default null,p_broadcaster_id text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare prior jsonb;after_values jsonb;login text:=lower(btrim(coalesce(p_login,'')));begin
 perform private.require_owner();
 if login!~'^[a-z0-9_]{1,100}$' or (p_client_id is not null and (btrim(p_client_id)='' or length(p_client_id)>512 or p_client_id~'[[:space:]]')) or(p_broadcaster_id is not null and p_broadcaster_id!~'^[0-9]{1,40}$') then raise exception 'Check the channel login, app client ID and broadcaster ID.' using errcode='22023';end if;
 select jsonb_build_object('login',broadcaster_twitch_login,'clientId',twitch_client_id,'broadcasterId',twitch_broadcaster_id) into prior from public.site_config where id=1 for update;
 if not found then raise exception 'Channel settings are unavailable.' using errcode='22023';end if;
 perform private.require_owner();
 update public.site_config set broadcaster_twitch_login=login,twitch_client_id=coalesce(p_client_id,twitch_client_id),twitch_broadcaster_id=coalesce(p_broadcaster_id,twitch_broadcaster_id),updated_at=now() where id=1 returning jsonb_build_object('login',broadcaster_twitch_login,'clientId',twitch_client_id,'broadcasterId',twitch_broadcaster_id) into after_values;
 insert into private.hub_connection_changes(actor_id,action,before_public,after_public) values(auth.uid(),'channel',prior,after_values);
 return jsonb_build_object('ok',true,'message','Channel settings saved. Reload to verify.');
end $$;
create or replace function public.admin_save_github_token(p_token text) returns jsonb language plpgsql security definer set search_path='' as $$begin
 perform private.require_owner();if btrim(coalesce(p_token,''))='' or length(p_token)>10000 then raise exception 'Enter the GitHub token to save.' using errcode='22023';end if;
 perform 1 from public.site_config where id=1 for update;if not found then raise exception 'Channel settings are unavailable.' using errcode='22023';end if;perform private.require_owner();
 insert into private.stream_bridge(id,github_token) values(1,btrim(p_token)) on conflict(id) do update set github_token=excluded.github_token;
 insert into private.hub_connection_changes(actor_id,action) values(auth.uid(),'github_token');
 return jsonb_build_object('ok',true,'message','GitHub token saved. The connection has not been tested.');end $$;
create or replace function public.admin_save_twitch_client_secret(p_secret text) returns jsonb language plpgsql security definer set search_path='' as $$begin
 perform private.require_owner();if btrim(coalesce(p_secret,''))='' or length(p_secret)>10000 then raise exception 'Enter the Twitch app secret to save.' using errcode='22023';end if;
 perform 1 from public.site_config where id=1 for update;if not found then raise exception 'Channel settings are unavailable.' using errcode='22023';end if;perform private.require_owner();
 insert into private.stream_bridge(id,twitch_client_secret) values(1,btrim(p_secret)) on conflict(id) do update set twitch_client_secret=excluded.twitch_client_secret;
 insert into private.hub_connection_changes(actor_id,action) values(auth.uid(),'twitch_secret');
 return jsonb_build_object('ok',true,'message','Twitch app secret saved. The connection has not been tested.');end $$;

create function public.admin_system_channel_save(p_revision text,p_channel jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare prior jsonb;after_values jsonb;receipt jsonb;begin
 perform private.require_owner();
 if jsonb_typeof(p_channel) is distinct from 'object' or p_channel='{}'::jsonb or exists(select 1 from jsonb_object_keys(p_channel) k where k not in ('login','clientId','broadcasterId') or jsonb_typeof(p_channel->k) is distinct from 'string') then raise exception 'Choose only channel settings to change.' using errcode='22023';end if;
 select jsonb_build_object('login',broadcaster_twitch_login,'clientId',twitch_client_id,'broadcasterId',twitch_broadcaster_id) into prior from public.site_config where id=1 for update;
 if not found then raise exception 'Channel settings are unavailable.' using errcode='22023';end if;
 perform private.require_owner();if p_revision is distinct from md5(prior::text) then raise exception 'Channel settings changed. Reload before saving.' using errcode='40001';end if;
 after_values:=prior||p_channel;if after_values=prior then raise exception 'No channel changes.' using errcode='22023';end if;
 receipt:=public.admin_save_channel(after_values->>'login',after_values->>'clientId',after_values->>'broadcasterId');
 select jsonb_build_object('login',broadcaster_twitch_login,'clientId',twitch_client_id,'broadcasterId',twitch_broadcaster_id) into after_values from public.site_config where id=1;
 return receipt||jsonb_build_object('channelRevision',md5(after_values::text));end $$;
revoke all on function public.admin_system_channel_save(text,jsonb) from public,anon;
grant execute on function public.admin_system_channel_save(text,jsonb) to authenticated;
