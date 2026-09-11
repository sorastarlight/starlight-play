-- Join the encounter currently on screen, not a second lookup that can miss overlay-hidden rows.
-- Also treat the join window from deadlines so Play's Join button and the RPC agree.

create or replace function private.load_play_round(p_round_id uuid default null)
returns public.encounter_rounds
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  r public.encounter_rounds;
begin
  perform set_config('row_security', 'off', true);
  if p_round_id is not null then
    select x.* into r from public.encounter_rounds x where x.id = p_round_id;
    if r is not null then
      return r;
    end if;
  end if;
  select x.* into r
  from public.encounter_rounds x
  where coalesce(x.cancelled, false) = false
    and x.deadlines is not null
    and now() < coalesce((x.deadlines->>'reveal')::timestamptz, x.ends_at, '-infinity'::timestamptz)
  order by coalesce(x.started_at, x.updated_at) desc
  limit 1;
  if r is null then
    select x.* into r
    from public.encounter_rounds x
    order by coalesce(x.started_at, x.updated_at) desc, x.updated_at desc
    limit 1;
  end if;
  return r;
end;
$$;

create or replace function private.join_window_open(r public.encounter_rounds)
returns boolean
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  if r is null or coalesce(r.cancelled, false) then
    return false;
  end if;
  if private.round_paused(r) then
    return false;
  end if;
  if r.deadlines is not null then
    return now() < coalesce((r.deadlines->>'prepare')::timestamptz, (r.deadlines->>'join')::timestamptz);
  end if;
  return private.round_phase(r) in ('join', 'prepare');
end;
$$;

create or replace function private.play_action_round()
returns public.encounter_rounds
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  return private.load_play_round(null);
end;
$$;

drop policy if exists "public can read visible rounds" on public.encounter_rounds;
create policy "public can read visible rounds"
  on public.encounter_rounds
  for select
  using (
    hidden = false
    or coalesce(cancelled, false) = false
  );

drop function if exists public.play_join();
drop function if exists public.play_join(uuid);

create function public.play_join(p_round_id uuid default null)
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
    return private.play_snapshot(uid) || jsonb_build_object('ok', true, 'message', 'You already joined. Wait for preparation, then use a Berry or Honey.');
  end if;
  insert into public.encounter_players (round_id, user_id) values (r.id, uid);
  perform private.log_activity(r.id, uid, 'joined', null);
  update public.encounter_rounds set last_action = 'A trainer joined', updated_at = now() where id = r.id;
  return private.play_snapshot(uid) || jsonb_build_object('ok', true, 'message', 'You joined! Wait for preparation, then use a Berry or Honey.');
end;
$$;

drop function if exists public.play_prepare(text);
create function public.play_prepare(p_item text, p_round_id uuid default null)
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
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  if p_item not in ('berry', 'bait') then
    raise exception 'Use a Berry or Honey during preparation.';
  end if;
  r := private.load_play_round(p_round_id);
  if private.round_paused(r) then
    raise exception 'The encounter is paused.';
  end if;
  ph := private.round_phase(r);
  if ph <> 'prepare' and r.deadlines is not null and now() >= (r.deadlines->>'join')::timestamptz and now() < (r.deadlines->>'prepare')::timestamptz then
    ph := 'prepare';
  end if;
  if ph <> 'prepare' then
    raise exception 'That action is only available during the prepare phase.';
  end if;
  if not exists (select 1 from public.encounter_players where round_id = r.id and user_id = uid) then
    raise exception 'You must join this encounter during its join window.';
  end if;
  if exists (select 1 from public.encounter_players where round_id = r.id and user_id = uid and prep is not null) then
    raise exception 'You already used that action. No additional item spent.';
  end if;
  perform private.spend_bag_item(uid, p_item);
  if r.source = 'mixitup' then
    select c.twitch_user_id, c.twitch_login into twitch_user, twitch_name from private.current_twitch() c;
    if twitch_user is null or twitch_name is null then
      raise exception 'Sign in with Twitch to use items on the live encounter.';
    end if;
    perform private.enqueue_stream_command('prepare', jsonb_build_object('user', twitch_user, 'name', twitch_name, 'item', p_item));
  end if;
  update public.encounter_players set prep = p_item where round_id = r.id and user_id = uid;
  perform private.log_activity(r.id, uid, 'prepared', p_item);
  update public.encounter_rounds
    set last_action = 'A trainer used ' || private.item_label(p_item), updated_at = now()
    where id = r.id;
  return private.play_snapshot(uid) || jsonb_build_object('ok', true, 'message', 'Preparation complete. Choose your ball when throws open.');
end;
$$;

