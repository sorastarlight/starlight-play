-- AUTHORIZED Kanto v1.0 staff/QA gameplay reset.
-- Exact UUID targets only. Transactional. Rollbacks on assertion failure.
-- Does NOT mutate National catalog, forms, containment, auth, Twitch, roles, Bits tables, or encounter rounds.

begin;

create temporary table _reset_targets (
  id uuid primary key,
  label text not null
) on commit drop;

insert into _reset_targets (id, label) values
  ('60ff5211-6ef8-40e6-8daa-095b5600bf4c', 'Sora'),
  ('da777b13-6879-44a8-99f4-a154e54d3d75', 'Moderator'),
  ('c1111111-1111-4111-8111-111111111111', 'QA'),
  ('a98cbf81-a6b2-4dbf-8448-8d62f6d5f523', 'PlayTester');

-- Hard stop if any target profile missing.
do $$
declare missing int;
begin
  select count(*)::int into missing
  from _reset_targets t
  where not exists (select 1 from public.profiles p where p.id = t.id);
  if missing > 0 then
    raise exception 'RESET ABORT: missing target profile(s)';
  end if;
end $$;

-- Fresh safety: active direct trades involving targets must be 0.
do $$
declare n int;
begin
  select count(*)::int into n
  from public.direct_trades d
  where d.status in ('PENDING','NEGOTIATING','PROCESSING')
    and (d.a_user in (select id from _reset_targets) or d.b_user in (select id from _reset_targets));
  if n > 0 then
    raise exception 'RESET ABORT: active direct trades=%', n;
  end if;
end $$;

-- Protected global baselines (must remain unchanged).
create temporary table _reset_globals on commit drop as
select
  (select count(*)::int from public.species) as species_n,
  (select count(*)::int from public.species_forms) as forms_n,
  (select count(*)::int from public.evolution_rules where enabled) as evo_n,
  private.normal_spawn_max_dex() as spawn_max,
  (private.kanto_availability_json()->'counts'->>'normal')::int as kanto_normal,
  (private.kanto_availability_json()->'counts'->>'special')::int as kanto_special,
  (select count(*)::int from public.profiles) as profile_n,
  (select count(*)::int from public.staff_roles) as staff_n,
  (select count(*)::int from public.twitch_connections) as twitch_n,
  (select count(*)::int from private.bits_events) as bits_events,
  (select count(*)::int from private.bits_pending) as bits_pending,
  (select count(*)::int from public.encounter_rounds) as rounds_n;

-- Cancel target-owned open GTS listings (target-only; no non-target counterpart).
update public.trade_listings
   set status = 'cancelled'
 where status = 'open'
   and user_id in (select id from _reset_targets);

-- Clear profile catch references before catch delete.
update public.profiles
   set team_ids = '{}'::uuid[],
       favorite_dex = null,
       favorite_variant = 'normal',
       showcase = '{}'::jsonb,
       active_title_id = null,
       featured_badge_ids = '{}'::text[],
       trainer_title = '',
       card_frame = 'plain',
       updated_at = now()
 where id in (select id from _reset_targets);

-- Preserve Sora creator avatar packs; clear others.
update public.profiles
   set owned_avatar_packs = '{}'::text[]
 where id in (select id from _reset_targets)
   and id <> '60ff5211-6ef8-40e6-8daa-095b5600bf4c';

-- Equip default starter background if current bg would lose entitlement later.
-- Starter bgs are regranted below; keep current card_bg when it is a starter cosmetic.
update public.profiles p
   set card_bg = 'kanto'
 where p.id in (select id from _reset_targets)
   and not exists (
     select 1 from public.progression_cosmetics c
     where c.id = ('bg-' || p.card_bg) and c.kind = 'background' and c.enabled and c.starter
   )
   and not exists (
     select 1 from public.progression_cosmetics c
     where c.id = p.card_bg and c.kind = 'background' and c.enabled and c.starter
   );

-- Normalize card_bg to cosmetic id form used by ownership checks.
-- Existing values are bare keys like sakura/hoenn/lilac.
-- Leave as-is when they match starter cosmetic asset keys.

