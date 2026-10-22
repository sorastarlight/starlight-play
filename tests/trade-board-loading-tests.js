const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const source = fs.readFileSync(require('node:path').join(__dirname, '../js/trade.js'), 'utf8');
const flush = async () => { for (let i = 0; i < 16; i++) await Promise.resolve(); };
function fixture() {
  const nodes = {}, calls = [], live = [];
  const node = id => nodes[id] || (nodes[id] = { value: '', textContent: '', innerHTML: '', events: {},
    addEventListener(k, fn) { this.events[k] = fn; }, querySelector() { return null; }, querySelectorAll() { return []; } });
  const channel = { on(_type, _filter, fn) { live.push(fn); return this; }, subscribe() { return this; } };
  const window = { playSupabase: { auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange() {} }, channel: () => channel },
    playBindAccountNav() {}, playSetAccountNav() {}, playParseSpeciesQuery: () => [], playSpeciesName: dex => `Species ${dex}`,
    playEscapeAttr: value => String(value ?? ''), playSpriteUrl: () => '', playTrainerSpriteUrl: () => '', playRpcError: error => error.message,
    playCall: (name, args) => { assert.equal(name, 'play_trade_board'); return new Promise((resolve, reject) => calls.push({ args, resolve, reject })); } };
  vm.runInNewContext(source, { window, document: { getElementById: node, hidden: false }, location: { search: '' }, URLSearchParams,
    setInterval() { return 1; }, clearInterval() {}, setTimeout, clearTimeout, console });
  return { nodes, calls, refresh() { live[0](); } };
}
const payload = name => ({ listings: name ? [{ id: name, mon: { name, dex: 10, level: 5 }, trainer: {} }] : [] });
(async () => {
  let checks = 0;
  async function ready() { const f = fixture(); await flush(); f.calls[0].resolve(payload('Initial')); await flush(); return f; }
  let f = await ready(); f.refresh(); f.refresh(); f.calls[2].resolve(payload('Newest')); await flush(); f.calls[1].resolve(payload('Obsolete')); await flush();
  assert(f.nodes['trade-board'].innerHTML.includes('Newest')); assert(!f.nodes['trade-board'].innerHTML.includes('Obsolete')); checks++;
  f = await ready(); f.refresh(); f.refresh(); f.calls[2].resolve(payload('Newest')); await flush(); f.calls[1].reject(Error('Obsolete error')); await flush();
  assert.equal(f.nodes['trade-status'].textContent, ''); checks++;
  f = await ready(); f.refresh(); f.refresh(); f.calls[2].reject(Error('Current error')); await flush(); f.calls[1].resolve(payload('Obsolete')); await flush();
  assert.equal(f.nodes['trade-status'].textContent, 'Current error'); assert(f.nodes['trade-board'].innerHTML.includes('Initial')); checks++;
  f = await ready(); f.refresh(); f.calls[1].reject(Error('Offline')); await flush(); f.refresh(); f.calls[2].resolve(payload('Recovered')); await flush();
  assert.equal(f.nodes['trade-status'].textContent, ''); assert(f.nodes['trade-board'].innerHTML.includes('Recovered')); checks++;
  f = await ready(); f.refresh(); f.refresh(); f.calls[2].resolve(payload(null)); await flush(); f.calls[1].resolve(payload('Removed listing')); await flush();
  assert(f.nodes['trade-board'].innerHTML.includes('No open trades')); assert(!f.nodes['trade-board'].innerHTML.includes('Removed listing')); checks++;
  assert(f.calls.every(call => JSON.stringify(call.args) === '{"p_query":"","p_dex":null,"p_login":null}')); checks++;
  console.log(`${checks} LOCAL actual-source GTS board ordering/retry cases pass; fictional read replies only`);
})().catch(error => { console.error(error); process.exitCode = 1; });
