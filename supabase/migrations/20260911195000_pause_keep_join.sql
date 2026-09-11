-- Pause/resume/gift were rolling back: encounter_activity only allowed join/prepare/throw.
-- Keep the trainer's join on the same round the Play card is showing.

alter table public.encounter_activity drop constraint if exists encounter_activity_kind_check;
alter table public.encounter_activity add constraint encounter_activity_kind_check
  check (kind = any (array['joined'::text, 'prepared'::text, 'threw'::text, 'pause'::text, 'resume'::text, 'gift'::text]));

create or replace function private.staff_console(
  p_round uuid, p_kind text, p_item text, p_message text
)
returns void
language plpgsql
as $$
declare
  act_id bigint;
begin
  if p_kind = any (array['joined'::text, 'prepared'::text, 'threw'::text, 'pause'::text, 'resume'::text, 'gift'::text]) then
    insert into public.encounter_activity (round_id, user_id, display_name, kind, item)
    values (
      p_round,
      auth.uid(),
      coalesce(private.trainer_label(auth.uid()), 'Staff'),
      p_kind,
      p_item
    )
    returning id into act_id;
    update public.play_console_log
      set message = p_message
      where source_activity_id = act_id;
    return;
  end if;
  insert into public.play_console_log (round_id, user_id, display_name, kind, item, message)
  values (
    p_round,
    auth.uid(),
    coalesce(private.trainer_label(auth.uid()), 'Staff'),
    p_kind,
    p_item,
    p_message
  );
end;
$$;

drop function if exists private.play_snapshot(uuid);

