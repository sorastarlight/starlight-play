const fs = require("fs");
const path = require("path");

const trainers = fs.readFileSync(path.join(__dirname, "..", "js", "trainers.js"), "utf8");
const basic = (trainers.match(/"filter": "basic"/g) || []).length;
const retroSelectable = (trainers.match(/"filter": "retro"[\s\S]*?"style":/g) || []).length;
const freeMatch = trainers.match(/PLAY_FREE_TEAM_BG_IDS = (\[[^\]]+\])/);
const freeIds = freeMatch ? JSON.parse(freeMatch[1].replace(/'/g, '"')) : [];
const basicFree = freeIds.filter((id) => String(id).startsWith("basic-"));

const avatarLooks = [];
const groupRe = /window\.PLAY_TRAINERS\s*=\s*\[/;
let looks = 0;
const idRe = /"id":\s*"([^"]+)"/g;
const trainersBlock = trainers.slice(trainers.indexOf("window.PLAY_TRAINERS"));
let m;
while ((m = idRe.exec(trainersBlock)) && looks < 5000) {
  if (m[1].includes("-")) looks++;
}
// rough: count trainer look ids in PLAY_TRAINERS section until PLAY_CARD_BGS
const section = trainers.slice(trainers.indexOf("window.PLAY_TRAINERS"), trainers.indexOf("window.PLAY_CARD_BGS"));
const lookIds = [...section.matchAll(/id:\s*"([^"]+)"/g)].map((x) => x[1]);

const out = {
  appBuild: JSON.parse(fs.readFileSync(path.join(__dirname, "..", "build.json"), "utf8")).appBuild,
  basicCatalog: basic,
  basicInFreeList: basicFree.length,
  retroFilterEntries: retroSelectable,
  trainerLookIdsApprox: lookIds.length,
  freeTeamBgTotal: freeIds.length
};
const dest = path.join(__dirname, "..", "docs", "audits", "rc110-shots");
fs.mkdirSync(dest, { recursive: true });
fs.writeFileSync(path.join(dest, "static-qa.json"), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
