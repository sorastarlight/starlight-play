-- Player-facing encounter view-models. Capture math stays in private.capture_*.
-- The UI only receives labels, never rolls or final odds.

create or replace function private.is_prep_item(item text)
returns boolean
language sql
stable
as $$
  select item = 'bait'
     or item = 'none'
     or exists (
       select 1 from public.capture_berries b
       where b.key = item and b.enabled and b.capture_enabled
     );
$$;

create or replace function private.item_label(item text)
returns text
language sql
stable
as $$
  select coalesce(
    (select b.name from public.capture_balls b where b.key = item),
    (select b.name from public.capture_berries b where b.key = item),
    case item
      when 'none' then 'no item'
      when 'bait' then 'Honey'
      when 'lure' then 'Poké Radar'
      when 'coins' then 'PokéCoins'
      when 'bag_bonus' then 'Bag Upgrade'
      when 'firestone' then 'Fire Stone'
      when 'waterstone' then 'Water Stone'
      when 'thunderstone' then 'Thunder Stone'
      when 'leafstone' then 'Leaf Stone'
      when 'moonstone' then 'Moon Stone'
      when 'linkingcord' then 'Linking Cord'
      when 'rarecandy' then 'Rare Candy'
      when 'choice_stone' then 'Evolution Stone'
      else coalesce(item, '')
    end
  );
$$;

create or replace function private.spawn_band(p_dex int)
returns text
language sql
stable
as $$
  select case
    when coalesce(s.is_legendary, false) then 'LEGENDARY'
    when coalesce(s.catch_rate, 45) >= 200 then 'COMMON'
    when coalesce(s.catch_rate, 45) >= 90 then 'UNCOMMON'
    when coalesce(s.catch_rate, 45) >= 45 then 'RARE'
    when coalesce(s.catch_rate, 45) >= 15 then 'VERY_RARE'
    else 'ULTRA_RARE'
  end
  from public.species s
  where s.dex = p_dex;
$$;

create or replace function private.play_ball_advice_json(p_uid uuid, r public.encounter_rounds)
returns jsonb
language plpgsql
stable
as $$
declare
  cfg jsonb := private.capture_config();
  labels jsonb := coalesce(nullif(cfg->'adviceLabels', 'null'::jsonb), '{
    "excellentMin": 1.5,
    "greatMin": 1.45,
    "goodMin": 1.2
  }'::jsonb);
  owns boolean := false;
  qty int;
  rec record;
  eval jsonb;
  rows jsonb := '[]'::jsonb;
  band text;
  best_key text := null;
  best_score numeric := -1000;
  second_score numeric := -1000;
  score numeric;
  label text;
  specialist boolean;
  guaranteed boolean;
  mult numeric;
