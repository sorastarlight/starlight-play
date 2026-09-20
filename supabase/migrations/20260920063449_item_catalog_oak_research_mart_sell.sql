-- Item catalog (PokéAPI reference) + gameplay policy + Mart sell + Oak Research.
-- Catalog existence NEVER implies gameplay availability.

-- ---------------------------------------------------------------------------
-- 1) Canonical PokéAPI item catalog
-- ---------------------------------------------------------------------------
create table if not exists public.item_catalog (
  slug text primary key,
  pokeapi_item_id int unique,
  pokeapi_name text not null,
  display_name text not null,
  category_slug text,
  pocket_slug text,
  short_effect text,
  flavor_text text,
  fling_power int,
  fling_effect text,
  attributes jsonb not null default '[]'::jsonb,
  held_by jsonb not null default '[]'::jsonb,
  baby_trigger boolean not null default false,
  generation_introduced int,
  sprite_path text,
  sprite_source_url text,
  sprite_available boolean not null default false,
  sprite_checksum text,
  source text not null default 'POKEAPI',
  source_url text,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists item_catalog_category_idx on public.item_catalog (category_slug);
create index if not exists item_catalog_pocket_idx on public.item_catalog (pocket_slug);

alter table public.item_catalog enable row level security;
drop policy if exists item_catalog_read on public.item_catalog;
create policy item_catalog_read on public.item_catalog for select using (true);
grant select on public.item_catalog to anon, authenticated;

create table if not exists public.item_prices (
  item_slug text not null references public.item_catalog(slug) on delete cascade,
  version_group text not null default 'unknown',
  currency text not null default 'pokedollars',
  purchase_price int,
  sell_price int,
  source text not null default 'pokeapi',
  primary key (item_slug, version_group, currency)
);

alter table public.item_prices enable row level security;
drop policy if exists item_prices_read on public.item_prices;
create policy item_prices_read on public.item_prices for select using (true);
grant select on public.item_prices to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) Gameplay policy (explicit enablement)
-- ---------------------------------------------------------------------------
create table if not exists public.item_policy (
  item_slug text primary key references public.item_catalog(slug) on delete cascade,
  inventory_enabled boolean not null default false,
  obtainable boolean not null default false,
  usable boolean not null default false,
  mart_buy_enabled boolean not null default false,
  mart_sell_enabled boolean not null default false,
  research_reward_enabled boolean not null default false,
  admin_grant_enabled boolean not null default false,
  bits_enabled boolean not null default false,
  release_generation int,
  canonical_sell_price int,
  game_sell_price int,
  notes text,
  updated_at timestamptz not null default now()
);

alter table public.item_policy enable row level security;
drop policy if exists item_policy_read on public.item_policy;
create policy item_policy_read on public.item_policy for select using (true);
grant select on public.item_policy to anon, authenticated;

create table if not exists public.mart_sales (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_slug text not null,
  quantity int not null check (quantity > 0),
  unit_price int not null check (unit_price >= 0),
  coins_received int not null check (coins_received >= 0),
  idempotency text,
  detail jsonb not null default '{}'::jsonb
);

create unique index if not exists mart_sales_idem_uidx
  on public.mart_sales (user_id, idempotency)
  where idempotency is not null;
create index if not exists mart_sales_user_idx on public.mart_sales (user_id, created_at desc);

alter table public.mart_sales enable row level security;
drop policy if exists mart_sales_own on public.mart_sales;
create policy mart_sales_own on public.mart_sales for select using (auth.uid() = user_id);
grant select on public.mart_sales to authenticated;

