/**
 * Build local Evolution Candy ITEM art for Kanto lines.
 *
 * Does not hotlink at runtime. Uses local candy body (lgpe-candy.png) plus
 * the family mascot sprite nested inside the candy asset.
 *
 * Usage: node tools/compose-evolution-candy-art.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "images", "items", "evolution-candy");
const BODY = "images/items/lgpe-candy.png";
const RARE = "images/items/rare-candy.png";
const MANIFEST = path.join(ROOT, "data", "evolution-candy-manifest.json");

function bodyHref() {
  if (fs.existsSync(path.join(ROOT, "images", "items", "lgpe-candy.png"))) return "../lgpe-candy.png";
  if (fs.existsSync(path.join(ROOT, "images", "items", "rare-candy.png"))) return "../rare-candy.png";
  return "../poke-ball.png";
}

function mascotHref(dex) {
  const gif = path.join(ROOT, "images", "pokemon", `${dex}.gif`);
  const png = path.join(ROOT, "images", "pokemon", `${dex}.png`);
  if (fs.existsSync(gif)) return `../../pokemon/${dex}.gif`;
  if (fs.existsSync(png)) return `../../pokemon/${dex}.png`;
  return "";
}

function svgFor(dex) {
  const body = bodyHref();
  const mascot = mascotHref(dex);
  const mascotNode = mascot
    ? `<image href="${mascot}" x="28" y="20" width="40" height="40" preserveAspectRatio="xMidYMid meet"/>`
    : "";
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" role="img">
  <title>Evolution Candy</title>
  <image href="${body}" x="8" y="8" width="80" height="80" preserveAspectRatio="xMidYMid meet"/>
  ${mascotNode}
</svg>
`;
}

fs.mkdirSync(OUT_DIR, { recursive: true });
let written = 0;
let missingMascot = 0;
for (let dex = 1; dex <= 151; dex += 1) {
  if (!mascotHref(dex)) missingMascot += 1;
  fs.writeFileSync(path.join(OUT_DIR, `${dex}.svg`), svgFor(dex));
  written += 1;
}

let manifest = {};
if (fs.existsSync(MANIFEST)) {
  try { manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8")); } catch (_) { manifest = {}; }
}
manifest.generatedAt = new Date().toISOString();
manifest.source = "tools/prepare-evolution-candy-assets.js + tools/compose-evolution-candy-art.js";
manifest.displayRule = "Evolution Candy item art is a local candy-body asset with the family mascot nested inside (images/items/evolution-candy/{dex}.svg). Rare Candy remains images/items/rare-candy.png. Generic fallback is images/items/lgpe-candy.png.";
manifest.itemArt = {
  directory: "images/items/evolution-candy",
  format: "svg",
  kantoCount: written,
  bodyAsset: fs.existsSync(path.join(ROOT, "images", "items", "lgpe-candy.png")) ? BODY : RARE,
  runtimeExternalRequests: false
};
if (Array.isArray(manifest.rows)) {
  for (const row of manifest.rows) {
    if (Number(row.generation) === 1 && Number(row.representativeDex) >= 1 && Number(row.representativeDex) <= 151) {
      row.itemAssetPath = `images/items/evolution-candy/${row.representativeDex}.svg`;
      row.itemAssetAvailable = true;
      row.notes = "Kanto Evolution Candy item art = local candy body + family mascot; line-keyed";
    }
  }
}
fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Evolution Candy item art: ${written} Kanto SVGs`);
console.log(`Missing mascot files: ${missingMascot}`);
console.log(`Body: ${manifest.itemArt.bodyAsset}`);
console.log(`Out: ${path.relative(ROOT, OUT_DIR)}`);
