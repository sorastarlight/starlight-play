/* Assert Organized Showdown Front-Base catalog invariants. */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const raw = fs.readFileSync(path.join(root, "js", "variants.js"), "utf8");
const after = JSON.parse(raw.match(/window\.PLAY_VARIANTS\s*=\s*(\{[\s\S]*?\});/)[1]);
const female = Object.keys(after).map(Number).filter((d) => after[d].includes("female")).sort((a, b) => a - b);
const forms = [...new Set(Object.values(after).flat())].sort();
const report = JSON.parse(fs.readFileSync(path.join(root, "data", "organized-front-import-report.json"), "utf8"));

const allowed = new Set(["female", "normal", "shiny", "shiny-female"]);
const badForms = forms.filter((f) => !allowed.has(f));
const ok = badForms.length === 0
  && Object.keys(after).length === report.baseDexCount
  && female.length === (report.femaleDexes || []).length
  && female.join(",") === (report.femaleDexes || []).join(",");

function walkBacks(dir) {
  const hits = [];
  if (!fs.existsSync(dir)) return hits;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) hits.push(...walkBacks(p));
    else if (/back/i.test(ent.name)) hits.push(p);
  }
  return hits;
}

const backHits = walkBacks(path.join(root, "images", "pokemon"));

console.log(JSON.stringify({
  ok,
  dex: Object.keys(after).length,
  femaleCount: female.length,
  forms,
  missingBase: report.missing || [],
  skippedBack: report.skippedBack,
  backFilesInPlay: backHits.length
}, null, 2));

if (!ok || backHits.length || (report.missing || []).length) process.exit(1);
