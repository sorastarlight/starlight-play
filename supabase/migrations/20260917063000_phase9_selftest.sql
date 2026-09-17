-- Phase 9 Balance V1 self-test. Does not grant items to Sora.

create or replace function private.phase9_balance_selftest()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  failed text := '';
  chance numeric;
  pinap numeric;
  silver numeric;
  src text;
  live_master int;
  live_beast int;
  ultra_grants jsonb;
  pouch_grants jsonb;
  cap int;
begin
  chance := private.capture_base_chance(45);
  if chance is distinct from 0.16 then failed := failed || format('cr45=%s; ', chance); end if;
  chance := private.capture_base_chance(25);
  if chance is distinct from 0.11 then failed := failed || format('cr25=%s; ', chance); end if;
  chance := private.capture_base_chance(3);
  if chance is distinct from 0.04 then failed := failed || format('cr3=%s; ', chance); end if;

  select reward_bonus into pinap from public.capture_berries where key = 'pinap';
  select reward_bonus into silver from public.capture_berries where key = 'silverpinap';
  if coalesce(pinap, 0) <> 2 then failed := failed || format('pinap=%s; ', pinap); end if;
  if coalesce(silver, 0) <> 1.5 then failed := failed || format('silver=%s; ', silver); end if;

  src := pg_get_functiondef('private.settle_if_needed(public.encounter_rounds)'::regprocedure);
  if src not ilike '%capture_throw_context%' then failed := failed || 'throw context unwired; '; end if;

  select count(*)::int into live_master
    from private.store_items
   where sku = 'master1' and status = 'published';
  if live_master > 0 then failed := failed || 'masterball live; '; end if;
  select count(*)::int into live_beast
    from private.store_items
   where sku = 'beast1' and status = 'published';
  if live_beast > 0 then failed := failed || 'beastball live; '; end if;

  select grants into ultra_grants from private.store_items where sku = 'bits-ultra';
  if coalesce((ultra_grants->>'ultraball')::int, 0) > 2 then failed := failed || 'ultra pack still stacked; '; end if;
  if ultra_grants ? 'bag_bonus' then failed := failed || 'ultra bag_bonus; '; end if;
  select grants into pouch_grants from private.store_items where sku = 'bits-pouch';
  if pouch_grants ? 'bag_bonus' then failed := failed || 'explorer still bag-only; '; end if;
  if coalesce((pouch_grants->>'pokeball')::int, 0) < 1 then failed := failed || 'explorer empty; '; end if;

  cap := private.bag_bonus_cap();
  if cap <> 100 then failed := failed || format('bag cap %s; ', cap); end if;

  if (private.economy_config()->'dailySupply'->>'coins')::int <> 40 then
    failed := failed || 'daily coins; ';
  end if;

  if exists (
    select 1 from private.store_items
     where sku = 'bits-community' and status is distinct from 'published'
  ) then failed := failed || 'community not published; '; end if;

  if exists (
    select 1 from private.store_items
     where sku = 'bits-evo' and status = 'published'
  ) then failed := failed || 'evo pack live; '; end if;

  if failed <> '' then
    return jsonb_build_object('ok', false, 'failed', failed);
  end if;
  return jsonb_build_object('ok', true, 'cr45', chance, 'pinap', pinap, 'bagBonusCap', cap);
end;
$function$;

do $$
declare
  result jsonb;
begin
  result := private.phase9_balance_selftest();
  if not coalesce((result->>'ok')::boolean, false) then
    raise exception 'phase9_balance_selftest: %', result->>'failed';
  end if;
end;
$$;
