-- Premium avatar packs (Sonic series first). Cosmetic, no bag space.

alter table public.profiles
  add column if not exists owned_avatar_packs text[] not null default '{}';

create or replace function private.premium_avatar_catalog()
returns jsonb
language sql
immutable
as $$
  select jsonb_build_array(
    jsonb_build_object(
      'sku', 'avatar-sonic',
      'name', 'Sonic the Hedgehog Series',
      'cost', 200,
      'pack', 'sonic',
      'blurb', 'Unlock Sonic, Tails, Knuckles, Amy, and Cream for your Trainer ID.',
      'looks', jsonb_build_array('sonic-sonic', 'sonic-tails', 'sonic-knuckles', 'sonic-amy', 'sonic-cream')
    )
  );
$$;

create or replace function private.premium_sprite_pack(p_sprite text)
returns text
language sql
immutable
as $$
  select case
    when p_sprite in ('sonic-sonic', 'sonic-tails', 'sonic-knuckles', 'sonic-amy', 'sonic-cream') then 'sonic'
    else null
  end;
$$;

create or replace function private.owns_avatar_pack(p_uid uuid, p_pack text)
returns boolean
language sql
stable
as $$
  select p_pack is null or exists (
    select 1
    from public.profiles
    where id = p_uid
      and p_pack = any (coalesce(owned_avatar_packs, '{}'::text[]))
  );
$$;

create or replace function private.owned_avatar_packs_json(p_uid uuid)
returns jsonb
language sql
stable
as $$
  select case
    when p_uid is null then '[]'::jsonb
    else coalesce(
      (select to_jsonb(coalesce(owned_avatar_packs, '{}'::text[])) from public.profiles where id = p_uid),
      '[]'::jsonb
    )
  end;
$$;

update public.profiles
set owned_avatar_packs = array_append(coalesce(owned_avatar_packs, '{}'::text[]), 'sonic')
where trainer_sprite like 'sonic-%'
  and not ('sonic' = any (coalesce(owned_avatar_packs, '{}'::text[])));

