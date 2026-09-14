/* node tests/encounter-stage-tests.js */
globalThis.window = globalThis;
window.playEscapeAttr = (value) => String(value || "")
  .replace(/&/g, "&amp;")
  .replace(/"/g, "&quot;")
  .replace(/</g, "&lt;");
window.playDisplayName = (round) => round?.name || "Pikachu";
window.playEncounterSecondsLeft = () => 6;
window.playPhaseLabel = (phase) => ({
  join: "JOIN",
  prepare: "ITEM",
  throw: "POKÉ BALL",
  reveal: "CATCH ATTEMPT",
  closed: "RESULTS"
})[phase] || "ENCOUNTER";
window.playSpriteUrl = () => "images/pokemon/25.gif";
window.playHabitat = (dex, fallback) => String(fallback || "").trim() || "Kanto";
window.playItemSprite = () => "images/items/pokeball.png";
window.playItemLabel = (key) => key === "ultraball" ? "Ultra Ball" : key === "pokeball" ? "Poké Ball" : key;
window.playArticle = (label) => (/^[aeiou]/i.test(String(label || "")) ? "an " : "a ") + label;
require("../js/location-visuals.js");
require("../js/location-visuals-data.js");
require("../js/hud.js");

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

function wildRound(extra) {
  return {
    id: "r1",
    dex: 25,
    name: "Pikachu",
    phase: "join",
    location: "Viridian Forest",
    gender: "Male",
    participants: 4,
    prepared: 0,
    thrown: 0,
    baitBonusPercent: 0,
    ...extra
  };
}

function catchRound(extra) {
  return wildRound({
    phase: "reveal",
    deadlines: {
      throw: "2026-09-14T00:00:00.000Z",
      reveal: "2026-09-14T00:00:12.000Z"
    },
    ...extra
  });
}

test("catch sequence no longer prints CATCH ATTEMPT on the map", () => {
  const html = window.playCatchSeqHtml(catchRound(), { me: { joined: true, ball: "pokeball" } });
  assert(html.includes("data-catch-seq"), html.slice(0, 80));
  assert(!html.includes("catch-seq-kicker"), "kicker still present");
  assert(!html.includes("CATCH ATTEMPT"), html);
  assert(!html.includes("The Poké Ball is shaking"), html);
});

test("player stage keeps the external CATCH ATTEMPT timer", () => {
  const html = window.playRenderEncounter(catchRound(), { me: { joined: true, ball: "pokeball" }, bar: 40 });
  const stage = html.split('class="phase-wrap')[0];
  assert(!stage.includes("CATCH ATTEMPT"), stage.slice(-400));
  assert(/data-phase-name[^>]*>CATCH ATTEMPT/.test(html), html.match(/data-phase-name[^<]+/)?.[0]);
  assert(html.includes("6s left") || html.includes("data-time-copy"), html);
  assert(html.includes("The Poké Ball is shaking"), html);
});

test("join stage does not repeat the wild appearance line", () => {
  const html = window.playRenderEncounter(wildRound({ name: "Farfetch'd", location: "Seafoam Islands" }), { me: { joined: true } });
  assert(html.includes("encounter-map-scrim"));
  assert(html.includes("encounter-location-chip"));
  assert(html.includes("Seafoam Islands"));
  assert(html.includes("A wild Pokémon appeared!"));
  assert(!html.includes("A wild Farfetch'd appeared!"));
  assert(html.includes("data-stage-status") && html.includes(" hidden"));
  assert(html.includes('data-stats-phase="join"'));
  assert(html.includes('data-stat-label="thrown">Throws'));
});

test("success copy uses a cinematic banner and ball plate, not a second GOTCHA card", () => {
  const round = catchRound({ resolved: true, phase: "closed", results: { caught: 1, escaped: 0, noThrow: 0 }, thrown: 1 });
  const hud = window.playEncounterStageCopy(round, { scene: "results" }, { joined: true, ball: "ultraball", caught: true }, "Pikachu");
  assert(hud.banner === "✨ GOTCHA! ✨", hud.banner);
  assert(/Caught with an Ultra Ball/.test(hud.status), hud.status);
  const fanfare = window.playCatchFanfareHtml(round);
  assert(fanfare.includes("Community results"));
  assert(!/GOTCHA/.test(fanfare), fanfare);
});

test("shiny success and failure use high-contrast HUD copy", () => {
  const shiny = window.playEncounterStageCopy(
    catchRound({ variant: "shiny", resolved: true, phase: "closed" }),
    { scene: "results" },
    { joined: true, ball: "pokeball", caught: true },
    "Pikachu"
  );
  assert(shiny.banner === "✨ SHINY CAUGHT! ✨", shiny.banner);
  const miss = window.playEncounterStageCopy(
    catchRound({ resolved: true, phase: "closed" }),
    { scene: "results" },
    { joined: true, ball: "pokeball", result: "escaped" },
    "Mr. Mime"
  );
  assert(miss.banner === "OH NO!", miss.banner);
  assert(miss.status === "Mr. Mime broke free!", miss.status);
});

test("live HUD patches do not remount the catch sequence", () => {
  assert(!String(window.playFillEncounterStageHud).includes("innerHTML"));
  assert(!String(window.playAdvanceCatchSeq).includes("innerHTML"));
  assert(String(window.playCatchSeqHtml).includes("--seq-elapsed"));
  assert(!String(window.playAdvanceCatchSeq).includes("--seq-elapsed"));
});

test("no mapped location keeps the generic stage and hides the chip", () => {
  const previous = window.playHabitat;
  window.playHabitat = () => "";
  const html = window.playRenderEncounter(wildRound({ location: "" }), {});
  window.playHabitat = previous;
  assert(!html.includes("has-location-bg"), html.match(/encounter-visual-stage[^>]*/)?.[0]);
  assert(!html.includes("encounter-location-chip"));
  assert(html.includes("encounter-stage-status"));
});

const failed = results.filter((row) => !row.passed);
results.forEach((row) => {
  console.log(`${row.passed ? "PASS" : "FAIL"} ${row.name}${row.detail ? ` — ${row.detail}` : ""}`);
});
console.log(`${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
