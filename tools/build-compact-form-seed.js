const fs = require("fs");
const path = require("path");
const seed = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "pokemon-forms-seed.json"), "utf8"));
const nonbase = seed.filter((r) => !r.is_base && r.origin_gen1 && r.asset_status === "ready");

function sqlStr(v) {
  return `'${String(v).replace(/'/g, "''")}'`;
}

const values = nonbase
  .map(
    (r) =>
      `(${r.pokemon_form_id}, ${r.dex}, ${sqlStr(r.form_key)}, ${sqlStr(r.form_label)}, ${sqlStr(r.kind)}, false, ${!!r.has_front}, ${!!r.has_shiny_front}, ${!!r.has_female_front}, ${!!r.has_back}, true, true, false, 'ready', true)`
  )
  .join(",\n");

const sql = `-- Compact form seed: base rows from species + ${nonbase.length} Gen-1 EVENT_READY non-base forms.

delete from public.pokemon_forms;

insert into public.pokemon_forms (
  pokemon_form_id, dex, form_key, form_label, kind, is_base,
  has_front, has_shiny_front, has_female_front, has_back,
  admin_targetable, event_targetable, normal_encounter_enabled, asset_status, origin_gen1
)
select
  s.dex, s.dex, 'base', 'Base', 'base', true,
  true, true, false, true,
  true, true,
  case when s.dex between 1 and 151 and s.dex not in (144,145,146,150,151) then true else false end,
  'ready',
  (s.dex <= 151)
from public.species s
where s.dex between 1 and 1025;

insert into public.pokemon_forms (
  pokemon_form_id, dex, form_key, form_label, kind, is_base,
  has_front, has_shiny_front, has_female_front, has_back,
  admin_targetable, event_targetable, normal_encounter_enabled, asset_status, origin_gen1
) values
${values};
`;

const out = path.join(__dirname, "..", "supabase", "migrations", "20260918050100_form_aware_seed.sql");
fs.writeFileSync(out, sql);
console.log({ nonbase: nonbase.length, bytes: sql.length, out });
