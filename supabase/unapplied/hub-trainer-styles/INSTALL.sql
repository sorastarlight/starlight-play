BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $guard$ BEGIN
 IF to_regprocedure('public.admin_trainer_styles_read()') IS NOT NULL OR to_regprocedure('public.admin_trainer_style_save(jsonb)') IS NOT NULL OR to_regclass('private.hub_trainer_style_changes') IS NOT NULL THEN RAISE EXCEPTION 'Trainer styles already installed';END IF;
 IF md5(pg_get_functiondef('public.admin_store_save_look(jsonb)'::regprocedure)) IS DISTINCT FROM 'd805c79d2c371b261a7c9957daacc735' OR md5(pg_get_functiondef('public.admin_save_look_portrait(text,text,jsonb,text)'::regprocedure)) IS DISTINCT FROM 'ee681fdc4c0956427d1f680c81e37415' THEN RAISE EXCEPTION 'Trainer style source drift';END IF;
END $guard$;
CREATE TABLE private.hub_trainer_style_changes(
 actor uuid NOT NULL,request_id uuid NOT NULL,request_hash text NOT NULL,style_id text NOT NULL,mode text NOT NULL,reason text NOT NULL,before_row jsonb,after_row jsonb NOT NULL,result jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(actor,request_id)
);
ALTER TABLE private.hub_trainer_style_changes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.hub_trainer_style_changes FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION private.hub_trainer_style(p_id text) RETURNS jsonb LANGUAGE sql STABLE SET search_path='' AS $fn$
 SELECT jsonb_build_object('id',s.id,'name',s.name,'gender',s.gender,'outfit',s.outfit,'ext',s.ext,'groupKey',s.group_key,'groupLabel',s.group_label,'games',s.games,'pack',s.pack_key,'sort',s.sort,'visible',s.visible,'portraitFile',s.portrait_file,'portraitCrop',s.portrait_crop,'assetKind',s.asset_kind,'revision',md5(to_jsonb(s)::text)) FROM private.trainer_looks s WHERE s.id=p_id;
$fn$;
REVOKE ALL ON FUNCTION private.hub_trainer_style(text) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.admin_trainer_styles_read() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $fn$
BEGIN
 PERFORM private.require_staff_edit();IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Staff session required.' USING ERRCODE='42501';END IF;
 RETURN jsonb_build_object('ok',true,'styles',(SELECT coalesce(jsonb_agg(private.hub_trainer_style(id) ORDER BY sort,name,id),'[]') FROM private.trainer_looks),'assets',(SELECT coalesce(jsonb_agg(jsonb_build_object('filename',filename,'kind',kind,'label',label)ORDER BY label,filename),'[]') FROM private.store_assets WHERE kind IN ('trainer','portrait')));
