-- Let's Go unique IDs, stats, moves, candy, storage, nicknames, trading.

create sequence if not exists public.catch_serial;

create table if not exists public.lgpe_species (
  dex int primary key check (dex between 1 and 151),
  types text[] not null default '{}',
  hp int not null,
  atk int not null,
  def int not null,
  spa int not null,
  spd int not null,
  spe int not null,
  moves jsonb not null default '[]'::jsonb
);

alter table public.catches
  add column if not exists public_id text,
  add column if not exists nickname text,
  add column if not exists level int,
  add column if not exists iv_hp int,
  add column if not exists iv_atk int,
  add column if not exists iv_def int,
  add column if not exists iv_spa int,
  add column if not exists iv_spd int,
  add column if not exists iv_spe int,
  add column if not exists av_hp int,
  add column if not exists av_atk int,
  add column if not exists av_def int,
  add column if not exists av_spa int,
  add column if not exists av_spd int,
  add column if not exists av_spe int,
  add column if not exists moves text[],
  add column if not exists size_class text,
  add column if not exists transferred_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'catches_public_id_key') then
    alter table public.catches add constraint catches_public_id_key unique (public_id);
  end if;
end $$;

create table if not exists public.candies (
  user_id uuid not null references public.profiles(id) on delete cascade,
  candy_key text not null,
  qty int not null default 0 check (qty >= 0),
  primary key (user_id, candy_key)
);
alter table public.candies enable row level security;
drop policy if exists "users can read own candies" on public.candies;
create policy "users can read own candies" on public.candies for select using (user_id = auth.uid());
grant select on public.candies to authenticated;

create table if not exists public.oak_transfers (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  dex int not null,
  catch_id uuid not null references public.catches(id),
  candy_key text not null,
  created_at timestamptz not null default now()
);
alter table public.oak_transfers enable row level security;
drop policy if exists "users can read own oak transfers" on public.oak_transfers;
create policy "users can read own oak transfers" on public.oak_transfers for select using (user_id = auth.uid());
grant select on public.oak_transfers to authenticated;

