/* node tests/play-present-tests.js */
globalThis.window = globalThis;
const store = {};
globalThis.sessionStorage = {
  getItem(key) { return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; },
  setItem(key, value) { store[key] = String(value); },
  removeItem(key) { delete store[key]; }
};
globalThis.localStorage = {
  getItem() { return null; },
  setItem() {}
};
globalThis.matchMedia = () => ({ matches: false });
const body = { classList: { add() {}, remove() {}, toggle() {} }, append(el) { this.child = el; }, dataset: {} };
const nodes = {};
globalThis.document = {
  body,
  getElementById(id) { return nodes[id] || null; },
  createElement(tag) {
    const el = {
      tagName: String(tag).toUpperCase(),
      className: "",
      hidden: false,
      innerHTML: "",
      children: [],
      dataset: {},
      style: {},
      isConnected: true,
      textContent: "",
      setAttribute() {},
      getAttribute() { return ""; },
      append(child) { this.children.push(child); },
      querySelector() { return { addEventListener() {}, focus() {}, hidden: false, style: {}, classList: { add() {}, remove() {} }, textContent: "", dataset: {} }; },
      querySelectorAll() { return []; },
      addEventListener() {},
      remove() {},
      focus() {},
      classList: { add() {}, remove() {}, toggle() {} }
    };
    return el;
  },
  addEventListener() {},
  removeEventListener() {},
  activeElement: null
};
globalThis.window.playEscapeAttr = (value) => String(value || "")
  .replace(/&/g, "&amp;")
  .replace(/"/g, "&quot;")
  .replace(/</g, "&lt;");
globalThis.window.playSpeciesName = (dex) => ({ 25: "Pikachu", 6: "Charizard" }[Number(dex)] || `No. ${dex}`);
globalThis.window.playSpriteVariant = (dex, gender, shiny) => {
  if (shiny) return "shiny";
  if (gender === "Female") return "normal";
  return "normal";
};
globalThis.window.playSpriteUrl = (dex, variant) => `images/pokemon/${variant === "shiny" ? "shiny/" : ""}${dex}.gif`;
globalThis.window.playItemLabel = (key) => key === "ultraball" ? "Ultra Ball" : String(key || "Item");
globalThis.window.playPerfMode = () => "balanced";
globalThis.window.playPerfReduced = () => false;
globalThis.window.playToast = function playToast() {};
globalThis.window.playHumanRpcError = function playHumanRpcError(error, fallback) {
  return error?.message || fallback || "That action did not work.";
};

require("../js/play-present.js");

const results = [];
function test(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => results.push({ name, passed: true }))
    .catch((error) => results.push({ name, passed: false, detail: error.message }));
}
function assert(cond, detail) {
  if (!cond) throw new Error(detail || "failed");
}

