BEGIN;
SET LOCAL lock_timeout='5s';SET LOCAL statement_timeout='30s';
DO $guard$ BEGIN
 IF md5(pg_get_functiondef('private.require_staff_edit()'::regprocedure)) IS DISTINCT FROM 'c84c975f7872dad626813afd273c43f8' OR md5(pg_get_functiondef('private.validate_store_grants(jsonb)'::regprocedure)) IS DISTINCT FROM 'efc446f3f83c8451dd5db8bc249d8ec2' THEN RAISE EXCEPTION 'Staff/reward validation source drift';END IF;
 IF md5(pg_get_functiondef('public.admin_store_save_item(jsonb)'::regprocedure)) IS DISTINCT FROM '27b621632ab941a950ee405132df05d5' THEN RAISE EXCEPTION 'Existing product editor source drift';END IF;
 IF to_regprocedure('public.admin_product_draft_options(text)') IS NOT NULL OR to_regprocedure('public.admin_product_draft_create(jsonb)') IS NOT NULL OR to_regclass('private.hub_product_draft_changes') IS NOT NULL THEN RAISE EXCEPTION 'Special product drafts already installed';END IF;
 IF md5(pg_get_functiondef('private.bits_validate_grants(jsonb)'::regprocedure)) IS DISTINCT FROM 'de05bbb8c3a83211a4e330301bc5183b' OR md5(pg_get_functiondef('private.store_items_before_write()'::regprocedure)) IS DISTINCT FROM 'fb9927efc13af208dd957fda938fd196' OR md5(pg_get_functiondef('private.hub_shop_draft_rewards()'::regprocedure)) IS DISTINCT FROM '2337d125d9d96484005b8de3a98de4f8' OR md5(pg_get_functiondef('private.hub_trainer_style(text)'::regprocedure)) IS DISTINCT FROM '2811893dd4ad85ce85d21d5c55fff533' THEN RAISE EXCEPTION 'Special draft policy source drift';END IF;
END $guard$;
CREATE TABLE private.hub_product_draft_changes(actor uuid NOT NULL,request_id uuid NOT NULL,request_hash text NOT NULL,sku text NOT NULL,reason text NOT NULL,result jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(actor,request_id));
ALTER TABLE private.hub_product_draft_changes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.hub_product_draft_changes FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.admin_product_draft_options(p_kind text) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $fn$
BEGIN
 PERFORM private.require_staff_edit();IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Staff session required.' USING ERRCODE='42501';END IF;
 IF p_kind IS NULL OR p_kind NOT IN ('bits','avatars') THEN RAISE EXCEPTION 'Choose a supported product type.' USING ERRCODE='22023';END IF;
 RETURN jsonb_build_object('ok',true,'kind',p_kind,
 'categories',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'kind',c.kind,'visible',c.visible)ORDER BY c.sort,c.id),'[]') FROM private.store_categories c WHERE c.kind=p_kind),
 'codes',(SELECT coalesce(jsonb_agg(sku ORDER BY sku),'[]') FROM private.store_items),
 'rewards',CASE WHEN p_kind='bits' THEN(SELECT coalesce(jsonb_agg(jsonb_build_object('key',key,'name',name,'sprite',regexp_replace(sprite,'^images/items/',''),'category',category)ORDER BY category,name,key),'[]')FROM private.hub_shop_draft_rewards()) ELSE '[]'::jsonb END,
 'styles',CASE WHEN p_kind='avatars' THEN(SELECT coalesce(jsonb_agg(private.hub_trainer_style(l.id)ORDER BY l.name,l.id),'[]') FROM private.trainer_looks l WHERE NOT l.visible AND l.pack_key IS NULL AND NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.trainer_sprite=l.id))ELSE '[]'::jsonb END);
