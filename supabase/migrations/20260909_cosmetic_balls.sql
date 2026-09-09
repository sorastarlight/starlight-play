-- Cosmetic extra Poké Balls: bag jsonb, mart case, throw odds, stream mapping.

alter table public.inventories
  add column if not exists balls jsonb not null default '{}'::jsonb;

create or replace function private.extra_ball_keys()
returns text[]
language sql
immutable
as $$
  select array[
    'premierball','luxuryball','healball','friendball','loveball','nestball','netball',
    'repeatball','timerball','diveball','duskball','quickball','fastball','lureball',
    'moonball','heavyball','levelball','safariball','sportball','cherishball'
  ];
$$;

create or replace function private.is_throw_ball(item text)
returns boolean
language sql
immutable
as $$
  select item in ('pokeball', 'greatball', 'ultraball')
    or item = any (private.extra_ball_keys());
$$;

create or replace function private.stream_throw_item(item text)
returns text
language sql
immutable
as $$
  select case
    when item in ('greatball', 'safariball', 'sportball') then 'greatball'
    when item = 'ultraball' then 'ultraball'
    else 'pokeball'
  end;
$$;

create or replace function private.ball_catch_chance(rules jsonb, ball text)
returns numeric
language sql
stable
as $$
  select coalesce(
    (rules->'ballChances'->>ball)::numeric,
    case
      when ball in ('greatball', 'safariball', 'sportball')
        then coalesce((rules->'ballChances'->>'greatball')::numeric, 0.6)
      when ball = 'ultraball'
        then coalesce((rules->'ballChances'->>'ultraball')::numeric, 0.75)
      else coalesce((rules->'ballChances'->>'pokeball')::numeric, 0.45)
    end
  );
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
    when 'lure' then 'Lure'
    else coalesce(item, '')
  end;
$$;

create or replace function private.item_total(i public.inventories)
returns int
language sql
stable
as $$
  select i.berry + i.bait + i.pokeball + i.greatball + i.ultraball + i.lure
    + coalesce((
        select sum(greatest(value::int, 0))
        from jsonb_each_text(coalesce(i.balls, '{}'::jsonb))
      ), 0);
$$;

create or replace function private.grant_known(p_uid uuid, p_grants jsonb)
returns void
language plpgsql
as $$
declare
  inv public.inventories;
  cap int;
  add_items int;
  add_bonus int;
  extra_add int;
  k text;
  n int;
begin
  inv := private.ensure_inventory(p_uid);
  add_bonus := coalesce((p_grants->>'bag_bonus')::int, 0);
  extra_add := coalesce((
    select sum(greatest(coalesce(value::int, 0), 0))
    from jsonb_each_text(coalesce(p_grants, '{}'::jsonb))
    where key = any (private.extra_ball_keys())
  ), 0);
  add_items := coalesce((p_grants->>'berry')::int, 0)
    + coalesce((p_grants->>'bait')::int, 0)
    + coalesce((p_grants->>'pokeball')::int, 0)
    + coalesce((p_grants->>'greatball')::int, 0)
    + coalesce((p_grants->>'ultraball')::int, 0)
    + coalesce((p_grants->>'lure')::int, 0)
    + extra_add;
  cap := private.bag_capacity(p_uid) + add_bonus;
  if private.item_total(inv) + add_items > cap then
    raise exception 'Inventory is full. Buy a pouch or use some items first.';
  end if;
  update public.inventories
    set berry = berry + coalesce((p_grants->>'berry')::int, 0),
        bait = bait + coalesce((p_grants->>'bait')::int, 0),
        pokeball = pokeball + coalesce((p_grants->>'pokeball')::int, 0),
        greatball = greatball + coalesce((p_grants->>'greatball')::int, 0),
        ultraball = ultraball + coalesce((p_grants->>'ultraball')::int, 0),
        lure = lure + coalesce((p_grants->>'lure')::int, 0),
        coins = coins + coalesce((p_grants->>'coins')::int, 0),
        bag_bonus = bag_bonus + add_bonus,
        updated_at = now()
    where user_id = p_uid;
  foreach k in array private.extra_ball_keys() loop
    n := coalesce((p_grants->>k)::int, 0);
    if n > 0 then
      update public.inventories
        set balls = jsonb_set(
          coalesce(balls, '{}'::jsonb),
          array[k],
          to_jsonb(coalesce((balls->>k)::int, 0) + n)
        ),
        updated_at = now()
      where user_id = p_uid;
    end if;
  end loop;
end;
$$;

