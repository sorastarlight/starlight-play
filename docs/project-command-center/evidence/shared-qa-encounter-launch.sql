-- Owner-approved: exactly one shared ordinary QA encounter, one EmailQA throw separately in UI.
-- Existing canonical server launcher, database-operator connection; no JWT impersonation.
-- Intentionally bypasses director_start_now orchestration to honor the no-scheduling boundary.
begin;
set local lock_timeout='3s';
do $launch$
declare r public.encounter_rounds; v_before jsonb; v_after jsonb;
begin
 if not pg_try_advisory_xact_lock(87231001) then raise exception 'Encounter busy; no launch'; end if;
 lock table public.encounter_rounds in share row exclusive mode;
 perform 1 from private.stream_director where id=1 for update;
 select to_jsonb(d) into v_before from private.stream_director d where id=1;
 if not exists(select 1 from private.stream_director where id=1 and status='OFFLINE' and manual_hold and not rpg_session_active and next_encounter_at is null and queued is null) then raise exception 'Director baseline changed; no launch'; end if;
 if exists(select 1 from public.encounter_rounds where not coalesce(resolved,false) and not coalesce(cancelled,false)) then raise exception 'Unresolved round exists; no launch'; end if;
 if not exists(select 1 from private.twitch_ad_state where id=1 and not ad_active and not stale) then raise exception 'Ad state changed; no launch'; end if;
 if not exists(select 1 from private.streamlink_wire_switch where id=1 and enabled) then raise exception 'WIRE state changed'; end if;
 if not exists(select 1 from private.species_mastery_activation where singleton and lifecycle='active' and activated_at='2026-10-20T16:55:59.896904Z') then raise exception 'Familiarity baseline changed'; end if;
 if (select pg_get_functiondef('private.launch_community_round(integer,text,boolean,text,boolean,integer)'::regprocedure)) is distinct from 'CREATE OR REPLACE FUNCTION private.launch_community_round(p_dex integer, p_gender text, p_shiny boolean, p_source text, p_test boolean DEFAULT false, p_form_id integer DEFAULT NULL::integer)
 RETURNS encounter_rounds
 LANGUAGE plpgsql
