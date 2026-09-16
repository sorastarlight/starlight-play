-- Phase 4: catch Candy grant restore, bag merge order, cancel bookkeeping,
-- RLS initplan wraps, justified indexes, Game Health RPC, candy self-test.
-- Does not mutate historical Trainer Candy balances.

create or replace function private.merge_inventory_layers(inv public.inventories)
returns jsonb
language sql
stable
as $$
  -- items first, balls last so inventories.balls.masterball is authoritative
  select coalesce(inv.items, '{}'::jsonb)
      || coalesce(inv.berries, '{}'::jsonb)
      || coalesce(inv.balls, '{}'::jsonb);
$$;

create or replace function private.after_catch_xp()
returns trigger
language plpgsql
as $function$
declare
  cfg jsonb := private.progression_config();
  first_species boolean;
  first_female boolean;
  first_shiny boolean;
  catch_rate int;
  pay int;
begin
  if private.round_is_test(new.round_id) then
    return new;
  end if;
  perform private.ensure_inventory(new.user_id);
  perform private.ensure_trainer_stats(new.user_id);
  if new.round_id is not null then
    perform private.register_capture_collection(new);
  end if;
  perform private.grant_xp(
    new.user_id, coalesce((cfg->>'catchXp')::int, 10), 'CAPTURE', 'Successful catch',
    jsonb_build_object('idempotency', 'xp-catch:' || new.id::text)
  );
  select not exists (
    select 1 from public.catches where user_id = new.user_id and dex = new.dex and id <> new.id
  ) into first_species;
  if first_species then
    perform private.grant_xp(
      new.user_id, coalesce((cfg->>'newDexXp')::int, 25), 'NEW_DEX', 'New Pokédex species',
      jsonb_build_object('idempotency', 'xp-dex:' || new.user_id::text || ':' || new.dex::text)
    );
    update public.trainer_stats
       set first_pokemon_dex = coalesce(first_pokemon_dex, new.dex), updated_at = now()
     where user_id = new.user_id;
  end if;
  if new.gender = 'Female' and new.dex = any (private.female_visual_dex()) then
    select not exists (
      select 1 from public.catches
       where user_id = new.user_id and dex = new.dex and id <> new.id
         and (gender = 'Female' or variant like '%female%')
    ) into first_female;
    if first_female then
      perform private.grant_xp(
        new.user_id, coalesce((cfg->>'firstFemaleXp')::int, 5), 'FIRST_FEMALE', 'First female variant',
        jsonb_build_object('idempotency', 'xp-female:' || new.user_id::text || ':' || new.dex::text)
      );
    end if;
  end if;
  if new.variant like '%shiny%' then
    select not exists (
      select 1 from public.catches
       where user_id = new.user_id and dex = new.dex and id <> new.id and variant like '%shiny%'
    ) into first_shiny;
    if first_shiny then
      perform private.grant_xp(
        new.user_id, coalesce((cfg->>'shinyXp')::int, 50), 'SHINY', 'First shiny of this species',
        jsonb_build_object('idempotency', 'xp-shiny:' || new.user_id::text || ':' || new.dex::text)
      );
      update public.trainer_stats
         set first_shiny_dex = coalesce(first_shiny_dex, new.dex), updated_at = now()
       where user_id = new.user_id;
    end if;
  end if;
  select s.catch_rate into catch_rate from public.species s where s.dex = new.dex;
  if exists (select 1 from public.species s where s.dex = new.dex and s.is_legendary) then
    pay := coalesce((cfg->>'legendaryXp')::int, 25);
  elsif coalesce(catch_rate, 255) <= 9 then
    pay := coalesce((cfg->>'ultraRareXp')::int, 15);
  elsif coalesce(catch_rate, 255) <= 25 then
    pay := coalesce((cfg->>'veryRareXp')::int, 10);
  elsif coalesce(catch_rate, 255) <= 75 then
    pay := coalesce((cfg->>'rareXp')::int, 5);
  else
    pay := 0;
  end if;
  if pay > 0 then
    perform private.grant_xp(
      new.user_id, pay, 'RARITY', 'Rare capture bonus',
      jsonb_build_object('idempotency', 'xp-rare:' || coalesce(new.id::text, new.dex::text))
    );
  end if;
  return new;
