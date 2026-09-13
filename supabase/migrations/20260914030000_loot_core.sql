-- Unified loot tables, item ledger, daily claims, and choice rewards.
-- Does not reset inventories, coins, Bits history, or existing milestones.

create table if not exists public.loot_tables (
  id text primary key,
  name text not null,
  tier text,
  enabled boolean not null default true
);

create table if not exists public.loot_table_entries (
  id uuid primary key default gen_random_uuid(),
  table_id text not null references public.loot_tables(id) on delete cascade,
  item_key text not null,
  weight int not null default 100,
  min_qty int not null default 1,
  max_qty int not null default 1,
  enabled boolean not null default true,
  unique (table_id, item_key, min_qty, max_qty)
);

create table if not exists public.item_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_key text not null,
  amount int not null,
  reason text not null,
  source_id text,
  idempotency text,
  created_at timestamptz not null default now()
);
create unique index if not exists item_ledger_idem_uidx
  on public.item_ledger (user_id, idempotency)
  where idempotency is not null;
create index if not exists item_ledger_user_idx on public.item_ledger (user_id, created_at desc);
create index if not exists item_ledger_item_idx on public.item_ledger (item_key, reason, created_at desc);

alter table public.item_ledger enable row level security;
drop policy if exists item_ledger_own on public.item_ledger;
create policy item_ledger_own on public.item_ledger for select using (auth.uid() = user_id);
grant select on public.item_ledger to authenticated;

create table if not exists public.loot_rolls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  source text not null,
  source_id text,
  rolled boolean not null,
  drop_chance numeric,
  roll numeric,
  tier text,
  item_key text,
  qty int,
  weight int,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists loot_rolls_src_idx on public.loot_rolls (source, created_at desc);

create table if not exists public.daily_claims (
  user_id uuid not null references public.profiles(id) on delete cascade,
  claim_date date not null,
  streak_day int not null default 1,
  grants jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (user_id, claim_date)
);
alter table public.daily_claims enable row level security;
drop policy if exists daily_claims_own on public.daily_claims;
create policy daily_claims_own on public.daily_claims for select using (auth.uid() = user_id);
grant select on public.daily_claims to authenticated;

create table if not exists public.reward_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  idempotency text not null,
  reason text not null,
  source_id text,
  grants jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency)
);
create index if not exists reward_events_reason_idx on public.reward_events (reason, created_at desc);

create table if not exists public.reward_choices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  reward_key text not null,
  options text[] not null,
  remaining int not null,
  created_at timestamptz not null default now(),
  unique (user_id, reward_key)
);
alter table public.reward_choices enable row level security;
drop policy if exists reward_choices_own on public.reward_choices;
create policy reward_choices_own on public.reward_choices for select using (auth.uid() = user_id);
grant select on public.reward_choices to authenticated;

insert into public.loot_tables (id, name, tier, enabled) values
  ('ENCOUNTER_PARTICIPATION_COMMON', 'Encounter participation', 'COMMON', true),
  ('CAPTURE_COMMON', 'Capture common', 'COMMON', true),
  ('CAPTURE_UNCOMMON', 'Capture uncommon', 'UNCOMMON', true),
  ('CAPTURE_RARE', 'Capture rare', 'RARE', true),
  ('CAPTURE_VERY_RARE', 'Capture very rare', 'VERY_RARE', true),
  ('SHINY_CAPTURE', 'Shiny capture floor', 'UNCOMMON', true),
  ('LEGENDARY_CAPTURE', 'Legendary capture floor', 'RARE', true),
  ('DAILY_COMMON_BERRY', 'Daily common berry', 'COMMON', true)
on conflict (id) do update set name = excluded.name, tier = excluded.tier;

