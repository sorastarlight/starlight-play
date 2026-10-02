/**
 * rc109: import Let's Go ZIP, rebuild team background catalog, write manifests/aliases.
 */
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const ZIP_ROOT = path.join(ROOT, "tmp-letsgo-zip", "LGPE_Map_Icons_Organized");
const OUT_DIR = path.join(ROOT, "images", "team-bgs", "lets-go");
const AUDIT = path.join(ROOT, "docs", "audits", "letsgo-rc109");
const TRAINERS = path.join(ROOT, "js", "trainers.js");

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(AUDIT, { recursive: true });

function pngSize(buf) {
  if (buf[0] !== 0x89 || buf.toString("ascii", 1, 4) !== "PNG") return { width: 0, height: 0 };
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function displayFromFile(file) {
  return file
    .replace(/\.png$/i, "")
    .replace(/_/g, " ")
    .replace(/\bMt\b/g, "Mt.")
    .replace(/\bDigletts\b/g, "Diglett's");
}

function slugFromFile(file) {
  return "lgpe-" + file.replace(/\.png$/i, "").toLowerCase().replace(/_/g, "-");
}

function categoryFromFolder(folder) {
  if (/Cities/i.test(folder)) return { category: "Cities", filterBucket: "cities" };
  if (/Routes/i.test(folder)) return { category: "Routes", filterBucket: "routes" };
  if (/Caves|Special/i.test(folder)) return { category: "Landmarks", filterBucket: "landmarks" };
  if (/Map Backgrounds/i.test(folder)) return { category: "Special", filterBucket: "special" };
  return { category: "Special", filterBucket: "special" };
}

// Old owner file → ZIP renamed file (from rename_manifest.csv, without ^q suffix)
const OLD_TO_ZIP = {
  "road001.png": "Route_01.png",
  "road002.png": "Route_02.png",
  "road003.png": "Route_03.png",
  "road004.png": "Route_04.png",
  "road005.png": "Route_05.png",
  "road006.png": "Route_06.png",
  "road007.png": "Route_07.png",
  "road008.png": "Route_08.png",
  "road009.png": "Route_09.png",
  "road010.png": "Route_10.png",
  "road011.png": "Route_11.png",
  "road012.png": "Route_12.png",
  "road013.png": "Route_13.png",
  "road014.png": "Route_14.png",
  "road015.png": "Route_15.png",
  "road016.png": "Route_16.png",
  "road017.png": "Route_17.png",
  "road018.png": "Route_18.png",
  "road019.png": "Route_19.png",
  "road020.png": "Route_20.png",
  "road021.png": "Route_21.png",
  "road022.png": "Route_22.png",
  "road023.png": "Route_23.png",
  "road024.png": "Route_24.png",
  "road025.png": "Route_25.png",
  "town001.png": "Pallet_Town.png",
  "town002.png": "Viridian_City.png",
  "town003.png": "Pewter_City.png",
  "town004.png": "Cerulean_City.png",
  "town005.png": "Lavender_Town.png",
  "town006.png": "Vermilion_City.png",
  "town007.png": "Celadon_City.png",
  "town008.png": "Fuchsia_City.png",
  "town009.png": "Saffron_City.png",
  "town010.png": "Indigo_Plateau.png",
  "town011.png": "Cinnabar_Island.png",
  "r002g0101.png": "Viridian_Forest.png",
  "r004d0101.png": "Mt_Moon.png",
  "r010d0101.png": "Rock_Tunnel.png",
  "r010r0101.png": "Power_Plant.png",
  "r011d0101.png": "Digletts_Cave.png",
  "r020d0101.png": "Seafoam_Islands.png",
  "r023d0101.png": "Victory_Road.png"
};

const FREE_LGPE = new Set([
  "lgpe-pallet-town",
  "lgpe-viridian-city",
  "lgpe-route-01",
  "lgpe-viridian-forest",
  "lgpe-kanto-map-background"
]);

const FRLG = [
  { id: "pallet-town", name: "Pallet Town", category: "Cities", asset: "images/encounters/locations/frlg/pallet-town.png", free: true },
  { id: "viridian-forest", name: "Viridian Forest", category: "Landmarks", asset: "images/encounters/locations/frlg/viridian-forest.png", free: true },
  { id: "route-1", name: "Route 1", category: "Routes", asset: "images/encounters/locations/frlg/route-1.png", free: true },
  { id: "route-2", name: "Route 2", category: "Routes", asset: "images/encounters/locations/frlg/route-2.png", free: false },
  { id: "mt-moon", name: "Mt. Moon", category: "Landmarks", asset: "images/encounters/locations/frlg/mt-moon.png", free: true },
  { id: "cerulean-cave", name: "Cerulean Cave", category: "Landmarks", asset: "images/encounters/locations/frlg/cerulean-cave.png", free: false },
  { id: "digletts-cave", name: "Diglett's Cave", category: "Landmarks", asset: "images/encounters/locations/frlg/digletts-cave.png", free: false },
  { id: "rock-tunnel", name: "Rock Tunnel", category: "Landmarks", asset: "images/encounters/locations/frlg/rock-tunnel.png", free: false },
  { id: "seafoam-islands", name: "Seafoam Islands", category: "Landmarks", asset: "images/encounters/locations/frlg/seafoam-islands.png", free: false },
  { id: "saffron-city", name: "Saffron City", category: "Cities", asset: "images/encounters/locations/frlg/saffron-city.png", free: false },
  { id: "cinnabar-lab", name: "Cinnabar Lab", category: "Special", asset: "images/encounters/locations/frlg/cinnabar-lab.png", free: false },
  { id: "safari-zone", name: "Safari Zone", category: "Special", asset: "images/encounters/locations/frlg/safari-zone.png", free: true },
  { id: "power-plant", name: "Power Plant", category: "Special", asset: "images/encounters/locations/frlg/power-plant.png", free: false },
  { id: "victory-road", name: "Victory Road", category: "Battle", asset: "images/encounters/locations/frlg/victory-road.png", free: false }
];

const folders = fs.readdirSync(ZIP_ROOT, { withFileTypes: true }).filter((d) => d.isDirectory());
const importRows = [];
const aliases = {
  "starlight-gradient": "pallet-town",
  "pokedex-grid": "pallet-town",
  "research-lab": "pallet-town",
  "kanto-route": "route-1",
  "gen1-mono": "pallet-town",
  "gen2-color": "pallet-town",
  "gen3-gba": "pallet-town",
  "gen4-ds": "pallet-town",
  "retro-battle": "battle-stage"
};

for (const folder of folders) {
  const dir = path.join(ZIP_ROOT, folder.name);
  const files = fs.readdirSync(dir).filter((n) => /\.png$/i.test(n)).sort();
  const meta = categoryFromFolder(folder.name);
  for (const file of files) {
    const src = path.join(dir, file);
    const buf = fs.readFileSync(src);
    const dim = pngSize(buf);
    const localName = file; // already clean Route_01.png etc.
    const destRel = `images/team-bgs/lets-go/${localName}`;
    const destAbs = path.join(ROOT, destRel);
    fs.copyFileSync(src, destAbs);
    const id = slugFromFile(localName);
    const name = displayFromFile(localName);
    const oldEntry = Object.entries(OLD_TO_ZIP).find(([, zipName]) => zipName === localName);
    const oldFile = oldEntry ? oldEntry[0] : null;
    const oldId = oldFile ? `owner-${oldFile.replace(/\.png$/i, "")}` : null;
    if (oldId) aliases[oldId] = id;
    importRows.push({
      sourcePath: path.relative(ROOT, src).replace(/\\/g, "/"),
      sourceFilename: file,
      folder: folder.name,
      dimensions: dim,
      normalizedLocalFilename: localName,
      asset: destRel.replace(/\\/g, "/"),
      id,
      displayName: name,
      category: meta.category,
      filterBucket: meta.filterBucket,
      replacedOldId: oldId,
      replacedOldFile: oldFile,
      free: FREE_LGPE.has(id),
      importStatus: dim.width > 0 ? "imported" : "broken"
    });
  }
}

const catalog = [];
let sort = 10;

// Battle stage (kept; not ST★RLIGHT category item)
catalog.push({
  sort: sort++,
  id: "battle-stage",
  name: "Battle Stage",
  category: "Battle",
  filter: "battle",
  region: "",
  source: "ST★RLIGHT",
  style: "css",
  cssClass: "team-bg-battle-stage",
  free: true,
  renderMode: "css",
  generationStyle: "starlight",
  focalX: 0.5,
  focalY: 0.55
});

// Kanto / FRLG
for (const row of FRLG) {
  const filterBucket = row.category === "Cities" ? "cities"
    : row.category === "Routes" ? "routes"
    : row.category === "Battle" ? "battle"
    : row.category === "Special" ? "special"
    : "landmarks";
  catalog.push({
    sort: sort++,
    id: row.id,
    name: row.name,
    category: row.category,
    filter: "kanto",
    filterBucket,
    region: "Kanto",
    source: "FRLG",
    style: "image",
    asset: row.asset,
    cssClass: "team-bg-image",
    free: row.free,
    renderMode: "pixel-cover",
    generationStyle: "gen3",
    focalX: 0.5,
    focalY: 0.45,
    pixelArt: true
  });
}

// Let's Go
for (const row of importRows) {
  catalog.push({
    sort: sort++,
    id: row.id,
    name: row.displayName,
    category: row.category,
    filter: "lets-go",
    filterBucket: row.filterBucket,
    region: "Kanto",
    source: "Let's Go",
    style: "image",
    asset: row.asset,
    cssClass: "team-bg-image",
    free: row.free,
    renderMode: "cover",
    generationStyle: "modern",
    focalX: 0.5,
    focalY: 0.55
  });
}

const manifest = {
  zipImages: importRows.length,
  imported: importRows.filter((r) => r.importStatus === "imported").length,
  broken: importRows.filter((r) => r.importStatus !== "imported"),
  ambiguous: [],
  replaced: importRows.filter((r) => r.replacedOldId).map((r) => ({ from: r.replacedOldId, to: r.id, file: r.normalizedLocalFilename })),
  aliases,
  rows: importRows
};

fs.writeFileSync(path.join(AUDIT, "import-manifest.json"), JSON.stringify(manifest, null, 2));
fs.writeFileSync(path.join(AUDIT, "catalog.json"), JSON.stringify(catalog, null, 2));
fs.writeFileSync(path.join(AUDIT, "aliases.json"), JSON.stringify(aliases, null, 2));

// Patch trainers.js PLAY_TEAM_BACKGROUNDS block
let trainers = fs.readFileSync(TRAINERS, "utf8");
const start = trainers.indexOf("window.PLAY_TEAM_BACKGROUNDS = [");
const playTeamBgIdx = trainers.indexOf("  window.playTeamBg = function playTeamBg");
if (start < 0 || playTeamBgIdx < 0) {
  console.error("Could not locate PLAY_TEAM_BACKGROUNDS block", { start, playTeamBgIdx });
  process.exit(1);
}

const freeIds = catalog.filter((r) => r.free).map((r) => r.id);
const aliasBlock = `  window.PLAY_TEAM_BG_ALIASES = ${JSON.stringify(aliases, null, 2)};
  window.playNormalizeTeamBgId = function playNormalizeTeamBgId(id) {
    const raw = String(id || "").trim();
    if (!raw) return "pallet-town";
    return window.PLAY_TEAM_BG_ALIASES?.[raw] || raw;
  };
  window.PLAY_FREE_TEAM_BG_IDS = ${JSON.stringify(freeIds)};
`;

const catalogBlock = `window.PLAY_TEAM_BACKGROUNDS = ${JSON.stringify(catalog, null, 2)};
${aliasBlock}
`;

trainers = trainers.slice(0, start) + catalogBlock + "\n" + trainers.slice(playTeamBgIdx);

// Fix playTeamBg fallbacks
trainers = trainers.replace(
  /window\.playTeamBg = function playTeamBg\(id\) \{[\s\S]*?\n  \};/,
  `window.playTeamBg = function playTeamBg(id) {
    const key = window.playNormalizeTeamBgId?.(id) || String(id || "").trim() || "pallet-town";
    return window.PLAY_TEAM_BACKGROUNDS.find((row) => row.id === key)
      || window.PLAY_TEAM_BACKGROUNDS.find((row) => row.id === "pallet-town")
      || window.PLAY_TEAM_BACKGROUNDS[0];
  };`
);

fs.writeFileSync(TRAINERS, trainers);

// Contact sheet
const sheet = `<!doctype html>
<html><head><meta charset="utf-8"><base href="/"><title>Let's Go BG contact sheet rc109</title>
<style>
body{margin:16px;font-family:Segoe UI,sans-serif;background:#eef6ff;color:#1a2744}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px}
.card{background:#fff;border:1px solid #cfe3f4;border-radius:12px;padding:8px}
.card img{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:8px;background:#ddd}
meta{font-size:11px;color:#4a5a78}
</style></head><body>
<h1>Let's Go Team backgrounds (${importRows.length})</h1>
<pre id="sum"></pre>
<div class="grid">${importRows.map((r) => `
  <article class="card" data-id="${r.id}">
    <img src="${r.asset}" alt="${r.displayName}" loading="eager">
    <strong>${r.displayName}</strong>
    <div class="meta">${r.id}<br>${r.dimensions.width}×${r.dimensions.height}${r.replacedOldId ? `<br>replaces ${r.replacedOldId}` : ""}</div>
  </article>`).join("")}</div>
<script>
(async () => {
  const cards=[...document.querySelectorAll('.card')];
  let ok=0,bad=0;
  await Promise.all(cards.map(async (card)=>{
    const img=card.querySelector('img');
    await new Promise((res)=>{ if(img.complete) res(); else img.onload=img.onerror=res; });
    if (img.naturalWidth>0) ok++; else bad++;
  }));
  const summary={total:cards.length,naturalOk:ok,naturalBad:bad,pass:bad===0};
  document.getElementById('sum').textContent=JSON.stringify(summary,null,2);
  window.__LGPE_SHEET__=summary;
})();
</script>
</body></html>`;
fs.writeFileSync(path.join(AUDIT, "contact-sheet.html"), sheet);

console.log(JSON.stringify({
  imported: importRows.length,
  catalog: catalog.length,
  aliases: Object.keys(aliases).length,
  free: freeIds.length,
  replaced: manifest.replaced.length
}, null, 2));
