-- Wire encounter XP, remapped levels, trainer card, Pokédex variants, and player RPCs.

create or replace function private.old_sqrt_level(p_xp int)
returns int
language sql
immutable
as $$
  select greatest(1, least(50, 1 + floor(sqrt(greatest(coalesce(p_xp, 0), 0) / 25.0))::int));
$$;

update public.profiles p
   set xp = private.xp_to_reach_level(lvl) + floor(frac * private.xp_for_level(lvl))::int,
       updated_at = now()
  from (
    select id,
           private.old_sqrt_level(xp) as lvl,
           least(1.0, greatest(0.0,
             (xp - (25 * (private.old_sqrt_level(xp) - 1) * (private.old_sqrt_level(xp) - 1)))::numeric
             / greatest(1, 25 * (2 * private.old_sqrt_level(xp) - 1))
           )) as frac
      from public.profiles
  ) s
 where p.id = s.id;

create or replace function private.after_join_xp()
returns trigger
language plpgsql
as $function$
begin
  perform private.ensure_inventory(new.user_id);
  perform private.ensure_trainer_stats(new.user_id);
  return new;
end;
$function$;

create or replace function private.after_catch_xp()
returns trigger
language plpgsql
as $function$
declare
  cfg jsonb := private.progression_config();
  first_species boolean;
  first_female boolean;
  first_shiny boolean;
  catch_rate int;
  pay int;
begin
  perform private.ensure_inventory(new.user_id);
  perform private.ensure_trainer_stats(new.user_id);
  perform private.grant_xp(
    new.user_id, coalesce((cfg->>'catchXp')::int, 10), 'CAPTURE', 'Successful catch',
    jsonb_build_object('idempotency', 'xp-catch:' || new.id::text)
  );

  select not exists (
    select 1 from public.catches where user_id = new.user_id and dex = new.dex and id <> new.id
  ) into first_species;
  if first_species then
    perform private.grant_xp(
      new.user_id, coalesce((cfg->>'newDexXp')::int, 25), 'NEW_DEX', 'New Pokédex species',
      jsonb_build_object('idempotency', 'xp-dex:' || new.user_id::text || ':' || new.dex::text)
    );
    update public.trainer_stats
       set first_pokemon_dex = coalesce(first_pokemon_dex, new.dex), updated_at = now()
     where user_id = new.user_id;
  end if;

  if new.gender = 'Female' and new.dex = any (private.female_visual_dex()) then
    select not exists (
      select 1 from public.catches
       where user_id = new.user_id and dex = new.dex and id <> new.id
         and (gender = 'Female' or variant like '%female%')
    ) into first_female;
    if first_female then
      perform private.grant_xp(
        new.user_id, coalesce((cfg->>'firstFemaleXp')::int, 5), 'FIRST_FEMALE', 'First female variant',
        jsonb_build_object('idempotency', 'xp-female:' || new.user_id::text || ':' || new.dex::text)
      );
    end if;
  end if;

  if new.variant like '%shiny%' then
    select not exists (
      select 1 from public.catches
       where user_id = new.user_id and dex = new.dex and id <> new.id and variant like '%shiny%'
    ) into first_shiny;
    if first_shiny then
      perform private.grant_xp(
        new.user_id, coalesce((cfg->>'shinyXp')::int, 50), 'SHINY', 'First shiny of this species',
        jsonb_build_object('idempotency', 'xp-shiny:' || new.user_id::text || ':' || new.dex::text)
      );
      update public.trainer_stats
         set first_shiny_dex = coalesce(first_shiny_dex, new.dex), updated_at = now()
       where user_id = new.user_id;
    end if;
  end if;

  select s.catch_rate into catch_rate from public.species s where s.dex = new.dex;
  if exists (select 1 from public.species s where s.dex = new.dex and s.is_legendary) then
    pay := coalesce((cfg->>'legendaryXp')::int, 25);
  elsif coalesce(catch_rate, 255) <= 9 then
    pay := coalesce((cfg->>'ultraRareXp')::int, 15);
  elsif coalesce(catch_rate, 255) <= 25 then
    pay := coalesce((cfg->>'veryRareXp')::int, 10);
  elsif coalesce(catch_rate, 255) <= 75 then
    pay := coalesce((cfg->>'rareXp')::int, 5);
  else
    pay := 0;
  end if;
  if pay > 0 then
    perform private.grant_xp(
      new.user_id, pay, 'RARITY', 'Rare capture bonus',
      jsonb_build_object('idempotency', 'xp-rare:' || coalesce(new.id::text, new.dex::text))
    );
  end if;
  return new;
