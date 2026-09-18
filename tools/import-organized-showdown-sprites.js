/**
 * Import Organized Showdown Gen 1–9 Front Base sprites into Play.
 *
 * - Only Form=Base + Side=Front* enter images/pokemon/.
 * - Backs are never copied into play stems or PLAY_VARIANTS.
 * - Non-base forms (Mega, regional, Gmax, …) optionally go to an asset library only.
 * - Rebuilds PLAY_VARIANTS, PLAY_SPECIES, PLAY_SPRITE_EXT, and seed JSON for DB.
 *
 * Usage:
 *   node tools/import-organized-showdown-sprites.js [--dry]
 *     [--source <Organized root>]
 *     [--library <asset-library-dest>]
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DEST = path.join(ROOT, "images", "pokemon");
const DRY = process.argv.includes("--dry");

function argValue(flag, fallback) {
  const idx = process.argv.indexOf(flag);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  return fallback;
}

const DEFAULT_SOURCE = path.join(
  "C:",
  "Users",
  "FET",
  "sprites",
  "sprites",
  "pokemon",
  "other",
  "Organized"
);
const SOURCE = argValue("--source", process.env.ORGANIZED_SHOWDOWN_SOURCE || DEFAULT_SOURCE);
const LIBRARY = argValue(
  "--library",
  process.env.ORGANIZED_SHOWDOWN_LIBRARY
    || path.join(
      "S:",
      "NewVTuberProject",
      "Stream Assets",
      "Games",
      "PokemonRPG",
      "ASSETS",
      "SPRITES",
      "POKEMON",
      "Pokemon Sprites",
      "Organized_Showdown_Library"
    )
);

const SPECIAL_DISPLAY = {
  "nidoran-f": "Nidoran\u2640",
  "nidoran-m": "Nidoran\u2642",
  farfetchd: "Farfetch'd",
  "sirfetchd": "Sirfetch'd",
  "mr-mime": "Mr. Mime",
  "mime-jr": "Mime Jr.",
  "mr-rime": "Mr. Rime",
  "ho-oh": "Ho-Oh",
  "porygon-z": "Porygon-Z",
  "jangmo-o": "Jangmo-o",
  "hakamo-o": "Hakamo-o",
  "kommo-o": "Kommo-o",
  "tapu-koko": "Tapu Koko",
  "tapu-lele": "Tapu Lele",
  "tapu-bulu": "Tapu Bulu",
  "tapu-fini": "Tapu Fini",
  "type-null": "Type: Null",
  "flabebe": "Flabébé",
  "zygarde": "Zygarde",
  "hakamo-o": "Hakamo-o"
};

function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, "").trim().split(/\r?\n/);
  if (!lines.length) return [];
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).filter(Boolean).map((line) => {
    const cols = splitCsvLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = cols[i] ?? ""; });
    return row;
  });
}

function splitCsvLine(line) {
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i += 1; }
      else inQ = !inQ;
      continue;
    }
    if (ch === "," && !inQ) { out.push(cur); cur = ""; continue; }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function truthy(v) {
  return String(v || "").trim().toLowerCase() === "true";
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  if (!DRY) fs.copyFileSync(src, dest);
}

function displayName(slug) {
  const key = String(slug || "").trim().toLowerCase();
  if (SPECIAL_DISPLAY[key]) return SPECIAL_DISPLAY[key];
  return key
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function destPlay(kind, dex, ext) {
  if (kind === "normal") return path.join(DEST, `${dex}.${ext}`);
  if (kind === "shiny") return path.join(DEST, "shiny", `${dex}.${ext}`);
  if (kind === "female") return path.join(DEST, "female", `${dex}.${ext}`);
  return path.join(DEST, "shiny", "female", `${dex}.${ext}`);
}

function clearPlayTree() {
  if (!fs.existsSync(DEST)) return;
  const walk = (dir) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (/\.(gif|png|webp)$/i.test(ent.name)) {
        if (!DRY) fs.unlinkSync(p);
      }
    }
  };
  walk(DEST);
}

function readExistingSpeciesNames() {
  const raw = fs.readFileSync(path.join(ROOT, "js", "species.js"), "utf8");
  const match = raw.match(/window\.PLAY_SPECIES\s*=\s*(\[[\s\S]*?\]);/);
  if (!match) return [];
  try {
    return JSON.parse(match[1]);
  } catch {
    return [];
  }
}

function stampNow() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}-org1`;
}

if (!fs.existsSync(SOURCE)) {
  console.error(`Organized source not found: ${SOURCE}`);
  process.exit(1);
}

const matrixPath = path.join(SOURCE, "variant-matrix.csv");
const manifestPath = path.join(SOURCE, "manifest.csv");
if (!fs.existsSync(matrixPath) || !fs.existsSync(manifestPath)) {
  console.error("variant-matrix.csv and manifest.csv are required in the Organized root");
  process.exit(1);
}

const matrix = parseCsv(fs.readFileSync(matrixPath, "utf8"));
const manifest = parseCsv(fs.readFileSync(manifestPath, "utf8"));
const existingNames = readExistingSpeciesNames();
const spriteBuild = stampNow();

/** @type {Map<number, object>} */
const baseByDex = new Map();
for (const row of matrix) {
  if (String(row.Form || "").trim() !== "Base") continue;
  const dex = Number(row.NationalDex);
  if (!Number.isFinite(dex) || dex < 1) continue;
  baseByDex.set(dex, {
    dex,
    generation: Number(row.Generation) || 0,
    species: String(row.Species || "").trim(),
    formId: String(row.PokemonFormId || "").trim(),
    front: truthy(row.Front),
    frontShiny: truthy(row.FrontShiny),
    frontFemale: truthy(row.FrontFemale),
    frontShinyFemale: truthy(row.FrontShinyFemale)
  });
}

