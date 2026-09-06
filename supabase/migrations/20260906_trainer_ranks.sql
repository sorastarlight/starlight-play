-- Trainer level, watch time, public rankings, and Mix It Up catch sync.

alter table public.profiles
  add column if not exists watch_seconds bigint not null default 0,
  add column if not exists xp int not null default 0,
  add column if not exists last_heartbeat_at timestamptz,
  add column if not exists last_seen_at timestamptz;

alter table public.catches
  add column if not exists round_id uuid references public.encounter_rounds(id);

create unique index if not exists catches_round_user_uidx
  on public.catches (round_id, user_id)
  where round_id is not null;

create or replace function private.trainer_level(p_xp int)
returns int
language sql
immutable
as $$
  select greatest(1, least(50, 1 + floor(sqrt(greatest(coalesce(p_xp, 0), 0) / 25.0))::int));
$$;

create or replace function private.award_xp(p_uid uuid, p_amount int)
returns void
language plpgsql
as $$
begin
  if p_uid is null or coalesce(p_amount, 0) = 0 then
    return;
  end if;
  update public.profiles
    set xp = greatest(0, xp + p_amount),
        last_seen_at = now(),
        updated_at = now()
    where id = p_uid;
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
    'displayName', coalesce(p.display_name, p.twitch_login, 'Trainer'),
    'avatar', p.avatar_url,
    'level', lvl,
    'xp', p.xp,
    'xpInto', greatest(0, into_xp),
    'xpNeed', greatest(1, need),
    'watchSeconds', p.watch_seconds,
    'caught', coalesce(caught, 0),
    'species', coalesce(species, 0),
    'pass', p.starlight_pass,
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
begin
  r := private.sync_latest_round();
  is_admin := p_uid is not null and private.is_play_admin();
  settings := private.game_settings();

  if p_uid is not null then
    update public.profiles
      set last_seen_at = now(), updated_at = now()
      where id = p_uid;
    select jsonb_build_object(
      'berry', i.berry, 'bait', i.bait, 'pokeball', i.pokeball,
      'greatball', i.greatball, 'ultraball', i.ultraball
    ) into bag
    from public.inventories i where i.user_id = p_uid;

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
    'live', (select is_live from public.stream_status where id = 1)
  );
end;
$$;

create or replace function public.play_heartbeat(p_seconds int default 20)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  uid uuid := auth.uid();
  add_sec int;
  live boolean;
  old_sec bigint;
  new_sec bigint;
  gained int := 0;
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  add_sec := greatest(0, least(coalesce(p_seconds, 0), 45));
  select coalesce(is_live, false) into live from public.stream_status where id = 1;
  select coalesce(watch_seconds, 0) into old_sec from public.profiles where id = uid;
  new_sec := coalesce(old_sec, 0) + case when live then add_sec else 0 end;
  update public.profiles
    set last_heartbeat_at = now(),
        last_seen_at = now(),
        watch_seconds = new_sec,
        updated_at = now()
    where id = uid;
  gained := (new_sec / 180) - (coalesce(old_sec, 0) / 180);
  if gained > 0 then
    perform private.award_xp(uid, gained);
  end if;
  return private.play_snapshot(uid) || jsonb_build_object('ok', true, 'watched', live, 'xpGained', gained);
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
          'displayName', coalesce(p.display_name, p.twitch_login, 'Trainer'),
          'avatar', p.avatar_url,
          'level', private.trainer_level(p.xp),
          'xp', p.xp,
          'watchSeconds', p.watch_seconds,
          'pass', p.starlight_pass,
          'caught', (select count(*)::int from public.catches c where c.user_id = p.id),
          'species', (select count(distinct c.dex)::int from public.catches c where c.user_id = p.id),
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
begin
  select * into p
  from public.profiles
  where lower(twitch_login) = lower(btrim(coalesce(p_login, '')));
  if p.id is null then
    raise exception 'No trainer card for that Twitch login yet.';
  end if;
  card := private.trainer_card(p.id);
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
  return jsonb_build_object('ok', true, 'trainer', card, 'recent', recent);
end;
$$;

create or replace function private.after_join_xp()
returns trigger
language plpgsql
as $$
begin
  perform private.award_xp(new.user_id, 10);
  return new;
end;
$$;

drop trigger if exists encounter_players_join_xp on public.encounter_players;
create trigger encounter_players_join_xp
  after insert on public.encounter_players
  for each row execute function private.after_join_xp();

create or replace function private.after_catch_xp()
returns trigger
language plpgsql
as $$
declare
  first_species boolean;
begin
  select not exists (
    select 1 from public.catches
    where user_id = new.user_id and dex = new.dex and id <> new.id
  ) into first_species;
  perform private.award_xp(new.user_id, 50 + case when first_species then 25 else 0 end);
  return new;
end;
$$;

drop trigger if exists catches_xp on public.catches;
create trigger catches_xp
  after insert on public.catches
  for each row execute function private.after_catch_xp();

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
  trainer uuid;
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
        select id into trainer
        from public.profiles
        where twitch_user_id = rec.value->>'user'
           or lower(twitch_login) = lower(coalesce(rec.value->>'name', ''));
        if trainer is not null and not exists (
          select 1 from public.catches c where c.round_id = round_id and c.user_id = trainer
        ) then
          insert into public.catches (user_id, dex, name, variant, gender, ball, round_id)
          values (
            trainer,
            nullif(p_round->>'dex', '')::int,
            p_round->>'name',
            coalesce(p_round->>'variant', 'normal'),
            coalesce(p_round->>'gender', 'Unknown'),
            rec.value->>'ball',
            round_id
          );
        end if;
      end if;
    end loop;
  end if;

  return jsonb_build_object('ok', true, 'id', round_id);
end;
$$;

grant execute on function public.play_heartbeat(int) to authenticated;
grant execute on function public.play_rankings() to anon, authenticated;
grant execute on function public.play_trainer(text) to anon, authenticated;
grant execute on function public.play_state() to anon, authenticated;
grant execute on function public.play_sync() to anon, authenticated;
grant execute on function public.bridge_publish(text, jsonb) to anon, authenticated;
