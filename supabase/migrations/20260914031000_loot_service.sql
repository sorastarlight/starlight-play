-- Authoritative RewardService: every item grant writes a ledger and
-- goes through private.grant_known. Gameplay RNG is isolated from Bits.

create or replace function private.loot_config()
returns jsonb
language sql
stable
as $function$
  select coalesce(private.game_settings()->'lootBalance', '{}'::jsonb)
    || jsonb_build_object(
      'participationDropChance', coalesce((private.game_settings()->'lootBalance'->>'participationDropChance')::numeric, 0.15),
      'captureDropChance', coalesce((private.game_settings()->'lootBalance'->>'captureDropChance')::numeric, 0.25),
      'captureTiers', coalesce(private.game_settings()->'lootBalance'->'captureTiers',
        '{"COMMON":0.70,"UNCOMMON":0.24,"RARE":0.05,"VERY_RARE":0.01,"SPECIAL":0}'::jsonb),
      'rarityUpgrade', coalesce(private.game_settings()->'lootBalance'->'rarityUpgrade',
        '{"COMMON":0,"UNCOMMON":0,"RARE":0.05,"VERY_RARE":0.10,"ULTRA_RARE":0.15,"LEGENDARY":0}'::jsonb),
      'shinyLootFloor', coalesce(private.game_settings()->'lootBalance'->>'shinyLootFloor', 'UNCOMMON'),
      'legendaryLootFloor', coalesce(private.game_settings()->'lootBalance'->>'legendaryLootFloor', 'RARE'),
      'eventDropModifier', coalesce((private.game_settings()->'lootBalance'->>'eventDropModifier')::numeric, 1.0),
      'maxDropChance', coalesce((private.game_settings()->'lootBalance'->>'maxDropChance')::numeric, 0.55),
      'streamFirstBall', coalesce((private.game_settings()->'lootBalance'->>'streamFirstBall')::int, 1),
      'itemValues', coalesce(private.game_settings()->'lootBalance'->'itemValues', '{}'::jsonb),
      'disabledItems', coalesce(private.game_settings()->'lootBalance'->'disabledItems', '[]'::jsonb)
    );
$function$;

create or replace function private.app_today()
returns date
language sql
stable
as $function$
  select (timezone(coalesce(private.capture_config()->>'timezone', 'America/New_York'), now()))::date;
$function$;

create or replace function private.loot_unit()
returns numeric
language sql
volatile
as $function$
  select (('x' || encode(gen_random_bytes(4), 'hex'))::bit(32)::bigint::numeric + 0.5) / 4294967296.0;
$function$;

create or replace function private.evo_item_keys()
returns text[]
language sql
immutable
as $$
  select array['firestone','waterstone','thunderstone','leafstone','moonstone','linkingcord','rarecandy'];
$$;

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
      when 'firestone' then 'Fire Stone'
      when 'waterstone' then 'Water Stone'
      when 'thunderstone' then 'Thunder Stone'
      when 'leafstone' then 'Leaf Stone'
      when 'moonstone' then 'Moon Stone'
      when 'linkingcord' then 'Linking Cord'
      when 'rarecandy' then 'Rare Candy'
      when 'choice_stone' then 'Evolution Stone'
      else coalesce(item, '')
    end
  );
$$;

create or replace function private.item_drop_allowed(p_key text)
returns boolean
language plpgsql
stable
as $function$
begin
  if p_key is null or p_key = '' or p_key = 'masterball' then
    return false;
  end if;
  if exists (
    select 1
      from jsonb_array_elements_text(coalesce(private.loot_config()->'disabledItems', '[]'::jsonb)) d
     where d = p_key
  ) then
    return false;
  end if;
  if p_key in ('choice_stone', 'bait', 'berry', 'pokeball', 'greatball', 'ultraball', 'lure', 'bag_bonus') then
    return true;
  end if;
  if p_key = any (private.evo_item_keys()) then
    return true;
  end if;
  if exists (select 1 from public.capture_balls b where b.key = p_key and b.enabled) then
    return true;
  end if;
  if exists (select 1 from public.capture_berries b where b.key = p_key and b.enabled) then
    return true;
  end if;
  return false;
end;
$function$;

create or replace function private.item_value(p_key text)
returns int
language sql
stable
as $function$
  select coalesce((private.loot_config()->'itemValues'->>p_key)::int, 0);
$function$;

