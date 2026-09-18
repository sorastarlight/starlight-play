-- Canonical base FormId = NationalDex. NULL on legacy rows means base.
create or replace function private.canonical_form_id(p_dex integer, p_form_id integer)
returns integer
language plpgsql
stable
as $function$
declare
  f public.pokemon_forms;
begin
  if p_dex is null or p_dex < 1 then
    raise exception 'Invalid species.';
  end if;
  if p_form_id is null or p_form_id = p_dex then
    if not exists (select 1 from public.pokemon_forms where pokemon_form_id = p_dex and is_base) then
      -- Base row missing: still treat NationalDex as base identity.
      return p_dex;
    end if;
    return p_dex;
  end if;
  select * into f from public.pokemon_forms where pokemon_form_id = p_form_id;
  if f.pokemon_form_id is null then
    raise exception 'Unknown form id %.', p_form_id;
  end if;
  if f.dex is distinct from p_dex then
    raise exception 'Form % does not belong to species %.', p_form_id, p_dex;
  end if;
  return f.pokemon_form_id;
end;
$function$;

create or replace function private.form_is_base(p_form_id integer)
returns boolean
language sql
stable
as $function$
  select coalesce(
    (select is_base from public.pokemon_forms where pokemon_form_id = p_form_id),
    p_form_id is null
    or exists (select 1 from public.species where dex = p_form_id)
  );
$function$;

create or replace function private.form_display_name(p_dex integer, p_form_id integer)
returns text
language plpgsql
stable
as $function$
declare
  f public.pokemon_forms;
  species_name text;
  fid int;
begin
  select name into species_name from public.species where dex = p_dex;
  species_name := coalesce(species_name, 'Pokémon');
  fid := private.canonical_form_id(p_dex, p_form_id);
  select * into f from public.pokemon_forms where pokemon_form_id = fid;
  if f.pokemon_form_id is null or f.is_base then
    return species_name;
  end if;
  return species_name || ' — ' || f.form_label;
end;
$function$;

create or replace function private.assert_form_launchable(
  p_dex integer,
  p_form_id integer,
  p_source text
)
returns integer
language plpgsql
stable
as $function$
declare
  fid int;
  f public.pokemon_forms;
  src text := upper(coalesce(p_source, ''));
begin
  fid := private.canonical_form_id(p_dex, p_form_id);
  select * into f from public.pokemon_forms where pokemon_form_id = fid;
  if f.pokemon_form_id is null then
    -- Allow pure base NationalDex even if catalog row missing.
    if fid = p_dex then return fid; end if;
    raise exception 'Unknown form id %.', fid;
  end if;
  if f.is_base then
    return fid;
  end if;
  -- Non-base forms are NEVER allowed on AUTO / ordinary random paths.
  if src in ('AUTO', '') or src is null then
    raise exception 'Alternate forms cannot appear in normal encounters.';
  end if;
  if src = 'SPECIAL_EVENT' then
    if not f.event_targetable then
      raise exception 'Form % is not event-targetable.', fid;
    end if;
  elsif src in ('ADMIN', 'ADMIN_SPECIFIC', 'TEST', 'QUEUED_SPECIAL') then
    if not f.admin_targetable then
      raise exception 'Form % is not admin-targetable.', fid;
    end if;
  else
    if not (f.admin_targetable or f.event_targetable) then
      raise exception 'Form % cannot be launched.', fid;
    end if;
  end if;
  if f.asset_status is distinct from 'ready' and not f.is_base then
    raise exception 'Form % lacks playable front artwork.', fid;
  end if;
  return fid;
end;
$function$;

-- Drop old launch signatures and recreate with optional form id.
drop function if exists private.launch_community_round(integer, text, boolean, text, boolean);
drop function if exists private.director_start_now(integer, text, boolean, text, boolean);
drop function if exists public.admin_start_round(integer, text, boolean);

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
    -- Hard firewall: ordinary random spawn is always BASE form.
    chosen_form := private.canonical_form_id(chosen_dex, chosen_dex);
  else
    chosen_dex := p_dex;
    guc_form := nullif(btrim(current_setting('play.special_form_id', true)), '');
    chosen_form := coalesce(p_form_id, nullif(guc_form, '')::int, chosen_dex);
    -- AUTO / null-dex path already handled; explicit AUTO with dex still forces base.
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
      null; -- Special Event path
    elsif coalesce(p_source, '') in ('ADMIN', 'ADMIN_SPECIFIC', 'TEST') and p_dex is not null then
      null; -- Intentional Admin/Test targeting (base or form)
    else
      raise exception 'Legendary and Event species can only appear through a Special Event.';
    end if;
  end if;
  -- Non-base forms must never slip into ordinary AUTO even if somehow paired with a special band.
  if upper(coalesce(p_source, '')) = 'AUTO' and not private.form_is_base(chosen_form) then
    raise exception 'Alternate forms cannot appear in normal encounters.';
  end if;
  chosen_name := private.form_display_name(chosen_dex, chosen_form);
  select f.form_label into chosen_form_label from public.pokemon_forms f where f.pokemon_form_id = chosen_form;
  if p_gender in ('Male', 'Female', 'Genderless') then
    chosen_gender := p_gender;
  else
    chosen_gender := private.lgpe_roll_gender(chosen_dex, floor(random() * 2147483647)::int, null);
  end if;
  -- Female visual variants apply to base forms only (current 22/22 support).
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

