/* node tests/encounter-stability-tests.js */
globalThis.window = globalThis;
require("../js/play-encounter-state.js");

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

const now = Date.parse("2026-09-14T12:00:00.000Z");

function round(extra) {
  return {
    id: "r-stable",
    phase: "throw",
    updatedAt: "2026-09-14T12:00:00.000Z",
    deadlines: {
      join: "2026-09-14T11:59:20.000Z",
      prepare: "2026-09-14T11:59:40.000Z",
      throw: "2026-09-14T12:00:10.000Z",
      reveal: "2026-09-14T12:00:25.000Z"
    },
    ...extra
  };
}

test("stale snapshot cannot regress THROW + pending Ball to PREPARE", () => {
  const current = window.playMergeRoundSnapshot(null, round({ phase: "throw", highestPhase: "throw" }));
  const stale = window.playMergeRoundSnapshot(current, round({
    phase: "prepare",
    updatedAt: "2026-09-14T11:59:50.000Z"
  }));
  assert(stale.phase === "throw", stale.phase);
  const ui = window.playReduceActionUi({ status: "PENDING", selected: "ultraball", pending: true }, {
    type: "snapshot",
    selected: "",
    phase: "prepare"
  });
  assert(ui.status === "PENDING", ui.status);
  assert(ui.selected === "ultraball", ui.selected);
});

test("pending Berry never flashes back to available before success", () => {
  let ui = { status: "IDLE", selected: "", pending: false };
  ui = window.playReduceActionUi(ui, { type: "click", item: "oran" });
  assert(ui.status === "PENDING");
  ui = window.playReduceActionUi(ui, { type: "snapshot", selected: "" });
  assert(ui.status === "PENDING", "stale snapshot regressed pending");
  assert(ui.pending === true);
  ui = window.playReduceActionUi(ui, { type: "success", item: "oran" });
  assert(ui.status === "CONFIRMED");
  assert(ui.pending === false);
  assert(ui.selected === "oran");
});

test("result hold starts at settlement, not original reveal deadline", () => {
  const reveal = "2026-09-14T12:00:25.000Z";
  const settledAt = "2026-09-14T12:00:28.000Z";
  const idleAt = window.playRoundIdleAt({
    resolved: true,
    updatedAt: settledAt,
    deadlines: { reveal }
  });
  const holdStart = Date.parse(settledAt);
  assert(idleAt === holdStart + 20000, String(idleAt));
  assert(idleAt > Date.parse(reveal) + 8000, "hold must outlast old reveal+8s window");
});

test("very late settlement still gets a full result hold", () => {
  const reveal = "2026-09-14T12:00:25.000Z";
  const settledAt = "2026-09-14T12:00:40.000Z";
  const idleAt = window.playRoundIdleAt({
    resolved: true,
    updatedAt: settledAt,
    deadlines: { reveal }
  });
  assert(Date.parse(settledAt) > Date.parse(reveal) + 8000, "fixture is after reveal+8s");
  assert(idleAt === Date.parse(settledAt) + 20000, String(idleAt));
  const shown = window.playApplyLocalRound({
    id: "late",
    resolved: true,
    phase: "closed",
    updatedAt: settledAt,
    deadlines: { reveal },
    highestPhase: "closed"
  }, Date.parse(settledAt) + 4000);
  assert(shown && shown.phase === "closed", "result must still be visible");
  const gone = window.playApplyLocalRound({
    id: "late",
    resolved: true,
    phase: "closed",
    updatedAt: settledAt,
    deadlines: { reveal }
  }, Date.parse(settledAt) + 20001);
  assert(gone === null, "clears only after settlement hold");
});

test("unresolved rounds stay loadable past original reveal+8s", () => {
  const reveal = "2026-09-14T12:00:25.000Z";
  const idleAt = window.playRoundIdleAt({
    resolved: false,
    phase: "closed",
    deadlines: { reveal }
  });
  assert(idleAt === Date.parse(reveal) + 120000, String(idleAt));
  const shown = window.playApplyLocalRound({
    id: "wait-settle",
    resolved: false,
    phase: "closed",
    deadlines: { reveal, throw: "2026-09-14T12:00:10.000Z", join: "2026-09-14T11:59:20.000Z", prepare: "2026-09-14T11:59:40.000Z" }
  }, Date.parse(reveal) + 20000);
  assert(shown, "must keep the round until settlement");
  assert(shown.phase === "reveal", "timer stays on CATCH ATTEMPT until the server resolves");
});

