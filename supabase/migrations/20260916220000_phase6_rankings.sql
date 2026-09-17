-- Phase 6 — Trainer Rankings & Discovery
-- Factual boards only. No composite "best Trainer" score.
-- Honey ranks contribution (trainer_stats.honey), never inventory/spending.

alter table public.profiles
  add column if not exists ranking_visible boolean not null default true;

comment on column public.profiles.ranking_visible is
  'When false, omit this account from public Rankings and Trainer search. Does not delete the account, badges, or collection.';

-- Designated Play Tester QA account used by admin_test_* (flag, not a display-name check).
update public.profiles
   set ranking_visible = false
 where id = 'a98cbf81-a6b2-4dbf-8448-8d62f6d5f523'
   and ranking_visible is distinct from false;

-- Cap featured/equipped badges at 3. Ownership in trainer_badges is unchanged.
update public.profiles
   set featured_badge_ids = featured_badge_ids[1:3]
 where coalesce(cardinality(featured_badge_ids), 0) > 3;

create index if not exists catches_rank_kanto_idx
  on public.catches (user_id, dex)
  where dex between 1 and 151;

create index if not exists catches_rank_shiny_idx
  on public.catches (user_id, dex)
  where variant like '%shiny%';

create index if not exists catches_rank_capture_idx
  on public.catches (user_id)
  where round_id is not null;

create index if not exists trainer_achievements_unlocked_user_idx
  on public.trainer_achievements (user_id)
  where unlocked_at is not null;

create index if not exists profiles_ranking_xp_idx
  on public.profiles (xp desc)
  where ranking_visible;

create index if not exists profiles_display_name_lower_idx
  on public.profiles (lower(display_name));

create or replace function private.ranking_eligible_uid(p_uid uuid)
returns boolean
language sql
stable
set search_path to 'public'
as $$
  select exists (
    select 1
      from public.profiles p
     where p.id = p_uid
       and p.ranking_visible
       and coalesce(nullif(p.twitch_login, ''), nullif(p.username, '')) is not null
       and (
         nullif(p.username, '') is not null
         or exists (
           select 1
             from public.twitch_connections c
            where c.user_id = p.id
              and c.confirmed
              and c.connection_type in ('player', 'secondary')
         )
       )
  );
$$;

create or replace function private.ranking_public_row(
  p_login text,
  p_display_name text,
  p_avatar text,
  p_trainer_sprite text,
  p_twitch_linked boolean,
  p_level int,
  p_title text,
  p_featured jsonb,
  p_place bigint,
  p_metric bigint,
  p_metric_text text,
  p_metric_detail text
)
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'login', p_login,
    'displayName', p_display_name,
    'avatar', p_avatar,
    'trainerSprite', p_trainer_sprite,
    'twitchLinked', coalesce(p_twitch_linked, false),
    'level', coalesce(p_level, 1),
    'title', coalesce(p_title, ''),
    'featuredBadges', coalesce(p_featured, '[]'::jsonb),
    'place', p_place::int,
    'metric', coalesce(p_metric, 0)::int,
    'metricText', coalesce(p_metric_text, ''),
    'metricDetail', coalesce(p_metric_detail, '')
  );
$$;

drop function if exists private.ranking_public_row(text, text, text, text, boolean, integer, text, jsonb, integer, integer, text, text);
drop function if exists public.play_rankings();
drop function if exists public.play_rankings(text);

