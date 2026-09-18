/**
 * Import Gen-1-origin NON-BASE Front sprites into play stems and seed form catalog.
 *
 * Play stems:
 *   images/pokemon/forms/{PokemonFormId}.{ext}
 *   images/pokemon/forms/shiny/{PokemonFormId}.{ext}
 *   images/pokemon/forms/female/{PokemonFormId}.{ext}  (rare)
 *   images/pokemon/forms/shiny/female/{PokemonFormId}.{ext}
 *
 * Back sprites are NEVER copied into play stems (library-only / Organized only).
 *
 * Also writes:
 *   js/forms.js              — PLAY_FORMS + PLAY_FORM_BY_DEX
 *   data/pokemon-forms-seed.json
 *   data/play-form-sprite-ext.json  (merged by stamp if needed)
 *
 * Usage:
 *   node tools/import-organized-form-sprites.js [--dry]
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DEST = path.join(ROOT, "images", "pokemon", "forms");
const DRY = process.argv.includes("--dry");

function argValue(flag, fallback) {
  const idx = process.argv.indexOf(flag);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  return fallback;
}

const SOURCE = argValue(
  "--source",
  process.env.ORGANIZED_SHOWDOWN_SOURCE ||
    path.join("C:", "Users", "FET", "sprites", "sprites", "pokemon", "other", "Organized")
);

function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, "").trim().split(/\r?\n/);
  if (!lines.length) return [];
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).filter(Boolean).map((line) => {
    const cols = splitCsvLine(line);
    const row = {};
    headers.forEach((h, i) => {
      row[h] = cols[i] ?? "";
    });
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
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else inQ = !inQ;
      continue;
    }
    if (ch === "," && !inQ) {
      out.push(cur);
      cur = "";
      continue;
    }
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

function formKeyFromLabel(formLabel) {
  const raw = String(formLabel || "Base").trim();
  if (!raw || /^base$/i.test(raw)) return "base";
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function kindFromLabel(formLabel) {
  const s = String(formLabel || "").toLowerCase();
  if (!s || s === "base") return "base";
  if (s.includes("mega")) return "mega";
  if (s.includes("gigantamax") || s === "gmax") return "gigantamax";
  if (s.includes("alolan") || s.includes("galarian") || s.includes("hisuian") || s.includes("paldea")) {
    return "regional";
  }
  // Cap hats are distinct from Cosplay outfits.
  if (/\bcap\b/.test(s) || s.endsWith(" cap") || s.includes("-cap")) return "cap";
  // Official Cosplay Pikachu family (Rock Star / Belle / Pop Star / PhD / Libre / Cosplay).
  if (
    s.includes("cosplay")
    || s.includes("belle")
    || s.includes("libre")
    || s.includes("phd")
    || s.includes("pop-star")
    || s.includes("pop star")
    || s.includes("rock-star")
    || s.includes("rock star")
  ) {
    return "cosplay";
  }
  if (s === "starter") return "starter";
  return "other";
}

function forcedGenderForForm(kind, dex) {
  if (kind === "cosplay" && Number(dex) === 25) return "Female";
  return null;
}

function humanFormLabel(formLabel) {
  const s = String(formLabel || "Base").trim();
  if (!s || /^base$/i.test(s)) return "Base";
  return s
    .split("-")
    .map((part) => {
      if (/^(x|y)$/i.test(part)) return part.toUpperCase();
      if (/^phd$/i.test(part)) return "PhD";
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(" ");
}

function displayName(speciesName, formLabel) {
  const form = humanFormLabel(formLabel);
  if (form === "Base") return speciesName;
  return `${speciesName} — ${form}`;
}

function readSpeciesNames() {
  const raw = fs.readFileSync(path.join(ROOT, "js", "species.js"), "utf8");
  const match = raw.match(/window\.PLAY_SPECIES\s*=\s*(\[[\s\S]*?\]);/);
  if (!match) return [];
  try {
    return JSON.parse(match[1]);
  } catch {
    return [];
  }
}

if (!fs.existsSync(SOURCE)) {
  console.error(`Organized source not found: ${SOURCE}`);
  process.exit(1);
}

const matrixPath = path.join(SOURCE, "variant-matrix.csv");
const manifestPath = path.join(SOURCE, "manifest.csv");
const matrix = parseCsv(fs.readFileSync(matrixPath, "utf8"));
const manifest = parseCsv(fs.readFileSync(manifestPath, "utf8"));
const speciesNames = readSpeciesNames();

/** @type {Map<number, object>} */
const formsById = new Map();

