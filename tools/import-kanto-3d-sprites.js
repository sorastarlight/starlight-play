/* Import ProjectPokemon Kanto 3D Front sprites and catalog every form. */
const fs = require("fs");
const path = require("path");

const CACHE = process.env.KANTO_3D_CACHE
  || "d:\\Downloads\\Pokemon Sprites\\ProjectPokemon-All-3D-Sprite-Views-Downloader-v2\\ProjectPokemon-3D-Sprites\\New Gen1\\ProjectPokemon_Kanto_3D_EXACT_CACHE";
const ROOT = path.join(__dirname, "..");
const DEST = path.join(ROOT, "images", "pokemon");
const DRY = process.argv.includes("--dry");

function slug(value) {
  return String(value || "")
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "base";
}

function formKind(formKey) {
  if (formKey === "base") return "base";
  if (formKey.startsWith("mega")) return "mega";
  if (formKey === "gigantamax" || formKey === "gmax") return "gigantamax";
  if (/^(alola|galar|hisui|paldea)/.test(formKey)) return "regional";
  if (/cap$/.test(formKey) || /^(cosplay|belle|libre|phd|popstar|rockstar)$/.test(formKey)) return "costume";
  return "other";
}

function formLabel(formKey) {
  if (formKey === "base") return "Base";
  return formKey.replace(/(^|-)([a-z])/g, (_, a, b) => (a ? " " : "") + b.toUpperCase());
}

function parseFrontName(filename) {
  const match = String(filename).match(/^(\d{3})_[^_]+_(.+)_Front\.(gif|png)$/i);
  if (!match) return null;
  const dex = Number(match[1]);
  const ext = match[3].toLowerCase();
  const parts = match[2].split("_");
  const state = parts.pop();
  if (state !== "Normal" && state !== "Shiny") return null;
  let gender = "";
  if (parts[parts.length - 1] === "Male" || parts[parts.length - 1] === "Female") {
    gender = parts.pop().toLowerCase();
  }
  const formKey = slug(parts.join("-") || "base");
  return {
    dex,
    formKey,
    gender,
    shiny: state === "Shiny",
    ext,
    filename
  };
}

function listFrontFiles(speciesDir, sourceSet) {
  const dir = path.join(speciesDir, sourceSet, "Front");
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((name) => /\.(gif|png)$/i.test(name))
    .map((filename) => {
      const parsed = parseFrontName(filename);
      if (!parsed) return null;
      return { ...parsed, sourceSet, abs: path.join(dir, filename) };
    })
    .filter(Boolean);
}

function pickSource(files, formKey) {
  const swsh = files.filter((row) => row.sourceSet === "SWSH" && row.formKey === formKey);
  if (swsh.length) return swsh;
  return files.filter((row) => row.sourceSet === "Legacy3D" && row.formKey === formKey);
}

