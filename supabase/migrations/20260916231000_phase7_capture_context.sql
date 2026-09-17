-- Phase 7 capture context without changing capture_chance signature.
-- Context rides on capture_config._context so settlement/advice can pass throw timing.

create or replace function private.capture_throw_context(
  p_round public.encounter_rounds,
  p_uid uuid,
  p_ball_at timestamptz default null
)
returns jsonb
language plpgsql
stable
as $$
declare
  prepare_at timestamptz;
  throw_at timestamptz;
  used timestamptz := coalesce(p_ball_at, now());
  progress numeric := 0.5;
  lvl int := 1;
  g text := '';
begin
  if p_round.deadlines is not null then
    prepare_at := (p_round.deadlines->>'prepare')::timestamptz;
    throw_at := coalesce((p_round.deadlines->>'throw')::timestamptz, (p_round.deadlines->>'reveal')::timestamptz);
    if prepare_at is not null and throw_at is not null and throw_at > prepare_at then
      progress := extract(epoch from (used - prepare_at)) / extract(epoch from (throw_at - prepare_at));
    end if;
  end if;
  select private.trainer_level(xp) into lvl from public.profiles where id = p_uid;
  g := coalesce(p_round.gender, '');
  return jsonb_build_object(
    'throwProgress', progress,
    'trainerLevel', coalesce(lvl, 1),
    'gender', g
  );
end;
$$;

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
  ctx jsonb := coalesce(cfg->'_context', '{}'::jsonb);
  b public.capture_balls%rowtype;
  s public.species%rowtype;
  mult numeric;
  met boolean := false;
  tier jsonb;
  zone text := coalesce(cfg->>'timezone', 'UTC');
  local_hour int;
  start_hour int;
  end_hour int;
  progress numeric := coalesce((ctx->>'throwProgress')::numeric, 0.5);
  trainer_level int := coalesce((ctx->>'trainerLevel')::int, 1);
  gender text := lower(coalesce(ctx->>'gender', ''));
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
    when 'THROW_EARLY' then
      met := progress <= coalesce((b.condition_config->>'maxProgress')::numeric, 0.34);
    when 'THROW_LATE' then
      met := progress >= coalesce((b.condition_config->>'minProgress')::numeric, 0.66);
    when 'TRAINER_LEVEL_GTE' then
      met := trainer_level >= coalesce((b.condition_config->>'minLevel')::int, 8);
    when 'TARGET_GENDERED' then
      met := gender in ('male', 'female');
    else
      met := false;
  end case;

  if met and b.conditional_multiplier is not null and b.condition_type <> 'SPECIES_WEIGHT_TIERS' then
    mult := b.conditional_multiplier;
  end if;

  return jsonb_build_object(
    'key', b.key, 'name', b.name, 'multiplier', mult,
    'conditionMet', met, 'condition', b.condition_type, 'guaranteed', b.guaranteed_capture
  );
end;
$$;
