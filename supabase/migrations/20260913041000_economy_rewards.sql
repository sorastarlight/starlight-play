-- Encounter rewards, safety-net throw, and the join trigger no longer
-- silently increments coins. Every PokéCoin change goes through the ledger.

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
  r public.encounter_rounds;
  pay int;
  first_species boolean;
  first_female boolean;
  first_shiny boolean;
  stream_day text;
begin
  select * into r from public.encounter_rounds where id = p_round;
  if r is null then
    return;
  end if;

  pay := coalesce((cfg->>'participationReward')::int, 25);
  if pay > 0 then
    perform private.adjust_coins(
      p_uid, pay, 'ENCOUNTER_PARTICIPATION', 'Joined and finished the encounter',
      jsonb_build_object('idempotency', 'part:' || p_round::text || ':' || p_uid::text,
                         'relatedRound', p_round::text)
    );
  end if;

  stream_day := to_char((now() at time zone coalesce(private.capture_config()->>'timezone', 'America/New_York'))::date, 'YYYY-MM-DD');
  pay := coalesce((cfg->>'streamAttendanceReward')::int, 50);
  if pay > 0 then
    perform private.adjust_coins(
      p_uid, pay, 'STREAM_ATTENDANCE', 'First encounter of the stream day',
      jsonb_build_object('idempotency', 'stream:' || p_uid::text || ':' || stream_day,
                         'relatedRound', p_round::text)
    );
  end if;

  if not coalesce(p_caught, false) then
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
    where c.user_id = p_uid and c.dex = r.dex
      and c.round_id is distinct from p_round
  ) into first_species;
  if first_species then
    pay := coalesce((cfg->>'newDexReward')::int, 100);
    if pay > 0 then
      perform private.adjust_coins(
        p_uid, pay, 'NEW_DEX_ENTRY', 'First time catching this species',
        jsonb_build_object('idempotency', 'dex:' || p_uid::text || ':' || r.dex::text,
                           'relatedRound', p_round::text)
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
          jsonb_build_object('idempotency', 'female:' || p_uid::text || ':' || r.dex::text,
                             'relatedRound', p_round::text)
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
          jsonb_build_object('idempotency', 'shiny:' || p_uid::text || ':' || r.dex::text,
                             'relatedRound', p_round::text)
        );
      end if;
    end if;
  end if;

  if exists (select 1 from public.species s where s.dex = r.dex and s.is_legendary) then
    pay := coalesce((cfg->>'legendaryReward')::int, 350);
    if pay > 0 then
      perform private.adjust_coins(
        p_uid, pay, 'LEGENDARY_REWARD', 'Legendary or Mythical catch',
        jsonb_build_object('idempotency', 'legend:' || p_round::text || ':' || p_uid::text,
                           'relatedRound', p_round::text)
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
                         'relatedRound', p_round::text,
                         'relatedItem', p_calc->'berry'->>'key')
    );
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
    if rec->'grants' ? 'coins' then
      perform private.adjust_coins(
        p_uid,
        coalesce((rec->'grants'->>'coins')::int, 0),
        'DEX_MILESTONE',
        rec->>'label',
        jsonb_build_object('idempotency', 'milestone:' || p_uid::text || ':' || key)
      );
    end if;
    perform private.grant_known(p_uid, (rec->'grants') - 'coins');
  end loop;
end;
$function$;

create or replace function private.after_join_xp()
returns trigger
language plpgsql
as $function$
begin
  perform private.ensure_inventory(new.user_id);
  perform private.award_xp(new.user_id, 10);
  return new;
end;
$function$;

create or replace function private.after_catch_xp()
returns trigger
language plpgsql
as $function$
declare
  first_species boolean;
begin
  perform private.ensure_inventory(new.user_id);
  select not exists (
    select 1 from public.catches
    where user_id = new.user_id and dex = new.dex and id <> new.id
  ) into first_species;
  perform private.award_xp(new.user_id, 50 + case when first_species then 25 else 0 end);
  return new;
end;
$function$;

