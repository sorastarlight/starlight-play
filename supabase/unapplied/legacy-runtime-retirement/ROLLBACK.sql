-- Exact source rollback; reviewed recovery only.
begin;
do $guard$ begin
 if (select md5(prosrc) from pg_proc where oid='private.materialize_streamlink_catch(uuid,integer,integer,text,text,text,uuid,boolean,text,text,text,text,text)'::regprocedure) is distinct from 'df3d2b52205ab6036867dd941bbd7bbc' then raise exception 'Runtime source drift: materialize_streamlink_catch';end if;
 if (select md5(prosrc) from pg_proc where oid='private.persist_streamlink_catch(uuid,integer,integer,text,text,text,uuid,boolean,text,text,text,text,text)'::regprocedure) is distinct from '4c95b87155b21a636605a5a3a18e5533' then raise exception 'Runtime source drift: persist_streamlink_catch';end if;
 if (select md5(prosrc) from pg_proc where oid='private.record_stream_catch(text,text,integer,text,text,text,text,uuid,text,timestamp with time zone)'::regprocedure) is distinct from 'b2ea9d6911f8944450e7317a0066ecd6' then raise exception 'Runtime source drift: record_stream_catch';end if;
 if (select md5(prosrc) from pg_proc where oid='public.bridge_import_catches(text,jsonb)'::regprocedure) is distinct from '3bd8ec57508c8217695a7371e749f174' then raise exception 'Runtime source drift: bridge_import_catches';end if;
 if (select md5(prosrc) from pg_proc where oid='public.bridge_publish(text,jsonb)'::regprocedure) is distinct from '1f81cede1066cdf836d5309c4d7b9a75' then raise exception 'Runtime source drift: bridge_publish';end if;
 if (select md5(prosrc) from pg_proc where oid='public.admin_grant_pokemon(uuid,integer,text,text,boolean,text)'::regprocedure) is distinct from 'd60aa6523243fc1ba2cbe892978d38c2' then raise exception 'Runtime source drift: admin_grant_pokemon';end if;
 if (select md5(prosrc) from pg_proc where oid='public.admin_oak_qa(text,uuid,jsonb)'::regprocedure) is distinct from '03c579446c6ace33705263a2be292b30' then raise exception 'Runtime source drift: admin_oak_qa';end if;
 if (select md5(prosrc) from pg_proc where oid='private.phase2_evolution_selftest()'::regprocedure) is distinct from '27e804637ea224d60787b2ea76d38e0c' then raise exception 'Runtime source drift: phase2_evolution_selftest';end if;
 if (select md5(prosrc) from pg_proc where oid='private.phase4_catch_candy_selftest()'::regprocedure) is distinct from '27e804637ea224d60787b2ea76d38e0c' then raise exception 'Runtime source drift: phase4_catch_candy_selftest';end if;
 if (select md5(prosrc) from pg_proc where oid='private.launch_community_round(integer,text,boolean,text,boolean,integer)'::regprocedure) is distinct from 'cfd818a2f0c8a6aba9fae4b784b32279' then raise exception 'Runtime source drift: launch_community_round';end if;
 if (select md5(prosrc) from pg_proc where oid='private.stamp_catch_row(catches)'::regprocedure) is distinct from 'b66f9a12964b8c96342aba797e1711f1' then raise exception 'Runtime source drift: stamp_catch_row';end if;
 if (select md5(prosrc) from pg_proc where oid='private.evolve_catch(uuid,uuid,text,text)'::regprocedure) is distinct from 'ad697b4521d1b1daa5ee600a3d0d4009' then raise exception 'Runtime source drift: evolve_catch';end if;
