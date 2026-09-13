-- Long-term trainer progression: configurable XP curve, ledgered XP,
-- titles, badges, achievements, and trainer stats. Existing XP totals
-- are remapped so current levels stay the same.

alter table public.species
  add column if not exists generation int not null default 1;

alter table public.profiles
  add column if not exists active_title_id text,
  add column if not exists featured_badge_ids text[] not null default '{}';

create table if not exists public.xp_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount int not null,
  type text not null,
  reason text,
  idempotency text,
  related_round uuid,
  xp_before int not null,
  xp_after int not null,
  created_at timestamptz not null default now()
);
create unique index if not exists xp_ledger_idem_uidx
  on public.xp_ledger (user_id, idempotency)
  where idempotency is not null;
create index if not exists xp_ledger_user_idx on public.xp_ledger (user_id, created_at desc);

create table if not exists public.progression_titles (
  id text primary key,
  name text not null,
  description text not null default '',
  rarity text not null default 'common',
  sort_order int not null default 0,
  enabled boolean not null default true
);

create table if not exists public.trainer_titles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  title_id text not null references public.progression_titles(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, title_id)
);

create table if not exists public.progression_badges (
  id text primary key,
  name text not null,
  description text not null default '',
  rarity text not null default 'common',
  sort_order int not null default 0,
  enabled boolean not null default true
);

