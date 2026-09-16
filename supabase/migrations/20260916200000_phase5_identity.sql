-- Phase 5: Trainer identity / cosmetics. Cosmetic only. Does not change XP rates,
-- capture math, Store prices, or dex milestone item grants.

alter table public.profiles
  add column if not exists card_frame text not null default 'plain',
  add column if not exists showcase jsonb not null default '{}'::jsonb;

alter table public.trainer_titles
  add column if not exists seen_at timestamptz;
alter table public.trainer_badges
  add column if not exists seen_at timestamptz;

create table if not exists public.progression_cosmetics (
  id text primary key,
  kind text not null check (kind in ('background', 'frame')),
  name text not null,
  description text not null default '',
  how_to text not null default '',
  requirement jsonb not null default '{"type":"starter"}'::jsonb,
  sort_order int not null default 0,
  enabled boolean not null default true,
  starter boolean not null default false
);

create table if not exists public.trainer_cosmetics (
  user_id uuid not null references public.profiles(id) on delete cascade,
  cosmetic_id text not null references public.progression_cosmetics(id) on delete cascade,
  source text not null default 'progress',
  unlocked_at timestamptz not null default now(),
  seen_at timestamptz,
  primary key (user_id, cosmetic_id)
);
create index if not exists trainer_cosmetics_user_idx
  on public.trainer_cosmetics (user_id, unlocked_at desc);

alter table public.progression_cosmetics enable row level security;
alter table public.trainer_cosmetics enable row level security;
drop policy if exists cosmetics_read on public.progression_cosmetics;
create policy cosmetics_read on public.progression_cosmetics for select using (enabled);
drop policy if exists trainer_cosmetics_own on public.trainer_cosmetics;
create policy trainer_cosmetics_own on public.trainer_cosmetics
  for select using ((select auth.uid()) = user_id);

grant select on public.progression_cosmetics to anon, authenticated;
grant select on public.trainer_cosmetics to authenticated;

