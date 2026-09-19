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

test("Lab header is compact control header", () => {
  assert(html.includes("evo-lab-control"), "compact control class missing");
  assert(html.includes("Prof. Oak's Lab"), "title missing");
  assert(html.includes("Research. Discover. Evolve."), "tagline missing");
  assert(!html.includes("Help Pokémon grow. Strengthen your team."), "long hero tag should be removed from main flow");
  assert(css.includes("evo-lab-control"), "compact header CSS missing");
});

test("Transfer and Evolution stations are obvious", () => {
  assert(html.includes("Transfer Station"), "transfer station missing");
  assert(html.includes("Evolution Chamber"), "evolution chamber missing");
  assert(html.includes("evo-station-transfer"), "transfer station class missing");
  assert(html.includes("evo-station-evolve"), "evolve station class missing");
  assert(js.includes("is-active"), "active station class missing");
});

test("Research notes are collapsed by default", () => {
  assert(html.includes("evo-research-notes"), "research notes missing");
  assert(html.includes("<details class=\"evo-research-notes\">"), "details element missing");
  assert(!/<section class="evo-research evo-station-card"/.test(html), "large instruction card must leave main flow");
  assert(html.includes("evo-station-context"), "contextual sentence missing");
});

test("Oak contextual messages cover transfer and evolution states", () => {
  assert(js.includes("Have any duplicate Pokémon? Send them my way for research!"), "transfer idle missing");
  assert(js.includes("Excellent! I've marked the Pokémon ready for transfer."), "transfer selection missing");
  assert(js.includes("Let's see which Pokémon are ready to evolve!"), "evolution idle missing");
  assert(js.includes("Ah! It looks like one of your Pokémon is ready!"), "evolution ready missing");
  assert(js.includes("Excellent! This research should help us understand its Evolution Line."), "transfer success missing");
  assert(js.includes("Wonderful! Another successful evolution!"), "evolution success missing");
});

test("Collection CTA uses Send N to Oak", () => {
  assert(js.includes("Send ${selectedOak.size} to Oak") || js.includes("Send ${selectedOak.size} to Oak"), "armed CTA missing");
  assert(js.includes("Send 0 to Oak"), "idle CTA missing");
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
