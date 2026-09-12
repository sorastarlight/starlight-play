-- Overlay was jumping Play into reveal/results while the throw clock was
-- still open, so Berry stayed on screen and lastAction got overwritten with
-- "joined". Keep the throw window until Play's throw deadline, and don't let
-- a later join line erase a Berry/Honey/ball.

create or replace function private.round_phase(r public.encounter_rounds)
returns text
language plpgsql
stable
as $$
declare
  clk timestamptz;
  clock_phase text;
  stored text;
begin
  if r is null or r.cancelled then
    return 'closed';
  end if;
  if r.deadlines is null then
    return coalesce(nullif(r.phase, ''), 'closed');
  end if;
  clk := coalesce(r.paused_at, now());
  clock_phase := case
    when clk < (r.deadlines->>'join')::timestamptz then 'join'
    when clk < (r.deadlines->>'prepare')::timestamptz then 'prepare'
    when clk < (r.deadlines->>'throw')::timestamptz then 'throw'
    when clk < (r.deadlines->>'reveal')::timestamptz then 'reveal'
    else 'closed'
  end;
  if r.paused_at is not null then
    return clock_phase;
  end if;
  if clock_phase = 'throw' then
    return 'throw';
  end if;
  stored := coalesce(nullif(r.phase, ''), clock_phase);
  if stored = 'throw' and clock_phase in ('join', 'prepare') then
    return 'throw';
  end if;
  if stored in ('join', 'prepare')
     and private.phase_rank(stored) > private.phase_rank(clock_phase) then
    return stored;
  end if;
  return clock_phase;
end;
$$;

create or replace function private.settle_if_needed(r public.encounter_rounds)
returns public.encounter_rounds
language plpgsql
as $$
declare
  rec public.encounter_players%rowtype;
  rules jsonb;
  bait_count int;
  player_count int;
  shared numeric;
  v_odds numeric;
  v_roll numeric;
  v_caught boolean;
  pending boolean;
  clk timestamptz;
  throw_at timestamptz;
begin
  if r is null or r.cancelled then
    return r;
  end if;
  select exists (
    select 1 from public.encounter_players ep
    where ep.round_id = r.id and ep.result is null
  ) into pending;
  clk := coalesce(r.paused_at, now());
  if r.paused_at is not null then
    return r;
  end if;
  if pending = false and r.resolved then
    return r;
  end if;
  if r.deadlines is not null then
    throw_at := coalesce((r.deadlines->>'throw')::timestamptz, (r.deadlines->>'reveal')::timestamptz);
    if throw_at is not null and clk < throw_at then
      return r;
    end if;
  elsif private.round_phase(r) in ('join', 'prepare', 'throw') then
    return r;
  end if;

  rules := coalesce(r.rules, private.game_settings());
  select count(*)::int, count(*) filter (where prep = 'bait')::int
    into player_count, bait_count
    from public.encounter_players
    where round_id = r.id;
  shared := coalesce((rules->>'maxBaitBonus')::numeric, 0) * bait_count / greatest(player_count, 1);

  for rec in
    select * from public.encounter_players
    where round_id = r.id and result is null
  loop
    if rec.ball is null then
      update public.encounter_players ep
        set result = 'No throw', caught = false
        where ep.round_id = rec.round_id and ep.user_id = rec.user_id;
      continue;
    end if;
    if rec.ball = 'masterball' then
      v_odds := 1;
      v_caught := true;
      v_roll := 0;
    else
      v_odds := least(
        coalesce((rules->>'maxCatchChance')::numeric, 0.9),
        private.ball_catch_chance(rules, rec.ball)
          + shared
          + case when rec.prep = 'berry' then coalesce((rules->>'berryBonus')::numeric, 0) else 0 end
      );
      v_roll := random();
      v_caught := v_roll < v_odds;
    end if;
    update public.encounter_players ep
      set chance = v_odds, roll = v_roll, caught = v_caught,
          result = case when v_caught then 'Caught' else 'Escaped' end
      where ep.round_id = rec.round_id and ep.user_id = rec.user_id;
    if v_caught and not exists (
      select 1 from public.catches c
      where c.round_id = rec.round_id and c.user_id = rec.user_id
    ) then
      insert into public.catches (user_id, dex, name, variant, gender, ball, round_id, source_key)
      values (
        rec.user_id, r.dex, r.name, r.variant, r.gender, rec.ball, rec.round_id,
        'play:' || rec.round_id::text || ':' || rec.user_id::text
      );
    end if;
  end loop;

  update public.encounter_rounds
    set resolved = true,
        paused_at = null,
        last_action = case
          when last_action ~* 'joined' then 'Results locked in'
          else coalesce(nullif(btrim(last_action), ''), 'Results locked in')
        end,
        updated_at = now()
    where id = r.id
    returning * into r;
  return r;
end;
$$;

