create or replace function public.play_join(p_round_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  r public.encounter_rounds;
  uid uuid := auth.uid();
  twitch_user text;
  twitch_name text;
  ph text;
  already boolean;
begin
  if uid is null then
    raise exception 'Sign in to join.' using errcode = '42501';
  end if;
  r := private.load_play_round(p_round_id);
  if private.round_paused(r) then
    raise exception 'The encounter is paused.';
  end if;
  if not private.join_window_open(r) then
    raise exception 'Joining is closed. Wait for the next encounter.';
  end if;
  ph := private.round_phase(r);
  if ph not in ('join', 'prepare') then
    ph := case
      when r.deadlines is not null and now() < (r.deadlines->>'join')::timestamptz then 'join'
      else 'prepare'
    end;
  end if;
  insert into public.inventories (user_id) values (uid) on conflict (user_id) do nothing;
  perform private.mark_seen(uid, r.dex);
  already := exists (select 1 from public.encounter_players where round_id = r.id and user_id = uid);
  if r.source = 'mixitup' then
    select c.twitch_user_id, c.twitch_login into twitch_user, twitch_name from private.current_twitch() c;
    if twitch_user is null or twitch_name is null then
      raise exception 'Sign in with Twitch to join the live encounter.';
    end if;
    if not already or ph = 'prepare' then
      perform private.enqueue_stream_command('join', jsonb_build_object('user', twitch_user, 'name', twitch_name));
    end if;
  end if;
  if already then
    return private.play_snapshot(uid, r.id) || jsonb_build_object('ok', true, 'message', 'You already joined the encounter! Wait for the next phase, and then use either a Berry or Honey.');
  end if;
  insert into public.encounter_players (round_id, user_id) values (r.id, uid);
  perform private.log_activity(r.id, uid, 'joined', null);
  update public.encounter_rounds set last_action = 'A trainer joined', updated_at = now() where id = r.id;
  return private.play_snapshot(uid, r.id) || jsonb_build_object('ok', true, 'message', 'You joined the encounter! Wait for the next phase, and then use either a Berry or Honey.');
end;
$$;

grant execute on function public.play_join(uuid) to authenticated, anon;

notify pgrst, 'reload schema';
