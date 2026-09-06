-- Pokédex seen/caught, events calendar, trainer customization, reliable catch import.

alter table public.profiles
  add column if not exists favorite_dex int check (favorite_dex is null or favorite_dex between 1 and 151),
  add column if not exists favorite_variant text not null default 'normal',
  add column if not exists trainer_title text not null default '';

alter table public.catches
  add column if not exists source_key text;

create unique index if not exists catches_source_key_uidx
  on public.catches (source_key)
  where source_key is not null;

create table if not exists public.species_seen (
  user_id uuid not null references public.profiles(id) on delete cascade,
  dex int not null check (dex between 1 and 151),
  first_seen_at timestamptz not null default now(),
  primary key (user_id, dex)
);
alter table public.species_seen enable row level security;
drop policy if exists "trainers read own seen" on public.species_seen;
create policy "trainers read own seen"
  on public.species_seen for select to authenticated
  using (user_id = auth.uid());
grant select on public.species_seen to authenticated;

create table if not exists public.play_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  blurb text not null default '',
  kind text not null default 'community',
  starts_at timestamptz not null,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.play_events enable row level security;
drop policy if exists "anyone can read events" on public.play_events;
create policy "anyone can read events"
  on public.play_events for select to anon, authenticated
  using (true);
grant select on public.play_events to anon, authenticated;

create or replace function private.find_trainer(p_user text, p_name text)
returns uuid
language plpgsql
stable
as $$
declare
  trainer uuid;
  ident text := btrim(coalesce(p_user, ''));
  login text := lower(btrim(coalesce(p_name, '')));
begin
  if ident like 'miu:%' then
    ident := substr(ident, 5);
  end if;
  if ident <> '' then
    select id into trainer from public.profiles
      where twitch_user_id = ident
         or twitch_user_id = 'miu:' || ident
      limit 1;
    if trainer is not null then
      return trainer;
    end if;
  end if;
  if login <> '' then
    select id into trainer from public.profiles
      where lower(twitch_login) = login
         or lower(display_name) = login
      limit 1;
  end if;
  return trainer;
end;
$$;

create or replace function private.mark_seen(p_uid uuid, p_dex int)
returns void
language plpgsql
as $$
begin
  if p_uid is null or p_dex is null or p_dex < 1 or p_dex > 151 then
    return;
  end if;
  insert into public.species_seen (user_id, dex)
  values (p_uid, p_dex)
  on conflict (user_id, dex) do nothing;
end;
$$;

create or replace function private.record_stream_catch(
  p_user text,
  p_name text,
  p_dex int,
  p_species text,
  p_variant text,
  p_gender text,
  p_ball text,
  p_round uuid,
  p_source_key text default null,
  p_caught_at timestamptz default null
)
returns boolean
language plpgsql
as $$
declare
  trainer uuid;
  key text := nullif(btrim(coalesce(p_source_key, '')), '');
begin
  trainer := private.find_trainer(p_user, p_name);
  if trainer is null or p_dex is null then
    return false;
  end if;
  perform private.mark_seen(trainer, p_dex);
  if key is not null and exists (select 1 from public.catches c where c.source_key = key) then
    return true;
  end if;
  if p_round is not null and exists (
    select 1 from public.catches c where c.round_id = p_round and c.user_id = trainer
  ) then
    return true;
  end if;
  insert into public.catches (user_id, dex, name, variant, gender, ball, round_id, source_key, caught_at)
  values (
    trainer,
    p_dex,
    coalesce(nullif(p_species, ''), 'Pokémon'),
    coalesce(nullif(p_variant, ''), 'normal'),
    coalesce(nullif(p_gender, ''), 'Unknown'),
    p_ball,
    p_round,
    key,
    coalesce(p_caught_at, now())
  );
  return true;
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
  return jsonb_build_object(
    'id', p.id,
    'login', p.twitch_login,
    'displayName', coalesce(nullif(p.display_name, ''), p.twitch_login, 'Trainer'),
    'avatar', p.avatar_url,
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
    'lastSeenAt', p.last_seen_at,
    'online', p.last_seen_at is not null and p.last_seen_at > now() - interval '2 minutes'
  );
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
  visible jsonb;
  inv public.inventories;
