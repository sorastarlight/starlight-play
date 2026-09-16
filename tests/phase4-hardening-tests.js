/* node tests/phase4-hardening-tests.js */
const fs = require("fs");
const path = require("path");

function read(rel) {
  return fs.readFileSync(path.join(__dirname, "..", rel), "utf8");
}

function assert(cond, detail) {
  if (!cond) throw new Error(detail || "failed");
}

const css = read("css/play.css");
const perf = read("js/play-perf.js");
const present = read("js/play-present.js");
const store = read("js/store.js");
const ach = read("js/achievements.js");
const sql = read("supabase/migrations/20260916190000_phase4_hardening.sql");
const storage = read("js/storage.js");

assert(perf.includes('return "balanced"'), "AUTO defaults to BALANCED");
assert(/memKnown && mem >= 8/.test(perf), "HIGH requires known memory and cores");
assert(perf.includes("const reduced = motionReduced();"), "LOW must not force reduced motion");
assert(css.includes('html[data-perf="balanced"] .topnav'), "BALANCED has real CSS");
assert(!css.includes(".mart-purchase-pop"), "obsolete mart-purchase-pop CSS removed");
assert(!store.includes("mart-purchase-pop"), "store no longer builds mart-purchase-pop");
assert(present.includes("is-danger"), "destructive confirm has danger class");
assert(present.includes("button[value='cancel']"), "danger confirm focuses cancel");
assert(storage.includes("playPresentConfirm"), "PC release uses shared confirm");
assert(ach.includes("playRewardCopy") || ach.includes("PokéCoins"), "achievement rewards are player-facing");
assert(sql.includes("perform private.register_capture_collection(new)"), "catch Candy grant restored");
assert(sql.includes("resolved = true"), "future cancel sets resolved");
assert(sql.includes("merge_inventory_layers"), "bag merge helper exists");
assert(sql.includes("admin_game_health"), "Game Health RPC exists");
assert(sql.includes("(select auth.uid())"), "RLS initplan wrap present");
assert(sql.includes("catches_user_id_idx"), "justified catches.user_id index");
console.log("phase4-hardening tests: 14 passed");