-- oak_transfers block catch delete (no cascade).
delete from public.oak_transfers
 where catch_id in (select id from public.catches where user_id in (select id from _reset_targets));

-- Null completed direct-trade catch pointers if any (no FK; preserve history rows).
update public.direct_trades
   set a_catch = null
 where a_catch in (select id from public.catches where user_id in (select id from _reset_targets));
update public.direct_trades
   set b_catch = null
 where b_catch in (select id from public.catches where user_id in (select id from _reset_targets));

-- Gameplay logs / ledgers for targets.
delete from public.capture_log where user_id in (select id from _reset_targets);
delete from public.evolution_log where user_id in (select id from _reset_targets);
delete from public.reward_events where user_id in (select id from _reset_targets);
delete from public.xp_ledger where user_id in (select id from _reset_targets);
delete from public.candy_ledger where user_id in (select id from _reset_targets);
delete from public.mastery_ledger where user_id in (select id from _reset_targets);
delete from public.item_ledger where user_id in (select id from _reset_targets);
delete from public.coin_ledger where user_id in (select id from _reset_targets);
delete from public.trainer_notices where user_id in (select id from _reset_targets);
delete from public.reward_choices where user_id in (select id from _reset_targets);

-- Catches (cascades open/cancelled GTS listings + offers).
delete from public.catches where user_id in (select id from _reset_targets);

-- Dex / mastery / candy.
delete from public.species_seen where user_id in (select id from _reset_targets);
delete from public.species_mastery where user_id in (select id from _reset_targets);
delete from public.family_candy where user_id in (select id from _reset_targets);

-- Achievements / titles / badges / cosmetics (gameplay).
delete from public.trainer_achievements where user_id in (select id from _reset_targets);
delete from public.trainer_titles where user_id in (select id from _reset_targets);
delete from public.trainer_badges where user_id in (select id from _reset_targets);
delete from public.trainer_cosmetics where user_id in (select id from _reset_targets);

-- Regrant starter cosmetics for all targets.
insert into public.trainer_cosmetics (user_id, cosmetic_id, source, unlocked_at)
select t.id, c.id, 'starter', now()
from _reset_targets t
cross join public.progression_cosmetics c
where c.enabled and c.starter
on conflict do nothing;

-- Preserve Sora personal/creator bg-starlight entitlement explicitly.
insert into public.trainer_cosmetics (user_id, cosmetic_id, source, unlocked_at)
values ('60ff5211-6ef8-40e6-8daa-095b5600bf4c', 'bg-starlight', 'preserved', now())
on conflict do nothing;

-- Ensure equipped card_bg remains owned (starter set includes sakura/lilac/hoenn/kanto).
update public.profiles p
   set card_bg = case
     when exists (
       select 1 from public.trainer_cosmetics tc
       where tc.user_id = p.id and tc.cosmetic_id = ('bg-' || coalesce(p.card_bg, ''))
     ) then p.card_bg
     when exists (
       select 1 from public.trainer_cosmetics tc
       where tc.user_id = p.id and tc.cosmetic_id = coalesce(p.card_bg, '')
     ) then replace(p.card_bg, 'bg-', '')
     else 'kanto'
   end
 where p.id in (select id from _reset_targets);

-- Trainer stats zeroed / upserted.
insert into public.trainer_stats as s (user_id)
select id from _reset_targets
on conflict (user_id) do nothing;

update public.trainer_stats
   set encounters = 0,
       captures = 0,
       fails = 0,
       honey = 0,
       optimal_catches = 0,
       catch_streak = 0,
       fail_streak = 0,
       best_catch_streak = 0,
       best_fail_streak = 0,
       first_pokemon_dex = null,
       first_shiny_dex = null,
       evolved = 0,
       trades_done = 0,
       traded_away = 0,
       traded_in = 0,
       released = 0,
       candy_earned = 0,
       candy_spent = 0,
       species_mastered = 0,
       updated_at = now()
 where user_id in (select id from _reset_targets);

-- XP = 0 (level derived).
update public.profiles
   set xp = 0, updated_at = now()
 where id in (select id from _reset_targets);