create function private.play_snapshot(p_uid uuid, p_round_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
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
  radar_on boolean;
begin
  perform set_config('row_security', 'off', true);
  r := private.load_play_round(p_round_id);
  if r is not null and coalesce(r.source, '') is distinct from 'mixitup' then
    r := coalesce(private.settle_if_needed(r), r);
  end if;
  staff_role := case when p_uid is not null then private.play_staff_role(p_uid) else null end;
  is_admin := staff_role is not null;
  settings := private.game_settings();
  if p_uid is not null then
    perform private.ensure_broadcaster_pass(p_uid);
    inv := private.ensure_inventory(p_uid);
    radar_on := coalesce(inv.lure_until, '-infinity'::timestamptz) > now();
    if inv.lure_armed is distinct from radar_on then
      update public.inventories
        set lure_armed = radar_on, updated_at = now()
        where user_id = p_uid;
      inv.lure_armed := radar_on;
    end if;
    if r is not null and coalesce(r.cancelled, false) = false and private.round_phase(r) <> 'closed' then
      perform private.mark_seen(p_uid, r.dex);
    end if;
    bag := jsonb_build_object(
      'berry', inv.berry, 'bait', inv.bait, 'pokeball', inv.pokeball,
      'greatball', inv.greatball, 'ultraball', inv.ultraball,
      'lure', inv.lure, 'coins', inv.coins,
      'capacity', private.bag_capacity(p_uid),
      'used', private.item_total(inv),
      'lureArmed', radar_on,
      'lureUntil', inv.lure_until
    ) || coalesce(inv.balls, '{}'::jsonb);
    select jsonb_build_object('active', p.starlight_pass, 'source', p.pass_source, 'checkedAt', p.pass_checked_at)
      into pass from public.profiles p where p.id = p_uid;
    if r is not null then
      select jsonb_build_object(
          'joined', true,
          'prep', ep.prep,
          'ball', ep.ball,
          'result', ep.result,
          'chance', ep.chance,
          'caught', ep.caught
        )
        into me
        from public.encounter_players ep
        where ep.round_id = r.id and ep.user_id = p_uid;
    end if;
  end if;
  visible := private.public_round_json(r);
  return jsonb_build_object(
    'round', visible,
    'me', me,
    'youJoined', me is not null,
    'bag', bag,
    'pass', pass,
    'trainer', private.trainer_card(p_uid),
    'ownedAvatarPacks', private.owned_avatar_packs_json(p_uid),
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
    'live', (select is_live from public.stream_status where id = 1),
    'console', private.play_console_json(100)
  );
end;
$$;

drop function if exists public.play_sync();
create function public.play_sync(p_round_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  return coalesce(private.play_snapshot(auth.uid(), p_round_id), '{}'::jsonb)
    || jsonb_build_object('console', private.play_console_json(100));
end;
$$;

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
    return private.play_snapshot(uid, r.id) || jsonb_build_object('ok', true, 'message', 'You already joined. Wait for preparation, then use a Berry or Honey.');
  end if;
  insert into public.encounter_players (round_id, user_id) values (r.id, uid);
  perform private.log_activity(r.id, uid, 'joined', null);
  update public.encounter_rounds set last_action = 'A trainer joined', updated_at = now() where id = r.id;
  return private.play_snapshot(uid, r.id) || jsonb_build_object('ok', true, 'message', 'You joined! Wait for preparation, then use a Berry or Honey.');
end;
$$;

create or replace function public.play_prepare(p_item text, p_round_id uuid default null)
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
    if private.join_window_open(r) then
      insert into public.encounter_players (round_id, user_id) values (r.id, uid);
      perform private.log_activity(r.id, uid, 'joined', null);
    else
      raise exception 'You must join this encounter during its join window.';
    end if;
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
  return private.play_snapshot(uid, r.id) || jsonb_build_object('ok', true, 'message', 'Preparation complete. Choose your ball when throws open.');
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
  return private.play_snapshot(uid, r.id) || jsonb_build_object('ok', true, 'message', 'Your throw is locked in. Results appear at the end of this phase.');
end;
$$;

create or replace function public.admin_pause_round()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  r public.encounter_rounds;
begin
  perform private.require_hub();
  r := private.load_play_round(null);
  if r is null or coalesce(r.cancelled, false) then
    raise exception 'Start an encounter first.';
  end if;
  if not private.round_is_active(r)
     and not (
       r.deadlines is not null
       and now() < coalesce((r.deadlines->>'reveal')::timestamptz, r.ends_at, '-infinity'::timestamptz)
     ) then
    raise exception 'Start an encounter first.';
  end if;
  if private.round_paused(r) then
    return private.admin_overview() || jsonb_build_object('ok', true, 'message', 'The encounter is already paused.');
  end if;
  update public.encounter_rounds
    set paused_at = now(),
        last_action = 'Encounter paused',
        updated_at = now()
    where id = r.id;
  perform private.staff_console(r.id, 'pause', null, 'Encounter paused.');
  return private.admin_overview() || jsonb_build_object('ok', true, 'message', 'Encounter paused. Timer and trainer actions are frozen.');
end;
$$;

create or replace function public.admin_resume_round()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  r public.encounter_rounds;
  delta interval;
begin
  perform private.require_hub();
  r := private.load_play_round(null);
  if r is null or coalesce(r.cancelled, false) then
    raise exception 'Start an encounter first.';
  end if;
  if r.paused_at is null then
    return private.admin_overview() || jsonb_build_object('ok', true, 'message', 'The encounter is already running.');
  end if;
  delta := now() - r.paused_at;
  update public.encounter_rounds
    set deadlines = jsonb_build_object(
          'join', (deadlines->>'join')::timestamptz + delta,
          'prepare', (deadlines->>'prepare')::timestamptz + delta,
          'throw', (deadlines->>'throw')::timestamptz + delta,
          'reveal', (deadlines->>'reveal')::timestamptz + delta
        ),
        ends_at = ends_at + delta,
        paused_at = null,
        last_action = 'Encounter resumed',
        updated_at = now()
    where id = r.id;
  perform private.staff_console(r.id, 'resume', null, 'Encounter resumed.');
  return private.admin_overview() || jsonb_build_object('ok', true, 'message', 'Encounter resumed.');
end;
$$;

grant execute on function public.play_sync(uuid) to authenticated, anon;
grant execute on function public.play_join(uuid) to authenticated, anon;
grant execute on function public.play_prepare(text, uuid) to authenticated, anon;
grant execute on function public.play_throw(text, uuid) to authenticated, anon;

notify pgrst, 'reload schema';
