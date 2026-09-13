-- Evolution analytics, simulator ranges, and Kanto dataset validation.

create or replace function public.admin_collection_overview()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not private.is_play_admin() then raise exception 'Admin only.'; end if;
  return jsonb_build_object(
    'ok', true,
    'balanceVersion', coalesce((select balance_version from public.evolution_config where id = 1), 1),
    'candyTotal', coalesce((select sum(qty) from public.family_candy), 0),
    'candyTrainers', coalesce((select count(distinct user_id) from public.family_candy where qty > 0), 0),
    'evolutions', coalesce((select count(*) from public.evolution_log), 0),
    'directTrades', coalesce((select count(*) from public.direct_trades), 0),
    'openGts', coalesce((select count(*) from public.trade_listings where status = 'open'), 0),
    'mastered', coalesce((select count(*) from public.species_mastery where rank >= 5), 0),
    'readyPlayers', coalesce((
      select count(distinct m.user_id)
        from public.catches m
        join public.evolution_rules r on r.from_dex = m.dex and r.enabled
          and r.to_dex between 1 and 151
          and r.generation_introduced = any (private.evo_enabled_generations())
        left join public.family_candy fc on fc.user_id = m.user_id and fc.family_id = r.family_id
        left join public.inventories i on i.user_id = m.user_id
       where m.transferred_at is null
         and not m.locked
         and (
           (r.condition_type = 'TRADE_OR_ITEM' and m.trade_evo_ready)
           or (
             r.candy_cost <= coalesce(fc.qty, 0)
             and (r.required_item is null or coalesce((i.items->>r.required_item)::int, 0) > 0)
           )
         )
    ), 0),
    'mostEvolved', coalesce((
      select jsonb_agg(jsonb_build_object('dex', to_dex, 'count', n) order by n desc)
      from (
        select to_dex, count(*)::int as n
          from public.evolution_log
         group by to_dex
         order by count(*) desc
         limit 8
      ) x
    ), '[]'::jsonb),
    'eevee', jsonb_build_object(
      'vaporeon', (select count(*) from public.evolution_log where to_dex = 134),
      'jolteon', (select count(*) from public.evolution_log where to_dex = 135),
      'flareon', (select count(*) from public.evolution_log where to_dex = 136)
    ),
    'starters', jsonb_build_object(
      'ivysaur', (select count(*) from public.evolution_log where to_dex = 2),
      'venusaur', (select count(*) from public.evolution_log where to_dex = 3),
      'charmeleon', (select count(*) from public.evolution_log where to_dex = 5),
      'charizard', (select count(*) from public.evolution_log where to_dex = 6),
      'wartortle', (select count(*) from public.evolution_log where to_dex = 8),
      'blastoise', (select count(*) from public.evolution_log where to_dex = 9)
    ),
    'dratini', jsonb_build_object(
      'dragonair', (select count(*) from public.evolution_log where to_dex = 148),
      'dragonite', (select count(*) from public.evolution_log where to_dex = 149)
    ),
    'magikarp', (select count(*) from public.evolution_log where to_dex = 130),
    'tradeVsCord', jsonb_build_object(
      'trade', (select count(*) from public.evolution_log where trade_used or method = 'TRADE'),
      'cord', (select count(*) from public.evolution_log where item_spent = 'linkingcord')
    ),
    'stonesConsumed', coalesce((
      select jsonb_object_agg(item_spent, n)
      from (
        select item_spent, count(*)::int as n
          from public.evolution_log
         where item_spent is not null
         group by item_spent
      ) x
    ), '{}'::jsonb),
    'recentEvo', coalesce((
      select jsonb_agg(jsonb_build_object(
        'player', coalesce(p.display_name, p.twitch_login, 'Trainer'),
        'fromDex', e.from_dex, 'toDex', e.to_dex, 'candy', e.candy_spent, 'method', e.method
      ) order by e.created_at desc)
      from (
        select * from public.evolution_log order by created_at desc limit 8
      ) e
      left join public.profiles p on p.id = e.user_id
    ), '[]'::jsonb)
  );