create table if not exists public.trade_listings (
  id uuid primary key default gen_random_uuid(),
  catch_id uuid not null unique references public.catches(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  want_dex int check (want_dex is null or want_dex between 1 and 151),
  note text,
  status text not null default 'open' check (status = any (array['open'::text, 'completed'::text, 'cancelled'::text])),
  created_at timestamptz not null default now()
);
create index if not exists trade_listings_open_idx on public.trade_listings (status, created_at desc);

create table if not exists public.trade_offers (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.trade_listings(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  catch_id uuid not null references public.catches(id) on delete cascade,
  status text not null default 'pending' check (status = any (array['pending'::text, 'accepted'::text, 'declined'::text, 'withdrawn'::text])),
  created_at timestamptz not null default now()
);
create index if not exists trade_offers_listing_idx on public.trade_offers (listing_id, status);

alter table public.trade_listings enable row level security;
alter table public.trade_offers enable row level security;
drop policy if exists "users can read trade listings" on public.trade_listings;
drop policy if exists "users can read trade offers" on public.trade_offers;
create policy "users can read trade listings" on public.trade_listings for select using (true);
create policy "users can read trade offers" on public.trade_offers for select using (user_id = auth.uid() or exists (
  select 1 from public.trade_listings l where l.id = listing_id and l.user_id = auth.uid()
));
grant select on public.trade_listings to anon, authenticated;
grant select on public.trade_offers to authenticated;

create or replace function private.lgpe_stat(p_base int, p_iv int, p_av int, p_level int, p_hp boolean)
returns int
language sql
immutable
as $$
  select case when p_hp
    then floor(((2 * coalesce(p_base, 50) + coalesce(p_iv, 0) + coalesce(p_av, 0)) * coalesce(p_level, 1)) / 100.0)::int + coalesce(p_level, 1) + 10
    else floor(((2 * coalesce(p_base, 50) + coalesce(p_iv, 0) + coalesce(p_av, 0)) * coalesce(p_level, 1)) / 100.0)::int + 5
  end;
$$;

create or replace function private.lgpe_pick_moves(p_dex int, p_level int)
returns text[]
language plpgsql
stable
as $$
declare
  picked text[];
begin
  select coalesce(array_agg(x.n order by x.ord), '{}'::text[])
    into picked
    from (
      select m->>'n' as n, row_number() over (order by coalesce((m->>'l')::int, 0) desc, m->>'n') as ord
      from public.lgpe_species s
      cross join lateral jsonb_array_elements(s.moves) m
      where s.dex = p_dex
        and coalesce(m->>'m', 'level-up') = 'level-up'
        and coalesce((m->>'l')::int, 0) <= greatest(coalesce(p_level, 1), 1)
      limit 4
    ) x;
  if coalesce(cardinality(picked), 0) = 0 then
    select coalesce(array_agg(x.n order by x.ord), '{}'::text[])
      into picked
      from (
        select m->>'n' as n, row_number() over (order by coalesce((m->>'l')::int, 0), m->>'n') as ord
        from public.lgpe_species s
        cross join lateral jsonb_array_elements(s.moves) m
        where s.dex = p_dex
        limit 4
      ) x;
  end if;
  if coalesce(cardinality(picked), 0) = 0 then
    picked := array['Tackle'];
  end if;
  return picked;
end;
$$;

create or replace function private.stamp_catch_row(c public.catches)
returns public.catches
language plpgsql
as $$
declare
  seed int;
  sizes text[] := array['XS','S','M','L','XL'];
  spec public.lgpe_species;
begin
  if c.public_id is null or btrim(c.public_id) = '' then
    c.public_id := 'LG' || lpad(nextval('public.catch_serial')::text, 8, '0');
  end if;
  seed := abs(('x' || substr(md5(c.id::text), 1, 8))::bit(32)::int);
  if c.level is null then
    c.level := 5 + (seed % 16);
  end if;
  if c.iv_hp is null then c.iv_hp := (('x' || substr(md5(c.id::text || 'hp'), 1, 2))::bit(8)::int) % 32; end if;
  if c.iv_atk is null then c.iv_atk := (('x' || substr(md5(c.id::text || 'atk'), 1, 2))::bit(8)::int) % 32; end if;
  if c.iv_def is null then c.iv_def := (('x' || substr(md5(c.id::text || 'def'), 1, 2))::bit(8)::int) % 32; end if;
  if c.iv_spa is null then c.iv_spa := (('x' || substr(md5(c.id::text || 'spa'), 1, 2))::bit(8)::int) % 32; end if;
  if c.iv_spd is null then c.iv_spd := (('x' || substr(md5(c.id::text || 'spd'), 1, 2))::bit(8)::int) % 32; end if;
  if c.iv_spe is null then c.iv_spe := (('x' || substr(md5(c.id::text || 'spe'), 1, 2))::bit(8)::int) % 32; end if;
  if c.av_hp is null then c.av_hp := 0; end if;
  if c.av_atk is null then c.av_atk := 0; end if;
  if c.av_def is null then c.av_def := 0; end if;
  if c.av_spa is null then c.av_spa := 0; end if;
  if c.av_spd is null then c.av_spd := 0; end if;
  if c.av_spe is null then c.av_spe := 0; end if;
  if c.size_class is null or c.size_class not in ('XS','S','M','L','XL') then
    c.size_class := sizes[1 + ((seed / 17) % 5)];
  end if;
  if c.moves is null or cardinality(c.moves) = 0 then
    c.moves := private.lgpe_pick_moves(c.dex, c.level);
  end if;
  return c;
end;
$$;

create or replace function private.catches_before_write()
returns trigger
language plpgsql
as $$
begin
  new := private.stamp_catch_row(new);
  return new;
end;
$$;

drop trigger if exists catches_before_write on public.catches;
create trigger catches_before_write
  before insert or update of dex, level, iv_hp, iv_atk, iv_def, iv_spa, iv_spd, iv_spe, av_hp, av_atk, av_def, av_spa, av_spd, av_spe
  on public.catches
  for each row execute function private.catches_before_write();

create or replace function private.catch_json(c public.catches)
returns jsonb
language plpgsql
stable
as $$
declare
  spec public.lgpe_species;
  listed boolean;
begin
  select * into spec from public.lgpe_species where dex = c.dex;
  listed := exists (select 1 from public.trade_listings t where t.catch_id = c.id and t.status = 'open');
  return jsonb_build_object(
    'id', c.id,
    'publicId', c.public_id,
    'dex', c.dex,
    'name', c.name,
    'nickname', c.nickname,
    'variant', c.variant,
    'gender', c.gender,
    'ball', c.ball,
    'caughtAt', c.caught_at,
    'level', coalesce(c.level, 12),
    'size', coalesce(c.size_class, 'M'),
    'types', coalesce(spec.types, '{}'::text[]),
    'moves', coalesce(c.moves, '{}'::text[]),
    'ivs', jsonb_build_object(
      'hp', coalesce(c.iv_hp, 0), 'atk', coalesce(c.iv_atk, 0), 'def', coalesce(c.iv_def, 0),
      'spa', coalesce(c.iv_spa, 0), 'spd', coalesce(c.iv_spd, 0), 'spe', coalesce(c.iv_spe, 0)
    ),
    'avs', jsonb_build_object(
      'hp', coalesce(c.av_hp, 0), 'atk', coalesce(c.av_atk, 0), 'def', coalesce(c.av_def, 0),
      'spa', coalesce(c.av_spa, 0), 'spd', coalesce(c.av_spd, 0), 'spe', coalesce(c.av_spe, 0)
    ),
    'stats', jsonb_build_object(
      'hp', private.lgpe_stat(spec.hp, c.iv_hp, c.av_hp, c.level, true),
      'atk', private.lgpe_stat(spec.atk, c.iv_atk, c.av_atk, c.level, false),
      'def', private.lgpe_stat(spec.def, c.iv_def, c.av_def, c.level, false),
      'spa', private.lgpe_stat(spec.spa, c.iv_spa, c.av_spa, c.level, false),
      'spd', private.lgpe_stat(spec.spd, c.iv_spd, c.av_spd, c.level, false),
      'spe', private.lgpe_stat(spec.spe, c.iv_spe, c.av_spe, c.level, false)
    ),
    'listed', listed,
    'transferredAt', c.transferred_at
  );
end;
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
        c.public_id as "publicId",
        c.dex,
        c.name,
        c.nickname,
        c.variant,
        c.gender,
        c.ball
      from unnest(coalesce(ids, '{}'::uuid[])) with ordinality as t(catch_id, ord)
      join public.catches c
        on c.id = t.catch_id
       and c.user_id = p_uid
       and c.transferred_at is null
    ) x;
  return coalesce(team, '[]'::jsonb);
end;
$$;

create or replace function private.pull_from_team(p_uid uuid, p_catch uuid)
returns void
language plpgsql
as $$
begin
  update public.profiles
    set team_ids = coalesce((
      select array_agg(x order by ord)
      from unnest(team_ids) with ordinality as t(x, ord)
      where x <> p_catch
    ), '{}'::uuid[]),
        updated_at = now()
    where id = p_uid;
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
      select 1 from public.catches c
      where c.id = t.x and c.user_id = uid and c.transferred_at is null
    )
  ) then
    raise exception 'Team Pokémon must be ones you still have.';
  end if;
  if exists (
    select 1
    from unnest(ids) as t(x)
    join public.trade_listings l on l.catch_id = t.x and l.status = 'open'
  ) then
    raise exception 'A Pokémon on the trade board cannot join the team.';
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
    'publicId', c.public_id,
    'dex', c.dex,
    'name', c.name,
    'nickname', c.nickname,
    'variant', c.variant,
    'gender', c.gender,
    'ball', c.ball,
    'caughtAt', c.caught_at,
    'transferredAt', c.transferred_at
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

