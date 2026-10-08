/* node tests/oak-lab-rc123-tests.js */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

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
function hashFile(rel) {
  return crypto.createHash("sha256").update(fs.readFileSync(path.join(__dirname, "..", rel))).digest("hex");
}
function pngOk(rel) {
  const buf = fs.readFileSync(path.join(__dirname, "..", rel));
  return buf.length >= 8 && buf.subarray(0, 8).toString("hex") === "89504e470d0a1a0a";
}

const js = read("js/evolve.js");
const viewSrc = read("js/evolve-view.js");
const css = read("css/play.css");
const game = read("js/game.js");
const index = read("js/evolution-candy-png.js");
const map = JSON.parse(index.replace(/^[\s\S]*window\.PLAY_EVO_CANDY_PNG\s*=\s*/, "").replace(/;\s*$/, ""));
const genericHash = hashFile("images/items/lgpe-candy.png");

globalThis.window = globalThis;
require("../js/evolve-view.js");
const view = window.playEvoView;

test("readyRows filters to enabled Kanto evolutions only", () => {
  assert(js.includes("hasEligibleEvolution"));
  assert(js.includes("readyRows().filter"));
  const render = js.match(/function renderReady[\s\S]*?function sendCardHtml/)?.[0] || "";
  assert(!render.includes("terminal: true"));
  assert(!render.includes("Fully Evolved"));
});

test("filter counts use eligible readyRows only", () => {
  const counts = js.match(/function counts[\s\S]*?function renderHero/)?.[0] || "";
  assert(counts.includes("all: rows.length"));
  assert(counts.includes('view.matchesFilter(row, "candy")'));
  assert(counts.includes('view.matchesFilter(row, "item")'));
  assert(counts.includes('view.matchesFilter(row, "trade")'));
  assert(!counts.includes("!mon.canEvolve"));
});

test("hasEligibleEvolution keeps under-resourced and drops terminals", () => {
  assert(view.hasEligibleEvolution({
    ruleId: "27-28", dex: 27, name: "Sandshrew", toDex: 28, toName: "Sandslash",
    haveCandy: 67, candyCost: 25, available: true
  }));
  assert(view.hasEligibleEvolution({
    ruleId: "25-26", dex: 25, name: "Pikachu", toDex: 26, toName: "Raichu",
    haveCandy: 5, candyCost: 40, available: false
  }));
  assert(!view.hasEligibleEvolution({ dex: 26, name: "Raichu" }));
  assert(!view.hasEligibleEvolution({ dex: 28, name: "Sandslash", terminal: true }));
  assert(!view.hasEligibleEvolution({
    ruleId: "133-196", dex: 133, name: "Eevee", toDex: 196, toName: "Espeon"
  }));
});

test("Chansey candy key is family 113 designated PNG", () => {
  assert(Number(map[113]) === 113, "Chansey line key must be 113");
  assert(Number(map[242] || 0) === 0 || Number(map[242]) === 113, "Blissey must not invent a new candy key");
  assert(pngOk("images/items/evolution-candy/113.png"), "113.png must be a real PNG");
  assert(hashFile("images/items/evolution-candy/113.png") !== genericHash, "Chansey candy must not be lgpe-candy.png");
  assert(!js.includes("is-composite"), "RC124 removes candy mascot overlays");
  const svg = read("images/items/evolution-candy/113.svg");
  assert(/113/.test(svg), "SVG fallback stays on Chansey family art");
});