test("unresolved reveal does not jump to RESULTS while the ball is still wobbling", () => {
  const snap = {
    id: "sync-seq",
    resolved: false,
    phase: "reveal",
    deadlines: {
      join: "2026-09-14T11:59:20.000Z",
      prepare: "2026-09-14T11:59:40.000Z",
      throw: "2026-09-14T12:00:10.000Z",
      reveal: "2026-09-14T12:00:25.000Z"
    }
  };
  const shown = window.playApplyLocalRound(snap, Date.parse(snap.deadlines.reveal) + 500);
  assert(shown && shown.phase === "reveal", shown && shown.phase);
  const settled = window.playApplyLocalRound({ ...snap, resolved: true, phase: "closed" }, Date.parse(snap.deadlines.reveal) + 500);
  assert(settled && settled.phase === "closed", settled && settled.phase);
});

test("phase is monotonic unless a newer snapshot rewinds it", () => {
  const first = window.playMergeRoundSnapshot(null, round({ phase: "prepare", updatedAt: "2026-09-14T11:59:41.000Z" }));
  const throwSnap = window.playMergeRoundSnapshot(first, round({ phase: "throw", updatedAt: "2026-09-14T11:59:42.000Z" }));
  assert(throwSnap.phase === "throw");
  const older = window.playMergeRoundSnapshot(throwSnap, round({ phase: "join", updatedAt: "2026-09-14T11:59:10.000Z" }));
  assert(older.phase === "throw", older.phase);
  const admin = window.playMergeRoundSnapshot(throwSnap, round({ phase: "join", updatedAt: "2026-09-14T12:00:05.000Z" }));
  assert(admin.phase === "join", "newer updatedAt may rewind for admin debug");
});

test("refresh coordinator is single-flight and coalesces follow-ups", async () => {
  let runs = 0;
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const coord = window.playCreateRefreshCoordinator({
    frozen: () => false,
    run: async () => {
      runs += 1;
      if (runs === 1) await gate;
    }
  });
  const first = coord.request("realtime");
  await coord.request("poll");
  await coord.request("inventory");
  release();
  await first;
  assert(runs === 2, `expected 2 runs after coalesce, got ${runs}`);
});

test("frozen pointer defers refresh instead of running it", async () => {
  let runs = 0;
  let held = true;
  const coord = window.playCreateRefreshCoordinator({
    frozen: () => held,
    run: async () => { runs += 1; }
  });
  await coord.request("realtime");
  assert(runs === 0, "must not sync while pointer is held");
  assert(coord.snapshot().needed === true);
  held = false;
  await coord.request("pointerup");
  assert(runs === 1, `ran ${runs}`);
});

test("action structure key ignores selected/qty/pending and phase", () => {
  const a = window.playActionStructureKey({
    phase: "prepare",
    buttons: [
      { kind: "prepare", item: "berry", selected: false, qty: 9 },
      { kind: "prepare", item: "bait", pending: true, qty: 4 }
    ]
  });
  const b = window.playActionStructureKey({
    phase: "throw",
    buttons: [
      { kind: "prepare", item: "berry", selected: true, qty: 8 },
      { kind: "prepare", item: "bait", pending: false, qty: 3 }
    ]
  });
  assert(a === b, `${a} !== ${b}`);
});

test("prepare window stays closed while the server is still in Join", () => {
  const snap = {
    id: "win",
    phase: "join",
    serverNow: "2026-09-14T12:00:10.000Z",
    receivedAt: Date.now(),
    deadlines: {
      join: "2026-09-14T12:00:30.000Z",
      prepare: "2026-09-14T12:01:00.000Z",
      throw: "2026-09-14T12:01:30.000Z",
      reveal: "2026-09-14T12:01:45.000Z"
    }
  };
  assert(window.playActionWindowOpen(snap, "prepare") === false, "prepare opened early");
  assert(window.playActionWindowOpen(snap, "throw") === false, "throw opened early");
});

