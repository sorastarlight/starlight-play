-- Phase 10 closure / release integrity.
-- Non-destructive: CREATE OR REPLACE only. Does not drop tables or mutate trainer catches.
--
-- Kanto v1 acquisition model (behavior unchanged; documented here and in
-- private.kanto_availability_json):
--   146 species: ordinary encounter eligible
--   5 species Special Event only: 144 Articuno, 145 Zapdos, 146 Moltres, 150 Mewtwo, 151 Mew
--   Evolution is an alternate acquisition/progression path for species that can also
--   spawn normally. Evolution is NOT required for 151/151.

create or replace function private.spawn_allow_special()
returns boolean
language plpgsql
stable
as $$
declare
  cfg jsonb := private.spawn_config();
begin
  -- Auto spawn never uses director mode as a legendary backdoor.
  -- Special Event rounds pass an explicit dex plus play.special_event_id.
  return coalesce((cfg->>'allowLegendaryAuto')::boolean, false)
      or coalesce((cfg->>'allowEventAuto')::boolean, false);
end;
$$;

create or replace function private.kanto_availability_json()
returns jsonb
language sql
stable
as $$
  with bands as (
    select s.dex, s.name, private.spawn_band(s.dex) as band, s.is_legendary, coalesce(s.mythical, false) as mythical
    from public.species s
    where s.dex between 1 and 151
  )
  select jsonb_build_object(
    'normal', coalesce((
      select jsonb_agg(jsonb_build_object('dex', dex, 'name', name, 'band', band) order by dex)
      from bands where band not in ('LEGENDARY', 'EVENT')
    ), '[]'::jsonb),
    'evolutionOnly', '[]'::jsonb,
    'special', coalesce((
      select jsonb_agg(jsonb_build_object('dex', dex, 'name', name, 'band', band, 'mythical', mythical) order by dex)
      from bands where band in ('LEGENDARY', 'EVENT')
    ), '[]'::jsonb),
    'unavailable', '[]'::jsonb,
    'counts', jsonb_build_object(
      'normal', (select count(*) from bands where band not in ('LEGENDARY', 'EVENT')),
      'evolutionOnly', 0,
      'special', (select count(*) from bands where band in ('LEGENDARY', 'EVENT')),
      'unavailable', 0,
      'total', 151
    ),
    'acquisitionModel', jsonb_build_object(
      'version', 'v1',
      'ordinaryEncounterEligible', 146,
      'specialEventOnly', 5,
      'specialSpecies', jsonb_build_array(144, 145, 146, 150, 151),
      'evolutionRequiredFor151', false,
      'evolution', 'alternate acquisition/progression for species that can also spawn normally; not required for 151/151'
    )
  );
$$;

create or replace function private.launch_community_round(
  p_dex integer,
  p_gender text,
  p_shiny boolean,
  p_source text,
  p_test boolean default false
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
  round_id uuid := gen_random_uuid();
  t timestamptz := now();
  deadlines jsonb;
  female_look boolean;
  test_out text;
  loc text;
  sev jsonb;
  vpol text;
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
  else
    chosen_dex := p_dex;
  end if;
  if chosen_dex < 1 or chosen_dex > 151 then
    raise exception 'Choose a Pokédex number from 1 to 151.';
  end if;
  if private.spawn_band(chosen_dex) in ('LEGENDARY', 'EVENT') then
    if coalesce(p_source, '') is distinct from 'SPECIAL_EVENT'
       or nullif(current_setting('play.special_event_id', true), '') is null then
      raise exception 'Legendary and Event species can only appear through a Special Event.';
    end if;
  end if;
  select name into chosen_name from public.species where dex = chosen_dex;
  if p_gender in ('Male', 'Female', 'Genderless') then
    chosen_gender := p_gender;
  else
    chosen_gender := private.lgpe_roll_gender(chosen_dex, floor(random() * 2147483647)::int, null);
  end if;
  female_look := chosen_gender = 'Female' and chosen_dex = any (private.female_visual_dex());
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
    id, phase, hidden, pokemon, dex, name, variant, gender, started_at, deadlines, rules, resolved, cancelled, last_action, ends_at, trigger_source, source
  ) values (
    round_id, 'join', false,
    jsonb_build_object('dex', chosen_dex, 'name', chosen_name, 'variant', chosen_variant, 'gender', chosen_gender, 'location', loc, 'level', chosen_level),
    chosen_dex, chosen_name, chosen_variant, chosen_gender, t, deadlines, settings, false, false,
    case when p_test then '[TEST MODE] ' else '' end || chosen_name || ' appeared!',
    (deadlines->>'join')::timestamptz,
    p_source,
    'play'
  ) returning * into r;
  return r;
