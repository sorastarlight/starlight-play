BEGIN;SET LOCAL lock_timeout='5s';DO $guard$ BEGIN
IF md5(pg_get_functiondef('private.pass_period_start(text,timestamp with time zone)'::regprocedure))<>'b9b1890636b517b26f4ab799f3c1cbab' OR (SELECT proacl::text FROM pg_proc WHERE oid='private.pass_period_start(text,timestamp with time zone)'::regprocedure) IS DISTINCT FROM '{postgres=X/postgres}' THEN RAISE EXCEPTION 'PASS_ROLLBACK_DRIFT';END IF;
IF md5(pg_get_functiondef('private.record_pass_verification()'::regprocedure))<>'1f30e81762d7f8b35f7fee7c9a157743' OR (SELECT proacl::text FROM pg_proc WHERE oid='private.record_pass_verification()'::regprocedure) IS DISTINCT FROM '{postgres=X/postgres}' THEN RAISE EXCEPTION 'PASS_ROLLBACK_DRIFT';END IF;
IF md5(pg_get_functiondef('private.materialize_pass_crates(uuid)'::regprocedure))<>'dc2036e60ff03257d1ea481540157b89' OR (SELECT proacl::text FROM pg_proc WHERE oid='private.materialize_pass_crates(uuid)'::regprocedure) IS DISTINCT FROM '{postgres=X/postgres}' THEN RAISE EXCEPTION 'PASS_ROLLBACK_DRIFT';END IF;
IF md5(pg_get_functiondef('private.pass_period_wallet(uuid)'::regprocedure))<>'d2f7f1de0edeece5557cae1b2d29b26e' OR (SELECT proacl::text FROM pg_proc WHERE oid='private.pass_period_wallet(uuid)'::regprocedure) IS DISTINCT FROM '{postgres=X/postgres}' THEN RAISE EXCEPTION 'PASS_ROLLBACK_DRIFT';END IF;
IF md5(pg_get_functiondef('play_open_pass_crate(uuid)'::regprocedure))<>'d62edcb75b09b6ce745e4a18513c3937' OR (SELECT proacl::text FROM pg_proc WHERE oid='play_open_pass_crate(uuid)'::regprocedure) IS DISTINCT FROM '{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}' THEN RAISE EXCEPTION 'PASS_ROLLBACK_DRIFT';END IF;
IF md5(pg_get_functiondef('private.pc_item_location(text)'::regprocedure))<>'7237bb7dfbeb6b1a020cce948abe7126' OR (SELECT proacl::text FROM pg_proc WHERE oid='private.pc_item_location(text)'::regprocedure) IS DISTINCT FROM '{postgres=X/postgres}' THEN RAISE EXCEPTION 'PASS_ROLLBACK_DRIFT';END IF;
IF md5(pg_get_functiondef('play_pc_items()'::regprocedure))<>'4666cfa23eb92a848e66cfc003ff594c' OR (SELECT proacl::text FROM pg_proc WHERE oid='play_pc_items()'::regprocedure) IS DISTINCT FROM '{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}' THEN RAISE EXCEPTION 'PASS_ROLLBACK_DRIFT';END IF;
IF md5(pg_get_functiondef('play_store()'::regprocedure))<>'127fa7a644860ffbf45f61edcd0bd844' OR (SELECT proacl::text FROM pg_proc WHERE oid='play_store()'::regprocedure) IS DISTINCT FROM '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' THEN RAISE EXCEPTION 'PASS_ROLLBACK_DRIFT';END IF;
IF md5(pg_get_functiondef('play_claim_pass(text)'::regprocedure))<>'c560ef01e9c864c1df34c54408386192' OR (SELECT proacl::text FROM pg_proc WHERE oid='play_claim_pass(text)'::regprocedure) IS DISTINCT FROM '{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}' THEN RAISE EXCEPTION 'PASS_ROLLBACK_DRIFT';END IF;
IF EXISTS(SELECT 1 FROM private.pass_period_rewards) OR EXISTS(SELECT 1 FROM private.pass_crate_opens) THEN RAISE EXCEPTION 'PASS_LEDGER_IN_USE_RETAIN_DATA';END IF;END $guard$;
DROP TRIGGER pass_verified_period ON public.profiles;
CREATE OR REPLACE FUNCTION private.pc_item_location(p_key text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
BEGIN
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
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE uid uuid:=auth.uid();inv public.inventories;bag jsonb;stored jsonb;waiting jsonb;slots jsonb;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Sign in first.' USING ERRCODE='42501';END IF;
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
    inv := private.ensure_inventory(uid);
    select starlight_pass into pass from public.profiles where id = uid;
    daily := private.daily_wallet_json(uid);
    select exists(select 1 from private.hub_reward_deliveries d where d.target_id=uid and d.status='delivered' and d.idempotency='pass-daily:'||uid::text||':'||to_char(private.app_today(),'YYYY-MM-DD')) into daily_delivered;
    select exists(select 1 from private.hub_reward_deliveries d where d.target_id=uid and d.status='delivered' and d.idempotency='pass-weekly:'||uid::text||':'||to_char(now(),'IYYY-IW')) into weekly_delivered;
    daily_next := inv.pass_daily_at + interval '20 hours';
    weekly_next := inv.pass_weekly_at + interval '6 days';
    if daily_delivered then daily_next := greatest(daily_next, (private.app_today()+1)::timestamp at time zone coalesce(private.capture_config()->>'timezone','America/New_York')); end if;
    if weekly_delivered then weekly_next := greatest(weekly_next, date_trunc('week',now())+interval '1 week'); end if;
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
  );
