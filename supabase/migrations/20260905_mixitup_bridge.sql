-- Mix It Up stream bridge: staff hub queues commands, the stream PC runs them.

create table if not exists private.stream_bridge (
  id int primary key default 1 check (id = 1),
  token_hash text,
  seen_at timestamptz,
  last_error text
);

insert into private.stream_bridge (id) values (1)
on conflict (id) do nothing;

create table if not exists public.stream_commands (
  id uuid primary key default gen_random_uuid(),
  action text not null check (action = any (array[
    'start','cancel','hide','resume','refill','settings','join','prepare','throw'
  ])),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status = any (array['pending','running','done','error'])),
  result text not null default '',
  created_by uuid,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  finished_at timestamptz
);

create index if not exists stream_commands_pending_idx
  on public.stream_commands (created_at)
  where status = 'pending';

alter table public.stream_commands enable row level security;

alter table public.encounter_rounds
  add column if not exists source text not null default 'play';

alter table public.encounter_rounds
  drop constraint if exists encounter_rounds_source_check;
alter table public.encounter_rounds
  add constraint encounter_rounds_source_check check (source = any (array['play','mixitup']));

create or replace function private.token_hash(p_token text)
returns text
language sql
immutable
as $$
  select encode(extensions.digest(convert_to(p_token, 'utf8'), 'sha256'), 'hex');
$$;

create or replace function private.bridge_ok(p_token text)
returns boolean
language plpgsql
stable
as $$
declare
  expected text;
begin
  if p_token is null or btrim(p_token) = '' then
    return false;
  end if;
  select token_hash into expected from private.stream_bridge where id = 1;
  return expected is not null and expected = private.token_hash(p_token);
end;
$$;

create or replace function private.enqueue_stream_command(p_action text, p_payload jsonb)
returns uuid
language plpgsql
as $$
declare
  cmd uuid;
  has_token boolean;
begin
  select token_hash is not null into has_token from private.stream_bridge where id = 1;
  if not coalesce(has_token, false) then
    raise exception 'Issue a Mix It Up bridge token in the staff hub, then run the bridge on the stream PC.';
  end if;
  insert into public.stream_commands (action, payload, created_by)
  values (p_action, coalesce(p_payload, '{}'::jsonb), auth.uid())
  returning id into cmd;
  return cmd;
end;
$$;

create or replace function public.admin_queue_stream_command(p_action text, p_payload jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  cmd uuid;
  pending int;
  seen timestamptz;
begin
  if not private.is_play_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_action not in ('start','cancel','hide','resume','refill','settings') then
    raise exception 'Unknown Mix It Up command.';
  end if;
  cmd := private.enqueue_stream_command(p_action, coalesce(p_payload, '{}'::jsonb));
  select count(*)::int into pending from public.stream_commands where status = 'pending';
  select seen_at into seen from private.stream_bridge where id = 1;
  return jsonb_build_object(
    'ok', true,
    'id', cmd,
    'pending', pending,
    'bridgeOnline', seen is not null and seen > now() - interval '8 seconds',
    'message', case
      when seen is not null and seen > now() - interval '8 seconds'
        then 'Sent to Mix It Up on the stream PC.'
      else 'Queued. Open Mix It Up so Application Launch can start the bridge.'
    end
  );
end;
$$;

create or replace function public.admin_issue_bridge_token()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  token text;
begin
  if not private.is_play_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  token := 'play_' || encode(extensions.gen_random_bytes(24), 'hex');
  insert into private.stream_bridge (id, token_hash, last_error)
  values (1, private.token_hash(token), null)
  on conflict (id) do update
    set token_hash = excluded.token_hash, last_error = null;
  return jsonb_build_object(
    'ok', true,
    'token', token,
    'message', 'Copy this token into Data/play-bridge.json on the stream PC. It will not be shown again.'
  );
end;
$$;

create or replace function public.bridge_pull(p_token text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  cmds jsonb;
begin
  if not private.bridge_ok(p_token) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update private.stream_bridge set seen_at = now() where id = 1;

  with next as (
    select id from public.stream_commands
    where status = 'pending'
    order by created_at
    limit 8
    for update skip locked
  ),
  claimed as (
    update public.stream_commands c
      set status = 'running', claimed_at = now()
      from next
      where c.id = next.id
      returning c.id, c.action, c.payload, c.created_at
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', claimed.id,
    'action', claimed.action,
    'payload', claimed.payload
  ) order by claimed.created_at), '[]'::jsonb)
  into cmds
  from claimed;

  return jsonb_build_object('ok', true, 'commands', coalesce(cmds, '[]'::jsonb));
