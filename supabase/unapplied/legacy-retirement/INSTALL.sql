-- CANDIDATE ONLY. No specimen deletion, schema drop, grant or activation.
begin;
do $guard$ begin
 if (select md5(prosrc) from pg_proc where oid='private.admin_catch_battle_json(catches)'::regprocedure) is distinct from '137ba9ca645e2c27d23e72dd596bb1ae' then raise exception 'Source drift: admin_catch_battle_json'; end if;
 if (select md5(prosrc) from pg_proc where oid='private.catch_json(catches)'::regprocedure) is distinct from 'ec15d532dd58053ee4ac6c24e5e901de' then raise exception 'Source drift: catch_json'; end if;
 if (select md5(prosrc) from pg_proc where oid='private.persist_staff_gift(uuid, integer, integer, text, text, text, uuid, boolean, text, text, text, text, text)'::regprocedure) is distinct from 'bf06a84998f069a9fcd31178ebae7f1d' then raise exception 'Source drift: persist_staff_gift'; end if;
 if (select md5(prosrc) from pg_proc where oid='private.persist_streamlink_catch(uuid, integer, integer, text, text, text, uuid, boolean, text, text, text, text, text)'::regprocedure) is distinct from '0d1724fb07b156d6124b2f0f556303a4' then raise exception 'Source drift: persist_streamlink_catch'; end if;
 if (select md5(prosrc) from pg_proc where oid='private.stamp_catch_row(catches)'::regprocedure) is distinct from '716d8b76519ced3d05e3584c7869dd93' then raise exception 'Source drift: stamp_catch_row'; end if;
end $guard$;
CREATE OR REPLACE FUNCTION private.admin_catch_battle_json(c catches)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
select jsonb_build_object(
 'ivs', jsonb_build_object('hp', c.iv_hp, 'atk', c.iv_atk, 'def', c.iv_def, 'spa', c.iv_spa, 'spd', c.iv_spd, 'spe', c.iv_spe),
 'evs', jsonb_build_object('hp', c.ev_hp, 'atk', c.ev_atk, 'def', c.ev_def, 'spa', c.ev_spa, 'spd', c.ev_spd, 'spe', c.ev_spe),
 'hpCurrent', c.hp_current, 'hpMax', c.hp_max,
 'nature', (select n.name from private.ref_natures n where n.content_build=c.content_build and n.id=c.nature_id),
 'ability', (select initcap(replace(a.slug,'-',' ')) from private.ref_abilities a where a.content_build=c.content_build and a.ability_id=c.ability_id),
 'moves', case when c.move_slots is not null then
   (select coalesce(jsonb_agg(jsonb_build_object('name', coalesce(nullif(x.slot->>'name',''),initcap(replace(m.slug,'-',' ')))) order by x.position), '[]'::jsonb)
    from jsonb_array_elements(c.move_slots) with ordinality x(slot,position)
    left join private.ref_moves m on m.content_build=c.content_build and m.move_id::text=x.slot->>'moveId')
   else to_jsonb(c.moves) end
);
$function$
;
CREATE OR REPLACE FUNCTION private.catch_json(c catches)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  listed boolean;
  st_hp int;
  st_atk int;
  st_def int;
  st_spa int;
  st_spd int;
  st_spe int;
  payload jsonb;
  gen_form private.ref_forms;
  gen_nature private.ref_natures;
  fid int;
  f public.pokemon_forms;