end;
$function$;

revoke execute on function public.admin_special_event_command(text, jsonb) from public, anon;
revoke execute on function public.admin_special_event_analytics(uuid) from public, anon;
revoke execute on function public.admin_special_event_health() from public, anon;
grant execute on function public.admin_special_event_command(text, jsonb) to authenticated;
grant execute on function public.admin_special_event_analytics(uuid) to authenticated;
grant execute on function public.admin_special_event_health() to authenticated;

create or replace function private.phase10_special_selftest()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  failed text := '';
  counts jsonb;
  model jsonb;
  hidden_id uuid;
  public_id uuid;
  hidden_card jsonb;
  public_card jsonb;
  src text;
  chance numeric;
  marker text := 'QA_CLOSURE_HIDDEN_KARPFISH';
  payload jsonb;
  trainer uuid;
  admin_uid uuid;
  tick jsonb;
  dex_n int;
  src_try text;
  launched boolean;
  live_n int;
  pub_n int;
begin
  counts := private.kanto_availability_json()->'counts';
  model := private.kanto_availability_json()->'acquisitionModel';
  if coalesce((counts->>'normal')::int, 0) <> 146 then failed := failed || format('normal=%s; ', counts->>'normal'); end if;
  if coalesce((counts->>'special')::int, 0) <> 5 then failed := failed || format('special=%s; ', counts->>'special'); end if;
  if coalesce((counts->>'evolutionOnly')::int, 0) <> 0 then failed := failed || 'evo-only; '; end if;
  if coalesce((counts->>'unavailable')::int, 0) <> 0 then failed := failed || 'unavail; '; end if;
  if coalesce((model->>'ordinaryEncounterEligible')::int, 0) <> 146 then failed := failed || 'model ordinary; '; end if;
  if coalesce((model->>'specialEventOnly')::int, 0) <> 5 then failed := failed || 'model special; '; end if;
  if coalesce((model->>'evolutionRequiredFor151')::boolean, true) is not false then failed := failed || 'evo required; '; end if;

  chance := private.capture_base_chance(3);
  if chance is distinct from 0.04 then failed := failed || format('cr3=%s; ', chance); end if;

  if private.spawn_band(144) is distinct from 'LEGENDARY' then failed := failed || 'articuno band; '; end if;
  if private.spawn_band(145) is distinct from 'LEGENDARY' then failed := failed || 'zapdos band; '; end if;
  if private.spawn_band(146) is distinct from 'LEGENDARY' then failed := failed || 'moltres band; '; end if;
  if private.spawn_band(150) is distinct from 'LEGENDARY' then failed := failed || 'mewtwo band; '; end if;
  if private.spawn_band(151) is distinct from 'LEGENDARY' then failed := failed || 'mew band; '; end if;

  if private.spawn_species_eligible(144, false)
     or private.spawn_species_eligible(145, false)
     or private.spawn_species_eligible(146, false)
     or private.spawn_species_eligible(150, false)
     or private.spawn_species_eligible(151, false) then
    failed := failed || 'eligible_auto; ';
  end if;

  src := pg_get_functiondef('private.spawn_allow_special()'::regprocedure);
  if src ilike '%stream_mode%' or src ilike '%mode =%' then
    failed := failed || 'spawn_allow_special backdoor; ';
  end if;

  src := pg_get_functiondef('private.launch_community_round(integer,text,boolean,text,boolean)'::regprocedure);
  if src not ilike '%specialEvent%' then failed := failed || 'launch missing specialEvent; '; end if;
  if src not ilike '%A Special Event is live%' then failed := failed || 'launch missing collision guard; '; end if;
  if src not ilike '%only appear through a Special Event%' then failed := failed || 'launch missing species guard; '; end if;

  src := pg_get_functiondef('private.director_tick()'::regprocedure);
  if src not ilike '%special_event_director_tick%' then failed := failed || 'tick unwired; '; end if;

  if has_function_privilege('anon', 'public.admin_special_event_command(text,jsonb)', 'execute') then
    failed := failed || 'anon execute command; ';
  end if;
  if has_function_privilege('anon', 'public.admin_special_event_analytics(uuid)', 'execute') then
    failed := failed || 'anon execute analytics; ';
  end if;
  if has_function_privilege('anon', 'public.admin_special_event_health()', 'execute') then
    failed := failed || 'anon execute health; ';
  end if;
  if not has_function_privilege('anon', 'public.play_special_events()', 'execute') then
    failed := failed || 'anon missing public events read; ';
  end if;

  foreach dex_n in array array[144, 145, 146, 150, 151]
  loop
    foreach src_try in array array['AUTO', 'ADMIN', 'ADMIN_SPECIFIC', 'TEST', 'QUEUED_SPECIAL']
    loop
      launched := false;
      begin
        perform private.launch_community_round(dex_n, null, false, src_try, false);
        launched := true;
        raise exception 'phase10_closure_rollback';
      exception
        when others then
          if sqlerrm = 'phase10_closure_rollback' or launched then
            failed := failed || format('%s %s launched; ', dex_n, src_try);
          elsif sqlerrm not ilike '%only appear through a Special Event%' then
            failed := failed || format('%s %s: %s; ', dex_n, src_try, sqlerrm);
          end if;
      end;
    end loop;

    launched := false;
    begin
      perform set_config('play.special_event_id', gen_random_uuid()::text, true);
      perform set_config('play.special_event_json', '{"id":"closure"}', true);
      perform private.launch_community_round(dex_n, null, false, 'SPECIAL_EVENT', true);
      launched := true;
      raise exception 'phase10_closure_rollback';
    exception
      when others then
        if sqlerrm = 'phase10_closure_rollback' and launched then
          null;
        else
          failed := failed || format('special %s: %s; ', dex_n, sqlerrm);
        end if;
    end;
    perform set_config('play.special_event_id', '', true);
    perform set_config('play.special_event_json', '', true);
  end loop;

  select p.id into trainer
    from public.profiles p
   where private.play_staff_role(p.id) is null
   limit 1;

  if trainer is not null then
    perform set_config('request.jwt.claim.sub', trainer::text, true);
    perform set_config('request.jwt.claim.role', 'authenticated', true);
    perform set_config('request.jwt.claims', json_build_object('sub', trainer::text, 'role', 'authenticated', 'aud', 'authenticated')::text, true);
    if private.is_play_admin() then
      failed := failed || 'trainer jwt still admin; ';
    end if;
    foreach src_try in array array['create', 'schedule', 'start_now', 'repeat', 'cancel', 'end']
    loop
      begin
        perform public.admin_special_event_command(src_try, jsonb_build_object('dex', 129, 'confirm', true, 'title', marker));
        raise exception 'phase10_trainer_allowed';
      exception
        when others then
          if sqlerrm = 'phase10_trainer_allowed' then
            failed := failed || format('trainer %s allowed; ', src_try);
          elsif sqlerrm not ilike '%not allowed%' then
            failed := failed || format('trainer %s: %s; ', src_try, sqlerrm);
          end if;
      end;
    end loop;
  else
    failed := failed || 'no trainer for rpc audit; ';
  end if;

  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '{}', true);

  begin
    insert into private.special_events (event_type, dex, title, subtitle, visibility, status, encounter_count)
    values ('MYTHICAL', 151, 'QA HIDDEN MEW', 'Mew', 'HIDDEN', 'SCHEDULED', 1)
    returning id into hidden_id;
    hidden_card := private.special_event_public_card((select s from private.special_events s where s.id = hidden_id), false);
    if hidden_card is not null then raise exception 'hidden leaked'; end if;
    if coalesce(hidden_card->>'name', '') ilike '%mew%' then raise exception 'hidden mew name'; end if;

    insert into private.special_events (event_type, dex, title, subtitle, visibility, status, encounter_count, starts_at)
    values ('LEGENDARY', 144, 'THE FROZEN LEGEND AWAKENS', 'Articuno', 'PUBLIC', 'SCHEDULED', 3, now() + interval '7 days')
    returning id into public_id;
    public_card := private.special_event_public_card((select s from private.special_events s where s.id = public_id), false);
    if public_card is null then raise exception 'public missing'; end if;
    if coalesce(public_card->>'name', '') not ilike '%articuno%' then raise exception 'public name'; end if;
    raise exception 'phase10_closure_rollback';
  exception
    when others then
      if sqlerrm not in ('phase10_closure_rollback') then
        failed := failed || sqlerrm || '; ';
      end if;
  end;

  begin
    insert into private.special_events (
      event_type, dex, title, subtitle, announcement, visibility, status, encounter_count, starts_at
    ) values (
      'ADMIN_TEST', 129, marker, 'Magikarp', marker, 'HIDDEN', 'SCHEDULED', 1, now() + interval '7 days'
    ) returning id into hidden_id;

    payload := public.play_special_events();
    if payload::text ilike '%' || marker || '%' then raise exception 'upcoming leaked'; end if;
    payload := public.play_state();
    if payload::text ilike '%' || marker || '%' then raise exception 'play_state leaked'; end if;
    begin
      payload := public.play_pokedex('SoraStarlight');
      if payload::text ilike '%' || marker || '%' then raise exception 'pokedex leaked'; end if;
    exception
      when others then
        if sqlerrm not ilike '%sign in%' and sqlerrm not ilike '%pokedex leaked%' then
          raise exception 'pokedex: %', sqlerrm;
        elsif sqlerrm ilike '%pokedex leaked%' then
          raise;
        end if;
    end;
    payload := public.play_rankings('level', 20, 0);
    if payload::text ilike '%' || marker || '%' then raise exception 'rankings leaked'; end if;
    payload := public.play_trainer('SoraStarlight');
    if payload::text ilike '%' || marker || '%' then raise exception 'trainer leaked'; end if;
    payload := public.play_store();
    if payload::text ilike '%' || marker || '%' then raise exception 'store leaked'; end if;
    if exists (
      select 1 from pg_publication_tables
      where tablename in ('special_events', 'special_event_rounds')
    ) then
      raise exception 'realtime publication';
    end if;

    hidden_card := private.special_event_admin_json((select s from private.special_events s where s.id = hidden_id));
    if hidden_card is null or coalesce(hidden_card->>'title', '') <> marker then
      raise exception 'admin missing hidden';
    end if;

    update private.special_events
       set rounds_launched = 1, status = 'LIVE', updated_at = now()
     where id = hidden_id;
    public_card := private.special_event_public_card((select s from private.special_events s where s.id = hidden_id), false);
    if public_card is null then raise exception 'reveal missing public card'; end if;
    if coalesce(public_card->>'title', '') <> marker then raise exception 'reveal title'; end if;
    raise exception 'phase10_closure_rollback';
  exception
    when others then
      if sqlerrm not in ('phase10_closure_rollback') then
        failed := failed || 'hidden-leak: ' || sqlerrm || '; ';
      end if;
  end;

  begin
    insert into private.special_events (event_type, dex, title, visibility, status, encounter_count)
    values ('ADMIN_TEST', 129, marker || '_LIVE', 'HIDDEN', 'LIVE', 1)
    returning id into hidden_id;
    begin
      insert into private.special_events (event_type, dex, title, visibility, status, encounter_count)
      values ('ADMIN_TEST', 129, marker || '_LIVE2', 'HIDDEN', 'LIVE', 1);
      raise exception 'second live allowed';
    exception
      when unique_violation then
        null;
      when others then
        if sqlerrm ilike '%second live allowed%' then
          raise;
        elsif sqlerrm ilike '%special_events_one_live%' or sqlerrm ilike '%unique%' then
          null;
        else
          raise;
        end if;
    end;

    begin
      perform private.launch_community_round(25, null, false, 'AUTO', false);
      raise exception 'auto overwrote live';
    exception
      when others then
        if sqlerrm not ilike '%Special Event is live%' then
          raise exception 'auto: %', sqlerrm;
        end if;
    end;

    begin
      perform private.launch_community_round(25, null, false, 'ADMIN', false);
      raise exception 'manual overwrote live';
    exception
      when others then
        if sqlerrm not ilike '%Special Event is live%' then
          raise exception 'manual: %', sqlerrm;
        end if;
    end;

    begin
      perform private.special_event_start_round(hidden_id);
      perform private.special_event_start_round(hidden_id);
      raise exception 'duplicate special start';
    exception
      when others then
        if sqlerrm ilike '%duplicate special start%' then
          raise;
        elsif sqlerrm ilike '%already%' or sqlerrm ilike '%This event round already started%' then
          null;
        else
          raise;
        end if;
    end;
    raise exception 'phase10_closure_rollback';
  exception
    when others then
      if sqlerrm not in ('phase10_closure_rollback') then
        failed := failed || 'collision: ' || sqlerrm || '; ';
      end if;
  end;

  begin
    insert into private.special_events (
      event_type, dex, title, visibility, status, encounter_count, starts_at, auto_advance
    ) values (
      'ADMIN_TEST', 129, marker || '_WAIT', 'HIDDEN', 'SCHEDULED', 1, now() - interval '1 minute', true
    ) returning id into hidden_id;
    tick := private.special_event_director_tick(false);
    if coalesce(tick->>'status', '') is distinct from 'WAITING_FOR_STREAM' then
      raise exception 'offline tick %', tick;
    end if;
    select status into src_try from private.special_events where id = hidden_id;
    if src_try is distinct from 'WAITING_FOR_STREAM' then
      raise exception 'offline consumed as %', src_try;
    end if;
    if exists (
      select 1 from private.special_event_rounds where event_id = hidden_id
    ) then
      raise exception 'offline launched round';
    end if;
    tick := private.special_event_director_tick(false);
    select status into src_try from private.special_events where id = hidden_id;
    if src_try is distinct from 'WAITING_FOR_STREAM' then
      raise exception 'reload lost wait %', src_try;
    end if;
    raise exception 'phase10_closure_rollback';
  exception
    when others then
      if sqlerrm not in ('phase10_closure_rollback') then
        failed := failed || 'offline: ' || sqlerrm || '; ';
      end if;
  end;

  if exists (
    select 1 from private.store_items
    where status = 'published'
      and (
        grants ? 'articuno' or grants ? 'mew' or grants ? 'mewtwo'
        or coalesce(grants->>'legendary', '') <> ''
      )
  ) then failed := failed || 'paid legendary sku; '; end if;

  select count(*)::int into live_n from private.special_events where title ilike marker || '%';
  if live_n > 0 then failed := failed || format('leftover qa events=%s; ', live_n); end if;
  select count(*)::int into pub_n
    from public.encounter_rounds
   where last_action ilike '%QA_CLOSURE%' or (rules->'specialEvent'->>'title') ilike '%' || marker || '%';
  if pub_n > 0 then failed := failed || format('leftover qa rounds=%s; ', pub_n); end if;

  if failed <> '' then
    return jsonb_build_object('ok', false, 'failed', failed);
  end if;
  return jsonb_build_object('ok', true, 'counts', counts, 'acquisitionModel', model);
end;
$function$;

do $$
declare
  result jsonb;
begin
  result := private.phase10_special_selftest();
  if coalesce((result->>'ok')::boolean, false) is not true then
    raise exception 'Phase 10 self-test failed: %', result->>'failed';
  end if;
end;
$$;