for (const row of matrix) {
  const dex = Number(row.NationalDex);
  const formId = Number(row.PokemonFormId);
  const gen = Number(row.Generation) || 0;
  const formLabel = String(row.Form || "").trim() || "Base";
  if (!Number.isFinite(dex) || !Number.isFinite(formId)) continue;
  const isBase = formLabel === "Base";
  const speciesSlug = String(row.Species || "").trim();
  const name = (speciesNames[dex - 1] || speciesSlug || `Dex ${dex}`);
  formsById.set(formId, {
    pokemon_form_id: formId,
    dex,
    generation: gen,
    form_key: formKeyFromLabel(formLabel),
    form_label: humanFormLabel(formLabel),
    form_label_raw: formLabel,
    kind: kindFromLabel(formLabel),
    is_base: isBase,
    species_name: name,
    display_name: displayName(name, formLabel),
    has_front: truthy(row.Front),
    has_shiny_front: truthy(row.FrontShiny),
    has_female_front: truthy(row.FrontFemale),
    has_shiny_female_front: truthy(row.FrontShinyFemale),
    has_back: truthy(row.Back),
    has_shiny_back: truthy(row.BackShiny),
    origin_gen1: gen === 1,
  });
}

/** Index Front files: formId -> kind -> path */
const frontFiles = new Map();
let skippedBack = 0;
for (const row of manifest) {
  const side = String(row.Side || "").trim().toLowerCase();
  const formId = Number(row.PokemonFormId);
  const destPath = String(row.DestinationPath || "").trim();
  if (!Number.isFinite(formId) || !destPath) continue;
  if (side === "back") {
    skippedBack += 1;
    continue;
  }
  if (side !== "front") continue;
  const shiny = truthy(row.Shiny);
  const female = truthy(row.Female);
  let kind = "normal";
  if (shiny && female) kind = "shiny-female";
  else if (female) kind = "female";
  else if (shiny) kind = "shiny";
  if (!frontFiles.has(formId)) frontFiles.set(formId, {});
  frontFiles.get(formId)[kind] = destPath;
}

if (!DRY) {
  // Clear only forms/ tree (leave base stems alone)
  if (fs.existsSync(DEST)) {
    const walk = (dir) => {
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) walk(p);
        else if (/\.(gif|png|webp)$/i.test(ent.name)) fs.unlinkSync(p);
      }
    };
    walk(DEST);
  }
}

ensureDir(DEST);
ensureDir(path.join(DEST, "shiny"));
ensureDir(path.join(DEST, "female"));
ensureDir(path.join(DEST, "shiny", "female"));

const spriteExt = {};
const copied = { normal: 0, shiny: 0, female: 0, "shiny-female": 0 };
const playForms = {};
const byDex = {};

function destStem(kind, formId, ext) {
  if (kind === "normal") return path.join(DEST, `${formId}.${ext}`);
  if (kind === "shiny") return path.join(DEST, "shiny", `${formId}.${ext}`);
  if (kind === "female") return path.join(DEST, "female", `${formId}.${ext}`);
  return path.join(DEST, "shiny", "female", `${formId}.${ext}`);
}

function stemKey(kind, formId) {
  if (kind === "normal") return `forms/${formId}`;
  if (kind === "shiny") return `forms/shiny/${formId}`;
  if (kind === "female") return `forms/female/${formId}`;
  return `forms/shiny/female/${formId}`;
}

// Copy non-base fronts that have Gen-1 origin (or all non-base with Front=true for admin targeting)
for (const form of formsById.values()) {
  if (form.is_base) {
    // Base forms stay on classic stems; still register identity.
    // Kanto ordinary = dex 1..151 excluding the five Special Encounter legendaries/mythicals.
    const specialBase = [144, 145, 146, 150, 151].includes(form.dex);
    const kantoOrdinary = form.dex >= 1 && form.dex <= 151 && !specialBase;
    const entry = {
      formId: form.pokemon_form_id,
      dex: form.dex,
      formKey: form.form_key,
      formLabel: form.form_label,
      kind: form.kind,
      isBase: true,
      displayName: form.display_name,
      hasFront: form.has_front,
      hasShinyFront: form.has_shiny_front,
      hasFemaleFront: form.has_female_front,
      hasBack: form.has_back,
      adminTargetable: true,
      eventTargetable: true,
      normalEncounterEnabled: kantoOrdinary,
      originGen1: form.origin_gen1,
      assetStatus: form.has_front ? "ready" : "missing",
      forcedGender: forcedGenderForForm(form.kind, form.dex),
    };
    playForms[form.pokemon_form_id] = entry;
    if (!byDex[form.dex]) byDex[form.dex] = [];
    byDex[form.dex].push(form.pokemon_form_id);
    continue;
  }

  const files = frontFiles.get(form.pokemon_form_id) || {};
  let gotFront = false;
  let gotShiny = false;
  let gotFemale = false;

  const tryCopy = (kind) => {
    const src = files[kind];
    if (!src || !fs.existsSync(src)) return false;
    const ext = path.extname(src).replace(/^\./, "").toLowerCase() || "gif";
    copyFile(src, destStem(kind, form.pokemon_form_id, ext));
    spriteExt[stemKey(kind, form.pokemon_form_id)] = ext;
    copied[kind] += 1;
    return true;
  };

  // Only Gen-1-origin non-base forms enter play stems for EVENT_READY
  if (form.origin_gen1 && form.has_front) {
    gotFront = tryCopy("normal");
    gotShiny = tryCopy("shiny");
    gotFemale = tryCopy("female");
    tryCopy("shiny-female");
  }

  const assetReady = form.origin_gen1 && gotFront;
  const entry = {
    formId: form.pokemon_form_id,
    dex: form.dex,
    formKey: form.form_key,
    formLabel: form.form_label,
    kind: form.kind,
    isBase: false,
    displayName: form.display_name,
    hasFront: gotFront || form.has_front,
    hasShinyFront: gotShiny || form.has_shiny_front,
    hasFemaleFront: gotFemale || form.has_female_front,
    hasBack: form.has_back,
    adminTargetable: assetReady,
    eventTargetable: assetReady,
    normalEncounterEnabled: false,
    originGen1: form.origin_gen1,
    assetStatus: assetReady ? "ready" : form.origin_gen1 ? "asset_only" : "catalog_only",
    forcedGender: forcedGenderForForm(form.kind, form.dex),
  };
  playForms[form.pokemon_form_id] = entry;
  if (!byDex[form.dex]) byDex[form.dex] = [];
  byDex[form.dex].push(form.pokemon_form_id);
}

