BEGIN;
DO $guard$ BEGIN
IF md5(pg_get_functiondef('private.award_encounter_rewards(uuid,uuid,boolean,text,jsonb)'::regprocedure)) <> '54c0e340d6fe6020f5cd14876c5d82af' THEN RAISE EXCEPTION 'Source drift: private.award_encounter_rewards(uuid,uuid,boolean,text,jsonb)'; END IF;
IF md5(pg_get_functiondef('private.grant_known(uuid,jsonb)'::regprocedure)) <> 'edde2ae6585e945c0bf7c2c090129281' THEN RAISE EXCEPTION 'Source drift: private.grant_known(uuid,jsonb)'; END IF;
IF md5(pg_get_functiondef('private.grant_items(uuid,jsonb,text,text,text,boolean)'::regprocedure)) <> '78553b9a85ebbda73c78f5d1c0da1156' THEN RAISE EXCEPTION 'Source drift: private.grant_items(uuid,jsonb,text,text,text,boolean)'; END IF;
IF md5(pg_get_functiondef('private.settle_if_needed(public.encounter_rounds)'::regprocedure)) <> '1c6f5a0dbb09ad059878d9b790bebe69' THEN RAISE EXCEPTION 'Source drift: private.settle_if_needed(public.encounter_rounds)'; END IF;
END $guard$;
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

