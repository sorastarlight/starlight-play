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
  assert(html.includes('data-stat-label="progress">Prepared'));
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

test("waiting wobble does not play the miss flee classes", () => {
  const html = window.playCatchSeqHtml(catchRound({ id: "wait-1", resolved: false, phase: "reveal" }), {
    me: { joined: true, ball: "ultraball" }
  });
  assert(html.includes("is-wobble"), html.match(/catch-seq [^"]*/)?.[0]);
  assert(!/\bis-miss\b/.test(html), html.match(/catch-seq [^"]*/)?.[0]);
  const missHtml = window.playCatchSeqHtml(catchRound({ id: "wait-2", resolved: true, phase: "closed" }), {
    me: { joined: true, ball: "ultraball", result: "Escaped" }
  });
  assert(/\bis-miss\b/.test(missHtml), missHtml.match(/catch-seq [^"]*/)?.[0]);
  assert(/\bis-win\b/.test(window.playCatchSeqHtml(catchRound({ id: "wait-3", resolved: true, phase: "closed" }), {
    me: { joined: true, ball: "ultraball", result: "Caught" }
  })), "caught result should be a win");
});

test("resolved throw without a catch is a breakout", () => {
  const round = catchRound({
    id: "broke-infer",
    resolved: true,
    phase: "closed",
    results: { caught: 0, escaped: 1, noThrow: 0 }
  });
  const me = { joined: true, ball: "ultraball", caught: false };
  const html = window.playCatchSeqHtml(round, { me });
  assert(/\bis-miss\b/.test(html), html.match(/catch-seq [^"]*/)?.[0]);
  const hud = window.playEncounterStageCopy(round, { scene: "results" }, me, "Omanyte");
  assert(hud.banner === "IT BROKE FREE!", hud.banner);
  assert(/broke free/.test(hud.status), hud.status);
});

test("live HUD patches do not remount the catch sequence", () => {
  assert(!String(window.playFillEncounterStageHud).includes("innerHTML"));
  assert(!String(window.playAdvanceCatchSeq).includes("innerHTML"));
  assert(String(window.playCatchSeqHtml).includes("--seq-elapsed"));
  assert(String(window.playAdvanceCatchSeq).includes("--seq-elapsed"));
  assert(String(window.playAdvanceCatchSeq).includes("seqElapsed"));
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

test("join and item patches do not hide the wild sprite", () => {
  const src = String(window.playPatchEncounter);
  assert(src.includes("is-exit"), "missing encounter exit class");
  assert(src.includes("[data-catch-seq]"), "exit hide must check for a catch sequence");
  assert(/hadSeq \|\| visual\.classList\.contains\("is-capture"\)/.test(src), src);
});

test("level chip uses authoritative round.level and hides when missing", () => {
  const withLevel = window.playRenderEncounter(wildRound({ level: 23 }), {});
  const without = window.playRenderEncounter(wildRound({ level: null }), {});
  const zero = window.playRenderEncounter(wildRound({ level: 0 }), {});
  assert(withLevel.includes("encounter-level-chip"), withLevel);
  assert(withLevel.includes("Lv. 23"), withLevel);
  assert(!without.includes("encounter-level-chip"), without);
  assert(!without.includes("Lv. 0"), without);
  assert(!zero.includes("Lv. 0"), zero);
  assert(window.playPokemonLevel({ level: 23 }) === 23);
  assert(window.playPokemonLevel({}) === 0);
});

test("level chip sits in the upper-right metadata cluster", () => {
  const html = window.playRenderEncounter(wildRound({
    level: 11,
    gender: "Male",
    location: "Route 4"
  }), {});
  const beforeMeta = html.split('class="encounter-stage-meta"')[0];
  const afterMetaOpen = html.split('class="encounter-stage-meta"')[1] || "";
  const metaBlock = afterMetaOpen.split('class="encounter-stage-banner"')[0];
  assert(!beforeMeta.includes("encounter-level-chip"), "level chip rendered before metadata cluster");
  assert(metaBlock.includes("encounter-level-chip"), metaBlock);
  assert(metaBlock.includes("encounter-meta-identity"), metaBlock);
  assert(metaBlock.includes("Male"), metaBlock);
  assert(metaBlock.includes("Lv. 11"), metaBlock);
});

test("female shiny stacks identity chips with level", () => {
  const html = window.playRenderEncounter(wildRound({
    level: 23,
    gender: "Female",
    variant: "shiny",
    location: "Cerulean Cave"
  }), {});
  const metaBlock = (html.split('class="encounter-stage-meta"')[1] || "").split('class="encounter-stage-banner"')[0];
  assert(metaBlock.includes("Female"), metaBlock);
  assert(metaBlock.includes("Shiny"), metaBlock);
  assert(metaBlock.includes("Lv. 23"), metaBlock);
});

test("GOTCHA banner stays in stage center, not with the level chip", () => {
  const fs = require("fs");
  const path = require("path");
  const css = fs.readFileSync(path.join(__dirname, "../css/play.css"), "utf8");
  const chip = css.match(/\.encounter-level-chip \{[\s\S]*?\n\}/);
  assert(chip, "missing level chip CSS");
  assert(!/left:\s*50%/.test(chip[0]), chip[0]);
  assert(/\.encounter-stage-banner \{[\s\S]*left:\s*50%/.test(css), "banner is no longer centered");
});

test("wild sprite has no white glow and does not bob after intro", () => {
  const fs = require("fs");
  const path = require("path");
  const css = fs.readFileSync(path.join(__dirname, "../css/play.css"), "utf8");
  const sprite = css.match(/\.encounter-visual-stage \.encounter-actor-frame img\.encounter-stage-actor,[\s\S]*?filter:[^}]+\}/);
  assert(sprite, "missing encounter sprite CSS");
  assert(!/255,\s*255,\s*255/.test(sprite[0]), sprite[0]);
  assert(/animation:\s*none/.test(sprite[0]), sprite[0]);
  assert(css.includes(".encounter-visual-stage.is-exit"), "missing encounter exit hide");
  assert(!/idle-bob 1\.35s ease-in-out \.7s infinite/.test(css), "intro still chains idle-bob");
});

test("late load still shows the settled result scene", () => {
  const html = window.playCatchSeqHtml(catchRound({ id: "late-load", resolved: true, phase: "closed" }), {
    me: { joined: true, ball: "pokeball", result: "Caught" }
  });
  assert(html.includes("is-results"), html.match(/catch-seq [^"]*/)?.[0]);
});

test("stale unresolved snapshot cannot leave the results scene", () => {
  const id = "keep-results";
  const me = { joined: true, ball: "pokeball", result: "Caught" };
  window.playAdvanceCatchSeqState(catchRound({ id, resolved: true, phase: "closed" }), me);
  const st = window.playAdvanceCatchSeqState(catchRound({ id, resolved: false, phase: "reveal" }), me);
  assert(st.scene === "results", st.scene);
});

test("catch animation elapsed follows the throw deadline clock", () => {
  const previous = window.playRoundNowMs;
  window.playRoundNowMs = () => Date.parse("2026-09-14T00:00:02.000Z");
  const ms = window.playCatchSeqElapsedMs(catchRound());
  window.playRoundNowMs = previous;
  assert(ms === 2000, String(ms));
});

const failed = results.filter((row) => !row.passed);
results.forEach((row) => {
  console.log(`${row.passed ? "PASS" : "FAIL"} ${row.name}${row.detail ? ` — ${row.detail}` : ""}`);
});
console.log(`${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
