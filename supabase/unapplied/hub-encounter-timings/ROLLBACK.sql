do $guard$ begin
if md5(pg_get_functiondef('public.admin_save_game_settings(jsonb)'::regprocedure)) is distinct from '20aa640d1a44223069e955f6598133cf' then raise exception 'Timing rollback source drift';end if;
if md5(pg_get_functiondef('public.admin_encounter_timings_read()'::regprocedure)) is distinct from '21239f220060ead741081d8e6ab0037b' then raise exception 'Timing rollback source drift';end if;
if md5(pg_get_functiondef('public.admin_encounter_timings_save(text,jsonb)'::regprocedure)) is distinct from 'a66bf87c5ceed9158d5e255f051a0f54' then raise exception 'Timing rollback source drift';end if;
if md5(pg_get_functiondef('private.hub_timing_values()'::regprocedure)) is distinct from 'fc36cb2a106ca4c5d876e861093a9431' then raise exception 'Timing rollback source drift';end if;
end $guard$;
CREATE OR REPLACE FUNCTION public.admin_save_game_settings(p_settings jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  next_settings jsonb;
  keys text[] := array['joinSeconds','prepareSeconds','throwSeconds','revealSeconds'];
  k text;
  v numeric;
begin
  if not private.is_play_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  next_settings := coalesce(private.game_settings(), '{}'::jsonb);
  foreach k in array keys
  loop
    v := (p_settings->>k)::numeric;
    if v is null or v < 5 or v > 180 then
      raise exception '% must be between 5 and 180 seconds.', k;
    end if;
    next_settings := jsonb_set(next_settings, array[k], to_jsonb(v));
  end loop;
  update public.site_config
    set game_settings = next_settings, bits_store_enabled = false, updated_at = now()
    where id = 1;
  return private.play_snapshot(auth.uid()) || jsonb_build_object('ok', true, 'message', 'Encounter timings saved. Bits purchases stay off.');
end;
$function$
;
revoke execute on function public.admin_encounter_timings_read(),public.admin_encounter_timings_save(text,jsonb) from public,anon,authenticated;
-- Retain timing audit and stream command records;no settings or queued commands are undone.
