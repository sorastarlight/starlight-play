/* node tests/admin-hub-gate-2a-r-identity-tests.js */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

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
  return fs.readFileSync(path.join(__dirname, "..", rel), "utf8").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}
function functionBody(sql) {
  const match = sql.match(/as \$function\$([\s\S]*?)\$function\$;/);
  if (!match) throw new Error("missing $function$ body");
  return match[1];
}
function md5(text) {
  return crypto.createHash("md5").update(text, "utf8").digest("hex");
}

const BASELINE_MD5 = "50058f99f73591a9bd77d4342653cd8c";
const POST_UP_MD5 = "e9091c0de1b91e67a62bade78cf8edde";
const RESPONSE_KEYS = [
  "ok", "trainer", "rankingVisible", "rankingEligible",
  "cosmetics", "ownedAvatarPacks", "titles", "badges", "catalog"
];
const REACHABLE_HELPERS = [
  "private.is_play_admin",
  "private.play_staff_role",
  "private.trainer_card",
  "private.ranking_eligible_uid",
  "private.identity_cosmetics_json",
  "private.owned_avatar_packs_json",
  "private.trainer_xp_progress",
  "private.collection_variant_stats",
  "private.progression_config",
  "private.catch_brief",
  "private.team_bg_ok",
  "private.trainer_sprite_ok",
  "private.card_bg_ok",
  "private.card_frame_ok",
  "private.mastery_top_json",
  "private.team_mons",
  "private.cosmetic_admin_entitled",
  "private.cosmetic_asset",
  "private.trainer_level",
  "private.xp_to_reach_level",
  "private.xp_for_level",
  "private.female_visual_dex",
  "private.game_settings"
];

const up = read("docs/audits/sql/gate-2a-r-identity-inspect-up.sql");
const down = read("docs/audits/sql/gate-2a-r-identity-inspect-down.sql");
const auth = read("docs/audits/sql/gate-2a-r-authorization-tests.sql");
const catalog = read("docs/audits/sql/gate-2a-r-catalog-contract.sql");
const nextJs = read("js/admin-next.js");
const audit = read("docs/audits/admin-hub-gate-2a-r-identity-inspect.md");
const upFn = up.split("create or replace function public.admin_identity_inspect")[1] || "";
const downFn = down.split("create or replace function public.admin_identity_inspect")[1] || "";
const upBody = functionBody(up);
const downBody = functionBody(down);

test("SQL contract: UP is the applied artifact; DOWN stays emergency-only", () => {
  assert(up.includes("APPLIED to production starlight-play dtflmlbjhttoewqgkujf as 20261011024514"));
  assert(up.includes("Do not re-apply"));
  assert(down.includes("REVIEW ARTIFACT ONLY"));
  assert(down.includes("EMERGENCY ROLLBACK ONLY"));
  assert(!fs.existsSync(path.join(__dirname, "..", "supabase", "migrations", "gate-2a-r-identity-inspect-up.sql")));
});

test("SQL contract: UP preflight covers checksum, signature, catalog, and ACL", () => {
  assert(up.includes(BASELINE_MD5));
  assert(up.includes("perform private.evaluate_cosmetics(p_user);"));
  assert(up.includes("p_user uuid"));
  assert(up.includes("jsonb"));
  assert(up.includes("plpgsql"));
  assert(up.includes("prosecdef"));
  assert(up.includes("owner postgres"));
  assert(up.includes("expected VOLATILE"));
  assert(up.includes("search_path=public"));
  assert(up.includes("has_function_privilege('anon'"));
  assert(up.includes("has_function_privilege('authenticated'"));
  assert(up.includes("has_function_privilege('service_role'"));
  assert(up.includes("Refuse to overwrite"));
});

test("SQL contract: replacement inspect body is SELECT-only and staff-gated first", () => {
  assert(upBody.includes("if not private.is_play_admin()"));
  assert(upBody.indexOf("if not private.is_play_admin()") < upBody.indexOf("private.trainer_card"));
  assert(!upBody.includes("evaluate_cosmetics"));
  assert(!upBody.includes("unlock_cosmetic"));
  assert(!upBody.includes("push_notice"));
  assert(!upBody.includes("ensure_trainer_stats"));
  assert(!/\b(insert|update|delete)\b/i.test(upBody));
  assert(upBody.includes("private.identity_cosmetics_json(p_user)"));
  assert(upBody.includes("private.trainer_card(p_user)"));
  assert(up.includes("language plpgsql\nstable\nsecurity definer\nset search_path to 'public'"));
  assert(up.includes("alter function public.admin_identity_inspect(uuid) owner to postgres"));
});

test("SQL contract: UP does not rewrite cosmetics unlock or change grants", () => {
  assert(!up.includes("create or replace function private.evaluate_cosmetics"));
  assert(!up.includes("create or replace function private.unlock_cosmetic"));
  assert(!/revoke all on function public\.admin_identity_inspect/i.test(up));
  assert(!/grant execute[^\n]+to anon/i.test(up));
  assert(!up.includes("staff_roles"));
});

