-- Rankings: include site-account trainers, expose own place, and mark real Twitch links.
-- Does not change XP, catch counts, or leaderboard scoring formulas.

create or replace function public.play_rankings(p_board text default 'level')
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  board text := lower(coalesce(p_board, 'level'));
  uid uuid := auth.uid();
  ranked jsonb := '[]'::jsonb;
  mine jsonb := null;
begin
  with rows as (
    select jsonb_build_object(
      'userId', p.id,
      'login', coalesce(nullif(p.twitch_login, ''), nullif(p.username, ''), 'trainer'),
      'displayName', coalesce(nullif(p.display_name, ''), nullif(p.username, ''), nullif(p.twitch_login, ''), 'Trainer'),
      'avatar', p.avatar_url,
      'twitchLinked', exists (
        select 1 from public.twitch_connections c
        where c.user_id = p.id and c.confirmed and c.connection_type in ('player', 'secondary')
      ),
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
    where coalesce(nullif(p.twitch_login, ''), nullif(p.username, '')) is not null
  ),
  ordered as (
    select
      row,
      row_number() over (
        order by
          case board
            when 'pokedex' then (row->>'species')::int
            when 'shinies' then (row->>'shinies')::int
            when 'catches' then (row->>'captures')::int
            when 'honey' then (row->>'honey')::int
            else (row->>'xp')::int
          end desc,
          (row->>'caught')::int desc,
          (row->>'login')
      ) as place
    from rows
  )
  select
    coalesce((
      select jsonb_agg(row || jsonb_build_object('place', place) order by place)
      from ordered
      where place <= 80
    ), '[]'::jsonb),
    (
      select row || jsonb_build_object('place', place)
      from ordered
      where uid is not null and (row->>'userId')::uuid = uid
      limit 1
    )
  into ranked, mine;

  return jsonb_build_object(
    'ok', true,
    'board', board,
    'trainers', ranked,
    'me', mine
  );
end;
$function$;

grant execute on function public.play_rankings(text) to authenticated, anon;
