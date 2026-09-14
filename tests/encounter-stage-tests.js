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
  assert(fanfare.includes("Community result"));
  assert(!/GOTCHA/.test(fanfare), fanfare);
});

test("shiny success and failure use high-contrast HUD copy", () => {
  const shiny = window.playEncounterStageCopy(
    catchRound({ variant: "shiny", resolved: true, phase: "closed" }),
    { scene: "results" },
    { joined: true, ball: "pokeball", caught: true },
    "Pikachu"
  );
  assert(shiny.banner === "✨ GOTCHA! ✨", shiny.banner);
  assert(/SHINY CAUGHT/.test(shiny.status), shiny.status);
  const miss = window.playEncounterStageCopy(
    catchRound({ resolved: true, phase: "closed" }),
    { scene: "results" },
    { joined: true, ball: "pokeball", result: "escaped" },
    "Mr. Mime"
  );
  assert(miss.banner === "IT BROKE FREE!", miss.banner);
  assert(miss.status === "Mr. Mime broke free!", miss.status);
});

test("personal success is not shown as a breakout", () => {
  const caughtByResult = window.playEncounterStageCopy(
    catchRound({ resolved: true, phase: "closed", catchers: [{ name: "Twinklephoenixstar" }] }),
    { scene: "results" },
    { joined: true, ball: "ultraball", result: "Caught" },
    "Jolteon"
  );
  assert(caughtByResult.banner === "✨ GOTCHA! ✨", caughtByResult.banner);
  const waiting = window.playEncounterStageCopy(
    catchRound({ resolved: true, phase: "closed" }),
    { scene: "results" },
    { joined: true, ball: "ultraball" },
    "Jolteon"
  );
  assert(waiting.banner === "", waiting.banner);
  assert(/Waiting for the result/.test(waiting.status), waiting.status);
  window._playTrainerName = "Twinklephoenixstar";
  const listed = window.playEncounterStageCopy(
    catchRound({ resolved: true, phase: "closed", catchers: [{ name: "Twinklephoenixstar" }] }),
    { scene: "results" },
    { joined: true, ball: "greatball", caught: false },
    "Jolteon"
  );
  window._playTrainerName = "";
  assert(listed.banner === "✨ GOTCHA! ✨", listed.banner);
  const master = window.playEncounterStageCopy(
    catchRound({ resolved: true, phase: "closed" }),
    { scene: "results" },
    { joined: true, ball: "masterball" },
    "Jolteon"
  );
  assert(master.banner === "✨ GOTCHA! ✨", master.banner);
});

