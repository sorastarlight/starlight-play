const assert = require("node:assert/strict");
const api = require("../js/admin-next-analytics.js");
const deferred = () => { let resolve; return { promise: new Promise(done => { resolve = done; }), resolve }; };
const capture = { ok: true, since: "2026-10-01T00:00:00Z", overall: { throws: 0, caught: 0, rate: null }, bySpecies: [], byBall: [], byBerry: [], byCatchRateTier: [] };
(async () => {
  let id = "staff-a", allowed = true, actual = "staff-a", error = null; const calls = [];
  let pending = null;
  const read = api.adapter({ identity: () => id, allowed: () => allowed, session: async () => ({ data: { session: actual ? { user: { id: actual } } : null }, error }), call: async (...args) => { calls.push(args); return pending ? pending.promise : capture; } });
  for (const view of ["admin_overview", "admin_capture_report", "__proto__", "constructor", "health"]) await assert.rejects(read(view, 30));
  for (const days of [0, 366, null, "30", 1.5, NaN]) await assert.rejects(read("captures", days));
  assert.equal(calls.length, 0);
  await read("captures", 1); await read("captures", 365); assert.deepEqual(calls.slice(0,2), [["admin_capture_report", {p_days:1}], ["admin_capture_report", {p_days:365}]]);
  for (const view of ["progression", "evolution", "economy"]) await read(view);
  const count = calls.length;
  allowed = false; await assert.rejects(read("captures", 30)); allowed = true;
  actual = "staff-b"; await assert.rejects(read("captures", 30)); actual = id;
  error = Error("fictional"); await assert.rejects(read("captures", 30)); error = null;
  assert.equal(calls.length, count);
  pending = deferred(); const late = read("captures", 30); await Promise.resolve(); actual = "staff-b"; pending.resolve(capture); await assert.rejects(late); actual = id; pending = null;
  const empty = api.project("captures", capture); assert.equal(empty.cards[0].value, 0); assert.equal(empty.cards[2].text, "—"); assert.equal(empty.partial, false);
  assert.throws(() => api.project("economy", null)); assert.throws(() => api.project("economy", {ok:false}));
  const missing = api.project("economy", {ok:true, circulation:null, averageBalance:"5", createdToday:Infinity}); assert.equal(missing.cards[0].value, null); assert.equal(missing.cards[1].value, null); assert.equal(missing.partial, true);
  const projected = api.project("evolution", {ok:true,evolutions:0,openGts:1,directTrades:7,candyTotal:9,candyTrainers:2,recentEvo:[{player:"secret-name"}],config:{secret:"secret-config"}});
  assert.equal(projected.cards.find(c=>c.label === "Direct trade requests").value, 7); assert(!JSON.stringify(projected).includes("secret")); assert(!JSON.stringify(projected).includes("recentEvo"));
  const hostile = '<img src=x onerror="alert(1)">'; const hostileProjection=api.project("captures", {...capture,bySpecies:[{name:hostile,throws:1,caught:0,rate:0}]}); assert.equal(hostileProjection.tables[0].rows[0][0], hostile); assert(!api.esc(hostile).includes("<"));
  let requests = [], wait = deferred(); const model=api.controller(async(view,days)=>{requests.push([view,days]);return wait.promise;});
  await model.select("captures"); assert.equal(requests.length,0); await model.open();
  const first=model.select("captures"); await model.refresh(); assert.equal(requests.length,1); model.range(7); assert.equal(requests.length,2);
  wait.resolve(capture); await first; await new Promise(done=>setImmediate(done)); assert.equal(model.state.days,7); assert.equal(model.state.phase,"ready");
  await model.select("health"); await model.select("captures"); assert.equal(requests.length,2); // cache scoped to range
  const old=deferred(); wait=old; const refresh=model.refresh(); model.reset(); old.resolve(capture); await refresh; assert.equal(model.state.phase,"closed"); assert.equal(model.state.report,null);
  await model.open(); await model.select("captures"); assert.equal(requests.length,4); // reset discarded cache
  model.reset(); await model.open(); wait=deferred(); const stale=model.select("captures"); await model.select("health"); wait.resolve(capture); await stale; assert.equal(model.state.view,"health"); assert.equal(model.state.report,null);
  const failed=api.controller(async()=>{throw Error("private server details");}); await failed.open(); await failed.select("economy"); assert.equal(failed.state.phase,"error"); assert.equal(failed.state.report,null); assert(!JSON.stringify(failed.state).includes("private"));
  let deny=false, accessReads=0;
  const access=api.controller(async()=>{accessReads++;if(deny)throw Object.assign(Error("changed"),{code:"REPORT_ACCESS_CHANGED"});return capture;});
  await access.open();await access.select("captures");assert.equal(access.state.phase,"ready");deny=true;await access.select("economy");await access.select("captures");assert.equal(accessReads,3);assert.equal(access.state.report,null);
  console.log("Analytics: strict adapter, identity before/after, projections, null/zero semantics, escaping, single-flight, range/view races, reset/cache and failures pass.");
})().catch(error=>{console.error(error);process.exitCode=1;});
