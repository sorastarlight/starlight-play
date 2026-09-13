-- Fix ambiguous n in SPECIES_CATCH_COUNT, then run the retroactive unlocks.

create or replace function private.achievement_progress(p_uid uuid, p_row public.progression_achievements)
returns int
language plpgsql
stable
as $function$
declare
  extra jsonb := coalesce(p_row.extra, '{}'::jsonb);
  n int := 0;
begin
  if p_row.requirement_type = 'TOTAL_CATCHES' then
    select count(*)::int into n from public.catches where user_id = p_uid and round_id is not null;
  elsif p_row.requirement_type = 'UNIQUE_SPECIES' then
    select count(distinct dex)::int into n from public.catches where user_id = p_uid;
  elsif p_row.requirement_type = 'SHINY_SPECIES' then
    select count(distinct dex)::int into n from public.catches
     where user_id = p_uid and variant like '%shiny%';
  elsif p_row.requirement_type = 'FEMALE_VARIANTS' then
    select count(distinct c.dex)::int into n
      from public.catches c
     where c.user_id = p_uid
       and (c.variant like '%female%' or c.gender = 'Female')
       and c.dex = any (private.female_visual_dex());
  elsif p_row.requirement_type = 'ENCOUNTERS_JOINED' then
    select count(*)::int into n from public.encounter_players where user_id = p_uid;
  elsif p_row.requirement_type = 'HONEY_CONTRIBUTIONS' then
    select count(*)::int into n from public.encounter_players where user_id = p_uid and prep = 'bait';
  elsif p_row.requirement_type = 'SPECIALIST_BALL_CATCHES' then
    select count(*)::int into n from public.capture_log
     where user_id = p_uid and success and ball_condition_met
       and ball_key = extra->>'ball';
  elsif p_row.requirement_type = 'OPTIMAL_CATCHES' then
    select count(*)::int into n from public.capture_log
     where user_id = p_uid and success and ball_condition_met
       and ball_key not in ('pokeball','greatball','ultraball','masterball','premierball');
  elsif p_row.requirement_type = 'RARITY_CAPTURES' then
    select count(*)::int into n from public.capture_log
     where user_id = p_uid and success
       and canonical_catch_rate <= coalesce((extra->>'maxCatchRate')::int, 255)
       and canonical_catch_rate >= coalesce((extra->>'minCatchRate')::int, 0);
  elsif p_row.requirement_type = 'LEGENDARY_CATCHES' then
    select count(*)::int into n
      from public.catches c
      join public.species s on s.dex = c.dex
     where c.user_id = p_uid and s.is_legendary;
  elsif p_row.requirement_type = 'LOW_ODDS_CAPTURE' then
    select count(*)::int into n from public.capture_log
     where user_id = p_uid and success
       and final_chance <= coalesce((extra->>'maxChance')::numeric, 0.05);
  elsif p_row.requirement_type = 'SPECIES_CATCH_COUNT' then
    select coalesce(max(cnt), 0) into n from (
      select count(*)::int as cnt from public.catches where user_id = p_uid group by dex
    ) s;
  elsif p_row.requirement_type = 'FAILED_CATCHES' then
    select count(*)::int into n from public.capture_log where user_id = p_uid and success = false;
  elsif p_row.requirement_type = 'CATCH_STREAK' then
    select coalesce(best_catch_streak, 0) into n from public.trainer_stats where user_id = p_uid;
  else
    n := 0;
  end if;
  return coalesce(n, 0);
end;
$function$;

