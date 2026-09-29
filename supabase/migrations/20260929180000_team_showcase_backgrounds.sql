-- Team Showcase backgrounds (cosmetic). Additive only.
-- Default unlocked ST★RLIGHT originals; curated location art cataloged (locked until unlock rules approved).

alter table public.profiles
  add column if not exists team_bg text;

comment on column public.profiles.team_bg is
  'Equipped Team Showcase background asset id (cosmetic). Null/invalid falls back to starlight-gradient.';

alter table public.progression_cosmetics
  drop constraint if exists progression_cosmetics_kind_check;

alter table public.progression_cosmetics
  add constraint progression_cosmetics_kind_check
  check (kind = any (array['background'::text, 'frame'::text, 'team_background'::text]));

create or replace function private.cosmetic_asset(p_id text)
returns text
language sql
immutable
as $function$
  select case
    when p_id like 'team-bg-%' then substr(p_id, 9)
    when p_id like 'bg-%' then substr(p_id, 4)
    when p_id like 'frame-%' then substr(p_id, 7)
    else coalesce(p_id, '')
  end;
$function$;

create or replace function private.team_bg_ok(p_id text)
returns boolean
language sql
stable
as $function$
  select exists (
    select 1 from public.progression_cosmetics
    where kind = 'team_background'
      and enabled
      and private.cosmetic_asset(id) = coalesce(p_id, '')
  );
$function$;

insert into public.progression_cosmetics (id, kind, name, description, how_to, requirement, sort_order, enabled, starter)
values
  ('team-bg-starlight-gradient', 'team_background', 'ST★RLIGHT Gradient', 'A soft Starlight gradient for My Team.', 'Available to every Trainer.', '{"type":"starter"}', 200, true, true),
  ('team-bg-pokedex-grid', 'team_background', 'Pokédex Grid', 'A research-grid backdrop for My Team.', 'Available to every Trainer.', '{"type":"starter"}', 201, true, true),
  ('team-bg-research-lab', 'team_background', 'Research Lab', 'A calm lab-inspired Team Showcase.', 'Available to every Trainer.', '{"type":"starter"}', 202, true, true),
  ('team-bg-battle-stage', 'team_background', 'Battle Stage', 'A spotlight battle stage for My Team.', 'Available to every Trainer.', '{"type":"starter"}', 203, true, true),
  ('team-bg-pallet-town', 'team_background', 'Pallet Town', 'Hometown roads behind your party.', 'Coming soon — unlocks through future Trainer rewards.', '{"type":"admin"}', 220, true, false),
  ('team-bg-viridian-forest', 'team_background', 'Viridian Forest', 'Leafy forest light for My Team.', 'Coming soon — unlocks through future Trainer rewards.', '{"type":"admin"}', 221, true, false),
  ('team-bg-route-1', 'team_background', 'Route 1', 'A classic route backdrop.', 'Coming soon — unlocks through future Trainer rewards.', '{"type":"admin"}', 222, true, false),
  ('team-bg-mt-moon', 'team_background', 'Mt. Moon', 'Moonlit cavern mood for My Team.', 'Coming soon — unlocks through future Trainer rewards.', '{"type":"admin"}', 223, true, false),
  ('team-bg-cerulean-cave', 'team_background', 'Cerulean Cave', 'Deep-cave drama for My Team.', 'Coming soon — unlocks through future Trainer rewards.', '{"type":"admin"}', 224, true, false),
  ('team-bg-saffron-city', 'team_background', 'Saffron City', 'City nightlights behind your party.', 'Coming soon — unlocks through future Trainer rewards.', '{"type":"admin"}', 225, true, false),
  ('team-bg-cinnabar-lab', 'team_background', 'Cinnabar Lab', 'Volcanic lab glow for My Team.', 'Coming soon — unlocks through future Trainer rewards.', '{"type":"admin"}', 226, true, false),
  ('team-bg-safari-zone', 'team_background', 'Safari Zone', 'Wild-zone atmosphere for My Team.', 'Coming soon — unlocks through future Trainer rewards.', '{"type":"admin"}', 227, true, false),
  ('team-bg-power-plant', 'team_background', 'Power Plant', 'Electric industrial backdrop.', 'Coming soon — unlocks through future Trainer rewards.', '{"type":"admin"}', 228, true, false),
  ('team-bg-victory-road', 'team_background', 'Victory Road', 'Championship approach backdrop.', 'Coming soon — unlocks through future Trainer rewards.', '{"type":"admin"}', 229, true, false)
