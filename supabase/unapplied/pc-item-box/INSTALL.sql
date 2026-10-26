BEGIN;
DO $guard$BEGIN
IF md5(pg_get_functiondef('private.pc_store_items(uuid,text,integer,text)'::regprocedure))<>'1e32709b0c6b19ec7a2fcfb77d8aa825' OR (SELECT proacl::text FROM pg_proc WHERE oid='private.pc_store_items(uuid,text,integer,text)'::regprocedure) IS DISTINCT FROM '{postgres=X/postgres}' THEN RAISE EXCEPTION 'SOURCE_OR_ACL_DRIFT';END IF;
IF md5(pg_get_functiondef('private.pc_deliver_items(uuid,jsonb,text)'::regprocedure))<>'bf414cd7c65bc77f83ef8ba68faae90a' OR (SELECT proacl::text FROM pg_proc WHERE oid='private.pc_deliver_items(uuid,jsonb,text)'::regprocedure) IS DISTINCT FROM '{postgres=X/postgres}' THEN RAISE EXCEPTION 'SOURCE_OR_ACL_DRIFT';END IF;
IF md5(pg_get_functiondef('private.pc_import_catch_rewards(uuid)'::regprocedure))<>'a969e2b230cb3cf23b286692f23ccfb2' OR (SELECT proacl::text FROM pg_proc WHERE oid='private.pc_import_catch_rewards(uuid)'::regprocedure) IS DISTINCT FROM '{postgres=X/postgres}' THEN RAISE EXCEPTION 'SOURCE_OR_ACL_DRIFT';END IF;
IF md5(pg_get_functiondef('play_pc_items()'::regprocedure))<>'6aa85fe12e5f7a957a6a468a8aec9a68' OR (SELECT proacl::text FROM pg_proc WHERE oid='play_pc_items()'::regprocedure) IS DISTINCT FROM '{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}' THEN RAISE EXCEPTION 'SOURCE_OR_ACL_DRIFT';END IF;
IF md5(pg_get_functiondef('play_pc_item_transfer(uuid,text,text,integer)'::regprocedure))<>'59b51fe9251f66061f56cdc97a081e75' OR (SELECT proacl::text FROM pg_proc WHERE oid='play_pc_item_transfer(uuid,text,text,integer)'::regprocedure) IS DISTINCT FROM '{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}' THEN RAISE EXCEPTION 'SOURCE_OR_ACL_DRIFT';END IF;
END;$guard$;
ALTER TABLE private.pc_items ADD COLUMN slot smallint CHECK(slot BETWEEN 1 AND 30);
CREATE UNIQUE INDEX pc_items_slot_unique ON private.pc_items(user_id,slot) WHERE slot IS NOT NULL;

-- Read-only projection also includes unimported catch receipts. No reward is lost.
CREATE FUNCTION private.pc_item_layout(p_uid uuid) RETURNS TABLE(item_key text,quantity bigint,slot integer)
LANGUAGE sql STABLE SET search_path='' AS $body$
 WITH totals AS (
 SELECT x.item_key,sum(x.quantity)::bigint quantity,max(x.slot)::integer slot FROM (
 SELECT i.item_key,i.quantity,i.slot FROM private.pc_items i WHERE i.user_id=p_uid AND i.quantity>0
 UNION ALL SELECT r.item_key,1,NULL FROM private.berry_drop_receipts r WHERE r.user_id=p_uid AND r.status='pending'
 ) x GROUP BY x.item_key
 ), free AS (SELECT s,row_number() OVER(ORDER BY s) rn FROM generate_series(1,30) s WHERE NOT EXISTS(SELECT 1 FROM totals t WHERE t.slot=s)),
 waiting AS (SELECT t.item_key,row_number() OVER(ORDER BY t.item_key) rn FROM totals t WHERE t.slot IS NULL)
 SELECT t.item_key,t.quantity,coalesce(t.slot,f.s) FROM totals t LEFT JOIN waiting w USING(item_key) LEFT JOIN free f ON f.rn=w.rn;
$body$;

