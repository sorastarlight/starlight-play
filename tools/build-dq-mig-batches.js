const fs = require("fs");
const meta = require("../data/organized-species-meta.json");
const forms = require("../data/organized-species-forms-seed.json");

function writeSpeciesChunks(size = 250) {
  fs.mkdirSync("tmp-mig/species-dq", { recursive: true });
  let n = 0;
  for (let i = 0; i < meta.rows.length; i += size) {
    const chunk = meta.rows.slice(i, i + size).map((r) => ({
      dex: r.dex,
      name: r.name,
      slug: r.slug,
      catch_rate: r.catch_rate || 45,
      types: r.types || [],
      is_legendary: !!r.is_legendary,
      mythical: !!r.mythical,
      generation: r.generation || 1
    }));
    const json = JSON.stringify(chunk);
    const tag = `j${n + 1}`;
    const sql = `with src as (
  select * from jsonb_to_recordset($${tag}$${json}$${tag}$::jsonb)
  as x(dex int, name text, slug text, catch_rate int, types text[], is_legendary boolean, mythical boolean, generation int)
)
insert into public.species as s (dex, name, slug, catch_rate, types, is_legendary, mythical, generation, spawn_weight)
select dex, name, slug, catch_rate, types, is_legendary, mythical, generation, catch_rate::numeric
from src
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
    fs.writeFileSync(`tmp-mig/species-dq/${name}.sql`, sql);
    console.log("species-dq", name, chunk.length, Buffer.byteLength(sql));
  }
}

function writeFormsChunks(size = 300) {
  fs.mkdirSync("tmp-mig/forms-dq", { recursive: true });
  fs.writeFileSync(
    "tmp-mig/forms-dq/00-delete.sql",
    `delete from public.species_forms
 where source_set in ('OrganizedShowdown', 'Legacy3D')
    or (enabled_in_play = true and form_key = 'base');`
  );
  let n = 0;
  for (let i = 0; i < forms.rows.length; i += size) {
    const chunk = forms.rows.slice(i, i + size).map((r) => ({
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
    const json = JSON.stringify(chunk);
    const tag = `f${n + 1}`;
    const sql = `with src as (
  select * from jsonb_to_recordset($${tag}$${json}$${tag}$::jsonb)
  as x(dex int, form_key text, form_label text, kind text, gender text, shiny boolean, source_set text, filename text, enabled_in_play boolean)
)
insert into public.species_forms (dex, form_key, form_label, kind, gender, shiny, source_set, filename, enabled_in_play)
select dex, form_key, form_label, kind, gender, shiny, source_set, filename, enabled_in_play
from src
on conflict (dex, form_key, gender, shiny) do update set
  form_label = excluded.form_label,
  kind = excluded.kind,
  source_set = excluded.source_set,
  filename = excluded.filename,
  enabled_in_play = excluded.enabled_in_play;`;
    const name = String(++n).padStart(2, "0");
    fs.writeFileSync(`tmp-mig/forms-dq/${name}.sql`, sql);
    console.log("forms-dq", name, chunk.length, Buffer.byteLength(sql));
  }
}

writeSpeciesChunks(250);
writeFormsChunks(300);