create or replace function public.play_rankings(
  p_board text default 'level',
  p_limit int default 20,
  p_offset int default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  board text := lower(btrim(coalesce(p_board, 'level')));
  lim int := greatest(1, least(coalesce(p_limit, 20), 50));
  off int := greatest(0, coalesce(p_offset, 0));
  uid uuid := auth.uid();
  definition text;
  metric_label text;
  unranked_hint text;
  ranked jsonb := '[]'::jsonb;
  mine jsonb := null;
  my_ranks jsonb := '[]'::jsonb;
  spotlight jsonb := '[]'::jsonb;
  discover jsonb := '[]'::jsonb;
  total int := 0;
  eligible int := 0;
  generated timestamptz := now();
begin
  if board not in ('level', 'pokedex', 'shinies', 'catches', 'evolutions', 'mastery', 'honey', 'achievements') then
    board := 'level';
  end if;

  definition := case board
    when 'pokedex' then 'Unique Kanto species registered (Pokédex Nos. 1–151). Same registration as Pokédex / Trainer ID.'
    when 'shinies' then 'Unique Shiny species owned. Total Shiny Pokémon caught is shown as secondary information only.'
    when 'catches' then 'Successful encounter catches (a finished catch with a round). Joins, failed throws, and cancelled rounds do not count.'
    when 'evolutions' then 'Successful Evolutions recorded in Trainer statistics.'
    when 'mastery' then 'Sum of species mastery points earned. Not a weighted rating.'
    when 'honey' then 'Honey contributed on finished non-test encounters (item prep = Honey). Not Honey owned, purchased, or stored.'
    when 'achievements' then 'Completed Achievements. Lifetime count, not weighted points.'
    else 'Authoritative Trainer Level from server XP.'
  end;
  metric_label := case board
    when 'pokedex' then 'Pokédex'
    when 'shinies' then 'Unique Shinies'
    when 'catches' then 'Catches'
    when 'evolutions' then 'Evolutions'
    when 'mastery' then 'Mastery points'
    when 'honey' then 'Honey contributed'
    when 'achievements' then 'Achievements'
    else 'Trainer Level'
  end;
  unranked_hint := case board
    when 'pokedex' then 'Catch your first Pokémon to join this ranking.'
    when 'shinies' then 'Register a Shiny Pokémon to join this ranking.'
    when 'catches' then 'Catch your first Pokémon to join this ranking.'
    when 'evolutions' then 'Evolve a Pokémon to join this ranking.'
    when 'mastery' then 'Earn species mastery points to join this ranking.'
    when 'honey' then 'Contribute Honey on an encounter to join this ranking.'
    when 'achievements' then 'Complete an Achievement to join this ranking.'
    else 'Play an encounter to join Trainer Level rankings.'
  end;

  with catch_agg as (
    select
      user_id,
      count(distinct dex) filter (where dex between 1 and 151)::int as kanto,
      count(distinct dex) filter (where variant like '%shiny%')::int as shiny_species,
      count(*) filter (where variant like '%shiny%')::int as shiny_caught,
      count(*) filter (where round_id is not null)::int as captures
    from public.catches
    group by user_id
  ),
  ach_agg as (
    select user_id, count(*)::int as achievements
    from public.trainer_achievements
    where unlocked_at is not null
    group by user_id
  ),
  mastery_agg as (
    select user_id, coalesce(sum(points), 0)::int as mastery_points
    from public.species_mastery
    group by user_id
  ),
  scored as (
    select
      p.id,
      coalesce(nullif(p.twitch_login, ''), nullif(p.username, ''), 'trainer') as login,
      coalesce(nullif(p.display_name, ''), nullif(p.username, ''), nullif(p.twitch_login, ''), 'Trainer') as display_name,
      p.avatar_url as avatar,
      case when private.trainer_sprite_ok(p.trainer_sprite) then p.trainer_sprite else 'red-gen1' end as trainer_sprite,
      exists (
        select 1 from public.twitch_connections c
         where c.user_id = p.id and c.confirmed and c.connection_type in ('player', 'secondary')
      ) as twitch_linked,
      private.trainer_level(p.xp) as level,
      p.xp,
      coalesce((select t.name from public.progression_titles t where t.id = p.active_title_id), p.trainer_title, '') as title,
      coalesce((
        select jsonb_agg(jsonb_build_object('id', b.id, 'name', b.name) order by x.ord)
        from unnest(coalesce(p.featured_badge_ids[1:3], '{}'::text[])) with ordinality as x(id, ord)
        join public.progression_badges b on b.id = x.id
      ), '[]'::jsonb) as featured_badges,
      coalesce(ca.kanto, 0) as kanto,
      coalesce(ca.shiny_species, 0) as shiny_species,
      coalesce(ca.shiny_caught, 0) as shiny_caught,
      coalesce(ca.captures, 0) as captures,
      coalesce(st.evolved, 0) as evolved,
      coalesce(st.honey, 0) as honey,
      coalesce(ma.mastery_points, 0) as mastery_points,
      coalesce(ac.achievements, 0) as achievements,
      p.last_seen_at
    from public.profiles p
    left join catch_agg ca on ca.user_id = p.id
    left join public.trainer_stats st on st.user_id = p.id
    left join mastery_agg ma on ma.user_id = p.id
    left join ach_agg ac on ac.user_id = p.id
    where private.ranking_eligible_uid(p.id)
  ),
  valued as (
    select
      s.*,
      case board
        when 'pokedex' then s.kanto
        when 'shinies' then s.shiny_species
        when 'catches' then s.captures
        when 'evolutions' then s.evolved
        when 'mastery' then s.mastery_points
        when 'honey' then s.honey
        when 'achievements' then s.achievements
        else s.xp
      end as metric
    from scored s
  ),
  populated as (
    select v.*
    from valued v
    where board = 'level' or v.metric > 0
  ),
  placed as (
    select
      p.*,
      rank() over (order by p.metric desc, p.login) as place
    from populated p
  )
  select
    (select count(*)::int from scored),
    (select count(*)::int from placed),
    coalesce((
      select jsonb_agg(
        private.ranking_public_row(
          x.login, x.display_name, x.avatar, x.trainer_sprite, x.twitch_linked, x.level, x.title, x.featured_badges,
          x.place, x.metric,
          case board
            when 'pokedex' then x.kanto::text || ' / 151'
            when 'shinies' then x.shiny_species::text || ' unique'
            when 'catches' then x.captures::text
            when 'evolutions' then x.evolved::text
            when 'mastery' then x.mastery_points::text
            when 'honey' then x.honey::text
            when 'achievements' then x.achievements::text
            else 'Lv. ' || x.level::text
          end,
          case board
            when 'pokedex' then round(100.0 * x.kanto / 151.0, 1)::text || '%'
            when 'shinies' then x.shiny_caught::text || ' Shiny Pokémon caught'
            when 'level' then to_char(x.xp, 'FM999,999,999') || ' XP'
            when 'honey' then 'contributed'
            when 'mastery' then 'mastery points'
            else ''
          end
        )
        order by x.place, x.login
      )
      from (
        select * from placed
        order by place, login
        offset off
        limit lim
      ) x
    ), '[]'::jsonb),
    (
      select private.ranking_public_row(
        m.login, m.display_name, m.avatar, m.trainer_sprite, m.twitch_linked, m.level, m.title, m.featured_badges,
        m.place, m.metric,
        case board
          when 'pokedex' then m.kanto::text || ' / 151'
          when 'shinies' then m.shiny_species::text || ' unique'
          when 'catches' then m.captures::text
          when 'evolutions' then m.evolved::text
          when 'mastery' then m.mastery_points::text
          when 'honey' then m.honey::text
          when 'achievements' then m.achievements::text
          else 'Lv. ' || m.level::text
        end,
        case board
          when 'pokedex' then round(100.0 * m.kanto / 151.0, 1)::text || '%'
          when 'shinies' then m.shiny_caught::text || ' Shiny Pokémon caught'
          when 'level' then to_char(m.xp, 'FM999,999,999') || ' XP'
          when 'honey' then 'contributed'
          when 'mastery' then 'mastery points'
          else ''
        end
      ) || jsonb_build_object('ranked', true, 'eligible', true)
      from placed m
      where uid is not null and m.id = uid
      limit 1
    ),
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'board', r.board,
          'label', r.label,
          'place', r.place,
          'ranked', r.ranked,
          'metric', r.metric,
          'metricText', r.metric_text,
          'hint', r.hint
        )
        order by r.sort
      )
      from (
        select
          b.board,
          b.label,
          b.sort,
          b.hint,
          case
            when b.board = 'level' then v.xp
            when b.board = 'pokedex' then v.kanto
            when b.board = 'shinies' then v.shiny_species
            when b.board = 'catches' then v.captures
            when b.board = 'evolutions' then v.evolved
            when b.board = 'mastery' then v.mastery_points
            when b.board = 'honey' then v.honey
            else v.achievements
          end as metric,
          case
            when b.board = 'level' then 'Lv. ' || v.level::text
            when b.board = 'pokedex' then v.kanto::text || ' / 151'
            when b.board = 'shinies' then v.shiny_species::text || ' unique'
            when b.board = 'catches' then v.captures::text
            when b.board = 'evolutions' then v.evolved::text
            when b.board = 'mastery' then v.mastery_points::text
            when b.board = 'honey' then v.honey::text
            else v.achievements::text
          end as metric_text,
          case
            when b.board = 'level' then true
            when b.board = 'pokedex' then v.kanto > 0
            when b.board = 'shinies' then v.shiny_species > 0
            when b.board = 'catches' then v.captures > 0
            when b.board = 'evolutions' then v.evolved > 0
            when b.board = 'mastery' then v.mastery_points > 0
            when b.board = 'honey' then v.honey > 0
            else v.achievements > 0
          end as ranked,
          (
            select z.place
            from (
              select s.id, rank() over (
                order by (
                  case b.board
                    when 'level' then s.xp
                    when 'pokedex' then s.kanto
                    when 'shinies' then s.shiny_species
                    when 'catches' then s.captures
                    when 'evolutions' then s.evolved
                    when 'mastery' then s.mastery_points
                    when 'honey' then s.honey
                    else s.achievements
                  end
                ) desc, s.login
              ) as place
              from scored s
              where b.board = 'level' or case b.board
                when 'pokedex' then s.kanto > 0
                when 'shinies' then s.shiny_species > 0
                when 'catches' then s.captures > 0
                when 'evolutions' then s.evolved > 0
                when 'mastery' then s.mastery_points > 0
                when 'honey' then s.honey > 0
                else s.achievements > 0
              end
            ) z
            where z.id = v.id
          ) as place
        from (values
          ('level', 'Trainer Level', 1, 'Play an encounter to join Trainer Level rankings.'),
          ('pokedex', 'Pokédex', 2, 'Catch your first Pokémon to join this ranking.'),
          ('shinies', 'Shinies', 3, 'Register a Shiny Pokémon to join this ranking.'),
          ('catches', 'Catches', 4, 'Catch your first Pokémon to join this ranking.'),
          ('evolutions', 'Evolutions', 5, 'Evolve a Pokémon to join this ranking.'),
          ('mastery', 'Mastery', 6, 'Earn species mastery points to join this ranking.'),
          ('honey', 'Honey', 7, 'Contribute Honey on an encounter to join this ranking.'),
          ('achievements', 'Achievements', 8, 'Complete an Achievement to join this ranking.')
        ) as b(board, label, sort, hint)
        cross join scored v
        where uid is not null and v.id = uid
      ) r
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'login', d.login,
        'displayName', d.display_name,
        'trainerSprite', d.trainer_sprite,
        'title', d.title,
        'level', d.level,
        'twitchLinked', d.twitch_linked
      ) order by d.last_seen_at desc nulls last, d.login)
      from (
        select *
        from scored
        where last_seen_at is not null
          and last_seen_at > now() - interval '14 days'
        order by last_seen_at desc nulls last, login
        limit 6
      ) d
    ), '[]'::jsonb)
  into eligible, total, ranked, mine, my_ranks, discover
  from (select 1) dummy;

  if uid is not null and mine is null then
    if not private.ranking_eligible_uid(uid) then
      mine := jsonb_build_object('ranked', false, 'eligible', false);
      my_ranks := '[]'::jsonb;
    else
      mine := jsonb_build_object('ranked', false, 'eligible', true, 'hint', unranked_hint);
    end if;
  end if;

  select coalesce(jsonb_agg(row_to_json(s)::jsonb), '[]'::jsonb)
    into spotlight
    from (
      select
        coalesce(nullif(p.twitch_login, ''), nullif(p.username, ''), 'trainer') as login,
        coalesce(nullif(p.display_name, ''), nullif(p.username, ''), nullif(p.twitch_login, ''), 'Trainer') as "displayName",
        case when private.trainer_sprite_ok(p.trainer_sprite) then p.trainer_sprite else 'red-gen1' end as "trainerSprite",
        coalesce((select t.name from public.progression_titles t where t.id = p.active_title_id), p.trainer_title, '') as title,
        'Unlocked ' || a.name as event
      from public.trainer_achievements ta
      join public.profiles p on p.id = ta.user_id
      join public.progression_achievements a on a.id = ta.achievement_id
      where ta.unlocked_at is not null
        and ta.unlocked_at > now() - interval '14 days'
        and private.ranking_eligible_uid(p.id)
      order by ta.unlocked_at desc
      limit 3
    ) s;

  return jsonb_build_object(
    'ok', true,
    'board', board,
    'period', 'lifetime',
    'definition', definition,
    'metricLabel', metric_label,
    'unrankedHint', unranked_hint,
    'trainers', coalesce(ranked, '[]'::jsonb),
    'me', mine,
    'myRanks', coalesce(my_ranks, '[]'::jsonb),
    'spotlight', coalesce(spotlight, '[]'::jsonb),
    'discover', coalesce(discover, '[]'::jsonb),
    'total', coalesce(total, 0),
    'eligible', coalesce(eligible, 0),
    'limit', lim,
    'offset', off,
    'hasMore', coalesce(total, 0) > off + lim,
    'generatedAt', generated
  );
