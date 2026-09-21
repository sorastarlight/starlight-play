-- Read-only Kanto Evolution Research progress for Lab UI.
-- Does not change Candy, evolution costs, grants, or rule enablement.
-- completed = unique enabled Kanto evolution outcomes present in evolution_log
-- total = count of enabled Kanto evolution rules (currently Gen 1 only)

create or replace function public.play_collection()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
  kanto_total int := 0;
  kanto_done int := 0;
begin
  if uid is null then raise exception 'Sign in first.' using errcode = '42501'; end if;

  select count(*)::int into kanto_total
    from public.evolution_rules r
   where r.enabled
     and r.to_dex between 1 and 151
     and r.generation_introduced = any (private.evo_enabled_generations());

  select count(*)::int into kanto_done
    from public.evolution_rules r
   where r.enabled
     and r.to_dex between 1 and 151
     and r.generation_introduced = any (private.evo_enabled_generations())
     and exists (
       select 1
         from public.evolution_log e
        where e.user_id = uid
          and e.from_dex = r.from_dex
          and e.to_dex = r.to_dex
     );

  return jsonb_build_object(
    'ok', true,
    'balanceVersion', coalesce((select balance_version from public.evolution_config where id = 1), 1),
    'items', coalesce((select items from public.inventories where user_id = uid), '{}'::jsonb),
    'stats', jsonb_build_object(
      'evolved', coalesce((select evolved from public.trainer_stats where user_id = uid), 0),
      'candyTotal', coalesce((select sum(qty)::int from public.family_candy where user_id = uid), 0),
      'kantoEvolutions', jsonb_build_object(
        'completed', coalesce(kanto_done, 0),
        'total', coalesce(kanto_total, 0)
      )
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

revoke all on function public.play_collection() from public;
grant execute on function public.play_collection() to authenticated;
