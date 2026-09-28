-- Public Trainer ID journal: expose privacy-safe earned achievements to anon visitors.
-- Also enrich recent catches with nickname / met location for Catch History copy.

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
  journal_achievements jsonb;
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
    'id', c.id,
    'dex', c.dex,
    'name', c.name,
    'nickname', c.nickname,
    'variant', c.variant,
    'gender', c.gender,
    'ball', c.ball,
    'caughtAt', c.caught_at,
    'metLocation', c.met_location,
    'formId', c.pokemon_form_id
  ) order by c.caught_at desc), '[]'::jsonb)
    into recent
    from (select * from public.catches where user_id = p.id order by caught_at desc limit 24) c;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', a.id,
    'name', a.name,
    'description', a.description,
    'unlockedAt', ta.unlocked_at,
    'category', a.category
  ) order by ta.unlocked_at desc), '[]'::jsonb)
    into journal_achievements
    from public.trainer_achievements ta
    join public.progression_achievements a on a.id = ta.achievement_id
   where ta.user_id = p.id
     and ta.unlocked_at is not null
     and coalesce(a.hidden, false) = false
     and coalesce(a.enabled, true) = true;

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
    'journalAchievements', coalesce(journal_achievements, '[]'::jsonb),
    'mine', mine,
    'cosmetics', case when mine then private.identity_cosmetics_json(p.id) else '[]'::jsonb end,
    'ownedAvatarPacks', case when mine then private.owned_avatar_packs_json(p.id) else '[]'::jsonb end,
    'caughtOptions', case when mine then caught_opts else '[]'::jsonb end,
    'catches', case when mine then all_catches else '[]'::jsonb end
  );
end;
$function$;

grant execute on function public.play_trainer(text) to anon, authenticated;
