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

test("Sora OWNER / BROADCASTER warning is present", () => {
  assert(html.includes("OWNER / BROADCASTER ACCOUNT"), "missing owner banner");
  assert(html.includes("QA grants will modify this Trainer's real gameplay state."), "missing real-state warning");
  assert(html.includes("oakqa-sora-confirm"), "missing Sora confirm checkbox");
  assert(oakQaJs.includes(SORA), "Sora UUID missing in JS");
  assert(oakQaJs.includes(PLAYTESTER), "Play Tester UUID missing");
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

test("Candy picker uses Evolution Line display names, not raw family ID typing", () => {
  assert(html.includes("oakqa-candy-family"), "candy family select missing");
  assert(oakQaJs.includes("Evolution Candy"), "Evolution Candy label missing");
  assert(!/<input[^>]*id="oakqa-candy-family"/.test(html), "family should be select, not free-typed ID");
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
  assert(/setStatus\(`\$\{msg\}\$\{warn\}`,\s*false\)/.test(oakQaJs) || oakQaJs.includes("setStatus(`${msg}${warn}`, false)"), "soraWarning must not force error status");
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
