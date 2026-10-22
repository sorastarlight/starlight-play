const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const source = fs.readFileSync(require('node:path').join(__dirname, '../js/events.js'), 'utf8');
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
function fixture(failSession = false, failEvents = false) {
  const nodes = {}, calls = [];
  const node = id => nodes[id] || (nodes[id] = { hidden: false, innerHTML: '', textContent: '', value: '', addEventListener() {} });
  const window = { playSupabase: { auth: { getSession: async () => { if (failSession) throw Error('Session offline'); return { data: { session: null } }; }, onAuthStateChange() {} } },
    playBindAccountNav() {}, playSetAccountNav() {}, playEscapeAttr: value => String(value), playRpcError: error => error.message,
    playCall: async name => { calls.push(name); assert.equal(name, 'play_events'); if (failEvents) throw Error('Calendar offline'); return { events: [{ id: 'fictional', title: 'Community night', kind: 'community', startsAt: '2026-10-22T20:00:00Z' }], isAdmin: false }; } };
  // Capture bootstrap rejection so the regression is an explicit assertion, not an unhandled rejection.
  vm.runInNewContext(source.replace(/  load\(\);\s*\}\)\(\);\s*$/, '  load().catch(error => { window.bootstrapError = error.message; });\n})();'), { window, document: { getElementById: node } });
  return { nodes, calls, window };
}
(async () => {
  let f = fixture(true); await flush(); assert.deepEqual(f.calls, ['play_events']); assert(f.nodes['event-list'].innerHTML.includes('Community night')); assert.equal(f.nodes['event-staff'].hidden, true); assert.equal(f.window.bootstrapError, undefined);
  f = fixture(); await flush(); assert(f.nodes['event-list'].innerHTML.includes('Community night')); assert.equal(f.nodes['event-status'].textContent, '1 event');
  f = fixture(true, true); await flush(); assert.equal(f.nodes['event-status'].textContent, 'Calendar offline'); assert.equal(f.nodes['event-list'].innerHTML, ''); assert.equal(f.nodes['event-staff'].hidden, true);
  console.log('3 LOCAL actual-source public Events session/error cases pass; fictional reads only');
})().catch(error => { console.error(error); process.exitCode = 1; });
