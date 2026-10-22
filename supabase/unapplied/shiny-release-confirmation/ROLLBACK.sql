BEGIN;
DO $guard$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='public.play_release(uuid,text)'::regprocedure AND md5(prosrc)='efcb9200fbd34359176436da1f15b552' AND proacl::text IS NOT DISTINCT FROM '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' AND proconfig=ARRAY['search_path=public'] AND pg_get_userbyid(proowner)='postgres' AND prosecdef=true AND provolatile='v' AND proisstrict=false AND proparallel='u') THEN RAISE EXCEPTION 'Release source/attribute drift'; END IF; END $guard$;
CREATE OR REPLACE FUNCTION public.play_release(p_catch uuid, p_confirm text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  uid uuid := auth.uid();
  c public.catches;
  spec public.species;
  pay int := 0;
  fam int;
begin
  if uid is null then raise exception 'Sign in first.' using errcode = '42501'; end if;
  select * into c from public.catches where id = p_catch and user_id = uid and transferred_at is null for update;
  if c.id is null then raise exception 'That Pokémon is not in your collection.'; end if;
  if c.favorite or c.locked then raise exception 'Favorite or locked Pokémon cannot be released.'; end if;
  if c.variant like '%shiny%' and p_confirm <> 'SHINY' then
    raise exception 'This is a SHINY Pokémon. Confirm release with SHINY.';
  end if;
  if exists (select 1 from public.trade_listings t where t.catch_id = c.id and t.status = 'open') then
    raise exception 'Cancel the trade listing first.';
  end if;
  select * into spec from public.species where dex = c.dex;
  fam := coalesce(spec.family_candy_species_id, spec.family_id, c.dex);
  if private.family_has_enabled_evo(fam) then
    pay := case spec.evo_stage when 2 then 2 when 3 then 3 else 1 end;
    perform private.grant_family_candy(uid, fam, pay, 'RELEASE_REWARD', 'Released a Pokémon',
      jsonb_build_object('idempotency', 'release:' || c.id::text, 'catchId', c.id::text));
  end if;
  update public.catches set transferred_at = now(), user_id = uid where id = c.id;
  update public.trainer_stats set released = released + 1, updated_at = now() where user_id = uid;
  perform private.pull_from_team(uid, c.id);
  if pay > 0 then
    return jsonb_build_object('ok', true, 'message', 'Released ' || c.name || ' for ' || pay || ' Candy.');
  end if;
  return jsonb_build_object('ok', true, 'message', 'Released ' || c.name || '.');
end;
$function$;
DO $guard$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='public.play_release(uuid,text)'::regprocedure AND md5(prosrc)='e0974326b6a4663bf5de93f31f45997e' AND proacl::text IS NOT DISTINCT FROM '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' AND proconfig=ARRAY['search_path=public'] AND pg_get_userbyid(proowner)='postgres' AND prosecdef=true AND provolatile='v' AND proisstrict=false AND proparallel='u') THEN RAISE EXCEPTION 'Release source/attribute drift'; END IF; END $guard$;
COMMIT;
