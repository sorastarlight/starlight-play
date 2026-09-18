-- Cosplay Pikachu: authoritative COSPLAY kind + Female-only gender lock.
-- Cap / Gigantamax / Base stay distinct. Normal spawn containment unchanged.

alter table public.pokemon_forms
  add column if not exists forced_gender text null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'pokemon_forms_forced_gender_check'
  ) then
    alter table public.pokemon_forms
      add constraint pokemon_forms_forced_gender_check
      check (forced_gender is null or forced_gender in ('Male', 'Female', 'Genderless'));
  end if;
end $$;

-- Cosplay family (catalog form_key authority — not FormId hardcoding alone).
update public.pokemon_forms
   set kind = 'cosplay',
       forced_gender = 'Female'
 where dex = 25
   and form_key in ('rock-star', 'belle', 'pop-star', 'phd', 'libre', 'cosplay');

-- Cap family
update public.pokemon_forms
   set kind = 'cap',
       forced_gender = null
 where dex = 25
   and form_key like '%cap%';

-- Starter / partner outfits are not Cosplay
update public.pokemon_forms
   set kind = 'starter',
       forced_gender = null
 where form_key = 'starter';

-- Resolve / enforce forced gender. Explicit wrong gender raises; null/roll coerces.
create or replace function private.resolve_form_gender(
  p_form_id integer,
  p_gender text
)
returns text
language plpgsql
stable
as $function$
declare
  fg text;
begin
  select forced_gender into fg
    from public.pokemon_forms
   where pokemon_form_id = p_form_id;
  if fg is not null then
    if p_gender is not null
       and p_gender in ('Male', 'Female', 'Genderless')
       and p_gender is distinct from fg then
      raise exception 'Form % requires gender % (got %).', p_form_id, fg, p_gender;
    end if;
    return fg;
  end if;
  return p_gender;
end;
$function$;

revoke all on function private.resolve_form_gender(integer, text) from public;

create or replace function private.launch_community_round(
  p_dex integer,
  p_gender text,
  p_shiny boolean,
  p_source text,
  p_test boolean default false,
  p_form_id integer default null
)
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
  chosen_form int;
  chosen_form_label text;
  round_id uuid := gen_random_uuid();
  t timestamptz := now();
  deadlines jsonb;
  female_look boolean;
  test_out text;
  loc text;
  sev jsonb;
  vpol text;
  guc_form text;
  forced_g text;
