BEGIN;
DO $guard$ BEGIN
 IF to_regprocedure('public.admin_trainer_pokemon(uuid,text,integer,jsonb)') IS NOT NULL THEN RAISE EXCEPTION 'Roster endpoint already exists.'; END IF;
 IF md5(pg_get_functiondef('private.require_hub()'::regprocedure)) IS DISTINCT FROM '0d3c14b0c96fbc20f27ca4a85cab5d25' OR md5(pg_get_functiondef('private.admin_catch_battle_json(public.catches)'::regprocedure)) IS DISTINCT FROM '7cf008fa413556f2af919acc0a1916ae' THEN RAISE EXCEPTION 'Roster dependency drift.'; END IF;
END $guard$;
CREATE FUNCTION public.admin_trainer_pokemon(p_user uuid,p_query text DEFAULT '',p_generation integer DEFAULT 1,p_cursor jsonb DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $body$
DECLARE v_time timestamptz; v_id uuid; v_words text[]; v_rows jsonb; v_more boolean; v_next jsonb;
BEGIN
 PERFORM private.require_hub();
 IF auth.uid() IS NULL OR private.is_play_admin() IS DISTINCT FROM true THEN RAISE EXCEPTION 'Staff access required.' USING ERRCODE='42501'; END IF;
 IF p_user IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_user) THEN RAISE EXCEPTION 'Trainer unavailable.' USING ERRCODE='22023'; END IF;
 IF p_generation IS DISTINCT FROM 1 OR length(coalesce(p_query,''))>100 THEN RAISE EXCEPTION 'Unsupported generation or search.' USING ERRCODE='22023'; END IF;
 v_words:=regexp_split_to_array(trim(regexp_replace(lower(translate(coalesce(p_query,''),'éÉ','eE')),'[\s#.,_/()''-]+',' ','g')),'\s+');
 IF p_cursor IS NOT NULL THEN
  IF jsonb_typeof(p_cursor) IS DISTINCT FROM 'object' OR NOT(p_cursor ? 'caughtAt' AND p_cursor ? 'id') OR (SELECT count(*) FROM jsonb_object_keys(p_cursor))<>2 THEN RAISE EXCEPTION 'Invalid roster cursor.' USING ERRCODE='22023'; END IF;
  v_time:=(p_cursor->>'caughtAt')::timestamptz; v_id:=(p_cursor->>'id')::uuid;
  IF v_time IS NULL OR v_id IS NULL OR NOT isfinite(v_time) THEN RAISE EXCEPTION 'Invalid roster cursor.' USING ERRCODE='22023'; END IF;
 END IF;
 WITH matches AS MATERIALIZED (
  SELECT c.* FROM public.catches c WHERE c.user_id=p_user AND c.transferred_at IS NULL AND c.dex BETWEEN 1 AND 151
   AND (v_time IS NULL OR (c.caught_at,c.id)<(v_time,v_id))
   AND NOT EXISTS(SELECT 1 FROM unnest(v_words) w WHERE w<>'' AND CASE WHEN w ~ '^[0-9]+$' THEN c.dex::text<>coalesce(nullif(ltrim(w,'0'),''),'0') ELSE strpos(lower(translate(concat_ws(' ',c.name,c.nickname),'éÉ','eE')),w)=0 END)
  ORDER BY c.caught_at DESC,c.id DESC LIMIT 41
 ), numbered AS(SELECT m.*,row_number() OVER(ORDER BY m.caught_at DESC,m.id DESC) rn FROM matches m)
 SELECT coalesce((SELECT jsonb_agg(jsonb_build_object('id',n.id,'dex',n.dex,'name',n.name,'nickname',n.nickname,'variant',n.variant,'gender',n.gender,'ball',n.ball,'level',n.level,'caughtAt',n.caught_at,'battleData',private.admin_catch_battle_json(c)) ORDER BY n.caught_at DESC,n.id DESC) FROM numbered n JOIN public.catches c ON c.id=n.id WHERE n.rn<=40),'[]'::jsonb),
 EXISTS(SELECT 1 FROM numbered WHERE rn=41),
 (SELECT jsonb_build_object('caughtAt',caught_at,'id',id) FROM numbered WHERE rn=40)
 INTO v_rows,v_more,v_next;
 RETURN jsonb_build_object('ok',true,'userId',p_user,'pokemon',v_rows,'hasMore',v_more,'nextCursor',CASE WHEN v_more THEN v_next ELSE NULL END,'pageSize',40,'generation',1);
END $body$;
REVOKE ALL ON FUNCTION public.admin_trainer_pokemon(uuid,text,integer,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_trainer_pokemon(uuid,text,integer,jsonb) TO authenticated,service_role;

COMMIT;