-- ---------------------------------------------------------------------------
-- 3) Seed launch valuables (catalog stubs; importer fills metadata/sprites)
-- ---------------------------------------------------------------------------
insert into public.item_catalog (slug, pokeapi_item_id, pokeapi_name, display_name, category_slug, pocket_slug, flavor_text, source_url, sprite_path, sprite_available)
values
  ('nugget', 92, 'nugget', 'Nugget', 'loot', 'items', 'A nugget of pure gold. It can be sold at a high price.', 'https://pokeapi.co/api/v2/item/nugget', 'images/items/pokeapi/nugget.png', false),
  ('bignugget', 622, 'big-nugget', 'Big Nugget', 'loot', 'items', 'A big nugget of pure gold. It can be sold at a high price.', 'https://pokeapi.co/api/v2/item/big-nugget', 'images/items/pokeapi/big-nugget.png', false),
  ('pearl', 88, 'pearl', 'Pearl', 'loot', 'items', 'A rather small pearl that has a soft sheen. It can be sold cheaply.', 'https://pokeapi.co/api/v2/item/pearl', 'images/items/pokeapi/pearl.png', false),
  ('bigpearl', 89, 'big-pearl', 'Big Pearl', 'loot', 'items', 'A quite-large pearl that sparkles. It can be sold at a high price.', 'https://pokeapi.co/api/v2/item/big-pearl', 'images/items/pokeapi/big-pearl.png', false),
  ('stardust', 90, 'stardust', 'Stardust', 'loot', 'items', 'Lovely red sand that flows between the fingers. It can be sold cheaply.', 'https://pokeapi.co/api/v2/item/stardust', 'images/items/pokeapi/stardust.png', false),
  ('starpiece', 91, 'star-piece', 'Star Piece', 'loot', 'items', 'A shard of a beautiful gem that sparkles. It can be sold at a high price.', 'https://pokeapi.co/api/v2/item/star-piece', 'images/items/pokeapi/star-piece.png', false)
on conflict (slug) do update set
  pokeapi_item_id = excluded.pokeapi_item_id,
  pokeapi_name = excluded.pokeapi_name,
  display_name = excluded.display_name,
  updated_at = now();

insert into public.item_prices (item_slug, version_group, currency, purchase_price, sell_price, source) values
  ('nugget', 'reference', 'pokedollars', null, 5000, 'canonical'),
  ('bignugget', 'reference', 'pokedollars', null, 40000, 'canonical'),
  ('pearl', 'reference', 'pokedollars', null, 1400, 'canonical'),
  ('bigpearl', 'reference', 'pokedollars', null, 7500, 'canonical'),
  ('stardust', 'reference', 'pokedollars', null, 1000, 'canonical'),
  ('starpiece', 'reference', 'pokedollars', null, 4800, 'canonical')
on conflict do nothing;

insert into public.item_policy (
  item_slug, inventory_enabled, obtainable, usable,
  mart_buy_enabled, mart_sell_enabled, research_reward_enabled,
  admin_grant_enabled, bits_enabled, release_generation,
  canonical_sell_price, game_sell_price, notes
) values
  ('stardust', true, true, false, false, true, true, true, false, 1, 1000, 150, 'Kanto v1 valuables launch'),
  ('pearl', true, true, false, false, true, true, true, false, 1, 1400, 400, 'Kanto v1 valuables launch'),
  ('starpiece', true, true, false, false, true, true, true, false, 1, 4800, 900, 'Kanto v1 valuables launch'),
  ('nugget', true, true, false, false, true, true, true, false, 1, 5000, 1200, 'Kanto v1 valuables launch'),
  ('bigpearl', true, true, false, false, true, true, true, false, 1, 7500, 2500, 'Kanto v1 valuables launch'),
  ('bignugget', true, true, false, false, true, true, true, false, 1, 40000, 6000, 'Kanto v1 valuables launch')
on conflict (item_slug) do update set
  inventory_enabled = excluded.inventory_enabled,
  obtainable = excluded.obtainable,
  mart_sell_enabled = excluded.mart_sell_enabled,
  research_reward_enabled = excluded.research_reward_enabled,
  admin_grant_enabled = excluded.admin_grant_enabled,
  canonical_sell_price = excluded.canonical_sell_price,
  game_sell_price = excluded.game_sell_price,
  notes = excluded.notes,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 4) Helpers: inventory valuables via items jsonb
-- ---------------------------------------------------------------------------
create or replace function private.valuable_item_keys()
returns text[]
language sql
stable
as $$
  select coalesce(array_agg(item_slug order by item_slug), '{}'::text[])
    from public.item_policy
   where inventory_enabled = true;
