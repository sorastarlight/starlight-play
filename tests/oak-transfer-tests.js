/* node tests/oak-transfer-tests.js */
globalThis.window = globalThis;
globalThis.document = undefined;

window.playEscapeAttr = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");
window.playSpeciesName = (dex) => ({
  25: "Pikachu",
  27: "Sandshrew",
  111: "Rhyhorn",
  113: "Chansey",
  133: "Eevee"
}[Number(dex)] || `No.${dex}`);
window.playSpriteUrl = (dex, variant, formId) => {
  const bits = [`images/pokemon/${dex}`];
  if (String(variant || "").includes("shiny")) bits.push("shiny");
  if (formId) bits.push(`form-${formId}`);
  return `${bits.join("-")}.gif`;
};
window.playItemSprite = (key) => {
  const m = String(key).match(/^species-(\d+)/);
  if (m) return window.playSpriteUrl(Number(m[1]), "normal");
  if (key === "rarecandy") return "images/items/rare-candy.png";
  return `images/items/${key}.png`;
};

require("../js/oak-transfer.js");
const oak = window.playOakTransfer;

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

const eevee = { id: "a", dex: 133, name: "Eevee", variant: "normal", gender: "male", level: 18 };
const shinyEevee = { id: "b", dex: 133, name: "Eevee", variant: "shiny", gender: "female", formId: null, level: 12 };
const pika = { id: "c", dex: 25, name: "Pikachu", variant: "normal", gender: "female" };
const sand = { id: "d", dex: 27, name: "Sandshrew", variant: "normal", gender: "male" };
const chansey = { id: "e", dex: 113, name: "Chansey", variant: "normal", gender: "female" };
const rhyhorn = { id: "f", dex: 111, name: "Rhyhorn", variant: "normal", gender: "male" };

test("single transfer plan mode", () => {
  const plan = oak.planSequence([{ ok: true, mon: eevee, candyGranted: 1, familyId: 133 }]);
  assert(plan.mode === "single");
  assert(plan.count === 1);
});

test("batch transfer plan mode", () => {
  const plan = oak.planSequence([
    { ok: true, mon: eevee, candyGranted: 1, familyId: 133 },
    { ok: true, mon: pika, candyGranted: 1, familyId: 25 }
  ]);
  assert(plan.mode === "batch");
  assert(plan.count === 2);
});

test("failed results are excluded from presentation plan", () => {
  const plan = oak.planSequence([
    { ok: false, mon: eevee },
    { ok: true, mon: pika, candyGranted: 1, familyId: 25 }
  ]);
  assert(plan.count === 1);
  assert(plan.results[0].mon.dex === 25);
});

test("reward summary uses authoritative candy amounts by family", () => {
  const summary = oak.rewardSummary([
    { ok: true, mon: eevee, candyGranted: 1, familyId: 133 },
    { ok: true, mon: shinyEevee, candyGranted: 2, familyId: 133 },
    { ok: true, mon: pika, candyGranted: 1, familyId: 25 }
  ], [{ familyId: 133, name: "Eevee" }, { familyId: 25, name: "Pikachu" }]);
  const eeveeRow = summary.find((row) => row.familyId === 133);
  const pikaRow = summary.find((row) => row.familyId === 25);
  assert(eeveeRow.qty === 3, `eevee qty ${eeveeRow?.qty}`);
  assert(pikaRow.qty === 1);
  assert(eeveeRow.label.includes("Eevee"));
  assert(!eeveeRow.art.includes("rare-candy"));
});

test("Pikachu and Sandshrew candy stay on separate lines", () => {
  const summary = oak.rewardSummary([
    { ok: true, mon: pika, candyGranted: 1, familyId: 25 },
    { ok: true, mon: sand, candyGranted: 1, familyId: 27 }
  ]);
  assert(summary.length === 2);
  assert(summary.every((row) => row.familyId === 25 || row.familyId === 27));
  assert(!summary.some((row) => row.familyId === 25 && row.label.includes("Sandshrew")));
});