end;
$function$;

create or replace function public.admin_cancel_round()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
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
      if rec.throw_processed and rec.result_reason is distinct from 'no_ball_left' then
        perform private.restore_bag_item(rec.user_id, rec.ball);
      end if;
    end loop;
  end if;
  update public.encounter_rounds
    set cancelled = true,
        resolved = true,
        hidden = true,
        phase = 'closed',
        paused_at = null,
        last_action = 'Encounter cancelled',
        updated_at = now()
    where id = r.id;
  perform private.staff_console(r.id, 'cancel', null, 'Encounter cancelled.');
  return private.admin_overview() || jsonb_build_object('ok', true, 'message', 'Encounter cancelled.');
end;
$function$;

create or replace function private.play_snapshot(p_uid uuid, p_round_id uuid default null)
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
      update public.inventories set lure_armed = radar_on, updated_at = now() where user_id = p_uid;
      inv.lure_armed := radar_on;
    end if;
    if r is not null and coalesce(r.cancelled, false) = false and private.round_phase(r) <> 'closed' then
      perform private.mark_seen(p_uid, r.dex);
    end if;
    bag := jsonb_build_object(
      'berry', inv.berry, 'bait', inv.bait, 'pokeball', inv.pokeball,
      'greatball', inv.greatball, 'ultraball', inv.ultraball,
      'lure', inv.lure, 'coins', inv.coins,
      'capacity', private.bag_capacity(p_uid), 'used', private.item_total(inv),
      'lureArmed', radar_on, 'lureUntil', inv.lure_until
    ) || private.merge_inventory_layers(inv);
    select jsonb_build_object('active', p.starlight_pass, 'source', p.pass_source, 'checkedAt', p.pass_checked_at),
           private.normalize_encounter_settings(p.encounter_settings)
      into pass, enc from public.profiles p where p.id = p_uid;
    if r is not null then
      select jsonb_build_object('joined', true, 'prep', ep.prep, 'ball', ep.ball, 'result', ep.result, 'chance', ep.chance, 'caught', ep.caught)
        into me from public.encounter_players ep where ep.round_id = r.id and ep.user_id = p_uid;
    end if;
  end if;
  visible := private.public_round_json(r);
  return jsonb_build_object(
    'round', visible, 'me', me, 'youJoined', me is not null, 'bag', bag, 'pass', pass,
    'trainer', private.trainer_card(p_uid), 'ownedAvatarPacks', private.owned_avatar_packs_json(p_uid),
    'encounterSettings', enc, 'isAdmin', is_admin, 'staffRole', staff_role,
    'canManageSecrets', staff_role = 'owner', 'captureItems', private.capture_items_json(),
    'ballAdvice', private.play_ball_advice_json(p_uid, r),
    'pendingChoices', private.pending_choices_json(p_uid),
    'settings', jsonb_build_object(
      'clientBuild', private.client_build(), 'joinSeconds', settings->>'joinSeconds', 'prepareSeconds', settings->>'prepareSeconds',
      'throwSeconds', settings->>'throwSeconds', 'revealSeconds', settings->>'revealSeconds',
      'captureBalance', settings->'captureBalance'
    ),
    'channel', (select broadcaster_twitch_login from public.site_config where id = 1),
    'bitsStoreEnabled', false, 'bitsCatalogEnabled', true, 'coinShopEnabled', true,
    'live', (select is_live from public.stream_status where id = 1),
    'console', private.play_console_json(100)
  );
end;
$function$;

