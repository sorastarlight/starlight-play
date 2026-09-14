-- Assign wild Pokémon level from existing habitat bounds at encounter time.
-- Display and catch use the same round-seeded value. Does not change capture odds.

create or replace function private.encounter_pokemon_level(p_dex int, p_round_id uuid)
returns int
language sql
immutable
as $$
  select case
    when p_dex is null or p_round_id is null then null
    else bounds[1] + (
      abs(('x' || substr(md5(p_round_id::text), 1, 8))::bit(32)::int)
      % (greatest(bounds[2] - bounds[1], 0) + 1)
    )
  end
  from (select private.lgpe_level_bounds(p_dex) as bounds) s;
$$;

create or replace function private.stamp_catch_row(c catches)
returns catches
language plpgsql
as $function$
declare
  seed int;
  bounds int[];
  size_roll int;
  scale numeric;
  jitter numeric;
  trainer public.profiles%rowtype;
begin
  if c.public_id is null or btrim(c.public_id) = '' then
    c.public_id := 'LG' || lpad(nextval('public.catch_serial')::text, 8, '0');
  end if;
  seed := abs(('x' || substr(md5(c.id::text), 1, 8))::bit(32)::int);
  bounds := private.lgpe_level_bounds(c.dex);
  if c.level is null then
    if c.round_id is not null then
      c.level := private.encounter_pokemon_level(c.dex, c.round_id);
    else
      c.level := bounds[1] + (seed % (greatest(bounds[2] - bounds[1], 0) + 1));
    end if;
  end if;
  if c.iv_hp is null then c.iv_hp := (('x' || substr(md5(c.id::text || 'hp'), 1, 2))::bit(8)::int) % 32; end if;
  if c.iv_atk is null then c.iv_atk := (('x' || substr(md5(c.id::text || 'atk'), 1, 2))::bit(8)::int) % 32; end if;
  if c.iv_def is null then c.iv_def := (('x' || substr(md5(c.id::text || 'def'), 1, 2))::bit(8)::int) % 32; end if;
  if c.iv_spa is null then c.iv_spa := (('x' || substr(md5(c.id::text || 'spa'), 1, 2))::bit(8)::int) % 32; end if;
  if c.iv_spd is null then c.iv_spd := (('x' || substr(md5(c.id::text || 'spd'), 1, 2))::bit(8)::int) % 32; end if;
  if c.iv_spe is null then c.iv_spe := (('x' || substr(md5(c.id::text || 'spe'), 1, 2))::bit(8)::int) % 32; end if;
  if c.av_hp is null then c.av_hp := 0; end if;
  if c.av_atk is null then c.av_atk := 0; end if;
  if c.av_def is null then c.av_def := 0; end if;
  if c.av_spa is null then c.av_spa := 0; end if;
  if c.av_spd is null then c.av_spd := 0; end if;
  if c.av_spe is null then c.av_spe := 0; end if;
  if c.size_class is null or c.size_class not in ('XS','S','M','L','XL') then
    size_roll := seed % 256;
    c.size_class := case
      when size_roll < 12 then 'XS'
      when size_roll < 72 then 'S'
      when size_roll < 184 then 'M'
      when size_roll < 244 then 'L'
      else 'XL'
    end;
  end if;
  if c.moves is null or cardinality(c.moves) = 0 then
    c.moves := private.lgpe_pick_moves(c.dex, c.level);
  end if;
  c.gender := private.lgpe_roll_gender(c.dex, seed, c.gender);
  if c.met_level is null then
    c.met_level := c.level;
  end if;
  if c.met_location is null or btrim(c.met_location) = '' then
    c.met_location := private.lgpe_habitat(c.dex);
  end if;
  if c.friendship is null then
    c.friendship := 0;
  end if;
  scale := case c.size_class
    when 'XS' then 0.81
    when 'S' then 0.91
    when 'L' then 1.09
    when 'XL' then 1.21
    else 1.0
  end;
  jitter := 0.97 + ((seed / 23) % 7) * 0.01;
  if c.height_m is null then
    c.height_m := round((0.4 + (c.dex % 17) * 0.08) * scale * jitter, 2);
  end if;
  if c.weight_kg is null then
    c.weight_kg := round((5.0 + (c.dex % 29) * 1.7) * scale * jitter, 1);
  end if;
  if c.ot_user_id is null then
    c.ot_user_id := c.user_id;
  end if;
  if c.ot_name is null or btrim(c.ot_name) = '' or c.ot_number is null then
    select * into trainer from public.profiles where id = coalesce(c.ot_user_id, c.user_id);
    if c.ot_name is null or btrim(c.ot_name) = '' then
      c.ot_name := coalesce(nullif(btrim(trainer.display_name), ''), nullif(trainer.twitch_login, ''), 'Trainer');
    end if;
    if c.ot_number is null and trainer.id is not null then
      c.ot_number := 10000 + (abs(hashtext(trainer.id::text)) % 90000);
    end if;
  end if;
  return c;
