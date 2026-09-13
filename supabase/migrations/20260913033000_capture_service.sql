-- The one authoritative capture service. Every caller (settlement, admin
-- diagnostics, the simulator) goes through private.capture_chance so odds are
-- never recalculated anywhere else.

create or replace function private.capture_config()
returns jsonb
language sql
stable
as $$
  select coalesce(private.game_settings()->'captureBalance', '{}'::jsonb);
$$;

-- Cryptographically seeded roll. random() is seeded per backend and would be
-- guessable; this is not.
create or replace function private.secure_random()
returns numeric
language sql
volatile
as $$
  select (('x' || encode(extensions.gen_random_bytes(6), 'hex'))::bit(48)::bigint)::numeric
         / 281474976710656::numeric;
$$;

create or replace function private.capture_base_chance(p_catch_rate int, p_config jsonb default null)
returns numeric
language sql
stable
as $$
  select coalesce(
    (
      select (t->>'chance')::numeric
      from jsonb_array_elements(
        coalesce(
          nullif(coalesce(p_config, private.capture_config())->'baseChanceTiers', 'null'::jsonb),
          '[]'::jsonb
        )
      ) t
      where coalesce(p_catch_rate, 45) >= (t->>'minCatchRate')::int
      order by (t->>'minCatchRate')::int desc
      limit 1
    ),
    0.16
  );
$$;

-- Ball behaviour is data, never a chain of name comparisons.
create or replace function private.capture_ball_modifier(
  p_ball text,
  p_dex int,
  p_owns_species boolean default false,
  p_at timestamptz default now(),
  p_config jsonb default null
)
returns jsonb
language plpgsql
stable
as $$
declare
  cfg jsonb := coalesce(p_config, private.capture_config());
  b public.capture_balls%rowtype;
  s public.species%rowtype;
  mult numeric;
  met boolean := false;
  tier jsonb;
  zone text := coalesce(cfg->>'timezone', 'UTC');
  local_hour int;
  start_hour int;
  end_hour int;
begin
  if p_ball is null then
    return jsonb_build_object('key', null, 'name', null, 'multiplier', 1.0,
                              'conditionMet', false, 'guaranteed', false, 'condition', 'NONE');
  end if;
  select * into b from public.capture_balls where key = p_ball;
  if not found then
    return jsonb_build_object('key', p_ball, 'name', private.item_label(p_ball), 'multiplier', 1.0,
                              'conditionMet', false, 'guaranteed', false, 'condition', 'UNKNOWN');
  end if;
  select * into s from public.species where dex = p_dex;
  mult := b.base_multiplier;

  case b.condition_type
    when 'TARGET_TYPE' then
      met := coalesce(s.types, '{}'::text[]) && (
        select coalesce(array_agg(value), '{}'::text[])
        from jsonb_array_elements_text(coalesce(b.condition_config->'types', '[]'::jsonb))
      );
    when 'NIGHT' then
      start_hour := coalesce((b.condition_config->>'startHour')::int, 18);
      end_hour := coalesce((b.condition_config->>'endHour')::int, 6);
      local_hour := extract(hour from (p_at at time zone zone))::int;
      met := case
        when start_hour > end_hour then local_hour >= start_hour or local_hour < end_hour
        else local_hour >= start_hour and local_hour < end_hour
      end;
    when 'PLAYER_OWNS_SPECIES' then
      met := coalesce(p_owns_species, false);
    when 'SPECIES_CATCH_RATE_MIN' then
      met := coalesce(s.catch_rate, 0) >= coalesce((b.condition_config->>'min')::int, 999);
    when 'SPECIES_BASE_SPEED_MIN' then
      met := coalesce(s.base_speed, 0) >= coalesce((b.condition_config->>'min')::int, 999);
    when 'MOON_STONE_FAMILY' then
      met := coalesce(s.moon_stone_family, false);
    when 'SPECIES_WEIGHT_TIERS' then
      select t into tier
      from jsonb_array_elements(coalesce(b.condition_config->'tiers', '[]'::jsonb)) t
      where coalesce(s.weight_kg, 0) >= (t->>'minKg')::numeric
      order by (t->>'minKg')::numeric desc
      limit 1;
      if tier is not null then
        met := true;
        mult := (tier->>'multiplier')::numeric;
      end if;
    else
      met := false;
  end case;

  if met and b.conditional_multiplier is not null and b.condition_type <> 'SPECIES_WEIGHT_TIERS' then
    mult := b.conditional_multiplier;
  end if;

  return jsonb_build_object(
    'key', b.key,
    'name', b.name,
    'multiplier', mult,
    'conditionMet', met,
    'condition', b.condition_type,
    'guaranteed', b.guaranteed_capture
  );
end;
$$;

create or replace function private.capture_berry_modifier(p_item text)
returns jsonb
language sql
stable
as $$
  select coalesce(
    (
      select jsonb_build_object(
        'key', b.key, 'name', b.name, 'multiplier', b.capture_multiplier,
        'rewardBonus', b.reward_bonus
      )
      from public.capture_berries b
      where b.key = p_item and b.enabled and b.capture_enabled
    ),
    jsonb_build_object('key', null, 'name', null, 'multiplier', 1.0, 'rewardBonus', 0)
  );
