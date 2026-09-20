-- Fix: play_sell_item used `where slug = slug` which Postgres rejects as ambiguous
-- (PL/pgSQL variable vs item_catalog.slug). Rename local to v_slug.

create or replace function public.play_sell_item(
  p_item_key text,
  p_quantity int,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
  v_slug text := lower(nullif(btrim(coalesce(p_item_key, '')), ''));
  qty int := coalesce(p_quantity, 0);
  unit int;
  total int;
  have int;
  after_qty int;
  after_coins int;
  prior public.mart_sales;
  pol public.item_policy;
  cat public.item_catalog;
begin
  if uid is null then
    raise exception 'Sign in to sell items.' using errcode = '42501';
  end if;
  if v_slug is null then
    raise exception 'Choose an item to sell.';
  end if;
  if qty < 1 or qty > 99 then
    raise exception 'Quantity must be between 1 and 99.';
  end if;

  if p_idempotency_key is not null then
    select * into prior from public.mart_sales
     where user_id = uid and idempotency = p_idempotency_key;
    if found then
      return jsonb_build_object(
        'ok', true,
        'duplicate', true,
        'item', prior.item_slug,
        'quantity', prior.quantity,
        'unitPrice', prior.unit_price,
        'coinsReceived', prior.coins_received,
        'message', 'This sale was already completed.'
      );
    end if;
  end if;

  select * into pol from public.item_policy where item_slug = v_slug;
  if not found or not pol.mart_sell_enabled or not pol.inventory_enabled then
    raise exception 'That item cannot be sold at the Mart.';
  end if;
  unit := private.item_sell_price(v_slug);
  if unit < 1 then
    raise exception 'That item has no sell price.';
  end if;
  select * into cat from public.item_catalog where item_catalog.slug = v_slug;

  perform private.ensure_inventory(uid);
  have := private.item_qty(uid, v_slug);
  if have < qty then
    raise exception 'You do not own that many.';
  end if;

  total := unit * qty;
  after_qty := private.adjust_item(uid, v_slug, -qty);
  perform private.adjust_coins(
    uid, total, 'MART_SALE', 'Sold ' || coalesce(cat.display_name, v_slug),
    jsonb_build_object(
      'idempotency', case when p_idempotency_key is null then null else p_idempotency_key || ':coins' end,
      'relatedItem', v_slug
    )
  );
  insert into public.item_ledger (user_id, item_key, amount, reason, source_id, idempotency)
  values (
    uid, v_slug, -qty, 'MART_SALE', null,
    case when p_idempotency_key is null then null else p_idempotency_key || ':item' end
  )
  on conflict do nothing;

  insert into public.mart_sales (user_id, item_slug, quantity, unit_price, coins_received, idempotency, detail)
  values (
    uid, v_slug, qty, unit, total, p_idempotency_key,
    jsonb_build_object('displayName', coalesce(cat.display_name, v_slug))
  );

  select coins into after_coins from public.inventories where user_id = uid;

  return jsonb_build_object(
    'ok', true,
    'item', v_slug,
    'displayName', coalesce(cat.display_name, v_slug),
    'quantity', qty,
    'unitPrice', unit,
    'coinsReceived', total,
    'newQuantity', after_qty,
    'newCoinBalance', after_coins,
    'sprite', coalesce(cat.sprite_path, 'images/items/poke-ball.png')
  );
end;
$function$;

revoke all on function public.play_sell_item(text, int, text) from public;
grant execute on function public.play_sell_item(text, int, text) to authenticated;