on conflict (id) do update
  set kind = excluded.kind,
      name = excluded.name,
      description = excluded.description,
      how_to = excluded.how_to,
      requirement = excluded.requirement,
      sort_order = excluded.sort_order,
      enabled = excluded.enabled,
      starter = excluded.starter;

-- Backfill starter team backgrounds for existing Trainers (no notices).
insert into public.trainer_cosmetics (user_id, cosmetic_id, source)
select p.id, c.id, 'starter'
  from public.profiles p
  cross join public.progression_cosmetics c
 where c.kind = 'team_background'
   and c.starter
   and c.enabled
on conflict do nothing;

update public.profiles
   set team_bg = coalesce(nullif(team_bg, ''), 'starlight-gradient')
 where team_bg is null or team_bg = '';

create or replace function private.identity_cosmetics_json(p_uid uuid)
returns jsonb
language plpgsql
stable
as $function$
declare
  equipped_bg text;
  equipped_frame text;
  equipped_team_bg text;
begin
  if p_uid is null then
    return '[]'::jsonb;
  end if;
  select
    case when private.card_bg_ok(card_bg) then card_bg else 'hoenn' end,
    case when private.card_frame_ok(card_frame) then card_frame else 'plain' end,
    case when private.team_bg_ok(coalesce(nullif(team_bg, ''), 'starlight-gradient'))
      then coalesce(nullif(team_bg, ''), 'starlight-gradient')
      else 'starlight-gradient'
    end
    into equipped_bg, equipped_frame, equipped_team_bg
    from public.profiles where id = p_uid;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', c.id,
      'kind', c.kind,
      'name', c.name,
      'description', c.description,
      'howTo', c.how_to,
      'asset', private.cosmetic_asset(c.id),
      'starter', c.starter,
      'unlocked', tc.cosmetic_id is not null,
      'equipped', case
        when c.kind = 'background' then private.cosmetic_asset(c.id) = equipped_bg
        when c.kind = 'frame' then private.cosmetic_asset(c.id) = equipped_frame
        when c.kind = 'team_background' then private.cosmetic_asset(c.id) = equipped_team_bg
        else false
      end,
      'isNew', tc.cosmetic_id is not null and tc.seen_at is null and not c.starter,
      'unlockedAt', tc.unlocked_at,
      'source', tc.source
    ) order by c.sort_order)
    from public.progression_cosmetics c
    left join public.trainer_cosmetics tc
      on tc.cosmetic_id = c.id and tc.user_id = p_uid
    where c.enabled
  ), '[]'::jsonb);
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
  shiny_total int := 0;
  variants jsonb;
  title_name text;
  badges jsonb;
  next_reward jsonb;
  st public.trainer_stats;
  linked boolean := false;
  showcase jsonb;
  team_bg_id text;
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
  select count(*)::int into shiny_total from public.catches where user_id = p_uid and variant like '%shiny%';
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
  showcase := jsonb_build_object(
    'favoriteDex', p.favorite_dex,
    'favoriteVariant', coalesce(p.favorite_variant, 'normal'),
    'shinyCatch', private.catch_brief(p_uid, nullif(p.showcase->>'shinyCatchId', '')::uuid),
    'achievementId', nullif(p.showcase->>'achievementId', ''),
    'achievementName', (
      select a.name from public.progression_achievements a
      join public.trainer_achievements ta on ta.achievement_id = a.id and ta.user_id = p_uid
      where a.id = nullif(p.showcase->>'achievementId', '') and ta.unlocked_at is not null
    )
  );
  team_bg_id := coalesce(nullif(p.team_bg, ''), 'starlight-gradient');
  if not private.team_bg_ok(team_bg_id) then
    team_bg_id := 'starlight-gradient';
  end if;
  return jsonb_build_object(
    'login', coalesce(nullif(p.twitch_login, ''), nullif(p.username, ''), 'trainer'),
    'displayName', coalesce(nullif(p.display_name, ''), nullif(p.username, ''), nullif(p.twitch_login, ''), 'Trainer'),
    'avatar', p.avatar_url,
    'trainerSprite', case when private.trainer_sprite_ok(p.trainer_sprite) then p.trainer_sprite else 'red-gen1' end,
    'cardBg', case when private.card_bg_ok(p.card_bg) then p.card_bg else 'hoenn' end,
    'cardFrame', case when private.card_frame_ok(p.card_frame) then p.card_frame else 'plain' end,
    'teamBg', team_bg_id,
    'idNo', 10000 + (abs(hashtext(p.id::text)) % 90000),
    'startedAt', p.created_at,
    'coins', coalesce(coins, 0),
    'level', (prog->>'level')::int,
    'xp', (prog->>'xp')::int,
    'xpInto', (prog->>'xpInto')::int,
    'xpNeed', (prog->>'xpNeed')::int,
    'xpToNext', greatest(0, (prog->>'xpNeed')::int - (prog->>'xpInto')::int),
    'nextReward', next_reward,
    'watchSeconds', p.watch_seconds,
    'caught', coalesce(caught, 0),
    'species', coalesce(species, 0),
    'seen', coalesce(seen, 0),
    'shinyCaught', coalesce(shiny_total, 0),
    'evolved', coalesce(st.evolved, 0),
    'tradesDone', coalesce(st.trades_done, 0),
    'speciesMastered', coalesce(st.species_mastered, 0),
    'candyEarned', coalesce(st.candy_earned, 0),
    'masteryTop', private.mastery_top_json(p_uid),
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
    'showcase', showcase,
    'title', title_name,
    'activeTitleId', p.active_title_id,
    'featuredBadgeIds', coalesce(to_jsonb(p.featured_badge_ids), '[]'::jsonb),
    'badges', coalesce(badges, '[]'::jsonb),
    'team', private.team_mons(p_uid),
    'lastSeenAt', p.last_seen_at,
    'online', p.last_seen_at is not null and p.last_seen_at > now() - interval '2 minutes',
    'twitchLinked', linked
  );
