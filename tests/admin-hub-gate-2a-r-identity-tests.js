/* node tests/admin-hub-gate-2a-r-identity-tests.js */
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

const up = read("docs/audits/sql/gate-2a-r-identity-inspect-up.sql");
const down = read("docs/audits/sql/gate-2a-r-identity-inspect-down.sql");
const nextJs = read("js/admin-next.js");
const upFn = up.split("create or replace function public.admin_identity_inspect")[1] || "";
const downFn = down.split("create or replace function public.admin_identity_inspect")[1] || "";

test("Review artifacts are not auto-apply migrations", () => {
  assert(up.includes("REVIEW ARTIFACT ONLY"));
  assert(up.includes("DO NOT APPLY WITHOUT OWNER APPROVAL"));
  assert(down.includes("REVIEW ARTIFACT ONLY"));
  assert(!fs.existsSync(path.join(__dirname, "..", "supabase", "migrations", "gate-2a-r-identity-inspect-up.sql")));
});

test("UP preflight requires the reviewed write-read checksum", () => {
  assert(up.includes("50058f99f73591a9bd77d4342653cd8c"));
  assert(up.includes("perform private.evaluate_cosmetics(p_user);"));
  assert(up.includes("Refuse to overwrite"));
});

test("Replacement inspect body is SELECT-only and staff-gated first", () => {
  assert(upFn.includes("if not private.is_play_admin()"));
  assert(upFn.indexOf("if not private.is_play_admin()") < upFn.indexOf("private.trainer_card"));
  assert(!upFn.includes("evaluate_cosmetics"));
  assert(!upFn.includes("unlock_cosmetic"));
  assert(!upFn.includes("push_notice"));
  assert(!/insert |update |delete /i.test(upFn));
  assert(upFn.includes("private.identity_cosmetics_json(p_user)"));
  assert(upFn.includes("private.trainer_card(p_user)"));
  assert(up.includes("stable"));
  assert(up.includes("security definer"));
  assert(up.includes("set search_path to 'public'"));
  assert(up.includes("alter function public.admin_identity_inspect(uuid) owner to postgres"));
});

test("UP does not rewrite cosmetics unlock or revoke anon", () => {
  assert(!up.includes("create or replace function private.evaluate_cosmetics"));
  assert(!up.includes("create or replace function private.unlock_cosmetic"));
  assert(!/revoke all on function public\.admin_identity_inspect/i.test(up));
  assert(!/grant execute[^\n]+to anon/i.test(up));
});

test("DOWN restores the reviewed evaluate_cosmetics call site", () => {
  assert(downFn.includes("perform private.evaluate_cosmetics(p_user);"));
  assert(down.includes("if not private.is_play_admin()"));
  assert(down.includes("private.identity_cosmetics_json(p_user)"));
  assert(down.includes("already has evaluate_cosmetics") || down.includes("still calls evaluate_cosmetics"));
});

test("Preview allowlist still excludes identity inspect and mutations", () => {
  const allow = nextJs.match(/const READ_RPCS = Object\.freeze\(\[([\s\S]*?)\]\)/);
  const names = [...allow[1].matchAll(/"([^"]+)"/g)].map((row) => row[1]);
  assert(names.join(",") === "admin_build_health,admin_game_health,admin_live_snapshot");
  assert(!nextJs.includes("admin_identity_inspect"));
  assert(!nextJs.includes("admin_list_users"));
  assert(!nextJs.includes("evaluate_cosmetics"));
});

test("Response keys stay in the replacement payload", () => {
  ["ok", "trainer", "rankingVisible", "rankingEligible", "cosmetics", "ownedAvatarPacks", "titles", "badges", "catalog"]
    .forEach((key) => assert(upFn.includes(`'${key}'`), key));
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