insert into public.progression_cosmetics (id, kind, name, description, how_to, requirement, sort_order, enabled, starter)
values
  ('bg-kanto', 'background', 'Kanto', 'Trainer ID background.', 'Available to every Trainer.', '{"type":"starter"}', 10, true, true),
  ('bg-johto', 'background', 'Johto', 'Trainer ID background.', 'Available to every Trainer.', '{"type":"starter"}', 11, true, true),
  ('bg-hoenn', 'background', 'Hoenn', 'Trainer ID background.', 'Available to every Trainer.', '{"type":"starter"}', 12, true, true),
  ('bg-sinnoh', 'background', 'Sinnoh', 'Trainer ID background.', 'Available to every Trainer.', '{"type":"starter"}', 13, true, true),
  ('bg-unova', 'background', 'Unova', 'Trainer ID background.', 'Available to every Trainer.', '{"type":"starter"}', 14, true, true),
  ('bg-kalos', 'background', 'Kalos', 'Trainer ID background.', 'Available to every Trainer.', '{"type":"starter"}', 15, true, true),
  ('bg-alola', 'background', 'Alola', 'Trainer ID background.', 'Available to every Trainer.', '{"type":"starter"}', 16, true, true),
  ('bg-galar', 'background', 'Galar', 'Trainer ID background.', 'Available to every Trainer.', '{"type":"starter"}', 17, true, true),
  ('bg-hisui', 'background', 'Hisui', 'Trainer ID background.', 'Available to every Trainer.', '{"type":"starter"}', 18, true, true),
  ('bg-paldea', 'background', 'Paldea', 'Trainer ID background.', 'Available to every Trainer.', '{"type":"starter"}', 19, true, true),
  ('bg-peach', 'background', 'Peach', 'Trainer ID background.', 'Available to every Trainer.', '{"type":"starter"}', 30, true, true),
  ('bg-lilac', 'background', 'Lilac', 'Trainer ID background.', 'Available to every Trainer.', '{"type":"starter"}', 31, true, true),
  ('bg-sakura', 'background', 'Sakura', 'Trainer ID background.', 'Available to every Trainer.', '{"type":"starter"}', 32, true, true),
  ('bg-cotton', 'background', 'Cotton', 'Trainer ID background.', 'Available to every Trainer.', '{"type":"starter"}', 33, true, true),
  ('bg-ribbon', 'background', 'Ribbon', 'Trainer ID background.', 'Available to every Trainer.', '{"type":"starter"}', 34, true, true),
  ('bg-aurora', 'background', 'Aurora', 'Trainer ID background.', 'Available to every Trainer.', '{"type":"starter"}', 35, true, true),
  ('bg-pride-trans', 'background', 'Trans', 'Pride Trainer ID background.', 'Available to every Trainer.', '{"type":"starter"}', 40, true, true),
  ('bg-pride-rainbow', 'background', 'Pride', 'Pride Trainer ID background.', 'Available to every Trainer.', '{"type":"starter"}', 41, true, true),
  ('bg-pride-lesbian', 'background', 'Lesbian', 'Pride Trainer ID background.', 'Available to every Trainer.', '{"type":"starter"}', 42, true, true),
  ('bg-pride-bi', 'background', 'Bi', 'Pride Trainer ID background.', 'Available to every Trainer.', '{"type":"starter"}', 43, true, true),
  ('bg-pride-pan', 'background', 'Pan', 'Pride Trainer ID background.', 'Available to every Trainer.', '{"type":"starter"}', 44, true, true),
  ('bg-pride-nb', 'background', 'Nonbinary', 'Pride Trainer ID background.', 'Available to every Trainer.', '{"type":"starter"}', 45, true, true),
  ('bg-pride-ace', 'background', 'Ace', 'Pride Trainer ID background.', 'Available to every Trainer.', '{"type":"starter"}', 46, true, true),
  ('bg-pride-gf', 'background', 'Genderfluid', 'Pride Trainer ID background.', 'Available to every Trainer.', '{"type":"starter"}', 47, true, true),
  ('bg-pride-mlm', 'background', 'MLM', 'Pride Trainer ID background.', 'Available to every Trainer.', '{"type":"starter"}', 48, true, true),
  ('bg-pride-intersex', 'background', 'Intersex', 'Pride Trainer ID background.', 'Available to every Trainer.', '{"type":"starter"}', 49, true, true),
  ('bg-starlight', 'background', 'Starlight Sky', 'A Starlight Trainer ID background.', 'Reach Trainer Level 10.', '{"type":"level","value":10}', 80, true, false),
  ('bg-candy', 'background', 'Candy', 'A sweet Trainer ID background.', 'Reach Trainer Level 15.', '{"type":"level","value":15}', 81, true, false),
  ('frame-plain', 'frame', 'Classic Frame', 'The standard Trainer ID frame.', 'Available to every Trainer.', '{"type":"starter"}', 90, true, true),
  ('frame-bronze', 'frame', 'Bronze Frame', 'A bronze Trainer ID frame.', 'Reach Trainer Level 5.', '{"type":"level","value":5}', 91, true, false),
  ('frame-silver', 'frame', 'Silver Frame', 'A silver Trainer ID frame.', 'Reach Trainer Level 20.', '{"type":"level","value":20}', 92, true, false),
  ('frame-gold', 'frame', 'Gold Frame', 'A gold Trainer ID frame.', 'Reach Trainer Level 50.', '{"type":"level","value":50}', 93, true, false),
  ('frame-kanto', 'frame', 'Kanto Master Frame', 'A frame for completing the Kanto Pokédex.', 'Register all 151 Kanto Pokémon in your Pokédex.', '{"type":"unique_species","value":151}', 100, true, false)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  how_to = excluded.how_to,
  requirement = excluded.requirement,
  sort_order = excluded.sort_order,
  enabled = excluded.enabled,
  starter = excluded.starter;

