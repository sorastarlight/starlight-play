/* node tests/location-visual-tests.js */
globalThis.window = globalThis;
require("../js/location-visuals.js");
require("../js/location-visuals-data.js");

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

const FILES = [
  "Kanto Route 1 FRLG.png",
  "Kanto Route 10 FRLG.png",
  "Kanto Route 11 FRLG.png",
  "Kanto Route 2 FRLG.png",
  "FL Viridian Forest.png",
  "Viridian Forest FRLG.png",
  "FL Mt Moon.png",
  "Mt Moon 1F FRLG.png",
  "Celadon City FRLG.png",
  "Celadon Gym FRLG.png",
  "Celadon Department Store 1F FRLG.png",
  "Diglett Cave FRLG.png",
  "Diglett Cave Entrance Route 2 FRLG.png",
  "Cerulean Cave 1F FRLG.png",
  "Cerulean Cave 2F FRLG.png",
  "Cerulean Cave B1F FRLG.png",
  "Saffron City FRLG.png",
  "Saffron Gym FRLG.png",
  "Pokémon Lab Entrance FRLG.png",
  "Birth Island FRLG.png",
  "FRLG Kanto.png"
];

test("normalizes Pokémon spelling and punctuation", () => {
  assert(window.playLocationKey("Pokémon Mansion") === "pokemon-mansion");
  assert(window.playLocationKey("Mt. Moon") === "mt-moon");
  assert(window.playLocationKey("Diglett's Cave") === "digletts-cave");
  assert(window.playLocationKey("Silph Co.") === "silph-co");
});

test("Route 1 does not match Route 10 or 11", () => {
  const hits = window.playProposeLocationMatches("Route 1", FILES);
  assert(hits.some((row) => row.filename === "Kanto Route 1 FRLG.png"));
  assert(!hits.some((row) => /Route 10|Route 11/.test(row.filename)));
  assert(window.playLocationMatchConfidence("Route 1", "Kanto Route 1 FRLG.png") === "EXACT");
});

test("Viridian Forest matches both FL and full maps", () => {
  const hits = window.playProposeLocationMatches("Viridian Forest", FILES);
  assert(hits.some((row) => row.filename === "FL Viridian Forest.png" && row.confidence === "EXACT"));
  assert(hits.some((row) => row.filename === "Viridian Forest FRLG.png" && row.confidence === "EXACT"));
});

test("Mt. Moon matches FL Mt Moon as HIGH/EXACT and floors as HIGH", () => {
  assert(["EXACT", "HIGH"].includes(window.playLocationMatchConfidence("Mt. Moon", "FL Mt Moon.png")));
  assert(window.playLocationMatchConfidence("Mt. Moon", "Mt Moon 1F FRLG.png") === "HIGH");
});

test("city names prefer the outdoor map over gyms and shops", () => {
  const hits = window.playProposeLocationMatches("Saffron City", FILES);
  assert(hits[0].filename === "Saffron City FRLG.png");
  assert(hits[0].confidence === "EXACT");
  assert(window.playLocationMatchConfidence("Saffron City", "Saffron Gym FRLG.png") === "NONE");
  assert(window.playLocationMatchConfidence("Saffron City", "Saffron City unused FRLG.png") === "LOW");
  const celadon = window.playProposeLocationMatches("Celadon City", FILES);
  assert(celadon[0].filename === "Celadon City FRLG.png");
  assert(!celadon.some((row) => /Gym|Department/.test(row.filename) && row.confidence !== "LOW"));
});

test("Cerulean Cave reports multiple floor matches", () => {
  const hits = window.playProposeLocationMatches("Cerulean Cave", FILES).filter((row) => row.confidence !== "LOW");
  assert(hits.length >= 3);
});

test("runtime lookup uses the curated local asset", () => {
  const visual = window.playLocationVisual("Route 1");
  assert(visual && visual.key === "route-1", visual && visual.key);
  assert(/route-1\.(webp|png)$/.test(visual.asset || ""), visual && visual.asset);
});

test("presentation defaults and difficult-location overrides", () => {
  const forest = window.playLocationVisual("Viridian Forest");
  const moon = window.playLocationVisual("Mt. Moon");
  const attrs = window.playLocationVisualAttrs("Viridian Forest");
  assert(forest.brightness < moon.brightness, `${forest.brightness} ${moon.brightness}`);
  assert(moon.overlay < forest.overlay, `${moon.overlay} !< ${forest.overlay}`);
  assert(forest.brightness >= 0.88, String(forest.brightness));
  assert(attrs.includes("--enc-map-brightness"));
  assert(attrs.includes("--enc-overlay"));
  assert(attrs.includes("--enc-vignette"));
  assert(attrs.includes("--enc-map-contrast"));
});


test("unknown locations fall back to Kanto", () => {
  const visual = window.playLocationVisual("Not A Real Place");
  assert(visual && visual.key === "kanto", visual && visual.key);
});

test("CSS background urls are document-absolute so play.css does not resolve them under /css/", () => {
  const previous = globalThis.document;
  globalThis.document = { baseURI: "https://play.example/" };
  const attrs = window.playLocationVisualAttrs("Route 1");
  if (previous === undefined) delete globalThis.document;
  else globalThis.document = previous;
  assert(attrs.includes("https://play.example/images/encounters/locations/frlg/route-1.png"), attrs);
});

test("Kanto region map matches the FRLG Kanto file", () => {
  assert(window.playLocationMatchConfidence("Kanto", "FRLG Kanto.png") === "HIGH");
  assert(window.playLocationMatchConfidence("Kanto", "Kanto Route 1 FRLG.png") === "NONE");
  assert(window.playLocationMatchConfidence("Kanto", "Kanto Underground Path 7-8 Map.png") === "NONE");
});

const failed = results.filter((row) => !row.passed);
results.forEach((row) => {
  console.log(`${row.passed ? "PASS" : "FAIL"} ${row.name}${row.detail ? ` — ${row.detail}` : ""}`);
});
console.log(`${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