-- Exact starter economy (do not call grant_starter_kit — set deterministically).
insert into public.inventories (user_id)
select id from _reset_targets
on conflict (user_id) do nothing;

update public.inventories
   set coins = 250,
       pokeball = 10,
       greatball = 1,
       ultraball = 0,
       berry = 3,
       bait = 0,
       lure = 0,
       bag_bonus = 0,
       lure_armed = false,
       lure_until = null,
       starter_granted = true,
       daily_supply_at = null,
       pass_daily_at = null,
       pass_weekly_at = null,
       balls = '{}'::jsonb,
       berries = '{}'::jsonb,
       items = '{}'::jsonb,
       updated_at = now()
 where user_id in (select id from _reset_targets);

-- Proven Phase 2 selftest residue only (Play Tester ledger rows).
delete from public.candy_ledger
 where idempotency like 'phase2test:%'
   and user_id in (select id from _reset_targets);
delete from public.item_ledger
 where idempotency like 'phase2test:%'
   and user_id in (select id from _reset_targets);
delete from public.coin_ledger
 where idempotency like 'phase2test:%'
   and user_id in (select id from _reset_targets);
delete from public.xp_ledger
 where idempotency like 'phase2test:%'
   and user_id in (select id from _reset_targets);
delete from public.mastery_ledger
 where idempotency like 'phase2test:%'
   and user_id in (select id from _reset_targets);
delete from public.reward_events
 where idempotency like 'phase2test:%'
   and user_id in (select id from _reset_targets);

-- =========================
-- IN-TRANSACTION ASSERTIONS
-- =========================
do $$
declare
  r record;
  n int;
  lvl int;
  g record;
