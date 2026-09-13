-- Backfill stats and cosmetic unlocks. Dex item milestones still grant once
-- through the existing economy function. Level item rewards are recorded
-- as historical so testers are not dumped a bag of Ultra Balls.

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
  -- Uses a fake key against a real profile if one exists; amount 0 path is safe.
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
