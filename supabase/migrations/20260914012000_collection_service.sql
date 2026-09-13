-- Authoritative Candy, mastery, evolution, and trade helpers.

create or replace function private.evo_item_keys()
returns text[]
language sql
immutable
as $$
  select array['firestone','waterstone','thunderstone','leafstone','moonstone','linkingcord'];
$$;

create or replace function private.item_qty(p_uid uuid, p_key text)
returns int
language sql
stable
as $$
  select coalesce((items->>p_key)::int, 0)
    from public.inventories
   where user_id = p_uid;
$$;

create or replace function private.adjust_item(p_uid uuid, p_key text, p_delta int)
returns int
language plpgsql
as $function$
declare
  before_qty int;
  after_qty int;
begin
  if p_uid is null or coalesce(p_key, '') = '' or coalesce(p_delta, 0) = 0 then
    return private.item_qty(p_uid, p_key);
  end if;
  perform private.ensure_inventory(p_uid);
  select coalesce((items->>p_key)::int, 0) into before_qty
    from public.inventories where user_id = p_uid for update;
  after_qty := before_qty + p_delta;
  if after_qty < 0 then
    raise exception 'You do not have that evolution item.';
  end if;
  update public.inventories
     set items = jsonb_set(coalesce(items, '{}'::jsonb), array[p_key], to_jsonb(after_qty)),
         updated_at = now()
   where user_id = p_uid;
  return after_qty;
end;
$function$;

create or replace function private.grant_known(p_uid uuid, p_grants jsonb)
returns void
language plpgsql
as $function$
declare
  inv public.inventories;
  cap int;
  add_items int;
  add_bonus int;
  extra_add int;
  berry_add int;
  evo_add int;
  k text;
  n int;
  room int;
begin
  inv := private.ensure_inventory(p_uid);
  add_bonus := greatest(coalesce((p_grants->>'bag_bonus')::int, 0), 0);
  room := private.bag_capacity_max() - private.bag_capacity(p_uid);
  if add_bonus > 0 and room <= 0 then
    raise exception 'Bag space is already at the 10,000 item maximum.';
  end if;
  if add_bonus > room then
    add_bonus := greatest(room, 0);
  end if;
  extra_add := coalesce((
    select sum(greatest(coalesce(value::int, 0), 0))
    from jsonb_each_text(coalesce(p_grants, '{}'::jsonb))
    where key = any (private.extra_ball_keys())
  ), 0);
  berry_add := coalesce((
    select sum(greatest(coalesce(value::int, 0), 0))
    from jsonb_each_text(coalesce(p_grants, '{}'::jsonb))
    where key = any (private.capture_berry_keys())
  ), 0);
  evo_add := coalesce((
    select sum(greatest(coalesce(value::int, 0), 0))
    from jsonb_each_text(coalesce(p_grants, '{}'::jsonb))
    where key = any (private.evo_item_keys())
  ), 0);
  add_items := coalesce((p_grants->>'berry')::int, 0)
    + coalesce((p_grants->>'bait')::int, 0)
    + coalesce((p_grants->>'pokeball')::int, 0)
    + coalesce((p_grants->>'greatball')::int, 0)
    + coalesce((p_grants->>'ultraball')::int, 0)
    + coalesce((p_grants->>'lure')::int, 0)
    + extra_add + berry_add + evo_add;
  cap := private.bag_capacity(p_uid) + add_bonus;
  if private.item_total(inv) + add_items > cap then
    raise exception 'Inventory is full. Buy a Pouch on the Store or use some items first.';
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
        set balls = jsonb_set(coalesce(balls, '{}'::jsonb), array[k], to_jsonb(coalesce((balls->>k)::int, 0) + n)),
            updated_at = now()
      where user_id = p_uid;
    end if;
  end loop;
  foreach k in array private.capture_berry_keys() loop
    n := coalesce((p_grants->>k)::int, 0);
    if n > 0 then
      update public.inventories
        set berries = jsonb_set(coalesce(berries, '{}'::jsonb), array[k], to_jsonb(coalesce((berries->>k)::int, 0) + n)),
            updated_at = now()
      where user_id = p_uid;
    end if;
  end loop;
  foreach k in array private.evo_item_keys() loop
    n := coalesce((p_grants->>k)::int, 0);
    if n > 0 then
      perform private.adjust_item(p_uid, k, n);
    end if;
  end loop;
