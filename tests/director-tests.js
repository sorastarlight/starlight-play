/* node tests/director-tests.js */
globalThis.window = globalThis;
require("../js/play-ux.js");

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

test("paused encounter timer says PAUSED, not a countdown", () => {
  assert(window.playEncounterTimeText({ paused: true, phase: "throw" }) === "PAUSED");
});

test("ad pause copy is player-facing, not an enum", () => {
  assert(window.PLAY_STATUS.adPause.includes("Twitch ad break"));
  assert(!/UPCOMING_AD|AD_ACTIVE/.test(window.PLAY_STATUS.adPause));
});

const failed = results.filter((row) => !row.passed);
results.forEach((row) => {
  console.log(`${row.passed ? "PASS" : "FAIL"} ${row.name}${row.detail ? ` — ${row.detail}` : ""}`);
});
console.log(`${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
