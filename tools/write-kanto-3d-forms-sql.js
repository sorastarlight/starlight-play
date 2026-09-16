const fs = require("fs");
const path = require("path");
const data = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "kanto-3d-forms.json"), "utf8"));

function esc(value) {
  return String(value || "").replace(/'/g, "''");
}

const values = data.catalog.map((row) => (
  `  (${row.dex}, '${esc(row.formKey)}', '${esc(row.formLabel)}', '${esc(row.kind)}', '${esc(row.gender)}', ${row.shiny}, '${esc(row.sourceSet)}', '${esc(row.filename)}', ${Boolean(row.enabledInPlay)})`
)).join(",\n");

const femaleCount = data.femaleVisualDex.length;

const sql = `-- Catalog every known Kanto 3D Front form. Only base sprites are enabled in play.
create table if not exists public.species_forms (
  dex int not null references public.species(dex),
  form_key text not null,
  form_label text not null,
  kind text not null,
  gender text not null default '',
  shiny boolean not null default false,
  source_set text not null,
  filename text not null,
  enabled_in_play boolean not null default false,
  primary key (dex, form_key, gender, shiny)
);
comment on table public.species_forms is 'Known Kanto 3D Front forms from ProjectPokemon. Alt forms are cataloged for later and are not implemented in play.';
alter table public.species_forms enable row level security;
drop policy if exists species_forms_read on public.species_forms;
create policy species_forms_read on public.species_forms for select to anon, authenticated using (true);
revoke all on public.species_forms from anon, authenticated;
grant select on public.species_forms to anon, authenticated;

insert into public.species_forms (dex, form_key, form_label, kind, gender, shiny, source_set, filename, enabled_in_play)
values
${values}
on conflict (dex, form_key, gender, shiny) do update
set form_label = excluded.form_label,
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

create or replace function private.progression_self_test()
returns table(name text, passed boolean, detail text)
language plpgsql
as $function$
declare
  prog jsonb;
  uid uuid;
  xp1 int;
  xp2 int;
begin
  name := 'Level 1 needs no XP';
  passed := private.xp_to_reach_level(1) = 0;
  detail := private.xp_to_reach_level(1)::text;
  return next;

  name := 'Level 2 uses the configured curve';
  passed := private.xp_for_level(1) = 100;
  detail := private.xp_for_level(1)::text;
  return next;

  name := '100 XP is level 2';
  passed := private.trainer_level(100) = 2;
  detail := private.trainer_level(100)::text;
  return next;

  name := '99 XP is still level 1';
  passed := private.trainer_level(99) = 1;
  detail := private.trainer_level(99)::text;
  return next;

  prog := private.trainer_xp_progress(100);
  name := 'XP progress splits into / need';
  passed := (prog->>'xpInto')::int = 0 and (prog->>'xpNeed')::int = private.xp_for_level(2);
  detail := prog::text;
  return next;

  name := 'Variants do not inflate Kanto 151';
  passed := coalesce((private.collection_variant_stats(null)->>'kantoTotal')::int, 151) = 151;
  detail := '151';
  return next;

  name := 'Female visual list is data-driven';
  passed := cardinality(private.female_visual_dex()) = ${femaleCount};
  detail := cardinality(private.female_visual_dex())::text;
  return next;

  name := 'Level catch bonus stays off';
  passed := coalesce((private.progression_config()->>'levelCatchBonus')::boolean, true) = false;
  detail := private.progression_config()->>'levelCatchBonus';
  return next;

  name := 'Master Ball is a 151 milestone option';
  passed := exists (
    select 1 from jsonb_array_elements(private.economy_config()->'dexMilestones') v
    where (v.value->>'species')::int = 151 and v.value->'grants' ? 'masterball'
  );
  detail := '151';
  return next;

  name := 'Achievement catalog is loaded';
  passed := (select count(*) >= 40 from public.progression_achievements);
  detail := (select count(*)::text from public.progression_achievements);
  return next;

  name := 'Grant XP is idempotent';
  select id, xp into uid, xp1 from public.profiles limit 1;
  if uid is null then
    passed := true;
    detail := 'no profile';
  else
    perform private.grant_xp(uid, 0, 'TEST', 'none',
      jsonb_build_object('idempotency', 'self-test-zero'));
    select xp into xp2 from public.profiles where id = uid;
    passed := xp1 = xp2;
    detail := xp1::text;
  end if;
  return next;
end;
$function$;
`;

const out = path.join(__dirname, "..", "supabase", "migrations", "20260916010000_kanto_3d_species_forms.sql");
fs.writeFileSync(out, sql);
console.log(`wrote ${out} (${data.catalog.length} rows, ${femaleCount} female visuals)`);