begin
  r := private.sync_latest_round();
  if private.round_is_active(r) then
    raise exception 'A community round is already running.';
  end if;
  if exists (select 1 from private.special_events where status = 'LIVE')
     and nullif(current_setting('play.special_event_id', true), '') is null
     and coalesce(p_source, '') is distinct from 'TEST' then
    raise exception 'A Special Event is live. Normal encounters cannot overwrite it.';
  end if;
  settings := private.game_settings();
  if p_test then
    settings := coalesce(settings, '{}'::jsonb) || jsonb_build_object(
      'rewardMode', 'test',
      'testMode', true,
      'joinSeconds', 6,
      'prepareSeconds', 6,
      'throwSeconds', 6,
      'revealSeconds', 8
    );
    test_out := nullif(btrim(current_setting('play.test_outcome', true)), '');
    if test_out in ('catch', 'escape') then
      settings := settings || jsonb_build_object('testOutcome', test_out);
    end if;
    if current_setting('play.test_rewards', true) = 'true' then
      settings := settings || jsonb_build_object('testRewards', true);
    end if;
  end if;
  if p_dex is null then
    chosen_dex := private.spawn_pick_random_dex();
    chosen_form := private.canonical_form_id(chosen_dex, chosen_dex);
  else
    chosen_dex := p_dex;
    guc_form := nullif(btrim(current_setting('play.special_form_id', true)), '');
    chosen_form := coalesce(p_form_id, nullif(guc_form, '')::int, chosen_dex);
    if upper(coalesce(p_source, '')) = 'AUTO' then
      chosen_form := chosen_dex;
    end if;
    chosen_form := private.assert_form_launchable(chosen_dex, chosen_form, p_source);
  end if;
  if chosen_dex < 1 or chosen_dex > 1025 then
    raise exception 'Choose a Pokédex number from 1 to 1025.';
  end if;
  if private.spawn_band(chosen_dex) in ('LEGENDARY', 'EVENT') then
    if coalesce(p_source, '') = 'SPECIAL_EVENT'
       and nullif(current_setting('play.special_event_id', true), '') is not null then
      null;
    elsif coalesce(p_source, '') in ('ADMIN', 'ADMIN_SPECIFIC', 'TEST') and p_dex is not null then
      null;
    else
      raise exception 'Legendary and Event species can only appear through a Special Event.';
    end if;
  end if;
  if upper(coalesce(p_source, '')) = 'AUTO' and not private.form_is_base(chosen_form) then
    raise exception 'Alternate forms cannot appear in normal encounters.';
  end if;
  chosen_name := private.form_display_name(chosen_dex, chosen_form);
  select f.form_label, f.forced_gender
    into chosen_form_label, forced_g
    from public.pokemon_forms f
   where f.pokemon_form_id = chosen_form;

  -- Gender: forced forms reject explicit illegal gender; otherwise roll or accept.
  if forced_g is not null then
    if p_gender is not null
       and p_gender in ('Male', 'Female', 'Genderless')
       and p_gender is distinct from forced_g then
      raise exception 'Form % requires gender % (got %).', chosen_form, forced_g, p_gender;
    end if;
    chosen_gender := forced_g;
  elsif p_gender in ('Male', 'Female', 'Genderless') then
    chosen_gender := p_gender;
  else
    chosen_gender := private.lgpe_roll_gender(chosen_dex, floor(random() * 2147483647)::int, null);
  end if;

  female_look := chosen_gender = 'Female'
    and private.form_is_base(chosen_form)
    and chosen_dex = any (private.female_visual_dex());
  vpol := upper(coalesce(nullif(current_setting('play.special_variant_policy', true), ''), ''));
  if vpol = 'FORCED_SHINY' then
    p_shiny := true;
  elsif vpol = 'DISABLED' then
    p_shiny := false;
  end if;
  if p_shiny is true then
    chosen_variant := case when female_look then 'shiny-female' else 'shiny' end;
  elsif p_shiny is false then
    chosen_variant := case when female_look then 'female' else 'normal' end;
  elsif random() < (1.0 / 4096.0) then
    chosen_variant := case when female_look then 'shiny-female' else 'shiny' end;
  else
    chosen_variant := case when female_look then 'female' else 'normal' end;
  end if;
  loc := coalesce(nullif(current_setting('play.special_location', true), ''), private.lgpe_habitat(chosen_dex));
  begin
    sev := nullif(current_setting('play.special_event_json', true), '')::jsonb;
  exception when others then
    sev := null;
  end;
  if sev is not null then
    settings := coalesce(settings, '{}'::jsonb) || jsonb_build_object('specialEvent', sev);
  end if;
  deadlines := private.round_deadlines(settings, t);
  chosen_level := private.encounter_pokemon_level(chosen_dex, round_id);
  insert into public.encounter_rounds (
    id, phase, hidden, pokemon, dex, name, variant, gender, pokemon_form_id,
    started_at, deadlines, rules, resolved, cancelled, last_action, ends_at, trigger_source, source
  ) values (
    round_id, 'join', false,
    jsonb_build_object(
      'dex', chosen_dex,
      'name', chosen_name,
      'variant', chosen_variant,
      'gender', chosen_gender,
      'location', loc,
      'level', chosen_level,
      'formId', chosen_form,
      'formKey', coalesce((select form_key from public.pokemon_forms where pokemon_form_id = chosen_form), 'base'),
      'formLabel', coalesce(chosen_form_label, 'Base'),
      'isBaseForm', private.form_is_base(chosen_form)
    ),
    chosen_dex, chosen_name, chosen_variant, chosen_gender, chosen_form,
    t, deadlines, settings, false, false,
    case when p_test then '[TEST MODE] ' else '' end || chosen_name || ' appeared!',
    (deadlines->>'join')::timestamptz,
    p_source,
    'play'
  ) returning * into r;
  return r;
end;
$function$;

-- Special Event upsert: coerce / reject gender against forced_gender.
create or replace function private.special_event_upsert(p_payload jsonb)
returns private.special_events
language plpgsql
as $$
declare
  e private.special_events;
  payload jsonb := coalesce(p_payload, '{}'::jsonb);
  preset jsonb;
  v_id uuid := nullif(payload->>'id', '')::uuid;
  v_dex int;
  v_form int;
  pref_gender text;
  forced_g text;
  presentation jsonb;
