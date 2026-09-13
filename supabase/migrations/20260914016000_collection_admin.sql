-- Trade guards, bag item totals, and admin collection tools.
-- Applied live in pieces after collection RPCs.

create or replace function private.item_total(i public.inventories)
returns integer
language sql
stable
as $$
  select i.berry + i.bait + i.pokeball + i.greatball + i.ultraball + i.lure
    + coalesce((select sum(greatest(value::int, 0)) from jsonb_each_text(coalesce(i.balls, '{}'::jsonb))), 0)
    + coalesce((select sum(greatest(value::int, 0)) from jsonb_each_text(coalesce(i.berries, '{}'::jsonb))), 0)
    + coalesce((select sum(greatest(value::int, 0)) from jsonb_each_text(coalesce(i.items, '{}'::jsonb))), 0);
$$;

create or replace function private.assert_catch_tradable()
returns trigger
language plpgsql
as $function$
declare
  c public.catches;
begin
  select * into c from public.catches where id = new.catch_id;
  if c.id is null then raise exception 'That Pokémon is not available.'; end if;
  if c.locked or c.favorite then raise exception 'A locked or favorite Pokémon cannot be traded.'; end if;
  if exists (select 1 from public.species s where s.dex = c.dex and s.tradable = false) then
    raise exception 'That Pokémon cannot be traded.';
  end if;
  if c.trade_locked_until is not null and c.trade_locked_until > now() then
    raise exception 'That Pokémon was just received. Wait a few minutes before trading it again.';
  end if;
  return new;
end;
$function$;

drop trigger if exists trade_listings_tradable on public.trade_listings;
create trigger trade_listings_tradable before insert or update of catch_id, status on public.trade_listings
  for each row when (new.status = 'open') execute function private.assert_catch_tradable();

drop trigger if exists trade_offers_tradable on public.trade_offers;
create trigger trade_offers_tradable before insert on public.trade_offers
  for each row execute function private.assert_catch_tradable();

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
    'candyTotal', coalesce((select sum(qty) from public.family_candy), 0),
    'candyTrainers', coalesce((select count(distinct user_id) from public.family_candy where qty > 0), 0),
    'evolutions', coalesce((select count(*) from public.evolution_log), 0),
    'directTrades', coalesce((select count(*) from public.direct_trades), 0),
    'openGts', coalesce((select count(*) from public.trade_listings where status = 'open'), 0),
    'mastered', coalesce((select count(*) from public.species_mastery where rank >= 5), 0)
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
begin
  if not private.is_play_admin() then raise exception 'Admin only.'; end if;
  select * into fam from public.evolution_families where id = p_family;
  if fam.id is null then raise exception 'Unknown family.'; end if;
  select * into spec from public.species where dex = fam.base_dex;
  pay := private.candy_for_stage(coalesce(spec.evo_stage, 1));
  select * into first_rule from public.evolution_rules where family_id = p_family and enabled order by sort_order limit 1;
  select * into final_rule from public.evolution_rules where family_id = p_family and enabled order by sort_order desc limit 1;
  return jsonb_build_object(
    'ok', true,
    'family', fam.name,
    'candyPerCatch', pay,
    'expectedCatches', p_catches,
    'expectedCandy', greatest(p_catches, 0) * pay,
    'firstEvolution', case when first_rule.id is null then null else jsonb_build_object(
      'fromDex', first_rule.from_dex, 'toDex', first_rule.to_dex, 'cost', first_rule.candy_cost,
      'catchesNeeded', ceil(first_rule.candy_cost::numeric / greatest(pay, 1))
    ) end,
    'finalEvolution', case when final_rule.id is null or final_rule.id = first_rule.id then null else jsonb_build_object(
      'fromDex', final_rule.from_dex, 'toDex', final_rule.to_dex, 'cost', final_rule.candy_cost,
      'catchesNeeded', ceil((coalesce(first_rule.candy_cost, 0) + final_rule.candy_cost)::numeric / greatest(pay, 1))
    ) end
  );
end;
$function$;

create or replace function public.admin_unlock_catch(p_catch uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  c public.catches;
begin
  if not private.is_play_admin() then raise exception 'Admin only.'; end if;
  select * into c from public.catches where id = p_catch for update;
  if c.id is null then raise exception 'Pokémon not found.'; end if;
  update public.catches set locked = false, reserved_trade_id = null, trade_locked_until = null where id = c.id;
  insert into public.play_console_log (kind, message)
  values ('admin', 'Unlocked catch ' || c.id::text || ' for ' || coalesce(nullif(p_reason, ''), 'support') || ' (dex ' || c.dex::text || ')');
  return jsonb_build_object('ok', true, 'message', 'Lock cleared. Ownership was not changed.');
end;
$function$;

grant execute on function public.admin_collection_overview() to authenticated;
grant execute on function public.admin_candy_simulate(int, int) to authenticated;
grant execute on function public.admin_unlock_catch(uuid, text) to authenticated;
