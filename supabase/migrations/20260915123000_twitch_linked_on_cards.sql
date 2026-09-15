-- Mark real Twitch links on trainer cards and play_state.
-- Does not change XP, captures, or Pass eligibility.

create or replace function public.play_state()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  perform private.director_tick_if_due();
  return coalesce(private.play_snapshot(auth.uid()), '{}'::jsonb)
    || jsonb_build_object(
      'console', private.play_console_json(100),
      'twitchLinked', exists (
        select 1 from public.twitch_connections c
        where c.user_id = auth.uid()
          and c.confirmed
          and c.connection_type in ('player', 'secondary')
      )
    );
end;
$function$;

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
  st public.trainer_stats;
  linked boolean := false;
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
  select * into st from public.trainer_stats where user_id = p_uid;
  select exists (
    select 1 from public.twitch_connections c
    where c.user_id = p_uid
      and c.confirmed
      and c.connection_type in ('player', 'secondary')
  ) into linked;
  return jsonb_build_object(
    'id', p.id,
    'login', coalesce(nullif(p.twitch_login, ''), nullif(p.username, ''), 'trainer'),
    'displayName', coalesce(nullif(p.display_name, ''), nullif(p.username, ''), nullif(p.twitch_login, ''), 'Trainer'),
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
    'evolved', coalesce(st.evolved, 0),
    'tradesDone', coalesce(st.trades_done, 0),
    'speciesMastered', coalesce(st.species_mastered, 0),
    'candyEarned', coalesce(st.candy_earned, 0),
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
    'online', p.last_seen_at is not null and p.last_seen_at > now() - interval '2 minutes',
    'twitchLinked', linked
  );
end;
$function$;
