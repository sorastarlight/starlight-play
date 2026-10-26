BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $guard$ BEGIN
 IF md5(pg_get_functiondef('public.admin_save_item_identity(text,jsonb)'::regprocedure)) IS DISTINCT FROM '70d1cd1a0c8f55e56f75648601634b1a' THEN RAISE EXCEPTION 'Item writer source drift';END IF;
 IF md5(pg_get_functiondef('private.require_staff_edit()'::regprocedure)) IS DISTINCT FROM 'c84c975f7872dad626813afd273c43f8' THEN RAISE EXCEPTION 'Item permission source drift';END IF;
 IF md5(pg_get_functiondef('private.capture_ball_modifier(text,integer,boolean,timestamptz,jsonb)'::regprocedure)) IS DISTINCT FROM 'b3a0a880c4f3a14669d38e57303512c2' THEN RAISE EXCEPTION 'Ball behavior source drift';END IF;
 IF to_regclass('private.hub_item_definition_changes') IS NOT NULL OR to_regprocedure('public.admin_item_definitions_read()') IS NOT NULL OR to_regprocedure('public.admin_item_definitions_save(jsonb)') IS NOT NULL THEN RAISE EXCEPTION 'Item definitions already installed';END IF;
END $guard$;
CREATE TABLE private.hub_item_definition_changes(request_id uuid PRIMARY KEY,actor_id uuid NOT NULL,kind text NOT NULL,item_key text NOT NULL,intent jsonb NOT NULL,before_state jsonb NOT NULL,after_state jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE private.hub_item_definition_changes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.hub_item_definition_changes FROM PUBLIC,anon,authenticated;
CREATE FUNCTION private.hub_item_definition(p_kind text,p_key text) RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path='' AS $$
DECLARE r jsonb;v jsonb;
BEGIN
 IF p_kind='ball' THEN
  SELECT to_jsonb(b) INTO r FROM public.capture_balls b WHERE b.key=p_key;
  v:=jsonb_build_object('kind','ball','key',p_key,'name',r->'name','description',r->'description','rarity',r->'rarity','economicTier',r->'economic_tier','shopPrice',r->'shop_price','storeEnabled',r->'store_enabled','enabled',r->'enabled','sprite',CASE WHEN r->>'image' LIKE 'images/%' THEN r->>'image' ELSE 'images/items/'||coalesce(r->>'image','poke-ball.png') END,'baseMultiplier',r->'base_multiplier','conditionalMultiplier',r->'conditional_multiplier','conditionType',r->'condition_type','conditionConfig',r->'condition_config','guaranteedCapture',r->'guaranteed_capture');
 ELSIF p_kind='berry' THEN
  SELECT to_jsonb(b) INTO r FROM public.capture_berries b WHERE b.key=p_key;
  v:=jsonb_build_object('kind','berry','key',p_key,'name',r->'name','description',r->'rpg_description','rarity',r->'rarity','economicTier',r->'economic_tier','shopPrice',r->'shop_price','storeEnabled',r->'store_available','enabled',r->'enabled','sprite',CASE WHEN r->>'sprite' LIKE 'images/%' THEN r->>'sprite' ELSE 'images/items/'||coalesce(r->>'sprite','oran-berry.png') END,'baseMultiplier',r->'capture_multiplier','rewardBonus',r->'reward_bonus');
 ELSE RAISE EXCEPTION 'Unknown item type' USING ERRCODE='22023';END IF;
 IF r IS NULL THEN RAISE EXCEPTION 'Item not found' USING ERRCODE='22023';END IF;
 RETURN v||jsonb_build_object('revision',md5(r::text));
END $$;
REVOKE ALL ON FUNCTION private.hub_item_definition(text,text) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.admin_item_definitions_read() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
 PERFORM private.require_staff_edit();IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Staff session required' USING ERRCODE='42501';END IF;
 SELECT coalesce(jsonb_agg(x.row ORDER BY x.row->>'name',x.row->>'kind',x.row->>'key'),'[]') INTO result FROM(
 SELECT private.hub_item_definition('ball',key) row FROM public.capture_balls
 UNION ALL SELECT private.hub_item_definition('berry',key) FROM public.capture_berries)x;
 IF jsonb_array_length(result)>500 THEN RAISE EXCEPTION 'Item list exceeds supported size';END IF;
 RETURN jsonb_build_object('ok',true,'items',result);
END $$;
REVOKE ALL ON FUNCTION public.admin_item_definitions_read() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_item_definitions_read() TO authenticated;
CREATE FUNCTION public.admin_item_definitions_save(p_intent jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid();request uuid;k text;kind text;before_v jsonb;after_v jsonb;changes jsonb;entry record;v numeric;cfg jsonb;ct text;map jsonb;merged jsonb;old private.hub_item_definition_changes%ROWTYPE;b public.capture_balls%ROWTYPE;r public.capture_berries%ROWTYPE;
BEGIN
 PERFORM private.require_staff_edit();IF actor IS NULL THEN RAISE EXCEPTION 'Staff session required' USING ERRCODE='42501';END IF;
 IF jsonb_typeof(p_intent) IS DISTINCT FROM 'object' OR (SELECT array_agg(key ORDER BY key) FROM jsonb_object_keys(p_intent) key) IS DISTINCT FROM ARRAY['changes','key','kind','reason','requestId','revision'] THEN RAISE EXCEPTION 'Review item changes' USING ERRCODE='22023';END IF;
 IF jsonb_typeof(p_intent->'key') IS DISTINCT FROM 'string' OR (p_intent->>'key') !~ '^[a-z0-9_]{1,64}$' OR jsonb_typeof(p_intent->'kind') IS DISTINCT FROM 'string' OR p_intent->>'kind' NOT IN ('ball','berry') OR jsonb_typeof(p_intent->'reason') IS DISTINCT FROM 'string' OR length(btrim(p_intent->>'reason')) NOT BETWEEN 3 AND 1000 OR jsonb_typeof(p_intent->'revision') IS DISTINCT FROM 'string' OR (p_intent->>'revision') !~ '^[a-f0-9]{32}$' THEN RAISE EXCEPTION 'Choose an item and add a staff reason' USING ERRCODE='22023';END IF;
 BEGIN request:=(p_intent->>'requestId')::uuid;EXCEPTION WHEN invalid_text_representation THEN RAISE EXCEPTION 'Invalid review reference' USING ERRCODE='22023';END;
 IF request IS NULL THEN RAISE EXCEPTION 'Missing review reference' USING ERRCODE='22023';END IF;
 IF NOT pg_try_advisory_xact_lock(hashtextextended('hub-item-definitions',0)) THEN RAISE EXCEPTION 'Another item edit is in progress;reload before saving' USING ERRCODE='55P03';END IF;
 SELECT * INTO old FROM private.hub_item_definition_changes WHERE request_id=request;
 IF FOUND THEN IF old.actor_id IS DISTINCT FROM actor OR old.intent IS DISTINCT FROM p_intent THEN RAISE EXCEPTION 'Review reference already used' USING ERRCODE='22023';END IF;RETURN jsonb_build_object('ok',true,'requestId',request,'item',old.after_state,'replayed',true);END IF;
 k:=p_intent->>'key';kind:=p_intent->>'kind';changes:=p_intent->'changes';
 IF kind='ball' THEN SELECT * INTO b FROM public.capture_balls WHERE key=k FOR UPDATE NOWAIT;ELSE SELECT * INTO r FROM public.capture_berries WHERE key=k FOR UPDATE NOWAIT;END IF;
 before_v:=private.hub_item_definition(kind,k);
 IF before_v->>'revision' IS DISTINCT FROM p_intent->>'revision' THEN RAISE EXCEPTION 'Item changed;reload before saving' USING ERRCODE='40001';END IF;
 IF jsonb_typeof(changes) IS DISTINCT FROM 'object' OR changes='{}'::jsonb OR (kind='ball' AND EXISTS(SELECT 1 FROM jsonb_object_keys(changes) x WHERE x<>ALL(ARRAY['name','description','rarity','economicTier','shopPrice','storeEnabled','baseMultiplier','conditionalMultiplier','conditionType','conditionConfig']))) OR (kind='berry' AND EXISTS(SELECT 1 FROM jsonb_object_keys(changes) x WHERE x<>ALL(ARRAY['name','description','rarity','economicTier','shopPrice','storeEnabled','baseMultiplier','rewardBonus']))) THEN RAISE EXCEPTION 'Unsupported item fields' USING ERRCODE='22023';END IF;
 IF NOT EXISTS(SELECT 1 FROM jsonb_each(changes) x WHERE before_v->x.key IS DISTINCT FROM x.value) THEN RAISE EXCEPTION 'There are no changes to save' USING ERRCODE='22023';END IF;
 FOR entry IN SELECT key,value FROM jsonb_each(changes) LOOP
  IF entry.key IN ('name','description','rarity','economicTier','conditionType') THEN
   IF jsonb_typeof(entry.value) IS DISTINCT FROM 'string' OR length(entry.value#>>'{}')>(CASE WHEN entry.key='description' THEN 1000 WHEN entry.key='name' THEN 120 ELSE 60 END) OR (entry.key<>'description' AND length(btrim(entry.value#>>'{}'))=0) THEN RAISE EXCEPTION 'Invalid item text' USING ERRCODE='22023';END IF;
  ELSIF entry.key='storeEnabled' THEN
   IF jsonb_typeof(entry.value) IS DISTINCT FROM 'boolean' OR (k='masterball' AND entry.value='true'::jsonb) THEN RAISE EXCEPTION 'Master Balls are for staff gifts and Pass rewards only' USING ERRCODE='22023';END IF;
  ELSIF entry.key='conditionConfig' THEN
   IF jsonb_typeof(entry.value) IS DISTINCT FROM 'object' OR length(entry.value::text)>8192 THEN RAISE EXCEPTION 'Invalid item condition' USING ERRCODE='22023';END IF;
  ELSE
   IF entry.value='null'::jsonb AND entry.key IN ('shopPrice','conditionalMultiplier') THEN CONTINUE;END IF;
   IF jsonb_typeof(entry.value) IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'Use numbers for item effects and price' USING ERRCODE='22023';END IF;
   v:=(entry.value#>>'{}')::numeric;
   IF (entry.key='shopPrice' AND (v<0 OR v>2147483647 OR trunc(v)<>v)) OR (entry.key='baseMultiplier' AND (v<(CASE WHEN kind='ball' THEN 0.5 ELSE 1 END) OR v>(CASE WHEN kind='ball' THEN 5 ELSE 2 END))) OR (entry.key='conditionalMultiplier' AND (v<0.5 OR v>5)) OR (entry.key='rewardBonus' AND (v<0 OR v>2)) THEN RAISE EXCEPTION 'Item value outside supported range' USING ERRCODE='22023';END IF;
  END IF;
 END LOOP;
 IF kind='ball' THEN
  ct:=coalesce(changes->>'conditionType',before_v->>'conditionType');cfg:=coalesce(changes->'conditionConfig',before_v->'conditionConfig');
  IF ct<>ALL(ARRAY['NONE','TARGET_TYPE','NIGHT','PLAYER_OWNS_SPECIES','THROW_EARLY','THROW_LATE','TRAINER_LEVEL_GTE','TARGET_GENDERED','SPECIES_CATCH_RATE_MIN','SPECIES_BASE_SPEED_MIN','MOON_STONE_FAMILY','SPECIES_WEIGHT_TIERS']) THEN
   IF ct IS DISTINCT FROM before_v->>'conditionType' OR cfg IS DISTINCT FROM before_v->'conditionConfig' THEN RAISE EXCEPTION 'This condition is not active in this release' USING ERRCODE='22023';END IF;
  ELSE
   IF EXISTS(SELECT 1 FROM jsonb_each(cfg) x WHERE x.key<>ALL(ARRAY['types','startHour','endHour','min','maxProgress','minProgress','minLevel','tiers']) AND x.value IS DISTINCT FROM (before_v->'conditionConfig')->x.key) THEN RAISE EXCEPTION 'Unsupported condition detail' USING ERRCODE='22023';END IF;
   IF ct='TARGET_TYPE' THEN
    IF jsonb_typeof(cfg->'types') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Choose target types' USING ERRCODE='22023';END IF;
    IF jsonb_array_length(cfg->'types') NOT BETWEEN 1 AND 18 OR EXISTS(SELECT 1 FROM jsonb_array_elements(cfg->'types') t WHERE jsonb_typeof(t)<>'string' OR (t#>>'{}')<>ALL(ARRAY['normal','fire','water','electric','grass','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy'])) THEN RAISE EXCEPTION 'Choose supported target types' USING ERRCODE='22023';END IF;
   END IF;
   IF ct='SPECIES_WEIGHT_TIERS' THEN
    IF jsonb_typeof(cfg->'tiers') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Add a weight tier' USING ERRCODE='22023';END IF;
    IF jsonb_array_length(cfg->'tiers') NOT BETWEEN 1 AND 16 THEN RAISE EXCEPTION 'Use 1 to16 weight tiers' USING ERRCODE='22023';END IF;
    FOR entry IN SELECT value FROM jsonb_array_elements(cfg->'tiers') LOOP
     IF jsonb_typeof(entry.value) IS DISTINCT FROM 'object' OR (SELECT array_agg(key ORDER BY key) FROM jsonb_object_keys(entry.value) key) IS DISTINCT FROM ARRAY['minKg','multiplier'] OR jsonb_typeof(entry.value->'minKg') IS DISTINCT FROM 'number' OR jsonb_typeof(entry.value->'multiplier') IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'Review weight tiers' USING ERRCODE='22023';END IF;
     IF (entry.value->>'minKg')::numeric NOT BETWEEN 0 AND 100000 OR (entry.value->>'multiplier')::numeric NOT BETWEEN 0.5 AND 5 THEN RAISE EXCEPTION 'Weight tier outside supported range' USING ERRCODE='22023';END IF;
    END LOOP;
    IF (SELECT count(DISTINCT (t->>'minKg')::numeric) FROM jsonb_array_elements(cfg->'tiers') t)<>jsonb_array_length(cfg->'tiers') THEN RAISE EXCEPTION 'Use different minimum weights for each tier' USING ERRCODE='22023';END IF;
   END IF;
   FOR entry IN SELECT key,value FROM jsonb_each(cfg) WHERE key=ANY(CASE ct WHEN 'NIGHT' THEN ARRAY['startHour','endHour'] WHEN 'SPECIES_CATCH_RATE_MIN' THEN ARRAY['min'] WHEN 'SPECIES_BASE_SPEED_MIN' THEN ARRAY['min'] WHEN 'THROW_EARLY' THEN ARRAY['maxProgress'] WHEN 'THROW_LATE' THEN ARRAY['minProgress'] WHEN 'TRAINER_LEVEL_GTE' THEN ARRAY['minLevel'] ELSE '{}'::text[] END) LOOP
    IF jsonb_typeof(entry.value) IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'Use numeric condition values' USING ERRCODE='22023';END IF;
    v:=(entry.value#>>'{}')::numeric;
    IF (entry.key IN ('startHour','endHour') AND (v<0 OR v>23 OR trunc(v)<>v)) OR (entry.key='min' AND (v<0 OR v>255 OR trunc(v)<>v)) OR (entry.key IN ('maxProgress','minProgress') AND (v<0 OR v>1)) OR (entry.key='minLevel' AND (v<1 OR v>100 OR trunc(v)<>v)) THEN RAISE EXCEPTION 'Condition value outside supported range' USING ERRCODE='22023';END IF;
   END LOOP;
  END IF;
 END IF;
 map:='{"name":"name","description":"description","rarity":"rarity","economicTier":"economic_tier","shopPrice":"shop_price","storeEnabled":"store_enabled","baseMultiplier":"base_multiplier","conditionalMultiplier":"conditional_multiplier","conditionType":"condition_type","conditionConfig":"condition_config"}';
 IF kind='berry' THEN map:=map||'{"description":"rpg_description","storeEnabled":"store_available","baseMultiplier":"capture_multiplier","rewardBonus":"reward_bonus"}';END IF;
 SELECT jsonb_object_agg(map->>key,value) INTO merged FROM jsonb_each(changes);
 IF kind='ball' THEN
  b:=jsonb_populate_record(b,merged);
  UPDATE public.capture_balls SET name=b.name,description=b.description,rarity=b.rarity,economic_tier=b.economic_tier,shop_price=b.shop_price,store_enabled=b.store_enabled,base_multiplier=b.base_multiplier,conditional_multiplier=b.conditional_multiplier,condition_type=b.condition_type,condition_config=b.condition_config,updated_at=now() WHERE key=k;
 ELSE
  r:=jsonb_populate_record(r,merged);
  UPDATE public.capture_berries SET name=r.name,rpg_description=r.rpg_description,rarity=r.rarity,economic_tier=r.economic_tier,shop_price=r.shop_price,store_available=r.store_available,capture_multiplier=r.capture_multiplier,reward_bonus=r.reward_bonus,updated_at=now() WHERE key=k;
 END IF;
 after_v:=private.hub_item_definition(kind,k);
 INSERT INTO private.hub_item_definition_changes(request_id,actor_id,kind,item_key,intent,before_state,after_state)VALUES(request,actor,kind,k,p_intent,before_v,after_v);
 RETURN jsonb_build_object('ok',true,'requestId',request,'item',after_v,'replayed',false);
END $$;
REVOKE ALL ON FUNCTION public.admin_item_definitions_save(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_item_definitions_save(jsonb) TO authenticated;
CREATE OR REPLACE FUNCTION public.admin_save_item_identity(p_key text,p_row jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN PERFORM private.require_staff_edit();RAISE EXCEPTION 'Open Items & Economy / Item effects to review this change' USING ERRCODE='22023';END $$;
COMMIT;
