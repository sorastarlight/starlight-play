-- Species without a distinct female sprite (Eevee, etc.) were stored as
-- shiny-female/female and the image 404'd. Use female_visual_dex() the same
-- way collection and loot already do.

create or replace function private.launch_community_round(
  p_dex int,
  p_gender text,
  p_shiny boolean,
  p_source text,
  p_test boolean default false
)
returns public.encounter_rounds
language plpgsql
as $$
declare
  r public.encounter_rounds;
  settings jsonb;
  chosen_dex int;
  chosen_name text;
  chosen_variant text := 'normal';
  chosen_gender text;
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
  insert into public.encounter_rounds (
    phase, hidden, pokemon, dex, name, variant, gender, started_at, deadlines, rules, resolved, cancelled, last_action, ends_at, trigger_source, source
  ) values (
    'join', false,
    jsonb_build_object('dex', chosen_dex, 'name', chosen_name, 'variant', chosen_variant, 'gender', chosen_gender, 'location', private.lgpe_habitat(chosen_dex)),
    chosen_dex, chosen_name, chosen_variant, chosen_gender, t, deadlines, settings, false, false,
    chosen_name || ' appeared!',
    (deadlines->>'join')::timestamptz,
    p_source,
    'play'
  ) returning * into r;
  return r;
end;
$$;
