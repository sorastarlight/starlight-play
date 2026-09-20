/* node tests/live-rpg-session-lifecycle-tests.js */
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

const mig = read("supabase/migrations/20260920040000_live_rpg_twitch_live_is_permission.sql");
const admin = read("js/admin-live.js");
const prior = read("supabase/migrations/20260920010000_live_rpg_session_offline_end.sql");

test("Twitch LIVE is permission, not RPG session authority", () => {
  assert(mig.includes("LIVE is permission only"), "permission comment missing");
  assert(mig.includes("Do NOT begin an RPG session on offline→live"), "no-autostart comment missing");
  assert(mig.includes("director_end_rpg_session('STREAM_OFFLINE')"), "offline end missing");
  assert(!/if next_live and not prev_live then\s*perform private\.director_begin_rpg_session/.test(mig),
    "offline→live auto-start must be removed");
  assert(mig.includes("lifecycle proof failed: Twitch LIVE auto-started RPG session"), "CASE 2 proof missing");
  assert(mig.includes("tick resurrected session after manual end"), "CASE 4 proof missing");
  assert(mig.includes("duplicate LIVE started RPG"), "CASE 9 proof missing");
  assert(mig.includes("error payload started RPG"), "CASE 10 proof missing");
});

test("rc37 kept offline end and stopped tick auto-restart", () => {
  assert(prior.includes("Do NOT auto-start here"), "rc37 tick guard missing");
  assert(prior.includes("known_offline and d.rpg_session_active"), "rc37 offline safety missing");
  assert(prior.includes("SESSION_IDLE"), "SESSION_IDLE reason missing");
});

test("Admin Hub separates Twitch / Live RPG / Director Auto", () => {
  assert(admin.includes("Twitch LIVE · Live RPG IDLE"), "live+idle guide missing");
  assert(admin.includes("Start Live RPG Session"), "explicit start CTA missing");
  assert(admin.includes("Waiting for a Live RPG Session"), "auto armed-while-idle copy missing");
  assert(!admin.includes("The Director starts the Live RPG automatically"), "auto-start marketing copy must be gone");
  assert(!admin.includes("Live RPG is starting"), "misleading starting copy must be gone");
  assert(admin.includes("coming back LIVE will not restart it"), "end-session copy must reject go-live restart");
  assert(admin.includes("Session authority"), "authority panel missing");
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
