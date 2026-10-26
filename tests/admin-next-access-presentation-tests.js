const assert = require("node:assert/strict"), fs = require("node:fs"), vm = require("node:vm");
const code = fs.readFileSync("js/admin-next.js", "utf8"), start = code.indexOf("  async function loadHub("), end = code.indexOf("  els.toggle", start), fn = code.slice(start, end);
const deferred = () => { let resolve; return { promise: new Promise(done => { resolve = done; }), resolve }; };
function fixture(permission) {
  const gate = { hidden: true, textContent: "" }, staff = { hidden: false }, calls = [], profiles = {};
  const context = { trainerStyles:{reset(){calls.push("resetTrainerStyles");}}, itemDefinitions:{reset(){calls.push("resetItemDefinitions");}}, assets:{reset(){calls.push("resetAssets");}}, providers:null, draftCreator: { reset() { calls.push("resetDraftCreator"); } }, floorOrder: { reset() {} }, floorEditor: { reset() { calls.push("resetFloors"); } }, hubGeneration: 0, martIdentity: "", staffOpen: false, els: { gate, staff }, mart: { reset() { calls.push("resetMart"); } }, supabase: { auth: { getSession: async () => ({ data: { session: null } }) }, from() { return { select() { return { eq(key, id) { return { maybeSingle: async () => profiles[id] ? profiles[id].promise : { data: {} } }; } }; } }; }, rpc: async () => typeof permission === "function" ? permission() : permission }, window: { location: { href: "https://example.test/admin-next.html?section=mart" }, playSetAccountNav(session) { calls.push("nav:" + session.user.id); } }, URL, stopOpsPoll() { calls.push("stop"); }, resetTrainers() { calls.push("resetTrainers"); }, renderOperationsFallback() { calls.push("fallback"); }, setSignedOut() { calls.push("signedOut"); }, showTab(name) { calls.push("tab:" + name); } };
  context.resetOperations = () => calls.push("resetOperations");
  context.resetHealth = () => calls.push("resetHealth");
  vm.createContext(context); vm.runInContext(fn, context); return { context, gate, staff, calls, profiles };
}
(async () => {
  const session = { user: { id: "fictional-staff" } };
  const denied = fixture({ data: false, error: null }); await denied.context.loadHub(session);assert(denied.calls.includes("resetItemDefinitions"));assert(denied.calls.includes("resetTrainerStyles"));
  assert(denied.calls.includes("resetFloors")); assert(denied.calls.includes("resetDraftCreator")); assert(denied.calls.includes("resetOperations")); assert.equal(denied.context.staffOpen, false); assert.equal(denied.staff.hidden, true); assert.equal(denied.gate.hidden, false); assert(denied.gate.textContent.includes("does not have access")); assert(!denied.calls.includes("tab:mart"));
  const failed = fixture({ data: null, error: { message: "network failure" } }); await failed.context.loadHub(session);
  assert.equal(failed.context.staffOpen, false); assert.equal(failed.staff.hidden, true); assert(failed.gate.textContent.includes("could not be verified")); assert(!failed.gate.textContent.includes("does not have access")); assert(!failed.calls.includes("tab:mart"));
  const allowed = fixture({ data: true, error: null }); await allowed.context.loadHub(session);
  assert.equal(allowed.context.staffOpen, true); assert.equal(allowed.staff.hidden, false); assert.equal(allowed.gate.hidden, true); assert(allowed.calls.includes("tab:mart"));
  const signedOut = fixture({ data: true, error: null }); await signedOut.context.loadHub(); assert(signedOut.calls.includes("signedOut"));
  let rpc = 0; const raced = fixture(() => ++rpc === 1 ? { data: false, error: null } : { data: true, error: null });
  const pending = deferred(); raced.profiles.old = pending;
  const old = raced.context.loadHub({ user: { id: "old" } });
  await raced.context.loadHub({ user: { id: "new" } }); pending.resolve({ data: {} }); await old;
  assert.equal(raced.context.staffOpen, false); assert.equal(raced.staff.hidden, true); assert(!raced.calls.includes("nav:old")); assert(raced.calls.includes("nav:new"));
  console.log("Actual Hub access presentation: signed-out, denied, unavailable, allowed and stale earlier lookup pass without hosted Auth calls.");
})().catch(error => { console.error(error); process.exitCode = 1; });
