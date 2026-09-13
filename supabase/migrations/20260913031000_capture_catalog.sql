-- Capture catalog: Poke Ball rules, Berry catalog, bag support for many Berries,
-- capture telemetry, and the central balance configuration block.
-- Every table is keyed by the bag key that inventories already use, so existing
-- player quantities and store grants keep working untouched.

create table if not exists public.capture_balls (
  key text primary key,
  name text not null,
  category text not null default 'standard',
  base_multiplier numeric not null default 1.0,
  conditional_multiplier numeric,
  condition_type text not null default 'NONE',
  condition_config jsonb not null default '{}'::jsonb,
  guaranteed_capture boolean not null default false,
  shop_price int,
  sell_price int,
  rarity text not null default 'common',
  enabled boolean not null default true,
  image text,
  description text,
  sort_order int not null default 100,
  updated_at timestamptz not null default now()
);

create table if not exists public.capture_berries (
  key text primary key,
  slug text unique,
  berry_id int,
  item_id int,
  item_slug text,
  name text not null,
  firmness text,
  natural_gift_type text,
  natural_gift_power int,
  flavors jsonb not null default '{}'::jsonb,
  sprite text,
  canonical_effect text,
  canonical_flavor_text text,
  capture_multiplier numeric not null default 1.0,
  capture_rule jsonb not null default '{}'::jsonb,
  reward_bonus numeric not null default 0,
  rpg_description text,
  tier text not null default 'common',
  rarity text not null default 'common',
  shop_price int,
  sell_price int,
  enabled boolean not null default true,
  capture_enabled boolean not null default false,
  store_available boolean not null default false,
  sort_order int not null default 100,
  updated_at timestamptz not null default now()
);

alter table public.capture_balls enable row level security;
alter table public.capture_berries enable row level security;

drop policy if exists capture_balls_read on public.capture_balls;
create policy capture_balls_read on public.capture_balls for select using (true);
drop policy if exists capture_berries_read on public.capture_berries;
create policy capture_berries_read on public.capture_berries for select using (true);

grant select on public.capture_balls to anon, authenticated;
grant select on public.capture_berries to anon, authenticated;

-- Extra Berry stacks live beside the extra Poke Ball stacks. The legacy
-- inventories.berry column stays the Oran Berry so nobody loses anything.
alter table public.inventories
  add column if not exists berries jsonb not null default '{}'::jsonb;

create table if not exists public.capture_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  round_id uuid,
  user_id uuid,
  dex int,
  species_name text,
  variant text,
  gender text,
  is_shiny boolean not null default false,
  is_female boolean not null default false,
  canonical_catch_rate int,
  base_chance numeric,
  ball_key text,
  ball_multiplier numeric,
  ball_condition_met boolean,
  berry_key text,
  berry_multiplier numeric,
  honey_contributors int,
  honey_participants int,
  honey_multiplier numeric,
  honey_contributor_multiplier numeric,
  shiny_multiplier numeric,
  event_multiplier numeric,
  other_multiplier numeric,
  raw_chance numeric,
  final_chance numeric,
  capture_roll numeric,
  success boolean,
  detail jsonb not null default '{}'::jsonb
);

create index if not exists capture_log_round_idx on public.capture_log (round_id);
create index if not exists capture_log_user_idx on public.capture_log (user_id, created_at desc);
create index if not exists capture_log_dex_idx on public.capture_log (dex);
create unique index if not exists capture_log_once_idx on public.capture_log (round_id, user_id);

alter table public.capture_log enable row level security;

