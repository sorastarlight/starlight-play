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
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  add_sec := greatest(0, least(coalesce(p_seconds, 0), 45));
  select coalesce(is_live, false) into live from public.stream_status where id = 1;
  select coalesce(watch_seconds, 0) into old_sec from public.profiles where id = uid;
  new_sec := coalesce(old_sec, 0) + case when live then add_sec else 0 end;
  update public.profiles
    set last_heartbeat_at = now(),
        last_seen_at = now(),
        watch_seconds = new_sec,
        updated_at = now()
    where id = uid;
  gained := (new_sec / 180) - (coalesce(old_sec, 0) / 180);
  if gained > 0 then
    perform private.award_xp(uid, gained);
  end if;
  return private.play_snapshot(uid) || jsonb_build_object('ok', true, 'watched', live, 'xpGained', gained);
end;
$function$;
