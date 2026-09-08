create or replace function public.play_use_lure()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  uid uuid := auth.uid();
  spent int;
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  update public.inventories
    set lure = lure - 1, lure_armed = true, updated_at = now()
    where user_id = uid and lure > 0 and lure_armed = false;
  get diagnostics spent = row_count;
  if spent = 0 then
    raise exception 'You need a Lure, and only one can be active at a time.';
  end if;
  return private.play_snapshot(uid) || jsonb_build_object(
    'ok', true,
    'message', 'Lure is on. You will automatically join the next encounter when it starts.'
  );
end;
$$;
