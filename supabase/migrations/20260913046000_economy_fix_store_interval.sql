-- make_interval(hours => numeric) is not a valid signature. Use interval math.

create or replace function public.play_store()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
  inv public.inventories;
  pass boolean := false;
  supply jsonb;
  hours numeric;
begin
  if uid is not null then
    inv := private.ensure_inventory(uid);
    select starlight_pass into pass from public.profiles where id = uid;
  end if;
  supply := private.economy_config()->'dailySupply';
  hours := coalesce((supply->>'cooldownHours')::numeric, 20);
  return private.play_snapshot(uid) || jsonb_build_object(
    'ok', true,
    'catalog', private.store_catalog() || jsonb_build_object('avatars', private.premium_avatar_catalog()),
    'wallet', case when inv.user_id is null then null else jsonb_build_object(
      'coins', inv.coins,
      'capacity', private.bag_capacity(uid),
      'used', private.item_total(inv),
      'dailyReady', pass and (inv.pass_daily_at is null or inv.pass_daily_at < now() - interval '20 hours'),
      'weeklyReady', pass and (inv.pass_weekly_at is null or inv.pass_weekly_at < now() - interval '6 days'),
      'dailySupplyReady', inv.daily_supply_at is null or inv.daily_supply_at <= now() - (interval '1 hour' * hours),
      'dailySupplyAt', inv.daily_supply_at
    ) end
  );
end;
$function$;
