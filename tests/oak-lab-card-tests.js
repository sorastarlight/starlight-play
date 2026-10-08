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
  assert(js.includes("Select Pokémon"));
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
  assert(css.includes("height: 292px"));
  assert(css.includes("height: 292px"));
  assert(css.includes("padding: 14px 14px 12px"));
  assert(css.includes("cursor: pointer"));
  assert(css.includes(".oak-mon-inspect"));
  assert(css.includes("evo-send-card.is-selected"));
  assert(js.includes("oak-card-context"));
  assert(css.includes("oak-card-context"));
});

test("Evolution Candy item art is local and not a runtime hotlink", () => {
  assert(game.includes("playEvolutionCandyItemUrl"));
  assert(game.includes("PLAY_EVO_CANDY_PNG"));
  assert(game.includes("images/items/evolution-candy/"));
  assert(oak.includes("candyItemArt"));
  assert(js.includes("candyArtHtml"));
  assert(!js.includes("pokeapi.co"));
  assert(!css.includes("bulbapedia"));
  const svg = path.join(__dirname, "..", "images", "items", "evolution-candy", "25.svg");
  const png = path.join(__dirname, "..", "images", "items", "evolution-candy", "25.png");
  assert(fs.existsSync(svg), "Pikachu candy SVG fallback missing");
  assert(fs.existsSync(png), "Pikachu provided candy PNG missing — run import-go-candy-assets.js");
  const pngHead = fs.readFileSync(png).subarray(0, 8).toString("hex");
  assert(pngHead === "89504e470d0a1a0a", "provided candy must be a real PNG");
  const text = fs.readFileSync(svg, "utf8");
  assert(text.includes("lgpe-candy.png") || text.includes("rare-candy.png"), "candy body missing");
  assert(!/https?:\/\/(?!www\.w3\.org)/.test(text), "candy SVG must not hotlink");
  const index = read("js/evolution-candy-png.js");
  assert(index.includes("window.PLAY_EVO_CANDY_PNG"));
  assert(!index.includes("http"), "candy index must not hotlink");
});

test("Research summary has explicit overall progress semantics", () => {
  assert(js.includes("oak-research-summary"));
  assert(js.includes("% complete"));
  assert(js.includes("Overall track progress"));
  assert(js.includes("remaining"));
  assert(js.includes("oak-research-summary-identity"));
  assert(js.includes("oak-research-next-compact"));
  assert(js.includes("CLAIMABLE"));
  assert(js.includes("oak-research-claim-slot"));
  assert(js.includes("oak-research-card-grow"));
  assert(css.includes("oak-research-summary"));
  assert(css.includes("height: 268px"));
  assert(css.includes("grid-template-rows: 16px 2.4em 2.6em 1.2em 2.6em minmax(8px, 1fr) 44px"));
});

test("Transfer success uses shared playToast, not inline success copy", () => {
  const fn = js.match(/async function transferSelected[\s\S]*?function wait\(/)?.[0] || "";
  assert(fn.includes("playToast"));
  assert(fn.includes("Transferred to Professor Oak"));
  assert(fn.includes("rewardSummary"));
  assert(!fn.includes("Sent to Professor Oak."));
  assert(!fn.includes("Sent ${successes.length} Pokémon to Oak."));
});

test("Evolution confirm is a wide pair layout without a tall forced card", () => {
  assert(js.includes("evo-confirm-pair"));
  assert(js.includes("Evolution Ready"));
  assert(css.includes("width: min(720px"));
  assert(css.includes(".evo-preview .evo-preview-card #evo-detail { overflow: visible"));
  assert(html.includes("Keep Pokémon"));
  assert(html.includes("oak-transfer-confirm"));
});

test("Research complete lists milestone before reward", () => {
  const present = read("js/play-present.js");
  const fn = present.match(/async function presentOakResearch[\s\S]*?async function presentOne/)?.[0] || "";
  const mile = fn.indexOf("play-present-oak-milestone");
  const reward = fn.indexOf("oakResearchRewardGrid");
  assert(mile > 0 && reward > mile, "milestone must precede reward grid");
  assert(fn.includes("play-present-oak-reward-kicker"));
});

test("Research claim result path is still rc117 non-redundant enqueue", () => {
  assert(js.includes("Research Complete!"));
  assert(js.includes("kind: \"oak-research\""));
  assert(js.includes("playPresentEnqueue"));
});

test("Evolution Research All filter does not append fully evolved terminals", () => {
  const render = js.match(/function renderReady[\s\S]*?function sendCardHtml/)?.[0] || "";
  assert(!render.includes("terminal: true"), "All filter must not inject terminal cards");
  assert(!render.includes("Fully Evolved"));
  assert(js.includes("No Pokémon match this filter"));
  assert(js.includes("data-evo-show-all"));
  assert(js.includes("Professor Oak is ready when you are!"));
  const counts = js.match(/function counts[\s\S]*?function renderHero/)?.[0] || "";
  assert(counts.includes("all: rows.length"));
  assert(!counts.includes("!mon.canEvolve"));
});

test("Candy requirement copy uses explicit owned/required labels", () => {
  assert(js.includes("candyNeedCopy"));
  assert(js.includes("required ·"));
  assert(js.includes("owned ✓"));
  assert(js.includes("more needed"));
  assert(!js.includes("${have} / ${need} required"));
  assert(!js.includes("${haveN} / ${needN}"));
});

test("Evolution confirm does not escape gender HTML into visible text", () => {
  const preview = js.match(/function openPreview[\s\S]*?function openOakConfirm/)?.[0] || "";
  assert(!preview.includes("genderMark(row.gender)"));
  assert(!/function genderMark/.test(js), "unused HTML genderMark must stay removed");
  assert(!preview.includes("evo-gender"));
  assert(preview.includes("Lv. ${row.level}"));
});

test("Chansey uses designated GO candy PNG, not generic lgpe-candy", () => {
  const index = read("js/evolution-candy-png.js");
  assert(/"113"\s*:\s*113/.test(index), "Chansey must map to family-base 113 PNG");
  const chansey = path.join(__dirname, "..", "images", "items", "evolution-candy", "113.png");
  const generic = path.join(__dirname, "..", "images", "items", "lgpe-candy.png");
  assert(fs.existsSync(chansey), "Chansey 113.png missing");
  const a = fs.readFileSync(chansey);
  const b = fs.readFileSync(generic);
  assert(a.length !== b.length && a.compare(b) !== 0, "Chansey candy must not be the generic lgpe file");
  assert(!js.includes("is-composite"), "Lab candy must not overlay a Pokémon sprite");
  assert(!js.includes("oak-candy-mascot"), "Lab candy must be a single item sprite");
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
