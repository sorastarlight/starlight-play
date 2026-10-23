const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const source = fs.readFileSync(require('node:path').join(__dirname, '../js/pokedex.js'), 'utf8');
const selected = source.slice(source.indexOf('  async function loadNav('), source.indexOf('  if (els.team) {', source.indexOf('  async function loadNav(')));
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
function fixture() {
  const sessions = [], profiles = [], calls = [], nav = [];
  const els = { gate: { hidden: false, textContent: '' }, app: { hidden: true } };
  const window = { playSetAccountNav: (...args) => nav.push(args), playRestoreGate: (gate, text) => { gate.hidden = false; gate.textContent = text; },
    playSetLoadingGate: gate => { gate.hidden = false; gate.textContent = 'Loading'; }, playRpcError: error => error.message,
    playCall: async name => { calls.push(name); return {}; } };
  const supabase = { auth: { getSession: () => { const d = deferred(); sessions.push(d); return d.promise; } },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => { const d = deferred(); profiles.push(d); return d.promise; } }) }) }) };
  const context = { window, supabase, els, loadGeneration: 0, detailRequest: 0, familiarity: { reset() {} }, paintFamiliarityCopy() {},
    collectionCache: null, dexData: null, closeDetail() {}, clearUnreleasedRoute() {}, render() {}, routeDex: () => null, openDetail() {} };
  vm.createContext(context); vm.runInContext(selected + '\nthis.runLoad = load;', context);
  return { ...context, sessions, profiles, calls, nav, run: () => context.runLoad() };
}
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
const session = { data: { session: { user: { id: 'fictional-trainer' } } } };
(async () => {
  let f = fixture(), pending = f.run(); f.sessions[0].reject(Error('Session unavailable')); await pending;
  assert.equal(f.els.gate.textContent, 'Session unavailable'); assert.equal(f.els.app.hidden, true); assert.deepEqual(f.calls, []);
  f = fixture(); pending = f.run(); f.sessions[0].resolve(session); await flush(); f.profiles[0].reject(Error('Profile unavailable')); await pending;
  assert.equal(f.els.gate.textContent, 'Profile unavailable'); assert.deepEqual(f.calls, []);
  f = fixture(); pending = f.run(); f.sessions[0].resolve({ data: { session: null } }); await pending;
  assert.equal(f.els.gate.textContent, 'Sign in to open your Pokédex.'); assert.deepEqual(f.calls, []);
  f = fixture(); const stale = f.run(); pending = f.run(); f.sessions[1].resolve(session); await flush(); f.profiles[0].resolve({ data: {} }); await pending;
  f.sessions[0].reject(Error('Old failure')); await stale;
  assert.equal(f.els.gate.hidden, true); assert.equal(f.els.app.hidden, false); assert.deepEqual(f.calls, ['play_state', 'play_pokedex']);
  f = fixture(); pending = f.run(); f.sessions[0].reject(Error('Temporary failure')); await pending;
  pending = f.run(); f.sessions[1].resolve(session); await flush(); f.profiles[0].resolve({ data: {} }); await pending;
  assert.equal(f.els.gate.hidden, true); assert.equal(f.els.app.hidden, false);
  console.log('5 LOCAL actual-source Pokédex loading cases pass; fictional dependencies only');
})().catch(error => { console.error(error); process.exitCode = 1; });