create or replace function public.play_storage()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  uid uuid := auth.uid();
  mons jsonb;
  candy jsonb;
  ids uuid[];
begin
  if uid is null then
    raise exception 'Sign in to open Pokémon Storage.' using errcode = '42501';
  end if;
  select coalesce(team_ids, '{}'::uuid[]) into ids from public.profiles where id = uid;
  select coalesce(jsonb_agg(private.catch_json(c) || jsonb_build_object(
    'onTeam', c.id = any (ids)
  ) order by c.caught_at desc), '[]'::jsonb)
    into mons
    from public.catches c
    where c.user_id = uid and c.transferred_at is null;
  select coalesce(jsonb_agg(jsonb_build_object('key', candy_key, 'qty', qty) order by candy_key), '[]'::jsonb)
    into candy
    from public.candies
    where user_id = uid and qty > 0;
  return jsonb_build_object('ok', true, 'mons', coalesce(mons, '[]'::jsonb), 'candies', coalesce(candy, '[]'::jsonb), 'teamIds', coalesce(ids, '{}'::uuid[]));
end;
$$;

create or replace function public.play_set_nickname(p_catch_id uuid, p_name text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  uid uuid := auth.uid();
  nick text := btrim(coalesce(p_name, ''));
  c public.catches;
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  if char_length(nick) > 12 then
    raise exception 'Nicknames can be 12 characters, like Let’s Go.';
  end if;
  if nick <> '' and nick !~ '^[A-Za-z0-9 .''-]+$' then
    raise exception 'Nicknames can use letters, numbers, spaces, periods, hyphens, and apostrophes.';
  end if;
  select * into c from public.catches where id = p_catch_id and user_id = uid and transferred_at is null;
  if c.id is null then
    raise exception 'That Pokémon is not in your storage.';
  end if;
  update public.catches set nickname = nullif(nick, '') where id = c.id;
  return public.play_storage() || jsonb_build_object('ok', true, 'message', case when nick = '' then 'Nickname cleared.' else 'Nickname saved.' end);
end;
$$;

create or replace function private.grant_candy(p_uid uuid, p_key text, p_qty int default 1)
returns void
language plpgsql
as $$
begin
  insert into public.candies (user_id, candy_key, qty)
  values (p_uid, p_key, greatest(p_qty, 1))
  on conflict (user_id, candy_key) do update set qty = public.candies.qty + excluded.qty;
end;
$$;

create or replace function public.play_transfer_oak(p_catch_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  uid uuid := auth.uid();
  c public.catches;
  size_key text;
  candy_key text;
  transferred int;
  extra boolean := false;
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  select * into c from public.catches where id = p_catch_id and user_id = uid and transferred_at is null for update;
  if c.id is null then
    raise exception 'That Pokémon is not in your storage.';
  end if;
  if exists (select 1 from public.profiles p where p.id = uid and c.id = any (p.team_ids)) then
    raise exception 'Take it off your team before transferring to Professor Oak.';
  end if;
  if exists (select 1 from public.trade_listings t where t.catch_id = c.id and t.status = 'open') then
    raise exception 'Take it off the trade board first.';
  end if;
  size_key := case
    when coalesce(c.size_class, 'M') in ('L','XL') or strpos(coalesce(c.variant, ''), 'shiny') > 0 then '-xl'
    when coalesce(c.size_class, 'M') = 'M' then '-l'
    else ''
  end;
  candy_key := 'species-' || c.dex::text || size_key;
  perform private.grant_candy(uid, candy_key, 1);
  insert into public.oak_transfers (user_id, dex, catch_id, candy_key)
  values (uid, c.dex, c.id, candy_key);
  select count(*)::int into transferred from public.oak_transfers where user_id = uid and dex = c.dex;
  if transferred > 0 and transferred % 50 = 0 then
    perform private.grant_candy(uid, candy_key, 1);
    extra := true;
  end if;
  update public.catches set transferred_at = now() where id = c.id;
  perform private.pull_from_team(uid, c.id);
  return public.play_storage() || jsonb_build_object(
    'ok', true,
    'message', format(
      'Professor Oak took %s. You received %s%s.',
      coalesce(nullif(c.nickname, ''), c.name),
      case
        when size_key = '-xl' then c.name || ' Candy XL'
        when size_key = '-l' then c.name || ' Candy L'
        else c.name || ' Candy'
      end,
      case when extra then ' plus a bonus candy for transferring 50 of this species' else '' end
    )
  );
end;
$$;

create or replace function private.trade_listing_json(l public.trade_listings)
returns jsonb
language plpgsql
stable
as $$
declare
  c public.catches;
  trainer public.profiles;
  offers int;
begin
  select * into c from public.catches where id = l.catch_id;
  select * into trainer from public.profiles where id = l.user_id;
  select count(*)::int into offers from public.trade_offers o where o.listing_id = l.id and o.status = 'pending';
  return jsonb_build_object(
    'id', l.id,
    'createdAt', l.created_at,
    'status', l.status,
    'wantDex', l.want_dex,
    'note', l.note,
    'offers', offers,
    'mine', auth.uid() is not null and l.user_id = auth.uid(),
    'trainer', jsonb_build_object(
      'login', trainer.twitch_login,
      'displayName', coalesce(nullif(trainer.display_name, ''), trainer.twitch_login, 'Trainer'),
      'avatar', trainer.avatar_url
    ),
    'mon', private.catch_json(c)
  );
end;
$$;

create or replace function public.play_trade_board(p_query text default '', p_dex int default null, p_login text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  q text := lower(btrim(coalesce(p_query, '')));
  login text := lower(btrim(coalesce(p_login, '')));
  rows jsonb;
begin
  select coalesce(jsonb_agg(private.trade_listing_json(l) order by l.created_at desc), '[]'::jsonb)
    into rows
    from public.trade_listings l
    join public.catches c on c.id = l.catch_id
    join public.profiles p on p.id = l.user_id
    where l.status = 'open'
      and (p_dex is null or c.dex = p_dex or l.want_dex = p_dex)
      and (login = '' or lower(coalesce(p.twitch_login, '')) = login)
      and (
        q = ''
        or lower(c.name) like '%' || q || '%'
        or lower(coalesce(c.nickname, '')) like '%' || q || '%'
        or lower(c.public_id) like '%' || q || '%'
        or lower(coalesce(p.display_name, '')) like '%' || q || '%'
        or lower(coalesce(p.twitch_login, '')) like '%' || q || '%'
      );
  return jsonb_build_object('ok', true, 'listings', coalesce(rows, '[]'::jsonb));
end;
$$;

create or replace function public.play_trade_listing(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  l public.trade_listings;
  payload jsonb;
  offer_rows jsonb;
begin
  select * into l from public.trade_listings where id = p_id;
  if l.id is null then
    raise exception 'That trade listing is gone.';
  end if;
  payload := private.trade_listing_json(l);
  if auth.uid() is not null and l.user_id = auth.uid() then
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', o.id,
      'createdAt', o.created_at,
      'status', o.status,
      'trainer', jsonb_build_object(
        'login', p.twitch_login,
        'displayName', coalesce(nullif(p.display_name, ''), p.twitch_login, 'Trainer')
      ),
      'mon', private.catch_json(c)
    ) order by o.created_at), '[]'::jsonb)
      into offer_rows
      from public.trade_offers o
      join public.catches c on c.id = o.catch_id
      join public.profiles p on p.id = o.user_id
      where o.listing_id = l.id and o.status = 'pending';
    payload := payload || jsonb_build_object('offerRows', coalesce(offer_rows, '[]'::jsonb));
  end if;
  return jsonb_build_object('ok', true, 'listing', payload);
end;
$$;

create or replace function public.play_trade_create(p_catch_id uuid, p_want_dex int default null, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  uid uuid := auth.uid();
  c public.catches;
  listing public.trade_listings;
  note text := left(btrim(coalesce(p_note, '')), 80);
begin
  if uid is null then
    raise exception 'Sign in to list a Pokémon for trade.' using errcode = '42501';
  end if;
  select * into c from public.catches where id = p_catch_id and user_id = uid and transferred_at is null;
  if c.id is null then
    raise exception 'That Pokémon is not in your storage.';
  end if;
  if p_want_dex is not null and (p_want_dex < 1 or p_want_dex > 151) then
    raise exception 'Wanted Pokémon must be from the Kanto Pokédex.';
  end if;
  perform private.pull_from_team(uid, c.id);
  insert into public.trade_listings (catch_id, user_id, want_dex, note)
  values (c.id, uid, p_want_dex, nullif(note, ''))
  on conflict (catch_id) do update
    set status = 'open',
        want_dex = excluded.want_dex,
        note = excluded.note,
        user_id = uid,
        created_at = now()
    where public.trade_listings.status <> 'open'
  returning * into listing;
  if listing.id is null then
    raise exception 'That Pokémon is already on the trade board.';
  end if;
  return jsonb_build_object('ok', true, 'message', 'Listed for trade.', 'listing', private.trade_listing_json(listing));
end;
$$;

create or replace function public.play_trade_cancel(p_listing_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  uid uuid := auth.uid();
  l public.trade_listings;
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  select * into l from public.trade_listings where id = p_listing_id and user_id = uid and status = 'open';
  if l.id is null then
    raise exception 'That listing is not yours, or it is no longer open.';
  end if;
  update public.trade_listings set status = 'cancelled' where id = l.id;
  update public.trade_offers set status = 'declined' where listing_id = l.id and status = 'pending';
  return jsonb_build_object('ok', true, 'message', 'Listing taken down.');
end;
$$;

create or replace function public.play_trade_offer(p_listing_id uuid, p_catch_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  uid uuid := auth.uid();
  l public.trade_listings;
  c public.catches;
begin
  if uid is null then
    raise exception 'Sign in to make an offer.' using errcode = '42501';
  end if;
  select * into l from public.trade_listings where id = p_listing_id and status = 'open';
  if l.id is null then
    raise exception 'That listing is no longer open.';
  end if;
  if l.user_id = uid then
    raise exception 'You cannot offer on your own listing.';
  end if;
  select * into c from public.catches where id = p_catch_id and user_id = uid and transferred_at is null;
  if c.id is null then
    raise exception 'That Pokémon is not in your storage.';
  end if;
  if exists (select 1 from public.trade_listings t where t.catch_id = c.id and t.status = 'open') then
    raise exception 'Take that Pokémon off the trade board before offering it.';
  end if;
  perform private.pull_from_team(uid, c.id);
  insert into public.trade_offers (listing_id, user_id, catch_id)
  values (l.id, uid, c.id);
  return jsonb_build_object('ok', true, 'message', 'Offer sent.');
end;
$$;

create or replace function public.play_trade_withdraw(p_offer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  update public.trade_offers
    set status = 'withdrawn'
    where id = p_offer_id and user_id = uid and status = 'pending';
  if not found then
    raise exception 'That offer cannot be withdrawn.';
  end if;
  return jsonb_build_object('ok', true, 'message', 'Offer withdrawn.');
end;
$$;

create or replace function public.play_trade_decline(p_offer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  uid uuid := auth.uid();
  o public.trade_offers;
  l public.trade_listings;
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  select * into o from public.trade_offers where id = p_offer_id and status = 'pending';
  if o.id is null then
    raise exception 'That offer is gone.';
  end if;
  select * into l from public.trade_listings where id = o.listing_id and user_id = uid;
  if l.id is null then
    raise exception 'Only the listing trainer can decline that offer.';
  end if;
  update public.trade_offers set status = 'declined' where id = o.id;
  return jsonb_build_object('ok', true, 'message', 'Offer declined.');
end;
$$;

create or replace function public.play_trade_accept(p_offer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  uid uuid := auth.uid();
  o public.trade_offers;
  l public.trade_listings;
  listed public.catches;
  offered public.catches;
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  select * into o from public.trade_offers where id = p_offer_id and status = 'pending' for update;
  if o.id is null then
    raise exception 'That offer is gone.';
  end if;
  select * into l from public.trade_listings where id = o.listing_id and user_id = uid and status = 'open' for update;
  if l.id is null then
    raise exception 'Only the listing trainer can accept, and the listing must still be open.';
  end if;
  select * into listed from public.catches where id = l.catch_id and user_id = uid and transferred_at is null for update;
  select * into offered from public.catches where id = o.catch_id and user_id = o.user_id and transferred_at is null for update;
  if listed.id is null or offered.id is null then
    raise exception 'One of those Pokémon is no longer available.';
  end if;
  update public.catches set user_id = o.user_id where id = listed.id;
  update public.catches set user_id = uid where id = offered.id;
  perform private.pull_from_team(uid, listed.id);
  perform private.pull_from_team(o.user_id, offered.id);
  update public.trade_listings set status = 'completed' where id = l.id;
  update public.trade_offers set status = 'accepted' where id = o.id;
  update public.trade_offers set status = 'declined' where listing_id = l.id and status = 'pending';
  update public.trade_listings set status = 'cancelled' where catch_id in (listed.id, offered.id) and status = 'open';
  update public.trade_offers set status = 'declined'
    where status = 'pending' and catch_id in (listed.id, offered.id);
  return jsonb_build_object('ok', true, 'message', 'Trade complete. The Pokémon swapped trainers.');
end;
$$;

grant execute on function public.play_storage() to authenticated;
grant execute on function public.play_set_nickname(uuid, text) to authenticated;
grant execute on function public.play_transfer_oak(uuid) to authenticated;
grant execute on function public.play_trade_board(text, int, text) to anon, authenticated;
grant execute on function public.play_trade_listing(uuid) to anon, authenticated;
grant execute on function public.play_trade_create(uuid, int, text) to authenticated;
grant execute on function public.play_trade_cancel(uuid) to authenticated;
grant execute on function public.play_trade_offer(uuid, uuid) to authenticated;
grant execute on function public.play_trade_withdraw(uuid) to authenticated;
grant execute on function public.play_trade_decline(uuid) to authenticated;
grant execute on function public.play_trade_accept(uuid) to authenticated;
grant execute on function public.play_set_team(uuid[]) to authenticated;
grant execute on function public.play_pokedex(text) to anon, authenticated;