-- Poke Ball behaviour. Multipliers are deliberately compressed compared with the
-- main series because this RPG gives one throw per encounter and has no battle prep.
insert into public.capture_balls (key, name, category, base_multiplier, conditional_multiplier, condition_type, condition_config, guaranteed_capture, rarity, enabled, image, description, sort_order)
values
  ('pokeball',       'Poké Ball',        'standard',   1.00, null,  'NONE', '{}', false, 'common',    true,  'poke-ball.png',        'A reliable Poké Ball for catching wild Pokémon.', 10),
  ('greatball',      'Great Ball',       'upgrade',    1.25, null,  'NONE', '{}', false, 'uncommon',  true,  'great-ball.png',       'A good Poké Ball that improves your chance of catching a wild Pokémon.', 20),
  ('ultraball',      'Ultra Ball',       'upgrade',    1.50, null,  'NONE', '{}', false, 'rare',      true,  'ultra-ball.png',       'A high-performance Poké Ball that greatly improves your chance of catching a wild Pokémon.', 30),
  ('masterball',     'Master Ball',      'guaranteed', 1.00, null,  'NONE', '{}', true,  'legendary', true,  'master-ball.png',      'The finest Poké Ball ever made. It never fails to catch a wild Pokémon.', 40),
  ('premierball',    'Premier Ball',     'standard',   1.00, null,  'NONE', '{}', false, 'common',    true,  'premier-ball.png',     'A commemorative Poké Ball. It performs like a standard Poké Ball.', 50),
  ('luxuryball',     'Luxury Ball',      'standard',   1.00, null,  'NONE', '{}', false, 'common',    true,  'luxury-ball.png',      'A comfortable Poké Ball. It performs like a standard Poké Ball.', 60),
  ('healball',       'Heal Ball',        'standard',   1.00, null,  'NONE', '{}', false, 'common',    true,  'heal-ball.png',        'A restorative Poké Ball. It performs like a standard Poké Ball.', 70),
  ('friendball',     'Friend Ball',      'standard',   1.00, null,  'NONE', '{}', false, 'common',    true,  'friend-ball.png',      'A friendly Poké Ball. It performs like a standard Poké Ball.', 80),
  ('netball',        'Net Ball',         'specialist', 1.00, 1.55,  'TARGET_TYPE', '{"types": ["bug", "water"]}', false, 'uncommon', true, 'net-ball.png', 'Especially effective when catching Water- or Bug-type Pokémon.', 90),
  ('diveball',       'Dive Ball',        'specialist', 1.00, 1.50,  'TARGET_TYPE', '{"types": ["water"]}', false, 'uncommon', true, 'dive-ball.png', 'Especially effective when catching Water-type Pokémon.', 100),
  ('lureball',       'Lure Ball',        'specialist', 1.00, 1.50,  'TARGET_TYPE', '{"types": ["water"]}', false, 'uncommon', true, 'lure-ball.png', 'Especially effective when catching Water-type Pokémon.', 110),
  ('duskball',       'Dusk Ball',        'specialist', 1.00, 1.50,  'NIGHT', '{"startHour": 18, "endHour": 6}', false, 'uncommon', true, 'dusk-ball.png', 'Especially effective at night on the stream clock.', 120),
  ('repeatball',     'Repeat Ball',      'specialist', 1.00, 1.55,  'PLAYER_OWNS_SPECIES', '{}', false, 'uncommon', true, 'repeat-ball.png', 'Especially effective against Pokémon you have already caught.', 130),
  ('nestball',       'Nest Ball',        'specialist', 1.00, 1.45,  'SPECIES_CATCH_RATE_MIN', '{"min": 151}', false, 'uncommon', true, 'nest-ball.png', 'Especially effective against common, easily caught Pokémon.', 140),
  ('fastball',       'Fast Ball',        'specialist', 1.00, 1.55,  'SPECIES_BASE_SPEED_MIN', '{"min": 100}', false, 'uncommon', true, 'fast-ball.png', 'Especially effective against very fast Pokémon.', 150),
  ('moonball',       'Moon Ball',        'specialist', 1.00, 1.60,  'MOON_STONE_FAMILY', '{}', false, 'rare', true, 'moon-ball.png', 'Especially effective against Pokémon in Moon Stone evolution families.', 160),
  ('heavyball',      'Heavy Ball',       'specialist', 1.00, null,  'SPECIES_WEIGHT_TIERS', '{"tiers": [{"minKg": 200, "multiplier": 1.55}, {"minKg": 100, "multiplier": 1.30}]}', false, 'uncommon', true, 'heavy-ball.png', 'Especially effective against very heavy Pokémon.', 170),
  ('quickball',      'Quick Ball',       'specialist', 1.35, null,  'NONE', '{}', false, 'uncommon', true, 'quick-ball.png', 'A quick-acting Poké Ball that improves your chance of catching a wild Pokémon.', 180),
  ('timerball',      'Timer Ball',       'specialist', 1.25, null,  'NONE', '{}', false, 'uncommon', true, 'timer-ball.png', 'A timing-based Poké Ball that improves your chance of catching a wild Pokémon.', 190),
  ('levelball',      'Level Ball',       'specialist', 1.20, null,  'NONE', '{}', false, 'uncommon', true, 'level-ball.png', 'A training Poké Ball that improves your chance of catching a wild Pokémon.', 200),
  ('loveball',       'Love Ball',        'specialist', 1.20, null,  'NONE', '{}', false, 'uncommon', true, 'love-ball.png', 'A charming Poké Ball that improves your chance of catching a wild Pokémon.', 210),
  ('safariball',     'Safari Ball',      'event',      1.10, null,  'NONE', '{}', false, 'uncommon', true, 'safari-ball.png', 'A Safari Zone Poké Ball with a small edge over a standard Poké Ball.', 220),
  ('sportball',      'Sport Ball',       'event',      1.10, null,  'NONE', '{}', false, 'uncommon', true, 'sport-ball.png', 'A Bug-Catching Contest Poké Ball with a small edge over a standard Poké Ball.', 230),
  ('cherishball',    'Cherish Ball',     'event',      1.00, null,  'NONE', '{}', false, 'rare', true, 'cherish-ball.png', 'A commemorative Poké Ball for special Pokémon. It performs like a standard Poké Ball.', 240),
  ('gsball',         'GS Ball',          'cosmetic',   1.00, null,  'NONE', '{}', false, 'rare', true, 'gs-ball.png', 'A mysterious Poké Ball. It performs like a standard Poké Ball.', 250),
  ('ashball',        'Ash''s Poké Ball', 'cosmetic',   1.00, null,  'NONE', '{}', false, 'rare', true, 'ash-ball.png', 'A well-travelled Poké Ball. It performs like a standard Poké Ball.', 260),
  ('cloneball',      'Clone Ball',       'cosmetic',   1.00, null,  'NONE', '{}', false, 'rare', true, 'clone-ball.png', 'An unusual Poké Ball. It performs like a standard Poké Ball.', 270),
  ('darkball',       'Dark Ball',        'cosmetic',   1.00, null,  'NONE', '{}', false, 'rare', true, 'dark-ball.png', 'A shadowy Poké Ball. It performs like a standard Poké Ball.', 280),
  ('oldball',        'Old Ball',         'cosmetic',   1.00, null,  'NONE', '{}', false, 'common', true, 'old-ball.png', 'An antique Poké Ball. It performs like a standard Poké Ball.', 290),
  ('originball',     'Origin Ball',      'cosmetic',   1.00, null,  'NONE', '{}', false, 'legendary', true, 'origin-ball.png', 'An ancient Poké Ball. It performs like a standard Poké Ball.', 300),
  ('strangeball',    'Strange Ball',     'cosmetic',   1.00, null,  'NONE', '{}', false, 'common', true, 'strange-ball.png', 'A Poké Ball from somewhere else. It performs like a standard Poké Ball.', 310),
  ('hisuipokeball',  'Hisui Poké Ball',  'standard',   1.00, null,  'NONE', '{}', false, 'common', true, 'hisui-poke-ball.png', 'An ancient Poké Ball. In this region it performs like a standard Poké Ball.', 320),
  ('hisuigreatball', 'Hisui Great Ball', 'upgrade',    1.25, null,  'NONE', '{}', false, 'uncommon', true, 'hisui-great-ball.png', 'An ancient Great Ball that improves your chance of catching a wild Pokémon.', 330),
  ('hisuiultraball', 'Hisui Ultra Ball', 'upgrade',    1.50, null,  'NONE', '{}', false, 'rare', true, 'hisui-ultra-ball.png', 'An ancient Ultra Ball that greatly improves your chance of catching a wild Pokémon.', 340),
  ('hisuiheavyball', 'Hisui Heavy Ball', 'standard',   1.00, null,  'NONE', '{}', false, 'common', true, 'hisui-heavy-ball.png', 'A weighty ancient Poké Ball. It performs like a standard Poké Ball.', 350),
  ('featherball',    'Feather Ball',     'standard',   1.00, null,  'NONE', '{}', false, 'common', true, 'feather-ball.png', 'A light ancient Poké Ball. It performs like a standard Poké Ball.', 360),
  ('wingball',       'Wing Ball',        'upgrade',    1.25, null,  'NONE', '{}', false, 'uncommon', true, 'wing-ball.png', 'An ancient Poké Ball that improves your chance of catching a wild Pokémon.', 370),
  ('jetball',        'Jet Ball',         'upgrade',    1.50, null,  'NONE', '{}', false, 'rare', true, 'jet-ball.png', 'An ancient Poké Ball that greatly improves your chance of catching a wild Pokémon.', 380),
  ('leadenball',     'Leaden Ball',      'upgrade',    1.25, null,  'NONE', '{}', false, 'uncommon', true, 'leaden-ball.png', 'A heavy ancient Poké Ball that improves your chance of catching a wild Pokémon.', 390),
  ('gigatonball',    'Gigaton Ball',     'upgrade',    1.50, null,  'NONE', '{}', false, 'rare', true, 'gigaton-ball.png', 'A very heavy ancient Poké Ball that greatly improves your chance of catching a wild Pokémon.', 400),
  ('dreamball',      'Dream Ball',       'specialist', 1.20, 1.60,  'TARGET_ASLEEP', '{}', false, 'rare', false, 'poke-ball.png', 'Especially effective against sleeping Pokémon.', 410),
  ('beastball',      'Beast Ball',       'specialist', 0.75, 2.00,  'TARGET_ULTRA_BEAST', '{}', false, 'legendary', false, 'poke-ball.png', 'A strange Poké Ball designed for Ultra Beasts. It struggles against ordinary Pokémon.', 420)