create or replace function private.admin_account_json(p_user uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  p public.profiles%rowtype;
  inv public.inventories;
  bag jsonb;
  mons jsonb;
  conns jsonb;
  candy jsonb;
  primary_login text;
  gameplay_n int := 0;
  bot_n int := 0;
begin
  select * into p from public.profiles where id = p_user;
  if p.id is null then
    raise exception 'No Play account for that trainer.';
  end if;
  select * into inv from public.inventories where user_id = p_user;
  if inv.user_id is null then
    bag := jsonb_build_object(
      'berry', 0, 'bait', 0, 'pokeball', 0, 'greatball', 0, 'ultraball', 0,
      'lure', 0, 'coins', 0, 'bag_bonus', 0, 'capacity', 50, 'used', 0
    );
  else
    bag := jsonb_build_object(
      'berry', inv.berry, 'bait', inv.bait, 'pokeball', inv.pokeball,
      'greatball', inv.greatball, 'ultraball', inv.ultraball,
      'lure', inv.lure, 'coins', inv.coins, 'bag_bonus', inv.bag_bonus,
      'capacity', private.bag_capacity(p_user),
      'used', private.item_total(inv)
    ) || private.merge_inventory_layers(inv);
  end if;
  select coalesce(jsonb_agg(row_to_json(x)::jsonb), '[]'::jsonb)
    into mons
    from (
      select c.id, c.dex, c.name, c.nickname, c.variant, c.gender, c.ball, c.level, c.caught_at as "caughtAt"
      from public.catches c
      where c.user_id = p_user and c.transferred_at is null
      order by c.caught_at desc
      limit 40
    ) x;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'twitchUserId', c.twitch_user_id,
    'login', c.twitch_login,
    'displayName', c.twitch_display_name,
    'avatar', c.avatar_url,
    'primary', c.is_primary,
    'gameplayEnabled', c.gameplay_enabled,
    'loginEnabled', c.login_enabled,
    'type', c.connection_type,
    'status', c.authorization_status,
    'confirmed', c.confirmed,
    'linkedAt', c.linked_at,
    'lastVerifiedAt', c.last_verified_at
  ) order by c.is_primary desc, c.linked_at), '[]'::jsonb)
    into conns
    from public.twitch_connections c
   where c.user_id = p_user;
  select coalesce(jsonb_agg(jsonb_build_object(
    'familyId', f.id,
    'name', f.name,
    'baseDex', f.base_dex,
    'qty', coalesce(c.qty, 0),
    'members', coalesce((
      select jsonb_agg(x.name order by x.dex)
      from (
        select distinct on (s.dex) s.dex, s.name
        from public.species s
        where s.dex between 1 and 151
          and (
            s.family_id = f.id
            or coalesce(s.family_candy_species_id, 0) = f.id
            or s.dex = f.base_dex
          )
        order by s.dex
      ) x
    ), '[]'::jsonb)
  ) order by f.id), '[]'::jsonb)
    into candy
    from public.evolution_families f
    left join public.family_candy c
      on c.user_id = p_user and c.family_id = f.id
   where f.id between 1 and 151;
  select c.twitch_login into primary_login
    from public.twitch_connections c
   where c.user_id = p_user and c.confirmed and c.is_primary
   limit 1;
  select count(*)::int into gameplay_n
    from public.twitch_connections c
   where c.user_id = p_user and c.confirmed and c.gameplay_enabled;
  select count(*)::int into bot_n
    from public.twitch_connections c
   where c.user_id = p_user and c.confirmed and c.connection_type in ('bot', 'utility');
  return jsonb_build_object(
    'ok', true,
    'user', jsonb_build_object(
      'id', p.id,
      'username', p.username,
      'login', coalesce(primary_login, p.twitch_login),
      'displayName', coalesce(nullif(p.display_name, ''), p.username, p.twitch_login, 'Trainer'),
      'avatar', p.avatar_url,
      'role', coalesce(private.play_staff_role(p.id), 'player'),
      'pass', p.starlight_pass,
      'createdAt', p.created_at,
      'lastSeenAt', p.last_seen_at,
      'emailLogin', private.profile_has_password(p.id)
    ),
    'health', jsonb_build_object(
      'primaryTwitch', primary_login,
      'linkedTwitch', coalesce(jsonb_array_length(conns), 0),
      'gameplayTwitch', gameplay_n,
      'botTwitch', bot_n
    ),
    'bagSource', jsonb_build_object(
      'ballsMasterball', coalesce((inv.balls->>'masterball')::int, 0),
      'itemsMasterball', coalesce((inv.items->>'masterball')::int, 0),
      'displayMasterball', coalesce((bag->>'masterball')::int, 0)
    ),
    'connections', conns,
    'bag', bag,
    'candy', candy,
    'mons', mons,
    'staffRole', private.play_staff_role(),
    'canEdit', coalesce(private.play_staff_role(), '') in ('owner', 'admin'),
    'ownerTools', private.play_staff_role() = 'owner'
  );
