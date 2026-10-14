/* node tests/a19-genval-impl-tests.js
 * STATIC isolation for issue #25. Does not start Postgres.
 * REAL SQL is `node tools/a19-genval-rehearsal.js` against embedded local only.
 */
const fs = require("fs");
const path = require("path");
const { refuseHosted, BANNED, HOST, PORT, DB_MAIN } = require("../tools/a19-genval-rehearsal.js");
const { expectedGenerate, loadPin, fixtureU32 } = require("../tools/lib/a19-genval-oracle");
const { levelUpSlice } = require("../tools/lib/gen9-ref");

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
const sql = read("supabase/unapplied/a19-genval/001_generate_and_assert.sql");
const rollback = read("supabase/unapplied/a19-genval/002_rollback.sql");
const harness = read("tools/a19-genval-rehearsal.js");
const report = read("docs/project-command-center/GEN-IX-GENVAL-ISSUE-25.md");
const mig = fs.readdirSync(path.join(root, "supabase", "migrations")).join("\n");

test("GENVAL SQL stays unapplied and refuses live apply language", () => {
  assert(read("supabase/unapplied/a19-genval/DO-NOT-APPLY.md").includes("dtflmlbjhttoewqgkujf"));
  assert(sql.includes("DO NOT RUN against live Supabase"));
  assert(sql.includes("Does not replace private.stamp_catch_row"));
  assert(sql.includes("Does not INSERT/UPDATE/DELETE public.catches"));
  assert(!/UPDATE\s+public\.catches|INSERT\s+INTO\s+public\.catches/i.test(sql));
  assert(!sql.includes("stamp_catch_row("));
  assert(!mig.includes("a19-genval"));
  assert(!mig.includes("generate_streamlink_mon"));
});

test("functions are hardened and hidden is not a caller flag", () => {
  assert(sql.includes("SECURITY DEFINER"));
  assert(sql.includes("SET search_path TO pg_catalog"));
  assert(sql.includes("REVOKE ALL ON FUNCTION"));
  assert(sql.includes("streamlink_hidden_tickets"));
  assert(sql.includes("p_allow_hidden is intentionally unused") || sql.includes("p_allow_hidden is ignored"));
  assert(sql.includes("issue_streamlink_hidden_ticket"));
  assert(sql.includes("streamlink_redeem_hidden_ticket"));
  assert(sql.includes("generate_streamlink_mon_fixture"));
  assert(sql.includes("streamlink_secure_u32"));
  assert(sql.includes("p_hidden_auth"));
  assert(sql.includes("hiddenGrant / allowHidden in JSON are not authorization") ||
    sql.includes("hiddenGrant in JSON is ignored"));
  assert(!sql.includes("current_setting('starlight.genval_mode'"));
  assert(!sql.includes("starlight.catcher_nonce"));
  assert(rollback.includes("DROP FUNCTION IF EXISTS private.generate_streamlink_mon"));
  assert(rollback.includes("issue_streamlink_hidden_ticket"));
});

test("rehearsal target is loopback and refuses hosted Supabase", () => {
  assert(HOST === "127.0.0.1");
  assert(PORT === 55433);
  assert(DB_MAIN === "a19_genval");
  assert(BANNED.test("https://dtflmlbjhttoewqgkujf.supabase.co"));
  refuseHosted();
  assert(harness.includes("refusing hosted Supabase") || harness.includes("NOT supabase"));
  assert(harness.includes("listen_addresses=127.0.0.1"));
  assert(!/createClient|SUPABASE_SERVICE|service.role/i.test(harness));
  assert(!harness.includes("A19-WIRE"));
});

test("JS oracle matches pin slice and is deterministic", () => {
  const pin = loadPin();
  const a = expectedGenerate(pin, 1, 5, "catcher-alpha");
  const b = expectedGenerate(pin, 1, 5, "catcher-alpha");
  const c = expectedGenerate(pin, 1, 5, "catcher-beta");
  const slice = levelUpSlice(pin, 1, 5);
  assert(JSON.stringify(a.ivs) === JSON.stringify(b.ivs));
  assert(a.natureId === b.natureId);
  assert(JSON.stringify(a.moveIds) === JSON.stringify(slice.moves.map((m) => m.moveId)));
  assert(a.friendship === 50);
  assert(a.natureId !== c.natureId || JSON.stringify(a.ivs) !== JSON.stringify(c.ivs));
  assert(fixtureU32("x", "nature") === fixtureU32("x", "nature"));
});

test("implementation report does not claim production apply", () => {
  assert(report.includes("REAL SQL"));
  assert(report.includes("UNAPPROVED") || report.includes("not applied"));
  assert(!report.includes("PRODUCTION PASS"));
  assert(report.includes("Sora mutated **NO**"));
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
