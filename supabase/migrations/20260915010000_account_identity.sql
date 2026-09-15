-- Additive RPG account + multi-Twitch identity layer.
-- Does not drop legacy profiles.twitch_* columns. Those stay synced to PRIMARY.

alter table public.profiles
  add column if not exists username text;

create unique index if not exists profiles_username_lower_uidx
  on public.profiles (lower(username))
  where username is not null;

create table if not exists public.twitch_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  twitch_user_id text not null,
  twitch_login text not null,
  twitch_display_name text not null default '',
  avatar_url text,
  is_primary boolean not null default false,
  gameplay_enabled boolean not null default true,
  login_enabled boolean not null default true,
  connection_type text not null default 'player',
  authorization_status text not null default 'connected',
  confirmed boolean not null default true,
  linked_at timestamptz not null default now(),
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (connection_type in ('player', 'secondary', 'bot', 'utility')),
  check (authorization_status in ('connected', 'needs_reauthorization')),
  check (twitch_user_id <> ''),
  check (twitch_login <> '')
);

create unique index if not exists twitch_connections_twitch_user_uidx
  on public.twitch_connections (twitch_user_id);

create unique index if not exists twitch_connections_one_primary_uidx
  on public.twitch_connections (user_id)
  where is_primary and confirmed;

create index if not exists twitch_connections_user_idx
  on public.twitch_connections (user_id);

create index if not exists twitch_connections_login_idx
  on public.twitch_connections (lower(twitch_login));

create table if not exists private.account_audit (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  actor_id uuid,
  target_id uuid,
  action text not null,
  twitch_user_id text,
  detail jsonb not null default '{}'::jsonb
);

create index if not exists account_audit_target_idx
  on private.account_audit (target_id, at desc);

create table if not exists private.oauth_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  intent text not null,
  nonce text not null unique,
  target_twitch_user_id text,
  expires_at timestamptz not null default (now() + interval '20 minutes'),
  created_at timestamptz not null default now(),
  check (intent in ('login', 'link', 'reauthorize', 'create'))
);

create table if not exists private.reserved_usernames (
  username text primary key
);

insert into private.reserved_usernames (username) values
  ('admin'), ('administrator'), ('owner'), ('staff'), ('system'), ('official'),
  ('support'), ('moderator'), ('mod'), ('root'), ('null'), ('undefined'),
  ('api'), ('www'), ('mail'), ('nintendo'), ('pokemon'), ('twitch'),
  ('supabase'), ('starlight'), ('play'), ('trainer'), ('help')
on conflict do nothing;

alter table public.twitch_connections enable row level security;

drop policy if exists "trainers read own twitch connections" on public.twitch_connections;
create policy "trainers read own twitch connections"
  on public.twitch_connections for select to authenticated
  using (user_id = auth.uid());

revoke all on table public.twitch_connections from anon, authenticated;
grant select on table public.twitch_connections to authenticated;

