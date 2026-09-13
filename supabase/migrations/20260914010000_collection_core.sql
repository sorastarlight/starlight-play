-- Duplicate value, family Candy, evolution rules, and species mastery.
-- Existing catches, GTS trades, and Oak transfer candy are preserved.

alter table public.catches
  add column if not exists favorite boolean not null default false,
  add column if not exists locked boolean not null default false,
  add column if not exists obtained_method text not null default 'CAPTURE',
  add column if not exists trade_evo_ready boolean not null default false,
  add column if not exists trade_locked_until timestamptz,
  add column if not exists reserved_trade_id uuid;

update public.catches
   set obtained_method = case
         when round_id is not null then 'CAPTURE'
         when ot_user_id is not null and ot_user_id <> user_id then 'TRADE'
         else coalesce(nullif(obtained_method, ''), 'CAPTURE')
       end
 where obtained_method = 'CAPTURE' and round_id is null;

alter table public.species
  add column if not exists family_id int,
  add column if not exists evo_stage int not null default 0,
  add column if not exists tradable boolean not null default true,
  add column if not exists mythical boolean not null default false;

update public.species set mythical = true, tradable = false where dex = 151;
update public.species set tradable = true where dex = 150;

create table if not exists public.evolution_families (
  id int primary key,
  name text not null,
  base_dex int not null
);

create table if not exists public.evolution_rules (
  id text primary key,
  from_dex int not null,
  to_dex int not null,
  family_id int not null references public.evolution_families(id),
  candy_cost int not null,
  required_item text,
  condition_type text not null default 'CANDY_ONLY',
  condition_value jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  sort_order int not null default 0
);

create table if not exists public.family_candy (
  user_id uuid not null references public.profiles(id) on delete cascade,
  family_id int not null references public.evolution_families(id) on delete cascade,
  qty int not null default 0,
  primary key (user_id, family_id),
  constraint family_candy_qty_ck check (qty >= 0)
);

create table if not exists public.candy_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  family_id int not null,
  amount int not null,
  type text not null,
  reason text,
  idempotency text,
  related_catch uuid,
  qty_before int not null,
  qty_after int not null,
  created_at timestamptz not null default now()
);
create unique index if not exists candy_ledger_idem_uidx
  on public.candy_ledger (user_id, idempotency)
  where idempotency is not null;

create table if not exists public.evolution_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  catch_id uuid not null,
  from_dex int not null,
  to_dex int not null,
  candy_spent int not null default 0,
  item_spent text,
  method text not null default 'CANDY',
  created_at timestamptz not null default now()
);

create table if not exists public.species_mastery (
  user_id uuid not null references public.profiles(id) on delete cascade,
  dex int not null,
  points int not null default 0,
  rank int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, dex)
);

create table if not exists public.mastery_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  dex int not null,
  amount int not null,
  reason text,
  idempotency text,
  created_at timestamptz not null default now()
);
create unique index if not exists mastery_ledger_idem_uidx
  on public.mastery_ledger (user_id, idempotency)
  where idempotency is not null;

