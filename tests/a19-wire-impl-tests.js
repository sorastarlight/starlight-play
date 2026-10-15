/* node tests/a19-wire-impl-tests.js
 * STATIC isolation for A19-WIRE D45. Does not start Postgres.
 * REAL SQL is `node tools/a19-wire-rehearsal.js` and `node tools/a19-reset-rehearsal.js`.
 */
const fs = require("fs");
const path = require("path");
const { refuseHosted, BANNED, HOST, PORT, DB_MAIN } = require("../tools/a19-wire-rehearsal.js");
const reset = require("../tools/a19-reset-rehearsal.js");

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
const persist = read("supabase/unapplied/a19-wire/001_wire_switch_and_persist.sql");
const materialize = read("supabase/unapplied/a19-wire/002_materialize_hook.sql");
const settle = read("supabase/unapplied/a19-wire/003_settle_integration.sql");
const deny = read("supabase/unapplied/a19-wire/DO-NOT-APPLY.md");
const resetSql = read("supabase/unapplied/a19-reset/001_ra_pokemon_progression.sql");
const mig = fs.readdirSync(path.join(root, "supabase", "migrations")).join("\n");
const stampLive = read("supabase/migrations/20260914070000_encounter_pokemon_level.sql");

test("WIRE SQL stays unapplied and refuses live apply language", () => {
  assert(deny.includes("dtflmlbjhttoewqgkujf"));
  assert(persist.includes("DO NOT RUN against live Supabase"));
  assert(materialize.includes("DO NOT RUN against live Supabase"));
  assert(settle.includes("DO NOT RUN against live Supabase"));
  assert(settle.includes("materialize_streamlink_catch"));
  assert(settle.includes("announce_throws"));
  assert(settle.includes("capture_chance"));
  assert(settle.includes("wire-materialize-failed"));
  assert(!settle.includes("CREATE OR REPLACE FUNCTION private.stamp_catch_row"));
  assert(persist.includes("Does not replace private.stamp_catch_row"));
  assert(!persist.includes("CREATE OR REPLACE FUNCTION private.stamp_catch_row"));
  assert(!materialize.includes("CREATE OR REPLACE FUNCTION private.stamp_catch_row"));
  assert(!mig.includes("a19-wire"));
  assert(!mig.includes("persist_streamlink_catch"));
});

test("switch is table-only, default off, and ignores GUCs", () => {
  assert(persist.includes("streamlink_wire_switch"));
  assert(persist.includes("DEFAULT false"));
  assert(persist.includes("Intentionally ignore current_setting('starlight.wire_genval')"));
  assert(!persist.includes("current_setting('starlight.wire_genval') IS DISTINCT"));
  assert(persist.includes("REVOKE ALL ON TABLE private.streamlink_wire_switch"));
  assert(persist.includes("REVOKE ALL ON FUNCTION"));
  assert(materialize.includes("streamlink_wire_is_enabled"));
});

test("WIRE-BIND preallocates catches.id and binds HA tickets to that uuid", () => {
  assert(persist.includes("catch_id := gen_random_uuid()"));
  assert(persist.includes("streamlink_complete_and_bind"));
  assert(persist.includes("streamlink_bind_hidden_ticket(ticket_uuid, p_specimen_id, digest)"));
  assert(persist.includes("INSERT INTO public.catches"));
  assert(persist.includes("already-settled"));
  assert(persist.includes("unique_violation"));
  assert(!/UPDATE\s+private\.streamlink_hidden_tickets[\s\S]{0,80}specimen_id/.test(persist));
});

test("GV7 SL public_id for new rows; grant/event refuse protected logins", () => {
  assert(persist.includes("streamlink_next_public_id('SL')"));
  assert(persist.includes("prefix NOT IN ('SL', 'LG')"));
  assert(persist.includes("protected-trainer"));
  assert(persist.includes("sorastarlight"));
  assert(persist.includes("twinklephoenixstar"));
  assert(persist.includes("p_ctx IN ('grant', 'event')"));
});

test("persist dual-writes Gen IX fields and does not touch capture economy", () => {
  ["nature_id", "ability_id", "ability_slot", "ev_hp", "move_slots", "hp_max", "hp_current", "ruleset_id", "content_build"].forEach((col) => {
    assert(persist.includes(col), col);
  });
  assert(!persist.includes("ball_catch_chance"));
  assert(!persist.includes("berryBonus"));
  assert(!persist.includes("honey_catch_multiplier"));
  assert(!persist.includes("UPDATE public.trainer_inventory"));
  assert(!materialize.includes("ball_catch_chance"));
  assert(stampLive.includes("private.stamp_catch_row(c catches)"));
  assert(stampLive.includes("'LG' || lpad(nextval('public.catch_serial')"));
});

test("rehearsal targets are loopback and refuse hosted Supabase", () => {
  assert(HOST === "127.0.0.1");
  assert(PORT === 55434);
  assert(DB_MAIN === "a19_wire");
  assert(reset.HOST === "127.0.0.1");
  assert(reset.PORT === 55435);
  assert(reset.DB_MAIN === "a19_reset");
  assert(BANNED.test("https://dtflmlbjhttoewqgkujf.supabase.co"));
  refuseHosted();
  reset.refuseHosted();
  const wireH = read("tools/a19-wire-rehearsal.js");
  const resetH = read("tools/a19-reset-rehearsal.js");
  assert(wireH.includes("listen_addresses=127.0.0.1"));
  assert(resetH.includes("listen_addresses=127.0.0.1"));
  assert(!/createClient|SUPABASE_SERVICE|service.role/i.test(wireH));
  assert(!/createClient|SUPABASE_SERVICE|service.role/i.test(resetH));
});

test("reset script strips stale showcase.shinyCatchId and stays unapplied", () => {
  assert(resetSql.includes("showcase - 'shinyCatchId'"));
  assert(resetSql.includes("DO NOT RUN against live Supabase"));
  assert(resetSql.includes("starlight.reset_confirm"));
  assert(resetSql.includes("sorastarlight"));
  assert(resetSql.includes("twinklephoenixstar"));
  assert(!mig.includes("a19-reset"));
  assert(read("supabase/unapplied/a19-reset/DO-NOT-APPLY.md").includes("A19-RESET-GO"));
  const rehearsal = read("docs/project-command-center/GEN-IX-RESET-REHEARSAL.md");
  assert(rehearsal.includes("implemented"));
  assert(!rehearsal.includes("Before A19-RESET-GO, add a null-out"));
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