create or replace function private.account_audit_write(
  p_action text,
  p_target uuid,
  p_twitch_user_id text default null,
  p_detail jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  insert into private.account_audit (actor_id, target_id, action, twitch_user_id, detail)
  values (auth.uid(), p_target, p_action, p_twitch_user_id, coalesce(p_detail, '{}'::jsonb));
end;
$$;

create or replace function private.normalize_username(p_raw text)
returns text
language sql
immutable
as $$
  select lower(btrim(coalesce(p_raw, '')));
$$;

create or replace function private.username_ok(p_raw text)
returns text
language plpgsql
stable
as $$
declare
  u text := private.normalize_username(p_raw);
begin
  if char_length(u) < 3 or char_length(u) > 20 then
    raise exception 'Usernames need 3 to 20 characters.';
  end if;
  if u !~ '^[a-z][a-z0-9_]*$' then
    raise exception 'Usernames start with a letter and can use letters, numbers, and underscores.';
  end if;
  if exists (select 1 from private.reserved_usernames r where r.username = u) then
    raise exception 'That username is reserved.';
  end if;
  return u;
end;
$$;

create or replace function private.profile_has_password(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1
      from auth.users u
     where u.id = p_uid
       and coalesce(u.encrypted_password, '') <> ''
       and u.email is not null
       and btrim(u.email) <> ''
  );
$$;

create or replace function private.twitch_login_methods(p_uid uuid)
returns int
language sql
stable
as $$
  select count(*)::int
    from public.twitch_connections c
   where c.user_id = p_uid
     and c.confirmed
     and c.login_enabled;
$$;

create or replace function private.resolve_profile_login(p_login text)
returns uuid
language plpgsql
stable
as $$
declare
  q text := lower(btrim(coalesce(p_login, '')));
  trainer uuid;
begin
  if q = '' then
    return null;
  end if;
  select p.id into trainer
    from public.profiles p
   where lower(p.username) = q
   limit 1;
  if trainer is not null then
    return trainer;
  end if;
  select c.user_id into trainer
    from public.twitch_connections c
   where c.confirmed
     and (lower(c.twitch_login) = q or c.twitch_user_id = btrim(coalesce(p_login, '')))
   order by c.is_primary desc
   limit 1;
  if trainer is not null then
    return trainer;
  end if;
  select p.id into trainer
    from public.profiles p
   where lower(coalesce(p.twitch_login, '')) = q
      or p.twitch_user_id = btrim(coalesce(p_login, ''))
      or lower(p.display_name) = q
   limit 1;
  return trainer;
end;
$$;

create or replace function private.find_trainer(p_user text, p_name text, p_gameplay boolean default false)
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

create or replace function private.sync_primary_twitch(p_uid uuid)
returns void
language plpgsql
as $$
declare
  c public.twitch_connections%rowtype;
begin
  if p_uid is null then
    return;
  end if;
  select * into c
    from public.twitch_connections
   where user_id = p_uid and confirmed and is_primary
   limit 1;
  if c.id is null then
    select * into c
      from public.twitch_connections
     where user_id = p_uid and confirmed
     order by linked_at
     limit 1;
    if c.id is not null then
      update public.twitch_connections
         set is_primary = (id = c.id), updated_at = now()
       where user_id = p_uid and confirmed;
    end if;
  end if;
  if c.id is null then
    return;
  end if;
  update public.profiles
     set twitch_user_id = c.twitch_user_id,
         twitch_login = c.twitch_login,
         avatar_url = coalesce(c.avatar_url, avatar_url),
         updated_at = now()
   where id = p_uid;
end;
$$;

create or replace function private.current_twitch()
returns table(twitch_user_id text, twitch_login text)
language sql
stable
as $$
  select c.twitch_user_id, c.twitch_login
    from public.twitch_connections c
   where c.user_id = auth.uid()
     and c.confirmed
     and c.gameplay_enabled
   order by c.is_primary desc, c.linked_at
   limit 1;
$$;

create or replace function private.play_staff_role(p_uid uuid default auth.uid())
returns text
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  channel text;
  broadcaster_id text;
  assigned text;
begin
  if p_uid is null then
    return null;
  end if;
  select c.broadcaster_twitch_login, c.twitch_broadcaster_id
    into channel, broadcaster_id
    from public.site_config c
   where c.id = 1;
  if exists (
    select 1
      from public.twitch_connections t
     where t.user_id = p_uid
       and t.confirmed
       and (
         (broadcaster_id is not null and btrim(broadcaster_id) <> '' and t.twitch_user_id = btrim(broadcaster_id))
         or (channel is not null and btrim(channel) <> '' and lower(t.twitch_login) = lower(channel))
       )
  ) then
    return 'owner';
  end if;
  if exists (
    select 1
      from auth.identities i
     where i.user_id = p_uid
       and i.provider = 'twitch'
       and (
         (broadcaster_id is not null and btrim(broadcaster_id) <> '' and coalesce(i.identity_data->>'sub', i.provider_id) = btrim(broadcaster_id))
         or (channel is not null and btrim(channel) <> '' and lower(coalesce(i.identity_data->>'preferred_username', i.identity_data->>'nickname', i.identity_data->>'name', '')) = lower(channel))
       )
  ) then
    return 'owner';
  end if;
  select r.role into assigned from public.staff_roles r where r.user_id = p_uid;
  if assigned = 'staff' then
    return 'moderator';
  end if;
  return assigned;
end;
$$;