create or replace function private.loot_tier_rank(p_tier text)
returns int
language sql
immutable
as $function$
  select case upper(coalesce(p_tier, 'COMMON'))
    when 'COMMON' then 1
    when 'UNCOMMON' then 2
    when 'RARE' then 3
    when 'VERY_RARE' then 4
    when 'SPECIAL' then 5
    else 1
  end;
$function$;

create or replace function private.loot_tier_name(p_rank int)
returns text
language sql
immutable
as $function$
  select case greatest(1, least(coalesce(p_rank, 1), 4))
    when 1 then 'COMMON'
    when 2 then 'UNCOMMON'
    when 3 then 'RARE'
    else 'VERY_RARE'
  end;
$function$;

create or replace function private.capture_table_for_tier(p_tier text)
returns text
language sql
immutable
as $function$
  select case upper(coalesce(p_tier, 'COMMON'))
    when 'UNCOMMON' then 'CAPTURE_UNCOMMON'
    when 'RARE' then 'CAPTURE_RARE'
    when 'VERY_RARE' then 'CAPTURE_VERY_RARE'
    else 'CAPTURE_COMMON'
  end;
$function$;

create or replace function private.spawn_loot_rarity(p_catch_rate int, p_legendary boolean)
returns text
language sql
immutable
as $function$
  select case
    when coalesce(p_legendary, false) then 'LEGENDARY'
    when coalesce(p_catch_rate, 255) <= 9 then 'ULTRA_RARE'
    when coalesce(p_catch_rate, 255) <= 25 then 'VERY_RARE'
    when coalesce(p_catch_rate, 255) <= 75 then 'RARE'
    when coalesce(p_catch_rate, 255) <= 150 then 'UNCOMMON'
    else 'COMMON'
  end;
$function$;

create or replace function private.round_is_test(p_round uuid)
returns boolean
language sql
stable
as $function$
  select coalesce((select rules->>'rewardMode' from public.encounter_rounds where id = p_round), 'live') = 'test';
$function$;

create or replace function private.open_choice_reward(
  p_uid uuid,
  p_key text,
  p_options text[],
  p_remaining int
)
returns void
language plpgsql
as $function$
begin
  if p_uid is null or coalesce(p_key, '') = '' or coalesce(p_remaining, 0) < 1 then
    return;
  end if;
  insert into public.reward_choices (user_id, reward_key, options, remaining)
  values (p_uid, p_key, coalesce(p_options, array['firestone','waterstone','thunderstone','leafstone','moonstone']), p_remaining)
  on conflict (user_id, reward_key) do update
    set remaining = public.reward_choices.remaining + excluded.remaining,
        options = excluded.options;
  perform private.push_notice(
    p_uid, 'choice', 'Choose a reward',
    'Pick ' || p_remaining::text || ' Evolution Stone' || case when p_remaining = 1 then '' else 's' end || '.',
    jsonb_build_object('rewardKey', p_key, 'remaining', p_remaining)
  );
end;
$function$;

create or replace function private.grant_items(
  p_uid uuid,
  p_grants jsonb,
  p_reason text,
  p_source text default null,
  p_idem text default null,
  p_strict boolean default true
)
returns jsonb
language plpgsql
as $function$
declare
  grants jsonb := coalesce(p_grants, '{}'::jsonb);
  choice jsonb;
  coins int := 0;
  k text;
  n int;
  given jsonb := '{}'::jsonb;
  full_hit boolean := false;