on conflict (key) do update set
  name = excluded.name,
  category = excluded.category,
  base_multiplier = excluded.base_multiplier,
  conditional_multiplier = excluded.conditional_multiplier,
  condition_type = excluded.condition_type,
  condition_config = excluded.condition_config,
  guaranteed_capture = excluded.guaranteed_capture,
  rarity = excluded.rarity,
  image = excluded.image,
  description = excluded.description,
  sort_order = excluded.sort_order,
  updated_at = now();

-- Mirror the current store prices so the catalog can report them. Store rows stay
-- the source of truth for purchasing; this is reference data for admin tooling.
update public.capture_balls b
   set shop_price = s.unit_cost,
       sell_price = greatest(1, (s.unit_cost / 2)::int)
  from (
    select g.key as key,
           min((i.cost / greatest(g.value::int, 1))::int) as unit_cost
    from private.store_items i
    cross join lateral jsonb_each_text(coalesce(i.grants, '{}'::jsonb)) as g(key, value)
    where i.cost > 0
    group by g.key
  ) s
 where s.key = b.key and b.shop_price is null;

-- Berry keys must never be mistaken for throwable Poke Balls. extra_ball_keys()
-- harvests store grant keys, so exclude anything registered as a Berry.
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
  where k <> all (private.core_item_keys())
    and k not in (select key from public.capture_berries)
    and k <> 'bait';
