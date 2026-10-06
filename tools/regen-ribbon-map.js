const fs = require("fs");
const j = JSON.parse(fs.readFileSync("data/achievement-ribbon-map.json", "utf8"));
const out = "/* generated — do not hand-edit */\nwindow.PLAY_ACHIEVEMENT_RIBBON_MAP = "
  + JSON.stringify(j)
  + ";\n";
fs.writeFileSync("js/achievement-ribbon-map.js", out);
const s = fs.readFileSync("js/achievement-ribbon-map.js", "utf8");
console.log("bytes", s.length);
console.log("starts", JSON.stringify(s.slice(0, 60)));
console.log("hasSL", s.includes("streamLinkDescription"));
require("child_process").execSync("node --check js/achievement-ribbon-map.js", { stdio: "inherit" });
console.log("syntax ok");