end;
$function$;

create or replace function public.play_trainer_search(p_q text default '')
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  q text := btrim(coalesce(p_q, ''));
  rows jsonb := '[]'::jsonb;
begin
  if char_length(q) < 2 then
    return jsonb_build_object('ok', true, 'trainers', '[]'::jsonb, 'message', 'Type at least two letters.');
  end if;
  if position('@' in q) > 0 or q ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return jsonb_build_object('ok', true, 'trainers', '[]'::jsonb);
  end if;
  q := left(q, 40);
  select coalesce(jsonb_agg(jsonb_build_object(
    'login', coalesce(nullif(p.twitch_login, ''), nullif(p.username, ''), 'trainer'),
    'displayName', coalesce(nullif(p.display_name, ''), nullif(p.username, ''), nullif(p.twitch_login, ''), 'Trainer'),
    'trainerSprite', case when private.trainer_sprite_ok(p.trainer_sprite) then p.trainer_sprite else 'red-gen1' end,
    'title', coalesce((select t.name from public.progression_titles t where t.id = p.active_title_id), p.trainer_title, ''),
    'level', private.trainer_level(p.xp),
    'twitchLinked', exists (
      select 1 from public.twitch_connections c
       where c.user_id = p.id and c.confirmed and c.connection_type in ('player', 'secondary')
    )
  ) order by p.display_name, p.username), '[]'::jsonb)
    into rows
    from public.profiles p
   where private.ranking_eligible_uid(p.id)
     and (
       coalesce(p.display_name, '') ilike '%' || q || '%'
       or coalesce((select t.name from public.progression_titles t where t.id = p.active_title_id), '') ilike '%' || q || '%'
     )
   limit 12;
  return jsonb_build_object('ok', true, 'trainers', coalesce(rows, '[]'::jsonb));
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
  select coalesce(array_agg(x order by n), '{}'::text[])
    into picked
    from (
      select t.x, t.n
      from unnest(coalesce(p_ids, '{}'::text[])) with ordinality as t(x, n)
      where exists (select 1 from public.trainer_badges tb where tb.user_id = uid and tb.badge_id = t.x)
      order by t.n
      limit 3
    ) s;
  update public.profiles set featured_badge_ids = coalesce(picked, '{}'::text[]), updated_at = now() where id = uid;
  return jsonb_build_object('ok', true, 'trainer', private.trainer_card(uid), 'message', 'Badges saved.');
