CREATE TABLE private.pc_items(user_id uuid NOT NULL,item_key text NOT NULL,quantity bigint NOT NULL CHECK(quantity>=0),PRIMARY KEY(user_id,item_key));
CREATE TABLE private.pc_item_transfers(user_id uuid NOT NULL,request_id uuid NOT NULL,direction text NOT NULL,item_key text NOT NULL,quantity integer NOT NULL,result jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(user_id,request_id));
CREATE TABLE private.pc_item_ledger(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,user_id uuid NOT NULL,item_key text NOT NULL,delta bigint NOT NULL,reason text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE private.pc_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.pc_item_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.pc_item_ledger ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.pc_items,private.pc_item_transfers,private.pc_item_ledger FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON SEQUENCE private.pc_item_ledger_id_seq FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION private.pc_item_location(p_key text) RETURNS text LANGUAGE plpgsql STABLE SET search_path='' AS $body$
BEGIN
 IF p_key IN ('berry','bait','pokeball','greatball','ultraball','lure') THEN RETURN 'core'; END IF;
 IF p_key IN ('coins','bag_bonus','title','badge','cosmetic','choice_stone','_choice') THEN RAISE EXCEPTION 'This is not a storable item.'; END IF;
 IF p_key=ANY(private.capture_berry_keys()) THEN RETURN 'berries'; END IF;
 IF p_key=ANY(private.evo_item_keys()) OR p_key=ANY(private.valuable_item_keys()) THEN RETURN 'items'; END IF;
 IF p_key=ANY(private.extra_ball_keys()) THEN RETURN 'balls'; END IF;
 RAISE EXCEPTION 'Unknown item.';
END;$body$;

CREATE FUNCTION private.pc_bag_adjust(p_uid uuid,p_key text,p_delta integer) RETURNS void LANGUAGE plpgsql SET search_path='' AS $body$
DECLARE location text:=private.pc_item_location(p_key); inv public.inventories; qty bigint;
BEGIN
 SELECT * INTO inv FROM public.inventories WHERE user_id=p_uid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Inventory unavailable.'; END IF;
 qty:=CASE WHEN location='core' THEN (to_jsonb(inv)->>p_key)::bigint ELSE coalesce((to_jsonb(inv)->location->>p_key)::bigint,0) END;
 IF qty+p_delta<0 OR qty+p_delta>2147483647 THEN RAISE EXCEPTION 'Not enough items or quantity too large.'; END IF;
 IF p_delta>0 AND private.item_total(inv)::bigint+p_delta>private.bag_capacity(p_uid) THEN RAISE EXCEPTION 'Not enough room in your bag.'; END IF;
 IF location='core' THEN EXECUTE format('UPDATE public.inventories SET %I=$1,updated_at=now() WHERE user_id=$2',p_key) USING (qty+p_delta)::integer,p_uid;
 ELSE EXECUTE format('UPDATE public.inventories SET %I=jsonb_set(coalesce(%I,''{}''::jsonb),ARRAY[$1],to_jsonb($2::integer)),updated_at=now() WHERE user_id=$3',location,location) USING p_key,(qty+p_delta)::integer,p_uid; END IF;
END;$body$;

CREATE FUNCTION private.pc_store_items(p_uid uuid,p_key text,p_qty integer,p_reason text) RETURNS void LANGUAGE plpgsql SET search_path='' AS $body$
BEGIN
 PERFORM private.pc_item_location(p_key);
 IF p_qty IS NULL OR p_qty<=0 THEN RAISE EXCEPTION 'Invalid stored quantity.'; END IF;
 INSERT INTO private.pc_items(user_id,item_key,quantity) VALUES(p_uid,p_key,p_qty)
 ON CONFLICT(user_id,item_key) DO UPDATE SET quantity=private.pc_items.quantity+excluded.quantity;
 INSERT INTO private.pc_item_ledger(user_id,item_key,delta,reason) VALUES(p_uid,p_key,p_qty,p_reason);
END;$body$;

CREATE FUNCTION private.pc_deliver_items(p_uid uuid,p_grants jsonb,p_reason text) RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $body$
DECLARE inv public.inventories;k text;n integer;fit integer;room integer;bag jsonb:='{}';stored jsonb:='{}';
BEGIN
 PERFORM private.ensure_inventory(p_uid);
 SELECT * INTO inv FROM public.inventories WHERE user_id=p_uid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Inventory unavailable.'; END IF;
 IF coalesce((p_grants->>'bag_bonus')::int,0)<>0 THEN PERFORM private.grant_known(p_uid,jsonb_build_object('bag_bonus',(p_grants->>'bag_bonus')::int));bag:=jsonb_build_object('bag_bonus',(p_grants->>'bag_bonus')::int);END IF;
 FOR k,n IN SELECT key,value::integer FROM jsonb_each_text(p_grants-'bag_bonus') ORDER BY key LOOP
  IF n<0 THEN RAISE EXCEPTION 'Rewards cannot remove items.'; END IF;
  IF n=0 THEN CONTINUE; END IF;
  PERFORM private.pc_item_location(k);
  SELECT * INTO inv FROM public.inventories WHERE user_id=p_uid;
  room:=greatest(0,private.bag_capacity(p_uid)-private.item_total(inv));fit:=least(n,room);
  IF fit>0 THEN PERFORM private.pc_bag_adjust(p_uid,k,fit);bag:=bag||jsonb_build_object(k,fit);END IF;
  IF n>fit THEN PERFORM private.pc_store_items(p_uid,k,n-fit,p_reason);stored:=stored||jsonb_build_object(k,n-fit);END IF;
 END LOOP;
 IF stored<>'{}'::jsonb THEN PERFORM private.push_notice(p_uid,'loot','Items sent to My PC','Your bag did not have enough room. Withdraw these items from My PC before using them.',jsonb_build_object('stored',stored,'destination','storage.html#items')); END IF;
 RETURN jsonb_build_object('inBag',bag,'stored',stored);
END;$body$;

CREATE FUNCTION private.pc_import_catch_rewards(p_uid uuid) RETURNS void LANGUAGE plpgsql SET search_path='' AS $body$
DECLARE r private.berry_drop_receipts;
BEGIN
 FOR r IN SELECT * FROM private.berry_drop_receipts WHERE user_id=p_uid AND status='pending' ORDER BY id FOR UPDATE LOOP
  PERFORM private.pc_store_items(p_uid,r.item_key,1,'CATCH_REWARD');
  UPDATE private.berry_drop_receipts SET status='delivered',delivered_at=now() WHERE id=r.id;
 END LOOP;
END;$body$;

CREATE FUNCTION public.play_pc_items() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $body$
DECLARE uid uuid:=auth.uid();inv public.inventories;bag jsonb;stored jsonb;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Sign in first.' USING ERRCODE='42501';END IF;
 SELECT * INTO inv FROM public.inventories WHERE user_id=uid;
 bag:=jsonb_build_object('berry',coalesce(inv.berry,0),'bait',coalesce(inv.bait,0),'pokeball',coalesce(inv.pokeball,0),'greatball',coalesce(inv.greatball,0),'ultraball',coalesce(inv.ultraball,0),'lure',coalesce(inv.lure,0))||coalesce(inv.balls,'{}')||coalesce(inv.berries,'{}')||coalesce(inv.items,'{}');
 SELECT coalesce(jsonb_object_agg(item_key,qty),'{}') INTO stored FROM(SELECT item_key,sum(qty) qty FROM(SELECT item_key,quantity qty FROM private.pc_items WHERE user_id=uid UNION ALL SELECT item_key,1 FROM private.berry_drop_receipts WHERE user_id=uid AND status='pending') x GROUP BY item_key) y;
 RETURN jsonb_build_object('ok',true,'bag',bag,'stored',stored,'used',coalesce(private.item_total(inv),0),'capacity',private.bag_capacity(uid));
END;$body$;

CREATE FUNCTION public.play_pc_item_transfer(p_request uuid,p_direction text,p_item text,p_quantity integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $body$
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
END;$body$;
REVOKE ALL ON FUNCTION private.pc_item_location(text),private.pc_bag_adjust(uuid,text,integer),private.pc_store_items(uuid,text,integer,text),private.pc_deliver_items(uuid,jsonb,text),private.pc_import_catch_rewards(uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.play_pc_items(),public.play_pc_item_transfer(uuid,text,text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.play_pc_items(),public.play_pc_item_transfer(uuid,text,text,integer) TO authenticated,service_role;
