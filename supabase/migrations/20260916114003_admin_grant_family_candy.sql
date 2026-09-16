-- Staff can grant family Evolution Candy from the trainer account panel.
-- Candy is not a bag item; it lives in public.family_candy.

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
  candy jsonb;
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
  select coalesce(jsonb_agg(jsonb_build_object(
    'familyId', f.id,
    'name', f.name,
    'baseDex', f.base_dex,
    'qty', coalesce(c.qty, 0),
    'members', coalesce((
      select jsonb_agg(x.name order by x.dex)
      from (
        select distinct on (s.dex) s.dex, s.name
        from public.species s
        where s.dex between 1 and 151
          and (
            s.family_id = f.id
            or coalesce(s.family_candy_species_id, 0) = f.id
            or s.dex = f.base_dex
          )
        order by s.dex
      ) x
    ), '[]'::jsonb)
  ) order by f.id), '[]'::jsonb)
    into candy
    from public.evolution_families f
    left join public.family_candy c
      on c.user_id = p_user and c.family_id = f.id
   where f.id between 1 and 151;
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
    'candy', candy,
    'mons', mons,
    'staffRole', private.play_staff_role(),
    'canEdit', coalesce(private.play_staff_role(), '') in ('owner', 'admin'),
    'ownerTools', private.play_staff_role() = 'owner'
  );
end;
$$;

create or replace function public.admin_grant_candy(p_user uuid, p_dex int, p_amount int)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  fam int;
  fam_name text;
  after_qty int;
begin
  perform private.require_staff_edit();
  if p_user is null then raise exception 'Pick a trainer.'; end if;
  if not exists (select 1 from public.profiles where id = p_user) then
    raise exception 'Pick a trainer.';
  end if;
  if p_dex is null or p_dex < 1 or p_dex > 151 then
    raise exception 'Pick a species from 1 to 151.';
  end if;
  if coalesce(p_amount, 0) = 0 then
    raise exception 'Enter how many Candy to add or remove.';
  end if;
  select coalesce(nullif(s.family_candy_species_id, 0), s.family_id, p_dex)
    into fam
    from public.species s
   where s.dex = p_dex;
  fam := coalesce(fam, p_dex);
  if not exists (select 1 from public.evolution_families where id = fam) then
    select family_id into fam from public.species where dex = p_dex;
    fam := coalesce(fam, p_dex);
  end if;
  if not exists (select 1 from public.evolution_families where id = fam) then
    raise exception 'That species has no Evolution Candy family.';
  end if;
  select name into fam_name from public.evolution_families where id = fam;
  after_qty := private.grant_family_candy(
    p_user,
    fam,
    p_amount,
    'ADMIN_GRANT',
    case when p_amount > 0 then 'Staff Candy grant' else 'Staff Candy adjustment' end,
    jsonb_build_object(
      'idempotency', 'admin-candy:' || p_user::text || ':' || fam::text || ':' || gen_random_uuid()::text
    )
  );
  return private.admin_account_json(p_user) || jsonb_build_object(
    'message', format(
      '%s %s %s Candy. They now have %s.',
      case when p_amount > 0 then 'Gave' else 'Removed' end,
      abs(p_amount),
      fam_name,
      after_qty
    )
  );
end;
$$;

revoke all on function public.admin_grant_candy(uuid, int, int) from public, anon;
grant execute on function public.admin_grant_candy(uuid, int, int) to authenticated;
