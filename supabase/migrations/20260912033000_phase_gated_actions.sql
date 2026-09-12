-- Gate Berry/Honey to Prepare and balls to Throw. Keep results on Play for
-- a minute after reveal. Throwing no longer requires a Berry first.

create or replace function private.prepare_action_ok(r public.encounter_rounds)
returns boolean
language plpgsql
stable
as $$
begin
  if r is null or coalesce(r.cancelled, false) or private.round_paused(r) then
    return false;
  end if;
  return private.round_phase(r) = 'prepare';
end;
$$;

create or replace function public.play_throw(p_item text, p_round_id uuid default null)
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
  stream_item text;
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  if not private.is_throw_ball(p_item) then
    raise exception 'Choose a Poké Ball from your bag.';
  end if;
  r := private.load_play_round(p_round_id);
  if private.round_paused(r) then
    raise exception 'The encounter is paused.';
  end if;
  if not private.throw_action_ok(r) then
    raise exception 'That action is only available during the throw phase.';
  end if;
  if not exists (select 1 from public.encounter_players where round_id = r.id and user_id = uid) then
    raise exception 'You must join this encounter during its join window.';
  end if;
  if exists (select 1 from public.encounter_players where round_id = r.id and user_id = uid and ball is not null) then
    raise exception 'You already used that action. No additional item spent.';
  end if;
  if exists (select 1 from public.encounter_players where round_id = r.id and user_id = uid and result is not null) then
    raise exception 'This encounter already has results.';
  end if;

  perform private.spend_bag_item(uid, p_item);
  stream_item := private.stream_throw_item(p_item);

  if r.source = 'mixitup' then
    select c.twitch_user_id, c.twitch_login into twitch_user, twitch_name from private.current_twitch() c;
    if twitch_user is null or twitch_name is null then
      raise exception 'Sign in with Twitch to throw on the live encounter.';
    end if;
    perform private.enqueue_stream_command('throw', jsonb_build_object('user', twitch_user, 'name', twitch_name, 'item', stream_item));
  end if;

  update public.encounter_players set ball = p_item where round_id = r.id and user_id = uid;
  perform private.log_activity(r.id, uid, 'threw', p_item);
  update public.encounter_rounds
    set last_action = 'A trainer used ' || private.item_label(p_item), updated_at = now()
    where id = r.id;
  return private.play_snapshot(uid, r.id) || jsonb_build_object('ok', true, 'message', 'Your throw is locked in. Results appear at the end of this phase.');
end;
$$;

create or replace function private.round_on_play(r public.encounter_rounds)
returns boolean
language plpgsql
stable
as $$
declare
  grace interval := interval '60 seconds';
  ph text;
begin
  if r is null or coalesce(r.cancelled, false) then
    return false;
  end if;
  if r.paused_at is not null then
    return true;
  end if;
  ph := private.round_phase(r);
  if coalesce(r.hidden, false) and (coalesce(r.resolved, false) or ph in ('reveal', 'closed')) then
    return false;
  end if;
  if r.deadlines is not null then
    return now() < coalesce((r.deadlines->>'reveal')::timestamptz, r.ends_at, '-infinity'::timestamptz) + grace;
  end if;
  return ph <> 'closed';
end;
$$;

grant execute on function public.play_throw(text, uuid) to authenticated, anon;

notify pgrst, 'reload schema';
