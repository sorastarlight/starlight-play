-- Play was lagging the stream clock, hiding the throw bar, showing cancelled
-- rounds forever, and delaying results until a later settle. Align phases to
-- the overlay clock, settle as soon as throws end, and store trainer encounter prefs.

alter table public.profiles
  add column if not exists encounter_settings jsonb not null default '{}'::jsonb;

create or replace function private.phase_rank(ph text)
returns int
language sql
immutable
as $$
  select case ph
    when 'join' then 1
    when 'prepare' then 2
    when 'throw' then 3
    when 'reveal' then 4
    when 'closed' then 5
    else 0
  end;
$$;

create or replace function private.round_phase(r public.encounter_rounds)
returns text
language plpgsql
stable
as $$
declare
  clk timestamptz;
  clock_phase text;
  stored text;
begin
  if r is null or r.cancelled then
    return 'closed';
  end if;
  if r.deadlines is null then
    return coalesce(nullif(r.phase, ''), 'closed');
  end if;
  clk := coalesce(r.paused_at, now());
  clock_phase := case
    when clk < (r.deadlines->>'join')::timestamptz then 'join'
    when clk < (r.deadlines->>'prepare')::timestamptz then 'prepare'
    when clk < (r.deadlines->>'throw')::timestamptz then 'throw'
    when clk < (r.deadlines->>'reveal')::timestamptz then 'reveal'
    else 'closed'
  end;
  if r.paused_at is not null then
    return clock_phase;
  end if;
  stored := coalesce(nullif(r.phase, ''), clock_phase);
  if stored in ('join', 'prepare', 'throw', 'reveal')
     and private.phase_rank(stored) > private.phase_rank(clock_phase) then
    return stored;
  end if;
  return clock_phase;
end;
$$;

create or replace function private.prepare_action_ok(r public.encounter_rounds)
returns boolean
language plpgsql
stable
as $$
declare
  ph text;
begin
  if r is null or coalesce(r.cancelled, false) or private.round_paused(r) then
    return false;
  end if;
  ph := private.round_phase(r);
  return ph in ('join', 'prepare', 'throw');
end;
$$;

create or replace function private.throw_action_ok(r public.encounter_rounds)
returns boolean
language plpgsql
stable
as $$
declare
  ph text;
  clk timestamptz;
begin
  if r is null or coalesce(r.cancelled, false) or private.round_paused(r) then
    return false;
  end if;
  ph := private.round_phase(r);
  if ph = 'throw' then
    return true;
  end if;
  if r.deadlines is null then
    return false;
  end if;
  clk := now();
  return clk >= coalesce((r.deadlines->>'prepare')::timestamptz, (r.deadlines->>'join')::timestamptz) - interval '1 second'
     and clk < coalesce((r.deadlines->>'throw')::timestamptz, (r.deadlines->>'reveal')::timestamptz) + interval '1 second';
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
  v_odds numeric;
  v_roll numeric;
  v_caught boolean;
  pending boolean;
  clk timestamptz;
  ph text;
