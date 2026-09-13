-- Server-priced checkout, Premier Ball bonus, and ledger-backed admin coin edits.

create or replace function public.play_buy_cart(p_items jsonb, p_order_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
  rec record;
  item jsonb;
  inv public.inventories;
  pack text;
  unit_cost int;
  total_cost int := 0;
  names text[] := '{}';
  scaled jsonb := '{}'::jsonb;
  qualifying int := 0;
  line_count int := 0;
  v_order uuid := coalesce(p_order_id, gen_random_uuid());
  premier int := 0;
  prior private.store_orders;
begin
  if uid is null then
    raise exception 'Sign in to use the mart.' using errcode = '42501';
  end if;

  select * into prior from private.store_orders o where o.order_id = v_order;
  if found then
    if prior.user_id <> uid then
      raise exception 'That checkout already belongs to another Trainer.';
    end if;
    return private.play_snapshot(uid) || jsonb_build_object(
      'ok', true,
      'duplicate', true,
      'premierBonus', prior.premier_bonus,
      'message', 'This checkout was already completed.'
    );
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 then
    raise exception 'Your checkout is empty.';
  end if;
  if jsonb_array_length(p_items) > 40 then
    raise exception 'Too many different items in checkout.';
  end if;

  for rec in
    select nullif(btrim(coalesce(e->>'sku', '')), '') as sku,
           sum(coalesce((e->>'qty')::int, 0))::int as qty
    from jsonb_array_elements(p_items) e
    group by 1
  loop
    line_count := line_count + 1;
    if rec.sku is null then
      raise exception 'Checkout has an unknown item.';
    end if;
    if rec.qty < 1 or rec.qty > 99 then
      raise exception 'Quantity must be between 1 and 99.';
    end if;
    item := private.store_sku_item(rec.sku);
    if item is null or coalesce((item->>'bits')::int, 0) > 0 then
      raise exception 'That shelf item is not sold for PokéCoins.';
    end if;
    if rec.sku = 'master1' or item->>'ballKey' = 'masterball' or (item->'grants' ? 'masterball') then
      raise exception 'The Master Ball is not sold on the ordinary shelf.';
    end if;
    pack := nullif(item->>'pack', '');
    if pack is not null then
      if rec.qty <> 1 then
        raise exception 'Avatar series can only be bought once.';
      end if;
      if private.owns_avatar_pack(uid, pack) then
        raise exception 'You already own %.', item->>'name';
      end if;
    end if;
    unit_cost := coalesce((item->>'cost')::int, 0);
    if unit_cost < 0 then
      raise exception 'That checkout is not valid.';
    end if;
    total_cost := total_cost + (unit_cost * rec.qty);
    names := array_append(
      names,
      (item->>'name') || case when rec.qty > 1 then ' ×' || rec.qty::text else '' end
    );
  end loop;

  if line_count < 1 then
    raise exception 'Your checkout is empty.';
  end if;

  inv := private.ensure_inventory(uid);
  perform private.adjust_coins(
    uid, -total_cost, 'STORE_PURCHASE', 'Store checkout',
    jsonb_build_object('orderId', v_order::text, 'relatedSku', names[1],
                       'idempotency', 'buy:' || v_order::text)
  );

  for rec in
    select nullif(btrim(coalesce(e->>'sku', '')), '') as sku,
           sum(coalesce((e->>'qty')::int, 0))::int as qty
    from jsonb_array_elements(p_items) e
    group by 1
  loop
    item := private.store_sku_item(rec.sku);
    pack := nullif(item->>'pack', '');
    if pack is not null then
      update public.profiles
        set owned_avatar_packs = array_append(coalesce(owned_avatar_packs, '{}'::text[]), pack),
            updated_at = now()
        where id = uid
          and not (pack = any (coalesce(owned_avatar_packs, '{}'::text[])));
    else
      select coalesce(jsonb_object_agg(key, to_jsonb(greatest(coalesce((value #>> '{}')::int, 0), 0) * rec.qty)), '{}'::jsonb)
        into scaled
        from jsonb_each(coalesce(item->'grants', '{}'::jsonb));
      perform private.grant_known(uid, coalesce(scaled, '{}'::jsonb));
      qualifying := qualifying + coalesce((
        select sum(greatest(coalesce((scaled->>key)::int, 0), 0))
        from jsonb_array_elements_text(private.economy_config()->'premierKeys') as key
      ), 0);
    end if;
  end loop;

  premier := (
    qualifying / greatest(coalesce((private.economy_config()->>'premierEvery')::int, 10), 1)
  )::int;
  if premier > 0 then
    perform private.grant_known(uid, jsonb_build_object('premierball', premier));
    names := array_append(names, 'Premier Ball ×' || premier::text);
  end if;

  insert into private.store_orders (order_id, user_id, items, total_cost, premier_bonus)
  values (v_order, uid, p_items, total_cost, premier);

  return private.play_snapshot(uid) || jsonb_build_object(
    'ok', true,
    'orderId', v_order,
    'premierBonus', premier,
    'message', 'Purchased ' || array_to_string(names, ', ') || '.'
      || case when premier > 0 then ' Bonus! You received a Premier Ball!' else '' end
  );
end;
$function$;

revoke all on function public.play_buy_cart(jsonb, uuid) from public;
grant execute on function public.play_buy_cart(jsonb, uuid) to authenticated;
-- Keep the original one-argument checkout working.
create or replace function public.play_buy_cart(p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  return public.play_buy_cart(p_items, null);
end;
$function$;
revoke all on function public.play_buy_cart(jsonb) from public;
grant execute on function public.play_buy_cart(jsonb) to authenticated;

create or replace function public.play_claim_pass(p_kind text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
  inv public.inventories;
  pass boolean;
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  select starlight_pass into pass from public.profiles where id = uid;
  if not coalesce(pass, false) then
    raise exception 'Starlight Pass is required. Subscribe on Twitch, then check your pass.';
  end if;
  inv := private.ensure_inventory(uid);
  if p_kind = 'daily' then
    if inv.pass_daily_at is not null and inv.pass_daily_at > now() - interval '20 hours' then
      raise exception 'Daily Pass gift is not ready yet.';
    end if;
    update public.inventories set pass_daily_at = now(), updated_at = now() where user_id = uid;
    perform private.grant_known(uid, jsonb_build_object('berry', 2, 'bait', 1));
    perform private.adjust_coins(uid, 20, 'PASS_DAILY', 'Daily Pass gift',
      jsonb_build_object('idempotency', 'pass-daily:' || uid::text || ':' || to_char(now(), 'YYYY-MM-DD')));
    return private.play_snapshot(uid) || jsonb_build_object('ok', true, 'message', 'Daily Pass gift: 2 Berries, 1 Honey, 20 PokéCoins.');
  end if;
  if p_kind = 'weekly' then
    if inv.pass_weekly_at is not null and inv.pass_weekly_at > now() - interval '6 days' then
      raise exception 'Weekly Pass crate is not ready yet.';
    end if;
    update public.inventories set pass_weekly_at = now(), updated_at = now() where user_id = uid;
    perform private.grant_known(uid, jsonb_build_object('pokeball', 5, 'berry', 3, 'lure', 1));
    perform private.adjust_coins(uid, 150, 'PASS_WEEKLY', 'Weekly Pass crate',
      jsonb_build_object('idempotency', 'pass-weekly:' || uid::text || ':' || to_char(now(), 'IYYY-IW')));
    return private.play_snapshot(uid) || jsonb_build_object('ok', true, 'message', 'Weekly Pass crate: 5 Poké Balls, 3 Berries, 1 Poké Radar, 150 PokéCoins.');
  end if;
  raise exception 'Unknown Pass gift.';
end;
$function$;

create or replace function public.admin_set_coins(p_user uuid, p_coins integer)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  before_bal int;
  target int := greatest(0, coalesce(p_coins, 0));
begin
  perform private.require_staff_edit();
  if p_user is null then raise exception 'Pick a trainer.'; end if;
  perform private.ensure_inventory(p_user);
  select coins into before_bal from public.inventories where user_id = p_user;
  perform private.adjust_coins(
    p_user, target - coalesce(before_bal, 0), 'ADMIN_ADJUSTMENT', 'Admin set balance',
    jsonb_build_object('idempotency', 'admin-set:' || p_user::text || ':' || extract(epoch from now())::text)
  );
  return private.admin_account_json(p_user) || jsonb_build_object('message', 'PokéCoins set.');
end;
$function$;

create or replace function public.admin_grant_bag(p_user uuid, p_grants jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  coin_delta int;
begin
  perform private.require_staff_edit();
  if p_user is null then raise exception 'Pick a trainer.'; end if;
  perform private.ensure_inventory(p_user);
  coin_delta := coalesce((p_grants->>'coins')::int, 0);
  perform private.grant_known(p_user, coalesce(p_grants, '{}'::jsonb) - 'coins');
  if coin_delta <> 0 then
    perform private.adjust_coins(p_user, coin_delta, 'ADMIN_ADJUSTMENT', 'Admin granted items',
      jsonb_build_object('relatedItem', 'bag'));
  end if;
  return private.admin_account_json(p_user) || jsonb_build_object('message', 'Bag updated.');
end;
$function$;