test("Chansey transfer never displays Rhyhorn candy", () => {
  const summary = oak.rewardSummary([
    {
      ok: true,
      mon: chansey,
      candyGranted: 1,
      familyId: 113,
      candyBaseDex: 113,
      candyName: "Chansey Evolution Candy"
    }
  ]);
  assert(summary.length === 1);
  assert(summary[0].familyId === 113);
  assert(summary[0].candyBaseDex === 113);
  assert(summary[0].label === "Chansey Evolution Candy");
  assert(summary[0].art.includes("/113") || summary[0].art.includes("113"));
  assert(!/Rhyhorn/i.test(summary[0].label));
  assert(!summary[0].art.includes("111"));
});

test("Rhyhorn transfer never displays Chansey candy", () => {
  const summary = oak.rewardSummary([
    {
      ok: true,
      mon: rhyhorn,
      candyGranted: 1,
      familyId: 111,
      candyBaseDex: 111,
      candyName: "Rhyhorn Evolution Candy"
    }
  ]);
  assert(summary.length === 1);
  assert(summary[0].familyId === 111);
  assert(summary[0].candyBaseDex === 111);
  assert(summary[0].label === "Rhyhorn Evolution Candy");
  assert(summary[0].art.includes("111"));
  assert(!/Chansey/i.test(summary[0].label));
  assert(!summary[0].art.includes("113"));
});

test("candyArt prefers candyBaseDex over mismatched familyId", () => {
  const art = oak.candyArt(
    { familyId: 999, candyBaseDex: 113, candyName: "Chansey Evolution Candy" },
    [{ familyId: 999, name: "Wrong", baseDex: 999 }]
  );
  assert(art.includes("113"), `expected sprite 113 got ${art}`);
  assert(!art.includes("999"), `must not use blind familyId as dex: ${art}`);
});

test("batch aggregation keeps Chansey and Rhyhorn families separate", () => {
  const summary = oak.rewardSummary([
    {
      ok: true,
      mon: chansey,
      candyGranted: 1,
      familyId: 113,
      candyBaseDex: 113,
      candyName: "Chansey Evolution Candy"
    },
    {
      ok: true,
      mon: rhyhorn,
      candyGranted: 2,
      familyId: 111,
      candyBaseDex: 111,
      candyName: "Rhyhorn Evolution Candy"
    },
    {
      ok: true,
      mon: { id: "g", dex: 113, name: "Chansey", variant: "normal" },
      candyGranted: 1,
      familyId: 113,
      candyBaseDex: 113,
      candyName: "Chansey Evolution Candy"
    }
  ]);
  assert(summary.length === 2, `expected 2 families got ${summary.length}`);
  const ch = summary.find((row) => row.familyId === 113);
  const rh = summary.find((row) => row.familyId === 111);
  assert(ch && ch.qty === 2 && ch.label.includes("Chansey") && !ch.label.includes("Rhyhorn"));
  assert(rh && rh.qty === 2 && rh.label.includes("Rhyhorn") && !rh.label.includes("Chansey"));
  assert(ch.art.includes("113") && !ch.art.includes("111"));
  assert(rh.art.includes("111") && !rh.art.includes("113"));
});

test("familyId is not used as dex when candyBaseDex is present", () => {
  const label = oak.candyLabel(
    { familyId: 111, candyBaseDex: 113, candyName: "Chansey Evolution Candy" },
    [{ familyId: 111, name: "Rhyhorn", baseDex: 111 }]
  );
  const art = oak.candyArt(
    { familyId: 111, candyBaseDex: 113, candyName: "Chansey Evolution Candy" },
    [{ familyId: 111, name: "Rhyhorn", baseDex: 111 }]
  );
  assert(label === "Chansey Evolution Candy");
  assert(!/Rhyhorn/i.test(label));
  assert(art.includes("113"));
  assert(!art.includes("111"));
});

test("confirm model never invents candy totals", () => {
  const model = oak.confirmModel([eevee]);
  assert(model.count === 1);
  assert(!/×\d/.test(model.rewardHint));
  assert(/Evolution Candy/i.test(model.rewardHint));
});

test("sprite identity includes shiny and form when present", () => {
  const url = oak.spriteUrl(shinyEevee);
  assert(url.includes("133"));
  assert(url.includes("shiny"));
  const formUrl = oak.spriteUrl({ dex: 25, variant: "normal", formId: 10080, name: "Pikachu" });
  assert(formUrl.includes("form-10080"));
});

