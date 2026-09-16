/* node tests/phase5-identity-tests.js */
const fs = require("fs");
const path = require("path");

function read(rel) {
  return fs.readFileSync(path.join(__dirname, "..", rel), "utf8");
}

function assert(cond, detail) {
  if (!cond) throw new Error(detail || "failed");
}

const sql = read("supabase/migrations/20260916200000_phase5_identity.sql")
  + read("supabase/migrations/20260916210000_phase5_equip_kinds.sql");
const trainers = read("js/trainers.js");
const trainer = read("js/trainer.js");
const settings = read("js/settings.js");
const present = read("js/play-present.js");
const ach = read("js/achievements.js");
const ranks = read("js/rankings.js");
const css = read("css/play.css");
const adminTools = read("js/admin-tools.js");
const adminHtml = read("admin.html");
const team = read("js/team.js");

assert(sql.includes("private.evaluate_cosmetics"), "cosmetic evaluation missing");
assert(sql.includes("play_save_trainer_id"), "save Trainer ID RPC missing");
assert(sql.includes("play_equip_cosmetic"), "equip cosmetic RPC missing");
assert(sql.includes("assert_cosmetic_owned"), "entitlement check missing");
assert(sql.includes("on conflict do nothing"), "unlocks must be idempotent");
assert(sql.includes("'idNo'"), "Trainer ID number must exist");
assert(!/jsonb_build_object\(\s*'id',\s*p\.id/.test(sql), "public trainer_card must not expose uuid id");
assert(sql.includes("row - 'userKey'"), "rankings must strip uuid userKey");
assert(sql.includes("twitch_connections"), "Twitch linkage must be authoritative");
assert(sql.includes("admin_identity_inspect"), "admin inspect missing");
assert(sql.includes("admin_grant_cosmetic"), "admin grant missing");
assert(sql.includes("admin_revoke_cosmetic"), "admin revoke missing");
assert(sql.includes("play_console_log"), "admin grants must be logged");
assert(sql.includes("Trainer XP must not change"), "XP guard on save");
assert(sql.includes("dex-151"), "Kanto completion achievement");
assert(sql.includes("frame-kanto"), "Kanto frame cosmetic");
assert(sql.includes("title_rec.id is not null"), "EQUIP NOW titles");
assert(sql.includes("badge_rec.id is not null"), "EQUIP NOW badges");

assert(trainers.includes("playXpProgressHtml"), "XP progress helper");
assert(trainers.includes("TRAINER ID"), "Trainer ID card heading");
assert(trainers.includes("id-title-line"), "title under name");
assert(!trainers.includes("Pokémon Masters EX"), "no Masters EX player-facing category");
assert(trainers.includes("Kanto Trainers"), "Kanto trainer pack label");
assert(trainers.includes("Premium / Special"), "premium pack label");

assert(trainer.includes("play_save_trainer_id"), "profile save uses one RPC");
assert(!trainer.includes("play_set_card_bg"), "profile must not save background on click");
assert(trainer.includes("Cancel / Revert") || trainer.includes("revert-id"), "revert control");
assert(trainer.includes("howTo"), "locked cosmetics explain unlock");
assert(trainer.includes("play_ack_cosmetics"), "NEW cosmetics are acknowledged");
assert(trainer.includes("p_showcase"), "showcase save");

assert(settings.includes("play_save_trainer_id"), "settings save Trainer ID");
assert(!settings.includes("play_set_card_bg"), "settings must not save background on click");
assert(settings.includes("Previewing"), "settings preview copy");

assert(present.includes("data-present-equip"), "EQUIP NOW control");
assert(present.includes("Later"), "LATER control");
assert(present.includes("event.preview || !root.playCall"), "lab previews must not grant");
assert(present.includes("title: ()"), "title lab preview");
assert(present.includes("frame: ()"), "frame lab preview");
assert(present.includes("Trainer ID cosmetic"), "cosmetic reward copy");

assert(ach.includes("PokéCoins") || ach.includes("playRewardCopy"), "achievement reward copy");
assert(ach.includes("howTo"), "locked titles/badges explain unlock");
assert(ach.includes("Complete"), "achievement complete state");

assert(ranks.includes("trainerSprite"), "rankings show trainer avatar");
assert(ranks.includes("row.title"), "rankings show title");
assert(ranks.includes("evolutions"), "evolutions board");
assert(ranks.includes("trainer.html?u="), "rankings open profile");

assert(css.includes("id-card-frame-kanto"), "kanto frame CSS");
assert(css.includes(".id-state"), "owned/locked/equipped labels");
assert(css.includes("id-customize-tabs"), "customize tabs");
assert(css.includes("rank-sprite"), "ranking sprite");

assert(adminTools.includes("admin_identity_inspect"), "admin inspect UI");
assert(adminTools.includes("admin_grant_cosmetic"), "admin grant UI");
assert(adminTools.includes("admin_revoke_cosmetic"), "admin revoke UI");
assert(adminTools.includes("playPresentConfirm"), "admin identity confirm");
assert(adminHtml.includes("Title unlock"), "lab title preview");
assert(adminHtml.includes("Frame unlock"), "lab frame preview");
assert(team.includes("loading=\"lazy\""), "avatar picker lazy loads");
assert(team.includes("data-locked"), "locked premium looks stay visible");

console.log("phase5-identity tests: 1 file checks passed");