$$;

create or replace function private.item_sell_price(p_slug text)
returns int
language sql
stable
as $$
  select greatest(coalesce(game_sell_price, 0), 0)
    from public.item_policy
   where item_slug = p_slug
     and mart_sell_enabled = true
     and inventory_enabled = true;
$$;

create or replace function private.adjust_item(p_uid uuid, p_key text, p_delta int)
returns int
language plpgsql
as $function$
declare
  before_qty int;
  after_qty int;
begin
  if p_uid is null or coalesce(p_key, '') = '' or coalesce(p_delta, 0) = 0 then
    return private.item_qty(p_uid, p_key);
  end if;
  perform private.ensure_inventory(p_uid);
  select coalesce((items->>p_key)::int, 0) into before_qty
    from public.inventories where user_id = p_uid for update;
  after_qty := before_qty + p_delta;
  if after_qty < 0 then
    raise exception 'You do not have enough of that item.';
  end if;
  update public.inventories
     set items = jsonb_set(coalesce(items, '{}'::jsonb), array[p_key], to_jsonb(after_qty)),
         updated_at = now()
   where user_id = p_uid;
  return after_qty;
end;
$function$;

-- Extend grant_known to accept inventory-enabled catalog items (valuables).
create or replace function private.grant_known(p_uid uuid, p_grants jsonb)
returns void
language plpgsql
as $function$
declare
  inv public.inventories;
  cap int;
  add_items int;
  add_bonus int;
  extra_add int;
  berry_add int;
  evo_add int;
  val_add int;
  k text;
  n int;
  room int;
  paid_room int;
begin
  inv := private.ensure_inventory(p_uid);
  add_bonus := greatest(coalesce((p_grants->>'bag_bonus')::int, 0), 0);
  paid_room := greatest(0, private.bag_bonus_cap() - coalesce(inv.bag_bonus, 0));
  room := least(private.bag_capacity_max() - private.bag_capacity(p_uid), paid_room);
  if add_bonus > 0 and room <= 0 then
    raise exception 'Bag space upgrades are at the current cap.';
  end if;
  if add_bonus > room then
    add_bonus := greatest(room, 0);
  end if;
  extra_add := coalesce((
    select sum(greatest(coalesce(value::int, 0), 0))
    from jsonb_each_text(coalesce(p_grants, '{}'::jsonb))
    where key = any (private.extra_ball_keys())
  ), 0);
  berry_add := coalesce((
    select sum(greatest(coalesce(value::int, 0), 0))
    from jsonb_each_text(coalesce(p_grants, '{}'::jsonb))
    where key = any (private.capture_berry_keys())
  ), 0);
  evo_add := coalesce((
    select sum(greatest(coalesce(value::int, 0), 0))
    from jsonb_each_text(coalesce(p_grants, '{}'::jsonb))
    where key = any (private.evo_item_keys())
  ), 0);
  val_add := coalesce((
    select sum(greatest(coalesce(value::int, 0), 0))
    from jsonb_each_text(coalesce(p_grants, '{}'::jsonb))
    where key = any (private.valuable_item_keys())
      and key <> all (private.evo_item_keys())
  ), 0);
  add_items := coalesce((p_grants->>'berry')::int, 0)
    + coalesce((p_grants->>'bait')::int, 0)
    + coalesce((p_grants->>'pokeball')::int, 0)
    + coalesce((p_grants->>'greatball')::int, 0)
    + coalesce((p_grants->>'ultraball')::int, 0)
    + coalesce((p_grants->>'lure')::int, 0)
    + extra_add + berry_add + evo_add + val_add;
  cap := private.bag_capacity(p_uid) + add_bonus;
  if private.item_total(inv) + add_items > cap then
    raise exception 'Inventory is full. Buy a Pouch on the Store or use some items first.';
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
  foreach k in array private.extra_ball_keys() loop
    n := coalesce((p_grants->>k)::int, 0);
    if n > 0 then
      update public.inventories
        set balls = jsonb_set(coalesce(balls, '{}'::jsonb), array[k], to_jsonb(coalesce((balls->>k)::int, 0) + n)),
            updated_at = now()
      where user_id = p_uid;
    end if;
  end loop;
  foreach k in array private.capture_berry_keys() loop
    n := coalesce((p_grants->>k)::int, 0);
    if n > 0 then
      update public.inventories
        set berries = jsonb_set(coalesce(berries, '{}'::jsonb), array[k], to_jsonb(coalesce((berries->>k)::int, 0) + n)),
            updated_at = now()
      where user_id = p_uid;
    end if;
  end loop;
  foreach k in array private.evo_item_keys() loop
    n := coalesce((p_grants->>k)::int, 0);
    if n > 0 then
      perform private.adjust_item(p_uid, k, n);
    end if;
  end loop;
  foreach k in array private.valuable_item_keys() loop
    if k = any (private.evo_item_keys()) then
      continue;
    end if;
    n := coalesce((p_grants->>k)::int, 0);
    if n > 0 then
      perform private.adjust_item(p_uid, k, n);
    end if;
  end loop;
