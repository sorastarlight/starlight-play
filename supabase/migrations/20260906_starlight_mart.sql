-- Starlight Mart: earned PokéCoins, subscriber claims, Bits packs fulfilled on Twitch.

alter table public.inventories
  add column if not exists lure int not null default 0 check (lure >= 0),
  add column if not exists coins int not null default 0 check (coins >= 0),
  add column if not exists bag_bonus int not null default 0 check (bag_bonus >= 0),
  add column if not exists lure_armed boolean not null default false,
  add column if not exists pass_daily_at timestamptz,
  add column if not exists pass_weekly_at timestamptz;

create or replace function private.item_total(i public.inventories)
returns int
language sql
immutable
as $$
  select i.berry + i.bait + i.pokeball + i.greatball + i.ultraball + i.lure;
$$;

create or replace function private.bag_capacity(p_uid uuid)
returns int
language sql
stable
as $$
  select least(120,
    50
    + coalesce((select bag_bonus from public.inventories where user_id = p_uid), 0)
    + case when coalesce((select starlight_pass from public.profiles where id = p_uid), false) then 25 else 0 end
  );
$$;

create or replace function private.ensure_inventory(p_uid uuid)
returns public.inventories
language plpgsql
as $$
declare
  inv public.inventories;
begin
  insert into public.inventories (user_id)
  values (p_uid)
  on conflict (user_id) do nothing;
  select * into inv from public.inventories where user_id = p_uid;
  return inv;
end;
$$;

create or replace function private.grant_known(p_uid uuid, p_grants jsonb)
returns void
language plpgsql
as $$
declare
  inv public.inventories;
  cap int;
  add_items int;
  add_bonus int;
begin
  inv := private.ensure_inventory(p_uid);
  add_bonus := coalesce((p_grants->>'bag_bonus')::int, 0);
  add_items := coalesce((p_grants->>'berry')::int, 0)
    + coalesce((p_grants->>'bait')::int, 0)
    + coalesce((p_grants->>'pokeball')::int, 0)
    + coalesce((p_grants->>'greatball')::int, 0)
    + coalesce((p_grants->>'ultraball')::int, 0)
    + coalesce((p_grants->>'lure')::int, 0);
  cap := private.bag_capacity(p_uid) + add_bonus;
  if private.item_total(inv) + add_items > cap then
    raise exception 'Inventory is full. Buy a pouch or use some items first.';
  end if;
  update public.inventories
    set berry = berry + coalesce((p_grants->>'berry')::int, 0),
        bait = bait + coalesce((p_grants->>'bait')::int, 0),
        pokeball = pokeball + coalesce((p_grants->>'pokeball')::int, 0),
        greatball = greatball + coalesce((p_grants->>'greatball')::int, 0),
        ultraball = ultraball + coalesce((p_grants->>'ultraball')::int, 0),
        lure = lure + coalesce((p_grants->>'lure')::int, 0),
        coins = coins + coalesce((p_grants->>'coins')::int, 0),
        bag_bonus = bag_bonus + add_bonus,
        updated_at = now()
    where user_id = p_uid;
end;
$$;