// Sort form lists: base first, then label
for (const dex of Object.keys(byDex)) {
  byDex[dex].sort((a, b) => {
    const fa = playForms[a];
    const fb = playForms[b];
    if (fa.isBase !== fb.isBase) return fa.isBase ? -1 : 1;
    return String(fa.formLabel).localeCompare(String(fb.formLabel));
  });
}

const seedRows = Object.values(playForms).map((f) => ({
  pokemon_form_id: f.formId,
  dex: f.dex,
  form_key: f.formKey,
  form_label: f.formLabel,
  kind: f.kind,
  is_base: f.isBase,
  has_front: !!f.hasFront,
  has_shiny_front: !!f.hasShinyFront,
  has_female_front: !!f.hasFemaleFront,
  has_back: !!f.hasBack,
  admin_targetable: !!f.adminTargetable,
  event_targetable: !!f.eventTargetable,
  normal_encounter_enabled: !!f.normalEncounterEnabled,
  asset_status: f.assetStatus,
  origin_gen1: !!f.originGen1,
  forced_gender: f.forcedGender || null,
}));

ensureDir(path.join(ROOT, "data"));
if (!DRY) {
  fs.writeFileSync(path.join(ROOT, "data", "pokemon-forms-seed.json"), `${JSON.stringify(seedRows, null, 2)}\n`);
  fs.writeFileSync(path.join(ROOT, "data", "play-form-sprite-ext.json"), `${JSON.stringify(spriteExt, null, 2)}\n`);

  const formsJs = `/* Auto-generated by tools/import-organized-form-sprites.js — do not edit by hand. */
var window = typeof window !== "undefined" ? window : globalThis;
window.PLAY_FORMS = ${JSON.stringify(playForms)};
window.PLAY_FORM_BY_DEX = ${JSON.stringify(byDex)};
`;
  fs.writeFileSync(path.join(ROOT, "js", "forms.js"), formsJs);

  // Merge form sprite ext into PLAY_SPRITE_EXT inside variants.js
  const variantsPath = path.join(ROOT, "js", "variants.js");
  if (fs.existsSync(variantsPath)) {
    let raw = fs.readFileSync(variantsPath, "utf8");
    const match = raw.match(/window\.PLAY_SPRITE_EXT\s*=\s*(\{[\s\S]*?\});/);
    if (match) {
      const base = JSON.parse(match[1]);
      const merged = { ...base, ...spriteExt };
      raw = raw.replace(match[0], `window.PLAY_SPRITE_EXT = ${JSON.stringify(merged)};`);
      fs.writeFileSync(variantsPath, raw);
    }
  }
}

const ready = seedRows.filter((r) => !r.is_base && r.asset_status === "ready").length;
const assetOnly = seedRows.filter((r) => !r.is_base && r.asset_status === "asset_only").length;
const catalogOnly = seedRows.filter((r) => !r.is_base && r.asset_status === "catalog_only").length;
const g1NonBase = seedRows.filter((r) => !r.is_base && r.origin_gen1).length;

console.log(
  JSON.stringify(
    {
      dry: DRY,
      skippedBack,
      copied,
      totalForms: seedRows.length,
      gen1NonBase: g1NonBase,
      eventReady: ready,
      assetOnly,
      catalogOnly,
      spriteExtKeys: Object.keys(spriteExt).length,
    },
    null,
    2
  )
);
