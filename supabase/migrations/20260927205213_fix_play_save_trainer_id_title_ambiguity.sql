-- Fix ambiguous title_id in play_save_trainer_id.
-- Local PL/pgSQL variable title_id shadowed trainer_titles.title_id in the JOIN/WHERE.

create or replace function public.play_save_trainer_id(
  p_sprite text default null,
  p_bg text default null,
  p_frame text default null,
  p_title text default null,
  p_badges text[] default null,
  p_showcase jsonb default null,
  p_favorite_dex integer default null,
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

grant execute on function public.play_save_trainer_id(text, text, text, text, text[], jsonb, int, text) to authenticated;