begin
  listed := exists (select 1 from public.trade_listings t where t.catch_id = c.id and t.status = 'open');
  fid := private.canonical_form_id(c.dex, coalesce(c.pokemon_form_id, c.dex));
  select * into f from public.pokemon_forms where pokemon_form_id = fid;
  select * into gen_form from private.ref_forms where content_build=case when c.ruleset_id='streamlink-gen9-xgen' then c.content_build else 'sl-ref-20261013-227b573' end and form_id=case when c.ruleset_id='streamlink-gen9-xgen' then c.pokemon_form_id else fid end and dex=c.dex;
  payload := jsonb_build_object(
    'id', c.id,
    'publicId', c.public_id,
    'dex', c.dex,
    'name', coalesce(nullif(btrim(c.name), ''), private.form_display_name(c.dex, fid)),
    'nickname', c.nickname,
    'variant', c.variant,
    'gender', c.gender,
    'ball', c.ball,
    'caughtAt', c.caught_at,
    'level', coalesce(c.level, 12),
    'size', coalesce(c.size_class, 'M'),
    'isAlpha', coalesce(c.is_alpha, false),
    'types', coalesce(gen_form.types, '{}'::text[]),
    'moves', coalesce(c.moves, '{}'::text[]),
    'ivs', jsonb_build_object('hp', coalesce(c.iv_hp, 0), 'atk', coalesce(c.iv_atk, 0), 'def', coalesce(c.iv_def, 0), 'spa', coalesce(c.iv_spa, 0), 'spd', coalesce(c.iv_spd, 0), 'spe', coalesce(c.iv_spe, 0)),
    'stats', jsonb_build_object('hp', st_hp, 'atk', st_atk, 'def', st_def, 'spa', st_spa, 'spd', st_spd, 'spe', st_spe),
    'otName', c.ot_name,
    'otNumber', c.ot_number,
    'otUserId', c.ot_user_id,
    'metLevel', coalesce(c.met_level, c.level),
    'metLocation', c.met_location,
    'heightM', c.height_m,
    'weightKg', c.weight_kg,
    'friendship', coalesce(c.friendship, 0),
    'listed', listed,
    'transferredAt', c.transferred_at,
    'favorite', coalesce(c.favorite, false),
    'locked', coalesce(c.locked, false),
    'obtainedMethod', coalesce(c.obtained_method, 'CAPTURE'),
    'tradeEvoReady', coalesce(c.trade_evo_ready, false),
    'tradable', coalesce((select s.tradable from public.species s where s.dex = c.dex), true),
    'formId', fid,
    'formKey', coalesce(f.form_key, 'base'),
    'formLabel', coalesce(f.form_label, 'Base'),
    'isBaseForm', coalesce(f.is_base, true),
    'displayName', private.form_display_name(c.dex, fid)
  );
  -- Use the stored WIRE ruleset and its immutable reference pin for display.
  -- Unpinned old specimens have no invented modern battle stats.
  if c.ruleset_id = 'streamlink-gen9-xgen' then
    select * into gen_form from private.ref_forms where content_build=c.content_build and form_id=c.pokemon_form_id and dex=c.dex;
    select * into gen_nature from private.ref_natures where content_build=c.content_build and id=c.nature_id;
    payload := payload || jsonb_build_object('stats', jsonb_build_object(
      'hp', c.hp_max,
      'atk', private.streamlink_stat(gen_form.atk, c.iv_atk, c.ev_atk, c.level, case when gen_nature.id is null then null when gen_nature.up_stat='atk' then 1.1 when gen_nature.down_stat='atk' then 0.9 else 1 end),
      'def', private.streamlink_stat(gen_form.def, c.iv_def, c.ev_def, c.level, case when gen_nature.id is null then null when gen_nature.up_stat='def' then 1.1 when gen_nature.down_stat='def' then 0.9 else 1 end),
      'spa', private.streamlink_stat(gen_form.spa, c.iv_spa, c.ev_spa, c.level, case when gen_nature.id is null then null when gen_nature.up_stat='spa' then 1.1 when gen_nature.down_stat='spa' then 0.9 else 1 end),
      'spd', private.streamlink_stat(gen_form.spd, c.iv_spd, c.ev_spd, c.level, case when gen_nature.id is null then null when gen_nature.up_stat='spd' then 1.1 when gen_nature.down_stat='spd' then 0.9 else 1 end),
      'spe', private.streamlink_stat(gen_form.spe, c.iv_spe, c.ev_spe, c.level, case when gen_nature.id is null then null when gen_nature.up_stat='spe' then 1.1 when gen_nature.down_stat='spe' then 0.9 else 1 end)
    ));
  end if;
  return payload;