create or replace function private.director_start_now(
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
  d private.stream_director;
begin
  r := private.launch_community_round(p_dex, p_gender, p_shiny, p_source, p_test, p_form_id);
  select * into d from private.stream_director where id = 1;
  update private.stream_director
    set last_encounter_started_at = now(),
        last_encounter_id = r.id,
        last_encounter_source = p_source,
        queued = case when p_test then queued else null end,
        encounters_auto = encounters_auto + case when p_source = 'AUTO' then 1 else 0 end,
        encounters_manual = encounters_manual + case when p_source in ('ADMIN', 'ADMIN_SPECIFIC') then 1 else 0 end,
        encounters_event = encounters_event + case when p_source in ('QUEUED_SPECIAL', 'SPECIAL_EVENT') then 1 else 0 end,
        updated_at = now()
    where id = 1;
  if not p_test then
    perform private.director_schedule_next('normal');
  end if;
  perform private.director_log(
    'AUTO_ENCOUNTER_STARTED',
    p_source,
    jsonb_build_object(
      'roundId', r.id, 'dex', r.dex, 'name', r.name, 'variant', r.variant,
      'formId', r.pokemon_form_id, 'test', p_test
    )
  );
  return r;
end;
$function$;

create or replace function public.admin_start_round(
  p_dex integer default null,
  p_gender text default null,
  p_shiny boolean default null,
  p_form_id integer default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  a private.twitch_ad_state;
  r public.encounter_rounds;
begin
  if not private.is_play_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  a := private.director_refresh_ad_end();
  if a.ad_active then
    raise exception 'A Twitch ad break is running. Wait, or use Stream Session after the ad.';
  end if;
  r := private.director_start_now(
    p_dex,
    p_gender,
    p_shiny,
    case when p_dex is null then 'ADMIN' else 'ADMIN_SPECIFIC' end,
    false,
    case when p_dex is null then null else p_form_id end
  );
  return private.play_snapshot(auth.uid()) || jsonb_build_object(
    'ok', true,
    'roundId', r.id,
    'dex', r.dex,
    'name', r.name,
    'variant', r.variant,
    'gender', r.gender,
    'formId', r.pokemon_form_id,
    'message', r.name || ' appeared! Trainers can join on the Play page.'
  );
end;
$function$;

grant execute on function public.admin_start_round(integer, text, boolean, integer) to authenticated;

-- Special event upsert / start / json: form-aware.
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
  -- Validate event-targetable for non-base.
  perform private.assert_form_launchable(v_dex, v_form, 'SPECIAL_EVENT');
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
      coalesce(payload->'presentation', '{}'::jsonb),
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
           presentation = coalesce(payload->'presentation', presentation),
           repeat_policy = coalesce(nullif(upper(payload->>'repeatPolicy'), ''), repeat_policy),
           notes = case when payload ? 'notes' then nullif(payload->>'notes', '') else notes end,
           updated_at = now()
     where id = e.id
     returning * into e;
  end if;
  return e;
end;
$$;

create or replace function private.special_event_start_round(p_id uuid)
returns public.encounter_rounds
language plpgsql
as $$
declare
  e private.special_events;
  r public.encounter_rounds;
  next_index int;
  shiny boolean;
  loc text;
  fid int;
begin
  if not pg_try_advisory_xact_lock(hashtextextended(p_id::text, 10)) then
    raise exception 'This Special Event is already starting.';
  end if;
  select * into e from private.special_events where id = p_id for update;
  if e.id is null then
    raise exception 'Special Event not found.';
  end if;
  if e.status in ('CANCELLED', 'COMPLETED', 'DRAFT') then
    raise exception 'This Special Event cannot start rounds in status %.', e.status;
  end if;
  if exists (select 1 from private.special_events where status = 'LIVE' and id is distinct from e.id) then
    raise exception 'Another Special Event is already live.';
  end if;
  if private.director_active_round() is not null then
    raise exception 'An encounter is already active.';
  end if;
  next_index := e.rounds_launched + 1;
  if next_index > e.encounter_count then
    raise exception 'All encounters for this event have already started.';
  end if;
  if exists (select 1 from private.special_event_rounds where event_id = e.id and round_index = next_index) then
    raise exception 'This event round already started.';
  end if;
  loc := coalesce(e.location_label, private.lgpe_habitat(e.dex));
  fid := private.canonical_form_id(e.dex, coalesce(e.pokemon_form_id, e.dex));
  perform set_config('play.special_event_id', e.id::text, true);
  perform set_config('play.special_variant_policy', e.variant_policy, true);
  perform set_config('play.special_location', loc, true);
  perform set_config('play.special_form_id', fid::text, true);
  perform set_config('play.special_event_json', private.special_event_round_meta(e)::text, true);
  shiny := case e.variant_policy
    when 'FORCED_SHINY' then true
    when 'DISABLED' then false
    else null
  end;
  r := private.director_start_now(
    e.dex,
    null,
    shiny,
    'SPECIAL_EVENT',
    e.event_type = 'ADMIN_TEST',
    fid
  );
  insert into private.special_event_rounds (event_id, round_id, round_index)
  values (e.id, r.id, next_index);
  update private.special_events
     set rounds_launched = next_index,
         last_round_id = r.id,
         last_round_at = now(),
         next_round_at = null,
         status = 'LIVE',
         updated_at = now()
   where id = e.id;
  perform private.director_log(
    'SPECIAL_EVENT_ROUND',
    e.event_type,
    jsonb_build_object('eventId', e.id, 'roundId', r.id, 'roundIndex', next_index, 'dex', e.dex, 'formId', fid)
  );
  return r;
end;
$$;

-- Patch special_event_admin_json / round_meta to expose formId (redefine via current body + form fields).
create or replace function private.special_event_round_meta(e private.special_events)
returns jsonb
language sql
stable
as $function$
  select jsonb_build_object(
    'id', e.id,
    'eventType', e.event_type,
    'dex', e.dex,
    'formId', coalesce(e.pokemon_form_id, e.dex),
    'formLabel', coalesce((select form_label from public.pokemon_forms where pokemon_form_id = coalesce(e.pokemon_form_id, e.dex)), 'Base'),
    'displayName', private.form_display_name(e.dex, coalesce(e.pokemon_form_id, e.dex)),
    'variantPolicy', e.variant_policy,
    'locationKey', e.location_key,
    'locationLabel', e.location_label,
    'title', e.title,
    'subtitle', e.subtitle,
    'announcement', e.announcement,
    'encounterCount', e.encounter_count,
    'roundsLaunched', e.rounds_launched,
    'visibility', e.visibility
  );
$function$;

create or replace function private.special_event_admin_json(e private.special_events)
returns jsonb
language sql
stable
as $function$
  select private.special_event_round_meta(e) || jsonb_build_object(
    'status', e.status,
    'startsAt', e.starts_at,
    'endsAt', e.ends_at,
    'autoAdvance', e.auto_advance,
    'repeatPolicy', e.repeat_policy,
    'presentation', e.presentation,
    'notes', e.notes,
    'lastRoundId', e.last_round_id,
    'lastRoundAt', e.last_round_at,
    'nextRoundAt', e.next_round_at,
    'createdAt', e.created_at,
    'updatedAt', e.updated_at,
    'speciesName', (select name from public.species where dex = e.dex)
  );
$function$;

-- Settlement: persist form identity on catch.
create or replace function private.settle_if_needed(r encounter_rounds)
returns encounter_rounds
language plpgsql
as $function$
declare
  rec public.encounter_players%rowtype;
  cfg jsonb;
  calc jsonb;
  bait_count int;
  player_count int;
  owns boolean;
  v_odds numeric;
  v_roll numeric;
  v_caught boolean;
  pending boolean;
  clk timestamptz;
  join_at timestamptz;
  prepare_at timestamptz;
  throw_at timestamptz;
  reveal_at timestamptz;
  throw_line text;
  who text;
  species text;
  test_out text;
  form_id int;
begin
  if r is null or r.cancelled then return r; end if;
  if r.paused_at is not null then return r; end if;
  if not pg_try_advisory_xact_lock(hashtextextended(r.id::text, 0)) then return r; end if;
  select * into r from public.encounter_rounds where id = r.id;
  if r is null or r.cancelled or r.paused_at is not null then return r; end if;
  select exists (select 1 from public.encounter_players ep where ep.round_id = r.id and ep.result is null) into pending;
  if pending = false and r.resolved then return r; end if;
  clk := now();
  form_id := private.canonical_form_id(r.dex, coalesce(r.pokemon_form_id, r.dex));
  species := coalesce(nullif(btrim(r.name), ''), private.form_display_name(r.dex, form_id), 'the Pokémon');
  if r.deadlines is not null then
    join_at := (r.deadlines->>'join')::timestamptz;
    prepare_at := (r.deadlines->>'prepare')::timestamptz;
    throw_at := coalesce((r.deadlines->>'throw')::timestamptz, (r.deadlines->>'reveal')::timestamptz);
    reveal_at := (r.deadlines->>'reveal')::timestamptz;
  end if;
  if join_at is not null and clk >= join_at then
    if not exists (select 1 from public.encounter_players where round_id = r.id) then
      insert into public.play_console_log (round_id, kind, message)
      select r.id, 'cancelled', 'No Trainers joined the encounter. The wild ' || species || ' wandered away!'
      where not exists (select 1 from public.play_console_log l where l.round_id = r.id and l.kind = 'cancelled')
      on conflict do nothing;
      update public.encounter_rounds set cancelled = true, hidden = true, phase = 'closed', resolved = true, paused_at = null,
        last_action = 'No Trainers joined. The wild ' || species || ' wandered away!', updated_at = now() where id = r.id returning * into r;
      return r;
    end if;
    perform private.phase_banner(r.id, 'prepare', 'Trainers are preparing their items…');
  end if;
  if prepare_at is not null and clk >= prepare_at then
    perform private.phase_banner(r.id, 'throw', 'Trainers are choosing their Poké Balls!');
  end if;
  if r.deadlines is not null then
    if throw_at is not null and clk < throw_at then return r; end if;
  elsif private.round_phase(r) in ('join', 'prepare', 'throw') then
    return r;
  end if;
  throw_line := private.announce_throws(r.id);
  if throw_line is not null then
    update public.encounter_rounds set last_action = throw_line, updated_at = now() where id = r.id returning * into r;
  end if;
  if reveal_at is not null and clk < reveal_at then return r; end if;
  if r.deadlines is null and private.round_phase(r) = 'reveal' then return r; end if;
  cfg := private.capture_config();
  test_out := case
    when coalesce(r.trigger_source, '') = 'TEST' then nullif(btrim(coalesce(r.rules->>'testOutcome', '')), '')
    else null
  end;
  select count(*)::int, count(*) filter (where prep = 'bait')::int into player_count, bait_count from public.encounter_players where round_id = r.id;
  for rec in select * from public.encounter_players where round_id = r.id and result is null for update loop
    who := coalesce(private.trainer_label(rec.user_id), 'A trainer');
    if rec.ball is null or rec.result_reason = 'no_ball_left' then
      update public.encounter_players ep set result = 'No throw', caught = false, result_reason = coalesce(ep.result_reason, 'no_ball')
      where ep.round_id = rec.round_id and ep.user_id = rec.user_id;
      continue;
    end if;
    select exists (select 1 from public.catches c where c.user_id = rec.user_id and c.dex = r.dex) into owns;
    cfg := private.capture_config() || jsonb_build_object(
      '_context', private.capture_throw_context(r, rec.user_id, rec.ball_at)
    );
    calc := private.capture_chance(r.dex, rec.ball, case when rec.prep = 'bait' then null else rec.prep end, bait_count, player_count, rec.prep = 'bait', owns, private.variant_is_shiny(r.variant), 1.0, clk, cfg);
    v_odds := (calc->>'finalChance')::numeric;
    if test_out = 'catch' then
      v_roll := 0; v_caught := true;
    elsif test_out = 'escape' then
      v_roll := 1; v_caught := false;
    elsif coalesce((calc->>'guaranteed')::boolean, false) then
      v_roll := 0; v_caught := true;
    else
      v_roll := private.secure_random(); v_caught := v_roll < v_odds;
    end if;
    update public.encounter_players ep set chance = v_odds, roll = v_roll, caught = v_caught, result = case when v_caught then 'Caught' else 'Escaped' end, result_reason = case when v_caught then 'caught' else 'escaped' end where ep.round_id = rec.round_id and ep.user_id = rec.user_id;
    insert into public.capture_log (round_id, user_id, dex, species_name, variant, gender, is_shiny, is_female, canonical_catch_rate, base_chance, ball_key, ball_multiplier, ball_condition_met, berry_key, berry_multiplier, honey_contributors, honey_participants, honey_multiplier, honey_contributor_multiplier, shiny_multiplier, event_multiplier, other_multiplier, raw_chance, final_chance, capture_roll, success, detail)
    values (r.id, rec.user_id, r.dex, r.name, r.variant, r.gender, private.variant_is_shiny(r.variant), r.gender = 'Female', (calc->>'catchRate')::int, (calc->>'baseChance')::numeric, calc->'ball'->>'key', (calc->'ball'->>'multiplier')::numeric, (calc->'ball'->>'conditionMet')::boolean, calc->'berry'->>'key', (calc->'berry'->>'multiplier')::numeric, (calc->'honey'->>'contributors')::int, (calc->'honey'->>'participants')::int, (calc->'honey'->>'multiplier')::numeric, (calc->>'honeyContributorMultiplier')::numeric, (calc->>'shinyMultiplier')::numeric, (calc->>'eventMultiplier')::numeric, (calc->>'otherMultiplier')::numeric, (calc->>'rawChance')::numeric, v_odds, v_roll, v_caught, calc || jsonb_build_object('testOutcome', test_out, 'formId', form_id))
    on conflict (round_id, user_id) do nothing;
    if v_caught then
      insert into public.play_console_log (round_id, user_id, display_name, kind, item, message)
      select r.id, rec.user_id, who, 'caught', species, '⭐ ' || who || ' caught ' || species || '!'
      where not exists (select 1 from public.play_console_log l where l.round_id = r.id and l.user_id = rec.user_id and l.kind = 'caught') on conflict do nothing;
    else
      insert into public.play_console_log (round_id, user_id, display_name, kind, item, message)
      select r.id, rec.user_id, who, 'escaped', species, '✖ ' || who || ' was unable to catch ' || species || '. Better luck next encounter!'
      where not exists (select 1 from public.play_console_log l where l.round_id = r.id and l.user_id = rec.user_id and l.kind = 'escaped') on conflict do nothing;
    end if;
    if v_caught and not exists (select 1 from public.catches c where c.round_id = rec.round_id and c.user_id = rec.user_id) then
      insert into public.catches (user_id, dex, name, variant, gender, ball, round_id, source_key, pokemon_form_id)
      values (rec.user_id, r.dex, species, r.variant, r.gender, rec.ball, rec.round_id, 'play:' || rec.round_id::text || ':' || rec.user_id::text, form_id)
      on conflict do nothing;
    end if;
  end loop;
  update public.encounter_rounds set resolved = true, paused_at = null, last_action = coalesce(throw_line, last_action, 'Results locked in'), updated_at = now() where id = r.id returning * into r;
  return r;
end;
$function$;

-- catch_json: include form identity (preserve existing fields).
create or replace function private.catch_json(c public.catches)
returns jsonb
language plpgsql
stable
as $$
declare
  spec public.lgpe_species;
  listed boolean;
  st_hp int;
  st_atk int;
  st_def int;
  st_spa int;
  st_spd int;
  st_spe int;
  fid int;
  f public.pokemon_forms;
begin
  select * into spec from public.lgpe_species where dex = c.dex;
  listed := exists (select 1 from public.trade_listings t where t.catch_id = c.id and t.status = 'open');
  st_hp := private.lgpe_stat(spec.hp, c.iv_hp, c.av_hp, c.level, true);
  st_atk := private.lgpe_stat(spec.atk, c.iv_atk, c.av_atk, c.level, false);
  st_def := private.lgpe_stat(spec.def, c.iv_def, c.av_def, c.level, false);
  st_spa := private.lgpe_stat(spec.spa, c.iv_spa, c.av_spa, c.level, false);
  st_spd := private.lgpe_stat(spec.spd, c.iv_spd, c.av_spd, c.level, false);
  st_spe := private.lgpe_stat(spec.spe, c.iv_spe, c.av_spe, c.level, false);
  fid := private.canonical_form_id(c.dex, coalesce(c.pokemon_form_id, c.dex));
  select * into f from public.pokemon_forms where pokemon_form_id = fid;
  return jsonb_build_object(
    'id', c.id,
    'publicId', c.public_id,
    'dex', c.dex,
    'name', coalesce(nullif(btrim(c.name), ''), private.form_display_name(c.dex, fid)),
    'nickname', c.nickname,
    'variant', c.variant,
    'gender', c.gender,
    'ball', c.ball,
    'caughtAt', c.caught_at,
    'level', coalesce(c.level, 12),
    'size', coalesce(c.size_class, 'M'),
    'isAlpha', coalesce(c.is_alpha, false),
    'types', coalesce(spec.types, '{}'::text[]),
    'moves', coalesce(c.moves, '{}'::text[]),
    'ivs', jsonb_build_object('hp', coalesce(c.iv_hp, 0), 'atk', coalesce(c.iv_atk, 0), 'def', coalesce(c.iv_def, 0), 'spa', coalesce(c.iv_spa, 0), 'spd', coalesce(c.iv_spd, 0), 'spe', coalesce(c.iv_spe, 0)),
    'avs', jsonb_build_object('hp', coalesce(c.av_hp, 0), 'atk', coalesce(c.av_atk, 0), 'def', coalesce(c.av_def, 0), 'spa', coalesce(c.av_spa, 0), 'spd', coalesce(c.av_spd, 0), 'spe', coalesce(c.av_spe, 0)),
    'stats', jsonb_build_object('hp', st_hp, 'atk', st_atk, 'def', st_def, 'spa', st_spa, 'spd', st_spd, 'spe', st_spe),
    'cp', greatest(10, floor((st_atk * sqrt(greatest(st_def, 1)) * sqrt(greatest(st_hp, 1)) * power((least(coalesce(c.level, 1), 40)::numeric / 40.0) * 0.7903, 2)) / 10)),
    'otName', c.ot_name,
    'otNumber', c.ot_number,
    'otUserId', c.ot_user_id,
    'metLevel', coalesce(c.met_level, c.level),
    'metLocation', c.met_location,
    'heightM', c.height_m,
    'weightKg', c.weight_kg,
    'friendship', coalesce(c.friendship, 0),
    'listed', listed,
    'transferredAt', c.transferred_at,
    'favorite', coalesce(c.favorite, false),
    'locked', coalesce(c.locked, false),
    'obtainedMethod', coalesce(c.obtained_method, 'CAPTURE'),
    'tradeEvoReady', coalesce(c.trade_evo_ready, false),
    'tradable', coalesce((select s.tradable from public.species s where s.dex = c.dex), true),
    'formId', fid,
    'formKey', coalesce(f.form_key, 'base'),
    'formLabel', coalesce(f.form_label, 'Base'),
    'isBaseForm', coalesce(f.is_base, true),
    'displayName', private.form_display_name(c.dex, fid)
  );
end;
$$;

-- Admin form catalog RPC (read-only).
create or replace function public.admin_pokemon_forms(p_dex integer default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not private.is_play_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'formId', f.pokemon_form_id,
      'dex', f.dex,
      'formKey', f.form_key,
      'formLabel', f.form_label,
      'kind', f.kind,
      'isBase', f.is_base,
      'displayName', private.form_display_name(f.dex, f.pokemon_form_id),
      'adminTargetable', f.admin_targetable,
      'eventTargetable', f.event_targetable,
      'normalEncounterEnabled', f.normal_encounter_enabled,
      'hasFront', f.has_front,
      'hasShinyFront', f.has_shiny_front,
      'hasBack', f.has_back,
      'assetStatus', f.asset_status
    ) order by f.is_base desc, f.form_label)
    from public.pokemon_forms f
    where (p_dex is null or f.dex = p_dex)
      and (f.is_base or f.admin_targetable or f.event_targetable)
  ), '[]'::jsonb);
