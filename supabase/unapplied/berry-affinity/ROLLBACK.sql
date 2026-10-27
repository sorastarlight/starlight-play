BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $d$ BEGIN IF (SELECT jsonb_agg(jsonb_build_object('key',key,'capture_enabled',capture_enabled,'rpg_description',rpg_description,'capture_multiplier',capture_multiplier,'reward_bonus',reward_bonus,'enabled',enabled,'rarity',rarity) ORDER BY key) FROM public.capture_berries WHERE key=ANY(ARRAY['aguav','aspear','berry','bluk','cheri','chesto','figy','goldenrazz','iapapa','leppa','lum','mago','nanab','pecha','persim','pinap','rawst','razz','silverpinap','sitrus','wepear','wiki'])) IS DISTINCT FROM '[{"key":"aguav","capture_enabled":true,"rpg_description":"Boosts catch chance by 15% relative to using no berry. Gives another 10% relative boost against Bug-type Pokémon. A successful berry catch can also drop a bonus item.","capture_multiplier":1.15,"reward_bonus":0,"enabled":true,"rarity":"rare"},{"key":"aspear","capture_enabled":true,"rpg_description":"Boosts catch chance by 5% relative to using no berry. Gives another 10% relative boost against Ice-type Pokémon. A successful berry catch can also drop a bonus item.","capture_multiplier":1.05,"reward_bonus":0,"enabled":true,"rarity":"common"},{"key":"berry","capture_enabled":true,"rpg_description":"Boosts catch chance by 5% relative to using no berry. Gives another 10% relative boost against Water-type Pokémon. A successful berry catch can also drop a bonus item.","capture_multiplier":1.05,"reward_bonus":0,"enabled":true,"rarity":"common"},{"key":"bluk","capture_enabled":true,"rpg_description":"Boosts catch chance by 5% relative to using no berry. Gives another 10% relative boost against Dark-type Pokémon. A successful berry catch can also drop a bonus item.","capture_multiplier":1.05,"reward_bonus":0,"enabled":true,"rarity":"common"},{"key":"cheri","capture_enabled":true,"rpg_description":"Boosts catch chance by 5% relative to using no berry. Gives another 10% relative boost against Fire-type Pokémon. A successful berry catch can also drop a bonus item.","capture_multiplier":1.05,"reward_bonus":0,"enabled":true,"rarity":"common"},{"key":"chesto","capture_enabled":true,"rpg_description":"Boosts catch chance by 5% relative to using no berry. Gives another 10% relative boost against Ghost-type Pokémon. A successful berry catch can also drop a bonus item.","capture_multiplier":1.05,"reward_bonus":0,"enabled":true,"rarity":"common"},{"key":"figy","capture_enabled":true,"rpg_description":"Boosts catch chance by 15% relative to using no berry. Gives another 10% relative boost against Rock-type Pokémon. A successful berry catch can also drop a bonus item.","capture_multiplier":1.15,"reward_bonus":0,"enabled":true,"rarity":"rare"},{"key":"goldenrazz","capture_enabled":true,"rpg_description":"Boosts catch chance by 30% relative to using no berry. Works equally against every Pokémon type. A successful berry catch can also drop a bonus item.","capture_multiplier":1.3,"reward_bonus":0,"enabled":true,"rarity":"epic"},{"key":"iapapa","capture_enabled":true,"rpg_description":"Boosts catch chance by 15% relative to using no berry. Gives another 10% relative boost against Ground-type Pokémon. A successful berry catch can also drop a bonus item.","capture_multiplier":1.15,"reward_bonus":0,"enabled":true,"rarity":"rare"},{"key":"leppa","capture_enabled":true,"rpg_description":"Boosts catch chance by 5% relative to using no berry. Gives another 10% relative boost against Fighting-type Pokémon. A successful berry catch can also drop a bonus item.","capture_multiplier":1.05,"reward_bonus":0,"enabled":true,"rarity":"common"},{"key":"lum","capture_enabled":true,"rpg_description":"Boosts catch chance by 10% relative to using no berry. Gives another 10% relative boost against Dragon-type Pokémon. A successful berry catch can also drop a bonus item.","capture_multiplier":1.1,"reward_bonus":0,"enabled":true,"rarity":"uncommon"},{"key":"mago","capture_enabled":true,"rpg_description":"Boosts catch chance by 15% relative to using no berry. Gives another 10% relative boost against Psychic-type Pokémon. A successful berry catch can also drop a bonus item.","capture_multiplier":1.15,"reward_bonus":0,"enabled":true,"rarity":"rare"},{"key":"nanab","capture_enabled":true,"rpg_description":"Boosts catch chance by 5% relative to using no berry. Gives another 10% relative boost against Flying-type Pokémon. A successful berry catch can also drop a bonus item.","capture_multiplier":1.05,"reward_bonus":0,"enabled":true,"rarity":"common"},{"key":"pecha","capture_enabled":true,"rpg_description":"Boosts catch chance by 5% relative to using no berry. Gives another 10% relative boost against Fairy-type Pokémon. A successful berry catch can also drop a bonus item.","capture_multiplier":1.05,"reward_bonus":0,"enabled":true,"rarity":"common"},{"key":"persim","capture_enabled":true,"rpg_description":"Boosts catch chance by 10% relative to using no berry. Gives another 10% relative boost against Normal-type Pokémon. A successful berry catch can also drop a bonus item.","capture_multiplier":1.1,"reward_bonus":0,"enabled":true,"rarity":"uncommon"},{"key":"pinap","capture_enabled":true,"rpg_description":"Boosts catch chance by 5% relative to using no berry. Gives another 10% relative boost against Electric-type Pokémon. Also keeps its extra PokéCoin reward on a successful catch. A successful berry catch can also drop a bonus item.","capture_multiplier":1.05,"reward_bonus":2,"enabled":true,"rarity":"common"},{"key":"rawst","capture_enabled":true,"rpg_description":"Boosts catch chance by 5% relative to using no berry. Gives another 10% relative boost against Grass-type Pokémon. A successful berry catch can also drop a bonus item.","capture_multiplier":1.05,"reward_bonus":0,"enabled":true,"rarity":"common"},{"key":"razz","capture_enabled":true,"rpg_description":"Boosts catch chance by 15% relative to using no berry. Works equally against every Pokémon type. A successful berry catch can also drop a bonus item.","capture_multiplier":1.15,"reward_bonus":0,"enabled":true,"rarity":"rare"},{"key":"silverpinap","capture_enabled":true,"rpg_description":"Boosts catch chance by 20% relative to using no berry. Works equally against every Pokémon type. Also keeps its extra PokéCoin reward on a successful catch. A successful berry catch can also drop a bonus item.","capture_multiplier":1.2,"reward_bonus":1.5,"enabled":true,"rarity":"rare"},{"key":"sitrus","capture_enabled":true,"rpg_description":"Boosts catch chance by 10% relative to using no berry. Works equally against every Pokémon type. A successful berry catch can also drop a bonus item.","capture_multiplier":1.1,"reward_bonus":0,"enabled":true,"rarity":"uncommon"},{"key":"wepear","capture_enabled":true,"rpg_description":"Boosts catch chance by 5% relative to using no berry. Gives another 10% relative boost against Poison-type Pokémon. A successful berry catch can also drop a bonus item.","capture_multiplier":1.05,"reward_bonus":0,"enabled":true,"rarity":"common"},{"key":"wiki","capture_enabled":true,"rpg_description":"Boosts catch chance by 15% relative to using no berry. Gives another 10% relative boost against Steel-type Pokémon. A successful berry catch can also drop a bonus item.","capture_multiplier":1.15,"reward_bonus":0,"enabled":true,"rarity":"rare"}]'::jsonb THEN RAISE EXCEPTION 'BERRY_ROLLBACK_CATALOG_DRIFT';END IF; IF (SELECT proacl::text FROM pg_proc WHERE oid='private.berry_affinity(text,integer,integer)'::regprocedure) IS DISTINCT FROM '{postgres=X/postgres}' THEN RAISE EXCEPTION 'BERRY_HELPER_ACL_DRIFT';END IF; END;$d$;
DO $g$ BEGIN
IF md5(pg_get_functiondef('private.capture_chance(integer,text,text,integer,integer,boolean,boolean,boolean,numeric,timestamp with time zone,jsonb)'::regprocedure))<>'ba365ac731899302d3a5750b1cff5a35' OR (SELECT proacl::text FROM pg_proc WHERE oid='private.capture_chance(integer,text,text,integer,integer,boolean,boolean,boolean,numeric,timestamp with time zone,jsonb)'::regprocedure) IS DISTINCT FROM NULL THEN RAISE EXCEPTION 'BERRY_ROLLBACK_DRIFT';END IF;
IF md5(pg_get_functiondef('private.capture_throw_context(encounter_rounds,uuid,timestamp with time zone)'::regprocedure))<>'dab6947ea1515ae505ebc20852ce0262' OR (SELECT proacl::text FROM pg_proc WHERE oid='private.capture_throw_context(encounter_rounds,uuid,timestamp with time zone)'::regprocedure) IS DISTINCT FROM NULL THEN RAISE EXCEPTION 'BERRY_ROLLBACK_DRIFT';END IF;
IF md5(pg_get_functiondef('private.capture_round_context(uuid,uuid)'::regprocedure))<>'336ba88cc8116ac6f079fc43fe5dd6b3' OR (SELECT proacl::text FROM pg_proc WHERE oid='private.capture_round_context(uuid,uuid)'::regprocedure) IS DISTINCT FROM NULL THEN RAISE EXCEPTION 'BERRY_ROLLBACK_DRIFT';END IF;
IF md5(pg_get_functiondef('private.capture_items_json()'::regprocedure))<>'9f95c99ef6b1aeee7a9058a50b6e5513' OR (SELECT proacl::text FROM pg_proc WHERE oid='private.capture_items_json()'::regprocedure) IS DISTINCT FROM NULL THEN RAISE EXCEPTION 'BERRY_ROLLBACK_DRIFT';END IF;
IF md5(pg_get_functiondef('private.is_capture_berry(text)'::regprocedure))<>'1d683dac01e5b436f7046bc43c1c8b49' OR (SELECT proacl::text FROM pg_proc WHERE oid='private.is_capture_berry(text)'::regprocedure) IS DISTINCT FROM NULL THEN RAISE EXCEPTION 'BERRY_ROLLBACK_DRIFT';END IF;
IF md5(pg_get_functiondef('private.berry_affinity(text,integer,integer)'::regprocedure))<>'b99ff0c4e969a0dda2bf52b1d669ca4f' THEN RAISE EXCEPTION 'BERRY_HELPER_DRIFT';END IF; END;$g$;
CREATE OR REPLACE FUNCTION private.capture_chance(p_dex integer, p_ball text, p_berry text DEFAULT NULL::text, p_honey_contributors integer DEFAULT 0, p_honey_participants integer DEFAULT 0, p_contributed_honey boolean DEFAULT false, p_owns_species boolean DEFAULT false, p_is_shiny boolean DEFAULT false, p_other_multiplier numeric DEFAULT 1.0, p_at timestamp with time zone DEFAULT now(), p_config jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  cfg jsonb := coalesce(p_config, private.capture_config());
  s public.species%rowtype;
  base numeric;
  ball jsonb;
  berry jsonb;
  honey jsonb;
  contributor numeric;
  shiny numeric;
  event numeric;
  other numeric := coalesce(p_other_multiplier, 1.0);
  raw numeric;
  final numeric;
  min_chance numeric := coalesce((cfg->>'minChance')::numeric, 0.02);
  max_chance numeric := coalesce((cfg->>'maxChance')::numeric, 0.85);
begin
  select * into s from public.species where dex = p_dex;
  base := private.capture_base_chance(s.catch_rate, cfg);
  ball := private.capture_ball_modifier(p_ball, p_dex, p_owns_species, p_at, cfg);
  berry := private.capture_berry_modifier(p_berry);
  honey := private.capture_honey_modifier(p_honey_contributors, p_honey_participants, cfg);
  contributor := case
    when coalesce(p_contributed_honey, false) then coalesce((cfg->>'honeyContributorBonus')::numeric, 1.0)
    else 1.0
  end;
  shiny := case when coalesce(p_is_shiny, false)
    then coalesce((cfg->>'shinyMultiplier')::numeric, 1.0) else 1.0 end;
  event := coalesce((cfg->>'eventMultiplier')::numeric, 1.0);

  raw := base
       * (ball->>'multiplier')::numeric
       * (berry->>'multiplier')::numeric
       * (honey->>'multiplier')::numeric
       * contributor
       * shiny
       * event
       * other;

  if coalesce((ball->>'guaranteed')::boolean, false) then
    final := 1.0;
  else
    final := least(max_chance, greatest(min_chance, raw));
  end if;

  return jsonb_build_object(
    'dex', p_dex,
    'species', s.name,
    'catchRate', s.catch_rate,
    'baseChance', base,
    'ball', ball,
    'berry', berry,
    'honey', honey,
    'honeyContributorMultiplier', contributor,
    'shinyMultiplier', shiny,
    'eventMultiplier', event,
    'otherMultiplier', other,
    'rawChance', raw,
    'finalChance', final,
    'guaranteed', coalesce((ball->>'guaranteed')::boolean, false),
    'minChance', min_chance,
    'maxChance', max_chance
  );
end;
$function$
;
CREATE OR REPLACE FUNCTION private.capture_throw_context(p_round encounter_rounds, p_uid uuid, p_ball_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  prepare_at timestamptz;
  throw_at timestamptz;
  used timestamptz := coalesce(p_ball_at, now());
  progress numeric := 0.5;
  lvl int := 1;
  g text := '';
begin
  if p_round.deadlines is not null then
    prepare_at := (p_round.deadlines->>'prepare')::timestamptz;
    throw_at := coalesce((p_round.deadlines->>'throw')::timestamptz, (p_round.deadlines->>'reveal')::timestamptz);
    if prepare_at is not null and throw_at is not null and throw_at > prepare_at then
      progress := extract(epoch from (used - prepare_at)) / extract(epoch from (throw_at - prepare_at));
    end if;
  end if;
  select private.trainer_level(xp) into lvl from public.profiles where id = p_uid;
  g := coalesce(p_round.gender, '');
  return jsonb_build_object('throwProgress', progress, 'trainerLevel', coalesce(lvl, 1), 'gender', g);
end;
$function$
;
CREATE OR REPLACE FUNCTION private.capture_round_context(p_round uuid, p_uid uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  r public.encounter_rounds%rowtype;
  ep public.encounter_players%rowtype;
  contributors int;
  participants int;
  owns boolean;
begin
  select * into r from public.encounter_rounds where id = p_round;
  if not found then
    return null;
  end if;
  select * into ep from public.encounter_players where round_id = p_round and user_id = p_uid;
  select count(*)::int, count(*) filter (where prep = 'bait')::int
    into participants, contributors
    from public.encounter_players where round_id = p_round;
  select exists (
    select 1 from public.catches c where c.user_id = p_uid and c.dex = r.dex
  ) into owns;
  return private.capture_chance(
    r.dex,
    ep.ball,
    case when ep.prep = 'bait' then null else ep.prep end,
    contributors,
    participants,
    ep.prep = 'bait',
    owns,
    private.variant_is_shiny(r.variant),
    1.0,
    now()
  );
end;
$function$
;
CREATE OR REPLACE FUNCTION private.capture_items_json()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
  select jsonb_build_object(
    'berries', coalesce((
      select jsonb_agg(jsonb_build_object(
        'key', b.key, 'name', b.name, 'sprite', b.sprite, 'tier', b.tier, 'rarity', b.rarity,
        'description', coalesce(b.rpg_description, b.canonical_flavor_text),
        'storeAvailable', b.store_available, 'price', b.shop_price
      ) order by b.sort_order, b.name)
      from public.capture_berries b where b.enabled and b.capture_enabled
    ), '[]'::jsonb),
    'balls', coalesce((
      select jsonb_agg(jsonb_build_object(
        'key', b.key, 'name', b.name,
        'description', coalesce(b.description, 'A Poké Ball for catching wild Pokémon.'),
        'storeAvailable', coalesce(b.store_enabled, false),
        'tier', coalesce(b.economic_tier, 'basic'),
        'guaranteed', coalesce(b.guaranteed_capture, false)
      ) order by b.sort_order, b.name)
      from public.capture_balls b where b.enabled
    ), '[]'::jsonb),
    'honey', jsonb_build_object(
      'key', 'bait', 'name', 'Honey', 'sprite', 'honey.png',
      'description', 'Contribute during the item phase to improve the community catch bonus for every participating Trainer. More participating Trainers contributing Honey increases the bonus, up to a cap.'
    )
  );
$function$
;
CREATE OR REPLACE FUNCTION private.is_capture_berry(item text)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  select exists (select 1 from public.capture_berries b where b.key = item and b.enabled);
$function$
;
DROP FUNCTION private.berry_affinity(text,integer,integer);
UPDATE public.capture_berries SET capture_enabled=false,rpg_description='A rich Berry that makes a wild Pokémon noticeably easier to catch.' WHERE key='aguav';
UPDATE public.capture_berries SET capture_enabled=true,rpg_description='A common Berry. Small catch help.' WHERE key='aspear';
UPDATE public.capture_berries SET capture_enabled=true,rpg_description='A common Berry. Small, dependable catch help during the item phase.' WHERE key='berry';
UPDATE public.capture_berries SET capture_enabled=false,rpg_description='A tasty Berry that makes a wild Pokémon a little easier to catch.' WHERE key='bluk';
UPDATE public.capture_berries SET capture_enabled=true,rpg_description='A common Berry. Small catch help. Status-healing has no encounter role here.' WHERE key='cheri';
UPDATE public.capture_berries SET capture_enabled=true,rpg_description='A common Berry. Small catch help.' WHERE key='chesto';
UPDATE public.capture_berries SET capture_enabled=false,rpg_description='A rich Berry that makes a wild Pokémon noticeably easier to catch.' WHERE key='figy';
UPDATE public.capture_berries SET capture_enabled=true,rpg_description='Rare, expensive catch help. Save it for Pokémon you really want.' WHERE key='goldenrazz';
UPDATE public.capture_berries SET capture_enabled=false,rpg_description='A rich Berry that makes a wild Pokémon noticeably easier to catch.' WHERE key='iapapa';
UPDATE public.capture_berries SET capture_enabled=false,rpg_description='A tasty Berry that makes a wild Pokémon a little easier to catch.' WHERE key='leppa';
UPDATE public.capture_berries SET capture_enabled=true,rpg_description='Uncommon Berry. Solid catch help during the item phase.' WHERE key='lum';
UPDATE public.capture_berries SET capture_enabled=false,rpg_description='A rich Berry that makes a wild Pokémon noticeably easier to catch.' WHERE key='mago';
UPDATE public.capture_berries SET capture_enabled=true,rpg_description='The cheap everyday Berry. Same small catch help as Oran, sold as the common option.' WHERE key='nanab';
UPDATE public.capture_berries SET capture_enabled=true,rpg_description='A common Berry. Small catch help.' WHERE key='pecha';
UPDATE public.capture_berries SET capture_enabled=false,rpg_description='A quality Berry that makes a wild Pokémon easier to catch.' WHERE key='persim';
UPDATE public.capture_berries SET capture_enabled=true,rpg_description='Small catch help, plus extra PokéCoins if you catch this Pokémon.' WHERE key='pinap';
UPDATE public.capture_berries SET capture_enabled=true,rpg_description='A common Berry. Small catch help.' WHERE key='rawst';
UPDATE public.capture_berries SET capture_enabled=true,rpg_description='The dependable catch Berry. A clear upgrade over common Berries.' WHERE key='razz';
UPDATE public.capture_berries SET capture_enabled=true,rpg_description='Strong catch help plus a smaller coin bonus on a successful catch.' WHERE key='silverpinap';
UPDATE public.capture_berries SET capture_enabled=true,rpg_description='Uncommon Berry. Noticeably better catch help than a common Berry.' WHERE key='sitrus';
UPDATE public.capture_berries SET capture_enabled=false,rpg_description='A tasty Berry that makes a wild Pokémon a little easier to catch.' WHERE key='wepear';
UPDATE public.capture_berries SET capture_enabled=false,rpg_description='A rich Berry that makes a wild Pokémon noticeably easier to catch.' WHERE key='wiki';
COMMIT;
