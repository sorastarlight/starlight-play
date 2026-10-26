BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $guard$ BEGIN
IF md5(pg_get_functiondef('public.admin_store_create_draft(jsonb)'::regprocedure)) IS DISTINCT FROM '999ea1f6d8366e0bbfc40eb2e7fb9e25' THEN RAISE EXCEPTION 'Draft writer source drift'; END IF;
IF to_regprocedure('public.admin_store_draft_options()') IS NOT NULL OR to_regprocedure('private.hub_shop_draft_rewards()') IS NOT NULL THEN RAISE EXCEPTION 'Draft catalog already installed'; END IF;
IF md5(pg_get_viewdef('private.hub_reward_catalog'::regclass,true)) IS DISTINCT FROM '4bc5040f4b25c7ebd00a25fbcb61a4e6' THEN RAISE EXCEPTION 'Reward catalog source drift';END IF;
IF md5(pg_get_functiondef('private.capture_berry_keys()'::regprocedure)) IS DISTINCT FROM 'abaab3adc3978466446319e318e87c62' OR (SELECT proacl::text FROM pg_proc WHERE oid='private.capture_berry_keys()'::regprocedure) IS DISTINCT FROM NULL OR (SELECT pg_get_userbyid(proowner) FROM pg_proc WHERE oid='private.capture_berry_keys()'::regprocedure) IS DISTINCT FROM 'postgres' THEN RAISE EXCEPTION 'Mart draft dependency drift: private.capture_berry_keys()'; END IF;
IF md5(pg_get_functiondef('private.evo_item_keys()'::regprocedure)) IS DISTINCT FROM '8950cb284265715c27ed4490ab749be5' OR (SELECT proacl::text FROM pg_proc WHERE oid='private.evo_item_keys()'::regprocedure) IS DISTINCT FROM NULL OR (SELECT pg_get_userbyid(proowner) FROM pg_proc WHERE oid='private.evo_item_keys()'::regprocedure) IS DISTINCT FROM 'postgres' THEN RAISE EXCEPTION 'Mart draft dependency drift: private.evo_item_keys()'; END IF;
IF md5(pg_get_functiondef('private.extra_ball_keys()'::regprocedure)) IS DISTINCT FROM '42c5360398abb1acae5f2bb5bb8d354c' OR (SELECT proacl::text FROM pg_proc WHERE oid='private.extra_ball_keys()'::regprocedure) IS DISTINCT FROM NULL OR (SELECT pg_get_userbyid(proowner) FROM pg_proc WHERE oid='private.extra_ball_keys()'::regprocedure) IS DISTINCT FROM 'postgres' THEN RAISE EXCEPTION 'Mart draft dependency drift: private.extra_ball_keys()'; END IF;
IF md5(pg_get_functiondef('private.is_play_admin()'::regprocedure)) IS DISTINCT FROM 'e1449c28be1cd6f6c5208638d5a1df6f' OR (SELECT proacl::text FROM pg_proc WHERE oid='private.is_play_admin()'::regprocedure) IS DISTINCT FROM '{postgres=X/postgres,authenticated=X/postgres}' OR (SELECT pg_get_userbyid(proowner) FROM pg_proc WHERE oid='private.is_play_admin()'::regprocedure) IS DISTINCT FROM 'postgres' THEN RAISE EXCEPTION 'Mart draft dependency drift: private.is_play_admin()'; END IF;
IF md5(pg_get_functiondef('private.play_staff_role(uuid)'::regprocedure)) IS DISTINCT FROM 'bbb6dc90f6d4a7790774ece8179dfd49' OR (SELECT proacl::text FROM pg_proc WHERE oid='private.play_staff_role(uuid)'::regprocedure) IS DISTINCT FROM NULL OR (SELECT pg_get_userbyid(proowner) FROM pg_proc WHERE oid='private.play_staff_role(uuid)'::regprocedure) IS DISTINCT FROM 'postgres' THEN RAISE EXCEPTION 'Mart draft dependency drift: private.play_staff_role(uuid)'; END IF;
IF md5(pg_get_functiondef('private.require_hub()'::regprocedure)) IS DISTINCT FROM '0d3c14b0c96fbc20f27ca4a85cab5d25' OR (SELECT proacl::text FROM pg_proc WHERE oid='private.require_hub()'::regprocedure) IS DISTINCT FROM NULL OR (SELECT pg_get_userbyid(proowner) FROM pg_proc WHERE oid='private.require_hub()'::regprocedure) IS DISTINCT FROM 'postgres' THEN RAISE EXCEPTION 'Mart draft dependency drift: private.require_hub()'; END IF;
IF md5(pg_get_functiondef('private.require_staff_edit()'::regprocedure)) IS DISTINCT FROM 'c84c975f7872dad626813afd273c43f8' OR (SELECT proacl::text FROM pg_proc WHERE oid='private.require_staff_edit()'::regprocedure) IS DISTINCT FROM NULL OR (SELECT pg_get_userbyid(proowner) FROM pg_proc WHERE oid='private.require_staff_edit()'::regprocedure) IS DISTINCT FROM 'postgres' THEN RAISE EXCEPTION 'Mart draft dependency drift: private.require_staff_edit()'; END IF;
IF md5(pg_get_functiondef('private.validate_store_grants(jsonb)'::regprocedure)) IS DISTINCT FROM 'efc446f3f83c8451dd5db8bc249d8ec2' OR (SELECT proacl::text FROM pg_proc WHERE oid='private.validate_store_grants(jsonb)'::regprocedure) IS DISTINCT FROM NULL OR (SELECT pg_get_userbyid(proowner) FROM pg_proc WHERE oid='private.validate_store_grants(jsonb)'::regprocedure) IS DISTINCT FROM 'postgres' THEN RAISE EXCEPTION 'Mart draft dependency drift: private.validate_store_grants(jsonb)'; END IF;
IF md5(pg_get_functiondef('private.core_item_keys()'::regprocedure)) IS DISTINCT FROM '476fea056906aad6e4bcb6c79242e0ec' OR (SELECT proacl::text FROM pg_proc WHERE oid='private.core_item_keys()'::regprocedure) IS DISTINCT FROM NULL OR (SELECT pg_get_userbyid(proowner) FROM pg_proc WHERE oid='private.core_item_keys()'::regprocedure) IS DISTINCT FROM 'postgres' THEN RAISE EXCEPTION 'Mart draft dependency drift: private.core_item_keys()'; END IF;
IF md5(pg_get_functiondef('private.store_items_before_write()'::regprocedure)) IS DISTINCT FROM 'fb9927efc13af208dd957fda938fd196' OR (SELECT proacl::text FROM pg_proc WHERE oid='private.store_items_before_write()'::regprocedure) IS DISTINCT FROM NULL OR (SELECT pg_get_userbyid(proowner) FROM pg_proc WHERE oid='private.store_items_before_write()'::regprocedure) IS DISTINCT FROM 'postgres' THEN RAISE EXCEPTION 'Mart draft dependency drift: private.store_items_before_write()'; END IF;
IF (SELECT string_agg(attname||':'||atttypid::regtype::text||':'||attnotnull::text,',' ORDER BY attnum) FROM pg_attribute WHERE attrelid='private.store_items'::regclass AND attnum>0 AND NOT attisdropped) IS DISTINCT FROM 'sku:text:true,category_id:uuid:true,name:text:true,blurb:text:true,cost:integer:true,bits:integer:true,grants:jsonb:true,sprite:text:true,thumb:text:true,featured:boolean:true,sort:integer:true,visible:boolean:true,extra:jsonb:true,status:text:true' THEN RAISE EXCEPTION 'Mart draft column drift.'; END IF;
IF (SELECT string_agg(conname||':'||pg_get_constraintdef(oid),'|' ORDER BY conname) FROM pg_constraint WHERE conrelid='private.store_items'::regclass) IS DISTINCT FROM 'store_items_category_id_fkey:FOREIGN KEY (category_id) REFERENCES private.store_categories(id) ON DELETE CASCADE|store_items_pkey:PRIMARY KEY (sku)' THEN RAISE EXCEPTION 'Mart draft constraint drift.'; END IF;
IF (SELECT coalesce(string_agg(pg_get_triggerdef(oid),'|' ORDER BY tgname),'') FROM pg_trigger WHERE tgrelid='private.store_items'::regclass AND NOT tgisinternal) IS DISTINCT FROM 'CREATE TRIGGER store_items_before_write BEFORE INSERT OR UPDATE ON private.store_items FOR EACH ROW EXECUTE FUNCTION private.store_items_before_write()' OR EXISTS(SELECT 1 FROM pg_rewrite WHERE ev_class='private.store_items'::regclass) THEN RAISE EXCEPTION 'Mart draft trigger/rule drift.'; END IF;
IF (SELECT string_agg(attname||':'||atttypid::regtype::text||':'||attnotnull::text,',' ORDER BY attnum) FROM pg_attribute WHERE attrelid='private.store_categories'::regclass AND attnum>0 AND NOT attisdropped) IS DISTINCT FROM 'id:uuid:true,key:text:true,name:text:true,blurb:text:true,icon:text:true,sort:integer:true,kind:text:true,visible:boolean:true,system:boolean:true,extra:jsonb:true' THEN RAISE EXCEPTION 'Mart draft column drift.'; END IF;
IF (SELECT string_agg(conname||':'||pg_get_constraintdef(oid),'|' ORDER BY conname) FROM pg_constraint WHERE conrelid='private.store_categories'::regclass) IS DISTINCT FROM 'store_categories_key_key:UNIQUE (key)|store_categories_kind_check:CHECK ((kind = ANY (ARRAY[''pass''::text, ''coins''::text, ''balls''::text, ''avatars''::text, ''bits''::text])))|store_categories_pkey:PRIMARY KEY (id)' THEN RAISE EXCEPTION 'Mart draft constraint drift.'; END IF;
IF (SELECT coalesce(string_agg(pg_get_triggerdef(oid),'|' ORDER BY tgname),'') FROM pg_trigger WHERE tgrelid='private.store_categories'::regclass AND NOT tgisinternal) IS DISTINCT FROM '' OR EXISTS(SELECT 1 FROM pg_rewrite WHERE ev_class='private.store_categories'::regclass) THEN RAISE EXCEPTION 'Mart draft trigger/rule drift.'; END IF;
END $guard$;
CREATE OR REPLACE FUNCTION private.hub_shop_draft_rewards()
RETURNS TABLE(key text,name text,sprite text,category text)
LANGUAGE sql STABLE SET search_path='' AS $function$
 SELECT c.target_key,c.name,c.sprite,c.category FROM private.hub_reward_catalog c
 WHERE c.enabled AND c.shop_allowed AND c.kind IN ('item','space') AND c.target_key<>'masterball'
 AND NOT EXISTS(SELECT 1 FROM public.capture_balls b WHERE b.key=c.target_key AND NOT b.enabled)
 AND NOT EXISTS(SELECT 1 FROM public.capture_berries b WHERE b.key=c.target_key AND NOT b.enabled)
 AND (c.target_key=ANY(ARRAY['berry','bait','pokeball','greatball','ultraball','lure','bag_bonus']||private.evo_item_keys())
 OR EXISTS(SELECT 1 FROM public.capture_balls b WHERE b.key=c.target_key AND b.enabled)
 OR EXISTS(SELECT 1 FROM public.capture_berries b WHERE b.key=c.target_key AND b.enabled))
 ORDER BY c.category,c.name,c.target_key;
