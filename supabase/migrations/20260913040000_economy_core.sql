-- Economy core: one PokéCoin ledger, one config block, and the helpers
-- every reward / purchase / admin adjustment must go through.

alter table public.capture_balls
  add column if not exists economic_tier text not null default 'standard',
  add column if not exists store_enabled boolean not null default true;

alter table public.capture_berries
  add column if not exists economic_tier text not null default 'basic';

alter table public.inventories
  add column if not exists starter_granted boolean not null default false,
  add column if not exists daily_supply_at timestamptz;

update public.inventories
   set starter_granted = true
 where starter_granted = false;

create table if not exists public.coin_ledger (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount int not null,
  type text not null,
  reason text,
  related_item text,
  related_sku text,
  related_round uuid,
  order_id uuid,
  idempotency text,
  balance_before int not null,
  balance_after int not null,
  detail jsonb not null default '{}'::jsonb,
  economy_version int not null default 1
);

create unique index if not exists coin_ledger_idem_idx
  on public.coin_ledger (user_id, idempotency)
  where idempotency is not null;

create index if not exists coin_ledger_user_idx
  on public.coin_ledger (user_id, created_at desc);

create index if not exists coin_ledger_type_idx
  on public.coin_ledger (type, created_at desc);

alter table public.coin_ledger enable row level security;
drop policy if exists coin_ledger_own on public.coin_ledger;
create policy coin_ledger_own on public.coin_ledger
  for select using (auth.uid() = user_id);
grant select on public.coin_ledger to authenticated;

