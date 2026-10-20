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
  assert(html.includes("Bulbasaur")); assert(ui.profileHtml(view("pokemon")).includes("not the full PC")); assert(html.includes("Individual stats are unavailable"));
  assert(!html.includes("playCall"));
});
test("Presentation layer introduces no network or authority calls", () => {
  const source = fs.readFileSync(path.join(__dirname, "../js/admin-next-record.js"), "utf8");
  assert(!/playCall|fetch\(|\.rpc\(|supabase|localStorage/.test(source));
  const html = ui.profileHtml(view("overview"));
  assert(html.includes("data-record-support")); assert(!html.includes("data-grant"));
});
test("Tickets wait for authorized data without invented cases", () => {
  const html = ui.profileHtml(view("tickets"));
  assert(html.includes("data-support-trainer")); assert(!html.includes("Submit ticket")); assert(!html.includes("open tickets"));
});
test("Snapshot-only row keys do not fabricate specimen ids", () => {
  const missingIdAccount = { ...account, mons: [{ name: "First" }, { name: "Second" }] };
  const snapshot = { ...ui.presentProfile({ account: missingIdAccount, pane: "pokemon" }), recordState: { mon: "snapshot-row-1" } };
  const html = ui.profileHtml(snapshot);
  assert(/>Second\s*<\/h4>/.test(html)); assert(html.includes("<dt>Specimen id</dt><dd>Unavailable</dd>"));
});
test("Loading and denied do not expose prior dossier data", () => {
  assert(!ui.profileHtml(ui.presentProfile({ error: "denied" })).includes("fixture"));
  assert(ui.profileHtml(ui.presentProfile({ error: "loading" })).includes("Loading trainer"));
});
test("Gym Badge ownership stays unavailable and separate from ribbons", () => {
  const group = ui.unlockGroups(view("progression")).find(row => row.id === "gym-badges-future");
  assert.equal(group.items.length, 0); assert(group.unavailable);
  const html = ui.profileHtml(view("progression", {group: group.id}));
  assert(html.includes("Ownership is not available yet")); assert(!html.includes("data-record-action=\"item\""));
});
test("Shiny identity, honest stats and human item labels", () => {
  const shiny = { ...account, mons: [{...account.mons[0], variant: "shiny"}] };
  const html = ui.profileHtml({...ui.presentProfile({account:shiny,pane:"pokemon"}),recordState:{mon:"mon1"}});
  assert(html.includes("record-shiny")); assert(!html.includes("<dt>Variant</dt>")); assert(!html.includes("<dt>Species</dt>"));
  assert(html.includes("disabled>Edit stats")); assert(html.includes("<dt>Ability</dt><dd>Unavailable</dd>"));
  assert.equal(ui.inventoryGroups(view("inventory")).find(g=>g.id==="balls").items.find(i=>i.id==="masterball").name,"Master Ball");
});
test("Connections preserve unknown capabilities and escape provider labels", () => {
  const accountWithLink = {...account,connections:[{displayName:'<script>bad</script>',login:'test',primary:true,gameplayEnabled:false}]};
  const html=ui.profileHtml(ui.presentProfile({account:accountWithLink,pane:"connections"}));
  assert(html.includes('&lt;script&gt;bad&lt;/script&gt;'));assert(!html.includes('<script>bad'));
  assert(html.includes('<dt>Can sign in</dt><dd>Unavailable</dd>'));assert(html.includes('<dt>Gameplay rewards</dt><dd>No</dd>'));
  assert(!html.includes('Linked Twitch rows'));assert(html.includes('data-trainer-diagnostics'));
});
test("Stored battle data preserves zero, missing fields and escaped move names", () => {
  const mon={...account.mons[0],battleData:{ivs:{hp:0,atk:31},evs:{hp:0},avs:{hp:0},hpCurrent:0,hpMax:20,nature:'Hardy',ability:'solar-power',moves:[{name:'<img onerror=bad>'}]}};
  const html=ui.profileHtml({...ui.presentProfile({account:{...account,mons:[mon]},pane:'pokemon'}),recordState:{mon:'mon1'}});
  assert(html.includes('<td>0</td>'));assert(html.includes('<td>31</td>'));assert(html.includes('<td>Unavailable</td>'));
  assert(html.includes('<dd>0 / 20</dd>'));assert(html.includes('Solar Power'));assert(html.includes('Hardy'));
  assert(!html.includes('<img onerror=bad>'));assert(html.includes('&lt;Img Onerror=Bad&gt;'));
  assert(html.includes('disabled>Edit stats'));assert(!html.includes('streamlink_stat'));
});
console.log(`${checks} passed`);
