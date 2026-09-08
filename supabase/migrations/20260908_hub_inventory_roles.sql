-- Inventory spend on live encounters, refill, Honey labels, staff roles, live activity.

create or replace function private.item_label(item text)
returns text
language sql
immutable
as $$
  select case item
    when 'berry' then 'Berry'
    when 'bait' then 'Honey'
    when 'pokeball' then 'Poké Ball'
    when 'greatball' then 'Great Ball'
    when 'ultraball' then 'Ultra Ball'
    when 'lure' then 'Lure'
    else coalesce(item, '')
  end;
$$;

create or replace function private.play_staff_role(p_uid uuid default auth.uid())
returns text
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  login text;
  channel text;
  assigned text;
begin
  if p_uid is null then
    return null;
  end if;
  select c.broadcaster_twitch_login into channel from public.site_config c where c.id = 1;
  select coalesce(i.identity_data->>'preferred_username', i.identity_data->>'nickname')
    into login
    from auth.identities i
    where i.user_id = p_uid and i.provider = 'twitch'
    limit 1;
  if channel is not null and btrim(channel) <> '' and login is not null and lower(login) = lower(channel) then
    return 'owner';
  end if;
  select r.role into assigned from public.staff_roles r where r.user_id = p_uid;
  if assigned = 'staff' then
    return 'moderator';
  end if;
  return assigned;
end;
$$;

create or replace function private.is_play_admin()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select private.play_staff_role(auth.uid()) is not null;
$$;

create or replace function private.can_manage_secrets()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select private.play_staff_role(auth.uid()) = 'owner';
$$;

create or replace function private.require_hub()
returns void
language plpgsql
stable
as $$
begin
  if not private.is_play_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
end;
$$;

create or replace function private.require_owner()
returns void
language plpgsql
stable
as $$
begin
  if not private.can_manage_secrets() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
end;
$$;

alter table public.staff_roles drop constraint if exists staff_roles_role_check;
update public.staff_roles set role = 'moderator' where role = 'staff';
alter table public.staff_roles
  add constraint staff_roles_role_check check (role = any (array['owner'::text, 'admin'::text, 'moderator'::text]));

