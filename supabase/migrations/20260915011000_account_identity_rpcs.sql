-- Identity RPCs, auth triggers, Bits/trainer lookup, owner backfill.

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  uname text;
begin
  begin
    uname := private.username_ok(coalesce(new.raw_user_meta_data->>'username', new.raw_user_meta_data->>'preferred_username', ''));
  exception when others then
    uname := null;
  end;
  insert into public.profiles (id, display_name, username)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data->>'name'), ''), nullif(btrim(new.raw_user_meta_data->>'preferred_username'), ''), 'Trainer'),
    uname
  )
  on conflict (id) do nothing;
  insert into public.inventories (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

create or replace function private.handle_new_identity()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  login text;
  display text;
  existing uuid;
  first_link boolean;
begin
  if new.provider <> 'twitch' then
    return new;
  end if;
  login := coalesce(nullif(btrim(new.identity_data->>'preferred_username'), ''), nullif(btrim(new.identity_data->>'nickname'), ''), nullif(btrim(new.identity_data->>'name'), ''), 'twitch');
  display := coalesce(nullif(btrim(new.identity_data->>'name'), ''), login, 'Trainer');
  select user_id into existing
    from public.twitch_connections
   where twitch_user_id = coalesce(new.identity_data->>'sub', new.provider_id)
   limit 1;
  if existing is not null and existing is distinct from new.user_id then
    raise exception 'This Twitch account is already connected to another Trainer account.';
  end if;
  first_link := not exists (
    select 1 from public.twitch_connections c where c.user_id = new.user_id and c.confirmed
  );
  insert into public.twitch_connections (
    user_id, twitch_user_id, twitch_login, twitch_display_name, avatar_url,
    is_primary, gameplay_enabled, login_enabled, connection_type, confirmed, last_verified_at
  ) values (
    new.user_id,
    coalesce(new.identity_data->>'sub', new.provider_id),
    login,
    display,
    new.identity_data->>'picture',
    first_link,
    true,
    true,
    'player',
    first_link,
    now()
  )
  on conflict (twitch_user_id) do update
    set twitch_login = excluded.twitch_login,
        twitch_display_name = excluded.twitch_display_name,
        avatar_url = excluded.avatar_url,
        last_verified_at = now(),
        authorization_status = 'connected',
        updated_at = now()
    where public.twitch_connections.user_id = excluded.user_id;
  if first_link then
    update public.profiles
       set twitch_user_id = coalesce(new.identity_data->>'sub', new.provider_id),
           twitch_login = login,
           avatar_url = coalesce(new.identity_data->>'picture', avatar_url),
           display_name = case
             when display_name in ('Trainer', login, display) or display_name is null then display
             else display_name
           end,
           updated_at = now()
     where id = new.user_id;
  end if;
  insert into public.inventories (user_id) values (new.user_id) on conflict (user_id) do nothing;
  return new;
end;
$$;

create or replace function public.play_username_available(p_username text)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  u text;
begin
  begin
    u := private.username_ok(p_username);
  exception when others then
    return jsonb_build_object('ok', true, 'available', false);
  end;
  if exists (select 1 from public.profiles p where lower(p.username) = u and p.id is distinct from auth.uid()) then
    return jsonb_build_object('ok', true, 'available', false);
  end if;
  return jsonb_build_object('ok', true, 'available', true);
end;
$$;

create or replace function public.play_set_username(p_username text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  uid uuid := auth.uid();
  u text;
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  u := private.username_ok(p_username);
  if exists (select 1 from public.profiles p where lower(p.username) = u and p.id <> uid) then
    raise exception 'That username is already taken.';
  end if;
  update public.profiles set username = u, updated_at = now() where id = uid;
  perform private.account_audit_write('USERNAME_CHANGED', uid, null, jsonb_build_object('username', u));
  return jsonb_build_object('ok', true, 'username', u, 'message', 'Username saved.');
end;
$$;

create or replace function public.play_start_oauth_intent(p_intent text, p_target_twitch_user_id text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  uid uuid := auth.uid();
  nonce text := replace(gen_random_uuid()::text, '-', '');
  intent text := lower(btrim(coalesce(p_intent, '')));
begin
  if intent not in ('login', 'link', 'reauthorize', 'create') then
    raise exception 'Unknown Twitch action.';
  end if;
  if intent in ('link', 'reauthorize') and uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  delete from private.oauth_intents where expires_at < now();
  if uid is not null then
    delete from private.oauth_intents where user_id = uid;
  end if;
  insert into private.oauth_intents (user_id, intent, nonce, target_twitch_user_id)
  values (uid, intent, nonce, nullif(btrim(coalesce(p_target_twitch_user_id, '')), ''));
  return jsonb_build_object('ok', true, 'nonce', nonce, 'intent', intent);
end;
$$;

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
  allowed boolean := true;
  reason text := '';
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  delete from public.twitch_connections
   where user_id = uid and confirmed = false and created_at < now() - interval '30 minutes';
  select * into p from public.profiles where id = uid;
  email_on := private.profile_has_password(uid);
  select coalesce(i.identity_data->>'sub', i.provider_id) into last_identity
    from auth.identities i
   where i.user_id = uid and i.provider = 'twitch'
   order by i.last_sign_in_at desc nulls last
   limit 1;
  if last_identity is not null then
    select c.login_enabled into allowed
      from public.twitch_connections c
     where c.user_id = uid and c.twitch_user_id = last_identity and c.confirmed
     limit 1;
    if allowed is distinct from true and exists (
      select 1 from public.twitch_connections c
       where c.user_id = uid and c.twitch_user_id = last_identity and c.confirmed
    ) then
      allowed := false;
      reason := 'This Twitch account is linked as a bot or utility identity and cannot sign in.';
    else
      allowed := true;
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

create or replace function public.play_confirm_twitch_link(p_twitch_user_id text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  uid uuid := auth.uid();
  ident text := btrim(coalesce(p_twitch_user_id, ''));
  c public.twitch_connections%rowtype;
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  select * into c from public.twitch_connections
   where user_id = uid and twitch_user_id = ident
   for update;
  if c.id is null then
    raise exception 'That Twitch account is not waiting to be linked.';
  end if;
  update public.twitch_connections
     set confirmed = true, updated_at = now()
   where id = c.id;
  if not exists (select 1 from public.twitch_connections where user_id = uid and confirmed and is_primary) then
    update public.twitch_connections set is_primary = true, updated_at = now() where id = c.id;
  end if;
  perform private.sync_primary_twitch(uid);
  perform private.account_audit_write('TWITCH_LINKED', uid, ident, jsonb_build_object('login', c.twitch_login));
  return public.play_account_state() || jsonb_build_object('message', 'Twitch account linked.');
end;
$$;

create or replace function public.play_cancel_twitch_link(p_twitch_user_id text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  uid uuid := auth.uid();
  ident text := btrim(coalesce(p_twitch_user_id, ''));
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  delete from public.twitch_connections
   where user_id = uid and twitch_user_id = ident and confirmed = false;
  perform private.account_audit_write('TWITCH_LINK_CANCELLED', uid, ident, '{}'::jsonb);
  return public.play_account_state() || jsonb_build_object('message', 'Link cancelled.');
end;
$$;

create or replace function public.play_set_primary_twitch(p_twitch_user_id text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  uid uuid := auth.uid();
  ident text := btrim(coalesce(p_twitch_user_id, ''));
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.twitch_connections
     where user_id = uid and twitch_user_id = ident and confirmed
  ) then
    raise exception 'That Twitch account is not linked to this Trainer.';
  end if;
  update public.twitch_connections
     set is_primary = (twitch_user_id = ident), updated_at = now()
   where user_id = uid and confirmed;
  perform private.sync_primary_twitch(uid);
  perform private.account_audit_write('TWITCH_PRIMARY_CHANGED', uid, ident, '{}'::jsonb);
  return public.play_account_state() || jsonb_build_object('message', 'Primary Twitch account updated.');
end;
$$;

create or replace function public.play_set_twitch_flags(
  p_twitch_user_id text,
  p_gameplay_enabled boolean default null,
  p_login_enabled boolean default null,
  p_connection_type text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  uid uuid := auth.uid();
  ident text := btrim(coalesce(p_twitch_user_id, ''));
  kind text := lower(btrim(coalesce(p_connection_type, '')));
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  if kind <> '' and kind not in ('player', 'secondary', 'bot', 'utility') then
    raise exception 'Unknown connection type.';
  end if;
  if p_login_enabled is false
     and not private.profile_has_password(uid)
     and private.twitch_login_methods(uid) <= 1
     and exists (
       select 1 from public.twitch_connections
        where user_id = uid and twitch_user_id = ident and confirmed and login_enabled
     ) then
    raise exception 'Add an email login before disabling the only Twitch sign-in method.';
  end if;
  update public.twitch_connections
     set gameplay_enabled = coalesce(p_gameplay_enabled, gameplay_enabled),
         login_enabled = coalesce(p_login_enabled, login_enabled),
         connection_type = case when kind = '' then connection_type else kind end,
         updated_at = now()
   where user_id = uid and twitch_user_id = ident and confirmed;
  if not found then
    raise exception 'That Twitch account is not linked to this Trainer.';
  end if;
  if kind in ('bot', 'utility') then
    update public.twitch_connections
       set gameplay_enabled = false,
           login_enabled = coalesce(p_login_enabled, false),
           updated_at = now()
     where user_id = uid and twitch_user_id = ident;
  end if;
  perform private.account_audit_write(
    'TWITCH_FLAGS_CHANGED',
    uid,
    ident,
    jsonb_build_object('gameplay', p_gameplay_enabled, 'login', p_login_enabled, 'type', kind)
  );
  return public.play_account_state() || jsonb_build_object('message', 'Twitch connection updated.');
end;
$$;

create or replace function public.play_disconnect_twitch(p_twitch_user_id text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  uid uuid := auth.uid();
  ident text := btrim(coalesce(p_twitch_user_id, ''));
  c public.twitch_connections%rowtype;
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  select * into c from public.twitch_connections
   where user_id = uid and twitch_user_id = ident;
  if c.id is null then
    raise exception 'That Twitch account is not linked.';
  end if;
  if c.is_primary and exists (
    select 1 from public.twitch_connections
     where user_id = uid and confirmed and twitch_user_id <> ident
  ) then
    raise exception 'Choose another Primary Twitch account before disconnecting this one.';
  end if;
  if c.login_enabled and not private.profile_has_password(uid) and private.twitch_login_methods(uid) <= 1 then
    raise exception 'Add an email login before disconnecting your only Twitch sign-in.';
  end if;
  delete from public.twitch_connections where id = c.id;
  perform private.sync_primary_twitch(uid);
  perform private.account_audit_write('TWITCH_UNLINKED', uid, ident, jsonb_build_object('login', c.twitch_login));
  return public.play_account_state() || jsonb_build_object('message', 'Twitch account disconnected. RPG progress is unchanged.');
end;
$$;

grant execute on function public.play_username_available(text) to anon, authenticated;
grant execute on function public.play_set_username(text) to authenticated;
grant execute on function public.play_start_oauth_intent(text, text) to anon, authenticated;
grant execute on function public.play_account_state() to authenticated;
grant execute on function public.play_confirm_twitch_link(text) to authenticated;
grant execute on function public.play_cancel_twitch_link(text) to authenticated;
grant execute on function public.play_set_primary_twitch(text) to authenticated;
grant execute on function public.play_set_twitch_flags(text, boolean, boolean, text) to authenticated;
grant execute on function public.play_disconnect_twitch(text) to authenticated;
