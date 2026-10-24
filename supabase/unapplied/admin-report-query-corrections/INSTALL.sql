BEGIN;
DO $guard$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_roles r ON r.oid=p.proowner WHERE p.oid=to_regprocedure('public.admin_game_health()') AND md5(pg_get_functiondef(p.oid))='4006a76eb4b8bcd5c2de5ac47bba0807' AND r.rolname='postgres' AND p.proacl::text='{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'health source or attributes drift'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_roles r ON r.oid=p.proowner WHERE p.oid=to_regprocedure('public.admin_capture_report(integer)') AND md5(pg_get_functiondef(p.oid))='68eaae23e02f5268eccf293b7679bbbb' AND r.rolname='postgres' AND p.proacl::text='{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}') THEN RAISE EXCEPTION 'capture source or attributes drift'; END IF;
END;
$guard$;
CREATE OR REPLACE FUNCTION public.admin_game_health()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  mig text;
  rounds_24 int := 0;
  resolved_24 int := 0;
  cancelled_24 int := 0;
  cancelled_open int := 0;
  cancelled_unresolved_closed int := 0;
  neg_coins int := 0;
  neg_balls int := 0;
  neg_candy int := 0;
  twitch_live boolean;
  twitch_login text;
  client_build text;
  app_status text;
  db_status text;
  enc_status text;
  eco_status text;
  auth_status text;
  twitch_status text;
  rank_eligible int := 0;
  rank_hidden int := 0;
  rank_bot_only int := 0;
  rank_dup_login int := 0;
  rank_null_xp int := 0;
  rank_status text;