CREATE FUNCTION private.pc_assign_item_slots(p_uid uuid) RETURNS void LANGUAGE plpgsql SET search_path='' AS $body$
DECLARE k text;s integer;
BEGIN
 PERFORM 1 FROM public.inventories WHERE user_id=p_uid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Inventory unavailable.';END IF;
 UPDATE private.pc_items SET slot=NULL WHERE user_id=p_uid AND quantity=0 AND slot IS NOT NULL;
 FOR k IN SELECT item_key FROM private.pc_items WHERE user_id=p_uid AND quantity>0 AND slot IS NULL ORDER BY item_key LOOP
  SELECT n INTO s FROM generate_series(1,30) n WHERE NOT EXISTS(SELECT 1 FROM private.pc_items WHERE user_id=p_uid AND slot=n) ORDER BY n LIMIT 1;
  EXIT WHEN s IS NULL;
  UPDATE private.pc_items SET slot=s WHERE user_id=p_uid AND item_key=k;
 END LOOP;
END;$body$;

CREATE OR REPLACE FUNCTION private.pc_store_items(p_uid uuid,p_key text,p_qty integer,p_reason text) RETURNS void LANGUAGE plpgsql SET search_path='' AS $body$
BEGIN
 PERFORM private.pc_item_location(p_key);
 IF p_qty IS NULL OR p_qty<=0 THEN RAISE EXCEPTION 'Invalid stored quantity.';END IF;
 PERFORM private.pc_assign_item_slots(p_uid);
 INSERT INTO private.pc_items(user_id,item_key,quantity) VALUES(p_uid,p_key,p_qty)
 ON CONFLICT(user_id,item_key) DO UPDATE SET quantity=private.pc_items.quantity+excluded.quantity;
 PERFORM private.pc_assign_item_slots(p_uid);
 INSERT INTO private.pc_item_ledger(user_id,item_key,delta,reason) VALUES(p_uid,p_key,p_qty,p_reason);
END;$body$;

CREATE OR REPLACE FUNCTION public.play_pc_items() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $body$
DECLARE uid uuid:=auth.uid();inv public.inventories;bag jsonb;stored jsonb;waiting jsonb;slots jsonb;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Sign in first.' USING ERRCODE='42501';END IF;
 SELECT * INTO inv FROM public.inventories WHERE user_id=uid;
 bag:=jsonb_build_object('berry',coalesce(inv.berry,0),'bait',coalesce(inv.bait,0),'pokeball',coalesce(inv.pokeball,0),'greatball',coalesce(inv.greatball,0),'ultraball',coalesce(inv.ultraball,0),'lure',coalesce(inv.lure,0))||coalesce(inv.balls,'{}')||coalesce(inv.berries,'{}')||coalesce(inv.items,'{}');
 SELECT coalesce(jsonb_object_agg(item_key,quantity) FILTER(WHERE slot IS NOT NULL),'{}'),coalesce(jsonb_object_agg(item_key,quantity) FILTER(WHERE slot IS NULL),'{}') INTO stored,waiting FROM private.pc_item_layout(uid);
 SELECT jsonb_agg(l.item_key ORDER BY n) INTO slots FROM generate_series(1,30)n LEFT JOIN private.pc_item_layout(uid) l ON l.slot=n;
 RETURN jsonb_build_object('ok',true,'bag',bag,'stored',stored,'waiting',waiting,'slots',slots,'slotCapacity',30,'used',coalesce(private.item_total(inv),0),'capacity',private.bag_capacity(uid));
END;$body$;

CREATE FUNCTION public.play_pc_item_arrange(p_slots text[],p_expected text[]) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $body$
DECLARE uid uuid:=auth.uid();current_slots text[];
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Sign in first.' USING ERRCODE='42501';END IF;
 IF p_slots IS NULL OR cardinality(p_slots)<>30 OR array_ndims(p_slots)<>1 OR array_lower(p_slots,1)<>1 OR p_expected IS NULL OR cardinality(p_expected)<>30 THEN RAISE EXCEPTION 'Choose a valid box layout.';END IF;
 PERFORM 1 FROM public.profiles WHERE id=uid FOR UPDATE;IF NOT FOUND THEN RAISE EXCEPTION 'Trainer unavailable.';END IF;
 PERFORM private.ensure_inventory(uid);PERFORM 1 FROM public.inventories WHERE user_id=uid FOR UPDATE;
 PERFORM private.pc_import_catch_rewards(uid);PERFORM private.pc_assign_item_slots(uid);
 SELECT array_agg(i.item_key ORDER BY n) INTO current_slots FROM generate_series(1,30)n LEFT JOIN private.pc_items i ON i.user_id=uid AND i.slot=n;
 IF current_slots IS NOT DISTINCT FROM p_slots THEN RETURN '{"ok":true}'::jsonb;END IF;
 IF current_slots IS DISTINCT FROM p_expected THEN RAISE EXCEPTION 'Your item box changed. Refresh before arranging it.';END IF;
 IF (SELECT count(*) FROM unnest(p_slots)x WHERE x IS NOT NULL)<>(SELECT count(DISTINCT x) FROM unnest(p_slots)x WHERE x IS NOT NULL)
 OR (SELECT array_agg(x ORDER BY x) FROM unnest(p_slots)x WHERE x IS NOT NULL) IS DISTINCT FROM (SELECT array_agg(x ORDER BY x) FROM unnest(current_slots)x WHERE x IS NOT NULL) THEN RAISE EXCEPTION 'The layout must contain the same stored items.';END IF;
 UPDATE private.pc_items SET slot=NULL WHERE user_id=uid;
 UPDATE private.pc_items i SET slot=x.n FROM unnest(p_slots) WITH ORDINALITY x(k,n) WHERE i.user_id=uid AND i.item_key=x.k;
 RETURN '{"ok":true}'::jsonb;
