const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('node:assert/strict');
const source = fs.readFileSync(path.join(__dirname, '../js/content-picker.js'), 'utf8');
const flush = async () => { for (let i = 0; i < 16; i++) await Promise.resolve(); };
function fixture() {
  const calls = [], nodes = {};
  function node(id) { return nodes[id] || (nodes[id] = { value: '', textContent: '', innerHTML: '', events: new Map(), hidden: false,
    addEventListener(name, fn) { if (!this.events.has(name)) this.events.set(name, new Set()); this.events.get(name).add(fn); },
    removeEventListener(name, fn) { this.events.get(name)?.delete(fn); },
    fire(name, event = {}) { for (const fn of [...(this.events.get(name) || [])]) fn(event); },
    closest() { return node('quantity-field'); }, focus() {} }); }
  const dialog = node('dialog'); dialog.querySelector = selector => node(selector);
  dialog.showModal = () => { dialog.open = true; }; dialog.close = () => { dialog.open = false; dialog.fire('close'); };
  const window = { playRpcError: e => e.message, playCall(name, args) { assert.equal(name, 'admin_content_picker'); return new Promise((resolve, reject) => calls.push({ args, resolve, reject })); } };
  vm.runInNewContext(source, { window, document: { getElementById: () => dialog } });
  return { window, dialog, nodes, calls, open: options => window.playContentPicker.open(options), filter(value) { node('#picker-kind').value = value; node('#picker-kind').fire('change'); } };
}
const items = { items: [{ kind: 'item', key: 'poke-ball.png', name: 'Poké Ball' }], avatars: [] };
const avatars = { items: [], avatars: [{ kind: 'avatar', key: 'fictional.png', name: 'Fictional trainer' }] };
(async () => {
  let count = 0;
  let f = fixture(), pending = f.open(); f.filter('avatars'); f.calls[1].resolve(avatars); await flush(); assert.match(f.nodes['#picker-grid'].innerHTML, /Fictional trainer/); f.calls[0].resolve(items); await flush(); assert.match(f.nodes['#picker-grid'].innerHTML, /Fictional trainer/); f.dialog.close(); await pending; count++;
  f = fixture(); pending = f.open(); f.filter('avatars'); f.calls[1].resolve(avatars); await flush(); f.calls[0].reject(Error('old error')); await flush(); assert.equal(f.nodes['#picker-status'].textContent, ''); f.dialog.close(); await pending; count++;
  f = fixture(); pending = f.open(); f.filter('avatars'); f.calls[1].reject(Error('current error')); await flush(); f.calls[0].resolve(items); await flush(); assert.equal(f.nodes['#picker-status'].textContent, 'current error'); f.dialog.close(); await pending; count++;
  f = fixture(); pending = f.open(); f.dialog.close(); assert.equal(await pending, null); const second = f.open({ kind: 'avatars' }); f.calls[1].resolve(avatars); await flush(); f.calls[0].resolve(items); await flush(); assert.match(f.nodes['#picker-grid'].innerHTML, /Fictional trainer/); f.dialog.close(); await second; count++;
  f = fixture(); pending = f.open(); f.dialog.close(); await pending; const next = f.open(); f.calls[1].resolve(items); await flush(); f.calls[0].reject(Error('closed error')); await flush(); assert.equal(f.nodes['#picker-status'].textContent, ''); f.dialog.close(); await next; count++;
  f = fixture(); pending = f.open(); f.calls[0].reject(Error('try again')); await flush(); assert.equal(f.nodes['#picker-status'].textContent, 'try again'); f.filter('items'); f.calls[1].resolve(items); await flush(); assert.equal(f.nodes['#picker-status'].textContent, ''); assert.match(f.nodes['#picker-grid'].innerHTML, /Poké Ball/); f.dialog.close(); await pending; count++;
  f = fixture(); pending = f.open({ qty: 3 }); f.calls[0].resolve(items); await flush(); f.nodes['#picker-grid'].fire('click', { target: { closest: () => ({ dataset: { kind: 'item', key: 'poke-ball.png' }, querySelector: () => ({ textContent: 'Poké Ball' }) }) } }); const selected = await pending; assert.equal(selected.key, 'poke-ball.png'); assert.equal(selected.qty, 3); assert.equal(f.nodes['#picker-grid'].events.get('click').size, 0); count++;
  console.log(count + ' LOCAL actual-source content-picker request/lifecycle cases passed; fictional RPC only');
})().catch(error => { console.error(error); process.exitCode = 1; });
