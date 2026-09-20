/* node tests/oak-lab-ux-tests.js */
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

const html = read("evolve.html");
const js = read("js/evolve.js");
const css = read("css/play.css");
const nav = read("js/nav.js");
const play = read("js/play.js");

test("Lab workbench replaces dashboard hero", () => {
  assert(html.includes("evo-lab-bench"), "workbench class missing");
  assert(html.includes("Professor Oak's Lab"), "lab title missing");
  assert(html.includes("Pokémon Research &amp; Evolution Laboratory") || html.includes("Pokémon Research & Evolution Laboratory"), "lab subtitle missing");
  assert(!html.includes("evo-lab-hero"), "old hero class must be removed");
  assert(!html.includes("evo-lab-control"), "old control header must be removed");
  assert(!/<div id="evo-strip"[^>]*class="evo-strip/.test(html), "KPI strip must leave main composition");
  assert(css.includes("evo-lab-bench"), "workbench CSS missing");
});

test("Professor Oak is the left visual anchor", () => {
  assert(html.includes("evo-lab-oak-stage"), "oak stage missing");
  assert(html.includes("images/trainers/portraits/oak-portrait.png"), "oak portrait missing");
  assert(css.includes(".evo-lab-oak"), "oak CSS missing");
  assert(/\.evo-lab-oak\s*\{[^}]*128px/s.test(css) || css.includes("width: 128px"), "oak desktop size missing");
});

test("Transfer and Evolution are workstation panels", () => {
  assert(html.includes("Transfer Station"), "transfer station missing");
  assert(html.includes("Evolution Research"), "evolution research missing");
  assert(html.includes("evo-station-transfer"), "transfer station class missing");
  assert(html.includes("evo-station-evolve"), "evolve station class missing");
  assert(html.includes("Open Transfer Station"), "transfer CTA missing");
  assert(html.includes("Open Evolution Research"), "evolve CTA missing");
  assert(html.includes('role="tablist"'), "station tablist missing");
  assert(js.includes("is-active"), "active station class missing");
  assert(js.includes("ONLINE"), "station ONLINE state missing");
  assert(html.includes("evo-station-research"), "research station missing");
  assert(html.includes("oak-research-board"), "research board missing");
  assert(js.includes("play_oak_research"), "research RPC missing");
  assert(js.includes("play_claim_oak_research"), "claim RPC missing");
});

test("Counters live in stations / candy resource, not KPI row", () => {
  assert(html.includes("evo-xfer-available"), "transfer available metric missing");
  assert(html.includes("evo-ready-count"), "ready metric missing");
  assert(html.includes("evo-lab-candy-res"), "candy resource chip missing");
  assert(html.includes("evo-done-count"), "evolutions completed metric missing");
  assert(!html.includes(">Ready</small>"), "legacy Ready KPI label must be gone");
  assert(js.includes("xferAvailable"), "xfer available wiring missing");
});

test("Research notes are collapsed by default", () => {
  assert(html.includes("evo-research-notes"), "research notes missing");
  assert(html.includes("<details class=\"evo-research-notes\">"), "details element missing");
  assert(!/<section class="evo-research evo-station-card"/.test(html), "large instruction card must leave main flow");
  assert(html.includes("evo-station-context"), "contextual sentence missing");
  assert(html.includes("Research Notes ▸") || html.includes("Research Notes"), "research notes summary missing");
});

test("Collection toolbar is cohesive", () => {
  assert(html.includes("evo-collection-bar"), "collection bar missing");
  assert(html.includes("Your Collection"), "collection title missing");
  assert(css.includes("evo-send-toolbar"), "send toolbar CSS missing");
  assert(css.includes("max-width: 920px") || css.includes("max-width:920px"), "toolbar max-width missing");
});

test("Oak contextual messages cover transfer and evolution states", () => {
  assert(js.includes("Have any duplicate Pokémon? Send them my way for research!"), "transfer idle missing");
  assert(js.includes("Excellent! These Pokémon are ready for transfer."), "transfer selection missing");
  assert(js.includes("Let's see which Pokémon are ready to evolve!"), "evolution idle missing");
  assert(js.includes("Ah! One of your Pokémon is ready to evolve!"), "evolution ready missing");
  assert(js.includes("Excellent! This research should help us understand its Evolution Line."), "transfer success missing");
  assert(js.includes("Wonderful! Another successful evolution!"), "evolution success missing");
});

test("Collection CTA uses Send N to Oak", () => {
  assert(js.includes("Send ${selectedOak.size} to Oak") || js.includes("Send ${selectedOak.size} to Oak"), "armed CTA missing");
  assert(js.includes("Send 0 to Oak"), "idle CTA missing");
});

test("Station keyboard navigation is supported", () => {
  assert(js.includes("ArrowRight"), "arrow key nav missing");
  assert(js.includes("aria-selected"), "aria-selected missing");
});

test("Tab-return soft refresh avoids global loading flash", () => {
  assert(nav.includes("opts?.soft || opts?.background"), "soft loading gate missing");
  assert(nav.includes("__playAccountNavSig"), "account nav signature missing");
  assert(nav.includes("firstPaint && signedIn"), "notices must not spam on every refresh");
  assert(play.includes("__playSoftRefresh"), "soft refresh flag missing");
  assert(play.includes('requestRefresh("reconnect")'), "visibility reconnect preserved");
  assert(play.includes('dataset.playSoftRefresh'), "soft refresh dataset missing");
  assert(css.includes('html[data-play-soft-refresh="1"] .enc-hud-in'), "soft refresh animation suppress missing");
  assert(js.includes("{ soft: !els.app?.hidden }"), "lab soft load missing");
});

const failed = results.filter((row) => !row.passed);
results.forEach((row) => {
  const mark = row.passed ? "PASS" : "FAIL";
  console.log(`${mark} ${row.name}${row.detail ? ` — ${row.detail}` : ""}`);
});
if (failed.length) {
  console.error(`\n${failed.length} failed`);
  process.exit(1);
}
console.log(`\n${results.length} passed`);
