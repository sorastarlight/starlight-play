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
  assert(idleAt === holdStart + 12000, String(idleAt));
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
  assert(idleAt === Date.parse(settledAt) + 12000, String(idleAt));
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
  }, Date.parse(settledAt) + 12001);
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
    { joined: true, prep: "berry", ball: "ultraball" },
    { joined: true, prep: null, ball: null }
  );
  assert(kept.prep === "berry", kept.prep);
  assert(kept.ball === "ultraball", kept.ball);
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

const failed = results.filter((row) => !row.passed);
console.log(results.map((row) => `${row.passed ? "ok" : "FAIL"} ${row.name}${row.detail ? ` — ${row.detail}` : ""}`).join("\n"));
console.log(`${results.length - failed.length}/${results.length} passed`);
if (failed.length) process.exit(1);