insert into public.progression_achievements (
  id, name, description, category, requirement_type, target_value, rewards, hidden, enabled, sort_order
) values
  ('dex-25', 'Kanto Explorer', 'Register 25 Kanto Pokémon in your Pokédex.', 'pokedex', 'UNIQUE_SPECIES', 25, '{"title":"kanto-explorer","badge":"kanto-25"}'::jsonb, false, true, 4),
  ('dex-50', 'Pokédex Researcher', 'Register 50 Kanto Pokémon in your Pokédex.', 'pokedex', 'UNIQUE_SPECIES', 50, '{"title":"pokedex-researcher","badge":"kanto-50"}'::jsonb, false, true, 5),
  ('dex-75', 'Kanto Road', 'Register 75 Kanto Pokémon in your Pokédex.', 'pokedex', 'UNIQUE_SPECIES', 75, '{}'::jsonb, false, true, 6),
  ('dex-100', 'Veteran Collector', 'Register 100 Kanto Pokémon in your Pokédex.', 'pokedex', 'UNIQUE_SPECIES', 100, '{"title":"veteran-collector","badge":"kanto-100"}'::jsonb, false, true, 7),
  ('dex-125', 'Almost There', 'Register 125 Kanto Pokémon in your Pokédex.', 'pokedex', 'UNIQUE_SPECIES', 125, '{}'::jsonb, false, true, 8),
  ('dex-151', 'Kanto Master', 'Register all 151 Kanto Pokémon in your Pokédex.', 'pokedex', 'UNIQUE_SPECIES', 151, '{"title":"kanto-master","badge":"kanto-complete","cosmetic":"frame-kanto"}'::jsonb, false, true, 9)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  requirement_type = excluded.requirement_type,
  target_value = excluded.target_value,
  rewards = excluded.rewards,
  enabled = excluded.enabled,
  sort_order = excluded.sort_order;

update private.trainer_looks set group_label = case group_key
  when 'gen1' then 'Kanto Trainers'
  when 'gen2' then 'Johto Trainers'
  when 'gen3' then 'Hoenn Trainers'
  when 'gen4' then 'Sinnoh Trainers'
  when 'gen5' then 'Unova Trainers'
  when 'gen6' then 'Kalos Trainers'
  when 'gen7' then 'Alola Trainers'
  when 'gen8' then 'Galar Trainers'
  when 'gen9' then 'Paldea Trainers'
  when 'gen10' then 'Special Outfits'
  when 'lgpe' then 'Kanto Trainers'
  when 'pla' then 'Special Outfits'
  when 'ranger-fiore' then 'Special Outfits'
  when 'ranger-almia' then 'Special Outfits'
  when 'conquest' then 'Special Outfits'
  when 'go' then 'Special Outfits'
  when 'anime' then 'Special Outfits'
  when 'sonic' then 'Premium / Special'
  when 'sonic-classic' then 'Premium / Special'
  when 'digimon' then 'Premium / Special'
  else group_label
end;

create or replace function private.cosmetic_asset(p_id text)
returns text
language sql
immutable
as $function$
  select case
    when p_id like 'bg-%' then substr(p_id, 4)
    when p_id like 'frame-%' then substr(p_id, 7)
    else coalesce(p_id, '')
  end;
$function$;

create or replace function private.card_frame_ok(p_id text)
returns boolean
language sql
stable
as $function$
  select exists (
    select 1 from public.progression_cosmetics
    where kind = 'frame' and enabled and private.cosmetic_asset(id) = coalesce(p_id, '')
  );
$function$;

create or replace function private.cosmetic_requirement_met(p_uid uuid, p_req jsonb)
returns boolean
language plpgsql
stable
as $function$
declare
  kind text := lower(coalesce(p_req->>'type', 'starter'));
  n int := coalesce((p_req->>'value')::int, 0);
  xp int := 0;
begin
  if p_uid is null then
    return false;
  end if;
  if kind in ('starter', '') then
    return true;
  elsif kind = 'level' then
    select private.trainer_level(p.xp) into xp from public.profiles p where p.id = p_uid;
    return coalesce(xp, 1) >= n;
  elsif kind = 'unique_species' then
    return (select count(distinct dex) from public.catches where user_id = p_uid) >= n;
  elsif kind = 'shiny_species' then
    return (select count(distinct dex) from public.catches where user_id = p_uid and variant like '%shiny%') >= n;
  elsif kind = 'evolutions' then
    return coalesce((select evolved from public.trainer_stats where user_id = p_uid), 0) >= n;
  elsif kind = 'achievement' then
    return exists (
      select 1 from public.trainer_achievements
      where user_id = p_uid and achievement_id = p_req->>'id' and unlocked_at is not null
    );
  elsif kind = 'store' then
    return private.owns_avatar_pack(p_uid, p_req->>'id');
  elsif kind = 'admin' then
    return exists (
      select 1 from public.trainer_cosmetics tc
      where tc.user_id = p_uid and tc.cosmetic_id = p_req->>'id'
    );
  end if;
  return false;