test("prepare window matches the server 1s join-edge grace", () => {
  const snap = {
    id: "grace",
    phase: "join",
    serverNow: "2026-09-14T12:00:29.200Z",
    receivedAt: Date.now(),
    deadlines: {
      join: "2026-09-14T12:00:30.000Z",
      prepare: "2026-09-14T12:01:00.000Z",
      throw: "2026-09-14T12:01:30.000Z",
      reveal: "2026-09-14T12:01:45.000Z"
    }
  };
  assert(window.playActionWindowOpen(snap, "prepare") === true, "prepare should be open at join-1s");
});

test("cancelled no-join remains visible for the result hold", () => {
  const updatedAt = "2026-09-14T12:00:00.000Z";
  const shown = window.playApplyLocalRound({
    id: "nojoin",
    cancelled: true,
    resolved: true,
    updatedAt,
    name: "Pikachu"
  }, Date.parse(updatedAt) + 4000);
  assert(shown && shown.phase === "closed", "cancelled ending must stay");
});

test("browser clock ahead of the server cannot open Prepare buttons early", () => {
  const joinAt = "2026-09-14T12:00:30.000Z";
  const prepareAt = "2026-09-14T12:01:00.000Z";
  const throwAt = "2026-09-14T12:01:30.000Z";
  const revealAt = "2026-09-14T12:01:45.000Z";
  const serverNow = "2026-09-14T12:00:10.000Z";
  const snap = {
    id: "clock-skew",
    phase: "join",
    serverNow,
    receivedAt: Date.now(),
    deadlines: { join: joinAt, prepare: prepareAt, throw: throwAt, reveal: revealAt }
  };
  const shown = window.playApplyLocalRound(snap);
  assert(shown && shown.phase === "join", shown ? shown.phase : "null");
});

test("playServerNowMs adds time since the snapshot was received", () => {
  const sent = Date.parse("2026-09-14T12:00:10.000Z");
  const receivedAt = Date.now() - 8000;
  const est = window.playServerNowMs({ serverNow: new Date(sent).toISOString(), receivedAt });
  assert(Math.abs(est - (sent + 8000)) < 80, String(est));
});

test("confirmed prep/ball survive a snapshot that omits them", () => {
  const kept = window.playKeepPlayerMe(
    { joined: true, prep: "berry", ball: "ultraball", result: "Escaped", caught: false },
    { joined: true, prep: null, ball: null, result: null }
  );
  assert(kept.prep === "berry", kept.prep);
  assert(kept.ball === "ultraball", kept.ball);
  assert(kept.result === "Escaped", kept.result);
  assert(kept.caught === false, String(kept.caught));
});

test("successful click pins the choice even if me is missing", () => {
  const kept = window.playKeepPlayerMe({ joined: true }, null, { prep: "none" });
  assert(kept.prep === "none", kept.prep);
  const throwKept = window.playKeepPlayerMe(kept, { joined: true }, { ball: "standard" });
  assert(throwKept.ball === "pokeball", throwKept.ball);
  assert(throwKept.prep === "none", throwKept.prep);
});

test("timer seconds follow serverNow not the browser clock", () => {
  const snap = {
    id: "timer",
    phase: "join",
    serverNow: "2026-09-14T12:00:10.000Z",
    receivedAt: Date.now(),
    deadlines: { join: "2026-09-14T12:00:40.000Z" }
  };
  const left = window.playDeadlineSecondsLeft(snap, snap.deadlines.join);
  assert(left === 30 || left === 29, String(left));
});

test("click freeze stays true until pendingAction is set", () => {
  const src = require("fs").readFileSync(require("path").join(__dirname, "../js/play.js"), "utf8");
  assert(!/event\.preventDefault\(\);\s*pointerHeld = false;\s*clearTimeout\(holdReleaseTimer\);\s*pressAction/.test(src), "click still drops the freeze before act()");
  assert(!/event\.preventDefault\(\);\s*pointerHeld = false;\s*clearTimeout\(holdReleaseTimer\);\s*pickFromGrid/.test(src), "throw grid still drops the freeze before act()");
});

