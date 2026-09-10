-- Table-driven Starlight Mart catalog, staff editor RPCs, and GitHub upload token.

alter table private.stream_bridge
  add column if not exists github_token text;

create table if not exists private.store_categories (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  name text not null,
  blurb text not null default '',
  icon text not null default 'poke-ball.png',
  sort int not null default 0,
  kind text not null check (kind in ('pass', 'coins', 'balls', 'avatars', 'bits')),
  visible boolean not null default true,
  system boolean not null default false,
  extra jsonb not null default '{}'::jsonb
);

create table if not exists private.store_items (
  sku text primary key,
  category_id uuid not null references private.store_categories(id) on delete cascade,
  name text not null,
  blurb text not null default '',
  cost int not null default 0,
  bits int not null default 0,
  grants jsonb not null default '{}'::jsonb,
  sprite text not null default '',
  thumb text not null default '',
  featured boolean not null default false,
  sort int not null default 0,
  visible boolean not null default true,
  extra jsonb not null default '{}'::jsonb
);

create table if not exists private.store_assets (
  filename text primary key,
  kind text not null default 'item',
  label text not null default ''
);

alter table private.store_categories enable row level security;
alter table private.store_items enable row level security;
alter table private.store_assets enable row level security;

insert into private.store_categories (id, key, name, blurb, icon, sort, kind, visible, system, extra)
values
  ('11111111-1111-1111-1111-111111111001', 'pass', 'Starlight Pass', 'Twitch subscriber perk', 'rainbow-pass.png', 10, 'pass', true, true,
    '{"perks":["+25 bag space while active","Daily: 2 Berries, 1 Honey, 20 PokéCoins","Weekly: 5 Poké Balls, 3 Berries, 1 Poké Radar, 150 PokéCoins"]}'::jsonb),
  ('11111111-1111-1111-1111-111111111002', 'field-kit', 'Field Kit', '', 'relic-gold.png', 20, 'coins', true, true, '{}'::jsonb),
  ('11111111-1111-1111-1111-111111111003', 'balls', 'Poké Balls', 'Poké Ball, Great Ball, Ultra Ball, Master Ball, and Premier Ball are on the shelf. Master Ball always catches.', 'poke-ball.png', 30, 'balls', true, true, '{}'::jsonb),
  ('11111111-1111-1111-1111-111111111004', 'avatars', 'Premium Avatars', 'Sprite series for your Trainer ID. Buy once, then pick a look in Settings. These do not use bag space.', 'images/trainers/premium-avatars.png', 40, 'avatars', true, true, '{}'::jsonb),
  ('11111111-1111-1111-1111-111111111005', 'bits', 'Twitch Power-Ups', 'Use the matching Custom Power-Up on Twitch while Sora is live. Sign into Play once so the pack can find your bag. You get what''s listed — nothing random.', 'amulet-coin.png', 50, 'bits', true, true, '{}'::jsonb)
on conflict (key) do nothing;

do $$
declare
  cat jsonb := private.store_catalog();
  avatars jsonb := private.premium_avatar_catalog();
  elem jsonb;
  v_sku text;
  v_sprite text;
  ball_key text;
  sort_n int;
  featured boolean;
  titles jsonb;