begin
  if r is null or r.cancelled then
    return r;
  end if;
  select exists (
    select 1 from public.encounter_players ep
    where ep.round_id = r.id and ep.result is null
  ) into pending;
  clk := coalesce(r.paused_at, now());
  ph := private.round_phase(r);
  if r.paused_at is not null then
    return r;
  end if;
  if pending = false and r.resolved then
    return r;
  end if;
  if ph in ('join', 'prepare') then
    return r;
  end if;
  if ph = 'throw'
     and r.deadlines is not null
     and clk < (r.deadlines->>'throw')::timestamptz then
    return r;
  end if;

  rules := coalesce(r.rules, private.game_settings());
  select count(*)::int, count(*) filter (where prep = 'bait')::int
    into player_count, bait_count
    from public.encounter_players
    where round_id = r.id;
  shared := coalesce((rules->>'maxBaitBonus')::numeric, 0) * bait_count / greatest(player_count, 1);

  for rec in
    select * from public.encounter_players
    where round_id = r.id and result is null
  loop
    if rec.ball is null then
      update public.encounter_players ep
        set result = 'No throw', caught = false
        where ep.round_id = rec.round_id and ep.user_id = rec.user_id;
      continue;
    end if;
    if rec.ball = 'masterball' then
      v_odds := 1;
      v_caught := true;
      v_roll := 0;
    else
      v_odds := least(
        coalesce((rules->>'maxCatchChance')::numeric, 0.9),
        private.ball_catch_chance(rules, rec.ball)
          + shared
          + case when rec.prep = 'berry' then coalesce((rules->>'berryBonus')::numeric, 0) else 0 end
      );
      v_roll := random();
      v_caught := v_roll < v_odds;
    end if;
    update public.encounter_players ep
      set chance = v_odds, roll = v_roll, caught = v_caught,
          result = case when v_caught then 'Caught' else 'Escaped' end
      where ep.round_id = rec.round_id and ep.user_id = rec.user_id;
    if v_caught and not exists (
      select 1 from public.catches c
      where c.round_id = rec.round_id and c.user_id = rec.user_id
    ) then
      insert into public.catches (user_id, dex, name, variant, gender, ball, round_id, source_key)
      values (
        rec.user_id, r.dex, r.name, r.variant, r.gender, rec.ball, rec.round_id,
        'play:' || rec.round_id::text || ':' || rec.user_id::text
      );
    end if;
  end loop;

  update public.encounter_rounds
    set resolved = true,
        paused_at = null,
        last_action = case
          when last_action ~* 'berry|honey|bait|joined' then 'Results locked in'
          else coalesce(nullif(btrim(last_action), ''), 'Results locked in')
        end,
        updated_at = now()
    where id = r.id
    returning * into r;
  return r;
end;
$$;

create or replace function private.load_play_round(p_round_id uuid default null)
returns public.encounter_rounds
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  r public.encounter_rounds;
  grace interval := interval '8 seconds';
