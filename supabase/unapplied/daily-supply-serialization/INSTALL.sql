BEGIN;SET LOCAL lock_timeout='5s';SET LOCAL statement_timeout='20s';
DO $guard$ BEGIN
IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('private.ensure_inventory(uuid)') AND md5(prosrc)='ccc5af71a95193d0301edcb689e225e5' AND proacl::text IS NOT DISTINCT FROM NULL AND proconfig IS NOT DISTINCT FROM NULL::text[] AND pg_get_userbyid(proowner)='postgres' AND prosecdef=false AND provolatile='v' AND proisstrict=false AND proparallel='u') THEN RAISE EXCEPTION 'Daily claim source/dependency/attribute drift: private.ensure_inventory(uuid)';END IF;
IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('private.flush_bits_pending(uuid)') AND md5(prosrc)='cb7fc4cf40a53c815c967f3a48d5e4eb' AND proacl::text IS NOT DISTINCT FROM NULL AND proconfig IS NOT DISTINCT FROM NULL::text[] AND pg_get_userbyid(proowner)='postgres' AND prosecdef=false AND provolatile='v' AND proisstrict=false AND proparallel='u') THEN RAISE EXCEPTION 'Daily claim source/dependency/attribute drift: private.flush_bits_pending(uuid)';END IF;
IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('public.play_claim_daily_supply()') AND md5(prosrc)='02acbf8dc57f405dcb547b4e15b8dba0' AND proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' AND proconfig IS NOT DISTINCT FROM ARRAY['search_path=public']::text[] AND pg_get_userbyid(proowner)='postgres' AND prosecdef=true AND provolatile='v' AND proisstrict=false AND proparallel='u') THEN RAISE EXCEPTION 'Daily claim source/dependency/attribute drift: public.play_claim_daily_supply()';END IF;
END $guard$;
CREATE OR REPLACE FUNCTION public.play_claim_daily_supply()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  uid uuid := auth.uid();
  today date := private.app_today();
  yesterday date := today - 1;
  prev int := 0;
  streak int := 1;
  berry jsonb;
  v_grants jsonb;
  supply jsonb := private.economy_config()->'dailySupply';
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  perform private.ensure_inventory(uid);
  perform 1 from public.inventories where user_id = uid for update;
  if exists (
    select 1 from public.daily_claims
     where user_id = uid and created_at > now() - interval '12 hours'
       and claim_date is distinct from today
  ) then
    raise exception 'Daily Trainer Supply is not ready yet.';
  end if;
  insert into public.daily_claims (user_id, claim_date, streak_day, grants)
  values (uid, today, 1, '{}'::jsonb)
  on conflict (user_id, claim_date) do nothing;
  if not found then
    raise exception 'Daily Trainer Supply is not ready yet.';
  end if;
  select streak_day into prev
    from public.daily_claims
   where user_id = uid and claim_date = yesterday;
  streak := case when prev is null then 1 else (prev % 7) + 1 end;
  berry := private.pick_loot_entry('DAILY_COMMON_BERRY');
  if berry is null or (berry->>'item') = 'goldenrazz' then
    berry := jsonb_build_object('item', 'berry', 'qty', 1);
  end if;
  v_grants := jsonb_build_object(
      'pokeball', coalesce((supply->>'pokeball')::int, 3),
      berry->>'item', coalesce((supply->>'berry')::int, 1),
      'coins', coalesce((supply->>'coins')::int, 50)
    ) || private.daily_streak_bonus(streak);
  update public.daily_claims
     set streak_day = streak, grants = v_grants
   where user_id = uid and claim_date = today;
  update public.inventories
     set daily_supply_at = now(), updated_at = now()
   where user_id = uid;
  begin
    perform private.grant_items(uid, v_grants, 'DAILY_REWARD', today::text, 'daily:' || uid::text || ':' || today::text, true);
  exception when others then
    delete from public.daily_claims where user_id = uid and claim_date = today;
    update public.inventories set daily_supply_at = null, updated_at = now() where user_id = uid;
    raise;
  end;
  return private.play_snapshot(uid) || jsonb_build_object(
    'ok', true,
    'streakDay', streak,
    'grants', v_grants,
    'message', 'Daily Trainer Supply claimed. Day ' || streak::text || ' of 7.'
  );
end;
$function$
;COMMIT;
