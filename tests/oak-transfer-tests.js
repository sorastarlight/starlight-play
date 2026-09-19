/* node tests/oak-transfer-tests.js */
globalThis.window = globalThis;
globalThis.document = undefined;

window.playEscapeAttr = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");
window.playSpeciesName = (dex) => ({ 25: "Pikachu", 27: "Sandshrew", 133: "Eevee" }[Number(dex)] || `No.${dex}`);
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

test("evolve page wires oak-transfer after server success path", () => {
  const fs = require("fs");
  const path = require("path");
  const html = fs.readFileSync(path.join(__dirname, "../evolve.html"), "utf8");
  const js = fs.readFileSync(path.join(__dirname, "../js/evolve.js"), "utf8");
  assert(html.includes("js/oak-transfer.js"));
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