end;
$$;

create or replace function public.bridge_finish(p_token text, p_id uuid, p_ok boolean, p_result text default '')
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not private.bridge_ok(p_token) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.stream_commands
    set status = case when p_ok then 'done' else 'error' end,
        result = left(coalesce(p_result, ''), 500),
        finished_at = now()
    where id = p_id;
  update private.stream_bridge
    set seen_at = now(),
        last_error = case when p_ok then last_error else left(coalesce(p_result, ''), 500) end
    where id = 1;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.bridge_publish(p_token text, p_round jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  source_key text;
  round_id uuid;
begin
  if not private.bridge_ok(p_token) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update private.stream_bridge set seen_at = now() where id = 1;
  if p_round is null or coalesce(p_round->>'id', '') = '' then
    update public.encounter_rounds
      set hidden = true, phase = 'closed', last_action = coalesce(p_round->>'lastAction', last_action), updated_at = now()
      where source = 'mixitup' and coalesce(cancelled, false) = false and phase <> 'closed';
    return jsonb_build_object('ok', true);
  end if;

  source_key := 'mixitup:' || (p_round->>'id');
  insert into public.encounter_rounds (
    source_id, source, phase, hidden, pokemon, dex, name, variant, gender,
    started_at, deadlines, rules, resolved, cancelled, last_action, ends_at, players
  ) values (
    source_key,
    'mixitup',
    coalesce(p_round->>'phase', 'closed'),
    coalesce((p_round->>'hidden')::boolean, false),
    jsonb_build_object(
      'dex', (p_round->>'dex')::int,
      'name', p_round->>'name',
      'variant', coalesce(p_round->>'variant', 'normal'),
      'gender', coalesce(p_round->>'gender', 'Unknown')
    ),
    nullif(p_round->>'dex', '')::int,
    p_round->>'name',
    coalesce(p_round->>'variant', 'normal'),
    coalesce(p_round->>'gender', 'Unknown'),
    nullif(p_round->>'startedAt', '')::timestamptz,
    p_round->'deadlines',
    p_round->'rules',
    coalesce((p_round->>'resolved')::boolean, false),
    coalesce((p_round->>'cancelled')::boolean, false),
    coalesce(p_round->>'lastAction', ''),
    nullif(p_round->>'endsAt', '')::timestamptz,
    '{}'::jsonb
  )
  on conflict (source_id) do update set
    source = 'mixitup',
    phase = excluded.phase,
    hidden = excluded.hidden,
    pokemon = excluded.pokemon,
    dex = excluded.dex,
    name = excluded.name,
    variant = excluded.variant,
    gender = excluded.gender,
    started_at = excluded.started_at,
    deadlines = excluded.deadlines,
    rules = excluded.rules,
    resolved = excluded.resolved,
    cancelled = excluded.cancelled,
    last_action = excluded.last_action,
    ends_at = excluded.ends_at,
    updated_at = now()
  returning id into round_id;
  return jsonb_build_object('ok', true, 'id', round_id);
end;
$$;

create or replace function private.settle_if_needed(r public.encounter_rounds)
returns public.encounter_rounds
language plpgsql
as $$
declare
  rec public.encounter_players%rowtype;
  rules jsonb;
  bait_count int;
  player_count int;
  shared numeric;
  odds numeric;
  roll numeric;
  caught boolean;
begin
  if r is null or r.cancelled or r.resolved or r.source = 'mixitup' then
    return r;
  end if;
  if r.deadlines is null or now() < (r.deadlines->>'throw')::timestamptz then
    return r;
  end if;

  rules := coalesce(r.rules, private.game_settings());
  select count(*)::int, count(*) filter (where prep = 'bait')::int
    into player_count, bait_count
  from public.encounter_players
  where round_id = r.id;
  shared := coalesce((rules->>'maxBaitBonus')::numeric, 0) * bait_count / greatest(player_count, 1);

  for rec in select * from public.encounter_players where round_id = r.id
  loop
    if rec.ball is null then
      update public.encounter_players
        set result = 'No throw', caught = false
        where round_id = rec.round_id and user_id = rec.user_id;
      continue;
    end if;
    odds := least(
      coalesce((rules->>'maxCatchChance')::numeric, 0.9),
      coalesce((rules->'ballChances'->>rec.ball)::numeric, 0)
        + shared
        + case when rec.prep = 'berry' then coalesce((rules->>'berryBonus')::numeric, 0) else 0 end
    );
    roll := random();
    caught := roll < odds;
    update public.encounter_players
      set chance = odds, roll = roll, caught = caught, result = case when caught then 'Caught' else 'Escaped' end
      where round_id = rec.round_id and user_id = rec.user_id;
    if caught then
      insert into public.catches (user_id, dex, name, variant, gender, ball)
      values (rec.user_id, r.dex, r.name, r.variant, r.gender, rec.ball);
    end if;
  end loop;

  update public.encounter_rounds
    set resolved = true, last_action = 'Results locked in', updated_at = now()
    where id = r.id
    returning * into r;
  return r;
end;
$$;

create or replace function private.current_twitch()
returns table(twitch_user_id text, twitch_login text)
language sql
stable
as $$
  select p.twitch_user_id, p.twitch_login
  from public.profiles p
  where p.id = auth.uid();
$$;

create or replace function public.play_join()
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
begin
  if uid is null then
    raise exception 'Sign in to join.' using errcode = '42501';
  end if;
  r := private.sync_latest_round();
  if not private.round_is_active(r) or private.round_phase(r) <> 'join' or r.hidden then
    raise exception 'Joining is closed. Wait for the next encounter.';
  end if;
  insert into public.inventories (user_id)
  values (uid)
  on conflict (user_id) do nothing;
  if exists (select 1 from public.encounter_players where round_id = r.id and user_id = uid) then
    raise exception 'You already joined; no extra items granted.';
  end if;
  if r.source = 'mixitup' then
    select c.twitch_user_id, c.twitch_login into twitch_user, twitch_name from private.current_twitch() c;
    if twitch_user is null or twitch_name is null then
      raise exception 'Sign in with Twitch to join the live Mix It Up encounter.';
    end if;
    perform private.enqueue_stream_command('join', jsonb_build_object('user', twitch_user, 'name', twitch_name));
  end if;
  insert into public.encounter_players (round_id, user_id)
  values (r.id, uid);
  update public.encounter_rounds
    set last_action = 'A trainer joined', updated_at = now()
    where id = r.id;
  return private.play_snapshot(uid) || jsonb_build_object('ok', true, 'message',
    case when r.source = 'mixitup'
      then 'Join sent to Mix It Up. Wait for preparation, then use a Berry or Bait.'
      else 'You joined! Wait for preparation, then use a Berry or Bait.'
    end);
end;
$$;

create or replace function public.play_prepare(p_item text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  r public.encounter_rounds;
  uid uuid := auth.uid();
  spent int;
  twitch_user text;
  twitch_name text;
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  if p_item not in ('berry', 'bait') then
    raise exception 'Use a Berry or Bait during preparation.';
  end if;
  r := private.sync_latest_round();
  if not private.round_is_active(r) or private.round_phase(r) <> 'prepare' or r.hidden then
    raise exception 'That action is only available during the prepare phase.';
  end if;
  if not exists (select 1 from public.encounter_players where round_id = r.id and user_id = uid) then
    raise exception 'You must join this encounter during its join window.';
  end if;
  if exists (select 1 from public.encounter_players where round_id = r.id and user_id = uid and prep is not null) then
    raise exception 'You already used that action. No additional item spent.';
  end if;

  if r.source = 'mixitup' then
    select c.twitch_user_id, c.twitch_login into twitch_user, twitch_name from private.current_twitch() c;
    if twitch_user is null or twitch_name is null then
      raise exception 'Sign in with Twitch to use items on the live Mix It Up encounter.';
    end if;
    perform private.enqueue_stream_command('prepare', jsonb_build_object('user', twitch_user, 'name', twitch_name, 'item', p_item));
  else
    if p_item = 'berry' then
      update public.inventories set berry = berry - 1, updated_at = now()
        where user_id = uid and berry > 0;
    else
      update public.inventories set bait = bait - 1, updated_at = now()
        where user_id = uid and bait > 0;
    end if;
    get diagnostics spent = row_count;
    if spent = 0 then
      raise exception 'You have no % left. No item spent.', private.item_label(p_item);
    end if;
  end if;

  update public.encounter_players set prep = p_item where round_id = r.id and user_id = uid;
  update public.encounter_rounds
    set last_action = 'A trainer used ' || private.item_label(p_item), updated_at = now()
    where id = r.id;
  return private.play_snapshot(uid) || jsonb_build_object('ok', true, 'message', 'Preparation complete. Choose your ball when throws open.');
end;
$$;

create or replace function public.play_throw(p_item text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  r public.encounter_rounds;
  uid uuid := auth.uid();
  spent int;
  twitch_user text;
  twitch_name text;
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  if p_item not in ('pokeball', 'greatball', 'ultraball') then
    raise exception 'Choose a Poké Ball, Great Ball, or Ultra Ball.';
  end if;
  r := private.sync_latest_round();
  if not private.round_is_active(r) or private.round_phase(r) <> 'throw' or r.hidden then
    raise exception 'That action is only available during the throw phase.';
  end if;
  if not exists (select 1 from public.encounter_players where round_id = r.id and user_id = uid) then
    raise exception 'You must join this encounter during its join window.';
  end if;
  if exists (select 1 from public.encounter_players where round_id = r.id and user_id = uid and prep is null) then
    raise exception 'Use a berry or bait during preparation before throwing a ball.';
  end if;
  if exists (select 1 from public.encounter_players where round_id = r.id and user_id = uid and ball is not null) then
    raise exception 'You already used that action. No additional item spent.';
  end if;

  if r.source = 'mixitup' then
    select c.twitch_user_id, c.twitch_login into twitch_user, twitch_name from private.current_twitch() c;
    if twitch_user is null or twitch_name is null then
      raise exception 'Sign in with Twitch to throw on the live Mix It Up encounter.';
    end if;
    perform private.enqueue_stream_command('throw', jsonb_build_object('user', twitch_user, 'name', twitch_name, 'item', p_item));
  else
    if p_item = 'pokeball' then
      update public.inventories set pokeball = pokeball - 1, updated_at = now()
        where user_id = uid and pokeball > 0;
    elsif p_item = 'greatball' then
      update public.inventories set greatball = greatball - 1, updated_at = now()
        where user_id = uid and greatball > 0;
    else
      update public.inventories set ultraball = ultraball - 1, updated_at = now()
        where user_id = uid and ultraball > 0;
    end if;
    get diagnostics spent = row_count;
    if spent = 0 then
      raise exception 'You have no % left. No item spent.', private.item_label(p_item);
    end if;
  end if;

  update public.encounter_players set ball = p_item where round_id = r.id and user_id = uid;
  update public.encounter_rounds
    set last_action = 'A trainer used ' || private.item_label(p_item), updated_at = now()
    where id = r.id;
  return private.play_snapshot(uid) || jsonb_build_object('ok', true, 'message', 'Your throw is locked in. Results appear at the end of this phase.');
end;
$$;

create or replace function private.admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  r public.encounter_rounds;
  cfg public.site_config%rowtype;
  seen timestamptz;
  has_token boolean;
  pending int;
  last_err text;
begin
  if not private.is_play_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  r := private.latest_round();
  select * into cfg from public.site_config where id = 1;
  select b.seen_at, b.token_hash is not null, b.last_error
    into seen, has_token, last_err
    from private.stream_bridge b where b.id = 1;
  select count(*)::int into pending from public.stream_commands where status in ('pending','running');
  return jsonb_build_object(
    'trainers', (select count(*)::int from public.profiles),
    'passes', (select count(*)::int from public.profiles where starlight_pass),
    'channel', cfg.broadcaster_twitch_login,
    'twitchClientId', cfg.twitch_client_id,
    'twitchBroadcasterId', cfg.twitch_broadcaster_id,
    'live', (select is_live from public.stream_status where id = 1),
    'settings', cfg.game_settings,
    'bitsStoreEnabled', false,
    'round', private.public_round_json(r),
    'bridge', jsonb_build_object(
      'configured', coalesce(has_token, false),
      'online', seen is not null and seen > now() - interval '8 seconds',
      'seenAt', seen,
      'pending', coalesce(pending, 0),
      'lastError', last_err
    )
  );
end;
$$;

create or replace function private.public_round_json(r public.encounter_rounds)
returns jsonb
language plpgsql
stable
as $$
declare
  ph text;
  participants int;
  prepared int;
  thrown int;
  bait_count int;
  rules jsonb;
  shared numeric;
begin
  if r is null then
    return null;
  end if;
  ph := private.round_phase(r);
  rules := coalesce(r.rules, private.game_settings());
  select
    count(*)::int,
    count(*) filter (where prep is not null)::int,
    count(*) filter (where ball is not null)::int,
    count(*) filter (where prep = 'bait')::int
  into participants, prepared, thrown, bait_count
  from public.encounter_players
  where round_id = r.id;
  shared := coalesce((rules->>'maxBaitBonus')::numeric, 0) * bait_count / greatest(participants, 1);

  return jsonb_build_object(
    'id', r.id,
    'source', r.source,
    'phase', ph,
    'hidden', r.hidden,
    'cancelled', r.cancelled,
    'resolved', r.resolved,
    'dex', r.dex,
    'name', r.name,
    'variant', r.variant,
    'gender', r.gender,
    'startedAt', r.started_at,
    'endsAt', private.phase_ends_at(r, ph),
    'deadlines', r.deadlines,
    'participants', participants,
    'prepared', prepared,
    'thrown', thrown,
    'baitBonusPercent', round(100 * shared, 1),
    'lastAction', r.last_action,
    'results', case when r.resolved then (
      select jsonb_build_object(
        'caught', count(*) filter (where caught)::int,
        'escaped', count(*) filter (where result = 'Escaped')::int,
        'noThrow', count(*) filter (where coalesce(result, '') = 'No throw')::int
      )
      from public.encounter_players
      where round_id = r.id
    ) else null end
  );
end;
$$;

grant execute on function public.admin_queue_stream_command(text, jsonb) to authenticated;
grant execute on function public.admin_issue_bridge_token() to authenticated;
grant execute on function public.bridge_pull(text) to anon, authenticated;
grant execute on function public.bridge_finish(text, uuid, boolean, text) to anon, authenticated;
grant execute on function public.bridge_publish(text, jsonb) to anon, authenticated;
grant execute on function public.play_join() to authenticated;
grant execute on function public.play_prepare(text) to authenticated;
grant execute on function public.play_throw(text) to authenticated;
grant execute on function public.admin_overview() to authenticated;

