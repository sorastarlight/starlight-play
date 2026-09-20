/* node tests/classic-gba-evolution-tests.js */
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
const view = read("js/evolve-view.js");
const css = read("css/play.css");

test("Classic GBA evolution stage uses owner backdrop behind sprites", () => {
  assert(js.includes("evo-gba-classic"), "classic gba class missing in fanfare");
  assert(js.includes("evo-field-black"), "stage field class missing");
  assert(css.includes(".evo-gba-classic"), "classic CSS missing");
  assert(css.includes("evolution-stage-bg.jpg"), "owner evolution backdrop missing from CSS");
  assert(css.includes(".evo-field-black"), "stage field CSS missing");
  assert(fs.existsSync(path.join(__dirname, "..", "images", "ui", "evolution-stage-bg.jpg")), "backdrop asset file missing");
});

test("Dual source/destination sprites drive silhouette alternation", () => {
  assert(js.includes("data-evo-from"), "source sprite missing");
  assert(js.includes("data-evo-to"), "destination sprite missing");
  assert(js.includes("showWhich"), "sprite toggle helper missing");
  assert(js.includes("pulsePairs"), "accelerating pulse helper missing");
  assert(js.includes("slowHold") && js.includes("fastHold"), "acceleration stages missing");
});

test("GBA dialogue framing and click-to-advance text flow", () => {
  assert(js.includes("evo-dialogue-gba"), "gba dialogue class missing");
  assert(js.includes("beginResultFlow"), "result dialogue flow missing");
  assert(js.includes("typeText") || js.includes("typePage"), "typewriter flow missing");
  assert(js.includes("advanceResult"), "click advance missing");
  assert(js.includes('overlay.addEventListener("click"'), "click-anywhere skip missing");
  assert(!js.includes("data-evo-skip"), "skip button must be removed");
  assert(!js.includes("data-evo-result"), "separate result card must leave classic flow");
  assert(css.includes(".evo-dialogue-gba") || css.includes(".evo-gba-classic .evo-dialogue"), "gba dialogue CSS missing");
  assert(css.includes("background: #ffffff") || css.includes("background: #f0f0f0"), "light dialogue fill missing");
  assert(css.includes("inset 0 0 0 3px #d4b84a") || css.includes("inset 0 0 0 3px #d8bc6a"), "gold inner border missing");
  assert(view.includes('what: "What?"'), "What? copy preserved");
  assert(view.includes("is evolving!"), "evolving copy preserved");
  assert(view.includes("resultPages"), "stat pages helper missing");
});

test("Presentation stays after authoritative evolve RPC", () => {
  assert(js.includes('playCall("play_evolve"'), "evolve RPC preserved");
  const evolveOnce = js.slice(js.indexOf("async function evolveOnce"));
  assert(evolveOnce.includes('playCall("play_evolve"'), "evolveOnce must call play_evolve");
  assert(evolveOnce.includes("await showEvoFanfare(result"), "fanfare must follow evolve result");
  const rpcIdx = evolveOnce.indexOf('playCall("play_evolve"');
  const fanfareIdx = evolveOnce.indexOf("await showEvoFanfare(result");
  assert(rpcIdx > -1 && fanfareIdx > rpcIdx, "fanfare must run after evolve RPC in evolveOnce");
  assert((evolveOnce.match(/play_evolve/g) || []).length === 1, "must not duplicate evolve RPC");
});

test("Reduced-motion stays non-mutating", () => {
  assert(js.includes("Condensed accessibility path") || js.includes("reduced"), "reduced path missing");
  assert(js.includes('showWhich("from", true)'), "reduced silhouette path missing");
  assert(js.includes("beginResultFlow"), "skip/result still presentation-only");
});

test("Identity fields flow into sprites", () => {
  assert(view.includes("fromFormId") && view.includes("toFormId"), "form ids in result model");
  assert(js.includes("playSpriteUrl(model.fromDex, fromArt, model.fromFormId)"), "from form sprite");
  assert(js.includes("playSpriteUrl(model.toDex, toArt, model.toFormId)"), "to form sprite");
  assert(js.includes("displayVariant"), "gender/shiny display variant used");
});

test("No modern cinematic effects in classic path", () => {
  assert(css.includes(".evo-gba-classic .evo-ring"), "ring suppressed for classic");
  assert(css.includes("display: none !important"), "ring/flash suppressed");
  assert(!js.includes("evo-ring"), "ring element removed from classic markup");
  assert(js.includes("softFlash") || js.includes("is-bright"), "local soft brighten instead of fullscreen spam");
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