insert into public.loot_table_entries (table_id, item_key, weight, min_qty, max_qty) values
  ('ENCOUNTER_PARTICIPATION_COMMON', 'pokeball', 140, 1, 1),
  ('ENCOUNTER_PARTICIPATION_COMMON', 'pokeball', 20, 2, 2),
  ('ENCOUNTER_PARTICIPATION_COMMON', 'hisuipokeball', 70, 1, 1),
  ('ENCOUNTER_PARTICIPATION_COMMON', 'berry', 80, 1, 1),
  ('ENCOUNTER_PARTICIPATION_COMMON', 'cheri', 40, 1, 1),
  ('ENCOUNTER_PARTICIPATION_COMMON', 'chesto', 40, 1, 1),
  ('ENCOUNTER_PARTICIPATION_COMMON', 'pecha', 40, 1, 1),
  ('ENCOUNTER_PARTICIPATION_COMMON', 'rawst', 40, 1, 1),
  ('ENCOUNTER_PARTICIPATION_COMMON', 'aspear', 40, 1, 1),
  ('CAPTURE_COMMON', 'pokeball', 160, 1, 1),
  ('CAPTURE_COMMON', 'hisuipokeball', 80, 1, 1),
  ('CAPTURE_COMMON', 'berry', 90, 1, 1),
  ('CAPTURE_COMMON', 'cheri', 35, 1, 1),
  ('CAPTURE_COMMON', 'chesto', 35, 1, 1),
  ('CAPTURE_COMMON', 'pecha', 35, 1, 1),
  ('CAPTURE_COMMON', 'rawst', 35, 1, 1),
  ('CAPTURE_COMMON', 'aspear', 35, 1, 1),
  ('CAPTURE_UNCOMMON', 'greatball', 100, 1, 1),
  ('CAPTURE_UNCOMMON', 'bait', 80, 1, 1),
  ('CAPTURE_UNCOMMON', 'sitrus', 70, 1, 1),
  ('CAPTURE_UNCOMMON', 'lum', 70, 1, 1),
  ('CAPTURE_UNCOMMON', 'razz', 70, 1, 1),
  ('CAPTURE_UNCOMMON', 'netball', 50, 1, 1),
  ('CAPTURE_UNCOMMON', 'diveball', 50, 1, 1),
  ('CAPTURE_UNCOMMON', 'nestball', 50, 1, 1),
  ('CAPTURE_UNCOMMON', 'lureball', 50, 1, 1),
  ('CAPTURE_UNCOMMON', 'timerball', 50, 1, 1),
  ('CAPTURE_UNCOMMON', 'beastball', 30, 1, 1),
  ('CAPTURE_RARE', 'ultraball', 90, 1, 1),
  ('CAPTURE_RARE', 'goldenrazz', 70, 1, 1),
  ('CAPTURE_RARE', 'silverpinap', 60, 1, 1),
  ('CAPTURE_RARE', 'duskball', 50, 1, 1),
  ('CAPTURE_RARE', 'repeatball', 50, 1, 1),
  ('CAPTURE_RARE', 'fastball', 50, 1, 1),
  ('CAPTURE_RARE', 'heavyball', 50, 1, 1),
  ('CAPTURE_RARE', 'dreamball', 40, 1, 1),
  ('CAPTURE_RARE', 'firestone', 100, 1, 1),
  ('CAPTURE_RARE', 'waterstone', 100, 1, 1),
  ('CAPTURE_RARE', 'thunderstone', 100, 1, 1),
  ('CAPTURE_RARE', 'leafstone', 100, 1, 1),
  ('CAPTURE_RARE', 'moonstone', 70, 1, 1),
  ('CAPTURE_VERY_RARE', 'linkingcord', 80, 1, 1),
  ('CAPTURE_VERY_RARE', 'ultraball', 70, 2, 2),
  ('CAPTURE_VERY_RARE', 'goldenrazz', 60, 2, 2),
  ('CAPTURE_VERY_RARE', 'rarecandy', 50, 1, 1),
  ('CAPTURE_VERY_RARE', 'choice_stone', 40, 1, 1),
  ('SHINY_CAPTURE', 'greatball', 100, 1, 1),
  ('SHINY_CAPTURE', 'bait', 80, 1, 1),
  ('SHINY_CAPTURE', 'sitrus', 70, 1, 1),
  ('SHINY_CAPTURE', 'lum', 70, 1, 1),
  ('SHINY_CAPTURE', 'razz', 70, 1, 1),
  ('SHINY_CAPTURE', 'netball', 50, 1, 1),
  ('LEGENDARY_CAPTURE', 'ultraball', 90, 1, 1),
  ('LEGENDARY_CAPTURE', 'goldenrazz', 70, 1, 1),
  ('LEGENDARY_CAPTURE', 'firestone', 80, 1, 1),
  ('LEGENDARY_CAPTURE', 'waterstone', 80, 1, 1),
  ('LEGENDARY_CAPTURE', 'thunderstone', 80, 1, 1),
  ('LEGENDARY_CAPTURE', 'leafstone', 80, 1, 1),
  ('LEGENDARY_CAPTURE', 'moonstone', 55, 1, 1),
  ('LEGENDARY_CAPTURE', 'duskball', 50, 1, 1),
  ('DAILY_COMMON_BERRY', 'berry', 100, 1, 1),
  ('DAILY_COMMON_BERRY', 'cheri', 100, 1, 1),
  ('DAILY_COMMON_BERRY', 'chesto', 100, 1, 1),
  ('DAILY_COMMON_BERRY', 'pecha', 100, 1, 1),
  ('DAILY_COMMON_BERRY', 'rawst', 100, 1, 1),
  ('DAILY_COMMON_BERRY', 'aspear', 100, 1, 1)
on conflict (table_id, item_key, min_qty, max_qty) do update
  set weight = excluded.weight, enabled = true;

update public.site_config
   set game_settings = coalesce(game_settings, '{}'::jsonb)
     || jsonb_build_object(
       'lootBalance', coalesce(game_settings->'lootBalance', '{}'::jsonb) || jsonb_build_object(
         'lootBalanceVersion', 1,
         'participationDropChance', 0.15,
         'captureDropChance', 0.25,
         'captureTiers', jsonb_build_object('COMMON', 0.70, 'UNCOMMON', 0.24, 'RARE', 0.05, 'VERY_RARE', 0.01, 'SPECIAL', 0),
         'rarityUpgrade', jsonb_build_object('COMMON', 0, 'UNCOMMON', 0, 'RARE', 0.05, 'VERY_RARE', 0.10, 'ULTRA_RARE', 0.15, 'LEGENDARY', 0),
         'shinyLootFloor', 'UNCOMMON',
         'legendaryLootFloor', 'RARE',
         'eventDropModifier', 1.0,
         'maxDropChance', 0.55,
         'streamFirstBall', 1,
         'itemValues', jsonb_build_object(
           'pokeball', 100, 'hisuipokeball', 100, 'greatball', 225, 'ultraball', 500,
           'berry', 60, 'cheri', 60, 'chesto', 60, 'pecha', 60, 'rawst', 60, 'aspear', 60,
           'sitrus', 150, 'lum', 150, 'razz', 200, 'bait', 125, 'goldenrazz', 500,
           'silverpinap', 400, 'netball', 200, 'diveball', 200, 'nestball', 175,
           'lureball', 200, 'timerball', 200, 'duskball', 275, 'repeatball', 250,
           'fastball', 250, 'heavyball', 250, 'dreamball', 350, 'beastball', 225,
           'firestone', 350, 'waterstone', 350, 'thunderstone', 350, 'leafstone', 350,
           'moonstone', 450, 'linkingcord', 600, 'rarecandy', 400
         )
       )
     );
