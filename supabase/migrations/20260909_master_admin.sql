-- Master Ball (10000 coins, always catches) and Admin Hub trainer account editor.

create or replace function private.extra_ball_keys()
returns text[]
language sql
immutable
as $$
  select array[
    'masterball',
    'premierball','luxuryball','healball','friendball','loveball','nestball','netball',
    'repeatball','timerball','diveball','duskball','quickball','fastball','lureball',
    'moonball','heavyball','levelball','safariball','sportball','cherishball',
    'gsball','ashball','cloneball','darkball','oldball',
    'hisuipokeball','hisuigreatball','hisuiultraball','hisuiheavyball',
    'featherball','wingball','jetball','leadenball','gigatonball','originball','strangeball'
  ];
$$;

create or replace function private.ball_catch_chance(rules jsonb, ball text)
returns numeric
language sql
stable
as $$
  select case
    when ball = 'masterball' then 1
    else coalesce(
      (rules->'ballChances'->>ball)::numeric,
      case
        when ball in ('greatball','safariball','sportball','hisuigreatball','wingball','leadenball')
          then coalesce((rules->'ballChances'->>'greatball')::numeric, 0.6)
        when ball in ('ultraball','hisuiultraball','jetball','gigatonball')
          then coalesce((rules->'ballChances'->>'ultraball')::numeric, 0.75)
        else coalesce((rules->'ballChances'->>'pokeball')::numeric, 0.45)
      end
    )
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
    when 'masterball' then 'Master Ball'
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
    when 'coins' then 'PokéCoins'
    else coalesce(item, '')
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
      jsonb_build_object('sku','lure1','name','Poké Radar ×1','cost',80,'grants',jsonb_build_object('lure',1),'blurb','Detects nearby Pokémon & joins you to an encounter automatically. Lasts 30 mins.'),
      jsonb_build_object('sku','pouch10','name','Pouch +10','cost',120,'grants',jsonb_build_object('bag_bonus',10),'blurb','+10 bag space, forever.')
    ),
    'balls', jsonb_build_array(
      jsonb_build_object('sku','poke5','name','Poké Ball ×5','cost',40,'grants',jsonb_build_object('pokeball',5),'blurb','45% catch.'),
      jsonb_build_object('sku','great3','name','Great Ball ×3','cost',55,'grants',jsonb_build_object('greatball',3),'blurb','60% catch.'),
      jsonb_build_object('sku','ultra1','name','Ultra Ball ×1','cost',50,'grants',jsonb_build_object('ultraball',1),'blurb','75% catch.'),
      jsonb_build_object('sku','master1','name','Master Ball','cost',10000,'grants',jsonb_build_object('masterball',1),'blurb','100% catch.'),
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
      jsonb_build_object('sku','cherish1','name','Cherish Ball','cost',20,'grants',jsonb_build_object('cherishball',1),'blurb','45% catch.'),
      jsonb_build_object('sku','gs1','name','GS Ball','cost',25,'grants',jsonb_build_object('gsball',1),'blurb','45% catch.'),
      jsonb_build_object('sku','ash1','name','Ash''s Poké Ball','cost',15,'grants',jsonb_build_object('ashball',1),'blurb','45% catch.'),
      jsonb_build_object('sku','clone1','name','Clone Ball','cost',22,'grants',jsonb_build_object('cloneball',1),'blurb','45% catch.'),
      jsonb_build_object('sku','dark1','name','Dark Ball','cost',22,'grants',jsonb_build_object('darkball',1),'blurb','45% catch.'),
      jsonb_build_object('sku','old1','name','Old Ball','cost',12,'grants',jsonb_build_object('oldball',1),'blurb','45% catch.'),
      jsonb_build_object('sku','hisuipoke1','name','Hisui Poké Ball','cost',10,'grants',jsonb_build_object('hisuipokeball',1),'blurb','45% catch.'),
      jsonb_build_object('sku','hisuigreat1','name','Hisui Great Ball','cost',14,'grants',jsonb_build_object('hisuigreatball',1),'blurb','60% catch.'),
      jsonb_build_object('sku','hisuiultra1','name','Hisui Ultra Ball','cost',18,'grants',jsonb_build_object('hisuiultraball',1),'blurb','75% catch.'),
      jsonb_build_object('sku','feather1','name','Feather Ball','cost',10,'grants',jsonb_build_object('featherball',1),'blurb','45% catch.'),
      jsonb_build_object('sku','wing1','name','Wing Ball','cost',14,'grants',jsonb_build_object('wingball',1),'blurb','60% catch.'),
      jsonb_build_object('sku','jet1','name','Jet Ball','cost',18,'grants',jsonb_build_object('jetball',1),'blurb','75% catch.'),
      jsonb_build_object('sku','hisuiheavy1','name','Hisui Heavy Ball','cost',10,'grants',jsonb_build_object('hisuiheavyball',1),'blurb','45% catch.'),
      jsonb_build_object('sku','leaden1','name','Leaden Ball','cost',14,'grants',jsonb_build_object('leadenball',1),'blurb','60% catch.'),
      jsonb_build_object('sku','gigaton1','name','Gigaton Ball','cost',18,'grants',jsonb_build_object('gigatonball',1),'blurb','75% catch.'),
      jsonb_build_object('sku','origin1','name','Origin Ball','cost',40,'grants',jsonb_build_object('originball',1),'blurb','45% catch.'),
      jsonb_build_object('sku','strange1','name','Strange Ball','cost',12,'grants',jsonb_build_object('strangeball',1),'blurb','45% catch.')
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
        'blurb','+20 bag · 8 Ultra Balls · 6 Great Balls · 6 Poké Balls · 1 Poké Radar · 4 Berry · 3 Honey'
      )
    )
  );
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
begin
  if r is null then
    return r;
  end if;
  select exists (
    select 1 from public.encounter_players ep
    where ep.round_id = r.id and ep.result is null
  ) into pending;
  if r.cancelled and not pending then
    return r;
  end if;
  if not r.cancelled and (r.deadlines is null or now() < (r.deadlines->>'throw')::timestamptz) then
    return r;
  end if;
  if r.resolved and not pending then
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
    set resolved = true, last_action = 'Results locked in', updated_at = now()
    where id = r.id
    returning * into r;
  return r;
