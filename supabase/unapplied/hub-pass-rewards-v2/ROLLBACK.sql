do $guard$ begin
if md5(pg_get_functiondef('public.admin_trainer_reward_action(uuid,uuid,text,jsonb,text)'::regprocedure)) is distinct from '66f7b2b054e2d34889eda9996d337fde' then raise exception 'Rollback source drift: admin_trainer_reward_action';end if;
if md5(pg_get_functiondef('public.admin_save_pass_rewards(jsonb,jsonb)'::regprocedure)) is distinct from 'ec739a7d4b14765f6bb2d3c6dfdc0bf4' then raise exception 'Rollback source drift: admin_save_pass_rewards';end if;
if md5(pg_get_functiondef('public.play_store()'::regprocedure)) is distinct from '1e903e996ede9543ebdcdd11034b96fd' then raise exception 'Rollback source drift: play_store';end if;
if md5(pg_get_functiondef('public.play_claim_pass(text)'::regprocedure)) is distinct from '86c0c9d04c44998c41488b1bcffd170c' then raise exception 'Rollback source drift: play_claim_pass';end if;
end $guard$;
CREATE OR REPLACE FUNCTION public.admin_save_pass_rewards(p_daily jsonb, p_weekly jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform private.require_staff_edit();
  perform private.validate_store_grants(coalesce(p_daily, '{}'::jsonb));
  perform private.validate_store_grants(coalesce(p_weekly, '{}'::jsonb));
  update public.site_config set game_settings = coalesce(game_settings,'{}'::jsonb) || jsonb_build_object('starlightPass', jsonb_build_object('daily', coalesce(p_daily,'{}'::jsonb), 'weekly', coalesce(p_weekly,'{}'::jsonb))), updated_at = now() where id = 1;
  return jsonb_build_object('ok', true, 'message', 'Starlight Pass rewards saved.', 'passRewards', jsonb_build_object('daily', private.pass_reward_grants('daily'), 'weekly', private.pass_reward_grants('weekly')));
end;$function$
;
CREATE OR REPLACE FUNCTION public.play_claim_pass(p_kind text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  uid uuid := auth.uid();
  inv public.inventories;
  pass boolean;
  grants jsonb;
  grant_result jsonb;
begin
  if uid is null then raise exception 'Sign in first.' using errcode = '42501'; end if;
  select starlight_pass into pass from public.profiles where id = uid;
  if not coalesce(pass, false) then raise exception 'Starlight Pass is required. Subscribe on Twitch, then check your pass.'; end if;
  perform private.ensure_inventory(uid);
  select * into inv from public.inventories where user_id = uid for update;
  if p_kind = 'daily' then
    if inv.pass_daily_at is not null and inv.pass_daily_at > now() - interval '20 hours' then
      raise exception 'Daily Pass gift is not ready yet.';
    end if;
    grants := private.pass_reward_grants('daily');
    update public.inventories set pass_daily_at = now(), updated_at = now() where user_id = uid;
    begin
      grant_result := private.grant_items(
        uid, grants, 'DAILY_REWARD', 'pass-daily',
        'pass-daily:' || uid::text || ':' || to_char(private.app_today(), 'YYYY-MM-DD'), true
      );
      if coalesce((grant_result->>'duplicate')::boolean, false) then
        raise exception 'Daily Pass gift is not ready yet.';
      end if;
    exception when others then
      update public.inventories set pass_daily_at = inv.pass_daily_at, updated_at = now() where user_id = uid;
      raise;
    end;
    return private.play_snapshot(uid) || jsonb_build_object('ok', true, 'grants', grants, 'message', 'Daily Pass gift: ' || private.grant_summary(grants) || '.');
  end if;
  if p_kind = 'weekly' then
    if inv.pass_weekly_at is not null and inv.pass_weekly_at > now() - interval '6 days' then
      raise exception 'Weekly Pass crate is not ready yet.';
    end if;
    grants := private.pass_reward_grants('weekly');
    update public.inventories set pass_weekly_at = now(), updated_at = now() where user_id = uid;
    begin
      grant_result := private.grant_items(
        uid, grants, 'DAILY_REWARD', 'pass-weekly',
        'pass-weekly:' || uid::text || ':' || to_char(now(), 'IYYY-IW'), true
      );
      if coalesce((grant_result->>'duplicate')::boolean, false) then
        raise exception 'Weekly Pass crate is not ready yet.';
      end if;
    exception when others then
      update public.inventories set pass_weekly_at = inv.pass_weekly_at, updated_at = now() where user_id = uid;
      raise;
    end;
    return private.play_snapshot(uid) || jsonb_build_object('ok', true, 'grants', grants, 'message', 'Weekly Pass crate: ' || private.grant_summary(grants) || '.');
  end if;
  raise exception 'Unknown Pass gift.';
end;
$function$
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
begin
  if uid is not null then
    inv := private.ensure_inventory(uid);
    select starlight_pass into pass from public.profiles where id = uid;
    daily := private.daily_wallet_json(uid);
  end if;
  return private.play_snapshot(uid) || jsonb_build_object(
    'ok', true,
    'catalog', private.store_catalog() || jsonb_build_object('avatars', private.premium_avatar_catalog()),
    'wallet', case when inv.user_id is null then null else jsonb_build_object(
      'coins', inv.coins,
      'capacity', private.bag_capacity(uid),
      'used', private.item_total(inv),
      'dailyReady', pass and (inv.pass_daily_at is null or inv.pass_daily_at < now() - interval '20 hours'),
      'weeklyReady', pass and (inv.pass_weekly_at is null or inv.pass_weekly_at < now() - interval '6 days'),
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
CREATE OR REPLACE FUNCTION public.admin_trainer_reward_action(p_user uuid, p_request uuid, p_action text, p_payload jsonb, p_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  v_actor uuid := auth.uid(); v_prior private.staff_reward_actions;
  v_profile public.profiles; v_override private.staff_pass_overrides;
  v_payload jsonb := coalesce(p_payload,'{}'::jsonb); v_result jsonb;
  v_grants jsonb; v_key text; v_qty integer; v_kind text; v_error text; v_space_before integer;
  v_index integer; v_generated jsonb; v_ids jsonb; v_public_ids jsonb;
BEGIN
  PERFORM private.require_staff_edit();
  IF v_actor IS NULL OR p_user IS NULL OR p_request IS NULL OR length(btrim(coalesce(p_reason,''))) NOT BETWEEN 3 AND 500 THEN
    RAISE EXCEPTION 'A target, request id and staff reason are required.' USING ERRCODE='22023';
  END IF;
  IF p_action IS NULL OR jsonb_typeof(v_payload)<>'object' OR p_action NOT IN ('pass_on','pass_off','pass_sync','pass_daily','pass_weekly','item','candy','pokemon','pokemon_batch','title','cosmetic','badge') THEN
    RAISE EXCEPTION 'Unknown reward action.' USING ERRCODE='22023';
  END IF;
  -- Profile row serializes concurrent grants and automation against one trainer.
  SELECT * INTO v_profile FROM public.profiles WHERE id=p_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Trainer not found.' USING ERRCODE='22023'; END IF;
  IF private.streamlink_protected_trainer(p_user) THEN
    RAISE EXCEPTION 'This protected trainer needs a separately scoped authorization.' USING ERRCODE='42501';
  END IF;
  INSERT INTO private.staff_reward_actions(request_id,actor_id,target_id,action,payload,reason,status)
  VALUES(p_request,v_actor,p_user,p_action,v_payload,btrim(p_reason),'pending') ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN
    SELECT * INTO v_prior FROM private.staff_reward_actions WHERE request_id=p_request;
    IF v_prior.actor_id<>v_actor OR v_prior.target_id<>p_user OR v_prior.action<>p_action OR v_prior.payload<>v_payload OR v_prior.reason<>btrim(p_reason) THEN
      RAISE EXCEPTION 'Request id is already bound to another action.' USING ERRCODE='22023';
    END IF;
    RETURN v_prior.result || jsonb_build_object('requestId',p_request,'replayed',true);
  END IF;
  BEGIN
    IF p_action IN ('pass_on','pass_off') THEN
      INSERT INTO private.staff_pass_overrides(target_id,active,source_before,subscription_active,subscription_source,subscription_checked_at,actor_id,reason)
      VALUES(p_user,p_action='pass_on',v_profile.pass_source,
        coalesce(v_profile.starlight_pass,false) AND coalesce(v_profile.pass_source,'') IN ('twitch-sub','broadcaster'),
        CASE WHEN v_profile.pass_source IN ('twitch-sub','broadcaster') THEN v_profile.pass_source END,
        v_profile.pass_checked_at,v_actor,btrim(p_reason))
      ON CONFLICT(target_id) DO UPDATE SET active=excluded.active,actor_id=excluded.actor_id,reason=excluded.reason,updated_at=now();
      UPDATE public.profiles SET starlight_pass=p_action='pass_on',updated_at=now() WHERE id=p_user;
      v_result:=jsonb_build_object('ok',true,'message','Staff Pass override saved. It remains until cleared.',
        'sourceBefore',v_profile.pass_source,'activeBefore',v_profile.starlight_pass);
    ELSIF p_action='pass_sync' THEN
      DELETE FROM private.staff_pass_overrides WHERE target_id=p_user RETURNING * INTO v_override;
      IF NOT FOUND THEN RAISE EXCEPTION 'There is no staff override to clear.'; END IF;
      UPDATE public.profiles SET starlight_pass=v_override.subscription_active,
        pass_source=v_override.subscription_source,pass_checked_at=v_override.subscription_checked_at,updated_at=now() WHERE id=p_user;
      v_result:=jsonb_build_object('ok',true,'message','Override cleared. Last recorded subscription state restored; a fresh Twitch check may still be needed.');
    ELSIF p_action IN ('pass_daily','pass_weekly','item') THEN
      IF p_action='item' THEN
        v_key:=v_payload->>'key'; v_qty:=(v_payload->>'qty')::integer;
        IF coalesce(v_qty,0) NOT BETWEEN 1 AND 10000 THEN RAISE EXCEPTION 'Quantity must be 1 to 10000.'; END IF;
        IF v_key IS NULL OR NOT (v_key=ANY(ARRAY['coins','berry','bait','pokeball','greatball','ultraball','lure','bag_bonus']
          ||private.extra_ball_keys()||private.capture_berry_keys()||private.evo_item_keys()||private.valuable_item_keys())) THEN
          RAISE EXCEPTION 'Item is not enabled for grants.';
        END IF;
        v_grants:=jsonb_build_object(v_key,v_qty);
      ELSE
        v_kind:=CASE WHEN p_action='pass_daily' THEN 'daily' ELSE 'weekly' END;
        v_grants:=private.pass_reward_grants(v_kind);
        IF v_grants IS NULL OR v_grants='{}'::jsonb THEN RAISE EXCEPTION 'Pass reward bundle is unavailable.'; END IF;
      END IF;
      IF EXISTS(SELECT 1 FROM jsonb_each_text(v_grants) e WHERE e.key<>ALL(ARRAY['coins','berry','bait','pokeball','greatball','ultraball','lure','bag_bonus']
        ||private.extra_ball_keys()||private.capture_berry_keys()||private.evo_item_keys()||private.valuable_item_keys())
        OR e.value !~ '^[0-9]+$' OR length(e.value)>5 OR e.value::numeric>10000) THEN RAISE EXCEPTION 'Reward bundle is not valid for full audited delivery.'; END IF;
      SELECT coalesce((SELECT bag_bonus FROM public.inventories WHERE user_id=p_user),0) INTO v_space_before;
      v_result:=private.grant_items(p_user,v_grants,'ADMIN_GRANT','staff-reward:'||p_request::text,'staff-reward:'||p_request::text,true);
      IF coalesce((v_grants->>'bag_bonus')::integer,0)>0 AND
        coalesce((SELECT bag_bonus FROM public.inventories WHERE user_id=p_user),0)-v_space_before<>(v_grants->>'bag_bonus')::integer THEN
        RAISE EXCEPTION 'The inventory-space grant would be capped; nothing was granted.';
      END IF;
      IF NOT coalesce((v_result->>'ok')::boolean,false) OR coalesce((v_result->>'full')::boolean,false) OR coalesce((v_result->>'duplicate')::boolean,false) THEN
        RAISE EXCEPTION 'The complete bundle was not delivered.';
      END IF;
      v_result:=v_result||jsonb_build_object('ok',true,'message','Rewards delivered. Player claim cooldowns were not changed.','requested',v_grants);
    ELSIF p_action='candy' THEN
      v_qty:=(v_payload->>'qty')::integer;
      IF coalesce(v_qty,0) NOT BETWEEN 1 AND 10000 THEN RAISE EXCEPTION 'Quantity must be 1 to 10000.'; END IF;
      PERFORM public.admin_grant_candy(p_user,(v_payload->>'dex')::integer,v_qty);
      v_result:=jsonb_build_object('ok',true,'message','Evolution Candy delivered.');
    ELSIF p_action='pokemon_batch' THEN
      IF jsonb_typeof(v_payload->'qty') IS DISTINCT FROM 'number'
        OR coalesce(v_payload->>'qty','') !~ '^[0-9]+$'
        OR length(v_payload->>'qty')>3 THEN
        RAISE EXCEPTION 'Choose a whole quantity from 2 to 100.';
      END IF;
      v_qty:=(v_payload->>'qty')::integer;
      IF v_qty NOT BETWEEN 2 AND 100 OR coalesce((v_payload->>'dex')::integer,0) NOT BETWEEN 1 AND 151
        OR coalesce((v_payload->>'level')::integer,0) NOT BETWEEN 1 AND 100 THEN
        RAISE EXCEPTION 'Choose 2–100 Pokémon, Kanto species 1–151 and level 1–100.';
      END IF;
      v_ids:='[]'::jsonb; v_public_ids:='[]'::jsonb;
      FOR v_index IN 1..v_qty LOOP
        v_generated:=private.persist_staff_gift(p_user,(v_payload->>'dex')::integer,(v_payload->>'level')::integer,
          'grant','grant:staff-reward:'||p_request::text||':'||v_index::text,'poke',NULL,
          coalesce((v_payload->>'shiny')::boolean,false),'sl-ref-20261013-227b573',NULL,
          CASE WHEN coalesce((v_payload->>'shiny')::boolean,false) THEN 'shiny' ELSE 'normal' END,NULL,NULL);
        IF NOT coalesce((v_generated->>'ok')::boolean,false) THEN RAISE EXCEPTION 'Canonical generation rejected the batch.'; END IF;
        v_ids:=v_ids||jsonb_build_array(v_generated->'catchId');
        v_public_ids:=v_public_ids||jsonb_build_array(v_generated->'publicId');
      END LOOP;
      v_result:=jsonb_build_object('ok',true,'quantity',v_qty,'catchIds',v_ids,'publicIds',v_public_ids,'path','wire',
        'message',v_qty::text||' Pokémon delivered through canonical generation.');
    ELSIF p_action='pokemon' THEN
      IF coalesce((v_payload->>'dex')::integer,0) NOT BETWEEN 1 AND 151 OR coalesce((v_payload->>'level')::integer,0) NOT BETWEEN 1 AND 100 THEN
        RAISE EXCEPTION 'Choose Kanto species 1–151 and level 1–100.';
      END IF;
      -- Explicit grant context: canonical generator/validator/persistence, no legacy raw INSERT, no WIRE activation.
      v_result:=private.persist_staff_gift(p_user,(v_payload->>'dex')::integer,(v_payload->>'level')::integer,
        'grant','grant:staff-reward:'||p_request::text,'poke',NULL,coalesce((v_payload->>'shiny')::boolean,false),
        'sl-ref-20261013-227b573',NULL,CASE WHEN coalesce((v_payload->>'shiny')::boolean,false) THEN 'shiny' ELSE 'normal' END,NULL,NULL);
      IF NOT coalesce((v_result->>'ok')::boolean,false) THEN RAISE EXCEPTION 'Canonical generation rejected the gift.'; END IF;
      v_result:=v_result||jsonb_build_object('message','Pokémon delivered through canonical generation.');
    ELSE
      v_key:=v_payload->>'id';
      IF p_action='title' THEN PERFORM public.admin_grant_title(p_user,v_key,btrim(p_reason));
      ELSIF p_action='cosmetic' THEN PERFORM public.admin_grant_cosmetic(p_user,v_key,btrim(p_reason));
      ELSIF p_action='badge' THEN PERFORM public.admin_grant_badge(p_user,v_key,btrim(p_reason)); END IF;
      v_result:=jsonb_build_object('ok',true,'message','Unlockable granted.');
    END IF;
    UPDATE private.staff_reward_actions SET status='succeeded',result=v_result,finished_at=now() WHERE request_id=p_request;
  EXCEPTION WHEN OTHERS THEN
    -- Inner transaction rollback preserves the outer receipt, with no partial gift.
    GET STACKED DIAGNOSTICS v_error=RETURNED_SQLSTATE;
    v_result:=jsonb_build_object('ok',false,'message','The action failed; nothing from this request was granted. Check eligibility, inventory limits and enabled catalog entries before a new attempt.');
    UPDATE private.staff_reward_actions SET status='failed',result=v_result,error_code=v_error,finished_at=now() WHERE request_id=p_request;
  END;
  RETURN v_result||jsonb_build_object('requestId',p_request,'replayed',false);
END $function$
;
revoke all on function public.admin_pass_rewards_read() from public,anon,authenticated;
revoke all on function public.admin_pass_rewards_save(uuid,text,jsonb,jsonb) from public,anon,authenticated;
