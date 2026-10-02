const fs = require("fs");
const path = require("path");
const vm = require("vm");
const dir = path.join(__dirname, "..");
const code = fs.readFileSync(path.join(dir, "js", "trainers.js"), "utf8");
const sandbox = { window: {}, console };
vm.createContext(sandbox);
vm.runInContext(code, sandbox);
let total = 0;
let missing = 0;
const missingIds = [];
for (const group of sandbox.window.PLAY_TRAINERS || []) {
  for (const t of sandbox.window.playTrainerLooks(group)) {
    if (!t?.id) continue;
    total++;
    const url = sandbox.window.playTrainerSpriteUrl(t.id) || "";
    const rel = url.split("?")[0];
    const file = path.join(dir, rel);
    if (!fs.existsSync(file)) {
      missing++;
      if (missingIds.length < 20) missingIds.push(t.id);
    }
  }
}
const out = { total, missing, missingIds, pass: missing === 0 };
const dest = path.join(dir, "docs", "audits", "rc110-shots");
fs.mkdirSync(dest, { recursive: true });
fs.writeFileSync(path.join(dest, "avatar-catalog-qa.json"), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