end;
$$;

create or replace function private.require_staff_edit()
returns void
language plpgsql
stable
as $$
begin
  perform private.require_hub();
  if coalesce(private.play_staff_role(), '') not in ('owner', 'admin') then
    raise exception 'Only admins can edit trainer accounts.';
  end if;
end;
$$;

create or replace function public.admin_list_users(p_query text default '', p_offset int default 0)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  q text := lower(btrim(coalesce(p_query, '')));
  start_at int := greatest(coalesce(p_offset, 0), 0);
  rows jsonb;
  total int;
begin
  perform private.require_hub();
  select count(*)::int into total from public.profiles p
    where q = '' or lower(coalesce(p.twitch_login, '')) like '%' || q || '%'
       or lower(coalesce(p.display_name, '')) like '%' || q || '%';
  select coalesce(jsonb_agg(row_to_json(x)::jsonb), '[]'::jsonb)
    into rows
    from (
      select
        p.id,
        p.twitch_login as login,
        coalesce(nullif(p.display_name, ''), p.twitch_login, 'Trainer') as "displayName",
        p.avatar_url as avatar,
        coalesce(private.play_staff_role(p.id), 'player') as role,
        p.created_at as "createdAt",
        p.last_seen_at as "lastSeenAt",
        p.starlight_pass as pass,
        coalesce(i.coins, 0) as coins,
        (select count(*)::int from public.catches c where c.user_id = p.id and c.transferred_at is null) as caught
      from public.profiles p
      left join public.inventories i on i.user_id = p.id
      where q = '' or lower(coalesce(p.twitch_login, '')) like '%' || q || '%'
         or lower(coalesce(p.display_name, '')) like '%' || q || '%'
      order by p.display_name, p.twitch_login
      limit 50 offset start_at
    ) x;
  return jsonb_build_object('ok', true, 'total', total, 'offset', start_at, 'users', rows, 'staffRole', private.play_staff_role());
end;
$$;

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
  k text;
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
    ) || coalesce(inv.balls, '{}'::jsonb);
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
  return jsonb_build_object(
    'ok', true,
    'user', jsonb_build_object(
      'id', p.id,
      'login', p.twitch_login,
      'displayName', coalesce(nullif(p.display_name, ''), p.twitch_login, 'Trainer'),
      'avatar', p.avatar_url,
      'role', coalesce(private.play_staff_role(p.id), 'player'),
      'pass', p.starlight_pass,
      'createdAt', p.created_at,
      'lastSeenAt', p.last_seen_at
    ),
    'bag', bag,
    'mons', mons,
    'staffRole', private.play_staff_role(),
    'canEdit', coalesce(private.play_staff_role(), '') in ('owner', 'admin')
  );
end;
$$;

