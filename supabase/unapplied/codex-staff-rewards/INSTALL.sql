-- Staff Pass and gifts: additive installation for the owner's requested features.
-- Existing trainer balances, Pass states, claims and catches are not modified by installation.
BEGIN;
DO $preflight$
DECLARE v_sig text; v_md5 text;
BEGIN
 IF to_regclass('private.staff_reward_actions') IS NOT NULL OR to_regclass('private.staff_pass_overrides') IS NOT NULL
 OR to_regprocedure('public.admin_trainer_rewards(uuid)') IS NOT NULL
 OR to_regprocedure('public.admin_trainer_reward_action(uuid,uuid,text,jsonb,text)') IS NOT NULL
 OR to_regprocedure('private.persist_staff_gift(uuid,integer,integer,text,text,text,uuid,boolean,text,text,text,text,text)') IS NOT NULL
 THEN RAISE EXCEPTION 'Staff reward objects already exist; do not replay this install.'; END IF;
 FOR v_sig,v_md5 IN SELECT * FROM (VALUES
 ('private.require_staff_edit()','07d2e855eefa8da56e99f32441bde2fd'),
 ('private.grant_items(uuid,jsonb,text,text,text,boolean)','79313a404313c34e5224ecdf2622cb6a'),
 ('private.persist_streamlink_catch(uuid,integer,integer,text,text,text,uuid,boolean,text,text,text,text,text)','0d1724fb07b156d6124b2f0f556303a4'),
 ('private.streamlink_protected_trainer(uuid)','0fa172fb089bf52959bbbbee3703ccdf'),
 ('private.pass_reward_grants(text)','03667e7de6a374444ff5b8449df813df'),
 ('public.admin_grant_candy(uuid,integer,integer)','83798742753dc6810480ec1ef89adef1'),
 ('public.admin_grant_title(uuid,text,text)','56ab6f85e76259887b215d28a6f1c6c2'),
 ('public.admin_grant_cosmetic(uuid,text,text)','5e22fc11972a950b8c19d815daaef6a4'),
 ('public.admin_grant_badge(uuid,text,text)','8f6e1e1b1676a1418ef311f0c45dd4c4')
 ) AS expected(signature,fingerprint)
 LOOP
  IF (SELECT md5(prosrc) FROM pg_proc WHERE oid=to_regprocedure(v_sig)) IS DISTINCT FROM v_md5
  THEN RAISE EXCEPTION 'Staff reward prerequisite drifted: %',v_sig; END IF;
 END LOOP;
END $preflight$;