end;
$function$;

create or replace function private.owns_cosmetic(p_uid uuid, p_id text)
returns boolean
language sql
stable
as $function$
  select exists (
    select 1 from public.trainer_cosmetics
    where user_id = p_uid and cosmetic_id = p_id
  );
$function$;

create or replace function private.unlock_cosmetic(
  p_uid uuid,
  p_id text,
  p_source text default 'progress',
  p_notice boolean default true
)
returns boolean
language plpgsql
as $function$
declare
  rec public.progression_cosmetics;
begin
  if p_uid is null or coalesce(p_id, '') = '' then
    return false;
  end if;
  select * into rec from public.progression_cosmetics where id = p_id and enabled;
  if rec.id is null then
    return false;
  end if;
  insert into public.trainer_cosmetics (user_id, cosmetic_id, source)
  values (p_uid, rec.id, coalesce(nullif(p_source, ''), 'progress'))
  on conflict do nothing;
  if not found then
    return false;
  end if;
  if p_notice and not rec.starter then
    perform private.push_notice(
      p_uid, 'unlock',
      'NEW TRAINER REWARD!',
      rec.name,
      jsonb_build_object(
        'cosmeticId', rec.id,
        'kind', rec.kind,
        'name', rec.name,
        'description', rec.description,
        'asset', private.cosmetic_asset(rec.id),
        'equip', true
      )
    );
  end if;
  return true;
end;
$function$;

create or replace function private.evaluate_cosmetics(p_uid uuid)
returns void
language plpgsql
as $function$
declare
  rec public.progression_cosmetics;
begin
  if p_uid is null then
    return;
  end if;
  for rec in select * from public.progression_cosmetics where enabled loop
    if rec.starter or private.cosmetic_requirement_met(p_uid, rec.requirement) then
      perform private.unlock_cosmetic(
        p_uid, rec.id,
        case when rec.starter then 'starter' else coalesce(rec.requirement->>'type', 'progress') end,
        not rec.starter
      );
    end if;
  end loop;
end;
$function$;

create or replace function private.grant_progress_rewards(
  p_uid uuid,
  p_rewards jsonb,
  p_notice boolean default true
)
returns void
language plpgsql
as $function$
declare
  reason text := coalesce(p_rewards->>'reason', 'LEVEL_REWARD');
begin
  if p_uid is null or p_rewards is null or p_rewards = '{}'::jsonb then return; end if;
  perform private.grant_items(
    p_uid, coalesce(p_rewards, '{}'::jsonb), reason,
    coalesce(p_rewards->>'key', p_rewards->>'idempotency'),
    coalesce(p_rewards->>'idempotency', 'prog:' || p_uid::text || ':' || coalesce(p_rewards->>'key', 'x')),
    true
  );
  if p_rewards ? 'title' then perform private.unlock_title(p_uid, p_rewards->>'title', p_notice); end if;
  if p_rewards ? 'badge' then perform private.unlock_badge(p_uid, p_rewards->>'badge', p_notice); end if;
  if p_rewards ? 'cosmetic' then
    perform private.unlock_cosmetic(p_uid, p_rewards->>'cosmetic', coalesce(p_rewards->>'key', 'reward'), p_notice);
  end if;
end;
$function$;

create or replace function private.identity_cosmetics_json(p_uid uuid)
returns jsonb
language plpgsql
stable
as $function$
declare
  equipped_bg text;
  equipped_frame text;
begin
  if p_uid is null then
    return '[]'::jsonb;
  end if;
  select
    case when private.card_bg_ok(card_bg) then card_bg else 'hoenn' end,
    case when private.card_frame_ok(card_frame) then card_frame else 'plain' end
    into equipped_bg, equipped_frame
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

create or replace function private.mastery_top_json(p_uid uuid)
returns jsonb
language sql
stable
as $function$
  select coalesce((
    select jsonb_agg(jsonb_build_object('dex', dex, 'points', points, 'rank', rank) order by points desc, dex)
    from (
      select dex, points, rank
      from public.species_mastery
      where user_id = p_uid
      order by points desc, dex
      limit 3
    ) s
  ), '[]'::jsonb);
$function$;