end;
$function$;

create or replace function public.admin_candy_simulate(p_family int, p_catches int default 20)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  fam public.evolution_families;
  spec public.species;
  pay int;
  first_rule public.evolution_rules;
  final_rule public.evolution_rules;
  mid_pay int := 5;
begin
  if not private.is_play_admin() then raise exception 'Admin only.'; end if;
  select * into fam from public.evolution_families where id = p_family;
  if fam.id is null then raise exception 'Unknown family.'; end if;
  select * into spec from public.species where dex = fam.base_dex;
  pay := private.candy_for_stage(coalesce(spec.evo_stage, 1));
  select * into first_rule from public.evolution_rules
   where family_id = p_family and enabled and to_dex between 1 and 151
   order by sort_order limit 1;
  select * into final_rule from public.evolution_rules
   where family_id = p_family and enabled and to_dex between 1 and 151
   order by sort_order desc limit 1;
  return jsonb_build_object(
    'ok', true,
    'family', fam.name,
    'balanceVersion', coalesce((select balance_version from public.evolution_config where id = 1), 1),
    'candyPerCatch', pay,
    'expectedCatches', p_catches,
    'expectedCandy', greatest(p_catches, 0) * pay,
    'note', 'Range assumes first-stage catches. Natural evolved spawns and trades can shorten this.',
    'firstEvolution', case when first_rule.id is null then null else jsonb_build_object(
      'fromDex', first_rule.from_dex, 'toDex', first_rule.to_dex, 'cost', first_rule.candy_cost,
      'catchesNeeded', ceil(first_rule.candy_cost::numeric / greatest(pay, 1)),
      'range', 'About ' || ceil(first_rule.candy_cost::numeric / greatest(pay, 1))::text
        || ' first-stage catches if only this stage contributes.'
    ) end,
    'finalEvolution', case when final_rule.id is null or final_rule.id = first_rule.id then null else jsonb_build_object(
      'fromDex', final_rule.from_dex, 'toDex', final_rule.to_dex, 'cost', final_rule.candy_cost,
      'catchesNeeded', ceil((coalesce(first_rule.candy_cost, 0) + final_rule.candy_cost)::numeric / greatest(pay, 1)),
      'additionalIfOnlyFirst', ceil(final_rule.candy_cost::numeric / greatest(pay, 1)),
      'fasterIfMiddleCaught', ceil(final_rule.candy_cost::numeric / mid_pay),
      'range', 'After the first evolution, about '
        || ceil(final_rule.candy_cost::numeric / greatest(pay, 1))::text
        || ' more first-stage catches, or fewer if middle stages are caught.'
    ) end
  );
end;
$function$;

create or replace function public.admin_evolution_validate()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  bad text[];
begin
  if not private.is_play_admin() then raise exception 'Admin only.'; end if;
  select coalesce(array_agg(r.id), '{}') into bad
    from public.evolution_rules r
   where r.enabled
     and (
       not exists (select 1 from public.species s where s.dex = r.to_dex)
       or not exists (select 1 from public.evolution_families f where f.id = r.family_id)
       or r.to_dex > 151
       or r.generation_introduced <> all (private.evo_enabled_generations())
       or (r.required_item is not null and r.required_item <> all (private.evo_item_keys()))
     );
  return jsonb_build_object(
    'ok', coalesce(cardinality(bad), 0) = 0,
    'enabledRules', (select count(*) from public.evolution_rules where enabled),
    'disabledLater', (select count(*) from public.evolution_rules where not enabled),
    'invalidEnabled', bad
  );
end;
$function$;

grant execute on function public.admin_collection_overview() to authenticated;
grant execute on function public.admin_candy_simulate(int, int) to authenticated;
grant execute on function public.admin_evolution_validate() to authenticated;

