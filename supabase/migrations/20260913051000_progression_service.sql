-- Authoritative XP grants, level rewards, titles, badges, and achievement checks.

create or replace function private.unlock_title(p_uid uuid, p_title text, p_notice boolean default true)
returns boolean
language plpgsql
as $function$
declare
  rec public.progression_titles;
begin
  if p_uid is null or coalesce(p_title, '') = '' then
    return false;
  end if;
  select * into rec from public.progression_titles where id = p_title and enabled;
  if rec.id is null then
    return false;
  end if;
  insert into public.trainer_titles (user_id, title_id)
  values (p_uid, rec.id)
  on conflict do nothing;
  if not found then
    return false;
  end if;
  update public.profiles
     set trainer_title = case when coalesce(trainer_title, '') = '' then rec.name else trainer_title end,
         active_title_id = coalesce(active_title_id, rec.id),
         updated_at = now()
   where id = p_uid;
  if p_notice then
    perform private.push_notice(p_uid, 'title', 'Title unlocked', rec.name,
      jsonb_build_object('titleId', rec.id, 'name', rec.name));
  end if;
  return true;
end;
$function$;

create or replace function private.unlock_badge(p_uid uuid, p_badge text, p_notice boolean default true)
returns boolean
language plpgsql
as $function$
declare
  rec public.progression_badges;
begin
  if p_uid is null or coalesce(p_badge, '') = '' then
    return false;
  end if;
  select * into rec from public.progression_badges where id = p_badge and enabled;
  if rec.id is null then
    return false;
  end if;
  insert into public.trainer_badges (user_id, badge_id)
  values (p_uid, rec.id)
  on conflict do nothing;
  if not found then
    return false;
  end if;
  if p_notice then
    perform private.push_notice(p_uid, 'badge', 'Badge unlocked', rec.name,
      jsonb_build_object('badgeId', rec.id, 'name', rec.name));
  end if;
  return true;
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
begin
  if p_uid is null or p_rewards is null or p_rewards = '{}'::jsonb then
    return;
  end if;
  if p_rewards ? 'coins' and coalesce((p_rewards->>'coins')::int, 0) <> 0 then
    perform private.adjust_coins(
      p_uid, (p_rewards->>'coins')::int, 'EVENT_REWARD', coalesce(p_rewards->>'label', 'Progression reward'),
      jsonb_build_object('idempotency', coalesce(p_rewards->>'idempotency', 'prog:' || p_uid::text || ':' || coalesce(p_rewards->>'key', 'x')))
    );
  end if;
  perform private.grant_known(p_uid, coalesce(p_rewards, '{}'::jsonb) - 'coins' - 'title' - 'badge' - 'label' - 'idempotency' - 'key');
  if p_rewards ? 'title' then
    perform private.unlock_title(p_uid, p_rewards->>'title', p_notice);
  end if;
  if p_rewards ? 'badge' then
    perform private.unlock_badge(p_uid, p_rewards->>'badge', p_notice);
  end if;
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
end;
$function$;

create or replace function private.grant_xp(
  p_uid uuid,
  p_amount int,
  p_type text,
  p_reason text default null,
  p_meta jsonb default '{}'::jsonb
)
returns int
language plpgsql
as $function$
declare
  before_xp int;
  after_xp int;
  before_lvl int;
  after_lvl int;
  idem text := nullif(p_meta->>'idempotency', '');
  prior int;
begin
  if p_uid is null or coalesce(p_amount, 0) = 0 then
    select xp into before_xp from public.profiles where id = p_uid;
    return coalesce(before_xp, 0);
  end if;
  if idem is not null then
    select xp_after into prior from public.xp_ledger where user_id = p_uid and idempotency = idem;
    if found then
      return prior;
    end if;
  end if;
  select xp into before_xp from public.profiles where id = p_uid for update;
  if not found then
    return 0;
  end if;
  before_lvl := private.trainer_level(before_xp);
  after_xp := greatest(0, before_xp + p_amount);
  update public.profiles
     set xp = after_xp, last_seen_at = now(), updated_at = now()
   where id = p_uid;
  insert into public.xp_ledger (user_id, amount, type, reason, idempotency, related_round, xp_before, xp_after)
  values (
    p_uid, p_amount, coalesce(p_type, 'XP'), p_reason, idem,
    nullif(p_meta->>'relatedRound', '')::uuid, before_xp, after_xp
  );
  after_lvl := private.trainer_level(after_xp);
  if after_lvl > before_lvl then
    perform private.process_level_ups(p_uid, before_lvl, after_lvl, true);
  end if;
  return after_xp;
end;
$function$;

create or replace function private.award_xp(p_uid uuid, p_amount int)
returns void
language plpgsql
as $function$
begin
  perform private.grant_xp(p_uid, p_amount, 'WATCH', 'Live watch time', '{}'::jsonb);
end;
$function$;

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
              'idempotency', 'ach:' || p_uid::text || ':' || rec.id,
              'key', rec.id
            ),
          false
        );
      else
        if rec.rewards ? 'title' then perform private.unlock_title(p_uid, rec.rewards->>'title', false); end if;
        if rec.rewards ? 'badge' then perform private.unlock_badge(p_uid, rec.rewards->>'badge', false); end if;
      end if;
    end if;
  end loop;
end;
$function$;

create or replace function private.collection_variant_stats(p_uid uuid)
returns jsonb
language sql
stable
as $function$
  select jsonb_build_object(
    'speciesCaught', (select count(distinct dex) from public.catches where user_id = p_uid),
    'speciesSeen', (select count(*) from public.species_seen where user_id = p_uid),
    'shinySpecies', (select count(distinct dex) from public.catches where user_id = p_uid and variant like '%shiny%'),
    'shinyEligible', 151,
    'femaleVariants', (
      select count(distinct dex) from public.catches
       where user_id = p_uid
         and (variant like '%female%' or gender = 'Female')
         and dex = any (private.female_visual_dex())
    ),
    'femaleEligible', coalesce(cardinality(private.female_visual_dex()), 0),
    'shinyFemale', (
      select count(distinct dex) from public.catches
       where user_id = p_uid and variant like '%shiny%' and variant like '%female%'
         and dex = any (private.female_visual_dex())
    ),
    'kantoCaught', (select count(distinct dex) from public.catches where user_id = p_uid and dex between 1 and 151),
    'kantoTotal', 151
  );
$function$;