end;
$function$;

create or replace function private.candy_for_stage(p_stage int)
returns int
language sql
immutable
as $$
  select case coalesce(p_stage, 0) when 2 then 5 when 3 then 8 else 3 end;
$$;

create or replace function private.mastery_rank(p_points int)
returns int
language sql
immutable
as $$
  select case
    when coalesce(p_points, 0) >= 75 then 5
    when coalesce(p_points, 0) >= 35 then 4
    when coalesce(p_points, 0) >= 15 then 3
    when coalesce(p_points, 0) >= 5 then 2
    when coalesce(p_points, 0) >= 1 then 1
    else 0
  end;
$$;

create or replace function private.grant_family_candy(
  p_uid uuid,
  p_family int,
  p_amount int,
  p_type text,
  p_reason text,
  p_meta jsonb default '{}'::jsonb
)
returns int
language plpgsql
as $function$
declare
  idem text := nullif(p_meta->>'idempotency', '');
  before_qty int := 0;
  after_qty int;
begin
  if p_uid is null or p_family is null or coalesce(p_amount, 0) = 0 then
    return coalesce((select qty from public.family_candy where user_id = p_uid and family_id = p_family), 0);
  end if;
  if idem is not null and exists (
    select 1 from public.candy_ledger where user_id = p_uid and idempotency = idem
  ) then
    return (select qty_after from public.candy_ledger where user_id = p_uid and idempotency = idem);
  end if;
  insert into public.family_candy (user_id, family_id, qty)
  values (p_uid, p_family, 0)
  on conflict do nothing;
  select qty into before_qty from public.family_candy where user_id = p_uid and family_id = p_family for update;
  after_qty := before_qty + p_amount;
  if after_qty < 0 then
    raise exception 'Not enough Candy for that evolution.';
  end if;
  update public.family_candy set qty = after_qty where user_id = p_uid and family_id = p_family;
  insert into public.candy_ledger (user_id, family_id, amount, type, reason, idempotency, related_catch, qty_before, qty_after)
  values (p_uid, p_family, p_amount, coalesce(p_type, 'CANDY'), p_reason, idem,
          nullif(p_meta->>'catchId', '')::uuid, before_qty, after_qty);
  update public.trainer_stats
     set candy_earned = candy_earned + case when p_amount > 0 then p_amount else 0 end,
         candy_spent = candy_spent + case when p_amount < 0 then abs(p_amount) else 0 end,
         updated_at = now()
   where user_id = p_uid;
  return after_qty;
end;
$function$;

create or replace function private.grant_mastery(
  p_uid uuid,
  p_dex int,
  p_amount int,
  p_reason text,
  p_idem text
)
returns int
language plpgsql
as $function$
declare
  pts int;
begin
  if p_uid is null or p_dex is null or coalesce(p_amount, 0) = 0 then
    return coalesce((select points from public.species_mastery where user_id = p_uid and dex = p_dex), 0);
  end if;
  if p_idem is not null and exists (
    select 1 from public.mastery_ledger where user_id = p_uid and idempotency = p_idem
  ) then
    return (select points from public.species_mastery where user_id = p_uid and dex = p_dex);
  end if;
  insert into public.species_mastery (user_id, dex, points, rank)
  values (p_uid, p_dex, 0, 0)
  on conflict do nothing;
  update public.species_mastery
     set points = points + p_amount,
         rank = private.mastery_rank(points + p_amount),
         updated_at = now()
   where user_id = p_uid and dex = p_dex
  returning points into pts;
  insert into public.mastery_ledger (user_id, dex, amount, reason, idempotency)
  values (p_uid, p_dex, p_amount, p_reason, p_idem);
  update public.trainer_stats
     set species_mastered = (select count(*) from public.species_mastery where user_id = p_uid and rank >= 5),
         updated_at = now()
   where user_id = p_uid;
  return pts;
