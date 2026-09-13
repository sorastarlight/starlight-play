-- Player-facing progression RPCs and an expanded trainer card.

create or replace function private.trainer_card(p_uid uuid)
returns jsonb
language plpgsql
stable
as $function$
declare
  p public.profiles%rowtype;
  prog jsonb;
  coins int := 0;
  caught int;
  species int;
  seen int;
  variants jsonb;
  title_name text;
  badges jsonb;
  next_reward jsonb;
begin
  if p_uid is null then
    return null;
  end if;
  select * into p from public.profiles where id = p_uid;
  if p.id is null then
    return null;
  end if;
  prog := private.trainer_xp_progress(p.xp);
  select coalesce(i.coins, 0) into coins from public.inventories i where i.user_id = p_uid;
  select count(*)::int, count(distinct dex)::int into caught, species from public.catches where user_id = p_uid;
  select count(*)::int into seen from public.species_seen where user_id = p_uid;
  variants := private.collection_variant_stats(p_uid);
  select t.name into title_name
    from public.progression_titles t
   where t.id = p.active_title_id;
  title_name := coalesce(title_name, nullif(p.trainer_title, ''), '');
  select coalesce(jsonb_agg(jsonb_build_object('id', b.id, 'name', b.name) order by b.sort_order), '[]'::jsonb)
    into badges
    from public.progression_badges b
    join public.trainer_badges tb on tb.badge_id = b.id
   where tb.user_id = p_uid
     and (p.featured_badge_ids = '{}' or b.id = any (p.featured_badge_ids));
  select value into next_reward
    from jsonb_array_elements(private.progression_config()->'levelRewards')
   where coalesce((value->>'level')::int, 0) > (prog->>'level')::int
   order by (value->>'level')::int
   limit 1;
  return jsonb_build_object(
    'id', p.id,
    'login', p.twitch_login,
    'displayName', coalesce(nullif(p.display_name, ''), p.twitch_login, 'Trainer'),
    'avatar', p.avatar_url,
    'trainerSprite', case when private.trainer_sprite_ok(p.trainer_sprite) then p.trainer_sprite else 'red-gen1' end,
    'cardBg', case when private.card_bg_ok(p.card_bg) then p.card_bg else 'hoenn' end,
    'idNo', 10000 + (abs(hashtext(p.id::text)) % 90000),
    'startedAt', p.created_at,
    'coins', coalesce(coins, 0),
    'level', (prog->>'level')::int,
    'xp', (prog->>'xp')::int,
    'xpInto', (prog->>'xpInto')::int,
    'xpNeed', (prog->>'xpNeed')::int,
    'nextReward', next_reward,
    'watchSeconds', p.watch_seconds,
    'caught', coalesce(caught, 0),
    'species', coalesce(species, 0),
    'seen', coalesce(seen, 0),
    'kanto', jsonb_build_object(
      'caught', coalesce((variants->>'kantoCaught')::int, 0),
      'total', 151,
      'percent', round(100.0 * coalesce((variants->>'kantoCaught')::int, 0) / 151.0, 1)
    ),
    'variants', variants,
    'generations', jsonb_build_array(jsonb_build_object(
      'id', 1, 'name', 'Kanto', 'caught', coalesce((variants->>'kantoCaught')::int, 0), 'total', 151
    )),
    'pass', p.starlight_pass,
    'favoriteDex', p.favorite_dex,
    'favoriteVariant', coalesce(p.favorite_variant, 'normal'),
    'title', title_name,
    'activeTitleId', p.active_title_id,
    'badges', coalesce(badges, '[]'::jsonb),
    'team', private.team_mons(p_uid),
    'lastSeenAt', p.last_seen_at,
    'online', p.last_seen_at is not null and p.last_seen_at > now() - interval '2 minutes'
  );
end;
$function$;

create or replace function public.play_pokedex(p_login text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
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
    into seen from public.species_seen where user_id = trainer;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id, 'dex', c.dex, 'name', c.name, 'variant', c.variant,
    'gender', c.gender, 'ball', c.ball, 'caughtAt', c.caught_at
  ) order by c.dex, c.caught_at), '[]'::jsonb)
    into caught from public.catches c where c.user_id = trainer;
  return jsonb_build_object(
    'ok', true,
    'login', (select twitch_login from public.profiles where id = trainer),
    'displayName', (select coalesce(nullif(display_name, ''), twitch_login) from public.profiles where id = trainer),
    'mine', auth.uid() is not null and auth.uid() = trainer,
    'seen', seen,
    'caught', caught,
    'team', private.team_mons(trainer),
    'variants', private.collection_variant_stats(trainer),
    'generations', jsonb_build_array(jsonb_build_object(
      'id', 1, 'name', 'Kanto',
      'caught', (select count(distinct dex) from public.catches where user_id = trainer and dex between 1 and 151),
      'total', 151
    ))
  );
end;
$function$;

