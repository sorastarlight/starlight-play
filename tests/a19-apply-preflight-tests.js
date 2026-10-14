/* node tests/a19-apply-preflight-tests.js */
const fs = require("fs");
const path = require("path");

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

const report = read("docs/project-command-center/GEN-IX-PRODUCTION-PREFLIGHT.md");
const queries = read("supabase/unapplied/a19-schema/preflight/000_metadata_only.sql");
const mig = fs.readdirSync(path.join(__dirname, "..", "supabase", "migrations")).join("\n");
const evo = read("supabase/unapplied/a19-schema/seed/08_evolutions.sql");

test("preflight report is metadata-only and does not approve apply", () => {
  assert(report.includes("A19-APPLY remains **UNAPPROVED**"));
  assert(report.includes("dtflmlbjhttoewqgkujf"));
  assert(/LIVE CATALOG/.test(report));
  assert(/UNKNOWN/.test(report));
  assert(!/PRODUCTION PASS/.test(report));
  assert(report.includes("reltuples"));
  assert(!/SELECT \* FROM public\.catches/i.test(report));
});

test("metadata script is SELECT-only and stays out of migrations", () => {
  assert(/DO NOT RUN writes/i.test(queries));
  assert(queries.includes("information_schema.columns"));
  assert(!/^\s*(INSERT|UPDATE|DELETE|TRUNCATE|ALTER|CREATE|DROP|GRANT|REVOKE)\b/im.test(queries));
  assert(!mig.includes("a19-schema"));
  assert(!mig.includes("000_metadata_only"));
});

test("issue 23 evo_uid fix is still in the staged seed", () => {
  const uids = [...evo.matchAll(/'sl-ref-20261013-227b573', '([^']+)'/g)].map((m) => m[1]);
  assert(uids.length === 88, String(uids.length));
  assert(new Set(uids).size === 88);
  assert(uids.some((id) => /:\d+$/.test(id)));
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