end;
$$;

alter policy "users can read own candies" on public.candies
  using (user_id = (select auth.uid()));
alter policy "users can read own catches" on public.catches
  using (user_id = (select auth.uid()));
alter policy coin_ledger_own on public.coin_ledger
  using ((select auth.uid()) = user_id);
alter policy daily_claims_own on public.daily_claims
  using ((select auth.uid()) = user_id);
alter policy direct_trades_own on public.direct_trades
  using (((select auth.uid()) = a_user) or ((select auth.uid()) = b_user));
alter policy "users can read own encounter actions" on public.encounter_players
  using (user_id = (select auth.uid()));
alter policy family_candy_own on public.family_candy
  using ((select auth.uid()) = user_id);
alter policy "users can read own inventory" on public.inventories
  using (user_id = (select auth.uid()));
alter policy item_ledger_own on public.item_ledger
  using ((select auth.uid()) = user_id);
alter policy "users can read own oak transfers" on public.oak_transfers
  using (user_id = (select auth.uid()));
alter policy "users can read own profile" on public.profiles
  using (id = (select auth.uid()));
alter policy reward_choices_own on public.reward_choices
  using ((select auth.uid()) = user_id);
alter policy species_mastery_own on public.species_mastery
  using ((select auth.uid()) = user_id);
alter policy "trainers read own seen" on public.species_seen
  using (user_id = (select auth.uid()));
alter policy "staff can read own role" on public.staff_roles
  using (user_id = (select auth.uid()));
alter policy "users can read trade offers" on public.trade_offers
  using ((user_id = (select auth.uid())) or (exists (
    select 1 from public.trade_listings l
    where l.id = trade_offers.listing_id and l.user_id = (select auth.uid())
  )));
alter policy trainer_achievements_own on public.trainer_achievements
  using ((select auth.uid()) = user_id);
alter policy trainer_badges_own on public.trainer_badges
  using ((select auth.uid()) = user_id);
alter policy trainer_milestones_own on public.trainer_milestones
  using ((select auth.uid()) = user_id);
alter policy trainer_notices_own on public.trainer_notices
  using ((select auth.uid()) = user_id);
alter policy trainer_stats_own on public.trainer_stats
  using ((select auth.uid()) = user_id);
alter policy trainer_titles_own on public.trainer_titles
  using ((select auth.uid()) = user_id);
alter policy "trainers read own twitch connections" on public.twitch_connections
  using (user_id = (select auth.uid()));
alter policy xp_ledger_own on public.xp_ledger
  using ((select auth.uid()) = user_id);

create index if not exists catches_user_id_idx on public.catches (user_id);
create index if not exists encounter_players_user_id_idx on public.encounter_players (user_id);

create or replace function public.admin_game_health()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  mig text;
  rounds_24 int := 0;
  resolved_24 int := 0;
  cancelled_24 int := 0;
  cancelled_open int := 0;
  cancelled_unresolved_closed int := 0;
  neg_coins int := 0;
  neg_balls int := 0;
  neg_candy int := 0;
  twitch_live boolean;
  twitch_login text;
  client_build text;
  app_status text;
  db_status text;
  enc_status text;
  eco_status text;
  auth_status text;
  twitch_status text;
