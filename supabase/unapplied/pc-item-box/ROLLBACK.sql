BEGIN;
DO $g$ BEGIN
IF md5(pg_get_functiondef('private.pc_item_layout(uuid)'::regprocedure))<>'ef452e423776676b62ca06a6c1cdd478' THEN RAISE EXCEPTION 'ROLLBACK_DRIFT';END IF;
IF md5(pg_get_functiondef('private.pc_assign_item_slots(uuid)'::regprocedure))<>'b2407a45d4c02d1d23cc2115ad88e983' THEN RAISE EXCEPTION 'ROLLBACK_DRIFT';END IF;
IF md5(pg_get_functiondef('private.pc_store_items(uuid,text,integer,text)'::regprocedure))<>'dca8920cda2e1236352dcee8c4494694' THEN RAISE EXCEPTION 'ROLLBACK_DRIFT';END IF;
IF md5(pg_get_functiondef('public.play_pc_items()'::regprocedure))<>'5dbb54280c79f21e37e53c9e9cec8fbb' THEN RAISE EXCEPTION 'ROLLBACK_DRIFT';END IF;
IF md5(pg_get_functiondef('public.play_pc_item_transfer(uuid,text,text,integer)'::regprocedure))<>'b62922f112954cb39bb232405c937208' THEN RAISE EXCEPTION 'ROLLBACK_DRIFT';END IF;
IF md5(pg_get_functiondef('public.play_pc_item_arrange(text[],text[])'::regprocedure))<>'1a9b6e07aa4f7e58b184f57003f078fc' THEN RAISE EXCEPTION 'ROLLBACK_DRIFT';END IF;
END;$g$;
CREATE OR REPLACE FUNCTION private.pc_store_items(p_uid uuid, p_key text, p_qty integer, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
 PERFORM private.pc_item_location(p_key);
 IF p_qty IS NULL OR p_qty<=0 THEN RAISE EXCEPTION 'Invalid stored quantity.'; END IF;
 INSERT INTO private.pc_items(user_id,item_key,quantity) VALUES(p_uid,p_key,p_qty)
 ON CONFLICT(user_id,item_key) DO UPDATE SET quantity=private.pc_items.quantity+excluded.quantity;
 INSERT INTO private.pc_item_ledger(user_id,item_key,delta,reason) VALUES(p_uid,p_key,p_qty,p_reason);
END;$function$
;
CREATE OR REPLACE FUNCTION public.play_pc_items()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE uid uuid:=auth.uid();inv public.inventories;bag jsonb;stored jsonb;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Sign in first.' USING ERRCODE='42501';END IF;
 SELECT * INTO inv FROM public.inventories WHERE user_id=uid;
 bag:=jsonb_build_object('berry',coalesce(inv.berry,0),'bait',coalesce(inv.bait,0),'pokeball',coalesce(inv.pokeball,0),'greatball',coalesce(inv.greatball,0),'ultraball',coalesce(inv.ultraball,0),'lure',coalesce(inv.lure,0))||coalesce(inv.balls,'{}')||coalesce(inv.berries,'{}')||coalesce(inv.items,'{}');
 SELECT coalesce(jsonb_object_agg(item_key,qty),'{}') INTO stored FROM(SELECT item_key,sum(qty) qty FROM(SELECT item_key,quantity qty FROM private.pc_items WHERE user_id=uid UNION ALL SELECT item_key,1 FROM private.berry_drop_receipts WHERE user_id=uid AND status='pending') x GROUP BY item_key) y;
 RETURN jsonb_build_object('ok',true,'bag',bag,'stored',stored,'used',coalesce(private.item_total(inv),0),'capacity',private.bag_capacity(uid));
END;$function$
;
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
 PERFORM private.pc_import_catch_rewards(uid);
 IF p_direction='deposit' THEN
  PERFORM private.pc_bag_adjust(uid,p_item,-p_quantity);PERFORM private.pc_store_items(uid,p_item,p_quantity,'DEPOSIT');
 ELSE
  SELECT quantity INTO qty FROM private.pc_items WHERE user_id=uid AND item_key=p_item FOR UPDATE;
  IF coalesce(qty,0)<p_quantity THEN RAISE EXCEPTION 'Not enough items in My PC.';END IF;
  PERFORM private.pc_bag_adjust(uid,p_item,p_quantity);
  UPDATE private.pc_items SET quantity=quantity-p_quantity WHERE user_id=uid AND item_key=p_item;
  INSERT INTO private.pc_item_ledger(user_id,item_key,delta,reason) VALUES(uid,p_item,-p_quantity,'WITHDRAW');
 END IF;
 INSERT INTO public.item_ledger(user_id,item_key,amount,reason,source_id,idempotency) VALUES(uid,p_item,CASE WHEN p_direction='deposit' THEN -p_quantity ELSE p_quantity END,'PC_TRANSFER',p_request::text,'pc:'||p_request::text);
 result:=jsonb_build_object('ok',true,'direction',p_direction,'item',p_item,'quantity',p_quantity);
 INSERT INTO private.pc_item_transfers(user_id,request_id,direction,item_key,quantity,result) VALUES(uid,p_request,p_direction,p_item,p_quantity,result);
 RETURN result;
END;$function$
;
REVOKE ALL ON FUNCTION public.play_pc_item_arrange(text[],text[]) FROM PUBLIC,anon,authenticated,service_role;
COMMIT;