create table if not exists private.store_orders (
  order_id uuid primary key,
  user_id uuid not null,
  items jsonb not null,
  total_cost int not null,
  premier_bonus int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.trainer_milestones (
  user_id uuid not null references public.profiles(id) on delete cascade,
  key text not null,
  granted_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.trainer_milestones enable row level security;
drop policy if exists trainer_milestones_own on public.trainer_milestones;
create policy trainer_milestones_own on public.trainer_milestones
  for select using (auth.uid() = user_id);
grant select on public.trainer_milestones to authenticated;

create or replace function private.economy_config()
returns jsonb
language sql
stable
as $function$
  select coalesce(private.game_settings()->'economyBalance', '{}'::jsonb)
    || jsonb_build_object(
      'economyBalanceVersion', coalesce((private.game_settings()->'economyBalance'->>'economyBalanceVersion')::int, 1),
      'baseBallPrice', coalesce((private.game_settings()->'economyBalance'->>'baseBallPrice')::int, 100),
      'sellRate', coalesce((private.game_settings()->'economyBalance'->>'sellRate')::numeric, 0.4),
      'participationReward', coalesce((private.game_settings()->'economyBalance'->>'participationReward')::int, 25),
      'captureReward', coalesce((private.game_settings()->'economyBalance'->>'captureReward')::int, 25),
      'newDexReward', coalesce((private.game_settings()->'economyBalance'->>'newDexReward')::int, 100),
      'firstFemaleReward', coalesce((private.game_settings()->'economyBalance'->>'firstFemaleReward')::int, 25),
      'shinyReward', coalesce((private.game_settings()->'economyBalance'->>'shinyReward')::int, 250),
      'legendaryReward', coalesce((private.game_settings()->'economyBalance'->>'legendaryReward')::int, 350),
      'streamAttendanceReward', coalesce((private.game_settings()->'economyBalance'->>'streamAttendanceReward')::int, 50),
      'rewardBonusCoins', coalesce((private.game_settings()->'economyBalance'->>'rewardBonusCoins')::int,
        coalesce((private.capture_config()->>'rewardBonusCoins')::int, 10)),
      'rarityCaptureBonus', coalesce(private.game_settings()->'economyBalance'->'rarityCaptureBonus',
        '[{"maxCatchRate":9,"multiplier":1.50},{"maxCatchRate":25,"multiplier":1.35},{"maxCatchRate":75,"multiplier":1.20},{"maxCatchRate":150,"multiplier":1.10},{"maxCatchRate":255,"multiplier":1.00}]'::jsonb),
      'premierEvery', coalesce((private.game_settings()->'economyBalance'->>'premierEvery')::int, 10),
      'premierKeys', coalesce(private.game_settings()->'economyBalance'->'premierKeys',
        '["pokeball","greatball","ultraball","hisuipokeball","hisuigreatball","hisuiultraball"]'::jsonb),
      'dailySupply', coalesce(private.game_settings()->'economyBalance'->'dailySupply',
        '{"pokeball":3,"berry":1,"coins":50,"cooldownHours":20}'::jsonb),
      'starterKit', coalesce(private.game_settings()->'economyBalance'->'starterKit',
        '{"pokeball":10,"berry":3,"greatball":1,"coins":250}'::jsonb),
      'dexMilestones', coalesce(private.game_settings()->'economyBalance'->'dexMilestones',
        '[
          {"species":10,"grants":{"greatball":5},"label":"10 species"},
          {"species":25,"grants":{"coins":500},"label":"25 species"},
          {"species":50,"grants":{"ultraball":3},"label":"50 species"},
          {"species":75,"grants":{"goldenrazz":1},"label":"75 species"},
          {"species":100,"grants":{"goldenrazz":3},"label":"100 species"},
          {"species":125,"grants":{"coins":1000},"label":"125 species"},
          {"species":150,"grants":{"goldenrazz":3,"premierball":5},"label":"150 species"},
          {"species":151,"grants":{"coins":2500,"cherishball":1},"label":"Kanto Pokédex Master"}
        ]'::jsonb)
    );
$function$;

create or replace function private.adjust_coins(
  p_uid uuid,
  p_amount int,
  p_type text,
  p_reason text default null,
  p_meta jsonb default '{}'::jsonb
)
returns int
language plpgsql
as $function$
declare
  before_bal int;
  after_bal int;
  idem text := nullif(p_meta->>'idempotency', '');
  prior int;
begin
  if p_uid is null then
    raise exception 'Missing trainer.';
  end if;
  if coalesce(p_amount, 0) = 0 then
    select coins into before_bal from public.inventories where user_id = p_uid for update;
    return coalesce(before_bal, 0);
  end if;

  if idem is not null then
    select balance_after into prior
      from public.coin_ledger
     where user_id = p_uid and idempotency = idem;
    if found then
      return prior;
    end if;
  end if;

  perform private.ensure_inventory(p_uid);
  select coins into before_bal
    from public.inventories
   where user_id = p_uid
   for update;

  after_bal := coalesce(before_bal, 0) + p_amount;
  if after_bal < 0 then
    raise exception 'Not enough PokéCoins.';
  end if;

  update public.inventories
     set coins = after_bal, updated_at = now()
   where user_id = p_uid;

  insert into public.coin_ledger (
    user_id, amount, type, reason, related_item, related_sku, related_round,
    order_id, idempotency, balance_before, balance_after, detail, economy_version
  ) values (
    p_uid, p_amount, p_type, p_reason,
    nullif(p_meta->>'relatedItem', ''),
    nullif(p_meta->>'relatedSku', ''),
    nullif(p_meta->>'relatedRound', '')::uuid,
    nullif(p_meta->>'orderId', '')::uuid,
    idem,
    coalesce(before_bal, 0),
    after_bal,
    coalesce(p_meta, '{}'::jsonb),
    coalesce((private.economy_config()->>'economyBalanceVersion')::int, 1)
  );

  return after_bal;
exception
  when unique_violation then
    select balance_after into prior
      from public.coin_ledger
     where user_id = p_uid and idempotency = idem;
    return coalesce(prior, 0);
end;
$function$;

create or replace function private.throwable_total(p_uid uuid)
returns int
language sql
stable
as $function$
  select coalesce(i.pokeball, 0) + coalesce(i.greatball, 0) + coalesce(i.ultraball, 0)
    + coalesce((
        select sum(greatest(coalesce(value::int, 0), 0))
        from jsonb_each_text(coalesce(i.balls, '{}'::jsonb))
      ), 0)
  from public.inventories i
  where i.user_id = p_uid;
$function$;

create or replace function private.rarity_capture_multiplier(p_catch_rate int)
returns numeric
language plpgsql
stable
as $function$
declare
  rec jsonb;
begin
  for rec in
    select value
    from jsonb_array_elements(private.economy_config()->'rarityCaptureBonus')
    order by (value->>'maxCatchRate')::int
  loop
    if coalesce(p_catch_rate, 255) <= (rec->>'maxCatchRate')::int then
      return coalesce((rec->>'multiplier')::numeric, 1);
    end if;
  end loop;
  return 1;
end;
$function$;

create or replace function private.premier_bonus_count(p_grants jsonb)
returns int
language sql
stable
as $function$
  select (
    coalesce((
      select sum(greatest(coalesce((p_grants->>key)::int, 0), 0))
      from jsonb_array_elements_text(private.economy_config()->'premierKeys') as key
    ), 0)
    / greatest(coalesce((private.economy_config()->>'premierEvery')::int, 10), 1)
  )::int;
$function$;

create or replace function private.grant_starter_kit(p_uid uuid)
returns void
language plpgsql
as $function$
declare
  kit jsonb := private.economy_config()->'starterKit';
begin
  update public.inventories
     set starter_granted = true
   where user_id = p_uid and starter_granted = false;
  if not found then
    return;
  end if;
  perform private.grant_known(p_uid, jsonb_build_object(
    'pokeball', coalesce((kit->>'pokeball')::int, 10),
    'berry', coalesce((kit->>'berry')::int, 3),
    'greatball', coalesce((kit->>'greatball')::int, 1)
  ));
  perform private.adjust_coins(
    p_uid,
    coalesce((kit->>'coins')::int, 250),
    'STARTER_KIT',
    'Welcome kit',
    jsonb_build_object('idempotency', 'starter:' || p_uid::text)
  );
end;
$function$;

create or replace function private.ensure_inventory(p_uid uuid)
returns inventories
language plpgsql
as $function$
declare
  inv public.inventories;
  inserted boolean := false;
begin
  insert into public.inventories (user_id)
  values (p_uid)
  on conflict (user_id) do nothing;
  get diagnostics inserted = row_count;
  if inserted then
    perform private.grant_starter_kit(p_uid);
  end if;
  perform private.flush_bits_pending(p_uid);
  select * into inv from public.inventories where user_id = p_uid;
  return inv;
end;
$function$;

-- Seed the versioned economy block without wiping captureBalance.
update public.site_config
   set game_settings = coalesce(game_settings, '{}'::jsonb)
     || jsonb_build_object('economyBalance', private.economy_config()),
       updated_at = now()
 where id = 1;