INSERT INTO private.berry_drop_pool(item_key,label,bucket,unit_cost) VALUES
('aspear','Aspear Berry','everyday',60),
('cheri','Cheri Berry','everyday',60),
('chesto','Chesto Berry','everyday',60),
('nanab','Nanab Berry','everyday',60),
('berry','Oran Berry','everyday',60),
('pecha','Pecha Berry','everyday',60),
('rawst','Rawst Berry','everyday',60),
('lure','Poké Radar','everyday',80),
('featherball','Feather Ball','better',100),
('friendball','Friend Ball','better',100),
('healball','Heal Ball','better',100),
('hisuiheavyball','Hisui Heavy Ball','better',100),
('hisuipokeball','Hisui Poké Ball','better',100),
('luxuryball','Luxury Ball','better',100),
('pokeball','Poké Ball','everyday',100),
('premierball','Premier Ball','better',100),
('oldball','Old Ball','better',110),
('strangeball','Strange Ball','better',110),
('ashball','Ash''s Poké Ball','better',125),
('cherishball','Cherish Ball','better',125),
('cloneball','Clone Ball','better',125),
('darkball','Dark Ball','better',125),
('gsball','GS Ball','better',125),
('bait','Honey','everyday',125),
('safariball','Safari Ball','better',125),
('sportball','Sport Ball','better',125),
('lum','Lum Berry','better',150),
('originball','Origin Ball','better',150),
('sitrus','Sitrus Berry','better',150),
('pinap','Pinap Berry','better',175),
('razz','Razz Berry','rare',200),
('greatball','Great Ball','rare',225),
('hisuigreatball','Hisui Great Ball','rare',225),
('leadenball','Leaden Ball','rare',225),
('wingball','Wing Ball','rare',225),
('nestball','Nest Ball','rare',275),
('diveball','Dive Ball','rare',300),
('levelball','Level Ball','rare',300),
('loveball','Love Ball','rare',300),
('lureball','Lure Ball','rare',300),
('netball','Net Ball','rare',300),
('timerball','Timer Ball','rare',300),
('duskball','Dusk Ball','rare',325),
('fastball','Fast Ball','rare',325),
('heavyball','Heavy Ball','rare',325),
('moonball','Moon Ball','rare',325),
('firestone','Fire Stone','evolution',350),
('leafstone','Leaf Stone','evolution',350),
('quickball','Quick Ball','rare',350),
('repeatball','Repeat Ball','rare',350),
('thunderstone','Thunder Stone','evolution',350),
('waterstone','Water Stone','evolution',350),
('silverpinap','Silver Pinap Berry','premium',400),
('moonstone','Moon Stone','evolution',450),
('gigatonball','Gigaton Ball','rare',500),
('goldenrazz','Golden Razz Berry','premium',500),
('hisuiultraball','Hisui Ultra Ball','rare',500),
('jetball','Jet Ball','rare',500),
('ultraball','Ultra Ball','rare',500),
('linkingcord','Linking Cord','evolution',600);
DO $source$ BEGIN EXECUTE convert_from(decode('Q1JFQVRFIE9SIFJFUExBQ0UgRlVOQ1RJT04gcHJpdmF0ZS5hd2FyZF9lbmNvdW50ZXJfcmV3YXJkcyhwX3JvdW5kIHV1aWQsIHBfdWlkIHV1aWQsIHBfY2F1Z2h0IGJvb2xlYW4sIHBfYmFsbCB0ZXh0LCBwX2NhbGMganNvbmIpCiBSRVRVUk5TIHZvaWQKIExBTkdVQUdFIHBscGdzcWwKQVMgJGZ1bmN0aW9uJApkZWNsYXJlCiAgY2ZnIGpzb25iIDo9IHByaXZhdGUuZWNvbm9teV9jb25maWcoKTsKICBwY2ZnIGpzb25iIDo9IHByaXZhdGUucHJvZ3Jlc3Npb25fY29uZmlnKCk7CiAgciBwdWJsaWMuZW5jb3VudGVyX3JvdW5kczsKICBwYXkgaW50OwogIGZpcnN0X3NwZWNpZXMgYm9vbGVhbjsKICBmaXJzdF9mZW1hbGUgYm9vbGVhbjsKICBmaXJzdF9zaGlueSBib29sZWFuOwogIHN0cmVhbV9kYXkgdGV4dDsKICBzdCBwdWJsaWMudHJhaW5lcl9zdGF0czsKICBob25leV91c2VkIGJvb2xlYW4gOj0gZmFsc2U7CmJlZ2luCiAgaWYgcHJpdmF0ZS5yb3VuZF9pc190ZXN0KHBfcm91bmQpIHRoZW4gcmV0dXJuOyBlbmQgaWY7CiAgc2VsZWN0ICogaW50byByIGZyb20gcHVibGljLmVuY291bnRlcl9yb3VuZHMgd2hlcmUgaWQgPSBwX3JvdW5kOwogIGlmIHIgaXMgbnVsbCB0aGVuIHJldHVybjsgZW5kIGlmOwogIHBlcmZvcm0gcHJpdmF0ZS5yZWNvcmRfYmVycnlfZHJvcChwX3JvdW5kLHBfdWlkKTsKICBzdCA6PSBwcml2YXRlLmVuc3VyZV90cmFpbmVyX3N0YXRzKHBfdWlkKTsKICBzZWxlY3QgcHJlcCA9ICdiYWl0JyBpbnRvIGhvbmV5X3VzZWQgZnJvbSBwdWJsaWMuZW5jb3VudGVyX3BsYXllcnMgd2hlcmUgcm91bmRfaWQgPSBwX3JvdW5kIGFuZCB1c2VyX2lkID0gcF91aWQ7CiAgcGVyZm9ybSBwcml2YXRlLmdyYW50X3hwKAogICAgcF91aWQsIGNvYWxlc2NlKChwY2ZnLT4+J2pvaW5YcCcpOjppbnQsIDUpLCAnRU5DT1VOVEVSJywgJ0pvaW5lZCBhbmQgZmluaXNoZWQgdGhlIGVuY291bnRlcicsCiAgICBqc29uYl9idWlsZF9vYmplY3QoJ2lkZW1wb3RlbmN5JywgJ3hwLXBhcnQ6JyB8fCBwX3JvdW5kOjp0ZXh0IHx8ICc6JyB8fCBwX3VpZDo6dGV4dCwgJ3JlbGF0ZWRSb3VuZCcsIHBfcm91bmQ6OnRleHQpCiAgKTsKICBpbnNlcnQgaW50byBwdWJsaWMudHJhaW5lcl9taWxlc3RvbmVzICh1c2VyX2lkLCBrZXkpCiAgdmFsdWVzIChwX3VpZCwgJ3N0YXQ6JyB8fCBwX3JvdW5kOjp0ZXh0IHx8ICc6JyB8fCBwX3VpZDo6dGV4dCkKICBvbiBjb25mbGljdCBkbyBub3RoaW5nOwogIGlmIGZvdW5kIHRoZW4KICAgIHVwZGF0ZSBwdWJsaWMudHJhaW5lcl9zdGF0cwogICAgICAgc2V0IGVuY291bnRlcnMgPSBlbmNvdW50ZXJzICsgMSwKICAgICAgICAgICBob25leSA9IGhvbmV5ICsgY2FzZSB3aGVuIGhvbmV5X3VzZWQgdGhlbiAxIGVsc2UgMCBlbmQsCiAgICAgICAgICAgY2FwdHVyZXMgPSBjYXB0dXJlcyArIGNhc2Ugd2hlbiBwX2NhdWdodCB0aGVuIDEgZWxzZSAwIGVuZCwKICAgICAgICAgICBmYWlscyA9IGZhaWxzICsgY2FzZSB3aGVuIHBfY2F1Z2h0IHRoZW4gMCBlbHNlIDEgZW5kLAogICAgICAgICAgIGNhdGNoX3N0cmVhayA9IGNhc2Ugd2hlbiBwX2NhdWdodCB0aGVuIGNhdGNoX3N0cmVhayArIDEgZWxzZSAwIGVuZCwKICAgICAgICAgICBmYWlsX3N0cmVhayA9IGNhc2Ugd2hlbiBwX2NhdWdodCB0aGVuIDAgZWxzZSBmYWlsX3N0cmVhayArIDEgZW5kLAogICAgICAgICAgIGJlc3RfY2F0Y2hfc3RyZWFrID0gY2FzZSB3aGVuIHBfY2F1Z2h0IHRoZW4gZ3JlYXRlc3QoYmVzdF9jYXRjaF9zdHJlYWssIGNhdGNoX3N0cmVhayArIDEpIGVsc2UgYmVzdF9jYXRjaF9zdHJlYWsgZW5kLAogICAgICAgICAgIGJlc3RfZmFpbF9zdHJlYWsgPSBjYXNlIHdoZW4gbm90IHBfY2F1Z2h0IHRoZW4gZ3JlYXRlc3QoYmVzdF9mYWlsX3N0cmVhaywgZmFpbF9zdHJlYWsgKyAxKSBlbHNlIGJlc3RfZmFpbF9zdHJlYWsgZW5kLAogICAgICAgICAgIG9wdGltYWxfY2F0Y2hlcyA9IG9wdGltYWxfY2F0Y2hlcyArIGNhc2UKICAgICAgICAgICAgIHdoZW4gcF9jYXVnaHQgYW5kIGNvYWxlc2NlKChwX2NhbGMtPidiYWxsJy0+Pidjb25kaXRpb25NZXQnKTo6Ym9vbGVhbiwgZmFsc2UpCiAgICAgICAgICAgICAgICAgIGFuZCBjb2FsZXNjZShwX2NhbGMtPidiYWxsJy0+PidrZXknLCBwX2JhbGwpIG5vdCBpbiAoJ3Bva2ViYWxsJywnZ3JlYXRiYWxsJywndWx0cmFiYWxsJywnbWFzdGVyYmFsbCcsJ3ByZW1pZXJiYWxsJykKICAgICAgICAgICAgIHRoZW4gMSBlbHNlIDAgZW5kLAogICAgICAgICAgIHVwZGF0ZWRfYXQgPSBub3coKQogICAgIHdoZXJlIHVzZXJfaWQgPSBwX3VpZDsKICBlbmQgaWY7CiAgcGF5IDo9IGNvYWxlc2NlKChjZmctPj4ncGFydGljaXBhdGlvblJld2FyZCcpOjppbnQsIDI1KTsKICBpZiBwYXkgPiAwIHRoZW4KICAgIHBlcmZvcm0gcHJpdmF0ZS5hZGp1c3RfY29pbnMocF91aWQsIHBheSwgJ0VOQ09VTlRFUl9QQVJUSUNJUEFUSU9OJywgJ0pvaW5lZCBhbmQgZmluaXNoZWQgdGhlIGVuY291bnRlcicsCiAgICAgIGpzb25iX2J1aWxkX29iamVjdCgnaWRlbXBvdGVuY3knLCAncGFydDonIHx8IHBfcm91bmQ6OnRleHQgfHwgJzonIHx8IHBfdWlkOjp0ZXh0LCAncmVsYXRlZFJvdW5kJywgcF9yb3VuZDo6dGV4dCkpOwogIGVuZCBpZjsKICBzdHJlYW1fZGF5IDo9IHRvX2NoYXIocHJpdmF0ZS5hcHBfdG9kYXkoKSwgJ1lZWVktTU0tREQnKTsKICBwYXkgOj0gY29hbGVzY2UoKGNmZy0+PidzdHJlYW1BdHRlbmRhbmNlUmV3YXJkJyk6OmludCwgNTApOwogIGlmIHBheSA+IDAgdGhlbgogICAgcGVyZm9ybSBwcml2YXRlLmFkanVzdF9jb2lucyhwX3VpZCwgcGF5LCAnU1RSRUFNX0FUVEVOREFOQ0UnLCAnRmlyc3QgZW5jb3VudGVyIG9mIHRoZSBzdHJlYW0gZGF5JywKICAgICAganNvbmJfYnVpbGRfb2JqZWN0KCdpZGVtcG90ZW5jeScsICdzdHJlYW06JyB8fCBwX3VpZDo6dGV4dCB8fCAnOicgfHwgc3RyZWFtX2RheSwgJ3JlbGF0ZWRSb3VuZCcsIHBfcm91bmQ6OnRleHQpKTsKICBlbmQgaWY7CiAgaWYgY29hbGVzY2UoKHByaXZhdGUubG9vdF9jb25maWcoKS0+PidzdHJlYW1GaXJzdEJhbGwnKTo6aW50LCAxKSA+IDAgdGhlbgogICAgcGVyZm9ybSBwcml2YXRlLmdyYW50X2l0ZW1zKAogICAgICBwX3VpZCwganNvbmJfYnVpbGRfb2JqZWN0KCdwb2tlYmFsbCcsIChwcml2YXRlLmxvb3RfY29uZmlnKCktPj4nc3RyZWFtRmlyc3RCYWxsJyk6OmludCksCiAgICAgICdTVFJFQU1fQVRURU5EQU5DRScsIHBfcm91bmQ6OnRleHQsICdzdHJlYW0tYmFsbDonIHx8IHBfdWlkOjp0ZXh0IHx8ICc6JyB8fCBzdHJlYW1fZGF5LCBmYWxzZQogICAgKTsKICBlbmQgaWY7CiAgcGVyZm9ybSBwcml2YXRlLnRyeV9lbmNvdW50ZXJfbG9vdChwX3JvdW5kLCBwX3VpZCwgcF9jYXVnaHQsIHBfY2FsYyk7CiAgaWYgbm90IGNvYWxlc2NlKHBfY2F1Z2h0LCBmYWxzZSkgdGhlbgogICAgcGVyZm9ybSBwcml2YXRlLmV2YWx1YXRlX2FjaGlldmVtZW50cyhwX3VpZCwgdHJ1ZSk7CiAgICByZXR1cm47CiAgZW5kIGlmOwogIHBheSA6PSBmbG9vcihjb2FsZXNjZSgoY2ZnLT4+J2NhcHR1cmVSZXdhcmQnKTo6aW50LCAyNSkgKiBwcml2YXRlLnJhcml0eV9jYXB0dXJlX211bHRpcGxpZXIoKHBfY2FsYy0+PidjYXRjaFJhdGUnKTo6aW50KSk6OmludDsKICBpZiBwYXkgPiAwIHRoZW4KICAgIHBlcmZvcm0gcHJpdmF0ZS5hZGp1c3RfY29pbnMocF91aWQsIHBheSwgJ0NBUFRVUkVfUkVXQVJEJywgJ1N1Y2Nlc3NmdWwgY2F0Y2gnLAogICAgICBqc29uYl9idWlsZF9vYmplY3QoJ2lkZW1wb3RlbmN5JywgJ2NhdGNoOicgfHwgcF9yb3VuZDo6dGV4dCB8fCAnOicgfHwgcF91aWQ6OnRleHQsICdyZWxhdGVkUm91bmQnLCBwX3JvdW5kOjp0ZXh0LCAncmVsYXRlZEl0ZW0nLCBwX2JhbGwpKTsKICBlbmQgaWY7CiAgc2VsZWN0IG5vdCBleGlzdHMgKAogICAgc2VsZWN0IDEgZnJvbSBwdWJsaWMuY2F0Y2hlcyBjIHdoZXJlIGMudXNlcl9pZCA9IHBfdWlkIGFuZCBjLmRleCA9IHIuZGV4IGFuZCBjLnJvdW5kX2lkIGlzIGRpc3RpbmN0IGZyb20gcF9yb3VuZAogICkgaW50byBmaXJzdF9zcGVjaWVzOwogIGlmIGZpcnN0X3NwZWNpZXMgdGhlbgogICAgcGF5IDo9IGNvYWxlc2NlKChjZmctPj4nbmV3RGV4UmV3YXJkJyk6OmludCwgMTAwKTsKICAgIGlmIHBheSA+IDAgdGhlbgogICAgICBwZXJmb3JtIHByaXZhdGUuYWRqdXN0X2NvaW5zKHBfdWlkLCBwYXksICdORVdfREVYX0VOVFJZJywgJ0ZpcnN0IHRpbWUgY2F0Y2hpbmcgdGhpcyBzcGVjaWVzJywKICAgICAgICBqc29uYl9idWlsZF9vYmplY3QoJ2lkZW1wb3RlbmN5JywgJ2RleDonIHx8IHBfdWlkOjp0ZXh0IHx8ICc6JyB8fCByLmRleDo6dGV4dCwgJ3JlbGF0ZWRSb3VuZCcsIHBfcm91bmQ6OnRleHQpKTsKICAgIGVuZCBpZjsKICAgIHBlcmZvcm0gcHJpdmF0ZS5tYXliZV9ncmFudF9kZXhfbWlsZXN0b25lcyhwX3VpZCk7CiAgZW5kIGlmOwogIGlmIHIuZ2VuZGVyID0gJ0ZlbWFsZScgdGhlbgogICAgc2VsZWN0IG5vdCBleGlzdHMgKAogICAgICBzZWxlY3QgMSBmcm9tIHB1YmxpYy5jYXRjaGVzIGMgd2hlcmUgYy51c2VyX2lkID0gcF91aWQgYW5kIGMuZGV4ID0gci5kZXggYW5kIGMuZ2VuZGVyID0gJ0ZlbWFsZScgYW5kIGMucm91bmRfaWQgaXMgZGlzdGluY3QgZnJvbSBwX3JvdW5kCiAgICApIGludG8gZmlyc3RfZmVtYWxlOwogICAgaWYgZmlyc3RfZmVtYWxlIHRoZW4KICAgICAgcGF5IDo9IGNvYWxlc2NlKChjZmctPj4nZmlyc3RGZW1hbGVSZXdhcmQnKTo6aW50LCAyNSk7CiAgICAgIGlmIHBheSA+IDAgdGhlbgogICAgICAgIHBlcmZvcm0gcHJpdmF0ZS5hZGp1c3RfY29pbnMocF91aWQsIHBheSwgJ0ZJUlNUX0ZFTUFMRScsICdGaXJzdCBmZW1hbGUgb2YgdGhpcyBzcGVjaWVzJywKICAgICAgICAgIGpzb25iX2J1aWxkX29iamVjdCgnaWRlbXBvdGVuY3knLCAnZmVtYWxlOicgfHwgcF91aWQ6OnRleHQgfHwgJzonIHx8IHIuZGV4Ojp0ZXh0LCAncmVsYXRlZFJvdW5kJywgcF9yb3VuZDo6dGV4dCkpOwogICAgICBlbmQgaWY7CiAgICBlbmQgaWY7CiAgZW5kIGlmOwogIGlmIHByaXZhdGUudmFyaWFudF9pc19zaGlueShyLnZhcmlhbnQpIHRoZW4KICAgIHNlbGVjdCBub3QgZXhpc3RzICgKICAgICAgc2VsZWN0IDEgZnJvbSBwdWJsaWMuY2F0Y2hlcyBjIHdoZXJlIGMudXNlcl9pZCA9IHBfdWlkIGFuZCBjLmRleCA9IHIuZGV4IGFuZCBwcml2YXRlLnZhcmlhbnRfaXNfc2hpbnkoYy52YXJpYW50KSBhbmQgYy5yb3VuZF9pZCBpcyBkaXN0aW5jdCBmcm9tIHBfcm91bmQKICAgICkgaW50byBmaXJzdF9zaGlueTsKICAgIGlmIGZpcnN0X3NoaW55IHRoZW4KICAgICAgcGF5IDo9IGNvYWxlc2NlKChjZmctPj4nc2hpbnlSZXdhcmQnKTo6aW50LCAyNTApOwogICAgICBpZiBwYXkgPiAwIHRoZW4KICAgICAgICBwZXJmb3JtIHByaXZhdGUuYWRqdXN0X2NvaW5zKHBfdWlkLCBwYXksICdTSElOWV9CT05VUycsICdGaXJzdCBzaGlueSBvZiB0aGlzIHNwZWNpZXMnLAogICAgICAgICAganNvbmJfYnVpbGRfb2JqZWN0KCdpZGVtcG90ZW5jeScsICdzaGlueTonIHx8IHBfdWlkOjp0ZXh0IHx8ICc6JyB8fCByLmRleDo6dGV4dCwgJ3JlbGF0ZWRSb3VuZCcsIHBfcm91bmQ6OnRleHQpKTsKICAgICAgZW5kIGlmOwogICAgZW5kIGlmOwogIGVuZCBpZjsKICBpZiBleGlzdHMgKHNlbGVjdCAxIGZyb20gcHVibGljLnNwZWNpZXMgcyB3aGVyZSBzLmRleCA9IHIuZGV4IGFuZCBzLmlzX2xlZ2VuZGFyeSkgdGhlbgogICAgcGF5IDo9IGNvYWxlc2NlKChjZmctPj4nbGVnZW5kYXJ5UmV3YXJkJyk6OmludCwgMzUwKTsKICAgIGlmIHBheSA+IDAgdGhlbgogICAgICBwZXJmb3JtIHByaXZhdGUuYWRqdXN0X2NvaW5zKHBfdWlkLCBwYXksICdMRUdFTkRBUllfUkVXQVJEJywgJ0xlZ2VuZGFyeSBvciBNeXRoaWNhbCBjYXRjaCcsCiAgICAgICAganNvbmJfYnVpbGRfb2JqZWN0KCdpZGVtcG90ZW5jeScsICdsZWdlbmQ6JyB8fCBwX3JvdW5kOjp0ZXh0IHx8ICc6JyB8fCBwX3VpZDo6dGV4dCwgJ3JlbGF0ZWRSb3VuZCcsIHBfcm91bmQ6OnRleHQpKTsKICAgIGVuZCBpZjsKICBlbmQgaWY7CiAgcGF5IDo9IGZsb29yKGNvYWxlc2NlKChwX2NhbGMtPidiZXJyeSctPj4ncmV3YXJkQm9udXMnKTo6bnVtZXJpYywgMCkgKiBjb2FsZXNjZSgoY2ZnLT4+J3Jld2FyZEJvbnVzQ29pbnMnKTo6bnVtZXJpYywgMTApKTo6aW50OwogIGlmIHBheSA+IDAgdGhlbgogICAgcGVyZm9ybSBwcml2YXRlLmFkanVzdF9jb2lucyhwX3VpZCwgcGF5LCAnUElOQVBfQk9OVVMnLCAnUGluYXAgQmVycnkgY2F0Y2ggYm9udXMnLAogICAgICBqc29uYl9idWlsZF9vYmplY3QoJ2lkZW1wb3RlbmN5JywgJ3BpbmFwOicgfHwgcF9yb3VuZDo6dGV4dCB8fCAnOicgfHwgcF91aWQ6OnRleHQsICdyZWxhdGVkUm91bmQnLCBwX3JvdW5kOjp0ZXh0LCAncmVsYXRlZEl0ZW0nLCBwX2NhbGMtPidiZXJyeSctPj4na2V5JykpOwogIGVuZCBpZjsKICBwZXJmb3JtIHByaXZhdGUuZXZhbHVhdGVfYWNoaWV2ZW1lbnRzKHBfdWlkLCB0cnVlKTsKZW5kOwokZnVuY3Rpb24kCg==','base64'),'UTF8'); END $source$;
DO $source$ BEGIN EXECUTE convert_from(decode('Q1JFQVRFIE9SIFJFUExBQ0UgRlVOQ1RJT04gcHJpdmF0ZS5ncmFudF9rbm93bihwX3VpZCB1dWlkLCBwX2dyYW50cyBqc29uYikKIFJFVFVSTlMgdm9pZAogTEFOR1VBR0UgcGxwZ3NxbApBUyAkZnVuY3Rpb24kDQpkZWNsYXJlDQogIGludiBwdWJsaWMuaW52ZW50b3JpZXM7DQogIGNhcCBpbnQ7DQogIGFkZF9pdGVtcyBpbnQ7DQogIGFkZF9ib251cyBpbnQ7DQogIGV4dHJhX2FkZCBpbnQ7DQogIGJlcnJ5X2FkZCBpbnQ7DQogIGV2b19hZGQgaW50Ow0KICB2YWxfYWRkIGludDsNCiAgayB0ZXh0Ow0KICBuIGludDsNCiAgcm9vbSBpbnQ7DQogIHBhaWRfcm9vbSBpbnQ7DQpiZWdpbg0KICBpbnYgOj0gcHJpdmF0ZS5lbnN1cmVfaW52ZW50b3J5KHBfdWlkKTsNCiAgc2VsZWN0ICogaW50byBpbnYgZnJvbSBwdWJsaWMuaW52ZW50b3JpZXMgd2hlcmUgdXNlcl9pZD1wX3VpZCBmb3IgdXBkYXRlOw0KICBhZGRfYm9udXMgOj0gZ3JlYXRlc3QoY29hbGVzY2UoKHBfZ3JhbnRzLT4+J2JhZ19ib251cycpOjppbnQsIDApLCAwKTsNCiAgcGFpZF9yb29tIDo9IGdyZWF0ZXN0KDAsIHByaXZhdGUuYmFnX2JvbnVzX2NhcCgpIC0gY29hbGVzY2UoaW52LmJhZ19ib251cywgMCkpOw0KICByb29tIDo9IGxlYXN0KHByaXZhdGUuYmFnX2NhcGFjaXR5X21heCgpIC0gcHJpdmF0ZS5iYWdfY2FwYWNpdHkocF91aWQpLCBwYWlkX3Jvb20pOw0KICBpZiBhZGRfYm9udXMgPiAwIGFuZCByb29tIDw9IDAgdGhlbg0KICAgIHJhaXNlIGV4Y2VwdGlvbiAnQmFnIHNwYWNlIHVwZ3JhZGVzIGFyZSBhdCB0aGUgY3VycmVudCBjYXAuJzsNCiAgZW5kIGlmOw0KICBpZiBhZGRfYm9udXMgPiByb29tIHRoZW4NCiAgICBhZGRfYm9udXMgOj0gZ3JlYXRlc3Qocm9vbSwgMCk7DQogIGVuZCBpZjsNCiAgZXh0cmFfYWRkIDo9IGNvYWxlc2NlKCgNCiAgICBzZWxlY3Qgc3VtKGdyZWF0ZXN0KGNvYWxlc2NlKHZhbHVlOjppbnQsIDApLCAwKSkNCiAgICBmcm9tIGpzb25iX2VhY2hfdGV4dChjb2FsZXNjZShwX2dyYW50cywgJ3t9Jzo6anNvbmIpKQ0KICAgIHdoZXJlIGtleSA9IGFueSAocHJpdmF0ZS5leHRyYV9iYWxsX2tleXMoKSkNCiAgKSwgMCk7DQogIGJlcnJ5X2FkZCA6PSBjb2FsZXNjZSgoDQogICAgc2VsZWN0IHN1bShncmVhdGVzdChjb2FsZXNjZSh2YWx1ZTo6aW50LCAwKSwgMCkpDQogICAgZnJvbSBqc29uYl9lYWNoX3RleHQoY29hbGVzY2UocF9ncmFudHMsICd7fSc6Ompzb25iKSkNCiAgICB3aGVyZSBrZXkgPSBhbnkgKHByaXZhdGUuY2FwdHVyZV9iZXJyeV9rZXlzKCkpDQogICksIDApOw0KICBldm9fYWRkIDo9IGNvYWxlc2NlKCgNCiAgICBzZWxlY3Qgc3VtKGdyZWF0ZXN0KGNvYWxlc2NlKHZhbHVlOjppbnQsIDApLCAwKSkNCiAgICBmcm9tIGpzb25iX2VhY2hfdGV4dChjb2FsZXNjZShwX2dyYW50cywgJ3t9Jzo6anNvbmIpKQ0KICAgIHdoZXJlIGtleSA9IGFueSAocHJpdmF0ZS5ldm9faXRlbV9rZXlzKCkpDQogICksIDApOw0KICB2YWxfYWRkIDo9IGNvYWxlc2NlKCgNCiAgICBzZWxlY3Qgc3VtKGdyZWF0ZXN0KGNvYWxlc2NlKHZhbHVlOjppbnQsIDApLCAwKSkNCiAgICBmcm9tIGpzb25iX2VhY2hfdGV4dChjb2FsZXNjZShwX2dyYW50cywgJ3t9Jzo6anNvbmIpKQ0KICAgIHdoZXJlIGtleSA9IGFueSAocHJpdmF0ZS52YWx1YWJsZV9pdGVtX2tleXMoKSkNCiAgICAgIGFuZCBrZXkgPD4gYWxsIChwcml2YXRlLmV2b19pdGVtX2tleXMoKSkNCiAgKSwgMCk7DQogIGFkZF9pdGVtcyA6PSBjb2FsZXNjZSgocF9ncmFudHMtPj4nYmVycnknKTo6aW50LCAwKQ0KICAgICsgY29hbGVzY2UoKHBfZ3JhbnRzLT4+J2JhaXQnKTo6aW50LCAwKQ0KICAgICsgY29hbGVzY2UoKHBfZ3JhbnRzLT4+J3Bva2ViYWxsJyk6OmludCwgMCkNCiAgICArIGNvYWxlc2NlKChwX2dyYW50cy0+PidncmVhdGJhbGwnKTo6aW50LCAwKQ0KICAgICsgY29hbGVzY2UoKHBfZ3JhbnRzLT4+J3VsdHJhYmFsbCcpOjppbnQsIDApDQogICAgKyBjb2FsZXNjZSgocF9ncmFudHMtPj4nbHVyZScpOjppbnQsIDApDQogICAgKyBleHRyYV9hZGQgKyBiZXJyeV9hZGQgKyBldm9fYWRkICsgdmFsX2FkZDsNCiAgY2FwIDo9IHByaXZhdGUuYmFnX2NhcGFjaXR5KHBfdWlkKSArIGFkZF9ib251czsNCiAgaWYgcHJpdmF0ZS5pdGVtX3RvdGFsKGludikgKyBhZGRfaXRlbXMgPiBjYXAgdGhlbg0KICAgIHJhaXNlIGV4Y2VwdGlvbiAnSW52ZW50b3J5IGlzIGZ1bGwuIEJ1eSBhIFBvdWNoIG9uIHRoZSBTdG9yZSBvciB1c2Ugc29tZSBpdGVtcyBmaXJzdC4nOw0KICBlbmQgaWY7DQogIHVwZGF0ZSBwdWJsaWMuaW52ZW50b3JpZXMNCiAgICBzZXQgYmVycnkgPSBiZXJyeSArIGNvYWxlc2NlKChwX2dyYW50cy0+PidiZXJyeScpOjppbnQsIDApLA0KICAgICAgICBiYWl0ID0gYmFpdCArIGNvYWxlc2NlKChwX2dyYW50cy0+PidiYWl0Jyk6OmludCwgMCksDQogICAgICAgIHBva2ViYWxsID0gcG9rZWJhbGwgKyBjb2FsZXNjZSgocF9ncmFudHMtPj4ncG9rZWJhbGwnKTo6aW50LCAwKSwNCiAgICAgICAgZ3JlYXRiYWxsID0gZ3JlYXRiYWxsICsgY29hbGVzY2UoKHBfZ3JhbnRzLT4+J2dyZWF0YmFsbCcpOjppbnQsIDApLA0KICAgICAgICB1bHRyYWJhbGwgPSB1bHRyYWJhbGwgKyBjb2FsZXNjZSgocF9ncmFudHMtPj4ndWx0cmFiYWxsJyk6OmludCwgMCksDQogICAgICAgIGx1cmUgPSBsdXJlICsgY29hbGVzY2UoKHBfZ3JhbnRzLT4+J2x1cmUnKTo6aW50LCAwKSwNCiAgICAgICAgY29pbnMgPSBjb2lucyArIGNvYWxlc2NlKChwX2dyYW50cy0+Pidjb2lucycpOjppbnQsIDApLA0KICAgICAgICBiYWdfYm9udXMgPSBiYWdfYm9udXMgKyBhZGRfYm9udXMsDQogICAgICAgIHVwZGF0ZWRfYXQgPSBub3coKQ0KICAgIHdoZXJlIHVzZXJfaWQgPSBwX3VpZDsNCiAgZm9yZWFjaCBrIGluIGFycmF5IHByaXZhdGUuZXh0cmFfYmFsbF9rZXlzKCkgbG9vcA0KICAgIG4gOj0gY29hbGVzY2UoKHBfZ3JhbnRzLT4+ayk6OmludCwgMCk7DQogICAgaWYgbiA+IDAgdGhlbg0KICAgICAgdXBkYXRlIHB1YmxpYy5pbnZlbnRvcmllcw0KICAgICAgICBzZXQgYmFsbHMgPSBqc29uYl9zZXQoY29hbGVzY2UoYmFsbHMsICd7fSc6Ompzb25iKSwgYXJyYXlba10sIHRvX2pzb25iKGNvYWxlc2NlKChiYWxscy0+PmspOjppbnQsIDApICsgbikpLA0KICAgICAgICAgICAgdXBkYXRlZF9hdCA9IG5vdygpDQogICAgICB3aGVyZSB1c2VyX2lkID0gcF91aWQ7DQogICAgZW5kIGlmOw0KICBlbmQgbG9vcDsNCiAgZm9yZWFjaCBrIGluIGFycmF5IHByaXZhdGUuY2FwdHVyZV9iZXJyeV9rZXlzKCkgbG9vcA0KICAgIG4gOj0gY29hbGVzY2UoKHBfZ3JhbnRzLT4+ayk6OmludCwgMCk7DQogICAgaWYgbiA+IDAgdGhlbg0KICAgICAgdXBkYXRlIHB1YmxpYy5pbnZlbnRvcmllcw0KICAgICAgICBzZXQgYmVycmllcyA9IGpzb25iX3NldChjb2FsZXNjZShiZXJyaWVzLCAne30nOjpqc29uYiksIGFycmF5W2tdLCB0b19qc29uYihjb2FsZXNjZSgoYmVycmllcy0+PmspOjppbnQsIDApICsgbikpLA0KICAgICAgICAgICAgdXBkYXRlZF9hdCA9IG5vdygpDQogICAgICB3aGVyZSB1c2VyX2lkID0gcF91aWQ7DQogICAgZW5kIGlmOw0KICBlbmQgbG9vcDsNCiAgZm9yZWFjaCBrIGluIGFycmF5IHByaXZhdGUuZXZvX2l0ZW1fa2V5cygpIGxvb3ANCiAgICBuIDo9IGNvYWxlc2NlKChwX2dyYW50cy0+PmspOjppbnQsIDApOw0KICAgIGlmIG4gPiAwIHRoZW4NCiAgICAgIHBlcmZvcm0gcHJpdmF0ZS5hZGp1c3RfaXRlbShwX3VpZCwgaywgbik7DQogICAgZW5kIGlmOw0KICBlbmQgbG9vcDsNCiAgZm9yZWFjaCBrIGluIGFycmF5IHByaXZhdGUudmFsdWFibGVfaXRlbV9rZXlzKCkgbG9vcA0KICAgIGlmIGsgPSBhbnkgKHByaXZhdGUuZXZvX2l0ZW1fa2V5cygpKSB0aGVuDQogICAgICBjb250aW51ZTsNCiAgICBlbmQgaWY7DQogICAgbiA6PSBjb2FsZXNjZSgocF9ncmFudHMtPj5rKTo6aW50LCAwKTsNCiAgICBpZiBuID4gMCB0aGVuDQogICAgICBwZXJmb3JtIHByaXZhdGUuYWRqdXN0X2l0ZW0ocF91aWQsIGssIG4pOw0KICAgIGVuZCBpZjsNCiAgZW5kIGxvb3A7DQplbmQ7DQokZnVuY3Rpb24kCg==','base64'),'UTF8'); END $source$;
COMMIT;
