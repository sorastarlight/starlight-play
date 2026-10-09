/* node tests/admin-hub-gate-17-s1-snapshot-tests.js */
const fs = require("fs");
const path = require("path");
const contract = require("../docs/audits/admin-hub-gate-17-s1-frontend-contract.js");

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
function card(view, label) {
  return (view.cards || []).find((row) => row.label === label);
}

const nextJs = read("js/admin-next.js");
const nextHtml = read("admin-next.html");
const upSql = read("docs/audits/sql/gate-17-s1-live-snapshot-up.sql");
const bodyMatch = upSql.match(/as \$\$([\s\S]*?)\$\$;/);
const body = bodyMatch ? bodyMatch[1] : "";

test("Preview allowlist still excludes the snapshot and every mutating dashboard RPC", () => {
  const allow = nextJs.match(/const READ_RPCS = Object\.freeze\(\[([\s\S]*?)\]\)/);
  assert(allow, "READ_RPCS missing");
  const names = [...allow[1].matchAll(/"([^"]+)"/g)].map((row) => row[1]);
  assert(names.length === 2 && names[0] === "admin_build_health" && names[1] === "admin_game_health");
  assert(!nextJs.includes("admin_live_snapshot"), "do not wire snapshot before SQL approval");
  [
    "admin_live_dashboard",
    "admin_overview",
    "director_dashboard",
    "director_tick_if_due",
    "settle_due_rounds",
    "admin_director_command",
    "admin_start_round"
  ].forEach((name) => assert(!nextJs.includes(name), name));
});

test("Preview HTML keeps the UNAVAILABLE fallback and lifecycle copy", () => {
  assert(nextHtml.includes("Live status unavailable in preview"));
  assert(nextHtml.includes("Twitch LIVE permits the Live RPG"));
  assert(nextHtml.includes("does not start"));
  assert(nextHtml.includes("data-state=\"unavailable\""));
});

test("Up migration is SELECT-only and staff-gated before reads", () => {
  assert(upSql.includes("REVIEW ARTIFACT ONLY"));
  assert(upSql.includes("if not private.is_play_admin()"));
  const guardAt = body.indexOf("if not private.is_play_admin()");
  const streamAt = body.indexOf("from public.stream_status");
  const directorAt = body.indexOf("from private.stream_director");
  assert(guardAt >= 0 && streamAt > guardAt && directorAt > guardAt, "staff check must run before table reads");
  [
    "director_tick",
    "director_tick_if_due",
    "director_dashboard",
    "settle_due_rounds",
    "admin_live_dashboard",
    "admin_overview",
    "admin_director_command",
    "admin_start_round",
    "apply_stream_status"
  ].forEach((name) => assert(!body.includes(name), `function body must not reference ${name}`));
  assert(upSql.includes("set search_path = pg_catalog"));
  assert(upSql.includes("alter function public.admin_live_snapshot() owner to postgres"));
  assert(upSql.includes("revoke all on function public.admin_live_snapshot() from public"));
  assert(upSql.includes("revoke all on function public.admin_live_snapshot() from anon"));
  assert(upSql.includes("revoke all on function public.admin_live_snapshot() from service_role"));
  assert(upSql.includes("grant execute on function public.admin_live_snapshot() to authenticated"));
  assert(!/grant execute[^\n]+to anon/i.test(upSql));
  assert(!/grant execute[^\n]+to service_role/i.test(upSql));
});

test("Up migration preflight refuses any existing function and does not replace", () => {
  assert(upSql.includes("$preflight$"));
  assert(upSql.includes("already exists. This is a new endpoint; refuse to overwrite."));
  assert(/create function public\.admin_live_snapshot/i.test(upSql));
  assert(!/create or replace function public\.admin_live_snapshot/i.test(upSql));
  assert(upSql.includes("gate-17-s1-v2"));
});