$$;

create or replace function private.is_capture_berry(item text)
returns boolean
language sql
stable
as $$
  select exists (select 1 from public.capture_berries b where b.key = item and b.enabled);
$$;

-- Berries a player may actually choose during the item phase.
create or replace function private.is_prep_item(item text)
returns boolean
language sql
stable
as $$
  select item = 'bait'
     or exists (
       select 1 from public.capture_berries b
       where b.key = item and b.enabled and b.capture_enabled
     );
$$;

-- Bag plumbing for the extra Berry stacks.
create or replace function private.bag_item_qty(p_uid uuid, p_item text)
returns int
language sql
stable
as $$
  select case p_item
    when 'berry' then i.berry
    when 'bait' then i.bait
    when 'pokeball' then i.pokeball
    when 'greatball' then i.greatball
    when 'ultraball' then i.ultraball
    else case
      when private.is_capture_berry(p_item) then coalesce((i.berries->>p_item)::int, 0)
      else coalesce((i.balls->>p_item)::int, 0)
    end
  end
  from public.inventories i
  where i.user_id = p_uid;
$$;

create or replace function private.spend_bag_item(p_uid uuid, p_item text)
returns void
language plpgsql
as $$
declare
  spent int;
  qty int;
begin
  if p_item = 'berry' then
    update public.inventories set berry = berry - 1, updated_at = now()
      where user_id = p_uid and berry > 0;
  elsif p_item = 'bait' then
    update public.inventories set bait = bait - 1, updated_at = now()
      where user_id = p_uid and bait > 0;
  elsif p_item = 'pokeball' then
    update public.inventories set pokeball = pokeball - 1, updated_at = now()
      where user_id = p_uid and pokeball > 0;
  elsif p_item = 'greatball' then
    update public.inventories set greatball = greatball - 1, updated_at = now()
      where user_id = p_uid and greatball > 0;
  elsif p_item = 'ultraball' then
    update public.inventories set ultraball = ultraball - 1, updated_at = now()
      where user_id = p_uid and ultraball > 0;
  elsif private.is_capture_berry(p_item) then
    select coalesce((berries->>p_item)::int, 0) into qty
      from public.inventories where user_id = p_uid;
    if coalesce(qty, 0) < 1 then
      raise exception 'You have no % left. No item spent.', private.item_label(p_item);
    end if;
    update public.inventories
      set berries = jsonb_set(coalesce(berries, '{}'::jsonb), array[p_item], to_jsonb(qty - 1)),
          updated_at = now()
      where user_id = p_uid;
    return;
  elsif p_item = any (private.extra_ball_keys()) then
    select coalesce((balls->>p_item)::int, 0) into qty
      from public.inventories where user_id = p_uid;
    if coalesce(qty, 0) < 1 then
      raise exception 'You have no % left. No item spent.', private.item_label(p_item);
    end if;
    update public.inventories
      set balls = jsonb_set(coalesce(balls, '{}'::jsonb), array[p_item], to_jsonb(qty - 1)),
          updated_at = now()
      where user_id = p_uid;
    return;
  else
    raise exception 'Unknown item.';
  end if;
  get diagnostics spent = row_count;
  if spent = 0 then
    raise exception 'You have no % left. No item spent.', private.item_label(p_item);
  end if;
