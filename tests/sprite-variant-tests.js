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
function fileOf(url) {
  return String(url || "").split("?")[0];
}
function exists(rel) {
  return fs.existsSync(path.join(root, fileOf(rel).replace(/\//g, path.sep)));
}

test("Play variants catalog is loaded", () => {
  assert(Array.isArray(window.PLAY_VARIANTS[25]), JSON.stringify(window.PLAY_VARIANTS[25]));
  assert(!window.PLAY_VARIANTS[25].includes("female"), JSON.stringify(window.PLAY_VARIANTS[25]));
  assert(!window.PLAY_VARIANTS[131].includes("female"), JSON.stringify(window.PLAY_VARIANTS[131]));
  assert(window.PLAY_VARIANTS[3].includes("shiny-female"), JSON.stringify(window.PLAY_VARIANTS[3]));
});

test("species without a female Front file default to the species sprite", () => {
  assert(fileOf(window.playSpriteUrl(25, "normal")) === "images/pokemon/25.gif");
  assert(fileOf(window.playSpriteUrl(25, "female")) === "images/pokemon/25.gif");
  assert(fileOf(window.playSpriteUrl(25, "shiny")) === "images/pokemon/shiny/25.gif");
  assert(fileOf(window.playSpriteUrl(25, "shiny-female")) === "images/pokemon/shiny/25.gif");
  assert(fileOf(window.playSpriteUrl(133, "female")) === "images/pokemon/133.gif");
  assert(fileOf(window.playSpriteUrl(131, "female")) === "images/pokemon/131.gif");
  assert(exists("images/pokemon/25.gif"));
  assert(exists("images/pokemon/shiny/25.gif"));
  assert(!exists("images/pokemon/female/25.gif"));
  assert(!exists("images/pokemon/female/133.gif"));
  assert(!exists("images/pokemon/female/133.png"));
});

test("Venusaur keeps a distinct female Front from Legacy3D", () => {
  assert(fileOf(window.playSpriteUrl(3, "normal")) === "images/pokemon/3.gif");
  assert(fileOf(window.playSpriteUrl(3, "female")) === "images/pokemon/female/3.gif");
  assert(fileOf(window.playSpriteUrl(3, "shiny")) === "images/pokemon/shiny/3.gif");
  assert(fileOf(window.playSpriteUrl(3, "shiny-female")) === "images/pokemon/shiny/female/3.gif");
  assert(exists("images/pokemon/3.gif"));
  assert(exists("images/pokemon/female/3.gif"));
  assert(exists("images/pokemon/shiny/3.gif"));
  assert(exists("images/pokemon/shiny/female/3.gif"));
});

test("all catalog female visuals exist on the first requested path", () => {
  const missing = [];
  Object.entries(window.PLAY_VARIANTS).forEach(([dex, list]) => {
    (list || []).forEach((variant) => {
      if (variant !== "female" && variant !== "shiny-female") return;
      const url = window.playSpriteUrl(Number(dex), variant);
      if (!exists(url)) missing.push(fileOf(url));
    });
  });
  assert(!missing.length, missing.join(", "));
});

test("sprite URLs carry the 3D import cache stamp", () => {
  assert(window.PLAY_SPRITE_BUILD === "20260916-sp1");
  assert(window.playSpriteUrl(1, "normal").endsWith("?v=20260916-sp1"));
});

const failed = results.filter((row) => !row.passed);
results.forEach((row) => {
  console.log(`${row.passed ? "PASS" : "FAIL"} ${row.name}${row.detail ? ` — ${row.detail}` : ""}`);
});
console.log(`${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
