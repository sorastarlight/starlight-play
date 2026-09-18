const fs = require("fs");
const meta = JSON.parse(fs.readFileSync("data/organized-species-meta.json", "utf8"));
const forms = JSON.parse(fs.readFileSync("data/organized-species-forms-seed.json", "utf8"));

function sqlStr(v) {
  return `'${String(v).replace(/'/g, "''")}'`;
}
function sqlTypes(arr) {
  if (!arr || !arr.length) return "ARRAY[]::text[]";
  return `ARRAY[${arr.map(sqlStr).join(",")}]::text[]`;
}

fs.mkdirSync("tmp-mig/species", { recursive: true });
fs.mkdirSync("tmp-mig/forms", { recursive: true });

const speciesSize = 120;
let n = 0;
for (let i = 0; i < meta.rows.length; i += speciesSize) {
  const chunk = meta.rows.slice(i, i + speciesSize);
  const values = chunk.map((r) => {
    const slug = r.slug || String(r.name || "").toLowerCase().replace(/\s+/g, "-");
    const catchRate = Number(r.catch_rate) || 45;
    return `(${r.dex}, ${sqlStr(r.name)}, ${sqlStr(slug)}, ${catchRate}, ${sqlTypes(r.types)}, ${!!r.is_legendary}, ${!!r.mythical}, ${Number(r.generation) || 1}, ${catchRate}::numeric)`;
  }).join(",\n");
  const sql = `insert into public.species as s (dex, name, slug, catch_rate, types, is_legendary, mythical, generation, spawn_weight)
values
${values}
on conflict (dex) do update set
  name = excluded.name,
  slug = coalesce(nullif(s.slug, ''), excluded.slug),
  catch_rate = coalesce(s.catch_rate, excluded.catch_rate),
  types = case when s.types is null or cardinality(s.types) = 0 then excluded.types else s.types end,
  is_legendary = excluded.is_legendary,
  mythical = excluded.mythical,
  generation = excluded.generation,
  spawn_weight = s.spawn_weight;`;
  const name = String(++n).padStart(2, "0");
  fs.writeFileSync(`tmp-mig/species/${name}.sql`, sql);
  console.log("species", name, chunk.length, sql.length);
}

fs.writeFileSync(
  "tmp-mig/forms/00-delete.sql",
  `delete from public.species_forms
 where source_set in ('OrganizedShowdown', 'Legacy3D')
    or (enabled_in_play = true and form_key = 'base');`
);

const formSize = 150;
n = 0;
for (let i = 0; i < forms.rows.length; i += formSize) {
  const chunk = forms.rows.slice(i, i + formSize);
  const values = chunk.map((r) => {
    const gender = r.gender || "";
    return `(${r.dex}, ${sqlStr(r.form_key)}, ${sqlStr(r.form_label)}, ${sqlStr(r.kind)}, ${sqlStr(gender)}, ${!!r.shiny}, ${sqlStr(r.source_set)}, ${sqlStr(r.filename)}, true)`;
  }).join(",\n");
  const sql = `insert into public.species_forms (dex, form_key, form_label, kind, gender, shiny, source_set, filename, enabled_in_play)
values
${values}
on conflict (dex, form_key, gender, shiny) do update set
  form_label = excluded.form_label,
  kind = excluded.kind,
  source_set = excluded.source_set,
  filename = excluded.filename,
  enabled_in_play = excluded.enabled_in_play;`;
  const name = String(++n).padStart(2, "0");
  fs.writeFileSync(`tmp-mig/forms/${name}.sql`, sql);
  console.log("forms", name, chunk.length, sql.length);
}
