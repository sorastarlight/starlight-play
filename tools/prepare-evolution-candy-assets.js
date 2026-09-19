/**
 * Prepare Evolution Candy national manifest (asset reference / future unlock).
 * Display art for Evolution Candy is the family mascot Pokémon sprite (local).
 * Rare Candy remains images/items/rare-candy.png (PokeAPI local import).
 * Gameplay-enabled generations: [1] only.
 *
 * Usage: node tools/prepare-evolution-candy-assets.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const MANIFEST = path.join(ROOT, "data", "evolution-candy-manifest.json");
const SPECIES = JSON.parse(
  fs.readFileSync(path.join(ROOT, "js", "species.js"), "utf8").match(/window\.PLAY_SPECIES\s*=\s*(\[[\s\S]*?\]);/)[1]
);
const RULES_SQL = fs.readFileSync(
  path.join(ROOT, "supabase", "migrations", "20260914021000_kanto_evo_rules.sql"),
  "utf8"
);

function generationForDex(dex) {
  if (dex <= 151) return 1;
  if (dex <= 251) return 2;
  if (dex <= 386) return 3;
  if (dex <= 493) return 4;
  if (dex <= 649) return 5;
  if (dex <= 721) return 6;
  if (dex <= 809) return 7;
  if (dex <= 905) return 8;
  return 9;
}

const enabledFamilies = new Set();
for (const match of RULES_SQL.matchAll(/'\d+-\d+',\s*(\d+),\s*(\d+),\s*(\d+)/g)) {
  enabledFamilies.add(Number(match[3]));
}

const rows = [];
for (let dex = 1; dex <= SPECIES.length; dex += 1) {
  const name = SPECIES[dex - 1] || `Dex ${dex}`;
  const gen = generationForDex(dex);
  const spritePath = `images/pokemon/${dex}.gif`;
  const spriteExists = fs.existsSync(path.join(ROOT, spritePath))
    || fs.existsSync(path.join(ROOT, `images/pokemon/${dex}.png`));
  rows.push({
    generation: gen,
    familyId: dex,
    representativeDex: dex,
    representativeName: name,
    assetPath: spritePath,
    assetAvailable: spriteExists,
    gameplayEnabled: gen === 1,
    notes: gen === 1
      ? "Kanto Evolution Candy identity = family mascot sprite; line-keyed"
      : "Prepared for future region; gameplay locked"
  });
}

const manifest = {
  generatedAt: new Date().toISOString(),
  source: "tools/prepare-evolution-candy-assets.js",
  displayRule: "Evolution Candy uses the family mascot Pokémon sprite (local). Rare Candy uses images/items/rare-candy.png.",
  rareCandy: {
    key: "rarecandy",
    assetPath: "images/items/rare-candy.png",
    source: "local PokeAPI sprites/items/rare-candy.png",
    distinctFromEvolutionCandy: true
  },
  gameplayEnabledGenerations: [1],
  rows
};

fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Evolution Candy manifest: ${rows.length} rows`);
console.log(`Kanto gameplay-enabled: ${rows.filter((r) => r.gameplayEnabled).length}`);
console.log(`Asset available: ${rows.filter((r) => r.assetAvailable).length}`);
console.log(`Future locked: ${rows.filter((r) => !r.gameplayEnabled).length}`);