begin
  if not private.is_play_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  begin
    select version into mig from supabase_migrations.schema_migrations order by version desc limit 1;
  exception when others then
    mig := null;
  end;
  client_build := private.client_build();
  select count(*)::int,
         count(*) filter (where resolved)::int,
         count(*) filter (where cancelled)::int
    into rounds_24, resolved_24, cancelled_24
    from public.encounter_rounds
   where started_at > now() - interval '24 hours'
      or updated_at > now() - interval '24 hours';
  select count(*)::int into cancelled_open
    from public.encounter_rounds
   where cancelled and coalesce(phase, '') is distinct from 'closed';
  select count(*)::int into cancelled_unresolved_closed
    from public.encounter_rounds
   where cancelled and not resolved and coalesce(phase, '') = 'closed';
  select count(*)::int into neg_coins from public.inventories where coalesce(coins, 0) < 0;
  select count(*)::int into neg_balls
    from public.inventories
   where coalesce(pokeball, 0) < 0 or coalesce(greatball, 0) < 0 or coalesce(ultraball, 0) < 0
      or coalesce((balls->>'masterball')::int, 0) < 0;
  select count(*)::int into neg_candy from public.family_candy where coalesce(qty, 0) < 0;
  select is_live into twitch_live from public.stream_status where id = 1;
  select broadcaster_twitch_login into twitch_login from public.site_config where id = 1;

  select count(*) filter (where private.ranking_eligible_uid(p.id))::int,
         count(*) filter (where not p.ranking_visible)::int,
         count(*) filter (
           where p.ranking_visible
             and nullif(p.username, '') is null
             and exists (
               select 1 from public.twitch_connections c
                where c.user_id = p.id and c.confirmed and c.connection_type = 'bot'
             )
             and not exists (
               select 1 from public.twitch_connections c
                where c.user_id = p.id and c.confirmed and c.connection_type in ('player', 'secondary')
             )
         )::int,
         count(*) filter (where p.xp is null)::int
    into rank_eligible, rank_hidden, rank_bot_only, rank_null_xp
    from public.profiles p;
  select count(*)::int into rank_dup_login
    from (
      select coalesce(nullif(p.twitch_login, ''), nullif(p.username, '')) as k
      from public.profiles p
      where coalesce(nullif(p.twitch_login, ''), nullif(p.username, '')) is not null
      group by 1
      having count(*) > 1
    ) d;

  app_status := case
    when coalesce(client_build, '') = '' then 'WARNING'
    else 'HEALTHY'
  end;
  db_status := case when mig is null then 'UNKNOWN' else 'HEALTHY' end;
  enc_status := case
    when cancelled_open > 0 then 'ACTION NEEDED'
    else 'HEALTHY'
  end;
  eco_status := case
    when neg_coins > 0 or neg_balls > 0 or neg_candy > 0 then 'ACTION NEEDED'
    else 'HEALTHY'
  end;
  auth_status := 'UNKNOWN';
  twitch_status := case
    when coalesce(twitch_login, '') = '' then 'WARNING'
    when twitch_live then 'HEALTHY'
    else 'HEALTHY'
  end;
  rank_status := case
    when rank_dup_login > 0 or rank_null_xp > 0 then 'WARNING'
    else 'HEALTHY'
  end;

  return jsonb_build_object(
    'ok', true,
    'application', jsonb_build_object(
      'status', app_status,
      'clientBuild', client_build,
      'dbMigration', mig,
      'detail', 'Reuse Build Health for APP_BUILD / sprite / stale-client.'
    ),
    'database', jsonb_build_object(
      'status', db_status,
      'dbMigration', mig,
      'detail', case when mig is null then 'Migration catalog unavailable.' else 'Latest applied migration listed.' end
    ),
    'encounters', jsonb_build_object(
      'status', enc_status,
      'recent24h', rounds_24,
      'resolved24h', resolved_24,
      'cancelled24h', cancelled_24,
      'cancelledOpen', cancelled_open,
      'cancelledUnresolvedClosed', cancelled_unresolved_closed,
      'detail', case
        when cancelled_open > 0 then 'A cancelled round is not closed.'
        when cancelled_unresolved_closed > 0 then 'Historical cancelled rounds may still have resolved=false. Future cancels set resolved=true. Not live blockers.'
        else 'No open cancelled rounds.'
      end
    ),
    'economy', jsonb_build_object(
      'status', eco_status,
      'negativeCoins', neg_coins,
      'negativeBalls', neg_balls,
      'negativeCandy', neg_candy,
      'detail', case
        when neg_coins + neg_balls + neg_candy > 0 then 'Negative quantities found. Do not auto-repair.'
        else 'No negative currency, balls, or Evolution Candy.'
      end
    ),
    'auth', jsonb_build_object(
      'status', auth_status,
      'detail', 'Leaked-password protection is a Supabase Auth dashboard setting, not a database flag.'
    ),
    'twitch', jsonb_build_object(
      'status', twitch_status,
      'streamAccount', twitch_login,
      'live', coalesce(twitch_live, false),
      'detail', 'Live controls stay on Dashboard / Stream Session.'
    ),
    'assets', jsonb_build_object(
      'status', 'UNKNOWN',
      'detail', 'Asset HEAD checks and fallbacks are client-side. Use Encounter Asset Health.'
    ),
    'performance', jsonb_build_object(
      'status', 'UNKNOWN',
      'detail', 'Performance mode is a Trainer preference (AUTO/HIGH/BALANCED/LOW).'
    ),
    'rankings', jsonb_build_object(
      'status', rank_status,
      'eligible', rank_eligible,
      'excludedHidden', rank_hidden,
      'excludedBotOnly', rank_bot_only,
      'duplicatePublicKeys', rank_dup_login,
      'nullXp', rank_null_xp,
      'period', 'lifetime',
      'honeyMetric', 'trainer_stats.honey — Honey contributed on finished non-test encounters (prep = bait). Not inventories.bait / Store purchases.',
      'detail', format(
        'Eligible %s · hidden %s · bot-only %s · duplicate keys %s. Honey ranks contribution, not spending.',
        rank_eligible, rank_hidden, rank_bot_only, rank_dup_login
      )
    )
  );
end;
$function$;
CREATE OR REPLACE FUNCTION public.admin_capture_report(p_days integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
        group by case
            when canonical_catch_rate >= 201 then '201-255'
            when canonical_catch_rate >= 151 then '151-200'
            when canonical_catch_rate >= 101 then '101-150'
            when canonical_catch_rate >= 76 then '076-100'
            when canonical_catch_rate >= 46 then '046-075'
            when canonical_catch_rate >= 26 then '026-045'
            when canonical_catch_rate >= 10 then '010-025'
            else '001-009' end
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
COMMIT;
