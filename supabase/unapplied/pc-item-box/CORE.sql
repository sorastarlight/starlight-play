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