begin
  sort_n := 0;
  for elem in select * from jsonb_array_elements(cat->'coins') loop
    v_sku := elem->>'sku';
    v_sprite := case v_sku
      when 'berry5' then 'oran-berry.png'
      when 'bait5' then 'honey.png'
      when 'radar1' then 'poke-radar.png'
      when 'lure1' then 'poke-radar.png'
      when 'pouch10' then 'explorer-kit.png'
      else 'poke-ball.png'
    end;
    insert into private.store_items (sku, category_id, name, blurb, cost, grants, sprite, sort, extra)
    values (
      v_sku,
      '11111111-1111-1111-1111-111111111002',
      elem->>'name',
      coalesce(elem->>'blurb', ''),
      coalesce((elem->>'cost')::int, 0),
      coalesce(elem->'grants', '{}'::jsonb),
      v_sprite,
      sort_n,
      '{}'::jsonb
    )
    on conflict (sku) do nothing;
    sort_n := sort_n + 10;
  end loop;

  sort_n := 0;
  for elem in select * from jsonb_array_elements(coalesce(cat->'balls', '[]'::jsonb)) loop
    v_sku := elem->>'sku';
    ball_key := coalesce((select jsonb_object_keys(elem->'grants') limit 1), '');
    featured := v_sku in ('poke5', 'great3', 'ultra1', 'master1', 'premier1');
    v_sprite := case v_sku,
      when 'poke5' then 'poke-ball.png'
      when 'great3' then 'great-ball.png'
      when 'ultra1' then 'ultra-ball.png'
      when 'master1' then 'master-ball.png'
      when 'premier1' then 'premier-ball.png'
      when 'luxury1' then 'luxury-ball.png'
      when 'heal1' then 'heal-ball.png'
      when 'friend1' then 'friend-ball.png'
      when 'love1' then 'love-ball.png'
      when 'nest1' then 'nest-ball.png'
      when 'net1' then 'net-ball.png'
      when 'repeat1' then 'repeat-ball.png'
      when 'timer1' then 'timer-ball.png'
      when 'dive1' then 'dive-ball.png'
      when 'dusk1' then 'dusk-ball.png'
      when 'quick1' then 'quick-ball.png'
      when 'fast1' then 'fast-ball.png'
      when 'lureball1' then 'lure-ball.png'
      when 'moon1' then 'moon-ball.png'
      when 'heavy1' then 'heavy-ball.png'
      when 'level1' then 'level-ball.png'
      when 'safari1' then 'safari-ball.png'
      when 'sport1' then 'sport-ball.png'
      when 'cherish1' then 'cherish-ball.png'
      when 'gs1' then 'gs-ball.png'
      when 'ash1' then 'ash-ball.png'
      when 'clone1' then 'clone-ball.png'
      when 'dark1' then 'dark-ball.png'
      when 'old1' then 'old-ball.png'
      when 'hisuipoke1' then 'hisui-poke-ball.png'
      when 'hisuigreat1' then 'hisui-great-ball.png'
      when 'hisuiultra1' then 'hisui-ultra-ball.png'
      when 'feather1' then 'feather-ball.png'
      when 'wing1' then 'wing-ball.png'
      when 'jet1' then 'jet-ball.png'
      when 'hisuiheavy1' then 'hisui-heavy-ball.png'
      when 'leaden1' then 'leaden-ball.png'
      when 'gigaton1' then 'gigaton-ball.png'
      when 'origin1' then 'origin-ball.png'
      when 'strange1' then 'strange-ball.png'
      else 'poke-ball.png'
    end;
    insert into private.store_items (sku, category_id, name, blurb, cost, grants, sprite, featured, sort, extra)
    values (
      v_sku,
      '11111111-1111-1111-1111-111111111003',
      elem->>'name',
      coalesce(elem->>'blurb', ''),
      coalesce((elem->>'cost')::int, 0),
      coalesce(elem->'grants', '{}'::jsonb),
      v_sprite,
      featured,
      sort_n,
      jsonb_build_object('ballKey', ball_key)
    )
    on conflict (sku) do nothing;
    sort_n := sort_n + 10;
  end loop;

  sort_n := 0;
  for elem in select * from jsonb_array_elements(coalesce(avatars, '[]'::jsonb)) loop
    v_sku := elem->>'sku';
    v_sprite := case v_sku
      when 'avatar-sonic' then 'poke-ball.png'
      when 'avatar-sonic-classic' then 'poke-ball.png'
      when 'avatar-digimon' then 'poke-ball.png'
      else 'poke-ball.png'
    end;
    insert into private.store_items (sku, category_id, name, blurb, cost, sprite, thumb, sort, extra)
    values (
      v_sku,
      '11111111-1111-1111-1111-111111111004',
      elem->>'name',
      coalesce(elem->>'blurb', ''),
      coalesce((elem->>'cost')::int, 0),
      'premium-avatars.png',
      'images/trainers/premium-avatars.png',
      sort_n,
      jsonb_build_object('pack', elem->>'pack', 'looks', coalesce(elem->'looks', '[]'::jsonb))
    )
    on conflict (sku) do nothing;
    sort_n := sort_n + 10;
  end loop;

  sort_n := 0;
  for elem in select * from jsonb_array_elements(coalesce(cat->'bits', '[]'::jsonb)) loop
    v_sku := elem->>'sku';
    titles := case v_sku,
      when 'bits-starter' then '["starter pack","trainers kit","trainer kit"]'::jsonb
      when 'bits-pantry' then '["picnic pack","camp cache","pantry pack"]'::jsonb
      when 'bits-great' then '["adventure pack","great hunt","great pack"]'::jsonb
      when 'bits-pouch' then '["explorer pack","explorers pouch","explorer pouch","pouch pack"]'::jsonb
      when 'bits-ultra' then '["ultra pack","ultra cache"]'::jsonb
      else '[]'::jsonb
    end;
    v_sprite := case v_sku,
      when 'bits-starter' then 'poke-ball.png'
      when 'bits-great' then 'great-ball.png'
      when 'bits-ultra' then 'ultra-ball.png'
      when 'bits-pantry' then 'oran-berry.png'
      when 'bits-pouch' then 'explorer-kit.png'
      else 'amulet-coin.png'
    end;
    insert into private.store_items (sku, category_id, name, blurb, bits, grants, sprite, thumb, sort, extra)
    values (
      v_sku,
      '11111111-1111-1111-1111-111111111005',
      elem->>'name',
      coalesce(elem->>'blurb', ''),
      coalesce((elem->>'bits')::int, 0),
      coalesce(elem->'grants', '{}'::jsonb),
      v_sprite,
      v_sprite,
      sort_n,
      jsonb_build_object('bitsTitles', titles)
    )
    on conflict (sku) do nothing;
    sort_n := sort_n + 10;
  end loop;