END;
$fn$;
REVOKE ALL ON FUNCTION public.admin_product_draft_options(text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.admin_product_draft_options(text) TO authenticated,service_role;
CREATE FUNCTION public.admin_product_draft_create(p_request jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE v_actor uuid:=auth.uid();v_req uuid;v_hash text;v_reason text;v_product jsonb;v_kind text;v_sku text;v_name text;v_blurb text;v_category uuid;v_price int;v_quantity int;v_reward text;v_sprite text;v_extra jsonb;v_grants jsonb:='{}';v_titles jsonb:='[]';v_style_ids jsonb:='[]';v_pack text;v_expected jsonb;v_record private.trainer_looks%ROWTYPE;v_count int:=0;v_result jsonb;v_receipt private.hub_product_draft_changes%ROWTYPE;v_title jsonb;
BEGIN
 PERFORM private.require_staff_edit();IF v_actor IS NULL THEN RAISE EXCEPTION 'Staff session required.' USING ERRCODE='42501';END IF;
 IF jsonb_typeof(p_request) IS DISTINCT FROM 'object' OR (SELECT array_agg(key ORDER BY key)FROM jsonb_object_keys(p_request)key) IS DISTINCT FROM ARRAY['product','reason','requestId'] OR jsonb_typeof(p_request->'product') IS DISTINCT FROM 'object' OR jsonb_typeof(p_request->'reason') IS DISTINCT FROM 'string' OR length(btrim(p_request->>'reason')) NOT BETWEEN 3 AND 1000 OR jsonb_typeof(p_request->'requestId') IS DISTINCT FROM 'string' OR (p_request->>'requestId')!~*'^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$' THEN RAISE EXCEPTION 'Complete the product review and staff reason.' USING ERRCODE='22023';END IF;
 v_product:=p_request->'product';v_kind:=v_product->>'kind';v_req:=(p_request->>'requestId')::uuid;v_hash:=md5(p_request::text);v_reason:=btrim(p_request->>'reason');
 IF v_kind IS NULL OR v_kind NOT IN ('bits','avatars') THEN RAISE EXCEPTION 'Unsupported product type.' USING ERRCODE='22023';END IF;
 IF (SELECT array_agg(key ORDER BY key)FROM jsonb_object_keys(v_product)key) IS DISTINCT FROM (CASE WHEN v_kind='bits' THEN ARRAY['blurb','categoryId','kind','name','price','quantity','reward','sku','titles'] ELSE ARRAY['blurb','categoryId','kind','name','price','sku','styles'] END) THEN RAISE EXCEPTION 'Unsupported product fields.' USING ERRCODE='22023';END IF;
 v_sku:=v_product->>'sku';v_name:=btrim(v_product->>'name');v_blurb:=btrim(v_product->>'blurb');
 IF jsonb_typeof(v_product->'sku') IS DISTINCT FROM 'string' OR length(v_sku)>40 OR v_sku!~'^[a-z0-9]+(-[a-z0-9]+)*$' OR jsonb_typeof(v_product->'name') IS DISTINCT FROM 'string' OR length(v_name) NOT BETWEEN 1 AND 120 OR jsonb_typeof(v_product->'blurb') IS DISTINCT FROM 'string' OR length(v_blurb)>500 OR jsonb_typeof(v_product->'price') IS DISTINCT FROM 'number' OR (v_product->>'price')!~'^(0|[1-9][0-9]{0,9})$' OR (v_product->>'price')::numeric>2147483647 OR jsonb_typeof(v_product->'categoryId') IS DISTINCT FROM 'string' OR (v_product->>'categoryId')!~*'^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$' THEN RAISE EXCEPTION 'Enter a valid product name,code,category and whole price.' USING ERRCODE='22023';END IF;
 v_price:=(v_product->>'price')::int;v_category:=(v_product->>'categoryId')::uuid;
 IF NOT pg_try_advisory_xact_lock(hashtextextended('hub-product-request:'||v_actor::text||':'||v_req::text,0)) THEN RAISE EXCEPTION 'This request is already being processed.' USING ERRCODE='55P03';END IF;
 SELECT * INTO v_receipt FROM private.hub_product_draft_changes h WHERE h.actor=v_actor AND h.request_id=v_req;
 IF FOUND THEN IF v_receipt.request_hash<>v_hash THEN RAISE EXCEPTION 'This request was already used for another product.' USING ERRCODE='22023';END IF;RETURN v_receipt.result||jsonb_build_object('replayed',true);END IF;
 IF NOT pg_try_advisory_xact_lock(hashtextextended('hub-product-code:'||v_sku,0)) THEN RAISE EXCEPTION 'This product code is being used by another request.' USING ERRCODE='55P03';END IF;
 PERFORM 1 FROM private.store_categories c WHERE c.id=v_category AND c.kind=v_kind FOR SHARE NOWAIT;
 IF NOT FOUND THEN RAISE EXCEPTION 'Choose a category matching this product type.' USING ERRCODE='22023';END IF;
 IF EXISTS(SELECT 1 FROM private.store_items WHERE sku=v_sku) THEN RAISE EXCEPTION 'This product code is already in use.' USING ERRCODE='23505';END IF;
 IF v_kind='bits' THEN
  v_reward:=v_product->>'reward';
  IF v_price<1 OR jsonb_typeof(v_product->'reward') IS DISTINCT FROM 'string' OR jsonb_typeof(v_product->'quantity') IS DISTINCT FROM 'number' OR (v_product->>'quantity')!~'^[1-9][0-9]{0,9}$' OR (v_product->>'quantity')::numeric>2147483647 OR jsonb_typeof(v_product->'titles') IS DISTINCT FROM 'array' OR jsonb_array_length(v_product->'titles')>20 THEN RAISE EXCEPTION 'Choose guaranteed contents,a quantity and a positive Bits price.' USING ERRCODE='22023';END IF;
  SELECT regexp_replace(r.sprite,'^images/items/','')INTO v_sprite FROM private.hub_shop_draft_rewards()r WHERE r.key=v_reward;
  IF v_sprite IS NULL THEN RAISE EXCEPTION 'Choose an available shop item. Master Balls are for Pass and staff gifts.' USING ERRCODE='22023';END IF;
  FOR v_title IN SELECT value FROM jsonb_array_elements(v_product->'titles') LOOP
   IF jsonb_typeof(v_title) IS DISTINCT FROM 'string' OR length(btrim(v_title#>>'{}')) NOT BETWEEN 1 AND 160 THEN RAISE EXCEPTION 'Use a short exact Twitch Power-Up title on each line.' USING ERRCODE='22023';END IF;
   IF EXISTS(SELECT 1 FROM jsonb_array_elements_text(v_titles)t WHERE lower(t)=lower(btrim(v_title#>>'{}')))THEN RAISE EXCEPTION 'Remove duplicate Twitch titles.' USING ERRCODE='22023';END IF;
   v_titles:=v_titles||jsonb_build_array(btrim(v_title#>>'{}'));
  END LOOP;
  v_quantity:=(v_product->>'quantity')::int;v_grants:=private.bits_validate_grants(jsonb_build_object(v_reward,v_quantity));v_extra:=jsonb_build_object('productKind','bits','status','draft','detail','','bitsTitles',v_titles);
 ELSE
  IF jsonb_typeof(v_product->'styles') IS DISTINCT FROM 'array' OR jsonb_array_length(v_product->'styles') NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'Choose at least one new hidden Trainer style.' USING ERRCODE='22023';END IF;
  FOR v_expected IN SELECT value FROM jsonb_array_elements(v_product->'styles')LOOP
   IF jsonb_typeof(v_expected) IS DISTINCT FROM 'object' OR (SELECT array_agg(key ORDER BY key)FROM jsonb_object_keys(v_expected)key)IS DISTINCT FROM ARRAY['id','revision'] OR jsonb_typeof(v_expected->'id') IS DISTINCT FROM 'string' OR (v_expected->>'id')!~'^[a-zA-Z0-9][a-zA-Z0-9._-]{0,159}$' OR position('..'in v_expected->>'id')>0 OR jsonb_typeof(v_expected->'revision') IS DISTINCT FROM 'string' OR(v_expected->>'revision')!~'^[a-f0-9]{32}$' THEN RAISE EXCEPTION 'Reload the Trainer style selection.' USING ERRCODE='22023';END IF;
   IF v_style_ids? (v_expected->>'id') THEN RAISE EXCEPTION 'Select each Trainer style once.' USING ERRCODE='22023';END IF;v_style_ids:=v_style_ids||jsonb_build_array(v_expected->>'id');
  END LOOP;
  v_pack:='hub-'||v_sku;
  IF EXISTS(SELECT 1 FROM private.store_items WHERE extra->>'pack'=v_pack)OR EXISTS(SELECT 1 FROM private.trainer_looks WHERE pack_key=v_pack OR group_key=v_pack)OR EXISTS(SELECT 1 FROM public.profiles WHERE v_pack=ANY(coalesce(owned_avatar_packs,'{}')))THEN RAISE EXCEPTION 'This collection code is reserved. Choose a different product code.' USING ERRCODE='23505';END IF;
  FOR v_record IN SELECT l.* FROM private.trainer_looks l WHERE v_style_ids?l.id ORDER BY l.id FOR UPDATE NOWAIT LOOP
   v_count:=v_count+1;SELECT value INTO v_expected FROM jsonb_array_elements(v_product->'styles')WHERE value->>'id'=v_record.id;
   IF v_record.visible OR v_record.pack_key IS NOT NULL OR EXISTS(SELECT 1 FROM public.profiles p WHERE p.trainer_sprite=v_record.id)THEN RAISE EXCEPTION 'Only new hidden,unassigned styles can start a collection.' USING ERRCODE='22023';END IF;
   IF md5(to_jsonb(v_record)::text) IS DISTINCT FROM v_expected->>'revision' THEN RAISE EXCEPTION 'A Trainer style changed. Reload before creating the collection.' USING ERRCODE='40001';END IF;
  END LOOP;
  IF v_count<>jsonb_array_length(v_style_ids)THEN RAISE EXCEPTION 'A selected Trainer style is missing.' USING ERRCODE='22023';END IF;
  v_sprite:='premium-avatars.png';v_extra:=jsonb_build_object('productKind','avatar','status','draft','detail','','pack',v_pack,'looks',v_style_ids);
 END IF;
 INSERT INTO private.store_items(sku,category_id,name,blurb,cost,bits,grants,sprite,thumb,featured,sort,visible,extra,status)VALUES(v_sku,v_category,v_name,v_blurb,CASE WHEN v_kind='avatars'THEN v_price ELSE 0 END,CASE WHEN v_kind='bits'THEN v_price ELSE 0 END,v_grants,v_sprite,'',false,100,false,v_extra,'draft');
 IF v_kind='avatars'THEN UPDATE private.trainer_looks SET pack_key=v_pack,group_key=v_pack,group_label=v_name WHERE v_style_ids?id;END IF;
 v_result:=jsonb_build_object('ok',true,'requestId',v_req,'replayed',false,'product',jsonb_build_object('sku',v_sku,'kind',v_kind,'name',v_name,'blurb',v_blurb,'categoryId',v_category,'price',v_price,'status','draft','visible',false,'featured',false,'reward',v_reward,'quantity',v_quantity,'titles',v_titles,'styles',v_style_ids,'pack',v_pack));
 INSERT INTO private.hub_product_draft_changes(actor,request_id,request_hash,sku,reason,result)VALUES(v_actor,v_req,v_hash,v_sku,v_reason,v_result);RETURN v_result;
END;
$fn$;
REVOKE ALL ON FUNCTION public.admin_product_draft_create(jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.admin_product_draft_create(jsonb) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.admin_store_save_item(p_row jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_sku text;
  v_extra jsonb;
  v_pack text;
  v_kind text;
  v_status text;
  v_product text;
  v_bits int;
  v_titles jsonb;
begin
  perform private.require_staff_edit();
  v_sku := btrim(coalesce(p_row->>'sku', ''));
  if v_sku = '' then raise exception 'Give this item a SKU.'; end if;
  perform 1 from private.store_items i where i.sku=v_sku for update nowait;
  if not found then raise exception 'Product not found. Use Add product in the Admin Hub to create a new draft.' using errcode='22023';end if;
  v_extra := coalesce(p_row->'extra', '{}'::jsonb);
  v_status := lower(btrim(coalesce(p_row->>'status', v_extra->>'status', 'published')));
  if v_status not in ('draft', 'published') then v_status := 'published'; end if;
  v_product := nullif(btrim(coalesce(p_row->>'productKind', v_extra->>'productKind', '')), '');
  v_bits := coalesce((p_row->>'bits')::int, 0);
  if v_product is null then
    v_product := case
      when nullif(v_extra->>'pack','') is not null then 'avatar'
      when v_bits > 0 then 'bits'
      when jsonb_typeof(coalesce(p_row->'grants', '{}'::jsonb)) = 'object'
           and (select count(*) from jsonb_object_keys(coalesce(p_row->'grants', '{}'::jsonb))) > 1 then 'pack'
      else 'item'
    end;
  end if;
  if v_bits < 0 then raise exception 'Bits cost cannot be negative.'; end if;
  if v_bits > 0 then
    perform private.bits_validate_grants(coalesce(p_row->'grants', '{}'::jsonb));
    v_titles := coalesce(p_row->'bitsTitles', v_extra->'bitsTitles', '[]'::jsonb);
    if jsonb_typeof(v_titles) = 'string' then
      v_titles := to_jsonb(string_to_array(v_titles #>> '{}', E'\n'));
    end if;
    if v_status = 'published' then
      if v_bits < 1 then raise exception 'Live Bits products need a Bits cost greater than 0.'; end if;
      if jsonb_typeof(v_titles) <> 'array' or jsonb_array_length(v_titles) < 1 then
        raise exception 'Live Bits products need at least one Twitch Power-Up title.';
      end if;
    end if;
    v_extra := v_extra || jsonb_build_object('bitsTitles', coalesce(v_titles, '[]'::jsonb));
  end if;
  v_extra := v_extra || jsonb_build_object(
    'status', v_status,
    'productKind', v_product,
    'detail', coalesce(p_row->>'detail', v_extra->>'detail')
  );
  select c.kind into v_kind from private.store_categories c where c.id = (p_row->>'categoryId')::uuid;
  if v_kind = 'avatars' then
    v_pack := nullif(btrim(coalesce(v_extra->>'pack', '')), '');
    if v_pack is null then
      v_pack := trim(both '-' from regexp_replace(lower(v_sku), '^avatar-', ''));
      if v_pack = '' then v_pack := v_sku; end if;
      v_extra := v_extra || jsonb_build_object('pack', v_pack);
    end if;
    if v_extra->'looks' is null or jsonb_typeof(v_extra->'looks') <> 'array' then
      v_extra := v_extra || jsonb_build_object('looks', '[]'::jsonb);
    end if;
    v_product := 'avatar';
    v_extra := v_extra || jsonb_build_object('productKind', 'avatar');
  end if;
  if v_kind = 'bits' or v_bits > 0 then
    v_product := 'bits';
    v_extra := v_extra || jsonb_build_object('productKind', 'bits');
  end if;
  insert into private.store_items (
    sku, category_id, name, blurb, cost, bits, grants, sprite, thumb, featured, sort, visible, extra, status
  ) values (
    v_sku, (p_row->>'categoryId')::uuid, coalesce(nullif(p_row->>'name', ''), v_sku),
    coalesce(p_row->>'blurb', ''), coalesce((p_row->>'cost')::int, 0), v_bits,
    case when v_bits > 0 then private.bits_validate_grants(coalesce(p_row->'grants', '{}'::jsonb))
         else private.validate_store_grants(coalesce(p_row->'grants', '{}'::jsonb)) end,
    coalesce(p_row->>'sprite', ''), coalesce(p_row->>'thumb', ''),
    coalesce((p_row->>'featured')::boolean, false), coalesce((p_row->>'sort')::int, 100),
    coalesce((p_row->>'visible')::boolean, true), v_extra, v_status
  )
  on conflict (sku) do update set
    category_id = excluded.category_id, name = excluded.name, blurb = excluded.blurb,
    cost = excluded.cost, bits = excluded.bits, grants = excluded.grants, sprite = excluded.sprite,
    thumb = excluded.thumb, featured = excluded.featured, sort = excluded.sort, visible = excluded.visible,
    extra = excluded.extra, status = excluded.status;
  if v_kind = 'avatars' then
    perform private.sync_avatar_pack_looks(v_extra->>'pack', v_extra->'looks', coalesce(nullif(p_row->>'name', ''), v_sku), coalesce(v_extra->>'games', ''));
  end if;
  return public.admin_store_get() || jsonb_build_object(
    'message', 'Item saved.', 'sku', v_sku, 'status', v_status,
    'bitsCollisions', private.bits_amount_collisions()
  );
end;
$function$

;
COMMIT;
