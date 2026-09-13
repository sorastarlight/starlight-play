-- Admin economy dashboard, config save, dry-run simulator, and ledger viewer.

create or replace function public.admin_economy_overview()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  today date := (now() at time zone coalesce(private.capture_config()->>'timezone', 'America/New_York'))::date;
  start_at timestamptz := today::timestamp at time zone coalesce(private.capture_config()->>'timezone', 'America/New_York');
begin
  if not private.is_play_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'ok', true,
    'config', private.economy_config(),
    'circulation', (select coalesce(sum(coins), 0) from public.inventories),
    'trainers', (select count(*)::int from public.inventories),
    'averageBalance', (select round(avg(coins), 1) from public.inventories),
    'medianBalance', (select percentile_cont(0.5) within group (order by coins) from public.inventories),
    'createdToday', (select coalesce(sum(amount), 0) from public.coin_ledger where amount > 0 and created_at >= start_at),
    'spentToday', (select coalesce(sum(-amount), 0) from public.coin_ledger where amount < 0 and created_at >= start_at),
    'storeRevenueToday', (select coalesce(sum(-amount), 0) from public.coin_ledger where type = 'STORE_PURCHASE' and created_at >= start_at),
    'inflation', jsonb_build_object(
      'created', (select coalesce(sum(amount), 0) from public.coin_ledger where amount > 0),
      'destroyed', (select coalesce(sum(-amount), 0) from public.coin_ledger where amount < 0)
    ),
    'distribution', jsonb_build_object(
      '0-499', (select count(*) from public.inventories where coins between 0 and 499),
      '500-999', (select count(*) from public.inventories where coins between 500 and 999),
      '1000-2499', (select count(*) from public.inventories where coins between 1000 and 2499),
      '2500-4999', (select count(*) from public.inventories where coins between 2500 and 4999),
      '5000-9999', (select count(*) from public.inventories where coins between 5000 and 9999),
      '10000+', (select count(*) from public.inventories where coins >= 10000)
    ),
    'masterBallsOwned', (
      select coalesce(sum(coalesce((balls->>'masterball')::int, 0)), 0) from public.inventories
    ),
    'mostPurchased', (
      select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select jsonb_build_object('sku', related_sku, 'count', count(*)::int) as x
        from public.coin_ledger
        where type = 'STORE_PURCHASE' and related_sku is not null
        group by related_sku
        order by count(*) desc
        limit 8
      ) s
    ),
    'ballUsage', (
      select coalesce(jsonb_object_agg(ball_key, n), '{}'::jsonb) from (
        select ball_key, count(*)::int as n from public.capture_log group by ball_key
      ) s
    ),
    'berryUsage', (
      select coalesce(jsonb_object_agg(coalesce(berry_key, 'none'), n), '{}'::jsonb) from (
        select berry_key, count(*)::int as n from public.capture_log group by berry_key
      ) s
    ),
    'ultraShare', (
      select case when count(*) > 0
        then round(count(*) filter (where ball_key in ('ultraball', 'hisuiultraball', 'jetball', 'gigatonball'))::numeric / count(*), 3)
        else 0 end
      from public.capture_log
    ),
    'goldenRazzShare', (
      select case when count(*) filter (where berry_key is not null) > 0
        then round(count(*) filter (where berry_key = 'goldenrazz')::numeric
                   / count(*) filter (where berry_key is not null), 3)
        else 0 end
      from public.capture_log
    ),
    'honeyParticipation', (
      select round(avg(case when coalesce(honey_participants, 0) > 0
        then honey_contributors::numeric / honey_participants end), 3)
      from public.capture_log
    )
  );
end;
$function$;

create or replace function public.admin_economy_save(p_balance jsonb)
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
  next_bal := private.economy_config() || coalesce(p_balance, '{}'::jsonb);
  if coalesce((next_bal->>'participationReward')::int, 0) < 0
     or coalesce((next_bal->>'captureReward')::int, 0) < 0 then
    raise exception 'Rewards cannot be negative.';
  end if;
  update public.site_config
     set game_settings = coalesce(game_settings, '{}'::jsonb)
       || jsonb_build_object('economyBalance', next_bal),
         updated_at = now()
   where id = 1;
  return jsonb_build_object('ok', true, 'config', next_bal, 'message', 'Economy balance saved.');
