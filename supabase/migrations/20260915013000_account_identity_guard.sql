-- Skip bot-login denial during link/reauthorize, and treat gameplay lookup as the default.

create or replace function public.play_account_state()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  uid uuid := auth.uid();
  p public.profiles%rowtype;
  conns jsonb;
  email_on boolean := false;
  last_identity text;
  last_at timestamptz;
  allowed boolean := true;
  reason text := '';
  login_ok boolean;
  linking boolean := false;
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  delete from public.twitch_connections
   where user_id = uid and confirmed = false and created_at < now() - interval '30 minutes';
  select * into p from public.profiles where id = uid;
  email_on := private.profile_has_password(uid);
  select exists (
    select 1 from private.oauth_intents o
     where o.user_id = uid
       and o.intent in ('link', 'reauthorize')
       and o.created_at > now() - interval '15 minutes'
  ) into linking;
  select coalesce(i.identity_data->>'sub', i.provider_id), i.last_sign_in_at
    into last_identity, last_at
    from auth.identities i
   where i.user_id = uid and i.provider = 'twitch'
   order by i.last_sign_in_at desc nulls last
   limit 1;
  if last_identity is not null
     and last_at is not null
     and last_at > now() - interval '3 minutes'
     and linking is not true
     and not exists (
       select 1 from public.twitch_connections c
        where c.user_id = uid and c.twitch_user_id = last_identity and c.confirmed = false
     )
  then
    select c.login_enabled into login_ok
      from public.twitch_connections c
     where c.user_id = uid and c.twitch_user_id = last_identity and c.confirmed
     limit 1;
    if login_ok is distinct from true then
      allowed := false;
      reason := 'This Twitch account is linked as a bot or utility identity and cannot sign in.';
    end if;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'twitchUserId', c.twitch_user_id,
    'login', c.twitch_login,
    'displayName', c.twitch_display_name,
    'avatar', c.avatar_url,
    'primary', c.is_primary,
    'gameplayEnabled', c.gameplay_enabled,
    'loginEnabled', c.login_enabled,
    'type', c.connection_type,
    'status', c.authorization_status,
    'confirmed', c.confirmed,
    'linkedAt', c.linked_at,
    'lastVerifiedAt', c.last_verified_at
  ) order by c.is_primary desc, c.linked_at), '[]'::jsonb)
    into conns
    from public.twitch_connections c
   where c.user_id = uid;
  return jsonb_build_object(
    'ok', true,
    'allowed', coalesce(allowed, true),
    'denyReason', reason,
    'username', p.username,
    'displayName', p.display_name,
    'emailLogin', email_on,
    'legacyTwitchLogin', p.twitch_login,
    'legacyTwitchUserId', p.twitch_user_id,
    'connections', conns,
    'canDisconnectTwitch', email_on or private.twitch_login_methods(uid) > 1,
    'staffRole', private.play_staff_role(uid)
  );
end;
$$;

create or replace function private.find_trainer(p_user text, p_name text, p_gameplay boolean default true)
returns uuid
language plpgsql
stable
as $$
declare
  trainer uuid;
  ident text := btrim(coalesce(p_user, ''));
  login text := lower(btrim(coalesce(p_name, '')));
  gameplay_ok boolean;
begin
  if ident like 'miu:%' then
    ident := substr(ident, 5);
  end if;
  if ident <> '' then
    select c.user_id, c.gameplay_enabled
      into trainer, gameplay_ok
      from public.twitch_connections c
     where c.confirmed
       and (c.twitch_user_id = ident or c.twitch_user_id = 'miu:' || ident)
     order by c.is_primary desc
     limit 1;
    if trainer is not null then
      if p_gameplay and not gameplay_ok then
        return null;
      end if;
      return trainer;
    end if;
    select id into trainer from public.profiles
      where twitch_user_id = ident or twitch_user_id = 'miu:' || ident
      limit 1;
    if trainer is not null then
      return trainer;
    end if;
  end if;
  if login <> '' then
    select c.user_id, c.gameplay_enabled
      into trainer, gameplay_ok
      from public.twitch_connections c
     where c.confirmed and lower(c.twitch_login) = login
     order by c.is_primary desc
     limit 1;
    if trainer is not null then
      if p_gameplay and not gameplay_ok then
        return null;
      end if;
      return trainer;
    end if;
    select id into trainer from public.profiles
      where lower(twitch_login) = login or lower(display_name) = login
      limit 1;
  end if;
  return trainer;
end;
$$;

notify pgrst, 'reload schema';