end;
$function$;

-- ---------------------------------------------------------------------------
-- 5) Mart sell (authoritative)
-- ---------------------------------------------------------------------------
create or replace function public.play_sell_item(
  p_item_key text,
  p_quantity int,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
  slug text := lower(nullif(btrim(coalesce(p_item_key, '')), ''));
  qty int := coalesce(p_quantity, 0);
  unit int;
  total int;
  have int;
  after_qty int;
  after_coins int;
  prior public.mart_sales;
  pol public.item_policy;
  cat public.item_catalog;
begin
  if uid is null then
    raise exception 'Sign in to sell items.' using errcode = '42501';
  end if;
  if slug is null then
    raise exception 'Choose an item to sell.';
  end if;
  if qty < 1 or qty > 99 then
    raise exception 'Quantity must be between 1 and 99.';
  end if;

  if p_idempotency_key is not null then
    select * into prior from public.mart_sales
     where user_id = uid and idempotency = p_idempotency_key;
    if found then
      return jsonb_build_object(
        'ok', true,
        'duplicate', true,
        'item', prior.item_slug,
        'quantity', prior.quantity,
        'unitPrice', prior.unit_price,
        'coinsReceived', prior.coins_received,
        'message', 'This sale was already completed.'
      );
    end if;
  end if;

  select * into pol from public.item_policy where item_slug = slug;
  if not found or not pol.mart_sell_enabled or not pol.inventory_enabled then
    raise exception 'That item cannot be sold at the Mart.';
  end if;
  unit := private.item_sell_price(slug);
  if unit < 1 then
    raise exception 'That item has no sell price.';
  end if;
  select * into cat from public.item_catalog where slug = slug;

  perform private.ensure_inventory(uid);
  have := private.item_qty(uid, slug);
  if have < qty then
    raise exception 'You do not own that many.';
  end if;

  total := unit * qty;
  after_qty := private.adjust_item(uid, slug, -qty);
  perform private.adjust_coins(
    uid, total, 'MART_SALE', 'Sold ' || coalesce(cat.display_name, slug),
    jsonb_build_object(
      'idempotency', case when p_idempotency_key is null then null else p_idempotency_key || ':coins' end,
      'relatedItem', slug
    )
  );
  insert into public.item_ledger (user_id, item_key, amount, reason, source_id, idempotency)
  values (
    uid, slug, -qty, 'MART_SALE', null,
    case when p_idempotency_key is null then null else p_idempotency_key || ':item' end
  )
  on conflict do nothing;

  insert into public.mart_sales (user_id, item_slug, quantity, unit_price, coins_received, idempotency, detail)
  values (
    uid, slug, qty, unit, total, p_idempotency_key,
    jsonb_build_object('displayName', coalesce(cat.display_name, slug))
  );

  select coins into after_coins from public.inventories where user_id = uid;

  return jsonb_build_object(
    'ok', true,
    'item', slug,
    'displayName', coalesce(cat.display_name, slug),
    'quantity', qty,
    'unitPrice', unit,
    'coinsReceived', total,
    'newQuantity', after_qty,
    'newCoinBalance', after_coins,
    'sprite', coalesce(cat.sprite_path, 'images/items/poke-ball.png')
  );
end;
$function$;

revoke all on function public.play_sell_item(text, int, text) from public;
grant execute on function public.play_sell_item(text, int, text) to authenticated;

create or replace function public.play_mart_sell_shelf()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
  rows jsonb := '[]'::jsonb;
begin
  if uid is null then
    raise exception 'Sign in to use the mart.' using errcode = '42501';
  end if;
  perform private.ensure_inventory(uid);
  select coalesce(jsonb_agg(jsonb_build_object(
    'slug', p.item_slug,
    'name', c.display_name,
    'blurb', coalesce(nullif(c.flavor_text, ''), nullif(c.short_effect, ''), 'A valuable item.'),
    'owned', coalesce((i.items->>p.item_slug)::int, 0),
    'unitPrice', p.game_sell_price,
    'sprite', case when c.sprite_available then c.sprite_path else 'images/items/poke-ball.png' end
  ) order by p.game_sell_price, c.display_name), '[]'::jsonb)
    into rows
  from public.item_policy p
  join public.item_catalog c on c.slug = p.item_slug
  join public.inventories i on i.user_id = uid
  where p.mart_sell_enabled
    and p.inventory_enabled
    and coalesce(p.game_sell_price, 0) > 0
    and coalesce((i.items->>p.item_slug)::int, 0) > 0;
  return jsonb_build_object('ok', true, 'items', rows);
end;
$function$;

revoke all on function public.play_mart_sell_shelf() from public;
grant execute on function public.play_mart_sell_shelf() to authenticated;

-- ---------------------------------------------------------------------------
-- 6) Professor Oak Research milestones
-- ---------------------------------------------------------------------------
create table if not exists public.oak_research_tracks (
  id text primary key,
  name text not null,
  description text not null,
  sort_order int not null default 100
);