end;
$function$;

create or replace function public.admin_economy_simulate(
  p_encounters integer default 10,
  p_streams integer default 5,
  p_join_rate numeric default 0.8,
  p_catch_rate numeric default 0.35,
  p_new_dex_rate numeric default 0.25,
  p_strategy text default 'regular'
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  cfg jsonb := private.economy_config();
  encounters int := least(greatest(coalesce(p_encounters, 10), 1), 2500);
  streams int := least(greatest(coalesce(p_streams, 5), 1), 20);
  joined numeric;
  caught numeric;
  earned int;
  weekly int;
  poke int;
  great int;
  ultra int;
begin
  if not private.is_play_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  joined := encounters * least(greatest(coalesce(p_join_rate, 0.8), 0), 1);
  caught := joined * least(greatest(coalesce(p_catch_rate, 0.35), 0), 1);
  earned := (
    1 * coalesce((cfg->>'streamAttendanceReward')::int, 50)
    + floor(joined * coalesce((cfg->>'participationReward')::int, 25))
    + floor(caught * coalesce((cfg->>'captureReward')::int, 25))
    + floor(caught * least(greatest(coalesce(p_new_dex_rate, 0.25), 0), 1)
            * coalesce((cfg->>'newDexReward')::int, 100))
    + coalesce((cfg->'dailySupply'->>'coins')::int, 50)
  )::int;
  weekly := earned * streams;
  poke := coalesce((select shop_price from public.capture_balls where key = 'pokeball'), 100);
  great := coalesce((select shop_price from public.capture_balls where key = 'greatball'), 225);
  ultra := coalesce((select shop_price from public.capture_balls where key = 'ultraball'), 500);
  return jsonb_build_object(
    'ok', true,
    'dryRun', true,
    'strategy', coalesce(p_strategy, 'regular'),
    'perStream', jsonb_build_object(
      'encounters', encounters,
      'joined', round(joined, 2),
      'caught', round(caught, 2),
      'coinsEarned', earned,
      'pokeBallsAffordable', case when poke > 0 then earned / poke else 0 end,
      'greatBallsAffordable', case when great > 0 then earned / great else 0 end,
      'ultraBallsAffordable', case when ultra > 0 then earned / ultra else 0 end
    ),
    'weekly', jsonb_build_object(
      'streams', streams,
      'coinsEarned', weekly,
      'pokeBallsAffordable', case when poke > 0 then weekly / poke else 0 end,
      'greatBallsAffordable', case when great > 0 then weekly / great else 0 end,
      'ultraBallsAffordable', case when ultra > 0 then weekly / ultra else 0 end,
      'note', 'Dry run only. No inventories, collections, or ledgers were changed.'
    )
  );
end;
$function$;

create or replace function public.admin_coin_ledger(p_user uuid default null, p_limit integer default 50)
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
    'rows', coalesce((
      select jsonb_agg(jsonb_build_object(
        'at', created_at,
        'trainer', coalesce(private.trainer_label(user_id), user_id::text),
        'amount', amount,
        'type', type,
        'reason', reason,
        'before', balance_before,
        'after', balance_after
      ) order by created_at desc)
      from (
        select * from public.coin_ledger
        where p_user is null or user_id = p_user
        order by created_at desc
        limit least(greatest(coalesce(p_limit, 50), 1), 200)
      ) s
    ), '[]'::jsonb)
  );
end;
$function$;

grant execute on function public.admin_economy_overview() to authenticated;
grant execute on function public.admin_economy_save(jsonb) to authenticated;
grant execute on function public.admin_economy_simulate(integer, integer, numeric, numeric, numeric, text) to authenticated;
grant execute on function public.admin_coin_ledger(uuid, integer) to authenticated;