create or replace function private.spend_bag_item(p_uid uuid, p_item text)
returns void
language plpgsql
as $$
declare
  spent int;
  qty int;
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
  elsif p_item = any (private.extra_ball_keys()) then
    select coalesce((balls->>p_item)::int, 0) into qty
      from public.inventories where user_id = p_uid;
    if coalesce(qty, 0) < 1 then
      raise exception 'You have no % left. No item spent.', private.item_label(p_item);
    end if;
    update public.inventories
      set balls = jsonb_set(coalesce(balls, '{}'::jsonb), array[p_item], to_jsonb(qty - 1)),
          updated_at = now()
      where user_id = p_uid;
    return;
  else
    raise exception 'Unknown item.';
  end if;
  get diagnostics spent = row_count;
  if spent = 0 then
    raise exception 'You have no % left. No item spent.', private.item_label(p_item);
  end if;
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
  stream_item text;
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  if not private.is_throw_ball(p_item) then
    raise exception 'Choose a Poké Ball from your bag.';
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
  return private.play_snapshot(uid) || jsonb_build_object('ok', true, 'message', 'Your throw is locked in. Results appear at the end of this phase.');
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
  odds numeric;
  roll numeric;
  caught boolean;
begin
  if r is null or r.cancelled or r.resolved or r.source = 'mixitup' then
    return r;
  end if;
  if r.deadlines is null or now() < (r.deadlines->>'throw')::timestamptz then
    return r;
  end if;

  rules := coalesce(r.rules, private.game_settings());
  select count(*)::int, count(*) filter (where prep = 'bait')::int
    into player_count, bait_count
  from public.encounter_players
  where round_id = r.id;
  shared := coalesce((rules->>'maxBaitBonus')::numeric, 0) * bait_count / greatest(player_count, 1);

  for rec in select * from public.encounter_players where round_id = r.id
  loop
    if rec.ball is null then
      update public.encounter_players
        set result = 'No throw', caught = false
        where round_id = rec.round_id and user_id = rec.user_id;
      continue;
    end if;
    odds := least(
      coalesce((rules->>'maxCatchChance')::numeric, 0.9),
      private.ball_catch_chance(rules, rec.ball)
        + shared
        + case when rec.prep = 'berry' then coalesce((rules->>'berryBonus')::numeric, 0) else 0 end
    );
    roll := random();
    caught := roll < odds;
    update public.encounter_players
      set chance = odds, roll = roll, caught = caught, result = case when caught then 'Caught' else 'Escaped' end
      where round_id = rec.round_id and user_id = rec.user_id;
    if caught then
      insert into public.catches (user_id, dex, name, variant, gender, ball)
      values (rec.user_id, r.dex, r.name, r.variant, r.gender, rec.ball);
    end if;
  end loop;

  update public.encounter_rounds
    set resolved = true, last_action = 'Results locked in', updated_at = now()
    where id = r.id
    returning * into r;
  return r;
end;
$$;