end $$;

insert into private.store_assets (filename, kind, label)
select filename, 'item', min(label)
from (
  select sprite as filename, name as label
  from private.store_items
  where sprite <> ''
  union all
  select icon, name
  from private.store_categories
  where icon <> ''
) x
group by filename
on conflict (filename) do nothing;

create or replace function private.store_item_json(i private.store_items)
returns jsonb
language sql
stable
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'sku', i.sku,
    'name', i.name,
    'blurb', i.blurb,
    'cost', i.cost,
    'bits', nullif(i.bits, 0),
    'grants', i.grants,
    'sprite', nullif(i.sprite, ''),
    'thumb', nullif(i.thumb, ''),
    'featured', i.featured,
    'pack', nullif(i.extra->>'pack', ''),
    'looks', i.extra->'looks',
    'bitsTitles', i.extra->'bitsTitles',
    'ballKey', nullif(i.extra->>'ballKey', ''),
    'qty', coalesce(nullif((i.grants->>coalesce(nullif(i.extra->>'ballKey', ''), '') )::int, 0), 1)
  ));
$$;

create or replace function private.store_floors()
returns jsonb
language sql
stable
as $$
  select coalesce(jsonb_agg(floor order by sort), '[]'::jsonb)
  from (
    select
      c.sort,
      jsonb_build_object(
        'id', c.id,
        'key', c.key,
        'name', c.name,
        'blurb', c.blurb,
        'icon', c.icon,
        'kind', c.kind,
        'system', c.system,
        'extra', c.extra,
        'items', coalesce((
          select jsonb_agg(private.store_item_json(i) order by i.sort, i.name)
          from private.store_items i
          where i.category_id = c.id and i.visible
        ), '[]'::jsonb)
      ) as floor
    from private.store_categories c
    where c.visible
  ) x;
$$;

create or replace function private.store_catalog()
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'rule', 'Bits and PokéCoins grant a listed set of items. Catch chance is never sold.',
    'coins', coalesce((
      select jsonb_agg(private.store_item_json(i) order by i.sort, i.name)
      from private.store_items i
      join private.store_categories c on c.id = i.category_id
      where c.kind = 'coins' and i.visible and c.visible
    ), '[]'::jsonb),
    'balls', coalesce((
      select jsonb_agg(private.store_item_json(i) order by i.sort, i.name)
      from private.store_items i
      join private.store_categories c on c.id = i.category_id
      where c.kind = 'balls' and i.visible and c.visible
    ), '[]'::jsonb),
    'bits', coalesce((
      select jsonb_agg(private.store_item_json(i) order by i.sort, i.name)
      from private.store_items i
      join private.store_categories c on c.id = i.category_id
      where c.kind = 'bits' and i.visible and c.visible
    ), '[]'::jsonb),
    'floors', private.store_floors()
  );
$$;

create or replace function private.premium_avatar_catalog()
returns jsonb
language sql
stable
as $$
  select coalesce((
    select jsonb_agg(private.store_item_json(i) order by i.sort, i.name)
    from private.store_items i
    join private.store_categories c on c.id = i.category_id
    where c.kind = 'avatars' and i.visible and c.visible
  ), '[]'::jsonb);
$$;

