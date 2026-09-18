/**
 * Build SQL migration body for national Organized roster from seed JSON.
 * Writes supabase/migrations/20260918030000_national_organized_roster.sql
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const meta = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "organized-species-meta.json"), "utf8"));
const forms = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "organized-species-forms-seed.json"), "utf8"));
const report = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "organized-front-import-report.json"), "utf8"));

const MAX_DEX = 1025;

function sqlStr(v) {
  return `'${String(v).replace(/'/g, "''")}'`;
}

function sqlTypes(arr) {
  if (!arr || !arr.length) return "ARRAY[]::text[]";
  return `ARRAY[${arr.map(sqlStr).join(",")}]::text[]`;
}

const speciesValues = meta.rows.map((r) => {
  const slug = r.slug || String(r.name || "").toLowerCase().replace(/\s+/g, "-");
  const catchRate = Number(r.catch_rate) || 45;
  return `(${r.dex}, ${sqlStr(r.name)}, ${sqlStr(slug)}, ${catchRate}, ${sqlTypes(r.types)}, ${!!r.is_legendary}, ${!!r.mythical}, ${Number(r.generation) || 1}, ${catchRate}::numeric)`;
}).join(",\n");

const formValues = forms.rows.map((r) => {
  const gender = r.gender || "";
  return `(${r.dex}, ${sqlStr(r.form_key)}, ${sqlStr(r.form_label)}, ${sqlStr(r.kind)}, ${sqlStr(gender)}, ${!!r.shiny}, ${sqlStr(r.source_set)}, ${sqlStr(r.filename)}, true)`;
}).join(",\n");

const sql = `-- National Organized Showdown Front-Base roster (Gen 1–9)
-- Sprites: Front Base only. Backs never in play. Legendary auto-spawn stays off.

alter table public.species drop constraint if exists species_dex_check;
alter table public.species add constraint species_dex_check check (dex between 1 and ${MAX_DEX});

alter table public.catches drop constraint if exists catches_dex_check;
alter table public.catches add constraint catches_dex_check check (dex between 1 and ${MAX_DEX});

alter table public.species_seen drop constraint if exists species_seen_dex_check;
alter table public.species_seen add constraint species_seen_dex_check check (dex between 1 and ${MAX_DEX});

alter table public.profiles drop constraint if exists profiles_favorite_dex_check;
alter table public.profiles add constraint profiles_favorite_dex_check check (favorite_dex is null or favorite_dex between 1 and ${MAX_DEX});

alter table public.trade_listings drop constraint if exists trade_listings_want_dex_check;
alter table public.trade_listings add constraint trade_listings_want_dex_check check (want_dex is null or want_dex between 1 and ${MAX_DEX});

alter table private.special_events drop constraint if exists special_events_dex_check;
alter table private.special_events add constraint special_events_dex_check check (dex between 1 and ${MAX_DEX});

insert into public.species as s (
  dex, name, slug, catch_rate, types, is_legendary, mythical, generation, spawn_weight
)
values
${speciesValues}
on conflict (dex) do update set
  name = excluded.name,
  slug = coalesce(nullif(s.slug, ''), excluded.slug),
  catch_rate = coalesce(s.catch_rate, excluded.catch_rate),
  types = case when s.types is null or cardinality(s.types) = 0 then excluded.types else s.types end,
  is_legendary = excluded.is_legendary,
  mythical = excluded.mythical,
  generation = excluded.generation,
  spawn_weight = s.spawn_weight;

delete from public.species_forms
 where source_set in ('OrganizedShowdown', 'Legacy3D')
    or (enabled_in_play = true and form_key = 'base');

insert into public.species_forms (dex, form_key, form_label, kind, gender, shiny, source_set, filename, enabled_in_play)
values
${formValues}
on conflict (dex, form_key, gender, shiny) do update set
  form_label = excluded.form_label,
  kind = excluded.kind,
  source_set = excluded.source_set,
  filename = excluded.filename,
  enabled_in_play = excluded.enabled_in_play;

create or replace function private.female_visual_dex()
returns int[]
language sql
stable
as $function$
  select coalesce(array_agg(dex order by dex), '{}'::int[])
  from (
    select distinct dex
    from public.species_forms
    where enabled_in_play
      and form_key = 'base'
      and gender = 'female'
      and not shiny
  ) s;
$function$;

-- National species outside the LGPE gender table default to equal male/female (rate 4).
create or replace function private.lgpe_gender_rate(p_dex integer)
returns integer
language sql
immutable
as $function$
  select case
    when p_dex between 1 and 151 then (ARRAY[
      1,1,1,1,1,1,1,1,1,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,8,8,8,0,0,0,6,6,6,6,6,6,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,2,2,4,4,4,2,2,2,2,2,2,4,4,4,4,4,4,4,4,4,4,4,4,-1,-1,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,-1,-1,4,4,4,4,0,0,4,4,4,4,4,8,4,8,4,4,4,4,-1,-1,4,4,8,2,2,4,0,4,4,4,-1,1,1,1,1,-1,1,1,1,1,1,1,-1,-1,-1,4,4,4,-1,-1
    ])[p_dex]
    else 4
  end;
$function$;

-- Kanto v1.0: national catalog may reach ${MAX_DEX}, but ordinary random
-- encounters stay release-contained via private.normal_spawn_max_dex() (151).
-- Do NOT widen spawn_pick / spawn_species_eligible to ${MAX_DEX} here.
-- See 20260918040000_kanto_encounter_containment.sql.

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
  if chosen_dex < 1 or chosen_dex > ${MAX_DEX} then
    raise exception 'Choose a Pokédex number from 1 to ${MAX_DEX}.';
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

create or replace function private.collection_variant_stats(p_uid uuid)
returns jsonb
language sql
stable
as $function$
  select jsonb_build_object(
    'speciesCaught', (select count(distinct dex) from public.catches where user_id = p_uid),
    'speciesSeen', (select count(*) from public.species_seen where user_id = p_uid),
    'shinySpecies', (select count(distinct dex) from public.catches where user_id = p_uid and variant like '%shiny%'),
    'shinyEligible', (select count(*)::int from public.species where dex between 1 and ${MAX_DEX}),
    'femaleVariants', (
      select count(distinct dex) from public.catches
       where user_id = p_uid
         and (variant like '%female%' or gender = 'Female')
         and dex = any (private.female_visual_dex())
    ),
    'femaleEligible', coalesce(cardinality(private.female_visual_dex()), 0),
    'shinyFemale', (
      select count(distinct dex) from public.catches
       where user_id = p_uid and variant like '%shiny%' and variant like '%female%'
         and dex = any (private.female_visual_dex())
    ),
    'kantoCaught', (select count(distinct dex) from public.catches where user_id = p_uid and dex between 1 and 151),
    'kantoTotal', 151,
    'nationalCaught', (select count(distinct dex) from public.catches where user_id = p_uid and dex between 1 and ${MAX_DEX}),
    'nationalTotal', (select count(*)::int from public.species where dex between 1 and ${MAX_DEX})
  );
$function$;

-- Legendary auto stays off via private.spawn_allow_special() defaults (allowLegendaryAuto/allowEventAuto false).

do $$
declare
  female_n int;
  species_n int;
begin
  select cardinality(private.female_visual_dex()) into female_n;
  select count(*)::int into species_n from public.species;
  if female_n < 90 then
    raise exception 'female_visual_dex too small: %', female_n;
  end if;
  if species_n < 1000 then
    raise exception 'species roster too small: %', species_n;
  end if;
end $$;
`;

const out = path.join(ROOT, "supabase", "migrations", "20260918030000_national_organized_roster.sql");
fs.writeFileSync(out, sql);
console.log(JSON.stringify({
  out,
  bytes: Buffer.byteLength(sql),
  species: meta.rows.length,
  forms: forms.rows.length,
  femaleExpected: (report.femaleDexes || []).length,
  maxDex: MAX_DEX
}, null, 2));