create table if not exists public.oak_research_milestones (
  id text primary key,
  track_id text not null references public.oak_research_tracks(id) on delete cascade,
  title text not null,
  description text not null,
  threshold int not null check (threshold > 0),
  rewards jsonb not null default '{}'::jsonb,
  sort_order int not null default 100,
  enabled boolean not null default true
);

create index if not exists oak_research_milestones_track_idx
  on public.oak_research_milestones (track_id, sort_order);

create table if not exists public.oak_research_claims (
  user_id uuid not null references public.profiles(id) on delete cascade,
  milestone_id text not null references public.oak_research_milestones(id) on delete cascade,
  claimed_at timestamptz not null default now(),
  rewards jsonb not null default '{}'::jsonb,
  primary key (user_id, milestone_id)
);

alter table public.oak_research_tracks enable row level security;
alter table public.oak_research_milestones enable row level security;
alter table public.oak_research_claims enable row level security;

drop policy if exists oak_research_tracks_read on public.oak_research_tracks;
create policy oak_research_tracks_read on public.oak_research_tracks for select using (true);
drop policy if exists oak_research_milestones_read on public.oak_research_milestones;
create policy oak_research_milestones_read on public.oak_research_milestones for select using (true);
drop policy if exists oak_research_claims_own on public.oak_research_claims;
create policy oak_research_claims_own on public.oak_research_claims for select using (auth.uid() = user_id);

grant select on public.oak_research_tracks to anon, authenticated;
grant select on public.oak_research_milestones to anon, authenticated;
grant select on public.oak_research_claims to authenticated;

insert into public.oak_research_tracks (id, name, description, sort_order) values
  ('field', 'Field Research', 'Unique Kanto species registered in your Pokédex.', 10),
  ('evolution', 'Evolution Research', 'Successful evolutions completed in the Lab.', 20),
  ('line', 'Evolution Line Research', 'Fully registered Kanto Evolution Lines.', 30),
  ('transfer', 'Transfer Research', 'Duplicate Pokémon sent to Professor Oak.', 40)
