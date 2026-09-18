const fs = require("fs");
const path = require("path");
const files = [
  path.join(__dirname, "..", "supabase", "migrations", "20260918050200_form_aware_rpcs.sql"),
  path.join(__dirname, "build-form-aware-migration.js"),
];
for (const p of files) {
  if (!fs.existsSync(p)) continue;
  let t = fs.readFileSync(p, "utf8");
  const before = t;
  t = t.replace(/form_label text;/g, "chosen_form_label text;");
  t = t.replace(
    /select form_label into form_label from public\.pokemon_forms where pokemon_form_id = chosen_form;/g,
    "select f.form_label into chosen_form_label from public.pokemon_forms f where f.pokemon_form_id = chosen_form;"
  );
  t = t.replace(
    /'formLabel', coalesce\(form_label, 'Base'\)/g,
    "'formLabel', coalesce(chosen_form_label, 'Base')"
  );
  if (t !== before) {
    fs.writeFileSync(p, t);
    console.log("patched", path.basename(p));
  } else {
    console.log("noop", path.basename(p));
  }
}