drop function if exists public.play_throw(text);
create function public.play_throw(p_item text, p_round_id uuid default null)
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
  ph text;
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
  ph := private.round_phase(r);
  if ph <> 'throw' and r.deadlines is not null and now() >= (r.deadlines->>'prepare')::timestamptz and now() < (r.deadlines->>'throw')::timestamptz then
    ph := 'throw';
  end if;
  if ph <> 'throw' then
    raise exception 'That action is only available during the throw phase.';
  end if;
  if not exists (select 1 from public.encounter_players where round_id = r.id and user_id = uid) then
    raise exception 'You must join this encounter during its join window.';
  end if;
  if exists (select 1 from public.encounter_players where round_id = r.id and user_id = uid and prep is null) then
    raise exception 'Use a Berry or Honey during preparation before throwing a ball.';
  end if;
  if exists (select 1 from public.encounter_players where round_id = r.id and user_id = uid and ball is not null) then
    raise exception 'You already used that action. No additional item spent.';
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
  return private.play_snapshot(uid) || jsonb_build_object('ok', true, 'message', 'Your throw is locked in. Results appear at the end of this phase.');
end;
$$;

grant execute on function public.play_join(uuid) to authenticated, anon;
grant execute on function public.play_prepare(text, uuid) to authenticated, anon;
grant execute on function public.play_throw(text, uuid) to authenticated, anon;

create or replace function public.bridge_publish(p_token text, p_round jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  source_key text;
  round_id uuid;
  rec record;
  v_phase text;
  v_hidden boolean;
  v_cancelled boolean;
begin
  if not private.bridge_ok(p_token) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update private.stream_bridge set seen_at = now() where id = 1;
  if p_round is null or coalesce(p_round->>'id', '') = '' then
    update public.encounter_rounds
      set hidden = true, phase = 'closed', last_action = coalesce(p_round->>'lastAction', last_action), updated_at = now()
      where source = 'mixitup'
        and coalesce(cancelled, false) = false
        and phase <> 'closed'
        and (
          deadlines is null
          or coalesce((deadlines->>'reveal')::timestamptz, '-infinity'::timestamptz) <= now()
        );
    return jsonb_build_object('ok', true);
  end if;
  v_phase := coalesce(p_round->>'phase', 'closed');
  v_cancelled := coalesce((p_round->>'cancelled')::boolean, false);
  v_hidden := coalesce((p_round->>'hidden')::boolean, false);
  if not v_cancelled then
    v_hidden := false;
  end if;
  source_key := 'mixitup:' || (p_round->>'id');
  insert into public.encounter_rounds (
    source_id, source, phase, hidden, pokemon, dex, name, variant, gender,
    started_at, deadlines, rules, resolved, cancelled, last_action, ends_at, players
  ) values (
    source_key, 'mixitup', v_phase,
    v_hidden,
    jsonb_build_object('dex', (p_round->>'dex')::int, 'name', p_round->>'name', 'variant', coalesce(p_round->>'variant', 'normal'), 'gender', coalesce(p_round->>'gender', 'Unknown')),
    nullif(p_round->>'dex', '')::int, p_round->>'name', coalesce(p_round->>'variant', 'normal'), coalesce(p_round->>'gender', 'Unknown'),
    nullif(p_round->>'startedAt', '')::timestamptz, p_round->'deadlines', p_round->'rules',
    coalesce((p_round->>'resolved')::boolean, false), v_cancelled,
    coalesce(p_round->>'lastAction', ''), nullif(p_round->>'endsAt', '')::timestamptz, '{}'::jsonb
  )
  on conflict (source_id) do update set
    source = 'mixitup', phase = excluded.phase, hidden = excluded.hidden, pokemon = excluded.pokemon,
    dex = excluded.dex, name = excluded.name, variant = excluded.variant, gender = excluded.gender,
    started_at = excluded.started_at, deadlines = excluded.deadlines, rules = excluded.rules,
    resolved = excluded.resolved, cancelled = excluded.cancelled, last_action = excluded.last_action,
    ends_at = excluded.ends_at, updated_at = now()
  returning id into round_id;
  if coalesce((p_round->>'resolved')::boolean, false) then
    for rec in select value from jsonb_array_elements(coalesce(p_round->'results', '[]'::jsonb)) as t(value)
    loop
      if coalesce((rec.value->>'caught')::boolean, false) then
        perform private.record_stream_catch(
          rec.value->>'user', rec.value->>'name', nullif(p_round->>'dex', '')::int, p_round->>'name',
          coalesce(p_round->>'variant', 'normal'), coalesce(p_round->>'gender', 'Unknown'), rec.value->>'ball',
          round_id, 'mixitup:' || (p_round->>'id') || ':' || coalesce(rec.value->>'user', rec.value->>'name', ''), now()
        );
      end if;
    end loop;
  end if;
  return jsonb_build_object('ok', true, 'id', round_id);
end;
$$;

notify pgrst, 'reload schema';
