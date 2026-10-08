/* node tests/rc127-presentation-tests.js */
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

const nav = read("js/nav.js");
const html = read("trainer.html");
const evolve = read("js/evolve.js");
const css = read("css/play.css");
const trainers = read("js/trainers.js");
const cardFn = evolve.match(/function cardHtml[\s\S]*?function sortRows/)?.[0] || "";
const confirmFn = evolve.match(/function confirmRequirementHtml[\s\S]*?function openPreview/)?.[0] || "";
const linkBlock = nav.match(/const links = \[[\s\S]*?\];/)?.[0] || "";

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

test("Primary nav labels and order are exact", () => {
  const ids = [...linkBlock.matchAll(/id: "([^"]+)"/g)].map((m) => m[1]);
  const labels = [...linkBlock.matchAll(/label: "([^"]+)"/g)].map((m) => m[1]);
  const hrefs = [...linkBlock.matchAll(/href: "([^"]+)"/g)].map((m) => m[1]);
  assert(ids.length === 12, `expected 12 nav ids, got ${ids.length}`);
  assert(new Set(ids).size === 12, "duplicate nav ids");
  assert(new Set(hrefs).size === 12, "duplicate nav hrefs");
  expected.forEach((row, i) => {
    assert(ids[i] === row[0], `id ${i} ${ids[i]} !== ${row[0]}`);
    assert(labels[i] === row[1], `label ${i} ${labels[i]} !== ${row[1]}`);
    assert(hrefs[i] === row[2], `href ${i} ${hrefs[i]} !== ${row[2]}`);
  });
  assert(!nav.includes('items.push({ href: "./store.html"'), "Mart must not be appended twice");
  assert(nav.includes("aria-current"));
  assert(nav.includes("topnav-link-store"));
});

test("Nav stays accessible on narrow viewports via existing panel", () => {
  assert(css.includes("@media (max-width: 1540px)"));
  assert(css.includes(".nav-toggle { display: grid"));
  assert(css.includes("white-space: nowrap"));
  assert(css.includes("flex-wrap: nowrap"));
  assert(!/font-size:\s*1[0-2]px/.test(css.match(/\.topnav-link \{[\s\S]*?padding/)?.[0] || ""), "nav text must stay 14px");
});

test("Trainer ID heading and description are exact display copy", () => {
  assert(html.includes("<h1 id=\"page-title\">My Trainer ID</h1>"));
  assert(html.includes("Your public Trainer ID for all to see!"));
  assert(!html.includes("Trainer ID Public View"));
  assert(!html.includes("View this Trainer's card, Team, and featured honors."));
  assert(html.includes("Customize Trainer ID"));
  assert(html.includes("settings.html#trainer-id"));
  assert(html.includes("tid-hero"));
  assert(html.includes("trainer-team"));
});

test("Evolution thumbnails have no Candy art; confirmation keeps requirements", () => {
  assert(!cardFn.includes("candyArtHtml"));
  assert(!cardFn.includes("oak-evo-candy"));
  assert(!cardFn.includes("candyIdentity"));
  assert(cardFn.includes("oak-evo-arrow"));
  assert(cardFn.includes("oak-evo-target-art"));
  assert(evolve.includes("Ready to Evolve"));
  assert(evolve.includes("Needs Candy"));
  assert(confirmFn.includes("candyNeedCopy"));
  assert(evolve.includes("required ·"));
  assert(css.includes("height: 292px"));
  assert(css.includes("grid-template-rows: 18px 56px 18px minmax(4px, 1fr)"));
});

test("My Team removes ground shadows and uses a container glow", () => {
  const party = trainers.match(/window.playRenderTrainerPartyHtml[\s\S]*?window.playRenderTrainerProgressHtml/)?.[0] || "";
  assert(!party.includes("tid-party-shadow"));
  assert(party.includes("tid-party-glow"));
  assert(!party.includes("playNormalizePartySprite"));
  assert(css.includes(".tid-party-glow"));
  assert(css.includes("display: none") && css.includes(".tid-party-shadow"));
  assert(!/tid-party-sprite \{[\s\S]*?drop-shadow\(0 [12]px 0/.test(css));
  assert(css.includes("object-fit: contain"));
  assert(trainers.includes("playSpriteUrl"));
  assert(trainers.includes("data-inspect-catch"));
});

test("Authority call sites stay unchanged", () => {
  assert(evolve.includes('playCall("play_evolve"'));
  assert(evolve.includes('playCall("play_transfer_oak"'));
  assert(!trainers.includes("play_save_trainer_id"));
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
