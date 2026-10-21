BEGIN;
DO $guard$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE oid='public.play_trainer_search(text)'::regprocedure AND md5(prosrc)='66a41e80371ef80410d455820ad7a33b' AND proacl::text='{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' AND proconfig=ARRAY['search_path=public'] AND prosecdef AND provolatile='s' AND pg_get_userbyid(proowner)='postgres') THEN RAISE EXCEPTION 'Trainer search source or privilege drift'; END IF; END $guard$;
CREATE OR REPLACE FUNCTION public.play_trainer_search(p_q text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  q text := btrim(coalesce(p_q, ''));
  rows jsonb := '[]'::jsonb;
begin
  if char_length(q) < 2 then
    return jsonb_build_object('ok', true, 'trainers', '[]'::jsonb, 'message', 'Type at least two letters.');
  end if;
  if position('@' in q) > 0 or q ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return jsonb_build_object('ok', true, 'trainers', '[]'::jsonb);
  end if;
  q := left(q, 40);
  select coalesce(jsonb_agg(jsonb_build_object(
    'login', coalesce(nullif(p.twitch_login, ''), nullif(p.username, ''), 'trainer'),
    'displayName', coalesce(nullif(p.display_name, ''), nullif(p.username, ''), nullif(p.twitch_login, ''), 'Trainer'),
    'trainerSprite', case when private.trainer_sprite_ok(p.trainer_sprite) then p.trainer_sprite else 'red-gen1' end,
    'title', coalesce((select t.name from public.progression_titles t where t.id = p.active_title_id), p.trainer_title, ''),
    'level', private.trainer_level(p.xp),
    'twitchLinked', exists (
      select 1 from public.twitch_connections c
       where c.user_id = p.id and c.confirmed and c.connection_type in ('player', 'secondary')
    )
  ) order by p.display_name, p.username, p.id), '[]'::jsonb)
    into rows
    from (select p.* from public.profiles p
   where private.ranking_eligible_uid(p.id)
     and (
       coalesce(p.display_name, '') ilike '%' || q || '%'
       or coalesce((select t.name from public.progression_titles t where t.id = p.active_title_id), '') ilike '%' || q || '%'
     )
   order by p.display_name, p.username, p.id
   limit 12) p;
  return jsonb_build_object('ok', true, 'trainers', coalesce(rows, '[]'::jsonb));
end;
$function$
;
COMMIT;
