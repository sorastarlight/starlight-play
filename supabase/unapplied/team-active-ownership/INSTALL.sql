BEGIN;SET LOCAL lock_timeout='5s';SET LOCAL statement_timeout='20s';
DO $guard$ BEGIN
IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('public.play_set_team(uuid[])') AND md5(prosrc)='c29448c8abd27606aa313a19697a22a4' AND proacl::text IS NOT DISTINCT FROM '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' AND proconfig IS NOT DISTINCT FROM ARRAY['search_path=public']::text[] AND pg_get_userbyid(proowner)='postgres' AND prosecdef=true AND provolatile='v' AND proisstrict=false AND proparallel='u') THEN RAISE EXCEPTION 'Team setter source/attribute drift';END IF;
END $guard$;
CREATE OR REPLACE FUNCTION public.play_set_team(p_catch_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  uid uuid := auth.uid();
  ids uuid[] := coalesce(p_catch_ids, '{}'::uuid[]);
begin
  if uid is null then raise exception 'Sign in to edit your team.' using errcode = '42501'; end if;
  if cardinality(ids) > 6 then raise exception 'Your team can hold six Pokémon.'; end if;
  if (select count(distinct x) from unnest(ids) as t(x)) <> cardinality(ids) then
    raise exception 'The same Pokémon can’t be on the team twice.';
  end if;
  -- Serialize active-ownership validation with specimen removal or transfer.
  perform c.id from public.catches c where c.id = any(ids) and c.user_id = uid and c.transferred_at is null order by c.id for update;
  if exists (
    select 1 from unnest(ids) as t(x)
    where not exists (select 1 from public.catches c where c.id = t.x and c.user_id = uid and c.transferred_at is null)
  ) then raise exception 'Team Pokémon must be ones you still have.'; end if;
  if exists (
    select 1 from unnest(ids) as t(x)
    join public.trade_listings l on l.catch_id = t.x and l.status = 'open'
  ) then raise exception 'A Pokémon on the trade board cannot join the team.'; end if;
  update public.profiles set team_ids = ids, updated_at = now() where id = uid;
  return jsonb_build_object('ok', true, 'message', 'Team updated.', 'team', private.team_mons(uid), 'trainer', private.trainer_card(uid));
end;
$function$
;
COMMIT;
