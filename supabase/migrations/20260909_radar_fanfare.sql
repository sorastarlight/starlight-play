-- Poké Radar (30 minutes) and catch/Honey result lists.

alter table public.inventories
  add column if not exists lure_until timestamptz;

update public.inventories
set lure_until = now() + interval '30 minutes'
where lure_armed = true
  and (lure_until is null or lure_until <= now());

create or replace function public.play_use_lure()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  uid uuid := auth.uid();
  spent int;
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  update public.inventories
    set lure = lure - 1,
        lure_armed = true,
        lure_until = now() + interval '30 minutes',
        updated_at = now()
    where user_id = uid
      and lure > 0
      and coalesce(lure_until, '-infinity'::timestamptz) <= now();
  get diagnostics spent = row_count;
  if spent = 0 then
    raise exception 'You need a Poké Radar, and only one can scan at a time.';
  end if;
  return private.play_snapshot(uid) || jsonb_build_object(
    'ok', true,
    'message', 'Poké Radar is on for 30 minutes. It will join you to any encounter that appears.'
  );
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
  honey jsonb;
  catchers jsonb;
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
  select coalesce(jsonb_agg(jsonb_build_object(
      'name', coalesce(private.trainer_label(ep.user_id), 'Trainer')
    ) order by coalesce(private.trainer_label(ep.user_id), 'Trainer')), '[]'::jsonb)
    into honey
    from public.encounter_players ep
    where ep.round_id = r.id and ep.prep = 'bait';
  if r.resolved or ph in ('reveal', 'closed') then
    select coalesce(jsonb_agg(jsonb_build_object(
        'name', coalesce(private.trainer_label(ep.user_id), 'Trainer'),
        'ball', ep.ball
      ) order by coalesce(private.trainer_label(ep.user_id), 'Trainer')), '[]'::jsonb)
      into catchers
      from public.encounter_players ep
      where ep.round_id = r.id and coalesce(ep.caught, false);
  else
    catchers := '[]'::jsonb;
  end if;

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
    'honeyTrainers', coalesce(honey, '[]'::jsonb),
    'catchers', coalesce(catchers, '[]'::jsonb),
    'results', case when r.resolved or ph in ('reveal', 'closed') then (
      select jsonb_build_object(
        'caught', count(*) filter (where caught)::int,
        'escaped', count(*) filter (where result = 'Escaped')::int,
        'noThrow', count(*) filter (where coalesce(result, '') = 'No throw')::int,
        'catchers', coalesce(catchers, '[]'::jsonb)
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
  if r is not null and (not r.hidden or is_admin) then
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

create or replace function public.play_claim_pass(p_kind text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  uid uuid := auth.uid();
  inv public.inventories;
  pass boolean;
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  select starlight_pass into pass from public.profiles where id = uid;
  if not coalesce(pass, false) then
    raise exception 'Starlight Pass is required. Subscribe on Twitch, then check your pass.';
  end if;
  inv := private.ensure_inventory(uid);
  if p_kind = 'daily' then
    if inv.pass_daily_at is not null and inv.pass_daily_at > now() - interval '20 hours' then
      raise exception 'Daily Pass gift is not ready yet.';
    end if;
    update public.inventories set pass_daily_at = now(), updated_at = now() where user_id = uid;
    perform private.grant_known(uid, jsonb_build_object('berry', 2, 'bait', 1, 'coins', 20));
    return private.play_snapshot(uid) || jsonb_build_object('ok', true, 'message', 'Daily Pass gift: 2 Berries, 1 Honey, 20 PokéCoins.');
  end if;
  if p_kind = 'weekly' then
    if inv.pass_weekly_at is not null and inv.pass_weekly_at > now() - interval '6 days' then
      raise exception 'Weekly Pass crate is not ready yet.';
    end if;
    update public.inventories set pass_weekly_at = now(), updated_at = now() where user_id = uid;
    perform private.grant_known(uid, jsonb_build_object('pokeball', 5, 'berry', 3, 'lure', 1, 'coins', 150));
    return private.play_snapshot(uid) || jsonb_build_object('ok', true, 'message', 'Weekly Pass crate: 5 Poké Balls, 3 Berries, 1 Poké Radar, 150 PokéCoins.');
  end if;
  raise exception 'Unknown Pass gift.';
end;
$$;

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
    when 'premierball' then 'Premier Ball'
    when 'luxuryball' then 'Luxury Ball'
    when 'healball' then 'Heal Ball'
    when 'friendball' then 'Friend Ball'
    when 'loveball' then 'Love Ball'
    when 'nestball' then 'Nest Ball'
    when 'netball' then 'Net Ball'
    when 'repeatball' then 'Repeat Ball'
    when 'timerball' then 'Timer Ball'
    when 'diveball' then 'Dive Ball'
    when 'duskball' then 'Dusk Ball'
    when 'quickball' then 'Quick Ball'
    when 'fastball' then 'Fast Ball'
    when 'lureball' then 'Lure Ball'
    when 'moonball' then 'Moon Ball'
    when 'heavyball' then 'Heavy Ball'
    when 'levelball' then 'Level Ball'
    when 'safariball' then 'Safari Ball'
    when 'sportball' then 'Sport Ball'
    when 'cherishball' then 'Cherish Ball'
    when 'gsball' then 'GS Ball'
    when 'ashball' then 'Ash''s Poké Ball'
    when 'cloneball' then 'Clone Ball'
    when 'darkball' then 'Dark Ball'
    when 'oldball' then 'Old Ball'
    when 'hisuipokeball' then 'Hisui Poké Ball'
    when 'hisuigreatball' then 'Hisui Great Ball'
    when 'hisuiultraball' then 'Hisui Ultra Ball'
    when 'hisuiheavyball' then 'Hisui Heavy Ball'
    when 'featherball' then 'Feather Ball'
    when 'wingball' then 'Wing Ball'
    when 'jetball' then 'Jet Ball'
    when 'leadenball' then 'Leaden Ball'
    when 'gigatonball' then 'Gigaton Ball'
    when 'originball' then 'Origin Ball'
    when 'strangeball' then 'Strange Ball'
    when 'lure' then 'Poké Radar'
    else coalesce(item, '')
  end;
$$;

-- Radar stays on for 30 minutes across joins. Still grant join XP and coins.
create or replace function private.after_join_xp()
returns trigger
language plpgsql
as $$
begin
  perform private.ensure_inventory(new.user_id);
  perform private.award_xp(new.user_id, 10);
  update public.inventories
    set coins = coins + 5, updated_at = now()
    where user_id = new.user_id;
  return new;
end;
$$;

grant execute on function public.play_use_lure() to authenticated;
grant execute on function public.play_claim_pass(text) to authenticated;
