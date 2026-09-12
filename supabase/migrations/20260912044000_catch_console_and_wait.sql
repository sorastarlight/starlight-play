-- After each catch is rolled, post "<name> caught <Pokémon>" to LIVE
-- so the results card can stay as counts only.

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
  throw_line text;
  announced_at timestamptz;
  had_balls boolean;
  who text;
  species text;
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

  throw_line := private.announce_throws(r.id);
  if throw_line is not null then
    update public.encounter_rounds
      set last_action = throw_line, updated_at = now()
      where id = r.id
      returning * into r;
  end if;

  select exists (
    select 1 from public.encounter_players ep
    where ep.round_id = r.id and ep.ball is not null
  ) into had_balls;
  select min(a.created_at) into announced_at
  from public.encounter_activity a
  where a.round_id = r.id and a.kind = 'threw';

  if had_balls then
    if announced_at is null or clk < announced_at + interval '3 seconds' then
      return r;
    end if;
  end if;

  rules := coalesce(r.rules, private.game_settings());
  species := coalesce(nullif(btrim(r.name), ''), 'the Pokémon');
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
    if v_caught then
      who := coalesce(private.trainer_label(rec.user_id), 'A trainer');
      insert into public.play_console_log (round_id, user_id, display_name, kind, item, message)
      select r.id, rec.user_id, who, 'caught', species, who || ' caught ' || species
      where not exists (
        select 1 from public.play_console_log l
        where l.round_id = r.id and l.user_id = rec.user_id and l.kind = 'caught'
      );
    end if;
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
        last_action = coalesce(throw_line, last_action, 'Results locked in'),
        updated_at = now()
    where id = r.id
    returning * into r;
  return r;
end;
$$;
