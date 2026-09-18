/* node tests/sprite-variant-tests.js */
const fs = require("fs");
const path = require("path");
globalThis.window = globalThis;
globalThis.document = { addEventListener() {}, querySelector() { return null; } };
require("../js/variants.js");
require("../js/game.js");

const root = path.join(__dirname, "..");
const report = JSON.parse(fs.readFileSync(path.join(root, "data", "organized-front-import-report.json"), "utf8"));
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

test("Play variants catalog is loaded nationally", () => {
  assert(Object.keys(window.PLAY_VARIANTS).length === report.baseDexCount, String(Object.keys(window.PLAY_VARIANTS).length));
  assert(Array.isArray(window.PLAY_VARIANTS[1]), JSON.stringify(window.PLAY_VARIANTS[1]));
  assert(!window.PLAY_VARIANTS[1].includes("female"), JSON.stringify(window.PLAY_VARIANTS[1]));
  assert(window.PLAY_VARIANTS[3].includes("shiny-female"), JSON.stringify(window.PLAY_VARIANTS[3]));
  assert(window.PLAY_VARIANTS[25].includes("female"), "Showdown FrontFemale includes Pikachu");
  assert(window.PLAY_VARIANTS[252], "Treecko should be cataloged");
});

test("species without a female Front file default to the species sprite", () => {
  assert(fileOf(window.playSpriteUrl(1, "normal")) === "images/pokemon/1.gif");
  assert(fileOf(window.playSpriteUrl(1, "female")) === "images/pokemon/1.gif");
  assert(fileOf(window.playSpriteUrl(1, "shiny")) === "images/pokemon/shiny/1.gif");
  assert(fileOf(window.playSpriteUrl(1, "shiny-female")) === "images/pokemon/shiny/1.gif");
  assert(fileOf(window.playSpriteUrl(133, "female")) === "images/pokemon/133.gif");
  assert(exists("images/pokemon/1.gif"));
  assert(exists("images/pokemon/shiny/1.gif"));
  assert(!exists("images/pokemon/female/1.gif"));
  assert(!exists("images/pokemon/female/133.gif"));
});

test("Venusaur keeps a distinct female Front", () => {
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
  assert(!missing.length, missing.slice(0, 20).join(", "));
});

test("sprite URLs carry the Organized import cache stamp", () => {
  assert(window.PLAY_SPRITE_BUILD === report.spriteBuild, window.PLAY_SPRITE_BUILD);
  assert(window.playSpriteUrl(1, "normal").endsWith(`?v=${report.spriteBuild}`));
});

test("resolver never falls forward to Mega / regional / costume forms or Backs", () => {
  assert(fileOf(window.playSpriteUrl(6, "mega-x")) === "images/pokemon/6.gif");
  assert(fileOf(window.playSpriteUrl(6, "charizard-megay")) === "images/pokemon/6.gif");
  assert(fileOf(window.playSpriteUrl(26, "alola")) === "images/pokemon/26.gif");
  assert(fileOf(window.playSpriteUrl(25, "pikachu-belle")) === "images/pokemon/25.gif");
  assert(fileOf(window.playSpriteUrl(25, "shiny-kantocap")) === "images/pokemon/shiny/25.gif");
  assert(fileOf(window.playSpriteUrl(1, "back")) === "images/pokemon/1.gif");
  assert(!window.PLAY_VARIANTS[1].includes("female"));
  assert(!window.PLAY_VARIANTS[6].includes("mega"));
  assert(!Object.values(window.PLAY_VARIANTS).flat().some((v) => /back/i.test(v)));
});

test("female roster matches Organized FrontFemale matrix", () => {
  const female = Object.entries(window.PLAY_VARIANTS)
    .filter(([, list]) => Array.isArray(list) && list.includes("female"))
    .map(([dex]) => Number(dex))
    .sort((a, b) => a - b);
  assert(female.length === (report.femaleDexes || []).length, String(female.length));
  assert(JSON.stringify(female) === JSON.stringify(report.femaleDexes || []), JSON.stringify(female.slice(0, 20)));
});

test("no Back sprite files under images/pokemon", () => {
  const hits = [];
  const walk = (dir) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (/back/i.test(ent.name)) hits.push(p);
    }
  };
  walk(path.join(root, "images", "pokemon"));
  assert(!hits.length, hits.slice(0, 5).join(", "));
});

const failed = results.filter((row) => !row.passed);
results.forEach((row) => {
  console.log(`${row.passed ? "PASS" : "FAIL"} ${row.name}${row.detail ? ` — ${row.detail}` : ""}`);
});
console.log(`${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
