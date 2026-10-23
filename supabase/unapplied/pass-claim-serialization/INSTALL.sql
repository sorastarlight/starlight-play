BEGIN;SET LOCAL lock_timeout='5s';SET LOCAL statement_timeout='20s';
DO $guard$ BEGIN
IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('private.ensure_inventory(uuid)') AND md5(prosrc)='ccc5af71a95193d0301edcb689e225e5' AND proacl::text IS NOT DISTINCT FROM NULL AND proconfig IS NOT DISTINCT FROM NULL::text[] AND pg_get_userbyid(proowner)='postgres' AND prosecdef=false AND provolatile='v' AND proisstrict=false AND proparallel='u') THEN RAISE EXCEPTION 'Pass claim source/dependency/attribute drift: private.ensure_inventory(uuid)';END IF;
IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('public.play_claim_pass(text)') AND md5(prosrc)='f263b2d5038dc28de949e1b1891bd2dc' AND proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}' AND proconfig IS NOT DISTINCT FROM ARRAY['search_path=public']::text[] AND pg_get_userbyid(proowner)='postgres' AND prosecdef=true AND provolatile='v' AND proisstrict=false AND proparallel='u') THEN RAISE EXCEPTION 'Pass claim source/dependency/attribute drift: public.play_claim_pass(text)';END IF;
IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('private.flush_bits_pending(uuid)') AND md5(prosrc)='cb7fc4cf40a53c815c967f3a48d5e4eb' AND proacl::text IS NOT DISTINCT FROM NULL AND proconfig IS NOT DISTINCT FROM NULL::text[] AND pg_get_userbyid(proowner)='postgres' AND prosecdef=false AND provolatile='v' AND proisstrict=false AND proparallel='u') THEN RAISE EXCEPTION 'Pass claim source/dependency/attribute drift: private.flush_bits_pending(uuid)';END IF;
IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('private.grant_items(uuid,jsonb,text,text,text,boolean)') AND md5(prosrc)='79313a404313c34e5224ecdf2622cb6a' AND proacl::text IS NOT DISTINCT FROM NULL AND proconfig IS NOT DISTINCT FROM NULL::text[] AND pg_get_userbyid(proowner)='postgres' AND prosecdef=false AND provolatile='v' AND proisstrict=false AND proparallel='u') THEN RAISE EXCEPTION 'Pass claim source/dependency/attribute drift: private.grant_items(uuid,jsonb,text,text,text,boolean)';END IF;
END $guard$;
CREATE OR REPLACE FUNCTION public.play_claim_pass(p_kind text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  uid uuid := auth.uid();
  inv public.inventories;
  pass boolean;
  grants jsonb;
begin
  if uid is null then raise exception 'Sign in first.' using errcode = '42501'; end if;
  select starlight_pass into pass from public.profiles where id = uid;
  if not coalesce(pass, false) then raise exception 'Starlight Pass is required. Subscribe on Twitch, then check your pass.'; end if;
  perform private.ensure_inventory(uid);
  select * into inv from public.inventories where user_id = uid for update;
  if p_kind = 'daily' then
    if inv.pass_daily_at is not null and inv.pass_daily_at > now() - interval '20 hours' then
      raise exception 'Daily Pass gift is not ready yet.';
    end if;
    grants := private.pass_reward_grants('daily');
    update public.inventories set pass_daily_at = now(), updated_at = now() where user_id = uid;
    begin
      perform private.grant_items(
        uid, grants, 'DAILY_REWARD', 'pass-daily',
        'pass-daily:' || uid::text || ':' || to_char(private.app_today(), 'YYYY-MM-DD'), true
      );
    exception when others then
      update public.inventories set pass_daily_at = inv.pass_daily_at, updated_at = now() where user_id = uid;
      raise;
    end;
    return private.play_snapshot(uid) || jsonb_build_object('ok', true, 'grants', grants, 'message', 'Daily Pass gift: ' || private.grant_summary(grants) || '.');
  end if;
  if p_kind = 'weekly' then
    if inv.pass_weekly_at is not null and inv.pass_weekly_at > now() - interval '6 days' then
      raise exception 'Weekly Pass crate is not ready yet.';
    end if;
    grants := private.pass_reward_grants('weekly');
    update public.inventories set pass_weekly_at = now(), updated_at = now() where user_id = uid;
    begin
      perform private.grant_items(
        uid, grants, 'DAILY_REWARD', 'pass-weekly',
        'pass-weekly:' || uid::text || ':' || to_char(now(), 'IYYY-IW'), true
      );
    exception when others then
      update public.inventories set pass_weekly_at = inv.pass_weekly_at, updated_at = now() where user_id = uid;
      raise;
    end;
    return private.play_snapshot(uid) || jsonb_build_object('ok', true, 'grants', grants, 'message', 'Weekly Pass crate: ' || private.grant_summary(grants) || '.');
  end if;
  raise exception 'Unknown Pass gift.';
end;
$function$
;COMMIT;