end;
$function$;

drop function if exists public.play_save_trainer_id(text, text, text, text, text[], jsonb, int, text);

create or replace function public.play_save_trainer_id(
  p_sprite text default null,
  p_bg text default null,
  p_frame text default null,
  p_title text default null,
  p_badges text[] default null,
  p_showcase jsonb default null,
  p_favorite_dex integer default null,
  p_favorite_variant text default null,
  p_team_bg text default null
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
  v_team_bg text := btrim(coalesce(p_team_bg, ''));
  v_title_id text := nullif(btrim(coalesce(p_title, '')), '');
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
  if v_team_bg <> '' then
    perform private.assert_cosmetic_owned(uid, 'team_background', v_team_bg);
  end if;
  if v_title_id is not null then
    select t.* into rec
      from public.progression_titles t
      join public.trainer_titles tt on tt.title_id = t.id and tt.user_id = uid
     where t.id = v_title_id and t.enabled;
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
         team_bg = case when v_team_bg <> '' then v_team_bg else team_bg end,
         active_title_id = case
           when p_title is null then active_title_id
           when v_title_id is null then null
           else rec.id
         end,
         trainer_title = case
           when p_title is null then trainer_title
           when v_title_id is null then ''
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

grant execute on function public.play_save_trainer_id(text, text, text, text, text[], jsonb, int, text, text) to authenticated;
