/* node tests/sprite-variant-tests.js */
const fs = require("fs");
const path = require("path");
globalThis.window = globalThis;
globalThis.document = { addEventListener() {}, querySelector() { return null; } };
require("../js/variants.js");
require("../js/game.js");

const root = path.join(__dirname, "..");
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
function exists(rel) {
  return fs.existsSync(path.join(root, rel.replace(/\//g, path.sep)));
}

test("Play variants catalog is loaded", () => {
  assert(window.PLAY_VARIANTS[25].includes("shiny-female"), JSON.stringify(window.PLAY_VARIANTS[25]));
  assert(!window.PLAY_VARIANTS[131].includes("female"), JSON.stringify(window.PLAY_VARIANTS[131]));
});

test("Lapras has no female visual path", () => {
  assert(window.playSpriteUrl(131, "normal") === "images/pokemon/131.gif");
  assert(window.playSpriteUrl(131, "female") === "images/pokemon/131.gif");
  assert(window.playSpriteUrl(131, "shiny") === "images/pokemon/shiny/131.gif");
  assert(window.playSpriteUrl(131, "shiny-female") === "images/pokemon/shiny/131.gif");
  assert(exists("images/pokemon/131.gif"));
  assert(exists("images/pokemon/shiny/131.gif"));
  assert(!exists("images/pokemon/female/131.gif"));
});

test("Pikachu gender-difference matrix", () => {
  assert(window.playSpriteUrl(25, "normal") === "images/pokemon/25.gif");
  assert(window.playSpriteUrl(25, "female") === "images/pokemon/female/25.gif");
  assert(window.playSpriteUrl(25, "shiny") === "images/pokemon/shiny/25.gif");
  assert(window.playSpriteUrl(25, "shiny-female") === "images/pokemon/shiny/female/25.gif");
  assert(exists("images/pokemon/25.gif"));
  assert(exists("images/pokemon/female/25.gif"));
  assert(exists("images/pokemon/shiny/25.gif"));
  assert(exists("images/pokemon/shiny/female/25.gif"));
});

test("all catalog female visuals exist on the first requested path", () => {
  const missing = [];
  Object.entries(window.PLAY_VARIANTS).forEach(([dex, list]) => {
    (list || []).forEach((variant) => {
      if (variant !== "female" && variant !== "shiny-female") return;
      const url = window.playSpriteUrl(Number(dex), variant);
      if (!exists(url)) missing.push(url);
    });
  });
  assert(!missing.length, missing.join(", "));
});

test("Eevee female uses png on the first request", () => {
  assert(window.playSpriteUrl(133, "female") === "images/pokemon/female/133.png");
  assert(window.playSpriteUrl(133, "shiny-female") === "images/pokemon/shiny/female/133.png");
});

const failed = results.filter((row) => !row.passed);
results.forEach((row) => {
  console.log(`${row.passed ? "PASS" : "FAIL"} ${row.name}${row.detail ? ` — ${row.detail}` : ""}`);
});
console.log(`${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