begin
  if not private.is_play_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  begin
    select version into mig from supabase_migrations.schema_migrations order by version desc limit 1;
  exception when others then
    mig := null;
  end;
  client_build := private.client_build();
  select count(*)::int,
         count(*) filter (where resolved)::int,
         count(*) filter (where cancelled)::int
    into rounds_24, resolved_24, cancelled_24
    from public.encounter_rounds
   where started_at > now() - interval '24 hours'
      or updated_at > now() - interval '24 hours';
  select count(*)::int into cancelled_open
    from public.encounter_rounds
   where cancelled and coalesce(phase, '') is distinct from 'closed';
  select count(*)::int into cancelled_unresolved_closed
    from public.encounter_rounds
   where cancelled and not resolved and coalesce(phase, '') = 'closed';
  select count(*)::int into neg_coins from public.inventories where coalesce(coins, 0) < 0;
  select count(*)::int into neg_balls
    from public.inventories
   where coalesce(pokeball, 0) < 0 or coalesce(greatball, 0) < 0 or coalesce(ultraball, 0) < 0
      or coalesce((balls->>'masterball')::int, 0) < 0;
  select count(*)::int into neg_candy from public.family_candy where coalesce(qty, 0) < 0;
  select is_live into twitch_live from public.stream_status where id = 1;
  select broadcaster_twitch_login into twitch_login from public.site_config where id = 1;

  app_status := case
    when coalesce(client_build, '') = '' then 'WARNING'
    else 'HEALTHY'
  end;
  db_status := case when mig is null then 'UNKNOWN' else 'HEALTHY' end;
  enc_status := case
    when cancelled_open > 0 then 'ACTION NEEDED'
    else 'HEALTHY'
  end;
  eco_status := case
    when neg_coins > 0 or neg_balls > 0 or neg_candy > 0 then 'ACTION NEEDED'
    else 'HEALTHY'
  end;
  auth_status := 'UNKNOWN';
  twitch_status := case
    when coalesce(twitch_login, '') = '' then 'WARNING'
    when twitch_live then 'HEALTHY'
    else 'HEALTHY'
  end;

  return jsonb_build_object(
    'ok', true,
    'application', jsonb_build_object(
      'status', app_status,
      'clientBuild', client_build,
      'dbMigration', mig,
      'detail', 'Reuse Build Health for APP_BUILD / sprite / stale-client.'
    ),
    'database', jsonb_build_object(
      'status', db_status,
      'dbMigration', mig,
      'detail', case when mig is null then 'Migration catalog unavailable.' else 'Latest applied migration listed.' end
    ),
    'encounters', jsonb_build_object(
      'status', enc_status,
      'recent24h', rounds_24,
      'resolved24h', resolved_24,
      'cancelled24h', cancelled_24,
      'cancelledOpen', cancelled_open,
      'cancelledUnresolvedClosed', cancelled_unresolved_closed,
      'detail', case
        when cancelled_open > 0 then 'A cancelled round is not closed.'
        when cancelled_unresolved_closed > 0 then 'Historical cancelled rounds may still have resolved=false. Future cancels set resolved=true. Not live blockers.'
        else 'No open cancelled rounds.'
      end
    ),
    'economy', jsonb_build_object(
      'status', eco_status,
      'negativeCoins', neg_coins,
      'negativeBalls', neg_balls,
      'negativeCandy', neg_candy,
      'detail', case
        when neg_coins + neg_balls + neg_candy > 0 then 'Negative quantities found. Do not auto-repair.'
        else 'No negative currency, balls, or Evolution Candy.'
      end
    ),
    'auth', jsonb_build_object(
      'status', auth_status,
      'detail', 'Leaked-password protection is a Supabase Auth dashboard setting, not a database flag.'
    ),
    'twitch', jsonb_build_object(
      'status', twitch_status,
      'streamAccount', twitch_login,
      'live', coalesce(twitch_live, false),
      'detail', 'Live controls stay on Dashboard / Stream Session.'
    ),
    'assets', jsonb_build_object(
      'status', 'UNKNOWN',
      'detail', 'Asset HEAD checks and fallbacks are client-side. Use Encounter Asset Health.'
    ),
    'performance', jsonb_build_object(
      'status', 'UNKNOWN',
      'detail', 'Performance mode is a Trainer preference (AUTO/HIGH/BALANCED/LOW).'
    )
  );