on conflict (id) do update set name = excluded.name, description = excluded.description;

insert into public.oak_research_milestones (id, track_id, title, description, threshold, rewards, sort_order) values
  ('field-10', 'field', 'Field Research I', 'Register 10 Kanto Pokémon.', 10, '{"stardust":1}'::jsonb, 10),
  ('field-25', 'field', 'Field Research II', 'Register 25 Kanto Pokémon.', 25, '{"pearl":1}'::jsonb, 20),
  ('field-50', 'field', 'Field Research III', 'Register 50 Kanto Pokémon.', 50, '{"nugget":1}'::jsonb, 30),
  ('field-75', 'field', 'Field Research IV', 'Register 75 Kanto Pokémon.', 75, '{"stardust":2,"coins":200}'::jsonb, 40),
  ('field-100', 'field', 'Field Research V', 'Register 100 Kanto Pokémon.', 100, '{"starpiece":1}'::jsonb, 50),
  ('field-125', 'field', 'Field Research VI', 'Register 125 Kanto Pokémon.', 125, '{"bigpearl":1}'::jsonb, 60),
  ('field-151', 'field', 'Field Research Master', 'Register all 151 Kanto Pokémon.', 151, '{"bignugget":1,"coins":500}'::jsonb, 70),
  ('evolution-1', 'evolution', 'Evolution Research I', 'Complete 1 evolution.', 1, '{"stardust":1}'::jsonb, 10),
  ('evolution-5', 'evolution', 'Evolution Research II', 'Complete 5 evolutions.', 5, '{"pearl":1}'::jsonb, 20),
  ('evolution-10', 'evolution', 'Evolution Research III', 'Complete 10 evolutions.', 10, '{"nugget":1}'::jsonb, 30),
  ('evolution-20', 'evolution', 'Evolution Research IV', 'Complete 20 evolutions.', 20, '{"starpiece":1}'::jsonb, 40),
  ('evolution-35', 'evolution', 'Evolution Research V', 'Complete 35 evolutions.', 35, '{"bigpearl":1}'::jsonb, 50),
  ('evolution-50', 'evolution', 'Evolution Research VI', 'Complete 50 evolutions.', 50, '{"bignugget":1}'::jsonb, 60),
  ('line-1', 'line', 'Line Research I', 'Complete 1 Kanto Evolution Line.', 1, '{"pearl":1}'::jsonb, 10),
  ('line-5', 'line', 'Line Research II', 'Complete 5 Kanto Evolution Lines.', 5, '{"stardust":2}'::jsonb, 20),
  ('line-10', 'line', 'Line Research III', 'Complete 10 Kanto Evolution Lines.', 10, '{"nugget":1}'::jsonb, 30),
  ('line-20', 'line', 'Line Research IV', 'Complete 20 Kanto Evolution Lines.', 20, '{"starpiece":1}'::jsonb, 40),
  ('line-30', 'line', 'Line Research V', 'Complete 30 Kanto Evolution Lines.', 30, '{"bigpearl":1}'::jsonb, 50),
  ('line-all', 'line', 'Line Research Master', 'Complete every eligible Kanto Evolution Line.', 9999, '{"bignugget":1,"coins":300}'::jsonb, 60),
  ('transfer-1', 'transfer', 'Transfer Research I', 'Send 1 Pokémon to Professor Oak.', 1, '{"stardust":1}'::jsonb, 10),
  ('transfer-10', 'transfer', 'Transfer Research II', 'Send 10 Pokémon to Professor Oak.', 10, '{"stardust":1}'::jsonb, 20),
  ('transfer-25', 'transfer', 'Transfer Research III', 'Send 25 Pokémon to Professor Oak.', 25, '{"pearl":1}'::jsonb, 30),
  ('transfer-50', 'transfer', 'Transfer Research IV', 'Send 50 Pokémon to Professor Oak.', 50, '{"nugget":1}'::jsonb, 40),
  ('transfer-100', 'transfer', 'Transfer Research V', 'Send 100 Pokémon to Professor Oak.', 100, '{"starpiece":1}'::jsonb, 50)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  threshold = excluded.threshold,
  rewards = excluded.rewards,
  sort_order = excluded.sort_order;

