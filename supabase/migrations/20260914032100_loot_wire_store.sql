-- Store wallet, bag snapshot, Bits/store ledger wraps, and progression reward config.

create or replace function private.pending_choices_json(p_uid uuid)
returns jsonb
language sql
stable
as $function$
  select coalesce(jsonb_agg(jsonb_build_object(
    'rewardKey', reward_key,
    'remaining', remaining,
    'options', options
  ) order by created_at), '[]'::jsonb)
    from public.reward_choices
   where user_id = p_uid and remaining > 0;
$function$;

create or replace function private.daily_wallet_json(p_uid uuid)
returns jsonb
language plpgsql
stable
as $function$
declare
  today date := private.app_today();
  yesterday date := today - 1;
  claimed boolean := false;
  prev int := 0;
  streak int := 1;
  berry text := 'berry';
begin
  if p_uid is null then
    return '{}'::jsonb;
  end if;
  select true into claimed from public.daily_claims where user_id = p_uid and claim_date = today;
  claimed := coalesce(claimed, false);
  select streak_day into prev from public.daily_claims where user_id = p_uid and claim_date = yesterday;
  if claimed then
    select streak_day into streak from public.daily_claims where user_id = p_uid and claim_date = today;
  else
    streak := case when prev is null then 1 else (prev % 7) + 1 end;
  end if;
  return jsonb_build_object(
    'dailySupplyReady', not claimed,
    'dailyStreakDay', coalesce(streak, 1),
    'dailyClaimed', claimed,
    'dailyNextDate', today + 1,
    'dailyTimezone', coalesce(private.capture_config()->>'timezone', 'America/New_York'),
    'dailyPreview', jsonb_build_object(
      'pokeball', 3,
      'berry', berry,
      'coins', 50
    ) || private.daily_streak_bonus(coalesce(streak, 1)),
    'pendingChoices', private.pending_choices_json(p_uid)
  );
end;
$function$;

create or replace function public.play_store()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
  inv public.inventories;
  pass boolean := false;
  daily jsonb := '{}'::jsonb;
begin
  if uid is not null then
    inv := private.ensure_inventory(uid);
    select starlight_pass into pass from public.profiles where id = uid;
    daily := private.daily_wallet_json(uid);
  end if;
  return private.play_snapshot(uid) || jsonb_build_object(
    'ok', true,
    'catalog', private.store_catalog() || jsonb_build_object('avatars', private.premium_avatar_catalog()),
    'wallet', case when inv.user_id is null then null else jsonb_build_object(
      'coins', inv.coins,
      'capacity', private.bag_capacity(uid),
      'used', private.item_total(inv),
      'dailyReady', pass and (inv.pass_daily_at is null or inv.pass_daily_at < now() - interval '20 hours'),
      'weeklyReady', pass and (inv.pass_weekly_at is null or inv.pass_weekly_at < now() - interval '6 days'),
      'dailySupplyReady', coalesce((daily->>'dailySupplyReady')::boolean, true),
      'dailySupplyAt', inv.daily_supply_at,
      'dailyStreakDay', (daily->>'dailyStreakDay')::int,
      'dailyClaimed', coalesce((daily->>'dailyClaimed')::boolean, false),
      'dailyNextDate', daily->>'dailyNextDate',
      'dailyTimezone', daily->>'dailyTimezone',
      'dailyPreview', daily->'dailyPreview',
      'pendingChoices', daily->'pendingChoices'
    ) end
  );
end;
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

