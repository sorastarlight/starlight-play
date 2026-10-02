const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");

function load(file) {
  return fs.readFileSync(path.join(ROOT, file), "utf8").replace(/\r\n/g, "\n");
}
function save(file, text) {
  fs.writeFileSync(path.join(ROOT, file), text.replace(/\n/g, "\r\n"));
}
function mustReplace(file, from, to) {
  let text = load(file);
  if (!text.includes(from)) {
    console.error("MISSING", file, JSON.stringify(from.slice(0, 140)));
    process.exit(1);
  }
  text = text.split(from).join(to);
  save(file, text);
}

mustReplace("js/settings.js",
`  function freeTeamBgIds() {
    return window.PLAY_TEAM_BG_FREE_IDS
      || (window.PLAY_TEAM_BACKGROUNDS || []).filter((row) => row.free).map((row) => row.id)
      || ["starlight-gradient", "pokedex-grid", "research-lab", "battle-stage"];
  }`,
`  function freeTeamBgIds() {
    if (Array.isArray(window.PLAY_FREE_TEAM_BG_IDS) && window.PLAY_FREE_TEAM_BG_IDS.length) {
      return window.PLAY_FREE_TEAM_BG_IDS.slice();
    }
    return (window.PLAY_TEAM_BACKGROUNDS || []).filter((row) => row.free).map((row) => row.id);
  }`);

mustReplace("js/settings.js", `teamBg: next.teamBg || "starlight-gradient",`, `teamBg: window.playNormalizeTeamBgId?.(next.teamBg) || next.teamBg || "pallet-town",`);
mustReplace("js/settings.js", `teamBg: draft.teamBg || card.teamBg || "starlight-gradient",`, `teamBg: window.playNormalizeTeamBgId?.(draft.teamBg || card.teamBg) || draft.teamBg || card.teamBg || "pallet-town",`);
mustReplace("js/settings.js",
`|| (draft.teamBg || "starlight-gradient") !== (savedCard.teamBg || "starlight-gradient")`,
`|| (window.playNormalizeTeamBgId?.(draft.teamBg) || draft.teamBg || "pallet-town") !== (window.playNormalizeTeamBgId?.(savedCard.teamBg) || savedCard.teamBg || "pallet-town")`);
mustReplace("js/settings.js", `p_team_bg: draft.teamBg || "starlight-gradient",`, `p_team_bg: window.playNormalizeTeamBgId?.(draft.teamBg) || draft.teamBg || "pallet-town",`);

mustReplace("js/settings.js",
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
    if (filter === "retro") return false;
    if (filter === "kanto" || filter === "lets-go") return row.filter === filter;
    if (["cities", "routes", "landmarks", "battle", "special"].includes(filter)) {
      const bucket = String(row.filterBucket || row.category || "").toLowerCase();
      return bucket === filter;
    }
    return row.filter === filter;
  }`);

console.log("settings-a ok");