create or replace function private.collection_self_test()
returns table(name text, passed boolean, detail text)
language plpgsql
as $function$
begin
  name := 'Family Candy never goes negative';
  passed := not exists (select 1 from public.family_candy where qty < 0);
  detail := 'ok';
  return next;

  name := 'Candy belongs to families, not every stage';
  passed := exists (select 1 from public.species where dex = 2 and family_id = 1)
        and exists (select 1 from public.species where dex = 3 and family_id = 1);
  detail := 'Bulbasaur family';
  return next;

  name := 'Pikachu needs Candy and a Thunder Stone';
  passed := exists (select 1 from public.evolution_rules where from_dex = 25 and required_item = 'thunderstone' and candy_cost = 40 and enabled);
  detail := 'Pikachu';
  return next;

  name := 'Dragonite is a long-term Candy sink';
  passed := exists (select 1 from public.evolution_rules where from_dex = 148 and to_dex = 149 and candy_cost = 100 and enabled);
  detail := 'Dragonair';
  return next;

  name := 'Mew is not freely tradable';
  passed := exists (select 1 from public.species where dex = 151 and tradable = false);
  detail := 'Mew';
  return next;

  name := 'Variants do not invent extra families';
  passed := (select count(distinct family_id) <= 151 from public.species where dex between 1 and 151);
  detail := (select count(distinct family_id)::text from public.species where dex between 1 and 151);
  return next;

  name := 'No Trainer Level catch bonus still';
  passed := coalesce((private.progression_config()->>'levelCatchBonus')::boolean, true) = false;
  detail := 'false';
  return next;

  name := 'Historic Candy exists for evolving-family encounter catches';
  passed := not exists (
    select 1 from public.catches c
    join public.species s on s.dex = c.dex
     where c.round_id is not null
       and private.family_has_enabled_evo(coalesce(s.family_candy_species_id, s.family_id, c.dex))
       and not exists (select 1 from public.candy_ledger l where l.idempotency = 'candy-catch:' || c.id::text)
  );
  detail := 'seeded evolving families';
  return next;

  name := 'Oak candy table was not mixed in';
  passed := not exists (select 1 from public.candy_ledger where type = 'OAK');
  detail := 'separate';
  return next;

  name := 'Magikarp costs 100 Candy';
  passed := exists (select 1 from public.evolution_rules where from_dex = 129 and candy_cost = 100 and enabled);
  detail := 'Gyarados';
  return next;
end;
$function$;

create or replace function private.kanto_evolution_self_test()
returns table(name text, passed boolean, detail text)
language plpgsql
as $function$
declare
  rule_row public.evolution_rules;
  enabled_n int;
  src text;
