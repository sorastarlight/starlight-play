/* node tests/rc128-presentation-tests.js */
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
function readFile(rel) {
  return fs.readFileSync(path.join(__dirname, "..", rel), "utf8");
}

const nav = readFile("js/nav.js");
const evolveHtml = readFile("evolve.html");
const evolveJs = readFile("js/evolve.js");
const css = readFile("css/play.css");
const achHtml = readFile("achievements.html");
const achJs = readFile("js/achievements.js");
const linkBlock = nav.match(/const links = \[[\s\S]*?\];/)?.[0] || "";
const sendFn = evolveJs.match(/function renderSend\(\)[\s\S]*?function nodeHtml/)?.[0] || "";
const researchFn = evolveJs.match(/function renderResearch\(\)[\s\S]*?async function loadResearch/)?.[0] || "";
const historyFn = evolveJs.match(/function renderResearchHistory[\s\S]*?function renderResearch\(/)?.[0] || "";
const evolveTab = evolveHtml.match(/id="evo-tab-evolve"[\s\S]*?id="evo-tab-research"/)?.[0] || "";

const expected = [
  ["play", "Play", "./"],
  ["storage", "My PC", "./storage.html"],
  ["pokedex", "My Pokédex", "./pokedex.html"],
  ["inventory", "My Inventory", "./inventory.html"],
  ["trainer", "My Trainer ID", "./trainer.html"],
  ["achievements", "My Achievements", "./achievements.html"],
  ["evolve", "Prof. Oak's Lab", "./evolve.html"],
  ["rankings", "Rankings", "./rankings.html"],
  ["trade", "GTS", "./trade.html"],
  ["events", "Events", "./events.html"],
  ["help", "How to Play", "./help.html"],
  ["store", "Mart", "./store.html"]
];

test("Mart is last in primary navigation", () => {
  const ids = [...linkBlock.matchAll(/id: "([^"]+)"/g)].map((m) => m[1]);
  const labels = [...linkBlock.matchAll(/label: "([^"]+)"/g)].map((m) => m[1]);
  const hrefs = [...linkBlock.matchAll(/href: "([^"]+)"/g)].map((m) => m[1]);
  assert(ids.length === 12, `expected 12 nav ids, got ${ids.length}`);
  expected.forEach((row, i) => {
    assert(ids[i] === row[0], `id ${i} ${ids[i]} !== ${row[0]}`);
    assert(labels[i] === row[1], `label ${i} ${labels[i]} !== ${row[1]}`);
    assert(hrefs[i] === row[2], `href ${i} ${hrefs[i]} !== ${row[2]}`);
  });
  assert(ids[ids.length - 1] === "store", "Mart must be last");
  assert(labels[labels.length - 2] === "How to Play", "How to Play must precede Mart");
  assert(!nav.includes('items.push({ href: "./store.html"'), "Mart must not be appended twice");
  assert(nav.includes("topnav-link-store"));
});

test("Evolution Lines player section is gone; shared family logic remains", () => {
  assert(!evolveHtml.includes('id="evo-lines-title"'), "Evolution Lines heading must leave player UI");
  assert(!evolveHtml.includes('id="family-list"'), "family-list container must leave player UI");
  assert(!evolveTab.includes("Evolution Lines</h2>"), "Evolution Lines heading still in Evolution tab");
  assert(evolveHtml.includes('id="evo-grid"'), "main evolution grid missing");
  assert(evolveHtml.includes("evo-evolve-filters"), "evolution filters missing");
  assert(evolveHtml.includes('id="evo-search"'), "evolution search missing");
  assert(evolveHtml.includes('id="evo-sort"'), "evolution sort missing");
  assert(evolveHtml.includes("oak-lab-overview-evolve"), "evolution overview missing");
  assert(evolveJs.includes("function renderFamilies"), "shared family renderer must remain");
  assert(evolveJs.includes('playCall("play_evolve"'), "evolution RPC must remain");
});

test("Achievement filters use a compact two-row toolbar with a category select", () => {
  assert(achHtml.includes("ach-hub-toolbar-status"), "status row missing");
  assert(achHtml.includes("Achievement Progress"), "progress title missing");
  assert(achHtml.includes('id="ach-states"'), "status chips missing");
  assert(/<select id="ach-cats"/.test(achHtml), "category control must be a select");
  assert(!achHtml.includes('id="ach-cats" class="ach-hub-cats"'), "category pills container must leave");
  assert(achHtml.includes("Search achievements"), "search label missing");
  assert(achHtml.includes('id="ach-sort"'), "sort missing");
  assert(achJs.includes("availableCategories()"), "live category counts must drive the select");
  assert(achJs.includes("All Categories"), "all-categories option missing");
  assert(achJs.includes('els.cats.value = catFilter'), "selected category must persist");
  assert(achJs.includes("els.cats?.addEventListener(\"change\""), "category change wiring missing");
  assert(css.includes(".ach-hub-toolbar-status"), "status row CSS missing");
  assert(css.includes("ach-hub-search"), "search wrap CSS missing");
});

test("Transfer collection controls match Evolution Research and Send has dedicated action", () => {
  assert(evolveHtml.includes("oak-lab-collection-controls"), "shared collection controls missing");
  assert(evolveHtml.includes("evo-send-action"), "dedicated send action missing");
  assert(evolveHtml.includes("evo-send-go-label"), "send label slot missing");
  assert(evolveHtml.includes("images/items/poke-ball.png"), "Poké Ball asset missing from send action");
  assert(evolveHtml.includes("Sort by"), "transfer sort label should match Evolution Research");
  assert(!/evo-send-toolbar[\s\S]*evo-send-go/.test(evolveHtml.match(/class="evo-toolbar evo-send-toolbar[\s\S]*?<\/div>/)?.[0] || ""), "Send must leave the search/sort row");
  assert(sendFn.includes("Select Pokémon to send to Professor Oak"), "idle send copy missing");
  assert(sendFn.includes("Send ${n} Pokémon to Oak"), "selected send copy missing");
  assert(evolveJs.includes("openOakConfirm"), "confirmation gate missing");
  assert(evolveJs.includes('playCall("play_transfer_oak"'), "transfer RPC must remain");
  assert(css.includes(".evo-send-action"), "send action CSS missing");
  assert(css.includes("c9a227"), "gold accent missing from send action");
});

test("Research overview integrates notes and keeps tracks, History, and claims", () => {
  const researchHtml = evolveHtml.slice(evolveHtml.indexOf('id="evo-tab-research"'));
  assert(!researchHtml.includes("<details class=\"evo-research-notes\">"), "disconnected research-tab notes strip must leave");
  assert(researchFn.includes("oak-research-overview"), "research overview missing");
  assert(researchFn.includes("researchNotesHtml"), "notes must render in the header");
  assert(evolveJs.includes("oak-research-notes"), "notes disclosure missing");
  assert(evolveJs.includes("There's still so much to learn about Pokémon in Kanto!"), "collapsed hint missing");
  assert(evolveJs.includes("Professor Oak tracks four research paths"), "expanded notes copy missing");
  assert(researchFn.includes("oak-research-next-compact"), "compact next goal missing");
  assert(!researchFn.includes("oak-research-next-milestone"), "large next-milestone panel must stay gone");
  assert(!researchFn.includes("Overall track progress"), "duplicate progress caption must leave");
  assert(historyFn.includes("researchNotesHtml(\"history\")"), "History must keep notes");
  assert(evolveJs.includes('data-research-track="history"'), "History rail missing");
  assert(evolveJs.includes('playCall("play_claim_oak_research"'), "claim RPC must remain");
  assert(evolveJs.includes("IN PROGRESS"));
  assert(evolveJs.includes("CLAIMABLE"));
  assert(evolveJs.includes("LOCKED"));
});

test("Authority call sites stay unchanged", () => {
  assert((evolveJs.match(/play_evolve/g) || []).length === 1);
  assert(evolveJs.includes('playCall("play_transfer_oak"'));
  assert(evolveJs.includes('playCall("play_oak_research"'));
  assert(evolveJs.includes('playCall("play_claim_oak_research"'));
  assert(achJs.includes('playCall("play_progression"'));
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
