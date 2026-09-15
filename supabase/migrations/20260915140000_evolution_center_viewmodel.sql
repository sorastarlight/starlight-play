-- Additive Evolution Center view-model fields.
-- Does not change Candy costs, item spend, XP grants, or evolution rules.

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
    'stats', jsonb_build_object(
      'evolved', coalesce((select evolved from public.trainer_stats where user_id = uid), 0),
      'candyTotal', coalesce((select sum(qty)::int from public.family_candy where user_id = uid), 0)
    ),
    'recentEvolutions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'fromDex', x.from_dex,
        'toDex', x.to_dex,
        'fromName', x.from_name,
        'toName', x.to_name,
        'at', x.created_at
      ) order by x.created_at desc)
      from (
        select e.from_dex, e.to_dex, e.created_at, fs.name as from_name, ts.name as to_name
        from public.evolution_log e
        left join public.species fs on fs.dex = e.from_dex
        left join public.species ts on ts.dex = e.to_dex
        where e.user_id = uid
        order by e.created_at desc
        limit 6
      ) x
    ), '[]'::jsonb),
    'candy', coalesce((
      select jsonb_agg(jsonb_build_object(
        'familyId', f.id, 'name', f.name, 'baseDex', f.base_dex, 'qty', c.qty
      ) order by f.id)
      from public.family_candy c
      join public.evolution_families f on f.id = c.family_id
      where c.user_id = uid and c.qty > 0 and private.family_has_enabled_evo(c.family_id)
    ), '[]'::jsonb),
    'ready', coalesce((
      select jsonb_agg(jsonb_build_object(
        'catchId', m.id, 'dex', m.dex, 'name', m.name, 'variant', m.variant, 'gender', m.gender,
        'level', m.level,
        'ruleId', r.id, 'toDex', r.to_dex, 'toName', s.name,
        'familyId', ff.id,
        'familyName', ff.name,
        'candyCost', case when r.condition_type = 'TRADE_OR_ITEM' and m.trade_evo_ready then 0 else r.candy_cost end,
        'haveCandy', coalesce(fc.qty, 0),
        'item', case when r.condition_type = 'TRADE_OR_ITEM' and m.trade_evo_ready then null else r.required_item end,
        'haveItem', case
          when r.required_item is null then true
          when r.condition_type = 'TRADE_OR_ITEM' and m.trade_evo_ready then true
          else coalesce((i.items->>r.required_item)::int, 0) > 0
        end,
        'haveItemQty', case
          when r.required_item is null then 0
          else coalesce((i.items->>r.required_item)::int, 0)
        end,
        'method', coalesce(r.rpg_method, r.condition_type),
        'tradeReady', m.trade_evo_ready,
        'favorite', m.favorite,
        'locked', m.locked,
        'reserved', (
          exists (select 1 from public.trade_listings t where t.catch_id = m.id and t.status = 'open')
          or exists (
            select 1 from public.direct_trades d
            where d.status in ('PENDING','NEGOTIATING','PROCESSING')
              and m.id in (d.a_catch, d.b_catch)
          )
          or m.reserved_trade_id is not null
        ),
        'targetOwned', exists (
          select 1 from public.catches x
          where x.user_id = uid and x.dex = r.to_dex and x.transferred_at is null
        ),
        'targetPokedex', exists (
          select 1 from public.catches x where x.user_id = uid and x.dex = r.to_dex
        ),
        'available', (
          not m.locked
          and not (
            exists (select 1 from public.trade_listings t where t.catch_id = m.id and t.status = 'open')
            or exists (
              select 1 from public.direct_trades d
              where d.status in ('PENDING','NEGOTIATING','PROCESSING')
                and m.id in (d.a_catch, d.b_catch)
            )
            or m.reserved_trade_id is not null
          )
          and private.target_variant_ok(m, r.to_dex)
          and (case when r.condition_type = 'TRADE_OR_ITEM' and m.trade_evo_ready then 0 else r.candy_cost end) <= coalesce(fc.qty, 0)
          and (
            r.required_item is null
            or (r.condition_type = 'TRADE_OR_ITEM' and m.trade_evo_ready)
            or coalesce((i.items->>r.required_item)::int, 0) > 0
          )
        ),
        'reasonUnavailable', case
          when exists (select 1 from public.trade_listings t where t.catch_id = m.id and t.status = 'open')
            or exists (
              select 1 from public.direct_trades d
              where d.status in ('PENDING','NEGOTIATING','PROCESSING')
                and m.id in (d.a_catch, d.b_catch)
            )
            or m.reserved_trade_id is not null
            then 'This Pokémon cannot evolve while it is part of an active trade.'
          when m.locked then 'Unlock this Pokémon first.'
          when not private.target_variant_ok(m, r.to_dex) then 'Artwork is not available yet.'
          when r.condition_type = 'TRADE_OR_ITEM' and not m.trade_evo_ready and coalesce((i.items->>r.required_item)::int, 0) < 1
            then 'Needs a trade or a Linking Cord.'
          when r.required_item is not null and r.condition_type <> 'TRADE_OR_ITEM' and coalesce((i.items->>r.required_item)::int, 0) < 1
            then 'You need a ' || initcap(replace(r.required_item, 'stone', ' Stone')) || '.'
          when (case when r.condition_type = 'TRADE_OR_ITEM' and m.trade_evo_ready then 0 else r.candy_cost end) > coalesce(fc.qty, 0)
            then 'You need ' || ((case when r.condition_type = 'TRADE_OR_ITEM' and m.trade_evo_ready then 0 else r.candy_cost end) - coalesce(fc.qty, 0))::text || ' more Evolution Candy.'
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
        'level', c.level,
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
      'level', c.level
    ),
    'spent', jsonb_build_object(
      'evolutionCandy', spend,
      'item', spend_item
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

create or replace function public.play_use_rare_candy(p_family integer)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
  fam public.evolution_families;
  before_qty int := 0;
begin
  if uid is null then raise exception 'Sign in first.' using errcode = '42501'; end if;
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
  insert into public.item_ledger (user_id, item_key, amount, reason, source_id)
  values (uid, 'rarecandy', -1, 'EVOLUTION_COST', 'rarecandy:' || p_family::text);
  perform private.grant_family_candy(
    uid, p_family, 1, 'RARE_CANDY', 'Rare Candy',
    jsonb_build_object('idempotency', 'rarecandy:' || uid::text || ':' || gen_random_uuid()::text)
  );
  return private.play_snapshot(uid) || jsonb_build_object(
    'ok', true,
    'familyId', fam.id,
    'familyName', fam.name,
    'candyBefore', before_qty,
    'candyAfter', before_qty + 1,
    'message', 'Rare Candy used. ' || coalesce(fam.name, 'This') || ' Evolution Candy ' || before_qty::text || ' → ' || (before_qty + 1)::text || '.'
  );
end;
$function$;

grant execute on function public.play_collection() to authenticated;
grant execute on function public.play_evolve(uuid, text) to authenticated;
grant execute on function public.play_use_rare_candy(integer) to authenticated;