end;
$function$;

create or replace function private.register_capture_collection(p_catch public.catches)
returns void
language plpgsql
as $function$
declare
  spec public.species;
  pay int;
  first_species boolean;
begin
  select * into spec from public.species where dex = p_catch.dex;
  pay := private.candy_for_stage(spec.evo_stage);
  perform private.grant_family_candy(
    p_catch.user_id, coalesce(spec.family_id, p_catch.dex), pay, 'CATCH_REWARD', 'Catch reward',
    jsonb_build_object('idempotency', 'candy-catch:' || p_catch.id::text, 'catchId', p_catch.id::text)
  );
  perform private.grant_mastery(p_catch.user_id, p_catch.dex, 1, 'CATCH', 'mastery-catch:' || p_catch.id::text);
  if p_catch.variant like '%shiny%' then
    perform private.grant_mastery(p_catch.user_id, p_catch.dex, 3, 'SHINY', 'mastery-shiny:' || p_catch.id::text);
  end if;
  if p_catch.gender = 'Female' and p_catch.dex = any (private.female_visual_dex()) then
    select not exists (
      select 1 from public.catches
       where user_id = p_catch.user_id and dex = p_catch.dex and id <> p_catch.id
         and (gender = 'Female' or variant like '%female%')
    ) into first_species;
    if first_species then
      perform private.grant_mastery(p_catch.user_id, p_catch.dex, 1, 'VARIANT', 'mastery-female:' || p_catch.id::text);
    end if;
  end if;
end;
$function$;

create or replace function private.target_variant_ok(p_from public.catches, p_to int)
returns boolean
language plpgsql
stable
as $function$
begin
  if p_from.variant like '%shiny%' then
    return true;
  end if;
  return true;
end;
$function$;

create or replace function private.evolve_catch(p_uid uuid, p_catch uuid, p_rule text, p_idem text default null)
returns jsonb
language plpgsql
as $function$
declare
  c public.catches;
  rule public.evolution_rules;
  spec public.species;
  dest public.species;
  new_name text;
  new_variant text;
  owned_before boolean;