end;
$function$;

create or replace function public.play_save_trainer_id(
  p_sprite text default null,
  p_bg text default null,
  p_frame text default null,
  p_title text default null,
  p_badges text[] default null,
  p_showcase jsonb default null,
  p_favorite_dex int default null,
  p_favorite_variant text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
  sprite text := btrim(coalesce(p_sprite, ''));
  bg text := btrim(coalesce(p_bg, ''));
  frame text := btrim(coalesce(p_frame, ''));
  title_id text := nullif(btrim(coalesce(p_title, '')), '');
  picked text[];
  pack text;
  fav_dex int := p_favorite_dex;
  fav_var text := coalesce(nullif(btrim(coalesce(p_favorite_variant, '')), ''), 'normal');
  shiny_id uuid;
  ach_id text;
  rec public.progression_titles;
  before_xp int;
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  select xp into before_xp from public.profiles where id = uid;
  perform private.evaluate_cosmetics(uid);
  if sprite <> '' then
    if not private.trainer_sprite_ok(sprite) then
      raise exception 'That trainer look is not available.';
    end if;
    pack := private.premium_sprite_pack(sprite);
    if pack is not null and not private.owns_avatar_pack(uid, pack) then
      raise exception 'Unlock this series in Premium Avatars on the Store.';
    end if;
  end if;
  if bg <> '' then
    perform private.assert_cosmetic_owned(uid, 'background', bg);
  end if;
  if frame <> '' then
    perform private.assert_cosmetic_owned(uid, 'frame', frame);
  end if;
  if title_id is not null then
    select t.* into rec
      from public.progression_titles t
      join public.trainer_titles tt on tt.title_id = t.id and tt.user_id = uid
     where t.id = title_id and t.enabled;
    if rec.id is null then
      raise exception 'That title is not unlocked yet.';
    end if;
  end if;
  if p_badges is not null then
    select coalesce(array_agg(x order by n), '{}'::text[])
      into picked
      from (
        select t.x, t.n
        from unnest(coalesce(p_badges, '{}'::text[])) with ordinality as t(x, n)
        where exists (select 1 from public.trainer_badges tb where tb.user_id = uid and tb.badge_id = t.x)
        order by t.n
        limit 3
      ) s;
  end if;
  if fav_dex is not null then
    if not exists (select 1 from public.catches c where c.user_id = uid and c.dex = fav_dex) then
      raise exception 'Favorite Pokémon must be one you have caught.';
    end if;
  end if;
  if p_showcase is not null then
    shiny_id := nullif(p_showcase->>'shinyCatchId', '')::uuid;
    ach_id := nullif(p_showcase->>'achievementId', '');
    if shiny_id is not null and not exists (
      select 1 from public.catches c where c.user_id = uid and c.id = shiny_id and c.variant like '%shiny%'
    ) then
      raise exception 'Showcase Shiny must be a Shiny Pokémon you own.';
    end if;
    if ach_id is not null and not exists (
      select 1 from public.trainer_achievements ta
      where ta.user_id = uid and ta.achievement_id = ach_id and ta.unlocked_at is not null
    ) then
      raise exception 'Showcase Achievement must be one you have completed.';
    end if;
  end if;
  update public.profiles
     set trainer_sprite = case when sprite <> '' then sprite else trainer_sprite end,
         card_bg = case when bg <> '' then bg else card_bg end,
         card_frame = case when frame <> '' then frame else card_frame end,
         active_title_id = case
           when p_title is null then active_title_id
           when title_id is null then null
           else rec.id
         end,
         trainer_title = case
           when p_title is null then trainer_title
           when title_id is null then ''
           else rec.name
         end,
         featured_badge_ids = coalesce(picked, featured_badge_ids),
         favorite_dex = case when p_favorite_dex is null and p_showcase is null then favorite_dex else fav_dex end,
         favorite_variant = case when p_favorite_dex is null and p_showcase is null then favorite_variant else case when fav_dex is null then 'normal' else fav_var end end,
         showcase = case when p_showcase is null then showcase else jsonb_build_object(
           'shinyCatchId', shiny_id,
           'achievementId', ach_id
         ) end,
         updated_at = now()
   where id = uid;
  if (select xp from public.profiles where id = uid) is distinct from before_xp then
    raise exception 'Trainer XP must not change when saving a Trainer ID.';
  end if;
  return jsonb_build_object(
    'ok', true,
    'message', 'Trainer ID saved.',
    'trainer', private.trainer_card(uid),
    'cosmetics', private.identity_cosmetics_json(uid)
  );
end;
$function$;

create or replace function public.play_equip_cosmetic(p_id text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
  rec public.progression_cosmetics;
  title_rec public.progression_titles;
  badge_rec public.progression_badges;
  asset text;
  featured text[];
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  perform private.evaluate_cosmetics(uid);
  select * into rec from public.progression_cosmetics where id = p_id and enabled;
  if rec.id is not null then
    perform private.assert_cosmetic_owned(uid, rec.kind, private.cosmetic_asset(rec.id));
    asset := private.cosmetic_asset(rec.id);
    if rec.kind = 'background' then
      update public.profiles set card_bg = asset, updated_at = now() where id = uid;
    elsif rec.kind = 'frame' then
      update public.profiles set card_frame = asset, updated_at = now() where id = uid;
    end if;
    update public.trainer_cosmetics set seen_at = coalesce(seen_at, now())
     where user_id = uid and cosmetic_id = rec.id;
    return jsonb_build_object('ok', true, 'message', rec.name || ' equipped.', 'trainer', private.trainer_card(uid));
  end if;
  select t.* into title_rec
    from public.progression_titles t
    join public.trainer_titles tt on tt.title_id = t.id and tt.user_id = uid
   where t.id = p_id and t.enabled;
  if title_rec.id is not null then
    update public.profiles
       set active_title_id = title_rec.id, trainer_title = title_rec.name, updated_at = now()
     where id = uid;
    update public.trainer_titles set seen_at = coalesce(seen_at, now())
     where user_id = uid and title_id = title_rec.id;
    return jsonb_build_object('ok', true, 'message', title_rec.name || ' equipped.', 'trainer', private.trainer_card(uid));
  end if;
  select b.* into badge_rec
    from public.progression_badges b
    join public.trainer_badges tb on tb.badge_id = b.id and tb.user_id = uid
   where b.id = p_id and b.enabled;
  if badge_rec.id is not null then
    select featured_badge_ids into featured from public.profiles where id = uid;
    if not (p_id = any (coalesce(featured, '{}'::text[]))) then
      featured := (array[p_id] || coalesce(featured, '{}'::text[]))[1:3];
      update public.profiles set featured_badge_ids = featured, updated_at = now() where id = uid;
    end if;
    update public.trainer_badges set seen_at = coalesce(seen_at, now())
     where user_id = uid and badge_id = badge_rec.id;
    return jsonb_build_object('ok', true, 'message', badge_rec.name || ' equipped.', 'trainer', private.trainer_card(uid));
  end if;
  raise exception 'That reward is not unlocked yet.';
end;
$function$;

create or replace function public.play_trainer(p_login text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  p public.profiles%rowtype;
  card jsonb;
  recent jsonb;
  mine boolean := false;
  caught_opts jsonb;
  all_catches jsonb;
  trainer uuid;
begin
  trainer := private.resolve_profile_login(p_login);
  if trainer is null then
    raise exception 'No trainer card for that login yet.';
  end if;
  select * into p from public.profiles where id = trainer;
  mine := auth.uid() is not null and auth.uid() = p.id;
  if mine then
    perform private.evaluate_cosmetics(p.id);
  end if;
  card := private.trainer_card(p.id);
  if not mine then
    card := card - 'coins' - 'watchSeconds' - 'pass' - 'nextReward' - 'candyEarned';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id, 'dex', c.dex, 'name', c.name, 'variant', c.variant,
    'gender', c.gender, 'ball', c.ball, 'caughtAt', c.caught_at
  ) order by c.caught_at desc), '[]'::jsonb)
    into recent
    from (select * from public.catches where user_id = p.id order by caught_at desc limit 24) c;
  select coalesce(jsonb_agg(jsonb_build_object('dex', d.dex, 'name', d.name, 'variant', d.variant) order by d.name, d.variant), '[]'::jsonb)
    into caught_opts
    from (select distinct dex, name, variant from public.catches where user_id = p.id) d;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id, 'dex', c.dex, 'name', c.name, 'variant', c.variant,
    'gender', c.gender, 'ball', c.ball, 'caughtAt', c.caught_at
  ) order by c.caught_at desc), '[]'::jsonb)
    into all_catches
    from public.catches c where c.user_id = p.id;
  return jsonb_build_object(
    'ok', true,
    'trainer', card,
    'recent', recent,
    'mine', mine,
    'cosmetics', case when mine then private.identity_cosmetics_json(p.id) else '[]'::jsonb end,
    'ownedAvatarPacks', case when mine then private.owned_avatar_packs_json(p.id) else '[]'::jsonb end,
    'caughtOptions', case when mine then caught_opts else '[]'::jsonb end,
    'catches', case when mine then all_catches else '[]'::jsonb end
  );
