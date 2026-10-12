/* node tests/admin-hub-overhaul-tests.js */
const fs = require("fs");
const path = require("path");
const trainers = require("../js/admin-next-trainers.js");

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

const nextHtml = read("admin-next.html");
const nextJs = read("js/admin-next.js");
const trainerJs = read("js/admin-next-trainers.js");
const fixtureHtml = read("admin-next-trainers-fixture.html");
const adminHtml = read("admin.html");
const liveJs = read("js/admin-live.js");
const commandCenter = read("STREAMLINK_CURSOR_COMMAND_CENTER.md");

test("Command center documents and project rule exist", () => {
  [
    "docs/project-command-center/README.md",
    "docs/project-command-center/ROADMAP.md",
    "docs/project-command-center/TASKS.md",
    "docs/project-command-center/TASKS.json",
    "docs/project-command-center/DECISIONS.md",
    "docs/project-command-center/RISKS.md",
    "docs/project-command-center/TEST-MATRIX.md",
    "docs/project-command-center/RUN-LOG.md",
    "docs/project-command-center/ADMIN-HUB-INVENTORY.md",
    "docs/project-command-center/ADMIN-HUB-IA.md",
    ".cursor/rules/streamlink-project.mdc"
  ].forEach((rel) => assert(fs.existsSync(path.join(__dirname, "..", rel)), rel));
  assert(commandCenter.includes("First execution boundary"));
});

test("Overview dossier no longer repeats ranking, coins, or Twitch", () => {
  const html = trainers.profileHtml(trainers.presentProfile({
    account: {
      user: { displayName: "Ash", login: "ash", emailLogin: false, role: "player" },
      bag: { coins: 99 },
      health: { primaryTwitch: "ash" },
      mons: [],
      candy: [],
      connections: []
    },
    identity: {
      ok: true,
      trainer: { level: 9, title: "Champ" },
      rankingVisible: true,
      rankingEligible: false,
      cosmetics: [],
      titles: [],
      badges: [],
      catalog: [],
      ownedAvatarPacks: []
    },
    pane: "overview"
  }));
  assert(html.includes("Account") && html.includes("Registration"));
  assert(html.includes("Password login present"));
  assert(html.includes("admin-next-dossier-jumps"));
  assert(!html.includes("Ranking visible"));
  assert(!html.includes("Primary Twitch"));
  assert(!html.includes("Champ"));
});

test("Progression remains the canonical ranking and cosmetic pane", () => {
  const html = trainers.profileHtml(trainers.presentProfile({
    account: { user: { displayName: "Ash" }, bag: {}, mons: [], candy: [], connections: [] },
    identity: {
      ok: true,
      trainer: { level: 9 },
      rankingVisible: true,
      rankingEligible: false,
      cosmetics: [{ id: "bg-kanto", name: "Kanto", kind: "background", unlocked: true }],
      titles: [],
      badges: [],
      catalog: [{ id: "bg-kanto", name: "Kanto", kind: "background" }],
      ownedAvatarPacks: []
    },
    pane: "progression"
  }));
  assert(html.includes("Ranking visible"));
  assert(html.includes("Available catalog"));
  assert(html.includes("Enabled catalog matches the unlock list above"));
});

test("Directory status and pager hide when a single page is shown", () => {
  const view = trainers.presentDirectory({
    data: { total: 2, offset: 0, users: [{ id: "a", displayName: "Ash", login: "ash" }, { id: "b", displayName: "Blue", login: "blue" }] }
  });
  assert(view.status === "2 trainers.");
  assert(view.showPager === false);
  const empty = trainers.presentDirectory({ data: { total: 0, offset: 0, users: [] }, query: "zzz" });
  assert(empty.empty && empty.status.includes("No trainers match"));
});

test("Overview omits username when it matches login", () => {
  const html = trainers.profileHtml(trainers.presentProfile({
    account: { user: { displayName: "Ash", login: "ash", username: "ash", emailLogin: false }, bag: {}, mons: [], candy: [], connections: [] },
    identity: { ok: true, trainer: {}, cosmetics: [], titles: [], badges: [], catalog: [], ownedAvatarPacks: [] },
    pane: "overview"
  }));
  assert(html.includes("Login"));
  assert(!html.includes("<dt>Username</dt>"));
});

test("Fixture stays local, blocks live RPCs, and exposes QA states", () => {
  assert(fixtureHtml.includes("LOCAL FIXTURE"));
  assert(fixtureHtml.includes("data-fixture-state=\"empty\""));
  assert(fixtureHtml.includes("data-fixture-state=\"denied\""));
  assert(fixtureHtml.includes("data-fixture-state=\"loading\""));
  assert(!fixtureHtml.includes("playCall("));
  assert(!fixtureHtml.includes("service_role"));
  assert(!fixtureHtml.includes("admin_overview"));
});

test("Support is the only next-hub grant doorway", () => {
  const trainersPanel = nextHtml.split('data-next-panel="trainers"')[1].split('data-next-panel="support"')[0];
  assert(!trainersPanel.includes('href="./admin.html?section=trainers"'));
  assert(trainersPanel.includes("section=support"));
  assert(nextHtml.includes("Canonical grants, coins, unlinks, and roles"));
  assert(nextHtml.includes("Canonical Oak QA"));
});

test("Preview still has no privileged writes and legacy entry points stay put", () => {
  [
    "admin_grant_pokemon",
    "admin_set_coins",
    "admin_set_role",
    "admin_overview",
    "admin_oak_qa",
    "evaluate_cosmetics"
  ].forEach((name) => assert(!nextJs.includes(name) && !trainerJs.includes(name), name));
  assert(adminHtml.includes("js/admin-live.js"));
  assert(liveJs.includes("admin_live_dashboard"));
  assert(fixtureHtml.includes("LOCAL FIXTURE"));
  assert(fixtureHtml.includes("127.0.0.1"));
  assert(!fixtureHtml.includes("service_role"));
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
