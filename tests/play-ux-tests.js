/* node tests/play-ux-tests.js */
globalThis.window = globalThis;
require("../js/play-ux.js");

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

test("joined state copy is centralized", () => {
  assert(window.PLAY_STATUS.joined.includes("joined the encounter"));
});
test("item lock copy names the item", () => {
  window.playItemLabel = (key) => key === "razz" ? "Razz Berry" : key;
  assert(window.playStatusItem("razz").includes("Razz Berry"));
  assert(window.playStatusItem("razz").includes("Waiting for other Trainers"));
});
test("no-item selection is a valid lock", () => {
  assert(window.playStatusItem("none").includes("No item selected"));
});
test("Honey copy is communal", () => {
  assert(window.playStatusItem("bait").includes("Honey contributed"));
});
test("Honey meter is a compact strip without trainer chips", () => {
  const html = window.playHoneyMeterHtml({
    phase: "prepare",
    honeyContributors: 4,
    honeyParticipants: 10,
    baitBonusPercent: 6,
    honeyTrainers: [{ name: "A" }, { name: "B" }, { name: "C" }, { name: "D" }]
  });
  assert(html.includes("honey-strip"));
  assert(html.includes("4 / 10"));
  assert(html.includes("+6%"));
  assert(!html.includes("<ul"));
  assert(!html.includes("0 / —"));
});
test("Honey join state does not use a broken denominator", () => {
  const html = window.playHoneyMeterHtml({
    phase: "join",
    honeyContributors: 0,
    honeyParticipants: 0,
    baitBonusPercent: 0
  });
  assert(html.includes("No contributions yet"));
  assert(html.includes("is-join-quiet"));
  assert(!html.includes("0 / —"));
});
test("Used summary stays a slim row", () => {
  window.playItemLabel = (key) => key === "razz" ? "Razz Berry" : key === "netball" ? "Net Ball" : key;
  const html = window.playUsedSummaryHtml({ prep: "razz", ball: "netball" }, { baitBonusPercent: 10 });
  assert(html.includes("enc-used-slim"));
  assert(html.includes("Razz Berry"));
  assert(html.includes("Net Ball"));
  assert(html.includes("Honey +10%"));
});
test("Master Ball is categorized as a Poké Ball", () => {
  assert(window.playItemCategory("masterball") === "balls");
});
test("Honey is a community item", () => {
  assert(window.playItemCategory("bait") === "community");
});
test("Thunder Stone is an evolution item", () => {
  assert(window.playItemCategory("thunderstone") === "evolution");
});
test("Evolution items list the Pokémon they evolve", () => {
  const uses = window.playItemUseLines("thunderstone");
  assert(uses.some((row) => row[0] === "Pikachu" && row[1] === "Raichu"));
});
test("Balls sort recommended then specialist then Ultra", () => {
  const rows = window.playSortEncounterBalls([
    { key: "pokeball", name: "Poké Ball" },
    { key: "ultraball", name: "Ultra Ball" },
    { key: "netball", name: "Net Ball", specialist: true },
    { key: "greatball", name: "Great Ball", recommended: true }
  ]);
  assert(rows[0].key === "greatball" && rows[1].key === "netball" && rows[2].key === "ultraball");
});
test("Timer warning is not color-only", () => {
  assert(window.playTimerWarnClass(12) === "");
  assert(window.playTimerWarnClass(9) === "is-warn");
  assert(window.playTimerWarnClass(4) === "is-urgent");
});
test("Phase-closed errors become human copy", () => {
  assert(window.playHumanRpcError({ message: "Items can only be chosen during the item phase." }) === "The phase has already ended.");
});
test("Network errors become reconnecting", () => {
  assert(window.playHumanRpcError({ message: "Failed to fetch" }) === "Reconnecting…");
});
test("Insufficient-item errors stay friendly", () => {
  assert(window.playHumanRpcError({ message: "You have no Ultra Ball left." }).includes("no longer available"));
});
test("Premier preview uses 10 qualifying Balls", () => {
  const n = window.playPremierPreview(
    [{ sku: "poke5", qty: 2 }],
    () => ({ ballKey: "pokeball", qty: 5 })
  );
  assert(n === 1);
});
test("Ledger labels hide internal IDs", () => {
  assert(window.playLedgerLabel("DAILY_SUPPLY") === "Daily Trainer Supply");
  assert(window.playLedgerLabel("STORE_PURCHASE") === "Starlight Mart");
});
test("Mart Ball copy never shows a raw multiplier", () => {
  window.playItemPlayerText = () => "Especially effective against Water- and Bug-type Pokémon.";
  const text = window.playBallShopBlurb("netball");
  assert(!/\d+(\.\d+)?\s*×/.test(text));
  assert(/Water/.test(text));
});
test("Master Ball shop copy is guaranteed, not recommended", () => {
  const text = window.playBallShopBlurb("masterball");
  assert(/Guaranteed/i.test(text));
  assert(!/recommended/i.test(text));
});
test("item cards reserve selected-mark space before selection", () => {
  const idle = window.playEncounterCardHtml({ kind: "prepare", item: "oran", label: "Oran Berry", qty: 3, effect: "Helps with the catch.", selected: false });
  const selected = window.playEncounterCardHtml({ kind: "prepare", item: "oran", label: "Oran Berry", qty: 3, effect: "Helps with the catch.", selected: true });
  assert(idle.includes("enc-selected-mark"), idle);
  assert(selected.includes("enc-selected-mark"), selected);
  assert(idle.includes("enc-card-status"), idle);
  assert(selected.includes("is-selected"), selected);
  assert(!idle.includes("is-selected"), idle);
});

const failed = results.filter((row) => !row.passed);
results.forEach((row) => {
  console.log(`${row.passed ? "PASS" : "FAIL"} ${row.name}${row.detail ? ` — ${row.detail}` : ""}`);
});
console.log(`${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