create table if not exists public.direct_trades (
  id uuid primary key default gen_random_uuid(),
  a_user uuid not null references public.profiles(id),
  b_user uuid not null references public.profiles(id),
  a_catch uuid,
  b_catch uuid,
  a_confirmed boolean not null default false,
  b_confirmed boolean not null default false,
  status text not null default 'PENDING',
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.inventories
  add column if not exists items jsonb not null default '{}'::jsonb;

alter table public.trainer_stats
  add column if not exists evolved int not null default 0,
  add column if not exists trades_done int not null default 0,
  add column if not exists traded_away int not null default 0,
  add column if not exists traded_in int not null default 0,
  add column if not exists released int not null default 0,
  add column if not exists candy_earned int not null default 0,
  add column if not exists candy_spent int not null default 0,
  add column if not exists species_mastered int not null default 0;

insert into public.evolution_families (id, name, base_dex) values
  (1,'Bulbasaur',1),(4,'Charmander',4),(7,'Squirtle',7),(10,'Caterpie',10),(13,'Weedle',13),
  (16,'Pidgey',16),(19,'Rattata',19),(21,'Spearow',21),(23,'Ekans',23),(25,'Pikachu',25),
  (27,'Sandshrew',27),(29,'Nidoran♀',29),(32,'Nidoran♂',32),(35,'Clefairy',35),(37,'Vulpix',37),
  (39,'Jigglypuff',39),(41,'Zubat',41),(43,'Oddish',43),(46,'Paras',46),(48,'Venonat',48),
  (50,'Diglett',50),(52,'Meowth',52),(54,'Psyduck',54),(56,'Mankey',56),(58,'Growlithe',58),
  (60,'Poliwag',60),(63,'Abra',63),(66,'Machop',66),(69,'Bellsprout',69),(72,'Tentacool',72),
  (74,'Geodude',74),(77,'Ponyta',77),(79,'Slowpoke',79),(81,'Magnemite',81),(84,'Doduo',84),
  (86,'Seel',86),(88,'Grimer',88),(90,'Shellder',90),(92,'Gastly',92),(96,'Drowzee',96),
  (98,'Krabby',98),(100,'Voltorb',100),(102,'Exeggcute',102),(104,'Cubone',104),(109,'Koffing',109),
  (111,'Rhyhorn',111),(116,'Horsea',116),(118,'Goldeen',118),(120,'Staryu',120),(129,'Magikarp',129),
  (133,'Eevee',133),(138,'Omanyte',138),(140,'Kabuto',140),(147,'Dratini',147)
on conflict (id) do update set name = excluded.name, base_dex = excluded.base_dex;

-- Standalone families so every species has a Candy bucket.
insert into public.evolution_families (id, name, base_dex)
select s.dex, s.name, s.dex
  from public.species s
 where s.dex between 1 and 151
   and not exists (select 1 from public.evolution_families f where f.id = s.dex)
on conflict (id) do nothing;

update public.species s
   set family_id = coalesce((
     select f.id from public.evolution_families f
      where s.dex in (
        f.base_dex, f.base_dex + 1, f.base_dex + 2,
        case f.base_dex when 133 then 134 else -1 end,
        case f.base_dex when 133 then 135 else -1 end,
        case f.base_dex when 133 then 136 else -1 end
      )
      order by f.base_dex
      limit 1
   ), s.dex);

-- Precise family membership for branched / skip cases.
update public.species set family_id = 25 where dex in (25,26);
update public.species set family_id = 29 where dex in (29,30,31);
update public.species set family_id = 32 where dex in (32,33,34);
update public.species set family_id = 35 where dex in (35,36);
update public.species set family_id = 37 where dex in (37,38);
update public.species set family_id = 39 where dex in (39,40);
update public.species set family_id = 60 where dex in (60,61,62);
update public.species set family_id = 63 where dex in (63,64,65);
update public.species set family_id = 66 where dex in (66,67,68);
update public.species set family_id = 92 where dex in (92,93,94);
update public.species set family_id = 129 where dex in (129,130);
update public.species set family_id = 133 where dex in (133,134,135,136);
update public.species set family_id = 147 where dex in (147,148,149);

update public.species set evo_stage = 1
 where dex in (1,4,7,10,13,16,19,21,23,25,27,29,32,35,37,39,41,43,46,48,50,52,54,56,58,60,63,66,69,72,74,77,79,81,84,86,88,90,92,96,98,100,102,104,109,111,116,118,120,129,133,138,140,147);
update public.species set evo_stage = 2
 where dex in (2,5,8,11,14,17,30,33,44,61,64,67,70,75,93,117,148);
update public.species set evo_stage = 3
 where dex in (3,6,9,12,15,18,20,22,24,26,28,31,34,36,38,40,42,45,47,49,51,53,55,57,59,62,65,68,71,73,76,78,80,82,85,87,89,91,94,97,99,101,103,105,110,112,119,121,130,134,135,136,139,141,149);
update public.species set evo_stage = 0 where evo_stage is null or (family_id = dex and dex not in (1,4,7,10,13,16,19,21,23,25,27,29,32,35,37,39,41,43,46,48,50,52,54,56,58,60,63,66,69,72,74,77,79,81,84,86,88,90,92,96,98,100,102,104,109,111,116,118,120,129,133,138,140,147));

alter table public.family_candy enable row level security;
alter table public.species_mastery enable row level security;
alter table public.direct_trades enable row level security;
drop policy if exists family_candy_own on public.family_candy;
create policy family_candy_own on public.family_candy for select using (auth.uid() = user_id);
drop policy if exists species_mastery_own on public.species_mastery;
create policy species_mastery_own on public.species_mastery for select using (auth.uid() = user_id);
drop policy if exists direct_trades_own on public.direct_trades;
create policy direct_trades_own on public.direct_trades
  for select using (auth.uid() = a_user or auth.uid() = b_user);
grant select on public.family_candy, public.species_mastery, public.direct_trades,
  public.evolution_families, public.evolution_rules to authenticated;