end;
$function$;

create or replace function public.admin_identity_inspect(p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not private.is_play_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_user is null then
    raise exception 'Pick a trainer.';
  end if;
  perform private.evaluate_cosmetics(p_user);
  return jsonb_build_object(
    'ok', true,
    'trainer', private.trainer_card(p_user),
    'rankingVisible', coalesce((select ranking_visible from public.profiles where id = p_user), true),
    'rankingEligible', private.ranking_eligible_uid(p_user),
    'cosmetics', private.identity_cosmetics_json(p_user),
    'ownedAvatarPacks', private.owned_avatar_packs_json(p_user),
    'titles', coalesce((
      select jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'unlocked', tt.title_id is not null, 'unlockedAt', tt.unlocked_at) order by t.sort_order)
      from public.progression_titles t
      left join public.trainer_titles tt on tt.title_id = t.id and tt.user_id = p_user
      where t.enabled
    ), '[]'::jsonb),
    'badges', coalesce((
      select jsonb_agg(jsonb_build_object('id', b.id, 'name', b.name, 'unlocked', tb.badge_id is not null, 'unlockedAt', tb.unlocked_at) order by b.sort_order)
      from public.progression_badges b
      left join public.trainer_badges tb on tb.badge_id = b.id and tb.user_id = p_user
      where b.enabled
    ), '[]'::jsonb),
    'catalog', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'kind', c.kind, 'name', c.name) order by c.sort_order)
      from public.progression_cosmetics c where c.enabled
    ), '[]'::jsonb)
  );