create or replace function private.store_catalog()
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'rule', 'Bits and PokéCoins only grant a known list of items. Catch chance, shinies, and mystery packs stay off the shelf.',
    'coins', jsonb_build_array(
      jsonb_build_object('sku','poke5','name','Poké Ball ×5','cost',40,'grants',jsonb_build_object('pokeball',5),'blurb','Five balls. Throws still use normal catch chance.'),
      jsonb_build_object('sku','great3','name','Great Ball ×3','cost',55,'grants',jsonb_build_object('greatball',3),'blurb','Three Great Balls. No extra odds attached.'),
      jsonb_build_object('sku','ultra1','name','Ultra Ball ×1','cost',50,'grants',jsonb_build_object('ultraball',1),'blurb','One Ultra Ball. Still a normal throw.'),
      jsonb_build_object('sku','berry5','name','Berry ×5','cost',25,'grants',jsonb_build_object('berry',5),'blurb','Five berries for the prepare phase.'),
      jsonb_build_object('sku','bait5','name','Bait ×5','cost',30,'grants',jsonb_build_object('bait',5),'blurb','Five bait. Shared bonus is unchanged.'),
      jsonb_build_object('sku','lure1','name','Lure ×1','cost',80,'grants',jsonb_build_object('lure',1),'blurb','Guarantees you auto-join the next community encounter.'),
      jsonb_build_object('sku','pouch10','name','Pouch +10','cost',120,'grants',jsonb_build_object('bag_bonus',10),'blurb','Permanently hold 10 more items.')
    ),
    'bits', jsonb_build_array(
      jsonb_build_object('sku','bits-starter','name','Starter Pack','bits',100,'grants',jsonb_build_object('pokeball',5,'berry',5),'blurb','Unlock on Twitch while Sora is live. Play credits exactly these items.'),
      jsonb_build_object('sku','bits-great','name','Great Pack','bits',200,'grants',jsonb_build_object('greatball',3,'bait',5),'blurb','Three Great Balls and five bait. No random extras.'),
      jsonb_build_object('sku','bits-ultra','name','Ultra Pack','bits',300,'grants',jsonb_build_object('ultraball',1,'lure',1),'blurb','One Ultra Ball and one Lure.'),
      jsonb_build_object('sku','bits-pantry','name','Pantry Pack','bits',150,'grants',jsonb_build_object('berry',5,'bait',5),'blurb','Berries and bait only.'),
      jsonb_build_object('sku','bits-pouch','name','Pouch Pack','bits',250,'grants',jsonb_build_object('bag_bonus',10),'blurb','Inventory expansion. Not a loot box.')
    )
  );
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
    'catalog', private.store_catalog(),
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
begin
  if uid is null then
    raise exception 'Sign in to use the mart.' using errcode = '42501';
  end if;
  select elem into item
  from jsonb_array_elements(private.store_catalog()->'coins') as elem
  where elem->>'sku' = p_sku;
  if item is null then
    raise exception 'That shelf item is not sold for PokéCoins.';
  end if;
  inv := private.ensure_inventory(uid);
  if inv.coins < (item->>'cost')::int then
    raise exception 'Not enough PokéCoins.';
  end if;
  update public.inventories
    set coins = coins - (item->>'cost')::int, updated_at = now()
    where user_id = uid;
  perform private.grant_known(uid, item->'grants');
  return private.play_snapshot(uid) || jsonb_build_object('ok', true, 'message', 'Added ' || (item->>'name') || ' to your inventory.');
end;
$$;

