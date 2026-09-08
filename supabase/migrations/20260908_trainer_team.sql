alter table public.profiles
  add column if not exists trainer_sprite text not null default 'red-gen1',
  add column if not exists team_ids uuid[] not null default '{}';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_team_ids_len'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_team_ids_len check (cardinality(team_ids) <= 6);
  end if;
end
$$;

create or replace function private.trainer_sprite_ok(p_id text)
returns boolean
language sql
immutable
as $$
  select coalesce(p_id, '') in (
    'red-gen1', 'leaf-gen3',
    'ethan-gen2', 'kris-gen2',
    'brendan-gen3', 'may-gen3',
    'lucas', 'dawn',
    'hilbert', 'hilda',
    'calem', 'serena',
    'elio', 'selene',
    'victor', 'gloria',
    'florian-s', 'juliana-s',
    'paxton', 'harmony'
  );
$$;

create or replace function private.team_mons(p_uid uuid)
returns jsonb
language plpgsql
stable
as $$
declare
  ids uuid[];
  team jsonb;
begin
  select coalesce(team_ids, '{}'::uuid[]) into ids
    from public.profiles
    where id = p_uid;
  select coalesce(jsonb_agg(to_jsonb(x) - 'ord' order by x.ord), '[]'::jsonb)
    into team
    from (
      select
        t.ord,
        c.id,
        c.dex,
        c.name,
        c.variant,
        c.gender,
        c.ball
      from unnest(coalesce(ids, '{}'::uuid[])) with ordinality as t(catch_id, ord)
      join public.catches c
        on c.id = t.catch_id
       and c.user_id = p_uid
    ) x;
  return coalesce(team, '[]'::jsonb);
end;
$$;

create or replace function private.trainer_card(p_uid uuid)
returns jsonb
language plpgsql
stable
as $$
declare
  p public.profiles%rowtype;
  lvl int;
  caught int;
  species int;
  into_xp int;
  need int;
  coins int := 0;
begin
  if p_uid is null then
    return null;
  end if;
  select * into p from public.profiles where id = p_uid;
  if p.id is null then
    return null;
  end if;
  lvl := private.trainer_level(p.xp);
  into_xp := p.xp - (25 * (lvl - 1) * (lvl - 1));
  need := 25 * (2 * lvl - 1);
  select count(*)::int, count(distinct dex)::int
    into caught, species
    from public.catches
    where user_id = p_uid;
  select coalesce(i.coins, 0) into coins
    from public.inventories i
    where i.user_id = p_uid;
  return jsonb_build_object(
    'id', p.id,
    'login', p.twitch_login,
    'displayName', coalesce(nullif(p.display_name, ''), p.twitch_login, 'Trainer'),
    'avatar', p.avatar_url,
    'trainerSprite', case
      when private.trainer_sprite_ok(p.trainer_sprite) then p.trainer_sprite
      else 'red-gen1'
    end,
    'idNo', 10000 + (abs(hashtext(p.id::text)) % 90000),
    'startedAt', p.created_at,
    'coins', coalesce(coins, 0),
    'level', lvl,
    'xp', p.xp,
    'xpInto', greatest(0, into_xp),
    'xpNeed', greatest(1, need),
    'watchSeconds', p.watch_seconds,
    'caught', coalesce(caught, 0),
    'species', coalesce(species, 0),
    'pass', p.starlight_pass,
    'favoriteDex', p.favorite_dex,
    'favoriteVariant', coalesce(p.favorite_variant, 'normal'),
    'title', coalesce(p.trainer_title, ''),
    'team', private.team_mons(p_uid),
    'lastSeenAt', p.last_seen_at,
    'online', p.last_seen_at is not null and p.last_seen_at > now() - interval '2 minutes'
  );
end;
$$;

create or replace function public.play_pokedex(p_login text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  trainer uuid;
  login text := lower(btrim(coalesce(p_login, '')));
  seen jsonb;
  caught jsonb;
begin
  if login = '' then
    trainer := auth.uid();
    if trainer is null then
      raise exception 'Sign in to open your Pokédex.' using errcode = '42501';
    end if;
  else
    select id into trainer from public.profiles where lower(twitch_login) = login;
    if trainer is null then
      raise exception 'No Pokédex for that trainer yet.';
    end if;
  end if;
  select coalesce(jsonb_agg(dex order by dex), '[]'::jsonb)
    into seen
    from public.species_seen
    where user_id = trainer;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'dex', c.dex,
    'name', c.name,
    'variant', c.variant,
    'gender', c.gender,
    'ball', c.ball,
    'caughtAt', c.caught_at
  ) order by c.dex, c.caught_at), '[]'::jsonb)
    into caught
    from public.catches c
    where c.user_id = trainer;
  return jsonb_build_object(
    'ok', true,
    'login', (select twitch_login from public.profiles where id = trainer),
    'displayName', (select coalesce(nullif(display_name, ''), twitch_login) from public.profiles where id = trainer),
    'mine', auth.uid() is not null and auth.uid() = trainer,
    'seen', seen,
    'caught', caught,
    'team', private.team_mons(trainer)
  );
