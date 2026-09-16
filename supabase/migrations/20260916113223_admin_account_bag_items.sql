-- Staff trainer bag JSON was missing berries and evolution items after
-- the identity-admin rewrite, so grant menus showed 0 for those keys.

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
    ) || coalesce(inv.balls, '{}'::jsonb)
      || coalesce(inv.berries, '{}'::jsonb)
      || coalesce(inv.items, '{}'::jsonb);
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
