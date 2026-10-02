/**
 * rc109 presentation patches: party composition, modal, editor, save stability hooks.
 * Run after apply-rc109-letsgo-import.js
 */
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");

function patch(file, pairs) {
  let text = fs.readFileSync(path.join(ROOT, file), "utf8");
  for (const [from, to] of pairs) {
    if (!text.includes(from)) {
      console.error("MISSING in", file, ":", from.slice(0, 80));
      process.exit(1);
    }
    text = text.replace(from, to);
  }
  fs.writeFileSync(path.join(ROOT, file), text);
  console.log("patched", file);
}

// ---- settings.js ----
patch("js/settings.js", [
  [
    `  function freeTeamBgIds() {
    return (window.PLAY_FREE_TEAM_BG_IDS || [])
      || (window.PLAY_TEAM_BACKGROUNDS || []).filter((row) => row.free).map((row) => row.id)
      || ["starlight-gradient", "pokedex-grid", "research-lab", "battle-stage"];
  }`,
    `  function freeTeamBgIds() {
    if (Array.isArray(window.PLAY_FREE_TEAM_BG_IDS) && window.PLAY_FREE_TEAM_BG_IDS.length) {
      return window.PLAY_FREE_TEAM_BG_IDS.slice();
    }
    return (window.PLAY_TEAM_BACKGROUNDS || []).filter((row) => row.free).map((row) => row.id);
  }`
  ],
  [
    `      teamBg: next.teamBg || "starlight-gradient",`,
    `      teamBg: window.playNormalizeTeamBgId?.(next.teamBg) || next.teamBg || "pallet-town",`
  ],
  [
    `      teamBg: draft.teamBg || card.teamBg || "starlight-gradient",`,
    `      teamBg: window.playNormalizeTeamBgId?.(draft.teamBg || card.teamBg) || draft.teamBg || card.teamBg || "pallet-town",`
  ],
  [
    `      || (draft.teamBg || "starlight-gradient") !== (savedCard.teamBg || "starlight-gradient")`,
    `      || (window.playNormalizeTeamBgId?.(draft.teamBg) || draft.teamBg || "pallet-town") !== (window.playNormalizeTeamBgId?.(savedCard.teamBg) || savedCard.teamBg || "pallet-town")`
  ],
  [
    `  const TEAM_BG_FILTERS = [
    ["all", "All"],
    ["starlight", "ST★RLIGHT"],
    ["retro", "Retro"],
    ["kanto", "Kanto"],
    ["cities", "Cities"],
    ["routes", "Routes"],
    ["landmarks", "Landmarks"],
    ["battle", "Battle"],
    ["special", "Special"]
  ];`,
    `  const TEAM_BG_FILTERS = [
    ["all", "All"],
    ["kanto", "Kanto"],
    ["lets-go", "Let's Go"],
    ["retro", "Retro"],
    ["cities", "Cities"],
    ["routes", "Routes"],
    ["landmarks", "Landmarks"],
    ["battle", "Battle"],
    ["special", "Special"]
  ];

  function teamBgMatchesFilter(row, filter) {
    if (filter === "all") return true;
    if (filter === "retro") return false; // Coming Soon — no selectable items
    if (filter === "kanto" || filter === "lets-go") return row.filter === filter;
    if (filter === "cities" || filter === "routes" || filter === "landmarks" || filter === "battle" || filter === "special") {
      const bucket = row.filterBucket || String(row.category || "").toLowerCase();
      return bucket === filter || String(row.category || "").toLowerCase() === filter;
    }
    return row.filter === filter;
  }`
  ]
]);

console.log("settings partial 1 ok");
