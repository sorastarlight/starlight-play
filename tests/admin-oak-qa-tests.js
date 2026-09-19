/* node tests/admin-oak-qa-tests.js */
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

const html = read("admin.html");
const adminJs = read("js/admin.js");
const oakQaJs = read("js/admin-oak-qa.js");
const migration = read("supabase/migrations/20260919031000_admin_oak_qa_toolkit.sql");

test("Admin Hub HTML includes Evolution / Oak QA Toolkit", () => {
  assert(html.includes('data-content-view="oakqa"'), "missing Oak QA subnav");
  assert(html.includes('data-content-panel="oakqa"'), "missing oakqa panel");
  assert(html.includes("Evolution / Oak QA Toolkit"), "missing toolkit title");
  assert(html.includes("ADMIN_QA provenance"), "missing provenance warning");
  assert(html.includes("js/admin-oak-qa.js"), "admin-oak-qa.js not included");
});

test("Sora live-Trainer warning copy is present", () => {
  assert(
    html.includes("You are granting QA resources to a live Trainer account."),
    "missing Sora warning copy"
  );
  assert(html.includes("oakqa-sora-confirm"), "missing Sora confirm checkbox");
  assert(oakQaJs.includes("60ff5211-6ef8-40e6-8daa-095b5600bf4c"), "Sora UUID missing in JS");
  assert(oakQaJs.includes("Never default to Sora") || oakQaJs.includes("Never default to Sora."), "Sora default guard comment/code");
  assert(oakQaJs.includes("a98cbf81-a6b2-4dbf-8448-8d62f6d5f523"), "Play Tester UUID missing");
});

test("admin_oak_qa is called via playCall", () => {
  assert(oakQaJs.includes('playCall("admin_oak_qa"'), "admin_oak_qa playCall missing");
  assert(oakQaJs.includes("PRESET_OAK"), "PRESET_OAK missing");
  assert(oakQaJs.includes("PRESET_EVO"), "PRESET_EVO missing");
  assert(oakQaJs.includes("GRANT_MON"), "GRANT_MON missing");
  assert(oakQaJs.includes("GRANT_CANDY"), "GRANT_CANDY missing");
  assert(oakQaJs.includes("GRANT_ITEMS"), "GRANT_ITEMS missing");
  assert(oakQaJs.includes("RESET_QA"), "RESET_QA missing");
  assert(oakQaJs.includes("soraWarning"), "soraWarning status handling missing");
});

test("CONTENT_VIEWS includes oakqa", () => {
  assert(/CONTENT_VIEWS\s*=\s*\[[^\]]*["']oakqa["']/.test(adminJs), "CONTENT_VIEWS missing oakqa");
  assert(adminJs.includes("playOakQaInit"), "showHubTab does not init Oak QA");
});

test("migration mentions ADMIN_QA and is_play_admin()", () => {
  assert(migration.includes("ADMIN_QA"), "migration missing ADMIN_QA");
  assert(migration.includes("private.is_play_admin()"), "migration missing is_play_admin()");
  assert(migration.includes("admin_oak_qa"), "migration missing admin_oak_qa");
});

test("Candy picker uses Evolution Line display names, not raw family ID typing", () => {
  assert(html.includes("oakqa-candy-family"), "candy family select missing");
  assert(oakQaJs.includes("Evolution Candy"), "Evolution Candy label missing");
  assert(!/<input[^>]*id="oakqa-candy-family"/.test(html), "family should be select, not free-typed ID");
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
