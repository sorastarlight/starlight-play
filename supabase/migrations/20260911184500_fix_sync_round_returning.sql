-- Play was dropping the live round after a phase clock write: UPDATE … RETURNING
-- into a NULL record when the overlay-hidden row is not visible to SELECT policies.
-- Admin Hub never does that write, so it kept showing the Pokémon.

create or replace function private.sync_latest_round()
returns public.encounter_rounds
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  r public.encounter_rounds;
  keep_id uuid;
  ph text;
  new_ends timestamptz;
begin
  perform pg_advisory_xact_lock(87231001);
  r := private.latest_round();
  r := private.settle_if_needed(r);
  if r is null then
    return r;
  end if;
  keep_id := r.id;
  ph := private.round_phase(r);
  new_ends := private.phase_ends_at(r, ph);
  if r.phase is distinct from ph or r.ends_at is distinct from new_ends then
    update public.encounter_rounds
      set phase = ph,
          ends_at = new_ends,
          updated_at = now()
      where id = keep_id;
  end if;
  select * into r from public.encounter_rounds where id = keep_id;
  return r;
end;
$$;

create or replace function private.play_snapshot(p_uid uuid)
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
  perform private.sync_latest_round();
  r := private.latest_round();
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
  if r is not null then
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