test("Drift rejection: UP and DOWN abort on unexpected fingerprint or catalog drift", () => {
  assert(up.includes("if src_hash <> '" + BASELINE_MD5 + "'"));
  assert(up.includes("if src_hash <> '" + POST_UP_MD5 + "'"));
  assert(down.includes("if src_hash <> '" + POST_UP_MD5 + "'"));
  assert(down.includes("Function changed since UP"));
  assert(down.includes("if src_hash <> '" + BASELINE_MD5 + "'"));
  assert(up.includes("Refuse to overwrite"));
  assert(down.includes("Refuse to overwrite"));
  assert(up.includes("Rolling back"));
  assert(down.includes("Rolling back"));
});

test("Atomicity: one transaction, advisory xact lock, no mid-script commit", () => {
  for (const [name, sql] of [["UP", up], ["DOWN", down]]) {
    const beginAt = sql.indexOf("\nbegin;");
    const lockAt = sql.indexOf("pg_advisory_xact_lock(21021021, 2)");
    const preflightAt = sql.indexOf("do $preflight$");
    const replaceAt = sql.indexOf("create or replace function public.admin_identity_inspect");
    const postAt = sql.indexOf("do $post$");
    const commitAt = sql.lastIndexOf("\ncommit;");
    assert(beginAt > 0 && lockAt > beginAt, name + " lock after begin");
    assert(preflightAt > lockAt, name + " preflight after lock");
    assert(replaceAt > preflightAt, name + " replace after preflight");
    assert(postAt > replaceAt, name + " post after replace");
    assert(commitAt > postAt, name + " commit last");
    assert((sql.match(/\nbegin;/g) || []).length === 1, name + " single begin");
    assert((sql.match(/\ncommit;/g) || []).length === 1, name + " single commit");
    assert(!sql.slice(beginAt + 1, commitAt).includes("commit;"), name + " no inner commit");
    assert(!sql.slice(beginAt + 1, commitAt).includes("rollback;"), name + " no inner rollback");
    assert(sql.includes("Run as one script"));
  }
});

test("Authorization contract: staff guard, 42501, and clone-only role tests", () => {
  assert(upFn.includes("raise exception 'not allowed' using errcode = '42501'"));
  assert(downFn.includes("raise exception 'not allowed' using errcode = '42501'"));
  assert(auth.includes("DO NOT RUN ON PRODUCTION"));
  assert(auth.includes("Do not call public.admin_identity_inspect"));
  assert(auth.includes("set local role anon"));
  assert(auth.includes("42501"));
  assert(!auth.includes("60ff5211-6ef8-40e6-8daa-095b5600bf4c"), "no Sora UUID");
  assert(!auth.includes("da777b13-6879-44a8-99f4-a154e54d3d75"), "no Twinkle UUID");
});

test("Response compatibility: keys and SELECT helpers stay identical", () => {
  RESPONSE_KEYS.forEach((key) => {
    assert(upFn.includes("'" + key + "'"), key);
    assert(downFn.includes("'" + key + "'"), key);
  });
  assert(upFn.includes("private.identity_cosmetics_json(p_user)"));
  assert(upFn.includes("private.owned_avatar_packs_json(p_user)"));
  assert(upFn.includes("private.ranking_eligible_uid(p_user)"));
});

test("Helper volatility: catalog contract records STABLE/IMMUTABLE SELECT-only helpers", () => {
  REACHABLE_HELPERS.forEach((name) => assert(catalog.includes(name), name));
  assert(catalog.includes("provolatile in ('s', 'i')"), "catalog volatility note");
  assert(catalog.includes("ensure_trainer_stats"), "ensure_trainer_stats listed");
  assert(catalog.includes("trainer_card does not call ensure_trainer_stats"), "trainer_card skip note");
  assert(audit.includes("20261011024514"), "applied migration id");
  assert(audit.includes("e9091c0de1b91e67a62bade78cf8edde"), "post-UP fingerprint in audit");
});

test("No-write static verification of post-UP inspect body", () => {
  assert(!/evaluate_cosmetics|unlock_cosmetic|push_notice|ensure_trainer_stats/i.test(upBody));
  assert(!/\b(insert|update|delete|merge|truncate|copy|grant|revoke)\b/i.test(upBody));
  assert(upBody.includes("if not private.is_play_admin()"));
  assert(md5(upBody) === POST_UP_MD5, "post-UP body md5 " + md5(upBody));
  assert(upBody.length === 1496);
  assert(upBody.charCodeAt(0) === 10 && upBody.charCodeAt(upBody.length - 1) === 10);
});

test("Fingerprints: DOWN body is the exact live baseline", () => {
  assert(md5(downBody) === BASELINE_MD5, "DOWN body md5 " + md5(downBody));
  assert(downBody.length === 1542);
  assert(downBody.includes("perform private.evaluate_cosmetics(p_user);"));
  assert(down.includes("reopens R21"));
  assert(down.includes("Do not execute DOWN as routine cleanup"));
});

test("Preview allowlist includes repaired inspect and excludes mutations", () => {
  const allow = nextJs.match(/const READ_RPCS = Object\.freeze\(\[([\s\S]*?)\]\)/);
  const names = [...allow[1].matchAll(/"([^"]+)"/g)].map((row) => row[1]);
  assert(names.includes("admin_identity_inspect"));
  assert(names.includes("admin_list_users"));
  assert(names.includes("admin_user_account"));
  assert(!names.includes("admin_overview"));
  assert(!nextJs.includes("evaluate_cosmetics"));
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
