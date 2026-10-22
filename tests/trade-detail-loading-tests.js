const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const source = fs.readFileSync(require('node:path').join(__dirname, '../js/trade.js'), 'utf8');
const flush = async () => { for (let i = 0; i < 16; i++) await Promise.resolve(); };
function fixture() {
  const nodes = {}, calls = [], live = [];
  const node = id => nodes[id] || (nodes[id] = { value: '', textContent: '', innerHTML: '', events: {},
    addEventListener(k, fn) { this.events[k] = fn; }, querySelector() { return null; }, querySelectorAll() { return []; } });
  const channel = { on(_type, _filter, fn) { live.push(fn); return this; }, subscribe() { return this; } };
  const window = { playSupabase: { auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange() {} }, channel: () => channel },
    playShowDialog(dialog) { dialog.open = true; }, playBindAccountNav() {}, playSetAccountNav() {}, playParseSpeciesQuery: () => [], playSpeciesName: dex => `Species ${dex}`,
    playEscapeAttr: value => String(value ?? ''), playSpriteUrl: () => '', playTrainerSpriteUrl: () => '', playRpcError: error => error.message,
    playCall: (name, args) => { assert(['play_trade_board', 'play_trade_listing'].includes(name)); return new Promise((resolve, reject) => calls.push({ name, args, resolve, reject })); } };
  vm.runInNewContext(source, { window, document: { getElementById: node, hidden: false }, location: { search: '' }, URLSearchParams,
    setInterval() { return 1; }, clearInterval() {}, setTimeout, clearTimeout, console });
  return { nodes, calls, refresh() { live[0](); }, open(id) { nodes['trade-board'].events.click({ target: { closest: () => ({ dataset: { listing: id } }) } }); } };
}

const payload = name => ({ listing: { id: name, mon: { name, dex: 10, level: 5 }, trainer: {} } });
(async () => {
 let checks=0;
 async function ready(){const f=fixture();await flush();f.calls[0].resolve({listings:[]});await flush();return f;}
 let f=await ready();f.open('older');f.open('newer');f.calls[2].resolve(payload('New selection'));await flush();f.calls[1].resolve(payload('Old selection'));await flush();assert(f.nodes['listing-detail'].innerHTML.includes('New selection'));assert(!f.nodes['listing-detail'].innerHTML.includes('Old selection'));checks++;
 f=await ready();f.open('older');f.open('newer');f.calls[2].resolve(payload('Current'));await flush();f.calls[1].reject(Error('Obsolete error'));await flush();assert.equal(f.nodes['trade-status'].textContent,'');checks++;
 f=await ready();f.open('older');f.open('newer');f.calls[2].reject(Error('Current error'));await flush();f.calls[1].resolve(payload('Old selection'));await flush();assert.equal(f.nodes['trade-status'].textContent,'Current error');assert(!f.nodes['detail-modal'].open);checks++;
 f=await ready();f.open('first');f.calls[1].resolve(payload('First'));await flush();assert(f.nodes['detail-modal'].open);f.open('next');f.calls[2].resolve(payload('Next'));await flush();assert(f.nodes['listing-detail'].innerHTML.includes('Next'));checks++;
 console.log(checks+' LOCAL actual-source GTS detail response-order cases pass; fictional reads only');
})().catch(error=>{console.error(error);process.exitCode=1;});