-- Staff-only grant adapter derived from live canonical persister md5 0d1724fb07b156d6124b2f0f556303a4.
-- Only name and entry guard differ; canonical random generation, validation and insertion remain unchanged.
-- The existing persister and global WIRE switch are not modified.
CREATE OR REPLACE FUNCTION private.persist_staff_gift(p_user_id uuid, p_form_id integer, p_level integer, p_ctx text, p_source_key text, p_ball text DEFAULT 'poke'::text, p_round_id uuid DEFAULT NULL::uuid, p_shiny boolean DEFAULT false, p_content_build text DEFAULT 'sl-ref-20261013-227b573'::text, p_hidden_ticket text DEFAULT NULL::text, p_variant text DEFAULT 'normal'::text, p_name text DEFAULT NULL::text, p_gender text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  catch_id uuid;
  prep jsonb;
  mon jsonb;
  legal jsonb;
  ticket_uuid uuid;
  v_name text;
  v_variant text;
  v_public text;
  legacy text[];
  inserted uuid;
BEGIN
  PERFORM private.require_staff_edit();
  IF p_ctx IS DISTINCT FROM 'grant' OR p_source_key IS NULL OR p_source_key NOT LIKE 'grant:staff-reward:%' THEN
    RAISE EXCEPTION 'Only audited staff gift requests are accepted.' USING ERRCODE='42501';
  END IF;
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'errors', jsonb_build_array('missing-user'));
  END IF;
  IF p_ctx IS NULL OR p_ctx NOT IN ('catch', 'grant', 'event') THEN
    RETURN jsonb_build_object('ok', false, 'errors', jsonb_build_array('bad-ctx'));
  END IF;
  IF p_source_key IS NULL OR btrim(p_source_key) = '' THEN
    RETURN jsonb_build_object('ok', false, 'errors', jsonb_build_array('missing-source-key'));
  END IF;
  IF p_ctx = 'catch' AND p_source_key NOT LIKE 'play:%' THEN
    RETURN jsonb_build_object('ok', false, 'errors', jsonb_build_array('bad-source-key'));
  END IF;
  IF p_ctx = 'grant' AND p_source_key NOT LIKE 'grant:%' THEN
    RETURN jsonb_build_object('ok', false, 'errors', jsonb_build_array('bad-source-key'));
  END IF;
  IF p_ctx = 'event' AND p_source_key NOT LIKE 'event:%' THEN
    RETURN jsonb_build_object('ok', false, 'errors', jsonb_build_array('bad-source-key'));
  END IF;
  IF p_ctx IN ('grant', 'event') AND private.streamlink_protected_trainer(p_user_id) THEN
    RETURN jsonb_build_object('ok', false, 'errors', jsonb_build_array('protected-trainer'));
  END IF;

  catch_id := gen_random_uuid();
  prep := private.streamlink_generate_prepare(
    p_form_id, p_level, p_ctx, coalesce(p_content_build, 'sl-ref-20261013-227b573'), p_hidden_ticket
  );
  IF (prep->>'ok') IS DISTINCT FROM 'true' THEN
    RETURN prep;
  END IF;

  mon := private.streamlink_complete_and_bind(
    prep,
    coalesce(p_shiny, false),
    (private.streamlink_secure_u32() % 25)::int + 1,
    (private.streamlink_secure_u32() % 2147483647)::int,
    (private.streamlink_secure_u32() % 32)::int,
    (private.streamlink_secure_u32() % 32)::int,
    (private.streamlink_secure_u32() % 32)::int,
    (private.streamlink_secure_u32() % 32)::int,
    (private.streamlink_secure_u32() % 32)::int,
    (private.streamlink_secure_u32() % 32)::int,
    private.streamlink_secure_u32(),
    catch_id
  );
  IF (mon->>'ok') IS DISTINCT FROM 'true' THEN
    RETURN mon;
  END IF;

  IF (prep->>'ticketUuid') IS NOT NULL AND btrim(prep->>'ticketUuid') <> '' THEN
    ticket_uuid := (prep->>'ticketUuid')::uuid;
  END IF;
  legal := private.assert_streamlink_legal(mon, p_ctx, ticket_uuid);
  IF (legal->>'ok') IS DISTINCT FROM 'true' THEN
    RETURN legal;
  END IF;

  SELECT initcap(replace(s.slug, '-', ' '))
    INTO v_name
  FROM private.ref_species s
  WHERE s.content_build = prep->>'build'
    AND s.dex = private.streamlink_json_int(prep->'dex');
  v_name := coalesce(nullif(btrim(p_name), ''), v_name, 'Pokemon');
  v_variant := CASE
    WHEN coalesce(p_shiny, false) THEN 'shiny'
    ELSE coalesce(nullif(btrim(p_variant), ''), 'normal')
  END;
  v_public := private.streamlink_next_public_id('SL');
  SELECT coalesce(array_agg(x), ARRAY[]::text[])
    INTO legacy
  FROM jsonb_array_elements_text(mon->'legacyMoves') x;

  BEGIN
    INSERT INTO public.catches (
      id, user_id, dex, name, variant, gender, ball, round_id, source_key,
      public_id, level, pokemon_form_id,
      iv_hp, iv_atk, iv_def, iv_spa, iv_spd, iv_spe,
      av_hp, av_atk, av_def, av_spa, av_spd, av_spe,
      moves, friendship, height_m, weight_kg,
      nature_id, ability_id, ability_slot,
      ev_hp, ev_atk, ev_def, ev_spa, ev_spd, ev_spe,
      move_slots, ruleset_id, content_build,
      hp_current, hp_max, status, held_item, gigantamax_factor
    ) VALUES (
      catch_id,
      p_user_id,
      private.streamlink_json_int(mon->'dex'),
      v_name,
      v_variant,
      coalesce(nullif(btrim(p_gender), ''), mon->>'gender'),
      coalesce(nullif(btrim(p_ball), ''), 'poke'),
      p_round_id,
      p_source_key,
      v_public,
      private.streamlink_json_int(mon->'level'),
      private.streamlink_json_int(mon->'formId'),
      private.streamlink_json_int(mon#>'{ivs,hp}'),
      private.streamlink_json_int(mon#>'{ivs,atk}'),
      private.streamlink_json_int(mon#>'{ivs,def}'),
      private.streamlink_json_int(mon#>'{ivs,spa}'),
      private.streamlink_json_int(mon#>'{ivs,spd}'),
      private.streamlink_json_int(mon#>'{ivs,spe}'),
      0, 0, 0, 0, 0, 0,
      legacy,
      private.streamlink_json_int(mon->'friendship'),
      (mon->>'heightM')::numeric,
      (mon->>'weightKg')::numeric,
      private.streamlink_json_int(mon->'natureId'),
      private.streamlink_json_int(mon->'abilityId'),
      mon->>'abilitySlot',
      0, 0, 0, 0, 0, 0,
      mon->'moveSlots',
      mon->>'rulesetId',
      mon->>'contentBuild',
      private.streamlink_json_int(mon->'hpCurrent'),
      private.streamlink_json_int(mon->'hpMax'),
      NULL,
      NULL,
      false
    )
    RETURNING id INTO inserted;
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'ok', false,
      'errors', jsonb_build_array('already-settled'),
      'replay', true,
      'path', 'wire'
    );
  END;

  RETURN jsonb_build_object(
    'ok', true,
    'catchId', inserted,
    'publicId', v_public,
    'path', 'wire',
    'mon', mon
  );
END
$function$;

REVOKE ALL ON FUNCTION private.persist_staff_gift(uuid,integer,integer,text,text,text,uuid,boolean,text,text,text,text,text) FROM PUBLIC,anon,authenticated,service_role;

-- REVIEWED INSTALL REQUIRED. Not a migration; not applied by GitHub Pages.
-- No encounter/settlement/odds definitions or WIRE switches are modified.
CREATE TABLE private.staff_reward_actions (
  request_id uuid PRIMARY KEY,
  actor_id uuid NOT NULL,
  target_id uuid NOT NULL REFERENCES public.profiles(id),
  action text NOT NULL,
  payload jsonb NOT NULL,
  reason text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending','succeeded','failed')),
  result jsonb,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
CREATE INDEX ON private.staff_reward_actions (target_id, created_at DESC);
CREATE TABLE private.staff_pass_overrides (
  target_id uuid PRIMARY KEY REFERENCES public.profiles(id),
  active boolean NOT NULL,
  source_before text,
  subscription_active boolean NOT NULL DEFAULT false,
  subscription_source text,
  subscription_checked_at timestamptz,
  actor_id uuid NOT NULL,
  reason text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE private.staff_reward_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.staff_pass_overrides ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.staff_reward_actions, private.staff_pass_overrides FROM PUBLIC, anon, authenticated;

-- Enforce staff overrides even when the Twitch Edge Function updates profiles.
-- Retain the latest underlying subscription result for explicit sync restoration.
CREATE FUNCTION private.enforce_staff_pass_override() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE v_override private.staff_pass_overrides;
BEGIN
  SELECT * INTO v_override FROM private.staff_pass_overrides WHERE target_id = NEW.id FOR UPDATE;
  IF FOUND THEN
    IF auth.role() = 'service_role' THEN
      UPDATE private.staff_pass_overrides SET
        subscription_active = coalesce(NEW.starlight_pass,false),
        subscription_source = NEW.pass_source,
        subscription_checked_at = NEW.pass_checked_at
      WHERE target_id = NEW.id;
    END IF;
    NEW.starlight_pass := v_override.active;
    NEW.pass_source := CASE WHEN v_override.active THEN 'admin' ELSE v_override.source_before END;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER staff_pass_override BEFORE UPDATE OF starlight_pass, pass_source, pass_checked_at
ON public.profiles FOR EACH ROW EXECUTE FUNCTION private.enforce_staff_pass_override();
REVOKE ALL ON FUNCTION private.enforce_staff_pass_override() FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.admin_trainer_rewards(p_user uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE v_pass jsonb; v_claims jsonb; v_actions jsonb; v_catalog jsonb;
BEGIN
  PERFORM private.require_staff_edit();
  IF p_user IS NULL THEN RAISE EXCEPTION 'Pick a trainer.' USING ERRCODE='22023'; END IF;
  SELECT jsonb_build_object('active',p.starlight_pass,'source',p.pass_source,'checkedAt',p.pass_checked_at,
    'dailyAt',i.pass_daily_at,'weeklyAt',i.pass_weekly_at,'override',o.active,
    'sourceBeforeOverride',o.source_before,'subscriptionActive',o.subscription_active,
    'subscriptionSource',o.subscription_source,'subscriptionCheckedAt',o.subscription_checked_at,
    'overrideAt',o.updated_at)
  INTO v_pass FROM public.profiles p LEFT JOIN public.inventories i ON i.user_id=p.id
    LEFT JOIN private.staff_pass_overrides o ON o.target_id=p.id WHERE p.id=p_user;
  IF v_pass IS NULL THEN RAISE EXCEPTION 'Trainer not found.' USING ERRCODE='22023'; END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.at DESC),'[]'::jsonb) INTO v_claims FROM (
    SELECT e.created_at AS at,e.source_id AS kind,e.grants AS requested,
      coalesce((SELECT jsonb_object_agg(l.item_key,l.amount) FROM public.item_ledger l
        WHERE l.user_id=p_user AND l.idempotency=e.idempotency||':'||l.item_key),'{}'::jsonb) AS items,
      coalesce((SELECT sum(c.amount) FROM public.coin_ledger c WHERE c.user_id=p_user
        AND c.idempotency=e.idempotency||':coins'),0) AS coins,
      e.idempotency AS reference
    FROM public.reward_events e WHERE e.user_id=p_user AND e.source_id IN ('pass-daily','pass-weekly')
    ORDER BY e.created_at DESC LIMIT 50
  ) x;
  SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC),'[]'::jsonb) INTO v_actions FROM (
    SELECT request_id,actor_id,action,payload,reason,status,result,created_at,finished_at
    FROM private.staff_reward_actions WHERE target_id=p_user ORDER BY created_at DESC LIMIT 50
  ) x;
  SELECT jsonb_build_object(
    'items',coalesce((SELECT jsonb_agg(jsonb_build_object('id',k,'name',k) ORDER BY k)
      FROM (SELECT DISTINCT unnest(ARRAY['coins','berry','bait','pokeball','greatball','ultraball','lure','bag_bonus']
        ||private.extra_ball_keys()||private.capture_berry_keys()||private.evo_item_keys()||private.valuable_item_keys()) AS k) keys),'[]'::jsonb),
    'titles',coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'name',name) ORDER BY name) FROM public.progression_titles WHERE enabled),'[]'::jsonb),
    'cosmetics',coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'name',name,'kind',kind) ORDER BY name) FROM public.progression_cosmetics WHERE enabled),'[]'::jsonb),
    'badges',coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'name',name) ORDER BY name) FROM public.progression_badges WHERE enabled),'[]'::jsonb)
  ) INTO v_catalog;
  RETURN jsonb_build_object('ok',true,'pass',v_pass,'claims',v_claims,'actions',v_actions,'catalog',v_catalog,
    'canWrite',NOT private.streamlink_protected_trainer(p_user),
    'bundles',jsonb_build_object('daily',private.pass_reward_grants('daily'),'weekly',private.pass_reward_grants('weekly')),
    'historyLimit',50,'legacyFailuresAvailable',false);