test("Play inventories realtime is filtered to the signed-in Trainer", () => {
  const src = require("fs").readFileSync(require("path").join(__dirname, "../js/play.js"), "utf8");
  assert(src.includes("user_id=eq.${userId}"), "missing inventories user_id filter");
  assert(!/table:\s*"inventories"\s*\},\s*\(\)\s*=>\s*\{\s*lastRealtimeEvent = "inventory"/.test(src), "unfiltered inventories listener still present");
});

test("Master Ball confirm freezes intent before RPC", () => {
  const src = require("fs").readFileSync(require("path").join(__dirname, "../js/play.js"), "utf8");
  assert(src.includes("function freezeMasterIntent"), "missing freezeMasterIntent");
  assert(src.includes("masterIntent"), "missing masterIntent pending lock");
  assert(/freezeMasterIntent\(liveRound\(state\)\?\.id/.test(src), "Master Ball click does not freeze intent");
  assert(src.includes('act("throw", "masterball")'), "YES still throws");
});

test("a missing snapshot cannot drop a resolved round during the result hold", () => {
  const resolved = round({
    phase: "closed",
    resolved: true,
    updatedAt: "2026-09-14T12:00:05.000Z",
    deadlines: {
      join: "2026-09-14T11:59:20.000Z",
      prepare: "2026-09-14T11:59:40.000Z",
      throw: "2026-09-14T12:00:00.000Z",
      reveal: "2026-09-14T12:00:08.000Z"
    }
  });
  const kept = window.playKeepHeldRound(null, resolved, Date.parse("2026-09-14T12:00:10.000Z"));
  assert(kept && kept.id === "r-stable", "hold dropped the settled round");
  const expired = window.playKeepHeldRound(null, resolved, Date.parse("2026-09-14T12:00:30.000Z"));
  assert(expired == null, "hold must end after PLAY_RESULT_HOLD_MS");
});

test("first-click tracker treats missing RPC me.prep as unconfirmed until sync", () => {
  const tracker = window.playCreateFirstClickTracker();
  const accepted = tracker.recordRpcAccepted({
    bucket: "berry",
    kind: "prepare",
    item: "berry",
    roundId: "r1",
    requestId: "a1",
    firstClick: true,
    payloadConfirms: false
  });
  assert(accepted.rpcAccepted === true, "rpcAccepted");
  assert(accepted.justConfirmed === false, "must not confirm from empty payload");
  const later = tracker.recordSync({ joined: true, prep: "berry" }, "r1");
  assert(later.length === 1, String(later.length));
  assert(later[0].syncConfirms === true, "syncConfirms");
  assert(later[0].firstClick === true, "firstClick");
});

test("first-click tracker confirms throw from later authoritative ball", () => {
  const tracker = window.playCreateFirstClickTracker();
  tracker.recordRpcAccepted({
    bucket: "ultraball",
    kind: "throw",
    item: "ultraball",
    roundId: "r2",
    requestId: "a2",
    firstClick: true,
    payloadConfirms: false
  });
  const miss = tracker.recordSync({ joined: true }, "r2");
  assert(miss.length === 0, "empty me.ball is not confirmation");
  const hit = tracker.recordSync({ joined: true, ball: "ultraball" }, "r2");
  assert(hit.length === 1 && hit[0].confirmed === true, "authoritative ball confirms");
});

test("RPC payload confirmation helper does not require undocumented fields", () => {
  assert(window.playRpcPayloadConfirmsAction("prepare", "berry", null) === false, "null me");
  assert(window.playRpcPayloadConfirmsAction("prepare", "berry", { joined: true }) === false, "missing prep");
  assert(window.playRpcPayloadConfirmsAction("prepare", "berry", { joined: true, prep: "berry" }) === true, "prep present");
  assert(window.playAuthoritativeConfirmsAction("throw", "standard", { ball: "pokeball" }) === true, "standard maps to pokeball");
});

const failed = results.filter((row) => !row.passed);
console.log(results.map((row) => `${row.passed ? "ok" : "FAIL"} ${row.name}${row.detail ? ` — ${row.detail}` : ""}`).join("\n"));
console.log(`${results.length - failed.length}/${results.length} passed`);
if (failed.length) process.exit(1);