test("waiting results do not play the miss flee classes", () => {
  const html = window.playCatchSeqHtml(catchRound({ id: "wait-1", resolved: true, phase: "closed" }), {
    me: { joined: true, ball: "ultraball" }
  });
  assert(html.includes("is-results"), html.match(/catch-seq [^"]*/)?.[0]);
  assert(!/\bis-miss\b/.test(html), html.match(/catch-seq [^"]*/)?.[0]);
  const missHtml = window.playCatchSeqHtml(catchRound({ id: "wait-2", resolved: true, phase: "closed" }), {
    me: { joined: true, ball: "ultraball", result: "Escaped" }
  });
  assert(/\bis-miss\b/.test(missHtml), missHtml.match(/catch-seq [^"]*/)?.[0]);
  assert(/\bis-win\b/.test(window.playCatchSeqHtml(catchRound({ id: "wait-3", resolved: true, phase: "closed" }), {
    me: { joined: true, ball: "ultraball", result: "Caught" }
  })), "caught result should be a win");
});

test("live HUD patches do not remount the catch sequence", () => {
  assert(!String(window.playFillEncounterStageHud).includes("innerHTML"));
  assert(!String(window.playAdvanceCatchSeq).includes("innerHTML"));
  assert(String(window.playCatchSeqHtml).includes("--seq-elapsed"));
  assert(!String(window.playAdvanceCatchSeq).includes("--seq-elapsed"));
});

test("join stage uses a shared centered actor frame", () => {
  const html = window.playRenderEncounter(wildRound({ name: "Ekans", location: "Route 4", gender: "Female" }), {});
  assert(html.includes("encounter-actor-frame"), html.slice(html.indexOf("dex-stage"), html.indexOf("dex-stage") + 280));
  assert(html.includes("encounter-stage-actor"), "missing actor class");
  const sizing = window.playEncounterSpriteSizing();
  assert(sizing.height === "46%", JSON.stringify(sizing));
  assert(window.playEncounterSpriteSizing("success").height === "52%", "win scale");
});

test("admin/staff preview uses the same catch sequence as Play", () => {
  const html = window.playRenderEncounter(catchRound({ throwers: [{ name: "Ash", ball: "greatball" }] }), { staff: true });
  assert(html.includes("data-catch-seq"), "staff preview missing catch seq");
  assert(html.includes("is-monitor"), html.match(/catch-seq[^"]*/)?.[0]);
  assert(html.includes("staff-round"), "missing staff panel");
  assert(!/GOTCHA/.test(html.split("staff-round")[0]), "staff visual leaked GOTCHA");
});

test("breakout uses the shared actor frame instead of leftover catch offsets", () => {
  const html = window.playCatchSeqHtml(catchRound({ resolved: true, phase: "closed" }), { me: { joined: true, ball: "pokeball", result: "escaped" } });
  assert(html.includes("encounter-actor-frame is-catch-mon"), html);
  assert(html.includes("catch-seq-mon"), html);
});

test("empty location falls back to the generic Kanto stage", () => {
  const previous = window.playHabitat;
  window.playHabitat = () => "";
  const html = window.playRenderEncounter(wildRound({ location: "" }), {});
  window.playHabitat = previous;
  assert(html.includes("has-location-bg"), html.match(/encounter-visual-stage[^>]*/)?.[0]);
  assert(html.includes('data-location-key="kanto"'), html.match(/encounter-visual-stage[^>]*/)?.[0]);
  assert(html.includes("images/encounters/locations/frlg/kanto.png"), html);
});

test("no-throw results do not fabricate a personal failure banner", () => {
  const hud = window.playEncounterStageCopy(
    catchRound({ id: "r-nothrow", resolved: true, phase: "closed" }),
    { scene: "results" },
    { joined: true },
    "Ekans"
  );
  assert(hud.banner === "", hud.banner);
  assert(/No Poké Ball was thrown/.test(hud.status), hud.status);
});

test("spectators watch the catch without personal GOTCHA copy", () => {
  const hud = window.playEncounterStageCopy(
    catchRound({ id: "r-watch", phase: "reveal" }),
    { scene: "wobble" },
    null,
    "Ekans"
  );
  assert(hud.showBanner === false, JSON.stringify(hud));
  assert(/Watching the encounter/.test(hud.status), hud.status);
});

test("community result waits for the personal results scene", () => {
  const round = catchRound({ id: "r-fanfare", resolved: true, phase: "closed", results: { caught: 2, escaped: 3, noThrow: 1 } });
  assert(window.playCommunityResultReady(round, { joined: true, ball: "pokeball", result: "escaped" }));
  const html = window.playCatchFanfareHtml(round);
  assert(html.includes("2"));
  assert(html.includes("escaped"));
  assert(!/GOTCHA/.test(html));
});

test("live patches can inject the catch sequence without remounting the map", () => {
  assert(String(window.playPatchEncounter).includes("insertAdjacentHTML"));
  assert(String(window.playPatchEncounter).includes("data-enc-head-copy"));
});

const failed = results.filter((row) => !row.passed);
results.forEach((row) => {
  console.log(`${row.passed ? "PASS" : "FAIL"} ${row.name}${row.detail ? ` — ${row.detail}` : ""}`);
});
console.log(`${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