create or replace function public.play_claim_pass(p_kind text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  uid uuid := auth.uid();
  inv public.inventories;
  pass boolean;
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  select starlight_pass into pass from public.profiles where id = uid;
  if not coalesce(pass, false) then
    raise exception 'Starlight Pass is required. Subscribe on Twitch, then check your pass.';
  end if;
  inv := private.ensure_inventory(uid);
  if p_kind = 'daily' then
    if inv.pass_daily_at is not null and inv.pass_daily_at > now() - interval '20 hours' then
      raise exception 'Daily Pass gift is not ready yet.';
    end if;
    update public.inventories set pass_daily_at = now(), updated_at = now() where user_id = uid;
    perform private.grant_known(uid, jsonb_build_object('berry', 2, 'bait', 1, 'coins', 20));
    return private.play_snapshot(uid) || jsonb_build_object('ok', true, 'message', 'Daily Pass gift: 2 Berries, 1 Bait, 20 PokéCoins.');
  end if;
  if p_kind = 'weekly' then
    if inv.pass_weekly_at is not null and inv.pass_weekly_at > now() - interval '6 days' then
      raise exception 'Weekly Pass crate is not ready yet.';
    end if;
    update public.inventories set pass_weekly_at = now(), updated_at = now() where user_id = uid;
    perform private.grant_known(uid, jsonb_build_object('pokeball', 5, 'berry', 3, 'lure', 1, 'coins', 150));
    return private.play_snapshot(uid) || jsonb_build_object('ok', true, 'message', 'Weekly Pass crate: 5 Poké Balls, 3 Berries, 1 Lure, 150 PokéCoins.');
  end if;
  raise exception 'Unknown Pass gift.';
end;
$$;

create or replace function public.play_use_lure()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  uid uuid := auth.uid();
  spent int;
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  update public.inventories
    set lure = lure - 1, lure_armed = true, updated_at = now()
    where user_id = uid and lure > 0 and lure_armed = false;
  get diagnostics spent = row_count;
  if spent = 0 then
    raise exception 'You need a Lure, and only one can be armed at a time.';
  end if;
  return private.play_snapshot(uid) || jsonb_build_object('ok', true, 'message', 'Lure armed. You will auto-join the next community encounter.');
end;
$$;

create or replace function public.admin_grant_bits_pack(p_login text, p_sku text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  item jsonb;
  trainer uuid;
begin
  if not private.is_play_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select elem into item
  from jsonb_array_elements(private.store_catalog()->'bits') as elem
  where elem->>'sku' = p_sku;
  if item is null then
    raise exception 'Unknown Bits pack.';
  end if;
  select id into trainer from public.profiles where lower(twitch_login) = lower(btrim(p_login));
  if trainer is null then
    raise exception 'No Play trainer matches that Twitch login yet.';
  end if;
  perform private.grant_known(trainer, item->'grants');
  return jsonb_build_object('ok', true, 'message', 'Granted ' || (item->>'name') || ' to ' || btrim(p_login) || '.');
end;
$$;

create or replace function private.after_join_xp()
returns trigger
language plpgsql
as $$
begin
  perform private.ensure_inventory(new.user_id);
  perform private.award_xp(new.user_id, 10);
  update public.inventories
    set coins = coins + 5, lure_armed = false, updated_at = now()
    where user_id = new.user_id;
  return new;
end;
$$;

create or replace function private.after_catch_xp()
returns trigger
language plpgsql
as $$
declare
  first_species boolean;
begin
  perform private.ensure_inventory(new.user_id);
  select not exists (
    select 1 from public.catches
    where user_id = new.user_id and dex = new.dex and id <> new.id
  ) into first_species;
  perform private.award_xp(new.user_id, 50 + case when first_species then 25 else 0 end);
  update public.inventories set coins = coins + 20, updated_at = now() where user_id = new.user_id;
  return new;
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
  visible jsonb;
  inv public.inventories;
begin
  r := private.sync_latest_round();
  is_admin := p_uid is not null and private.is_play_admin();
  settings := private.game_settings();

  if p_uid is not null then
    update public.profiles
      set last_seen_at = now(), updated_at = now()
      where id = p_uid;
    inv := private.ensure_inventory(p_uid);
    bag := jsonb_build_object(
      'berry', inv.berry, 'bait', inv.bait, 'pokeball', inv.pokeball,
      'greatball', inv.greatball, 'ultraball', inv.ultraball,
      'lure', inv.lure, 'coins', inv.coins,
      'capacity', private.bag_capacity(p_uid),
      'used', private.item_total(inv),
      'lureArmed', inv.lure_armed
    );

    select jsonb_build_object(
      'active', p.starlight_pass,
      'source', p.pass_source,
      'checkedAt', p.pass_checked_at
    ) into pass
    from public.profiles p where p.id = p_uid;

    if r is not null then
      select jsonb_build_object(
        'joined', true,
        'prep', ep.prep,
        'ball', ep.ball,
        'result', ep.result,
        'chance', ep.chance,
        'caught', ep.caught
      ) into me
      from public.encounter_players ep
      where ep.round_id = r.id and ep.user_id = p_uid;
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
    'isAdmin', is_admin,
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

grant execute on function public.play_store() to anon, authenticated;
grant execute on function public.play_buy_sku(text) to authenticated;
grant execute on function public.play_claim_pass(text) to authenticated;
grant execute on function public.play_use_lure() to authenticated;
grant execute on function public.admin_grant_bits_pack(text, text) to authenticated;