end;
$function$;

create or replace function public.admin_set_ranking_visible(p_user uuid, p_visible boolean, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  perform private.require_staff_edit();
  if p_user is null then
    raise exception 'Pick a trainer.';
  end if;
  update public.profiles
     set ranking_visible = coalesce(p_visible, true), updated_at = now()
   where id = p_user;
  insert into public.play_console_log (kind, message)
  values (
    'admin',
    'Staff set ranking_visible=' || coalesce(p_visible, true)::text
      || ' for ' || p_user::text
      || coalesce(' (' || p_reason || ')', '')
  );
  return public.admin_identity_inspect(p_user)
    || jsonb_build_object('message', case when coalesce(p_visible, true) then 'Trainer is listed on Rankings.' else 'Trainer hidden from public Rankings.' end);
end;
$function$;

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
  rank_eligible int := 0;
  rank_hidden int := 0;
  rank_bot_only int := 0;
  rank_dup_login int := 0;
  rank_null_xp int := 0;
  rank_status text;
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

  select count(*) filter (where private.ranking_eligible_uid(p.id))::int,
         count(*) filter (where not p.ranking_visible)::int,
         count(*) filter (
           where p.ranking_visible
             and nullif(p.username, '') is null
             and exists (
               select 1 from public.twitch_connections c
                where c.user_id = p.id and c.confirmed and c.connection_type = 'bot'
             )
             and not exists (
               select 1 from public.twitch_connections c
                where c.user_id = p.id and c.confirmed and c.connection_type in ('player', 'secondary')
             )
         )::int,
         count(*) filter (where p.xp is null)::int
    into rank_eligible, rank_hidden, rank_bot_only, rank_null_xp
    from public.profiles p;
  select count(*)::int into rank_dup_login
    from (
      select coalesce(nullif(twitch_login, ''), nullif(username, '')) as k
      from public.profiles
      where coalesce(nullif(twitch_login, ''), nullif(username, '')) is not null
      group by 1
      having count(*) > 1
    ) d;

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
  rank_status := case
    when rank_dup_login > 0 or rank_null_xp > 0 then 'WARNING'
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
    ),
    'rankings', jsonb_build_object(
      'status', rank_status,
      'eligible', rank_eligible,
      'excludedHidden', rank_hidden,
      'excludedBotOnly', rank_bot_only,
      'duplicatePublicKeys', rank_dup_login,
      'nullXp', rank_null_xp,
      'period', 'lifetime',
      'honeyMetric', 'trainer_stats.honey — Honey contributed on finished non-test encounters (prep = bait). Not inventories.bait / Store purchases.',
      'detail', format(
        'Eligible %s · hidden %s · bot-only %s · duplicate keys %s. Honey ranks contribution, not spending.',
        rank_eligible, rank_hidden, rank_bot_only, rank_dup_login
      )
    )
  );
