/* Assert gameplay form availability is still the frozen base-Kanto catalog. */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const raw = fs.readFileSync(path.join(root, "js", "variants.js"), "utf8");
const after = JSON.parse(raw.match(/window\.PLAY_VARIANTS\s*=\s*(\{[\s\S]*?\});/)[1]);
const female = Object.keys(after).map(Number).filter((d) => after[d].includes("female")).sort((a, b) => a - b);
const forms = [...new Set(Object.values(after).flat())].sort();
const expectedFemale = [3, 19, 20, 41, 42, 64, 65, 84, 85, 97, 123];
const ok = female.join(",") === expectedFemale.join(",")
  && forms.join(",") === "female,normal,shiny,shiny-female"
  && Object.keys(after).length === 151;

const report = JSON.parse(fs.readFileSync(path.join(root, "data", "kanto-3d-import-report.json"), "utf8"));
const missing = report.missingBase || [];

console.log(JSON.stringify({
  ok,
  dex: Object.keys(after).length,
  female,
  forms,
  missingBase: missing,
  femalePresentButNotGameplayEnabled: report.femalePresentButNotGameplayEnabled?.length ?? 0,
  specialFormRows: report.specialFormRows,
  enabledInPlayRows: report.enabledInPlayRows
}, null, 2));

if (!ok) process.exit(1);
if (missing.some((row) => !row.keepExisting)) {
  console.error("Missing base sprite with no existing Play fallback — RELEASE BLOCKER");
  process.exit(1);
}