begin
  if p_uid is null or grants = '{}'::jsonb then
    return jsonb_build_object('ok', true, 'granted', '{}'::jsonb);
  end if;
  if p_idem is not null then
    insert into public.reward_events (user_id, idempotency, reason, source_id, grants)
    values (p_uid, p_idem, coalesce(p_reason, 'GRANT'), p_source, grants)
    on conflict (user_id, idempotency) do nothing;
    if not found then
      return jsonb_build_object('ok', true, 'duplicate', true, 'granted', '{}'::jsonb);
    end if;
  end if;

  choice := grants->'_choice';
  coins := coalesce((grants->>'coins')::int, 0);
  grants := grants - 'coins' - 'title' - 'badge' - 'label' - 'idempotency' - 'key' - '_choice' - 'reason';

  if coalesce((grants->>'choice_stone')::int, 0) > 0 then
    perform private.open_choice_reward(
      p_uid,
      coalesce(p_idem, 'choice-stone:' || p_uid::text || ':' || coalesce(p_source, 'loot')),
      array['firestone','waterstone','thunderstone','leafstone','moonstone'],
      (grants->>'choice_stone')::int
    );
    grants := grants - 'choice_stone';
  end if;
  if choice is not null then
    perform private.open_choice_reward(
      p_uid,
      coalesce(choice->>'reward_key', p_idem, 'choice'),
      coalesce(array(select jsonb_array_elements_text(choice->'options')), array['firestone','waterstone','thunderstone','leafstone','moonstone']),
      greatest(coalesce((choice->>'remaining')::int, 1), 1)
    );
  end if;

  if grants <> '{}'::jsonb then
    begin
      perform private.grant_known(p_uid, grants);
      given := grants;
    exception when others then
      if p_strict or sqlerrm not ilike '%full%' then
        raise;
      end if;
      full_hit := true;
      for k, n in
        select key, greatest(coalesce(value::int, 0), 0)
          from jsonb_each_text(grants)
         where greatest(coalesce(value::int, 0), 0) > 0
      loop
        begin
          perform private.grant_known(p_uid, jsonb_build_object(k, n));
          given := given || jsonb_build_object(k, n);
        exception when others then
          if n > 1 then
            begin
              perform private.grant_known(p_uid, jsonb_build_object(k, 1));
              given := given || jsonb_build_object(k, 1);
            exception when others then
              null;
            end;
          end if;
        end;
      end loop;
      perform private.push_notice(
        p_uid, 'loot', 'Inventory limit reached.',
        'Some rewards could not be added. Use or store items, then keep playing.',
        jsonb_build_object('reason', p_reason)
      );
    end;
  end if;

  if coins <> 0 then
    perform private.adjust_coins(
      p_uid, coins, coalesce(p_reason, 'GRANT'), coalesce(p_reason, 'Reward'),
      jsonb_build_object('idempotency', case when p_idem is null then null else p_idem || ':coins' end, 'relatedRound', p_source)
    );
  end if;

  for k, n in
    select key, greatest(coalesce(value::int, 0), 0)
      from jsonb_each_text(given)
     where greatest(coalesce(value::int, 0), 0) > 0
       and key not in ('coins', 'title', 'badge')
  loop
    insert into public.item_ledger (user_id, item_key, amount, reason, source_id, idempotency)
    values (
      p_uid, k, n, coalesce(p_reason, 'GRANT'), p_source,
      case when p_idem is null then null else p_idem || ':' || k end
    )
    on conflict do nothing;
  end loop;

  if (given ? 'masterball') and coalesce((given->>'masterball')::int, 0) > 0 then
    insert into public.play_console_log (kind, message)
    values (
      'milestone',
      '🏆 ' || coalesce(private.trainer_label(p_uid), 'A trainer') || ' earned a Master Ball!'
    );
  end if;

  return jsonb_build_object('ok', true, 'granted', given, 'full', full_hit, 'coins', coins);
end;
$function$;

create or replace function private.pick_loot_entry(p_table text)
returns jsonb
language plpgsql
as $function$
declare
  total int := 0;
  cursor_w int := 0;
  target numeric;
  rec record;
begin
  select coalesce(sum(greatest(e.weight, 0)), 0) into total
    from public.loot_table_entries e
    join public.loot_tables t on t.id = e.table_id
   where e.table_id = p_table
     and e.enabled and t.enabled
     and e.weight > 0
     and private.item_drop_allowed(e.item_key);
  if total <= 0 then
    return null;
  end if;
  target := private.loot_unit() * total;
  for rec in
    select e.item_key, e.weight, e.min_qty, e.max_qty
      from public.loot_table_entries e
      join public.loot_tables t on t.id = e.table_id
     where e.table_id = p_table
       and e.enabled and t.enabled
       and e.weight > 0
       and private.item_drop_allowed(e.item_key)
     order by e.item_key, e.min_qty
  loop
    cursor_w := cursor_w + rec.weight;
    if target <= cursor_w then
      return jsonb_build_object(
        'item', rec.item_key,
        'weight', rec.weight,
        'qty', case
          when rec.max_qty <= rec.min_qty then rec.min_qty
          else rec.min_qty + floor(private.loot_unit() * (rec.max_qty - rec.min_qty + 1))::int
        end
      );
    end if;
  end loop;
  return null;
end;
$function$;

create or replace function private.pick_loot_with_fallback(p_tier text)
returns jsonb
language plpgsql
as $function$
declare
  rank int := private.loot_tier_rank(p_tier);
  table_id text;
  picked jsonb;
