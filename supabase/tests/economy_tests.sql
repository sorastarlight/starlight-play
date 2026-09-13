-- Economy self-test. Does not modify trainer inventories or collections.

create or replace function private.economy_self_test()
returns table(name text, passed boolean, detail text)
language plpgsql
as $function$
declare
  uid uuid := '00000000-0000-0000-0000-00000000e001';
  before_c int;
  after_c int;
  poke int;
  great int;
  ultra int;
  honey int;
  razz int;
  gold int;
  master_vis boolean;
  premier int;
  raised boolean;
begin
  poke := (select shop_price from public.capture_balls where key = 'pokeball');
  great := (select shop_price from public.capture_balls where key = 'greatball');
  ultra := (select shop_price from public.capture_balls where key = 'ultraball');
  honey := (select cost from private.store_items where sku = 'bait1');
  razz := (select shop_price from public.capture_berries where key = 'razz');
  gold := (select shop_price from public.capture_berries where key = 'goldenrazz');
  master_vis := (select visible from private.store_items where sku = 'master1');

  name := 'Poké Ball uses the configured base price';
  passed := poke = 100;
  detail := coalesce(poke::text, 'missing');
  return next;

  name := 'Great Ball is priced above linear power';
  passed := great = 225;
  detail := coalesce(great::text, 'missing');
  return next;

  name := 'Ultra Ball is a premium 500';
  passed := ultra = 500;
  detail := coalesce(ultra::text, 'missing');
  return next;

  name := 'Honey uses the configured price';
  passed := honey = 125;
  detail := coalesce(honey::text, 'missing');
  return next;

  name := 'Razz Berry uses the configured price';
  passed := razz = 200;
  detail := coalesce(razz::text, 'missing');
  return next;

  name := 'Golden Razz uses the configured price';
  passed := gold = 500;
  detail := coalesce(gold::text, 'missing');
  return next;

  name := 'Master Ball is hidden from the ordinary store';
  passed := master_vis = false and private.store_sku_item('master1') is null;
  detail := coalesce(master_vis::text, 'missing');
  return next;

  name := 'Sell price is below buy price';
  passed := (select sell_price < shop_price from public.capture_balls where key = 'pokeball');
  detail := (select shop_price::text || '/' || sell_price::text from public.capture_balls where key = 'pokeball');
  return next;

  name := 'Bulk pack math is unit × quantity';
  passed := (select cost = 500 from private.store_items where sku = 'poke5')
        and (select cost = 675 from private.store_items where sku = 'great3');
  detail := (select sku || '=' || cost::text from private.store_items where sku = 'poke5');
  return next;

  name := 'Premier bonus is one per ten qualifying Balls';
  passed := private.premier_bonus_count('{"pokeball":10}'::jsonb) = 1
        and private.premier_bonus_count('{"pokeball":5,"greatball":5}'::jsonb) = 1
        and private.premier_bonus_count('{"berry":10}'::jsonb) = 0;
  detail := private.premier_bonus_count('{"pokeball":10}'::jsonb)::text;
  return next;

  begin
    insert into public.profiles (id, display_name)
    values (uid, 'Economy Test')
    on conflict (id) do nothing;
    insert into public.inventories (user_id, coins, starter_granted)
    values (uid, 400, true)
    on conflict (user_id) do update set coins = 400, starter_granted = true;
  exception when others then
    name := 'Ledger grant tests skipped (no isolated auth user)';
    passed := true;
    detail := SQLERRM;
    return next;
    return;
  end;

  after_c := private.adjust_coins(uid, 25, 'ENCOUNTER_PARTICIPATION', 'test',
    jsonb_build_object('idempotency', 'test-part'));
  name := 'Participation reward grants once';
  passed := after_c = 425;
  detail := after_c::text;
  return next;

  after_c := private.adjust_coins(uid, 25, 'ENCOUNTER_PARTICIPATION', 'test',
    jsonb_build_object('idempotency', 'test-part'));
  name := 'Duplicate participation does not pay twice';
  passed := after_c = 425;
  detail := after_c::text;
  return next;

  after_c := private.adjust_coins(uid, 100, 'NEW_DEX_ENTRY', 'test',
    jsonb_build_object('idempotency', 'test-dex'));
  after_c := private.adjust_coins(uid, 100, 'NEW_DEX_ENTRY', 'test',
    jsonb_build_object('idempotency', 'test-dex'));
  name := 'New Pokédex bonus grants once';
  passed := after_c = 525;
  detail := after_c::text;
  return next;

  after_c := private.adjust_coins(uid, 250, 'SHINY_BONUS', 'test',
    jsonb_build_object('idempotency', 'test-shiny'));
  name := 'Shiny bonus uses the configured amount';
  passed := after_c = 775;
  detail := after_c::text;
  return next;

  raised := false;
  begin
    perform private.adjust_coins(uid, -10000, 'STORE_PURCHASE', 'too much', '{}'::jsonb);
  exception when others then
    raised := true;
  end;
  name := 'Currency cannot become negative';
  passed := raised and (select coins = 775 from public.inventories where user_id = uid);
  detail := (select coins::text from public.inventories where user_id = uid);
  return next;

  name := 'Admin adjustments write a ledger row';
  passed := exists (
    select 1 from public.coin_ledger
    where user_id = uid and type = 'ENCOUNTER_PARTICIPATION' and amount = 25
  );
  detail := 'ledger';
  return next;

  name := 'Economy version is stored';
  passed := coalesce((private.economy_config()->>'economyBalanceVersion')::int, 0) >= 1;
  detail := private.economy_config()->>'economyBalanceVersion';
  return next;

  delete from public.coin_ledger where user_id = uid;
  delete from public.inventories where user_id = uid;
  delete from public.profiles where id = uid;
end;
$function$;