begin
  if r is null or p_uid is null then
    return '[]'::jsonb;
  end if;
  band := coalesce(private.spawn_band(r.dex), 'RARE');
  select exists (
    select 1 from public.catches c
    where c.user_id = p_uid and c.dex = r.dex
  ) into owns;
  owns := coalesce(owns, false);

  for rec in
    select b.key, b.name, b.description, b.economic_tier, b.guaranteed_capture,
           b.sort_order, b.condition_type
      from public.capture_balls b
     where b.enabled
     order by b.sort_order, b.name
  loop
    qty := coalesce(private.bag_item_qty(p_uid, rec.key), 0);
    if qty < 1 then
      continue;
    end if;
    eval := private.capture_ball_modifier(rec.key, r.dex, owns, now(), cfg);
    mult := coalesce((eval->>'multiplier')::numeric, 1);
    specialist := coalesce((eval->>'conditionMet')::boolean, false);
    guaranteed := coalesce((eval->>'guaranteed')::boolean, rec.guaranteed_capture, false);
    if guaranteed then
      label := 'GUARANTEED';
    elsif specialist and mult >= coalesce((labels->>'excellentMin')::numeric, 1.5) then
      label := 'EXCELLENT';
    elsif mult >= coalesce((labels->>'greatMin')::numeric, 1.45) then
      label := 'GREAT';
    elsif specialist or mult >= coalesce((labels->>'goodMin')::numeric, 1.2) then
      label := 'GOOD';
    else
      label := 'STANDARD';
    end if;

    score := mult * 100;
    if specialist then score := score + 22; end if;
    if rec.key = 'masterball' then
      if band = 'LEGENDARY' then score := score + 8; else score := score - 1200; end if;
    end if;
    if band = 'COMMON' and rec.key in ('ultraball', 'hisuiultraball', 'jetball', 'gigatonball') and not specialist then
      score := score - 45;
    end if;
    if band in ('COMMON', 'UNCOMMON') and rec.key in ('pokeball', 'premierball', 'hisuipokeball') then
      score := score + 8;
    end if;
    if band in ('RARE', 'VERY_RARE') and rec.key in ('greatball', 'hisuigreatball', 'wingball', 'leadenball') and not specialist then
      score := score + 6;
    end if;

    if score > best_score then
      second_score := best_score;
      best_score := score;
      best_key := rec.key;
    elsif score > second_score then
      second_score := score;
    end if;

    rows := rows || jsonb_build_array(jsonb_build_object(
      'ballId', rec.key,
      'name', rec.name,
      'quantity', qty,
      'eligible', true,
      'effectiveness', label,
      'recommended', false,
      'specialist', specialist,
      'description', coalesce(rec.description, 'A Poké Ball for catching wild Pokémon.'),
      'tier', coalesce(rec.economic_tier, 'basic'),
      'sort', rec.sort_order
    ));
  end loop;

  if best_key is not null
     and best_key is distinct from 'masterball'
     and (second_score < 0 or best_score - second_score >= 12) then
    rows := (
      select coalesce(jsonb_agg(
        case when x->>'ballId' = best_key then x || '{"recommended": true}'::jsonb else x end
        order by
          case when x->>'ballId' = best_key then 0 else 1 end,
          case when (x->>'specialist')::boolean then 0 else 1 end,
          case x->>'ballId'
            when 'ultraball' then 2
            when 'greatball' then 3
            when 'pokeball' then 4
            else 5
          end,
          (x->>'sort')::int,
          x->>'name'
      ), '[]'::jsonb)
      from jsonb_array_elements(rows) x
    );
  end if;

  return coalesce(rows, '[]'::jsonb);
end;
$$;

create or replace function private.capture_items_json()
returns jsonb
language sql
stable
as $function$
  select jsonb_build_object(
    'berries', coalesce((
      select jsonb_agg(jsonb_build_object(
        'key', b.key,
        'name', b.name,
        'sprite', b.sprite,
        'tier', b.tier,
        'rarity', b.rarity,
        'description', coalesce(b.rpg_description, b.canonical_flavor_text),
        'storeAvailable', b.store_available,
        'price', b.shop_price
      ) order by b.sort_order, b.name)
      from public.capture_berries b
      where b.enabled and b.capture_enabled
    ), '[]'::jsonb),
    'balls', coalesce((
      select jsonb_agg(jsonb_build_object(
        'key', b.key,
        'name', b.name,
        'description', coalesce(b.description, 'A Poké Ball for catching wild Pokémon.'),
        'storeAvailable', coalesce(b.store_enabled, false),
        'tier', coalesce(b.economic_tier, 'basic'),
        'guaranteed', coalesce(b.guaranteed_capture, false)
      ) order by b.sort_order, b.name)
      from public.capture_balls b
      where b.enabled
    ), '[]'::jsonb),
    'honey', jsonb_build_object(
      'key', 'bait',
      'name', 'Honey',
      'sprite', 'honey.png',
      'description', 'Contribute during the item phase to improve the community catch bonus for every participating Trainer. More participating Trainers contributing Honey increases the bonus, up to a cap.'
    )
  );
$function$;

create or replace function private.play_snapshot(p_uid uuid, p_round_id uuid default null::uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
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
    ) || coalesce(inv.balls, '{}'::jsonb) || coalesce(inv.berries, '{}'::jsonb) || coalesce(inv.items, '{}'::jsonb);
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
    'captureItems', private.capture_items_json(),
    'ballAdvice', private.play_ball_advice_json(p_uid, r),
    'pendingChoices', private.pending_choices_json(p_uid),
    'settings', jsonb_build_object(
      'joinSeconds', settings->>'joinSeconds',
      'prepareSeconds', settings->>'prepareSeconds',
      'throwSeconds', settings->>'throwSeconds',
      'revealSeconds', settings->>'revealSeconds',
      'captureBalance', settings->'captureBalance'
    ),
    'channel', (select broadcaster_twitch_login from public.site_config where id = 1),
    'bitsStoreEnabled', false,
    'bitsCatalogEnabled', true,
    'coinShopEnabled', true,
    'live', (select is_live from public.stream_status where id = 1),
    'console', private.play_console_json(100)
  );