begin
  for r in select id, label from _reset_targets loop
    select count(*)::int into n from public.catches where user_id = r.id and transferred_at is null;
    if n <> 0 then raise exception '% catches=%', r.label, n; end if;

    select count(distinct dex)::int into n from public.catches where user_id = r.id;
    if n <> 0 then raise exception '% dex residue=%', r.label, n; end if;

    select xp into n from public.profiles where id = r.id;
    if n <> 0 then raise exception '% xp=%', r.label, n; end if;
    select private.trainer_level(0) into lvl;
    if lvl <> 1 then raise exception 'trainer_level(0)=%', lvl; end if;

    select count(*)::int into n from public.family_candy where user_id = r.id and qty <> 0;
    if n <> 0 then raise exception '% candy rows=%', r.label, n; end if;
    select count(*)::int into n from public.species_mastery where user_id = r.id;
    if n <> 0 then raise exception '% mastery=%', r.label, n; end if;

    select count(*)::int into n from public.direct_trades
     where status in ('PENDING','NEGOTIATING','PROCESSING')
       and (a_user = r.id or b_user = r.id);
    if n <> 0 then raise exception '% active trades=%', r.label, n; end if;

    select count(*)::int into n from public.trade_listings where user_id = r.id and status = 'open';
    if n <> 0 then raise exception '% open GTS=%', r.label, n; end if;

    select count(*)::int into n from public.catches where user_id = r.id and reserved_trade_id is not null;
    if n <> 0 then raise exception '% reserved=%', r.label, n; end if;

    if not exists (
      select 1 from public.inventories i
      where i.user_id = r.id
        and i.coins = 250
        and i.pokeball = 10
        and i.greatball = 1
        and i.ultraball = 0
        and i.berry = 3
        and i.bait = 0
        and i.lure = 0
        and i.bag_bonus = 0
        and i.starter_granted = true
        and i.daily_supply_at is null
        and i.pass_daily_at is null
        and i.pass_weekly_at is null
        and coalesce(i.lure_armed, false) = false
        and coalesce(i.balls, '{}'::jsonb) = '{}'::jsonb
        and coalesce(i.berries, '{}'::jsonb) = '{}'::jsonb
        and coalesce(i.items, '{}'::jsonb) = '{}'::jsonb
        and coalesce((i.balls->>'masterball')::int, 0) = 0
    ) then
      raise exception '% inventory not exact starter', r.label;
    end if;

    if exists (
      select 1 from public.profiles p
      where p.id = r.id
        and (p.favorite_dex is not null or coalesce(cardinality(p.team_ids),0) > 0
             or coalesce(p.showcase, '{}'::jsonb) <> '{}'::jsonb
             or p.active_title_id is not null
             or p.xp <> 0)
    ) then
      raise exception '% profile refs not cleared', r.label;
    end if;
  end loop;

  -- Sora creator packs + bg-starlight preserved.
  if not exists (
    select 1 from public.profiles
    where id = '60ff5211-6ef8-40e6-8daa-095b5600bf4c'
      and owned_avatar_packs @> array['sonic','digimon','sonic-classic','pokemasters-01']::text[]
  ) then
    raise exception 'Sora avatar packs not preserved';
  end if;
  if not exists (
    select 1 from public.trainer_cosmetics
    where user_id = '60ff5211-6ef8-40e6-8daa-095b5600bf4c' and cosmetic_id = 'bg-starlight'
  ) then
    raise exception 'Sora bg-starlight not preserved';
  end if;

  -- Twitch / roles untouched.
  if (select count(*) from public.twitch_connections where user_id = '60ff5211-6ef8-40e6-8daa-095b5600bf4c') <> 2 then
    raise exception 'Sora twitch connections changed';
  end if;
  if not exists (
    select 1 from public.twitch_connections
    where user_id = '60ff5211-6ef8-40e6-8daa-095b5600bf4c' and twitch_login = 'SoraStarlight' and is_primary
  ) then
    raise exception 'SoraStarlight primary missing';
  end if;
  if not exists (
    select 1 from public.twitch_connections
    where user_id = '60ff5211-6ef8-40e6-8daa-095b5600bf4c' and twitch_login = 'MotobugBOT'
  ) then
    raise exception 'MotobugBOT missing';
  end if;
  if not exists (
    select 1 from public.staff_roles
    where user_id = 'da777b13-6879-44a8-99f4-a154e54d3d75' and role = 'moderator'
  ) then
    raise exception 'moderator role missing';
  end if;

  select * into g from _reset_globals;
  if (select count(*) from public.species) <> g.species_n then raise exception 'species catalog mutated'; end if;
  if (select count(*) from public.species_forms) <> g.forms_n then raise exception 'forms catalog mutated'; end if;
  if (select count(*) from public.evolution_rules where enabled) <> g.evo_n then raise exception 'evo rules mutated'; end if;
  if private.normal_spawn_max_dex() <> g.spawn_max then raise exception 'spawn max mutated'; end if;
  if (private.kanto_availability_json()->'counts'->>'normal')::int <> 146 then raise exception 'kanto normal != 146'; end if;
  if (private.kanto_availability_json()->'counts'->>'special')::int <> 5 then raise exception 'kanto special != 5'; end if;
  if exists (select 1 from public.species s where s.dex > 151 and private.spawn_species_eligible(s.dex,false)) then
    raise exception 'post-kanto ordinary eligible leaked';
  end if;
  if exists (select 1 from public.species_forms where enabled_in_play and form_key <> 'base') then
    raise exception 'non-base form enabled';
  end if;
  if (select count(*) from public.profiles) <> g.profile_n then raise exception 'profile count changed'; end if;
  if (select count(*) from public.staff_roles) <> g.staff_n then raise exception 'staff_roles mutated'; end if;
  if (select count(*) from public.twitch_connections) <> g.twitch_n then raise exception 'twitch_connections mutated'; end if;
  if (select count(*) from private.bits_events) <> g.bits_events then raise exception 'bits_events mutated'; end if;
  if (select count(*) from private.bits_pending) <> g.bits_pending then raise exception 'bits_pending mutated'; end if;
  if (select count(*) from public.encounter_rounds) <> g.rounds_n then raise exception 'encounter_rounds mutated'; end if;

  -- No non-targets exist; assert still zero.
  if exists (
    select 1 from public.profiles p
    where p.id not in (select id from _reset_targets)
  ) then
    raise exception 'non-target profiles appeared during reset';
  end if;
end $$;

commit;