end;
$$;

create or replace function public.play_trainer(p_login text)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  p public.profiles%rowtype;
  card jsonb;
  recent jsonb;
  mine boolean := false;
  caught_opts jsonb;
  all_catches jsonb;
begin
  select * into p
  from public.profiles
  where lower(twitch_login) = lower(btrim(coalesce(p_login, '')));
  if p.id is null then
    raise exception 'No trainer card for that Twitch login yet.';
  end if;
  card := private.trainer_card(p.id);
  mine := auth.uid() is not null and auth.uid() = p.id;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'dex', c.dex,
    'name', c.name,
    'variant', c.variant,
    'gender', c.gender,
    'ball', c.ball,
    'caughtAt', c.caught_at
  ) order by c.caught_at desc), '[]'::jsonb)
    into recent
    from (
      select * from public.catches where user_id = p.id order by caught_at desc limit 24
    ) c;
  select coalesce(jsonb_agg(jsonb_build_object(
    'dex', d.dex,
    'name', d.name,
    'variant', d.variant
  ) order by d.name, d.variant), '[]'::jsonb)
    into caught_opts
    from (
      select distinct dex, name, variant from public.catches where user_id = p.id
    ) d;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'dex', c.dex,
    'name', c.name,
    'variant', c.variant,
    'gender', c.gender,
    'ball', c.ball,
    'caughtAt', c.caught_at
  ) order by c.caught_at desc), '[]'::jsonb)
    into all_catches
    from public.catches c
    where c.user_id = p.id;
  return jsonb_build_object(
    'ok', true,
    'trainer', card,
    'recent', recent,
    'mine', mine,
    'caughtOptions', case when mine then caught_opts else '[]'::jsonb end,
    'catches', case when mine then all_catches else '[]'::jsonb end
  );
end;
$$;

create or replace function public.play_set_team(p_catch_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  uid uuid := auth.uid();
  ids uuid[] := coalesce(p_catch_ids, '{}'::uuid[]);
begin
  if uid is null then
    raise exception 'Sign in to edit your team.' using errcode = '42501';
  end if;
  if cardinality(ids) > 6 then
    raise exception 'Your team can hold six Pokémon.';
  end if;
  if (select count(distinct x) from unnest(ids) as t(x)) <> cardinality(ids) then
    raise exception 'The same Pokémon can’t be on the team twice.';
  end if;
  if exists (
    select 1
    from unnest(ids) as t(x)
    where not exists (
      select 1 from public.catches c where c.id = t.x and c.user_id = uid
    )
  ) then
    raise exception 'Team Pokémon must be ones you have caught.';
  end if;
  update public.profiles
    set team_ids = ids, updated_at = now()
    where id = uid;
  return jsonb_build_object(
    'ok', true,
    'message', 'Team updated.',
    'team', private.team_mons(uid),
    'trainer', private.trainer_card(uid)
  );
end;
$$;

create or replace function public.play_set_trainer_sprite(p_sprite text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  uid uuid := auth.uid();
  sprite text := btrim(coalesce(p_sprite, ''));
begin
  if uid is null then
    raise exception 'Sign in to choose a trainer sprite.' using errcode = '42501';
  end if;
  if not private.trainer_sprite_ok(sprite) then
    raise exception 'That trainer look is not available.';
  end if;
  update public.profiles
    set trainer_sprite = sprite, updated_at = now()
    where id = uid;
  return jsonb_build_object(
    'ok', true,
    'message', 'Trainer look saved.',
    'trainer', private.trainer_card(uid)
  );
end;
$$;

grant execute on function public.play_pokedex(text) to anon, authenticated;
grant execute on function public.play_trainer(text) to anon, authenticated;
grant execute on function public.play_set_team(uuid[]) to authenticated;
grant execute on function public.play_set_trainer_sprite(text) to authenticated;