/** Index Front Base files from manifest: dex -> kind -> DestinationPath */
const frontBaseFiles = new Map();
let skippedBack = 0;
let librarySpecial = 0;
for (const row of manifest) {
  const formLabel = String(row.FormLabel || "").trim();
  const side = String(row.Side || "").trim();
  const dex = Number(row.NationalDex);
  const destPath = String(row.DestinationPath || "").trim();
  if (!Number.isFinite(dex) || !destPath) continue;

  if (side.toLowerCase() === "back") {
    skippedBack += 1;
    continue;
  }
  if (side.toLowerCase() !== "front") continue;

  if (formLabel !== "Base") {
    // Optional library archive for non-base Fronts
    if (!DRY) {
      const rel = path.relative(SOURCE, destPath);
      const libDest = path.join(LIBRARY, rel);
      if (fs.existsSync(destPath)) {
        ensureDir(path.dirname(libDest));
        fs.copyFileSync(destPath, libDest);
        librarySpecial += 1;
      }
    } else {
      librarySpecial += 1;
    }
    continue;
  }

  const shiny = truthy(row.Shiny);
  const female = truthy(row.Female);
  let kind = "normal";
  if (shiny && female) kind = "shiny-female";
  else if (female) kind = "female";
  else if (shiny) kind = "shiny";

  if (!frontBaseFiles.has(dex)) frontBaseFiles.set(dex, {});
  frontBaseFiles.get(dex)[kind] = destPath;
}

clearPlayTree();
ensureDir(DEST);
ensureDir(path.join(DEST, "shiny"));
ensureDir(path.join(DEST, "female"));
ensureDir(path.join(DEST, "shiny", "female"));

const variants = {};
const spriteExt = {};
const speciesNames = [];
const formsSeed = [];
const missing = [];
const copied = { normal: 0, shiny: 0, female: 0, "shiny-female": 0 };
const maxDex = Math.max(...baseByDex.keys());

