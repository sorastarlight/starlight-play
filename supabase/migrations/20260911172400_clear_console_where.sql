-- safeupdate blocks DELETE without a WHERE clause.

create or replace function public.admin_clear_console()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  perform private.require_hub();
  delete from public.play_console_log where id is not null;
  delete from public.encounter_activity where id is not null;
  return private.admin_overview() || jsonb_build_object(
    'ok', true,
    'message', 'Public encounter log cleared.',
    'console', private.play_console_json(250)
  );
end;
$$;

revoke all on function public.admin_clear_console() from public, anon;
grant execute on function public.admin_clear_console() to authenticated;
