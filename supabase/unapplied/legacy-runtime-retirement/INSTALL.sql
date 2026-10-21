-- Current-ruleset routing and approved legacy writer retirement. No specimen mutation.
begin;set local lock_timeout='5s';set local statement_timeout='30s';
do $guard$ begin
 if (select md5(prosrc) from pg_proc where oid='private.materialize_streamlink_catch(uuid,integer,integer,text,text,text,uuid,boolean,text,text,text,text,text)'::regprocedure) is distinct from 'e88c6cbec313a4cc0b81a5df1f5691b3' then raise exception 'Runtime source drift: materialize_streamlink_catch';end if;
 if (select md5(prosrc) from pg_proc where oid='private.persist_streamlink_catch(uuid,integer,integer,text,text,text,uuid,boolean,text,text,text,text,text)'::regprocedure) is distinct from 'b7de6c0648c81f91288c2433dea818c5' then raise exception 'Runtime source drift: persist_streamlink_catch';end if;
 if (select md5(prosrc) from pg_proc where oid='private.record_stream_catch(text,text,integer,text,text,text,text,uuid,text,timestamp with time zone)'::regprocedure) is distinct from 'a3ff5a3e38fd3c6319f11057866b86c1' then raise exception 'Runtime source drift: record_stream_catch';end if;
 if (select md5(prosrc) from pg_proc where oid='public.bridge_import_catches(text,jsonb)'::regprocedure) is distinct from '68dceb5714de0d669a65e4fde3e9a3a4' then raise exception 'Runtime source drift: bridge_import_catches';end if;
 if (select md5(prosrc) from pg_proc where oid='public.bridge_publish(text,jsonb)'::regprocedure) is distinct from '5b233fd0df065ae301c9efd570468455' then raise exception 'Runtime source drift: bridge_publish';end if;
 if (select md5(prosrc) from pg_proc where oid='public.admin_grant_pokemon(uuid,integer,text,text,boolean,text)'::regprocedure) is distinct from '194355d874ec8c8d2f35897636397279' then raise exception 'Runtime source drift: admin_grant_pokemon';end if;
 if (select md5(prosrc) from pg_proc where oid='public.admin_oak_qa(text,uuid,jsonb)'::regprocedure) is distinct from 'b73928e98acf8e3e8414936f3fc97281' then raise exception 'Runtime source drift: admin_oak_qa';end if;
 if (select md5(prosrc) from pg_proc where oid='private.phase2_evolution_selftest()'::regprocedure) is distinct from '0786904741d9eb6466d57fc90ce60ad0' then raise exception 'Runtime source drift: phase2_evolution_selftest';end if;
 if (select md5(prosrc) from pg_proc where oid='private.phase4_catch_candy_selftest()'::regprocedure) is distinct from 'aaaad7e953f22302edc42e6ea5bc4fcc' then raise exception 'Runtime source drift: phase4_catch_candy_selftest';end if;
 if (select md5(prosrc) from pg_proc where oid='private.launch_community_round(integer,text,boolean,text,boolean,integer)'::regprocedure) is distinct from '7ec7f1fd0902ba7315f2b926194ab78e' then raise exception 'Runtime source drift: launch_community_round';end if;
 if (select md5(prosrc) from pg_proc where oid='private.stamp_catch_row(catches)'::regprocedure) is distinct from '97f28530a6df3887702a9d9962cfb6e2' then raise exception 'Runtime source drift: stamp_catch_row';end if;
 if (select md5(prosrc) from pg_proc where oid='private.evolve_catch(uuid,uuid,text,text)'::regprocedure) is distinct from 'e3d15b55873bb307c17c09f74859654a' then raise exception 'Runtime source drift: evolve_catch';end if;