end;
$function$;

create or replace function private.launch_community_round(p_dex integer, p_gender text, p_shiny boolean, p_source text, p_test boolean default false)
returns encounter_rounds
language plpgsql
as $function$
declare
  r public.encounter_rounds;
  settings jsonb;
  chosen_dex int;
  chosen_name text;
  chosen_variant text := 'normal';
  chosen_gender text;
  chosen_level int;
  round_id uuid := gen_random_uuid();
  t timestamptz := now();
  deadlines jsonb;
  female_look boolean;
begin
  r := private.sync_latest_round();
  if private.round_is_active(r) then
    raise exception 'A community round is already running.';
  end if;
  settings := private.game_settings();
  if p_test then
    settings := coalesce(settings, '{}'::jsonb) || jsonb_build_object('rewardMode', 'test');
  end if;
  if p_dex is null then
    chosen_dex := private.spawn_pick_random_dex();
  else
    chosen_dex := p_dex;
  end if;
  if chosen_dex < 1 or chosen_dex > 151 then
    raise exception 'Choose a Pokédex number from 1 to 151.';
  end if;
  select name into chosen_name from public.species where dex = chosen_dex;
  if p_gender in ('Male', 'Female', 'Genderless') then
    chosen_gender := p_gender;
  else
    chosen_gender := private.lgpe_roll_gender(chosen_dex, floor(random() * 2147483647)::int, null);
  end if;
  female_look := chosen_gender = 'Female' and chosen_dex = any (private.female_visual_dex());
  if p_shiny is true then
    chosen_variant := case when female_look then 'shiny-female' else 'shiny' end;
  elsif p_shiny is false then
    chosen_variant := case when female_look then 'female' else 'normal' end;
  elsif random() < (1.0 / 4096.0) then
    chosen_variant := case when female_look then 'shiny-female' else 'shiny' end;
  else
    chosen_variant := case when female_look then 'female' else 'normal' end;
  end if;
  deadlines := private.round_deadlines(settings, t);
  chosen_level := private.encounter_pokemon_level(chosen_dex, round_id);
  insert into public.encounter_rounds (
    id, phase, hidden, pokemon, dex, name, variant, gender, started_at, deadlines, rules, resolved, cancelled, last_action, ends_at, trigger_source, source
  ) values (
    round_id, 'join', false,
    jsonb_build_object('dex', chosen_dex, 'name', chosen_name, 'variant', chosen_variant, 'gender', chosen_gender, 'location', private.lgpe_habitat(chosen_dex), 'level', chosen_level),
    chosen_dex, chosen_name, chosen_variant, chosen_gender, t, deadlines, settings, false, false,
    chosen_name || ' appeared!',
    (deadlines->>'join')::timestamptz,
    p_source,
    'play'
  ) returning * into r;
  return r;
end;
$function$;

create or replace function private.public_round_json(r encounter_rounds)
returns jsonb
language plpgsql
stable
as $function$
declare
  ph text; participants int; prepared int; thrown int; bait_count int; honey_calc jsonb; activity jsonb; honey jsonb; catchers jsonb; throwers jsonb; settled boolean; species_types text[];
  shown_level int;
