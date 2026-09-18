const fs = require("fs");
const meta = require("../data/organized-species-meta.json");
const forms = require("../data/organized-species-forms-seed.json");

fs.mkdirSync("tmp-mig/stage-species", { recursive: true });
fs.mkdirSync("tmp-mig/stage-forms", { recursive: true });

const sSize = 80;
let n = 0;
for (let i = 0; i < meta.rows.length; i += sSize) {
  const chunk = meta.rows.slice(i, i + sSize).map((r) => ({
    dex: r.dex,
    name: r.name,
    slug: r.slug,
    catch_rate: r.catch_rate || 45,
    types: r.types || [],
    is_legendary: !!r.is_legendary,
    mythical: !!r.mythical,
    generation: r.generation || 1
  }));
  const tag = `s${n + 1}`;
  const sql = `insert into private._roster_species_stage (dex, payload)
select (p->>'dex')::int, p
from jsonb_array_elements($${tag}$${JSON.stringify(chunk)}$${tag}$::jsonb) p
on conflict (dex) do update set payload = excluded.payload;`;
  const name = String(++n).padStart(2, "0");
  fs.writeFileSync(`tmp-mig/stage-species/${name}.sql`, sql);
  console.log("species-stage", name, chunk.length, Buffer.byteLength(sql));
}

const fSize = 100;
n = 0;
for (let i = 0; i < forms.rows.length; i += fSize) {
  const chunk = forms.rows.slice(i, i + fSize).map((r) => ({
    dex: r.dex,
    form_key: r.form_key,
    form_label: r.form_label,
    kind: r.kind,
    gender: r.gender || "",
    shiny: !!r.shiny,
    source_set: r.source_set,
    filename: r.filename,
    enabled_in_play: true
  }));
  const tag = `g${n + 1}`;
  const sql = `insert into private._roster_forms_stage (payload)
select p
from jsonb_array_elements($${tag}$${JSON.stringify(chunk)}$${tag}$::jsonb) p;`;
  const name = String(++n).padStart(2, "0");
  fs.writeFileSync(`tmp-mig/stage-forms/${name}.sql`, sql);
  console.log("forms-stage", name, chunk.length, Buffer.byteLength(sql));
}
