-- Wire loot into encounters, daily supply, milestones, store, Bits, and bag snapshot.

create or replace function private.daily_streak_bonus(p_day int)
returns jsonb
language sql
immutable
as $function$
  select case ((greatest(coalesce(p_day, 1), 1) - 1) % 7) + 1
    when 2 then jsonb_build_object('greatball', 1)
    when 4 then jsonb_build_object('bait', 1)
    when 5 then jsonb_build_object('greatball', 1)
    when 6 then jsonb_build_object('razz', 1)
    when 7 then jsonb_build_object('ultraball', 1)
    else '{}'::jsonb
  end;
$function$;

create or replace function public.play_claim_daily_supply()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
  today date := private.app_today();
  yesterday date := today - 1;
  prev int := 0;
  streak int := 1;
  berry jsonb;
  grants jsonb;
  supply jsonb := private.economy_config()->'dailySupply';
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  perform private.ensure_inventory(uid);
  if exists (
    select 1 from public.daily_claims
     where user_id = uid and created_at > now() - interval '12 hours'
       and claim_date is distinct from today
  ) then
    raise exception 'Daily Trainer Supply is not ready yet.';
  end if;
  insert into public.daily_claims (user_id, claim_date, streak_day, grants)
  values (uid, today, 1, '{}'::jsonb)
  on conflict (user_id, claim_date) do nothing;
  if not found then
    raise exception 'Daily Trainer Supply is not ready yet.';
  end if;
  select streak_day into prev
    from public.daily_claims
   where user_id = uid and claim_date = yesterday;
  streak := case when prev is null then 1 else (prev % 7) + 1 end;
  berry := private.pick_loot_entry('DAILY_COMMON_BERRY');
  if berry is null or (berry->>'item') = 'goldenrazz' then
    berry := jsonb_build_object('item', 'berry', 'qty', 1);
  end if;
  grants := jsonb_build_object(
      'pokeball', coalesce((supply->>'pokeball')::int, 3),
      berry->>'item', coalesce((supply->>'berry')::int, 1),
      'coins', coalesce((supply->>'coins')::int, 50)
    ) || private.daily_streak_bonus(streak);
  update public.daily_claims
     set streak_day = streak, grants = grants
   where user_id = uid and claim_date = today;
  update public.inventories
     set daily_supply_at = now(), updated_at = now()
   where user_id = uid;
  begin
    perform private.grant_items(uid, grants, 'DAILY_REWARD', today::text, 'daily:' || uid::text || ':' || today::text, true);
  exception when others then
    delete from public.daily_claims where user_id = uid and claim_date = today;
    update public.inventories set daily_supply_at = null, updated_at = now() where user_id = uid;
    raise;
  end;
  return private.play_snapshot(uid) || jsonb_build_object(
    'ok', true,
    'streakDay', streak,
    'grants', grants,
    'message', 'Daily Trainer Supply claimed. Day ' || streak::text || ' of 7.'
  );
end;
$function$;

revoke all on function public.play_claim_daily_supply() from public;
grant execute on function public.play_claim_daily_supply() to authenticated;

