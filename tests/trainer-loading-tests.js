const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const source = fs.readFileSync(require('node:path').join(__dirname, '../js/trainer.js'), 'utf8');
const flush = async () => { for (let i = 0; i < 24; i++) await Promise.resolve(); };
function fixture(failSession = false) {
  let authChange;
  const nodes = {}, calls = [], inspections = [];
  const node = id => nodes[id] || (nodes[id] = { hidden: id === 'profile', textContent: '', innerHTML: '', dataset: {}, events: {}, classList: { add() {}, remove() {} }, addEventListener(k, fn) { this.events[k] = fn; } });
  const window = { playSupabase: { auth: { getSession: async () => { if (failSession) throw Error('Session unavailable'); return { data: { session: null } }; }, onAuthStateChange: fn => authChange = fn } },
    playBindAccountNav() {}, playSetAccountNav() {}, playAuthNoise: () => false, playRpcError: error => error.message,
    playRenderIdCard: view => view.name, playRenderTrainerShowcaseHtml: () => '', playRenderTrainerPartyHtml: () => '', playRenderAdventureLogHtml: () => '',
    playOpenTeamMonInspect: mon => inspections.push(mon), playCall: name => { assert.equal(name, 'play_trainer'); return new Promise((resolve, reject) => calls.push({ resolve, reject })); } };
  vm.runInNewContext(source.replace(/  load\(\);\s*\}\)\(\);\s*$/, '  load().catch(error => { window.bootstrapError = error.message; });\n})();'), { window, document: { getElementById: node }, location: { search: '?u=fictional-public' }, URLSearchParams, requestAnimationFrame: fn => fn() });
  return { nodes, calls, inspections, window, reload() { authChange('SIGNED_IN', null); }, inspect(id) { nodes['trainer-team-body'].events.click({ target: { closest: () => ({ getAttribute: () => id }) } }); } };
}
const payload = name => ({ mine: false, trainer: { name, team: [{ id: 'same-id', name }] } });
(async () => {
  let f = fixture(true); await flush(); assert.equal(f.window.bootstrapError, undefined); assert.equal(f.nodes.gate.textContent, 'Session unavailable'); assert.equal(f.calls.length, 0);
  f = fixture(); await flush(); f.calls[0].resolve(payload('First team')); await flush(); f.inspect('same-id'); assert.equal(f.inspections.at(-1).name, 'First team');
  assert.equal(f.nodes['page-title'].textContent, 'Trainer ID');
  assert.equal(f.nodes['tid-team-h'].textContent, 'Team');
  assert.equal(f.nodes['page-description'].textContent, "This trainer's public profile, team and adventure journal.");
  f.reload(); await flush(); f.calls[1].resolve(payload('Updated team')); await flush(); f.inspect('same-id'); assert.equal(f.inspections.at(-1).name, 'Updated team');
  f.reload(); await flush(); f.calls[2].resolve({ mine: false, trainer: { name: 'Empty', team: [] } }); await flush(); const count = f.inspections.length; f.inspect('same-id'); assert.equal(f.inspections.length, count);
  console.log('4 LOCAL actual-source Trainer error/current-team cases pass;fictional public reads only');
})().catch(error => { console.error(error); process.exitCode = 1; });