begin
  r := private.sync_latest_round();
  is_admin := p_uid is not null and private.is_play_admin();
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
    );

    select jsonb_build_object(
      'active', p.starlight_pass,
      'source', p.pass_source,
      'checkedAt', p.pass_checked_at
    ) into pass
    from public.profiles p where p.id = p_uid;

    if r is not null then
      select jsonb_build_object(
        'joined', true,
        'prep', ep.prep,
        'ball', ep.ball,
        'result', ep.result,
        'chance', ep.chance,
        'caught', ep.caught
      ) into me
      from public.encounter_players ep
      where ep.round_id = r.id and ep.user_id = p_uid;
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

create or replace function public.play_join()
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
  ph text;
  already boolean;
begin
  if uid is null then
    raise exception 'Sign in to join.' using errcode = '42501';
  end if;
  r := private.sync_latest_round();
  ph := private.round_phase(r);
  if not private.round_is_active(r) or ph not in ('join', 'prepare') or r.hidden then
    raise exception 'Joining is closed. Wait for the next encounter.';
  end if;
  insert into public.inventories (user_id)
  values (uid)
  on conflict (user_id) do nothing;
  perform private.mark_seen(uid, r.dex);
  already := exists (select 1 from public.encounter_players where round_id = r.id and user_id = uid);
  if r.source = 'mixitup' then
    select c.twitch_user_id, c.twitch_login into twitch_user, twitch_name from private.current_twitch() c;
    if twitch_user is null or twitch_name is null then
      raise exception 'Sign in with Twitch to join the live encounter.';
    end if;
    if not already or ph = 'prepare' then
      perform private.enqueue_stream_command('join', jsonb_build_object('user', twitch_user, 'name', twitch_name));
    end if;
  end if;
  if already then
    return private.play_snapshot(uid) || jsonb_build_object('ok', true, 'message', 'You already joined. Wait for preparation, then use a Berry or Bait.');
  end if;
  insert into public.encounter_players (round_id, user_id)
  values (r.id, uid);
  update public.encounter_rounds
    set last_action = 'A trainer joined', updated_at = now()
    where id = r.id;
  return private.play_snapshot(uid) || jsonb_build_object('ok', true, 'message',
    'You joined! Wait for preparation, then use a Berry or Bait.');
end;
$$;

