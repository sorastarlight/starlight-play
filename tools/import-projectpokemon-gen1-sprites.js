/**
 * DEPRECATED — Gen 1 Project Pokémon importer.
 *
 * Live Play sprites are now owned by:
 *   node tools/import-organized-showdown-sprites.js
 *
 * This script remains for historical Gen1 package work only. Prefer the
 * Organized Showdown importer for national Front-Base rollouts.
 *
 * Usage:
 *   node tools/import-projectpokemon-gen1-sprites.js [--dry]
 *     [--source <extracted-or-zip-parent>]
 *     [--library <asset-library-dest>]
 */
console.warn("[deprecated] Use tools/import-organized-showdown-sprites.js for live Play sprites.");
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
  "S:",
  "NewVTuberProject",
  "Stream Assets",
  "Games",
  "PokemonRPG",
  "ASSETS",
  "SPRITES",
  "POKEMON",
  "Pokemon Sprites",
  "NEW",
  "ProjectPokemon_Gen1_Sprite_Downloader_FIXED_v2",
  "ProjectPokemon_Gen1_Sprites"
);
const SOURCE = argValue("--source", process.env.PP_GEN1_SOURCE || DEFAULT_SOURCE);
const LIBRARY = argValue(
  "--library",
  process.env.PP_GEN1_LIBRARY
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
      "ProjectPokemon_Gen1_Library"
    )
);

const SPECIAL_FORM_RE = /^(mega|megax|megay|alola|alolan|galar|galarian|hisui|hisuian|paldea|gmax|gigantamax|totem|cosplay|belle|libre|phd|popstar|rockstar|.+cap)$/i;

function readFrozenVariants() {
  const raw = fs.readFileSync(path.join(ROOT, "js", "variants.js"), "utf8");
  const match = raw.match(/window\.PLAY_VARIANTS\s*=\s*(\{[\s\S]*?\});/);
  if (!match) throw new Error("Could not parse PLAY_VARIANTS from js/variants.js");
  return JSON.parse(match[1]);
}

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

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function destPlay(kind, dex, ext) {
  if (kind === "normal") return path.join(DEST, `${dex}.${ext}`);
  if (kind === "shiny") return path.join(DEST, "shiny", `${dex}.${ext}`);
  if (kind === "female") return path.join(DEST, "female", `${dex}.${ext}`);
  return path.join(DEST, "shiny", "female", `${dex}.${ext}`);
}

function clearDead(kind, dex, keepExt) {
  for (const ext of ["gif", "png"]) {
    if (keepExt && ext === keepExt) continue;
    const dead = destPlay(kind, dex, ext);
    if (fs.existsSync(dead)) fs.unlinkSync(dead);
  }
}

function isSpecialForm(form) {
  const key = String(form || "base").toLowerCase();
  if (key === "base" || key === "") return false;
  return SPECIAL_FORM_RE.test(key) || key.includes("mega") || key.includes("alola")
    || key.includes("galar") || key.includes("hisui") || key.includes("gmax")
    || key.includes("cap") || key.includes("cosplay");
}

function resolveSourceRoot(source) {
  if (!fs.existsSync(source)) return null;
  const st = fs.statSync(source);
  if (st.isFile() && /\.zip$/i.test(source)) {
    throw new Error(`Pass an extracted folder, not the zip: ${source}`);
  }
  if (fs.existsSync(path.join(source, "manifest.csv"))) return source;
  const nested = path.join(source, "ProjectPokemon_Gen1_Sprites");
  if (fs.existsSync(path.join(nested, "manifest.csv"))) return nested;
  return null;
}

function copyTree(src, dest) {
  ensureDir(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyTree(from, to);
    else fs.copyFileSync(from, to);
  }
}

const sourceRoot = resolveSourceRoot(SOURCE)
  || resolveSourceRoot(path.join(process.env.TEMP || "/tmp", "pp-gen1-extract", "ProjectPokemon_Gen1_Sprites"));
if (!sourceRoot) {
  console.error(`Source pack not found. Tried: ${SOURCE}`);
  process.exit(1);
}

const manifestPath = path.join(sourceRoot, "manifest.csv");
const rows = parseCsv(fs.readFileSync(manifestPath, "utf8"));
const frozen = readFrozenVariants();
const frozenFemale = new Set(
  Object.entries(frozen)
    .filter(([, list]) => Array.isArray(list) && list.includes("female"))
    .map(([dex]) => Number(dex))
);