create or replace function public.play_progression()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
  st public.trainer_stats;
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  st := private.ensure_trainer_stats(uid);
  return jsonb_build_object(
    'ok', true,
    'trainer', private.trainer_card(uid),
    'stats', to_jsonb(st),
    'titles', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id, 'name', t.name, 'description', t.description, 'rarity', t.rarity,
        'unlocked', tt.title_id is not null
      ) order by t.sort_order)
      from public.progression_titles t
      left join public.trainer_titles tt on tt.title_id = t.id and tt.user_id = uid
      where t.enabled
    ), '[]'::jsonb),
    'badges', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', b.id, 'name', b.name, 'description', b.description, 'rarity', b.rarity,
        'unlocked', tb.badge_id is not null,
        'featured', b.id = any (coalesce((select featured_badge_ids from public.profiles where id = uid), '{}'::text[]))
      ) order by b.sort_order)
      from public.progression_badges b
      left join public.trainer_badges tb on tb.badge_id = b.id and tb.user_id = uid
      where b.enabled
    ), '[]'::jsonb),
    'achievements', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id,
        'name', case when a.hidden and ta.unlocked_at is null then 'Hidden Achievement' else a.name end,
        'description', case when a.hidden and ta.unlocked_at is null then 'Keep playing to find this one.' else a.description end,
        'category', a.category,
        'progress', case when a.hidden and ta.unlocked_at is null then 0 else coalesce(ta.progress, 0) end,
        'target', a.target_value,
        'unlocked', ta.unlocked_at is not null,
        'hidden', a.hidden and ta.unlocked_at is null,
        'rewards', case when a.hidden and ta.unlocked_at is null then '{}'::jsonb else a.rewards end
      ) order by a.sort_order)
      from public.progression_achievements a
      left join public.trainer_achievements ta on ta.achievement_id = a.id and ta.user_id = uid
      where a.enabled
    ), '[]'::jsonb)
  );
end;
$function$;

create or replace function public.play_set_title(p_title text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
  rec public.progression_titles;
begin
  if uid is null then raise exception 'Sign in first.' using errcode = '42501'; end if;
  if coalesce(p_title, '') = '' then
    update public.profiles set active_title_id = null, trainer_title = '', updated_at = now() where id = uid;
    return jsonb_build_object('ok', true, 'trainer', private.trainer_card(uid));
  end if;
  select t.* into rec
    from public.progression_titles t
    join public.trainer_titles tt on tt.title_id = t.id and tt.user_id = uid
   where t.id = p_title and t.enabled;
  if rec.id is null then
    raise exception 'That title is not unlocked yet.';
  end if;
  update public.profiles
     set active_title_id = rec.id, trainer_title = rec.name, updated_at = now()
   where id = uid;
  return jsonb_build_object('ok', true, 'trainer', private.trainer_card(uid), 'message', 'Title set.');
end;
$function$;

create or replace function public.play_set_badges(p_ids text[])
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
  picked text[];
begin
  if uid is null then raise exception 'Sign in first.' using errcode = '42501'; end if;
  select coalesce(array_agg(x), '{}'::text[])
    into picked
    from (
      select unnest(coalesce(p_ids, '{}'::text[])) as x
      limit 5
    ) s
   where exists (
     select 1 from public.trainer_badges tb where tb.user_id = uid and tb.badge_id = s.x
   );
  update public.profiles set featured_badge_ids = coalesce(picked, '{}'::text[]), updated_at = now() where id = uid;
  return jsonb_build_object('ok', true, 'trainer', private.trainer_card(uid), 'message', 'Badges saved.');
end;
$function$;

create or replace function public.play_notices()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
  rows jsonb;
begin
  if uid is null then
    return jsonb_build_object('ok', true, 'notices', '[]'::jsonb);
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', n.id, 'kind', n.kind, 'title', n.title, 'body', n.body, 'payload', n.payload
  ) order by n.created_at), '[]'::jsonb)
    into rows
    from public.trainer_notices n
   where n.user_id = uid and n.seen_at is null;
  update public.trainer_notices set seen_at = now()
   where user_id = uid and seen_at is null;
  return jsonb_build_object('ok', true, 'notices', coalesce(rows, '[]'::jsonb));
end;
$function$;

create or replace function public.play_rankings(p_board text default 'level')
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  board text := lower(coalesce(p_board, 'level'));
begin
  return jsonb_build_object(
    'ok', true,
    'board', board,
    'trainers', coalesce((
      select jsonb_agg(row order by
        case board
          when 'pokedex' then (row->>'species')::int
          when 'shinies' then (row->>'shinies')::int
          when 'catches' then (row->>'captures')::int
          when 'honey' then (row->>'honey')::int
          else (row->>'xp')::int
        end desc,
        (row->>'caught')::int desc)
      from (
        select jsonb_build_object(
          'login', p.twitch_login,
          'displayName', coalesce(nullif(p.display_name, ''), p.twitch_login, 'Trainer'),
          'avatar', p.avatar_url,
          'level', private.trainer_level(p.xp),
          'xp', p.xp,
          'title', coalesce((select t.name from public.progression_titles t where t.id = p.active_title_id), p.trainer_title, ''),
          'watchSeconds', p.watch_seconds,
          'pass', p.starlight_pass,
          'caught', (select count(*) from public.catches c where c.user_id = p.id),
          'species', (select count(distinct dex) from public.catches c where c.user_id = p.id),
          'shinies', (select count(distinct dex) from public.catches c where c.user_id = p.id and c.variant like '%shiny%'),
          'captures', (select count(*) from public.catches c where c.user_id = p.id and c.round_id is not null),
          'honey', coalesce((select s.honey from public.trainer_stats s where s.user_id = p.id), 0),
          'favoriteDex', p.favorite_dex,
          'favoriteVariant', p.favorite_variant,
          'lastSeenAt', p.last_seen_at,
          'online', p.last_seen_at is not null and p.last_seen_at > now() - interval '2 minutes'
        ) as row
        from public.profiles p
        where p.twitch_login is not null
        order by p.xp desc
        limit 80
      ) ranked
    ), '[]'::jsonb)
  );
end;
$function$;

grant execute on function public.play_progression() to authenticated;
grant execute on function public.play_set_title(text) to authenticated;
grant execute on function public.play_set_badges(text[]) to authenticated;
grant execute on function public.play_notices() to authenticated;
grant execute on function public.play_rankings(text) to authenticated;
grant execute on function public.play_pokedex(text) to authenticated;