end;
$$;

create or replace function private.restore_bag_item(p_uid uuid, p_item text)
returns void
language plpgsql
as $$
declare
  qty int;
begin
  if p_item is null or p_uid is null then
    return;
  end if;
  if p_item = 'berry' then
    update public.inventories set berry = berry + 1, updated_at = now() where user_id = p_uid;
  elsif p_item = 'bait' then
    update public.inventories set bait = bait + 1, updated_at = now() where user_id = p_uid;
  elsif p_item = 'pokeball' then
    update public.inventories set pokeball = pokeball + 1, updated_at = now() where user_id = p_uid;
  elsif p_item = 'greatball' then
    update public.inventories set greatball = greatball + 1, updated_at = now() where user_id = p_uid;
  elsif p_item = 'ultraball' then
    update public.inventories set ultraball = ultraball + 1, updated_at = now() where user_id = p_uid;
  elsif private.is_capture_berry(p_item) then
    select coalesce((berries->>p_item)::int, 0) into qty from public.inventories where user_id = p_uid;
    update public.inventories
      set berries = jsonb_set(coalesce(berries, '{}'::jsonb), array[p_item], to_jsonb(coalesce(qty, 0) + 1)),
          updated_at = now()
      where user_id = p_uid;
  elsif private.is_throw_ball(p_item) then
    select coalesce((balls->>p_item)::int, 0) into qty from public.inventories where user_id = p_uid;
    update public.inventories
      set balls = jsonb_set(coalesce(balls, '{}'::jsonb), array[p_item], to_jsonb(coalesce(qty, 0) + 1)),
          updated_at = now()
      where user_id = p_uid;
  end if;
