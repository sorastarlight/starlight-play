-- Candy only for families with an enabled Kanto evolution.
-- Trade path spends no Candy and no Linking Cord.
-- Does not reset player Candy, bags, or collections.

create or replace function private.register_capture_collection(p_catch public.catches)
returns void
language plpgsql
as $function$
declare
  spec public.species;
  pay int;
  first_species boolean;
  fam int;
begin
  select * into spec from public.species where dex = p_catch.dex;
  fam := coalesce(spec.family_candy_species_id, spec.family_id, p_catch.dex);
  if private.family_has_enabled_evo(fam) then
    pay := private.candy_for_stage(spec.evo_stage);
    perform private.grant_family_candy(
      p_catch.user_id, fam, pay, 'CATCH_REWARD', 'Catch reward',
      jsonb_build_object('idempotency', 'candy-catch:' || p_catch.id::text, 'catchId', p_catch.id::text)
    );
  end if;
  perform private.grant_mastery(p_catch.user_id, p_catch.dex, 1, 'CATCH', 'mastery-catch:' || p_catch.id::text);
  if p_catch.variant like '%shiny%' then
    perform private.grant_mastery(p_catch.user_id, p_catch.dex, 3, 'SHINY', 'mastery-shiny:' || p_catch.id::text);
  end if;
  if p_catch.gender = 'Female' and p_catch.dex = any (private.female_visual_dex()) then
    select not exists (
      select 1 from public.catches
       where user_id = p_catch.user_id and dex = p_catch.dex and id <> p_catch.id
         and (gender = 'Female' or variant like '%female%')
    ) into first_species;
    if first_species then
      perform private.grant_mastery(p_catch.user_id, p_catch.dex, 1, 'VARIANT', 'mastery-female:' || p_catch.id::text);
    end if;
  end if;
end;
$function$;

create or replace function private.target_variant_ok(p_from public.catches, p_to int)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.species s
     where s.dex = p_to
       and s.dex between 1 and 151
       and s.name not ilike '%mega%'
       and s.name not ilike '%gigantamax%'
       and s.name not ilike '%gmax%'
  );
$$;

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
begin
  if p_uid is null then raise exception 'Sign in first.'; end if;
  select * into c from public.catches where id = p_catch and user_id = p_uid and transferred_at is null for update;
  if c.id is null then raise exception 'That Pokémon is not in your collection.'; end if;
  if c.locked then raise exception 'Unlock that Pokémon before evolving it.'; end if;
  if exists (select 1 from public.trade_listings t where t.catch_id = c.id and t.status = 'open')
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
    perform private.grant_xp(p_uid, coalesce((private.progression_config()->>'newDexXp')::int, 25), 'NEW_DEX', 'New Pokédex species',
      jsonb_build_object('idempotency', 'xp-dex:' || p_uid::text || ':' || rule.to_dex::text));
    if coalesce((private.economy_config()->>'newDexReward')::int, 0) > 0 then
      perform private.adjust_coins(
        p_uid, coalesce((private.economy_config()->>'newDexReward')::int, 100), 'NEW_DEX_ENTRY', 'First time owning this species',
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
    'tradeUsed', trade_path
  );
end;
$function$;

create or replace function private.mark_trade_receive(p_uid uuid, p_catch uuid, p_from uuid)
returns void
language plpgsql
as $function$
declare
  c public.catches;
  owned_before boolean;
  trade_ready boolean;
begin
  select * into c from public.catches where id = p_catch;
  select exists (select 1 from public.catches x where x.user_id = p_uid and x.dex = c.dex and x.id <> c.id) into owned_before;
  trade_ready := exists (
    select 1 from public.evolution_rules r
     where r.from_dex = c.dex
       and r.enabled
       and r.to_dex between 1 and 151
       and r.generation_introduced = any (private.evo_enabled_generations())
       and r.condition_type in ('TRADE', 'TRADE_OR_ITEM')
  );
  update public.catches
     set obtained_method = 'TRADE',
         trade_evo_ready = trade_ready,
         trade_locked_until = now() + interval '5 minutes'
   where id = p_catch;
  if trade_ready then
    perform private.push_notice(
      p_uid, 'evolution', c.name || ' can evolve!',
      'Evolving after a trade does not spend Candy or a Linking Cord. Open Evolution when you are ready — or wait.',
      jsonb_build_object('catchId', c.id, 'dex', c.dex, 'tradeReady', true)
    );
  end if;
  if not owned_before then
    perform private.grant_xp(p_uid, coalesce((private.progression_config()->>'newDexXp')::int, 25), 'NEW_DEX', 'New Pokédex species',
      jsonb_build_object('idempotency', 'xp-dex:' || p_uid::text || ':' || c.dex::text));
    if coalesce((private.economy_config()->>'newDexReward')::int, 0) > 0 then
      perform private.adjust_coins(
        p_uid, coalesce((private.economy_config()->>'newDexReward')::int, 100), 'NEW_DEX_ENTRY', 'First time owning this species',
        jsonb_build_object('idempotency', 'dex:' || p_uid::text || ':' || c.dex::text)
      );
    end if;
    perform private.maybe_grant_dex_milestones(p_uid);
  end if;