begin
  if r is null then return null; end if;
  ph := private.round_phase(r);
  select s.types into species_types from public.species s where s.dex = r.dex;
  select count(*)::int, count(*) filter (where prep is not null)::int, count(*) filter (where ball is not null)::int, count(*) filter (where prep = 'bait')::int
    into participants, prepared, thrown, bait_count from public.encounter_players where round_id = r.id;
  honey_calc := private.capture_honey_modifier(bait_count, participants);
  select coalesce(jsonb_agg(row_to_json(x)::jsonb), '[]'::jsonb) into activity from (
    select a.display_name as name, a.kind, a.item, a.created_at as at from public.encounter_activity a where a.round_id = r.id order by a.created_at desc, a.id desc limit 40) x;
  select coalesce(jsonb_agg(jsonb_build_object('name', coalesce(private.trainer_label(ep.user_id), 'Trainer')) order by coalesce(private.trainer_label(ep.user_id), 'Trainer')), '[]'::jsonb)
    into honey from public.encounter_players ep where ep.round_id = r.id and ep.prep = 'bait';
  select coalesce(jsonb_agg(jsonb_build_object('name', coalesce(private.trainer_label(ep.user_id), 'Trainer'), 'ball', ep.ball) order by coalesce(private.trainer_label(ep.user_id), 'Trainer')), '[]'::jsonb)
    into throwers from public.encounter_players ep where ep.round_id = r.id and ep.ball is not null;
  select exists (select 1 from public.encounter_players ep where ep.round_id = r.id and ep.result is not null) into settled;
  if settled then
    select coalesce(jsonb_agg(jsonb_build_object('name', coalesce(private.trainer_label(ep.user_id), 'Trainer'), 'ball', ep.ball) order by coalesce(private.trainer_label(ep.user_id), 'Trainer')), '[]'::jsonb)
      into catchers from public.encounter_players ep where ep.round_id = r.id and coalesce(ep.caught, false);
  else catchers := '[]'::jsonb; end if;
  shown_level := coalesce(nullif(r.pokemon->>'level', '')::int, private.encounter_pokemon_level(r.dex, r.id));
  if shown_level is not null and shown_level < 1 then shown_level := null; end if;
  return jsonb_build_object(
    'id', r.id, 'source', r.source, 'phase', ph, 'overlayPhase', r.phase, 'paused', private.round_paused(r), 'hidden', r.hidden, 'cancelled', r.cancelled, 'resolved', r.resolved, 'pausedAt', r.paused_at,
    'pausedForBreak', private.director_has_reason(coalesce(r.pause_reasons, '[]'::jsonb), 'AD'),
    'pauseReasons', coalesce(r.pause_reasons, '[]'::jsonb),
    'triggerSource', r.trigger_source,
    'dex', r.dex, 'name', r.name, 'variant', r.variant, 'gender', r.gender, 'level', shown_level, 'types', coalesce(to_jsonb(species_types), '[]'::jsonb),
    'location', coalesce(nullif(r.pokemon->>'location', ''), private.lgpe_habitat(r.dex)), 'startedAt', r.started_at, 'endsAt', private.phase_display_ends(r, ph), 'deadlines', r.deadlines,
    'participants', participants, 'prepared', prepared, 'thrown', thrown, 'honeyContributors', bait_count, 'honeyParticipants', participants,
    'honeyMultiplier', (honey_calc->>'multiplier')::numeric, 'baitBonusPercent', round(100 * ((honey_calc->>'multiplier')::numeric - 1), 1),
    'lastAction', r.last_action, 'activity', activity, 'honeyTrainers', coalesce(honey, '[]'::jsonb), 'throwers', coalesce(throwers, '[]'::jsonb), 'catchers', coalesce(catchers, '[]'::jsonb),
    'results', case when settled then (select jsonb_build_object('caught', count(*) filter (where coalesce(caught, false))::int, 'escaped', count(*) filter (where result = 'Escaped')::int, 'noThrow', count(*) filter (where coalesce(result, '') = 'No throw')::int, 'catchers', coalesce(catchers, '[]'::jsonb)) from public.encounter_players where round_id = r.id) else null end
  );
end;
$function$;
