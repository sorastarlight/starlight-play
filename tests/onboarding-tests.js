/* node tests/onboarding-tests.js */
const fs = require("fs");
const path = require("path");
globalThis.window = globalThis;
require("../js/onboarding.js");

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
function memoryStore(seed) {
  const data = Object.assign({}, seed || {});
  return {
    getItem(key) { return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null; },
    setItem(key, value) { data[key] = String(value); },
    dump() { return data; }
  };
}

const steps = window.playOnboardingSteps();
const copy = steps.map((step) => `${step.title} ${step.body}`).join("\n");

test("guide covers the first-time loop in one place", () => {
  assert(steps.length === 6);
  assert(copy.includes("username, email, and password"));
  assert(copy.includes("Linking Twitch is optional"));
  assert(copy.includes("do not require a linked Twitch account"));
  assert(copy.includes("Join Encounter"));
  assert(copy.includes("does not have to be finished first"));
  assert(copy.includes("Oran Berry"));
  assert(copy.includes("Other capture berries"));
  assert(copy.includes("Honey"));
  assert(copy.includes("does not replace your Poké Ball"));
  assert(copy.includes("owned ball is spent"));
  assert(copy.includes("borrowed standard throw"));
  assert(copy.includes("not added to your inventory"));
  assert(copy.includes("escapes"));
  assert(copy.includes("not guaranteed"));
  assert(copy.includes("My PC"));
  assert(copy.includes("Pokédex"));
  assert(copy.includes("Mart"));
  assert(copy.includes("Daily Trainer Supply"));
});

test("new trainer auto-opens and an experienced trainer does not", () => {
  const fresh = window.playOnboardingLoad(memoryStore(), "anon");
  assert(window.playOnboardingAppearance(fresh, { catches: 0 }) === "expanded");
  assert(window.playOnboardingAppearance(fresh, { catches: null }) === "expanded");
  assert(window.playOnboardingAppearance(fresh, { catches: 4 }) === "hidden");
  assert(window.playOnboardingAppearance(fresh, { catches: 0, liveRound: true }) === "chip");
  assert(window.playOnboardingAppearance(fresh, { place: "play", known: false }) === "hidden");
});

test("next, back, skip, and resume keep the step", () => {
  let state = window.playOnboardingLoad(memoryStore(), "anon");
  state = window.playOnboardingReduce(state, "next");
  assert(state.step === 1 && state.status === "active" && state.touched);
  state = window.playOnboardingReduce(state, "back");
  assert(state.step === 0 && state.status === "active");
  state = window.playOnboardingReduce(state, "next");
  state = window.playOnboardingReduce(state, "skip");
  assert(state.status === "skipped" && state.step === 1);
  assert(window.playOnboardingAppearance(state, { catches: 0 }) === "chip");
  state = window.playOnboardingReduce(state, "reopen");
  assert(state.status === "active" && state.step === 1);
  assert(window.playOnboardingAppearance(state, { place: "play", known: true, holdOpen: true, liveRound: true }) === "chip");
  assert(window.playOnboardingAppearance(state, { place: "play", known: true, holdOpen: true, liveRound: false }) === "expanded");
});

test("live Play always collapses even after forced reopen", () => {
  const fresh = window.playOnboardingLoad(memoryStore(), "anon");
  for (const options of [
    { place: "play", known: true, catches: 0, liveRound: true, holdOpen: true },
    { place: "play", known: true, catches: 0, liveRound: true, force: true },
    { place: "play", known: true, catches: 3, liveRound: true, holdOpen: true }
  ]) {
    assert(window.playOnboardingAppearance(fresh, options) === "chip");
  }
  assert(window.playOnboardingAppearance(fresh, { place: "play", known: false, liveRound: true, holdOpen: true }) === "hidden");
  assert(window.playOnboardingAppearance(fresh, { place: "help", force: true, liveRound: true }) === "expanded");
});

test("finish marks the guide done and reopen starts at the first step", () => {
  let state = { version: 1, step: 5, status: "active", touched: true };
  state = window.playOnboardingReduce(state, "next");
  assert(state.status === "done" && state.step === 5);
  state = window.playOnboardingReduce(state, "reopen");
  assert(state.status === "active" && state.step === 0);
});

test("anon progress is copied onto the signed-in trainer", () => {
  const store = memoryStore();
  window.playOnboardingSave(store, "anon", { version: 1, step: 3, status: "active", touched: true });
  const loaded = window.playOnboardingLoad(store, "trainer-1");
  assert(loaded.step === 3 && loaded.touched);
  const again = window.playOnboardingLoad(store, "trainer-1");
  assert(again.step === 3);
  window.playOnboardingSave(store, "trainer-1", { version: 1, step: 4, status: "skipped", touched: true });
  window.playOnboardingSave(store, "anon", { version: 1, step: 0, status: "active", touched: false });
  assert(window.playOnboardingLoad(store, "trainer-1").step === 4);
});

test("expanded card is skippable and does not trap the page", () => {
  const html = window.playOnboardingHtml(
    { version: 1, step: 3, status: "active", touched: true },
    { appearance: "expanded" }
  );
  assert(html.includes("Skip guide"));
  assert(html.includes("Step 4 of 6"));
  assert(html.includes("Berries and Honey"));
  assert(html.includes('data-onboarding="back"'));
  assert(!html.includes("aria-modal"));
  assert(!html.includes("position:fixed"));
  assert(!html.includes("inert"));
});

test("guide file does not call gameplay or economy RPCs", () => {
  const src = fs.readFileSync(path.join(__dirname, "..", "js", "onboarding.js"), "utf8");
  assert(!src.includes("playCall"));
  assert(!src.includes("capture_chance"));
  assert(!src.includes("spend_bag_item"));
  assert(!src.includes("streamlink_wire"));
  const play = fs.readFileSync(path.join(__dirname, "..", "js", "play.js"), "utf8");
  assert(play.includes("playOnboardingControl?.sync"));
  const index = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const help = fs.readFileSync(path.join(__dirname, "..", "help.html"), "utf8");
  assert(index.includes('id="trainer-guide"'));
  assert(index.includes("js/onboarding.js"));
  assert(help.includes('id="trainer-guide"'));
  assert(help.includes("help.html#trainer-guide") === false);
  const register = fs.readFileSync(path.join(__dirname, "..", "register.html"), "utf8");
  assert(register.includes("help.html#trainer-guide"));
  assert(register.includes("You can skip it"));
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
