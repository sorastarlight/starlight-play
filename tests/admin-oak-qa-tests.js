/* node tests/admin-oak-qa-tests.js */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

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

const html = read("admin.html");
const adminJs = read("js/admin.js");
const oakQaJs = read("js/admin-oak-qa.js");
const css = read("css/play.css");
const migration = read("supabase/migrations/20260919031000_admin_oak_qa_toolkit.sql");

const SORA = "60ff5211-6ef8-40e6-8daa-095b5600bf4c";
const PLAYTESTER = "a98cbf81-a6b2-4dbf-8448-8d62f6d5f523";

const sandbox = {
  window: { playEscapeAttr: (v) => String(v ?? "") },
  document: {
    getElementById: () => null,
    querySelector: () => null
  }
};
sandbox.window = sandbox.window;
vm.createContext(sandbox);
vm.runInContext(oakQaJs, sandbox);
const targeting = sandbox.window.playOakQaTargeting;

test("Admin Hub HTML includes Evolution / Oak QA Toolkit", () => {
  assert(html.includes('data-content-view="oakqa"'), "missing Oak QA subnav");
  assert(html.includes('data-content-panel="oakqa"'), "missing oakqa panel");
  assert(html.includes("Evolution / Oak QA Toolkit"), "missing toolkit title");
  assert(html.includes("ADMIN_QA provenance"), "missing provenance warning");
  assert(html.includes("js/admin-oak-qa.js"), "admin-oak-qa.js not included");
});

test("Sora OWNER / BROADCASTER warning is a polished card", () => {
  assert(html.includes("OWNER / BROADCASTER ACCOUNT"), "missing owner banner");
  assert(html.includes("oakqa-owner-card"), "missing owner card class");
  assert(html.includes("QA grants modify this Trainer's live gameplay state."), "missing live-state warning");
  assert(html.includes("oakqa-sora-confirm"), "missing Sora confirm checkbox");
  assert(html.includes("allow QA grants to this live account"), "missing refined checkbox copy");
  assert(!html.includes("TARGET TRAINER</strong>"), "should not repeat TARGET TRAINER heading in warning");
  assert(oakQaJs.includes(SORA), "Sora UUID missing in JS");
  assert(oakQaJs.includes(PLAYTESTER), "Play Tester UUID missing");
  assert(oakQaJs.includes("is-acked"), "acknowledgement visual state missing");
  assert(oakQaJs.includes("els.soraConfirm.checked = false"), "ack reset missing");
});

test("admin_oak_qa is called via playCall with UUID p_user", () => {
  assert(oakQaJs.includes('playCall("admin_oak_qa"'), "admin_oak_qa playCall missing");
  assert(oakQaJs.includes("PRESET_OAK"), "PRESET_OAK missing");
  assert(oakQaJs.includes("PRESET_EVO"), "PRESET_EVO missing");
  assert(oakQaJs.includes("GRANT_MON"), "GRANT_MON missing");
  assert(oakQaJs.includes("GRANT_CANDY"), "GRANT_CANDY missing");
  assert(oakQaJs.includes("GRANT_ITEMS"), "GRANT_ITEMS missing");
  assert(oakQaJs.includes("RESET_QA"), "RESET_QA missing");
  assert(oakQaJs.includes("soraWarning"), "soraWarning status handling missing");
  assert(oakQaJs.includes("buildOakQaArgs"), "buildOakQaArgs missing");
});

