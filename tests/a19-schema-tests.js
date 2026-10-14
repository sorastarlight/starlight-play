/* node tests/a19-schema-tests.js */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { loadPin, verifyManifest } = require("../tools/lib/gen9-ref");

const results = [];
function test(name, fn) {
  try {
    fn();
    results.push({ name, passed: true });
  } catch (error) {
    results.push({ name, passed: false, detail: error.message });
  }
}
function assert(cond, detail) {
  if (!cond) throw new Error(detail || "failed");
}
function read(rel) {
  return fs.readFileSync(path.join(__dirname, "..", rel), "utf8");
}

const root = path.join(__dirname, "..");
const schemaDir = path.join(root, "supabase", "unapplied", "a19-schema");
const seedDir = path.join(schemaDir, "seed");
const migrationsDir = path.join(root, "supabase", "migrations");
const pin = loadPin();

test("pin stays offline and 220/16", () => {
  assert(!verifyManifest(pin).length);
  assert(pin.coverage.resolvedLearnsets === 220);
  assert(pin.coverage.unresolvedLearnsets === 16);
  assert(pin.meta.appliedToSupabase === false);
  assert(pin.species.find((s) => s.dex === 1).baseFriendship === 70);
});

test("A19-SCHEMA files stay out of migrations and marked DO NOT RUN", () => {
  [
    "001_private_ref_tables.sql",
    "002_catches_nullable_extensions.sql",
    "003_rollback.sql",
    "DO-NOT-APPLY.md"
  ].forEach((name) => {
    const text = fs.readFileSync(path.join(schemaDir, name), "utf8");
    assert(/DO NOT RUN|Must not be run/i.test(text), name);
  });
  const mig = fs.readdirSync(migrationsDir).join("\n");
  assert(!mig.includes("a19-schema") && !mig.includes("ref_form_policies"));
});

test("reference DDL is private, RLS-locked, and has no SECURITY DEFINER", () => {
  const ddl = read("supabase/unapplied/a19-schema/001_private_ref_tables.sql");
  assert(ddl.includes("CREATE TABLE IF NOT EXISTS private.ref_meta"));
  assert(!/CREATE TABLE IF NOT EXISTS ref_meta;/.test(ddl));
  assert(!/CREATE TABLE IF NOT EXISTS public\.ref_/.test(ddl));
  assert(/ENABLE ROW LEVEL SECURITY/.test(ddl));
  assert(/REVOKE ALL ON TABLE private\.%I FROM public, anon, authenticated/.test(ddl));
  assert(!/REVOKE ALL ON SCHEMA private/.test(ddl));
  assert(!/CREATE .*SECURITY DEFINER/i.test(ddl));
  assert(!/CREATE (OR REPLACE )?FUNCTION/i.test(ddl));
  assert(ddl.includes("source_kind"));
  assert(!/applied_to_live/.test(ddl));
  assert(ddl.includes("streamlink_base_friendship"));
  assert(ddl.includes("ref_form_policies"));
  assert(ddl.includes("lgpe_species"));
  ["ref_natures", "ref_species", "ref_forms", "ref_abilities", "ref_form_abilities", "ref_moves", "ref_learnsets", "ref_evolutions", "ref_obtain"].forEach((t) => {
    assert(ddl.includes(`private.${t}`), t);
  });
});

test("catch extensions are nullable, additive, and preserve legacy columns", () => {
  const ddl = read("supabase/unapplied/a19-schema/002_catches_nullable_extensions.sql");
  assert(ddl.includes("ADD COLUMN IF NOT EXISTS nature_id integer"));
  assert(ddl.includes("ability_slot"));
  assert(ddl.includes("ev_hp"));
  assert(ddl.includes("move_slots"));
  assert(ddl.includes("ruleset_id"));
  assert(ddl.includes("content_build"));
  assert(ddl.includes("hp_current"));
  assert(ddl.includes("held_item"));
  assert(ddl.includes("gigantamax_factor"));
  assert(!/UPDATE public\.catches/i.test(ddl));
  assert(!/DROP COLUMN/.test(ddl));
  assert(!/iv_hp/.test(ddl) || ddl.includes("Does not rewrite iv_*"));
  assert(!/CREATE FUNCTION/i.test(ddl));
  assert(!/SECURITY DEFINER/i.test(ddl));
  assert(ddl.includes("NULL-tolerant") || ddl.includes("nullable"));
  const rollback = read("supabase/unapplied/a19-schema/003_rollback.sql");
  assert(rollback.includes("DROP COLUMN IF EXISTS nature_id"));
  assert(rollback.includes("DROP TABLE IF EXISTS private.ref_meta"));
  assert(!/DROP TABLE.*lgpe_species/i.test(rollback));
});