end $guard$;
CREATE OR REPLACE FUNCTION private.materialize_streamlink_catch(p_user_id uuid, p_form_id integer, p_level integer, p_ctx text, p_source_key text, p_ball text DEFAULT 'poke'::text, p_round_id uuid DEFAULT NULL::uuid, p_shiny boolean DEFAULT false, p_content_build text DEFAULT 'sl-ref-20261013-227b573'::text, p_hidden_ticket text DEFAULT NULL::text, p_variant text DEFAULT 'normal'::text, p_name text DEFAULT NULL::text, p_gender text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
begin
 return private.persist_streamlink_catch(p_user_id,p_form_id,p_level,p_ctx,p_source_key,p_ball,p_round_id,p_shiny,p_content_build,p_hidden_ticket,p_variant,p_name,p_gender);
end;
$function$
;
CREATE OR REPLACE FUNCTION private.persist_streamlink_catch(p_user_id uuid, p_form_id integer, p_level integer, p_ctx text, p_source_key text, p_ball text DEFAULT 'poke'::text, p_round_id uuid DEFAULT NULL::uuid, p_shiny boolean DEFAULT false, p_content_build text DEFAULT 'sl-ref-20261013-227b573'::text, p_hidden_ticket text DEFAULT NULL::text, p_variant text DEFAULT 'normal'::text, p_name text DEFAULT NULL::text, p_gender text DEFAULT NULL::text)
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
  IF NOT private.streamlink_wire_is_enabled() THEN
    RETURN jsonb_build_object('ok', false, 'errors', jsonb_build_array('wire-disabled'), 'path', 'wire');
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
$function$
;
CREATE OR REPLACE FUNCTION private.record_stream_catch(p_user text, p_name text, p_dex integer, p_species text, p_variant text, p_gender text, p_ball text, p_round uuid, p_source_key text DEFAULT NULL::text, p_caught_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
begin
 -- Legacy bridge results are not current-ruleset specimen authority.
 return false;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.bridge_import_catches(p_token text, p_catches jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
 if not private.bridge_ok(p_token) then raise exception 'not allowed' using errcode='42501';end if;
 return jsonb_build_object('ok',false,'imported',0,'error','legacy-catch-import-retired','message','Catch imports have retired. Use Play for catches and Trainer Gifts for staff grants.');
end;
$function$
;
CREATE OR REPLACE FUNCTION public.bridge_publish(p_token text, p_round jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  source_key text;
  round_id uuid;
  rec record;
  v_phase text;
  v_hidden boolean;
  v_cancelled boolean;
  v_resolved boolean;
  existing public.encounter_rounds;
begin
  if not private.bridge_ok(p_token) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update private.stream_bridge set seen_at = now() where id = 1;
  perform private.settle_due_rounds();
  if p_round is null or coalesce(p_round->>'id', '') = '' then
    update public.encounter_rounds
      set hidden = true, phase = 'closed', last_action = coalesce(p_round->>'lastAction', last_action), updated_at = now()
      where source = 'mixitup'
        and coalesce(cancelled, false) = false
        and paused_at is null
        and coalesce(resolved, false) = true
        and phase <> 'closed'
        and (
          deadlines is null
          or coalesce((deadlines->>'reveal')::timestamptz, '-infinity'::timestamptz) <= now()
        );
    return jsonb_build_object('ok', true);
  end if;
  source_key := 'mixitup:' || (p_round->>'id');
  select * into existing from public.encounter_rounds where source_id = source_key;
  v_phase := coalesce(p_round->>'phase', 'closed');
  v_cancelled := coalesce((p_round->>'cancelled')::boolean, false);
  v_resolved := coalesce((p_round->>'resolved')::boolean, false);
  v_hidden := coalesce((p_round->>'hidden')::boolean, false);
  if not v_cancelled then
    v_hidden := false;
  end if;
  if existing.paused_at is not null and not v_cancelled and not v_resolved then
    return jsonb_build_object('ok', true, 'id', existing.id, 'paused', true);
  end if;
  insert into public.encounter_rounds (
    source_id, source, phase, hidden, pokemon, dex, name, variant, gender,
    started_at, deadlines, rules, resolved, cancelled, last_action, ends_at, players
  ) values (
    source_key, 'mixitup', v_phase,
    v_hidden,
    jsonb_build_object('dex', (p_round->>'dex')::int, 'name', p_round->>'name', 'variant', coalesce(p_round->>'variant', 'normal'), 'gender', coalesce(p_round->>'gender', 'Unknown')),
    nullif(p_round->>'dex', '')::int, p_round->>'name', coalesce(p_round->>'variant', 'normal'), coalesce(p_round->>'gender', 'Unknown'),
    nullif(p_round->>'startedAt', '')::timestamptz, p_round->'deadlines', p_round->'rules',
    v_resolved, v_cancelled,
    coalesce(p_round->>'lastAction', ''), nullif(p_round->>'endsAt', '')::timestamptz, '{}'::jsonb
  )
  on conflict (source_id) do update set
    source = 'mixitup',
    phase = excluded.phase,
    hidden = excluded.hidden, pokemon = excluded.pokemon,
    dex = excluded.dex, name = excluded.name, variant = excluded.variant, gender = excluded.gender,
    started_at = coalesce(public.encounter_rounds.started_at, excluded.started_at),
    deadlines = case
      when private.deadlines_complete(public.encounter_rounds.deadlines) then public.encounter_rounds.deadlines
      else coalesce(excluded.deadlines, public.encounter_rounds.deadlines)
    end,
    rules = excluded.rules,
    resolved = case
      when public.encounter_rounds.deadlines is not null
           and now() < coalesce((public.encounter_rounds.deadlines->>'throw')::timestamptz, now())
           and not excluded.cancelled
        then public.encounter_rounds.resolved
      else excluded.resolved or public.encounter_rounds.resolved
    end,
    cancelled = excluded.cancelled,
    last_action = case
      when excluded.last_action is null or btrim(excluded.last_action) = '' then public.encounter_rounds.last_action
      when excluded.last_action ~* 'joined'
           and exists (
             select 1 from public.encounter_players ep
             where ep.round_id = public.encounter_rounds.id
               and (ep.prep is not null or ep.ball is not null)
           )
           and not v_cancelled then public.encounter_rounds.last_action
      when exists (
        select 1 from public.encounter_players ep
        where ep.round_id = public.encounter_rounds.id and ep.ball is not null
      ) and excluded.last_action ~* 'berry|honey|bait' and not v_resolved then public.encounter_rounds.last_action
      else excluded.last_action
    end,
    paused_at = case
      when excluded.cancelled or (
        excluded.resolved
        and (
          public.encounter_rounds.deadlines is null
          or now() >= coalesce((public.encounter_rounds.deadlines->>'throw')::timestamptz, now())
        )
      ) then null
      else public.encounter_rounds.paused_at
    end,
    ends_at = excluded.ends_at, updated_at = now()
  returning id into round_id;
  select * into existing from public.encounter_rounds where id = round_id;
  existing := coalesce(private.settle_if_needed(existing), existing);
  -- Keep status/round publishing; external catch result imports are retired.
  return jsonb_build_object('ok', true, 'id', round_id, 'catchImportsRetired', true);
end;
$function$
;
CREATE OR REPLACE FUNCTION public.admin_grant_pokemon(p_user uuid, p_dex integer, p_name text DEFAULT NULL::text, p_gender text DEFAULT 'Unknown'::text, p_shiny boolean DEFAULT false, p_ball text DEFAULT 'pokeball'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
 perform private.require_staff_edit();
 raise exception 'This grant tool has retired. Open the Trainer record and use Gifts.';
end;
$function$
;
CREATE OR REPLACE FUNCTION public.admin_oak_qa(p_action text, p_user uuid, p_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  admin uuid := auth.uid();
  payload jsonb := coalesce(p_payload, '{}'::jsonb);
  action text := upper(trim(coalesce(p_action, '')));
  mon_dex int;
  mon_qty int;
  i int;
  catch_id uuid;
  fam int;
  candy_amt int;
  grants jsonb := '{}'::jsonb;
  created int := 0;
  sora uuid := '60ff5211-6ef8-40e6-8daa-095b5600bf4c';
  warn boolean := false;
  catch_row public.catches;
  spec public.species;
  fam_name text;
  candy_base int;
  pay int := 0;
  candy_key text;
  proofs jsonb := '[]'::jsonb;
  before_qty int;
  after_qty int;
begin
  perform private.require_staff_edit();
  if admin is null or not private.is_play_admin() then
    raise exception 'Admin only.' using errcode = '42501';
  end if;
  if p_user is null then raise exception 'Pick a target Trainer.'; end if;
  if not exists (select 1 from public.profiles where id = p_user) then raise exception 'Unknown Trainer.'; end if;
  warn := p_user = sora;

  if action = 'GRANT_MON' then
    raise exception 'This Pokémon preset has retired. Open the Trainer record and use Gifts.';

  elsif action = 'GRANT_CANDY' then
    fam := coalesce((payload->>'familyId')::int, (payload->>'dex')::int);
    candy_amt := greatest(1, least(999, coalesce((payload->>'amount')::int, 1)));
    if fam is null then raise exception 'Pick an Evolution Line.'; end if;
    fam := coalesce((select s.family_id from public.species s where s.dex = fam), fam);
    perform private.grant_family_candy(p_user, fam, candy_amt, 'ADMIN_QA', 'Oak Lab QA candy',
      jsonb_build_object('idempotency', 'qa-candy:' || admin::text || ':' || p_user::text || ':' || fam::text || ':' || clock_timestamp()::text));
    insert into public.admin_qa_grants (admin_id, target_user, kind, payload)
    values (admin, p_user, 'GRANT_CANDY', jsonb_build_object('familyId', fam, 'amount', candy_amt, 'soraWarning', warn));
    return jsonb_build_object('ok', true, 'familyId', fam, 'amount', candy_amt, 'soraWarning', warn, 'message', 'Granted Evolution Candy.');

  elsif action = 'GRANT_ITEMS' then
    grants := coalesce(payload->'grants', '{}'::jsonb);
    perform private.ensure_inventory(p_user);
    perform private.grant_items(p_user, grants, 'ADMIN_QA', 'Oak Lab QA items',
      'qa-items:' || admin::text || ':' || p_user::text || ':' || clock_timestamp()::text, true);
    insert into public.admin_qa_grants (admin_id, target_user, kind, payload)
    values (admin, p_user, 'GRANT_ITEMS', jsonb_build_object('grants', grants, 'soraWarning', warn));
    return jsonb_build_object('ok', true, 'soraWarning', warn, 'message', 'Granted QA evolution items.');

  elsif action = 'PRESET_OAK' then
    raise exception 'This Pokémon preset has retired. Open the Trainer record and use Gifts.';

  elsif action = 'PRESET_EVO' then
    raise exception 'This Pokémon preset has retired. Open the Trainer record and use Gifts.';

  elsif action = 'PROOF_TRANSFER' then
    for catch_id in select x::uuid from jsonb_array_elements_text(coalesce(payload->'catchIds', '[]'::jsonb)) t(x) loop
      select * into catch_row from public.catches
       where id = catch_id and user_id = p_user and transferred_at is null and obtained_method = 'ADMIN_QA' for update;
      if catch_row.id is null then raise exception 'ADMIN_QA catch % missing for target.', catch_id; end if;
      select * into spec from public.species where species.dex = catch_row.dex;
      fam := coalesce(spec.family_id, catch_row.dex);
      select f.name, f.base_dex into fam_name, candy_base from public.evolution_families f where f.id = fam;
      if candy_base is null then candy_base := fam; fam_name := coalesce(spec.name, catch_row.name); end if;
      candy_key := 'species-' || fam::text;
      pay := case coalesce(spec.evo_stage, 0) when 2 then 2 when 3 then 3 else 1 end;
      if coalesce(catch_row.is_alpha, false) or strpos(coalesce(catch_row.variant, ''), 'shiny') > 0 then pay := pay + 1; end if;
      select coalesce(fc.qty,0) into before_qty from public.family_candy fc where fc.user_id = p_user and fc.family_id = fam;
      perform private.grant_family_candy(p_user, fam, pay, 'OAK_TRANSFER', 'Sent to Professor Oak',
        jsonb_build_object('idempotency', 'oak:' || catch_row.id::text, 'catchId', catch_row.id::text));
      insert into public.oak_transfers (user_id, dex, catch_id, candy_key) values (p_user, catch_row.dex, catch_row.id, candy_key);
      update public.catches set transferred_at = now() where id = catch_row.id;
      select coalesce(fc.qty,0) into after_qty from public.family_candy fc where fc.user_id = p_user and fc.family_id = fam;
      proofs := proofs || jsonb_build_object('catchId', catch_row.id, 'dex', catch_row.dex, 'name', catch_row.name, 'familyId', fam, 'candyKey', candy_key, 'candyGranted', pay, 'candyBaseDex', candy_base, 'candyName', coalesce(fam_name, 'Evolution') || ' Evolution Candy', 'balanceBefore', before_qty, 'balanceAfter', after_qty);
    end loop;
    insert into public.admin_qa_grants (admin_id, target_user, kind, payload)
    values (admin, p_user, 'PROOF_TRANSFER', jsonb_build_object('proofs', proofs, 'soraWarning', warn));
    return jsonb_build_object('ok', true, 'proofs', proofs, 'soraWarning', warn);

  elsif action = 'RESET_QA' then
    delete from public.oak_transfers ot using public.catches qa where ot.catch_id = qa.id and qa.user_id = p_user and qa.obtained_method = 'ADMIN_QA';
    delete from public.candy_ledger cl using public.catches qa where cl.related_catch = qa.id and qa.user_id = p_user and qa.obtained_method = 'ADMIN_QA';
    delete from public.catches where user_id = p_user and obtained_method = 'ADMIN_QA';
    delete from public.candy_ledger where user_id = p_user and type = 'ADMIN_QA';
    update public.family_candy fc set qty = greatest(0, coalesce((select sum(cl.amount) from public.candy_ledger cl where cl.user_id = fc.user_id and cl.family_id = fc.family_id), 0)) where fc.user_id = p_user;
    delete from public.family_candy fc2 where fc2.user_id = p_user and fc2.qty <= 0;
    insert into public.admin_qa_grants (admin_id, target_user, kind, payload)
    values (admin, p_user, 'RESET_QA', jsonb_build_object('soraWarning', warn));
    return jsonb_build_object('ok', true, 'soraWarning', warn, 'message', 'ADMIN_QA catches and ADMIN_QA candy ledger rows cleared.');

  else
    raise exception 'Unknown Oak QA action.';
  end if;
end;
$function$
;
CREATE OR REPLACE FUNCTION private.phase2_evolution_selftest()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
 raise exception 'This legacy specimen self-test has retired. Use the isolated current-ruleset rehearsal.';
end;
$function$
;
CREATE OR REPLACE FUNCTION private.phase4_catch_candy_selftest()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
 raise exception 'This legacy specimen self-test has retired. Use the isolated current-ruleset rehearsal.';
end;
$function$
;
CREATE OR REPLACE FUNCTION private.launch_community_round(p_dex integer, p_gender text, p_shiny boolean, p_source text, p_test boolean DEFAULT false, p_form_id integer DEFAULT NULL::integer)
 RETURNS encounter_rounds
 LANGUAGE plpgsql
AS $function$
declare
  r public.encounter_rounds;
  settings jsonb;
  chosen_dex int;
  chosen_name text;
  chosen_variant text := 'normal';
  chosen_gender text;
  chosen_level int;
  chosen_form int;
  chosen_form_label text;
  round_id uuid := gen_random_uuid();
  t timestamptz := now();
  deadlines jsonb;
  female_look boolean;
  test_out text;
  loc text;
  sev jsonb;
  vpol text;
  guc_form text;
  forced_g text;
begin
  if not private.streamlink_wire_is_enabled() then
    raise exception 'Catch generation is temporarily unavailable. Please try again later.';
  end if;
  r := private.sync_latest_round();
  if private.round_is_active(r) then
    raise exception 'A community round is already running.';
  end if;
  if exists (select 1 from private.special_events where status = 'LIVE')
     and nullif(current_setting('play.special_event_id', true), '') is null
     and coalesce(p_source, '') is distinct from 'TEST' then
    raise exception 'A Special Event is live. Normal encounters cannot overwrite it.';
  end if;
  settings := private.game_settings();
  if p_test then
    settings := coalesce(settings, '{}'::jsonb) || jsonb_build_object(
      'rewardMode', 'test',
      'testMode', true,
      'joinSeconds', 6,
      'prepareSeconds', 6,
      'throwSeconds', 6,
      'revealSeconds', 8
    );
    test_out := nullif(btrim(current_setting('play.test_outcome', true)), '');
    if test_out in ('catch', 'escape') then
      settings := settings || jsonb_build_object('testOutcome', test_out);
    end if;
    if current_setting('play.test_rewards', true) = 'true' then
      settings := settings || jsonb_build_object('testRewards', true);
    end if;
  end if;
  if p_dex is null then
    chosen_dex := private.spawn_pick_random_dex();
    chosen_form := private.canonical_form_id(chosen_dex, chosen_dex);
  else
    chosen_dex := p_dex;
    guc_form := nullif(btrim(current_setting('play.special_form_id', true)), '');
    chosen_form := coalesce(p_form_id, nullif(guc_form, '')::int, chosen_dex);
    if upper(coalesce(p_source, '')) = 'AUTO' then
      chosen_form := chosen_dex;
    end if;
    chosen_form := private.assert_form_launchable(chosen_dex, chosen_form, p_source);
  end if;
  if chosen_dex < 1 or chosen_dex > 1025 then
    raise exception 'Choose a Pokédex number from 1 to 1025.';
  end if;
  if private.spawn_band(chosen_dex) in ('LEGENDARY', 'EVENT') then
    if coalesce(p_source, '') = 'SPECIAL_EVENT'
       and nullif(current_setting('play.special_event_id', true), '') is not null then
      null;
    elsif coalesce(p_source, '') in ('ADMIN', 'ADMIN_SPECIFIC', 'TEST') and p_dex is not null then
      null;
    else
      raise exception 'Legendary and Event species can only appear through a Special Event.';
    end if;
  end if;
  if upper(coalesce(p_source, '')) = 'AUTO' and not private.form_is_base(chosen_form) then
    raise exception 'Alternate forms cannot appear in normal encounters.';
  end if;
  chosen_name := private.form_display_name(chosen_dex, chosen_form);
  select f.form_label, f.forced_gender
    into chosen_form_label, forced_g
    from public.pokemon_forms f
   where f.pokemon_form_id = chosen_form;

  if forced_g is not null then
    if p_gender is not null
       and p_gender in ('Male', 'Female', 'Genderless')
       and p_gender is distinct from forced_g then
      raise exception 'Form % requires gender % (got %).', chosen_form, forced_g, p_gender;
    end if;
    chosen_gender := forced_g;
  elsif p_gender in ('Male', 'Female', 'Genderless') then
    chosen_gender := p_gender;
  else
    chosen_gender := private.lgpe_roll_gender(chosen_dex, floor(random() * 2147483647)::int, null);
  end if;

  female_look := chosen_gender = 'Female'
    and private.form_is_base(chosen_form)
    and chosen_dex = any (private.female_visual_dex());
  vpol := upper(coalesce(nullif(current_setting('play.special_variant_policy', true), ''), ''));
  if vpol = 'FORCED_SHINY' then
    p_shiny := true;
  elsif vpol = 'DISABLED' then
    p_shiny := false;
  end if;
  if p_shiny is true then
    chosen_variant := case when female_look then 'shiny-female' else 'shiny' end;
  elsif p_shiny is false then
    chosen_variant := case when female_look then 'female' else 'normal' end;
  elsif random() < (1.0 / 4096.0) then
    chosen_variant := case when female_look then 'shiny-female' else 'shiny' end;
  else
    chosen_variant := case when female_look then 'female' else 'normal' end;
  end if;
  loc := coalesce(nullif(current_setting('play.special_location', true), ''), private.lgpe_habitat(chosen_dex));
  begin
    sev := nullif(current_setting('play.special_event_json', true), '')::jsonb;
  exception when others then
    sev := null;
  end;
  if sev is not null then
    settings := coalesce(settings, '{}'::jsonb) || jsonb_build_object('specialEvent', sev);
  end if;
  deadlines := private.round_deadlines(settings, t);
  chosen_level := private.encounter_pokemon_level(chosen_dex, round_id);
  insert into public.encounter_rounds (
    id, phase, hidden, pokemon, dex, name, variant, gender, pokemon_form_id,
    started_at, deadlines, rules, resolved, cancelled, last_action, ends_at, trigger_source, source
  ) values (
    round_id, 'join', false,
    jsonb_build_object(
      'dex', chosen_dex,
      'name', chosen_name,
      'variant', chosen_variant,
      'gender', chosen_gender,
      'location', loc,
      'level', chosen_level,
      'formId', chosen_form,
      'formKey', coalesce((select form_key from public.pokemon_forms where pokemon_form_id = chosen_form), 'base'),
      'formLabel', coalesce(chosen_form_label, 'Base'),
      'isBaseForm', private.form_is_base(chosen_form)
    ),
    chosen_dex, chosen_name, chosen_variant, chosen_gender, chosen_form,
    t, deadlines, settings, false, false,
    case when p_test then '[TEST MODE] ' else '' end || chosen_name || ' appeared!',
    (deadlines->>'join')::timestamptz,
    p_source,
    'play'
  ) returning * into r;
  return r;
end;
$function$
;
CREATE OR REPLACE FUNCTION private.stamp_catch_row(c catches)
 RETURNS catches
 LANGUAGE plpgsql
AS $function$
declare
 seed bigint;size_roll int;trainer public.profiles%rowtype;generated_moves text[];move_count int;
begin
 if c.ruleset_id is distinct from 'streamlink-gen9-xgen' or nullif(c.content_build,'') is null then
  raise exception 'This Pokémon creation method is no longer supported. Use Play or Trainer Gifts.' using errcode='22023';
 end if;
 if c.level is null or c.pokemon_form_id is null or c.nature_id is null or c.ability_id is null or c.ability_slot is null
 or c.iv_hp is null or c.iv_atk is null or c.iv_def is null or c.iv_spa is null or c.iv_spd is null or c.iv_spe is null
 or c.ev_hp is null or c.ev_atk is null or c.ev_def is null or c.ev_spa is null or c.ev_spd is null or c.ev_spe is null
 or c.hp_max is null or c.hp_current is null or c.height_m is null or c.weight_kg is null or c.friendship is null
 or c.gender is null or jsonb_typeof(c.move_slots) is distinct from 'array' then
  raise exception 'This Pokémon battle record is incomplete. Contact support.' using errcode='22023';
 end if;
 if not exists(select 1 from private.ref_forms f where f.content_build=c.content_build and f.form_id=c.pokemon_form_id and f.dex=c.dex) then
  raise exception 'This Pokémon form record is unavailable. Contact support.' using errcode='22023';
 end if;
 if c.public_id is null or btrim(c.public_id)='' then c.public_id:=private.streamlink_next_public_id('SL');end if;
 seed:=abs((('x'||substr(md5(c.id::text),1,8))::bit(32)::int)::bigint);
 if c.size_class is null or c.size_class not in('XS','S','M','L','XL') then
  size_roll:=seed%256;c.size_class:=case when size_roll<12 then 'XS' when size_roll<72 then 'S' when size_roll<184 then 'M' when size_roll<244 then 'L' else 'XL' end;
 end if;
 if c.moves is null or cardinality(c.moves)=0 then
  select array_agg(initcap(replace(m.slug,'-',' ')) order by x.ord),count(m.move_id) into generated_moves,move_count
  from jsonb_array_elements(c.move_slots) with ordinality x(slot,ord)
  left join private.ref_moves m on m.content_build=c.content_build and m.move_id::text=x.slot->>'moveId';
  if move_count<1 or move_count<>jsonb_array_length(c.move_slots) then raise exception 'This Pokémon move record is unavailable. Contact support.' using errcode='22023';end if;
  c.moves:=generated_moves;
 end if;
 -- Preserve generated IVs, EVs, gender, dimensions, friendship and learned moves.
 if c.met_level is null then c.met_level:=c.level;end if;
 if c.met_location is null or btrim(c.met_location)='' then c.met_location:=private.lgpe_habitat(c.dex);end if;
 if c.ot_user_id is null then c.ot_user_id:=c.user_id;end if;
 if c.ot_name is null or btrim(c.ot_name)='' or c.ot_number is null then
  select * into trainer from public.profiles where id=coalesce(c.ot_user_id,c.user_id);
  if c.ot_name is null or btrim(c.ot_name)='' then c.ot_name:=coalesce(nullif(btrim(trainer.display_name),''),nullif(trainer.twitch_login,''),'Trainer');end if;
  if c.ot_number is null and trainer.id is not null then c.ot_number:=10000+(abs(hashtext(trainer.id::text)::bigint)%90000);end if;
 end if;
 return c;
end;
$function$
;
CREATE OR REPLACE FUNCTION private.evolve_catch(p_uid uuid, p_catch uuid, p_rule text, p_idem text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
declare
  c public.catches;
  source_form private.ref_forms;target_form private.ref_forms;target_count int;normal_count int;
  target_ability int;target_slot text;new_hp int;new_current int;
  rule public.evolution_rules;
  dest public.species;
  new_name text;
  spend int := 0;
  spend_item text := null;
  trade_path boolean := false;
  owned_before boolean;
  new_dex_xp int := coalesce((private.progression_config()->>'newDexXp')::int, 25);
  new_dex_coins int := coalesce((private.economy_config()->>'newDexReward')::int, 100);
begin
  if p_uid is null then raise exception 'Sign in first.'; end if;
  select * into c from public.catches where id = p_catch and user_id = p_uid and transferred_at is null for update;
  if c.id is null then raise exception 'That Pokémon is not in your collection.'; end if;
  if c.locked then raise exception 'Unlock that Pokémon before evolving it.'; end if;
  if c.reserved_trade_id is not null
     or exists (select 1 from public.trade_listings t where t.catch_id = c.id and t.status = 'open')
     or exists (select 1 from public.direct_trades d where d.status in ('PENDING','NEGOTIATING','PROCESSING') and c.id in (d.a_catch, d.b_catch)) then
    raise exception 'That Pokémon is reserved for a trade.';
  end if;
  select * into rule from public.evolution_rules r
   where r.id = p_rule and r.enabled
     and r.to_dex between 1 and 151
     and r.generation_introduced = any (private.evo_enabled_generations());
  if rule.id is null then
    raise exception 'That evolution is not available.';
  end if;
  if p_idem is not null and c.dex=rule.to_dex and exists (select 1 from public.evolution_log e where e.catch_id=c.id and e.from_dex=rule.from_dex and e.to_dex=rule.to_dex) then
    return jsonb_build_object('ok', true, 'message', 'Already evolved.');
  end if;
  if rule.from_dex<>c.dex then raise exception 'That evolution is not available.';end if;
  if c.ruleset_id is distinct from 'streamlink-gen9-xgen' or c.content_build is null then raise exception 'This Pokémon needs a supported battle record before evolution.';end if;
  select * into source_form from private.ref_forms where content_build=c.content_build and form_id=c.pokemon_form_id and dex=c.dex;
  if source_form.form_id is null or source_form.kind not in('base','regional') then raise exception 'This Pokémon form cannot evolve through this route.';end if;
  select count(*) into target_count from private.ref_forms where content_build=c.content_build and dex=rule.to_dex and form_key=source_form.form_key and kind=source_form.kind and mapping_status='ok';
  if target_count<>1 then raise exception 'That evolution form is not available. No candy or items were spent.';end if;
  select * into target_form from private.ref_forms where content_build=c.content_build and dex=rule.to_dex and form_key=source_form.form_key and kind=source_form.kind and mapping_status='ok';
  if private.streamlink_form_blocked(c.content_build,target_form.form_id) or not private.streamlink_obtain_ok(c.content_build,'evolve',target_form.form_id) then raise exception 'That evolution form is not available.';end if;
  if c.ability_slot not in('1','2') or c.ability_slot is null then raise exception 'This ability inheritance is not supported yet. No candy or items were spent.';end if;
  if not exists(select 1 from private.ref_form_abilities where content_build=c.content_build and form_id=c.pokemon_form_id and slot=c.ability_slot and ability_id=c.ability_id) then raise exception 'This Pokémon ability record needs support review.';end if;
  target_slot:=c.ability_slot;
  select ability_id into target_ability from private.ref_form_abilities where content_build=c.content_build and form_id=target_form.form_id and slot=target_slot and not is_hidden;
  if target_ability is null then
   select count(*) into normal_count from private.ref_form_abilities where content_build=c.content_build and form_id=target_form.form_id and not is_hidden;
   if target_slot='2' and normal_count=1 then target_slot:='1';select ability_id into target_ability from private.ref_form_abilities where content_build=c.content_build and form_id=target_form.form_id and slot='1' and not is_hidden;end if;
  end if;
  if target_ability is null then raise exception 'That evolution ability mapping is unavailable. No candy or items were spent.';end if;
  if c.level is null or c.iv_hp is null or c.ev_hp is null or c.hp_current is null or c.hp_max is null or c.hp_current<0 or c.hp_current>c.hp_max
     or not exists(select 1 from private.ref_natures where content_build=c.content_build and id=c.nature_id)
     or c.hp_max is distinct from private.streamlink_hp_max(source_form.hp,c.iv_hp,c.ev_hp,c.level) then raise exception 'This Pokémon battle record needs support review before evolution.';end if;
  new_hp:=private.streamlink_hp_max(target_form.hp,c.iv_hp,c.ev_hp,c.level);
  if new_hp is null or target_form.height_m is null or target_form.weight_kg is null then raise exception 'That evolution reference is incomplete.';end if;
  new_current:=case when c.hp_current=0 then 0 else greatest(1,least(new_hp,c.hp_current+new_hp-c.hp_max)) end;
  trade_path := rule.condition_type = 'TRADE_OR_ITEM' and c.trade_evo_ready;
  if trade_path then
    spend := 0;
    spend_item := null;
  elsif rule.condition_type = 'TRADE_OR_ITEM' then
    if private.item_qty(p_uid, coalesce(rule.required_item, 'linkingcord')) < 1 then
      raise exception 'This Pokémon evolves after a trade, or with a Linking Cord.';
    end if;
    spend := rule.candy_cost;
    spend_item := coalesce(rule.required_item, 'linkingcord');
  else
    if rule.required_item is not null and private.item_qty(p_uid, rule.required_item) < 1 then
      raise exception 'You need a % for this evolution.', initcap(replace(rule.required_item, 'stone', ' Stone'));
    end if;
    spend := rule.candy_cost;
    spend_item := rule.required_item;
  end if;
  if not private.target_variant_ok(c, rule.to_dex) then
    insert into public.play_console_log (kind, message)
    values ('admin', 'Missing evolution art for dex ' || rule.to_dex::text || ' variant ' || c.variant);
    raise exception 'This evolution''s artwork is not available yet.';
  end if;
  if spend <> 0 then
    perform private.grant_family_candy(
      p_uid, rule.family_id, -spend, 'EVOLUTION_COST', 'Evolution',
      jsonb_build_object('idempotency', coalesce(p_idem, 'evo:' || c.id::text || ':' || rule.id), 'catchId', c.id::text)
    );
  end if;
  if spend_item is not null then
    perform private.adjust_item(p_uid, spend_item, -1);
  end if;
  select exists (select 1 from public.catches x where x.user_id = p_uid and x.dex = rule.to_dex) into owned_before;
  select * into dest from public.species where dex = rule.to_dex;
  new_name := private.form_display_name(rule.to_dex,target_form.form_id);
  update public.catches
     set dex = rule.to_dex,
         pokemon_form_id=target_form.form_id,ability_id=target_ability,ability_slot=target_slot,
         hp_max=new_hp,hp_current=new_current,height_m=target_form.height_m,weight_kg=target_form.weight_kg,
         name = new_name,
         obtained_method = 'EVOLUTION',
         trade_evo_ready = false
   where id = c.id;
  insert into public.evolution_log (user_id, catch_id, from_dex, to_dex, candy_spent, item_spent, method, trade_used)
  values (p_uid, c.id, c.dex, rule.to_dex, spend, spend_item,
          case when trade_path then 'TRADE' else coalesce(rule.rpg_method, rule.condition_type, 'CANDY') end,
          trade_path);
  update public.trainer_stats set evolved = evolved + 1, updated_at = now() where user_id = p_uid;
  perform private.grant_mastery(p_uid, c.dex, 2, 'EVOLUTION', 'mastery-evo:' || c.id::text || ':' || rule.id);
  perform private.grant_mastery(p_uid, rule.to_dex, 2, 'EVOLUTION', 'mastery-evo-to:' || c.id::text || ':' || rule.id);
  perform private.grant_xp(p_uid, 10, 'EVOLUTION', 'Successful evolution',
    jsonb_build_object('idempotency', 'xp-evo:' || c.id::text || ':' || rule.id));
  if not owned_before then
    perform private.grant_xp(p_uid, new_dex_xp, 'NEW_DEX', 'New Pokédex species',
      jsonb_build_object('idempotency', 'xp-dex:' || p_uid::text || ':' || rule.to_dex::text));
    if new_dex_coins > 0 then
      perform private.adjust_coins(
        p_uid, new_dex_coins, 'NEW_DEX_ENTRY', 'First time owning this species',
        jsonb_build_object('idempotency', 'dex:' || p_uid::text || ':' || rule.to_dex::text)
      );
    end if;
    perform private.maybe_grant_dex_milestones(p_uid);
  end if;
  if trade_path then
    perform private.unlock_title(p_uid, 'link-cable', true);
  end if;
  perform private.push_notice(p_uid, 'evolution', 'Congratulations!',
    'Your ' || c.name || ' evolved into ' || new_name || '!',
    jsonb_build_object('from', c.dex, 'to', rule.to_dex));
  perform private.evaluate_achievements(p_uid, true);
  return jsonb_build_object(
    'ok', true,
    'message', 'Your ' || c.name || ' evolved into ' || new_name || '!',
    'from', c.dex,
    'to', rule.to_dex,
    'variant', c.variant,
    'tradeUsed', trade_path,
    'evolution', jsonb_build_object(
      'catchId', c.id,
      'fromDex', c.dex,
      'fromName', c.name,
      'toDex', rule.to_dex,
      'toName', new_name,
      'variant', c.variant,
      'gender', c.gender,
      'level', c.level,
      'favorite', c.favorite,
      'shiny', c.variant like '%shiny%'
    ),
    'spent', jsonb_build_object(
      'evolutionCandy', spend,
      'item', spend_item,
      'linkingCord', case when spend_item = 'linkingcord' then 1 else 0 end
    ),
    'rewards', jsonb_build_object(
      'trainerXp', 10 + case when not owned_before then new_dex_xp else 0 end,
      'masteryFrom', 2,
      'masteryTo', 2,
      'newDex', not owned_before,
      'newDexXp', case when not owned_before then new_dex_xp else 0 end,
      'coins', case when not owned_before then new_dex_coins else 0 end
    )
  );
end;
$function$
;
commit;
