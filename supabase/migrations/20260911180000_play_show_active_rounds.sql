-- Play page should show a live-timed encounter even if the stream marked it hidden.
-- Empty stream publishes must not close a round that still has time on the clock.

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
  radar_on boolean;
begin
  r := private.sync_latest_round();
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
      select jsonb_build_object('joined', true, 'prep', ep.prep, 'ball', ep.ball, 'result', ep.result, 'chance', ep.chance, 'caught', ep.caught)
        into me from public.encounter_players ep where ep.round_id = r.id and ep.user_id = p_uid;
    end if;
  end if;
  if r is not null and (
    private.round_is_active(r)
    or not r.hidden
    or is_admin
  ) then
    visible := private.public_round_json(r);
  end if;
  return jsonb_build_object(
    'round', visible,
    'me', me,
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
  if v_phase in ('join', 'prepare', 'throw', 'reveal') and not v_cancelled then
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