create or replace function private.catch_brief(p_uid uuid, p_id uuid)
returns jsonb
language sql
stable
as $function$
  select case when p_id is null then null else (
    select jsonb_build_object(
      'id', c.id, 'dex', c.dex, 'name', c.name, 'variant', c.variant,
      'gender', c.gender, 'ball', c.ball, 'caughtAt', c.caught_at
    )
    from public.catches c
    where c.user_id = p_uid and c.id = p_id
    limit 1
  ) end;
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
  return jsonb_build_object(
    'login', coalesce(nullif(p.twitch_login, ''), nullif(p.username, ''), 'trainer'),
    'displayName', coalesce(nullif(p.display_name, ''), nullif(p.username, ''), nullif(p.twitch_login, ''), 'Trainer'),
    'avatar', p.avatar_url,
    'trainerSprite', case when private.trainer_sprite_ok(p.trainer_sprite) then p.trainer_sprite else 'red-gen1' end,
    'cardBg', case when private.card_bg_ok(p.card_bg) then p.card_bg else 'hoenn' end,
    'cardFrame', case when private.card_frame_ok(p.card_frame) then p.card_frame else 'plain' end,
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

create or replace function private.assert_cosmetic_owned(p_uid uuid, p_kind text, p_asset text)
returns text
language plpgsql
as $function$
declare
  rec public.progression_cosmetics;
  asset text := btrim(coalesce(p_asset, ''));
begin
  select * into rec
    from public.progression_cosmetics
   where kind = p_kind and enabled and private.cosmetic_asset(id) = asset;
  if rec.id is null then
    raise exception 'That Trainer ID look is not available.';
  end if;
  if not private.owns_cosmetic(p_uid, rec.id) then
    if rec.starter or private.cosmetic_requirement_met(p_uid, rec.requirement) then
      perform private.unlock_cosmetic(p_uid, rec.id, coalesce(rec.requirement->>'type', 'progress'), false);
    end if;
  end if;
  if not private.owns_cosmetic(p_uid, rec.id) then
    raise exception '%', rec.how_to;
  end if;
  return rec.id;
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
  perform private.evaluate_cosmetics(uid);
  return jsonb_build_object(
    'ok', true,
    'trainer', private.trainer_card(uid),
    'stats', to_jsonb(st),
    'cosmetics', private.identity_cosmetics_json(uid),
    'ownedAvatarPacks', private.owned_avatar_packs_json(uid),
    'titles', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id, 'name', t.name, 'description', t.description, 'howTo', t.description,
        'rarity', t.rarity, 'unlocked', tt.title_id is not null,
        'isNew', tt.title_id is not null and tt.seen_at is null,
        'unlockedAt', tt.unlocked_at
      ) order by t.sort_order)
      from public.progression_titles t
      left join public.trainer_titles tt on tt.title_id = t.id and tt.user_id = uid
      where t.enabled
    ), '[]'::jsonb),
    'badges', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', b.id, 'name', b.name, 'description', b.description, 'howTo', b.description,
        'rarity', b.rarity, 'unlocked', tb.badge_id is not null,
        'featured', b.id = any (coalesce((select featured_badge_ids from public.profiles where id = uid), '{}'::text[])),
        'isNew', tb.badge_id is not null and tb.seen_at is null,
        'unlockedAt', tb.unlocked_at
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
        'unlockedAt', ta.unlocked_at,
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

