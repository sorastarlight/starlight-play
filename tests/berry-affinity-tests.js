// Player text comes from server mechanics; never advertise a local-only bonus.
const assert = require('node:assert/strict');
globalThis.window = globalThis;
require('../js/play-ux.js');
const oldText = 'A tasty Berry that makes a wild Pokémon easier to catch.';
const proposedText = 'Boosts catch chance by 5%. Extra help against Water types.';
for (const text of [oldText, proposedText]) {
  assert.equal(playItemPurpose('berry', null, {category:'berries', playerText:text, bestUse:'Cheap, common catch help.'}), text);
}
assert.equal(playItemPurpose('berry', null, {category:'berries', bestUse:oldText}), oldText);
assert.equal(playItemPurpose('pokeball', null, {category:'balls', playerText:proposedText, bestUse:'A standard Poké Ball.'}), 'A standard Poké Ball.');
const fs = require('fs'), vm = require('vm');
const source = fs.readFileSync(require.resolve('../js/store.js'), 'utf8');
const start = source.indexOf('  function purposeText('), end = source.indexOf('\n  function ', start + 2);
const context = {window:{playItemPurpose}, grantKey:row=>Object.keys(row.grants || {})[0], ballView:row=>row, itemBlurb:row=>row.blurb};
vm.createContext(context);vm.runInContext(source.slice(start,end),context);
for (const text of [oldText, proposedText]) assert.equal(context.purposeText({grants:{wiki:1},identity:{category:'berries',playerText:text,bestUse:'Old summary'}},'coins'),text);
assert.equal(context.purposeText({identity:{category:'berries',playerText:proposedText}},'bits'),'Guaranteed contents. Not a random pack.');
console.log('PASS berry descriptions follow installed server text; ordinary products and packs keep their presentation');
