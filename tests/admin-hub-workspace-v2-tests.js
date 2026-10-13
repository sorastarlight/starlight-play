/* node tests/admin-hub-workspace-v2-tests.js */
const fs = require("fs");
const path = require("path");
const core = require("../js/admin-next-trainers.js");
const v2 = require("../js/admin-next-trainers-v2.js");

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
const fixture = read("admin-next-trainers-workspace-v2.html");
const oldFixture = read("admin-next-trainers-fixture.html");
const css = read("css/play.css");
const liveJs = read("js/admin-live.js");
const adminHtml = read("admin.html");

const sampleAccount = {
  user: { id: "a", displayName: "Ash", login: "ash", username: "ash", role: "player", pass: true, emailLogin: false, createdAt: "2026-01-01T00:00:00Z", lastSeenAt: "2026-10-01T00:00:00Z" },
  bag: { coins: 4, pokeball: 1, greatball: 0, ultraball: 0, masterball: 0, berry: 0, bait: 0, lure: 0, used: 1, capacity: 20 },
  health: { primaryTwitch: "ash", linkedTwitch: 1, gameplayTwitch: 1, botTwitch: 0 },
  mons: [{ name: "Pikachu", dex: 25, variant: "Normal", gender: "F", ball: "poke", level: 12, caughtAt: "2026-01-01T00:00:00Z" }],
  candy: [],
  connections: [{ type: "twitch", login: "ash", displayName: "Ash", twitchUserId: "1", primary: true, confirmed: true, gameplayEnabled: true, loginEnabled: true, status: "linked", linkedAt: "2026-01-02T00:00:00Z" }]
};
const sampleIdentity = {
  ok: true,
  trainer: { level: 9, xp: 100, title: "Champ", caught: 3, seen: 4 },
  rankingVisible: true,
  rankingEligible: false,
  cosmetics: [{ id: "bg-kanto", name: "Kanto", kind: "background", unlocked: true, equipped: true }],
  titles: [{ id: "champ", name: "Champ", unlocked: true }],
  badges: [{ id: "boulder", name: "Boulder", unlocked: false }],
  catalog: [{ id: "bg-kanto", name: "Kanto", kind: "background" }],
  ownedAvatarPacks: ["kanto"]
};

test("Workspace 2.0 is a separate fixture and does not replace admin-next Trainers", () => {
  assert(fs.existsSync(path.join(__dirname, "..", "admin-next-trainers-workspace-v2.html")));
  assert(fs.existsSync(path.join(__dirname, "..", "js/admin-next-trainers-v2.js")));
  assert(!nextHtml.includes("admin-next-trainers-workspace-v2"));
  assert(!nextHtml.includes("PLAY_ADMIN_NEXT_TRAINERS_V2"));
  assert(!nextJs.includes("admin-next-trainers-v2"));
  assert(nextHtml.includes("admin-next-trainer-list"));
  assert(oldFixture.includes("admin-next-trainers-workspace-v2.html"));
});

test("Directory is a compact table, not the 300px card gallery", () => {
  const html = v2.directoryHtml(core.presentDirectory({
    data: { total: 2, offset: 0, users: [{ id: "a", displayName: "Ash", login: "ash", role: "player", pass: true, caught: 3, lastSeenAt: "2026-10-01T00:00:00Z" }] }
  }));
  assert(html.includes('role="table"'));
  assert(html.includes("Last seen"));
  assert(html.includes("@ash"));
  assert(!html.includes("admin-next-trainer-row"));
  assert(!html.includes("admin-next-dir-card"));
  assert(!css.includes(".admin-next-ws2-row") || css.includes("grid-template-columns: minmax(12rem, 2fr)"));
  assert(css.includes("container-name: ws2"));
  assert(!html.includes("300px"));
});

test("Profile is a full-width workspace with All trainers restore control", () => {
  const html = v2.profileHtml(core.presentProfile({ account: sampleAccount, identity: sampleIdentity, pane: "overview" }));
  assert(html.includes("data-ws2-back"));
  assert(html.includes("All trainers"));
  assert(html.includes("Connection summary"));
  assert(html.includes("unavailable") || html.includes("Yes"));
  assert(!html.includes("admin-next-dossier-card"));
  assert(!html.includes("data-trainers-dir"));
});

test("Panes stay contract-truthful and Progression can filter unlocks", () => {
  const pokemon = v2.profileHtml(core.presentProfile({ account: sampleAccount, identity: sampleIdentity, pane: "pokemon" }));
  assert(pokemon.includes("Newest 40 live Pokémon"));
  assert(pokemon.includes("admin-next-ws2-mon"));
  assert(!pokemon.includes("<table"));
  const inventory = v2.profileHtml(core.presentProfile({ account: sampleAccount, identity: sampleIdentity, pane: "inventory" }));
  assert(inventory.includes("Poké Balls"));
  assert(inventory.includes("Consumables"));
  assert(inventory.includes("Family candy"));
  const locked = core.presentProfile({ account: sampleAccount, identity: sampleIdentity, pane: "progression" });
  locked.unlockFilter = "locked";
  const progression = v2.profileHtml(locked);
  assert(progression.includes("Boulder"));
  assert(progression.includes("No titles in this filter."));
  assert(progression.includes("Enabled catalog matches the unlock list above"));
  const connections = v2.profileHtml(core.presentProfile({ account: sampleAccount, identity: sampleIdentity, pane: "connections" }));
  assert(connections.includes("Primary Twitch"));
  assert(connections.includes("Gameplay on"));
});

test("Fixture stays local, restores directory state, and keeps QA outside the canvas", () => {
  assert(fixture.includes("LOCAL FIXTURE"));
  assert(fixture.includes("127.0.0.1"));
  assert(!fixture.includes("playCall("));
  assert(!fixture.includes("service_role"));
  assert(!fixture.includes("admin_overview"));
  assert(fixture.includes("dirScroll"));
  assert(fixture.includes("data-ws2-back"));
  assert(fixture.includes("FIXTURE_PAGE"));
  const canvas = fixture.split("data-ws2-root")[1].split("data-fixture-states")[0];
  assert(!canvas.includes("data-fixture-state"));
  assert(fixture.includes("<details class=\"admin-next-ws2-lab\""));
  assert(fixture.includes("data-fixture-state=\"empty\""));
  assert(css.includes("prefers-reduced-motion"));
});

test("Prototype does not add writes or touch legacy admin", () => {
  const v2js = read("js/admin-next-trainers-v2.js");
  [
    "admin_grant_pokemon",
    "admin_set_coins",
    "admin_set_role",
    "admin_overview",
    "admin_oak_qa",
    "evaluate_cosmetics"
  ].forEach((name) => assert(!v2js.includes(name) && !fixture.includes(name), name));
  assert(adminHtml.includes("js/admin-live.js"));
  assert(liveJs.includes("admin_live_dashboard"));
  assert(v2.PAGE === 50);
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