create or replace function public.play_rankings()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  return jsonb_build_object(
    'ok', true,
    'trainers', coalesce((
      select jsonb_agg(card order by (card->>'xp')::int desc, (card->>'caught')::int desc)
      from (
        select jsonb_build_object(
          'login', p.twitch_login,
          'displayName', coalesce(nullif(p.display_name, ''), p.twitch_login, 'Trainer'),
          'avatar', p.avatar_url,
          'level', private.trainer_level(p.xp),
          'xp', p.xp,
          'watchSeconds', p.watch_seconds,
          'pass', p.starlight_pass,
          'caught', (select count(*)::int from public.catches c where c.user_id = p.id),
          'species', (select count(distinct c.dex)::int from public.catches c where c.user_id = p.id),
          'favoriteDex', p.favorite_dex,
          'favoriteVariant', coalesce(p.favorite_variant, 'normal'),
          'lastSeenAt', p.last_seen_at,
          'online', p.last_seen_at is not null and p.last_seen_at > now() - interval '2 minutes'
        ) as card
        from public.profiles p
        where p.twitch_login is not null
        order by p.xp desc, (select count(*) from public.catches c where c.user_id = p.id) desc, p.created_at
        limit 50
      ) ranked
    ), '[]'::jsonb)
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
  return jsonb_build_object(
    'ok', true,
    'trainer', card,
    'recent', recent,
    'mine', mine,
    'caughtOptions', case when mine then caught_opts else '[]'::jsonb end
  );
end;
$$;

create or replace function public.play_update_profile(p_display_name text, p_favorite_dex int, p_favorite_variant text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  uid uuid := auth.uid();
  nice text := btrim(coalesce(p_display_name, ''));
  variant text := coalesce(nullif(btrim(coalesce(p_favorite_variant, '')), ''), 'normal');
begin
  if uid is null then
    raise exception 'Sign in to edit your trainer card.' using errcode = '42501';
  end if;
  if char_length(nice) < 2 or char_length(nice) > 24 then
    raise exception 'Display names need 2 to 24 characters.';
  end if;
  if nice !~ '^[A-Za-z0-9][A-Za-z0-9 _''.-]{0,23}$' then
    raise exception 'Display names can use letters, numbers, spaces, and . '' -';
  end if;
  if p_favorite_dex is not null then
    if not exists (select 1 from public.catches where user_id = uid and dex = p_favorite_dex) then
      raise exception 'Favorite Pokémon must be one you have caught.';
    end if;
    if not exists (
      select 1 from public.catches
      where user_id = uid and dex = p_favorite_dex and coalesce(variant, 'normal') = variant
    ) then
      variant := 'normal';
    end if;
  end if;
  update public.profiles
    set display_name = nice,
        favorite_dex = p_favorite_dex,
        favorite_variant = case when p_favorite_dex is null then 'normal' else variant end,
        updated_at = now()
    where id = uid;
  return jsonb_build_object('ok', true, 'message', 'Trainer card updated.', 'trainer', private.trainer_card(uid));
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
    'caught', caught
  );
end;
$$;

create or replace function public.play_events()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  return jsonb_build_object(
    'ok', true,
    'isAdmin', private.is_play_admin(),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id,
        'title', e.title,
        'blurb', e.blurb,
        'kind', e.kind,
        'startsAt', e.starts_at,
        'endsAt', e.ends_at
      ) order by e.starts_at)
      from public.play_events e
      where coalesce(e.ends_at, e.starts_at) >= now() - interval '1 day'
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.admin_save_event(
  p_id uuid,
  p_title text,
  p_blurb text,
  p_kind text,
  p_starts_at timestamptz,
  p_ends_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  event_id uuid;
  title text := btrim(coalesce(p_title, ''));
  kind text := coalesce(nullif(btrim(coalesce(p_kind, '')), ''), 'community');
begin
  if not private.is_play_admin() then
    raise exception 'Staff only.' using errcode = '42501';
  end if;
  if char_length(title) < 2 then
    raise exception 'Give the event a title.';
  end if;
  if p_starts_at is null then
    raise exception 'Pick a start time.';
  end if;
  if kind not in ('community', 'shiny', 'raid', 'stream', 'other') then
    kind := 'community';
  end if;
  if p_id is null then
    insert into public.play_events (title, blurb, kind, starts_at, ends_at)
    values (title, coalesce(p_blurb, ''), kind, p_starts_at, p_ends_at)
    returning id into event_id;
  else
    update public.play_events
      set title = title,
          blurb = coalesce(p_blurb, ''),
          kind = kind,
          starts_at = p_starts_at,
          ends_at = p_ends_at,
          updated_at = now()
      where id = p_id
      returning id into event_id;
    if event_id is null then
      raise exception 'That event was not found.';
    end if;
  end if;
  return jsonb_build_object('ok', true, 'id', event_id, 'message', 'Event saved.');
end;
$$;

create or replace function public.admin_delete_event(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not private.is_play_admin() then
    raise exception 'Staff only.' using errcode = '42501';
  end if;
  delete from public.play_events where id = p_id;
  return jsonb_build_object('ok', true, 'message', 'Event removed.');
end;
$$;

create or replace function public.bridge_publish(p_token text, p_round jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  source_key text;
  round_id uuid;
  rec record;
begin
  if not private.bridge_ok(p_token) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update private.stream_bridge set seen_at = now() where id = 1;
  if p_round is null or coalesce(p_round->>'id', '') = '' then
    update public.encounter_rounds
      set hidden = true, phase = 'closed', last_action = coalesce(p_round->>'lastAction', last_action), updated_at = now()
      where source = 'mixitup' and coalesce(cancelled, false) = false and phase <> 'closed';
    return jsonb_build_object('ok', true);
  end if;

  source_key := 'mixitup:' || (p_round->>'id');
  insert into public.encounter_rounds (
    source_id, source, phase, hidden, pokemon, dex, name, variant, gender,
    started_at, deadlines, rules, resolved, cancelled, last_action, ends_at, players
  ) values (
    source_key,
    'mixitup',
    coalesce(p_round->>'phase', 'closed'),
    coalesce((p_round->>'hidden')::boolean, false),
    jsonb_build_object(
      'dex', (p_round->>'dex')::int,
      'name', p_round->>'name',
      'variant', coalesce(p_round->>'variant', 'normal'),
      'gender', coalesce(p_round->>'gender', 'Unknown')
    ),
    nullif(p_round->>'dex', '')::int,
    p_round->>'name',
    coalesce(p_round->>'variant', 'normal'),
    coalesce(p_round->>'gender', 'Unknown'),
    nullif(p_round->>'startedAt', '')::timestamptz,
    p_round->'deadlines',
    p_round->'rules',
    coalesce((p_round->>'resolved')::boolean, false),
    coalesce((p_round->>'cancelled')::boolean, false),
    coalesce(p_round->>'lastAction', ''),
    nullif(p_round->>'endsAt', '')::timestamptz,
    '{}'::jsonb
  )
  on conflict (source_id) do update set
    source = 'mixitup',
    phase = excluded.phase,
    hidden = excluded.hidden,
    pokemon = excluded.pokemon,
    dex = excluded.dex,
    name = excluded.name,
    variant = excluded.variant,
    gender = excluded.gender,
    started_at = excluded.started_at,
    deadlines = excluded.deadlines,
    rules = excluded.rules,
    resolved = excluded.resolved,
    cancelled = excluded.cancelled,
    last_action = excluded.last_action,
    ends_at = excluded.ends_at,
    updated_at = now()
  returning id into round_id;

  if coalesce((p_round->>'resolved')::boolean, false) then
    for rec in select value from jsonb_array_elements(coalesce(p_round->'results', '[]'::jsonb)) as t(value)
    loop
      if coalesce((rec.value->>'caught')::boolean, false) then
        perform private.record_stream_catch(
          rec.value->>'user',
          rec.value->>'name',
          nullif(p_round->>'dex', '')::int,
          p_round->>'name',
          coalesce(p_round->>'variant', 'normal'),
          coalesce(p_round->>'gender', 'Unknown'),
          rec.value->>'ball',
          round_id,
          'mixitup:' || (p_round->>'id') || ':' || coalesce(rec.value->>'user', rec.value->>'name', ''),
          now()
        );
      end if;
    end loop;
  end if;

  return jsonb_build_object('ok', true, 'id', round_id);
end;
$$;

create or replace function public.bridge_import_catches(p_token text, p_catches jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  rec record;
  round_id uuid;
  imported int := 0;
begin
  if not private.bridge_ok(p_token) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update private.stream_bridge set seen_at = now() where id = 1;
  for rec in select value from jsonb_array_elements(coalesce(p_catches, '[]'::jsonb)) as t(value)
  loop
    round_id := null;
    if coalesce(rec.value->>'round', '') <> '' then
      select id into round_id
      from public.encounter_rounds
      where source_id = 'mixitup:' || (rec.value->>'round');
    end if;
    if private.record_stream_catch(
      rec.value->>'user',
      rec.value->>'name',
      nullif(rec.value->>'dex', '')::int,
      coalesce(rec.value->>'species', rec.value->>'name'),
      coalesce(rec.value->>'variant', 'normal'),
      coalesce(rec.value->>'gender', 'Unknown'),
      rec.value->>'ball',
      round_id,
      coalesce(nullif(rec.value->>'id', ''), 'mixitup-catch:' || coalesce(rec.value->>'round', '') || ':' || coalesce(rec.value->>'user', '')),
      nullif(rec.value->>'caughtAt', '')::timestamptz
    ) then
      imported := imported + 1;
    end if;
  end loop;
  return jsonb_build_object('ok', true, 'imported', imported);
end;
$$;

grant execute on function public.play_join() to authenticated;
grant execute on function public.play_rankings() to anon, authenticated;
grant execute on function public.play_trainer(text) to anon, authenticated;
grant execute on function public.play_update_profile(text, int, text) to authenticated;
grant execute on function public.play_pokedex(text) to anon, authenticated;
grant execute on function public.play_events() to anon, authenticated;
grant execute on function public.admin_save_event(uuid, text, text, text, timestamptz, timestamptz) to authenticated;
grant execute on function public.admin_delete_event(uuid) to authenticated;
grant execute on function public.bridge_publish(text, jsonb) to anon, authenticated;
grant execute on function public.bridge_import_catches(text, jsonb) to anon, authenticated;