for (let dex = 1; dex <= maxDex; dex += 1) {
  const base = baseByDex.get(dex);
  if (!base) {
    speciesNames[dex - 1] = existingNames[dex - 1] || `Dex ${dex}`;
    continue;
  }

  const name = (dex <= existingNames.length && existingNames[dex - 1])
    ? existingNames[dex - 1]
    : displayName(base.species);
  speciesNames[dex - 1] = name;

  const files = frontBaseFiles.get(dex) || {};
  const list = [];

  const tryCopy = (kind, required) => {
    const src = files[kind];
    if (!src || !fs.existsSync(src)) {
      if (required) missing.push({ dex, kind, reason: "missing-source" });
      return false;
    }
    const ext = path.extname(src).replace(/^\./, "").toLowerCase() || "gif";
    const dest = destPlay(kind, dex, ext);
    copyFile(src, dest);
    const stem = kind === "normal" ? String(dex)
      : kind === "shiny" ? `shiny/${dex}`
        : kind === "female" ? `female/${dex}`
          : `shiny/female/${dex}`;
    spriteExt[stem] = ext;
    copied[kind] += 1;
    list.push(kind === "shiny-female" ? "shiny-female" : kind === "female" ? "female" : kind === "shiny" ? "shiny" : "normal");
    formsSeed.push({
      dex,
      form_key: "base",
      form_label: "Base",
      kind: "base",
      gender: kind.includes("female") ? "female" : "",
      shiny: kind.includes("shiny"),
      source_set: "OrganizedShowdown",
      filename: path.basename(src),
      enabled_in_play: true,
      variant: kind === "normal" ? "normal"
        : kind === "shiny" ? "shiny"
          : kind === "female" ? "female"
            : "shiny-female"
    });
    return true;
  };

  tryCopy("normal", true);
  tryCopy("shiny", true);
  if (base.frontFemale) tryCopy("female", true);
  if (base.frontShinyFemale) tryCopy("shiny-female", true);

  // Normalize variant order
  const ordered = [];
  if (list.includes("normal")) ordered.push("normal");
  if (list.includes("female")) ordered.push("female");
  if (list.includes("shiny-female")) ordered.push("shiny-female");
  if (list.includes("shiny")) ordered.push("shiny");
  // Prefer stable order: normal, female, shiny-female, shiny (match prior Venusaur style)
  const preferred = ["normal", "female", "shiny-female", "shiny"].filter((k) => ordered.includes(k));
  variants[String(dex)] = preferred.length ? preferred : ["normal", "shiny"];
}

// Fill sparse holes in speciesNames array for JSON (keep length = maxDex)
while (speciesNames.length < maxDex) speciesNames.push(`Dex ${speciesNames.length + 1}`);

const variantsJs = `window.PLAY_SPRITE_BUILD = ${JSON.stringify(spriteBuild)};\nwindow.PLAY_VARIANTS = ${JSON.stringify(variants)};\nwindow.PLAY_SPRITE_EXT = ${JSON.stringify(spriteExt)};\n`;
const speciesJs = `window.PLAY_SPECIES=${JSON.stringify(speciesNames)};\n`;

if (!DRY) {
  fs.writeFileSync(path.join(ROOT, "js", "variants.js"), variantsJs);
  fs.writeFileSync(path.join(ROOT, "js", "species.js"), speciesJs);
  const buildPath = path.join(ROOT, "build.json");
  const build = JSON.parse(fs.readFileSync(buildPath, "utf8"));
  build.spriteBuild = spriteBuild;
  fs.writeFileSync(buildPath, `${JSON.stringify(build, null, 4)}\n`.replace(/\n {4}/g, "\n    "));

  ensureDir(path.join(ROOT, "data"));
  fs.writeFileSync(path.join(ROOT, "data", "organized-front-import-report.json"), `${JSON.stringify({
    spriteBuild,
    source: SOURCE,
    baseDexCount: baseByDex.size,
    maxDex,
    copied,
    skippedBack,
    librarySpecialFronts: librarySpecial,
    missing,
    femaleDexes: Object.keys(variants).map(Number).filter((d) => variants[String(d)].includes("female")).sort((a, b) => a - b),
    note: "Back sprites intentionally excluded from play"
  }, null, 2)}\n`);

  fs.writeFileSync(path.join(ROOT, "data", "organized-base-species-seed.json"), `${JSON.stringify({
    maxDex,
    species: [...baseByDex.values()].map((b) => ({
      dex: b.dex,
      slug: b.species,
      name: speciesNames[b.dex - 1],
      generation: b.generation,
      hasFemale: b.frontFemale,
      hasShinyFemale: b.frontShinyFemale
    })).sort((a, b) => a.dex - b.dex)
  }, null, 2)}\n`);

  fs.writeFileSync(path.join(ROOT, "data", "organized-species-forms-seed.json"), `${JSON.stringify({
    rows: formsSeed
  }, null, 2)}\n`);
}

const femaleCount = Object.values(variants).filter((v) => v.includes("female")).length;
console.log(JSON.stringify({
  dry: DRY,
  spriteBuild,
  baseDexCount: baseByDex.size,
  maxDex,
  variantsKeys: Object.keys(variants).length,
  femaleCount,
  copied,
  skippedBack,
  librarySpecialFronts: librarySpecial,
  missing: missing.length,
  missingSample: missing.slice(0, 10)
}, null, 2));

if (missing.length) {
  console.error(`RELEASE BLOCKER: ${missing.length} missing required Front Base sprites`);
  process.exit(1);
}