test("Rollback drops only the new snapshot function", () => {
  const down = read("docs/audits/sql/gate-17-s1-live-snapshot-down.sql");
  assert(down.includes("drop function if exists public.admin_live_snapshot()"));
  assert(!/drop function if exists public\.admin_live_dashboard/i.test(down));
  assert(!/drop function if exists public\.admin_overview/i.test(down));
  assert(!/alter table/i.test(down));
  assert(!/revoke all on function public\.admin_/i.test(down.replace("admin_live_snapshot", "")));
});

test("Current encounter has no historical started_at fallback and settlement is unavailable", () => {
  assert(!/order by er\.started_at desc/i.test(body));
  assert(body.includes("last_encounter_id"));
  assert(body.includes("'awaiting', null"));
  assert(body.includes("'state', 'UNAVAILABLE'"));
  assert(body.includes("'asOf', as_of"));
  assert(body.includes("'lastTickAt', d.last_tick_at"));
  assert(!body.includes("director_freshness"));
});

test("Twitch LIVE / RPG INACTIVE is not rendered as RPG ACTIVE", () => {
  const view = contract.presentLiveOperations({
    payload: {
      ok: true,
      twitch: { state: "LIVE", live: true, known: true, stale: false },
      rpgSession: { state: "INACTIVE", active: false, directorRowPresent: true },
      director: { status: "IDLE", lastTickAt: "2026-10-09T00:00:00Z" },
      currentEncounter: null,
      lastEncounter: null
    }
  });
  assert(card(view, "Twitch").value === "LIVE" && card(view, "Twitch").state === "active");
  assert(card(view, "Live RPG session").value === "INACTIVE" && card(view, "Live RPG session").state === "inactive");
  assert(/IDLE until staff Start|INACTIVE until staff Start/i.test(view.status));
  assert(view.mutate === false);
});

test("Twitch LIVE / RPG ACTIVE keeps the two states separate", () => {
  const view = contract.presentLiveOperations({
    payload: {
      ok: true,
      twitch: { state: "LIVE", live: true, known: true, stale: false },
      rpgSession: { state: "ACTIVE", active: true, sessionId: "sess", directorRowPresent: true },
      director: { status: "RUNNING", lastTickAt: "2026-10-09T00:00:00Z" },
      currentEncounter: { phase: "throw" },
      lastEncounter: { phase: "throw", inProgress: true }
    }
  });
  assert(card(view, "Twitch").value === "LIVE");
  assert(card(view, "Live RPG session").value === "ACTIVE");
  assert(card(view, "Current encounter").value === "THROW");
  assert(!/automatically starts/i.test(view.status));
});

test("Twitch OFFLINE / RPG INACTIVE is not UNKNOWN", () => {
  const view = contract.presentLiveOperations({
    payload: {
      ok: true,
      twitch: { state: "OFFLINE", live: false, known: true, stale: false },
      rpgSession: { state: "INACTIVE", active: false, directorRowPresent: true },
      director: { status: "OFFLINE", lastTickAt: "2026-10-09T00:00:00Z" },
      currentEncounter: null,
      lastEncounter: null
    }
  });
  assert(card(view, "Twitch").value === "OFFLINE" && card(view, "Twitch").state === "inactive");
  assert(card(view, "Live RPG session").value === "INACTIVE");
});

test("Twitch UNKNOWN / RPG UNKNOWN is not rendered as INACTIVE or OFFLINE", () => {
  const view = contract.presentLiveOperations({
    payload: {
      ok: true,
      twitch: { state: "UNKNOWN", live: null, known: false, stale: false },
      rpgSession: { state: "UNKNOWN", active: null, directorRowPresent: false },
      director: { status: null, lastTickAt: null },
      currentEncounter: null,
      lastEncounter: null
    }
  });
  assert(card(view, "Twitch").value === "UNKNOWN" && card(view, "Twitch").state === "unknown");
  assert(card(view, "Live RPG session").value === "UNKNOWN" && card(view, "Live RPG session").state === "unknown");
  assert(card(view, "Twitch").value !== "OFFLINE");
  assert(card(view, "Live RPG session").value !== "INACTIVE");
});