$$;

-- Community Honey. Participation rate drives a capped curve so a 100 Trainer
-- encounter is never inherently easier than a 10 Trainer one.
create or replace function private.capture_honey_modifier(
  p_contributors int,
  p_participants int,
  p_config jsonb default null
)
returns jsonb
language sql
stable
as $$
  with cfg as (select coalesce(p_config, private.capture_config()) as c),
  rate as (
    select least(1.0,
      greatest(0, coalesce(p_contributors, 0))::numeric / greatest(coalesce(p_participants, 0), 1)::numeric
    ) as r
  )
  select jsonb_build_object(
    'contributors', greatest(0, coalesce(p_contributors, 0)),
    'participants', greatest(0, coalesce(p_participants, 0)),
    'rate', rate.r,
    'multiplier', coalesce((
      select (t->>'multiplier')::numeric
      from cfg, jsonb_array_elements(coalesce(nullif(cfg.c->'honeyTiers', 'null'::jsonb), '[]'::jsonb)) t
      where rate.r >= (t->>'minRate')::numeric
      order by (t->>'minRate')::numeric desc
      limit 1
    ), 1.0)
  )
  from rate;
$$;

-- Single source of truth for capture odds. No side effects, so diagnostics and
-- the simulator can call it freely.
create or replace function private.capture_chance(
  p_dex int,
  p_ball text,
  p_berry text default null,
  p_honey_contributors int default 0,
  p_honey_participants int default 0,
  p_contributed_honey boolean default false,
  p_owns_species boolean default false,
  p_is_shiny boolean default false,
  p_other_multiplier numeric default 1.0,
  p_at timestamptz default now(),
  p_config jsonb default null
)
returns jsonb
language plpgsql
stable
as $$
declare
  cfg jsonb := coalesce(p_config, private.capture_config());
  s public.species%rowtype;
  base numeric;
  ball jsonb;
  berry jsonb;
  honey jsonb;
  contributor numeric;
  shiny numeric;
  event numeric;
  other numeric := coalesce(p_other_multiplier, 1.0);
  raw numeric;
  final numeric;
  min_chance numeric := coalesce((cfg->>'minChance')::numeric, 0.02);
  max_chance numeric := coalesce((cfg->>'maxChance')::numeric, 0.85);
begin
  select * into s from public.species where dex = p_dex;
  base := private.capture_base_chance(s.catch_rate, cfg);
  ball := private.capture_ball_modifier(p_ball, p_dex, p_owns_species, p_at, cfg);
  berry := private.capture_berry_modifier(p_berry);
  honey := private.capture_honey_modifier(p_honey_contributors, p_honey_participants, cfg);
  contributor := case
    when coalesce(p_contributed_honey, false) then coalesce((cfg->>'honeyContributorBonus')::numeric, 1.0)
    else 1.0
  end;
  shiny := case when coalesce(p_is_shiny, false)
    then coalesce((cfg->>'shinyMultiplier')::numeric, 1.0) else 1.0 end;
  event := coalesce((cfg->>'eventMultiplier')::numeric, 1.0);

  raw := base
       * (ball->>'multiplier')::numeric
       * (berry->>'multiplier')::numeric
       * (honey->>'multiplier')::numeric
       * contributor
       * shiny
       * event
       * other;

  if coalesce((ball->>'guaranteed')::boolean, false) then
    final := 1.0;
  else
    final := least(max_chance, greatest(min_chance, raw));
  end if;

  return jsonb_build_object(
    'dex', p_dex,
    'species', s.name,
    'catchRate', s.catch_rate,
    'baseChance', base,
    'ball', ball,
    'berry', berry,
    'honey', honey,
    'honeyContributorMultiplier', contributor,
    'shinyMultiplier', shiny,
    'eventMultiplier', event,
    'otherMultiplier', other,
    'rawChance', raw,
    'finalChance', final,
    'guaranteed', coalesce((ball->>'guaranteed')::boolean, false),
    'minChance', min_chance,
    'maxChance', max_chance
  );
end;
$$;

-- Gathers a live encounter's inputs and hands them to capture_chance.
create or replace function private.capture_round_context(p_round uuid, p_uid uuid)
returns jsonb
language plpgsql
stable
as $$
declare
  r public.encounter_rounds%rowtype;
  ep public.encounter_players%rowtype;
  contributors int;
  participants int;
  owns boolean;
begin
  select * into r from public.encounter_rounds where id = p_round;
  if not found then
    return null;
  end if;
  select * into ep from public.encounter_players where round_id = p_round and user_id = p_uid;
  select count(*)::int, count(*) filter (where prep = 'bait')::int
    into participants, contributors
    from public.encounter_players where round_id = p_round;
  select exists (
    select 1 from public.catches c where c.user_id = p_uid and c.dex = r.dex
  ) into owns;
  return private.capture_chance(
    r.dex,
    ep.ball,
    case when ep.prep = 'bait' then null else ep.prep end,
    contributors,
    participants,
    ep.prep = 'bait',
    owns,
    r.variant = 'shiny',
    1.0,
    now()
  );
end;
$$;