create table if not exists public.trainer_badges (
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_id text not null references public.progression_badges(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

create table if not exists public.progression_achievements (
  id text primary key,
  name text not null,
  description text not null default '',
  category text not null default 'trainer',
  requirement_type text not null,
  target_value int not null default 1,
  extra jsonb not null default '{}'::jsonb,
  rewards jsonb not null default '{}'::jsonb,
  hidden boolean not null default false,
  enabled boolean not null default true,
  event_id text,
  sort_order int not null default 0
);

create table if not exists public.trainer_achievements (
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id text not null references public.progression_achievements(id) on delete cascade,
  progress int not null default 0,
  unlocked_at timestamptz,
  reward_granted_at timestamptz,
  primary key (user_id, achievement_id)
);

create table if not exists public.trainer_stats (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  encounters int not null default 0,
  captures int not null default 0,
  fails int not null default 0,
  honey int not null default 0,
  optimal_catches int not null default 0,
  catch_streak int not null default 0,
  fail_streak int not null default 0,
  best_catch_streak int not null default 0,
  best_fail_streak int not null default 0,
  first_pokemon_dex int,
  first_shiny_dex int,
  updated_at timestamptz not null default now()
);

create table if not exists public.trainer_notices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null default '',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  seen_at timestamptz
);
create index if not exists trainer_notices_unseen_idx
  on public.trainer_notices (user_id, created_at desc)
  where seen_at is null;

alter table public.xp_ledger enable row level security;
alter table public.trainer_titles enable row level security;
alter table public.trainer_badges enable row level security;
alter table public.trainer_achievements enable row level security;
alter table public.trainer_stats enable row level security;
alter table public.trainer_notices enable row level security;
alter table public.progression_titles enable row level security;
alter table public.progression_badges enable row level security;
alter table public.progression_achievements enable row level security;

drop policy if exists xp_ledger_own on public.xp_ledger;
create policy xp_ledger_own on public.xp_ledger
  for select using (auth.uid() = user_id);
drop policy if exists trainer_titles_own on public.trainer_titles;
create policy trainer_titles_own on public.trainer_titles
  for select using (auth.uid() = user_id);
drop policy if exists trainer_badges_own on public.trainer_badges;
create policy trainer_badges_own on public.trainer_badges
  for select using (auth.uid() = user_id);
drop policy if exists trainer_achievements_own on public.trainer_achievements;
create policy trainer_achievements_own on public.trainer_achievements
  for select using (auth.uid() = user_id);
drop policy if exists trainer_stats_own on public.trainer_stats;
create policy trainer_stats_own on public.trainer_stats
  for select using (auth.uid() = user_id);
drop policy if exists trainer_notices_own on public.trainer_notices;
create policy trainer_notices_own on public.trainer_notices
  for select using (auth.uid() = user_id);
drop policy if exists titles_read on public.progression_titles;
create policy titles_read on public.progression_titles for select using (true);
drop policy if exists badges_read on public.progression_badges;
create policy badges_read on public.progression_badges for select using (true);
drop policy if exists achievements_read on public.progression_achievements;
create policy achievements_read on public.progression_achievements
  for select using (enabled and not hidden);

grant select on public.xp_ledger, public.trainer_titles, public.trainer_badges,
  public.trainer_achievements, public.trainer_stats, public.trainer_notices,
  public.progression_titles, public.progression_badges, public.progression_achievements
  to authenticated;

create or replace function private.progression_config()
returns jsonb
language sql
stable
as $function$
  select coalesce(private.game_settings()->'progressionBalance', '{}'::jsonb)
    || jsonb_build_object(
      'progressionBalanceVersion', coalesce((private.game_settings()->'progressionBalance'->>'progressionBalanceVersion')::int, 1),
      'xpBase', coalesce((private.game_settings()->'progressionBalance'->>'xpBase')::int, 100),
      'xpExponent', coalesce((private.game_settings()->'progressionBalance'->>'xpExponent')::numeric, 1.35),
      'maxLevel', coalesce((private.game_settings()->'progressionBalance'->>'maxLevel')::int, 100),
      'joinXp', coalesce((private.game_settings()->'progressionBalance'->>'joinXp')::int, 5),
      'catchXp', coalesce((private.game_settings()->'progressionBalance'->>'catchXp')::int, 10),
      'newDexXp', coalesce((private.game_settings()->'progressionBalance'->>'newDexXp')::int, 25),
      'firstFemaleXp', coalesce((private.game_settings()->'progressionBalance'->>'firstFemaleXp')::int, 5),
      'shinyXp', coalesce((private.game_settings()->'progressionBalance'->>'shinyXp')::int, 50),
      'rareXp', coalesce((private.game_settings()->'progressionBalance'->>'rareXp')::int, 5),
      'veryRareXp', coalesce((private.game_settings()->'progressionBalance'->>'veryRareXp')::int, 10),
      'ultraRareXp', coalesce((private.game_settings()->'progressionBalance'->>'ultraRareXp')::int, 15),
      'legendaryXp', coalesce((private.game_settings()->'progressionBalance'->>'legendaryXp')::int, 25),
      'levelCatchBonus', false,
      'femaleVisualDex', coalesce(private.game_settings()->'progressionBalance'->'femaleVisualDex',
        '[3,12,19,20,25,26,41,42,44,45,64,65,84,85,97,111,112,118,119,123,129,130,133]'::jsonb),
      'levelRewards', coalesce(private.game_settings()->'progressionBalance'->'levelRewards',
        '[
          {"level":5,"label":"Level 5","grants":{"greatball":5},"title":"rising-trainer"},
          {"level":10,"label":"Level 10","title":"trainer"},
          {"level":15,"label":"Level 15","grants":{"coins":500}},
          {"level":20,"label":"Level 20","badge":"level-20"},
          {"level":25,"label":"Level 25","grants":{"ultraball":3}},
          {"level":30,"label":"Level 30","title":"seasoned-trainer"},
          {"level":40,"label":"Level 40","title":"elite-trainer"},
          {"level":50,"label":"Level 50","title":"starlight-veteran","badge":"level-50"}
        ]'::jsonb)
    );
$function$;

create or replace function private.xp_for_level(p_level int)
returns int
language sql
stable
as $function$
  select greatest(1, round(
    coalesce((private.progression_config()->>'xpBase')::numeric, 100)
    * power(greatest(p_level, 1)::numeric,
            coalesce((private.progression_config()->>'xpExponent')::numeric, 1.35))
  )::int);
$function$;

create or replace function private.xp_to_reach_level(p_level int)
returns int
language plpgsql
stable
as $function$
declare
  total int := 0;
  i int;
  cap int := greatest(1, least(coalesce((private.progression_config()->>'maxLevel')::int, 100), 200));
  target int := greatest(1, least(coalesce(p_level, 1), cap));
begin
  if target <= 1 then
    return 0;
  end if;
  for i in 1 .. target - 1 loop
    total := total + private.xp_for_level(i);
  end loop;
  return total;
end;
$function$;

create or replace function private.trainer_level(p_xp int)
returns int
language plpgsql
stable
as $function$
declare
  cap int := greatest(1, least(coalesce((private.progression_config()->>'maxLevel')::int, 100), 200));
  xp int := greatest(coalesce(p_xp, 0), 0);
  lvl int := 1;
begin
  while lvl < cap and xp >= private.xp_to_reach_level(lvl + 1) loop
    lvl := lvl + 1;
  end loop;
  return lvl;
end;
$function$;

create or replace function private.trainer_xp_progress(p_xp int)
returns jsonb
language plpgsql
stable
as $function$
declare
  xp int := greatest(coalesce(p_xp, 0), 0);
  lvl int := private.trainer_level(xp);
  reached int := private.xp_to_reach_level(lvl);
  need int := private.xp_for_level(lvl);
begin
  return jsonb_build_object(
    'level', lvl,
    'xp', xp,
    'xpInto', greatest(0, xp - reached),
    'xpNeed', greatest(1, need)
  );
end;
$function$;

create or replace function private.female_visual_dex()
returns int[]
language sql
stable
as $function$
  select coalesce(array_agg((value)::int), '{}'::int[])
  from jsonb_array_elements_text(private.progression_config()->'femaleVisualDex') as value;
$function$;

create or replace function private.ensure_trainer_stats(p_uid uuid)
returns public.trainer_stats
language plpgsql
as $function$
declare
  row public.trainer_stats;
begin
  insert into public.trainer_stats (user_id) values (p_uid)
  on conflict (user_id) do nothing;
  select * into row from public.trainer_stats where user_id = p_uid;
  return row;
end;
$function$;

create or replace function private.push_notice(
  p_uid uuid,
  p_kind text,
  p_title text,
  p_body text,
  p_payload jsonb default '{}'::jsonb
)
returns void
language plpgsql
as $function$
begin
  insert into public.trainer_notices (user_id, kind, title, body, payload)
  values (p_uid, p_kind, p_title, coalesce(p_body, ''), coalesce(p_payload, '{}'::jsonb));
end;
$function$;
