BEGIN;
DO $guard$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='public.play_notices()'::regprocedure AND md5(prosrc)='ab96a8ba4d521d7fa2ffc8baf0b093f5' AND proacl::text IS NOT DISTINCT FROM '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' AND proconfig=ARRAY['search_path=public'] AND pg_get_userbyid(proowner)='postgres' AND prosecdef=true AND provolatile='v' AND proisstrict=false AND proparallel='u') THEN RAISE EXCEPTION 'Notice source/attribute drift'; END IF; END $guard$;
CREATE OR REPLACE FUNCTION public.play_notices()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  uid uuid := auth.uid();
  rows jsonb;
begin
  if uid is null then
    return jsonb_build_object('ok', true, 'notices', '[]'::jsonb);
  end if;
  with claimed as (
    update public.trainer_notices
       set seen_at = now()
     where user_id = uid and seen_at is null
    returning id, kind, title, body, payload, created_at
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', n.id, 'kind', n.kind, 'title', n.title, 'body', n.body, 'payload', n.payload
  ) order by n.created_at), '[]'::jsonb)
    into rows
    from claimed n;
  return jsonb_build_object('ok', true, 'notices', coalesce(rows, '[]'::jsonb));
end;
$function$;
DO $guard$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='public.play_notices()'::regprocedure AND md5(prosrc)='c9d487e0a8e6bb244fca4d8848989e51' AND proacl::text IS NOT DISTINCT FROM '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' AND proconfig=ARRAY['search_path=public'] AND pg_get_userbyid(proowner)='postgres' AND prosecdef=true AND provolatile='v' AND proisstrict=false AND proparallel='u') THEN RAISE EXCEPTION 'Notice source/attribute drift'; END IF; END $guard$;
COMMIT;