$function$;
REVOKE ALL ON FUNCTION private.hub_shop_draft_rewards() FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.admin_store_draft_options()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $function$
BEGIN
 PERFORM private.require_staff_edit();
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Staff session required.' USING ERRCODE='42501'; END IF;
 RETURN jsonb_build_object('ok',true,
 'categories',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'kind',kind,'system',system,'visible',visible) ORDER BY sort,id),'[]') FROM private.store_categories),
 'items',(SELECT coalesce(jsonb_agg(jsonb_build_object('sku',sku) ORDER BY sku),'[]') FROM private.store_items),
 'rewards',(SELECT coalesce(jsonb_agg(jsonb_build_object('key',key,'name',name,'sprite',regexp_replace(sprite,'^images/items/',''),'category',category) ORDER BY category,name,key),'[]') FROM private.hub_shop_draft_rewards()));
END;
$function$;
REVOKE ALL ON FUNCTION public.admin_store_draft_options() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_store_draft_options() TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.admin_store_create_draft(p_row jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE v_floor private.store_categories%ROWTYPE; v_item private.store_items%ROWTYPE;
 v_sku text; v_name text; v_blurb text; v_reward text; v_qty integer; v_cost integer; v_sprite text;
BEGIN
 PERFORM private.require_staff_edit();
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Staff session required.' USING ERRCODE='42501'; END IF;
 IF jsonb_typeof(p_row) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Invalid draft payload.' USING ERRCODE='22023'; END IF;
 IF (SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(p_row) k) IS DISTINCT FROM ARRAY['blurb','categoryId','cost','name','quantity','reward','sku']::text[] THEN RAISE EXCEPTION 'Invalid draft fields.' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_each(p_row) x WHERE x.key IN ('sku','name','blurb','categoryId','reward') AND jsonb_typeof(x.value)<>'string') THEN RAISE EXCEPTION 'Draft text fields required.' USING ERRCODE='22023'; END IF;
 v_sku:=p_row->>'sku'; v_name:=btrim(p_row->>'name'); v_blurb:=p_row->>'blurb'; v_reward:=p_row->>'reward';
 IF length(v_sku)>40 OR v_sku !~ '^[a-z0-9]+(-[a-z0-9]+)*$' OR length(v_name) NOT BETWEEN 1 AND 120 OR length(v_blurb)>500 THEN RAISE EXCEPTION 'Invalid draft name, code or description.' USING ERRCODE='22023'; END IF;
 IF jsonb_typeof(p_row->'quantity')<>'number' OR jsonb_typeof(p_row->'cost')<>'number' OR (p_row->>'quantity') !~ '^[0-9]+$' OR (p_row->>'cost') !~ '^[0-9]+$' THEN RAISE EXCEPTION 'Use whole-number quantity and price.' USING ERRCODE='22023'; END IF;
 IF (p_row->>'quantity')::numeric NOT BETWEEN 1 AND 2147483647 OR (p_row->>'cost')::numeric NOT BETWEEN 0 AND 2147483647 THEN RAISE EXCEPTION 'Quantity or price is outside the supported range.' USING ERRCODE='22023'; END IF;
 v_qty:=(p_row->>'quantity')::integer; v_cost:=(p_row->>'cost')::integer;
 SELECT sprite INTO v_sprite FROM private.hub_shop_draft_rewards() WHERE key=v_reward;
 IF v_sprite IS NULL THEN RAISE EXCEPTION 'Choose an available shop item. Master Balls are for staff gifts and Pass rewards only.' USING ERRCODE='22023'; END IF;
 v_sprite:=regexp_replace(v_sprite,'^images/items/','');
 -- SHARE also blocks non-key UPDATEs of kind/system; KEY SHARE would not.
 SELECT * INTO v_floor FROM private.store_categories WHERE id=(p_row->>'categoryId')::uuid FOR SHARE;
 IF NOT FOUND OR v_floor.kind IS DISTINCT FROM 'coins' OR v_floor.system IS DISTINCT FROM false THEN RAISE EXCEPTION 'Choose an existing PokéCoin category.' USING ERRCODE='22023'; END IF;
 INSERT INTO private.store_items(sku,category_id,name,blurb,cost,bits,grants,sprite,thumb,featured,sort,visible,extra,status)
 VALUES(v_sku,v_floor.id,v_name,v_blurb,v_cost,0,jsonb_build_object(v_reward,v_qty),v_sprite,'',false,100,false,jsonb_build_object('status','draft','productKind','item','detail',''),'draft') RETURNING * INTO v_item;
 RETURN jsonb_build_object('ok',true,'item',jsonb_build_object('sku',v_item.sku,'categoryId',v_item.category_id,'name',v_item.name,'blurb',v_item.blurb,'cost',v_item.cost,'reward',v_reward,'quantity',v_qty,'status',v_item.status,'visible',v_item.visible,'featured',v_item.featured,'bits',v_item.bits,'productKind',v_item.extra->>'productKind','sort',v_item.sort,'sprite',v_item.sprite));
END;
$function$
;
COMMIT;