end;
$function$;

create or replace function public.play_release(p_catch uuid, p_confirm text default '')
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
  c public.catches;
  spec public.species;
  copies int;
  pay int := 0;
  fam int;
begin
  if uid is null then raise exception 'Sign in first.' using errcode = '42501'; end if;
  select * into c from public.catches where id = p_catch and user_id = uid and transferred_at is null for update;
  if c.id is null then raise exception 'That Pokémon is not in your collection.'; end if;
  if c.favorite or c.locked then raise exception 'Favorite or locked Pokémon cannot be released.'; end if;
  if c.variant like '%shiny%' and p_confirm <> 'SHINY' then
    raise exception 'This is a SHINY Pokémon. Confirm release with SHINY.';
  end if;
  select count(*) into copies from public.catches where user_id = uid and dex = c.dex and transferred_at is null;
  if copies <= 1 then
    raise exception 'This is your only currently owned % . Keep it for your Living Dex.', c.name;
  end if;
  if exists (select 1 from public.trade_listings t where t.catch_id = c.id and t.status = 'open') then
    raise exception 'Cancel the trade listing first.';
  end if;
  select * into spec from public.species where dex = c.dex;
  fam := coalesce(spec.family_candy_species_id, spec.family_id, c.dex);
  if private.family_has_enabled_evo(fam) then
    pay := case spec.evo_stage when 2 then 2 when 3 then 3 else 1 end;
    perform private.grant_family_candy(uid, fam, pay, 'RELEASE_REWARD', 'Released a duplicate',
      jsonb_build_object('idempotency', 'release:' || c.id::text, 'catchId', c.id::text));
  end if;
  update public.catches set transferred_at = now(), user_id = uid where id = c.id;
  update public.trainer_stats set released = released + 1, updated_at = now() where user_id = uid;
  perform private.pull_from_team(uid, c.id);
  if pay > 0 then
    return jsonb_build_object('ok', true, 'message', 'Released ' || c.name || ' for ' || pay || ' Candy.');
  end if;
  return jsonb_build_object('ok', true, 'message', 'Released ' || c.name || '.');
end;
$function$;