END;$body$;
REVOKE ALL ON FUNCTION private.pc_item_layout(uuid),private.pc_assign_item_slots(uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.play_pc_item_arrange(text[],text[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.play_pc_item_arrange(text[],text[]) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.play_pc_item_transfer(p_request uuid, p_direction text, p_item text, p_quantity integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE uid uuid:=auth.uid();old private.pc_item_transfers;qty bigint;result jsonb;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Sign in first.' USING ERRCODE='42501';END IF;
 IF p_request IS NULL OR p_direction IS NULL OR p_direction NOT IN('deposit','withdraw') OR p_quantity IS NULL OR p_quantity<1 OR p_quantity>1000000 THEN RAISE EXCEPTION 'Choose a valid quantity and direction.';END IF;
 PERFORM private.pc_item_location(p_item);
 PERFORM 1 FROM public.profiles WHERE id=uid FOR UPDATE;IF NOT FOUND THEN RAISE EXCEPTION 'Trainer unavailable.';END IF;
 SELECT * INTO old FROM private.pc_item_transfers WHERE user_id=uid AND request_id=p_request;
 IF FOUND THEN IF old.direction<>p_direction OR old.item_key<>p_item OR old.quantity<>p_quantity THEN RAISE EXCEPTION 'Transfer request changed.';END IF;RETURN old.result||'{"duplicate":true}'::jsonb;END IF;
 PERFORM private.ensure_inventory(uid);PERFORM 1 FROM public.inventories WHERE user_id=uid FOR UPDATE;
 PERFORM private.pc_import_catch_rewards(uid);PERFORM private.pc_assign_item_slots(uid);
 IF p_direction='deposit' THEN
  IF NOT EXISTS(SELECT 1 FROM private.pc_items WHERE user_id=uid AND item_key=p_item AND slot IS NOT NULL) AND (SELECT count(*) FROM private.pc_items WHERE user_id=uid AND slot IS NOT NULL)>=30 THEN RAISE EXCEPTION 'Your item box is full. Withdraw an entire stack to free a slot.';END IF;
  PERFORM private.pc_bag_adjust(uid,p_item,-p_quantity);PERFORM private.pc_store_items(uid,p_item,p_quantity,'DEPOSIT');
 ELSE
  SELECT quantity INTO qty FROM private.pc_items WHERE user_id=uid AND item_key=p_item AND slot IS NOT NULL FOR UPDATE;
  IF coalesce(qty,0)<p_quantity THEN RAISE EXCEPTION 'Not enough items in My PC.';END IF;
  PERFORM private.pc_bag_adjust(uid,p_item,p_quantity);
  UPDATE private.pc_items SET quantity=quantity-p_quantity WHERE user_id=uid AND item_key=p_item;
  INSERT INTO private.pc_item_ledger(user_id,item_key,delta,reason) VALUES(uid,p_item,-p_quantity,'WITHDRAW');
 END IF;
 PERFORM private.pc_assign_item_slots(uid);
 INSERT INTO public.item_ledger(user_id,item_key,amount,reason,source_id,idempotency) VALUES(uid,p_item,CASE WHEN p_direction='deposit' THEN -p_quantity ELSE p_quantity END,'PC_TRANSFER',p_request::text,'pc:'||p_request::text);
 result:=jsonb_build_object('ok',true,'direction',p_direction,'item',p_item,'quantity',p_quantity);
 INSERT INTO private.pc_item_transfers(user_id,request_id,direction,item_key,quantity,result) VALUES(uid,p_request,p_direction,p_item,p_quantity,result);
 RETURN result;
END;$function$;

COMMIT;