create or replace function public.bridge_publish(p_token text, p_round jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  source_key text;
  round_id uuid;
  rec record;
  v_phase text;
  v_hidden boolean;
  v_cancelled boolean;
  v_resolved boolean;
  existing public.encounter_rounds;
begin
  if not private.bridge_ok(p_token) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update private.stream_bridge set seen_at = now() where id = 1;
  if p_round is null or coalesce(p_round->>'id', '') = '' then
    update public.encounter_rounds
      set hidden = true, phase = 'closed', last_action = coalesce(p_round->>'lastAction', last_action), updated_at = now()
      where source = 'mixitup'
        and coalesce(cancelled, false) = false
        and paused_at is null
        and phase <> 'closed'
        and (
          deadlines is null
          or coalesce((deadlines->>'reveal')::timestamptz, '-infinity'::timestamptz) <= now()
        );
    return jsonb_build_object('ok', true);
  end if;
  source_key := 'mixitup:' || (p_round->>'id');
  select * into existing from public.encounter_rounds where source_id = source_key;
  v_phase := coalesce(p_round->>'phase', 'closed');
  v_cancelled := coalesce((p_round->>'cancelled')::boolean, false);
  v_resolved := coalesce((p_round->>'resolved')::boolean, false);
  v_hidden := coalesce((p_round->>'hidden')::boolean, false);
  if not v_cancelled then
    v_hidden := false;
  end if;
  if existing.paused_at is not null and not v_cancelled and not v_resolved then
    return jsonb_build_object('ok', true, 'id', existing.id, 'paused', true);
  end if;
  insert into public.encounter_rounds (
    source_id, source, phase, hidden, pokemon, dex, name, variant, gender,
    started_at, deadlines, rules, resolved, cancelled, last_action, ends_at, players
  ) values (
    source_key, 'mixitup', v_phase,
    v_hidden,
    jsonb_build_object('dex', (p_round->>'dex')::int, 'name', p_round->>'name', 'variant', coalesce(p_round->>'variant', 'normal'), 'gender', coalesce(p_round->>'gender', 'Unknown')),
    nullif(p_round->>'dex', '')::int, p_round->>'name', coalesce(p_round->>'variant', 'normal'), coalesce(p_round->>'gender', 'Unknown'),
    nullif(p_round->>'startedAt', '')::timestamptz, p_round->'deadlines', p_round->'rules',
    v_resolved, v_cancelled,
    coalesce(p_round->>'lastAction', ''), nullif(p_round->>'endsAt', '')::timestamptz, '{}'::jsonb
  )
  on conflict (source_id) do update set
    source = 'mixitup',
    phase = case
      when excluded.phase in ('reveal', 'closed')
           and public.encounter_rounds.deadlines is not null
           and now() < coalesce((public.encounter_rounds.deadlines->>'throw')::timestamptz, now())
        then 'throw'
      else excluded.phase
    end,
    hidden = excluded.hidden, pokemon = excluded.pokemon,
    dex = excluded.dex, name = excluded.name, variant = excluded.variant, gender = excluded.gender,
    started_at = excluded.started_at, deadlines = excluded.deadlines, rules = excluded.rules,
    resolved = case
      when public.encounter_rounds.deadlines is not null
           and now() < coalesce((public.encounter_rounds.deadlines->>'throw')::timestamptz, now())
           and not excluded.cancelled
        then public.encounter_rounds.resolved
      else excluded.resolved or public.encounter_rounds.resolved
    end,
    cancelled = excluded.cancelled,
    last_action = case
      when excluded.last_action is null or btrim(excluded.last_action) = '' then public.encounter_rounds.last_action
      when excluded.last_action ~* 'joined'
           and exists (
             select 1 from public.encounter_players ep
             where ep.round_id = public.encounter_rounds.id
               and (ep.prep is not null or ep.ball is not null)
           )
           and not v_cancelled then public.encounter_rounds.last_action
      when exists (
        select 1 from public.encounter_players ep
        where ep.round_id = public.encounter_rounds.id and ep.ball is not null
      ) and excluded.last_action ~* 'berry|honey|bait' and not v_resolved then public.encounter_rounds.last_action
      else excluded.last_action
    end,
    paused_at = case
      when excluded.cancelled or (
        excluded.resolved
        and (
          public.encounter_rounds.deadlines is null
          or now() >= coalesce((public.encounter_rounds.deadlines->>'throw')::timestamptz, now())
        )
      ) then null
      else public.encounter_rounds.paused_at
    end,
    ends_at = excluded.ends_at, updated_at = now()
  returning id into round_id;
  select * into existing from public.encounter_rounds where id = round_id;
  existing := coalesce(private.settle_if_needed(existing), existing);
  if v_resolved then
    for rec in select value from jsonb_array_elements(coalesce(p_round->'results', '[]'::jsonb)) as t(value)
    loop
      if coalesce((rec.value->>'caught')::boolean, false) then
        perform private.record_stream_catch(
          rec.value->>'user', rec.value->>'name', nullif(p_round->>'dex', '')::int, p_round->>'name',
          coalesce(p_round->>'variant', 'normal'), coalesce(p_round->>'gender', 'Unknown'), rec.value->>'ball',
          round_id, 'mixitup:' || (p_round->>'id') || ':' || coalesce(rec.value->>'user', rec.value->>'name', ''), now()
        );
      end if;
    end loop;
  end if;
  return jsonb_build_object('ok', true, 'id', round_id);
end;
$$;

notify pgrst, 'reload schema';
