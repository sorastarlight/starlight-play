const assert = require("node:assert/strict"), fs = require("node:fs"), vm = require("node:vm");
const source = fs.readFileSync("js/admin-next.js", "utf8"), start = source.indexOf("  function resetHealth("), end = source.indexOf("  function setSignedOut", start);
const actual = source.slice(start, end);
const deferred = () => { let resolve; return { promise: new Promise(done => { resolve = done; }), resolve }; };
function fixture(read) {
  const calls = [], tones = [], context = { passBundles: { reset() { this.cleared = true; } }, captureLimits: { reset() {} }, progression: {reset(){this.cleared=true;}}, captureRules: {reset(){this.cleared=true;}}, supplies: {reset(){this.cleared=true;}}, timings: {reset(){this.cleared=true;}}, config: null, configIdentity: "", analytics: null, analyticsIdentity: "", healthGeneration: 0, healthLoaded: false, healthInFlight: false, staffOpen: true, els: { health: { innerHTML: "old" }, healthStatus: { textContent: "old" }, healthRefresh: { disabled: false } }, window: {}, metric: (label, value, state) => { tones.push({ label, state }); return `${label}:${value};`; }, readCall(name) { calls.push(name); return read(name, calls.length); } };
  context.els.healthRefresh.attrs = {};
  context.els.healthRefresh.setAttribute = function(key, value) { this.attrs[key] = value; };
  vm.createContext(context); vm.runInContext(actual, context); return { context, calls, tones };
}
const both = name => Promise.resolve(name === "admin_build_health" ? { clientBuild: "fixture-build", dbMigration: "fixture-migration" } : { application: { status: "OK" }, twitch: { live: false } });
(async () => {
  const none = fixture(() => Promise.reject(Error("fictional unavailable"))); await none.context.loadHealth();
  assert(none.context.els.healthStatus.textContent.includes("unavailable")); assert.equal(none.context.healthLoaded, false); assert.equal(none.context.els.health.innerHTML, ""); assert.equal(none.context.els.healthRefresh.disabled, false);
  await none.context.loadHealth(); assert.equal(none.calls.length, 4); // Failure must remain retryable on section re-entry.
  const full = fixture(both); full.context.staffOpen = false; await full.context.loadHealth(); assert.equal(full.calls.length, 0);
  full.context.staffOpen = true; await full.context.loadHealth(); assert.equal(full.context.healthLoaded, true); assert(full.context.els.health.innerHTML.includes("Twitch stream:OFFLINE"));
  await full.context.loadHealth(); assert.equal(full.calls.length, 2); await full.context.loadHealth(true); assert.equal(full.calls.length, 4);
  assert.equal(full.tones.find(x=>x.label==='Application').state,'active');
  const unknown=fixture(name=>Promise.resolve(name==='admin_build_health'?{clientBuild:'fictional'}:{application:{status:'UNKNOWN'},twitch:{live:null}}));await unknown.context.loadHealth();assert.equal(unknown.tones.find(x=>x.label==='Application').state,'unknown');assert.equal(unknown.tones.find(x=>x.label==='Twitch stream').state,'unknown');assert(unknown.context.els.health.innerHTML.includes('Twitch stream:UNKNOWN'));
  const partial = fixture(name => name === "admin_build_health" ? Promise.reject(Error("fictional")) : both(name)); await partial.context.loadHealth(); assert(partial.context.els.healthStatus.textContent.includes("Partial")); assert.equal(partial.context.healthLoaded, false); assert(partial.context.els.health.innerHTML.includes("Application:OK"));
  const wait = deferred(), pending = fixture(() => wait.promise); const first = pending.context.loadHealth();
  assert.equal(pending.context.els.healthRefresh.attrs["aria-disabled"], "true"); assert.equal(pending.context.els.healthRefresh.disabled, false); assert.equal(pending.context.els.healthStatus.textContent, "Loading health…"); await pending.context.loadHealth(true); assert.equal(pending.calls.length, 2);
  pending.context.resetHealth(); assert.equal(pending.context.passBundles.cleared, true); assert.equal(pending.context.els.healthRefresh.disabled, false); wait.resolve({ status: "obsolete" }); await first; assert.equal(pending.context.els.health.innerHTML, ""); assert.equal(pending.context.els.healthStatus.textContent, "No health snapshot loaded.");
  const old = deferred(), race = fixture((name, count) => count <= 2 ? old.promise : both(name)); const stale = race.context.loadHealth(); race.context.resetHealth(); await race.context.loadHealth(); const newest = race.context.els.health.innerHTML; old.resolve({ clientBuild: "obsolete" }); await stale; assert.equal(race.context.els.health.innerHTML, newest); assert(!newest.includes("obsolete"));
  const unexpected = fixture(() => { throw Error("fictional synchronous failure"); }); await unexpected.context.loadHealth(); assert.equal(unexpected.context.els.healthStatus.textContent, "Could not load health."); assert.equal(unexpected.context.els.healthRefresh.disabled, false);
  assert.deepEqual([...new Set(full.calls)], ["admin_build_health", "admin_game_health"]);
  console.log("Actual health loader: unavailable retry, partial/full states, existing reads only, staff gate, single flight and reset/stale result protection pass.");
})().catch(error => { console.error(error); process.exitCode = 1; });