END;
$fn$;
REVOKE ALL ON FUNCTION public.admin_trainer_styles_read() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.admin_trainer_styles_read() TO authenticated,service_role;
CREATE FUNCTION public.admin_trainer_style_save(p_request jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE v_actor uuid:=auth.uid();req uuid;v_mode text;v_id text;v_reason text;v_hash text;v_before jsonb;v_after jsonb;v_result jsonb;v_changes jsonb;v_key text;v_file text;v_ext text;v_crop jsonb;rec private.trainer_looks%ROWTYPE;receipt private.hub_trainer_style_changes%ROWTYPE;
BEGIN
 PERFORM private.require_staff_edit();IF v_actor IS NULL THEN RAISE EXCEPTION 'Staff session required.' USING ERRCODE='42501';END IF;
 IF jsonb_typeof(p_request) IS DISTINCT FROM 'object' OR (SELECT array_agg(key ORDER BY key) FROM jsonb_object_keys(p_request)key) IS DISTINCT FROM ARRAY['changes','id','mode','reason','requestId','revision'] THEN RAISE EXCEPTION 'Invalid style request.' USING ERRCODE='22023';END IF;
 v_mode:=p_request->>'mode';v_id:=p_request->>'id';v_reason:=btrim(p_request->>'reason');v_changes:=p_request->'changes';
 IF v_mode NOT IN ('create','details','portrait') OR v_mode IS NULL OR jsonb_typeof(p_request->'id') IS DISTINCT FROM 'string' OR v_id!~'^[a-zA-Z0-9][a-zA-Z0-9._-]{0,159}$' OR position('..'in v_id)>0 OR jsonb_typeof(p_request->'reason') IS DISTINCT FROM 'string' OR length(v_reason) NOT BETWEEN 3 AND 1000 OR jsonb_typeof(v_changes) IS DISTINCT FROM 'object' OR v_changes='{}'::jsonb OR jsonb_typeof(p_request->'requestId') IS DISTINCT FROM 'string' OR (p_request->>'requestId')!~*'^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$' THEN RAISE EXCEPTION 'Complete the style review and staff reason.' USING ERRCODE='22023';END IF;
 req:=(p_request->>'requestId')::uuid;v_hash:=md5(p_request::text);
 IF NOT pg_try_advisory_xact_lock(hashtextextended('hub-style-request:'||v_actor::text||':'||req::text,0)) THEN RAISE EXCEPTION 'This request is already being processed.' USING ERRCODE='55P03';END IF;
 SELECT * INTO receipt FROM private.hub_trainer_style_changes h WHERE h.actor=v_actor AND h.request_id=req;
 IF FOUND THEN IF receipt.request_hash<>v_hash THEN RAISE EXCEPTION 'This request was already used for different changes.' USING ERRCODE='22023';END IF;RETURN receipt.result||jsonb_build_object('replayed',true);END IF;
 IF NOT pg_try_advisory_xact_lock(hashtextextended('hub-style:'||v_id,0)) THEN RAISE EXCEPTION 'Another staff member is editing this style.' USING ERRCODE='55P03';END IF;
 SELECT * INTO rec FROM private.trainer_looks WHERE id=v_id FOR UPDATE NOWAIT;
 IF v_mode='create' THEN
  IF FOUND THEN RAISE EXCEPTION 'This sprite is already registered. Choose it in the style list.' USING ERRCODE='23505';END IF;
  IF p_request->'revision' IS DISTINCT FROM 'null'::jsonb OR (SELECT array_agg(key ORDER BY key)FROM jsonb_object_keys(v_changes)key) IS DISTINCT FROM ARRAY['filename','name'] OR jsonb_typeof(v_changes->'filename') IS DISTINCT FROM 'string' OR jsonb_typeof(v_changes->'name') IS DISTINCT FROM 'string' OR length(btrim(v_changes->>'name')) NOT BETWEEN 1 AND 120 THEN RAISE EXCEPTION 'Choose an uploaded Trainer sprite and a style name.' USING ERRCODE='22023';END IF;
  v_file:=v_changes->>'filename';v_ext:=substring(v_file from '[.]([a-zA-Z]+)$');
  IF v_file!~'^[a-zA-Z0-9][a-zA-Z0-9._-]*[.](png|webp|gif|jpg|jpeg)$' OR position('..'in v_file)>0 OR left(v_file,length(v_file)-length(v_ext)-1)<>v_id OR NOT EXISTS(SELECT 1 FROM private.store_assets WHERE filename=v_file AND kind='trainer') THEN RAISE EXCEPTION 'Choose a registered Trainer sprite image.' USING ERRCODE='22023';END IF;
  INSERT INTO private.trainer_looks(id,name,ext,visible,group_key,group_label)VALUES(v_id,btrim(v_changes->>'name'),v_ext,false,'library','Sprite library');
 ELSE
  IF rec.id IS NULL THEN RAISE EXCEPTION 'Style not found.' USING ERRCODE='22023';END IF;
  v_before:=to_jsonb(rec);IF p_request->>'revision' IS DISTINCT FROM md5(v_before::text) THEN RAISE EXCEPTION 'This style changed. Reload it before saving.' USING ERRCODE='40001';END IF;
  IF v_mode='details' THEN
   FOR v_key IN SELECT jsonb_object_keys(v_changes) LOOP
    IF v_key NOT IN ('name','gender','outfit','games','visible') THEN RAISE EXCEPTION 'Unsupported style field.' USING ERRCODE='22023';END IF;
    IF v_key='visible' THEN IF jsonb_typeof(v_changes->v_key) IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'Choose whether the style is available.' USING ERRCODE='22023';END IF;
    ELSE IF jsonb_typeof(v_changes->v_key) IS DISTINCT FROM 'string' OR length(v_changes->>v_key)>(CASE v_key WHEN 'gender' THEN 40 ELSE 120 END) OR (v_key='name' AND length(btrim(v_changes->>v_key))=0) THEN RAISE EXCEPTION 'Enter a valid style label.' USING ERRCODE='22023';END IF;END IF;
   END LOOP;
   UPDATE private.trainer_looks SET name=CASE WHEN v_changes?'name' THEN btrim(v_changes->>'name') ELSE name END,gender=CASE WHEN v_changes?'gender' THEN btrim(v_changes->>'gender') ELSE gender END,outfit=CASE WHEN v_changes?'outfit' THEN btrim(v_changes->>'outfit') ELSE outfit END,games=CASE WHEN v_changes?'games' THEN btrim(v_changes->>'games') ELSE games END,visible=CASE WHEN v_changes?'visible' THEN(v_changes->>'visible')::boolean ELSE visible END WHERE id=v_id;
  ELSE
   IF (SELECT array_agg(key ORDER BY key)FROM jsonb_object_keys(v_changes)key) IS DISTINCT FROM ARRAY['assetKind','portraitCrop','portraitFile'] OR jsonb_typeof(v_changes->'portraitFile') IS DISTINCT FROM 'string' OR jsonb_typeof(v_changes->'assetKind') IS DISTINCT FROM 'string' OR (v_changes->>'assetKind') NOT IN ('pixel','rendered') OR jsonb_typeof(v_changes->'portraitCrop') IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Choose an uploaded portrait and image style.' USING ERRCODE='22023';END IF;
   v_file:=v_changes->>'portraitFile';v_crop:=v_changes->'portraitCrop';
   IF v_file!~'^[a-zA-Z0-9][a-zA-Z0-9._-]*[.](png|webp|gif|jpg|jpeg)$' OR position('..'in v_file)>0 OR NOT EXISTS(SELECT 1 FROM private.store_assets WHERE filename=v_file AND kind='portrait') THEN RAISE EXCEPTION 'Choose a registered portrait image.' USING ERRCODE='22023';END IF;
   IF v_crop<>'{}'::jsonb THEN
    IF (SELECT array_agg(key ORDER BY key)FROM jsonb_object_keys(v_crop)key) IS DISTINCT FROM ARRAY['x','y','zoom'] THEN RAISE EXCEPTION 'Invalid portrait crop.' USING ERRCODE='22023';END IF;
    FOR v_key IN SELECT jsonb_object_keys(v_crop) LOOP IF jsonb_typeof(v_crop->v_key) IS DISTINCT FROM 'number' OR (v_crop->>v_key)::numeric NOT BETWEEN (CASE WHEN v_key='zoom' THEN .7 ELSE -1 END) AND (CASE WHEN v_key='zoom' THEN 2.4 ELSE 1 END) THEN RAISE EXCEPTION 'Portrait crop is outside the supported range.' USING ERRCODE='22023';END IF;END LOOP;
   END IF;
   UPDATE private.trainer_looks SET portrait_file=v_file,portrait_crop=v_crop,asset_kind=v_changes->>'assetKind' WHERE id=v_id;
  END IF;
 END IF;
 SELECT to_jsonb(s) INTO v_after FROM private.trainer_looks s WHERE id=v_id;
 IF v_after IS NOT DISTINCT FROM v_before THEN RAISE EXCEPTION 'No style changes to save.' USING ERRCODE='22023';END IF;
 v_result:=jsonb_build_object('ok',true,'style',private.hub_trainer_style(v_id),'requestId',req,'replayed',false);
 INSERT INTO private.hub_trainer_style_changes(actor,request_id,request_hash,style_id,mode,reason,before_row,after_row,result) VALUES(v_actor,req,v_hash,v_id,v_mode,v_reason,v_before,v_after,v_result);RETURN v_result;
END;
$fn$;
REVOKE ALL ON FUNCTION public.admin_trainer_style_save(jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.admin_trainer_style_save(jsonb) TO authenticated,service_role;
COMMIT;