test("seed emitter is deterministic and matches pin counts", () => {
  const first = JSON.parse(fs.readFileSync(path.join(seedDir, "manifest.json"), "utf8"));
  const run = spawnSync(process.execPath, [path.join(root, "tools", "emit-a19-schema-seed.js")], { encoding: "utf8" });
  assert(run.status === 0, run.stderr || run.stdout);
  const second = JSON.parse(fs.readFileSync(path.join(seedDir, "manifest.json"), "utf8"));
  assert(JSON.stringify(first.files) === JSON.stringify(second.files), "seed hash drift");
  assert(second.counts.natures === 25);
  assert(second.counts.species === 151);
  assert(second.counts.forms === 236);
  assert(second.counts.learnsets === 14048);
  assert(second.counts.evolutions === 88);
  assert(second.counts.formPolicies === 16);
  assert(second.appliedToSupabase === false);
});

test("F1 friendship is derived in seed SQL without rewriting the pin", () => {
  const speciesSql = read("supabase/unapplied/a19-schema/seed/02_species.sql");
  assert(speciesSql.includes("1, 'bulbasaur', 1, 70, 50"));
  assert(speciesSql.includes("'clefable'") && speciesSql.includes("140, 140"));
  assert(speciesSql.includes("'mewtwo', -1, 0, 0"));
  assert(speciesSql.includes("'mew'") && speciesSql.includes("100, 100"));
  assert(pin.species.find((s) => s.dex === 1).baseFriendship === 70);
});

test("G1 and C1 policies fail-close wild and grant on the 16 special form ids", () => {
  const obtain = read("supabase/unapplied/a19-schema/seed/09_obtain.sql");
  const policies = read("supabase/unapplied/a19-schema/seed/10_form_policies.sql");
  [10195, 10196, 10206, 10278, 10281].forEach((id) => {
    assert(obtain.includes(`${id},`) && obtain.includes("FALSE, FALSE, FALSE, FALSE"), String(id));
  });
  assert((policies.match(/'G1'/g) || []).length === 12);
  assert((policies.match(/'C1'/g) || []).length === 4);
  assert(policies.includes("persist_as") || policies.includes("'base'"));
  const pinObtain = pin.obtain.find((o) => o.formId === 10196);
  assert(pinObtain.adminTargetable === true, "pin obtain.json must stay unchanged");
});

test("seed files are idempotent INSERT ... ON CONFLICT and never call the network", () => {
  fs.readdirSync(seedDir).filter((n) => n.endsWith(".sql")).forEach((name) => {
    const text = fs.readFileSync(path.join(seedDir, name), "utf8");
    assert(text.includes("DO NOT RUN"), name);
    assert(text.includes("ON CONFLICT"), name);
    assert(!/pokeapi\.co|https?:\/\//i.test(text.replace(/PokéAPI|pokeapi commit/gi, "")), name);
  });
  const emit = read("tools/emit-a19-schema-seed.js");
  assert(emit.includes("Does not connect"));
  assert(!emit.includes("fetch("));
});

const failed = results.filter((row) => !row.passed);
results.forEach((row) => {
  console.log(`${row.passed ? "PASS" : "FAIL"} ${row.name}${row.detail ? ` — ${row.detail}` : ""}`);
});
if (failed.length) {
  console.error(`\n${failed.length} failed`);
  process.exit(1);
}
console.log(`\n${results.length} passed`);