END $$;
REVOKE ALL ON FUNCTION public.admin_trainer_rewards(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_trainer_rewards(uuid) TO authenticated;

CREATE FUNCTION public.admin_trainer_reward_action(p_user uuid,p_request uuid,p_action text,p_payload jsonb,p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE
  v_actor uuid := auth.uid(); v_prior private.staff_reward_actions;
  v_profile public.profiles; v_override private.staff_pass_overrides;
  v_payload jsonb := coalesce(p_payload,'{}'::jsonb); v_result jsonb;
  v_grants jsonb; v_key text; v_qty integer; v_kind text; v_error text; v_space_before integer;
BEGIN
  PERFORM private.require_staff_edit();
  IF v_actor IS NULL OR p_user IS NULL OR p_request IS NULL OR length(btrim(coalesce(p_reason,''))) NOT BETWEEN 3 AND 500 THEN
    RAISE EXCEPTION 'A target, request id and staff reason are required.' USING ERRCODE='22023';
  END IF;
  IF p_action IS NULL OR jsonb_typeof(v_payload)<>'object' OR p_action NOT IN ('pass_on','pass_off','pass_sync','pass_daily','pass_weekly','item','candy','pokemon','title','cosmetic','badge') THEN
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
END $$;
REVOKE ALL ON FUNCTION public.admin_trainer_reward_action(uuid,uuid,text,jsonb,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_trainer_reward_action(uuid,uuid,text,jsonb,text) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