test("Active encounter uses phase; no encounter is NONE", () => {
  const active = contract.presentLiveOperations({
    payload: {
      ok: true,
      twitch: { state: "LIVE", live: true, known: true, stale: false },
      rpgSession: { state: "ACTIVE", active: true, directorRowPresent: true },
      director: { status: "RUNNING", lastTickAt: "2026-10-09T00:00:00Z" },
      currentEncounter: { phase: "join" },
      lastEncounter: { phase: "join", inProgress: true }
    }
  });
  const none = contract.presentLiveOperations({
    payload: {
      ok: true,
      twitch: { state: "LIVE", live: true, known: true, stale: false },
      rpgSession: { state: "ACTIVE", active: true, directorRowPresent: true },
      director: { status: "RUNNING", lastTickAt: "2026-10-09T00:00:00Z" },
      currentEncounter: null,
      lastEncounter: null
    }
  });
  assert(card(active, "Current encounter").value === "JOIN");
  assert(card(none, "Current encounter").value === "NONE");
});

test("Stale Twitch uses STALE, not OFFLINE; director lastTickAt does not mark the snapshot stale", () => {
  const twitchStale = contract.presentLiveOperations({
    payload: {
      ok: true,
      twitch: { state: "STALE", live: null, known: false, stale: true },
      rpgSession: { state: "INACTIVE", active: false, directorRowPresent: true },
      director: { status: "IDLE", lastTickAt: "2026-01-01T00:00:00Z" },
      currentEncounter: null,
      lastEncounter: null
    }
  });
  const oldTick = contract.presentLiveOperations({
    payload: {
      ok: true,
      twitch: { state: "LIVE", live: true, known: true, stale: false },
      rpgSession: { state: "INACTIVE", active: false, directorRowPresent: true },
      director: { status: "IDLE", lastTickAt: "2026-01-01T00:00:00Z" },
      currentEncounter: null,
      lastEncounter: null
    }
  });
  assert(card(twitchStale, "Twitch").value === "STALE");
  assert(card(twitchStale, "Twitch").state !== "inactive");
  assert(/stale/i.test(twitchStale.status));
  assert(card(oldTick, "Twitch").value === "LIVE");
  assert(!/stale/i.test(oldTick.status));
});

test("Historical lastEncounter is not rendered as the current encounter", () => {
  const view = contract.presentLiveOperations({
    payload: {
      ok: true,
      twitch: { state: "LIVE", live: true, known: true, stale: false },
      rpgSession: { state: "ACTIVE", active: true, directorRowPresent: true },
      director: { status: "RUNNING", lastTickAt: "2026-10-09T00:00:00Z" },
      currentEncounter: null,
      lastEncounter: { phase: "throw", resolved: true, inProgress: false, name: "Pikachu" }
    }
  });
  assert(card(view, "Current encounter").value === "NONE");
  assert(card(view, "Current encounter").value !== "THROW");
});

test("Unauthorized and network failures stay UNAVAILABLE and do not mutate", () => {
  const denied = contract.presentLiveOperations({ error: "denied" });
  const network = contract.presentLiveOperations({ error: "network" });
  const missing = contract.presentLiveOperations({ error: "missing" });
  assert(denied.status.includes("restricted to staff"));
  assert(network.status.includes("Live status unavailable in preview"));
  assert(missing.status.includes("Legacy Live Operations"));
  [denied, network, missing].forEach((view) => {
    assert(card(view, "Twitch").value === "UNAVAILABLE");
    assert(card(view, "Live RPG session").value === "UNAVAILABLE");
    assert(view.mutate === false);
    assert(view.poll === false);
  });
});

const failed = results.filter((row) => !row.passed);
results.forEach((row) => {
  console.log(`${row.passed ? "PASS" : "FAIL"} ${row.name}${row.detail ? ` — ${row.detail}` : ""}`);
});
if (failed.length) {
  console.error(`\n${failed.length} failed`);
  process.exit(1);
}
console.log(`\n${results.length} passed`);