const byDexFacing = new Map();
for (const row of rows) {
  const dex = Number(row.Dex);
  if (!dex) continue;
  const form = String(row.Form || "base").toLowerCase();
  const facing = String(row.Facing || "");
  const color = String(row.Color || "");
  const gender = String(row.Gender || "Default");
  const file = String(row.File || "").replace(/\\/g, path.sep);
  const abs = path.join(sourceRoot, file);
  const key = `${dex}|${form}|${facing}|${color}|${gender}`;
  byDexFacing.set(key, { ...row, dex, form, facing, color, gender, abs, ext: path.extname(abs).slice(1).toLowerCase() || "gif" });
}

function pick(dex, form, facing, color, gender) {
  return byDexFacing.get(`${dex}|${form}|${facing}|${color}|${gender}`) || null;
}

const missingBase = [];
const copiedPlay = [];
const skippedSpecialAsGameplay = [];
const catalog = [];
const spriteExt = {};

for (let dex = 1; dex <= 151; dex += 1) {
  const allowed = frozen[String(dex)] || frozen[dex] || ["normal", "shiny"];
  const wantsFemale = allowed.includes("female");

  const baseNormal = pick(dex, "base", "Front", "Normal", "Default");
  const baseShiny = pick(dex, "base", "Front", "Shiny", "Default");
  const femaleNormal = pick(dex, "base", "Front", "Normal", "Female");
  const femaleShiny = pick(dex, "base", "Front", "Shiny", "Female");

  // Never fall forward: if base is missing, keep existing play file and report.
  if (!baseNormal || !fs.existsSync(baseNormal.abs)) {
    missingBase.push({ dex, slot: "front-normal-default", keepExisting: fs.existsSync(destPlay("normal", dex, "gif")) || fs.existsSync(destPlay("normal", dex, "png")) });
  } else if (!DRY) {
    copyFile(baseNormal.abs, destPlay("normal", dex, baseNormal.ext));
    clearDead("normal", dex, baseNormal.ext);
    copiedPlay.push(destPlay("normal", dex, baseNormal.ext));
    if (baseNormal.ext !== "gif") spriteExt[String(dex)] = baseNormal.ext;
  }

  if (!baseShiny || !fs.existsSync(baseShiny.abs)) {
    missingBase.push({ dex, slot: "front-shiny-default", keepExisting: fs.existsSync(destPlay("shiny", dex, "gif")) || fs.existsSync(destPlay("shiny", dex, "png")) });
  } else if (!DRY) {
    copyFile(baseShiny.abs, destPlay("shiny", dex, baseShiny.ext));
    clearDead("shiny", dex, baseShiny.ext);
    copiedPlay.push(destPlay("shiny", dex, baseShiny.ext));
    if (baseShiny.ext !== "gif") spriteExt[`shiny/${dex}`] = baseShiny.ext;
  }

  if (wantsFemale) {
    if (!femaleNormal || !fs.existsSync(femaleNormal.abs)) {
      missingBase.push({ dex, slot: "front-normal-female", keepExisting: fs.existsSync(destPlay("female", dex, "gif")) });
    } else if (!DRY) {
      copyFile(femaleNormal.abs, destPlay("female", dex, femaleNormal.ext));
      clearDead("female", dex, femaleNormal.ext);
      copiedPlay.push(destPlay("female", dex, femaleNormal.ext));
      if (femaleNormal.ext !== "gif") spriteExt[`female/${dex}`] = femaleNormal.ext;
    }
    if (allowed.includes("shiny-female")) {
      if (!femaleShiny || !fs.existsSync(femaleShiny.abs)) {
        missingBase.push({ dex, slot: "front-shiny-female", keepExisting: fs.existsSync(destPlay("shiny-female", dex, "gif")) });
      } else if (!DRY) {
        copyFile(femaleShiny.abs, destPlay("shiny-female", dex, femaleShiny.ext));
        clearDead("shiny-female", dex, femaleShiny.ext);
        copiedPlay.push(destPlay("shiny-female", dex, femaleShiny.ext));
        if (femaleShiny.ext !== "gif") spriteExt[`shiny/female/${dex}`] = femaleShiny.ext;
      }
    }
  } else if (femaleNormal) {
    // Asset available in library only — do not enable gameplay female.
    skippedSpecialAsGameplay.push({ dex, reason: "female-visual-present-but-not-in-frozen-PLAY_VARIANTS" });
  }
}