test("CONTENT_VIEWS includes oakqa", () => {
  assert(/CONTENT_VIEWS\s*=\s*\[[^\]]*["']oakqa["']/.test(adminJs), "CONTENT_VIEWS missing oakqa");
  assert(adminJs.includes("playOakQaInit"), "showHubTab does not init Oak QA");
});

test("migration mentions ADMIN_QA and is_play_admin()", () => {
  assert(migration.includes("ADMIN_QA"), "migration missing ADMIN_QA");
  assert(migration.includes("private.is_play_admin()"), "migration missing is_play_admin()");
  assert(migration.includes("admin_oak_qa"), "migration missing admin_oak_qa");
  assert(migration.includes("Admin only."), "admin gate missing");
  assert(!/playtester.*fallback|fallback.*playtester/i.test(migration), "must not silently fallback to Play Tester");
  const resetFix = read("supabase/migrations/20260919040000_admin_oak_qa_reset_alias_fix.sql");
  assert(resetFix.includes("mon_dex"), "reset alias migration missing mon_dex");
  assert(resetFix.includes("using public.catches qa"), "reset alias migration missing qa alias");
  assert(resetFix.includes("fc2.qty"), "reset alias migration missing fc2 qty qualify");
});

test("Candy picker uses Evolution Line typeahead, not raw family ID typing", () => {
  assert(html.includes("oakqa-candy-q"), "candy typeahead input missing");
  assert(html.includes("oakqa-candy-suggest"), "candy suggest list missing");
  assert(html.includes('id="oakqa-candy-family"'), "hidden candy family field missing");
  assert(oakQaJs.includes("Evolution Candy"), "Evolution Candy label missing");
  assert(oakQaJs.includes("renderCandySuggest"), "candy suggest renderer missing");
  assert(!/<select[^>]*id="oakqa-candy-family"/.test(html), "family must not be a select");
});

test("Trainer picker is a clickable staff list, not an empty select", () => {
  assert(html.includes("oakqa-user-list"), "trainer list missing");
  assert(oakQaJs.includes("renderUserList"), "trainer list renderer missing");
  assert(oakQaJs.includes("staff-user-pick"), "staff-user pick buttons missing");
  assert(!/<select[^>]*id="oakqa-user"/.test(html), "trainer must not be a select");
});

test("Grant Pokémon uses Admin Hub-style species typeahead", () => {
  assert(html.includes("oakqa-mon-suggest"), "species suggest missing");
  assert(oakQaJs.includes("renderMonSuggest"), "species suggest renderer missing");
  assert(oakQaJs.includes("playParseSpeciesQuery"), "species parse helper missing");
  assert(html.includes("oakqa-mon-preview-img"), "species preview missing");
});

test("Grant Items shows sprites on quantity tiles", () => {
  assert(html.includes("oakqa-item-grid"), "item grid missing");
  assert(oakQaJs.includes("renderItemGrid"), "item grid renderer missing");
  assert(oakQaJs.includes("playItemSprite"), "item sprite helper missing");
  assert(oakQaJs.includes("data-oakqa-item"), "item qty inputs missing");
});

test("Oak QA action buttons have press/loading/success/error feedback", () => {
  assert(oakQaJs.includes("is-pressed"), "pressed state missing");
  assert(oakQaJs.includes("is-loading"), "loading state missing");
  assert(oakQaJs.includes("is-success"), "success state missing");
  assert(oakQaJs.includes("is-error"), "error state missing");
  assert(oakQaJs.includes("inFlight"), "double-click guard missing");
  assert(oakQaJs.includes("✓ Granted!"), "temporary success label missing");
  assert(oakQaJs.includes("Granting"), "loading copy missing");
  assert(css.includes(".oakqa-action.is-pressed") || css.includes(".oakqa-action:active"), "pressed CSS missing");
  assert(css.includes(".oakqa-action.is-success"), "success CSS missing");
  assert(css.includes(".oakqa-status.is-error"), "error status CSS missing");
});

test("Oak QA self-boots when deep-linked before admin.js callback", () => {
  assert(oakQaJs.includes('view === "oakqa"'), "self-boot view check missing");
  assert(oakQaJs.includes("playOakQaInit = init"), "init export missing");
});

test("Play Tester target resolves to Play Tester UUID", () => {
  assert(targeting, "playOakQaTargeting missing");
  const pick = targeting.pickTrainerTarget(
    [{ id: PLAYTESTER, displayName: "Play Tester", login: "playtester" }],
    { currentId: "", query: "" }
  );
  assert(pick.targetId === PLAYTESTER, pick.targetId);
  assert(pick.silentFallback === false);
});

test("Sora target resolves to owner UUID", () => {
  const pick = targeting.pickTrainerTarget(
    [{ id: SORA, displayName: "Sora Starlight", login: "sorastarlight" }],
    { currentId: "", query: "sora" }
  );
  assert(pick.targetId === SORA, `got ${pick.targetId}`);
  assert(targeting.isSoraTarget(pick.targetId));
  assert(pick.silentFallback === false);
});

test("empty query never defaults to Sora", () => {
  const pick = targeting.pickTrainerTarget(
    [
      { id: SORA, displayName: "Sora Starlight", login: "sorastarlight" },
      { id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", displayName: "Other", login: "other" }
    ],
    { currentId: "", query: "" }
  );
  assert(pick.targetId !== SORA, `must not default to Sora, got ${pick.targetId}`);
});

test("changing selected Trainer changes RPC target UUID", () => {
  const a = targeting.buildOakQaArgs("GRANT_MON", PLAYTESTER, { dex: 25 });
  const b = targeting.buildOakQaArgs("GRANT_MON", SORA, { dex: 25 });
  assert(a.p_user === PLAYTESTER);
  assert(b.p_user === SORA);
  assert(a.p_user !== b.p_user);
});

test("UI display name does not override UUID in RPC args", () => {
  const args = targeting.buildOakQaArgs("GRANT_CANDY", SORA, { familyId: 25 });
  assert(args.p_user === SORA);
  assert(!/Sora|Starlight|playtester/i.test(args.p_user));
});

test("Twitch username does not replace profile UUID", () => {
  const pick = targeting.pickTrainerTarget(
    [{ id: SORA, displayName: "Sora Starlight", login: "SoraStarlight" }],
    { currentId: "", query: "SoraStarlight" }
  );
  assert(pick.targetId === SORA);
  const args = targeting.buildOakQaArgs("PRESET_OAK", pick.targetId, {});
  assert(args.p_user === SORA);
  assert(args.p_user !== "SoraStarlight");
});

test("owner/broadcaster status does not prevent valid QA targeting", () => {
  const preserved = targeting.pickTrainerTarget(
    [
      { id: PLAYTESTER, displayName: "Play Tester", login: "playtester" },
      { id: SORA, displayName: "Sora Starlight", login: "sorastarlight" }
    ],
    { currentId: SORA, query: "" }
  );
  assert(preserved.targetId === SORA, "explicit Sora selection must be preserved");
});

test("no silent fallback to Play Tester when Sora is selected", () => {
  const pick = targeting.pickTrainerTarget(
    [{ id: SORA, displayName: "Sora Starlight", login: "sorastarlight" }],
    { currentId: SORA, query: "sora" }
  );
  assert(pick.targetId === SORA);
  assert(pick.silentFallback === false);
  assert(pick.targetId !== PLAYTESTER);
});

test("invalid / missing target shapes are rejected by UUID authority helpers", () => {
  const empty = targeting.pickTrainerTarget([], { currentId: "", query: "missing" });
  assert(empty.targetId === "");
  const bogus = targeting.buildOakQaArgs("GRANT_MON", "", {});
  assert(bogus.p_user === "");
});

test("soraWarning success is not treated as RPC failure styling", () => {
  assert(oakQaJs.includes("hub-owner-warn"), "owner warn class missing");
  assert(oakQaJs.includes('setStatus(msg, "success")') || oakQaJs.includes('markSuccess'), "success path must not force error status");
});

const failed = results.filter((row) => !row.passed);
results.forEach((row) => {
  const mark = row.passed ? "PASS" : "FAIL";
  console.log(`${mark} ${row.name}${row.detail ? ` — ${row.detail}` : ""}`);
});
if (failed.length) {
  console.error(`\n${failed.length} failed`);
  process.exit(1);
}
console.log(`\n${results.length} passed`);
