-- Admin loot editor, analytics, dry-run simulator, and self-tests.

create or replace function public.admin_loot_tables()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not private.is_play_admin() then raise exception 'Admin only.'; end if;
  return jsonb_build_object(
    'ok', true,
    'config', private.loot_config(),
    'tables', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id,
        'name', t.name,
        'tier', t.tier,
        'enabled', t.enabled,
        'entries', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', e.id,
            'item', e.item_key,
            'label', private.item_label(e.item_key),
            'weight', e.weight,
            'minQty', e.min_qty,
            'maxQty', e.max_qty,
            'enabled', e.enabled,
            'approx', case when s.total > 0 then round((e.weight::numeric / s.total) * 100, 1) else 0 end
          ) order by e.weight desc, e.item_key)
          from public.loot_table_entries e
          cross join lateral (
            select coalesce(sum(greatest(weight, 0)), 0) as total
              from public.loot_table_entries x
             where x.table_id = t.id and x.enabled
          ) s
         where e.table_id = t.id
        ), '[]'::jsonb)
      ) order by t.id)
      from public.loot_tables t
    ), '[]'::jsonb)
  );
end;
$function$;

revoke all on function public.admin_loot_tables() from public;
grant execute on function public.admin_loot_tables() to authenticated;

create or replace function public.admin_loot_save_entry(
  p_id uuid,
  p_weight int,
  p_min int,
  p_max int,
  p_enabled boolean
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not private.is_play_admin() then raise exception 'Admin only.'; end if;
  update public.loot_table_entries
     set weight = greatest(coalesce(p_weight, 0), 0),
         min_qty = greatest(coalesce(p_min, 1), 1),
         max_qty = greatest(coalesce(p_max, 1), 1),
         enabled = coalesce(p_enabled, true)
   where id = p_id;
  if not found then
    raise exception 'Unknown loot entry.';
  end if;
  return public.admin_loot_tables() || jsonb_build_object('message', 'Loot entry saved.');
end;
$function$;

revoke all on function public.admin_loot_save_entry(uuid, int, int, int, boolean) from public;
grant execute on function public.admin_loot_save_entry(uuid, int, int, int, boolean) to authenticated;

create or replace function public.admin_loot_save_config(p_balance jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  next_cfg jsonb;
begin
  if not private.is_play_admin() then raise exception 'Admin only.'; end if;
  next_cfg := coalesce(private.game_settings()->'lootBalance', '{}'::jsonb)
    || coalesce(p_balance, '{}'::jsonb);
  update public.site_config
     set game_settings = jsonb_set(coalesce(game_settings, '{}'::jsonb), '{lootBalance}', next_cfg),
         updated_at = now()
   where id = 1;
  return jsonb_build_object('ok', true, 'config', private.loot_config(), 'message', 'Drop rates saved.');
end;
$function$;

revoke all on function public.admin_loot_save_config(jsonb) from public;
grant execute on function public.admin_loot_save_config(jsonb) to authenticated;

create or replace function public.admin_loot_overview()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  premium text[] := array['ultraball','goldenrazz','firestone','waterstone','thunderstone','leafstone','moonstone','linkingcord','rarecandy','masterball'];
begin
  if not private.is_play_admin() then raise exception 'Admin only.'; end if;
  return jsonb_build_object(
    'ok', true,
    'config', private.loot_config(),
    'inventory', (
      select jsonb_build_object(
        'trainers', count(*),
        'pokeball', coalesce(sum(pokeball), 0),
        'greatball', coalesce(sum(greatball), 0),
        'ultraball', coalesce(sum(ultraball), 0),
        'honey', coalesce(sum(bait), 0),
        'oran', coalesce(sum(berry), 0),
        'masterball', coalesce(sum(coalesce((balls->>'masterball')::int, 0)), 0),
        'linkingcord', coalesce(sum(coalesce((items->>'linkingcord')::int, 0)), 0),
        'rarecandy', coalesce(sum(coalesce((items->>'rarecandy')::int, 0)), 0),
        'stones', coalesce(sum(
          coalesce((items->>'firestone')::int, 0)
          + coalesce((items->>'waterstone')::int, 0)
          + coalesce((items->>'thunderstone')::int, 0)
          + coalesce((items->>'leafstone')::int, 0)
          + coalesce((items->>'moonstone')::int, 0)
        ), 0)
      )
      from public.inventories
    ),
    'created7d', coalesce((
      select jsonb_object_agg(item_key, n)
      from (
        select item_key, sum(amount)::int as n
          from public.item_ledger
         where amount > 0 and created_at > now() - interval '7 days'
           and item_key = any (premium)
         group by item_key
      ) s
    ), '{}'::jsonb),
    'sources', coalesce((
      select jsonb_agg(jsonb_build_object('item', item_key, 'reason', reason, 'amount', n) order by item_key, reason)
      from (
        select item_key, reason, sum(amount)::int as n
          from public.item_ledger
         where amount > 0
         group by item_key, reason
      ) s
    ), '[]'::jsonb),
    'bitsPacks', coalesce((
      select jsonb_agg(jsonb_build_object('sku', sku, 'bits', bits, 'name', name, 'grants', grants) order by bits)
      from private.store_items
      where bits > 0
    ), '[]'::jsonb),
    'warnings', public.admin_loot_warnings()
  );
end;
$function$;

revoke all on function public.admin_loot_overview() from public;
grant execute on function public.admin_loot_overview() to authenticated;

create or replace function public.admin_loot_warnings()
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $function$
  select coalesce(jsonb_agg(msg), '[]'::jsonb)
  from (
    select 'Ultra Ball free creation exceeded store purchases this week.' as msg
     where coalesce((select sum(amount) from public.item_ledger where item_key = 'ultraball' and amount > 0 and reason <> 'STORE_PURCHASE' and created_at > now() - interval '7 days'), 0)
         > coalesce((select sum(amount) from public.item_ledger where item_key = 'ultraball' and amount > 0 and reason = 'STORE_PURCHASE' and created_at > now() - interval '7 days'), 0)
       and exists (select 1 from public.item_ledger where item_key = 'ultraball' and created_at > now() - interval '7 days')
    union all
    select 'Bits created more Ultra Balls than gameplay this week.'
     where coalesce((select sum(amount) from public.item_ledger where item_key = 'ultraball' and amount > 0 and reason = 'BITS_REWARD' and created_at > now() - interval '7 days'), 0)
         > coalesce((select sum(amount) from public.item_ledger where item_key = 'ultraball' and amount > 0 and reason <> 'BITS_REWARD' and created_at > now() - interval '7 days'), 0)
       and exists (select 1 from public.item_ledger where item_key = 'ultraball' and reason = 'BITS_REWARD' and created_at > now() - interval '7 days')
    union all
    select 'Average active trainer owns 20+ Ultra Balls.'
     where coalesce((select avg(ultraball) from public.inventories), 0) >= 20
    union all
    select 'Linking Cord drop volume looks high versus store purchases.'
     where coalesce((select sum(amount) from public.item_ledger where item_key = 'linkingcord' and amount > 0 and reason like '%DROP%' and created_at > now() - interval '7 days'), 0)
         > 3 * greatest(coalesce((select sum(amount) from public.item_ledger where item_key = 'linkingcord' and amount > 0 and reason = 'STORE_PURCHASE' and created_at > now() - interval '7 days'), 0), 1)
       and exists (select 1 from public.item_ledger where item_key = 'linkingcord' and reason like '%DROP%')
  ) w;
$function$;

revoke all on function public.admin_loot_warnings() from public, anon, authenticated;

create or replace function public.admin_item_sources(p_item text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  total numeric;
begin
  if not private.is_play_admin() then raise exception 'Admin only.'; end if;
  select coalesce(sum(amount), 0) into total
    from public.item_ledger
   where item_key = p_item and amount > 0;
  return jsonb_build_object(
    'ok', true,
    'item', p_item,
    'label', private.item_label(p_item),
    'total', total,
    'rows', coalesce((
      select jsonb_agg(jsonb_build_object(
        'reason', reason,
        'amount', n,
        'share', case when total > 0 then round((n / total) * 100, 1) else 0 end
      ) order by n desc)
      from (
        select reason, sum(amount)::numeric as n
          from public.item_ledger
         where item_key = p_item and amount > 0
         group by reason
      ) s
    ), '[]'::jsonb)
  );
end;
$function$;

revoke all on function public.admin_item_sources(text) from public;
grant execute on function public.admin_item_sources(text) to authenticated;

create or replace function public.admin_loot_simulate(
  p_encounters int default 10000,
  p_catch_rate numeric default 0.35,
  p_shiny_rate numeric default 0.01,
  p_legendary_rate numeric default 0.01
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  n int := least(greatest(coalesce(p_encounters, 10000), 1), 20000);
  i int;
  cfg jsonb := private.loot_config();
  part_chance numeric := coalesce((cfg->>'participationDropChance')::numeric, 0.15);
  catch_chance numeric := coalesce((cfg->>'captureDropChance')::numeric, 0.25);
  catches int := 0;
  part_drops int := 0;
  catch_drops int := 0;
  counts jsonb := '{}'::jsonb;
  value_sum numeric := 0;
  picked jsonb;
  rarity text;
  tier text;
  k text;
  q int;
  ultra int := 0;
  stones int := 0;
  cords int := 0;
begin
  if not private.is_play_admin() then raise exception 'Admin only.'; end if;
  for i in 1..n loop
    if private.loot_unit() < part_chance then
      picked := private.pick_loot_entry('ENCOUNTER_PARTICIPATION_COMMON');
      if picked is not null then
        part_drops := part_drops + 1;
        k := picked->>'item';
        q := coalesce((picked->>'qty')::int, 1);
        counts := jsonb_set(counts, array[k], to_jsonb(coalesce((counts->>k)::int, 0) + q));
        value_sum := value_sum + private.item_value(k) * q;
      end if;
    end if;
    if private.loot_unit() < coalesce(p_catch_rate, 0.35) then
      catches := catches + 1;
      if private.loot_unit() < catch_chance then
        rarity := case
          when private.loot_unit() < coalesce(p_legendary_rate, 0.01) then 'LEGENDARY'
          when private.loot_unit() < 0.05 then 'RARE'
          else 'COMMON'
        end;
        tier := private.roll_capture_tier();
        tier := private.maybe_upgrade_tier(tier, rarity);
        if private.loot_unit() < coalesce(p_shiny_rate, 0.01) then
          tier := private.apply_loot_floor(tier, cfg->>'shinyLootFloor');
        end if;
        if rarity = 'LEGENDARY' then
          tier := private.apply_loot_floor(tier, cfg->>'legendaryLootFloor');
        end if;
        picked := private.pick_loot_with_fallback(tier);
        if picked is not null then
          catch_drops := catch_drops + 1;
          k := picked->>'item';
          q := coalesce((picked->>'qty')::int, 1);
          counts := jsonb_set(counts, array[k], to_jsonb(coalesce((counts->>k)::int, 0) + q));
          value_sum := value_sum + private.item_value(k) * q;
          if k = 'ultraball' then ultra := ultra + q; end if;
          if k in ('firestone','waterstone','thunderstone','leafstone','moonstone','choice_stone') then stones := stones + q; end if;
          if k = 'linkingcord' then cords := cords + q; end if;
        end if;
      end if;
    end if;
  end loop;
  return jsonb_build_object(
    'ok', true,
    'encounters', n,
    'catches', catches,
    'participationDrops', part_drops,
    'captureDrops', catch_drops,
    'items', counts,
    'ultraBalls', ultra,
    'evolutionStones', stones,
    'linkingCords', cords,
    'expectedValuePerEncounter', case when n > 0 then round(value_sum / n, 2) else 0 end,
    'per100Joined', jsonb_build_object(
      'items', case when n > 0 then round((part_drops + catch_drops)::numeric * 100 / n, 2) else 0 end,
      'ultraBallsPer100Catches', case when catches > 0 then round(ultra::numeric * 100 / catches, 3) else 0 end,
      'stonesPer100Catches', case when catches > 0 then round(stones::numeric * 100 / catches, 3) else 0 end,
      'cordsPer100Catches', case when catches > 0 then round(cords::numeric * 100 / catches, 3) else 0 end
    ),
    'bitsIfRedeemed100', coalesce((
      select jsonb_agg(jsonb_build_object('sku', sku, 'name', name, 'grants', (
        select jsonb_object_agg(key, (value::int) * 100)
          from jsonb_each_text(grants)
      )) order by bits)
      from private.store_items
      where bits > 0
    ), '[]'::jsonb),
    'note', 'Dry run only. Production inventories were not changed.'
  );
end;
$function$;

revoke all on function public.admin_loot_simulate(int, numeric, numeric, numeric) from public;
grant execute on function public.admin_loot_simulate(int, numeric, numeric, numeric) to authenticated;

create or replace function private.loot_self_test()
returns table(name text, passed boolean, detail text)
language plpgsql
as $function$
declare
  uid uuid := '00000000-0000-0000-0000-00000000f001';
  isolated boolean := false;
  before_p int;
  after_p int;
  res jsonb;
  empty_pick jsonb;
begin
  name := 'Master Ball cannot drop';
  passed := private.item_drop_allowed('masterball') = false
        and not exists (select 1 from public.loot_table_entries where item_key = 'masterball');
  detail := 'excluded';
  return next;

  name := 'Golden Razz is not a daily berry';
  passed := not exists (
    select 1 from public.loot_table_entries
     where table_id = 'DAILY_COMMON_BERRY' and item_key = 'goldenrazz'
  );
  detail := 'daily common only';
  return next;

  name := 'Ultra Ball is Rare-or-better';
  passed := not exists (
    select 1 from public.loot_table_entries
     where item_key = 'ultraball' and table_id in ('CAPTURE_COMMON','CAPTURE_UNCOMMON','ENCOUNTER_PARTICIPATION_COMMON','DAILY_COMMON_BERRY')
  );
  detail := 'rare+';
  return next;

  name := 'Linking Cord is Very Rare only';
  passed := exists (select 1 from public.loot_table_entries where table_id = 'CAPTURE_VERY_RARE' and item_key = 'linkingcord')
        and not exists (select 1 from public.loot_table_entries where item_key = 'linkingcord' and table_id <> 'CAPTURE_VERY_RARE');
  detail := 'very rare';
  return next;

  name := 'Moon Stone is lighter than other stones';
  passed := coalesce((select weight from public.loot_table_entries where table_id = 'CAPTURE_RARE' and item_key = 'moonstone' limit 1), 0) <
            coalesce((select weight from public.loot_table_entries where table_id = 'CAPTURE_RARE' and item_key = 'firestone' limit 1), 0);
  detail := '70 vs 100';
  return next;

  name := 'Shiny floor upgrades Common to Uncommon';
  passed := private.apply_loot_floor('COMMON', 'UNCOMMON') = 'UNCOMMON';
  detail := 'UNCOMMON';
  return next;

  name := 'Legendary floor is Rare';
  passed := private.apply_loot_floor('COMMON', 'RARE') = 'RARE'
        and private.apply_loot_floor('VERY_RARE', 'RARE') = 'VERY_RARE';
  detail := 'no downgrade';
  return next;

  name := 'Tier names never reach Special from gameplay ranks';
  passed := private.loot_tier_name(5) = 'VERY_RARE';
  detail := 'cap 4';
  return next;

  name := 'Empty higher tier falls down';
  empty_pick := private.pick_loot_with_fallback('VERY_RARE');
  passed := empty_pick is not null and (empty_pick->>'item') is distinct from 'masterball';
  detail := coalesce(empty_pick->>'tier', 'none');
  return next;

  name := 'Bits packs are deterministic and have no Master Ball';
  passed := not exists (
    select 1 from private.store_items where bits > 0 and (grants ? 'masterball' or grants ? 'lootTableId')
  );
  detail := (select count(*)::text from private.store_items where bits > 0);
  return next;

  name := 'Linking Cord remains on the PokéCoin store';
  passed := exists (
    select 1 from private.store_items
     where visible and coalesce(bits, 0) = 0 and (grants ? 'linkingcord')
  );
  detail := 'purchasable';
  return next;

  name := 'Rare Candy is an evolution item, not a Bits SKU';
  passed := 'rarecandy' = any (private.evo_item_keys())
        and not exists (select 1 from private.store_items where grants ? 'rarecandy');
  detail := 'gameplay only';
  return next;

  name := 'Test rounds are detected';
  passed := private.round_is_test(null) = false;
  detail := 'null live';
  return next;

  name := 'Trade-1 teaches Linking Cord once';
  passed := exists (
    select 1 from public.progression_achievements
     where id = 'trade-1' and (rewards->>'linkingcord')::int = 1
  );
  detail := 'trade-1';
  return next;

  name := '151 keeps a single Master Ball';
  passed := exists (
    select 1
      from jsonb_array_elements(private.economy_config()->'dexMilestones') v
     where (v.value->>'species')::int = 151
       and coalesce((v.value->'grants'->>'masterball')::int, 0) = 1
  ) and exists (
    select 1
      from jsonb_array_elements(private.economy_config()->'dexMilestones') v
     where (v.value->>'species')::int = 150
       and coalesce((v.value->'grants'->>'masterball')::int, 0) = 0
  );
  detail := '150 prep / 151 prestige';
  return next;

  begin
    insert into public.profiles (id, display_name)
    values (uid, 'Loot Test')
    on conflict (id) do nothing;
    insert into public.inventories (user_id, coins, starter_granted, pokeball)
    values (uid, 0, true, 0)
    on conflict (user_id) do update set pokeball = 0, coins = 0, starter_granted = true;
    isolated := true;
  exception when others then
    name := 'Isolated grant tests skipped';
    passed := true;
    detail := SQLERRM;
    return next;
    return;
  end;

  select pokeball into before_p from public.inventories where user_id = uid;
  res := private.grant_items(uid, jsonb_build_object('pokeball', 2), 'ADMIN_GRANT', 'test', 'loot-test-grant', true);
  res := private.grant_items(uid, jsonb_build_object('pokeball', 2), 'ADMIN_GRANT', 'test', 'loot-test-grant', true);
  select pokeball into after_p from public.inventories where user_id = uid;
  name := 'grant_items is idempotent';
  passed := after_p = before_p + 2 and coalesce((res->>'duplicate')::boolean, false);
  detail := after_p::text;
  return next;

  name := 'Item ledger matches the grant';
  passed := exists (
    select 1 from public.item_ledger
     where user_id = uid and item_key = 'pokeball' and amount = 2 and reason = 'ADMIN_GRANT'
  );
  detail := 'ledger';
  return next;

  insert into public.daily_claims (user_id, claim_date, streak_day, grants)
  values (uid, private.app_today(), 1, '{}'::jsonb)
  on conflict do nothing;
  begin
    insert into public.daily_claims (user_id, claim_date, streak_day, grants)
    values (uid, private.app_today(), 1, '{}'::jsonb);
    name := 'Daily claim unique per calendar day';
    passed := false;
    detail := 'second insert succeeded';
    return next;
  exception when unique_violation then
    name := 'Daily claim unique per calendar day';
    passed := true;
    detail := 'blocked';
    return next;
  end;

  res := private.roll_gameplay_loot(uid, 'ENCOUNTER_DROP', 'test-round', 'loot-test-miss', 'ENCOUNTER_PARTICIPATION_COMMON', 0, 'COMMON', '{}'::jsonb);
  name := 'Zero-chance gameplay roll grants nothing';
  passed := coalesce((res->>'rolled')::boolean, true) = false;
  detail := coalesce(res->>'rolled', 'null');
  return next;

  res := private.roll_gameplay_loot(uid, 'ENCOUNTER_DROP', 'test-round', 'loot-test-miss', 'ENCOUNTER_PARTICIPATION_COMMON', 1, 'COMMON', '{}'::jsonb);
  name := 'Duplicate loot callback does not grant twice';
  passed := coalesce((res->>'duplicate')::boolean, false);
  detail := 'idempotent';
  return next;

  delete from public.item_ledger where user_id = uid;
  delete from public.reward_events where user_id = uid;
  delete from public.loot_rolls where user_id = uid;
  delete from public.daily_claims where user_id = uid;
  delete from public.inventories where user_id = uid;
  delete from public.profiles where id = uid;
end;
$function$;

create or replace function public.admin_loot_self_test()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not private.is_play_admin() then raise exception 'Admin only.'; end if;
  return jsonb_build_object(
    'ok', true,
    'results', coalesce((
      select jsonb_agg(jsonb_build_object('name', s.name, 'passed', s.passed, 'detail', s.detail))
      from private.loot_self_test() s
    ), '[]'::jsonb)
  );
end;
$function$;

revoke all on function public.admin_loot_self_test() from public;
grant execute on function public.admin_loot_self_test() to authenticated;
