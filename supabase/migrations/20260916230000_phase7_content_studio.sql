-- Phase 7: Content Studio, pack drafts, item identities, avatar portraits.
-- Does not retune whole-economy prices. Relative item identities only.

alter table private.trainer_looks
  add column if not exists portrait_file text,
  add column if not exists portrait_crop jsonb not null default '{}'::jsonb,
  add column if not exists asset_kind text not null default 'pixel';

alter table private.store_items
  add column if not exists status text not null default 'published';

update private.store_items
   set status = case when coalesce(extra->>'status', '') in ('draft', 'published') then extra->>'status' else 'published' end
 where status is distinct from coalesce(nullif(extra->>'status', ''), 'published');

create or replace function private.store_item_is_live(i private.store_items)
returns boolean
language sql
stable
as $$
  select i.visible and coalesce(nullif(i.status, ''), 'published') = 'published'
     and coalesce(i.extra->>'status', 'published') <> 'draft';
$$;

create or replace function private.pass_reward_grants(p_kind text)
returns jsonb
language sql
stable
as $$
  select coalesce(
    nullif(private.game_settings()->'starlightPass'->p_kind, 'null'::jsonb),
    case p_kind
      when 'daily' then '{"berry":2,"bait":1,"coins":20}'::jsonb
      when 'weekly' then '{"pokeball":5,"berry":3,"lure":1,"coins":150}'::jsonb
      else '{}'::jsonb
    end
  );
$$;

create or replace function private.item_power_label(p_mult numeric, p_guaranteed boolean, p_collector boolean)
returns text
language sql
immutable
as $$
  select case
    when coalesce(p_guaranteed, false) then 'ALWAYS CATCHES'
    when coalesce(p_collector, false) then 'COLLECTOR'
    when coalesce(p_mult, 1) >= 1.45 then 'VERY STRONG'
    when coalesce(p_mult, 1) >= 1.3 then 'STRONG'
    when coalesce(p_mult, 1) >= 1.15 then 'RELIABLE'
    when coalesce(p_mult, 1) > 1.0 then 'MODEST'
    else 'STANDARD'
  end;
$$;

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

update public.capture_balls set
  condition_type = 'THROW_EARLY',
  conditional_multiplier = 1.55,
  base_multiplier = 1.00,
  condition_config = '{"maxProgress":0.34}'::jsonb,
  description = 'Stronger if you choose it immediately in the throw phase. Ordinary if you wait.',
  economic_tier = 'specialist'
where key = 'quickball';

update public.capture_balls set
  condition_type = 'THROW_LATE',
  conditional_multiplier = 1.50,
  base_multiplier = 1.00,
  condition_config = '{"minProgress":0.66}'::jsonb,
  description = 'Stronger later in the throw phase. Ordinary if you throw immediately.',
  economic_tier = 'specialist'
where key = 'timerball';

update public.capture_balls set
  condition_type = 'TRAINER_LEVEL_GTE',
  conditional_multiplier = 1.40,
  base_multiplier = 1.00,
  condition_config = '{"minLevel":8}'::jsonb,
  description = 'Stronger for experienced Trainers (Lv. 8+). Ordinary before then.',
  economic_tier = 'specialist'
where key = 'levelball';

update public.capture_balls set
  condition_type = 'TARGET_GENDERED',
  conditional_multiplier = 1.40,
  base_multiplier = 1.00,
  condition_config = '{}'::jsonb,
  description = 'Stronger against Pokémon that have a gender. Ordinary on genderless Pokémon.',
  economic_tier = 'specialist'
where key = 'loveball';

update public.capture_balls set
  base_multiplier = 1.00,
  conditional_multiplier = null,
  condition_type = 'NONE',
  condition_config = '{}'::jsonb,
  economic_tier = 'collector',
  description = 'Collector Ball. Sleep conditions do not exist in this RPG, so it matches a Poké Ball.'
where key = 'dreamball';

update public.capture_balls set
  economic_tier = 'collector',
  description = 'Collector Ball. Ultra Beasts are not in Kanto, so this is weaker than a Poké Ball against ordinary Pokémon.'
where key = 'beastball';

update public.capture_balls set
  economic_tier = 'collector',
  description = coalesce(description, 'Collector Ball. Same catch power as a Poké Ball.')
where key in ('premierball','luxuryball','healball','friendball','cherishball','gsball','ashball','cloneball','darkball','oldball','originball','strangeball','hisuipokeball','hisuiheavyball','featherball')
  and condition_type = 'NONE'
  and coalesce(base_multiplier, 1) <= 1.0
  and not guaranteed_capture;

update public.capture_berries set rpg_description = v.d
from (values
  ('berry', 'A common Berry. Small, dependable catch help during the item phase.'),
  ('nanab', 'The cheap everyday Berry. Same small catch help as Oran, sold as the common option.'),
  ('cheri', 'A common Berry. Small catch help. Status-healing has no encounter role here.'),
  ('chesto', 'A common Berry. Small catch help.'),
  ('pecha', 'A common Berry. Small catch help.'),
  ('rawst', 'A common Berry. Small catch help.'),
  ('aspear', 'A common Berry. Small catch help.'),
  ('sitrus', 'Uncommon Berry. Noticeably better catch help than a common Berry.'),
  ('lum', 'Uncommon Berry. Solid catch help during the item phase.'),
  ('razz', 'The dependable catch Berry. A clear upgrade over common Berries.'),
  ('pinap', 'Small catch help, plus extra PokéCoins if you catch this Pokémon.'),
  ('goldenrazz', 'Rare, expensive catch help. Save it for Pokémon you really want.'),
  ('silverpinap', 'Strong catch help plus a smaller coin bonus on a successful catch.')
) as v(k, d)
where public.capture_berries.key = v.k;

insert into public.site_config (id, game_settings)
values (1, '{}'::jsonb)
on conflict (id) do nothing;

update public.site_config
   set game_settings = coalesce(game_settings, '{}'::jsonb) || jsonb_build_object(
     'starlightPass', coalesce(game_settings->'starlightPass', jsonb_build_object(
       'daily', '{"berry":2,"bait":1,"coins":20}'::jsonb,
       'weekly', '{"pokeball":5,"berry":3,"lure":1,"coins":150}'::jsonb
     ))
   ),
       updated_at = now()
 where id = 1
   and (game_settings->'starlightPass') is null;