-- Post-commit verification payload.
select jsonb_build_object(
  'ok', true,
  'targets', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', t.id,
      'label', t.label,
      'username', p.username,
      'display_name', p.display_name,
      'xp', p.xp,
      'level', private.trainer_level(p.xp),
      'catches', (select count(*) from public.catches c where c.user_id = t.id and c.transferred_at is null),
      'dex', (select count(distinct dex) from public.catches c where c.user_id = t.id),
      'shiny', (select count(*) from public.catches c where c.user_id = t.id and c.variant ilike '%shiny%'),
      'coins', i.coins,
      'pokeball', i.pokeball,
      'greatball', i.greatball,
      'berry', i.berry,
      'bag_bonus', i.bag_bonus,
      'masterball', coalesce((i.balls->>'masterball')::int, 0),
      'starter_granted', i.starter_granted,
      'daily_supply_at', i.daily_supply_at,
      'pass_daily_at', i.pass_daily_at,
      'pass_weekly_at', i.pass_weekly_at,
      'candy', coalesce((select sum(qty) from public.family_candy fc where fc.user_id = t.id), 0),
      'mastery', (select count(*) from public.species_mastery sm where sm.user_id = t.id),
      'achievements', (select count(*) from public.trainer_achievements ta where ta.user_id = t.id and ta.unlocked_at is not null),
      'titles', (select count(*) from public.trainer_titles tt where tt.user_id = t.id),
      'badges', (select count(*) from public.trainer_badges tb where tb.user_id = t.id),
      'cosmetics', (select count(*) from public.trainer_cosmetics tc where tc.user_id = t.id),
      'favorite_dex', p.favorite_dex,
      'team_ids', p.team_ids,
      'showcase', p.showcase,
      'card_bg', p.card_bg,
      'card_frame', p.card_frame,
      'owned_avatar_packs', p.owned_avatar_packs,
      'active_title_id', p.active_title_id,
      'twitch_login', p.twitch_login,
      'has_bg_starlight', exists (select 1 from public.trainer_cosmetics tc where tc.user_id = t.id and tc.cosmetic_id = 'bg-starlight'),
      'open_gts', (select count(*) from public.trade_listings tl where tl.user_id = t.id and tl.status = 'open')
    ) order by t.label), '[]'::jsonb)
    from (values
      ('60ff5211-6ef8-40e6-8daa-095b5600bf4c'::uuid, 'Sora'),
      ('da777b13-6879-44a8-99f4-a154e54d3d75'::uuid, 'Moderator'),
      ('c1111111-1111-4111-8111-111111111111'::uuid, 'QA'),
      ('a98cbf81-a6b2-4dbf-8448-8d62f6d5f523'::uuid, 'PlayTester')
    ) as t(id, label)
    join public.profiles p on p.id = t.id
    join public.inventories i on i.user_id = t.id
  ),
  'globals', jsonb_build_object(
    'species', (select count(*) from public.species),
    'forms', (select count(*) from public.species_forms),
    'evo', (select count(*) from public.evolution_rules where enabled),
    'spawn_max', private.normal_spawn_max_dex(),
    'counts', private.kanto_availability_json()->'counts',
    'post_eligible', (select count(*) from public.species s where s.dex > 151 and private.spawn_species_eligible(s.dex,false)),
    'nonbase_enabled', (select count(*) from public.species_forms where enabled_in_play and form_key <> 'base'),
    'profiles', (select count(*) from public.profiles),
    'nontargets', (select count(*) from public.profiles where id not in (
      '60ff5211-6ef8-40e6-8daa-095b5600bf4c','da777b13-6879-44a8-99f4-a154e54d3d75',
      'c1111111-1111-4111-8111-111111111111','a98cbf81-a6b2-4dbf-8448-8d62f6d5f523'
    )),
    'bits_events', (select count(*) from private.bits_events),
    'bits_pending', (select count(*) from private.bits_pending),
    'rounds', (select count(*) from public.encounter_rounds),
    'phase2_candy', (select count(*) from public.candy_ledger where idempotency like 'phase2test:%'),
    'phase2_item', (select count(*) from public.item_ledger where idempotency like 'phase2test:%')
  )
) as result;