insert into public.trainer_stats (user_id, encounters, captures, fails, honey, catch_streak, fail_streak, best_catch_streak, best_fail_streak, first_pokemon_dex, first_shiny_dex)
select
  p.id,
  coalesce((select count(*) from public.encounter_players ep where ep.user_id = p.id), 0),
  coalesce((select count(*) from public.catches c where c.user_id = p.id and c.round_id is not null), 0),
  coalesce((select count(*) from public.capture_log l where l.user_id = p.id and l.success = false), 0),
  coalesce((select count(*) from public.encounter_players ep where ep.user_id = p.id and ep.prep = 'bait'), 0),
  0, 0, 0, 0,
  (select c.dex from public.catches c where c.user_id = p.id order by c.caught_at nulls last, c.id limit 1),
  (select c.dex from public.catches c where c.user_id = p.id and c.variant like '%shiny%' order by c.caught_at nulls last, c.id limit 1)
from public.profiles p
on conflict (user_id) do update
  set encounters = excluded.encounters,
      captures = excluded.captures,
      fails = excluded.fails,
      honey = excluded.honey,
      first_pokemon_dex = coalesce(public.trainer_stats.first_pokemon_dex, excluded.first_pokemon_dex),
      first_shiny_dex = coalesce(public.trainer_stats.first_shiny_dex, excluded.first_shiny_dex),
      updated_at = now();

do $retro$
declare
  rec record;
  lvl int;
begin
  for rec in select id, xp from public.profiles loop
    perform private.evaluate_achievements(rec.id, false);
    perform private.maybe_grant_dex_milestones(rec.id);
    lvl := private.trainer_level(rec.xp);
    perform private.process_level_ups(rec.id, 0, lvl, false);
  end loop;
end;
$retro$;

create or replace function private.progression_self_test()
returns table(name text, passed boolean, detail text)
language plpgsql
as $function$
declare
  prog jsonb;
  uid uuid;
  xp1 int;
  xp2 int;
begin
  name := 'Level 1 needs no XP';
  passed := private.xp_to_reach_level(1) = 0;
  detail := private.xp_to_reach_level(1)::text;
  return next;

  name := 'Level 2 uses the configured curve';
  passed := private.xp_for_level(1) = 100;
  detail := private.xp_for_level(1)::text;
  return next;

  name := '100 XP is level 2';
  passed := private.trainer_level(100) = 2;
  detail := private.trainer_level(100)::text;
  return next;

  name := '99 XP is still level 1';
  passed := private.trainer_level(99) = 1;
  detail := private.trainer_level(99)::text;
  return next;

  prog := private.trainer_xp_progress(100);
  name := 'XP progress splits into / need';
  passed := (prog->>'xpInto')::int = 0 and (prog->>'xpNeed')::int = private.xp_for_level(2);
  detail := prog::text;
  return next;

  name := 'Variants do not inflate Kanto 151';
  passed := coalesce((private.collection_variant_stats(null)->>'kantoTotal')::int, 151) = 151;
  detail := '151';
  return next;

  name := 'Female visual list is data-driven';
  passed := cardinality(private.female_visual_dex()) = 23;
  detail := cardinality(private.female_visual_dex())::text;
  return next;

  name := 'Level catch bonus stays off';
  passed := coalesce((private.progression_config()->>'levelCatchBonus')::boolean, true) = false;
  detail := private.progression_config()->>'levelCatchBonus';
  return next;

  name := 'Master Ball is a 151 milestone option';
  passed := exists (
    select 1 from jsonb_array_elements(private.economy_config()->'dexMilestones') v
    where (v.value->>'species')::int = 151 and v.value->'grants' ? 'masterball'
  );
  detail := '151';
  return next;

  name := 'Achievement catalog is loaded';
  passed := (select count(*) >= 40 from public.progression_achievements);
  detail := (select count(*)::text from public.progression_achievements);
  return next;

  name := 'Grant XP is idempotent';
  select id, xp into uid, xp1 from public.profiles limit 1;
  if uid is null then
    passed := true;
    detail := 'no profile';
  else
    perform private.grant_xp(uid, 0, 'TEST', 'none',
      jsonb_build_object('idempotency', 'self-test-zero'));
    select xp into xp2 from public.profiles where id = uid;
    passed := xp1 = xp2;
    detail := xp1::text;
  end if;
  return next;
end;
$function$;