create or replace function public.play_claim_choice(p_reward_key text, p_item text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
  rec public.reward_choices;
  item text := lower(btrim(coalesce(p_item, '')));
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  select * into rec from public.reward_choices
   where user_id = uid and reward_key = p_reward_key for update;
  if rec.id is null or rec.remaining < 1 then
    raise exception 'That reward has already been claimed.';
  end if;
  if not (item = any (rec.options)) then
    raise exception 'Pick one of the offered items.';
  end if;
  if item = 'masterball' or not private.item_drop_allowed(item) then
    raise exception 'That item cannot be chosen.';
  end if;
  update public.reward_choices
     set remaining = remaining - 1
   where id = rec.id and remaining > 0;
  if not found then
    raise exception 'That reward has already been claimed.';
  end if;
  perform private.grant_items(
    uid, jsonb_build_object(item, 1), 'POKEDEX_REWARD', rec.reward_key,
    'choice:' || uid::text || ':' || rec.reward_key || ':' || rec.remaining::text, true
  );
  delete from public.reward_choices where id = rec.id and remaining <= 0;
  return private.play_snapshot(uid) || jsonb_build_object(
    'ok', true,
    'item', item,
    'message', private.item_label(item) || ' added to your Bag.'
  );
end;
$function$;

revoke all on function public.play_claim_choice(text, text) from public;
grant execute on function public.play_claim_choice(text, text) to authenticated;

create or replace function public.play_use_rare_candy(p_family int)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
  fam public.evolution_families;
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  if coalesce(private.item_qty(uid, 'rarecandy'), 0) < 1 then
    raise exception 'You do not have a Rare Candy.';
  end if;
  select * into fam from public.evolution_families where id = p_family;
  if fam.id is null then
    raise exception 'Unknown Candy family.';
  end if;
  if not exists (
    select 1 from public.evolution_rules r
     where r.family_id = p_family and r.enabled
       and r.generation_introduced = any (private.evo_enabled_generations())
  ) then
    raise exception 'Rare Candy can only be used on a family that can still evolve.';
  end if;
  perform private.adjust_item(uid, 'rarecandy', -1);
  insert into public.item_ledger (user_id, item_key, amount, reason, source_id)
  values (uid, 'rarecandy', -1, 'EVOLUTION_COST', 'rarecandy:' || p_family::text);
  perform private.grant_family_candy(
    uid, p_family, 1, 'RARE_CANDY', 'Rare Candy',
    jsonb_build_object('idempotency', 'rarecandy:' || uid::text || ':' || gen_random_uuid()::text)
  );
  return private.play_snapshot(uid) || jsonb_build_object(
    'ok', true,
    'message', 'Rare Candy used. ' || coalesce(fam.name, 'Family') || ' Candy +1.'
  );
end;
$function$;

revoke all on function public.play_use_rare_candy(int) from public;
grant execute on function public.play_use_rare_candy(int) to authenticated;

create or replace function public.play_item_ledger(p_limit int default 20)
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
  return jsonb_build_object(
    'ok', true,
    'rows', coalesce((
      select jsonb_agg(jsonb_build_object(
        'item', private.item_label(l.item_key),
        'key', l.item_key,
        'amount', l.amount,
        'reason', case l.reason
          when 'STORE_PURCHASE' then 'Store purchase'
          when 'ENCOUNTER_DROP' then 'Encounter find'
          when 'CAPTURE_DROP' then 'Capture find'
          when 'DAILY_REWARD' then 'Daily Trainer Supply'
          when 'LEVEL_REWARD' then 'Trainer Level reward'
          when 'POKEDEX_REWARD' then 'Pokédex reward'
          when 'ACHIEVEMENT_REWARD' then 'Achievement reward'
          when 'EVENT_REWARD' then 'Event reward'
          when 'BITS_REWARD' then 'Twitch Bits reward'
          when 'ADMIN_GRANT' then 'Staff grant'
          when 'STREAM_ATTENDANCE' then 'First encounter of the stream'
          when 'EVOLUTION_COST' then 'Evolution'
          when 'CAPTURE_USE' then 'Used in an encounter'
          else initcap(replace(l.reason, '_', ' '))
        end,
        'at', l.created_at
      ) order by l.created_at desc)
      from (
        select * from public.item_ledger
         where user_id = uid
         order by created_at desc
         limit least(greatest(coalesce(p_limit, 20), 1), 50)
      ) l
    ), '[]'::jsonb)
  );
end;
$function$;

revoke all on function public.play_item_ledger(int) from public;
grant execute on function public.play_item_ledger(int) to authenticated;

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
  if p_uid is null or p_rewards is null or p_rewards = '{}'::jsonb then
    return;
  end if;
  perform private.grant_items(
    p_uid,
    coalesce(p_rewards, '{}'::jsonb),
    reason,
    coalesce(p_rewards->>'key', p_rewards->>'idempotency'),
    coalesce(p_rewards->>'idempotency', 'prog:' || p_uid::text || ':' || coalesce(p_rewards->>'key', 'x')),
    true
  );
  if p_rewards ? 'title' then
    perform private.unlock_title(p_uid, p_rewards->>'title', p_notice);
  end if;
  if p_rewards ? 'badge' then
    perform private.unlock_badge(p_uid, p_rewards->>'badge', p_notice);
  end if;
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
    perform private.grant_items(
      p_uid,
      coalesce(rec->'grants', '{}'::jsonb),
      'POKEDEX_REWARD',
      key,
      'milestone:' || p_uid::text || ':' || key,
      true
    );
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
  if private.round_is_test(new.round_id) then
    return new;
  end if;
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

create or replace function private.register_capture_collection(p_catch public.catches)
returns void
language plpgsql
as $function$
declare
  spec public.species;
  pay int;
  first_species boolean;
  fam int;
begin
  if private.round_is_test(p_catch.round_id) then
    return;
  end if;
  select * into spec from public.species where dex = p_catch.dex;
  fam := coalesce(spec.family_candy_species_id, spec.family_id, p_catch.dex);
  if private.family_has_enabled_evo(fam) then
    pay := private.candy_for_stage(spec.evo_stage);
    perform private.grant_family_candy(
      p_catch.user_id, fam, pay, 'CATCH_REWARD', 'Catch reward',
      jsonb_build_object('idempotency', 'candy-catch:' || p_catch.id::text, 'catchId', p_catch.id::text)
    );
  end if;
  perform private.grant_mastery(p_catch.user_id, p_catch.dex, 1, 'CATCH', 'mastery-catch:' || p_catch.id::text);
  if p_catch.variant like '%shiny%' then
    perform private.grant_mastery(p_catch.user_id, p_catch.dex, 3, 'SHINY', 'mastery-shiny:' || p_catch.id::text);
  end if;
  if p_catch.gender = 'Female' and p_catch.dex = any (private.female_visual_dex()) then
    select not exists (
      select 1 from public.catches
       where user_id = p_catch.user_id and dex = p_catch.dex and id <> p_catch.id
         and (gender = 'Female' or variant like '%female%')
    ) into first_species;
    if first_species then
      perform private.grant_mastery(p_catch.user_id, p_catch.dex, 1, 'VARIANT', 'mastery-female:' || p_catch.id::text);
    end if;
  end if;
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
begin
  if private.round_is_test(p_round) then
    return;
  end if;
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

  stream_day := to_char(private.app_today(), 'YYYY-MM-DD');
  pay := coalesce((cfg->>'streamAttendanceReward')::int, 50);
  if pay > 0 then
    perform private.adjust_coins(
      p_uid, pay, 'STREAM_ATTENDANCE', 'First encounter of the stream day',
      jsonb_build_object('idempotency', 'stream:' || p_uid::text || ':' || stream_day, 'relatedRound', p_round::text)
    );
  end if;
  if coalesce((private.loot_config()->>'streamFirstBall')::int, 1) > 0 then
    perform private.grant_items(
      p_uid,
      jsonb_build_object('pokeball', (private.loot_config()->>'streamFirstBall')::int),
      'STREAM_ATTENDANCE',
      p_round::text,
      'stream-ball:' || p_uid::text || ':' || stream_day,
      false
    );
  end if;

  perform private.try_encounter_loot(p_round, p_uid, p_caught, p_calc);

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
