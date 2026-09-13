-- Admin progression tools and analytics.

create or replace function public.play_rankings()
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select public.play_rankings('level');
$$;

create or replace function public.admin_progression_overview()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not private.is_play_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'ok', true,
    'config', private.progression_config(),
    'trainers', (select count(*) from public.profiles),
    'averageLevel', (select round(avg(private.trainer_level(xp)), 1) from public.profiles),
    'medianLevel', (select percentile_cont(0.5) within group (order by private.trainer_level(xp)) from public.profiles),
    'levelBuckets', jsonb_build_object(
      '1-10', (select count(*) from public.profiles where private.trainer_level(xp) between 1 and 10),
      '11-25', (select count(*) from public.profiles where private.trainer_level(xp) between 11 and 25),
      '26-50', (select count(*) from public.profiles where private.trainer_level(xp) between 26 and 50),
      '51-100', (select count(*) from public.profiles where private.trainer_level(xp) >= 51)
    ),
    'dexDistribution', jsonb_build_object(
      '0-25', (select count(*) from public.profiles p where (select count(distinct dex) from public.catches c where c.user_id = p.id) between 0 and 25),
      '26-50', (select count(*) from public.profiles p where (select count(distinct dex) from public.catches c where c.user_id = p.id) between 26 and 50),
      '51-75', (select count(*) from public.profiles p where (select count(distinct dex) from public.catches c where c.user_id = p.id) between 51 and 75),
      '76-100', (select count(*) from public.profiles p where (select count(distinct dex) from public.catches c where c.user_id = p.id) between 76 and 100),
      '101-125', (select count(*) from public.profiles p where (select count(distinct dex) from public.catches c where c.user_id = p.id) between 101 and 125),
      '126-140', (select count(*) from public.profiles p where (select count(distinct dex) from public.catches c where c.user_id = p.id) between 126 and 140),
      '141-150', (select count(*) from public.profiles p where (select count(distinct dex) from public.catches c where c.user_id = p.id) between 141 and 150),
      '151', (select count(*) from public.profiles p where (select count(distinct dex) from public.catches c where c.user_id = p.id) = 151)
    ),
    'averageSpecies', (select round(avg(n), 1) from (
      select count(distinct dex)::numeric as n from public.catches group by user_id
    ) s),
    'averageCaptures', (select round(avg(captures), 1) from public.trainer_stats),
    'averageEncounters', (select round(avg(encounters), 1) from public.trainer_stats),
    'achievementUnlocks', coalesce((
      select jsonb_agg(jsonb_build_object('id', achievement_id, 'count', n) order by n desc)
      from (
        select achievement_id, count(*)::int as n
        from public.trainer_achievements
        where unlocked_at is not null
        group by achievement_id
        limit 12
      ) x
    ), '[]'::jsonb),
    'activeTitles', coalesce((
      select jsonb_agg(jsonb_build_object('title', trainer_title, 'count', n) order by n desc)
      from (
        select coalesce(nullif(trainer_title, ''), '(none)') as trainer_title, count(*)::int as n
        from public.profiles
        group by 1
        limit 8
      ) x
    ), '[]'::jsonb)
  );
end;
$function$;

create or replace function public.admin_progression_save(p_balance jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  next_bal jsonb;
begin
  if not private.is_play_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  next_bal := private.progression_config() || coalesce(p_balance, '{}'::jsonb);
  if coalesce((next_bal->>'xpBase')::int, 0) < 1 or coalesce((next_bal->>'maxLevel')::int, 0) < 1 then
    raise exception 'XP curve values are not valid.';
  end if;
  if coalesce((next_bal->>'levelCatchBonus')::boolean, false) then
    raise exception 'Trainer Level must not change catch chance.';
  end if;
  update public.site_config
     set game_settings = coalesce(game_settings, '{}'::jsonb)
       || jsonb_build_object('progressionBalance', next_bal),
         updated_at = now()
   where id = 1;
  return jsonb_build_object('ok', true, 'config', next_bal, 'message', 'Progression balance saved.');
end;
$function$;

create or replace function public.admin_set_xp(p_user uuid, p_xp integer)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  before_xp int;
  target int := greatest(0, coalesce(p_xp, 0));
begin
  perform private.require_staff_edit();
  if p_user is null then raise exception 'Pick a trainer.'; end if;
  select xp into before_xp from public.profiles where id = p_user for update;
  perform private.grant_xp(
    p_user, target - coalesce(before_xp, 0), 'ADMIN', 'Admin set XP',
    jsonb_build_object('idempotency', 'admin-xp:' || p_user::text || ':' || extract(epoch from now())::text)
  );
  return jsonb_build_object('ok', true, 'trainer', private.trainer_card(p_user), 'message', 'Trainer XP set.');
end;
$function$;

create or replace function public.admin_grant_achievement(p_user uuid, p_achievement text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  perform private.require_staff_edit();
  if p_user is null or coalesce(p_achievement, '') = '' then
    raise exception 'Pick a trainer and achievement.';
  end if;
  insert into public.trainer_achievements (user_id, achievement_id, progress, unlocked_at, reward_granted_at)
  select p_user, id, target_value, now(), now()
    from public.progression_achievements where id = p_achievement
  on conflict (user_id, achievement_id) do update
    set progress = excluded.progress,
        unlocked_at = coalesce(public.trainer_achievements.unlocked_at, now()),
        reward_granted_at = coalesce(public.trainer_achievements.reward_granted_at, now());
  perform private.grant_progress_rewards(
    p_user,
    coalesce((select rewards from public.progression_achievements where id = p_achievement), '{}'::jsonb)
      || jsonb_build_object('idempotency', 'admin-ach:' || p_user::text || ':' || p_achievement, 'key', p_achievement),
    true
  );
  insert into public.play_console_log (kind, message)
  values ('admin', 'Staff granted achievement ' || p_achievement);
  return jsonb_build_object('ok', true, 'message', 'Achievement granted.');
end;
$function$;

grant execute on function public.play_rankings() to authenticated;
grant execute on function public.admin_progression_overview() to authenticated;
grant execute on function public.admin_progression_save(jsonb) to authenticated;
grant execute on function public.admin_set_xp(uuid, integer) to authenticated;
grant execute on function public.admin_grant_achievement(uuid, text) to authenticated;