begin
  while rank >= 1 loop
    table_id := private.capture_table_for_tier(private.loot_tier_name(rank));
    picked := private.pick_loot_entry(table_id);
    if picked is not null then
      return picked || jsonb_build_object('tier', private.loot_tier_name(rank), 'tableId', table_id);
    end if;
    insert into public.play_console_log (kind, message)
    values ('admin', 'Loot table ' || table_id || ' is empty; falling back.');
    rank := rank - 1;
  end loop;
  return null;
end;
$function$;

create or replace function private.roll_capture_tier()
returns text
language plpgsql
as $function$
declare
  tiers jsonb := private.loot_config()->'captureTiers';
  roll numeric := private.loot_unit();
  acc numeric := 0;
  name text;
begin
  foreach name in array array['COMMON','UNCOMMON','RARE','VERY_RARE'] loop
    acc := acc + coalesce((tiers->>name)::numeric, 0);
    if roll <= acc then
      return name;
    end if;
  end loop;
  return 'COMMON';
end;
$function$;

create or replace function private.maybe_upgrade_tier(p_tier text, p_rarity text)
returns text
language plpgsql
as $function$
declare
  chance numeric := coalesce((private.loot_config()->'rarityUpgrade'->>p_rarity)::numeric, 0);
  rank int := private.loot_tier_rank(p_tier);
begin
  if chance > 0 and rank < 4 and private.loot_unit() < chance then
    return private.loot_tier_name(rank + 1);
  end if;
  return private.loot_tier_name(rank);
end;
$function$;

create or replace function private.apply_loot_floor(p_tier text, p_floor text)
returns text
language sql
immutable
as $function$
  select case
    when private.loot_tier_rank(p_floor) > private.loot_tier_rank(p_tier) then upper(p_floor)
    else upper(p_tier)
  end;
$function$;