create or replace function private.premium_sprite_pack(p_sprite text)
returns text
language sql
stable
as $$
  select i.extra->>'pack'
  from private.store_items i
  join private.store_categories c on c.id = i.category_id
  where c.kind = 'avatars'
    and exists (
      select 1 from jsonb_array_elements_text(coalesce(i.extra->'looks', '[]'::jsonb)) look
      where look = p_sprite
    )
  limit 1;
$$;

create or replace function private.core_item_keys()
returns text[]
language sql
immutable
as $$
  select array['berry','bait','pokeball','greatball','ultraball','lure','coins','bag_bonus'];
$$;

create or replace function private.extra_ball_keys()
returns text[]
language sql
stable
as $$
  select coalesce(array_agg(distinct k), '{}'::text[])
  from (
    select unnest(array[
      'masterball',
      'premierball','luxuryball','healball','friendball','loveball','nestball','netball',
      'repeatball','timerball','diveball','duskball','quickball','fastball','lureball',
      'moonball','heavyball','levelball','safariball','sportball','cherishball',
      'gsball','ashball','cloneball','darkball','oldball',
      'hisuipokeball','hisuigreatball','hisuiultraball','hisuiheavyball',
      'featherball','wingball','jetball','leadenball','gigatonball','originball','strangeball'
    ]) as k
    union
    select jsonb_object_keys(coalesce(grants, '{}'::jsonb))
    from private.store_items
  ) s
  where k <> all (private.core_item_keys());
$$;

create or replace function private.bits_sku(p_title text, p_bits int)
returns text
language plpgsql
stable
as $$
declare
  title text := lower(btrim(coalesce(p_title, '')));
  v_sku text;
begin
  title := regexp_replace(title, '[''`´]', '', 'g');
  select i.sku into v_sku
  from private.store_items i
  join private.store_categories c on c.id = i.category_id
  where c.kind = 'bits' and i.visible
    and (
      exists (
        select 1 from jsonb_array_elements_text(coalesce(i.extra->'bitsTitles', '[]'::jsonb)) t
        where lower(t) = title
      )
      or lower(i.name) = title
    )
  order by i.sort
  limit 1;
  if v_sku is not null then
    return v_sku;
  end if;
  select i.sku into v_sku
  from private.store_items i
  join private.store_categories c on c.id = i.category_id
  where c.kind = 'bits' and i.visible and i.bits = coalesce(p_bits, 0)
  order by i.sort
  limit 1;
  return v_sku;
end;
$$;

create or replace function private.store_sku_item(p_sku text)
returns jsonb
language sql
stable
as $$
  select private.store_item_json(i)
  from private.store_items i
  where i.sku = p_sku and i.visible
  limit 1;
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
  item := private.store_sku_item(p_sku);
  if item is null or coalesce((item->>'bits')::int, 0) > 0 then
    raise exception 'That shelf item is not sold for PokéCoins.';
  end if;
  pack := nullif(item->>'pack', '');
  inv := private.ensure_inventory(uid);
  if inv.coins < coalesce((item->>'cost')::int, 0) then
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
  perform private.grant_known(uid, coalesce(item->'grants', '{}'::jsonb));
  return private.play_snapshot(uid) || jsonb_build_object('ok', true, 'message', 'Added ' || (item->>'name') || ' to your inventory.');
end;
$$;

create or replace function private.admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  r public.encounter_rounds;
  cfg public.site_config%rowtype;
  seen timestamptz;
  has_token boolean;
  pending int;
  last_err text;
  bits_status text;
  bits_at timestamptz;
  bits_last timestamptz;
  bits_detail text;
  bits_waiting int;
  has_app_secret boolean;
  has_github boolean;
  staff_role text;
  secrets boolean;