create or replace function private.store_catalog()
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'rule', 'Bits and PokéCoins grant a listed set of items. Catch chance is never sold.',
    'coins', jsonb_build_array(
      jsonb_build_object('sku','berry5','name','Berry ×5','cost',25,'grants',jsonb_build_object('berry',5),'blurb','Helps your throw.'),
      jsonb_build_object('sku','bait5','name','Honey ×5','cost',30,'grants',jsonb_build_object('bait',5),'blurb','Helps the whole team.'),
      jsonb_build_object('sku','lure1','name','Lure ×1','cost',80,'grants',jsonb_build_object('lure',1),'blurb','Auto-join the next encounter.'),
      jsonb_build_object('sku','pouch10','name','Pouch +10','cost',120,'grants',jsonb_build_object('bag_bonus',10),'blurb','+10 bag space, forever.')
    ),
    'balls', jsonb_build_array(
      jsonb_build_object('sku','poke5','name','Poké Ball ×5','cost',40,'grants',jsonb_build_object('pokeball',5),'blurb','45% catch.'),
      jsonb_build_object('sku','great3','name','Great Ball ×3','cost',55,'grants',jsonb_build_object('greatball',3),'blurb','60% catch.'),
      jsonb_build_object('sku','ultra1','name','Ultra Ball ×1','cost',50,'grants',jsonb_build_object('ultraball',1),'blurb','75% catch.'),
      jsonb_build_object('sku','premier1','name','Premier Ball','cost',8,'grants',jsonb_build_object('premierball',1),'blurb','45% catch.'),
      jsonb_build_object('sku','luxury1','name','Luxury Ball','cost',12,'grants',jsonb_build_object('luxuryball',1),'blurb','45% catch.'),
      jsonb_build_object('sku','heal1','name','Heal Ball','cost',10,'grants',jsonb_build_object('healball',1),'blurb','45% catch.'),
      jsonb_build_object('sku','friend1','name','Friend Ball','cost',10,'grants',jsonb_build_object('friendball',1),'blurb','45% catch.'),
      jsonb_build_object('sku','love1','name','Love Ball','cost',10,'grants',jsonb_build_object('loveball',1),'blurb','45% catch.'),
      jsonb_build_object('sku','nest1','name','Nest Ball','cost',10,'grants',jsonb_build_object('nestball',1),'blurb','45% catch.'),
      jsonb_build_object('sku','net1','name','Net Ball','cost',10,'grants',jsonb_build_object('netball',1),'blurb','45% catch.'),
      jsonb_build_object('sku','repeat1','name','Repeat Ball','cost',10,'grants',jsonb_build_object('repeatball',1),'blurb','45% catch.'),
      jsonb_build_object('sku','timer1','name','Timer Ball','cost',10,'grants',jsonb_build_object('timerball',1),'blurb','45% catch.'),
      jsonb_build_object('sku','dive1','name','Dive Ball','cost',10,'grants',jsonb_build_object('diveball',1),'blurb','45% catch.'),
      jsonb_build_object('sku','dusk1','name','Dusk Ball','cost',12,'grants',jsonb_build_object('duskball',1),'blurb','45% catch.'),
      jsonb_build_object('sku','quick1','name','Quick Ball','cost',12,'grants',jsonb_build_object('quickball',1),'blurb','45% catch.'),
      jsonb_build_object('sku','fast1','name','Fast Ball','cost',10,'grants',jsonb_build_object('fastball',1),'blurb','45% catch.'),
      jsonb_build_object('sku','lureball1','name','Lure Ball','cost',10,'grants',jsonb_build_object('lureball',1),'blurb','45% catch.'),
      jsonb_build_object('sku','moon1','name','Moon Ball','cost',10,'grants',jsonb_build_object('moonball',1),'blurb','45% catch.'),
      jsonb_build_object('sku','heavy1','name','Heavy Ball','cost',10,'grants',jsonb_build_object('heavyball',1),'blurb','45% catch.'),
      jsonb_build_object('sku','level1','name','Level Ball','cost',10,'grants',jsonb_build_object('levelball',1),'blurb','45% catch.'),
      jsonb_build_object('sku','safari1','name','Safari Ball','cost',18,'grants',jsonb_build_object('safariball',1),'blurb','60% catch.'),
      jsonb_build_object('sku','sport1','name','Sport Ball','cost',18,'grants',jsonb_build_object('sportball',1),'blurb','60% catch.'),
      jsonb_build_object('sku','cherish1','name','Cherish Ball','cost',20,'grants',jsonb_build_object('cherishball',1),'blurb','45% catch.')
    ),
    'bits', jsonb_build_array(
      jsonb_build_object(
        'sku','bits-starter','name','Starter Pack','bits',100,
        'grants',jsonb_build_object('bag_bonus',10,'pokeball',8,'greatball',4,'ultraball',1,'berry',4,'bait',3),
        'blurb','+10 bag · 8 Poké Balls · 4 Great Balls · 1 Ultra Ball · 4 Berry · 3 Honey'
      ),
      jsonb_build_object(
        'sku','bits-pantry','name','Picnic Pack','bits',150,
        'grants',jsonb_build_object('bag_bonus',10,'berry',10,'bait',8,'greatball',4),
        'blurb','+10 bag · 10 Berry · 8 Honey · 4 Great Balls'
      ),
      jsonb_build_object(
        'sku','bits-great','name','Adventure Pack','bits',200,
        'grants',jsonb_build_object('bag_bonus',10,'greatball',8,'pokeball',5,'ultraball',1,'berry',4,'bait',3),
        'blurb','+10 bag · 8 Great Balls · 5 Poké Balls · 1 Ultra Ball · 4 Berry · 3 Honey'
      ),
      jsonb_build_object(
        'sku','bits-pouch','name','Explorer Pack','bits',250,
        'grants',jsonb_build_object('bag_bonus',20),
        'blurb','+20 bag space, forever'
      ),
      jsonb_build_object(
        'sku','bits-ultra','name','Ultra Pack','bits',300,
        'grants',jsonb_build_object('bag_bonus',20,'ultraball',8,'greatball',6,'pokeball',6,'lure',1,'berry',4,'bait',3),
        'blurb','+20 bag · 8 Ultra Balls · 6 Great Balls · 6 Poké Balls · 1 Lure · 4 Berry · 3 Honey'
      )
    )
  );
$$;

create or replace function public.play_buy_sku(p_sku text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  uid uuid := auth.uid();
  item jsonb;
  inv public.inventories;
begin
  if uid is null then
    raise exception 'Sign in to use the mart.' using errcode = '42501';
  end if;
  select elem into item
  from (
    select jsonb_array_elements(private.store_catalog()->'coins') as elem
    union all
    select jsonb_array_elements(coalesce(private.store_catalog()->'balls', '[]'::jsonb)) as elem
  ) s
  where elem->>'sku' = p_sku;
  if item is null then
    raise exception 'That shelf item is not sold for PokéCoins.';
  end if;
  inv := private.ensure_inventory(uid);
  if inv.coins < (item->>'cost')::int then
    raise exception 'Not enough PokéCoins.';
  end if;
  update public.inventories
    set coins = coins - (item->>'cost')::int, updated_at = now()
    where user_id = uid;
  perform private.grant_known(uid, item->'grants');
  return private.play_snapshot(uid) || jsonb_build_object('ok', true, 'message', 'Added ' || (item->>'name') || ' to your inventory.');
end;
$$;