end;
$function$;

create or replace function private.maybe_grant_dex_milestones(p_uid uuid)
returns void
language plpgsql
as $function$
declare
  owned int;
  rec jsonb;
  key text;
begin
  select count(distinct dex) into owned from public.catches where user_id = p_uid;
  for rec in
    select value from jsonb_array_elements(private.economy_config()->'dexMilestones')
  loop
    if owned < coalesce((rec->>'species')::int, 999) then
      continue;
    end if;
    key := 'dex:' || (rec->>'species');
    insert into public.trainer_milestones (user_id, key)
    values (p_uid, key)
    on conflict do nothing;
    if not found then
      continue;
    end if;
    if rec->'grants' ? 'coins' then
      perform private.adjust_coins(
        p_uid, coalesce((rec->'grants'->>'coins')::int, 0), 'DEX_MILESTONE', rec->>'label',
        jsonb_build_object('idempotency', 'milestone:' || p_uid::text || ':' || key)
      );
    end if;
    perform private.grant_known(p_uid, (rec->'grants') - 'coins' - 'title' - 'badge');
    if rec ? 'title' then perform private.unlock_title(p_uid, rec->>'title', true); end if;
    if rec ? 'badge' then perform private.unlock_badge(p_uid, rec->>'badge', true); end if;
    perform private.push_notice(
      p_uid, 'dex',
      coalesce(rec->>'label', 'Pokédex milestone'),
      'Kanto Pokédex ' || owned::text || '/151',
      jsonb_build_object('species', rec->>'species', 'owned', owned)
    );
    if coalesce((rec->>'species')::int, 0) = 151 then
      insert into public.play_console_log (kind, message)
      select 'milestone', '🏆 ' || coalesce(private.trainer_label(p_uid), 'A trainer') || ' completed the Kanto Pokédex!'
      where not exists (
        select 1 from public.play_console_log l
        where l.kind = 'milestone' and l.message like '%completed the Kanto Pokédex%'
          and l.message like '%' || coalesce(private.trainer_label(p_uid), 'A trainer') || '%'
      );
    end if;
  end loop;
end;
$function$;

create or replace function private.award_encounter_rewards(
  p_round uuid,
  p_uid uuid,
  p_caught boolean,
  p_ball text,
  p_calc jsonb
)
returns void
language plpgsql
as $function$
declare
  cfg jsonb := private.economy_config();
  pcfg jsonb := private.progression_config();
  r public.encounter_rounds;
  pay int;
  first_species boolean;
  first_female boolean;
  first_shiny boolean;
  stream_day text;
  st public.trainer_stats;
  honey_used boolean := false;
  optimal boolean := false;