create or replace function public.play_buy_cart(p_items jsonb, p_order_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
  rec record;
  item jsonb;
  inv public.inventories;
  pack text;
  unit_cost int;
  total_cost int := 0;
  names text[] := '{}';
  scaled jsonb := '{}'::jsonb;
  qualifying int := 0;
  line_count int := 0;
  v_order uuid := coalesce(p_order_id, gen_random_uuid());
  premier int := 0;
  prior private.store_orders;
begin
  if uid is null then
    raise exception 'Sign in to use the mart.' using errcode = '42501';
  end if;

  select * into prior from private.store_orders o where o.order_id = v_order;
  if found then
    if prior.user_id <> uid then
      raise exception 'That checkout already belongs to another Trainer.';
    end if;
    return private.play_snapshot(uid) || jsonb_build_object(
      'ok', true,
      'duplicate', true,
      'premierBonus', prior.premier_bonus,
      'message', 'This checkout was already completed.'
    );
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 then
    raise exception 'Your checkout is empty.';
  end if;
  if jsonb_array_length(p_items) > 40 then
    raise exception 'Too many different items in checkout.';
  end if;

  for rec in
    select nullif(btrim(coalesce(e->>'sku', '')), '') as sku,
           sum(coalesce((e->>'qty')::int, 0))::int as qty
    from jsonb_array_elements(p_items) e
    group by 1
  loop
    line_count := line_count + 1;
    if rec.sku is null then
      raise exception 'Checkout has an unknown item.';
    end if;
    if rec.qty < 1 or rec.qty > 99 then
      raise exception 'Quantity must be between 1 and 99.';
    end if;
    item := private.store_sku_item(rec.sku);
    if item is null or coalesce((item->>'bits')::int, 0) > 0 then
      raise exception 'That shelf item is not sold for PokéCoins.';
    end if;
    if rec.sku = 'master1' or item->>'ballKey' = 'masterball' or (item->'grants' ? 'masterball') then
      raise exception 'The Master Ball is not sold on the ordinary shelf.';
    end if;
    pack := nullif(item->>'pack', '');
    if pack is not null then
      if rec.qty <> 1 then
        raise exception 'Avatar series can only be bought once.';
      end if;
      if private.owns_avatar_pack(uid, pack) then
        raise exception 'You already own %.', item->>'name';
      end if;
    end if;
    unit_cost := coalesce((item->>'cost')::int, 0);
    if unit_cost < 0 then
      raise exception 'That checkout is not valid.';
    end if;
    total_cost := total_cost + (unit_cost * rec.qty);
    names := array_append(
      names,
      (item->>'name') || case when rec.qty > 1 then ' ×' || rec.qty::text else '' end
    );
  end loop;

  if line_count < 1 then
    raise exception 'Your checkout is empty.';
  end if;

  inv := private.ensure_inventory(uid);
  perform private.adjust_coins(
    uid, -total_cost, 'STORE_PURCHASE', 'Store checkout',
    jsonb_build_object('orderId', v_order::text, 'relatedSku', names[1],
                       'idempotency', 'buy:' || v_order::text)
  );

  for rec in
    select nullif(btrim(coalesce(e->>'sku', '')), '') as sku,
           sum(coalesce((e->>'qty')::int, 0))::int as qty
    from jsonb_array_elements(p_items) e
    group by 1
  loop
    item := private.store_sku_item(rec.sku);
    pack := nullif(item->>'pack', '');
    if pack is not null then
      update public.profiles
        set owned_avatar_packs = array_append(coalesce(owned_avatar_packs, '{}'::text[]), pack),
            updated_at = now()
        where id = uid
          and not (pack = any (coalesce(owned_avatar_packs, '{}'::text[])));
    else
      select coalesce(jsonb_object_agg(key, to_jsonb(greatest(coalesce((value #>> '{}')::int, 0), 0) * rec.qty)), '{}'::jsonb)
        into scaled
        from jsonb_each(coalesce(item->'grants', '{}'::jsonb));
      perform private.grant_items(uid, coalesce(scaled, '{}'::jsonb), 'STORE_PURCHASE', v_order::text, 'buy-item:' || v_order::text || ':' || rec.sku, true);
      qualifying := qualifying + coalesce((
        select sum(greatest(coalesce((scaled->>key)::int, 0), 0))
        from jsonb_array_elements_text(private.economy_config()->'premierKeys') as key
      ), 0);
    end if;
  end loop;

  premier := (
    qualifying / greatest(coalesce((private.economy_config()->>'premierEvery')::int, 10), 1)
  )::int;
  if premier > 0 then
    perform private.grant_items(uid, jsonb_build_object('premierball', premier), 'STORE_PURCHASE', v_order::text, 'buy-premier:' || v_order::text, true);
    names := array_append(names, 'Premier Ball ×' || premier::text);
  end if;

  insert into private.store_orders (order_id, user_id, items, total_cost, premier_bonus)
  values (v_order, uid, p_items, total_cost, premier);

  return private.play_snapshot(uid) || jsonb_build_object(
    'ok', true,
    'orderId', v_order,
    'premierBonus', premier,
    'message', 'Purchased ' || array_to_string(names, ', ') || '.'
      || case when premier > 0 then ' Bonus! You received a Premier Ball!' else '' end
  );
end;
$function$;

create or replace function public.play_claim_pass(p_kind text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
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
    perform private.grant_items(uid, jsonb_build_object('berry', 2, 'bait', 1, 'coins', 20), 'DAILY_REWARD', p_kind, 'pass-daily:' || uid::text || ':' || to_char(private.app_today(), 'YYYY-MM-DD'), true);
    return private.play_snapshot(uid) || jsonb_build_object('ok', true, 'message', 'Daily Pass gift: 2 Berries, 1 Honey, 20 PokéCoins.');
  end if;
  if p_kind = 'weekly' then
    if inv.pass_weekly_at is not null and inv.pass_weekly_at > now() - interval '6 days' then
      raise exception 'Weekly Pass crate is not ready yet.';
    end if;
    update public.inventories set pass_weekly_at = now(), updated_at = now() where user_id = uid;
    perform private.grant_items(uid, jsonb_build_object('pokeball', 5, 'berry', 3, 'lure', 1, 'coins', 150), 'DAILY_REWARD', p_kind, 'pass-weekly:' || uid::text || ':' || to_char(now(), 'IYYY-IW'), true);
    return private.play_snapshot(uid) || jsonb_build_object('ok', true, 'message', 'Weekly Pass crate: 5 Poké Balls, 3 Berries, 1 Poké Radar, 150 PokéCoins.');
  end if;
  raise exception 'Unknown Pass gift.';
end;
$function$;

create or replace function public.admin_grant_bag(p_user uuid, p_grants jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  coin_delta int;
begin
  perform private.require_staff_edit();
  if p_user is null then raise exception 'Pick a trainer.'; end if;
  perform private.ensure_inventory(p_user);
  coin_delta := coalesce((p_grants->>'coins')::int, 0);
  perform private.grant_items(p_user, coalesce(p_grants, '{}'::jsonb), 'ADMIN_GRANT', 'admin', 'admin-bag:' || p_user::text || ':' || gen_random_uuid()::text, true);
  return private.admin_account_json(p_user) || jsonb_build_object('message', 'Bag updated.');
end;
$function$;

create or replace function public.admin_gift_joined(p_key text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  r public.encounter_rounds;
  v_key text;
  grants jsonb;
  uid uuid;
  given int := 0;
  skipped int := 0;
  joiners int := 0;
  label text;
  stamp text := replace(clock_timestamp()::text, ' ', '');
begin
  perform private.require_hub();
  v_key := btrim(lower(coalesce(p_key, '')));
  if v_key = '' then
    raise exception 'Pick a supply or Poké Ball.';
  end if;
  if v_key not in ('berry', 'bait', 'lure', 'pokeball', 'greatball', 'ultraball', 'bag_bonus')
     and not (v_key = any (private.extra_ball_keys())) then
    raise exception 'That item cannot be gifted.';
  end if;
  r := private.sync_latest_round();
  if not private.round_is_active(r) then
    raise exception 'Start an encounter first.';
  end if;
  select count(*)::int into joiners from public.encounter_players where round_id = r.id;
  if joiners < 1 then
    raise exception 'No trainers have joined this encounter yet.';
  end if;
  grants := jsonb_build_object(v_key, 1);
  label := case v_key
    when 'bag_bonus' then 'Bag space'
    when 'lure' then 'Poké Radar'
    else private.item_label(v_key)
  end;
  for uid in select user_id from public.encounter_players where round_id = r.id loop
    begin
      perform private.grant_items(uid, grants, 'ADMIN_GRANT', r.id::text, 'gift:' || r.id::text || ':' || uid::text || ':' || v_key || ':' || stamp, false);
      given := given + 1;
    exception when others then
      skipped := skipped + 1;
    end;
  end loop;
  update public.encounter_rounds
    set last_action = format('Staff sent +1 %s', label),
        updated_at = now()
    where id = r.id;
  perform private.staff_console(
    r.id,
    'gift',
    v_key,
    format('Sent +1 %s to %s trainer%s%s.',
      label,
      given,
      case when given = 1 then '' else 's' end,
      case when skipped > 0 then format(' (%s bag%s full)', skipped, case when skipped = 1 then '' else 's' end) else '' end
    )
  );
  return private.admin_overview() || jsonb_build_object(
    'ok', true,
    'given', given,
    'skipped', skipped,
    'message', format('Gave +1 %s to %s trainer%s who joined.', label, given, case when given = 1 then '' else 's' end)
  );
end;
$function$;

create or replace function public.credit_bits_from_twitch(
  p_event_id text,
  p_login text,
  p_title text,
  p_bits int
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  login text := lower(btrim(coalesce(p_login, '')));
  sku text;
  item jsonb;
  trainer uuid;
  inserted text;
  note text;
begin
  if btrim(coalesce(p_event_id, '')) = '' then
    raise exception 'Missing Bits event id.';
  end if;
  sku := private.bits_sku(p_title, p_bits);
  insert into private.bits_events (event_id, twitch_login, sku, granted, detail)
  values (p_event_id, login, coalesce(sku, ''), false, '')
  on conflict (event_id) do nothing
  returning event_id into inserted;
  if inserted is null then
    return jsonb_build_object('ok', true, 'duplicate', true, 'message', 'Already credited.');
  end if;
  if sku is null then
    note := 'Unknown Power-Up "' || coalesce(p_title, '') || '" (' || coalesce(p_bits, 0)::text || ' Bits).';
    update private.bits_events set detail = note where event_id = p_event_id;
    update private.stream_bridge
      set last_bits_at = now(), last_bits_detail = note
      where id = 1;
    return jsonb_build_object('ok', true, 'granted', false, 'message', note);
  end if;
  select elem into item
    from jsonb_array_elements(private.store_catalog()->'bits') as elem
   where elem->>'sku' = sku;
  if item is null then
    note := 'Unknown Bits pack.';
    update private.bits_events set detail = note where event_id = p_event_id;
    return jsonb_build_object('ok', true, 'granted', false, 'message', note);
  end if;
  if login = '' then
    note := 'Twitch did not send a viewer login.';
    update private.bits_events set detail = note where event_id = p_event_id;
    return jsonb_build_object('ok', true, 'granted', false, 'message', note);
  end if;
  select id into trainer from public.profiles where lower(twitch_login) = login;
  if trainer is null then
    insert into private.bits_pending (event_id, twitch_login, sku)
    values (p_event_id, login, sku)
    on conflict (event_id) do nothing;
    note := (item->>'name') || ' is waiting. ' || login || ' needs to sign into Play once.';
    update private.bits_events set detail = note where event_id = p_event_id;
    update private.stream_bridge
      set last_bits_at = now(), last_bits_detail = note
      where id = 1;
    return jsonb_build_object('ok', true, 'pending', true, 'sku', sku, 'message', note);
  end if;
  begin
    perform private.grant_items(trainer, item->'grants', 'BITS_REWARD', sku, 'bits:' || p_event_id, true);
    note := 'Granted ' || (item->>'name') || ' to ' || login || '.';
    update private.bits_events set granted = true, detail = note where event_id = p_event_id;
    update private.stream_bridge
      set last_bits_at = now(), last_bits_detail = note
      where id = 1;
    return jsonb_build_object('ok', true, 'granted', true, 'sku', sku, 'message', note);
  exception when others then
    insert into private.bits_pending (event_id, twitch_login, sku)
    values (p_event_id, login, sku)
    on conflict (event_id) do nothing;
    note := sqlerrm;
    update private.bits_events set detail = note where event_id = p_event_id;
    update private.stream_bridge
      set last_bits_at = now(), last_bits_detail = note
      where id = 1;
    return jsonb_build_object('ok', true, 'pending', true, 'sku', sku, 'message', note);
  end;
end;
$function$;

revoke all on function public.credit_bits_from_twitch(text, text, text, int) from public, anon, authenticated;
grant execute on function public.credit_bits_from_twitch(text, text, text, int) to service_role;

create or replace function private.flush_bits_pending(p_uid uuid)
returns void
language plpgsql
as $function$
declare
  login text;
  rec record;
  item jsonb;
begin
  if p_uid is null then
    return;
  end if;
  if current_setting('play.flushing_bits', true) = '1' then
    return;
  end if;
  perform set_config('play.flushing_bits', '1', true);
  select lower(twitch_login) into login from public.profiles where id = p_uid;
  if login is null or login = '' then
    return;
  end if;
  for rec in
    select event_id, sku
      from private.bits_pending
     where lower(twitch_login) = login
     order by created_at
  loop
    select elem into item
      from jsonb_array_elements(private.store_catalog()->'bits') as elem
     where elem->>'sku' = rec.sku;
    if item is null then
      delete from private.bits_pending where event_id = rec.event_id;
      update private.bits_events
         set detail = 'Unknown Bits pack.', granted = false
       where event_id = rec.event_id;
      continue;
    end if;
    begin
      perform private.grant_items(p_uid, item->'grants', 'BITS_REWARD', rec.sku, 'bits:' || rec.event_id, true);
      delete from private.bits_pending where event_id = rec.event_id;
      update private.bits_events
         set granted = true, detail = 'Granted ' || (item->>'name') || ' to ' || login || '.'
       where event_id = rec.event_id;
    exception when others then
      update private.bits_events
         set detail = sqlerrm
       where event_id = rec.event_id;
    end;
  end loop;
end;
$function$;

create or replace function private.evaluate_achievements(p_uid uuid, p_grant_items boolean default true)
returns void
language plpgsql
as $function$
declare
  rec public.progression_achievements;
  prog int;
  just_unlocked boolean;
begin
  if p_uid is null then
    return;
  end if;
  for rec in select * from public.progression_achievements where enabled loop
    prog := private.achievement_progress(p_uid, rec);
    insert into public.trainer_achievements (user_id, achievement_id, progress)
    values (p_uid, rec.id, prog)
    on conflict (user_id, achievement_id) do update
      set progress = excluded.progress;
    if prog < rec.target_value then
      continue;
    end if;
    update public.trainer_achievements
       set unlocked_at = coalesce(unlocked_at, now())
     where user_id = p_uid and achievement_id = rec.id and unlocked_at is null;
    just_unlocked := found;
    if just_unlocked then
      perform private.push_notice(
        p_uid, 'achievement',
        'Achievement unlocked',
        rec.name,
        jsonb_build_object('id', rec.id, 'name', rec.name, 'description', rec.description, 'rewards', rec.rewards)
      );
    end if;
    update public.trainer_achievements
       set reward_granted_at = now()
     where user_id = p_uid and achievement_id = rec.id and reward_granted_at is null;
    if found then
      if p_grant_items then
        perform private.grant_progress_rewards(
          p_uid,
          coalesce(rec.rewards, '{}'::jsonb)
            || jsonb_build_object(
              'label', rec.name,
              'reason', 'ACHIEVEMENT_REWARD',
              'idempotency', 'ach:' || p_uid::text || ':' || rec.id,
              'key', rec.id
            ),
          false
        );
      else
        if rec.rewards ? 'title' then perform private.unlock_title(p_uid, rec.rewards->>'title', false); end if;
        if rec.rewards ? 'badge' then perform private.unlock_badge(p_uid, rec.rewards->>'badge', false); end if;
      end if;
    end if;
  end loop;
end;
$function$;

create or replace function private.process_level_ups(p_uid uuid, p_from int, p_to int, p_grant_items boolean default true)
returns void
language plpgsql
as $function$
declare
  rec jsonb;
  lvl int;
  key text;
begin
  if p_uid is null or coalesce(p_to, 0) <= coalesce(p_from, 0) then
    return;
  end if;
  for rec in
    select value from jsonb_array_elements(coalesce(private.progression_config()->'levelRewards', '[]'::jsonb))
  loop
    lvl := coalesce((rec->>'level')::int, 0);
    if lvl <= p_from or lvl > p_to then
      continue;
    end if;
    key := 'level:' || lvl::text;
    insert into public.trainer_milestones (user_id, key)
    values (p_uid, key)
    on conflict do nothing;
    if not found then
      continue;
    end if;
    if p_grant_items then
      perform private.grant_progress_rewards(
        p_uid,
        coalesce(rec->'grants', '{}'::jsonb)
          || jsonb_build_object(
            'title', rec->>'title',
            'badge', rec->>'badge',
            'label', coalesce(rec->>'label', 'Trainer Level ' || lvl::text),
            'reason', 'LEVEL_REWARD',
            'idempotency', 'level:' || p_uid::text || ':' || key,
            'key', key
          ),
        true
      );
    else
      if rec ? 'title' then perform private.unlock_title(p_uid, rec->>'title', false); end if;
      if rec ? 'badge' then perform private.unlock_badge(p_uid, rec->>'badge', false); end if;
    end if;
    perform private.push_notice(
      p_uid, 'level',
      'Trainer Level Up!',
      'Level ' || p_from::text || ' → ' || p_to::text,
      jsonb_build_object('from', p_from, 'to', p_to, 'level', lvl, 'reward', rec)
    );
  end loop;
  if not exists (
    select 1 from jsonb_array_elements(coalesce(private.progression_config()->'levelRewards', '[]'::jsonb)) v
    where coalesce((v.value->>'level')::int, 0) > p_from and coalesce((v.value->>'level')::int, 0) <= p_to
  ) and p_to > p_from then
    perform private.push_notice(
      p_uid, 'level',
      'Trainer Level Up!',
      'Level ' || p_from::text || ' → ' || p_to::text,
      jsonb_build_object('from', p_from, 'to', p_to)
    );
  end if;
end;
$function$;

update public.progression_achievements
   set rewards = '{"title":"trader","linkingcord":1}'::jsonb
 where id = 'trade-1';

update public.site_config
   set game_settings = jsonb_set(
         jsonb_set(
           coalesce(game_settings, '{}'::jsonb),
           '{economyBalance,dexMilestones}',
           '[
              {"species":10,"grants":{"greatball":5},"title":"rookie-trainer","badge":"kanto-10","label":"10 species"},
              {"species":25,"grants":{"coins":500,"bait":2},"title":"kanto-explorer","badge":"kanto-25","label":"25 species"},
              {"species":50,"grants":{"ultraball":3},"title":"pokedex-researcher","badge":"kanto-50","label":"50 species"},
              {"species":75,"grants":{"_choice":{"reward_key":"dex:75","remaining":3,"options":["firestone","waterstone","thunderstone","leafstone","moonstone"]}},"label":"75 species"},
              {"species":100,"grants":{"goldenrazz":2,"ultraball":1},"title":"veteran-collector","badge":"kanto-100","label":"100 species"},
              {"species":125,"grants":{"linkingcord":1},"label":"125 species"},
              {"species":140,"grants":{"premierball":5,"razz":3,"sitrus":2},"title":"kanto-waiting","label":"140 species"},
              {"species":150,"grants":{"ultraball":5,"goldenrazz":3,"linkingcord":1},"label":"150 species"},
              {"species":151,"grants":{"coins":2500,"cherishball":1,"masterball":1},"title":"kanto-master","badge":"kanto-complete","label":"Kanto Pokédex Master"}
            ]'::jsonb
         ),
         '{progressionBalance,levelRewards}',
         '[
            {"level":5,"label":"Level 5","grants":{"greatball":5},"title":"rising-trainer"},
            {"level":10,"label":"Level 10","grants":{"bait":2},"title":"trainer"},
            {"level":15,"label":"Level 15","grants":{"ultraball":1}},
            {"level":20,"label":"Level 20","grants":{"_choice":{"reward_key":"level:20","remaining":1,"options":["firestone","waterstone","thunderstone","leafstone","moonstone"]}},"badge":"level-20"},
            {"level":25,"label":"Level 25","grants":{"ultraball":3}},
            {"level":30,"label":"Level 30","grants":{"goldenrazz":1},"title":"seasoned-trainer"},
            {"level":40,"label":"Level 40","grants":{"linkingcord":1},"title":"elite-trainer"},
            {"level":50,"label":"Level 50","grants":{"ultraball":2,"goldenrazz":1,"premierball":3},"title":"starlight-veteran","badge":"level-50"}
          ]'::jsonb
       ),
       updated_at = now()
 where id = 1;
