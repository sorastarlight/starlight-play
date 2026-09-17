-- Bag space identity for Mart cards, plus generated portrait filenames.

create or replace function private.item_identity(p_key text)
returns jsonb
language plpgsql
stable
as $$
declare
  k text := lower(btrim(coalesce(p_key, '')));
  b public.capture_balls%rowtype;
  berry public.capture_berries%rowtype;
  collector boolean := false;
  best text := '';
  player text := '';
begin
  if k = '' then return null; end if;
  if k = 'bait' then
    return jsonb_build_object(
      'key', 'bait', 'name', 'Honey', 'category', 'community', 'rarity', 'common',
      'collector', false, 'powerLabel', 'COMMUNITY',
      'bestUse', 'Contribute during the item phase so every participating Trainer gets a shared catch boost.',
      'playerText', 'Honey is community catch support. Contributing improves the shared encounter effort. It is not a Berry.',
      'adminText', 'honeyMult 1.00–1.22× from participation + 1.03× if this Trainer contributed.',
      'effect', 1, 'condition', 'COMMUNITY_HONEY', 'storeAvailable', true
    );
  end if;
  if k = 'lure' then
    return jsonb_build_object(
      'key', 'lure', 'name', 'Poké Radar', 'category', 'special', 'rarity', 'uncommon',
      'collector', false, 'powerLabel', 'UTILITY',
      'bestUse', 'Auto-join encounters for 30 minutes.',
      'playerText', 'Automatically joins you to encounters for 30 minutes.',
      'adminText', 'lure timer, not a catch modifier.',
      'effect', 1, 'condition', 'NONE', 'storeAvailable', true
    );
  end if;
  if k = 'bag_bonus' then
    return jsonb_build_object(
      'key', 'bag_bonus', 'name', 'Bag space', 'category', 'special', 'rarity', 'uncommon',
      'collector', false, 'powerLabel', 'UTILITY',
      'bestUse', 'Permanently add bag slots so you can carry more items.',
      'playerText', 'Adds extra bag space forever. This is not an encounter item.',
      'adminText', 'inventories.bag_bonus',
      'effect', 1, 'condition', 'NONE', 'storeAvailable', true
    );
  end if;
  if k = 'rarecandy' then
    return jsonb_build_object(
      'key', 'rarecandy', 'name', 'Rare Candy', 'category', 'evolution', 'rarity', 'rare',
      'collector', false, 'powerLabel', 'PROGRESSION',
      'bestUse', 'Convert into 1 Evolution Candy for a chosen Evolution Line.',
      'playerText', 'Converts into 1 Evolution Candy at the Evolution Center. It does not evolve a Pokémon by itself.',
      'adminText', 'play_use_rare_candy +1 family candy.',
      'effect', 1, 'condition', 'NONE', 'storeAvailable', false
    );
  end if;
  if k in ('firestone','waterstone','thunderstone','leafstone','moonstone','linkingcord') then
    return jsonb_build_object(
      'key', k,
      'name', initcap(replace(replace(k, 'stone', ' Stone'), 'linkingcord', 'Linking Cord')),
      'category', 'evolution', 'rarity', case when k = 'linkingcord' then 'rare' else 'uncommon' end,
      'collector', false, 'powerLabel', 'EVOLUTION',
      'bestUse', 'Use at the Evolution Center on an eligible Pokémon.',
      'playerText', case when k = 'linkingcord'
        then 'Lets Kadabra, Machoke, Graveler, or Haunter evolve without a trade.'
        else 'Evolves certain Pokémon at the Evolution Center when you also have enough Evolution Candy.'
      end,
      'adminText', 'evolution_rules.required_item',
      'effect', 1, 'condition', 'NONE', 'storeAvailable', true
    );
  end if;
  select * into b from public.capture_balls where key = k;
  if found then
    collector := b.condition_type = 'NONE' and coalesce(b.base_multiplier, 1) <= 1.0 and not b.guaranteed_capture
      and coalesce(b.economic_tier, '') in ('collector', 'cosmetic');
    if b.guaranteed_capture then
      best := 'Use when you cannot risk an escape.';
      player := 'Always catches. Not sold on the ordinary shelf.';
    elsif collector then
      best := 'Choose this Ball for its look. Catch power matches a Poké Ball.';
      player := coalesce(nullif(b.description, ''), 'Collector Ball. Same catch power as a Poké Ball.');
    elsif b.condition_type = 'TARGET_TYPE' then
      best := 'Best against ' || array_to_string(array(select jsonb_array_elements_text(coalesce(b.condition_config->'types','[]'::jsonb))), ' / ') || '-type Pokémon.';
      player := best || ' Ordinary against other types.';
    elsif b.condition_type = 'NIGHT' then
      best := 'Best at night on the stream clock.';
      player := 'Stronger at night. Ordinary during the day.';
    elsif b.condition_type = 'PLAYER_OWNS_SPECIES' then
      best := 'Best against a species you have already caught.';
      player := 'Stronger if this species is already in your collection. Ordinary on a first catch.';
    elsif b.condition_type = 'THROW_EARLY' then
      best := 'Best when you choose your Ball immediately in the throw phase.';
      player := 'Stronger if you commit early. Ordinary if you wait.';
    elsif b.condition_type = 'THROW_LATE' then
      best := 'Best when the throw phase is almost over.';
      player := 'Stronger later in the throw phase. Ordinary if you throw immediately.';
    elsif b.condition_type = 'TRAINER_LEVEL_GTE' then
      best := 'Best for experienced Trainers (Lv. ' || coalesce(b.condition_config->>'minLevel', '8') || '+).';
      player := 'Stronger once you reach that Trainer level. Ordinary before then.';
    elsif b.condition_type = 'TARGET_GENDERED' then
      best := 'Best against Pokémon that have a gender.';
      player := 'Stronger on male or female Pokémon. Ordinary on genderless Pokémon.';
    elsif b.condition_type = 'SPECIES_CATCH_RATE_MIN' then
      best := 'Best against common, easily caught Pokémon.';
      player := 'Stronger on common species. Ordinary on rare targets.';
    elsif b.condition_type = 'SPECIES_BASE_SPEED_MIN' then
      best := 'Best against very fast Pokémon.';
      player := 'Stronger on high-Speed species. Ordinary otherwise.';
    elsif b.condition_type = 'MOON_STONE_FAMILY' then
      best := 'Best against Moon Stone evolution families.';
      player := 'Stronger on Clefairy, Nidoran, and other Moon Stone relatives.';
    elsif b.condition_type = 'SPECIES_WEIGHT_TIERS' then
      best := 'Best against very heavy Pokémon.';
      player := 'Stronger as weight increases. Ordinary on light Pokémon.';
    else
      best := coalesce(nullif(b.description, ''), 'A general-purpose Poké Ball.');
      player := best;
    end if;
    return jsonb_build_object(
      'key', b.key, 'name', b.name, 'category', 'balls',
      'rarity', coalesce(b.rarity, 'common'),
      'collector', collector,
      'powerLabel', private.item_power_label(coalesce(b.conditional_multiplier, b.base_multiplier), b.guaranteed_capture, collector),
      'basePower', private.item_power_label(b.base_multiplier, false, collector),
      'bestUse', best,
      'playerText', player,
      'adminText', format('base %s× cond %s %s× guaranteed %s',
        b.base_multiplier, b.condition_type, coalesce(b.conditional_multiplier, b.base_multiplier), b.guaranteed_capture),
      'effect', coalesce(b.conditional_multiplier, b.base_multiplier),
      'baseEffect', b.base_multiplier,
      'condition', b.condition_type,
      'storeAvailable', coalesce(b.store_enabled, true),
      'shopPrice', b.shop_price
    );
  end if;
  select * into berry from public.capture_berries where key = k;
  if found then
    player := coalesce(nullif(berry.rpg_description, ''), berry.canonical_flavor_text, 'A Berry used during the item phase.');
    return jsonb_build_object(
      'key', berry.key, 'name', berry.name, 'category', 'berries',
      'rarity', coalesce(berry.rarity, berry.tier, 'common'),
      'collector', false,
      'powerLabel', private.item_power_label(berry.capture_multiplier, false, false),
      'bestUse', case
        when coalesce(berry.reward_bonus, 0) > 0 then 'Use when you want a catch assist plus extra coins on a successful catch.'
        when berry.capture_multiplier >= 1.25 then 'Rare catch help. Save it for Pokémon you really want.'
        when berry.capture_multiplier >= 1.12 then 'Dependable catch help.'
        else 'Cheap, common catch help.'
      end,
      'playerText', player,
      'adminText', format('capture %s× rewardBonus %s capture_enabled %s', berry.capture_multiplier, berry.reward_bonus, berry.capture_enabled),
      'effect', berry.capture_multiplier,
      'rewardBonus', berry.reward_bonus,
      'condition', 'PREPARE',
      'storeAvailable', berry.store_available,
      'shopPrice', berry.shop_price
    );
  end if;
  return jsonb_build_object('key', k, 'name', initcap(k), 'category', 'special', 'playerText', 'A Trainer item.');
