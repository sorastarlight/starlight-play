const assert = require("node:assert/strict");
const ui = require("../js/admin-next-record.js");
const fs = require("node:fs");
const path = require("node:path");
const account = { user: { id: "fixture", displayName: '<img onerror="bad">', login: "fixture", pass: true }, bag: { coins: 0, pokeball: 4 }, mons: [{ id: "mon1", dex: 1, name: "Bulbasaur", level: 5, variant: "normal" }], candy: [{ familyId: "bulbasaur", name: "Bulbasaur Candy", qty: 3 }] };
const identity = { ok: true, trainer: { level: 7 }, cosmetics: [{ id: "bg", kind: "background", name: "Sky", unlocked: true }], catalog: [{ id: "unknown", kind: "background", name: "Unspecified ownership" }], titles: [], badges: [], ownedAvatarPacks: [] };
const view = (pane, state = {}) => ({ ...ui.presentProfile({ account, identity, pane }), recordState: state });
let checks = 0;
function test(name, run) { run(); checks++; console.log("PASS " + name); }
test("Directory omits economy and exposes full-row trainer identity", () => {
  const html = ui.directoryHtml(ui.presentDirectory({ data: { users: [{ ...account.user, coins: 999, caught: 1 }], total: 1 } }));
  assert(!html.includes("999")); assert(html.includes("Starlight Pass")); assert(html.includes("data-open-trainer")); assert(!html.includes('<img onerror="bad">'));
});
test("Record header escapes identity and excludes balances", () => {
  const header = ui.profileHtml(view("overview")).split("record-tabs")[0];
  assert(header.includes("&lt;img")); assert(!header.includes("coins")); assert(!header.includes("Level"));
  const html = ui.profileHtml(view("overview"));
  assert.equal((html.match(/role="tablist"/g) || []).length, 1);
  assert(!html.includes('class="admin-next-trainer-head"'));
  assert(html.includes("Password login present"));
});
test("Inventory drill-in keeps zero distinct from unavailable", () => {
  const html = ui.profileHtml(view("inventory", { group: "currency", item: "coins" }));
  assert(html.includes("<dd>0</dd>")); assert(!html.includes("data-record-action=\"group\""));
  assert(ui.profileHtml(view("inventory", { group: "balls", item: "ultraball" })).includes("<dd>Unavailable</dd>"));
});
test("Unlocks never infer ownership from catalog presence", () => {
  const items = ui.unlockGroups(view("progression")).find((group) => group.id === "background").items;
  assert.equal(items.find((item) => item.id === "unknown").status, "Unavailable");
  assert.equal(items.find((item) => item.id === "bg").status, "Owned");
});
test("Pokemon details show only returned specimen data", () => {
  const html = ui.profileHtml(view("pokemon", { mon: "mon1" }));
  assert(html.includes("Bulbasaur")); assert(ui.profileHtml(view("pokemon")).includes("not the full PC")); assert(html.includes("stats, box, favorite and locked status are unavailable"));
  assert(!html.includes("playCall"));
});
test("Presentation layer introduces no network or authority calls", () => {
  const source = fs.readFileSync(path.join(__dirname, "../js/admin-next-record.js"), "utf8");
  assert(!/playCall|fetch\(|\.rpc\(|supabase|localStorage/.test(source));
  const html = ui.profileHtml(view("overview"));
  assert(html.includes("data-record-support")); assert(!html.includes("data-grant"));
});
test("Tickets report missing contract without invented cases", () => {
  const html = ui.profileHtml(view("tickets"));
  assert(html.includes("No ticket count is inferred")); assert(!html.includes("Submit ticket"));
});
test("Snapshot-only row keys do not fabricate specimen ids", () => {
  const missingIdAccount = { ...account, mons: [{ name: "First" }, { name: "Second" }] };
  const snapshot = { ...ui.presentProfile({ account: missingIdAccount, pane: "pokemon" }), recordState: { mon: "snapshot-row-1" } };
  const html = ui.profileHtml(snapshot);
  assert(html.includes(">Second</h4>")); assert(html.includes("<dt>Specimen id</dt><dd>Unavailable</dd>"));
});
test("Loading and denied do not expose prior dossier data", () => {
  assert(!ui.profileHtml(ui.presentProfile({ error: "denied" })).includes("fixture"));
  assert(ui.profileHtml(ui.presentProfile({ error: "loading" })).includes("Loading trainer"));
});
console.log(`${checks} passed`);