function pickPlayable(files) {
  const chosen = pickSource(files, "base");
  const ungendered = chosen.filter((row) => !row.gender);
  const male = chosen.filter((row) => row.gender === "male");
  const female = chosen.filter((row) => row.gender === "female");
  const body = ungendered.length ? ungendered : male;
  const normal = body.find((row) => !row.shiny);
  const shiny = body.find((row) => row.shiny);
  const femaleNormal = female.find((row) => !row.shiny);
  const femaleShiny = female.find((row) => row.shiny);
  return {
    sourceSet: chosen[0]?.sourceSet || "Legacy3D",
    normal,
    shiny,
    femaleNormal: femaleNormal || null,
    femaleShiny: femaleShiny || null,
    hasFemale: Boolean(femaleNormal)
  };
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function destFor(kind, dex, ext) {
  if (kind === "normal") return path.join(DEST, `${dex}.${ext}`);
  if (kind === "shiny") return path.join(DEST, "shiny", `${dex}.${ext}`);
  if (kind === "female") return path.join(DEST, "female", `${dex}.${ext}`);
  return path.join(DEST, "shiny", "female", `${dex}.${ext}`);
}

function clearDead(kind, dex, keepExt) {
  for (const ext of ["gif", "png"]) {
    if (keepExt && ext === keepExt) continue;
    const dead = destFor(kind, dex, ext);
    if (fs.existsSync(dead)) fs.unlinkSync(dead);
  }
}

function isEnabled(row, live) {
  if (row.formKey !== "base") return false;
  if (row.gender === "female") return Boolean(live?.hasFemale);
  if (row.gender === "male") return true;
  return true;
}

if (!fs.existsSync(CACHE)) {
  console.error(`Cache not found: ${CACHE}`);
  process.exit(1);
}

const speciesDirs = fs.readdirSync(CACHE)
  .filter((name) => /^\d{3}_/.test(name))
  .sort();

const catalog = [];
const playable = {};
const variants = {};
const spriteExt = {};
const copied = [];
const missing = [];

for (const folder of speciesDirs) {
  const dex = Number(folder.slice(0, 3));
  const speciesDir = path.join(CACHE, folder);
  const files = [
    ...listFrontFiles(speciesDir, "SWSH"),
    ...listFrontFiles(speciesDir, "Legacy3D")
  ];
  const formKeys = [...new Set(files.map((row) => row.formKey))];
  for (const formKey of formKeys) {
    const chosen = pickSource(files, formKey);
    for (const row of chosen) {
      catalog.push({
        dex,
        speciesFolder: folder,
        formKey,
        formLabel: formLabel(formKey),
        kind: formKind(formKey),
        gender: row.gender,
        shiny: row.shiny,
        sourceSet: row.sourceSet,
        filename: row.filename,
        ext: row.ext
      });
    }
  }
  const live = pickPlayable(files);
  playable[dex] = live;
  if (!live.normal) missing.push(`${dex} missing base normal Front`);
  const list = ["normal"];
  if (live.hasFemale) list.push("female");
  if (live.hasFemale && live.femaleShiny) list.push("shiny-female");
  list.push("shiny");
  variants[dex] = list;
  if (!DRY) {
    if (live.normal) {
      copyFile(live.normal.abs, destFor("normal", dex, live.normal.ext));
      clearDead("normal", dex, live.normal.ext);
      copied.push(destFor("normal", dex, live.normal.ext));
      if (live.normal.ext !== "gif") spriteExt[String(dex)] = live.normal.ext;
    }
    if (live.shiny) {
      copyFile(live.shiny.abs, destFor("shiny", dex, live.shiny.ext));
      clearDead("shiny", dex, live.shiny.ext);
      copied.push(destFor("shiny", dex, live.shiny.ext));
      if (live.shiny.ext !== "gif") spriteExt[`shiny/${dex}`] = live.shiny.ext;
    }
    if (live.femaleNormal) {
      copyFile(live.femaleNormal.abs, destFor("female", dex, live.femaleNormal.ext));
      clearDead("female", dex, live.femaleNormal.ext);
      copied.push(destFor("female", dex, live.femaleNormal.ext));
      if (live.femaleNormal.ext !== "gif") spriteExt[`female/${dex}`] = live.femaleNormal.ext;
    } else {
      clearDead("female", dex, null);
    }
    if (live.femaleShiny) {
      copyFile(live.femaleShiny.abs, destFor("shiny-female", dex, live.femaleShiny.ext));
      clearDead("shiny-female", dex, live.femaleShiny.ext);
      copied.push(destFor("shiny-female", dex, live.femaleShiny.ext));
      if (live.femaleShiny.ext !== "gif") spriteExt[`shiny/female/${dex}`] = live.femaleShiny.ext;
    } else {
      clearDead("shiny-female", dex, null);
    }
  }
}

for (const row of catalog) {
  row.enabledInPlay = isEnabled(row, playable[row.dex]);
}

const femaleDex = Object.keys(variants)
  .map(Number)
  .filter((dex) => variants[dex].includes("female"))
  .sort((a, b) => a - b);

const report = {
  species: speciesDirs.length,
  catalogRows: catalog.length,
  forms: [...new Set(catalog.map((row) => `${row.dex}:${row.formKey}`))].length,
  femaleVisualDex: femaleDex,
  missing,
  sourceForBase: Object.fromEntries(
    Object.entries(playable).map(([dex, row]) => [dex, {
      sourceSet: row.sourceSet,
      hasFemale: row.hasFemale,
      normal: row.normal?.filename || null,
      shiny: row.shiny?.filename || null,
      female: row.femaleNormal?.filename || null
    }])
  )
};

ensureDir(path.join(ROOT, "data"));
if (!DRY) {
  const buildInfo = require("../build.json");
  const spriteBuild = buildInfo.spriteBuild || "20260916-sp1";
  const variantsJs = `window.PLAY_SPRITE_BUILD = ${JSON.stringify(spriteBuild)};\nwindow.PLAY_VARIANTS = ${JSON.stringify(variants)};\nwindow.PLAY_SPRITE_EXT = ${JSON.stringify(spriteExt)};\n`;
  fs.writeFileSync(path.join(ROOT, "js", "variants.js"), variantsJs);
  fs.writeFileSync(path.join(ROOT, "data", "kanto-3d-forms.json"), JSON.stringify({ generatedAt: new Date().toISOString(), catalog, playableSummary: report.sourceForBase, femaleVisualDex: femaleDex }, null, 2));
}

fs.writeFileSync(path.join(ROOT, "data", "kanto-3d-import-report.json"), JSON.stringify(report, null, 2));

console.log(JSON.stringify({
  dry: DRY,
  species: report.species,
  catalogRows: report.catalogRows,
  uniqueForms: report.forms,
  femaleCount: femaleDex.length,
  femaleVisualDex: femaleDex,
  missing,
  copied: DRY ? 0 : copied.length,
  swshBase: Object.values(report.sourceForBase).filter((row) => row.sourceSet === "SWSH").length,
  legacyBase: Object.values(report.sourceForBase).filter((row) => row.sourceSet === "Legacy3D").length
}, null, 2));