AS $function$
declare
  r public.encounter_rounds;
  settings jsonb;
  chosen_dex int;
  chosen_name text;
  chosen_variant text := ''normal'';
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
    raise exception ''A community round is already running.'';
  end if;
  if exists (select 1 from private.special_events where status = ''LIVE'')
     and nullif(current_setting(''play.special_event_id'', true), '''') is null
     and coalesce(p_source, '''') is distinct from ''TEST'' then
    raise exception ''A Special Event is live. Normal encounters cannot overwrite it.'';
  end if;
  settings := private.game_settings();
  if p_test then
    settings := coalesce(settings, ''{}''::jsonb) || jsonb_build_object(
      ''rewardMode'', ''test'',
      ''testMode'', true,
      ''joinSeconds'', 6,
      ''prepareSeconds'', 6,
      ''throwSeconds'', 6,
      ''revealSeconds'', 8
    );
    test_out := nullif(btrim(current_setting(''play.test_outcome'', true)), '''');
    if test_out in (''catch'', ''escape'') then
      settings := settings || jsonb_build_object(''testOutcome'', test_out);
    end if;
    if current_setting(''play.test_rewards'', true) = ''true'' then
      settings := settings || jsonb_build_object(''testRewards'', true);
    end if;
  end if;
  if p_dex is null then
    chosen_dex := private.spawn_pick_random_dex();
    chosen_form := private.canonical_form_id(chosen_dex, chosen_dex);
  else
    chosen_dex := p_dex;
    guc_form := nullif(btrim(current_setting(''play.special_form_id'', true)), '''');
    chosen_form := coalesce(p_form_id, nullif(guc_form, '''')::int, chosen_dex);
    if upper(coalesce(p_source, '''')) = ''AUTO'' then
      chosen_form := chosen_dex;
    end if;
    chosen_form := private.assert_form_launchable(chosen_dex, chosen_form, p_source);
  end if;
  if chosen_dex < 1 or chosen_dex > 1025 then
    raise exception ''Choose a Pokédex number from 1 to 1025.'';
  end if;
  if private.spawn_band(chosen_dex) in (''LEGENDARY'', ''EVENT'') then
    if coalesce(p_source, '''') = ''SPECIAL_EVENT''
       and nullif(current_setting(''play.special_event_id'', true), '''') is not null then
      null;
    elsif coalesce(p_source, '''') in (''ADMIN'', ''ADMIN_SPECIFIC'', ''TEST'') and p_dex is not null then
      null;
    else
      raise exception ''Legendary and Event species can only appear through a Special Event.'';
    end if;
  end if;
  if upper(coalesce(p_source, '''')) = ''AUTO'' and not private.form_is_base(chosen_form) then
    raise exception ''Alternate forms cannot appear in normal encounters.'';
  end if;
  chosen_name := private.form_display_name(chosen_dex, chosen_form);
  select f.form_label, f.forced_gender
    into chosen_form_label, forced_g
    from public.pokemon_forms f
   where f.pokemon_form_id = chosen_form;

  if forced_g is not null then
    if p_gender is not null
       and p_gender in (''Male'', ''Female'', ''Genderless'')
       and p_gender is distinct from forced_g then
      raise exception ''Form % requires gender % (got %).'', chosen_form, forced_g, p_gender;
    end if;
    chosen_gender := forced_g;
  elsif p_gender in (''Male'', ''Female'', ''Genderless'') then
    chosen_gender := p_gender;
  else
    chosen_gender := private.lgpe_roll_gender(chosen_dex, floor(random() * 2147483647)::int, null);
  end if;

  female_look := chosen_gender = ''Female''
    and private.form_is_base(chosen_form)
    and chosen_dex = any (private.female_visual_dex());
  vpol := upper(coalesce(nullif(current_setting(''play.special_variant_policy'', true), ''''), ''''));
  if vpol = ''FORCED_SHINY'' then
    p_shiny := true;
  elsif vpol = ''DISABLED'' then
    p_shiny := false;
  end if;
  if p_shiny is true then
    chosen_variant := case when female_look then ''shiny-female'' else ''shiny'' end;
  elsif p_shiny is false then
    chosen_variant := case when female_look then ''female'' else ''normal'' end;
  elsif random() < (1.0 / 4096.0) then
    chosen_variant := case when female_look then ''shiny-female'' else ''shiny'' end;
  else
    chosen_variant := case when female_look then ''female'' else ''normal'' end;
  end if;
  loc := coalesce(nullif(current_setting(''play.special_location'', true), ''''), private.lgpe_habitat(chosen_dex));
  begin
    sev := nullif(current_setting(''play.special_event_json'', true), '''')::jsonb;
  exception when others then
    sev := null;
  end;
  if sev is not null then
    settings := coalesce(settings, ''{}''::jsonb) || jsonb_build_object(''specialEvent'', sev);
  end if;
  deadlines := private.round_deadlines(settings, t);
  chosen_level := private.encounter_pokemon_level(chosen_dex, round_id);
  insert into public.encounter_rounds (
    id, phase, hidden, pokemon, dex, name, variant, gender, pokemon_form_id,
    started_at, deadlines, rules, resolved, cancelled, last_action, ends_at, trigger_source, source
  ) values (
    round_id, ''join'', false,
    jsonb_build_object(
      ''dex'', chosen_dex,
      ''name'', chosen_name,
      ''variant'', chosen_variant,
      ''gender'', chosen_gender,
      ''location'', loc,
      ''level'', chosen_level,
      ''formId'', chosen_form,
      ''formKey'', coalesce((select form_key from public.pokemon_forms where pokemon_form_id = chosen_form), ''base''),
      ''formLabel'', coalesce(chosen_form_label, ''Base''),
      ''isBaseForm'', private.form_is_base(chosen_form)
    ),
    chosen_dex, chosen_name, chosen_variant, chosen_gender, chosen_form,
    t, deadlines, settings, false, false,
    case when p_test then ''[TEST MODE] '' else '''' end || chosen_name || '' appeared!'',
    (deadlines->>''join'')::timestamptz,
    p_source,
    ''play''
  ) returning * into r;
  return r;
end;
$function$
' then raise exception 'Launcher source drift'; end if;
 if (select md5(prosrc) from pg_proc where oid='private.round_is_active(public.encounter_rounds)'::regprocedure) is distinct from '53d7e8a3f3894212e854618dc0663101' then raise exception 'Launch guard drift'; end if;
 if (select md5(prosrc) from pg_proc where oid='private.settle_if_needed(public.encounter_rounds)'::regprocedure) is distinct from '565c102d0a8c84a3dfd036653aca307c' then raise exception 'Settlement drift'; end if;
 r := private.launch_community_round(1,null,false,'ADMIN_SPECIFIC',false,1);
 if coalesce((r.rules->>'testMode')::boolean,false) or r.rules->>'rewardMode'='test' then raise exception 'Test reward mode is not authorized'; end if;
 select to_jsonb(d) into v_after from private.stream_director d where id=1;
 if v_after is distinct from v_before then raise exception 'Director changed; roll back encounter'; end if;
 perform set_config('qa_smoke.round_id',r.id::text,true);
end $launch$;
select id,dex,name,phase,started_at,deadlines,rules->>'rewardMode' reward_mode,trigger_source
from public.encounter_rounds where id=current_setting('qa_smoke.round_id')::uuid;
commit;
