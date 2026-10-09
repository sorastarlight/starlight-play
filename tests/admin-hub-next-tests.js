/* node tests/admin-hub-next-tests.js */
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

const nextHtml = read("admin-next.html");
const nextJs = read("js/admin-next.js");
const adminHtml = read("admin.html");
const liveHtml = read("admin-live.html");
const adminJs = read("js/admin.js");
const liveJs = read("js/admin-live.js");

test("Next hub IA labels are the seven overhaul screens", () => {
  [
    "Operations",
    "Trainers",
    "Support &amp; Recovery",
    "Mart &amp; Content",
    "Game Configuration",
    "Analytics &amp; Health",
    "System &amp; Access"
  ].forEach((label) => assert(nextHtml.includes(label), `missing ${label}`));
});

test("Preview shell only allows the two verified true-read RPCs", () => {
  assert(nextJs.includes("admin_build_health"));
  assert(nextJs.includes("admin_game_health"));
  assert(!nextJs.includes("admin_live_dashboard"), "must not call tick-enabled admin_live_dashboard");
  assert(!nextJs.includes("admin_overview"), "must not call admin_overview settle side-effect");
  [
    "director_dashboard",
    "director_tick_if_due",
    "settle_due_rounds",
    "admin_director_command",
    "admin_start_round",
    "admin_grant_pokemon",
    "admin_grant_bag",
    "admin_set_coins",
    "admin_remove_pokemon",
    "admin_store_save_item",
    "admin_oak_qa",
    "admin_save_twitch_client_secret"
  ].forEach((name) => assert(!nextJs.includes(name), `${name} must stay off the preview shell`));
  const allow = nextJs.match(/const READ_RPCS = Object\.freeze\(\[([\s\S]*?)\]\)/);
  assert(allow, "READ_RPCS allowlist missing");
  const names = [...allow[1].matchAll(/"([^"]+)"/g)].map((row) => row[1]);
  assert(names.length === 2 && names[0] === "admin_build_health" && names[1] === "admin_game_health");
});

test("Operations preview uses unavailable fallback and does not poll", () => {
  assert(nextHtml.includes("Live status unavailable in preview"));
  assert(nextHtml.includes("Legacy Live Operations remains on the current Dashboard") || nextHtml.includes("legacy Live Operations"));
  assert(nextHtml.includes("UNAVAILABLE"));
  assert(nextHtml.includes("data-state=\"unavailable\"") || nextHtml.includes("is-unavailable"));
  assert(nextJs.includes("renderOperationsFallback"));
  assert(!nextJs.includes("setInterval"), "preview must not poll");
  assert(!nextJs.includes("admin_live_dashboard"));
  assert(!/readCall\(\s*["']admin_live_dashboard["']/.test(nextJs));
  assert(!/playCall\(\s*["']admin_live_dashboard["']/.test(nextJs));
});

test("Legacy Admin Hub and live controls remain the default", () => {
  assert(adminHtml.includes("js/admin-live.js"));
  assert(adminHtml.includes("js/admin.js"));
  assert(adminHtml.includes('id="start-random"') || adminJs.includes("start-random"));
  assert(liveHtml.includes("admin.html?section=dashboard"));
  assert(adminHtml.includes('href="./admin.html"') || adminHtml.includes("Admin Hub"));
  assert(!adminHtml.includes("js/admin-next.js"), "legacy hub must not boot the preview module");
});

test("Lifecycle copy matches permission-only contract", () => {
  assert(nextHtml.includes("Twitch LIVE permits the Live RPG"));
  assert(nextHtml.includes("does not start"));
  assert(adminHtml.includes("Twitch LIVE permits the Live RPG") || adminHtml.includes("does not start it"));
  assert(!adminHtml.includes("Twitch will activate the Live RPG when the stream is detected"));
  assert(liveJs.includes("Live RPG stays IDLE until you Start"));
});

test("Preview mutation deep links stay on the current hub", () => {
  assert(nextHtml.includes('href="./admin.html?section=trainers"'));
  assert(nextHtml.includes("section=content") && nextHtml.includes("view=oakqa"));
  assert(nextHtml.includes("section=economy") && nextHtml.includes("view=catalog"));
  assert(!nextHtml.includes('href="./admin-tools.html"'), "bare admin-tools.html redirects to System Twitch");
  assert(!nextHtml.includes('href="./admin-store.html"'), "bare admin-store.html redirects away from embed");
});

test("Staff gate and preview link stay additive", () => {
  assert(nextJs.includes('supabase.rpc("is_play_admin")'));
  assert(adminHtml.includes("admin-next.html"), "legacy hub should link the preview");
  assert(nextHtml.includes("./admin.html"), "preview must link back to current hub");
  const nav = read("js/nav.js");
  assert(nav.includes('page === "admin-next"'), "preview page must stay off primary player nav");
  assert(nav.includes('id: "help"') && nav.includes('id: "store"'));
  const linkBlock = nav.match(/const links = \[[\s\S]*?\];/)?.[0] || "";
  assert(linkBlock.indexOf('id: "help"') < linkBlock.indexOf('id: "store"'), "Mart must stay last");
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