end;
$function$
;
CREATE OR REPLACE FUNCTION public.play_claim_pass(p_kind text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid:=auth.uid();inv public.inventories;bundle jsonb;result jsonb;idem text;begin
 if uid is null then raise exception 'Sign in first.' using errcode='42501';end if;
 perform 1 from public.profiles where id=uid and starlight_pass is true for update;if not found then raise exception 'Starlight Pass is required. Check your subscription first.';end if;
 perform private.ensure_inventory(uid);select * into inv from public.inventories where user_id=uid for update;
 if p_kind='daily' then
  if inv.pass_daily_at is not null and inv.pass_daily_at>now()-interval '20 hours' then raise exception 'Daily Pass gift is not ready yet.';end if;
  select daily into bundle from private.hub_pass_settings where id;
  idem:='pass-daily:'||uid::text||':'||to_char(private.app_today(),'YYYY-MM-DD');
 elsif p_kind='weekly' then
  if inv.pass_weekly_at is not null and inv.pass_weekly_at>now()-interval '6 days' then raise exception 'Weekly Pass crate is not ready yet.';end if;
  select weekly into bundle from private.hub_pass_settings where id;
  idem:='pass-weekly:'||uid::text||':'||to_char(now(),'IYYY-IW');
 else raise exception 'Choose daily or weekly rewards.';end if;
 result:=private.hub_deliver_pass(uid,bundle,idem);
 if (result->>'duplicate')::boolean then raise exception 'This Pass reward has already been delivered.';end if;
 update public.inventories set pass_daily_at=case when p_kind='daily' then now() else pass_daily_at end,pass_weekly_at=case when p_kind='weekly' then now() else pass_weekly_at end,updated_at=now() where user_id=uid;
 return private.play_snapshot(uid)||result||jsonb_build_object('message',case when p_kind='daily' then 'Daily Pass rewards received!' else 'Weekly Pass rewards received!' end);
end $function$
;
DROP FUNCTION public.play_open_pass_crate(uuid),private.pass_period_wallet(uuid),private.materialize_pass_crates(uuid),private.record_pass_verification(),private.pass_period_start(text,timestamptz);DROP TABLE private.pass_crate_opens,private.pass_period_rewards;COMMIT;