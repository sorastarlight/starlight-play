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
  assert(window.playHumanRpcError({ message: "Items can only be chosen during the item phase." }) === "That phase just ended. Nothing was used.");
  assert(window.playHumanRpcError({ message: "That phase has ended." }) === "That phase just ended. Nothing was used.");
});
test("Network errors become reconnecting", () => {
  assert(window.playHumanRpcError({ message: "Failed to fetch" }) === "Reconnecting…");
});
test("Insufficient-item errors stay friendly", () => {
  assert(window.playHumanRpcError({ message: "You have no Ultra Ball left." }).includes("no longer available"));
});
test("internal bridge errors stay player-safe", () => {
  const message = window.playHumanRpcError({ message: "Issue a Mix It Up bridge token in the staff hub, then run the bridge on the stream PC." });
  assert(message === window.PLAY_STATUS.saveFailed, message);
  assert(!/token/i.test(message), message);
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
  const pending = window.playEncounterCardHtml({ kind: "prepare", item: "oran", label: "Oran Berry", qty: 3, effect: "Helps with the catch.", selected: true, pending: true });
  assert(idle.includes("enc-selected-mark"), idle);
  assert(selected.includes("enc-selected-mark"), selected);
  assert(idle.includes("enc-card-status"), idle);
  assert(selected.includes("is-selected"), selected);
  assert(!idle.includes("is-selected"), idle);
  assert(idle.includes("aria-pressed=\"false\""), idle);
  assert(pending.includes("SELECTING"), pending);
  assert(pending.includes("aria-busy=\"true\""), pending);
  assert(!idle.includes("<button") || idle.indexOf("<button") === idle.lastIndexOf("<button"), idle);
});
test("ball cards use fixed icon/name/count/rating regions", () => {
  const names = ["Premier Ball", "Friend Ball", "Quick Ball", "Cherish Ball", "Luxury Ball", "Hisui Poké Ball", "Ultra Ball", "Master Ball"];
  names.forEach((label) => {
    const html = window.playEncounterCardHtml({
      kind: "throw",
      item: label.toLowerCase().replace(/[^a-z]/g, ""),
      label,
      qty: label === "Ultra Ball" ? 77 : 1,
      effectiveness: label === "Master Ball" ? "GUARANTEED" : "GREAT",
      selected: false
    });
    assert(html.includes("ball-icon"), html);
    assert(html.includes("ball-name"), html);
    assert(html.includes("ball-count"), html);
    assert(html.includes("ball-rating"), html);
    assert(html.includes("enc-ball-card"), html);
    assert(!html.includes("<button") || html.indexOf("<button") === html.lastIndexOf("<button"), html);
  });
  const selected = window.playEncounterCardHtml({ kind: "throw", item: "ultraball", label: "Ultra Ball", qty: 77, effectiveness: "GREAT", selected: true });
  assert(selected.includes("✓ READY"), selected);
  assert(!selected.includes("GREAT") || selected.includes("✓ READY"), selected);
  const idle = window.playEncounterCardHtml({ kind: "throw", item: "ultraball", label: "Ultra Ball", qty: 108, effectiveness: "GREAT", selected: false });
  assert(idle.includes("×108"), idle);
});
test("excellent ball advice is shown as BEST", () => {
  assert(window.playBallRatingLabel("EXCELLENT") === "BEST");
  assert(window.playBallRatingLabel("GREAT") === "GREAT");
  const html = window.playEncounterCardHtml({ kind: "throw", item: "ultraball", label: "Ultra Ball", qty: 2, effectiveness: "EXCELLENT", selected: false });
  assert(html.includes("BEST"), html);
  assert(!html.includes("EXCELLENT"), html);
});
test("play actions submit on click, not pointerdown", () => {
  const fs = require("fs");
  const path = require("path");
  const src = fs.readFileSync(path.join(__dirname, "../js/play.js"), "utf8");
  assert(!/pointerHeld = true;\s*pressAction/.test(src), "pointerdown still submits");
  assert(!/pointerHeld = true;\s*pickFromGrid/.test(src), "throw grid pointerdown still submits");
  assert(src.includes("pendingAction"), "missing pendingAction");
  assert(src.includes("markLocalPending"), "missing markLocalPending");
  assert(src.includes("ITEM CLICK"), "missing action diagnostic log");
});
test("live sync coalesces and freezes action DOM, not the snapshot itself", () => {
  const fs = require("fs");
  const path = require("path");
  const src = fs.readFileSync(path.join(__dirname, "../js/play.js"), "utf8");
  assert(/async function runRefresh\(reason\)/.test(src), "missing runRefresh()");
  assert(/playCreateRefreshCoordinator/.test(src), "missing refresh coordinator");
  assert(/actionDomFrozen\(\)/.test(src), "missing action freeze");
  assert(/if \(actionDomFrozen\(\) && lastActionKey\)/.test(src), "action DOM is not frozen during pointer/pending");
  const heartbeatFn = src.match(/async function heartbeat\(\) \{[\s\S]*?\n  function scheduleRefresh/);
  assert(heartbeatFn, "missing heartbeat()");
  assert(!/render\(data\)/.test(heartbeatFn[0]), "heartbeat still renders a competing snapshot");
  assert(/requestRefresh\("heartbeat"\)/.test(heartbeatFn[0]), "heartbeat must signal the coordinator");
  assert(/function scheduleRefresh\(reason\) \{\s*requestRefresh/.test(src), "scheduleRefresh should request a coalesced refresh");
  assert(!/playBindLureButton\(\(data\) => \{\s*lastActionKey = "";\s*render\(data\);/.test(src), "lure still bypasses action freeze");
});
test("result actions are not rebuilt when the layout key is unchanged", () => {
  const fs = require("fs");
  const path = require("path");
  const src = fs.readFileSync(path.join(__dirname, "../js/play.js"), "utf8");
  assert(/if \(key === lastActionKey\) \{\s*if \(canPatch\) patchActionButtons/.test(src), src.match(/if \(key === lastActionKey\)[\s\S]{0,180}/)?.[0]);
  assert(!/if \(key === lastActionKey && canPatch\)/.test(src), "result screens still require a button to skip innerHTML");
});
test("join pending does not use berry selected styles", () => {
  const fs = require("fs");
  const path = require("path");
  const src = fs.readFileSync(path.join(__dirname, "../js/play.js"), "utf8");
  assert(src.includes('row.kind === "join" ? "" : (row.selected ? " is-selected" : "")'), src);
});
test("community result panel does not fade in on every patch", () => {
  const fs = require("fs");
  const path = require("path");
  const css = fs.readFileSync(path.join(__dirname, "../css/play.css"), "utf8");
  const slim = css.match(/\.catch-fanfare-slim \{[\s\S]*?\n\}/);
  const slimWin = css.match(/\.catch-fanfare-slim\.is-win \{[\s\S]*?\n\}/g);
  assert(slim && /animation:\s*none/.test(slim[0]), slim && slim[0]);
  assert(slimWin && slimWin.every((block) => /animation:\s*none/.test(block)), String(slimWin));
});

const failed = results.filter((row) => !row.passed);
results.forEach((row) => {
  console.log(`${row.passed ? "PASS" : "FAIL"} ${row.name}${row.detail ? ` — ${row.detail}` : ""}`);
});
console.log(`${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
