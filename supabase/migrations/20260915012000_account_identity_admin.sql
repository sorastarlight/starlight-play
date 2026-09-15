-- Admin identity tools, Bits resolution, trainer lookup, backfill, owner primary.

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
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  delete from public.twitch_connections
   where user_id = uid and confirmed = false and created_at < now() - interval '30 minutes';
  select * into p from public.profiles where id = uid;
  email_on := private.profile_has_password(uid);
  select coalesce(i.identity_data->>'sub', i.provider_id), i.last_sign_in_at
    into last_identity, last_at
    from auth.identities i
   where i.user_id = uid and i.provider = 'twitch'
   order by i.last_sign_in_at desc nulls last
   limit 1;
  if last_identity is not null and last_at is not null and last_at > now() - interval '3 minutes' then
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

create or replace function public.play_request_username_reminder(p_email text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  perform private.account_audit_write(
    'USERNAME_REMINDER_REQUESTED',
    null,
    null,
    jsonb_build_object('present', btrim(coalesce(p_email, '')) <> '')
  );
  return jsonb_build_object(
    'ok', true,
    'message', 'If an account exists for that email address, we sent recovery mail. After you sign in, your Trainer username is on My Account.'
  );
end;
$$;

grant execute on function public.play_request_username_reminder(text) to anon, authenticated;

create or replace function public.play_trainer(p_login text)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  p public.profiles%rowtype;
  card jsonb;
  recent jsonb;
  mine boolean := false;
  caught_opts jsonb;
  all_catches jsonb;
  trainer uuid;
begin
  trainer := private.resolve_profile_login(p_login);
  if trainer is null then
    raise exception 'No trainer card for that login yet.';
  end if;
  select * into p from public.profiles where id = trainer;
  card := private.trainer_card(p.id);
  mine := auth.uid() is not null and auth.uid() = p.id;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'dex', c.dex,
    'name', c.name,
    'variant', c.variant,
    'gender', c.gender,
    'ball', c.ball,
    'caughtAt', c.caught_at
  ) order by c.caught_at desc), '[]'::jsonb)
    into recent
    from (
      select * from public.catches where user_id = p.id order by caught_at desc limit 24
    ) c;
  select coalesce(jsonb_agg(jsonb_build_object(
    'dex', d.dex,
    'name', d.name,
    'variant', d.variant
  ) order by d.name, d.variant), '[]'::jsonb)
    into caught_opts
    from (
      select distinct dex, name, variant from public.catches where user_id = p.id
    ) d;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'dex', c.dex,
    'name', c.name,
    'variant', c.variant,
    'gender', c.gender,
    'ball', c.ball,
    'caughtAt', c.caught_at
  ) order by c.caught_at desc), '[]'::jsonb)
    into all_catches
    from public.catches c
    where c.user_id = p.id;
  return jsonb_build_object(
    'ok', true,
    'trainer', card,
    'recent', recent,
    'mine', mine,
    'caughtOptions', case when mine then caught_opts else '[]'::jsonb end,
    'catches', case when mine then all_catches else '[]'::jsonb end
  );
end;
$function$;

