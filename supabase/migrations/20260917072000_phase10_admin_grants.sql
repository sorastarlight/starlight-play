-- Phase 10: admin RPCs must not be executable by anon. Function still checks is_play_admin.

revoke execute on function public.admin_special_event_command(text, jsonb) from public, anon;
revoke execute on function public.admin_special_event_analytics(uuid) from public, anon;
revoke execute on function public.admin_special_event_health() from public, anon;
grant execute on function public.admin_special_event_command(text, jsonb) to authenticated;
grant execute on function public.admin_special_event_analytics(uuid) to authenticated;
grant execute on function public.admin_special_event_health() to authenticated;