end;
$$;

create or replace function public.admin_item_library(p_q text default null, p_category text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  q text := lower(btrim(coalesce(p_q, '')));
  cat text := lower(btrim(coalesce(p_category, '')));
begin
  perform private.require_staff_edit();
  return jsonb_build_object(
    'ok', true,
    'items', coalesce((
      select jsonb_agg(row order by row->>'category', row->>'name')
      from (
        select private.item_identity(b.key) || jsonb_build_object('icon', coalesce(b.image, b.key), 'sku', (
          select i.sku from private.store_items i where i.extra->>'ballKey' = b.key or i.grants ? b.key limit 1
        )) as row
        from public.capture_balls b
        union all
        select private.item_identity(r.key) || jsonb_build_object('icon', coalesce(r.sprite, r.key))
        from public.capture_berries r
        union all
        select private.item_identity(k) || jsonb_build_object('icon', k)
        from unnest(array['bait','lure','bag_bonus','rarecandy','firestone','waterstone','thunderstone','leafstone','moonstone','linkingcord']) k
      ) x
      where (cat = '' or x.row->>'category' = cat)
        and (q = '' or x.row->>'name' ilike '%'||q||'%' or x.row->>'key' ilike '%'||q||'%')
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.admin_content_picker(p_q text default null, p_kind text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  q text := lower(btrim(coalesce(p_q, '')));
  kind text := lower(btrim(coalesce(p_kind, 'all')));
begin
  perform private.require_staff_edit();
  return jsonb_build_object(
    'ok', true,
    'items', case when kind in ('all','items','balls','berries') then coalesce((
      select jsonb_agg(jsonb_build_object(
        'kind', 'item', 'key', x.row->>'key', 'name', x.row->>'name',
        'category', x.row->>'category', 'identity', x.row
      ) order by x.row->>'category', x.row->>'name')
      from (
        select private.item_identity(b.key) as row from public.capture_balls b
        union all
        select private.item_identity(r.key) from public.capture_berries r where r.capture_enabled or r.store_available
        union all
        select private.item_identity(k) from unnest(array['bait','lure','bag_bonus','rarecandy','firestone','waterstone','thunderstone','leafstone','moonstone','linkingcord']) k
      ) x
      where q = '' or x.row->>'name' ilike '%'||q||'%' or x.row->>'key' ilike '%'||q||'%'
    ), '[]'::jsonb) else '[]'::jsonb end,
    'avatars', case when kind in ('all','avatars') then coalesce((
      select jsonb_agg(jsonb_build_object(
        'kind', 'avatar', 'key', l.id, 'name', l.name, 'pack', l.pack_key,
        'portrait', l.portrait_file, 'ext', l.ext
      ) order by l.sort, l.name)
      from private.trainer_looks l
      where l.visible and (q = '' or l.name ilike '%'||q||'%' or l.id ilike '%'||q||'%')
    ), '[]'::jsonb) else '[]'::jsonb end,
    'avatarPacks', case when kind in ('all','avatars','packs') then coalesce((
      select jsonb_agg(jsonb_build_object('kind','avatarPack','key', i.extra->>'pack', 'name', i.name, 'sku', i.sku) order by i.name)
      from private.store_items i
      where nullif(i.extra->>'pack','') is not null
        and (q = '' or i.name ilike '%'||q||'%')
    ), '[]'::jsonb) else '[]'::jsonb end,
    'cosmetics', case when kind in ('all','cosmetics') then coalesce((
      select jsonb_agg(jsonb_build_object('kind','cosmetic','key', c.id, 'name', c.name, 'slot', c.kind) order by c.sort_order, c.name)
      from public.progression_cosmetics c
      where c.enabled and (q = '' or c.name ilike '%'||q||'%' or c.id ilike '%'||q||'%')
    ), '[]'::jsonb) else '[]'::jsonb end
  );
end;
$$;

update private.trainer_looks
set portrait_file = id || '-portrait.png'
where visible
  and coalesce(portrait_file, '') = '';
