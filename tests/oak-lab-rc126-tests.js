/* node tests/oak-lab-rc126-tests.js */
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

const html = read("evolve.html");
const js = read("js/evolve.js");
const css = read("css/play.css");
const game = read("js/game.js");
const store = read("js/store.js");
const inventory = read("js/inventory.js");
const cardFn = js.match(/function cardHtml[\s\S]*?function sortRows/)?.[0] || "";
const sendFn = js.match(/function sendCardHtml[\s\S]*?function renderSend/)?.[0] || "";
const confirmFn = js.match(/function confirmRequirementHtml[\s\S]*?function openPreview/)?.[0] || "";
const researchFn = js.match(/function renderResearch\(\)[\s\S]*?async function loadResearch/)?.[0] || "";

test("Evolution thumbnails drop requirement text and keep candy icon + status", () => {
  assert(!cardFn.includes("candyChipHtml"), "thumbnail must not render candy requirement chip");
  assert(!cardFn.includes("required"), "thumbnail must not say required");
  assert(!cardFn.includes("owned"), "thumbnail must not say owned");
  assert(!cardFn.includes("more needed"), "thumbnail must not say more needed");
  assert(!cardFn.includes("oak-evo-item"), "thumbnail must not show item requirement copy");
  assert(!cardFn.includes("candyArtHtml"), "thumbnail must not render candy art");
  assert(!cardFn.includes("oak-evo-candy"), "thumbnail must not reserve a candy row");
  assert(cardFn.includes("oak-evo-arrow"), "evolution arrow track");
  assert(cardFn.includes("oak-evo-target-art"), "target sprite track");
  assert(cardFn.includes("oak-evo-target-name"), "target name track");
  assert(js.includes("Ready to Evolve"));
  assert(js.includes("Needs Candy"));
  assert(js.includes("Needs Item"));
  assert(js.includes("Trade Evolution"));
});

test("Evolution confirmation still lists full candy and item requirements", () => {
  assert(confirmFn.includes("candyNeedCopy"));
  assert(js.includes("required ·"));
  assert(js.includes("owned ✓"));
  assert(js.includes("more needed"));
  assert(confirmFn.includes("evo-confirm-req"));
  assert(js.includes("Requirements"));
});

test("Transfer Candy labels are two block elements, not one wrapping string", () => {
  assert(sendFn.includes("oak-candy-species"));
  assert(sendFn.includes("oak-candy-kind"));
  assert(sendFn.includes("Evolution Candy"));
  assert(sendFn.includes("candy.bare"));
  assert(!/oak-candy-label\}?\$\{esc\(candy\.label\)\}/.test(sendFn));
  assert(css.includes(".oak-candy-species"));
  assert(css.includes(".oak-candy-kind"));
  assert(css.includes("display: block"));
});

test("Candy family identity is unchanged and decorative Pikachu candy is separate", () => {
  assert(js.includes("playEvolutionCandyLineDex"));
  assert(js.includes("playEvolutionCandyItemUrl"));
  assert(js.includes('LAB_DECO_CANDY = "images/items/evolution-candy/25.png"'));
  const identity = js.match(/function candyIdentity[\s\S]*?function candyArtHtml/)?.[0] || "";
  assert(!identity.includes("LAB_DECO_CANDY"), "decorative candy must not replace per-Pokémon identity");
  assert(html.includes("images/items/evolution-candy/25.png"));
});

test("Evolution cards use one compact reserved-track height", () => {
  assert(css.includes("height: 292px"));
  assert(css.includes("grid-template-rows: 18px 56px 18px minmax(4px, 1fr)"));
  assert(css.includes("min-height: 44px"));
  assert(!cardFn.includes("position: absolute"));
  assert(css.includes(".evo-mon.oak-evo-card"));
});

test("Transfer and Evolution share Lab overview presentation", () => {
  assert(html.includes("oak-lab-overview oak-lab-overview-transfer"));
  assert(html.includes("oak-lab-overview oak-lab-overview-evolve"));
  assert(css.includes("min-height: 132px"));
  assert(html.includes("evo-send-eligible"));
  assert(html.includes("evo-send-selected"));
  assert(html.includes("evo-send-candy-total"));
  assert(html.includes("evo-kanto-done"));
  assert(html.includes("evo-ready-display"));
  assert(html.includes("evo-candy-count"));
  assert(js.includes('t.id === "transfer"'));
});

test("Research header is compact and History is a read-only nav view", () => {
  assert(js.includes('data-research-track="history"'), "history nav missing");
  assert(js.includes("<strong>History</strong>"), "history label missing");
  assert(js.includes("renderResearchHistory"), "history renderer missing");
  assert(js.includes("milestones.filter((m) => !m.claimed)"), "active tracks must hide claimed");
  assert(js.includes("filter((m) => m.claimed)"), "history must collect claimed");
  assert(js.includes("complete && !m.claimed") || js.includes("complete && !claimed"), "claimable logic missing");
  assert(js.includes("oak-research-next-compact"), "compact next goal missing");
  assert(!researchFn.includes("oak-research-next-milestone"), "large next-milestone panel must leave active header");
  assert(js.includes("The Lab journal is empty"), "history empty state missing");
  assert(!js.includes("claimed_at"), "do not invent claim timestamps");
  assert(!js.includes("claimedAt"), "do not invent claim timestamps");
});

test("Claimable milestones stay on active tracks; History has no claim control", () => {
  const historyFn = js.match(/function renderResearchHistory[\s\S]*?function renderResearch\(/)?.[0] || "";
  assert(historyFn.includes("{ history: true }"));
  assert(!historyFn.includes("data-claim-research"));
  assert(js.includes('data-claim-research="${esc(m.id)}"'));
  assert(js.includes('playCall("play_claim_oak_research"'));
});

test("PokéCoin is a local GO coin PNG, not a hotlink or substitute coin", () => {
  const coin = path.join(__dirname, "..", "images", "items", "pokecoin.png");
  assert(fs.existsSync(coin), "pokecoin.png missing");
  const buf = fs.readFileSync(coin);
  assert(buf.subarray(0, 8).toString("hex") === "89504e470d0a1a0a", "must be PNG");
  assert(buf.readUInt32BE(16) === 48 && buf.readUInt32BE(20) === 48, "GO icon should be 48x48");
  assert(buf.length < 10000, "keep the sharp 48px GO file, not the blurry duplicate");
  assert(game.includes('coins: "pokecoin"'));
  assert(store.includes("pokecoin.png"));
  assert(inventory.includes("pokecoin.png"));
  assert(fs.existsSync(path.join(__dirname, "..", "tools", "import-pokecoin-asset.js")));
  const importer = read("tools/import-pokecoin-asset.js");
  assert(importer.includes("items-icons/PokeCoin.png"));
  assert(!importer.includes("amulet-coin"));
  assert(!game.includes("pokeapi.co/media"));
});

test("Inspect/action split and authority call sites stay unchanged", () => {
  assert(js.includes("data-evo-inspect"));
  assert(js.includes("data-evo-act"));
  assert(js.includes("data-oak-inspect"));
  assert(js.includes("data-oak-select"));
  assert(js.includes('playCall("play_evolve"'));
  assert(js.includes('playCall("play_transfer_oak"'));
  assert((js.match(/play_evolve/g) || []).length === 1);
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