async function run() {
  await test("normalizes notices without storing variant=female", () => {
    const event = window.playPresentNormalize({
      id: "n1",
      kind: "pokedex",
      title: "New Pokédex Entry!",
      body: "Ivysaur",
      payload: { species: 2, variant: "normal", gender: "Female" }
    });
    assert(event.type === "pokedex", event.type);
    assert(event.tier === "moment", event.tier);
    assert(event.variant === "normal", event.variant);
    assert(event.gender === "Female", event.gender);
  });

  await test("queue order is pokedex, level, achievement, then summary", async () => {
    window.playPresentReset(true);
    window.playPresentSetEnv({ instant: true });
    const queued = window.playPresentEnqueue([
      { id: "a", kind: "achievement", title: "Achievement unlocked", body: "Shocking Discovery" },
      { id: "x", kind: "xp", title: "+25 XP", body: "Trainer XP" },
      { id: "p", kind: "pokedex", title: "New Pokédex Entry!", payload: { species: 25, variant: "normal" } },
      { id: "l", kind: "level", title: "Trainer Level Up!", payload: { from: 24, to: 25 } }
    ], { source: "capture", caughtName: "Pikachu" });
    const types = queued.map((row) => row.type);
    assert(types[0] === "pokedex", JSON.stringify(types));
    assert(types[1] === "level", JSON.stringify(types));
    assert(types[2] === "achievement", JSON.stringify(types));
    assert(types[types.length - 1] === "summary", JSON.stringify(types));
    await window.playPresentFlush();
    const presented = window.playPresentSnapshot().presented.filter((row) => row.as !== "toast" && row.tier !== "toast").map((row) => row.type);
    assert(presented[0] === "pokedex", JSON.stringify(presented));
    assert(window.playPresentSnapshot().presented.some((row) => row.type === "xp" || row.as === "toast"), "toasts should still present");
  });

  await test("duplicate presentation is suppressed", async () => {
    window.playPresentReset(true);
    window.playPresentSetEnv({ instant: true });
    const first = window.playPresentEnqueue([
      { id: "dex-25", kind: "pokedex", title: "New Pokédex Entry!", payload: { species: 25 } }
    ], { noSummary: true });
    const second = window.playPresentEnqueue([
      { id: "dex-25", kind: "pokedex", title: "New Pokédex Entry!", payload: { species: 25 } }
    ], { noSummary: true });
    assert(first.length === 1, String(first.length));
    assert(second.length === 0, String(second.length));
    await window.playPresentFlush();
  });

  await test("same-batch duplicates collapse", () => {
    const rows = window.playPresentCollapse([
      window.playPresentNormalize({ id: "1", kind: "pokedex", payload: { species: 25, shiny: true } }),
      window.playPresentNormalize({ id: "2", kind: "pokedex", payload: { species: 25, shiny: true } })
    ]);
    assert(rows.length === 1, String(rows.length));
  });

  await test("toasts are non-blocking and stack with a moment in the same batch", async () => {
    window.playPresentReset(true);
    window.playPresentSetEnv({ instant: true });
    const queued = window.playPresentEnqueue([
      { id: "p2", kind: "pokedex", payload: { species: 6 } },
      { id: "xp1", type: "xp", title: "+5 XP" },
      { id: "xp2", type: "xp", title: "+1 Evolution Candy" }
    ], { noSummary: true });
    const toasts = queued.filter((row) => row.tier === "toast");
    const moments = queued.filter((row) => row.tier === "moment");
    assert(toasts.length >= 2, JSON.stringify(queued.map((row) => row.tier)));
    assert(moments.length === 1, String(moments.length));
    await window.playPresentFlush();
  });

  await test("major presentations serialize one at a time", async () => {
    window.playPresentReset(true);
    window.playPresentSetEnv({ instant: true });
    window.playPresentEnqueue([
      { id: "m1", type: "pokedex", payload: { species: 25 } },
      { id: "m2", type: "level", payload: { from: 1, to: 2 } },
      { id: "m3", type: "achievement", subtitle: "Shocking Discovery" }
    ], { noSummary: true });
    await window.playPresentFlush();
    const snap = window.playPresentSnapshot();
    assert(snap.blocking.length === 0, JSON.stringify(snap.blocking));
    assert(snap.presented.filter((row) => row.tier !== "toast").length >= 3, JSON.stringify(snap.presented));
    assert(snap.running === false);
  });

  await test("evolution source suppresses duplicate evolution / pokedex when asked", async () => {
    window.playPresentReset(true);
    window.playPresentSetEnv({ instant: true });
    const queued = window.playPresentEnqueue([
      { id: "e1", kind: "evolution", title: "Congratulations!", body: "Your Ivysaur evolved into Venusaur!" },
      { id: "d1", kind: "pokedex", payload: { species: 3 } },
      { id: "a1", kind: "achievement", body: "Evolution Expert" }
    ], { source: "evolution", suppressKinds: ["evolution"], suppressTypes: ["pokedex"], noSummary: true });
    assert(queued.every((row) => row.type !== "evolution" && row.type !== "pokedex"), JSON.stringify(queued));
    assert(queued.some((row) => row.type === "achievement"), JSON.stringify(queued));
    await window.playPresentFlush();
  });

  await test("reduced motion still renders reward data", async () => {
    window.playPresentReset(true);
    window.playPresentSetEnv({ instant: true, reducedMotion: true, perf: "low" });
    const queued = window.playPresentEnqueue([
      { id: "rm1", type: "pokedex", species: 25, variant: "shiny", rewards: [{ type: "xp", amount: 25 }] }
    ], { noSummary: true, preview: true });
    await window.playPresentFlush();
    assert(queued[0].shiny === true);
    assert(queued[0].rewards[0].amount === 25);
    assert(window.playPresentSnapshot().presented.length >= 1);
  });

  await test("LOW performance keeps the same information", async () => {
    window.playPresentReset(true);
    window.playPresentSetEnv({ instant: true, perf: "low" });
    const queued = window.playPresentEnqueue([
      { id: "low1", type: "level", from: 24, to: 25, payload: { from: 24, to: 25 } }
    ], { noSummary: true, preview: true });
    await window.playPresentFlush();
    assert(queued[0].from === 24 && queued[0].to === 25);
  });

  await test("error rendering uses friendly copy", () => {
    const body = window.playPresentError({ message: "Not enough PokéCoins." }, "Purchase failed.");
    assert(body.includes("PokéCoins") || body.includes("enough"), body);
  });

  await test("unlock notices collapse and stay cards", () => {
    const rows = window.playPresentCollapse([
      window.playPresentNormalize({ id: "u1", kind: "unlock", payload: { cosmeticId: "bg-starlight", kind: "background", name: "Starlight Sky" } }),
      window.playPresentNormalize({ id: "u2", kind: "unlock", payload: { cosmeticId: "bg-starlight", kind: "background", name: "Starlight Sky" } })
    ]);
    assert(rows.length === 1, String(rows.length));
    assert(rows[0].type === "unlock");
    assert(rows[0].tier === "card");
  });

  await test("title and frame lab previews exist", () => {
    assert(window.playPresentPreviews.includes("title"), JSON.stringify(window.playPresentPreviews));
    assert(window.playPresentPreviews.includes("frame"), JSON.stringify(window.playPresentPreviews));
    assert(window.playPresentPreviews.includes("badge"));
    assert(window.playPresentPreviews.includes("avatar"));
    assert(window.playPresentPreviews.includes("background"));
  });

  await test("lab unlock preview does not persist seen ids", async () => {
    window.playPresentReset(true);
    window.playPresentSetEnv({ instant: true });
    window.playPresentPreview("frame");
    await window.playPresentFlush();
    assert(window.playPresentHasSeen("lab:frame") === false);
  });

  await test("lab previews never persist seen ids", async () => {
    window.playPresentReset(true);
    window.playPresentSetEnv({ instant: true });
    window.playPresentPreview("pokedex", { species: 25, variant: "shiny" });
    await window.playPresentFlush();
    assert(window.playPresentHasSeen("lab:pokedex") === false);
    window.playPresentPreview("pokedex", { species: 25, variant: "shiny" });
    await window.playPresentFlush();
    assert(window.playPresentSnapshot().presented.filter((row) => row.id === "lab:pokedex").length >= 1);
  });

  await test("capture shiny uses authoritative variant", () => {
    const event = window.playPresentNormalize({
      id: "s1",
      kind: "pokedex",
      payload: { species: 25, variant: "shiny", gender: "Male" }
    });
    assert(event.shiny === true);
    assert(event.variant.includes("shiny"));
    assert(event.title.includes("SHINY") || event.shiny);
  });

  await test("legendary registered ranks after pokedex and is a moment", () => {
    const dex = window.playPresentNormalize({ id: "d1", type: "pokedex", species: 144 });
    const legend = window.playPresentNormalize({
      id: "l1",
      type: "legendary",
      kind: "legendary-registered",
      species: 144,
      title: "LEGENDARY REGISTERED"
    });
    assert(legend.tier === "moment", legend.tier);
    assert(window.playPresentRank(legend) > window.playPresentRank(dex), "legendary should follow GOTCHA/pokedex");
  });

  await test("support thank-you ranks after capture and evolution", () => {
    const support = window.playPresentNormalize({
      id: "sup1",
      kind: "support",
      title: "THANK YOU! ★",
      body: "Adventure Pack added to your bag.",
      payload: { type: "support", name: "Adventure Pack", bits: 200, grants: { greatball: 10, bait: 2 } }
    });
    const evo = window.playPresentNormalize({ id: "evo1", kind: "evolution", title: "Congratulations!" });
    const dex = window.playPresentNormalize({ id: "dex1", kind: "pokedex", payload: { species: 25 } });
    assert(support.type === "support", support.type);
    assert(support.tier === "card", support.tier);
    assert(window.playPresentRank(support) > window.playPresentRank(evo), "support should wait for evolution");
    assert(window.playPresentRank(support) > window.playPresentRank(dex), "support should wait for capture");
    assert(support.rewards.some((row) => row.type === "greatball" && row.amount === 10), JSON.stringify(support.rewards));
  });

  await test("support becomes a toast while an encounter is live", () => {
    window.PLAY_ROUND = { phase: "items", resolved: false, cancelled: false };
    const event = window.playPresentNormalize({
      id: "sup-live",
      kind: "support",
      payload: { name: "Starter Pack", bits: 100, grants: { pokeball: 8 } }
    });
    assert(event.tier === "toast", event.tier);
    window.PLAY_ROUND = null;
  });

  const failed = results.filter((row) => !row.passed);
  console.log(`play-present tests: ${results.filter((row) => row.passed).length} passed, ${failed.length} failed`);
  failed.forEach((row) => console.log(`  FAIL ${row.name}: ${row.detail}`));
  if (failed.length) process.exit(1);
}

run();
