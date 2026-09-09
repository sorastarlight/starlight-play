-- Cancel Encounter: clear the live Play round immediately. Items still go back to bags.

create or replace function public.admin_cancel_round()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  r public.encounter_rounds;
  rec public.encounter_players%rowtype;
begin
  if not private.is_play_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  r := private.sync_latest_round();
  if r is null or r.cancelled then
    raise exception 'No encounter to cancel.';
  end if;
  if not r.resolved then
    for rec in select * from public.encounter_players where round_id = r.id
    loop
      if rec.prep = 'berry' then
        update public.inventories set berry = berry + 1, updated_at = now() where user_id = rec.user_id;
      elsif rec.prep = 'bait' then
        update public.inventories set bait = bait + 1, updated_at = now() where user_id = rec.user_id;
      end if;
      if rec.ball = 'pokeball' then
        update public.inventories set pokeball = pokeball + 1, updated_at = now() where user_id = rec.user_id;
      elsif rec.ball = 'greatball' then
        update public.inventories set greatball = greatball + 1, updated_at = now() where user_id = rec.user_id;
      elsif rec.ball = 'ultraball' then
        update public.inventories set ultraball = ultraball + 1, updated_at = now() where user_id = rec.user_id;
      end if;
    end loop;
  end if;
  update public.encounter_rounds
    set cancelled = true, hidden = true, phase = 'closed', last_action = 'Encounter cancelled', updated_at = now()
    where id = r.id;
  return private.play_snapshot(auth.uid()) || jsonb_build_object('ok', true, 'message', 'Encounter cancelled.');
end;
$$;

grant execute on function public.admin_cancel_round() to authenticated;
