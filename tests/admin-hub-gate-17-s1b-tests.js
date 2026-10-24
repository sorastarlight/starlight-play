/* node tests/admin-hub-gate-17-s1b-tests.js */
const fs = require("fs");
const path = require("path");
const contract = require("../js/admin-next-ops.js");

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

const nextJs = read("js/admin-next.js");
const nextHtml = read("admin-next.html");
const opsJs = read("js/admin-next-ops.js");
const liveJs = read("js/admin-live.js");
const adminHtml = read("admin.html");

test("No generic dispatcher and no unsafe mutation controls", () => {
  assert(nextJs.includes("if (!READ_RPCS.includes(name))"));
  const reportTransport = 'allowed: () => staffOpen, call: (name, args) => window.playCall(name, args)';
  const configTransport = 'allowed: () => staffOpen, call: (command, args) => window.playCall(command, args)';
  assert(nextJs.includes(reportTransport), "reviewed Analytics adapter transport missing");
  assert(nextJs.includes(configTransport), "reviewed configuration adapter transport missing");
  const sessionTransport = 'allowed: () => staffOpen && currentTab() === "operations" && !document.hidden, call: (name, args) => window.playCall(name, args)';
  assert(nextJs.includes(sessionTransport), "reviewed session adapter missing");
  assert(!/playCall\(\s*(name|command)/.test(nextJs.replace(configTransport, "").replace(reportTransport, "").replace(sessionTransport, "").replace("window.playCall(name, args)", "")));
  assert(JSON.stringify(require("../js/admin-next-session.js").actions) === JSON.stringify(["start_session","end_session"]), "session actions must stay restricted");
  assert(JSON.stringify(require("../js/admin-next-config.js").commands) === JSON.stringify(["admin_economy_overview", "admin_economy_save"]), "configuration adapter must stay restricted");
  const analytics = require("../js/admin-next-analytics.js");
  assert(JSON.stringify(Object.values(analytics.commands)) === JSON.stringify(["admin_capture_report", "admin_progression_overview", "admin_collection_overview", "admin_economy_overview"]), "report adapter must stay restricted");
  assert(!nextHtml.includes("Start random"));
  assert(!nextHtml.includes("id=\"start-random\""));
  assert(!nextHtml.includes("admin_director_command"));
  assert(!nextJs.includes("admin_overview"));
  assert(!nextJs.includes("admin_live_dashboard"));
});

test("Polling is snapshot-only, single-flight, and stops off Operations / hidden", () => {
  assert(nextJs.includes('readCall("admin_live_snapshot")'), "snapshot read missing");
  const interval = nextJs.match(/setInterval\(([\s\S]*?),\s*OPS_POLL_MS\)/);
  assert(interval, "snapshot interval missing");
  assert(interval[1].includes("loadOperations"), "interval must call loadOperations");
  assert(!interval[1].includes("admin_build_health"), "health RPC must not be polled");
  assert(!interval[1].includes("admin_game_health"), "health RPC must not be polled");
  assert(nextJs.includes("opsInFlight"), "single-flight missing");
  assert(nextJs.includes("stopOpsPoll"), "stop missing");
  assert(nextJs.includes("document.hidden"), "hidden check missing");
  assert(nextJs.includes("visibilitychange"), "visibility listener missing");
  assert(nextJs.includes("currentTab() === \"operations\""), "operations-only restart missing");
});

test("Presenter keeps Twitch STALE off OFFLINE and settlement off healthy", () => {
  const stale = contract.presentLiveOperations({
    payload: {
      ok: true,
      twitch: { state: "STALE", live: null, known: false, stale: true, checkedAt: "2026-10-10T17:15:29Z" },
      rpgSession: { state: "INACTIVE", active: false, directorRowPresent: true, sessionRowPresent: false },
      director: { status: "OFFLINE" },
      currentEncounter: null,
      lastEncounter: { phase: "closed", inProgress: false, name: "Rattata" },
      settlement: { awaiting: null, state: "UNAVAILABLE" }
    }
  });
  const twitch = stale.cards.find((row) => row.label === "Twitch");
  const settle = stale.cards.find((row) => row.label === "Settlement");
  assert(twitch.value === "STALE");
  assert(twitch.state !== "inactive");
  assert(settle.value === "UNAVAILABLE");
  assert(stale.mutate === false);
});

test("Legacy live director module is untouched", () => {
  assert(adminHtml.includes("js/admin-live.js"));
  assert(liveJs.includes("admin_live_dashboard"));
  assert(!adminHtml.includes("js/admin-next.js"));
  assert(!adminHtml.includes("js/admin-next-ops.js"));
});

test("Preview HTML loads the presenter before the shell", () => {
  const opsAt = nextHtml.indexOf("js/admin-next-ops.js");
  const shellAt = nextHtml.indexOf("js/admin-next.js");
  assert(opsAt >= 0 && shellAt > opsAt);
  assert(opsJs.includes("presentLiveOperations"));
  assert(nextHtml.includes("Twitch LIVE permits the Live RPG"));
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