end;
$function$;

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
    raise exception 'That phase has ended.';
  end if;
  insert into public.inventories (user_id) values (uid) on conflict (user_id) do nothing;
  perform private.mark_seen(uid, r.dex);
  already := exists (select 1 from public.encounter_players where round_id = r.id and user_id = uid);
  if r.source = 'mixitup' then
    select c.twitch_user_id, c.twitch_login into twitch_user, twitch_name from private.current_twitch() c;
    if twitch_user is null or twitch_name is null then
      raise exception 'Sign in with Twitch to join the live encounter.';
    end if;
    if not already then
      perform private.enqueue_stream_command('join', jsonb_build_object('user', twitch_user, 'name', twitch_name));
    end if;
  end if;
  if already then
    return private.play_snapshot(uid, r.id) || jsonb_build_object(
      'ok', true,
      'message', 'You have joined the encounter! Please wait while other Trainers join you.'
    );
  end if;
  insert into public.encounter_players (round_id, user_id) values (r.id, uid);
  perform private.log_activity(r.id, uid, 'joined', null);
  update public.encounter_rounds
    set last_action = coalesce(private.trainer_label(uid), 'A trainer') || ' joined the encounter!',
        updated_at = now()
    where id = r.id;
  return private.play_snapshot(uid, r.id) || jsonb_build_object(
    'ok', true,
    'message', 'You have joined the encounter! Please wait while other Trainers join you.'
  );
end;
$$;

