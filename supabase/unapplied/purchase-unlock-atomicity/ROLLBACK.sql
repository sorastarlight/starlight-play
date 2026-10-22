BEGIN;SET LOCAL lock_timeout='5s';SET LOCAL statement_timeout='20s';
DO $guard$ BEGIN
IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='private.ensure_inventory(uuid)'::regprocedure AND md5(prosrc)='ccc5af71a95193d0301edcb689e225e5' AND proacl::text IS NOT DISTINCT FROM NULL AND proconfig IS NOT DISTINCT FROM NULL::text[] AND pg_get_userbyid(proowner)='postgres' AND prosecdef=false AND provolatile='v') THEN RAISE EXCEPTION 'Purchase source/dependency/attribute drift: private.ensure_inventory(uuid)';END IF;
IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='public.play_buy_sku(text)'::regprocedure AND md5(prosrc)='fc0a96fc5dd63fc749ca6dd5ef10ebdd' AND proacl::text IS NOT DISTINCT FROM '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' AND proconfig IS NOT DISTINCT FROM ARRAY['search_path=public']::text[] AND pg_get_userbyid(proowner)='postgres' AND prosecdef=true AND provolatile='v') THEN RAISE EXCEPTION 'Purchase source/dependency/attribute drift: public.play_buy_sku(text)';END IF;
IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='private.flush_bits_pending(uuid)'::regprocedure AND md5(prosrc)='cb7fc4cf40a53c815c967f3a48d5e4eb' AND proacl::text IS NOT DISTINCT FROM NULL AND proconfig IS NOT DISTINCT FROM NULL::text[] AND pg_get_userbyid(proowner)='postgres' AND prosecdef=false AND provolatile='v') THEN RAISE EXCEPTION 'Purchase source/dependency/attribute drift: private.flush_bits_pending(uuid)';END IF;
IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='private.owns_avatar_pack(uuid,text)'::regprocedure AND md5(prosrc)='a20cc082f3c0f5f157367dcb5eb00deb' AND proacl::text IS NOT DISTINCT FROM NULL AND proconfig IS NOT DISTINCT FROM NULL::text[] AND pg_get_userbyid(proowner)='postgres' AND prosecdef=false AND provolatile='s') THEN RAISE EXCEPTION 'Purchase source/dependency/attribute drift: private.owns_avatar_pack(uuid,text)';END IF;
IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='private.adjust_coins(uuid,integer,text,text,jsonb)'::regprocedure AND md5(prosrc)='d02b15dde384226e33d23d38be33cb64' AND proacl::text IS NOT DISTINCT FROM NULL AND proconfig IS NOT DISTINCT FROM NULL::text[] AND pg_get_userbyid(proowner)='postgres' AND prosecdef=false AND provolatile='v') THEN RAISE EXCEPTION 'Purchase source/dependency/attribute drift: private.adjust_coins(uuid,integer,text,text,jsonb)';END IF;
IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='public.play_buy_cart(jsonb,uuid)'::regprocedure AND md5(prosrc)='3c1a81f5621c19485884c8803cab5d46' AND proacl::text IS NOT DISTINCT FROM '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' AND proconfig IS NOT DISTINCT FROM ARRAY['search_path=public']::text[] AND pg_get_userbyid(proowner)='postgres' AND prosecdef=true AND provolatile='v') THEN RAISE EXCEPTION 'Purchase source/dependency/attribute drift: public.play_buy_cart(jsonb,uuid)';END IF;
IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='private.as_uuid_or_null(text)'::regprocedure AND md5(prosrc)='34d2b5dc9485e64f20d45a191c979f15' AND proacl::text IS NOT DISTINCT FROM NULL AND proconfig IS NOT DISTINCT FROM NULL::text[] AND pg_get_userbyid(proowner)='postgres' AND prosecdef=false AND provolatile='i') THEN RAISE EXCEPTION 'Purchase source/dependency/attribute drift: private.as_uuid_or_null(text)';END IF;
END $guard$;
CREATE OR REPLACE FUNCTION public.play_buy_sku(p_sku text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  uid uuid := auth.uid();
  item jsonb;
  inv public.inventories;
  pack text;
begin
  if uid is null then
    raise exception 'Sign in to use the mart.' using errcode = '42501';
  end if;
  item := private.store_sku_item(p_sku);
  if item is null or coalesce((item->>'bits')::int, 0) > 0 then
    raise exception 'That shelf item is not sold for PokéCoins.';
  end if;
  pack := nullif(item->>'pack', '');
  inv := private.ensure_inventory(uid);
  if inv.coins < coalesce((item->>'cost')::int, 0) then
    raise exception 'Not enough PokéCoins.';
  end if;
  if pack is not null then
    if private.owns_avatar_pack(uid, pack) then
      raise exception 'You already own this series.';
    end if;
    update public.inventories
      set coins = coins - (item->>'cost')::int, updated_at = now()
      where user_id = uid;
    update public.profiles
      set owned_avatar_packs = array_append(coalesce(owned_avatar_packs, '{}'::text[]), pack),
          updated_at = now()
      where id = uid
        and not (pack = any (coalesce(owned_avatar_packs, '{}'::text[])));
    return private.play_snapshot(uid) || jsonb_build_object(
      'ok', true,
      'message', 'Unlocked ' || (item->>'name') || '. Choose it in Settings.'
    );
  end if;
  update public.inventories
    set coins = coins - (item->>'cost')::int, updated_at = now()
    where user_id = uid;
  perform private.grant_known(uid, coalesce(item->'grants', '{}'::jsonb));
  return private.play_snapshot(uid) || jsonb_build_object('ok', true, 'message', 'Added ' || (item->>'name') || ' to your inventory.');
end;
$function$
;
CREATE OR REPLACE FUNCTION public.play_buy_cart(p_items jsonb, p_order_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  uid uuid := auth.uid(); rec record; item jsonb; pack text; unit_cost int; total_cost int := 0;
  names text[] := '{}'; scaled jsonb := '{}'::jsonb; qualifying int := 0; line_count int := 0;
  v_order uuid := coalesce(p_order_id, gen_random_uuid()); premier int := 0; prior private.store_orders;
begin
  if uid is null then raise exception 'Sign in to use the mart.' using errcode = '42501'; end if;
  select * into prior from private.store_orders o where o.order_id = v_order;
  if found then
    if prior.user_id <> uid then raise exception 'That checkout already belongs to another Trainer.'; end if;
    return private.play_snapshot(uid) || jsonb_build_object('ok', true, 'duplicate', true, 'premierBonus', prior.premier_bonus, 'message', 'This checkout was already completed.');
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 then raise exception 'Your checkout is empty.'; end if;
  for rec in select nullif(btrim(coalesce(e->>'sku','')), '') as sku, sum(coalesce((e->>'qty')::int,0))::int as qty from jsonb_array_elements(p_items) e group by 1 loop
    line_count := line_count + 1;
    if rec.sku is null then raise exception 'Checkout has an unknown item.'; end if;
    if rec.qty < 1 or rec.qty > 99 then raise exception 'Quantity must be between 1 and 99.'; end if;
    item := private.store_sku_item(rec.sku);
    if item is null or coalesce((item->>'bits')::int, 0) > 0 then raise exception 'That shelf item is not sold for PokéCoins.'; end if;
    if rec.sku = 'master1' or (item->'grants' ? 'masterball') then raise exception 'The Master Ball is not sold on the ordinary shelf.'; end if;
    pack := nullif(item->>'pack', '');
    if pack is not null then
      if rec.qty <> 1 then raise exception 'Avatar series can only be bought once.'; end if;
      if private.owns_avatar_pack(uid, pack) then raise exception 'You already own %.', item->>'name'; end if;
    end if;
    unit_cost := coalesce((item->>'cost')::int, 0);
    if unit_cost < 0 then raise exception 'That checkout is not valid.'; end if;
    total_cost := total_cost + (unit_cost * rec.qty);
    names := array_append(names, (item->>'name') || case when rec.qty > 1 then ' ×' || rec.qty::text else '' end);
  end loop;
  if line_count < 1 then raise exception 'Your checkout is empty.'; end if;
  perform private.ensure_inventory(uid);
  perform private.adjust_coins(uid, -total_cost, 'STORE_PURCHASE', 'Store checkout', jsonb_build_object('orderId', v_order::text, 'relatedSku', names[1], 'idempotency', 'buy:' || v_order::text));
  for rec in select nullif(btrim(coalesce(e->>'sku','')), '') as sku, sum(coalesce((e->>'qty')::int,0))::int as qty from jsonb_array_elements(p_items) e group by 1 loop
    item := private.store_sku_item(rec.sku);
    pack := nullif(item->>'pack', '');
    if pack is not null then
      update public.profiles set owned_avatar_packs = array_append(coalesce(owned_avatar_packs, '{}'::text[]), pack), updated_at = now() where id = uid and not (pack = any (coalesce(owned_avatar_packs, '{}'::text[])));
    else
      select coalesce(jsonb_object_agg(key, to_jsonb(greatest(coalesce((value #>> '{}')::int, 0), 0) * rec.qty)), '{}'::jsonb) into scaled from jsonb_each(coalesce(item->'grants', '{}'::jsonb));
      perform private.grant_known(uid, coalesce(scaled, '{}'::jsonb));
      qualifying := qualifying + coalesce((select sum(greatest(coalesce((scaled->>key)::int, 0), 0)) from jsonb_array_elements_text(private.economy_config()->'premierKeys') as key), 0);
    end if;
  end loop;
  premier := (qualifying / greatest(coalesce((private.economy_config()->>'premierEvery')::int, 10), 1))::int;
  if premier > 0 then perform private.grant_known(uid, jsonb_build_object('premierball', premier)); names := array_append(names, 'Premier Ball ×' || premier::text); end if;
  insert into private.store_orders (order_id, user_id, items, total_cost, premier_bonus) values (v_order, uid, p_items, total_cost, premier);
  return private.play_snapshot(uid) || jsonb_build_object('ok', true, 'orderId', v_order, 'premierBonus', premier, 'message', 'Purchased ' || array_to_string(names, ', ') || '.' || case when premier > 0 then ' Bonus! You received a Premier Ball!' else '' end);
end;
$function$
;COMMIT;