end $guard$;
CREATE OR REPLACE FUNCTION private.evolve_catch(p_uid uuid, p_catch uuid, p_rule text, p_idem text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
declare
  c public.catches;
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
  if rule.id is null or rule.from_dex <> c.dex then
    raise exception 'That evolution is not available.';
  end if;
  if p_idem is not null and exists (select 1 from public.evolution_log e where e.catch_id = c.id and e.to_dex = rule.to_dex) then
    return jsonb_build_object('ok', true, 'message', 'Already evolved.');
  end if;
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
  new_name := coalesce(dest.name, c.name);
  update public.catches
     set dex = rule.to_dex,
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
CREATE OR REPLACE FUNCTION private.phase4_catch_candy_selftest()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  tester uuid := 'a98cbf81-a6b2-4dbf-8448-8d62f6d5f523';
  rid uuid := gen_random_uuid();
  cid uuid := gen_random_uuid();
  before_qty int := 0;
  after_qty int := 0;
  led boolean := false;
  pay int := 0;
  passed boolean := false;
  detail text := '';
begin
  before_qty := coalesce((select qty from public.family_candy where user_id = tester and family_id = 129), 0);
  pay := coalesce((select private.candy_for_stage(evo_stage) from public.species where dex = 129), 0);
  insert into public.encounter_rounds (
    id, phase, hidden, pokemon, dex, name, variant, gender, started_at, deadlines, rules,
    resolved, cancelled, last_action, ends_at, trigger_source, source
  ) values (
    rid, 'closed', true, jsonb_build_object('dex', 129, 'name', 'Magikarp'),
    129, 'Magikarp', 'normal', 'Male', now(), '{}'::jsonb,
    jsonb_build_object('testRewards', true, 'phase4Selftest', true),
    true, true, 'phase4 candy selftest', now(), 'TEST', 'play'
  );
  insert into public.catches (id, user_id, dex, name, variant, gender, ball, round_id, source_key)
  values (cid, tester, 129, 'Magikarp', 'normal', 'Male', 'pokeball', rid, 'phase4-candy-selftest:' || cid::text);
  led := exists (select 1 from public.candy_ledger where user_id = tester and idempotency = 'candy-catch:' || cid::text and amount = pay);
  after_qty := coalesce((select qty from public.family_candy where user_id = tester and family_id = 129), 0);
  passed := led and after_qty = before_qty + pay and pay > 0;
  detail := format('ledger=%s pay=%s before=%s after=%s', led, pay, before_qty, after_qty);
  delete from public.candy_ledger where idempotency = 'candy-catch:' || cid::text;
  delete from public.xp_ledger where idempotency in ('xp-catch:' || cid::text, 'xp-rare:' || cid::text);
  delete from public.trainer_notices where user_id = tester and coalesce(payload->>'catchId','') = cid::text;
  delete from public.catches where id = cid;
  delete from public.encounter_rounds where id = rid;
  if before_qty = 0 then
    delete from public.family_candy where user_id = tester and family_id = 129;
  else
    update public.family_candy set qty = before_qty where user_id = tester and family_id = 129;
  end if;
  return jsonb_build_object('passed', passed, 'detail', detail, 'pay', pay);
exception when others then
  begin
    delete from public.candy_ledger where idempotency = 'candy-catch:' || cid::text;
    delete from public.catches where id = cid;
    delete from public.encounter_rounds where id = rid;
    if coalesce(before_qty, 0) = 0 then
      delete from public.family_candy where user_id = tester and family_id = 129;
    else
      update public.family_candy set qty = before_qty where user_id = tester and family_id = 129;
    end if;
  exception when others then null; end;
  return jsonb_build_object('passed', false, 'detail', sqlerrm);
end;
$function$
;
CREATE OR REPLACE FUNCTION private.phase2_evolution_selftest()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  tester uuid := 'a98cbf81-a6b2-4dbf-8448-8d62f6d5f523';
  sora uuid := '60ff5211-6ef8-40e6-8daa-095b5600bf4c';
  started timestamptz := clock_timestamp();
  snap_items jsonb := '{}'::jsonb;
  snap_candy jsonb := '[]'::jsonb;
  snap_mastery jsonb := '[]'::jsonb;
  snap_achievements text[] := '{}';
  snap_evolved int := 0;
  snap_candy_earned int := 0;
  snap_candy_spent int := 0;
  snap_mastered int := 0;
  snap_xp int := 0;
  snap_coins int := 0;
  ids uuid[] := '{}';
  cases jsonb := '[]'::jsonb;
  v_id uuid;
  v_id2 uuid;
  v_res jsonb;
  v_err text;
  v_qty int;
  v_qty2 int;
  v_rare int;
  sora_id uuid;
  ok_all boolean := true;
  restored boolean := false;
begin
  if not exists (select 1 from public.profiles where id = tester) then
    raise exception 'Play Tester account is missing.';
  end if;
  perform private.ensure_inventory(tester);
  insert into public.trainer_stats (user_id) values (tester) on conflict (user_id) do nothing;
  select coalesce(items, '{}'::jsonb), coalesce(coins, 0) into snap_items, snap_coins from public.inventories where user_id = tester;
  select coalesce((select jsonb_agg(jsonb_build_object('family_id', family_id, 'qty', qty)) from public.family_candy where user_id = tester), '[]'::jsonb) into snap_candy;
  select coalesce((select jsonb_agg(jsonb_build_object('dex', dex, 'points', points, 'rank', rank)) from public.species_mastery where user_id = tester), '[]'::jsonb) into snap_mastery;
  select coalesce(array_agg(achievement_id), '{}') into snap_achievements from public.trainer_achievements where user_id = tester;
  select coalesce(evolved, 0), coalesce(candy_earned, 0), coalesce(candy_spent, 0), coalesce(species_mastered, 0)
    into snap_evolved, snap_candy_earned, snap_candy_spent, snap_mastered
    from public.trainer_stats where user_id = tester;
  select coalesce(xp, 0) into snap_xp from public.profiles where id = tester;

  perform set_config('request.jwt.claim.sub', tester::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', tester::text, 'role', 'authenticated', 'aud', 'authenticated')::text, true);

  insert into public.catches (user_id, dex, name, variant, gender, ball, source_key, level, favorite, locked)
  values (tester, 4, 'Charmander', 'normal', 'Male', 'pokeball', 'phase2test:' || gen_random_uuid()::text, 18, false, false)
  returning id into v_id;
  ids := ids || v_id;
  perform private.grant_family_candy(tester, 4, 40, 'ADMIN_GRANT', 'phase2', jsonb_build_object('idempotency', 'phase2test:candy-ok:' || v_id::text, 'catchId', v_id::text));
  v_res := private.evolve_catch(tester, v_id, '4-5', 'phase2test:evo:' || v_id::text);
  cases := cases || jsonb_build_array(jsonb_build_object('name', 'normal', 'ok', coalesce((v_res->>'ok')::boolean, false) and (v_res->'evolution'->>'toDex') = '5'));
  if (select dex from public.catches where id = v_id) <> 5 then ok_all := false; end if;
  if (select favorite from public.catches where id = v_id) then ok_all := false; end if;

  insert into public.catches (user_id, dex, name, variant, gender, ball, source_key, level, favorite, locked, reserved_trade_id)
  values (tester, 4, 'Charmander', 'normal', 'Male', 'pokeball', 'phase2test:' || gen_random_uuid()::text, 16, false, false, gen_random_uuid())
  returning id into v_id2;
  ids := ids || v_id2;
  perform private.grant_family_candy(tester, 4, 40, 'ADMIN_GRANT', 'phase2', jsonb_build_object('idempotency', 'phase2test:candy-res:' || v_id2::text, 'catchId', v_id2::text));
  begin
    v_res := private.evolve_catch(tester, v_id2, '4-5', 'phase2test:evo-res:' || v_id2::text);
    cases := cases || jsonb_build_array(jsonb_build_object('name', 'reserved', 'ok', false, 'detail', 'allowed'));
    ok_all := false;
  exception when others then
    cases := cases || jsonb_build_array(jsonb_build_object('name', 'reserved', 'ok', sqlerrm ilike '%reserved%'));
    if sqlerrm not ilike '%reserved%' then ok_all := false; end if;
  end;
  if (select dex from public.catches where id = v_id2) <> 4 then ok_all := false; end if;

  update public.catches set locked = true, reserved_trade_id = null where id = v_id2;
  begin
    v_res := private.evolve_catch(tester, v_id2, '4-5', 'phase2test:evo-lock:' || v_id2::text);
    cases := cases || jsonb_build_array(jsonb_build_object('name', 'locked', 'ok', false, 'detail', 'allowed'));
    ok_all := false;
  exception when others then
    cases := cases || jsonb_build_array(jsonb_build_object('name', 'locked', 'ok', sqlerrm ilike '%unlock%'));
    if sqlerrm not ilike '%unlock%' then ok_all := false; end if;
  end;

  select id into sora_id from public.catches where user_id = sora and transferred_at is null limit 1;
  if sora_id is not null then
    begin
      v_res := private.evolve_catch(tester, sora_id, '4-5', 'phase2test:wrong-owner');
      cases := cases || jsonb_build_array(jsonb_build_object('name', 'wrong-owner', 'ok', false, 'detail', 'allowed'));
      ok_all := false;
    exception when others then
      cases := cases || jsonb_build_array(jsonb_build_object('name', 'wrong-owner', 'ok', sqlerrm ilike '%not in your collection%'));
      if sqlerrm not ilike '%not in your collection%' then ok_all := false; end if;
    end;
  else
    begin
      v_res := private.evolve_catch(tester, gen_random_uuid(), '4-5', 'phase2test:missing');
      ok_all := false;
      cases := cases || jsonb_build_array(jsonb_build_object('name', 'wrong-owner', 'ok', false));
    exception when others then
      cases := cases || jsonb_build_array(jsonb_build_object('name', 'wrong-owner', 'ok', sqlerrm ilike '%not in your collection%'));
    end;
  end if;

  v_qty := coalesce((select qty from public.family_candy where user_id = tester and family_id = 4), 0);
  begin
    v_res := private.evolve_catch(tester, v_id2, '4-5', 'phase2test:locked-spend');
  exception when others then
    null;
  end;
  v_qty2 := coalesce((select qty from public.family_candy where user_id = tester and family_id = 4), 0);
  cases := cases || jsonb_build_array(jsonb_build_object('name', 'failed-spend-nothing', 'ok', v_qty = v_qty2));
  if v_qty <> v_qty2 then ok_all := false; end if;

  insert into public.catches (user_id, dex, name, variant, gender, ball, source_key, level, favorite)
  values (tester, 4, 'Charmander', 'shiny', 'Female', 'pokeball', 'phase2test:' || gen_random_uuid()::text, 20, true)
  returning id into v_id;
  ids := ids || v_id;
  perform private.grant_family_candy(tester, 4, 40, 'ADMIN_GRANT', 'phase2', jsonb_build_object('idempotency', 'phase2test:candy-shiny:' || v_id::text, 'catchId', v_id::text));
  v_res := private.evolve_catch(tester, v_id, '4-5', 'phase2test:evo-shiny:' || v_id::text);
  cases := cases || jsonb_build_array(jsonb_build_object(
    'name', 'shiny-favorite',
    'ok', (select variant from public.catches where id = v_id) = 'shiny'
      and (select gender from public.catches where id = v_id) = 'Female'
      and (select favorite from public.catches where id = v_id)
      and (select dex from public.catches where id = v_id) = 5
  ));
  if (select variant from public.catches where id = v_id) <> 'shiny' then ok_all := false; end if;

  insert into public.catches (user_id, dex, name, variant, gender, ball, source_key, level)
  values (tester, 2, 'Ivysaur', 'normal', 'Female', 'pokeball', 'phase2test:' || gen_random_uuid()::text, 32)
  returning id into v_id;
  ids := ids || v_id;
  perform private.grant_family_candy(tester, 1, 80, 'ADMIN_GRANT', 'phase2', jsonb_build_object('idempotency', 'phase2test:candy-ivy:' || v_id::text, 'catchId', v_id::text));
  v_res := private.evolve_catch(tester, v_id, '2-3', 'phase2test:evo-ivy:' || v_id::text);
  cases := cases || jsonb_build_array(jsonb_build_object(
    'name', 'female-visual',
    'ok', (select dex from public.catches where id = v_id) = 3
      and (select gender from public.catches where id = v_id) = 'Female'
      and (select variant from public.catches where id = v_id) = 'normal'
  ));

  insert into public.catches (user_id, dex, name, variant, gender, ball, source_key, level, trade_evo_ready)
  values (tester, 64, 'Kadabra', 'normal', 'Male', 'pokeball', 'phase2test:' || gen_random_uuid()::text, 42, true)
  returning id into v_id;
  ids := ids || v_id;
  v_res := private.evolve_catch(tester, v_id, '64-65', 'phase2test:evo-trade:' || v_id::text);
  cases := cases || jsonb_build_array(jsonb_build_object(
    'name', 'trade-ready',
    'ok', (select dex from public.catches where id = v_id) = 65
      and coalesce((v_res->'spent'->>'evolutionCandy')::int, -1) = 0
      and coalesce((v_res->'spent'->>'linkingCord')::int, -1) = 0
  ));

  insert into public.catches (user_id, dex, name, variant, gender, ball, source_key, level, trade_evo_ready)
  values (tester, 64, 'Kadabra', 'normal', 'Male', 'pokeball', 'phase2test:' || gen_random_uuid()::text, 40, false)
  returning id into v_id;
  ids := ids || v_id;
  perform private.adjust_item(tester, 'linkingcord', 1);
  perform private.grant_family_candy(tester, 63, 50, 'ADMIN_GRANT', 'phase2', jsonb_build_object('idempotency', 'phase2test:candy-cord:' || v_id::text, 'catchId', v_id::text));
  v_res := private.evolve_catch(tester, v_id, '64-65', 'phase2test:evo-cord:' || v_id::text);
  cases := cases || jsonb_build_array(jsonb_build_object(
    'name', 'linking-cord',
    'ok', (select dex from public.catches where id = v_id) = 65
      and coalesce((v_res->'spent'->>'linkingCord')::int, 0) = 1
      and private.item_qty(tester, 'linkingcord') = 0
  ));

  insert into public.catches (user_id, dex, name, variant, gender, ball, source_key, level)
  values (tester, 25, 'Pikachu', 'normal', 'Male', 'pokeball', 'phase2test:' || gen_random_uuid()::text, 22)
  returning id into v_id;
  ids := ids || v_id;
  perform private.adjust_item(tester, 'thunderstone', 1);
  perform private.grant_family_candy(tester, 25, 40, 'ADMIN_GRANT', 'phase2', jsonb_build_object('idempotency', 'phase2test:candy-pika:' || v_id::text, 'catchId', v_id::text));
  v_res := private.evolve_catch(tester, v_id, '25-26', 'phase2test:evo-stone:' || v_id::text);
  cases := cases || jsonb_build_array(jsonb_build_object(
    'name', 'stone',
    'ok', (select dex from public.catches where id = v_id) = 26
      and (v_res->'spent'->>'item') = 'thunderstone'
      and private.item_qty(tester, 'thunderstone') = 0
  ));

  perform private.adjust_item(tester, 'rarecandy', 2);
  v_rare := private.item_qty(tester, 'rarecandy');
  v_qty := coalesce((select qty from public.family_candy where user_id = tester and family_id = 4), 0);
  v_res := public.play_use_rare_candy(4, 'phase2test:rare-1');
  v_res := public.play_use_rare_candy(4, 'phase2test:rare-1');
  v_res := public.play_use_rare_candy(4, 'phase2test:rare-1');
  v_qty2 := coalesce((select qty from public.family_candy where user_id = tester and family_id = 4), 0);
  cases := cases || jsonb_build_array(jsonb_build_object(
    'name', 'rare-candy-idem',
    'ok', private.item_qty(tester, 'rarecandy') = v_rare - 1
      and v_qty2 = v_qty + 1
      and coalesce((v_res->>'already')::boolean, false)
  ));
  if private.item_qty(tester, 'rarecandy') <> v_rare - 1 then ok_all := false; end if;

  restored := true;
  delete from public.evolution_log where catch_id = any (ids);
  delete from public.candy_ledger where user_id = tester and created_at >= started;
  delete from public.item_ledger where user_id = tester and created_at >= started;
  delete from public.mastery_ledger where user_id = tester and created_at >= started;
  delete from public.xp_ledger where user_id = tester and created_at >= started;
  if to_regclass('public.coin_ledger') is not null then
    delete from public.coin_ledger where user_id = tester and created_at >= started;
  end if;
  delete from public.trainer_achievements where user_id = tester and not (achievement_id = any (snap_achievements));
  delete from public.catches where id = any (ids);
  update public.inventories set items = snap_items, coins = snap_coins, updated_at = now() where user_id = tester;
  delete from public.family_candy where user_id = tester;
  insert into public.family_candy (user_id, family_id, qty)
  select tester, (elem->>'family_id')::int, (elem->>'qty')::int
    from jsonb_array_elements(snap_candy) elem
   where snap_candy <> '[]'::jsonb;
  delete from public.species_mastery where user_id = tester;
  insert into public.species_mastery (user_id, dex, points, rank)
  select tester, (elem->>'dex')::int, (elem->>'points')::int, (elem->>'rank')::int
    from jsonb_array_elements(snap_mastery) elem
   where snap_mastery <> '[]'::jsonb;
  update public.trainer_stats
     set evolved = snap_evolved,
         candy_earned = snap_candy_earned,
         candy_spent = snap_candy_spent,
         species_mastered = snap_mastered,
         updated_at = now()
   where user_id = tester;
  update public.profiles set xp = snap_xp, updated_at = now() where id = tester;

  return jsonb_build_object('ok', ok_all and not exists (
    select 1 from jsonb_array_elements(cases) x where coalesce((x->>'ok')::boolean, false) is not true
  ), 'cases', cases, 'restored', restored);
exception
  when others then
    v_err := sqlerrm;
    delete from public.evolution_log where catch_id = any (ids);
    delete from public.candy_ledger where user_id = tester and created_at >= started;
    delete from public.item_ledger where user_id = tester and created_at >= started;
    delete from public.mastery_ledger where user_id = tester and created_at >= started;
    delete from public.xp_ledger where user_id = tester and created_at >= started;
    if to_regclass('public.coin_ledger') is not null then
      delete from public.coin_ledger where user_id = tester and created_at >= started;
    end if;
    delete from public.trainer_achievements where user_id = tester and not (achievement_id = any (snap_achievements));
    delete from public.catches where id = any (ids);
    update public.inventories set items = snap_items, coins = snap_coins, updated_at = now() where user_id = tester;
    begin
      delete from public.family_candy where user_id = tester;
      insert into public.family_candy (user_id, family_id, qty)
      select tester, (elem->>'family_id')::int, (elem->>'qty')::int
        from jsonb_array_elements(snap_candy) elem
       where snap_candy <> '[]'::jsonb;
      delete from public.species_mastery where user_id = tester;
      insert into public.species_mastery (user_id, dex, points, rank)
      select tester, (elem->>'dex')::int, (elem->>'points')::int, (elem->>'rank')::int
        from jsonb_array_elements(snap_mastery) elem
       where snap_mastery <> '[]'::jsonb;
    exception when others then null;
    end;
    update public.trainer_stats
       set evolved = snap_evolved, candy_earned = snap_candy_earned, candy_spent = snap_candy_spent,
           species_mastered = snap_mastered, updated_at = now()
     where user_id = tester;
    update public.profiles set xp = snap_xp, updated_at = now() where id = tester;
    return jsonb_build_object('ok', false, 'error', v_err, 'cases', cases, 'restored', true);
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
    mon_dex := (payload->>'dex')::int;
    mon_qty := greatest(1, least(20, coalesce((payload->>'qty')::int, 1)));
    if mon_dex is null or mon_dex < 1 or mon_dex > 151 then raise exception 'Pick a Kanto species (1–151).'; end if;
    for i in 1..mon_qty loop
      insert into public.catches (id, user_id, dex, name, variant, gender, level, favorite, locked, obtained_method, ot_user_id, ot_name, pokemon_form_id)
      values (
        gen_random_uuid(), p_user, mon_dex,
        coalesce(payload->>'name', (select s.name from public.species s where s.dex = mon_dex), 'Pokémon'),
        case when coalesce((payload->>'shiny')::boolean, false) then 'shiny' else 'normal' end,
        coalesce(nullif(payload->>'gender', ''), 'Unknown'),
        greatest(1, least(100, coalesce((payload->>'level')::int, 10))),
        false, false, 'ADMIN_QA', p_user, 'ADMIN_QA', nullif(payload->>'formId', '')::int
      );
      created := created + 1;
    end loop;
    insert into public.admin_qa_grants (admin_id, target_user, kind, payload)
    values (admin, p_user, 'GRANT_MON', payload || jsonb_build_object('created', created, 'soraWarning', warn));
    return jsonb_build_object('ok', true, 'created', created, 'soraWarning', warn, 'message', format('Granted %s ADMIN_QA Pokémon.', created));

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
    for mon_dex, mon_qty in select * from (values (113,2),(111,2),(25,2),(27,2),(133,3)) as t(d, q) loop
      for i in 1..mon_qty loop
        insert into public.catches (id, user_id, dex, name, variant, gender, level, favorite, locked, obtained_method, ot_user_id, ot_name)
        values (gen_random_uuid(), p_user, mon_dex, (select s.name from public.species s where s.dex = mon_dex), 'normal', 'Unknown', 12, false, false, 'ADMIN_QA', p_user, 'ADMIN_QA');
        created := created + 1;
      end loop;
    end loop;
    insert into public.admin_qa_grants (admin_id, target_user, kind, payload)
    values (admin, p_user, 'PRESET_OAK', jsonb_build_object('created', created, 'soraWarning', warn));
    return jsonb_build_object('ok', true, 'created', created, 'soraWarning', warn, 'message', format('Oak transfer preset: %s Pokémon.', created));

  elsif action = 'PRESET_EVO' then
    for mon_dex, mon_qty in select * from (values (25,1),(27,1),(133,3),(63,1),(64,1),(29,1),(32,1)) as t(d, q) loop
      for i in 1..mon_qty loop
        insert into public.catches (id, user_id, dex, name, variant, gender, level, favorite, locked, obtained_method, ot_user_id, ot_name)
        values (gen_random_uuid(), p_user, mon_dex, (select s.name from public.species s where s.dex = mon_dex), 'normal',
          case when mon_dex = 29 then 'Female' when mon_dex = 32 then 'Male' else 'Unknown' end, 20, false, false, 'ADMIN_QA', p_user, 'ADMIN_QA');
        created := created + 1;
      end loop;
    end loop;
    perform private.grant_family_candy(p_user, 25, 50, 'ADMIN_QA', 'QA evo candy', jsonb_build_object('idempotency', 'qa-evo-pika:' || p_user::text || ':' || clock_timestamp()::text));
    perform private.grant_family_candy(p_user, 27, 50, 'ADMIN_QA', 'QA evo candy', jsonb_build_object('idempotency', 'qa-evo-sand:' || p_user::text || ':' || clock_timestamp()::text));
    perform private.grant_family_candy(p_user, 133, 80, 'ADMIN_QA', 'QA evo candy', jsonb_build_object('idempotency', 'qa-evo-eevee:' || p_user::text || ':' || clock_timestamp()::text));
    perform private.grant_family_candy(p_user, 63, 50, 'ADMIN_QA', 'QA evo candy', jsonb_build_object('idempotency', 'qa-evo-abra:' || p_user::text || ':' || clock_timestamp()::text));
    perform private.ensure_inventory(p_user);
    perform private.grant_items(p_user, jsonb_build_object(
      'thunderstone', 2, 'firestone', 2, 'waterstone', 2, 'leafstone', 2, 'moonstone', 2,
      'linkingcord', 2, 'rarecandy', 5
    ), 'ADMIN_QA', 'QA evo kit', 'qa-evo-items:' || p_user::text || ':' || clock_timestamp()::text, true);
    insert into public.admin_qa_grants (admin_id, target_user, kind, payload)
    values (admin, p_user, 'PRESET_EVO', jsonb_build_object('created', created, 'soraWarning', warn));
    return jsonb_build_object('ok', true, 'created', created, 'soraWarning', warn, 'message', 'Kanto evolution QA kit granted.');

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
CREATE OR REPLACE FUNCTION public.admin_grant_pokemon(p_user uuid, p_dex integer, p_name text DEFAULT NULL::text, p_gender text DEFAULT 'Unknown'::text, p_shiny boolean DEFAULT false, p_ball text DEFAULT 'pokeball'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare species text; gender text := coalesce(nullif(btrim(p_gender), ''), 'Unknown'); ball text := coalesce(nullif(btrim(p_ball), ''), 'pokeball'); variant text;
begin
  perform private.require_staff_edit();
  if p_user is null or not exists (select 1 from public.profiles where id = p_user) then raise exception 'Pick a trainer.'; end if;
  if p_dex is null or p_dex < 1 or p_dex > 151 then raise exception 'Dex number must be 1 to 151.'; end if;
  if gender not in ('Male', 'Female', 'Genderless', 'Unknown') then raise exception 'Gender must be Male, Female, or Genderless.'; end if;
  if not private.is_throw_ball(ball) then ball := 'pokeball'; end if;
  variant := case when coalesce(p_shiny, false) then 'shiny' else 'normal' end;
  species := coalesce(nullif(btrim(p_name), ''), 'Pokémon');
  perform private.ensure_inventory(p_user);
  insert into public.catches (user_id, dex, name, variant, gender, ball, source_key) values (p_user, p_dex, species, variant, gender, ball, 'admin:' || gen_random_uuid()::text);
  perform private.mark_seen(p_user, p_dex);
  return private.admin_account_json(p_user) || jsonb_build_object('message', species || ' added to their PC.');
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
  if v_resolved then
    for rec in select value from jsonb_array_elements(coalesce(p_round->'results', '[]'::jsonb)) as t(value)
    loop
      if coalesce((rec.value->>'caught')::boolean, false) then
        perform private.record_stream_catch(
          rec.value->>'user', rec.value->>'name', nullif(p_round->>'dex', '')::int, p_round->>'name',
          coalesce(p_round->>'variant', 'normal'), coalesce(p_round->>'gender', 'Unknown'), rec.value->>'ball',
          round_id, 'mixitup:' || (p_round->>'id') || ':' || coalesce(rec.value->>'user', rec.value->>'name', ''), now()
        );
      end if;
    end loop;
  end if;
  return jsonb_build_object('ok', true, 'id', round_id);
end;
$function$
;
CREATE OR REPLACE FUNCTION public.bridge_import_catches(p_token text, p_catches jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  rec record;
  round_id uuid;
  imported int := 0;
begin
  if not private.bridge_ok(p_token) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update private.stream_bridge set seen_at = now() where id = 1;
  for rec in select value from jsonb_array_elements(coalesce(p_catches, '[]'::jsonb)) as t(value)
  loop
    round_id := null;
    if coalesce(rec.value->>'round', '') <> '' then
      select id into round_id from public.encounter_rounds where source_id = 'mixitup:' || (rec.value->>'round');
    end if;
    if private.record_stream_catch(
      rec.value->>'user', rec.value->>'name', nullif(rec.value->>'dex', '')::int,
      coalesce(rec.value->>'species', rec.value->>'name'), coalesce(rec.value->>'variant', 'normal'),
      coalesce(rec.value->>'gender', 'Unknown'), rec.value->>'ball', round_id,
      coalesce(nullif(rec.value->>'id', ''), 'mixitup-catch:' || coalesce(rec.value->>'round', '') || ':' || coalesce(rec.value->>'user', '')),
      nullif(rec.value->>'caughtAt', '')::timestamptz
    ) then
      imported := imported + 1;
    end if;
  end loop;
  return jsonb_build_object('ok', true, 'imported', imported);
end;
$function$
;
CREATE OR REPLACE FUNCTION private.record_stream_catch(p_user text, p_name text, p_dex integer, p_species text, p_variant text, p_gender text, p_ball text, p_round uuid, p_source_key text DEFAULT NULL::text, p_caught_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
declare
  trainer uuid;
  key text := nullif(btrim(coalesce(p_source_key, '')), '');
begin
  trainer := private.find_trainer(p_user, p_name);
  if trainer is null or p_dex is null then
    return false;
  end if;
  perform private.mark_seen(trainer, p_dex);
  if key is not null and exists (select 1 from public.catches c where c.source_key = key) then
    return true;
  end if;
  if p_round is not null and exists (
    select 1 from public.catches c where c.round_id = p_round and c.user_id = trainer
  ) then
    return true;
  end if;
  insert into public.catches (user_id, dex, name, variant, gender, ball, round_id, source_key, caught_at)
  values (
    trainer,
    p_dex,
    coalesce(nullif(p_species, ''), 'Pokémon'),
    coalesce(nullif(p_variant, ''), 'normal'),
    coalesce(nullif(p_gender, ''), 'Unknown'),
    p_ball,
    p_round,
    key,
    coalesce(p_caught_at, now())
  );
  return true;
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
CREATE OR REPLACE FUNCTION private.materialize_streamlink_catch(p_user_id uuid, p_form_id integer, p_level integer, p_ctx text, p_source_key text, p_ball text DEFAULT 'poke'::text, p_round_id uuid DEFAULT NULL::uuid, p_shiny boolean DEFAULT false, p_content_build text DEFAULT 'sl-ref-20261013-227b573'::text, p_hidden_ticket text DEFAULT NULL::text, p_variant text DEFAULT 'normal'::text, p_name text DEFAULT NULL::text, p_gender text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  v_dex int;
  v_name text;
  inserted uuid;
  v_public text;
BEGIN
  IF private.streamlink_wire_is_enabled() THEN
    RETURN private.persist_streamlink_catch(
      p_user_id, p_form_id, p_level, p_ctx, p_source_key, p_ball, p_round_id,
      p_shiny, p_content_build, p_hidden_ticket, p_variant, p_name, p_gender
    );
  END IF;

  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'errors', jsonb_build_array('missing-user'), 'path', 'stamp');
  END IF;
  IF p_ctx IS NULL OR p_ctx NOT IN ('catch', 'grant', 'event') THEN
    RETURN jsonb_build_object('ok', false, 'errors', jsonb_build_array('bad-ctx'), 'path', 'stamp');
  END IF;
  IF p_source_key IS NULL OR btrim(p_source_key) = '' THEN
    RETURN jsonb_build_object('ok', false, 'errors', jsonb_build_array('missing-source-key'), 'path', 'stamp');
  END IF;
  IF p_ctx IN ('grant', 'event') AND private.streamlink_protected_trainer(p_user_id) THEN
    RETURN jsonb_build_object('ok', false, 'errors', jsonb_build_array('protected-trainer'), 'path', 'stamp');
  END IF;

  SELECT f.dex, initcap(replace(s.slug, '-', ' '))
    INTO v_dex, v_name
  FROM private.ref_forms f
  JOIN private.ref_species s
    ON s.content_build = f.content_build AND s.dex = f.dex
  WHERE f.content_build = coalesce(p_content_build, 'sl-ref-20261013-227b573')
    AND f.form_id = p_form_id;
  v_dex := coalesce(v_dex, p_form_id);
  v_name := coalesce(nullif(btrim(p_name), ''), v_name, 'Pokemon');

  BEGIN
    INSERT INTO public.catches (
      user_id, dex, name, variant, gender, ball, round_id, source_key, level, pokemon_form_id
    ) VALUES (
      p_user_id,
      v_dex,
      v_name,
      coalesce(nullif(btrim(p_variant), ''), 'normal'),
      coalesce(nullif(btrim(p_gender), ''), 'M'),
      coalesce(nullif(btrim(p_ball), ''), 'poke'),
      p_round_id,
      p_source_key,
      p_level,
      p_form_id
    )
    RETURNING id, public_id INTO inserted, v_public;
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'ok', false,
      'errors', jsonb_build_array('already-settled'),
      'replay', true,
      'path', 'stamp'
    );
  END;

  RETURN jsonb_build_object(
    'ok', true,
    'catchId', inserted,
    'publicId', v_public,
    'path', 'stamp'
  );
END
$function$
;
commit;