end;
$$;

create or replace function private.phase6_rankings_selftest()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  payload jsonb;
  honey jsonb;
  pokedex jsonb;
  search_email jsonb;
  search_name jsonb;
  src text;
  trainer jsonb;
  honey_metric int;
  honey_stat int;
  honey_inv int;
  kanto_metric int;
  kanto_true int;
  sora uuid := '60ff5211-6ef8-40e6-8daa-095b5600bf4c';
  tester uuid := 'a98cbf81-a6b2-4dbf-8448-8d62f6d5f523';
  over_featured int;
  failed text := '';
begin
  payload := public.play_rankings('level', 20, 0);
  pokedex := public.play_rankings('pokedex', 20, 0);
  honey := public.play_rankings('honey', 20, 0);
  search_email := public.play_trainer_search('qa@example.com');
  search_name := public.play_trainer_search('Sora');
  src := pg_get_functiondef('public.play_rankings(text,integer,integer)'::regprocedure);

  if coalesce(payload->>'ok', '') <> 'true' then failed := failed || 'rankings not ok; '; end if;
  if payload::text ~* 'userKey|"email"|access_token' then failed := failed || 'private fields in rankings; '; end if;
  if exists (
    select 1 from jsonb_array_elements(payload->'trainers') t
    where t->>'displayName' = 'Play Tester' or t->>'login' = 'playtester'
  ) then failed := failed || 'Play Tester on public board; '; end if;
  if private.ranking_eligible_uid(tester) then failed := failed || 'tester still eligible; '; end if;
  if not private.ranking_eligible_uid(sora) then failed := failed || 'Sora not eligible; '; end if;
  if coalesce(pokedex->>'definition', '') not ilike '%Kanto%' then failed := failed || 'pokedex definition; '; end if;
  if coalesce(honey->>'definition', '') not ilike '%contributed%' then failed := failed || 'honey definition; '; end if;
  if src not ilike '%rank()%' then failed := failed || 'ties not rank(); '; end if;
  if src ilike '%inventories.bait%' then failed := failed || 'honey used inventory; '; end if;
  if src ilike '%POWER SCORE%' or src ilike '%OVERALL RANK%' or src ilike '%TRAINER RATING%' then
    failed := failed || 'composite score; ';
  end if;
  if jsonb_array_length(coalesce(search_email->'trainers', '[]'::jsonb)) <> 0 then
    failed := failed || 'email search leaked; ';
  end if;
  if jsonb_array_length(coalesce(search_name->'trainers', '[]'::jsonb)) < 1 then
    failed := failed || 'name search missed; ';
  end if;

  select (t.elem->>'metric')::int
    into honey_metric
    from jsonb_array_elements(honey->'trainers') t(elem)
    join public.profiles p on coalesce(nullif(p.twitch_login, ''), nullif(p.username, '')) = t.elem->>'login'
   where p.id = sora
   limit 1;
  select coalesce(s.honey, 0), coalesce(i.bait, 0)
    into honey_stat, honey_inv
    from public.profiles p
    left join public.trainer_stats s on s.user_id = p.id
    left join public.inventories i on i.user_id = p.id
   where p.id = sora;
  if honey_metric is not null and honey_metric is distinct from honey_stat then
    failed := failed || 'honey metric != trainer_stats.honey; ';
  end if;
  if honey_stat = honey_inv and honey_inv > 20 then
    failed := failed || 'honey looks like inventory; ';
  end if;

  select (t.elem->>'metric')::int
    into kanto_metric
    from jsonb_array_elements(pokedex->'trainers') t(elem)
    join public.profiles p on coalesce(nullif(p.twitch_login, ''), nullif(p.username, '')) = t.elem->>'login'
   where p.id = sora
   limit 1;
  select count(distinct dex)::int into kanto_true
    from public.catches where user_id = sora and dex between 1 and 151;
  if kanto_metric is not null and kanto_metric is distinct from kanto_true then
    failed := failed || 'pokedex not unique Kanto; ';
  end if;

  select count(*)::int into over_featured
    from public.profiles
   where coalesce(cardinality(featured_badge_ids), 0) > 3;
  if over_featured > 0 then failed := failed || 'featured badges > 3; '; end if;
  if pg_get_functiondef('public.play_set_badges(text[])'::regprocedure) not ilike '%limit 3%' then
    failed := failed || 'badge cap missing; ';
  end if;

  select value from jsonb_array_elements(payload->'trainers') into trainer limit 1;
  if trainer is not null and (trainer ? 'email' or trainer ? 'userKey' or trainer ? 'pass' or trainer ? 'watchSeconds') then
    failed := failed || 'row leaked private keys; ';
  end if;

  if failed <> '' then
    return jsonb_build_object('ok', false, 'failed', failed, 'payloadBoard', payload->>'board');
  end if;
  return jsonb_build_object('ok', true, 'eligible', payload->'eligible', 'levelRows', jsonb_array_length(payload->'trainers'));
end;
$function$;

grant execute on function public.play_rankings(text, int, int) to anon, authenticated;
grant execute on function public.play_trainer_search(text) to anon, authenticated;
grant execute on function public.play_set_badges(text[]) to authenticated;
grant execute on function public.play_save_trainer_id(text, text, text, text, text[], jsonb, int, text) to authenticated;
grant execute on function public.play_equip_cosmetic(text) to authenticated;
grant execute on function public.play_trainer(text) to anon, authenticated;
grant execute on function public.admin_identity_inspect(uuid) to authenticated;
grant execute on function public.admin_set_ranking_visible(uuid, boolean, text) to authenticated;
grant execute on function public.admin_game_health() to authenticated;

do $$
declare
  result jsonb;
begin
  result := private.phase6_rankings_selftest();
  if not coalesce((result->>'ok')::boolean, false) then
    raise exception 'phase6 rankings selftest failed: %', result;
  end if;
end $$;
