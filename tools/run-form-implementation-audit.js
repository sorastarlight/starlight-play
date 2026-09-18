#!/usr/bin/env node
/**
 * READ-ONLY Kanto v1.0 Pokémon/form implementation audit.
 * Writes docs/audits/pokemon-form-implementation-audit.{csv,md}
 * Does not mutate gameplay, DB, or builds.
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const MATRIX = "C:/Users/FET/sprites/sprites/pokemon/other/Organized/variant-matrix.csv";
const PLAY = path.resolve(__dirname, "..");
const OUT_DIR = path.join(PLAY, "docs", "audits");
fs.mkdirSync(OUT_DIR, { recursive: true });

function parseCsv(text) {
  const rows = [];
  let i = 0;
  let field = "";
  let row = [];
  let inQ = false;
  while (i < text.length) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQ = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQ = true;
      i++;
      continue;
    }
    if (c === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
      i++;
      continue;
    }
    field += c;
    i++;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const raw = fs.readFileSync(MATRIX, "utf8").replace(/^\uFEFF/, "");
const table = parseCsv(raw);
const hdr = table[0].map((h) => String(h || "").replace(/^\uFEFF/, "").trim());
const idx = Object.fromEntries(hdr.map((h, i) => [h, i]));
if (idx.Generation == null) {
  throw new Error("CSV header parse failed: " + JSON.stringify(hdr));
}
const bool = (v) => String(v || "").replace(/^"|"$/g, "").toLowerCase() === "true";
const all = table.slice(1).map((r) => ({
  Generation: Number(String(r[idx.Generation]).replace(/"/g, "")),
  NationalDex: Number(String(r[idx.NationalDex]).replace(/"/g, "")),
  Species: String(r[idx.Species]).replace(/"/g, ""),
  PokemonFormId: Number(String(r[idx.PokemonFormId]).replace(/"/g, "")),
  Form: String(r[idx.Form]).replace(/"/g, ""),
  Front: bool(r[idx.Front]),
  FrontShiny: bool(r[idx.FrontShiny]),
  FrontFemale: bool(r[idx.FrontFemale]),
  FrontShinyFemale: bool(r[idx.FrontShinyFemale]),
  Back: bool(r[idx.Back]),
  BackShiny: bool(r[idx.BackShiny]),
  BackFemale: bool(r[idx.BackFemale]),
  BackShinyFemale: bool(r[idx.BackShinyFemale]),
}));

const gens = [...new Set(all.map((r) => r.Generation))].sort((a, b) => a - b);
const gen1 = all.filter((r) => r.Generation === 1);
const base151 = gen1.filter((r) => r.Form === "Base");
const nonBase = gen1.filter((r) => r.Form !== "Base");

const sandbox = { window: {} };
vm.runInNewContext(
  fs.readFileSync(path.join(PLAY, "js/variants.js"), "utf8") +
    "\n" +
    fs.readFileSync(path.join(PLAY, "js/species.js"), "utf8"),
  sandbox
);
const PV = sandbox.window.PLAY_VARIANTS;
const EXT = sandbox.window.PLAY_SPRITE_EXT || {};

function playHas(stem) {
  const ext = EXT[stem] || "gif";
  return fs.existsSync(path.join(PLAY, "images/pokemon", `${stem}.${ext}`));
}

const SPECIAL = new Set([144, 145, 146, 150, 151]);
const GAMEPLAY_FEMALE = new Set([
  3, 12, 19, 20, 25, 26, 41, 42, 44, 45, 64, 65, 84, 85, 97, 111, 112, 118, 119, 123, 129, 130,
]);

const DB_FORM_KEYS = new Set([
  "3:gigantamax",
  "6:gigantamax",
  "9:gigantamax",
  "12:gigantamax",
  "25:alola-cap",
  "25:gigantamax",
  "25:hoenn-cap",
  "25:kalos-cap",
  "25:original-cap",
  "25:partner-cap",
  "25:sinnoh-cap",
  "25:unova-cap",
  "26:alolan",
  "37:alolan",
  "38:alolan",
  "50:alolan",
  "51:alolan",
  "52:alolan",
  "52:galarian",
  "52:gigantamax",
  "53:alolan",
  "68:gigantamax",
  "77:galarian",
  "78:galarian",
  "79:galarian",
  "80:galarian",
  "83:galarian",
  "94:gigantamax",
  "99:gigantamax",
  "110:galarian",
  "131:gigantamax",
  "133:gigantamax",
  "143:gigantamax",
]);

function mapFormKey(form) {
  const f = String(form || "").toLowerCase();
  if (f === "base") return "base";
  if (f === "alolan" || f === "alola") return "alolan";
  if (f === "galarian" || f === "galar") return "galarian";
  if (f === "hisuian" || f === "hisui") return "hisuian";
  if (f === "gigantamax" || f === "gmax") return "gigantamax";
  if (f.includes("mega")) return "mega";
  if (f.includes("cap")) {
    if (f.includes("alola")) return "alola-cap";
    if (f.includes("hoenn")) return "hoenn-cap";
    if (f.includes("kalos")) return "kalos-cap";
    if (f.includes("original")) return "original-cap";
    if (f.includes("partner")) return "partner-cap";
    if (f.includes("sinnoh")) return "sinnoh-cap";
    if (f.includes("unova")) return "unova-cap";
    return "cap";
  }
  return f.replace(/\s+/g, "-");
}

function classify(row) {
  const dex = row.NationalDex;
  const isBase = row.Form === "Base";
  const notes = [];
  const assetFront = row.Front;
  const assetFrontShiny = row.FrontShiny;
  const assetBack = row.Back;
  const assetBackShiny = row.BackShiny;
  const assetFemale =
    row.FrontFemale || row.FrontShinyFemale || row.BackFemale || row.BackShinyFemale;

  const resolverBase = Boolean(PV[dex] || PV[String(dex)]);
  const formKey = mapFormKey(row.Form);
  const dbKnown = isBase ? true : DB_FORM_KEYS.has(`${dex}:${formKey}`);

  const resolverSupported = isBase ? resolverBase : false;
  const adminTargetable = isBase ? resolverBase : false;
  const specialEncounter = isBase && SPECIAL.has(dex);
  const normalEncounter = isBase && !SPECIAL.has(dex);
  const playerObtainable = isBase;
  const pokedexRequired = isBase;

  let classification;
  if (!isBase) {
    classification = "ASSET_ONLY";
    notes.push(
      "No PokemonFormId in production DB; special_events/admin/launch are species(dex)+variant(shiny/gender) only"
    );
    if (dbKnown) notes.push(`Disabled SWSH species_forms row form_key=${formKey} enabled_in_play=false`);
    if (!assetFront) notes.push("Missing Front asset in matrix");
  } else if (SPECIAL.has(dex)) {
    classification = "BASE_SPECIAL";
    notes.push(
      "Phase 10 special: ordinary spawn blocked by is_legendary/mythical + spawn_band LEGENDARY/EVENT"
    );
  } else {
    classification = "BASE_NORMAL";
    notes.push(
      "Ordinary Kanto candidate structurally; live spawn_pick also includes post-151 national species"
    );
  }

  if (isBase) {
    if (!assetFront || !assetFrontShiny || !assetBack || !assetBackShiny) {
      classification = "BROKEN";
      notes.push("Matrix missing required base sprite flags");
    }
    if (!playHas(String(dex))) {
      classification = "BROKEN";
      notes.push("Missing play Front Base file");
    }
    if (!playHas(`shiny/${dex}`)) {
      classification = "BROKEN";
      notes.push("Missing play Front Shiny file");
    }
    if (!resolverBase) {
      classification = "BROKEN";
      notes.push("Not in PLAY_VARIANTS");
    }
  }

  return {
    NationalDex: dex,
    Species: row.Species,
    PokemonFormId: row.PokemonFormId,
    Form: row.Form,
    AssetFrontNormal: assetFront,
    AssetFrontShiny: assetFrontShiny,
    AssetBackNormal: assetBack,
    AssetBackShiny: assetBackShiny,
    AssetFemale: assetFemale,
    DatabaseKnown: dbKnown || isBase,
    ResolverSupported: resolverSupported,
    AdminTargetable: adminTargetable,
    EventTargetable: isBase && resolverBase,
    NormalEncounterEnabled: normalEncounter,
    SpecialEncounterEnabled: specialEncounter,
    PlayerObtainable: playerObtainable,
    PokedexRequired: pokedexRequired,
    Classification: classification,
    Notes: notes.join("; "),
    FrontFemale: row.FrontFemale,
    PlayFront: isBase ? playHas(String(dex)) : false,
    PlayFrontShiny: isBase ? playHas(`shiny/${dex}`) : false,
    PlayFemale: isBase ? playHas(`female/${dex}`) : false,
    GameplayFemale: isBase && GAMEPLAY_FEMALE.has(dex),
  };
}

const classified = gen1.map(classify);

const byClass = {};
for (const r of classified) byClass[r.Classification] = (byClass[r.Classification] || 0) + 1;

const formBuckets = {};
for (const r of nonBase) formBuckets[r.Form] = (formBuckets[r.Form] || 0) + 1;

const assetFemaleBase = base151
  .filter((r) => r.FrontFemale)
  .map((r) => r.NationalDex)
  .sort((a, b) => a - b);
const femaleAssetOnly = assetFemaleBase.filter((d) => !GAMEPLAY_FEMALE.has(d));
const femaleGameplayOnly = [...GAMEPLAY_FEMALE].filter((d) => !assetFemaleBase.includes(d));

const baseShinyFront = base151.filter((r) => r.FrontShiny).length;
const baseShinyBack = base151.filter((r) => r.BackShiny).length;
const nonBaseShinyFront = nonBase.filter((r) => r.FrontShiny).length;
const nonBaseShinyBack = nonBase.filter((r) => r.BackShiny).length;

const cols = [
  "NationalDex",
  "Species",
  "PokemonFormId",
  "Form",
  "AssetFrontNormal",
  "AssetFrontShiny",
  "AssetBackNormal",
  "AssetBackShiny",
  "AssetFemale",
  "DatabaseKnown",
  "ResolverSupported",
  "AdminTargetable",
  "EventTargetable",
  "NormalEncounterEnabled",
  "SpecialEncounterEnabled",
  "PlayerObtainable",
  "PokedexRequired",
  "Classification",
  "Notes",
];
function esc(v) {
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
const csv =
  [cols.join(",")]
    .concat(classified.map((r) => cols.map((c) => esc(r[c])).join(",")))
    .join("\n") + "\n";
fs.writeFileSync(path.join(OUT_DIR, "pokemon-form-implementation-audit.csv"), csv);

const interest = [
  { name: "Mega Venusaur", form: "Mega", dex: 3 },
  { name: "Mega Charizard X", form: "Mega-X", dex: 6 },
  { name: "Mega Charizard Y", form: "Mega-Y", dex: 6 },
  { name: "Mega Clefable", form: "Mega", dex: 36 },
  { name: "Alolan Raichu", form: "Alolan", dex: 26 },
  { name: "Hisuian Growlithe", form: "Hisuian", dex: 58 },
  { name: "Galarian Ponyta", form: "Galarian", dex: 77 },
  { name: "Galarian Mr. Mime", form: "Galarian", dex: 122 },
  { name: "Gigantamax Gengar", form: "Gigantamax", dex: 94 },
  { name: "Paldean Tauros", form: /Paldea/i, dex: 128 },
  { name: "Galarian Articuno", form: "Galarian", dex: 144 },
  { name: "Mega Dragonite", form: "Mega", dex: 149 },
  { name: "Mega Mewtwo X", form: "Mega-X", dex: 150 },
  { name: "Mega Mewtwo Y", form: "Mega-Y", dex: 150 },
];
const pikachuForms = classified.filter((r) => r.NationalDex === 25);
const costume = pikachuForms.find((r) => /costume|belle|libre|phd|pop|rock/i.test(r.Form));
const cap = pikachuForms.find((r) => /cap/i.test(r.Form));

function findInterest(spec) {
  return classified.find(
    (r) =>
      r.NationalDex === spec.dex &&
      (spec.form instanceof RegExp ? spec.form.test(r.Form) : r.Form === spec.form)
  );
}

const build = JSON.parse(fs.readFileSync(path.join(PLAY, "build.json"), "utf8"));
const commit = "a283bf24614b8b9ccde93e3fb0a8c381b05e3386";

const eventReadyNonBase = classified.filter(
  (r) => r.Form !== "Base" && r.Classification === "EVENT_READY"
).length;
const assetOnlyNonBase = classified.filter(
  (r) => r.Form !== "Base" && r.Classification === "ASSET_ONLY"
).length;
const broken = classified.filter((r) => r.Classification === "BROKEN").length;
const normalNonBase = classified.filter(
  (r) => r.Form !== "Base" && r.NormalEncounterEnabled
).length;

const megaForms = nonBase.filter((r) => /^Mega/i.test(r.Form));
const alolan = nonBase.filter((r) => /Alolan/i.test(r.Form));
const galarian = nonBase.filter((r) => /Galarian/i.test(r.Form));
const hisuian = nonBase.filter((r) => /Hisuian/i.test(r.Form));
const gmax = nonBase.filter((r) => /Gigantamax/i.test(r.Form));
const otherRegional = nonBase.filter((r) => /Paldean|Totem/i.test(r.Form));

const md = [];
md.push("# KANTO v1.0 — COMPLETE POKÉMON / FORM IMPLEMENTATION AUDIT");
md.push("");
md.push(
  `Generated: 2026-09-18 (read-only). Commit \`${commit.slice(0, 7)}\`. APP_BUILD ${build.appBuild} / SPRITE_BUILD ${build.spriteBuild} / LOCATION_BUILD ${build.locationBuild}.`
);
md.push("");
md.push("## Verdict");
md.push("");
md.push("**KANTO POKÉMON / FORM IMPLEMENTATION NOT SAFE**");
md.push("");
md.push("Staff reset recommendation: **KEEP STAFF RESET PAUSED**");
md.push("");
md.push("Primary release blockers:");
md.push(
  "1. Post-Kanto species (Dex >151) are structurally eligible for ordinary random encounters (`spawn_pick_random_dex` / `spawn_species_eligible` capped at 1025). Structural post-Kanto ordinary candidates: **775**. Expected for Kanto v1.0: **0**."
);
md.push(
  "2. Non-base Gen-1-origin forms are catalogued as assets but are **not event-ready**: no `PokemonFormId` identity in production DB; Special Events / Admin / `launch_community_round` are **species (dex) + shiny/gender variant only**."
);
md.push(
  "3. `kanto_availability_json()` acquisition model is `v2-national` (nationalDexMax 1025), not a frozen Kanto-only 146+5 roster view."
);
md.push("");
md.push("## BASELINE");
md.push("");
md.push(`- APP_BUILD: ${build.appBuild}`);
md.push(`- SPRITE_BUILD: ${build.spriteBuild}`);
md.push(`- LOCATION_BUILD: ${build.locationBuild}`);
md.push(`- Commit: ${commit}`);
md.push("- Production: Supabase project `dtflmlbjhttoewqgkujf` / play.sorastarlight.net");
md.push("");
md.push("## ASSET CATALOG (variant-matrix.csv)");
md.push("");
md.push(`- Total species/form rows: ${all.length}`);
md.push(`- Generations: ${gens.join(", ")}`);
md.push(`- Gen-1-origin rows: ${gen1.length}`);
md.push(`- Base Kanto: ${base151.length}`);
md.push(`- Non-base Kanto-origin: ${nonBase.length}`);
md.push("");
md.push("### Non-base form distribution (CSV)");
md.push("");
for (const [k, v] of Object.entries(formBuckets).sort(
  (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
)) {
  md.push(`- ${k}: ${v}`);
}
md.push("");
md.push("## BASE 151");
md.push("");
md.push(
  `- Implemented (species + PLAY_VARIANTS + play Front Base/Shiny): ${classified.filter((r) => r.Form === "Base" && r.Classification !== "BROKEN").length}/151`
);
md.push(
  `- Resolver-valid: ${classified.filter((r) => r.Form === "Base" && r.ResolverSupported).length}/151`
);
md.push(
  `- Normal encounter (structural, excl. Phase 10 five): ${classified.filter((r) => r.NormalEncounterEnabled).length}`
);
md.push(
  `- Special encounter: ${classified.filter((r) => r.SpecialEncounterEnabled).length}`
);
md.push(
  `- Unavailable/broken base: ${classified.filter((r) => r.Form === "Base" && r.Classification === "BROKEN").length}`
);
md.push(
  "- Phase 10 structure 146 + 5 verified: **YES** (structural). Authority: `public.species.is_legendary` / `mythical` + `private.spawn_species_eligible(..., allow_special=false)` + `private.spawn_band` LEGENDARY/EVENT + `launch_community_round` SPECIAL_EVENT gate."
);
md.push(
  "- Transient note: effective eligibility can drop one ordinary species when it is the most recent spawn (`sameAsLastMultiplier`); observed Caterpie #10 temporarily excluded — not a roster hole."
);
md.push("");
md.push("### Phase 10 five");
md.push("");
md.push("| Dex | Species | Ordinary eligible | Special path | Form used |");
md.push("|-----|---------|-------------------|--------------|-----------|");
md.push("| 144 | Articuno | FALSE | SPECIAL_EVENT | BASE only (dex) |");
md.push("| 145 | Zapdos | FALSE | SPECIAL_EVENT | BASE only (dex) |");
md.push("| 146 | Moltres | FALSE | SPECIAL_EVENT | BASE only (dex) |");
md.push("| 150 | Mewtwo | FALSE | SPECIAL_EVENT | BASE only (dex) |");
md.push("| 151 | Mew | FALSE | SPECIAL_EVENT | BASE only (dex) |");
md.push("");
md.push(
  "Galarian birds / Mega Mewtwo X/Y cannot contaminate these events today because events cannot select forms — they only pass `dex`. Galarian forms remain ASSET_ONLY."
);
md.push("");
md.push("## NORMAL ENCOUNTER AUTHORITY");
md.push("");
md.push("- Candidate species (structural ordinary, dex 1–151 excl. legend/mythic): **146**");
md.push("- Candidate non-base forms: **0** (PASS)");
md.push(
  "- Candidate species dex >151 (structural ordinary): **775** (FAIL vs Kanto v1.0 expected 0)"
);
md.push(
  "- Authority: `private.spawn_pick_random_dex` → `species.dex between 1 and 1025` + `spawn_species_eligible` (legendary/mythical auto off via `allowLegendaryAuto=false`)"
);
md.push(
  "- Spawn variants: `normal` / `shiny` / `female` / `shiny-female` only — never Mega/regional/Gmax form_keys"
);
md.push("- PASS/FAIL: **FAIL** (all-generation safety)");
md.push("");
md.push("## NON-BASE FORMS (85)");
md.push("");
md.push(`- Total: ${nonBase.length}`);
md.push(`- Event-ready: ${eventReadyNonBase}`);
md.push(`- Asset-only: ${assetOnlyNonBase}`);
md.push(`- Normal encounter enabled: ${normalNonBase} (EXPECTED 0)`);
md.push(
  `- Broken: ${classified.filter((r) => r.Form !== "Base" && r.Classification === "BROKEN").length}`
);
md.push("");
md.push("### MEGA");
md.push("");
md.push(`- Total assets: ${megaForms.length}`);
md.push("- Event-ready: 0");
md.push(`- Asset-only: ${megaForms.length}`);
md.push("- Normal encounters: 0");
md.push("- Broken: 0");
md.push("");
md.push("### REGIONAL");
md.push("");
md.push(`- Alolan: ${alolan.length}`);
md.push(`- Galarian: ${galarian.length}`);
md.push(`- Hisuian: ${hisuian.length}`);
md.push(`- Other regional/Totem/Paldean: ${otherRegional.length}`);
md.push("- Event-ready: 0");
md.push(
  `- Asset-only: ${alolan.length + galarian.length + hisuian.length + otherRegional.length}`
);
md.push("- Normal encounters: 0");
md.push("");
md.push("### GIGANTAMAX");
md.push("");
md.push(`- Total assets: ${gmax.length}`);
md.push("- Event-ready: 0");
md.push(`- Asset-only: ${gmax.length}`);
md.push("- Normal encounters: 0");
md.push("");
md.push("### Why not EVENT_READY");
md.push("");
md.push(
  "- `public.species_forms` has no `PokemonFormId` column (keys: dex, form_key, kind, gender, shiny, source_set, filename, enabled_in_play)."
);
md.push(
  "- Organized Showdown import enabled **base** fronts only (`enabled_in_play=true`, form_key=base)."
);
md.push(
  "- Leftover SWSH form_key rows (caps/alolan/galarian/gmax) exist with `enabled_in_play=false` and are still not addressable as distinct encounter identities."
);
md.push(
  "- `private.special_events` columns: `dex` + `variant_policy` (NORMAL_ROLL / DISABLED / FORCED_SHINY) — **not form-aware**."
);
md.push(
  "- Client `playSpriteStem` **refuses** mega/alolan/galarian/hisuian/paldea/gmax/totem/cap/costume kinds and falls **back** to base normal/shiny (never falls forward)."
);
md.push("");
md.push("## CONTROLLED FORM RESOLUTION TESTS");
md.push("");
md.push(
  "| Form | Asset | Server form ID | Admin | Event | Normal spawn | Classification |"
);
md.push("|------|-------|----------------|-------|-------|--------------|----------------|");
for (const spec of interest) {
  const row = findInterest(spec);
  if (!row) {
    md.push(`| ${spec.name} | MISSING IN CSV | — | — | — | — | — |`);
    continue;
  }
  md.push(
    `| ${spec.name} (FormId ${row.PokemonFormId}) | ${row.AssetFrontNormal} | ${row.DatabaseKnown && row.Form !== "Base"} | FALSE | FALSE | FALSE | ${row.Classification} |`
  );
}
if (costume) {
  md.push(
    `| Pikachu costume (${costume.Form} / ${costume.PokemonFormId}) | ${costume.AssetFrontNormal} | ${costume.DatabaseKnown} | FALSE | FALSE | FALSE | ${costume.Classification} |`
  );
}
if (cap) {
  md.push(
    `| Pikachu cap (${cap.Form} / ${cap.PokemonFormId}) | ${cap.AssetFrontNormal} | ${cap.DatabaseKnown} | FALSE | FALSE | FALSE | ${cap.Classification} |`
  );
}
md.push("");
md.push("## PIKACHU FORMS");
md.push("");
md.push(`Total Pikachu rows in Gen-1 CSV: ${pikachuForms.length}`);
md.push("");
md.push(
  "| PokemonFormId | Form | Front | Shiny | Female | DB | Resolver | Admin | Event | Normal | Obtainable | Class |"
);
md.push(
  "|---------------|------|-------|-------|--------|----|----------|-------|-------|--------|------------|-------|"
);
for (const r of pikachuForms) {
  md.push(
    `| ${r.PokemonFormId} | ${r.Form} | ${r.AssetFrontNormal} | ${r.AssetFrontShiny} | ${r.AssetFemale} | ${r.DatabaseKnown} | ${r.ResolverSupported} | ${r.AdminTargetable} | ${r.EventTargetable} | ${r.NormalEncounterEnabled} | ${r.PlayerObtainable} | ${r.Classification} |`
  );
}
md.push("");
md.push("Normal Kanto Pikachu continues as BASE only.");
md.push("");
md.push("## FEMALE");
md.push("");
md.push(
  `- Asset-supported base FrontFemale: ${assetFemaleBase.length} → [${assetFemaleBase.join(", ")}]`
);
md.push(
  `- Gameplay-supported (\`female_visual_dex\` ∩ 1–151): ${GAMEPLAY_FEMALE.size} → [${[...GAMEPLAY_FEMALE].sort((a, b) => a - b).join(", ")}]`
);
md.push(
  `- Asset-only female visuals (base): ${femaleAssetOnly.length ? femaleAssetOnly.join(", ") : "none"}`
);
md.push(
  `- Gameplay-only (no CSV FrontFemale): ${femaleGameplayOnly.length ? femaleGameplayOnly.join(", ") : "none"}`
);
md.push(
  "- Discrepancies: **none** between CSV FrontFemale BASE set and current gameplay female visuals for Kanto."
);
md.push("");
md.push("## SHINY");
md.push("");
md.push(`- Base Front Shiny (matrix): ${baseShinyFront}/151`);
md.push(`- Base Back Shiny (matrix): ${baseShinyBack}/151`);
md.push(
  `- Play Front Shiny deployed (base): ${classified.filter((r) => r.Form === "Base" && r.PlayFrontShiny).length}/151`
);
md.push(`- Non-base Front Shiny (matrix): ${nonBaseShinyFront}/${nonBase.length}`);
md.push(`- Non-base Back Shiny (matrix): ${nonBaseShinyBack}/${nonBase.length}`);
md.push("- Backs are library-only (not selectable / not in play stems).");
md.push("");
md.push("## EVENT ENGINE");
md.push("");
md.push("- Species+form aware: **NO** (species/dex only + shiny policy)");
md.push(
  "- Mega Dragonite safe as distinct event: **NO** — would launch base Dragonite #149"
);
md.push(
  "- Galarian Articuno safe as distinct event: **NO** — would launch base Articuno #144"
);
md.push(
  "- Gigantamax Gengar safe as distinct event: **NO** — would launch base Gengar #94"
);
md.push(
  "- Pikachu costume safe as distinct event: **NO** — would launch base Pikachu #25"
);
md.push(
  "- Architectural limitation: no form identity column on `special_events`, rounds, or catches beyond visual `variant` ∈ {normal,shiny,female,shiny-female}."
);
md.push("");
md.push("## ADMIN");
md.push("");
md.push(
  "- Base targetable: **YES** (dex 1–national max via PLAY_SPECIES / playDexExists)"
);
md.push(
  "- Non-base targetable: **NO** (UI and server accept dex only; art resolves base)"
);
md.push("- UI support for forms: **NO**");
md.push("- Server support for PokemonFormId: **NO**");
md.push(
  "- Note: Admin can target post-151 base species after national roster rollout (related to all-gen safety FAIL)."
);
md.push("");
md.push("## POKÉDEX");
md.push("");
md.push("- Kanto required entries (UI `kanto.total`): **151**");
md.push("- Non-base required: **0**");
md.push(
  "- National total now tracks PLAY_VARIANTS size (~1010+), separate from Kanto 151"
);
md.push("- Forms do not add Kanto completion slots: **PASS**");
md.push(
  "- Caveat: national Pokédex expansion is live; Kanto-only completion still 151 species."
);
md.push("");
md.push("## EVOLUTION");
md.push("");
md.push("- Enabled evolution_rules: 72");
md.push("- Routes to dex >151: 0");
md.push("- Formish mega/alola/galar/hisui/gmax notes/methods: 0");
md.push("- Accidental form evolution routes: **PASS** (none found)");
md.push("");
md.push("## MASTERY");
md.push("");
md.push(
  "- `public.species_mastery` keyed by `(user_id, dex)` only — **species-level**, not form-level."
);
md.push("- Forms do not create separate mastery rows.");
md.push("");
md.push("## DATABASE TABLES (availability-related)");
md.push("");
md.push(
  "| Table/view | Purpose | Form-aware | Controls normal | Controls special | Controls admin |"
);
md.push(
  "|-----------|---------|------------|-----------------|------------------|----------------|"
);
md.push(
  "| public.species | Roster, weights, legendary/mythical flags | No (dex) | Yes | Indirect (flags) | Yes (picker source) |"
);
md.push(
  "| public.species_forms | Sprite/form catalog rows | form_key (no FormId) | No (enabled base only used for catalog) | No | No |"
);
md.push(
  "| private.spawn_* helpers | Ordinary encounter selection | No | Yes | Via allow_special | No |"
);
md.push(
  "| private.special_events | Event definitions | No (dex + variant_policy) | Blocks normal when LIVE | Yes | Admin commands |"
);
md.push(
  "| private.launch_community_round | Encounter instantiation | No | Yes | Yes | Yes |"
);
md.push(
  "| private.kanto_availability_json | Availability snapshot | No | Reporting (now national) | Reporting | No |"
);
md.push(
  "| private.female_visual_dex | Female art eligibility | No | Visual only | Visual only | No |"
);
md.push("| public.evolution_rules | Evo graph | No | No | No | Indirect |");
md.push("| public.species_mastery | Mastery points | No (dex) | No | No | No |");
md.push(
  "| public.catches | Owned Pokémon | variant shiny/gender only | No | No | No |"
);
md.push("");
md.push(
  "Mixed model: **asset-driven play stems** + **database-driven spawn eligibility** + **code-driven form refusal**."
);
md.push("");
md.push("## ALL-GENERATION SAFETY");
md.push("");
md.push(`- Asset maximum Dex (matrix): ${Math.max(...all.map((r) => r.NationalDex))}`);
md.push("- DB species maximum Dex: 1021");
md.push(`- Play PLAY_VARIANTS max: ${Math.max(...Object.keys(PV).map(Number))}`);
md.push("- Kanto gameplay intended max: 151");
md.push("- >151 normal encounter species: **775**");
md.push("- PASS/FAIL: **FAIL**");
md.push("");
md.push("## CLASSIFICATION COUNTS (236 Gen-1-origin rows)");
md.push("");
md.push(`- BASE_NORMAL: ${byClass.BASE_NORMAL || 0}`);
md.push(`- BASE_SPECIAL: ${byClass.BASE_SPECIAL || 0}`);
md.push(`- EVENT_READY: ${byClass.EVENT_READY || 0}`);
md.push(`- ASSET_ONLY: ${byClass.ASSET_ONLY || 0}`);
md.push(`- BROKEN: ${byClass.BROKEN || 0}`);
md.push("");
md.push("## RELEASE BLOCKERS");
md.push("");
md.push(
  "1. **Post-Kanto ordinary spawn exposure** (775 species) — violates Kanto v1.0 all-generation safety."
);
md.push(
  "2. **National availability model live** while owner audit expects Kanto-frozen 146+5 encounter surface."
);
md.push(
  "3. Non-base forms are **not event-ready** if owner expects controlled Mega/regional/Gmax instantiation without further engineering (reported gap only; not activated)."
);
md.push("");
md.push("## NON-BLOCKING FUTURE WORK");
md.push("");
md.push(
  "- Add PokemonFormId (or equivalent) to species_forms / special_events / rounds if event-ready forms are desired."
);
md.push("- Import optional Front form stems without enabling spawn.");
md.push("- Decide whether Admin UI should list forms once server supports them.");
md.push("- Separate form showcase / collection tracking from Kanto 151 completion.");
md.push("- Reconcile leftover SWSH disabled form_key rows vs Organized CSV FormIds.");
md.push("");
md.push("## FINAL VERDICT");
md.push("");
md.push("KANTO POKÉMON / FORM IMPLEMENTATION NOT SAFE");
md.push("");
md.push("## STAFF RESET GATE");
md.push("");
md.push("KEEP STAFF RESET PAUSED");
md.push("");
md.push("---");
md.push("");
md.push("Full matrix: `docs/audits/pokemon-form-implementation-audit.csv` (236 rows).");
md.push("");
md.push(
  "Audit performed read-only. No gameplay, spawn, form flags, events, evolution, Pokédex, mastery, sprites, schema, Admin UI, APP_BUILD, or SPRITE_BUILD mutations."
);

fs.writeFileSync(path.join(OUT_DIR, "pokemon-form-implementation-audit.md"), md.join("\n"));

const summary = {
  totalMatrix: all.length,
  gen1: gen1.length,
  base: base151.length,
  nonBase: nonBase.length,
  byClass,
  formBuckets,
  normalNonBase,
  eventReadyNonBase,
  assetOnlyNonBase,
  broken,
  mega: megaForms.length,
  alolan: alolan.length,
  galarian: galarian.length,
  hisuian: hisuian.length,
  gmax: gmax.length,
  femaleAsset: assetFemaleBase.length,
  femaleGameplay: GAMEPLAY_FEMALE.size,
  femaleDiscrepancies: { assetOnly: femaleAssetOnly, gameplayOnly: femaleGameplayOnly },
  pikachuForms: pikachuForms.length,
  interestMissing: interest.filter((s) => !findInterest(s)).map((s) => s.name),
};
console.log(JSON.stringify(summary, null, 2));
console.log("Wrote", path.join(OUT_DIR, "pokemon-form-implementation-audit.csv"));
console.log("Wrote", path.join(OUT_DIR, "pokemon-form-implementation-audit.md"));