create or replace function public.credit_bits_from_twitch(
  p_event_id text,
  p_login text,
  p_title text,
  p_bits int,
  p_twitch_user_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  login text := lower(btrim(coalesce(p_login, '')));
  ident text := btrim(coalesce(p_twitch_user_id, ''));
  sku text;
  item jsonb;
  trainer uuid;
  gameplay_ok boolean := true;
  inserted text;
  note text;
begin
  if btrim(coalesce(p_event_id, '')) = '' then
    raise exception 'Missing Bits event id.';
  end if;
  sku := private.bits_sku(p_title, p_bits);
  insert into private.bits_events (event_id, twitch_login, sku, granted, detail)
  values (p_event_id, login, coalesce(sku, ''), false, '')
  on conflict (event_id) do nothing
  returning event_id into inserted;
  if inserted is null then
    return jsonb_build_object('ok', true, 'duplicate', true, 'message', 'Already credited.');
  end if;
  if sku is null then
    note := 'Unknown Power-Up "' || coalesce(p_title, '') || '" (' || coalesce(p_bits, 0)::text || ' Bits).';
    update private.bits_events set detail = note where event_id = p_event_id;
    update private.stream_bridge
      set last_bits_at = now(), last_bits_detail = note
      where id = 1;
    return jsonb_build_object('ok', true, 'granted', false, 'message', note);
  end if;
  select elem into item
    from jsonb_array_elements(private.store_catalog()->'bits') as elem
   where elem->>'sku' = sku;
  if item is null then
    note := 'Unknown Bits pack.';
    update private.bits_events set detail = note where event_id = p_event_id;
    return jsonb_build_object('ok', true, 'granted', false, 'message', note);
  end if;
  if login = '' and ident = '' then
    note := 'Twitch did not send a viewer identity.';
    update private.bits_events set detail = note where event_id = p_event_id;
    return jsonb_build_object('ok', true, 'granted', false, 'message', note);
  end if;
  trainer := private.find_trainer(ident, login, true);
  if trainer is null then
    trainer := private.find_trainer(ident, login, false);
    if trainer is not null then
      note := 'Skipped Bits grant. That Twitch identity is linked as a bot or utility account.';
      update private.bits_events set detail = note where event_id = p_event_id;
      return jsonb_build_object('ok', true, 'granted', false, 'skipped', true, 'message', note);
    end if;
    insert into private.bits_pending (event_id, twitch_login, sku)
    values (p_event_id, coalesce(nullif(login, ''), ident), sku)
    on conflict (event_id) do nothing;
    note := (item->>'name') || ' is waiting. That viewer needs to sign into Play once.';
    update private.bits_events set detail = note where event_id = p_event_id;
    update private.stream_bridge
      set last_bits_at = now(), last_bits_detail = note
      where id = 1;
    return jsonb_build_object('ok', true, 'pending', true, 'sku', sku, 'message', note);
  end if;
  begin
    perform private.grant_items(trainer, item->'grants', 'BITS_REWARD', sku, 'bits:' || p_event_id, true);
    note := 'Granted ' || (item->>'name') || ' to ' || coalesce(nullif(login, ''), ident) || '.';
    update private.bits_events set granted = true, detail = note where event_id = p_event_id;
    update private.stream_bridge
      set last_bits_at = now(), last_bits_detail = note
      where id = 1;
    return jsonb_build_object('ok', true, 'granted', true, 'sku', sku, 'message', note);
  exception when others then
    insert into private.bits_pending (event_id, twitch_login, sku)
    values (p_event_id, coalesce(nullif(login, ''), ident), sku)
    on conflict (event_id) do nothing;
    note := sqlerrm;
    update private.bits_events set detail = note where event_id = p_event_id;
    update private.stream_bridge
      set last_bits_at = now(), last_bits_detail = note
      where id = 1;
    return jsonb_build_object('ok', true, 'pending', true, 'sku', sku, 'message', note);
  end;
end;
$function$;

revoke all on function public.credit_bits_from_twitch(text, text, text, int, text) from public, anon, authenticated;
grant execute on function public.credit_bits_from_twitch(text, text, text, int, text) to service_role;
grant execute on function public.credit_bits_from_twitch(text, text, text, int) to service_role;

create or replace function private.flush_bits_pending(p_uid uuid)
returns void
language plpgsql
as $function$
declare
  rec record;
  item jsonb;
  logins text[];
begin
  if p_uid is null then
    return;
  end if;
  if current_setting('play.flushing_bits', true) = '1' then
    return;
  end if;
  perform set_config('play.flushing_bits', '1', true);
  select array_agg(distinct lower(x.login)) into logins
    from (
      select c.twitch_login as login
        from public.twitch_connections c
       where c.user_id = p_uid and c.confirmed and c.gameplay_enabled
      union
      select p.twitch_login
        from public.profiles p
       where p.id = p_uid and p.twitch_login is not null
    ) x
    where btrim(coalesce(x.login, '')) <> '';
  if logins is null then
    return;
  end if;
  for rec in
    select event_id, sku, twitch_login
      from private.bits_pending
     where lower(twitch_login) = any (logins)
     order by created_at
  loop
    if exists (
      select 1 from public.twitch_connections c
       where c.user_id = p_uid
         and c.confirmed
         and lower(c.twitch_login) = lower(rec.twitch_login)
         and not c.gameplay_enabled
    ) then
      delete from private.bits_pending where event_id = rec.event_id;
      update private.bits_events
         set detail = 'Skipped. That Twitch identity is excluded from gameplay rewards.',
             granted = false
       where event_id = rec.event_id;
      continue;
    end if;
    select elem into item
      from jsonb_array_elements(private.store_catalog()->'bits') as elem
     where elem->>'sku' = rec.sku;
    if item is null then
      delete from private.bits_pending where event_id = rec.event_id;
      update private.bits_events
         set detail = 'Unknown Bits pack.', granted = false
       where event_id = rec.event_id;
      continue;
    end if;
    begin
      perform private.grant_items(p_uid, item->'grants', 'BITS_REWARD', rec.sku, 'bits:' || rec.event_id, true);
      delete from private.bits_pending where event_id = rec.event_id;
      update private.bits_events
         set granted = true, detail = 'Granted ' || (item->>'name') || '.'
       where event_id = rec.event_id;
    exception when others then
      update private.bits_events
         set detail = sqlerrm
       where event_id = rec.event_id;
    end;
  end loop;
end;
$function$;

create or replace function public.admin_list_users(p_query text default '', p_offset int default 0)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  q text := lower(btrim(coalesce(p_query, '')));
  start_at int := greatest(coalesce(p_offset, 0), 0);
  rows jsonb;
  total int;
begin
  perform private.require_hub();
  select count(*)::int into total
    from public.profiles p
   where q = ''
      or lower(coalesce(p.username, '')) like '%' || q || '%'
      or lower(coalesce(p.twitch_login, '')) like '%' || q || '%'
      or lower(coalesce(p.display_name, '')) like '%' || q || '%'
      or p.id::text like '%' || q || '%'
      or exists (
        select 1 from public.twitch_connections c
         where c.user_id = p.id
           and (
             lower(c.twitch_login) like '%' || q || '%'
             or lower(c.twitch_display_name) like '%' || q || '%'
             or c.twitch_user_id like '%' || q || '%'
           )
      );
  select coalesce(jsonb_agg(row_to_json(x)::jsonb), '[]'::jsonb)
    into rows
    from (
      select
        p.id,
        coalesce(p.username, p.twitch_login) as login,
        coalesce(nullif(p.display_name, ''), p.username, p.twitch_login, 'Trainer') as "displayName",
        p.avatar_url as avatar,
        coalesce(private.play_staff_role(p.id), 'player') as role,
        p.created_at as "createdAt",
        p.last_seen_at as "lastSeenAt",
        p.starlight_pass as pass,
        coalesce(i.coins, 0) as coins,
        (select count(*)::int from public.catches c where c.user_id = p.id and c.transferred_at is null) as caught
      from public.profiles p
      left join public.inventories i on i.user_id = p.id
      where q = ''
         or lower(coalesce(p.username, '')) like '%' || q || '%'
         or lower(coalesce(p.twitch_login, '')) like '%' || q || '%'
         or lower(coalesce(p.display_name, '')) like '%' || q || '%'
         or p.id::text like '%' || q || '%'
         or exists (
           select 1 from public.twitch_connections c
            where c.user_id = p.id
              and (
                lower(c.twitch_login) like '%' || q || '%'
                or lower(c.twitch_display_name) like '%' || q || '%'
                or c.twitch_user_id like '%' || q || '%'
              )
         )
      order by p.display_name, p.twitch_login
      limit 50 offset start_at
    ) x;
  return jsonb_build_object('ok', true, 'total', total, 'offset', start_at, 'users', rows, 'staffRole', private.play_staff_role());
end;
$$;

create or replace function private.admin_account_json(p_user uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  p public.profiles%rowtype;
  inv public.inventories;
  bag jsonb;
  mons jsonb;
  conns jsonb;
  primary_login text;
  gameplay_n int := 0;
  bot_n int := 0;
begin
  select * into p from public.profiles where id = p_user;
  if p.id is null then
    raise exception 'No Play account for that trainer.';
  end if;
  select * into inv from public.inventories where user_id = p_user;
  if inv.user_id is null then
    bag := jsonb_build_object(
      'berry', 0, 'bait', 0, 'pokeball', 0, 'greatball', 0, 'ultraball', 0,
      'lure', 0, 'coins', 0, 'bag_bonus', 0, 'capacity', 50, 'used', 0
    );
  else
    bag := jsonb_build_object(
      'berry', inv.berry, 'bait', inv.bait, 'pokeball', inv.pokeball,
      'greatball', inv.greatball, 'ultraball', inv.ultraball,
      'lure', inv.lure, 'coins', inv.coins, 'bag_bonus', inv.bag_bonus,
      'capacity', private.bag_capacity(p_user),
      'used', private.item_total(inv)
    ) || coalesce(inv.balls, '{}'::jsonb);
  end if;
  select coalesce(jsonb_agg(row_to_json(x)::jsonb), '[]'::jsonb)
    into mons
    from (
      select c.id, c.dex, c.name, c.nickname, c.variant, c.gender, c.ball, c.level, c.caught_at as "caughtAt"
      from public.catches c
      where c.user_id = p_user and c.transferred_at is null
      order by c.caught_at desc
      limit 40
    ) x;
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
   where c.user_id = p_user;
  select c.twitch_login into primary_login
    from public.twitch_connections c
   where c.user_id = p_user and c.confirmed and c.is_primary
   limit 1;
  select count(*)::int into gameplay_n
    from public.twitch_connections c
   where c.user_id = p_user and c.confirmed and c.gameplay_enabled;
  select count(*)::int into bot_n
    from public.twitch_connections c
   where c.user_id = p_user and c.confirmed and c.connection_type in ('bot', 'utility');
  return jsonb_build_object(
    'ok', true,
    'user', jsonb_build_object(
      'id', p.id,
      'username', p.username,
      'login', coalesce(primary_login, p.twitch_login),
      'displayName', coalesce(nullif(p.display_name, ''), p.username, p.twitch_login, 'Trainer'),
      'avatar', p.avatar_url,
      'role', coalesce(private.play_staff_role(p.id), 'player'),
      'pass', p.starlight_pass,
      'createdAt', p.created_at,
      'lastSeenAt', p.last_seen_at,
      'emailLogin', private.profile_has_password(p.id)
    ),
    'health', jsonb_build_object(
      'primaryTwitch', primary_login,
      'linkedTwitch', coalesce(jsonb_array_length(conns), 0),
      'gameplayTwitch', gameplay_n,
      'botTwitch', bot_n
    ),
    'connections', conns,
    'bag', bag,
    'mons', mons,
    'staffRole', private.play_staff_role(),
    'canEdit', coalesce(private.play_staff_role(), '') in ('owner', 'admin'),
    'ownerTools', private.play_staff_role() = 'owner'
  );
end;
$$;

create or replace function public.admin_set_twitch_primary(p_user uuid, p_twitch_user_id text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  perform private.require_staff_edit();
  if not exists (
    select 1 from public.twitch_connections
     where user_id = p_user and twitch_user_id = btrim(p_twitch_user_id) and confirmed
  ) then
    raise exception 'That Twitch account is not linked to this Trainer.';
  end if;
  update public.twitch_connections
     set is_primary = (twitch_user_id = btrim(p_twitch_user_id)), updated_at = now()
   where user_id = p_user and confirmed;
  perform private.sync_primary_twitch(p_user);
  perform private.account_audit_write('ADMIN_IDENTITY_CHANGE', p_user, btrim(p_twitch_user_id), jsonb_build_object('op', 'primary'));
  return private.admin_account_json(p_user) || jsonb_build_object('message', 'Primary Twitch account updated.');
end;
$$;

create or replace function public.admin_set_twitch_flags(
  p_user uuid,
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
  kind text := lower(btrim(coalesce(p_connection_type, '')));
begin
  perform private.require_staff_edit();
  if kind <> '' and kind not in ('player', 'secondary', 'bot', 'utility') then
    raise exception 'Unknown connection type.';
  end if;
  update public.twitch_connections
     set gameplay_enabled = coalesce(p_gameplay_enabled, gameplay_enabled),
         login_enabled = coalesce(p_login_enabled, login_enabled),
         connection_type = case when kind = '' then connection_type else kind end,
         updated_at = now()
   where user_id = p_user and twitch_user_id = btrim(p_twitch_user_id) and confirmed;
  if not found then
    raise exception 'That Twitch account is not linked to this Trainer.';
  end if;
  if kind in ('bot', 'utility') then
    update public.twitch_connections
       set gameplay_enabled = coalesce(p_gameplay_enabled, false),
           login_enabled = coalesce(p_login_enabled, false),
           updated_at = now()
     where user_id = p_user and twitch_user_id = btrim(p_twitch_user_id);
  end if;
  perform private.account_audit_write(
    'ADMIN_IDENTITY_CHANGE',
    p_user,
    btrim(p_twitch_user_id),
    jsonb_build_object('op', 'flags', 'gameplay', p_gameplay_enabled, 'login', p_login_enabled, 'type', kind)
  );
  return private.admin_account_json(p_user) || jsonb_build_object('message', 'Twitch connection updated.');
end;
$$;

create or replace function public.admin_disconnect_twitch(p_user uuid, p_twitch_user_id text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  ident text := btrim(coalesce(p_twitch_user_id, ''));
  c public.twitch_connections%rowtype;
begin
  if private.play_staff_role() <> 'owner' then
    raise exception 'Only the owner can force-unlink a Twitch identity.';
  end if;
  select * into c from public.twitch_connections
   where user_id = p_user and twitch_user_id = ident;
  if c.id is null then
    raise exception 'That Twitch account is not linked.';
  end if;
  if c.is_primary and exists (
    select 1 from public.twitch_connections
     where user_id = p_user and confirmed and twitch_user_id <> ident
  ) then
    raise exception 'Choose another Primary Twitch account before disconnecting this one.';
  end if;
  delete from public.twitch_connections where id = c.id;
  perform private.sync_primary_twitch(p_user);
  perform private.account_audit_write('ADMIN_IDENTITY_CHANGE', p_user, ident, jsonb_build_object('op', 'disconnect', 'login', c.twitch_login));
  return private.admin_account_json(p_user) || jsonb_build_object('message', 'Twitch account disconnected. RPG progress is unchanged.');
end;
$$;

grant execute on function public.admin_set_twitch_primary(uuid, text) to authenticated;
grant execute on function public.admin_set_twitch_flags(uuid, text, boolean, boolean, text) to authenticated;
grant execute on function public.admin_disconnect_twitch(uuid, text) to authenticated;

-- Backfill existing Twitch identities as linked connections.
insert into public.twitch_connections (
  user_id, twitch_user_id, twitch_login, twitch_display_name, avatar_url,
  is_primary, gameplay_enabled, login_enabled, connection_type, confirmed, last_verified_at
)
select
  i.user_id,
  coalesce(i.identity_data->>'sub', i.provider_id),
  coalesce(nullif(i.identity_data->>'preferred_username', ''), nullif(i.identity_data->>'nickname', ''), nullif(i.identity_data->>'name', ''), 'twitch'),
  coalesce(nullif(i.identity_data->>'name', ''), nullif(i.identity_data->>'nickname', ''), 'Trainer'),
  i.identity_data->>'picture',
  false,
  true,
  true,
  'player',
  true,
  coalesce(i.updated_at, now())
from auth.identities i
where i.provider = 'twitch'
  and coalesce(i.identity_data->>'sub', i.provider_id) is not null
on conflict (twitch_user_id) do nothing;

insert into public.twitch_connections (
  user_id, twitch_user_id, twitch_login, twitch_display_name, avatar_url,
  is_primary, gameplay_enabled, login_enabled, connection_type, confirmed
)
select p.id, p.twitch_user_id, p.twitch_login, coalesce(p.display_name, p.twitch_login, 'Trainer'), p.avatar_url,
       false, true, true, 'player', true
  from public.profiles p
 where p.twitch_user_id is not null
   and not exists (select 1 from public.twitch_connections c where c.twitch_user_id = p.twitch_user_id)
on conflict (twitch_user_id) do nothing;

-- Broadcaster numeric ID is PRIMARY + gameplay/login enabled.
update public.twitch_connections c
   set is_primary = (c.twitch_user_id = btrim(cfg.twitch_broadcaster_id)),
       gameplay_enabled = (c.twitch_user_id = btrim(cfg.twitch_broadcaster_id)) or c.user_id not in (
         select x.user_id from public.twitch_connections x where x.twitch_user_id = btrim(cfg.twitch_broadcaster_id)
       ),
       updated_at = now()
  from public.site_config cfg
 where cfg.id = 1
   and btrim(coalesce(cfg.twitch_broadcaster_id, '')) <> '';

update public.twitch_connections c
   set gameplay_enabled = false,
       login_enabled = false,
       connection_type = 'bot',
       is_primary = false,
       updated_at = now()
  from public.site_config cfg
 where cfg.id = 1
   and c.user_id in (select x.user_id from public.twitch_connections x where x.twitch_user_id = btrim(cfg.twitch_broadcaster_id))
   and c.twitch_user_id is distinct from btrim(cfg.twitch_broadcaster_id);

update public.twitch_connections c
   set is_primary = true, updated_at = now()
 where c.confirmed
   and not exists (
     select 1 from public.twitch_connections x
      where x.user_id = c.user_id and x.confirmed and x.is_primary
   )
   and c.id = (
     select y.id from public.twitch_connections y
      where y.user_id = c.user_id and y.confirmed
      order by y.linked_at
      limit 1
   );

do $$
declare
  rec record;
begin
  for rec in select distinct user_id from public.twitch_connections loop
    perform private.sync_primary_twitch(rec.user_id);
  end loop;
end $$;

update public.profiles p
   set display_name = 'Sora Starlight',
       username = coalesce(p.username, 'sorastarlight'),
       updated_at = now()
 where p.id in (
   select c.user_id
     from public.twitch_connections c
     join public.site_config cfg on cfg.id = 1
    where c.twitch_user_id = btrim(cfg.twitch_broadcaster_id)
 )
   and lower(coalesce(p.display_name, '')) in ('motobugbot', 'trainer', 'sorastarlight');

update public.profiles p
   set username = regexp_replace(private.normalize_username(coalesce(p.twitch_login, p.display_name)), '[^a-z0-9_]', '', 'g')
 where p.username is null
   and coalesce(p.twitch_login, p.display_name) is not null
   and regexp_replace(private.normalize_username(coalesce(p.twitch_login, p.display_name)), '[^a-z0-9_]', '', 'g') ~ '^[a-z][a-z0-9_]{2,19}$';

update public.profiles
   set username = 'playtester'
 where display_name = 'Play Tester' and username is null;

notify pgrst, 'reload schema';