begin
  perform private.require_hub();
  staff_role := private.play_staff_role();
  secrets := staff_role = 'owner';
  r := private.latest_round();
  select * into cfg from public.site_config where id = 1;
  select b.seen_at, b.token_hash is not null, b.last_error,
         b.eventsub_status, b.eventsub_connected_at, b.last_bits_at, b.last_bits_detail,
         b.twitch_client_secret is not null and btrim(b.twitch_client_secret) <> '',
         b.github_token is not null and btrim(b.github_token) <> ''
    into seen, has_token, last_err, bits_status, bits_at, bits_last, bits_detail, has_app_secret, has_github
    from private.stream_bridge b where b.id = 1;
  select count(*)::int into pending from public.stream_commands where status in ('pending','running');
  select count(*)::int into bits_waiting from private.bits_pending;
  return jsonb_build_object(
    'trainers', (select count(*)::int from public.profiles),
    'passes', (select count(*)::int from public.profiles where starlight_pass),
    'channel', cfg.broadcaster_twitch_login,
    'twitchClientId', case when secrets then cfg.twitch_client_id else null end,
    'twitchBroadcasterId', case when secrets then cfg.twitch_broadcaster_id else null end,
    'twitchClientSecretSaved', case when secrets then coalesce(has_app_secret, false) else null end,
    'githubTokenSaved', case when secrets then coalesce(has_github, false) else null end,
    'live', (select is_live from public.stream_status where id = 1),
    'settings', cfg.game_settings,
    'bitsStoreEnabled', false,
    'staffRole', staff_role,
    'canManageSecrets', secrets,
    'bitsPacks', private.store_catalog()->'bits',
    'round', private.public_round_json(r),
    'bridge', jsonb_build_object(
      'configured', coalesce(has_token, false),
      'online', seen is not null and seen > now() - interval '8 seconds',
      'seenAt', seen,
      'pending', coalesce(pending, 0),
      'lastError', last_err
    ),
    'bitsAuto', jsonb_build_object(
      'connected', coalesce(bits_status, '') = 'enabled',
      'status', bits_status,
      'connectedAt', bits_at,
      'lastAt', bits_last,
      'lastDetail', bits_detail,
      'pending', coalesce(bits_waiting, 0),
      'needsAppSecret', not coalesce(has_app_secret, false)
    )
  );
end;
$$;

create or replace function public.admin_save_github_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
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
$$;

create or replace function public.store_github_token()
returns text
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  token text;
begin
  select github_token into token from private.stream_bridge where id = 1;
  return token;
end;
$$;

revoke all on function public.store_github_token() from public, anon, authenticated;
grant execute on function public.store_github_token() to service_role;