create or replace function private.roll_gameplay_loot(
  p_uid uuid,
  p_reason text,
  p_source text,
  p_idem text,
  p_table text,
  p_chance numeric,
  p_tier text default null,
  p_detail jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
as $function$
declare
  chance numeric := least(greatest(coalesce(p_chance, 0), 0), coalesce((private.loot_config()->>'maxDropChance')::numeric, 0.55));
  roll numeric := private.loot_unit();
  picked jsonb;
  grants jsonb;
  result jsonb;
begin
  if p_uid is null or coalesce(p_idem, '') = '' then
    return jsonb_build_object('ok', false);
  end if;
  if exists (select 1 from public.reward_events where user_id = p_uid and idempotency = p_idem) then
    return jsonb_build_object('ok', true, 'duplicate', true);
  end if;
  if roll >= chance then
    insert into public.loot_rolls (user_id, source, source_id, rolled, drop_chance, roll, detail)
    values (p_uid, p_reason, p_source, false, chance, roll, coalesce(p_detail, '{}'::jsonb));
    insert into public.reward_events (user_id, idempotency, reason, source_id, grants)
    values (p_uid, p_idem, p_reason, p_source, '{}'::jsonb)
    on conflict do nothing;
    return jsonb_build_object('ok', true, 'rolled', false);
  end if;
  if p_table is not null then
    picked := private.pick_loot_entry(p_table);
    if picked is not null then
      picked := picked || jsonb_build_object('tier', coalesce(p_tier, 'COMMON'), 'tableId', p_table);
    end if;
  else
    picked := private.pick_loot_with_fallback(coalesce(p_tier, 'COMMON'));
  end if;
  if picked is null or not private.item_drop_allowed(picked->>'item') then
    insert into public.loot_rolls (user_id, source, source_id, rolled, drop_chance, roll, tier, detail)
    values (p_uid, p_reason, p_source, false, chance, roll, p_tier, jsonb_build_object('empty', true));
    insert into public.reward_events (user_id, idempotency, reason, source_id, grants)
    values (p_uid, p_idem, p_reason, p_source, '{}'::jsonb)
    on conflict do nothing;
    return jsonb_build_object('ok', true, 'rolled', false, 'empty', true);
  end if;
  grants := jsonb_build_object(picked->>'item', (picked->>'qty')::int);
  result := private.grant_items(p_uid, grants, p_reason, p_source, p_idem, false);
  insert into public.loot_rolls (user_id, source, source_id, rolled, drop_chance, roll, tier, item_key, qty, weight, detail)
  values (
    p_uid, p_reason, p_source, true, chance, roll, picked->>'tier', picked->>'item',
    (picked->>'qty')::int, (picked->>'weight')::int, coalesce(p_detail, '{}'::jsonb) || picked
  );
  if (picked->>'item') in ('ultraball', 'goldenrazz', 'firestone', 'waterstone', 'thunderstone', 'leafstone', 'moonstone', 'linkingcord', 'rarecandy', 'choice_stone') then
    perform private.push_notice(
      p_uid, 'loot-rare', 'Rare item found!',
      private.item_label(picked->>'item') || ' ×' || (picked->>'qty') || ' — added to your Bag.',
      picked
    );
  else
    perform private.push_notice(
      p_uid, 'loot', 'Lucky find!',
      private.item_label(picked->>'item') || ' ×' || (picked->>'qty') || ' — added to your Bag.',
      picked
    );
  end if;
  return result || jsonb_build_object('rolled', true, 'item', picked->>'item', 'qty', (picked->>'qty')::int, 'tier', picked->>'tier');
end;
$function$;

create or replace function private.try_encounter_loot(
  p_round uuid,
  p_uid uuid,
  p_caught boolean,
  p_calc jsonb
)
returns void
language plpgsql
as $function$
declare
  r public.encounter_rounds;
  cfg jsonb := private.loot_config();
  event_mod numeric;
  part_chance numeric;
  catch_chance numeric;
  rarity text;
  tier text;
  floor_tier text;
  is_shiny boolean := false;
  is_legend boolean := false;
  catch_rate int;
  g jsonb;
begin
  if p_uid is null or p_round is null or private.round_is_test(p_round) then
    return;
  end if;
  select * into r from public.encounter_rounds where id = p_round;
  if r.id is null then
    return;
  end if;
  catch_rate := coalesce((p_calc->>'catchRate')::int, (select s.catch_rate from public.species s where s.dex = r.dex), 255);
  is_legend := exists (select 1 from public.species s where s.dex = r.dex and s.is_legendary);
  is_shiny := coalesce(r.variant, '') like '%shiny%';
  rarity := private.spawn_loot_rarity(catch_rate, is_legend);
  event_mod := least(
    greatest(coalesce((r.rules->>'eventDropMultiplier')::numeric, (cfg->>'eventDropModifier')::numeric, 1), 0.1),
    3
  );
  part_chance := least(coalesce((cfg->>'participationDropChance')::numeric, 0.15) * event_mod, (cfg->>'maxDropChance')::numeric);
  catch_chance := least(coalesce((cfg->>'captureDropChance')::numeric, 0.25) * event_mod, (cfg->>'maxDropChance')::numeric);

  g := r.rules->'guaranteedParticipationItem';
  if g is not null and coalesce(g->>'item', '') <> '' and (g->>'item') <> 'masterball' then
    perform private.grant_items(
      p_uid,
      jsonb_build_object(g->>'item', greatest(coalesce((g->>'qty')::int, 1), 1)),
      'EVENT_REWARD', p_round::text, 'loot:event-part:' || p_round::text || ':' || p_uid::text, false
    );
  end if;

  perform private.roll_gameplay_loot(
    p_uid, 'ENCOUNTER_DROP', p_round::text,
    'loot:part:' || p_round::text || ':' || p_uid::text,
    'ENCOUNTER_PARTICIPATION_COMMON', part_chance, 'COMMON',
    jsonb_build_object('kind', 'participation')
  );

  if not coalesce(p_caught, false) then
    return;
  end if;

  g := r.rules->'guaranteedCaptureItem';
  if g is not null and coalesce(g->>'item', '') <> '' and (g->>'item') <> 'masterball' then
    perform private.grant_items(
      p_uid,
      jsonb_build_object(g->>'item', greatest(coalesce((g->>'qty')::int, 1), 1)),
      'EVENT_REWARD', p_round::text, 'loot:event-catch:' || p_round::text || ':' || p_uid::text, false
    );
  end if;

  tier := private.roll_capture_tier();
  tier := private.maybe_upgrade_tier(tier, rarity);
  if is_shiny then
    tier := private.apply_loot_floor(tier, cfg->>'shinyLootFloor');
  end if;
  if is_legend then
    tier := private.apply_loot_floor(tier, cfg->>'legendaryLootFloor');
  end if;

  perform private.roll_gameplay_loot(
    p_uid, 'CAPTURE_DROP', p_round::text,
    'loot:catch:' || p_round::text || ':' || p_uid::text,
    null, catch_chance, tier,
    jsonb_build_object('kind', 'capture', 'rarity', rarity, 'shiny', is_shiny, 'legendary', is_legend, 'tier', tier)
  );
end;
$function$;