create or replace function public.play_set_card_bg(p_bg text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
  bg text := btrim(coalesce(p_bg, ''));
begin
  if uid is null then
    raise exception 'Sign in to choose a card background.' using errcode = '42501';
  end if;
  perform private.evaluate_cosmetics(uid);
  perform private.assert_cosmetic_owned(uid, 'background', bg);
  update public.profiles set card_bg = bg, updated_at = now() where id = uid;
  return jsonb_build_object('ok', true, 'message', 'Card background saved.', 'trainer', private.trainer_card(uid));
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
    select coalesce(array_agg(x), '{}'::text[])
      into picked
      from (
        select unnest(coalesce(p_badges, '{}'::text[])) as x
        limit 5
      ) s
     where exists (select 1 from public.trainer_badges tb where tb.user_id = uid and tb.badge_id = s.x);
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
      featured := (array[p_id] || coalesce(featured, '{}'::text[]))[1:5];
      update public.profiles set featured_badge_ids = featured, updated_at = now() where id = uid;
    end if;
    update public.trainer_badges set seen_at = coalesce(seen_at, now())
     where user_id = uid and badge_id = badge_rec.id;
    return jsonb_build_object('ok', true, 'message', badge_rec.name || ' equipped.', 'trainer', private.trainer_card(uid));
  end if;
  raise exception 'That reward is not unlocked yet.';
end;
$function$;

create or replace function public.play_ack_cosmetics(p_ids text[] default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  update public.trainer_cosmetics
     set seen_at = coalesce(seen_at, now())
   where user_id = uid
     and (p_ids is null or cosmetic_id = any (p_ids));
  update public.trainer_titles
     set seen_at = coalesce(seen_at, now())
   where user_id = uid
     and (p_ids is null or title_id = any (p_ids));
  update public.trainer_badges
     set seen_at = coalesce(seen_at, now())
   where user_id = uid
     and (p_ids is null or badge_id = any (p_ids));
  return jsonb_build_object('ok', true);
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
  uid uuid := auth.uid();
  ranked jsonb := '[]'::jsonb;
  mine jsonb := null;
begin
  with rows as (
    select jsonb_build_object(
      'login', coalesce(nullif(p.twitch_login, ''), nullif(p.username, ''), 'trainer'),
      'displayName', coalesce(nullif(p.display_name, ''), nullif(p.username, ''), nullif(p.twitch_login, ''), 'Trainer'),
      'avatar', p.avatar_url,
      'trainerSprite', case when private.trainer_sprite_ok(p.trainer_sprite) then p.trainer_sprite else 'red-gen1' end,
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
      'evolved', coalesce((select s.evolved from public.trainer_stats s where s.user_id = p.id), 0),
      'honey', coalesce((select s.honey from public.trainer_stats s where s.user_id = p.id), 0),
      'favoriteDex', p.favorite_dex,
      'favoriteVariant', p.favorite_variant,
      'lastSeenAt', p.last_seen_at,
      'online', p.last_seen_at is not null and p.last_seen_at > now() - interval '2 minutes',
      'userKey', p.id::text
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
            when 'evolutions' then (row->>'evolved')::int
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
      select jsonb_agg((row - 'userKey') || jsonb_build_object('place', place) order by place)
      from ordered
      where place <= 80
    ), '[]'::jsonb),
    (
      select (row - 'userKey') || jsonb_build_object('place', place)
      from ordered
      where uid is not null and (row->>'userKey')::uuid = uid
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

create or replace function private.evaluate_achievements(p_uid uuid, p_grant_items boolean default true)
returns void
language plpgsql
as $function$
declare
  rec public.progression_achievements;
  prog int;
  just_unlocked boolean;
begin
  if p_uid is null then
    return;
  end if;
  for rec in select * from public.progression_achievements where enabled loop
    prog := private.achievement_progress(p_uid, rec);
    insert into public.trainer_achievements (user_id, achievement_id, progress)
    values (p_uid, rec.id, prog)
    on conflict (user_id, achievement_id) do update
      set progress = excluded.progress;
    if prog < rec.target_value then
      continue;
    end if;
    update public.trainer_achievements
       set unlocked_at = coalesce(unlocked_at, now())
     where user_id = p_uid and achievement_id = rec.id and unlocked_at is null;
    just_unlocked := found;
    if just_unlocked then
      perform private.push_notice(
        p_uid, 'achievement',
        'Achievement unlocked',
        rec.name,
        jsonb_build_object('id', rec.id, 'name', rec.name, 'description', rec.description, 'rewards', rec.rewards)
      );
    end if;
    update public.trainer_achievements
       set reward_granted_at = now()
     where user_id = p_uid and achievement_id = rec.id and reward_granted_at is null;
    if found then
      if p_grant_items then
        perform private.grant_progress_rewards(
          p_uid,
          coalesce(rec.rewards, '{}'::jsonb)
            || jsonb_build_object(
              'label', rec.name,
              'reason', 'ACHIEVEMENT_REWARD',
              'idempotency', 'ach:' || p_uid::text || ':' || rec.id,
              'key', rec.id
            ),
          false
        );
      else
        if rec.rewards ? 'title' then perform private.unlock_title(p_uid, rec.rewards->>'title', false); end if;
        if rec.rewards ? 'badge' then perform private.unlock_badge(p_uid, rec.rewards->>'badge', false); end if;
        if rec.rewards ? 'cosmetic' then perform private.unlock_cosmetic(p_uid, rec.rewards->>'cosmetic', rec.id, false); end if;
      end if;
    end if;
  end loop;
  perform private.evaluate_cosmetics(p_uid);
end;
$function$;

create or replace function private.process_level_ups(p_uid uuid, p_from int, p_to int, p_grant_items boolean default true)
returns void
language plpgsql
as $function$
declare
  rec jsonb;
  lvl int;
  key text;
begin
  if p_uid is null or coalesce(p_to, 0) <= coalesce(p_from, 0) then
    return;
  end if;
  for rec in
    select value from jsonb_array_elements(coalesce(private.progression_config()->'levelRewards', '[]'::jsonb))
  loop
    lvl := coalesce((rec->>'level')::int, 0);
    if lvl <= p_from or lvl > p_to then
      continue;
    end if;
    key := 'level:' || lvl::text;
    insert into public.trainer_milestones (user_id, key)
    values (p_uid, key)
    on conflict do nothing;
    if not found then
      continue;
    end if;
    if p_grant_items then
      perform private.grant_progress_rewards(
        p_uid,
        coalesce(rec->'grants', '{}'::jsonb)
          || jsonb_build_object(
            'title', rec->>'title',
            'badge', rec->>'badge',
            'label', coalesce(rec->>'label', 'Trainer Level ' || lvl::text),
            'reason', 'LEVEL_REWARD',
            'idempotency', 'level:' || p_uid::text || ':' || key,
            'key', key
          ),
        true
      );
    else
      if rec ? 'title' then perform private.unlock_title(p_uid, rec->>'title', false); end if;
      if rec ? 'badge' then perform private.unlock_badge(p_uid, rec->>'badge', false); end if;
    end if;
    perform private.push_notice(
      p_uid, 'level',
      'Trainer Level Up!',
      'Level ' || p_from::text || ' → ' || p_to::text,
      jsonb_build_object('from', p_from, 'to', p_to, 'level', lvl, 'reward', rec)
    );
  end loop;
  if not exists (
    select 1 from jsonb_array_elements(coalesce(private.progression_config()->'levelRewards', '[]'::jsonb)) v
    where coalesce((v.value->>'level')::int, 0) > p_from and coalesce((v.value->>'level')::int, 0) <= p_to
  ) and p_to > p_from then
    perform private.push_notice(
      p_uid, 'level',
      'Trainer Level Up!',
      'Level ' || p_from::text || ' → ' || p_to::text,
      jsonb_build_object('from', p_from, 'to', p_to)
    );
  end if;
  perform private.evaluate_cosmetics(p_uid);
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

create or replace function public.admin_grant_cosmetic(p_user uuid, p_id text, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  perform private.require_staff_edit();
  if p_user is null or coalesce(p_id, '') = '' then
    raise exception 'Pick a trainer and a cosmetic.';
  end if;
  if not private.unlock_cosmetic(p_user, p_id, 'admin:' || coalesce(auth.uid()::text, 'staff'), true) then
    if not exists (select 1 from public.progression_cosmetics where id = p_id and enabled) then
      raise exception 'That cosmetic does not exist.';
    end if;
  end if;
  insert into public.play_console_log (kind, message)
  values ('admin', 'Staff granted cosmetic ' || p_id || coalesce(' (' || p_reason || ')', ''));
  return public.admin_identity_inspect(p_user) || jsonb_build_object('message', 'Cosmetic granted.');
end;
$function$;

create or replace function public.admin_revoke_cosmetic(p_user uuid, p_id text, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  rec public.progression_cosmetics;
begin
  perform private.require_staff_edit();
  if p_user is null or coalesce(p_id, '') = '' then
    raise exception 'Pick a trainer and a cosmetic.';
  end if;
  select * into rec from public.progression_cosmetics where id = p_id;
  if rec.id is null then
    raise exception 'That cosmetic does not exist.';
  end if;
  delete from public.trainer_cosmetics where user_id = p_user and cosmetic_id = p_id;
  if rec.kind = 'background' then
    update public.profiles set card_bg = 'hoenn', updated_at = now()
     where id = p_user and card_bg = private.cosmetic_asset(p_id);
  elsif rec.kind = 'frame' then
    update public.profiles set card_frame = 'plain', updated_at = now()
     where id = p_user and card_frame = private.cosmetic_asset(p_id);
  end if;
  insert into public.play_console_log (kind, message)
  values ('admin', 'Staff revoked cosmetic ' || p_id || coalesce(' (' || p_reason || ')', ''));
  return public.admin_identity_inspect(p_user) || jsonb_build_object('message', 'Cosmetic revoked.');
end;
$function$;

create or replace function public.admin_grant_title(p_user uuid, p_title text, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  perform private.require_staff_edit();
  if p_user is null or coalesce(p_title, '') = '' then
    raise exception 'Pick a trainer and a title.';
  end if;
  if not private.unlock_title(p_user, p_title, true) then
    if not exists (select 1 from public.progression_titles where id = p_title and enabled) then
      raise exception 'That title does not exist.';
    end if;
  end if;
  insert into public.play_console_log (kind, message)
  values ('admin', 'Staff granted title ' || p_title || coalesce(' (' || p_reason || ')', ''));
  return public.admin_identity_inspect(p_user) || jsonb_build_object('message', 'Title granted.');
end;
$function$;

create or replace function public.admin_grant_badge(p_user uuid, p_badge text, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  perform private.require_staff_edit();
  if p_user is null or coalesce(p_badge, '') = '' then
    raise exception 'Pick a trainer and a badge.';
  end if;
  if not private.unlock_badge(p_user, p_badge, true) then
    if not exists (select 1 from public.progression_badges where id = p_badge and enabled) then
      raise exception 'That badge does not exist.';
    end if;
  end if;
  insert into public.play_console_log (kind, message)
  values ('admin', 'Staff granted badge ' || p_badge || coalesce(' (' || p_reason || ')', ''));
  return public.admin_identity_inspect(p_user) || jsonb_build_object('message', 'Badge granted.');
end;
$function$;

grant execute on function public.play_progression() to authenticated;
grant execute on function public.play_trainer(text) to anon, authenticated;
grant execute on function public.play_set_card_bg(text) to authenticated;
grant execute on function public.play_save_trainer_id(text, text, text, text, text[], jsonb, int, text) to authenticated;
grant execute on function public.play_equip_cosmetic(text) to authenticated;
grant execute on function public.play_ack_cosmetics(text[]) to authenticated;
grant execute on function public.play_rankings(text) to authenticated, anon;
grant execute on function public.admin_identity_inspect(uuid) to authenticated;
grant execute on function public.admin_grant_cosmetic(uuid, text, text) to authenticated;
grant execute on function public.admin_revoke_cosmetic(uuid, text, text) to authenticated;
grant execute on function public.admin_grant_title(uuid, text, text) to authenticated;
grant execute on function public.admin_grant_badge(uuid, text, text) to authenticated;

create or replace function public.phase5_identity_selftest()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  tester uuid := 'a98cbf81-a6b2-4dbf-8448-8d62f6d5f523';
  before_xp int;
  after_xp int;
  first boolean;
  second boolean;
  locked text;
  owned boolean;
begin
  if not private.is_play_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select xp into before_xp from public.profiles where id = tester;
  perform private.evaluate_cosmetics(tester);
  select xp into after_xp from public.profiles where id = tester;
  first := private.unlock_cosmetic(tester, 'frame-bronze', 'selftest', false);
  second := private.unlock_cosmetic(tester, 'frame-bronze', 'selftest', false);
  owned := private.owns_cosmetic(tester, 'frame-kanto');
  begin
    perform private.assert_cosmetic_owned(tester, 'frame', 'kanto');
    locked := 'equipped';
  exception when others then
    locked := sqlerrm;
  end;
  delete from public.trainer_cosmetics
   where user_id = tester and cosmetic_id = 'frame-bronze' and source = 'selftest';
  return jsonb_build_object(
    'ok', true,
    'passed', after_xp is not distinct from before_xp and second = false and owned = false and locked is distinct from 'equipped',
    'xpUnchanged', after_xp is not distinct from before_xp,
    'duplicateUnlockBlocked', second = false,
    'kantoFrameLocked', owned = false,
    'lockedMessage', locked,
    'firstUnlock', first
  );
end;
$function$;

grant execute on function public.phase5_identity_selftest() to authenticated;