end;
$$;

grant execute on function public.admin_game_health() to authenticated;

create or replace function private.phase4_catch_candy_selftest()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  tester uuid := 'a98cbf81-a6b2-4dbf-8448-8d62f6d5f523';
  rid uuid := gen_random_uuid();
  cid uuid := gen_random_uuid();
  before_qty int := 0;
  after_qty int := 0;
  led boolean := false;
  pay int := 0;
  passed boolean := false;
  detail text := '';
begin
  select coalesce(qty, 0) into before_qty from public.family_candy where user_id = tester and family_id = 129;
  select private.candy_for_stage(evo_stage) into pay from public.species where dex = 129;
  insert into public.encounter_rounds (
    id, phase, hidden, pokemon, dex, name, variant, gender, started_at, deadlines, rules,
    resolved, cancelled, last_action, ends_at, trigger_source, source
  ) values (
    rid, 'closed', true,
    jsonb_build_object('dex', 129, 'name', 'Magikarp'),
    129, 'Magikarp', 'normal', 'Male', now(), '{}'::jsonb,
    jsonb_build_object('testRewards', true, 'phase4Selftest', true),
    true, true, 'phase4 candy selftest', now(), 'TEST', 'play'
  );
  insert into public.catches (id, user_id, dex, name, variant, gender, ball, round_id, source_key)
  values (cid, tester, 129, 'Magikarp', 'normal', 'Male', 'pokeball', rid, 'phase4-candy-selftest:' || cid::text);
  select exists (
    select 1 from public.candy_ledger
    where user_id = tester and idempotency = 'candy-catch:' || cid::text and amount = pay
  ) into led;
  select coalesce(qty, 0) into after_qty from public.family_candy where user_id = tester and family_id = 129;
  passed := led and after_qty = before_qty + pay and pay > 0;
  detail := format('ledger=%s pay=%s before=%s after=%s', led, pay, before_qty, after_qty);

  delete from public.candy_ledger where idempotency = 'candy-catch:' || cid::text;
  delete from public.xp_ledger where idempotency in (
    'xp-catch:' || cid::text,
    'xp-rare:' || cid::text
  ) or idempotency like 'xp-dex:' || tester::text || ':129';
  begin
    delete from public.species_mastery where user_id = tester and dex = 129
      and (source_key in ('mastery-catch:' || cid::text, 'mastery-shiny:' || cid::text, 'mastery-female:' || cid::text)
           or idempotency in ('mastery-catch:' || cid::text, 'mastery-shiny:' || cid::text, 'mastery-female:' || cid::text));
  exception when others then
    null;
  end;
  delete from public.trainer_notices where user_id = tester and created_at > now() - interval '2 minutes'
    and coalesce(payload->>'catchId', '') = cid::text;
  begin
    delete from public.play_notices where created_at > now() - interval '2 minutes';
  exception when undefined_table then
    null;
  end;
  delete from public.catches where id = cid;
  delete from public.encounter_rounds where id = rid;
  if exists (select 1 from public.family_candy where user_id = tester and family_id = 129) then
    update public.family_candy set qty = before_qty
     where user_id = tester and family_id = 129;
  end if;

  return jsonb_build_object('passed', passed, 'detail', detail, 'pay', pay);
exception when others then
  begin
    delete from public.candy_ledger where idempotency = 'candy-catch:' || cid::text;
    delete from public.catches where id = cid;
    delete from public.encounter_rounds where id = rid;
    update public.family_candy set qty = before_qty
     where user_id = tester and family_id = 129;
  exception when others then
    null;
  end;
  return jsonb_build_object('passed', false, 'detail', sqlerrm);
end;
$$;