create or replace function public.play_collection()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Sign in first.' using errcode = '42501'; end if;
  return jsonb_build_object(
    'ok', true,
    'balanceVersion', coalesce((select balance_version from public.evolution_config where id = 1), 1),
    'items', coalesce((select items from public.inventories where user_id = uid), '{}'::jsonb),
    'candy', coalesce((
      select jsonb_agg(jsonb_build_object(
        'familyId', f.id, 'name', f.name || ' Candy', 'baseDex', f.base_dex, 'qty', c.qty
      ) order by f.id)
      from public.family_candy c
      join public.evolution_families f on f.id = c.family_id
      where c.user_id = uid and c.qty > 0 and private.family_has_enabled_evo(c.family_id)
    ), '[]'::jsonb),
    'ready', coalesce((
      select jsonb_agg(jsonb_build_object(
        'catchId', m.id, 'dex', m.dex, 'name', m.name, 'variant', m.variant, 'gender', m.gender,
        'ruleId', r.id, 'toDex', r.to_dex, 'toName', s.name,
        'familyName', ff.name || ' Candy',
        'candyCost', case when r.condition_type = 'TRADE_OR_ITEM' and m.trade_evo_ready then 0 else r.candy_cost end,
        'haveCandy', coalesce(fc.qty, 0),
        'item', case when r.condition_type = 'TRADE_OR_ITEM' and m.trade_evo_ready then null else r.required_item end,
        'haveItem', case
          when r.required_item is null then true
          when r.condition_type = 'TRADE_OR_ITEM' and m.trade_evo_ready then true
          else coalesce((i.items->>r.required_item)::int, 0) > 0
        end,
        'method', coalesce(r.rpg_method, r.condition_type),
        'tradeReady', m.trade_evo_ready,
        'favorite', m.favorite,
        'locked', m.locked,
        'available', (
          not m.locked
          and private.target_variant_ok(m, r.to_dex)
          and (case when r.condition_type = 'TRADE_OR_ITEM' and m.trade_evo_ready then 0 else r.candy_cost end) <= coalesce(fc.qty, 0)
          and (
            r.required_item is null
            or (r.condition_type = 'TRADE_OR_ITEM' and m.trade_evo_ready)
            or coalesce((i.items->>r.required_item)::int, 0) > 0
          )
        ),
        'reasonUnavailable', case
          when m.locked then 'Unlock this Pokémon first.'
          when not private.target_variant_ok(m, r.to_dex) then 'Artwork is not available yet.'
          when r.condition_type = 'TRADE_OR_ITEM' and not m.trade_evo_ready and coalesce((i.items->>r.required_item)::int, 0) < 1
            then 'Needs a trade or a Linking Cord.'
          when r.required_item is not null and r.condition_type <> 'TRADE_OR_ITEM' and coalesce((i.items->>r.required_item)::int, 0) < 1
            then 'Missing ' || r.required_item
          when (case when r.condition_type = 'TRADE_OR_ITEM' and m.trade_evo_ready then 0 else r.candy_cost end) > coalesce(fc.qty, 0)
            then 'Needs more Candy'
          else null
        end
      ) order by m.dex, r.sort_order)
      from public.catches m
      join public.evolution_rules r on r.from_dex = m.dex and r.enabled
        and r.to_dex between 1 and 151
        and r.generation_introduced = any (private.evo_enabled_generations())
      join public.species s on s.dex = r.to_dex
      join public.evolution_families ff on ff.id = r.family_id
      left join public.family_candy fc on fc.user_id = uid and fc.family_id = r.family_id
      left join public.inventories i on i.user_id = uid
      where m.user_id = uid and m.transferred_at is null
    ), '[]'::jsonb),
    'families', coalesce((
      select jsonb_agg(jsonb_build_object(
        'familyId', f.id,
        'name', f.name,
        'baseDex', f.base_dex,
        'candy', coalesce((select qty from public.family_candy c where c.user_id = uid and c.family_id = f.id), 0),
        'next', (
          select jsonb_agg(jsonb_build_object(
            'fromDex', r.from_dex,
            'toDex', r.to_dex,
            'fromName', fs.name,
            'toName', ts.name,
            'cost', r.candy_cost,
            'item', r.required_item,
            'method', coalesce(r.rpg_method, r.condition_type)
          ) order by r.sort_order)
          from public.evolution_rules r
          join public.species fs on fs.dex = r.from_dex
          join public.species ts on ts.dex = r.to_dex
          where r.family_id = f.id and r.enabled
            and r.to_dex between 1 and 151
            and r.generation_introduced = any (private.evo_enabled_generations())
        ),
        'members', (
          select jsonb_agg(jsonb_build_object(
            'dex', s.dex,
            'name', s.name,
            'owned', (select count(*) from public.catches x where x.user_id = uid and x.dex = s.dex and x.transferred_at is null),
            'pokedex', exists (select 1 from public.catches x where x.user_id = uid and x.dex = s.dex)
          ) order by s.dex)
          from public.species s
          where s.family_id = f.id and s.dex between 1 and 151
        )
      ) order by f.id)
      from public.evolution_families f
      where private.family_has_enabled_evo(f.id)
        and (
          exists (select 1 from public.catches x join public.species s on s.dex = x.dex where x.user_id = uid and s.family_id = f.id)
          or exists (select 1 from public.family_candy c where c.user_id = uid and c.family_id = f.id and c.qty > 0)
        )
    ), '[]'::jsonb),
    'mastery', coalesce((
      select jsonb_agg(jsonb_build_object(
        'dex', sm.dex, 'points', sm.points, 'rank', sm.rank,
        'caught', (select count(*) from public.catches c where c.user_id = uid and c.dex = sm.dex),
        'lifetime', (select count(*) from public.catches c where c.user_id = uid and c.dex = sm.dex and c.round_id is not null)
      ) order by sm.dex)
      from public.species_mastery sm
      where sm.user_id = uid
    ), '[]'::jsonb),
    'owned', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'dex', c.dex, 'name', c.name, 'variant', c.variant, 'gender', c.gender,
        'favorite', c.favorite, 'locked', c.locked, 'method', c.obtained_method,
        'otName', c.ot_name, 'tradeEvoReady', c.trade_evo_ready, 'shiny', c.variant like '%shiny%',
        'canEvolve', exists (
          select 1 from public.evolution_rules r
           where r.from_dex = c.dex and r.enabled and r.to_dex between 1 and 151
             and r.generation_introduced = any (private.evo_enabled_generations())
        )
      ) order by c.dex, c.caught_at)
      from public.catches c
      where c.user_id = uid and c.transferred_at is null
    ), '[]'::jsonb)
  );
end;
$function$;

grant execute on function public.play_collection() to authenticated;
grant execute on function public.play_release(uuid, text) to authenticated;