begin
  perform set_config('row_security', 'off', true);
  if p_round_id is not null then
    select x.* into r
    from public.encounter_rounds x
    where x.id = p_round_id
      and coalesce(x.cancelled, false) = false;
    if r is not null then
      if r.paused_at is not null then
        return r;
      end if;
      if r.deadlines is not null
         and now() < coalesce((r.deadlines->>'reveal')::timestamptz, r.ends_at, now()) + grace then
        return r;
      end if;
      if r.deadlines is null and private.round_phase(r) <> 'closed' then
        return r;
      end if;
    end if;
  end if;
  select x.* into r
  from public.encounter_rounds x
  where coalesce(x.cancelled, false) = false
    and (
      x.paused_at is not null
      or (
        x.deadlines is not null
        and now() < coalesce((x.deadlines->>'reveal')::timestamptz, x.ends_at, '-infinity'::timestamptz) + grace
      )
      or (x.deadlines is null and coalesce(x.phase, 'closed') <> 'closed')
    )
  order by coalesce(x.started_at, x.updated_at) desc
  limit 1;
  return r;
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
  activity jsonb;
  honey jsonb;
  catchers jsonb;
  settled boolean;
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
  select exists (
    select 1 from public.encounter_players ep
    where ep.round_id = r.id and ep.result is not null
  ) into settled;
  if settled then
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
    'overlayPhase', r.phase,
    'paused', private.round_paused(r),
    'pausedAt', r.paused_at,
    'hidden', r.hidden,
    'cancelled', r.cancelled,
    'resolved', r.resolved,
    'dex', r.dex,
    'name', r.name,
    'variant', r.variant,
    'gender', r.gender,
    'location', coalesce(nullif(r.pokemon->>'location', ''), private.lgpe_habitat(r.dex)),
    'startedAt', r.started_at,
    'endsAt', private.phase_display_ends(r, ph),
    'deadlines', r.deadlines,
    'participants', participants,
    'prepared', prepared,
    'thrown', thrown,
    'baitBonusPercent', round(100 * shared, 1),
    'lastAction', r.last_action,
    'activity', activity,
    'honeyTrainers', coalesce(honey, '[]'::jsonb),
    'catchers', coalesce(catchers, '[]'::jsonb),
    'results', case when settled then (
      select jsonb_build_object(
        'caught', count(*) filter (where coalesce(caught, false))::int,
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

create or replace function private.restore_bag_item(p_uid uuid, p_item text)
returns void
language plpgsql
as $$
declare
  qty int;
begin
  if p_item is null or p_uid is null then
    return;
  end if;
  if p_item = 'berry' then
    update public.inventories set berry = berry + 1, updated_at = now() where user_id = p_uid;
  elsif p_item = 'bait' then
    update public.inventories set bait = bait + 1, updated_at = now() where user_id = p_uid;
  elsif p_item = 'pokeball' then
    update public.inventories set pokeball = pokeball + 1, updated_at = now() where user_id = p_uid;
  elsif p_item = 'greatball' then
    update public.inventories set greatball = greatball + 1, updated_at = now() where user_id = p_uid;
  elsif p_item = 'ultraball' then
    update public.inventories set ultraball = ultraball + 1, updated_at = now() where user_id = p_uid;
  elsif private.is_throw_ball(p_item) then
    select coalesce((balls->>p_item)::int, 0) into qty from public.inventories where user_id = p_uid;
    update public.inventories
      set balls = jsonb_set(coalesce(balls, '{}'::jsonb), array[p_item], to_jsonb(coalesce(qty, 0) + 1)),
          updated_at = now()
      where user_id = p_uid;
  end if;
end;
$$;

create or replace function public.admin_cancel_round()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  r public.encounter_rounds;
  rec public.encounter_players%rowtype;
begin
  perform private.require_hub();
  r := private.load_play_round(null);
  if r is null or r.cancelled then
    raise exception 'No encounter to cancel.';
  end if;
  if not r.resolved then
    for rec in select * from public.encounter_players where round_id = r.id
    loop
      perform private.restore_bag_item(rec.user_id, rec.prep);
      perform private.restore_bag_item(rec.user_id, rec.ball);
    end loop;
  end if;
  update public.encounter_rounds
    set cancelled = true,
        hidden = true,
        phase = 'closed',
        paused_at = null,
        last_action = 'Encounter cancelled',
        updated_at = now()
    where id = r.id;
  perform private.staff_console(r.id, 'cancel', null, 'Encounter cancelled.');
  return private.admin_overview() || jsonb_build_object('ok', true, 'message', 'Encounter cancelled.');
end;
$$;

create or replace function private.normalize_encounter_settings(p jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  balls text[] := '{}';
  key text;
  prep text;
begin
  if p is not null then
    for key in
      select jsonb_array_elements_text(coalesce(p->'favoriteBalls', '[]'::jsonb))
    loop
      if private.is_throw_ball(key) and not (key = any (balls)) and cardinality(balls) < 6 then
        balls := balls || key;
      end if;
    end loop;
  end if;
  if cardinality(balls) = 0 then
    balls := array['pokeball', 'greatball', 'ultraball'];
  end if;
  prep := coalesce(nullif(p->>'defaultPrep', ''), 'ask');
  if prep not in ('berry', 'bait', 'ask') then
    prep := 'ask';
  end if;
  return jsonb_build_object(
    'favoriteBalls', to_jsonb(balls),
    'defaultPrep', prep,
    'autoPrep', coalesce((p->>'autoPrep')::boolean, false),
    'autoThrow', coalesce((p->>'autoThrow')::boolean, false)
  );
end;
$$;

create or replace function public.play_set_encounter_settings(p_settings jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  uid uuid := auth.uid();
  next jsonb;
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  next := private.normalize_encounter_settings(p_settings);
  update public.profiles
    set encounter_settings = next, updated_at = now()
    where id = uid;
  return jsonb_build_object(
    'ok', true,
    'message', 'Encounter settings saved.',
    'encounterSettings', next
  );
end;
$$;

grant execute on function public.play_set_encounter_settings(jsonb) to authenticated;

create or replace function private.play_snapshot(p_uid uuid, p_round_id uuid default null)
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
  enc jsonb;
  is_admin boolean;
  staff_role text;
  visible jsonb;
  inv public.inventories;
  radar_on boolean;
begin
  perform set_config('row_security', 'off', true);
  r := private.load_play_round(p_round_id);
  if r is not null then
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
    select
      jsonb_build_object('active', p.starlight_pass, 'source', p.pass_source, 'checkedAt', p.pass_checked_at),
      private.normalize_encounter_settings(p.encounter_settings)
      into pass, enc
      from public.profiles p
      where p.id = p_uid;
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
    'encounterSettings', enc,
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

notify pgrst, 'reload schema';
