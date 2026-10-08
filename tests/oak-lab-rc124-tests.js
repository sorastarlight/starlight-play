/* node tests/oak-lab-rc124-tests.js */
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

const js = read("js/evolve.js");
const game = read("js/game.js");
const oak = read("js/oak-transfer.js");
const css = read("css/play.css");
const view = read("js/evolve-view.js");

globalThis.window = globalThis;
require("../js/species.js");
require("../js/evolution-candy-png.js");
window.playSpeciesName = function playSpeciesName(dex) {
  return (window.PLAY_SPECIES || [])[Number(dex) - 1] || `No. ${dex}`;
};
const helpers = game.match(/window\.playEvolutionCandyLineDex[\s\S]*?window\.playEvolutionCandyFallback/)[0];
new Function(helpers)();

test("Candy helpers never emit Evolution Line Evolution Candy", () => {
  assert(window.playEvolutionCandyLineDex(113) === 113);
  assert(window.playEvolutionCandyLineDex(26) === 25);
  assert(window.playEvolutionCandyLineDex(28) === 27);
  assert(window.playEvolutionCandyLabel(113, "") === "Chansey Evolution Candy");
  assert(window.playEvolutionCandyLabel(113, "Evolution Line") === "Chansey Evolution Candy");
  assert(window.playEvolutionCandyLabel(27, "Sandshrew Evolution Line") === "Sandshrew Evolution Candy");
  assert(window.playEvolutionCandyLabel(0, "Evolution Line") === "Evolution Candy");
  assert(game.includes("playEvolutionCandyLabel"));
  assert(oak.includes("playEvolutionCandyLabel"));
  assert(!js.includes("|| \"Evolution Line\""));
});

test("Lab candy art is a single item PNG with no Pokémon overlay", () => {
  const art = js.match(/function candyArtHtml[\s\S]*?function candyNeedCopy/)?.[0] || "";
  assert(!art.includes("oak-candy-mascot"));
  assert(!art.includes("is-composite"));
  assert(!art.includes("playSpriteUrl"));
  assert(art.includes("oak-candy-item"));
  assert(art.includes("lgpe-candy.png"));
  assert(!css.includes("oak-candy-mascot"));
  assert(js.includes("oak-candy-block"));
});

test("Chansey designated candy remains family 113 PNG", () => {
  const index = read("js/evolution-candy-png.js");
  assert(/"113"\s*:\s*113/.test(index));
  const png = path.join(__dirname, "..", "images", "items", "evolution-candy", "113.png");
  assert(fs.existsSync(png));
  const head = fs.readFileSync(png).subarray(0, 8).toString("hex");
  assert(head === "89504e470d0a1a0a");
});

test("Transfer and Evolution cards keep inspect/action split", () => {
  assert(js.includes("Select Pokémon"));
  assert(js.includes("Selected ✓"));
  assert(js.includes("data-oak-inspect"));
  assert(js.includes("data-oak-select"));
  assert(js.includes("data-evo-inspect"));
  assert(js.includes("data-evo-act"));
  assert(js.includes("inspect must not start evolution"));
});

test("Evolution eligibility filter from RC123 is preserved", () => {
  assert(view.includes("hasEligibleEvolution"));
  assert(view.includes("toDex <= 151"));
  assert(js.includes("hasEligibleEvolution"));
  const render = js.match(/function renderReady[\s\S]*?function sendCardHtml/)?.[0] || "";
  assert(!render.includes("terminal: true"));
});

test("Card geometry uses reserved tracks without hover-blur", () => {
  assert(css.includes("height: 292px"));
  assert(css.includes("height: 360px"));
  assert(css.includes(".evo-mon.oak-mon-card:hover"));
  assert(css.includes("oak-candy-block"));
  assert(css.includes("width: 64px"));
  assert(css.includes("min-height: 44px"));
});

test("Authority call sites stay unchanged", () => {
  assert(js.includes('playCall("play_evolve"'));
  assert(js.includes('playCall("play_transfer_oak"'));
  const evol = js.slice(js.indexOf("async function evolveOnce"));
  assert((evol.match(/play_evolve/g) || []).length === 1);
});

const failed = results.filter((row) => !row.passed);
results.forEach((row) => {
  console.log(`${row.passed ? "PASS" : "FAIL"} ${row.name}${row.detail ? ` — ${row.detail}` : ""}`);
});
if (failed.length) {
  console.error(`\n${failed.length} failed`);
  process.exit(1);
}
console.log(`\n${results.length} passed`);