create or replace function public.play_set_trainer_sprite(p_sprite text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  uid uuid := auth.uid();
  sprite text := btrim(coalesce(p_sprite, ''));
  pack text;
begin
  if uid is null then
    raise exception 'Sign in to choose a trainer sprite.' using errcode = '42501';
  end if;
  if not private.trainer_sprite_ok(sprite) then
    raise exception 'That trainer look is not available.';
  end if;
  pack := private.premium_sprite_pack(sprite);
  if pack is not null and not private.owns_avatar_pack(uid, pack) then
    raise exception 'Unlock this series in Premium Avatars on the Store.';
  end if;
  update public.profiles
    set trainer_sprite = sprite, updated_at = now()
    where id = uid;
  return jsonb_build_object(
    'ok', true,
    'message', 'Trainer look saved.',
    'trainer', private.trainer_card(uid)
  );
end;
$$;

create or replace function public.play_store()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  uid uuid := auth.uid();
  inv public.inventories;
  pass boolean := false;
begin
  if uid is not null then
    inv := private.ensure_inventory(uid);
    select starlight_pass into pass from public.profiles where id = uid;
  end if;
  return private.play_snapshot(uid) || jsonb_build_object(
    'ok', true,
    'catalog', private.store_catalog() || jsonb_build_object('avatars', private.premium_avatar_catalog()),
    'wallet', case when inv.user_id is null then null else jsonb_build_object(
      'coins', inv.coins,
      'capacity', private.bag_capacity(uid),
      'used', private.item_total(inv),
      'dailyReady', pass and (inv.pass_daily_at is null or inv.pass_daily_at < now() - interval '20 hours'),
      'weeklyReady', pass and (inv.pass_weekly_at is null or inv.pass_weekly_at < now() - interval '6 days')
    ) end
  );
end;
$$;

create or replace function public.play_buy_sku(p_sku text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  uid uuid := auth.uid();
  item jsonb;
  inv public.inventories;
  pack text;
begin
  if uid is null then
    raise exception 'Sign in to use the mart.' using errcode = '42501';
  end if;
  select elem into item
  from (
    select jsonb_array_elements(private.store_catalog()->'coins') as elem
    union all
    select jsonb_array_elements(coalesce(private.store_catalog()->'balls', '[]'::jsonb)) as elem
    union all
    select jsonb_array_elements(private.premium_avatar_catalog()) as elem
  ) s
  where elem->>'sku' = p_sku;
  if item is null then
    raise exception 'That shelf item is not sold for PokéCoins.';
  end if;
  pack := nullif(item->>'pack', '');
  inv := private.ensure_inventory(uid);
  if inv.coins < (item->>'cost')::int then
    raise exception 'Not enough PokéCoins.';
  end if;
  if pack is not null then
    if private.owns_avatar_pack(uid, pack) then
      raise exception 'You already own this series.';
    end if;
    update public.inventories
      set coins = coins - (item->>'cost')::int, updated_at = now()
      where user_id = uid;
    update public.profiles
      set owned_avatar_packs = array_append(coalesce(owned_avatar_packs, '{}'::text[]), pack),
          updated_at = now()
      where id = uid
        and not (pack = any (coalesce(owned_avatar_packs, '{}'::text[])));
    return private.play_snapshot(uid) || jsonb_build_object(
      'ok', true,
      'message', 'Unlocked ' || (item->>'name') || '. Choose it in Settings.'
    );
  end if;
  update public.inventories
    set coins = coins - (item->>'cost')::int, updated_at = now()
    where user_id = uid;
  perform private.grant_known(uid, item->'grants');
  return private.play_snapshot(uid) || jsonb_build_object('ok', true, 'message', 'Added ' || (item->>'name') || ' to your inventory.');
end;
$$;

create or replace function private.play_snapshot(p_uid uuid)
returns jsonb
language plpgsql
as $$
declare
  r public.encounter_rounds;
  bag jsonb;
  me jsonb;
  pass jsonb;
  settings jsonb;
  is_admin boolean;
  staff_role text;
  visible jsonb;
  inv public.inventories;
begin
  r := private.sync_latest_round();
  staff_role := case when p_uid is not null then private.play_staff_role(p_uid) else null end;
  is_admin := staff_role is not null;
  settings := private.game_settings();
  if p_uid is not null then
    perform private.ensure_broadcaster_pass(p_uid);
    inv := private.ensure_inventory(p_uid);
    if r is not null and coalesce(r.cancelled, false) = false and private.round_phase(r) <> 'closed' then
      perform private.mark_seen(p_uid, r.dex);
    end if;
    bag := jsonb_build_object(
      'berry', inv.berry, 'bait', inv.bait, 'pokeball', inv.pokeball,
      'greatball', inv.greatball, 'ultraball', inv.ultraball,
      'lure', inv.lure, 'coins', inv.coins,
      'capacity', private.bag_capacity(p_uid),
      'used', private.item_total(inv),
      'lureArmed', inv.lure_armed
    ) || coalesce(inv.balls, '{}'::jsonb);
    select jsonb_build_object('active', p.starlight_pass, 'source', p.pass_source, 'checkedAt', p.pass_checked_at)
      into pass from public.profiles p where p.id = p_uid;
    if r is not null then
      select jsonb_build_object('joined', true, 'prep', ep.prep, 'ball', ep.ball, 'result', ep.result, 'chance', ep.chance, 'caught', ep.caught)
        into me from public.encounter_players ep where ep.round_id = r.id and ep.user_id = p_uid;
    end if;
  end if;
  if r is not null and (not r.hidden or is_admin) then
    visible := private.public_round_json(r);
  end if;
  return jsonb_build_object(
    'round', visible,
    'me', me,
    'bag', bag,
    'pass', pass,
    'trainer', private.trainer_card(p_uid),
    'ownedAvatarPacks', private.owned_avatar_packs_json(p_uid),
    'isAdmin', is_admin,
    'staffRole', staff_role,
    'canManageSecrets', staff_role = 'owner',
    'settings', jsonb_build_object(
      'joinSeconds', settings->>'joinSeconds',
      'prepareSeconds', settings->>'prepareSeconds',
      'throwSeconds', settings->>'throwSeconds',
      'revealSeconds', settings->>'revealSeconds',
      'ballChances', settings->'ballChances',
      'berryBonus', settings->'berryBonus',
      'maxBaitBonus', settings->'maxBaitBonus',
      'maxCatchChance', settings->'maxCatchChance'
    ),
    'channel', (select broadcaster_twitch_login from public.site_config where id = 1),
    'bitsStoreEnabled', false,
    'bitsCatalogEnabled', true,
    'coinShopEnabled', true,
    'live', (select is_live from public.stream_status where id = 1)
  );
end;
$$;