end;
$function$
;
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
    RETURN jsonb_build_object('ok', false, 'errors', jsonb_build_array('wire-disabled'), 'path', 'stamp');
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
CREATE OR REPLACE FUNCTION private.stamp_catch_row(c catches)
 RETURNS catches
 LANGUAGE plpgsql
AS $function$
declare
  seed int;
  bounds int[];
  size_roll int;
  scale numeric;
  jitter numeric;
  trainer public.profiles%rowtype;
begin
  if c.public_id is null or btrim(c.public_id) = '' then
    c.public_id := 'LG' || lpad(nextval('public.catch_serial')::text, 8, '0');
  end if;
  seed := abs(('x' || substr(md5(c.id::text), 1, 8))::bit(32)::int);
  bounds := private.lgpe_level_bounds(c.dex);
  if c.level is null then
    if c.round_id is not null then
      c.level := private.encounter_pokemon_level(c.dex, c.round_id);
    else
      c.level := bounds[1] + (seed % (greatest(bounds[2] - bounds[1], 0) + 1));
    end if;
  end if;
  if c.iv_hp is null then c.iv_hp := (('x' || substr(md5(c.id::text || 'hp'), 1, 2))::bit(8)::int) % 32; end if;
  if c.iv_atk is null then c.iv_atk := (('x' || substr(md5(c.id::text || 'atk'), 1, 2))::bit(8)::int) % 32; end if;
  if c.iv_def is null then c.iv_def := (('x' || substr(md5(c.id::text || 'def'), 1, 2))::bit(8)::int) % 32; end if;
  if c.iv_spa is null then c.iv_spa := (('x' || substr(md5(c.id::text || 'spa'), 1, 2))::bit(8)::int) % 32; end if;
  if c.iv_spd is null then c.iv_spd := (('x' || substr(md5(c.id::text || 'spd'), 1, 2))::bit(8)::int) % 32; end if;
  if c.iv_spe is null then c.iv_spe := (('x' || substr(md5(c.id::text || 'spe'), 1, 2))::bit(8)::int) % 32; end if;
  if c.size_class is null or c.size_class not in ('XS','S','M','L','XL') then
    size_roll := seed % 256;
    c.size_class := case
      when size_roll < 12 then 'XS'
      when size_roll < 72 then 'S'
      when size_roll < 184 then 'M'
      when size_roll < 244 then 'L'
      else 'XL'
    end;
  end if;
  if c.moves is null or cardinality(c.moves) = 0 then
    c.moves := private.lgpe_pick_moves(c.dex, c.level);
  end if;
  c.gender := private.lgpe_roll_gender(c.dex, seed, c.gender);
  if c.met_level is null then
    c.met_level := c.level;
  end if;
  if c.met_location is null or btrim(c.met_location) = '' then
    c.met_location := private.lgpe_habitat(c.dex);
  end if;
  if c.friendship is null then
    c.friendship := 0;
  end if;
  scale := case c.size_class
    when 'XS' then 0.81
    when 'S' then 0.91
    when 'L' then 1.09
    when 'XL' then 1.21
    else 1.0
  end;
  jitter := 0.97 + ((seed / 23) % 7) * 0.01;
  if c.height_m is null then
    c.height_m := round((0.4 + (c.dex % 17) * 0.08) * scale * jitter, 2);
  end if;
  if c.weight_kg is null then
    c.weight_kg := round((5.0 + (c.dex % 29) * 1.7) * scale * jitter, 1);
  end if;
  if c.ot_user_id is null then
    c.ot_user_id := c.user_id;
  end if;
  if c.ot_name is null or btrim(c.ot_name) = '' or c.ot_number is null then
    select * into trainer from public.profiles where id = coalesce(c.ot_user_id, c.user_id);
    if c.ot_name is null or btrim(c.ot_name) = '' then
      c.ot_name := coalesce(nullif(btrim(trainer.display_name), ''), nullif(trainer.twitch_login, ''), 'Trainer');
    end if;
    if c.ot_number is null and trainer.id is not null then
      c.ot_number := 10000 + (abs(hashtext(trainer.id::text)) % 90000);
    end if;
  end if;
  return c;
end;
$function$
;
commit;