test("animation helpers cannot grant candy or delete catches", () => {
  const src = require("fs").readFileSync(require("path").join(__dirname, "../js/oak-transfer.js"), "utf8");
  assert(!/\.rpc\s*\(\s*['\"]play_transfer_oak/.test(src));
  assert(!/grant_family_candy/.test(src));
  assert(!/transferred_at\s*=/.test(src));
  assert(/Presentation only/.test(src));
  assert(/Never grants candy/.test(src));
});

test("local Oak and Poké Ball assets configured", () => {
  assert(oak.OAK_SPRITE === "images/trainers/oak.png");
  assert(oak.BALL_SPRITE === "images/items/poke-ball.png");
  const fs = require("fs");
  const path = require("path");
  assert(fs.existsSync(path.join(__dirname, "..", oak.OAK_SPRITE)));
  assert(fs.existsSync(path.join(__dirname, "..", oak.BALL_SPRITE)));
  assert(fs.existsSync(path.join(__dirname, "..", "images/items/rare-candy.png")));
});

test("Game Boy markup helpers expose A/B screens and link cable", () => {
  const html = oak.gameboyHtml({
    side: "player",
    art: "images/pokemon/133.gif",
    name: "Eevee",
    caption: "Eevee ♂",
    empty: false
  });
  assert(html.includes("oak-gameboy"));
  assert(html.includes("oak-gameboy-screen"));
  assert(html.includes("images/pokemon/133.gif"));
  assert(html.includes("Eevee"));
  const empty = oak.gameboyHtml({ side: "oak", empty: true });
  assert(empty.includes("is-standby") || empty.includes("READY"));
});

test("stage order covers prepare → link → travel → arrive → oak → reward", () => {
  const stages = oak.stageOrder({ mode: "single", reduced: false });
  assert(stages[0] === "prepare");
  assert(stages.includes("link"));
  assert(stages.includes("transfer"));
  assert(stages.includes("arrive"));
  assert(stages.includes("oak"));
  assert(stages[stages.length - 1] === "reward");
  const reduced = oak.stageOrder({ mode: "single", reduced: true });
  assert(reduced.includes("prepare") && reduced.includes("arrive") && reduced.includes("reward"));
  assert(!reduced.includes("transfer"));
});

test("shiny and gender captions preserve identity", () => {
  assert(oak.isShiny(shinyEevee));
  assert(oak.genderMark("female") === "♀");
  assert(oak.genderMark("male") === "♂");
  const cap = oak.monCaption(shinyEevee);
  assert(cap.includes("Eevee"));
  assert(cap.includes("✨") || /shiny/i.test(cap) || cap.includes("♀"));
});

test("sprite identity includes form id for alternate forms", () => {
  const formUrl = oak.spriteUrl({ dex: 25, variant: "shiny", formId: 10080, name: "Pikachu", gender: "female" });
  assert(formUrl.includes("25"));
  assert(formUrl.includes("shiny"));
  assert(formUrl.includes("form-10080"));
});

test("presentation source builds Game Boy shells and Pokémon token travel", () => {
  const src = require("fs").readFileSync(require("path").join(__dirname, "../js/oak-transfer.js"), "utf8");
  assert(src.includes("oak-gameboy"));
  assert(src.includes("oak-link-cable"));
  assert(src.includes("oak-transfer-token"));
  assert(src.includes("data-oak-screen-player"));
  assert(src.includes("data-oak-screen-oak"));
  assert(src.includes("is-standby"));
  assert(!/rgba\(12,\s*14,\s*18/.test(src));
});

test("evolve page wires oak-transfer after server success path", () => {
  const fs = require("fs");
  const path = require("path");
  const html = fs.readFileSync(path.join(__dirname, "../evolve.html"), "utf8");
  const js = fs.readFileSync(path.join(__dirname, "../js/evolve.js"), "utf8");
  assert(html.includes("js/oak-transfer.js"));
  assert(html.includes("Transfer Station") || html.includes("evo-lab-stations"));
  assert(js.includes("play_transfer_oak"));
  assert(js.includes("playOakTransfer.runSequence"));
  assert(js.indexOf("play_transfer_oak") < js.indexOf("runSequence"));
});

const failed = results.filter((r) => !r.passed);
for (const r of results) {
  console.log(`${r.passed ? "PASS" : "FAIL"} ${r.name}${r.detail ? " — " + r.detail : ""}`);
}
console.log(`${results.length - failed.length}/${results.length} passed`);
if (failed.length) process.exit(1);
