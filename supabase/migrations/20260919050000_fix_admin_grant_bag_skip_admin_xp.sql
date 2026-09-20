-- Restore admin_grant_bag for evolution items (±qty) and skip catch XP on admin/ADMIN_QA
-- inserts so Trainer Support / Oak QA grants do not deadlock on trainer_stats.

create or replace function private.extra_ball_keys()
returns text[]
language sql
stable
as $function$
  select coalesce(array_agg(distinct k), '{}'::text[])
  from (
    select unnest(array[
      'masterball',
      'premierball','luxuryball','healball','friendball','loveball','nestball','netball',
      'repeatball','timerball','diveball','duskball','quickball','fastball','lureball',
      'moonball','heavyball','levelball','safariball','sportball','cherishball',
      'gsball','ashball','cloneball','darkball','oldball',
      'hisuipokeball','hisuigreatball','hisuiultraball','hisuiheavyball',
      'featherball','wingball','jetball','leadenball','gigatonball','originball','strangeball'
    ]) as k
    union
    select jsonb_object_keys(coalesce(grants, '{}'::jsonb))
    from private.store_items
  ) s
  where k <> all (private.core_item_keys())
    and k not in (select key from public.capture_berries)
    and k <> 'bait'
    and k <> all (private.evo_item_keys());
$function$;

create or replace function public.admin_grant_bag(p_user uuid, p_grants jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  k text;
  n int;
  qty int;
  pos jsonb := '{}'::jsonb;
  coin_delta int := 0;
  choice_n int := 0;
begin
  perform private.require_staff_edit();
  if p_user is null then
    raise exception 'Pick a trainer.';
  end if;
  perform private.ensure_inventory(p_user);

  for k, n in
    select key, coalesce(value::int, 0)
      from jsonb_each_text(coalesce(p_grants, '{}'::jsonb))
  loop
    if n = 0 or coalesce(k, '') = '' then
      continue;
    end if;

    if k = 'coins' then
      coin_delta := coin_delta + n;
      continue;
    end if;

    if k = 'choice_stone' then
      if n < 0 then
        raise exception 'Choice stones can only be granted, not removed.';
      end if;
      choice_n := choice_n + n;
      continue;
    end if;

    if k = any (private.evo_item_keys()) then
      if n > 0 then
        perform private.adjust_item(p_user, k, n);
      else
        select coalesce((items->>k)::int, 0) into qty
          from public.inventories where user_id = p_user for update;
        update public.inventories
           set items = jsonb_set(coalesce(items, '{}'::jsonb), array[k], to_jsonb(greatest(0, qty + n))),
               updated_at = now()
         where user_id = p_user;
      end if;
      continue;
    end if;

    if k = any (array['berry', 'bait', 'pokeball', 'greatball', 'ultraball', 'lure', 'bag_bonus']) then
      if n > 0 then
        pos := pos || jsonb_build_object(k, n);
      else
        execute format(
          'update public.inventories set %I = greatest(0, %I + $1), updated_at = now() where user_id = $2',
          k, k
        ) using n, p_user;
      end if;
      continue;
    end if;

    if k = any (private.extra_ball_keys()) then
      if n > 0 then
        pos := pos || jsonb_build_object(k, n);
      else
        select coalesce((balls->>k)::int, 0) into qty
          from public.inventories where user_id = p_user for update;
        update public.inventories
           set balls = jsonb_set(coalesce(balls, '{}'::jsonb), array[k], to_jsonb(greatest(0, qty + n))),
               updated_at = now()
         where user_id = p_user;
      end if;
      continue;
    end if;

    if k = any (private.capture_berry_keys()) then
      if n > 0 then
        pos := pos || jsonb_build_object(k, n);
      else
        select coalesce((berries->>k)::int, 0) into qty
          from public.inventories where user_id = p_user for update;
        update public.inventories
           set berries = jsonb_set(coalesce(berries, '{}'::jsonb), array[k], to_jsonb(greatest(0, qty + n))),
               updated_at = now()
         where user_id = p_user;
      end if;
      continue;
    end if;

    raise exception 'Unknown item key: %', k;
  end loop;

  if pos <> '{}'::jsonb then
    perform private.grant_known(p_user, pos);
  end if;

  if choice_n > 0 then
    perform private.grant_items(
      p_user,
      jsonb_build_object('choice_stone', choice_n),
      'ADMIN_GRANT',
      'admin',
      'admin-choice:' || p_user::text || ':' || gen_random_uuid()::text,
      true
    );
  end if;

  if coin_delta <> 0 then
    perform private.adjust_coins(
      p_user, coin_delta, 'ADMIN_ADJUSTMENT', 'Admin granted items',
      jsonb_build_object('relatedItem', 'bag')
    );
  end if;

  return private.admin_account_json(p_user) || jsonb_build_object('message', 'Bag updated.');
end;
$function$;

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
  -- Staff / QA grants must not contend on trainer_stats + XP ledgers.
  if coalesce(new.obtained_method, '') = 'ADMIN_QA'
     or coalesce(new.source_key, '') like 'admin:%' then
    return new;
  end if;
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

create or replace function private.after_catch_present()
returns trigger
language plpgsql
as $function$
declare
  first_species boolean;
  first_shiny boolean;
  species_name text;
begin
  if new.user_id is null then
    return new;
  end if;
  if coalesce(new.obtained_method, '') = 'ADMIN_QA'
     or coalesce(new.source_key, '') like 'admin:%' then
    return new;
  end if;
  if new.round_id is not null and private.round_is_test(new.round_id) then
    return new;
  end if;

  select coalesce(s.name, 'Pokémon') into species_name
    from public.species s
   where s.dex = new.dex;
  species_name := coalesce(species_name, coalesce(new.name, 'Pokémon'));

  select not exists (
    select 1 from public.catches where user_id = new.user_id and dex = new.dex and id <> new.id
  ) into first_species;

  if first_species then
    perform private.push_notice(
      new.user_id, 'pokedex',
      'New Pokédex Entry!',
      species_name,
      jsonb_build_object(
        'species', new.dex,
        'variant', coalesce(new.variant, 'normal'),
        'gender', coalesce(new.gender, ''),
        'shiny', coalesce(new.variant, '') like '%shiny%',
        'source', 'capture'
      )
    );
    return new;
  end if;

  if coalesce(new.variant, '') like '%shiny%' then
    select not exists (
      select 1 from public.catches
       where user_id = new.user_id and dex = new.dex and id <> new.id
         and coalesce(variant, '') like '%shiny%'
    ) into first_shiny;
    if first_shiny then
      perform private.push_notice(
        new.user_id, 'pokedex',
        'Shiny registered',
        species_name,
        jsonb_build_object(
          'species', new.dex,
          'variant', coalesce(new.variant, 'shiny'),
          'gender', coalesce(new.gender, ''),
          'shiny', true,
          'source', 'capture'
        )
      );
    end if;
  end if;

  return new;
end;
$function$;

grant execute on function public.admin_grant_bag(uuid, jsonb) to authenticated;