create or replace function public.admin_store_get()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  perform private.require_hub();
  return jsonb_build_object(
    'ok', true,
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'key', c.key, 'name', c.name, 'blurb', c.blurb, 'icon', c.icon,
        'sort', c.sort, 'kind', c.kind, 'visible', c.visible, 'system', c.system, 'extra', c.extra
      ) order by c.sort, c.name)
      from private.store_categories c
    ), '[]'::jsonb),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'sku', i.sku, 'categoryId', i.category_id, 'name', i.name, 'blurb', i.blurb,
        'cost', i.cost, 'bits', i.bits, 'grants', i.grants, 'sprite', i.sprite, 'thumb', i.thumb,
        'featured', i.featured, 'sort', i.sort, 'visible', i.visible, 'extra', i.extra
      ) order by i.sort, i.name)
      from private.store_items i
    ), '[]'::jsonb),
    'assets', coalesce((
      select jsonb_agg(jsonb_build_object('filename', a.filename, 'kind', a.kind, 'label', a.label) order by a.label, a.filename)
      from private.store_assets a
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.admin_store_save_category(p_row jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  cat_id uuid;
  cat_key text;
begin
  perform private.require_staff_edit();
  cat_id := nullif(p_row->>'id', '')::uuid;
  cat_key := lower(regexp_replace(btrim(coalesce(p_row->>'key', p_row->>'name', 'floor')), '[^a-z0-9]+', '-', 'g'));
  cat_key := trim(both '-' from cat_key);
  if cat_key = '' then
    raise exception 'Give this floor a name.';
  end if;
  if cat_id is null then
    insert into private.store_categories (key, name, blurb, icon, sort, kind, visible, system, extra)
    values (
      cat_key,
      coalesce(nullif(p_row->>'name', ''), 'New floor'),
      coalesce(p_row->>'blurb', ''),
      coalesce(nullif(p_row->>'icon', ''), 'poke-ball.png'),
      coalesce((p_row->>'sort')::int, 100),
      coalesce(nullif(p_row->>'kind', ''), 'coins'),
      coalesce((p_row->>'visible')::boolean, true),
      false,
      coalesce(p_row->'extra', '{}'::jsonb)
    )
    returning id into cat_id;
  else
    update private.store_categories
      set name = coalesce(nullif(p_row->>'name', ''), name),
          blurb = coalesce(p_row->>'blurb', blurb),
          icon = coalesce(nullif(p_row->>'icon', ''), icon),
          sort = coalesce((p_row->>'sort')::int, sort),
          kind = case when system then kind else coalesce(nullif(p_row->>'kind', ''), kind) end,
          visible = coalesce((p_row->>'visible')::boolean, visible),
          extra = coalesce(p_row->'extra', extra)
      where id = cat_id;
  end if;
  return public.admin_store_get() || jsonb_build_object('message', 'Floor saved.', 'categoryId', cat_id);
end;
$$;

create or replace function public.admin_store_delete_category(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  perform private.require_staff_edit();
  if exists (select 1 from private.store_categories where id = p_id and system) then
    raise exception 'That floor is part of the mart and cannot be removed.';
  end if;
  delete from private.store_categories where id = p_id;
  return public.admin_store_get() || jsonb_build_object('message', 'Floor removed.');
end;
$$;

create or replace function public.admin_store_save_item(p_row jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_sku text;
begin
  perform private.require_staff_edit();
  v_sku := btrim(coalesce(p_row->>'sku', ''));
  if v_sku = '' then
    raise exception 'Give this item a SKU.';
  end if;
  insert into private.store_items (
    sku, category_id, name, blurb, cost, bits, grants, sprite, thumb, featured, sort, visible, extra
  ) values (
    v_sku,
    (p_row->>'categoryId')::uuid,
    coalesce(nullif(p_row->>'name', ''), v_sku),
    coalesce(p_row->>'blurb', ''),
    coalesce((p_row->>'cost')::int, 0),
    coalesce((p_row->>'bits')::int, 0),
    coalesce(p_row->'grants', '{}'::jsonb),
    coalesce(p_row->>'sprite', ''),
    coalesce(p_row->>'thumb', ''),
    coalesce((p_row->>'featured')::boolean, false),
    coalesce((p_row->>'sort')::int, 100),
    coalesce((p_row->>'visible')::boolean, true),
    coalesce(p_row->'extra', '{}'::jsonb)
  )
  on conflict (sku) do update set
    category_id = excluded.category_id,
    name = excluded.name,
    blurb = excluded.blurb,
    cost = excluded.cost,
    bits = excluded.bits,
    grants = excluded.grants,
    sprite = excluded.sprite,
    thumb = excluded.thumb,
    featured = excluded.featured,
    sort = excluded.sort,
    visible = excluded.visible,
    extra = excluded.extra;
  return public.admin_store_get() || jsonb_build_object('message', 'Item saved.', 'sku', v_sku);
end;
$$;

create or replace function public.admin_store_delete_item(p_sku text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  perform private.require_staff_edit();
  delete from private.store_items where sku = p_sku;
  return public.admin_store_get() || jsonb_build_object('message', 'Item removed.');
end;
$$;

create or replace function public.admin_store_reorder(p_kind text, p_ids jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  idx int := 0;
  elem text;
begin
  perform private.require_staff_edit();
  for elem in select jsonb_array_elements_text(coalesce(p_ids, '[]'::jsonb)) loop
    if p_kind = 'category' then
      update private.store_categories set sort = idx * 10 where id::text = elem or key = elem;
    else
      update private.store_items set sort = idx * 10 where sku = elem;
    end if;
    idx := idx + 1;
  end loop;
  return public.admin_store_get() || jsonb_build_object('message', 'Order saved.');
end;
$$;

create or replace function public.admin_store_register_asset(p_filename text, p_kind text default 'item', p_label text default '')
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  perform private.require_staff_edit();
  insert into private.store_assets (filename, kind, label)
  values (btrim(p_filename), coalesce(nullif(p_kind, ''), 'item'), coalesce(p_label, p_filename))
  on conflict (filename) do update set kind = excluded.kind, label = excluded.label;
  return public.admin_store_get() || jsonb_build_object('message', 'Sprite added to the picker.', 'filename', p_filename);
end;
$$;

grant execute on function public.play_store() to anon, authenticated;
grant execute on function public.play_buy_sku(text) to authenticated;
grant execute on function public.admin_save_github_token(text) to authenticated;
grant execute on function public.admin_store_get() to authenticated;
grant execute on function public.admin_store_save_category(jsonb) to authenticated;
grant execute on function public.admin_store_delete_category(uuid) to authenticated;
grant execute on function public.admin_store_save_item(jsonb) to authenticated;
grant execute on function public.admin_store_delete_item(text) to authenticated;
grant execute on function public.admin_store_reorder(text, jsonb) to authenticated;
grant execute on function public.admin_store_register_asset(text, text, text) to authenticated;

