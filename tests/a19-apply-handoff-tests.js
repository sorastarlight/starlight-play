/* node tests/a19-apply-handoff-tests.js */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

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
function sha256(rel) {
  return crypto.createHash("sha256").update(fs.readFileSync(path.join(__dirname, "..", rel))).digest("hex");
}

const handoff = read("docs/project-command-center/GEN-IX-APPLY-HANDOFF.md");
const seedManifest = JSON.parse(read("supabase/unapplied/a19-schema/seed/manifest.json"));
const mig = fs.readdirSync(path.join(__dirname, "..", "supabase", "migrations")).join("\n");

test("handoff is blocked and is not apply authorization", () => {
  assert(handoff.includes("**Verdict: BLOCKED.**"));
  assert(handoff.includes("A19-APPLY remains **UNAPPROVED**"));
  assert(handoff.includes("not** A19-APPLY authorization") || handoff.includes("**not** A19-APPLY authorization"));
  assert(handoff.includes("Owner GO/NO-GO recorded this batch: **none**"));
  assert(!/PRODUCTION PASS/.test(handoff));
  assert(!handoff.includes("A19-APPLY **APPROVED**"));
});

test("handoff requests freshest COMPLETED backup and records D33 stamp", () => {
  assert(handoff.includes("FRESHEST COMPLETED"));
  assert(handoff.includes("2026-10-14 07:44:26"));
  assert(/PITR disabled/i.test(handoff));
  assert(handoff.includes("database/backups/scheduled"));
});

test("handoff explains whole-database data loss and apply order", () => {
  assert(/entire Postgres database/i.test(handoff));
  assert(handoff.includes("001_private_ref_tables.sql"));
  assert(handoff.includes("seed/00_meta.sql"));
  assert(handoff.includes("002_catches_nullable_extensions.sql"));
  assert(/Do not run:\*\* `003_rollback.sql`/.test(handoff) || handoff.includes("003_rollback.sql"));
  assert(handoff.includes("PGRST106"));
  assert(!mig.includes("a19-schema"));
});

test("handoff checksums still match disk", () => {
  assert(sha256("supabase/unapplied/a19-schema/001_private_ref_tables.sql") ===
    "61a86ed041a3c2e51788c9cf5e49cd4bfdf06e5932f906254ea94c14e0fe9a30");
  assert(sha256("supabase/unapplied/a19-schema/002_catches_nullable_extensions.sql") ===
    "855b813a437ab41a890cadaabaf0c006ca194b37abfc272e7c3da1426e03d932");
  assert(seedManifest.appliedToSupabase === false);
  assert(handoff.includes("61a86ed041a3c2e51788c9cf5e49cd4bfdf06e5932f906254ea94c14e0fe9a30"));
  Object.entries(seedManifest.files).forEach(([name, row]) => {
    assert(sha256("supabase/unapplied/a19-schema/seed/" + name) === row.sha256, name);
  });
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
