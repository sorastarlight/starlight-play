/* node tests/pokedex-kanto-boundary-tests.js */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

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

const gameJs = read("js/game.js");
const pokedexJs = read("js/pokedex.js");
const pokedexHtml = read("pokedex.html");
const speciesJs = read("js/species.js");
const variantsJs = read("js/variants.js");

test("pokedex page has no region/gen selectors", () => {
  assert(!/id="filter-region"/.test(pokedexHtml));
  assert(!/id="filter-gen"/.test(pokedexHtml));
  assert(!/>\s*Region\s*</.test(pokedexHtml));
  assert(/id="dex-search"/.test(pokedexHtml));
});

test("pokedex.js uses released Kanto roster helpers", () => {
  assert(pokedexJs.includes("releasedDexList"));
  assert(pokedexJs.includes("releasedOnly: true"));
  assert(pokedexJs.includes("Kanto Pokédex"));
  assert(!pokedexJs.includes("National Pokédex"));
  assert(pokedexJs.includes("This Pokédex entry isn't currently available."));
  assert(pokedexJs.includes("clearUnreleasedRoute"));
});

test("game.js exposes Kanto release helpers", () => {
  assert(gameJs.includes("playReleasedDexMax"));
  assert(gameJs.includes("playIsReleasedDex"));
  assert(gameJs.includes("playReleasedDexTotal"));
  assert(gameJs.includes("playReleasedDexList"));
  assert(gameJs.includes("releasedOnly"));
});

test("released-only parse blocks Chikorita and #152", () => {
  const context = { window: {}, console };
  vm.createContext(context);
  vm.runInContext(speciesJs, context);
  vm.runInContext(variantsJs, context);
  const match = gameJs.match(/window\.playPadDex = function playPadDex[\s\S]*?window\.playSpeciesName = function playSpeciesName[\s\S]*?\n  \};/);
  assert(match, "helper block missing");
  vm.runInContext(match[0], context);
  const parse = context.window.playParseSpeciesQuery;
  assert(typeof parse === "function");
  assert(parse("Pikachu", { releasedOnly: true }).some((row) => row.dex === 25));
  assert(parse("Mew", { releasedOnly: true }).some((row) => row.dex === 151));
  assert(parse("Bulbasaur", { releasedOnly: true }).some((row) => row.dex === 1));
  assert(parse("Chikorita", { releasedOnly: true }).length === 0, "Chikorita leaked");
  assert(parse("152", { releasedOnly: true }).length === 0, "#152 leaked");
  assert(parse("251", { releasedOnly: true }).length === 0, "#251 leaked");
  assert(parse("1000", { releasedOnly: true }).length === 0, "#1000 leaked");
  assert(parse("Pichu", { releasedOnly: true }).length === 0, "Pichu leaked");
  assert(parse("Steelix", { releasedOnly: true }).length === 0, "Steelix leaked");
  assert(parse("Sylveon", { releasedOnly: true }).length === 0, "Sylveon leaked");
  assert(context.window.playReleasedDexList().length === 151);
  assert(context.window.playReleasedDexList()[0] === 1);
  assert(context.window.playReleasedDexList()[150] === 151);
  assert(context.window.playIsReleasedDex(151));
  assert(!context.window.playIsReleasedDex(152));
});

test("reference catalog still contains later-generation names", () => {
  assert(/Chikorita/.test(speciesJs));
  assert(/Pichu/.test(speciesJs));
  assert(/Steelix/.test(speciesJs));
  assert(/Sylveon/.test(speciesJs));
});

const failed = results.filter((row) => !row.passed);
results.forEach((row) => {
  console.log(`${row.passed ? "PASS" : "FAIL"} ${row.name}${row.detail ? ` — ${row.detail}` : ""}`);
});
console.log(`${results.length - failed.length}/${results.length} passed`);
if (failed.length) process.exit(1);