create or replace function private.oak_research_progress(p_uid uuid)
returns jsonb
language plpgsql
stable
as $function$
declare
  field_n int := 0;
  evo_n int := 0;
  line_n int := 0;
  xfer_n int := 0;
  line_total int := 0;
begin
  select count(distinct dex) into field_n
    from public.catches
   where user_id = p_uid and dex between 1 and 151;

  select count(*) into evo_n
    from public.evolution_log
   where user_id = p_uid;

  select count(*) into xfer_n
    from public.oak_transfers
   where user_id = p_uid;

  -- Completed Kanto lines: every CURRENTLY ENABLED Kanto member of the family is registered.
  with kanto_members as (
    select s.family_id, s.dex
      from public.species s
     where s.family_id is not null
       and s.dex between 1 and 151
  ),
  fam as (
    select family_id, count(*) as need
      from kanto_members
     group by family_id
  ),
  have as (
    select km.family_id, count(distinct c.dex) as got
      from kanto_members km
      join public.catches c on c.user_id = p_uid and c.dex = km.dex
     group by km.family_id
  )
  select
    coalesce((select count(*) from fam f join have h on h.family_id = f.family_id and h.got >= f.need), 0),
    coalesce((select count(*) from fam), 0)
    into line_n, line_total;

  return jsonb_build_object(
    'field', field_n,
    'evolution', evo_n,
    'line', line_n,
    'lineTotal', line_total,
    'transfer', xfer_n
  );
end;
$function$;

create or replace function public.play_oak_research()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
  prog jsonb;
  tracks jsonb := '[]'::jsonb;
  line_total int;
begin
  if uid is null then
    raise exception 'Sign in to view research.' using errcode = '42501';
  end if;
  prog := private.oak_research_progress(uid);
  line_total := coalesce((prog->>'lineTotal')::int, 0);

  select coalesce(jsonb_agg(track_row order by sort_order), '[]'::jsonb)
    into tracks
  from (
    select
      t.sort_order,
      jsonb_build_object(
        'id', t.id,
        'name', t.name,
        'description', t.description,
        'progress', case t.id
          when 'field' then coalesce((prog->>'field')::int, 0)
          when 'evolution' then coalesce((prog->>'evolution')::int, 0)
          when 'line' then coalesce((prog->>'line')::int, 0)
          when 'transfer' then coalesce((prog->>'transfer')::int, 0)
          else 0
        end,
        'lineTotal', line_total,
        'milestones', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'id', m.id,
            'title', m.title,
            'description', m.description,
            'threshold', case when m.id = 'line-all' then greatest(line_total, 1) else m.threshold end,
            'rewards', m.rewards,
            'complete', case
              when m.id = 'line-all' then coalesce((prog->>'line')::int, 0) >= greatest(line_total, 1) and line_total > 0
              when t.id = 'field' then coalesce((prog->>'field')::int, 0) >= m.threshold
              when t.id = 'evolution' then coalesce((prog->>'evolution')::int, 0) >= m.threshold
              when t.id = 'line' then coalesce((prog->>'line')::int, 0) >= m.threshold
              when t.id = 'transfer' then coalesce((prog->>'transfer')::int, 0) >= m.threshold
              else false
            end,
            'claimed', exists (
              select 1 from public.oak_research_claims c
               where c.user_id = uid and c.milestone_id = m.id
            )
          ) order by m.sort_order), '[]'::jsonb)
          from public.oak_research_milestones m
          where m.track_id = t.id and m.enabled
        )
      ) as track_row
    from public.oak_research_tracks t
    order by t.sort_order
  ) q;

  return jsonb_build_object('ok', true, 'progress', prog, 'tracks', tracks);
end;
$function$;

revoke all on function public.play_oak_research() from public;
grant execute on function public.play_oak_research() to authenticated;

