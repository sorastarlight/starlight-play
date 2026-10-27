BEGIN;SET LOCAL lock_timeout='5s';SET LOCAL statement_timeout='30s';
DO $guard$ BEGIN
IF md5(pg_get_functiondef('private.enforce_staff_pass_override()'::regprocedure))<>'dd5ca30d81ad28f1615ee55ff0b7237a' OR (SELECT proacl::text FROM pg_proc WHERE oid='private.enforce_staff_pass_override()'::regprocedure) IS DISTINCT FROM '{postgres=X/postgres}' THEN RAISE EXCEPTION 'PASS_SOURCE_OR_ACL_DRIFT';END IF;
IF md5(pg_get_functiondef('private.hub_deliver_pass(uuid,jsonb,text)'::regprocedure))<>'4d433fdd0e46debbdc6fa402f0bc99e5' OR (SELECT proacl::text FROM pg_proc WHERE oid='private.hub_deliver_pass(uuid,jsonb,text)'::regprocedure) IS DISTINCT FROM '{postgres=X/postgres}' THEN RAISE EXCEPTION 'PASS_SOURCE_OR_ACL_DRIFT';END IF;
IF md5(pg_get_functiondef('private.item_total(inventories)'::regprocedure))<>'6ee09d054fbfcaf9791fb2f21f62a07d' OR (SELECT proacl::text FROM pg_proc WHERE oid='private.item_total(inventories)'::regprocedure) IS DISTINCT FROM NULL THEN RAISE EXCEPTION 'PASS_SOURCE_OR_ACL_DRIFT';END IF;
IF md5(pg_get_functiondef('private.pc_item_location(text)'::regprocedure))<>'b280cd41c3f5c675c132723e747215b1' OR (SELECT proacl::text FROM pg_proc WHERE oid='private.pc_item_location(text)'::regprocedure) IS DISTINCT FROM '{postgres=X/postgres}' THEN RAISE EXCEPTION 'PASS_SOURCE_OR_ACL_DRIFT';END IF;
IF md5(pg_get_functiondef('play_claim_pass(text)'::regprocedure))<>'86c0c9d04c44998c41488b1bcffd170c' OR (SELECT proacl::text FROM pg_proc WHERE oid='play_claim_pass(text)'::regprocedure) IS DISTINCT FROM '{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}' THEN RAISE EXCEPTION 'PASS_SOURCE_OR_ACL_DRIFT';END IF;
IF md5(pg_get_functiondef('play_pc_item_transfer(uuid,text,text,integer)'::regprocedure))<>'b62922f112954cb39bb232405c937208' OR (SELECT proacl::text FROM pg_proc WHERE oid='play_pc_item_transfer(uuid,text,text,integer)'::regprocedure) IS DISTINCT FROM '{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}' THEN RAISE EXCEPTION 'PASS_SOURCE_OR_ACL_DRIFT';END IF;
IF md5(pg_get_functiondef('play_pc_items()'::regprocedure))<>'5dbb54280c79f21e37e53c9e9cec8fbb' OR (SELECT proacl::text FROM pg_proc WHERE oid='play_pc_items()'::regprocedure) IS DISTINCT FROM '{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}' THEN RAISE EXCEPTION 'PASS_SOURCE_OR_ACL_DRIFT';END IF;
IF md5(pg_get_functiondef('play_store()'::regprocedure))<>'2148b9c29f8ce6ec27bd7ed07cc0f329' OR (SELECT proacl::text FROM pg_proc WHERE oid='play_store()'::regprocedure) IS DISTINCT FROM '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' THEN RAISE EXCEPTION 'PASS_SOURCE_OR_ACL_DRIFT';END IF;
IF to_regclass('private.pass_period_rewards') IS NOT NULL THEN RAISE EXCEPTION 'ALREADY_INSTALLED';END IF;END $guard$;
CREATE TABLE private.pass_period_rewards (
 user_id uuid NOT NULL REFERENCES public.profiles(id), kind text NOT NULL CHECK(kind IN ('daily','weekly')),
 period_start timestamptz NOT NULL, period_end timestamptz NOT NULL,
 verified_at timestamptz NOT NULL, source text NOT NULL,
 bundle jsonb NOT NULL, catalog_snapshot jsonb NOT NULL, state text NOT NULL CHECK(state IN ('available','claimed','crated','opened')),
 created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz,
 PRIMARY KEY(user_id,kind,period_start), CHECK(period_end>period_start)
);
CREATE INDEX pass_period_pending ON private.pass_period_rewards(user_id,period_end) WHERE state='available';
ALTER TABLE private.pass_period_rewards ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.pass_period_rewards FROM PUBLIC,anon,authenticated,service_role;
CREATE TABLE private.pass_crate_opens(user_id uuid NOT NULL,request_id uuid NOT NULL,result jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(user_id,request_id));
ALTER TABLE private.pass_crate_opens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.pass_crate_opens FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION private.pass_period_start(p_kind text,p_at timestamptz) RETURNS timestamptz LANGUAGE sql IMMUTABLE SET search_path='' AS $body$
 SELECT CASE p_kind WHEN 'daily' THEN date_trunc('day',p_at AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' WHEN 'weekly' THEN date_trunc('week',p_at AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' END;
$body$;

CREATE FUNCTION private.record_pass_verification() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $body$
DECLARE k text;s timestamptz;e timestamptz;b jsonb;previous_claim timestamptz;v_at timestamptz:=statement_timestamp();
BEGIN
 -- Only a successful provider write establishes coverage. Never reuse an old timestamp.
 IF auth.role() IS DISTINCT FROM 'service_role' OR NEW.starlight_pass IS NOT TRUE OR coalesce(NEW.pass_source,'') NOT IN ('twitch-sub','broadcaster') OR NEW.pass_checked_at IS NULL OR NEW.pass_checked_at IS NOT DISTINCT FROM OLD.pass_checked_at THEN RETURN NEW; END IF;
 IF NEW.pass_checked_at<v_at-interval '5 minutes' OR NEW.pass_checked_at>v_at+interval '1 minute' THEN RETURN NEW; END IF;
 FOR k IN SELECT unnest(ARRAY['daily','weekly']) LOOP
  s:=private.pass_period_start(k,v_at);e:=s+CASE k WHEN 'daily' THEN interval '24 hours' ELSE interval '168 hours' END;
  SELECT CASE k WHEN 'daily' THEN daily ELSE weekly END INTO b FROM private.hub_pass_settings WHERE id;
  IF b IS NULL THEN RAISE EXCEPTION 'Pass rewards are unavailable.'; END IF;
  PERFORM private.hub_validate_rewards(b,'pass');
  SELECT CASE k WHEN 'daily' THEN pass_daily_at ELSE pass_weekly_at END INTO previous_claim FROM public.inventories WHERE user_id=NEW.id;
  INSERT INTO private.pass_period_rewards(user_id,kind,period_start,period_end,verified_at,source,bundle,catalog_snapshot,state,completed_at)
  VALUES(NEW.id,k,s,e,v_at,NEW.pass_source,b,(SELECT jsonb_object_agg(c.id,jsonb_build_object('kind',c.kind,'key',c.target_key,'number',c.target_number)) FROM private.hub_reward_catalog c WHERE c.id IN (SELECT value->>'catalogId' FROM jsonb_array_elements(b->'rewards'))),CASE WHEN previous_claim>=s THEN 'claimed' ELSE 'available' END,CASE WHEN previous_claim>=s THEN previous_claim END) ON CONFLICT DO NOTHING;
 END LOOP;
 RETURN NEW;
END;$body$;
CREATE TRIGGER pass_verified_period AFTER UPDATE OF starlight_pass,pass_source,pass_checked_at ON public.profiles FOR EACH ROW EXECUTE FUNCTION private.record_pass_verification();

CREATE FUNCTION private.materialize_pass_crates(p_uid uuid) RETURNS integer LANGUAGE plpgsql SET search_path='' AS $body$
DECLARE n integer;
BEGIN
 PERFORM 1 FROM public.profiles WHERE id=p_uid FOR UPDATE;
 PERFORM private.ensure_inventory(p_uid);
 PERFORM 1 FROM public.inventories WHERE user_id=p_uid FOR UPDATE;
 WITH chosen AS (SELECT user_id,kind,period_start FROM private.pass_period_rewards WHERE user_id=p_uid AND state='available' AND period_end<=statement_timestamp() ORDER BY period_end,kind LIMIT 100 FOR UPDATE),
 changed AS (UPDATE private.pass_period_rewards r SET state='crated' FROM chosen c WHERE r.user_id=c.user_id AND r.kind=c.kind AND r.period_start=c.period_start RETURNING 1)
 SELECT count(*) INTO n FROM changed;
 IF n>0 THEN PERFORM private.pc_store_items(p_uid,'starlight_pass_crate',n,'Missed Starlight Pass supplies'); END IF;
 RETURN n;
END;$body$;

CREATE FUNCTION private.pass_period_wallet(p_uid uuid) RETURNS jsonb LANGUAGE sql STABLE SET search_path='' AS $body$
 SELECT jsonb_build_object('calendar','UTC','dailyReady',EXISTS(SELECT 1 FROM private.pass_period_rewards WHERE user_id=p_uid AND kind='daily' AND period_start=private.pass_period_start('daily',statement_timestamp()) AND state='available'),
 'weeklyReady',EXISTS(SELECT 1 FROM private.pass_period_rewards WHERE user_id=p_uid AND kind='weekly' AND period_start=private.pass_period_start('weekly',statement_timestamp()) AND state='available'),
 'passDailyNextAt',private.pass_period_start('daily',statement_timestamp())+interval '24 hours','passWeeklyNextAt',private.pass_period_start('weekly',statement_timestamp())+interval '168 hours',
 'passDailyVerified',EXISTS(SELECT 1 FROM private.pass_period_rewards WHERE user_id=p_uid AND kind='daily' AND period_start=private.pass_period_start('daily',statement_timestamp())),
 'passWeeklyVerified',EXISTS(SELECT 1 FROM private.pass_period_rewards WHERE user_id=p_uid AND kind='weekly' AND period_start=private.pass_period_start('weekly',statement_timestamp())),
 'passDailyDelivered',EXISTS(SELECT 1 FROM private.pass_period_rewards WHERE user_id=p_uid AND kind='daily' AND period_start=private.pass_period_start('daily',statement_timestamp()) AND state='claimed'),
 'passWeeklyDelivered',EXISTS(SELECT 1 FROM private.pass_period_rewards WHERE user_id=p_uid AND kind='weekly' AND period_start=private.pass_period_start('weekly',statement_timestamp()) AND state='claimed'));
$body$;

CREATE OR REPLACE FUNCTION public.play_claim_pass(p_kind text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $body$
DECLARE uid uuid:=auth.uid();r private.pass_period_rewards;result jsonb;idem text;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Sign in first.' USING ERRCODE='42501';END IF;
 IF p_kind IS NULL OR p_kind NOT IN ('daily','weekly') THEN RAISE EXCEPTION 'Choose daily or weekly supplies.';END IF;
 PERFORM 1 FROM public.profiles WHERE id=uid AND starlight_pass IS TRUE FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Check your active Starlight Pass first.';END IF;
 PERFORM private.ensure_inventory(uid);PERFORM 1 FROM public.inventories WHERE user_id=uid FOR UPDATE;
 SELECT * INTO r FROM private.pass_period_rewards WHERE user_id=uid AND kind=p_kind AND period_start=private.pass_period_start(p_kind,statement_timestamp()) FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Check your subscription to unlock this period’s supplies.';END IF;
 IF r.state<>'available' THEN RAISE EXCEPTION 'This supply has already been claimed.';END IF;
 IF r.catalog_snapshot IS DISTINCT FROM (SELECT jsonb_object_agg(c.id,jsonb_build_object('kind',c.kind,'key',c.target_key,'number',c.target_number)) FROM private.hub_reward_catalog c WHERE c.id IN (SELECT value->>'catalogId' FROM jsonb_array_elements(r.bundle->'rewards'))) THEN RAISE EXCEPTION 'Saved supply item definitions have changed. Contact the Service Desk; your rewards remain safe.';END IF;
 idem:='pass-utc:'||p_kind||':'||uid::text||':'||to_char(r.period_start AT TIME ZONE 'UTC','YYYY-MM-DD');
 result:=private.hub_deliver_pass(uid,r.bundle,idem);
 IF coalesce((result->>'duplicate')::boolean,false) THEN RAISE EXCEPTION 'This supply has already been delivered.';END IF;
 UPDATE private.pass_period_rewards SET state='claimed',completed_at=statement_timestamp() WHERE user_id=uid AND kind=p_kind AND period_start=r.period_start;
 UPDATE public.inventories SET pass_daily_at=CASE WHEN p_kind='daily' THEN statement_timestamp() ELSE pass_daily_at END,pass_weekly_at=CASE WHEN p_kind='weekly' THEN statement_timestamp() ELSE pass_weekly_at END WHERE user_id=uid;
 RETURN private.play_snapshot(uid)||result||jsonb_build_object('message','Starlight Pass supplies received!');
END;$body$;

CREATE FUNCTION public.play_open_pass_crate(p_request uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $body$
DECLARE uid uuid:=auth.uid();r private.pass_period_rewards;result jsonb;old jsonb;qty bigint;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Sign in first.' USING ERRCODE='42501';END IF;
 IF p_request IS NULL THEN RAISE EXCEPTION 'A request ID is required.';END IF;
 PERFORM 1 FROM public.profiles WHERE id=uid FOR UPDATE;
 PERFORM private.ensure_inventory(uid);PERFORM 1 FROM public.inventories WHERE user_id=uid FOR UPDATE;
 SELECT o.result INTO old FROM private.pass_crate_opens o WHERE o.user_id=uid AND o.request_id=p_request;
 IF FOUND THEN RETURN old||jsonb_build_object('duplicate',true);END IF;
 SELECT coalesce((items->>'starlight_pass_crate')::bigint,0) INTO qty FROM public.inventories WHERE user_id=uid;
 IF qty<1 THEN RAISE EXCEPTION 'Withdraw a Starlight Pass Supply Crate into your bag first.';END IF;
 SELECT * INTO r FROM private.pass_period_rewards WHERE user_id=uid AND state='crated' ORDER BY period_end,kind LIMIT 1 FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'This crate could not be matched to a saved supply. Contact the Service Desk.';END IF;
 IF r.catalog_snapshot IS DISTINCT FROM (SELECT jsonb_object_agg(c.id,jsonb_build_object('kind',c.kind,'key',c.target_key,'number',c.target_number)) FROM private.hub_reward_catalog c WHERE c.id IN (SELECT value->>'catalogId' FROM jsonb_array_elements(r.bundle->'rewards'))) THEN RAISE EXCEPTION 'Saved supply item definitions have changed. Contact the Service Desk; your rewards remain safe.';END IF;
 PERFORM private.pc_bag_adjust(uid,'starlight_pass_crate',-1);
 result:=private.hub_deliver_pass(uid,r.bundle,'pass-utc:'||r.kind||':'||uid::text||':'||to_char(r.period_start AT TIME ZONE 'UTC','YYYY-MM-DD'));
 IF coalesce((result->>'duplicate')::boolean,false) THEN RAISE EXCEPTION 'This crate has already been opened.';END IF;
 UPDATE private.pass_period_rewards SET state='opened',completed_at=statement_timestamp() WHERE user_id=uid AND kind=r.kind AND period_start=r.period_start;
 result:=private.play_snapshot(uid)||result||jsonb_build_object('message','Starlight Pass Supply Crate opened!','kind',r.kind,'periodStart',r.period_start);
 INSERT INTO private.pass_crate_opens(user_id,request_id,result) VALUES(uid,p_request,result);
 RETURN result;
END;$body$;
REVOKE ALL ON FUNCTION private.pass_period_start(text,timestamptz),private.record_pass_verification(),private.materialize_pass_crates(uuid),private.pass_period_wallet(uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.play_open_pass_crate(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.play_open_pass_crate(uuid) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION private.pc_item_location(p_key text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
BEGIN
 IF p_key='starlight_pass_crate' THEN RETURN 'items';END IF;
 IF p_key IN ('berry','bait','pokeball','greatball','ultraball','lure') THEN RETURN 'core'; END IF;
 IF p_key IN ('coins','bag_bonus','title','badge','cosmetic','choice_stone','_choice') THEN RAISE EXCEPTION 'This is not a storable item.'; END IF;
 IF p_key=ANY(private.capture_berry_keys()) THEN RETURN 'berries'; END IF;
 IF p_key=ANY(private.evo_item_keys()) OR p_key=ANY(private.valuable_item_keys()) THEN RETURN 'items'; END IF;
 IF p_key=ANY(private.extra_ball_keys()) THEN RETURN 'balls'; END IF;
 RAISE EXCEPTION 'Unknown item.';
END;$function$
;
CREATE OR REPLACE FUNCTION public.play_pc_items()
 RETURNS jsonb
 LANGUAGE plpgsql
 VOLATILE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE uid uuid:=auth.uid();inv public.inventories;bag jsonb;stored jsonb;waiting jsonb;slots jsonb;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Sign in first.' USING ERRCODE='42501';END IF;
 PERFORM private.materialize_pass_crates(uid);
 SELECT * INTO inv FROM public.inventories WHERE user_id=uid;
 bag:=jsonb_build_object('berry',coalesce(inv.berry,0),'bait',coalesce(inv.bait,0),'pokeball',coalesce(inv.pokeball,0),'greatball',coalesce(inv.greatball,0),'ultraball',coalesce(inv.ultraball,0),'lure',coalesce(inv.lure,0))||coalesce(inv.balls,'{}')||coalesce(inv.berries,'{}')||coalesce(inv.items,'{}');
 SELECT coalesce(jsonb_object_agg(item_key,quantity) FILTER(WHERE slot IS NOT NULL),'{}'),coalesce(jsonb_object_agg(item_key,quantity) FILTER(WHERE slot IS NULL),'{}') INTO stored,waiting FROM private.pc_item_layout(uid);
 SELECT jsonb_agg(l.item_key ORDER BY n) INTO slots FROM generate_series(1,30)n LEFT JOIN private.pc_item_layout(uid) l ON l.slot=n;
 RETURN jsonb_build_object('ok',true,'bag',bag,'stored',stored,'waiting',waiting,'slots',slots,'slotCapacity',30,'used',coalesce(private.item_total(inv),0),'capacity',private.bag_capacity(uid));
END;$function$
;
CREATE OR REPLACE FUNCTION public.play_store()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  uid uuid := auth.uid();
  inv public.inventories;
  pass boolean := false;
  daily jsonb := '{}'::jsonb;
  daily_delivered boolean := false;
  weekly_delivered boolean := false;
  daily_next timestamptz;
  weekly_next timestamptz;
begin
  if uid is not null then
    perform 1 from public.profiles where id=uid for update;
    inv := private.ensure_inventory(uid);
    select starlight_pass into pass from public.profiles where id = uid;
    daily := private.daily_wallet_json(uid);
    select exists(select 1 from private.hub_reward_deliveries d where d.target_id=uid and d.status='delivered' and d.idempotency='pass-daily:'||uid::text||':'||to_char(private.app_today(),'YYYY-MM-DD')) into daily_delivered;
    select exists(select 1 from private.hub_reward_deliveries d where d.target_id=uid and d.status='delivered' and d.idempotency='pass-weekly:'||uid::text||':'||to_char(now(),'IYYY-IW')) into weekly_delivered;
    perform private.materialize_pass_crates(uid);
  end if;
  return private.play_snapshot(uid) || jsonb_build_object(
    'ok', true,
    'catalog', private.store_catalog() || jsonb_build_object('avatars', private.premium_avatar_catalog()),
    'passRewards', private.hub_pass_preview(),
    'wallet', case when inv.user_id is null then null else jsonb_build_object(
      'coins', inv.coins,
      'capacity', private.bag_capacity(uid),
      'used', private.item_total(inv),
      'dailyReady', pass and (daily_next is null or daily_next <= now()),
      'weeklyReady', pass and (weekly_next is null or weekly_next <= now()),
      'passDailyClaimedAt', inv.pass_daily_at,
      'passWeeklyClaimedAt', inv.pass_weekly_at,
      'passDailyNextAt', daily_next,
      'passWeeklyNextAt', weekly_next,
      'passDailyDelivered', daily_delivered,
      'passWeeklyDelivered', weekly_delivered,
      'dailySupplyReady', coalesce((daily->>'dailySupplyReady')::boolean, true),
      'dailySupplyAt', inv.daily_supply_at,
      'dailyStreakDay', (daily->>'dailyStreakDay')::int,
      'dailyClaimed', coalesce((daily->>'dailyClaimed')::boolean, false),
      'dailyNextDate', daily->>'dailyNextDate',
      'dailyTimezone', daily->>'dailyTimezone',
      'dailyPreview', daily->'dailyPreview',
      'pendingChoices', daily->'pendingChoices'
    ) end
  ) || case when uid is null then '{}'::jsonb else jsonb_build_object('wallet',
    jsonb_build_object('coins',inv.coins,'capacity',private.bag_capacity(uid),'used',private.item_total(inv),
      'dailySupplyReady',coalesce((daily->>'dailySupplyReady')::boolean,true),'dailySupplyAt',inv.daily_supply_at,
      'dailyStreakDay',daily->'dailyStreakDay','dailyClaimed',daily->'dailyClaimed','dailyNextDate',daily->'dailyNextDate','dailyTimezone',daily->'dailyTimezone','dailyPreview',daily->'dailyPreview','pendingChoices',daily->'pendingChoices')||private.pass_period_wallet(uid),
    'passRewards',jsonb_build_object('daily',coalesce((select private.hub_player_reward_preview(bundle,'pass') from private.pass_period_rewards where user_id=uid and kind='daily' and period_start=private.pass_period_start('daily',statement_timestamp())),private.hub_pass_preview()->'daily'),
    'weekly',coalesce((select private.hub_player_reward_preview(bundle,'pass') from private.pass_period_rewards where user_id=uid and kind='weekly' and period_start=private.pass_period_start('weekly',statement_timestamp())),private.hub_pass_preview()->'weekly'))) end;
end;
$function$
;
COMMIT;