begin
  select count(*) into enabled_n from public.evolution_rules where enabled;
  name := 'Enabled Kanto rule count is 72';
  passed := enabled_n = 72;
  detail := enabled_n::text;
  return next;

  for rule_row in
    select * from public.evolution_rules where enabled order by sort_order, id
  loop
    name := format('Enabled %s → %s', rule_row.from_dex, rule_row.to_dex);
    passed := rule_row.to_dex between 1 and 151
          and rule_row.generation_introduced = 1
          and exists (select 1 from public.species s where s.dex = rule_row.from_dex)
          and exists (select 1 from public.species s where s.dex = rule_row.to_dex)
          and exists (select 1 from public.evolution_families f where f.id = rule_row.family_id)
          and rule_row.candy_cost > 0
          and (rule_row.required_item is null or rule_row.required_item = any (private.evo_item_keys()))
          and rule_row.rpg_method is distinct from 'DISABLED_GENERATION';
    detail := coalesce(rule_row.rpg_method, rule_row.condition_type) || ' ' || rule_row.candy_cost::text;
    return next;
  end loop;

  name := 'Bulbasaur → Ivysaur costs 40';
  passed := exists (select 1 from public.evolution_rules where id = '1-2' and candy_cost = 40 and enabled);
  detail := '40';
  return next;

  name := 'Ivysaur → Venusaur costs 80';
  passed := exists (select 1 from public.evolution_rules where id = '2-3' and candy_cost = 80 and enabled);
  detail := '80';
  return next;

  name := 'Caterpie → Metapod costs 15';
  passed := exists (select 1 from public.evolution_rules where id = '10-11' and candy_cost = 15 and enabled);
  detail := '15';
  return next;

  name := 'Metapod → Butterfree costs 30';
  passed := exists (select 1 from public.evolution_rules where id = '11-12' and candy_cost = 30 and enabled);
  detail := '30';
  return next;

  name := 'Nidorina requires Moon Stone';
  passed := exists (select 1 from public.evolution_rules where id = '30-31' and required_item = 'moonstone' and candy_cost = 40 and enabled);
  detail := 'moonstone';
  return next;

  name := 'Nidorino requires Moon Stone';
  passed := exists (select 1 from public.evolution_rules where id = '33-34' and required_item = 'moonstone' and enabled);
  detail := 'moonstone';
  return next;

  name := 'Vulpix requires Fire Stone';
  passed := exists (select 1 from public.evolution_rules where id = '37-38' and required_item = 'firestone' and enabled);
  detail := 'firestone';
  return next;

  name := 'Gloom requires Leaf Stone';
  passed := exists (select 1 from public.evolution_rules where id = '44-45' and required_item = 'leafstone' and enabled);
  detail := 'leafstone';
  return next;

  name := 'Poliwhirl requires Water Stone';
  passed := exists (select 1 from public.evolution_rules where id = '61-62' and required_item = 'waterstone' and enabled);
  detail := 'waterstone';
  return next;

  name := 'Kadabra supports trade or Linking Cord';
  passed := exists (select 1 from public.evolution_rules where id = '64-65' and condition_type = 'TRADE_OR_ITEM' and required_item = 'linkingcord' and candy_cost = 50 and enabled);
  detail := 'TRADE_OR_ITEM';
  return next;

  name := 'Machoke supports both methods';
  passed := exists (select 1 from public.evolution_rules where id = '67-68' and condition_type = 'TRADE_OR_ITEM' and enabled);
  detail := 'TRADE_OR_ITEM';
  return next;

  name := 'Graveler supports both methods';
  passed := exists (select 1 from public.evolution_rules where id = '75-76' and condition_type = 'TRADE_OR_ITEM' and enabled);
  detail := 'TRADE_OR_ITEM';
  return next;

  name := 'Haunter supports both methods';
  passed := exists (select 1 from public.evolution_rules where id = '93-94' and condition_type = 'TRADE_OR_ITEM' and enabled);
  detail := 'TRADE_OR_ITEM';
  return next;

  name := 'Eevee has exactly three enabled branches';
  passed := (select count(*) from public.evolution_rules where from_dex = 133 and enabled) = 3
        and exists (select 1 from public.evolution_rules where id = '133-134' and enabled)
        and exists (select 1 from public.evolution_rules where id = '133-135' and enabled)
        and exists (select 1 from public.evolution_rules where id = '133-136' and enabled);
  detail := 'Vaporeon Jolteon Flareon';
  return next;

  name := 'Later Eeveelutions stay disabled';
  passed := not exists (select 1 from public.evolution_rules where from_dex = 133 and to_dex in (196,197,470,471,700) and enabled);
  detail := 'Espeon Umbreon Leafeon Glaceon Sylveon';
  return next;

  name := 'Dratini costs 50';
  passed := exists (select 1 from public.evolution_rules where id = '147-148' and candy_cost = 50 and enabled);
  detail := '50';
  return next;

  name := 'Mewtwo has no enabled evolution';
  passed := not exists (select 1 from public.evolution_rules where from_dex = 150 and enabled);
  detail := 'none';
  return next;

  name := 'Mew has no enabled evolution';
  passed := not exists (select 1 from public.evolution_rules where from_dex = 151 and enabled);
  detail := 'none';
  return next;

  name := 'No enabled target above 151';
  passed := not exists (select 1 from public.evolution_rules where enabled and to_dex > 151);
  detail := 'Kanto only';
  return next;

  name := 'No Mega or Gmax evolution targets';
  passed := not exists (
    select 1 from public.evolution_rules er
    left join public.species s on s.dex = er.to_dex
     where er.enabled and (s.name ilike '%mega%' or s.name ilike '%gmax%' or s.name ilike '%gigantamax%')
  );
  detail := 'none';
  return next;

  name := 'Later-generation relatives stay disabled';
  passed := not exists (
    select 1 from public.evolution_rules
     where enabled and id in (
       '42-169','44-182','61-186','79-199','95-208','123-212','117-230','137-233','233-474',
       '113-242','112-464','114-465','82-462','108-463','125-466','126-467','57-979','83-865','123-900'
     )
  );
  detail := 'disabled generation';
  return next;

  name := 'Babies stay disabled';
  passed := not exists (
    select 1 from public.evolution_rules
     where enabled and id in ('172-25','173-35','174-39','236-106','236-107','238-124','239-125','240-126','440-113','439-122','446-143')
  );
  detail := 'disabled babies';
  return next;

  name := 'Onix Scyther Porygon Seadra have no enabled Kanto trade evo';
  passed := not exists (
    select 1 from public.evolution_rules
     where enabled and from_dex in (95,123,137,117)
  );
  detail := 'Steelix Scizor Porygon2 Kingdra off';
  return next;

  name := 'Stone mappings cover current Kanto users';
  passed := (select count(*) from public.evolution_rules where enabled and required_item = 'thunderstone') = 2
        and (select count(*) from public.evolution_rules where enabled and required_item = 'firestone') = 3
        and (select count(*) from public.evolution_rules where enabled and required_item = 'waterstone') = 4
        and (select count(*) from public.evolution_rules where enabled and required_item = 'leafstone') = 3
        and (select count(*) from public.evolution_rules where enabled and required_item = 'moonstone') = 4;
  detail := 'stones';
  return next;

  name := 'Exactly four current Kanto trade evolutions';
  passed := (select count(*) from public.evolution_rules where enabled and condition_type = 'TRADE_OR_ITEM') = 4;
  detail := 'Kadabra Machoke Graveler Haunter';
  return next;

  name := 'Family Candy IDs stay on the first stage';
  passed := exists (select 1 from public.species where dex = 3 and family_candy_species_id = 1)
        and exists (select 1 from public.species where dex = 136 and family_candy_species_id = 133);
  detail := 'Ivysaur/Flareon';
  return next;

  name := 'Terminal legendaries do not award evolution Candy';
  passed := not private.family_has_enabled_evo(144)
        and not private.family_has_enabled_evo(145)
        and not private.family_has_enabled_evo(146)
        and not private.family_has_enabled_evo(150)
        and not private.family_has_enabled_evo(151);
  detail := 'no Mewtwo Candy';
  return next;

  name := 'Balance version is 1';
  passed := coalesce((select balance_version from public.evolution_config where id = 1), 0) = 1;
  detail := '1';
  return next;

  src := pg_get_functiondef('private.evolve_catch(uuid,uuid,text,text)'::regprocedure);
  name := 'Evolution preserves shiny and gender';
  passed := src like '%obtained_method = ''EVOLUTION''%'
        and src not ilike '%variant =%'
        and src not ilike '%gender =%';
  detail := 'instance fields kept';
  return next;

  name := 'Trade path spends no Candy';
  passed := src ilike '%trade_path%' and src ilike '%spend := 0%';
  detail := 'TRADE_OR_ITEM ready';
  return next;

  name := 'Evolution spend is idempotent';
  passed := exists (select 1 from pg_indexes where indexname = 'candy_ledger_idem_uidx');
  detail := 'ledger unique';
  return next;

  name := 'Failed evolution rolls back in one transaction';
  passed := exists (
    select 1 from pg_proc
     where proname = 'evolve_catch'
       and prosecdef = false
       and provolatile = 'v'
  );
  detail := 'single plpgsql txn';
  return next;
end;
$function$;
