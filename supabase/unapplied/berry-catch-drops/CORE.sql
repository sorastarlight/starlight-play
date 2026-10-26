-- Candidate only. Installation initially disables new reward creation.
CREATE TABLE private.berry_drop_policy(singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton), enabled boolean NOT NULL DEFAULT false, activated_at timestamptz);
CREATE TABLE private.berry_drop_pool(item_key text PRIMARY KEY, label text NOT NULL, bucket text NOT NULL CHECK(bucket IN('everyday','better','rare','evolution','premium')), unit_cost numeric NOT NULL CHECK(unit_cost>0), enabled boolean NOT NULL DEFAULT true);
CREATE TABLE private.berry_drop_receipts(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), round_id uuid NOT NULL, user_id uuid NOT NULL,
 species_name text NOT NULL, outcome text NOT NULL CHECK(outcome IN('catch','miss')),
 xp_before integer NOT NULL CHECK(xp_before>=0), berry_key text, berry_rarity text,
 drop_chance numeric NOT NULL CHECK(drop_chance BETWEEN 0 AND 1), roll numeric CHECK(roll>=0 AND roll<1),
 bucket_roll numeric CHECK(bucket_roll>=0 AND bucket_roll<1), item_roll numeric CHECK(item_roll>=0 AND item_roll<1),
 item_key text, item_label text, status text NOT NULL CHECK(status IN('none','pending','delivered')),
 created_at timestamptz NOT NULL DEFAULT now(), delivered_at timestamptz,
 UNIQUE(round_id,user_id), CHECK((status='none' AND item_key IS NULL) OR (status<>'none' AND item_key IS NOT NULL))
);
CREATE INDEX berry_drop_pending_user ON private.berry_drop_receipts(user_id,created_at,id) WHERE status='pending';
ALTER TABLE private.berry_drop_policy ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.berry_drop_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.berry_drop_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.berry_drop_policy,private.berry_drop_pool,private.berry_drop_receipts FROM PUBLIC,anon,authenticated,service_role;
INSERT INTO private.berry_drop_policy(singleton) VALUES(true);

CREATE FUNCTION private.berry_drop_probability(p_xp integer) RETURNS numeric LANGUAGE plpgsql STABLE SET search_path='' AS $body$
DECLARE points integer[]:=ARRAY[0,private.xp_to_reach_level(3),private.xp_to_reach_level(5),private.xp_to_reach_level(8),private.xp_to_reach_level(10)]; rates numeric[]:=ARRAY[.90,.75,.60,.45,.35]; i integer;
BEGIN
 IF p_xp IS NULL OR p_xp<0 THEN RAISE EXCEPTION 'Invalid trainer XP'; END IF;
 FOR i IN 2..5 LOOP
  IF points[i]<=points[i-1] THEN RAISE EXCEPTION 'Invalid progression curve'; END IF;
  IF p_xp<=points[i] THEN RETURN rates[i-1]+(rates[i]-rates[i-1])*(p_xp-points[i-1])/(points[i]-points[i-1]); END IF;
 END LOOP;
 RETURN .35;
END;$body$;

CREATE FUNCTION private.deliver_berry_drop(p_id uuid,p_uid uuid) RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $body$
DECLARE receipt private.berry_drop_receipts; inv public.inventories; result jsonb; title text;
BEGIN
 -- All callers lock profile, then receipt, then inventory in the same order.
 PERFORM 1 FROM public.profiles WHERE id=p_uid FOR UPDATE;
 SELECT * INTO receipt FROM private.berry_drop_receipts WHERE id=p_id AND user_id=p_uid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Reward not found' USING ERRCODE='42501'; END IF;
 IF receipt.status<>'pending' THEN RETURN jsonb_build_object('ok',true,'status',receipt.status,'id',receipt.id); END IF;
 PERFORM private.ensure_inventory(p_uid);
 SELECT * INTO inv FROM public.inventories WHERE user_id=p_uid FOR UPDATE;
 IF private.item_total(inv)>=private.bag_capacity(p_uid) THEN RETURN jsonb_build_object('ok',true,'status','pending','id',receipt.id); END IF;
 result:=private.grant_items(p_uid,jsonb_build_object(receipt.item_key,1),'BERRY_CATCH_DROP',receipt.round_id::text,'berry-drop:'||receipt.id::text,true);
 IF coalesce((result->>'duplicate')::boolean,false) OR result->'granted' IS DISTINCT FROM jsonb_build_object(receipt.item_key,1) THEN RAISE EXCEPTION 'Reward delivery receipt mismatch'; END IF;
 UPDATE private.berry_drop_receipts SET status='delivered',delivered_at=now() WHERE id=p_id;
 title:=CASE WHEN receipt.outcome='miss' THEN receipt.species_name||' escaped!' ELSE receipt.species_name||' dropped an item during the catch!' END;
 PERFORM private.push_notice(p_uid,'loot',title,'You received '||receipt.item_label||' ×1.',jsonb_build_object('rewards',jsonb_build_object(receipt.item_key,1),'source','berry-drop:'||receipt.id::text));
 RETURN jsonb_build_object('ok',true,'status','delivered','id',receipt.id,'item',receipt.item_key,'quantity',1);
END;$body$;

CREATE FUNCTION private.record_berry_drop(p_round uuid,p_uid uuid) RETURNS void LANGUAGE plpgsql SET search_path='' AS $body$
DECLARE cfg private.berry_drop_policy; cap public.capture_log; ep public.encounter_players; xp integer;
 receipt_id uuid; chance numeric; roll numeric; bucket_roll numeric; item_roll numeric; rarity text;
 chosen private.berry_drop_pool; weights numeric[]; buckets text[]:=ARRAY['everyday','better','rare','evolution','premium']; target text; acc numeric:=0; i integer; result jsonb; n integer;
