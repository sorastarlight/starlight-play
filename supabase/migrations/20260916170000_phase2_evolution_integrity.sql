-- Phase 2: server-side trade reservation, Rare Candy idempotency, reward contract.

create or replace function private.evolve_catch(p_uid uuid, p_catch uuid, p_rule text, p_idem text default null)
returns jsonb
language plpgsql
as $function$
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
$function$;

drop function if exists public.play_use_rare_candy(integer);

create or replace function public.play_use_rare_candy(p_family integer, p_idem text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
  fam public.evolution_families;
  before_qty int := 0;
  after_qty int := 0;
  idem text := nullif(btrim(coalesce(p_idem, '')), '');
  existing public.candy_ledger;
begin
  if uid is null then raise exception 'Sign in first.' using errcode = '42501'; end if;
  perform private.ensure_inventory(uid);
  perform 1 from public.inventories where user_id = uid for update;
  if idem is not null then
    select * into existing
      from public.candy_ledger
     where user_id = uid and idempotency = idem
     limit 1;
    if existing.id is not null then
      select * into fam from public.evolution_families where id = existing.family_id;
      return private.play_snapshot(uid) || jsonb_build_object(
        'ok', true,
        'already', true,
        'familyId', existing.family_id,
        'familyName', coalesce(fam.name, 'this line'),
        'candyBefore', existing.qty_before,
        'candyAfter', existing.qty_after,
        'message', 'Rare Candy used. ' || coalesce(fam.name, 'This') || ' Evolution Candy '
          || existing.qty_before::text || ' → ' || existing.qty_after::text || '.'
      );
    end if;
  else
    idem := 'rarecandy:' || uid::text || ':' || p_family::text || ':' || gen_random_uuid()::text;
  end if;
  if coalesce(private.item_qty(uid, 'rarecandy'), 0) < 1 then
    raise exception 'You do not have a Rare Candy.';
  end if;
  select * into fam from public.evolution_families where id = p_family;
  if fam.id is null then raise exception 'Unknown Evolution Line.'; end if;
  if not exists (
    select 1 from public.evolution_rules r
     where r.family_id = p_family and r.enabled
       and r.generation_introduced = any (private.evo_enabled_generations())
  ) then
    raise exception 'Rare Candy can only be used on an Evolution Line that can still evolve.';
  end if;
  select coalesce(qty, 0) into before_qty from public.family_candy where user_id = uid and family_id = p_family;
  perform private.adjust_item(uid, 'rarecandy', -1);
  insert into public.item_ledger (user_id, item_key, amount, reason, source_id, idempotency)
  values (uid, 'rarecandy', -1, 'EVOLUTION_COST', 'rarecandy:' || p_family::text, idem);
  after_qty := private.grant_family_candy(
    uid, p_family, 1, 'RARE_CANDY', 'Rare Candy',
    jsonb_build_object('idempotency', idem)
  );
  return private.play_snapshot(uid) || jsonb_build_object(
    'ok', true,
    'already', false,
    'familyId', fam.id,
    'familyName', fam.name,
    'candyBefore', before_qty,
    'candyAfter', after_qty,
    'message', 'Rare Candy used. ' || coalesce(fam.name, 'This') || ' Evolution Candy ' || before_qty::text || ' → ' || after_qty::text || '.'
  );
exception
  when unique_violation then
    select * into existing
      from public.candy_ledger
     where user_id = uid and idempotency = coalesce(nullif(btrim(coalesce(p_idem, '')), ''), idem)
     limit 1;
    if existing.id is null then raise; end if;
    select * into fam from public.evolution_families where id = existing.family_id;
    return private.play_snapshot(uid) || jsonb_build_object(
      'ok', true,
      'already', true,
      'familyId', existing.family_id,
      'familyName', coalesce(fam.name, 'this line'),
      'candyBefore', existing.qty_before,
      'candyAfter', existing.qty_after,
      'message', 'Rare Candy used. ' || coalesce(fam.name, 'This') || ' Evolution Candy '
        || existing.qty_before::text || ' → ' || existing.qty_after::text || '.'
    );
end;
$function$;

revoke all on function public.play_use_rare_candy(integer, text) from public, anon;
grant execute on function public.play_use_rare_candy(integer, text) to authenticated;

create or replace function private.phase2_evolution_selftest()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
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
$function$;

revoke all on function private.phase2_evolution_selftest() from public, anon, authenticated;

do $phase2$
declare
  result jsonb;
begin
  result := private.phase2_evolution_selftest();
  if not coalesce((result->>'ok')::boolean, false) then
    raise exception 'Phase 2 evolution selftest failed: %', result;
  end if;
end;
$phase2$;