end;
$function$;

grant execute on function public.admin_pokemon_forms(integer) to authenticated;

-- Containment integrity for form-aware phase.
do $$
declare
  ordinary int;
  special_base int;
  nonbase_normal int;
  post_kanto int;
  event_ready int;
  broken int;
begin
  select count(*) into ordinary
  from public.pokemon_forms
  where is_base and normal_encounter_enabled and dex between 1 and 151;

  select count(*) into special_base
  from public.pokemon_forms
  where is_base and dex in (144, 145, 146, 150, 151) and not normal_encounter_enabled;

  select count(*) into nonbase_normal
  from public.pokemon_forms
  where not is_base and normal_encounter_enabled;

  select count(*) into post_kanto
  from public.species s
  where s.dex > private.normal_spawn_max_dex()
    and private.spawn_species_eligible(s.dex, false);

  select count(*) into event_ready
  from public.pokemon_forms
  where not is_base and origin_gen1 and event_targetable and asset_status = 'ready';

  select count(*) into broken
  from public.pokemon_forms
  where origin_gen1 and not is_base and asset_status = 'broken';

  if ordinary <> 146 then
    raise exception 'Form-aware containment: ordinary base expected 146, got %', ordinary;
  end if;
  if special_base <> 5 then
    raise exception 'Form-aware containment: special base expected 5, got %', special_base;
  end if;
  if nonbase_normal <> 0 then
    raise exception 'Form-aware containment: non-base normal-enabled expected 0, got %', nonbase_normal;
  end if;
  if post_kanto <> 0 then
    raise exception 'Form-aware containment: post-Kanto ordinary eligible expected 0, got %', post_kanto;
  end if;
  if event_ready < 80 then
    raise exception 'Form-aware containment: expected >=80 event-ready Gen-1 forms, got %', event_ready;
  end if;
  if broken <> 0 then
    raise exception 'Form-aware containment: broken forms = %', broken;
  end if;
