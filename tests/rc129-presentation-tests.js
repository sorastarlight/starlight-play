/* node tests/rc129-presentation-tests.js */
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
function readFile(rel) {
  return fs.readFileSync(path.join(__dirname, "..", rel), "utf8");
}

const evolveHtml = readFile("evolve.html");
const evolveJs = readFile("js/evolve.js");
const evolveView = readFile("js/evolve-view.js");
const css = readFile("css/play.css");
const achJs = readFile("js/achievements.js");
const achHtml = readFile("achievements.html");
const sendFn = evolveJs.match(/function renderSend\(\)[\s\S]*?function nodeHtml/)?.[0] || "";
const researchFn = evolveJs.match(/function renderResearch\(\)[\s\S]*?async function loadResearch/)?.[0] || "";
const historyFn = evolveJs.match(/function renderResearchHistory[\s\S]*?function renderResearch\(/)?.[0] || "";
const sendTab = evolveHtml.slice(evolveHtml.indexOf('id="evo-tab-send"'), evolveHtml.indexOf('id="evo-tab-evolve"'));
const evolveTab = evolveHtml.slice(evolveHtml.indexOf('id="evo-tab-evolve"'), evolveHtml.indexOf('id="evo-tab-research"'));
const researchTab = evolveHtml.slice(evolveHtml.indexOf('id="evo-tab-research"'));
const placeholder = "Search by Pokémon name or Pokédex number...";

const ctx = { window: {}, globalThis: {} };
ctx.window = ctx;
ctx.globalThis = ctx;
vm.runInNewContext(evolveView, ctx);
const match = ctx.playEvoView.matchesPokemonQuery;
const pikachu = { dex: 25, name: "Pikachu", toName: "Raichu", toDex: 26, familyName: "Pikachu" };
const charmander = { dex: 4, name: "Charmander", nickname: "Ember" };

test("Lab search labels and placeholders are identical", () => {
  assert((evolveHtml.match(/Search Pokémon/g) || []).length >= 2, "Search Pokémon labels missing");
  const sendPh = sendTab.match(/id="evo-send-search"[^>]*placeholder="([^"]+)"/)?.[1];
  const evoPh = evolveTab.match(/id="evo-search"[^>]*placeholder="([^"]+)"/)?.[1];
  assert(sendPh === placeholder, `transfer placeholder ${sendPh}`);
  assert(evoPh === placeholder, `evolution placeholder ${evoPh}`);
  assert(sendTab.includes("Sort by") && evolveTab.includes("Sort by"), "Sort by labels missing");
});

test("Name and Pokédex number search cover partial names and padded numbers", () => {
  assert(typeof match === "function", "matchesPokemonQuery missing");
  assert(match(pikachu, "pika"), "partial name");
  assert(match(pikachu, "Pikachu"), "full name");
  assert(match(pikachu, "25"), "raw dex");
  assert(match(pikachu, "025"), "leading-zero dex");
  assert(match(pikachu, "#025"), "hashed dex");
  assert(match(charmander, "ember"), "nickname");
  assert(!match(pikachu, "bulba"), "non-match");
  assert(match({ dex: 25, name: "Pikachu" }, ""), "empty query matches all");
  assert(sendFn.includes("matchesPokemonQuery"), "transfer search must use shared matcher");
  assert(evolveView.includes("matchesPokemonQuery(row, query)"), "evolution filter must use shared matcher");
});

test("Sort option wording is standardized and Ready first stays Evolution-only", () => {
  const shared = [
    "Pokédex Number (Ascending)",
    "Pokédex Number (Descending)",
    "Name (A–Z)",
    "Name (Z–A)"
  ];
  shared.forEach((label) => {
    assert(sendTab.includes(label), `transfer missing ${label}`);
    assert(evolveTab.includes(label), `evolution missing ${label}`);
  });
  assert(evolveTab.includes("Ready first"), "evolution Ready first missing");
  assert(!sendTab.includes("Ready first"), "transfer must not expose Ready first");
  assert(evolveJs.includes('mode === "name-desc"'), "Z–A sort implementation missing");
  assert(evolveJs.includes('els.sort?.value || "dex-asc"'), "default dex-asc must remain");
});

test("Research-tab Notes are gone; Transfer and Evolution notes remain", () => {
  assert(!researchTab.includes("evo-research-notes"), "research-tab notes must leave");
  assert(!researchFn.includes("oak-research-notes"), "research renderer must not inject notes");
  assert(!historyFn.includes("oak-research-notes"), "history must not inject notes");
  assert(!evolveJs.includes("researchNotesHtml"), "research notes helper must leave");
  assert(sendTab.includes("evo-research-notes"), "transfer notes must remain");
  assert(evolveTab.includes("evo-research-notes"), "evolution notes must remain");
});

test("Shared progress presentation uses tokens without changing authority math", () => {
  assert(css.includes("--play-progress-h: 10px"), "shared height token missing");
  assert(css.includes("--play-progress-track"), "shared track token missing");
  assert(css.includes(".play-progress-track"), "shared track class missing");
  assert(evolveHtml.includes("play-progress-track"), "evolution overview must use shared track");
  assert(researchFn.includes("play-progress-track"), "research overview must use shared track");
  assert(researchFn.includes("% complete"), "research percent complete missing");
  assert(evolveJs.includes("${kantoPct}% complete"), "evolution percent complete missing");
  assert(achJs.includes("play-progress-track"), "achievement bars must use shared track");
  assert(achJs.includes("role=\"progressbar\""), "achievement bars need accessible progress role");
  assert(evolveJs.includes('aria-valuemax", String(kantoTotal)'), "kanto meter must use actual max");
  assert(evolveJs.includes('playCall("play_evolve"'));
  assert(evolveJs.includes('playCall("play_transfer_oak"'));
  assert(evolveJs.includes('playCall("play_claim_oak_research"'));
  assert(achJs.includes('playCall("play_progression"'));
});

test("Achievement card geometry and RC128 toolbar remain", () => {
  assert(achHtml.includes("ach-hub-toolbar-status"), "status row missing");
  assert(/<select id="ach-cats"/.test(achHtml), "category select missing");
  assert(css.includes("min-height: 282px"), "canonical card height missing");
  assert(css.includes('grid-area: bar'), "bar track missing");
  assert(css.includes('grid-area: rewards'), "rewards track missing");
  assert(evolveHtml.includes('id="evo-lines-title"') === false, "Evolution Lines must stay gone");
});

test("Mobile Lab toolbars still stack and nav order is unchanged", () => {
  assert(css.includes(".evo-send-toolbar.oak-lab-collection-controls"), "send stack selector missing");
  assert(css.includes("grid-template-columns: 1fr"), "narrow stack missing");
  const nav = readFile("js/nav.js");
  const linkBlock = nav.match(/const links = \[[\s\S]*?\];/)?.[0] || "";
  assert(linkBlock.indexOf('id: "help"') < linkBlock.indexOf('id: "store"'), "How to Play must precede Mart");
  assert(linkBlock.lastIndexOf('id: "store"') > linkBlock.lastIndexOf('id: "help"'), "Mart must stay last");
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