begin
  if p_uid is null then
    raise exception 'Sign in first.';
  end if;
  select * into c from public.catches where id = p_catch and user_id = p_uid and transferred_at is null for update;
  if c.id is null then
    raise exception 'That Pokémon is not in your collection.';
  end if;
  if c.locked then
    raise exception 'Unlock that Pokémon before evolving it.';
  end if;
  if exists (select 1 from public.trade_listings t where t.catch_id = c.id and t.status = 'open')
     or exists (select 1 from public.direct_trades d where d.status in ('PENDING','NEGOTIATING','PROCESSING') and c.id in (d.a_catch, d.b_catch)) then
    raise exception 'That Pokémon is reserved for a trade.';
  end if;
  select * into rule from public.evolution_rules where id = p_rule and enabled;
  if rule.id is null or rule.from_dex <> c.dex then
    raise exception 'That evolution is not available.';
  end if;
  if p_idem is not null and exists (select 1 from public.evolution_log e where e.catch_id = c.id and e.to_dex = rule.to_dex) then
    return jsonb_build_object('ok', true, 'message', 'Already evolved.');
  end if;
  if rule.condition_type = 'TRADE_OR_ITEM' and not c.trade_evo_ready then
    if rule.required_item is null or private.item_qty(p_uid, rule.required_item) < 1 then
      raise exception 'This Pokémon evolves after a trade, or with a Linking Cord.';
    end if;
  elsif rule.required_item is not null then
    if private.item_qty(p_uid, rule.required_item) < 1 then
      raise exception 'You need a % for this evolution.', initcap(replace(rule.required_item, 'stone', ' Stone'));
    end if;
  end if;
  if not private.target_variant_ok(c, rule.to_dex) then
    insert into public.play_console_log (kind, message)
    values ('admin', 'Missing evolution art for dex ' || rule.to_dex::text || ' variant ' || c.variant);
    raise exception 'This evolution''s artwork is not available yet.';
  end if;
  perform private.grant_family_candy(
    p_uid, rule.family_id, -rule.candy_cost, 'EVOLUTION_COST', 'Evolution',
    jsonb_build_object('idempotency', coalesce(p_idem, 'evo:' || c.id::text || ':' || rule.id), 'catchId', c.id::text)
  );
  if rule.required_item is not null and (rule.condition_type <> 'TRADE_OR_ITEM' or not c.trade_evo_ready) then
    perform private.adjust_item(p_uid, rule.required_item, -1);
  end if;
  select exists (select 1 from public.catches x where x.user_id = p_uid and x.dex = rule.to_dex) into owned_before;
  select * into dest from public.species where dex = rule.to_dex;
  new_name := coalesce(dest.name, c.name);
  new_variant := c.variant;
  update public.catches
     set dex = rule.to_dex,
         name = new_name,
         obtained_method = 'EVOLUTION',
         trade_evo_ready = false,
         caught_at = caught_at
   where id = c.id;
  insert into public.evolution_log (user_id, catch_id, from_dex, to_dex, candy_spent, item_spent, method)
  values (p_uid, c.id, c.dex, rule.to_dex, rule.candy_cost, rule.required_item,
          case when c.trade_evo_ready then 'TRADE' else coalesce(rule.condition_type, 'CANDY_ONLY') end);
  update public.trainer_stats set evolved = evolved + 1, updated_at = now() where user_id = p_uid;
  perform private.grant_mastery(p_uid, c.dex, 2, 'EVOLUTION', 'mastery-evo:' || c.id::text || ':' || rule.id);
  perform private.grant_mastery(p_uid, rule.to_dex, 2, 'EVOLUTION', 'mastery-evo-to:' || c.id::text || ':' || rule.id);
  perform private.grant_xp(p_uid, 10, 'EVOLUTION', 'Successful evolution',
    jsonb_build_object('idempotency', 'xp-evo:' || c.id::text || ':' || rule.id));
  if not owned_before then
    perform private.grant_xp(p_uid, coalesce((private.progression_config()->>'newDexXp')::int, 25), 'NEW_DEX', 'New Pokédex species',
      jsonb_build_object('idempotency', 'xp-dex:' || p_uid::text || ':' || rule.to_dex::text));
    if coalesce((private.economy_config()->>'newDexReward')::int, 0) > 0 then
      perform private.adjust_coins(
        p_uid, coalesce((private.economy_config()->>'newDexReward')::int, 100), 'NEW_DEX_ENTRY', 'First time owning this species',
        jsonb_build_object('idempotency', 'dex:' || p_uid::text || ':' || rule.to_dex::text)
      );
    end if;
    perform private.maybe_grant_dex_milestones(p_uid);
  end if;
  if c.trade_evo_ready then
    perform private.unlock_title(p_uid, 'link-cable', true);
  end if;
  perform private.push_notice(p_uid, 'evolution', 'Congratulations!',
    'Your ' || c.name || ' evolved into ' || new_name || '!',
    jsonb_build_object('from', c.dex, 'to', rule.to_dex));
  perform private.evaluate_achievements(p_uid, true);
  return jsonb_build_object(
    'ok', true,
    'message', 'Your ' || c.name || ' evolved into ' || new_name || '!',
    'from', c.dex,
    'to', rule.to_dex,
    'variant', new_variant
  );
end;
$function$;