begin
  select * into r from public.encounter_rounds where id = p_round;
  if r is null then
    return;
  end if;
  st := private.ensure_trainer_stats(p_uid);
  select prep = 'bait' into honey_used
    from public.encounter_players
   where round_id = p_round and user_id = p_uid;

  perform private.grant_xp(
    p_uid, coalesce((pcfg->>'joinXp')::int, 5), 'ENCOUNTER', 'Joined and finished the encounter',
    jsonb_build_object('idempotency', 'xp-part:' || p_round::text || ':' || p_uid::text, 'relatedRound', p_round::text)
  );

  insert into public.trainer_milestones (user_id, key)
  values (p_uid, 'stat:' || p_round::text || ':' || p_uid::text)
  on conflict do nothing;
  if found then
    update public.trainer_stats
       set encounters = encounters + 1,
           honey = honey + case when honey_used then 1 else 0 end,
           captures = captures + case when p_caught then 1 else 0 end,
           fails = fails + case when p_caught then 0 else 1 end,
           catch_streak = case when p_caught then catch_streak + 1 else 0 end,
           fail_streak = case when p_caught then 0 else fail_streak + 1 end,
           best_catch_streak = case when p_caught then greatest(best_catch_streak, catch_streak + 1) else best_catch_streak end,
           best_fail_streak = case when not p_caught then greatest(best_fail_streak, fail_streak + 1) else best_fail_streak end,
           optimal_catches = optimal_catches + case
             when p_caught and coalesce((p_calc->'ball'->>'conditionMet')::boolean, false)
                  and coalesce(p_calc->'ball'->>'key', p_ball) not in ('pokeball','greatball','ultraball','masterball','premierball')
             then 1 else 0 end,
           updated_at = now()
     where user_id = p_uid;
  end if;

  pay := coalesce((cfg->>'participationReward')::int, 25);
  if pay > 0 then
    perform private.adjust_coins(
      p_uid, pay, 'ENCOUNTER_PARTICIPATION', 'Joined and finished the encounter',
      jsonb_build_object('idempotency', 'part:' || p_round::text || ':' || p_uid::text, 'relatedRound', p_round::text)
    );
  end if;

  stream_day := to_char((now() at time zone coalesce(private.capture_config()->>'timezone', 'America/New_York'))::date, 'YYYY-MM-DD');
  pay := coalesce((cfg->>'streamAttendanceReward')::int, 50);
  if pay > 0 then
    perform private.adjust_coins(
      p_uid, pay, 'STREAM_ATTENDANCE', 'First encounter of the stream day',
      jsonb_build_object('idempotency', 'stream:' || p_uid::text || ':' || stream_day, 'relatedRound', p_round::text)
    );
  end if;

  if not coalesce(p_caught, false) then
    perform private.evaluate_achievements(p_uid, true);
    return;
  end if;

  pay := floor(
    coalesce((cfg->>'captureReward')::int, 25)
    * private.rarity_capture_multiplier((p_calc->>'catchRate')::int)
  )::int;
  if pay > 0 then
    perform private.adjust_coins(
      p_uid, pay, 'CAPTURE_REWARD', 'Successful catch',
      jsonb_build_object('idempotency', 'catch:' || p_round::text || ':' || p_uid::text,
                         'relatedRound', p_round::text, 'relatedItem', p_ball)
    );
  end if;

  select not exists (
    select 1 from public.catches c
    where c.user_id = p_uid and c.dex = r.dex and c.round_id is distinct from p_round
  ) into first_species;
  if first_species then
    pay := coalesce((cfg->>'newDexReward')::int, 100);
    if pay > 0 then
      perform private.adjust_coins(
        p_uid, pay, 'NEW_DEX_ENTRY', 'First time catching this species',
        jsonb_build_object('idempotency', 'dex:' || p_uid::text || ':' || r.dex::text, 'relatedRound', p_round::text)
      );
    end if;
    perform private.maybe_grant_dex_milestones(p_uid);
  end if;

  if r.gender = 'Female' then
    select not exists (
      select 1 from public.catches c
      where c.user_id = p_uid and c.dex = r.dex and c.gender = 'Female'
        and c.round_id is distinct from p_round
    ) into first_female;
    if first_female then
      pay := coalesce((cfg->>'firstFemaleReward')::int, 25);
      if pay > 0 then
        perform private.adjust_coins(
          p_uid, pay, 'FIRST_FEMALE', 'First female of this species',
          jsonb_build_object('idempotency', 'female:' || p_uid::text || ':' || r.dex::text, 'relatedRound', p_round::text)
        );
      end if;
    end if;
  end if;

  if r.variant = 'shiny' then
    select not exists (
      select 1 from public.catches c
      where c.user_id = p_uid and c.dex = r.dex and c.variant = 'shiny'
        and c.round_id is distinct from p_round
    ) into first_shiny;
    if first_shiny then
      pay := coalesce((cfg->>'shinyReward')::int, 250);
      if pay > 0 then
        perform private.adjust_coins(
          p_uid, pay, 'SHINY_BONUS', 'First shiny of this species',
          jsonb_build_object('idempotency', 'shiny:' || p_uid::text || ':' || r.dex::text, 'relatedRound', p_round::text)
        );
      end if;
    end if;
  end if;

  if exists (select 1 from public.species s where s.dex = r.dex and s.is_legendary) then
    pay := coalesce((cfg->>'legendaryReward')::int, 350);
    if pay > 0 then
      perform private.adjust_coins(
        p_uid, pay, 'LEGENDARY_REWARD', 'Legendary or Mythical catch',
        jsonb_build_object('idempotency', 'legend:' || p_round::text || ':' || p_uid::text, 'relatedRound', p_round::text)
      );
    end if;
  end if;

  pay := floor(
    coalesce((p_calc->'berry'->>'rewardBonus')::numeric, 0)
    * coalesce((cfg->>'rewardBonusCoins')::numeric, 10)
  )::int;
  if pay > 0 then
    perform private.adjust_coins(
      p_uid, pay, 'PINAP_BONUS', 'Pinap Berry catch bonus',
      jsonb_build_object('idempotency', 'pinap:' || p_round::text || ':' || p_uid::text,
                         'relatedRound', p_round::text, 'relatedItem', p_calc->'berry'->>'key')
    );
  end if;

  perform private.evaluate_achievements(p_uid, true);
end;
$function$;
