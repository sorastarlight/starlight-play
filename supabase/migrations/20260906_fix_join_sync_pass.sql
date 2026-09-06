-- Stop encounter write storms, keep Mix It Up joins through prepare, grant Pass to the channel owner.

create or replace function private.latest_round()
returns public.encounter_rounds
language sql
stable
as $$
  select r.*
  from public.encounter_rounds r
  order by
    case
      when coalesce(r.cancelled, false) = false and private.round_phase(r) <> 'closed' then 0
      else 1
    end,
    coalesce(r.started_at, r.updated_at) desc,
    r.updated_at desc
  limit 1;
$$;

create or replace function private.sync_latest_round()
returns public.encounter_rounds
language plpgsql
as $$
declare
  r public.encounter_rounds;
  ph text;
  new_ends timestamptz;
begin
  perform pg_advisory_xact_lock(87231001);
  r := private.latest_round();
  r := private.settle_if_needed(r);
  if r is null then
    return r;
  end if;
  ph := private.round_phase(r);
  new_ends := private.phase_ends_at(r, ph);
  if r.phase is distinct from ph or r.ends_at is distinct from new_ends then
    update public.encounter_rounds
      set phase = ph,
          ends_at = new_ends,
          updated_at = now()
      where id = r.id
      returning * into r;
  end if;
  return r;
end;
$$;

create or replace function private.ensure_broadcaster_pass(p_uid uuid)
returns void
language plpgsql
as $$
declare
  login text;
  channel text;
begin
  if p_uid is null then
    return;
  end if;
  select lower(twitch_login) into login from public.profiles where id = p_uid;
  select lower(broadcaster_twitch_login) into channel from public.site_config where id = 1;
  if login is null or channel is null or login <> channel then
    return;
  end if;
  update public.profiles
    set starlight_pass = true,
        pass_source = case
          when pass_source in ('twitch-sub', 'admin') then pass_source
          else 'broadcaster'
        end,
        pass_checked_at = now(),
        updated_at = now()
    where id = p_uid and starlight_pass is not true;
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
  insert into public.inventories (user_id)
  values (uid)
  on conflict (user_id) do nothing;
  already := exists (select 1 from public.encounter_players where round_id = r.id and user_id = uid);
  if r.source = 'mixitup' then
    select c.twitch_user_id, c.twitch_login into twitch_user, twitch_name from private.current_twitch() c;
    if twitch_user is null or twitch_name is null then
      raise exception 'Sign in with Twitch to join the live Mix It Up encounter.';
    end if;
    if not already or ph = 'prepare' then
      perform private.enqueue_stream_command('join', jsonb_build_object('user', twitch_user, 'name', twitch_name));
    end if;
  end if;
  if already then
    return private.play_snapshot(uid) || jsonb_build_object('ok', true, 'message', 'You already joined. Wait for preparation, then use a Berry or Bait.');
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
  visible jsonb;
  inv public.inventories;
begin
  r := private.sync_latest_round();
  is_admin := p_uid is not null and private.is_play_admin();
  settings := private.game_settings();

  if p_uid is not null then
    perform private.ensure_broadcaster_pass(p_uid);
    inv := private.ensure_inventory(p_uid);
    bag := jsonb_build_object(
      'berry', inv.berry, 'bait', inv.bait, 'pokeball', inv.pokeball,
      'greatball', inv.greatball, 'ultraball', inv.ultraball,
      'lure', inv.lure, 'coins', inv.coins,
      'capacity', private.bag_capacity(p_uid),
      'used', private.item_total(inv),
      'lureArmed', inv.lure_armed
    );

    select jsonb_build_object(
      'active', p.starlight_pass,
      'source', p.pass_source,
      'checkedAt', p.pass_checked_at
    ) into pass
    from public.profiles p where p.id = p_uid;

    if r is not null then
      select jsonb_build_object(
        'joined', true,
        'prep', ep.prep,
        'ball', ep.ball,
        'result', ep.result,
        'chance', ep.chance,
        'caught', ep.caught
      ) into me
      from public.encounter_players ep
      where ep.round_id = r.id and ep.user_id = p_uid;
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

create or replace function public.bridge_grant_bits_pack(p_token text, p_login text, p_sku text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  item jsonb;
  trainer uuid;
begin
  if not private.bridge_ok(p_token) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update private.stream_bridge set seen_at = now() where id = 1;
  select elem into item
  from jsonb_array_elements(private.store_catalog()->'bits') as elem
  where elem->>'sku' = p_sku;
  if item is null then
    raise exception 'Unknown Bits pack.';
  end if;
  select id into trainer from public.profiles where lower(twitch_login) = lower(btrim(p_login));
  if trainer is null then
    raise exception 'No Play trainer matches that Twitch login yet. They must sign in on Play first.';
  end if;
  perform private.grant_known(trainer, item->'grants');
  return jsonb_build_object('ok', true, 'message', 'Granted ' || (item->>'name') || ' to ' || btrim(p_login) || '.');
end;
$$;

grant execute on function public.play_join() to authenticated;
grant execute on function public.bridge_grant_bits_pack(text, text, text) to anon, authenticated;
