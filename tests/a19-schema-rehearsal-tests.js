/* node tests/a19-schema-rehearsal-tests.js
 * STATIC isolation checks for issue #23. Does not start Postgres.
 * REAL SQL is `node tools/a19-schema-rehearsal.js` against embedded local only.
 */
const fs = require("fs");
const path = require("path");
const { refuseHosted, splitSql, BANNED, HOST, PORT, DB_MAIN, EXPECTED } = require("../tools/a19-schema-rehearsal.js");

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
const harness = read("tools/a19-schema-rehearsal.js");
const baseline = read("supabase/unapplied/a19-schema/rehearsal/000_synthetic_baseline.sql");

test("rehearsal target is loopback and refuses hosted Supabase", () => {
  assert(HOST === "127.0.0.1");
  assert(PORT === 55432);
  assert(DB_MAIN === "a19_rehearsal");
  assert(BANNED.test("https://dtflmlbjhttoewqgkujf.supabase.co"));
  assert(BANNED.test("postgres://x@db.xxx.supabase.co/postgres"));
  assert(!BANNED.test("127.0.0.1"));
  refuseHosted();
  assert(harness.includes("refusing hosted Supabase"));
  assert(harness.includes("listen_addresses=127.0.0.1"));
  assert(!/createClient|SUPABASE_SERVICE|service.role/i.test(harness));
});

test("synthetic baseline has no Sora, Twinkle, or live catch ids", () => {
  assert(/SYNTHETIC DATA ONLY/i.test(baseline));
  assert(/not Sora, Twinkle/i.test(baseline));
  assert(!/dtflmlbjhttoewqgkujf/i.test(baseline));
  assert(!/@twitch|sora starlight|login:\s*sora/i.test(baseline));
  assert(baseline.includes("11111111-1111-1111-1111-111111111111"));
  assert(baseline.includes("public.lgpe_species"));
  assert(baseline.includes("CREATE ROLE anon"));
  assert(baseline.includes("CREATE ROLE authenticated"));
});

test("rehearsal files stay out of migrations and do not start GENVAL", () => {
  const mig = fs.readdirSync(path.join(root, "supabase", "migrations")).join("\n");
  assert(!mig.includes("a19-schema"));
  assert(!mig.includes("000_synthetic_baseline"));
  assert(!harness.includes("generate_streamlink_mon"));
  assert(!harness.includes("A19-RESET"));
  assert(harness.includes("Does not start GENVAL"));
  assert(EXPECTED.learnsets === 14048 && EXPECTED.formPolicies === 16);
});

test("SQL splitter keeps dollar-quoted DO blocks intact", () => {
  const stmts = splitSql("DO $lock$ BEGIN PERFORM 1; END $lock$; SELECT 2;");
  assert(stmts.length === 2, String(stmts.length));
  assert(stmts[0].includes("PERFORM 1"));
  assert(stmts[1] === "SELECT 2");
});

test("001/002/003 remain the only apply/rollback scripts", () => {
  ["001_private_ref_tables.sql", "002_catches_nullable_extensions.sql", "003_rollback.sql"].forEach((name) => {
    assert(fs.existsSync(path.join(schemaDir, name)), name);
  });
  const ddl = read("supabase/unapplied/a19-schema/001_private_ref_tables.sql");
  assert(ddl.includes("source_kind"));
  assert(ddl.includes("refuse mismatched layout"));
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
