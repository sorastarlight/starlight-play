/**
 * Import owner-provided Pokémon GO NORMAL candy PNGs into local Evolution Candy paths.
 * Does not hotlink. Leaves rc121 SVG composites in place as fallback.
 *
 * Usage: node tools/import-go-candy-assets.js
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { spawnSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const SRC_ROOT = "D:\\Downloads\\Pokemon_GO_Candy_Asset_Pipeline\\Pokemon_GO_Candy_Asset_Pipeline";
const NORMAL = path.join(SRC_ROOT, "POKEMON_CANDY", "NORMAL");
const RAW = path.join(SRC_ROOT, "POKEMON_CANDY", "_RAW");
const ZIP = path.join(SRC_ROOT, "Pokemon_GO_Normal_Candy_Assets.zip");
const MANIFEST_IN = path.join(SRC_ROOT, "POKEMON_CANDY", "candy-manifest.json");
const RULES_SQL = fs.readFileSync(
  path.join(ROOT, "supabase", "migrations", "20260914021000_kanto_evo_rules.sql"),
  "utf8"
);
const OUT_DIR = path.join(ROOT, "images", "items", "evolution-candy");
const SITE_MANIFEST = path.join(ROOT, "data", "evolution-candy-manifest.json");
const REPORT = path.join(ROOT, "docs", "audits", "rc122-candy-import.json");
const INDEX_JS = path.join(ROOT, "js", "evolution-candy-png.js");

const SPECIES = JSON.parse(
  fs.readFileSync(path.join(ROOT, "js", "species.js"), "utf8").match(/window\.PLAY_SPECIES\s*=\s*(\[[\s\S]*?\]);/)[1]
);

function slug(name) {
  return String(name || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/♀/g, " female")
    .replace(/♂/g, " male")
    .replace(/['’.]/g, "")
    .replace(/é/g, "e")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function listPng(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((name) => /\.png$/i.test(name));
}

function sniff(buf) {
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    return "webp";
  }
  if (buf.length >= 8 && buf[0] === 0x89 && buf.toString("ascii", 1, 4) === "PNG") return "png";
  return "unknown";
}

function pngInfo(filePath) {
  const buf = fs.readFileSync(filePath);
  const kind = sniff(buf);
  if (kind !== "png" || buf.length < 29) {
    return { width: 0, height: 0, alpha: false, bytes: buf.length, kind };
  }
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const colorType = buf[25];
  return {
    width,
    height,
    colorType,
    alpha: colorType === 4 || colorType === 6,
    bytes: buf.length,
    kind
  };
}

function convertToPng(src, dest) {
  const result = spawnSync("python", ["-c", `
from PIL import Image
import sys
im = Image.open(sys.argv[1])
im = im.convert("RGBA")
im.save(sys.argv[2], "PNG", optimize=True)
print(f"{im.size[0]}x{im.size[1]}")
`, src, dest], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`Pillow convert failed for ${src}: ${result.stderr || result.stdout}`);
  }
  return String(result.stdout || "").trim();
}

function zipEntryCount(zipPath) {
  if (!fs.existsSync(zipPath)) return 0;
  try {
    const out = execSync(
      `powershell -NoProfile -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; ([IO.Compression.ZipFile]::OpenRead('${zipPath.replace(/'/g, "''")}')).Entries.Count"`,
      { encoding: "utf8" }
    );
    return Number(String(out).trim()) || 0;
  } catch (_) {
    return 0;
  }
}

const familyOf = {};
for (let dex = 1; dex <= 151; dex += 1) familyOf[dex] = dex;
for (const match of RULES_SQL.matchAll(/'(\d+-\d+)',\s*(\d+),\s*(\d+),\s*(\d+)/g)) {
  const from = Number(match[2]);
  const to = Number(match[3]);
  const fam = Number(match[4]);
  if (from >= 1 && from <= 151) familyOf[from] = fam;
  if (to >= 1 && to <= 151) familyOf[to] = fam;
}

const normalFiles = listPng(NORMAL);
const rawFiles = listPng(RAW);
const xlPattern = /(?:^|[_\-])xl(?:[_\-]|$)|candy-xl|xl-candy|mega[-_ ]?energy/i;
const xlIgnored = [...normalFiles, ...rawFiles].filter((name) => xlPattern.test(name));
const otherIgnored = normalFiles.filter((name) => !/-candy\.png$/i.test(name) || /^0-candy\.png$/i.test(name));
const normalCandy = normalFiles.filter((name) => /-candy\.png$/i.test(name) && !xlPattern.test(name) && !/^0-candy\.png$/i.test(name));

const byKey = new Map();
for (const file of normalCandy) {
  const key = file.replace(/-candy\.png$/i, "");
  byKey.set(key, file);
  byKey.set(key.replace(/-/g, ""), file);
}

let inbound = [];
if (fs.existsSync(MANIFEST_IN)) {
  try { inbound = JSON.parse(fs.readFileSync(MANIFEST_IN, "utf8")); } catch (_) { inbound = []; }
}
for (const row of inbound) {
  const file = row.filename;
  if (!file || /xl/i.test(file)) continue;
  const key = slug(row.candy_key || row.display_name);
  if (key && !byKey.has(key)) byKey.set(key, file);
  if (row.display_name) {
    const displayKey = slug(row.display_name);
    if (displayKey && !byKey.has(displayKey)) byKey.set(displayKey, file);
  }
}

const aliases = {
  "nidoran-female": ["nidoran-female", "nidoran-f", "nidoranf"],
  "nidoran-male": ["nidoran-male", "nidoran-m", "nidoranm"],
  "mr-mime": ["mr-mime", "mrmime"],
  farfetchd: ["farfetchd", "farfetch-d"],
  "mime-jr": ["mime-jr", "mimejr"]
};

function findFile(name) {
  const keys = [slug(name), ...(aliases[slug(name)] || [])];
  for (const key of keys) {
    if (byKey.has(key)) return byKey.get(key);
  }
  return "";
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(path.dirname(REPORT), { recursive: true });

const mapped = [];
const missing = [];
const index = {};
const copiedFiles = new Set();
const sampleInfo = {};

for (let dex = 1; dex <= 151; dex += 1) {
  const name = SPECIES[dex - 1];
  const family = familyOf[dex] || dex;
  const familyName = SPECIES[family - 1];
  const ownFile = findFile(name);
  const familyFile = findFile(familyName);
  const file = ownFile || familyFile;
  const sourceDex = ownFile ? dex : family;
  if (!file) {
    missing.push({ dex, name, family, familyName });
    continue;
  }
  const src = path.join(NORMAL, file);
  if (!fs.existsSync(src)) {
    missing.push({ dex, name, family, familyName, file, missingFile: true });
    continue;
  }
  if (!copiedFiles.has(sourceDex)) {
    const dest = path.join(OUT_DIR, `${sourceDex}.png`);
    const srcKind = sniff(fs.readFileSync(src).subarray(0, 16));
    if (srcKind === "webp" || srcKind !== "png") convertToPng(src, dest);
    else fs.copyFileSync(src, dest);
    copiedFiles.add(sourceDex);
    if ([1, 4, 25, 27, 29, 32, 63, 92, 133, 147].includes(sourceDex)) {
      sampleInfo[sourceDex] = { ...pngInfo(dest), sourceKind: srcKind };
    }
  }
  index[dex] = sourceDex;
  mapped.push({
    dex,
    name,
    family,
    file,
    via: ownFile ? "name" : "family",
    dest: `images/items/evolution-candy/${sourceDex}.png`
  });
}

fs.writeFileSync(INDEX_JS, `/* generated by tools/import-go-candy-assets.js — local PNG index, do not hotlink */
window.PLAY_EVO_CANDY_PNG = ${JSON.stringify(index)};
`);

let siteManifest = {};
if (fs.existsSync(SITE_MANIFEST)) {
  try { siteManifest = JSON.parse(fs.readFileSync(SITE_MANIFEST, "utf8")); } catch (_) { siteManifest = {}; }
}
siteManifest.providedCandy = {
  importedAt: new Date().toISOString(),
  source: "owner Pokemon_GO_Normal_Candy_Assets NORMAL PNGs",
  preferPngOverSvg: true,
  fallback: ["images/items/evolution-candy/{pngIndex}.png", "images/items/evolution-candy/{dex}.svg", "images/items/lgpe-candy.png"],
  uniquePngFiles: copiedFiles.size,
  kantoMappedDex: mapped.length
};
if (Array.isArray(siteManifest.rows)) {
  for (const row of siteManifest.rows) {
    const dex = Number(row.representativeDex);
    if (index[dex]) {
      row.providedAssetPath = `images/items/evolution-candy/${index[dex]}.png`;
      row.providedAssetAvailable = true;
    }
  }
}
fs.writeFileSync(SITE_MANIFEST, `${JSON.stringify(siteManifest, null, 2)}\n`);

const kantoLines = new Set(Object.values(familyOf).filter((id) => id >= 1 && id <= 151));
const mappedLines = new Set(mapped.map((row) => row.family));
const missingLines = [...kantoLines].filter((id) => !mappedLines.has(id)).map((id) => ({
  family: id,
  name: SPECIES[id - 1]
}));

const report = {
  suppliedZipEntries: zipEntryCount(ZIP),
  suppliedNormalDir: normalFiles.length,
  suppliedRawDir: rawFiles.length,
  normalCandyCount: normalCandy.length,
  xlOrOtherIgnored: xlIgnored.length + otherIgnored.length,
  xlIgnored: xlIgnored,
  otherIgnored,
  uniquePngImported: copiedFiles.size,
  kantoDexMapped: mapped.length,
  kantoLinesMapped: mappedLines.size,
  kantoLinesTotal: kantoLines.size,
  missingKantoDex: missing,
  missingKantoLines: missingLines,
  fallbackSvgCount: 151 - mapped.length,
  samplePng: sampleInfo,
  representative: {
    Charmander: mapped.find((r) => r.dex === 4) || null,
    Pikachu: mapped.find((r) => r.dex === 25) || null,
    Sandshrew: mapped.find((r) => r.dex === 27) || null,
    "Nidoran F": mapped.find((r) => r.dex === 29) || null,
    "Nidoran M": mapped.find((r) => r.dex === 32) || null,
    Eevee: mapped.find((r) => r.dex === 133) || null,
    Abra: mapped.find((r) => r.dex === 63) || null,
    Gastly: mapped.find((r) => r.dex === 92) || null,
    Dratini: mapped.find((r) => r.dex === 147) || null
  },
  runtimeExternalRequests: false,
  svgFallbackKept: true
};
fs.writeFileSync(REPORT, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  zipEntries: report.suppliedZipEntries,
  normalCandy: normalCandy.length,
  uniquePng: copiedFiles.size,
  kantoMapped: mapped.length,
  missingDex: missing.length,
  missingLines: missingLines.length,
  xlIgnored: xlIgnored.length,
  otherIgnored: otherIgnored.length
}, null, 2));
console.log(`Index: ${path.relative(ROOT, INDEX_JS)}`);
console.log(`Report: ${path.relative(ROOT, REPORT)}`);