create or replace function public.play_claim_oak_research(p_milestone_id text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
  mid text := nullif(btrim(coalesce(p_milestone_id, '')), '');
  m public.oak_research_milestones;
  prog jsonb;
  complete boolean := false;
  line_total int;
  current int := 0;
  grants jsonb;
  coins int := 0;
begin
  if uid is null then
    raise exception 'Sign in to claim research.' using errcode = '42501';
  end if;
  if mid is null then
    raise exception 'Choose a research milestone.';
  end if;
  select * into m from public.oak_research_milestones where id = mid and enabled;
  if not found then
    raise exception 'That research milestone is not available.';
  end if;
  if exists (select 1 from public.oak_research_claims where user_id = uid and milestone_id = mid) then
    raise exception 'You already claimed that research reward.';
  end if;

  prog := private.oak_research_progress(uid);
  line_total := coalesce((prog->>'lineTotal')::int, 0);
  current := case m.track_id
    when 'field' then coalesce((prog->>'field')::int, 0)
    when 'evolution' then coalesce((prog->>'evolution')::int, 0)
    when 'line' then coalesce((prog->>'line')::int, 0)
    when 'transfer' then coalesce((prog->>'transfer')::int, 0)
    else 0
  end;
  if m.id = 'line-all' then
    complete := current >= greatest(line_total, 1) and line_total > 0;
  else
    complete := current >= m.threshold;
  end if;
  if not complete then
    raise exception 'That research milestone is not complete yet.';
  end if;

  grants := coalesce(m.rewards, '{}'::jsonb);
  coins := coalesce((grants->>'coins')::int, 0);
  insert into public.oak_research_claims (user_id, milestone_id, rewards)
  values (uid, mid, grants);
  if coins <> 0 then
    perform private.adjust_coins(
      uid, coins, 'OAK_RESEARCH', m.title,
      jsonb_build_object('idempotency', 'oak-research:' || uid::text || ':' || mid || ':coins')
    );
  end if;
  perform private.grant_items(
    uid,
    grants - 'coins',
    'OAK_RESEARCH',
    mid,
    'oak-research:' || uid::text || ':' || mid,
    true
  );

  return jsonb_build_object(
    'ok', true,
    'milestoneId', mid,
    'title', m.title,
    'description', m.description,
    'rewards', grants,
    'oakLine', 'Excellent work! We''re learning more about Pokémon every day!'
  );
end;
$function$;

revoke all on function public.play_claim_oak_research(text) from public;
grant execute on function public.play_claim_oak_research(text) to authenticated;

-- Admin QA: grant valuable / reset research claims for Play Tester targets only via existing staff checks
create or replace function public.admin_oak_research_reset(p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  perform private.require_staff_edit();
  if p_user is null then
    raise exception 'Pick a Trainer.';
  end if;
  delete from public.oak_research_claims where user_id = p_user;
  return jsonb_build_object('ok', true, 'userId', p_user);
end;
$function$;

revoke all on function public.admin_oak_research_reset(uuid) from public;
grant execute on function public.admin_oak_research_reset(uuid) to authenticated;

create or replace function public.admin_grant_valuable(
  p_user uuid,
  p_item_key text,
  p_qty int default 1
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  slug text := lower(nullif(btrim(coalesce(p_item_key, '')), ''));
  qty int := greatest(coalesce(p_qty, 1), 1);
begin
  perform private.require_staff_edit();
  if p_user is null or slug is null then
    raise exception 'Pick a Trainer and item.';
  end if;
  if not exists (
    select 1 from public.item_policy
     where item_slug = slug and admin_grant_enabled and inventory_enabled
  ) then
    raise exception 'That valuable cannot be granted.';
  end if;
  perform private.grant_items(
    p_user,
    jsonb_build_object(slug, qty),
    'ADMIN_QA',
    'admin-valuable',
    'admin-valuable:' || p_user::text || ':' || slug || ':' || gen_random_uuid()::text,
    true
  );
  return jsonb_build_object('ok', true, 'item', slug, 'qty', qty);
end;
$function$;

revoke all on function public.admin_grant_valuable(uuid, text, int) from public;
grant execute on function public.admin_grant_valuable(uuid, text, int) to authenticated;
