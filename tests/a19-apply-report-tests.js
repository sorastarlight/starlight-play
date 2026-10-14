/* node tests/a19-apply-report-tests.js */
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

const report = read("docs/project-command-center/GEN-IX-APPLY-REPORT.md");
const decisions = read("docs/project-command-center/DECISIONS.md");
const seedManifest = JSON.parse(read("supabase/unapplied/a19-schema/seed/manifest.json"));
const mig = fs.readdirSync(path.join(__dirname, "..", "supabase", "migrations")).join("\n");

test("D35 report records owner GO and named sequence only", () => {
  assert(report.includes("**Verdict: APPLIED.**"));
  assert(report.includes("001_private_ref_tables.sql"));
  assert(report.includes("002_catches_nullable_extensions.sql"));
  assert(report.includes("seed `00`–`10`") || report.includes("seed `00` through `10`"));
  assert(report.includes("14 Oct 2026 07:44:26") || report.includes("2026-10-14 07:44:26"));
  assert(/PITR/i.test(report) && /disabled/i.test(report));
  assert(report.includes("entire") && /PostgreSQL database/i.test(report));
  assert(report.includes("003_rollback.sql") && /not\*\* run/i.test(report));
  assert(!report.includes("PRODUCTION PASS"));
  assert(!/A19-GENVAL.*APPROVED/i.test(report));
});

test("D35 report records catalog counts, RLS, nullable columns, PGRST106", () => {
  assert(report.includes("25 / 151 / 236 / 135 / 576 / 556 / 14048 / 88 / 236 / 16"));
  assert(report.includes("sl-ref-20261013-227b573"));
  assert(report.includes("PGRST106"));
  assert(report.includes("is_nullable=YES") || report.includes("nullable"));
  assert(report.includes("fail-closed"));
  assert(report.includes("Sora mutated **NO**"));
  assert(report.includes("Twinkle mutated **NO**"));
});

test("D35 is recorded and GENVAL stays unapproved", () => {
  assert(decisions.includes("D35"));
  assert(decisions.includes("A19-GENVAL"));
  assert(/A19-GENVAL[\s\S]{0,200}UNAPPROVED/.test(decisions));
  assert(!mig.includes("a19-schema"));
  assert(!mig.includes("a19_apply_"));
});

test("source artifact checksums still match disk", () => {
  assert(sha256("supabase/unapplied/a19-schema/001_private_ref_tables.sql") ===
    "61a86ed041a3c2e51788c9cf5e49cd4bfdf06e5932f906254ea94c14e0fe9a30");
  assert(sha256("supabase/unapplied/a19-schema/002_catches_nullable_extensions.sql") ===
    "855b813a437ab41a890cadaabaf0c006ca194b37abfc272e7c3da1426e03d932");
  assert(report.includes("61a86ed041a3c2e51788c9cf5e49cd4bfdf06e5932f906254ea94c14e0fe9a30"));
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