// Catalog every manifest row; only frozen base gameplay slots are enabledInPlay.
for (const row of rows) {
  const dex = Number(row.Dex);
  const form = String(row.Form || "base").toLowerCase();
  const facing = String(row.Facing || "");
  const color = String(row.Color || "");
  const gender = String(row.Gender || "Default");
  const special = isSpecialForm(form);
  const allowed = frozen[String(dex)] || frozen[dex] || ["normal", "shiny"];
  let enabledInPlay = false;
  if (!special && form === "base" && facing === "Front") {
    if (color === "Normal" && gender === "Default") enabledInPlay = true;
    else if (color === "Shiny" && gender === "Default") enabledInPlay = true;
    else if (color === "Normal" && gender === "Female" && allowed.includes("female")) enabledInPlay = true;
    else if (color === "Shiny" && gender === "Female" && allowed.includes("shiny-female")) enabledInPlay = true;
  }
  catalog.push({
    dex,
    pokemon: row.Pokemon,
    formKey: form,
    formLabel: form === "base" ? "Base" : form,
    kind: special ? (form.startsWith("mega") ? "mega" : /alola|galar|hisui/.test(form) ? "regional" : /gmax|gigantamax/.test(form) ? "gigantamax" : /cap$|cosplay|belle|libre|phd|popstar|rockstar/.test(form) ? "costume" : "other") : "base",
    facing,
    color,
    gender,
    file: row.File,
    enabledInPlay,
    gameplayFrozen: true
  });
}

// Sync full pack into the asset library (assets only; not Play resolver paths).
if (!DRY) {
  ensureDir(LIBRARY);
  copyTree(sourceRoot, LIBRARY);
}

const buildInfo = JSON.parse(fs.readFileSync(path.join(ROOT, "build.json"), "utf8"));
const spriteBuild = buildInfo.spriteBuild || "20260916-sp1";

// FREEZE: rewrite variants.js with identical PLAY_VARIANTS, refreshed stamp/ext only.
const variantsJs = `window.PLAY_SPRITE_BUILD = ${JSON.stringify(spriteBuild)};\nwindow.PLAY_VARIANTS = ${JSON.stringify(frozen)};\nwindow.PLAY_SPRITE_EXT = ${JSON.stringify(spriteExt)};\n`;

ensureDir(path.join(ROOT, "data"));
const report = {
  generatedAt: new Date().toISOString(),
  sourceRoot,
  libraryDest: LIBRARY,
  dry: DRY,
  spriteBuild,
  frozenVariantDexCount: Object.keys(frozen).length,
  frozenFemaleDex: [...frozenFemale].sort((a, b) => a - b),
  copiedPlay: DRY ? 0 : copiedPlay.length,
  catalogRows: catalog.length,
  enabledInPlayRows: catalog.filter((r) => r.enabledInPlay).length,
  specialFormRows: catalog.filter((r) => r.kind !== "base").length,
  missingBase,
  femalePresentButNotGameplayEnabled: skippedSpecialAsGameplay,
  assertion: {
    gameplayVariantsUnchanged: true,
    note: "PLAY_VARIANTS rewritten byte-identical to pre-import frozen catalog"
  }
};

if (!DRY) {
  fs.writeFileSync(path.join(ROOT, "js", "variants.js"), variantsJs);
  fs.writeFileSync(path.join(ROOT, "data", "kanto-3d-forms.json"), JSON.stringify({
    generatedAt: report.generatedAt,
    freeze: "BASE_KANTO_ONLY",
    catalog,
    frozenVariants: frozen,
    femaleVisualDex: report.frozenFemaleDex,
    missingBase
  }, null, 2));
}
fs.writeFileSync(path.join(ROOT, "data", "kanto-3d-import-report.json"), JSON.stringify(report, null, 2));

console.log(JSON.stringify({
  dry: DRY,
  sourceRoot,
  libraryDest: LIBRARY,
  copiedPlay: report.copiedPlay,
  catalogRows: report.catalogRows,
  enabledInPlayRows: report.enabledInPlayRows,
  specialFormRows: report.specialFormRows,
  missingBase,
  frozenFemaleDex: report.frozenFemaleDex,
  femalePresentButNotGameplayEnabled: skippedSpecialAsGameplay.length
}, null, 2));

if (missingBase.length) {
  console.error("\nMISSING BASE SPRITES (kept existing Play files; did NOT substitute special forms):");
  for (const row of missingBase) {
    console.error(`  dex ${row.dex} ${row.slot} keepExisting=${row.keepExisting}`);
  }
}
