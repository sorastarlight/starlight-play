-- Admin surface for the capture system: balance editor, ball/berry editors,
-- dry-run simulator, per-round diagnostics and the analytics report.

create or replace function public.admin_capture_overview()
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
    'balance', private.capture_config(),
    'balls', coalesce((
      select jsonb_agg(to_jsonb(b) order by b.sort_order, b.name) from public.capture_balls b
    ), '[]'::jsonb),
    'berries', coalesce((
      select jsonb_agg(to_jsonb(b) order by b.sort_order, b.name) from public.capture_berries b
    ), '[]'::jsonb),
    'species', coalesce((
      select jsonb_agg(jsonb_build_object(
        'dex', s.dex, 'name', s.name, 'catchRate', s.catch_rate,
        'baseChance', private.capture_base_chance(s.catch_rate),
        'types', s.types, 'baseSpeed', s.base_speed, 'weightKg', s.weight_kg,
        'moonStoneFamily', s.moon_stone_family
      ) order by s.dex)
      from public.species s
    ), '[]'::jsonb)
  );
end;
$function$;

create or replace function public.admin_capture_save_balance(p_balance jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  next_balance jsonb;
  min_c numeric;
  max_c numeric;
begin
  if not private.is_play_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  next_balance := private.capture_config() || coalesce(p_balance, '{}'::jsonb);
  min_c := coalesce((next_balance->>'minChance')::numeric, 0.02);
  max_c := coalesce((next_balance->>'maxChance')::numeric, 0.85);
  if min_c < 0 or min_c > 1 or max_c < 0 or max_c > 1 then
    raise exception 'Chance limits must be between 0 and 1.';
  end if;
  if min_c >= max_c then
    raise exception 'The minimum chance must be lower than the maximum chance.';
  end if;
  if coalesce((next_balance->>'maxChance')::numeric, 0) >= 1 then
    raise exception 'Only the Master Ball may guarantee a capture.';
  end if;
  update public.site_config
     set game_settings = coalesce(game_settings, '{}'::jsonb)
       || jsonb_build_object('captureBalance', next_balance),
         updated_at = now()
   where id = 1;
  return jsonb_build_object('ok', true, 'balance', next_balance, 'message', 'Capture balance saved.');
end;
$function$;

create or replace function public.admin_capture_save_ball(p_key text, p_row jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not private.is_play_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.capture_balls b
     set base_multiplier = coalesce((p_row->>'base_multiplier')::numeric, b.base_multiplier),
         conditional_multiplier = case when p_row ? 'conditional_multiplier'
           then nullif(p_row->>'conditional_multiplier', '')::numeric else b.conditional_multiplier end,
         condition_type = coalesce(nullif(p_row->>'condition_type', ''), b.condition_type),
         condition_config = coalesce(p_row->'condition_config', b.condition_config),
         enabled = coalesce((p_row->>'enabled')::boolean, b.enabled),
         shop_price = case when p_row ? 'shop_price' then nullif(p_row->>'shop_price', '')::int else b.shop_price end,
         description = coalesce(nullif(p_row->>'description', ''), b.description),
         updated_at = now()
   where b.key = p_key;
  if not found then
    raise exception 'Unknown Poké Ball.';
  end if;
  return jsonb_build_object('ok', true, 'ball', (select to_jsonb(b) from public.capture_balls b where b.key = p_key));
end;
$function$;

create or replace function public.admin_capture_save_berry(p_key text, p_row jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not private.is_play_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.capture_berries b
     set capture_multiplier = coalesce((p_row->>'capture_multiplier')::numeric, b.capture_multiplier),
         reward_bonus = coalesce((p_row->>'reward_bonus')::numeric, b.reward_bonus),
         rpg_description = coalesce(nullif(p_row->>'rpg_description', ''), b.rpg_description),
         tier = coalesce(nullif(p_row->>'tier', ''), b.tier),
         rarity = coalesce(nullif(p_row->>'rarity', ''), b.rarity),
         shop_price = case when p_row ? 'shop_price' then nullif(p_row->>'shop_price', '')::int else b.shop_price end,
         sell_price = case when p_row ? 'sell_price' then nullif(p_row->>'sell_price', '')::int else b.sell_price end,
         enabled = coalesce((p_row->>'enabled')::boolean, b.enabled),
         capture_enabled = coalesce((p_row->>'capture_enabled')::boolean, b.capture_enabled),
         store_available = coalesce((p_row->>'store_available')::boolean, b.store_available),
         updated_at = now()
   where b.key = p_key;
  if not found then
    raise exception 'Unknown Berry.';
  end if;
  return jsonb_build_object('ok', true, 'berry', (select to_jsonb(b) from public.capture_berries b where b.key = p_key));
end;
$function$;

-- Dry run only: never touches inventories, collections or the capture log.
create or replace function public.admin_capture_simulate(
  p_dex integer,
  p_ball text default 'pokeball',
  p_berry text default null,
  p_joined integer default 1,
  p_honey integer default 0,
  p_contributed boolean default false,
  p_owns boolean default false,
  p_shiny boolean default false,
  p_trials integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  calc jsonb;
  trials int := least(greatest(coalesce(p_trials, 0), 0), 100000);
  wins int := 0;
  i int;
  chance numeric;
begin
  if not private.is_play_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  calc := private.capture_chance(
    p_dex, p_ball, p_berry, p_honey, p_joined, p_contributed, p_owns, p_shiny, 1.0, now()
  );
  chance := (calc->>'finalChance')::numeric;
  if trials > 0 then
    for i in 1..trials loop
      if private.secure_random() < chance then
        wins := wins + 1;
      end if;
    end loop;
  end if;
  return jsonb_build_object(
    'ok', true,
    'calc', calc,
    'trials', trials,
    'successes', wins,
    'observedRate', case when trials > 0 then round(wins::numeric / trials, 4) else null end
  );
end;
$function$;

create or replace function public.admin_capture_round(p_round uuid)
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
    'round', (select jsonb_build_object('id', r.id, 'dex', r.dex, 'name', r.name,
                'variant', r.variant, 'gender', r.gender, 'phase', r.phase)
              from public.encounter_rounds r where r.id = p_round),
    'throws', coalesce((
      select jsonb_agg(jsonb_build_object(
        'trainer', coalesce(private.trainer_label(l.user_id), 'Trainer'),
        'catchRate', l.canonical_catch_rate,
        'baseChance', l.base_chance,
        'ball', l.ball_key,
        'ballMultiplier', l.ball_multiplier,
        'ballConditionMet', l.ball_condition_met,
        'berry', l.berry_key,
        'berryMultiplier', l.berry_multiplier,
        'honeyContributors', l.honey_contributors,
        'honeyParticipants', l.honey_participants,
        'honeyMultiplier', l.honey_multiplier,
        'honeyContributorMultiplier', l.honey_contributor_multiplier,
        'shinyMultiplier', l.shiny_multiplier,
        'eventMultiplier', l.event_multiplier,
        'rawChance', l.raw_chance,
        'finalChance', l.final_chance,
        'roll', l.capture_roll,
        'success', l.success
      ) order by l.id)
      from public.capture_log l where l.round_id = p_round
    ), '[]'::jsonb)
  );
end;
$function$;

create or replace function public.admin_capture_report(p_days integer default 30)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  since timestamptz := now() - make_interval(days => greatest(coalesce(p_days, 30), 1));
begin
  if not private.is_play_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'ok', true,
    'since', since,
    'overall', (
      select jsonb_build_object(
        'throws', count(*)::int,
        'caught', count(*) filter (where success)::int,
        'rate', case when count(*) > 0 then round(count(*) filter (where success)::numeric / count(*), 4) else null end,
        'averageFinalChance', round(avg(final_chance), 4)
      ) from public.capture_log where created_at >= since
    ),
    'bySpecies', coalesce((
      select jsonb_agg(x order by x->>'name')
      from (
        select jsonb_build_object('dex', dex, 'name', max(species_name), 'throws', count(*)::int,
          'caught', count(*) filter (where success)::int,
          'rate', round(count(*) filter (where success)::numeric / count(*), 4)) as x
        from public.capture_log where created_at >= since group by dex
      ) s
    ), '[]'::jsonb),
    'byCatchRateTier', coalesce((
      select jsonb_agg(x order by x->>'tier')
      from (
        select jsonb_build_object('tier', case
            when canonical_catch_rate >= 201 then '201-255'
            when canonical_catch_rate >= 151 then '151-200'
            when canonical_catch_rate >= 101 then '101-150'
            when canonical_catch_rate >= 76 then '076-100'
            when canonical_catch_rate >= 46 then '046-075'
            when canonical_catch_rate >= 26 then '026-045'
            when canonical_catch_rate >= 10 then '010-025'
            else '001-009' end,
          'throws', count(*)::int, 'caught', count(*) filter (where success)::int,
          'rate', round(count(*) filter (where success)::numeric / count(*), 4)) as x
        from public.capture_log where created_at >= since
        group by 1
      ) s
    ), '[]'::jsonb),
    'byBall', coalesce((
      select jsonb_agg(x order by x->>'name')
      from (
        select jsonb_build_object('ball', ball_key, 'name', private.item_label(ball_key),
          'throws', count(*)::int, 'caught', count(*) filter (where success)::int,
          'rate', round(count(*) filter (where success)::numeric / count(*), 4)) as x
        from public.capture_log where created_at >= since group by ball_key
      ) s
    ), '[]'::jsonb),
    'byBerry', coalesce((
      select jsonb_agg(x order by x->>'name')
      from (
        select jsonb_build_object('berry', coalesce(berry_key, 'none'),
          'name', case when berry_key is null then 'No Berry' else private.item_label(berry_key) end,
          'throws', count(*)::int, 'caught', count(*) filter (where success)::int,
          'rate', round(count(*) filter (where success)::numeric / count(*), 4)) as x
        from public.capture_log where created_at >= since group by berry_key
      ) s
    ), '[]'::jsonb),
    'honey', (
      select jsonb_build_object(
        'withHoney', jsonb_build_object(
          'throws', count(*) filter (where honey_multiplier > 1)::int,
          'rate', case when count(*) filter (where honey_multiplier > 1) > 0
            then round(count(*) filter (where honey_multiplier > 1 and success)::numeric
                       / count(*) filter (where honey_multiplier > 1), 4) else null end),
        'withoutHoney', jsonb_build_object(
          'throws', count(*) filter (where coalesce(honey_multiplier, 1) <= 1)::int,
          'rate', case when count(*) filter (where coalesce(honey_multiplier, 1) <= 1) > 0
            then round(count(*) filter (where coalesce(honey_multiplier, 1) <= 1 and success)::numeric
                       / count(*) filter (where coalesce(honey_multiplier, 1) <= 1), 4) else null end),
        'averageParticipation', round(avg(
          case when coalesce(honey_participants, 0) > 0
            then honey_contributors::numeric / honey_participants else null end), 4)
      ) from public.capture_log where created_at >= since
    ),
    'encountersPerSpecies', coalesce((
      select jsonb_agg(x order by (x->>'encounters')::int desc)
      from (
        select jsonb_build_object('dex', dex, 'name', max(name), 'encounters', count(*)::int) as x
        from public.encounter_rounds where started_at >= since and coalesce(cancelled, false) = false
        group by dex
      ) s
    ), '[]'::jsonb),
    'collections', (
      select jsonb_build_object(
        'trainers', count(*)::int,
        'averageSpecies', round(avg(species_count), 2),
        'maxSpecies', max(species_count),
        'distribution', coalesce((
          select jsonb_object_agg(bucket, n) from (
            select case
              when species_count >= 121 then '121-151'
              when species_count >= 91 then '091-120'
              when species_count >= 61 then '061-090'
              when species_count >= 31 then '031-060'
              when species_count >= 11 then '011-030'
              else '001-010' end as bucket, count(*)::int as n
            from (select user_id, count(distinct dex) as species_count from public.catches group by user_id) t2
            group by 1
          ) d
        ), '{}'::jsonb)
      )
      from (select user_id, count(distinct dex) as species_count from public.catches group by user_id) t
    )
  );
end;
$function$;

grant execute on function public.admin_capture_overview() to authenticated;
grant execute on function public.admin_capture_save_balance(jsonb) to authenticated;
grant execute on function public.admin_capture_save_ball(text, jsonb) to authenticated;
grant execute on function public.admin_capture_save_berry(text, jsonb) to authenticated;
grant execute on function public.admin_capture_simulate(integer, text, text, integer, integer, boolean, boolean, boolean, integer) to authenticated;
grant execute on function public.admin_capture_round(uuid) to authenticated;
grant execute on function public.admin_capture_report(integer) to authenticated;