end $$;

-- Ensure any leftover special events default to BASE form id = dex.
update private.special_events
   set pokemon_form_id = dex
 where pokemon_form_id is null;

-- Form-aware Admin Director / Test start (pass optional formId).
create or replace function public.admin_test_start(p_payload jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  payload jsonb := coalesce(p_payload, '{}'::jsonb);
  outcome text := lower(btrim(coalesce(payload->>'outcome', payload->>'testOutcome', '')));
  r public.encounter_rounds;
begin
  perform private.require_hub();
  if outcome <> '' and outcome not in ('catch', 'escape') then
    raise exception 'Test outcome must be catch, escape, or empty.';
  end if;
  perform set_config('play.test_outcome', outcome, true);
  perform set_config('play.test_rewards', case when coalesce((payload->>'rewards')::boolean, (payload->>'testRewards')::boolean, false) then 'true' else '' end, true);
  r := private.director_start_now(
    nullif(payload->>'dex', '')::int,
    payload->>'gender',
    case when payload ? 'shiny' then (payload->>'shiny')::boolean else null end,
    'TEST',
    true,
    coalesce(nullif(payload->>'formId', '')::int, nullif(payload->>'pokemonFormId', '')::int)
  );
  return jsonb_build_object(
    'ok', true,
    'roundId', r.id,
    'dex', r.dex,
    'name', r.name,
    'variant', r.variant,
    'gender', r.gender,
    'formId', r.pokemon_form_id,
    'triggerSource', r.trigger_source,
    'deadlines', r.deadlines,
    'testMode', true,
    'testOutcome', r.rules->>'testOutcome',
    'testRewards', coalesce((r.rules->>'testRewards')::boolean, false),
    'message', 'TEST MODE encounter started.'
  );
end;
$function$;

-- Patch only the start_* branch of admin_director_command by wrapping via a helper
-- that existing command still calls through 5-arg default when formId absent.
-- Full command body is large; recreate start path by replacing function with formId-aware call.
create or replace function private.director_start_from_payload(
  p_action text,
  p_payload jsonb
)
returns public.encounter_rounds
language plpgsql
as $function$
declare
  payload jsonb := coalesce(p_payload, '{}'::jsonb);
begin
  return private.director_start_now(
    nullif(payload->>'dex', '')::int,
    payload->>'gender',
    case when payload ? 'shiny' then (payload->>'shiny')::boolean else null end,
    case when p_action = 'start_test' then 'TEST' when payload->>'dex' is not null then 'ADMIN_SPECIFIC' else 'ADMIN' end,
    p_action = 'start_test',
    case
      when payload->>'dex' is null then null
      else coalesce(nullif(payload->>'formId', '')::int, nullif(payload->>'pokemonFormId', '')::int)
    end
  );
end;
$function$;


-- Replace admin_director_command start_* director_start_now call with form-aware helper.
create or replace function public.admin_director_command(p_action text, p_payload jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  payload jsonb := coalesce(p_payload, '{}'::jsonb);
  d private.stream_director;
  a private.twitch_ad_state;
  r public.encounter_rounds;
  safe_win jsonb;
  hold_mins int;
  next_at timestamptz;
  msg text := 'Updated.';
begin
  if not private.is_play_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select * into d from private.stream_director where id = 1;
  a := private.director_refresh_ad_end();
  r := private.director_active_round();

  if p_action = 'tick' then
    perform private.director_tick();
    msg := 'Director refreshed.';
  elsif p_action = 'start_session' then
    if d.session_id is null or not d.rpg_session_active then
      insert into private.stream_sessions (mode) values (d.stream_mode) returning id, started_at into d.session_id, d.session_started_at;
    end if;
    update private.stream_director
      set rpg_session_active = true,
          session_id = coalesce(session_id, d.session_id),
          session_started_at = coalesce(session_started_at, now()),
          stream_mode = 'NORMAL',
          auto_enabled = true,
          updated_at = now()
      where id = 1;
    if d.next_encounter_at is null then
      perform private.director_schedule_next('first');
    end if;
    perform private.director_log('SESSION_STARTED', null, '{}'::jsonb, auth.uid());
    msg := 'RPG session started.';
  elsif p_action = 'end_session' then
    if r is not null then
      raise exception 'An encounter is currently active. End the session after it finishes.';
    end if;
    update private.stream_sessions
      set ended_at = now(),
          stats = jsonb_build_object(
            'auto', d.encounters_auto, 'manual', d.encounters_manual, 'event', d.encounters_event,
            'delayedAds', d.encounters_delayed_ads, 'pausedAds', d.encounters_paused_ads
          )
      where id = d.session_id;
    update private.stream_director
      set rpg_session_active = false, session_id = null, next_encounter_at = null, queued = null, updated_at = now()
      where id = 1;
    perform private.director_log('SESSION_ENDED', null, '{}'::jsonb, auth.uid());
    msg := 'RPG session ended.';
  elsif p_action = 'pause_auto' then
    hold_mins := coalesce(nullif(payload->>'minutes', '')::int, 0);
    update private.stream_director
      set auto_enabled = false,
          manual_hold = true,
          hold_reason = coalesce(payload->>'reason', 'Manual hold'),
          hold_until = case when hold_mins > 0 then now() + make_interval(mins => hold_mins) else null end,
          updated_at = now()
      where id = 1;
    perform private.director_log('PAUSE_AUTO', 'MANUAL_HOLD', payload, auth.uid());
    msg := 'Automatic encounters paused.';
  elsif p_action = 'resume_auto' then
    update private.stream_director
      set auto_enabled = true, manual_hold = false, hold_until = null, hold_reason = null, updated_at = now()
      where id = 1;
    perform private.director_schedule_next('grace');
    perform private.director_log('RESUME_AUTO', null, '{}'::jsonb, auth.uid());
    msg := 'Automatic encounters resumed.';
  elsif p_action = 'set_mode' then
    update private.stream_director
      set stream_mode = upper(replace(coalesce(payload->>'mode', 'NORMAL'), ' ', '_')),
          updated_at = now()
      where id = 1;
    if upper(replace(coalesce(payload->>'mode', ''), ' ', '_')) in ('REACTION', 'STORY', 'BRB') then
      update private.stream_director set next_encounter_at = null where id = 1;
    elsif d.stream_mode in ('REACTION', 'STORY', 'BRB') then
      perform private.director_schedule_next('grace');
    end if;
    perform private.director_log('SET_MODE', payload->>'mode', payload, auth.uid());
    msg := format('Stream Mode changed to %s.', coalesce(payload->>'mode', 'NORMAL'));
  elsif p_action = 'return_normal' then
    update private.stream_director
      set stream_mode = 'NORMAL', auto_enabled = true, manual_hold = false, hold_until = null, hold_reason = null, updated_at = now()
      where id = 1;
    perform private.director_schedule_next('grace');
    perform private.director_log('RETURN_NORMAL', null, '{}'::jsonb, auth.uid());
    msg := 'Returned to Normal mode.';
  elsif p_action = 'queue_special' then
    if payload->>'dex' is null then
      raise exception 'Pick a Pok�mon to queue.';
    end if;
    update private.stream_director
      set queued = jsonb_build_object(
        'kind', 'SPECIAL',
        'dex', (payload->>'dex')::int,
        'formId', coalesce(nullif(payload->>'formId', '')::int, (payload->>'dex')::int),
        'name', private.form_display_name((payload->>'dex')::int, coalesce(nullif(payload->>'formId', '')::int, (payload->>'dex')::int)),
        'gender', payload->>'gender',
        'shiny', payload->'shiny',
        'queuedAt', now()
      ),
      updated_at = now()
      where id = 1;
    perform private.director_log('QUEUE_SPECIAL', payload->>'dex', payload, auth.uid());
    msg := format('%s queued.', private.form_display_name((payload->>'dex')::int, coalesce(nullif(payload->>'formId', '')::int, (payload->>'dex')::int)));
  elsif p_action = 'queue_random' then
    update private.stream_director
      set queued = jsonb_build_object('kind', 'RANDOM', 'queuedAt', now()),
          updated_at = now()
      where id = 1;
    perform private.director_log('QUEUE_RANDOM', null, '{}'::jsonb, auth.uid());
    msg := 'A random encounter will launch at the next safe window.';
  elsif p_action = 'cancel_queue' then
    update private.stream_director set queued = null, updated_at = now() where id = 1;
    perform private.director_log('CANCEL_QUEUE', null, '{}'::jsonb, auth.uid());
    msg := 'Queued encounter cancelled.';
  elsif p_action in ('start_random', 'start_specific', 'start_test', 'force_start') then
    if r is not null then
      raise exception 'An encounter is already active.';
    end if;
    safe_win := private.director_safe_window(case when coalesce((payload->>'shiny')::boolean, false) then 'SHINY' else 'COMMON' end);
    if a.ad_active and p_action <> 'start_test' then
      raise exception 'A Twitch ad break is running. Wait until it ends.';
    end if;
    if p_action <> 'force_start' and p_action <> 'start_test' and coalesce((safe_win->>'safe')::boolean, false) is not true and coalesce((payload->>'anyway')::boolean, false) is not true then
      raise exception '%', coalesce(safe_win->>'reason', 'That phase is not safe yet.')
        using errcode = 'P0001';
    end if;
    r := private.director_start_from_payload(p_action, payload);
    msg := r.name || ' appeared!';
  elsif p_action = 'pause_encounter' then
    if r is null then raise exception 'Start an encounter first.'; end if;
    perform private.director_pause_round(r.id, 'ADMIN', 'Encounter temporarily paused.');
    msg := 'Encounter paused.';
  elsif p_action = 'resume_encounter' then
    if r is null then raise exception 'Start an encounter first.'; end if;
    perform private.director_resume_round(r.id, 'ADMIN');
    msg := 'Encounter resumed.';
  elsif p_action = 'mark_ad_started' then
    update private.twitch_ad_state
      set ad_active = true,
          source = case when source = 'twitch' then source else 'fallback' end,
          data_available = true,
          active_started_at = now(),
          active_expected_end_at = now() + make_interval(secs => coalesce(nullif(payload->>'durationSec', '')::int, 180)),
          is_automatic = false,
          updated_at = now()
      where id = 1;
    perform private.director_log('TWITCH_AD_STARTED', 'MANUAL', payload, auth.uid());
    perform private.director_tick();
    msg := 'Ad marked as started.';
  elsif p_action = 'mark_ad_ended' then
    update private.twitch_ad_state
      set ad_active = false, last_ad_at = now(), updated_at = now()
      where id = 1;
    update private.stream_director
      set post_ad_until = now() + make_interval(secs => private.director_num(private.director_config(), 'postAdCooldownSeconds', 30)),
          updated_at = now()
      where id = 1;
    perform private.director_log('TWITCH_AD_ENDED', 'MANUAL', '{}'::jsonb, auth.uid());
    perform private.director_tick();
    msg := 'Ad marked as ended.';
  elsif p_action = 'set_next_ad' then
    next_at := (payload->>'nextAdAt')::timestamptz;
    update private.twitch_ad_state
      set next_ad_at = next_at,
          next_ad_duration_sec = coalesce(nullif(payload->>'durationSec', '')::int, 180),
          source = 'fallback',
          data_available = next_at is not null,
          last_refresh_at = now(),
          stale = false,
          updated_at = now()
      where id = 1;
    perform private.director_log('SET_NEXT_AD', 'FALLBACK', payload, auth.uid());
    msg := 'Fallback ad time saved.';
  elsif p_action = 'cancel_encounter' then
    if r is null then raise exception 'No encounter to cancel.'; end if;
    perform public.admin_cancel_round();
    perform private.director_log('CANCEL_ENCOUNTER', r.name, jsonb_build_object('roundId', r.id), auth.uid());
    msg := 'Encounter cancelled.';
  elsif p_action = 'snooze_ad' then
    raise exception 'Snooze must be confirmed by Twitch. Use Connect Twitch Ads, then Snooze next ad.';
  elsif p_action = 'refresh_ads' then
    perform private.director_tick();
    msg := 'Ad status refreshed from cached Director state.';
  elsif p_action = 'save_ads_token' then
    if coalesce(payload->>'accessToken', '') = '' then
      raise exception 'Twitch ad authorization still needs to be connected.';
    end if;
    update private.twitch_ad_auth
      set access_token = payload->>'accessToken',
          scopes = payload->>'scopes',
          connected = true,
          last_error = null,
          updated_at = now()
      where id = 1;
    perform private.director_log('ADS_AUTH_SAVED', null, jsonb_build_object('scopes', payload->>'scopes'), auth.uid());
    msg := 'Twitch ad authorization saved. Refresh ads from the staff function next.';
  else
    raise exception 'Unknown Director command.';
  end if;

  return private.director_dashboard() || jsonb_build_object('ok', true, 'message', msg);
end;
$function$;