end;
$$;

-- Berry stacks count against bag capacity exactly like ball stacks.
create or replace function private.item_total(i public.inventories)
returns integer
language sql
stable
as $$
  select i.berry + i.bait + i.pokeball + i.greatball + i.ultraball + i.lure
    + coalesce((
        select sum(greatest(value::int, 0))
        from jsonb_each_text(coalesce(i.balls, '{}'::jsonb))
      ), 0)
    + coalesce((
        select sum(greatest(value::int, 0))
        from jsonb_each_text(coalesce(i.berries, '{}'::jsonb))
      ), 0);
$$;

-- Item labels now come from the catalog so new Berries name themselves.
create or replace function private.item_label(item text)
returns text
language sql
stable
as $$
  select coalesce(
    (select b.name from public.capture_balls b where b.key = item),
    (select b.name from public.capture_berries b where b.key = item),
    case item
      when 'bait' then 'Honey'
      when 'lure' then 'Poké Radar'
      when 'coins' then 'PokéCoins'
      when 'bag_bonus' then 'Bag Upgrade'
      else coalesce(item, '')
    end
  );
$$;

-- Central balance configuration. Everything the capture maths reads lives here.
update public.site_config
   set game_settings = coalesce(game_settings, '{}'::jsonb) || jsonb_build_object(
     'captureBalance', coalesce(game_settings->'captureBalance', '{}'::jsonb) || jsonb_build_object(
       'baseChanceTiers', coalesce(game_settings->'captureBalance'->'baseChanceTiers', jsonb_build_array(
         jsonb_build_object('minCatchRate', 201, 'chance', 0.34),
         jsonb_build_object('minCatchRate', 151, 'chance', 0.30),
         jsonb_build_object('minCatchRate', 101, 'chance', 0.25),
         jsonb_build_object('minCatchRate', 76,  'chance', 0.21),
         jsonb_build_object('minCatchRate', 46,  'chance', 0.16),
         jsonb_build_object('minCatchRate', 26,  'chance', 0.11),
         jsonb_build_object('minCatchRate', 10,  'chance', 0.07),
         jsonb_build_object('minCatchRate', 1,   'chance', 0.04)
       )),
       'minChance', coalesce(game_settings->'captureBalance'->'minChance', to_jsonb(0.02)),
       'maxChance', coalesce(game_settings->'captureBalance'->'maxChance', to_jsonb(0.85)),
       'shinyMultiplier', coalesce(game_settings->'captureBalance'->'shinyMultiplier', to_jsonb(1.0)),
       'eventMultiplier', coalesce(game_settings->'captureBalance'->'eventMultiplier', to_jsonb(1.0)),
       'timezone', coalesce(game_settings->'captureBalance'->'timezone', to_jsonb('America/New_York'::text)),
       'honeyTiers', coalesce(game_settings->'captureBalance'->'honeyTiers', jsonb_build_array(
         jsonb_build_object('minRate', 1.00, 'multiplier', 1.22),
         jsonb_build_object('minRate', 0.81, 'multiplier', 1.18),
         jsonb_build_object('minRate', 0.61, 'multiplier', 1.14),
         jsonb_build_object('minRate', 0.41, 'multiplier', 1.10),
         jsonb_build_object('minRate', 0.21, 'multiplier', 1.06),
         jsonb_build_object('minRate', 0.01, 'multiplier', 1.03),
         jsonb_build_object('minRate', 0.00, 'multiplier', 1.00)
       )),
       'honeyContributorBonus', coalesce(game_settings->'captureBalance'->'honeyContributorBonus', to_jsonb(1.03)),
       'criticalCaptureChance', coalesce(game_settings->'captureBalance'->'criticalCaptureChance', to_jsonb(0.0))
     )
   )
 where id = 1;
