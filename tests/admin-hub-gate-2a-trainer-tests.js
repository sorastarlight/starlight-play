/* node tests/admin-hub-gate-2a-trainer-tests.js */
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

const nextJs = read("js/admin-next.js");
const nextHtml = read("admin-next.html");
const trainerJs = read("js/admin-next-trainers.js");
const liveJs = read("js/admin-live.js");
const adminHtml = read("admin.html");

test("Trainer RPCs are allowlisted and mutations stay off", () => {
  const allow = nextJs.match(/const READ_RPCS = Object\.freeze\(\[([\s\S]*?)\]\)/);
  const names = [...allow[1].matchAll(/"([^"]+)"/g)].map((row) => row[1]);
  assert(names.join(",") === "admin_build_health,admin_game_health,admin_live_snapshot,admin_list_users,admin_user_account,admin_identity_inspect");
  [
    "admin_overview",
    "admin_live_dashboard",
    "admin_grant_pokemon",
    "admin_oak_qa",
    "evaluate_cosmetics",
    "admin_set_role",
    "admin_set_coins"
  ].forEach((name) => assert(!nextJs.includes(name) && !trainerJs.includes(name), name));
});

test("Directory uses verified list contract arguments and page size 50", () => {
  assert(nextJs.includes('readCall("admin_list_users"'));
  assert(nextJs.includes("p_query"));
  assert(nextJs.includes("p_offset"));
  assert(trainers.PAGE === 50);
  assert(nextHtml.includes("Search trainers"));
  assert(nextHtml.includes("data-trainers-prev"));
  assert(nextHtml.includes("data-trainers-next"));
  assert(nextHtml.includes("No trainers match") || trainerJs.includes("No trainers match"));
});

test("Profile uses account + inspect and generation tracking", () => {
  assert(nextJs.includes('readCall("admin_user_account"'));
  assert(nextJs.includes('readCall("admin_identity_inspect"'));
  assert(nextJs.includes("p_user"));
  assert(nextJs.includes("trainerListGen"));
  assert(nextJs.includes("trainerProfileGen"));
  assert(nextJs.includes("resetTrainers"));
  assert(!nextJs.includes("setInterval") || nextJs.includes("loadOperations"));
  const interval = nextJs.match(/setInterval\(([\s\S]*?),\s*OPS_POLL_MS\)/);
  assert(interval[1].includes("loadOperations"));
  assert(!interval[1].includes("admin_list_users"));
  assert(!interval[1].includes("admin_identity_inspect"));
});

test("Presenter renders directory, empty, denied, and identity keys", () => {
  const empty = trainers.presentDirectory({ data: { ok: true, total: 0, offset: 0, users: [] }, query: "zzz" });
  assert(empty.empty && empty.status.includes("No trainers match"));
  const denied = trainers.presentDirectory({ error: "denied" });
  assert(denied.failed && denied.status.includes("restricted"));
  const dir = trainers.presentDirectory({
    data: { total: 1, offset: 0, users: [{ id: "aaa", displayName: "Ash", login: "ash", role: "player", coins: 3, caught: 2 }] },
    selectedId: "aaa"
  });
  const html = trainers.directoryHtml(dir);
  assert(html.includes("Ash") && html.includes("data-open-trainer=\"aaa\"") && !html.includes("<script"));
  const identity = trainers.presentIdentity({
    ok: true, trainer: { level: 5 }, rankingVisible: false, rankingEligible: false,
    cosmetics: [{ id: "bg-kanto", name: "Kanto", kind: "background", unlocked: true }],
    ownedAvatarPacks: [], titles: [], badges: [], catalog: []
  });
  assert(identity.ok && identity.missingKeys.length === 0);
  const profile = trainers.presentProfile({
    account: { user: { displayName: "Ash", emailLogin: false }, bag: { coins: 3 }, mons: [], candy: [], connections: [] },
    identity: { ok: true, trainer: { level: 5 }, rankingVisible: false, rankingEligible: false, cosmetics: [], ownedAvatarPacks: [], titles: [], badges: [], catalog: [] },
    pane: "overview"
  });
  const profileHtml = trainers.profileHtml(profile);
  assert(profileHtml.includes("Ash"));
  assert(profileHtml.includes("Password login present"));
  assert(!profileHtml.includes("Grant"));
  assert(!profileHtml.includes("unlink"));
});

test("Locked versus unlocked cosmetics stay visible", () => {
  const view = trainers.presentProfile({
    account: { user: { displayName: "Ash" }, bag: {}, mons: [], candy: [], connections: [] },
    identity: {
      ok: true,
      trainer: {},
      cosmetics: [
        { id: "bg-kanto", name: "Kanto", kind: "background", unlocked: true },
        { id: "bg-alola", name: "Alola", kind: "background", unlocked: false }
      ],
      titles: [],
      badges: [],
      catalog: [
        { id: "bg-kanto", name: "Kanto", kind: "background" },
        { id: "bg-alola", name: "Alola", kind: "background" }
      ],
      ownedAvatarPacks: []
    },
    pane: "progression"
  });
  const html = trainers.profileHtml(view);
  assert(html.includes("Unlocked") && html.includes("Locked"));
  assert(html.includes("Available catalog"));
  const loading = trainers.presentDirectory({
    error: "loading",
    users: [{ id: "aaa", displayName: "Ash", login: "ash" }],
    total: 1,
    offset: 0
  });
  assert(loading.status.includes("Loading") && loading.users[0].displayName === "Ash");
});

test("Keyboard search form and back navigation exist", () => {
  assert(nextHtml.includes('id="next-trainer-q"'));
  assert(nextHtml.includes("data-trainers-search"));
  assert(nextHtml.includes("data-trainers-back"));
  assert(nextHtml.includes('role="status"'));
  assert(trainerJs.includes("role=\"tab\"") || trainerJs.includes("data-trainer-pane"));
});

test("Legacy admin and live director stay unchanged entry points", () => {
  assert(adminHtml.includes("js/admin-live.js"));
  assert(!adminHtml.includes("js/admin-next-trainers.js"));
  assert(liveJs.includes("admin_live_dashboard"));
  assert(nextHtml.includes("js/admin-next-trainers.js"));
  assert(nextHtml.indexOf("js/admin-next-trainers.js") < nextHtml.indexOf("js/admin-next.js"));
});

test("Sign-out and denied paths clear selected trainer state", () => {
  assert(nextJs.includes("resetTrainers()"));
  assert(nextJs.includes("closeTrainerProfile"));
  assert(nextJs.includes("is-profile"));
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
