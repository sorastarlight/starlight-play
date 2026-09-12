create or replace function public.play_buy_cart(p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  uid uuid := auth.uid();
  rec record;
  item jsonb;
  inv public.inventories;
  pack text;
  unit_cost int;
  total_cost int := 0;
  names text[] := '{}';
  scaled jsonb;
  line_count int := 0;
begin
  if uid is null then
    raise exception 'Sign in to use the mart.' using errcode = '42501';
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
  if inv.coins < total_cost then
    raise exception 'Not enough PokéCoins.';
  end if;

  update public.inventories
    set coins = coins - total_cost,
        updated_at = now()
    where user_id = uid
      and coins >= total_cost;
  if not found then
    raise exception 'Not enough PokéCoins.';
  end if;

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
      select coalesce(
        jsonb_object_agg(
          key,
          to_jsonb(greatest(coalesce((value #>> '{}')::int, 0), 0) * rec.qty)
        ),
        '{}'::jsonb
      )
        into scaled
      from jsonb_each(coalesce(item->'grants', '{}'::jsonb));
      perform private.grant_known(uid, coalesce(scaled, '{}'::jsonb));
    end if;
  end loop;

  return private.play_snapshot(uid) || jsonb_build_object(
    'ok', true,
    'message', 'Purchased ' || array_to_string(names, ', ') || '.'
  );
end;
$$;

revoke all on function public.play_buy_cart(jsonb) from public;
grant execute on function public.play_buy_cart(jsonb) to authenticated;
