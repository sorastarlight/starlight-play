/* node tests/phase7-content-tests.js */
globalThis.window = globalThis;
require("../js/play-ux.js");
require("../js/play-portrait.js");

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

test("Mart details add information beyond the short purpose", () => {
  const identity = {
    bestUse: "Best against Water- and Bug-type Pokémon.",
    playerText: "Stronger on Water and Bug types. Ordinary against other types.",
    collector: false,
    powerLabel: "STRONG",
    basePower: "STANDARD",
    condition: "TARGET_TYPE",
    rarity: "uncommon"
  };
  const parts = window.playMartDetailParts({ key: "netball", identity, ballKey: "netball" });
  assert(parts.purpose.includes("Water"), parts.purpose);
  assert(parts.parts.length > 0, "detail parts empty");
  assert(parts.parts.some((line) => /niche|Catch power|Rarity/i.test(line)), parts.parts.join(" | "));
  assert(parts.purpose !== parts.parts[0], "purpose repeated as the only detail");
});

test("Collector Balls are labeled as collector, not secretly stronger", () => {
  window.playBallInfo = (key) => key === "dreamball"
    ? { key, collector: true, effect: "Collector Ball. Sleep conditions do not exist in this RPG, so it matches a Poké Ball." }
    : null;
  const text = window.playItemPlayerText("dreamball");
  assert(/Collector/i.test(text), text);
  assert(!/1\.3/.test(text), text);
  const shop = window.playBallShopBlurb("dreamball");
  assert(/Collector/i.test(shop), shop);
});

test("Honey stays community support, not a Berry", () => {
  const text = window.playItemPlayerText("bait");
  assert(/community/i.test(text), text);
  assert(!/Berry/i.test(window.playItemPurpose("bait")) || /not a Berry/i.test(text), text);
  const parts = window.playMartDetailParts({ key: "bait", ballKey: "bait", identity: { bestUse: "Community catch support for the whole encounter.", playerText: text } });
  assert(parts.parts.some((line) => /not a Berry/i.test(line)), parts.parts.join(" | "));
});

test("Rare Candy converts into Evolution Candy", () => {
  const text = window.playItemPlayerText("rarecandy");
  assert(/Evolution Candy/i.test(text), text);
  assert(/does not evolve/i.test(text), text);
});

test("Portrait crop favors head/upper torso and keeps margin", () => {
  const w = 64;
  const h = 96;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 20; y <= 80; y += 1) {
    for (let x = 20; x <= 44; x += 1) {
      const i = ((y * w) + x) * 4;
      data[i] = 40;
      data[i + 1] = 80;
      data[i + 2] = 40;
      data[i + 3] = 255;
    }
  }
  const bounds = window.playPortraitVisibleBounds(data, w, h);
  assert(bounds.top === 20 && bounds.left === 20, JSON.stringify(bounds));
  const rect = window.playPortraitCropRect(bounds, w, h, { margin: 0.12 });
  assert(rect.sx < bounds.left, `margin left ${rect.sx} vs ${bounds.left}`);
  assert(rect.sy < bounds.top, `margin top ${rect.sy} vs ${bounds.top}`);
  assert(rect.sy + rect.sh > bounds.top + (bounds.bottom - bounds.top) * 0.35, "crop missed upper body");
  assert(rect.sw === rect.sh, "portrait is not square");
});

test("Wide hair / hat is not cropped flush", () => {
  const w = 80;
  const h = 80;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 8; y <= 50; y += 1) {
    for (let x = 10; x <= 70; x += 1) {
      const i = ((y * w) + x) * 4;
      data[i + 3] = 255;
    }
  }
  const bounds = window.playPortraitVisibleBounds(data, w, h);
  const rect = window.playPortraitCropRect(bounds, w, h, { margin: 0.12 });
  assert(rect.sx <= bounds.left, JSON.stringify(rect));
  assert(rect.sx + rect.sw >= bounds.right, JSON.stringify({ rect, bounds }));
});

test("Mart cards no longer use redundant accordion details", () => {
  const src = fs.readFileSync(path.join(__dirname, "../js/store.js"), "utf8");
  assert(!src.includes("<details class=\"mart-detail\">"), "redundant mart-detail accordion still present");
  assert(src.includes("data-mart-detail"), "details drawer missing");
  assert(src.includes("Pack purchased!"), "pack reveal copy missing");
});

test("Pack builder and Pass share the content picker", () => {
  const studio = fs.readFileSync(path.join(__dirname, "../js/admin-studio.js"), "utf8");
  assert(studio.includes("playContentPicker"), "studio does not use content picker");
  assert(studio.includes("admin_save_pass_rewards"), "pass editor missing");
  assert(studio.includes("productKind: \"pack\""), "pack save missing");
});

test("Portrait upload path is derived, not destructive", () => {
  const asset = fs.readFileSync(path.join(__dirname, "../supabase/functions/store-asset/index.ts"), "utf8");
  assert(asset.includes("images/trainers/portraits/"), "portrait path missing");
  assert(asset.includes('kind === "portrait"'), "portrait kind missing");
  const studio = fs.readFileSync(path.join(__dirname, "../js/admin-studio.js"), "utf8");
  assert(studio.includes("Original sprites were not changed"), studio);
  assert(studio.includes("admin_save_look_portrait"), "portrait save RPC missing");
});

test("Bits packs cannot be defined with odds in the UI copy", () => {
  const studio = fs.readFileSync(path.join(__dirname, "../js/admin-studio.js"), "utf8");
  assert(/No odds, no Pokémon/.test(studio), studio);
});

const failed = results.filter((row) => !row.passed);
results.forEach((row) => {
  console.log(`${row.passed ? "PASS" : "FAIL"} ${row.name}${row.detail ? ` — ${row.detail}` : ""}`);
});
console.log(`${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