create or replace function public.admin_user_account(p_user uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  perform private.require_hub();
  return private.admin_account_json(p_user);
end;
$$;

create or replace function public.admin_grant_bag(p_user uuid, p_grants jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  inv public.inventories;
  k text;
  n int;
  qty int;
begin
  perform private.require_staff_edit();
  if p_user is null then
    raise exception 'Pick a trainer.';
  end if;
  inv := private.ensure_inventory(p_user);
  update public.inventories
    set berry = greatest(0, berry + coalesce((p_grants->>'berry')::int, 0)),
        bait = greatest(0, bait + coalesce((p_grants->>'bait')::int, 0)),
        pokeball = greatest(0, pokeball + coalesce((p_grants->>'pokeball')::int, 0)),
        greatball = greatest(0, greatball + coalesce((p_grants->>'greatball')::int, 0)),
        ultraball = greatest(0, ultraball + coalesce((p_grants->>'ultraball')::int, 0)),
        lure = greatest(0, lure + coalesce((p_grants->>'lure')::int, 0)),
        coins = greatest(0, coins + coalesce((p_grants->>'coins')::int, 0)),
        bag_bonus = greatest(0, bag_bonus + coalesce((p_grants->>'bag_bonus')::int, 0)),
        updated_at = now()
    where user_id = p_user;
  foreach k in array private.extra_ball_keys() loop
    n := coalesce((p_grants->>k)::int, 0);
    if n <> 0 then
      select coalesce((balls->>k)::int, 0) into qty
        from public.inventories where user_id = p_user;
      update public.inventories
        set balls = jsonb_set(coalesce(balls, '{}'::jsonb), array[k], to_jsonb(greatest(0, qty + n))),
            updated_at = now()
        where user_id = p_user;
    end if;
  end loop;
  return private.admin_account_json(p_user) || jsonb_build_object('message', 'Bag updated.');
end;
$$;

create or replace function public.admin_set_coins(p_user uuid, p_coins int)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  perform private.require_staff_edit();
  if p_user is null then
    raise exception 'Pick a trainer.';
  end if;
  perform private.ensure_inventory(p_user);
  update public.inventories
    set coins = greatest(0, coalesce(p_coins, 0)), updated_at = now()
    where user_id = p_user;
  return private.admin_account_json(p_user) || jsonb_build_object('message', 'PokéCoins set.');
end;
$$;

create or replace function public.admin_grant_pokemon(
  p_user uuid,
  p_dex int,
  p_name text default null,
  p_gender text default 'Unknown',
  p_shiny boolean default false,
  p_ball text default 'pokeball'
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  species text;
  gender text := coalesce(nullif(btrim(p_gender), ''), 'Unknown');
  ball text := coalesce(nullif(btrim(p_ball), ''), 'pokeball');
  variant text;
begin
  perform private.require_staff_edit();
  if p_user is null or not exists (select 1 from public.profiles where id = p_user) then
    raise exception 'Pick a trainer.';
  end if;
  if p_dex is null or p_dex < 1 or p_dex > 151 then
    raise exception 'Dex number must be 1 to 151.';
  end if;
  if gender not in ('Male', 'Female', 'Genderless', 'Unknown') then
    raise exception 'Gender must be Male, Female, or Genderless.';
  end if;
  if not private.is_throw_ball(ball) then
    ball := 'pokeball';
  end if;
  variant := case when coalesce(p_shiny, false) then 'shiny' else 'normal' end;
  species := coalesce(nullif(btrim(p_name), ''), 'Pokémon');
  perform private.ensure_inventory(p_user);
  insert into public.catches (user_id, dex, name, variant, gender, ball, source_key)
  values (
    p_user, p_dex, species, variant, gender, ball,
    'admin:' || gen_random_uuid()::text
  );
  perform private.mark_seen(p_user, p_dex);
  return private.admin_account_json(p_user) || jsonb_build_object('message', species || ' added to their PC.');
end;
$$;

create or replace function public.admin_remove_pokemon(p_user uuid, p_catch_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  c public.catches%rowtype;
begin
  perform private.require_staff_edit();
  select * into c from public.catches where id = p_catch_id and user_id = p_user;
  if c.id is null or c.transferred_at is not null then
    raise exception 'That Pokémon is not in this trainer''s PC.';
  end if;
  update public.trade_listings set status = 'cancelled' where catch_id = c.id and status = 'open';
  update public.trade_offers set status = 'withdrawn' where catch_id = c.id and status = 'pending';
  perform private.pull_from_team(p_user, c.id);
  update public.catches set transferred_at = now() where id = c.id;
  return private.admin_account_json(p_user) || jsonb_build_object('message', 'Pokémon removed from their PC.');
end;
$$;

grant execute on function public.admin_list_users(text, int) to authenticated;
grant execute on function public.admin_user_account(uuid) to authenticated;
grant execute on function public.admin_grant_bag(uuid, jsonb) to authenticated;
grant execute on function public.admin_set_coins(uuid, int) to authenticated;
grant execute on function public.admin_grant_pokemon(uuid, int, text, text, boolean, text) to authenticated;
grant execute on function public.admin_remove_pokemon(uuid, uuid) to authenticated;
