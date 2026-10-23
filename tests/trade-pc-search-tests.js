const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(path.join(__dirname, '../js/trade.js'), 'utf8');
const start = source.indexOf('  function renderListPc()');
const end = source.indexOf('  function shinyLabel(mon)', start);
assert(start >= 0 && end > start, 'Actual listing search function exists');
const mons = [
  { id: 'bulbasaur', dex: 1, name: 'Bulbasaur', nickname: 'Sprout', gender: 'Male', variant: 'normal' },
  { id: 'pikachu', dex: 25, name: 'Pikachu', gender: 'Female', variant: 'normal' },
  { id: 'shiny-pikachu', dex: 25, name: 'Pikachu', gender: 'Female', variant: 'shiny' },
  { id: 'unknown', name: 'Mystery', variant: 'normal' }
];
const context = {
  els: { listPcSearch: { value: '' }, listPcDupes: { checked: false }, listPcGrid: { innerHTML: '' } },
  availableMons: () => mons,
  ownedCount: dex => mons.filter(mon => mon.dex === dex).length,
  shinyLabel: mon => String(mon.variant || '').includes('shiny') ? 'shiny' : '',
  pcTile: mon => `[${mon.id}]`,
  listingMon: null
};
vm.createContext(context);
vm.runInContext(source.slice(start, end) + '\nthis.render = renderListPc;', context);
function matches(query) {
  context.els.listPcSearch.value = query;
  context.render();
  return [...context.els.listPcGrid.innerHTML.matchAll(/\[([^\]]+)\]/g)].map(match => match[1]);
}
assert.deepEqual(matches('pIkA'), ['pikachu', 'shiny-pikachu']);
assert.deepEqual(matches('sprout'), ['bulbasaur']);
assert.deepEqual(matches('025'), ['pikachu', 'shiny-pikachu']);
assert.deepEqual(matches('#25'), ['pikachu', 'shiny-pikachu']);
assert.deepEqual(matches('#025'), ['pikachu', 'shiny-pikachu']);
assert.deepEqual(matches('shiny'), ['shiny-pikachu']);
assert.deepEqual(matches('000'), [], 'Missing dex must not invent dex zero');
context.els.listPcDupes.checked = true;
assert.deepEqual(matches(''), ['pikachu', 'shiny-pikachu']);
assert.deepEqual(matches('no match'), []);
assert(context.els.listPcGrid.innerHTML.includes('No Pokémon match this search'));
context.availableMons = () => [];
assert.deepEqual(matches(''), []);
assert(context.els.listPcGrid.innerHTML.includes('Turn off Show duplicates'));
context.els.listPcDupes.checked = false;
assert.deepEqual(matches(''), []);
assert(context.els.listPcGrid.innerHTML.includes('No Pokémon are available to list'));
console.log('12 LOCAL actual GTS picker search/empty-state cases passed; no RPC/DOM mutation authority');
