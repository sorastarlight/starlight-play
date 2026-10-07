/* node tests/oak-lab-card-tests.js */
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
const css = read("css/play.css");
const html = read("evolve.html");
const game = read("js/game.js");
const oak = read("js/oak-transfer.js");

test("Transfer Station filters to eligible candidates only", () => {
  assert(js.includes("eligibleTransferMons"));
  assert(js.includes("sendableMons()"));
  assert(!/oakReason/.test(js.match(/function sendCardHtml[\s\S]*?function renderSend/)?.[0] || ""), "blocked reason must leave transfer cards");
  assert(!js.includes("Tap to select"));
  assert(js.includes("Click here to select"));
  assert(js.includes("Selected ✓"));
});

test("Transfer inspect and select are separate buttons", () => {
  assert(js.includes("data-oak-inspect"));
  assert(js.includes("data-oak-select"));
  assert(js.includes("inspect must not toggle transfer selection"));
  assert(js.includes("select must not open inspect"));
  assert(html.includes("oak-inspect-modal"));
  assert(js.includes("openOakInspect"));
  assert(js.includes("playMonIdentityBadgesHtml"));
});

test("Evolution inspect and evolve are separate click targets", () => {
  assert(js.includes("data-evo-inspect"));
  assert(js.includes("data-evo-act"));
  assert(js.includes("inspect must not start evolution"));
  assert(js.includes("evolve footer must not open inspect"));
  assert(js.includes("Ready to Evolve"));
  assert(!/class="evo-mon is-\$\{kind\}/.test(js), "evolution card must not be a single giant button");
});

test("Transfer/Evolution cards drop level, gender, and janky ball icon", () => {
  const send = js.match(/function sendCardHtml[\s\S]*?function renderSend/)?.[0] || "";
  const evo = js.match(/function cardHtml[\s\S]*?function sortRows/)?.[0] || "";
  assert(!send.includes("genderMark"), "transfer card gender");
  assert(!send.includes("Lv."), "transfer card level");
  assert(!send.includes("evo-mon-ball"), "transfer ball icon");
  assert(!evo.includes("genderMark"), "evolution card gender");
  assert(!evo.includes("Lv."), "evolution card level");
  assert(!evo.includes("evo-mon-ball"), "evolution ball icon");
});

test("Shared Oak card geometry uses reserved tracks", () => {
  assert(css.includes("evo-mon.oak-mon-card"));
  assert(css.includes("height: 300px"));
  assert(css.includes("height: 360px"));
  assert(css.includes("cursor: pointer"));
  assert(css.includes(".oak-mon-inspect"));
  assert(css.includes("evo-send-card.is-selected"));
});

test("Evolution Candy item art is local and not a runtime hotlink", () => {
  assert(game.includes("playEvolutionCandyItemUrl"));
  assert(game.includes("images/items/evolution-candy/"));
  assert(oak.includes("candyItemArt"));
  assert(js.includes("candyArtHtml"));
  assert(!js.includes("pokeapi.co"));
  assert(!css.includes("bulbapedia"));
  const svg = path.join(__dirname, "..", "images", "items", "evolution-candy", "25.svg");
  assert(fs.existsSync(svg), "Pikachu candy item missing — run compose-evolution-candy-art.js");
  const text = fs.readFileSync(svg, "utf8");
  assert(text.includes("lgpe-candy.png") || text.includes("rare-candy.png"), "candy body missing");
  assert(!/https?:\/\/(?!www\.w3\.org)/.test(text), "candy SVG must not hotlink");
});

test("Research summary has explicit overall progress semantics", () => {
  assert(js.includes("oak-research-summary"));
  assert(js.includes("% Complete"));
  assert(js.includes("overall"));
  assert(js.includes("toward this milestone"));
  assert(js.includes("CLAIMABLE"));
  assert(js.includes("oak-research-claim-slot"));
  assert(css.includes("oak-research-summary"));
  assert(css.includes("height: 232px"));
});

test("Research claim result path is still rc117 non-redundant enqueue", () => {
  assert(js.includes("Research Complete!"));
  assert(js.includes("kind: \"oak-research\""));
  assert(js.includes("playPresentEnqueue"));
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
