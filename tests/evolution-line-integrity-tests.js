/* node tests/evolution-line-integrity-tests.js */
const fs = require("fs");
const path = require("path");

const results = [];
function test(name, fn) {
  try {
    fn();
    results.push({ name, passed: true });
  } catch (error) {
    results.push({ name, passed: false, detail: error.message });
  }
}
function assert(cond, detail) {
  if (!cond) throw new Error(detail || "failed");
}
function read(rel) {
  return fs.readFileSync(path.join(__dirname, "..", rel), "utf8");
}

const fixMig = read("supabase/migrations/20260919010000_fix_evolution_family_membership.sql");
const evoHtml = read("evolve.html");
const gameJs = read("js/game.js");
const evolveJs = read("js/evolve.js");
const viewJs = read("js/evolve-view.js");

test("family rebuild migration exists and asserts Pikachu/Sandshrew", () => {
  assert(fixMig.includes("fix_evolution_family_membership") || fixMig.includes("Sandshrew/Sandslash must not"));
  assert(fixMig.includes("Pikachu family must have exactly 2"));
  assert(fixMig.includes("family_id = e.family_id"));
  assert(fixMig.includes("evolution_rules"));
});

test("approved Oak research copy is exact", () => {
  assert(evoHtml.includes("Catch duplicate Pokémon from the same <strong>Evolution Line</strong> and send them to <strong>Professor Oak</strong> to earn <strong>Evolution Candy</strong>."));
  assert(evoHtml.includes("<strong>Evolution transforms that Pokémon into its evolved form—it does not create an additional copy.</strong>"));
  assert(evoHtml.includes("<strong>Evolution Stones</strong> and <strong>Linking Cords</strong>"));
  assert(evoHtml.includes('href="./store.html#evolution"'));
  assert(evoHtml.includes("<strong>Starlight Mart</strong>"));
  assert(evoHtml.includes("While <strong>Kanto</strong> is the active region"));
});

test("page is Prof. Oak's Lab with Send + Evolve tabs", () => {
  assert(evoHtml.includes("Prof. Oak's Lab"));
  assert(evoHtml.includes('data-tab="send"'));
  assert(evoHtml.includes('data-tab="evolve"'));
  assert(evoHtml.includes('id="evo-send-grid"'));
  assert(evoHtml.includes("js/oak-transfer.js"));
  assert(evolveJs.includes("play_transfer_oak"));
  assert(evolveJs.includes("setTab"));
  assert(evolveJs.includes("playOakTransfer"));
});

test("Game Boy transfer uses local Oak pixel sprite and Poké Ball", () => {
  const oakJs = read("js/oak-transfer.js");
  assert(oakJs.includes('images/trainers/oak.png'));
  assert(oakJs.includes('images/items/poke-ball.png'));
  assert(fs.existsSync(path.join(__dirname, "..", "images", "trainers", "oak.png")));
  assert(fs.existsSync(path.join(__dirname, "..", "images", "items", "poke-ball.png")));
  assert(!/http.*=.*oak/i.test(oakJs));
});

test("filters: All first; Shiny/Favorites removed", () => {
  assert(!evoHtml.includes('data-filter="shiny"'));
  assert(!evoHtml.includes('data-filter="favorites"'));
  const chips = evoHtml.match(/data-filter="[^"]+"/g) || [];
  assert(chips[0] === 'data-filter="all"', chips.join(","));
  assert(viewJs.includes('mode === "ready"') || viewJs.includes('filter || "all"'));
  assert(evolveJs.includes('|| "all"'));
});

test("Rare Candy maps to local rare-candy.png, not lgpe-candy", () => {
  assert(gameJs.includes('rarecandy: "rare-candy"'));
  assert(!/rarecandy:\s*"lgpe-candy"/.test(gameJs));
  assert(fs.existsSync(path.join(__dirname, "..", "images", "items", "rare-candy.png")));
});

test("Evolution Candy species keys use family mascot sprites, not Rare Candy", () => {
  assert(gameJs.includes("species-(\\d+)"));
  assert(gameJs.includes("playSpriteUrl(id, \"normal\")") || gameJs.includes("playSpriteUrl(id, 'normal')"));
  assert(!gameJs.includes('if (raw.startsWith("species-")) return "images/items/lgpe-candy.png"'));
});

test("Professor Oak lab asset is local", () => {
  assert(evoHtml.includes("images/trainers/portraits/oak-portrait.png"));
  assert(fs.existsSync(path.join(__dirname, "..", "images", "trainers", "portraits", "oak-portrait.png")));
  assert(!/http.*=.*oak/i.test(evoHtml));
});

test("candy manifest prepared with Gen1 gameplay only", () => {
  const manifestPath = path.join(__dirname, "..", "data", "evolution-candy-manifest.json");
  assert(fs.existsSync(manifestPath), "run prepare-evolution-candy-assets.js");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  assert(Array.isArray(manifest.gameplayEnabledGenerations));
  assert(manifest.gameplayEnabledGenerations.join(",") === "1");
  assert(manifest.rareCandy.assetPath === "images/items/rare-candy.png");
  assert(manifest.rareCandy.distinctFromEvolutionCandy === true);
  const enabled = manifest.rows.filter((r) => r.gameplayEnabled);
  const lockedFuture = manifest.rows.filter((r) => r.generation > 1 && r.gameplayEnabled);
  assert(enabled.length >= 1);
  assert(lockedFuture.length === 0);
});

test("candy identity fix migration and audit CSV are present", () => {
  const candyFix = read("supabase/migrations/20260919030000_fix_family_candy_species_identity.sql");
  assert(candyFix.includes("family_candy_species_id = s.family_id"));
  assert(candyFix.includes("candyBaseDex"));
  assert(fs.existsSync(path.join(__dirname, "..", "docs", "audits", "evolution-candy-integrity.csv")));
});

const failed = results.filter((r) => !r.passed);
for (const r of results) {
  console.log(`${r.passed ? "PASS" : "FAIL"} ${r.name}${r.detail ? " — " + r.detail : ""}`);
}
console.log(`${results.length - failed.length}/${results.length} passed`);
if (failed.length) process.exit(1);