create or replace function public.play_prepare(p_item text, p_round_id uuid default null::uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  r public.encounter_rounds;
  uid uuid := auth.uid();
  twitch_user text;
  twitch_name text;
  mine public.encounter_players%rowtype;
  chosen text := coalesce(nullif(btrim(p_item), ''), 'none');
  who text;
  msg text;
  line text;
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  if not private.is_prep_item(chosen) then
    raise exception 'Use a Berry, Honey, or skip during the item phase.';
  end if;
  r := private.load_play_round(p_round_id);
  if private.round_paused(r) then
    raise exception 'The encounter is paused.';
  end if;
  if not private.prepare_action_ok(r) then
    raise exception 'That phase has ended.';
  end if;
  select * into mine from public.encounter_players
    where round_id = r.id and user_id = uid for update;
  if not found then
    raise exception 'You had to join this encounter during its join window.';
  end if;
  if mine.prep is not null then
    raise exception 'That item was already used.';
  end if;
  if mine.ball is not null or mine.result is not null then
    raise exception 'Your choices for this encounter are already locked in.';
  end if;
  if chosen <> 'none' then
    perform private.spend_bag_item(uid, chosen);
  end if;
  if r.source = 'mixitup' and chosen <> 'none' then
    select c.twitch_user_id, c.twitch_login into twitch_user, twitch_name from private.current_twitch() c;
    if twitch_user is null or twitch_name is null then
      raise exception 'Sign in with Twitch to use items on the live encounter.';
    end if;
    perform private.enqueue_stream_command('prepare', jsonb_build_object('user', twitch_user, 'name', twitch_name, 'item', private.stream_prep_item(chosen)));
  end if;
  update public.encounter_players
    set prep = chosen, prep_at = now()
    where round_id = r.id and user_id = uid;
  who := coalesce(private.trainer_label(uid), 'A trainer');
  if chosen = 'none' then
    perform private.log_activity(r.id, uid, 'prepared', 'none');
    line := who || ' is ready.';
    msg := 'You chose not to use an item. Please wait while the other Trainers make their choices.';
  elsif chosen = 'bait' then
    perform private.log_activity(r.id, uid, 'prepared', chosen);
    line := who || ' added Honey to the encounter!';
    msg := 'You have contributed Honey! Please wait while the other Trainers make their choices.';
  else
    perform private.log_activity(r.id, uid, 'prepared', chosen);
    line := who || ' has prepared an item!';
    msg := 'You have selected ' || private.item_label(chosen)
      || '! Please wait while the other Trainers make their choices.';
  end if;
  update public.encounter_rounds
    set last_action = line, updated_at = now()
    where id = r.id;
  return private.play_snapshot(uid, r.id) || jsonb_build_object('ok', true, 'message', msg);
end;
$function$;

create or replace function public.play_throw(p_item text, p_round_id uuid default null::uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  r public.encounter_rounds;
  uid uuid := auth.uid();
  twitch_user text;
  twitch_name text;
  stream_item text;
  mine public.encounter_players%rowtype;
  who text;
  line text;
  borrowed boolean := false;
  chosen text := p_item;
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  if chosen = 'standard' then
    chosen := 'pokeball';
    borrowed := true;
  end if;
  if not private.is_throw_ball(chosen) then
    raise exception 'Choose a Poké Ball from your bag.';
  end if;
  r := private.load_play_round(p_round_id);
  if private.round_paused(r) then
    raise exception 'The encounter is paused.';
  end if;
  if not private.throw_action_ok(r) then
    raise exception 'That phase has ended.';
  end if;
  select * into mine from public.encounter_players
    where round_id = r.id and user_id = uid for update;
  if not found then
    raise exception 'You had to join this encounter during its join window.';
  end if;
  if mine.ball is not null then
    raise exception 'That item was already used.';
  end if;
  if mine.result is not null then
    raise exception 'This encounter already has results.';
  end if;
  if coalesce(private.bag_item_qty(uid, chosen), 0) < 1 then
    if chosen = 'pokeball' and coalesce(private.throwable_total(uid), 0) < 1 then
      borrowed := true;
    else
      raise exception 'You no longer have that item available.';
    end if;
  end if;

  stream_item := private.stream_throw_item(chosen);
  if r.source = 'mixitup' then
    select c.twitch_user_id, c.twitch_login into twitch_user, twitch_name from private.current_twitch() c;
    if twitch_user is null or twitch_name is null then
      raise exception 'Sign in with Twitch to throw on the live encounter.';
    end if;
    perform private.enqueue_stream_command('throw', jsonb_build_object('user', twitch_user, 'name', twitch_name, 'item', stream_item));
  end if;

  who := coalesce(private.trainer_label(uid), 'A trainer');
  line := who || ' has chosen ' || private.a_or_an(private.item_label(chosen)) || ' and is ready to throw!';

  update public.encounter_players
    set ball = chosen,
        ball_at = now(),
        result_reason = case when borrowed then 'standard_throw' else result_reason end
    where round_id = r.id and user_id = uid;
  perform private.log_activity(r.id, uid, 'selected', chosen);
  update public.play_console_log l
    set message = line
    where l.round_id = r.id and l.user_id = uid and l.kind = 'selected'
      and coalesce(l.message, '') = '';
  update public.encounter_rounds
    set last_action = line, updated_at = now()
    where id = r.id;
  return private.play_snapshot(uid, r.id) || jsonb_build_object(
    'ok', true,
    'message', 'You have chosen ' || private.item_label(chosen)
      || '! Please wait while the other Trainers make their choices.'
  );
end;
$function$;

create or replace function private.play_ux_self_test()
returns table(name text, passed boolean, detail text)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  eval jsonb;
  rows jsonb;
begin
  name := 'Skip item is a valid Phase 2 choice';
  passed := private.is_prep_item('none');
  detail := 'none';
  return next;

  name := 'Honey remains a valid Phase 2 choice';
  passed := private.is_prep_item('bait');
  detail := 'bait';
  return next;

  name := 'Unknown items are not valid Phase 2 choices';
  passed := not private.is_prep_item('not-an-item');
  detail := 'blocked';
  return next;

  eval := private.capture_ball_modifier('netball', 134, false, now(), private.capture_config());
  name := 'CaptureService evaluates Net Ball vs Vaporeon';
  passed := coalesce((eval->>'conditionMet')::boolean, false)
        and coalesce((eval->>'multiplier')::numeric, 0) > 1;
  detail := coalesce(eval->>'condition', 'missing');
  return next;

  eval := private.capture_ball_modifier('masterball', 10, false, now(), private.capture_config());
  name := 'Master Ball is guaranteed by CaptureService';
  passed := coalesce((eval->>'guaranteed')::boolean, false);
  detail := 'master';
  return next;

  rows := private.play_ball_advice_json(null, null);
  name := 'Advice is empty without a signed-in Trainer';
  passed := rows = '[]'::jsonb;
  detail := 'empty';
  return next;

  name := 'Advice payload never includes raw multipliers';
  passed := not (rows::text like '%multiplier%');
  detail := 'hidden';
  return next;
end;
$function$;

revoke all on function private.play_ux_self_test() from public;

notify pgrst, 'reload schema';