BEGIN
 SELECT * INTO cfg FROM private.berry_drop_policy WHERE singleton;
 IF cfg.enabled IS DISTINCT FROM true OR cfg.activated_at IS NULL OR private.round_is_test(p_round)
 OR NOT EXISTS(SELECT 1 FROM public.encounter_rounds WHERE id=p_round AND NOT cancelled AND coalesce(trigger_source,'')<>'TEST' AND coalesce(rules->>'rewardMode','live')<>'test') THEN RETURN; END IF;
 SELECT * INTO cap FROM public.capture_log WHERE round_id=p_round AND user_id=p_uid;
 SELECT * INTO ep FROM public.encounter_players WHERE round_id=p_round AND user_id=p_uid;
 IF cap.round_id IS NULL OR cap.created_at<cfg.activated_at OR cap.success IS NULL OR cap.ball_key IS NULL OR ep.ball IS NULL OR ep.throw_processed IS DISTINCT FROM true
    OR ep.result_reason IS DISTINCT FROM (CASE WHEN cap.success THEN 'caught' ELSE 'escaped' END)
    OR ep.ball IS DISTINCT FROM cap.ball_key THEN RETURN; END IF;
 SELECT greatest(coalesce(p.xp,0),0) INTO xp FROM public.profiles p WHERE p.id=p_uid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Trainer profile missing'; END IF;
 IF EXISTS(SELECT 1 FROM private.berry_drop_receipts WHERE round_id=p_round AND user_id=p_uid) THEN RETURN; END IF;
 IF NOT cap.success THEN
  chance:=1; chosen.item_key:='pokeball';chosen.label:='Poké Ball';
 ELSE
  SELECT b.rarity INTO rarity FROM public.capture_berries b WHERE b.key=cap.berry_key AND b.enabled AND b.capture_enabled AND b.key=ep.prep;
  IF NOT FOUND THEN RETURN; END IF;
  weights:=CASE rarity WHEN 'common' THEN ARRAY[.70,.25,.04,.01,0] WHEN 'uncommon' THEN ARRAY[.55,.30,.10,.04,.01] WHEN 'rare' THEN ARRAY[.40,.35,.15,.08,.02] WHEN 'epic' THEN ARRAY[.25,.35,.22,.13,.05] ELSE NULL END;
  IF weights IS NULL THEN RAISE EXCEPTION 'Unsupported berry rarity'; END IF;
  chance:=private.berry_drop_probability(xp);roll:=private.secure_random();
  IF roll<chance THEN
   bucket_roll:=private.secure_random();item_roll:=private.secure_random();
   FOR i IN 1..5 LOOP acc:=acc+weights[i];IF bucket_roll<acc THEN target:=buckets[i];EXIT;END IF;END LOOP;
   SELECT count(*) INTO n FROM private.berry_drop_pool WHERE bucket=target AND enabled;
   IF n=0 THEN RAISE EXCEPTION 'Berry reward pool is empty'; END IF;
   SELECT * INTO chosen FROM private.berry_drop_pool WHERE bucket=target AND enabled ORDER BY item_key OFFSET floor(item_roll*n)::integer LIMIT 1;
  END IF;
 END IF;
 INSERT INTO private.berry_drop_receipts(round_id,user_id,species_name,outcome,xp_before,berry_key,berry_rarity,drop_chance,roll,bucket_roll,item_roll,item_key,item_label,status)
 VALUES(p_round,p_uid,coalesce(nullif(cap.species_name,''),'The Pokémon'),CASE WHEN cap.success THEN 'catch' ELSE 'miss' END,xp,cap.berry_key,rarity,chance,roll,bucket_roll,item_roll,chosen.item_key,chosen.label,CASE WHEN chosen.item_key IS NULL THEN 'none' ELSE 'pending' END)
 RETURNING id INTO receipt_id;
 IF chosen.item_key IS NOT NULL THEN
  result:=private.deliver_berry_drop(receipt_id,p_uid);
  IF result->>'status'='pending' THEN PERFORM private.push_notice(p_uid,'loot','A catch reward is waiting',chosen.label||' ×1 is saved for you. Make room in your inventory, then collect it.',jsonb_build_object('source','berry-drop-pending:'||receipt_id::text)); END IF;
 END IF;
END;$body$;

CREATE FUNCTION public.play_pending_catch_rewards() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $body$
DECLARE uid uuid:=auth.uid(); items jsonb;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Sign in first' USING ERRCODE='42501'; END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY created_at,id),'[]') INTO items FROM
 (SELECT id,item_key AS item,item_label AS label,species_name AS pokemon,outcome,created_at FROM private.berry_drop_receipts WHERE user_id=uid AND status='pending' ORDER BY created_at,id LIMIT 50) r;
 RETURN jsonb_build_object('ok',true,'items',items,'dropChance',private.berry_drop_probability((SELECT greatest(coalesce(xp,0),0) FROM public.profiles WHERE id=uid)));
END;$body$;
CREATE FUNCTION public.play_claim_catch_reward(p_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $body$
DECLARE uid uuid:=auth.uid();
BEGIN IF uid IS NULL THEN RAISE EXCEPTION 'Sign in first' USING ERRCODE='42501'; END IF; RETURN private.deliver_berry_drop(p_id,uid); END;$body$;
REVOKE ALL ON FUNCTION private.berry_drop_probability(integer),private.deliver_berry_drop(uuid,uuid),private.record_berry_drop(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.play_pending_catch_rewards(),public.play_claim_catch_reward(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.play_pending_catch_rewards(),public.play_claim_catch_reward(uuid) TO authenticated,service_role;