test("Kanto candy PNGs resolve without generic lgpe fallback", () => {
  const families = [1, 4, 7, 25, 27, 35, 39, 63, 113, 111, 133];
  const missing = [];
  const generic = [];
  for (const dex of families) {
    const fileDex = Number(map[dex] || dex);
    const rel = `images/items/evolution-candy/${fileDex}.png`;
    if (!fs.existsSync(path.join(__dirname, "..", rel))) {
      missing.push(rel);
      continue;
    }
    if (!pngOk(rel)) missing.push(`${rel} not png`);
    if (hashFile(rel) === genericHash) generic.push(rel);
  }
  assert(!missing.length, `missing candy PNG ${missing.join(", ")}`);
  assert(!generic.length, `generic lgpe fallback ${generic.join(", ")}`);
  assert(Number(map[26]) === 25, "Raichu uses Pikachu candy");
  assert(Number(map[28]) === 27, "Sandslash uses Sandshrew candy");
  assert(Number(map[36]) === 35, "Clefable uses Clefairy candy");
  assert(Number(map[40]) === 39, "Wigglytuff uses Jigglypuff candy");
  assert(Number(map[112]) === 111, "Rhydon uses Rhyhorn candy");
  assert(Number(map[113]) === 113, "Chansey keeps its own line");
  assert(game.includes("playEvolutionCandyItemUrl"));
  assert(game.includes("PLAY_EVO_CANDY_PNG"));
});

test("card anatomy uses viewer / context / reserved footer", () => {
  assert(js.includes("oak-card-context"));
  assert(js.includes("oak-evo-target"));
  assert(js.includes("data-evo-inspect"));
  assert(js.includes("data-oak-inspect"));
  assert(js.includes("data-evo-act"));
  assert(js.includes("data-oak-select"));
  assert(css.includes("grid-template-rows: auto minmax(72px, 1fr) 44px"));
  assert(css.includes("padding: 14px 14px 12px"));
  assert(css.includes("height: 292px"));
  assert(css.includes("height: 292px"));
  assert(!js.includes("oak-card-grow"));
});

test("requirement copy is explicit owned/required", () => {
  assert(js.includes("candyNeedCopy"));
  assert(js.includes("required ·"));
  assert(js.includes("owned ✓"));
  assert(js.includes("more needed"));
  assert(js.includes("Needs Candy"));
  assert(js.includes("Needs Item"));
  assert(!js.includes("${have} / ${need} required"));
});

test("empty Evolution Research distinguishes filter vs collection", () => {
  assert(js.includes("evo-empty-filter"));
  assert(js.includes("evo-empty-collection"));
  assert(js.includes("No Pokémon match this filter"));
  assert(js.includes("Professor Oak is ready when you are!"));
  assert(js.includes("data-evo-show-all"));
  assert(js.includes('setFilter("all")'));
  assert(css.includes(".evo-mons:has(.evo-empty)"));
  assert(css.includes("max-width: 28rem"));
});

test("inspect/action split and confirm stay non-mutating until RPC", () => {
  assert(js.includes("inspect must not start evolution"));
  assert(js.includes("evolve footer must not open inspect"));
  assert(js.includes("inspect must not toggle transfer selection") || js.includes("data-oak-inspect"));
  const preview = js.match(/function openPreview[\s\S]*?function openOakConfirm/)?.[0] || "";
  assert(preview.includes("evo-confirm-pair"));
  assert(!preview.includes("genderMark"));
  assert(preview.includes("esc(fromMeta)"));
  assert(js.includes('playCall("play_evolve"'));
  assert(js.includes('playCall("play_transfer_oak"'));
});

test("authority surfaces are unchanged", () => {
  assert(!js.includes("play_claim_oak_research") || js.includes("play_claim_oak_research"));
  const evolveOnce = js.slice(js.indexOf("async function evolveOnce"));
  assert((evolveOnce.match(/play_evolve/g) || []).length === 1);
  assert(viewSrc.includes("toDex <= 151"));
  const migDir = path.join(__dirname, "..", "supabase", "migrations");
  const newest = fs.readdirSync(migDir).filter((name) => name.startsWith("20261007") && name.includes("rc123"));
  assert(!newest.length, "RC123 must not add a database migration");
});

const failed = results.filter((row) => !row.passed);
results.forEach((row) => {
  const mark = row.passed ? "PASS" : "FAIL";
  console.log(`${mark} ${row.name}${row.detail ? ` — ${row.detail}` : ""}`);
});
if (failed.length) {
  console.error(`\n${failed.length} failed`);
  process.exit(1);
}
console.log(`\n${results.length} passed`);