create or replace function public.play_throw(p_item text, p_round_id uuid default null::uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  r public.encounter_rounds;
  uid uuid := auth.uid();
  twitch_user text;
  twitch_name text;
  stream_item text;
  mine public.encounter_players%rowtype;
  who text;
  line text;
  borrowed boolean := false;
  chosen text := p_item;
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  if chosen = 'standard' then
    chosen := 'pokeball';
    borrowed := true;
  end if;
  if not private.is_throw_ball(chosen) then
    raise exception 'Choose a Poké Ball from your bag.';
  end if;
  r := private.load_play_round(p_round_id);
  if private.round_paused(r) then
    raise exception 'The encounter is paused.';
  end if;
  if not private.throw_action_ok(r) then
    raise exception 'Poké Balls can only be chosen during the Poké Ball phase.';
  end if;
  select * into mine from public.encounter_players
    where round_id = r.id and user_id = uid for update;
  if not found then
    raise exception 'You had to join this encounter during its join window.';
  end if;
  if mine.ball is not null then
    raise exception 'You already used that action. No additional item spent.';
  end if;
  if mine.result is not null then
    raise exception 'This encounter already has results.';
  end if;
  if coalesce(private.bag_item_qty(uid, chosen), 0) < 1 then
    if chosen = 'pokeball' and coalesce(private.throwable_total(uid), 0) < 1 then
      borrowed := true;
    else
      raise exception 'You have no % left. No item spent.', private.item_label(chosen);
    end if;
  end if;

  stream_item := private.stream_throw_item(chosen);
  if r.source = 'mixitup' then
    select c.twitch_user_id, c.twitch_login into twitch_user, twitch_name from private.current_twitch() c;
    if twitch_user is null or twitch_name is null then
      raise exception 'Sign in with Twitch to throw on the live encounter.';
    end if;
    perform private.enqueue_stream_command('throw', jsonb_build_object('user', twitch_user, 'name', twitch_name, 'item', stream_item));
  end if;

  who := coalesce(private.trainer_label(uid), 'A trainer');
  line := who || ' has chosen ' || private.a_or_an(private.item_label(chosen)) || ' and is ready to throw!';

  update public.encounter_players
    set ball = chosen,
        ball_at = now(),
        result_reason = case when borrowed then 'standard_throw' else result_reason end
    where round_id = r.id and user_id = uid;
  perform private.log_activity(r.id, uid, 'selected', chosen);
  update public.play_console_log l
    set message = line
    where l.round_id = r.id and l.user_id = uid and l.kind = 'selected'
      and coalesce(l.message, '') = '';
  update public.encounter_rounds
    set last_action = line, updated_at = now()
    where id = r.id;
  return private.play_snapshot(uid, r.id) || jsonb_build_object(
    'ok', true,
    'message', 'You have chosen ' || private.item_label(chosen)
      || '! Please wait while the other Trainers make their choices.'
  );
end;
$function$;

create or replace function private.announce_throws(p_round uuid)
returns text
language plpgsql
as $function$
declare
  rec public.encounter_players%rowtype;
  who text;
  line text;
  last_line text;
begin
  for rec in
    select ep.* from public.encounter_players ep
    where ep.round_id = p_round
      and ep.ball is not null
      and ep.throw_processed = false
    order by coalesce(private.trainer_label(ep.user_id), 'Trainer'), ep.user_id
    for update
  loop
    who := coalesce(private.trainer_label(rec.user_id), 'A trainer');
    if rec.result_reason is distinct from 'standard_throw' then
      begin
        perform private.spend_bag_item(rec.user_id, rec.ball);
      exception when others then
        update public.encounter_players ep
          set throw_processed = true, result_reason = 'no_ball_left'
          where ep.round_id = rec.round_id and ep.user_id = rec.user_id;
        insert into public.play_console_log (round_id, user_id, display_name, kind, item, message)
        select p_round, rec.user_id, who, 'timeout', rec.ball,
               '⌛ ' || who || ' ran out of ' || private.item_label(rec.ball) || 's before the throw.'
        where not exists (
          select 1 from public.play_console_log l
          where l.round_id = p_round and l.user_id = rec.user_id and l.kind = 'timeout'
        )
        on conflict do nothing;
        continue;
      end;
    end if;
    update public.encounter_players ep
      set throw_processed = true
      where ep.round_id = rec.round_id and ep.user_id = rec.user_id;
    line := who || ' has thrown ' || private.a_or_an(private.item_label(rec.ball)) || '!';
    perform private.log_activity(p_round, rec.user_id, 'threw', rec.ball);
    update public.play_console_log l
      set message = line
      where l.round_id = p_round
        and l.user_id = rec.user_id
        and l.kind = 'threw'
        and coalesce(l.message, '') = '';
    last_line := line;
  end loop;

  for rec in
    select ep.* from public.encounter_players ep
    where ep.round_id = p_round and ep.ball is null and ep.result is null
  loop
    who := coalesce(private.trainer_label(rec.user_id), 'A trainer');
    insert into public.play_console_log (round_id, user_id, display_name, kind, item, message)
    select p_round, rec.user_id, who, 'timeout', null,
           '⌛ ' || who || ' did not choose a Poké Ball in time.'
    where not exists (
      select 1 from public.play_console_log l
      where l.round_id = p_round and l.user_id = rec.user_id and l.kind = 'timeout'
    )
    on conflict do nothing;
  end loop;

  return last_line;
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
  inv public.inventories;
  supply jsonb;
  hours numeric;
  berry_key text;
begin
  if uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  supply := private.economy_config()->'dailySupply';
  hours := coalesce((supply->>'cooldownHours')::numeric, 20);
  inv := private.ensure_inventory(uid);
  if inv.daily_supply_at is not null and inv.daily_supply_at > now() - (interval '1 hour' * hours) then
    raise exception 'Daily Trainer Supply is not ready yet.';
  end if;
  select key into berry_key
    from public.capture_berries
    where enabled and capture_enabled and economic_tier = 'basic' and key <> 'pinap'
    order by random()
    limit 1;
  if berry_key is null then
    berry_key := 'berry';
  end if;
  update public.inventories
     set daily_supply_at = now(), updated_at = now()
   where user_id = uid
     and (daily_supply_at is null or daily_supply_at <= now() - (interval '1 hour' * hours));
  if not found then
    raise exception 'Daily Trainer Supply is not ready yet.';
  end if;
  perform private.grant_known(uid, jsonb_build_object(
    'pokeball', coalesce((supply->>'pokeball')::int, 3),
    berry_key, coalesce((supply->>'berry')::int, 1)
  ));
  perform private.adjust_coins(
    uid,
    coalesce((supply->>'coins')::int, 50),
    'DAILY_REWARD',
    'Daily Trainer Supply',
    jsonb_build_object('idempotency', 'daily:' || uid::text || ':' || to_char(now(), 'YYYY-MM-DD'))
  );
  return private.play_snapshot(uid) || jsonb_build_object(
    'ok', true,
    'message', 'Daily Trainer Supply: '
      || coalesce((supply->>'pokeball')::int, 3)::text || ' Poké Balls, 1 '
      || private.item_label(berry_key) || ', '
      || coalesce((supply->>'coins')::int, 50)::text || ' PokéCoins.'
  );
end;
$function$;

revoke all on function public.play_claim_daily_supply() from public;
grant execute on function public.play_claim_daily_supply() to authenticated;

create or replace function private.award_from_capture_log()
returns trigger
language plpgsql
as $function$
begin
  perform private.award_encounter_rewards(
    new.round_id, new.user_id, new.success, new.ball_key, coalesce(new.detail, '{}'::jsonb)
  );
  return new;
end;
$function$;

drop trigger if exists capture_log_award on public.capture_log;
create trigger capture_log_award
  after insert on public.capture_log
  for each row execute function private.award_from_capture_log();

create or replace function private.award_from_no_throw()
returns trigger
language plpgsql
as $function$
begin
  if new.result = 'No throw' and (old.result is null) then
    perform private.award_encounter_rewards(new.round_id, new.user_id, false, new.ball, '{}'::jsonb);
  end if;
  return new;
end;
$function$;

drop trigger if exists encounter_no_throw_award on public.encounter_players;
create trigger encounter_no_throw_award
  after update of result on public.encounter_players
  for each row execute function private.award_from_no_throw();

