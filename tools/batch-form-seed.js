/**
 * Apply pokemon_forms seed in batches via printed SQL files for MCP execute_sql.
 * Usage: node tools/batch-form-seed.js
 */
const fs = require("fs");
const path = require("path");
const seed = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "pokemon-forms-seed.json"), "utf8"));

function sqlStr(v) {
  return `'${String(v).replace(/'/g, "''")}'`;
}

const batchDir = path.join(__dirname, "..", "tmp-form-seed-batches");
fs.mkdirSync(batchDir, { recursive: true });
const size = 150;
let batch = 0;
for (let i = 0; i < seed.length; i += size) {
  const slice = seed.slice(i, i + size);
  const values = slice
    .map((r) => `(${r.pokemon_form_id}, ${r.dex}, ${sqlStr(r.form_key)}, ${sqlStr(r.form_label)}, ${sqlStr(r.kind)}, ${r.is_base}, ${!!r.has_front}, ${!!r.has_shiny_front}, ${!!r.has_female_front}, ${!!r.has_back}, ${!!r.admin_targetable}, ${!!r.event_targetable}, ${!!r.normal_encounter_enabled}, ${sqlStr(r.asset_status)}, ${!!r.origin_gen1})`)
    .join(",\n");
  const prefix = batch === 0 ? "delete from public.pokemon_forms;\n" : "";
  const sql = `${prefix}insert into public.pokemon_forms (
  pokemon_form_id, dex, form_key, form_label, kind, is_base,
  has_front, has_shiny_front, has_female_front, has_back,
  admin_targetable, event_targetable, normal_encounter_enabled, asset_status, origin_gen1
) values
${values}
on conflict (pokemon_form_id) do update set
  dex = excluded.dex,
  form_key = excluded.form_key,
  form_label = excluded.form_label,
  kind = excluded.kind,
  is_base = excluded.is_base,
  has_front = excluded.has_front,
  has_shiny_front = excluded.has_shiny_front,
  has_female_front = excluded.has_female_front,
  has_back = excluded.has_back,
  admin_targetable = excluded.admin_targetable,
  event_targetable = excluded.event_targetable,
  normal_encounter_enabled = excluded.normal_encounter_enabled,
  asset_status = excluded.asset_status,
  origin_gen1 = excluded.origin_gen1;
`;
  fs.writeFileSync(path.join(batchDir, `batch-${String(batch).padStart(2, "0")}.sql`), sql);
  batch += 1;
}
console.log(`wrote ${batch} batches to ${batchDir}`);