create table if not exists public.encounter_activity (
  id bigint generated always as identity primary key,
  round_id uuid not null references public.encounter_rounds(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  display_name text not null,
  kind text not null check (kind = any (array['joined'::text, 'prepared'::text, 'threw'::text])),
  item text,
  created_at timestamptz not null default now()
);
create index if not exists encounter_activity_round_idx on public.encounter_activity (round_id, created_at desc);
alter table public.encounter_activity enable row level security;
drop policy if exists "anyone can read encounter activity" on public.encounter_activity;
create policy "anyone can read encounter activity"
  on public.encounter_activity for select
  using (true);
grant select on public.encounter_activity to anon, authenticated;

create or replace function private.trainer_label(p_uid uuid)
returns text
language sql
stable
as $$
  select coalesce(nullif(btrim(p.display_name), ''), nullif(p.twitch_login, ''), 'Trainer')
  from public.profiles p
  where p.id = p_uid;
$$;

create or replace function private.log_activity(p_round uuid, p_uid uuid, p_kind text, p_item text default null)
returns void
language plpgsql
as $$
begin
  insert into public.encounter_activity (round_id, user_id, display_name, kind, item)
  values (p_round, p_uid, coalesce(private.trainer_label(p_uid), 'Trainer'), p_kind, p_item);
end;
$$;

create or replace function private.spend_bag_item(p_uid uuid, p_item text)
returns void
language plpgsql
as $$
declare
  spent int;
begin
  if p_item = 'berry' then
    update public.inventories set berry = berry - 1, updated_at = now()
      where user_id = p_uid and berry > 0;
  elsif p_item = 'bait' then
    update public.inventories set bait = bait - 1, updated_at = now()
      where user_id = p_uid and bait > 0;
  elsif p_item = 'pokeball' then
    update public.inventories set pokeball = pokeball - 1, updated_at = now()
      where user_id = p_uid and pokeball > 0;
  elsif p_item = 'greatball' then
    update public.inventories set greatball = greatball - 1, updated_at = now()
      where user_id = p_uid and greatball > 0;
  elsif p_item = 'ultraball' then
    update public.inventories set ultraball = ultraball - 1, updated_at = now()
      where user_id = p_uid and ultraball > 0;
  else
    raise exception 'Unknown item.';
  end if;
  get diagnostics spent = row_count;
  if spent = 0 then
    raise exception 'You have no % left. No item spent.', private.item_label(p_item);
  end if;
end;
$$;

create or replace function private.public_round_json(r encounter_rounds)
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
  activity jsonb;
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
  select coalesce(jsonb_agg(row_to_json(x)::jsonb), '[]'::jsonb)
    into activity
    from (
      select a.display_name as name, a.kind, a.item, a.created_at as at
      from public.encounter_activity a
      where a.round_id = r.id
      order by a.created_at desc, a.id desc
      limit 40
    ) x;

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
    'activity', activity,
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

create or replace function private.play_snapshot(p_uid uuid)
returns jsonb
language plpgsql
as $$
declare
  r public.encounter_rounds;
  bag jsonb;
  me jsonb;
  pass jsonb;
  settings jsonb;
  is_admin boolean;
  staff_role text;
  visible jsonb;
  inv public.inventories;
begin
  r := private.sync_latest_round();
  staff_role := case when p_uid is not null then private.play_staff_role(p_uid) else null end;
  is_admin := staff_role is not null;
  settings := private.game_settings();
  if p_uid is not null then
    perform private.ensure_broadcaster_pass(p_uid);
    inv := private.ensure_inventory(p_uid);
    if r is not null and coalesce(r.cancelled, false) = false and private.round_phase(r) <> 'closed' then
      perform private.mark_seen(p_uid, r.dex);
    end if;
    bag := jsonb_build_object(
      'berry', inv.berry, 'bait', inv.bait, 'pokeball', inv.pokeball,
      'greatball', inv.greatball, 'ultraball', inv.ultraball,
      'lure', inv.lure, 'coins', inv.coins,
      'capacity', private.bag_capacity(p_uid),
      'used', private.item_total(inv),
      'lureArmed', inv.lure_armed
    );
    select jsonb_build_object('active', p.starlight_pass, 'source', p.pass_source, 'checkedAt', p.pass_checked_at)
      into pass from public.profiles p where p.id = p_uid;
    if r is not null then
      select jsonb_build_object('joined', true, 'prep', ep.prep, 'ball', ep.ball, 'result', ep.result, 'chance', ep.chance, 'caught', ep.caught)
        into me from public.encounter_players ep where ep.round_id = r.id and ep.user_id = p_uid;
    end if;
  end if;
  if r is not null and (not r.hidden or is_admin) then
    visible := private.public_round_json(r);
  end if;
  return jsonb_build_object(
    'round', visible,
    'me', me,
    'bag', bag,
    'pass', pass,
    'trainer', private.trainer_card(p_uid),
    'isAdmin', is_admin,
    'staffRole', staff_role,
    'canManageSecrets', staff_role = 'owner',
    'settings', jsonb_build_object(
      'joinSeconds', settings->>'joinSeconds',
      'prepareSeconds', settings->>'prepareSeconds',
      'throwSeconds', settings->>'throwSeconds',
      'revealSeconds', settings->>'revealSeconds',
      'ballChances', settings->'ballChances',
      'berryBonus', settings->'berryBonus',
      'maxBaitBonus', settings->'maxBaitBonus',
      'maxCatchChance', settings->'maxCatchChance'
    ),
    'channel', (select broadcaster_twitch_login from public.site_config where id = 1),
    'bitsStoreEnabled', false,
    'bitsCatalogEnabled', true,
    'coinShopEnabled', true,
    'live', (select is_live from public.stream_status where id = 1)
  );
end;
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
  ph text;
  already boolean;
begin
  if uid is null then
    raise exception 'Sign in to join.' using errcode = '42501';
  end if;
  r := private.sync_latest_round();
  ph := private.round_phase(r);
  if not private.round_is_active(r) or ph not in ('join', 'prepare') or r.hidden then
    raise exception 'Joining is closed. Wait for the next encounter.';
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

create or replace function public.play_prepare(p_item text)
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
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  if p_item not in ('berry', 'bait') then
    raise exception 'Use a Berry or Honey during preparation.';
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

create or replace function public.play_throw(p_item text)
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
    raise exception 'Use a Berry or Honey during preparation before throwing a ball.';
  end if;
  if exists (select 1 from public.encounter_players where round_id = r.id and user_id = uid and ball is not null) then
    raise exception 'You already used that action. No additional item spent.';
  end if;

  perform private.spend_bag_item(uid, p_item);

  if r.source = 'mixitup' then
    select c.twitch_user_id, c.twitch_login into twitch_user, twitch_name from private.current_twitch() c;
    if twitch_user is null or twitch_name is null then
      raise exception 'Sign in with Twitch to throw on the live encounter.';
    end if;
    perform private.enqueue_stream_command('throw', jsonb_build_object('user', twitch_user, 'name', twitch_name, 'item', p_item));
  end if;

  update public.encounter_players set ball = p_item where round_id = r.id and user_id = uid;
  perform private.log_activity(r.id, uid, 'threw', p_item);
  update public.encounter_rounds
    set last_action = 'A trainer used ' || private.item_label(p_item), updated_at = now()
    where id = r.id;
  return private.play_snapshot(uid) || jsonb_build_object('ok', true, 'message', 'Your throw is locked in. Results appear at the end of this phase.');
end;
$$;

create or replace function public.admin_refill_test()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  settings jsonb;
  changed int;
begin
  perform private.require_hub();
  settings := private.game_settings();
  update public.inventories i
    set berry = greatest(i.berry, coalesce((settings->'starterItems'->>'berry')::int, 10)),
        bait = greatest(i.bait, coalesce((settings->'starterItems'->>'bait')::int, 10)),
        pokeball = greatest(i.pokeball, coalesce((settings->'starterItems'->>'pokeball')::int, 10)),
        greatball = greatest(i.greatball, coalesce((settings->'starterItems'->>'greatball')::int, 5)),
        ultraball = greatest(i.ultraball, coalesce((settings->'starterItems'->>'ultraball')::int, 3)),
        updated_at = now();
  get diagnostics changed = row_count;
  return private.play_snapshot(auth.uid()) || jsonb_build_object(
    'ok', true,
    'message', format('Free test refill: topped up %s trainer bag(s). Collections were left alone.', changed)
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
  perform private.require_owner();
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

create or replace function public.admin_save_channel(p_login text, p_client_id text default null, p_broadcaster_id text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  perform private.require_owner();
  update public.site_config
    set broadcaster_twitch_login = lower(btrim(coalesce(p_login, ''))),
        twitch_client_id = coalesce(p_client_id, twitch_client_id),
        twitch_broadcaster_id = coalesce(p_broadcaster_id, twitch_broadcaster_id),
        updated_at = now()
    where id = 1;
  return private.play_snapshot(auth.uid()) || jsonb_build_object('ok', true, 'message', 'Stream channel settings saved.');
end;
$$;

create or replace function public.admin_save_twitch_client_secret(p_secret text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  perform private.require_owner();
  if btrim(coalesce(p_secret, '')) = '' then
    raise exception 'Paste the Play Twitch Client Secret from the Starlight Play app.';
  end if;
  update private.stream_bridge
    set twitch_client_secret = btrim(p_secret)
    where id = 1;
  return jsonb_build_object('ok', true, 'message', 'Play Twitch Client Secret saved. It will not be shown again.');
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
  bits_status text;
  bits_at timestamptz;
  bits_last timestamptz;
  bits_detail text;
  bits_waiting int;
  has_app_secret boolean;
  staff_role text;
  secrets boolean;
begin
  perform private.require_hub();
  staff_role := private.play_staff_role();
  secrets := staff_role = 'owner';
  r := private.latest_round();
  select * into cfg from public.site_config where id = 1;
  select b.seen_at, b.token_hash is not null, b.last_error,
         b.eventsub_status, b.eventsub_connected_at, b.last_bits_at, b.last_bits_detail,
         b.twitch_client_secret is not null and btrim(b.twitch_client_secret) <> ''
    into seen, has_token, last_err, bits_status, bits_at, bits_last, bits_detail, has_app_secret
    from private.stream_bridge b where b.id = 1;
  select count(*)::int into pending from public.stream_commands where status in ('pending','running');
  select count(*)::int into bits_waiting from private.bits_pending;
  return jsonb_build_object(
    'trainers', (select count(*)::int from public.profiles),
    'passes', (select count(*)::int from public.profiles where starlight_pass),
    'channel', cfg.broadcaster_twitch_login,
    'twitchClientId', case when secrets then cfg.twitch_client_id else null end,
    'twitchBroadcasterId', case when secrets then cfg.twitch_broadcaster_id else null end,
    'twitchClientSecretSaved', case when secrets then coalesce(has_app_secret, false) else null end,
    'live', (select is_live from public.stream_status where id = 1),
    'settings', cfg.game_settings,
    'bitsStoreEnabled', false,
    'staffRole', staff_role,
    'canManageSecrets', secrets,
    'round', private.public_round_json(r),
    'bridge', jsonb_build_object(
      'configured', coalesce(has_token, false),
      'online', seen is not null and seen > now() - interval '8 seconds',
      'seenAt', seen,
      'pending', coalesce(pending, 0),
      'lastError', last_err
    ),
    'bitsAuto', jsonb_build_object(
      'connected', coalesce(bits_status, '') = 'enabled',
      'status', bits_status,
      'connectedAt', bits_at,
      'lastAt', bits_last,
      'lastDetail', bits_detail,
      'pending', coalesce(bits_waiting, 0),
      'needsAppSecret', not coalesce(has_app_secret, false)
    )
  );
end;
$$;

create or replace function public.admin_list_users(p_query text default '', p_offset int default 0)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  q text := lower(btrim(coalesce(p_query, '')));
  start_at int := greatest(coalesce(p_offset, 0), 0);
  rows jsonb;
  total int;
begin
  perform private.require_hub();
  select count(*)::int into total from public.profiles p
    where q = '' or lower(coalesce(p.twitch_login, '')) like '%' || q || '%'
       or lower(coalesce(p.display_name, '')) like '%' || q || '%';
  select coalesce(jsonb_agg(row_to_json(x)::jsonb), '[]'::jsonb)
    into rows
    from (
      select
        p.id,
        p.twitch_login as login,
        coalesce(nullif(p.display_name, ''), p.twitch_login, 'Trainer') as "displayName",
        p.avatar_url as avatar,
        coalesce(private.play_staff_role(p.id), 'player') as role,
        p.created_at as "createdAt",
        p.last_seen_at as "lastSeenAt",
        p.starlight_pass as pass
      from public.profiles p
      where q = '' or lower(coalesce(p.twitch_login, '')) like '%' || q || '%'
         or lower(coalesce(p.display_name, '')) like '%' || q || '%'
      order by p.display_name, p.twitch_login
      limit 50 offset start_at
    ) x;
  return jsonb_build_object('ok', true, 'total', total, 'users', rows, 'staffRole', private.play_staff_role());
end;
$$;

create or replace function public.admin_set_role(p_user uuid, p_role text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  actor text := private.play_staff_role();
  target text;
  wanted text := lower(btrim(coalesce(p_role, '')));
begin
  perform private.require_hub();
  if p_user is null then
    raise exception 'Pick a trainer.';
  end if;
  if wanted not in ('player', 'moderator', 'admin') then
    raise exception 'Role must be player, moderator, or admin.';
  end if;
  if p_user = auth.uid() then
    raise exception 'You cannot change your own role.';
  end if;
  target := coalesce(private.play_staff_role(p_user), 'player');
  if target = 'owner' then
    raise exception 'The stream owner role cannot be changed here.';
  end if;
  if wanted = 'admin' and actor <> 'owner' then
    raise exception 'Only the stream owner can grant admin.';
  end if;
  if actor not in ('owner', 'admin') then
    raise exception 'Moderators can view trainers, but cannot change roles.';
  end if;
  if wanted = 'player' then
    delete from public.staff_roles where user_id = p_user;
  else
    insert into public.staff_roles (user_id, role)
    values (p_user, wanted)
    on conflict (user_id) do update set role = excluded.role;
  end if;
  return public.admin_list_users('', 0) || jsonb_build_object(
    'ok', true,
    'message', format('Role updated to %s.', wanted)
  );
end;
$$;

grant execute on function public.admin_list_users(text, int) to authenticated;
grant execute on function public.admin_set_role(uuid, text) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.inventories;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.encounter_activity;
exception when duplicate_object then null;
end $$;
