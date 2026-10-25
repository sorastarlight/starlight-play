-- Candidate only. Use INSTALL.sql after separate production approval.
CREATE FUNCTION public.admin_store_create_draft(p_row jsonb)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog AS $body$
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
 v_sprite:=CASE v_reward WHEN 'berry' THEN 'oran-berry.png' WHEN 'bait' THEN 'honey.png' WHEN 'pokeball' THEN 'poke-ball.png' WHEN 'greatball' THEN 'great-ball.png' WHEN 'ultraball' THEN 'ultra-ball.png' WHEN 'lure' THEN 'poke-radar.png' END;
 IF v_sprite IS NULL THEN RAISE EXCEPTION 'Choose a supported inventory item.' USING ERRCODE='22023'; END IF;
 -- SHARE also blocks non-key UPDATEs of kind/system; KEY SHARE would not.
 SELECT * INTO v_floor FROM private.store_categories WHERE id=(p_row->>'categoryId')::uuid FOR SHARE;
 IF NOT FOUND OR v_floor.kind IS DISTINCT FROM 'coins' OR v_floor.system IS DISTINCT FROM false THEN RAISE EXCEPTION 'Choose an existing non-system PokéCoin floor.' USING ERRCODE='22023'; END IF;
 INSERT INTO private.store_items(sku,category_id,name,blurb,cost,bits,grants,sprite,thumb,featured,sort,visible,extra,status)
 VALUES(v_sku,v_floor.id,v_name,v_blurb,v_cost,0,jsonb_build_object(v_reward,v_qty),v_sprite,'',false,100,false,jsonb_build_object('status','draft','productKind','item','detail',''),'draft') RETURNING * INTO v_item;
 RETURN jsonb_build_object('ok',true,'item',jsonb_build_object('sku',v_item.sku,'categoryId',v_item.category_id,'name',v_item.name,'blurb',v_item.blurb,'cost',v_item.cost,'reward',v_reward,'quantity',v_qty,'status',v_item.status,'visible',v_item.visible,'featured',v_item.featured,'bits',v_item.bits,'productKind',v_item.extra->>'productKind','sort',v_item.sort,'sprite',v_item.sprite));
END;
$body$;
REVOKE ALL ON FUNCTION public.admin_store_create_draft(jsonb) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_store_create_draft(jsonb) TO authenticated, service_role;
