BEGIN;
DO $guard$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='public.play_transfer_oak(uuid)'::regprocedure AND md5(prosrc)='ae335d0fb0aeee2a4cdf48e9c9d4fcb5' AND proacl::text='{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' AND proconfig=ARRAY['search_path=public'] AND prosecdef AND provolatile='v' AND pg_get_userbyid(proowner)='postgres') THEN RAISE EXCEPTION 'Last-copy source or privilege drift: play_transfer_oak(uuid)'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='public.play_release(uuid,text)'::regprocedure AND md5(prosrc)='1e39c46baf93af4c42c5e3d0e20bbfd1' AND proacl::text='{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' AND proconfig=ARRAY['search_path=public'] AND prosecdef AND provolatile='v' AND pg_get_userbyid(proowner)='postgres') THEN RAISE EXCEPTION 'Last-copy source or privilege drift: play_release(uuid,text)'; END IF;
END $guard$;
CREATE OR REPLACE FUNCTION public.play_transfer_oak(p_catch_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  uid uuid := auth.uid();
  c public.catches;
  spec public.species;
  fam int;
  fam_name text;
  candy_base int;
  pay int := 0;
  transferred int;
  extra boolean := false;
  candy_key text;
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  select * into c from public.catches where id = p_catch_id and user_id = uid and transferred_at is null for update;
  if c.id is null then
    raise exception 'That Pokémon is not in your storage.';
  end if;
  if c.favorite or c.locked then
    raise exception 'Favorite or locked Pokémon cannot be sent to Professor Oak.';
  end if;
  if exists (select 1 from public.profiles p where p.id = uid and c.id = any (p.team_ids)) then
    raise exception 'Take it off your team before transferring to Professor Oak.';
  end if;
  if exists (select 1 from public.trade_listings t where t.catch_id = c.id and t.status = 'open') then
    raise exception 'Take it off the trade board first.';
  end if;
  select * into spec from public.species where dex = c.dex;
  fam := coalesce(spec.family_id, c.dex);
  select f.name, f.base_dex into fam_name, candy_base from public.evolution_families f where f.id = fam;
  if candy_base is null then
    candy_base := fam;
    fam_name := coalesce(spec.name, c.name);
  end if;
  candy_key := 'species-' || fam::text;
  if private.family_has_enabled_evo(fam) or exists (select 1 from public.evolution_families f where f.id = fam) then
    pay := case coalesce(spec.evo_stage, 0) when 2 then 2 when 3 then 3 else 1 end;
    if coalesce(c.is_alpha, false) or strpos(coalesce(c.variant, ''), 'shiny') > 0 then
      pay := pay + 1;
    end if;
    perform private.grant_family_candy(uid, fam, pay, 'OAK_TRANSFER', 'Sent to Professor Oak', jsonb_build_object('idempotency', 'oak:' || c.id::text, 'catchId', c.id::text));
  end if;
  insert into public.oak_transfers (user_id, dex, catch_id, candy_key) values (uid, c.dex, c.id, candy_key);
  select count(*)::int into transferred from public.oak_transfers where user_id = uid and dex = c.dex;
  if transferred > 0 and transferred % 50 = 0 and pay > 0 then
    perform private.grant_family_candy(uid, fam, 1, 'OAK_BONUS', 'Bonus for sending 50 of this species', jsonb_build_object('idempotency', 'oak-bonus:' || uid::text || ':' || c.dex::text || ':' || transferred::text, 'catchId', c.id::text));
    extra := true;
    pay := pay + 1;
  end if;
  update public.catches set transferred_at = now() where id = c.id;
  perform private.pull_from_team(uid, c.id);
  return public.play_storage() || jsonb_build_object('ok', true, 'candyGranted', pay, 'familyId', fam, 'candyBaseDex', candy_base, 'candyName', coalesce(fam_name, 'Evolution') || ' Evolution Candy', 'message', format('Professor Oak took %s. You received %s Evolution Candy%s.', coalesce(nullif(c.nickname, ''), c.name), pay, case when extra then ' (including a bonus for transferring 50 of this species)' else '' end));
end;
$function$;

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

DO $guard$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='public.play_transfer_oak(uuid)'::regprocedure AND md5(prosrc)='c2572ac178fa890132854f4794203c5f' AND proacl::text='{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' AND proconfig=ARRAY['search_path=public'] AND prosecdef AND provolatile='v' AND pg_get_userbyid(proowner)='postgres') THEN RAISE EXCEPTION 'Last-copy source or privilege drift: play_transfer_oak(uuid)'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='public.play_release(uuid,text)'::regprocedure AND md5(prosrc)='e0974326b6a4663bf5de93f31f45997e' AND proacl::text='{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' AND proconfig=ARRAY['search_path=public'] AND prosecdef AND provolatile='v' AND pg_get_userbyid(proowner)='postgres') THEN RAISE EXCEPTION 'Last-copy source or privilege drift: play_release(uuid,text)'; END IF;
END $guard$;
COMMIT;
