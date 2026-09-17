-- Phase 9 read-only Game Health economy snapshot. No individual support spend.

create or replace function public.admin_economy_health()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  trainers int := 0;
  med_coins numeric := 0;
  med_poke numeric := 0;
  med_great numeric := 0;
  med_ultra numeric := 0;
  med_honey numeric := 0;
  med_berry numeric := 0;
  med_candy numeric := 0;
  throws_7 int := 0;
  catches_7 int := 0;
  coins_in_7 int := 0;
  coins_out_7 int := 0;
  bag_cap numeric := 0;
begin
  if not private.is_play_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select count(*)::int into trainers
    from public.profiles p
   where coalesce(p.username, '') is distinct from 'playtester';

  select percentile_cont(0.5) within group (order by coalesce(i.coins, 0)),
         percentile_cont(0.5) within group (order by coalesce(i.pokeball, 0)),
         percentile_cont(0.5) within group (order by coalesce(i.greatball, 0)),
         percentile_cont(0.5) within group (order by coalesce(i.ultraball, 0)),
         percentile_cont(0.5) within group (order by coalesce(i.bait, 0)),
         percentile_cont(0.5) within group (order by coalesce(i.berry, 0)),
         percentile_cont(0.5) within group (order by coalesce(i.bag_bonus, 0))
    into med_coins, med_poke, med_great, med_ultra, med_honey, med_berry, bag_cap
    from public.inventories i
    join public.profiles p on p.id = i.user_id
   where coalesce(p.username, '') is distinct from 'playtester';

  select percentile_cont(0.5) within group (order by qty)
    into med_candy
    from (
      select coalesce(sum(c.qty), 0) as qty
        from public.profiles p
        left join public.family_candy c on c.user_id = p.id
       where coalesce(p.username, '') is distinct from 'playtester'
       group by p.id
    ) x;

  select count(*)::int,
         count(*) filter (where cl.success)::int
    into throws_7, catches_7
    from public.capture_log cl
    join public.encounter_rounds r on r.id = cl.round_id
   where cl.created_at > now() - interval '7 days'
     and coalesce(r.trigger_source, '') is distinct from 'TEST'
     and coalesce(r.cancelled, false) = false;

  select coalesce(sum(greatest(coalesce((re.grants->>'coins')::int, 0), 0)), 0)::int
    into coins_in_7
    from public.reward_events re
   where re.created_at > now() - interval '7 days';

  coins_out_7 := 0;

  return jsonb_build_object(
    'ok', true,
    'status', 'HEALTHY',
    'trainers', trainers,
    'medianCoins', round(coalesce(med_coins, 0)),
    'medianPokeball', round(coalesce(med_poke, 0)),
    'medianGreatball', round(coalesce(med_great, 0)),
    'medianUltraball', round(coalesce(med_ultra, 0)),
    'medianHoney', round(coalesce(med_honey, 0)),
    'medianBerry', round(coalesce(med_berry, 0)),
    'medianFamilyCandy', round(coalesce(med_candy, 0)),
    'medianBagBonus', round(coalesce(bag_cap, 0)),
    'throws7d', throws_7,
    'catches7d', catches_7,
    'captureRate7d', case when throws_7 > 0 then round((100.0 * catches_7 / throws_7)::numeric, 1) else 0 end,
    'coinGrants7d', coins_in_7,
    'ballMix7d', coalesce((
      select jsonb_object_agg(ball_key, n)
      from (
        select coalesce(cl.ball_key, 'unknown') as ball_key, count(*)::int as n
        from public.capture_log cl
        join public.encounter_rounds r on r.id = cl.round_id
        where cl.created_at > now() - interval '7 days'
          and coalesce(r.trigger_source, '') is distinct from 'TEST'
        group by 1
        order by count(*) desc
        limit 8
      ) b
    ), '{}'::jsonb),
    'berryMix7d', coalesce((
      select jsonb_object_agg(coalesce(berry_key, 'none'), n)
      from (
        select cl.berry_key, count(*)::int as n
        from public.capture_log cl
        join public.encounter_rounds r on r.id = cl.round_id
        where cl.created_at > now() - interval '7 days'
          and coalesce(r.trigger_source, '') is distinct from 'TEST'
        group by 1
        order by count(*) desc
        limit 8
      ) b
    ), '{}'::jsonb),
    'detail', format(
      'Eligible trainers %s · median %s PokéCoins · %s Poké Balls · %s Honey · 7d catch %s/%s.',
      trainers, round(coalesce(med_coins, 0)), round(coalesce(med_poke, 0)), round(coalesce(med_honey, 0)), catches_7, throws_7
    )
  );
end;
$$;

grant execute on function public.admin_economy_health() to authenticated;
