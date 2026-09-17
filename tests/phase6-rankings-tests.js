/* node tests/phase6-rankings-tests.js */
const fs = require("fs");
const path = require("path");

function read(rel) {
  return fs.readFileSync(path.join(__dirname, "..", rel), "utf8");
}

function assert(cond, detail) {
  if (!cond) throw new Error(detail || "failed");
}

const sql = read("supabase/migrations/20260916220000_phase6_rankings.sql");
const ranks = read("js/rankings.js");
const html = read("rankings.html");
const css = read("css/play.css");
const trainer = read("js/trainer.js");
const ach = read("js/achievements.js");
const admin = read("js/admin.js");
const adminTools = read("js/admin-tools.js");

assert(sql.includes("ranking_visible"), "eligibility flag missing");
assert(sql.includes("private.ranking_eligible_uid"), "eligibility function missing");
assert(sql.includes("a98cbf81-a6b2-4dbf-8448-8d62f6d5f523"), "Play Tester seeded by UUID flag");
assert(!/if username == .Play Tester/.test(sql), "must not hardcode Play Tester name in ranking query");
assert(sql.includes("rank() over"), "competition rank ties");
assert(sql.includes("dex between 1 and 151"), "Pokédex is unique Kanto");
assert(sql.includes("round_id is not null"), "catches are successful rounds only");
assert(sql.includes("trainer_stats.honey") || sql.includes("st.honey"), "Honey is contribution stat");
const rankingFn = sql.split("create or replace function public.play_rankings")[1].split("create or replace function public.play_trainer_search")[0];
assert(!/POWER SCORE|OVERALL RANK|TRAINER RATING/.test(rankingFn), "no composite best-Trainer score");
assert(sql.includes("play_trainer_search"), "search RPC");
assert(sql.includes("position('@' in q)"), "search rejects email");
assert(sql.includes("limit 3"), "featured badge cap 3");
assert(sql.includes("featured_badge_ids[1:3]") || sql.includes("[1:3]"), "equip cap 3");
assert(sql.includes("card - 'coins'"), "public profile strips coins");
assert(sql.includes("admin_set_ranking_visible"), "admin ranking visibility");
assert(sql.includes("honeyMetric"), "admin honey definition");
assert(sql.includes("p_limit"), "pagination");
assert(sql.includes("period', 'lifetime'"), "lifetime boards only");

assert(ranks.includes("NOT RANKED YET"), "unranked copy");
assert(ranks.includes("trainer.html?u="), "profile navigation");
assert(ranks.includes("play_trainer_search"), "client search");
assert(ranks.includes("YOUR POSITION"), "pinned my position");
assert(ranks.includes("rank-you-tag"), "non-color YOU marker");
assert(ranks.includes("p_offset"), "load more pagination");
assert(ranks.includes("FRESH_MS"), "freshness window");
assert(!ranks.includes("setInterval"), "no polling");
assert(!ranks.includes("channel(") && !ranks.includes(".on(\"postgres"), "no realtime leaderboard");
assert(ranks.includes("RANKINGS UNAVAILABLE"), "shared error");
assert(ranks.includes("TRY AGAIN"), "retry");
assert(html.includes("Honey contributed"), "honey board labeled contribution");
assert(html.includes("Discover Trainers"), "discovery");
assert(html.includes("data-board=\"mastery\""), "mastery board");
assert(html.includes("data-board=\"achievements\""), "achievements board");
assert(html.includes("rank-search"), "search field");
assert(!html.includes("rank-podium"), "oversized podium removed");

assert(css.includes(".rank-row.is-you"), "you highlight");
assert(css.includes("@media (max-width: 720px)"), "mobile cards");
assert(css.includes("html[data-perf=\"high\"] .rank-row.is-top-1"), "high-mode sparkle");
assert(css.includes("html[data-perf=\"low\"] .rank-row.is-top-1"), "low-mode no sparkle");

assert(trainer.includes("pcCatches"), "showcase uses full PC");
assert(trainer.includes("full PC"), "showcase copy mentions PC");
assert(!/recentLog \|\| \[\]\)\.filter\(\(row\) => String\(row.variant/.test(trainer), "shiny picker must not use adventure log only");

assert(ach.includes("slice(0, 3)"), "achievements featured cap 3");
assert(!ach.includes("slice(0, 5)"), "achievements must not cap at 5");

assert(admin.includes("Rankings"), "game health rankings row");
assert(adminTools.includes("admin_set_ranking_visible"), "identity ranking toggle");
assert(adminTools.includes("Hide from Rankings"), "hide control");

console.log("phase6-rankings tests: 1 file checks passed");