begin
  if v_id is not null then
    select * into e from private.special_events where id = v_id for update;
    if e.id is null then
      raise exception 'Special Event not found.';
    end if;
    if e.status not in ('DRAFT', 'SCHEDULED', 'NEEDS_ADMIN', 'WAITING_FOR_STREAM') then
      raise exception 'Only draft, scheduled, or waiting events can be edited.';
    end if;
  end if;
  v_dex := coalesce(nullif(payload->>'dex', '')::int, e.dex);
  if v_dex is null then
    raise exception 'Pick a Pokémon.';
  end if;
  v_form := private.canonical_form_id(
    v_dex,
    coalesce(nullif(payload->>'formId', '')::int, nullif(payload->>'pokemonFormId', '')::int, e.pokemon_form_id, v_dex)
  );
  perform private.assert_form_launchable(v_dex, v_form, 'SPECIAL_EVENT');

  select forced_gender into forced_g from public.pokemon_forms where pokemon_form_id = v_form;
  pref_gender := coalesce(
    nullif(btrim(payload->>'gender'), ''),
    nullif(btrim(payload->'presentation'->>'gender'), '')
  );
  if forced_g is not null then
    if pref_gender is not null
       and pref_gender in ('Male', 'Female', 'Genderless')
       and pref_gender is distinct from forced_g then
      raise exception 'Form % requires gender % (got %).', v_form, forced_g, pref_gender;
    end if;
    pref_gender := forced_g;
  end if;

  presentation := coalesce(payload->'presentation', '{}'::jsonb);
  if pref_gender is not null then
    presentation := presentation || jsonb_build_object('gender', pref_gender);
  end if;
  payload := payload || jsonb_build_object('presentation', presentation);

  preset := private.special_event_preset(v_dex);
  if v_id is null then
    insert into private.special_events (
      event_type, dex, pokemon_form_id, variant_policy, location_key, location_label, title, subtitle, announcement,
      starts_at, ends_at, encounter_count, auto_advance, visibility, presentation, status, repeat_policy, created_by, notes
    ) values (
      coalesce(nullif(upper(payload->>'eventType'), ''), preset->>'eventType'),
      v_dex,
      v_form,
      coalesce(nullif(upper(payload->>'variantPolicy'), ''), preset->>'variantPolicy'),
      coalesce(nullif(payload->>'locationKey', ''), preset->>'locationKey'),
      coalesce(nullif(payload->>'locationLabel', ''), preset->>'locationLabel'),
      coalesce(nullif(btrim(payload->>'title'), ''), preset->>'title'),
      coalesce(nullif(btrim(payload->>'subtitle'), ''), preset->>'subtitle'),
      coalesce(nullif(btrim(payload->>'announcement'), ''), preset->>'announcement'),
      nullif(payload->>'startsAt', '')::timestamptz,
      nullif(payload->>'endsAt', '')::timestamptz,
      coalesce(nullif(payload->>'encounterCount', '')::int, (preset->>'encounterCount')::int, 1),
      coalesce((payload->>'autoAdvance')::boolean, true),
      coalesce(nullif(upper(payload->>'visibility'), ''), preset->>'visibility'),
      presentation,
      'DRAFT',
      coalesce(nullif(upper(payload->>'repeatPolicy'), ''), preset->>'repeatPolicy'),
      auth.uid(),
      nullif(payload->>'notes', '')
    ) returning * into e;
  else
    update private.special_events
       set event_type = coalesce(nullif(upper(payload->>'eventType'), ''), event_type),
           dex = v_dex,
           pokemon_form_id = v_form,
           variant_policy = coalesce(nullif(upper(payload->>'variantPolicy'), ''), variant_policy),
           location_key = coalesce(nullif(payload->>'locationKey', ''), location_key),
           location_label = coalesce(nullif(payload->>'locationLabel', ''), location_label),
           title = coalesce(nullif(btrim(payload->>'title'), ''), title),
           subtitle = coalesce(nullif(btrim(payload->>'subtitle'), ''), subtitle),
           announcement = coalesce(nullif(btrim(payload->>'announcement'), ''), announcement),
           starts_at = case when payload ? 'startsAt' then nullif(payload->>'startsAt', '')::timestamptz else starts_at end,
           ends_at = case when payload ? 'endsAt' then nullif(payload->>'endsAt', '')::timestamptz else ends_at end,
           encounter_count = coalesce(nullif(payload->>'encounterCount', '')::int, encounter_count),
           auto_advance = coalesce((payload->>'autoAdvance')::boolean, auto_advance),
           visibility = coalesce(nullif(upper(payload->>'visibility'), ''), visibility),
           presentation = presentation,
           repeat_policy = coalesce(nullif(upper(payload->>'repeatPolicy'), ''), repeat_policy),
           notes = case when payload ? 'notes' then nullif(payload->>'notes', '') else notes end,
           updated_at = now()
     where id = e.id
     returning * into e;
  end if;
  return e;
end;
$$;

-- Integrity: Cosplay family is Female-only; Cap is not Cosplay.
do $$
declare
  bad int;
begin
  select count(*) into bad
    from public.pokemon_forms
   where dex = 25
     and form_key in ('rock-star', 'belle', 'pop-star', 'phd', 'libre', 'cosplay')
     and (kind is distinct from 'cosplay' or forced_gender is distinct from 'Female');
  if bad <> 0 then
    raise exception 'Cosplay Pikachu gender/kind integrity failed (% rows).', bad;
  end if;
  select count(*) into bad
    from public.pokemon_forms
   where dex = 25 and form_key like '%cap%' and kind = 'cosplay';
  if bad <> 0 then
    raise exception 'Cap Pikachu incorrectly classified as Cosplay.';
  end if;
end $$;
