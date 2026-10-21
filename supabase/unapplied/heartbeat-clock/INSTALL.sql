-- Guarded function replacement only. No heartbeat invocation or data repair.
begin;
do $guard$
declare p record;
begin
 select *,pg_get_userbyid(proowner) owner_name into p from pg_proc where oid='public.play_heartbeat(integer)'::regprocedure;
 if md5(p.prosrc)<>'5bae000402269cfebe4b2f1ea3c53ba7' or p.proacl::text is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' or not p.prosecdef or p.provolatile<>'v' or p.owner_name<>'postgres' or p.proconfig is distinct from array['search_path=public']::text[] then raise exception 'Heartbeat source/permission drift; stop for review';end if;
end;
$guard$;
-- Proposed only: elapsed server time limits watch credit across all tabs.
CREATE OR REPLACE FUNCTION public.play_heartbeat(p_seconds integer DEFAULT 20)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  uid uuid := auth.uid();
  add_sec int;
  live boolean;
  old_sec bigint;
  new_sec bigint;
  gained int := 0;
  prior_at timestamptz;
  server_at timestamptz;
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  select coalesce(watch_seconds, 0), last_heartbeat_at into old_sec, prior_at
    from public.profiles where id = uid for update;
  if not found then raise exception 'Trainer profile is not ready.' using errcode = '42501'; end if;
  server_at := clock_timestamp();
  add_sec := least(greatest(0, least(coalesce(p_seconds, 0), 45)),
    case when prior_at is null then 0
      else greatest(0, least(45, floor(extract(epoch from server_at - prior_at))))::int end);
  select coalesce(is_live, false) into live from public.stream_status where id = 1;
  new_sec := old_sec + case when live then add_sec else 0 end;
  update public.profiles
    set last_heartbeat_at = greatest(server_at, prior_at),
        last_seen_at = server_at, watch_seconds = new_sec, updated_at = server_at
    where id = uid;
  gained := (new_sec / 180) - (old_sec / 180);
  if gained > 0 then perform private.award_xp(uid, gained); end if;
  return private.play_snapshot(uid) || jsonb_build_object('ok', true, 'watched', live, 'xpGained', gained);
end;
$function$;

do $verify$begin
 if (select md5(prosrc) from pg_proc where oid='public.play_heartbeat(integer)'::regprocedure)<>'2acdcfb54812b9f17d672c27a2404859' then raise exception 'Heartbeat replacement verification failed';end if;
end;$verify$;
commit;
