const assert = require('node:assert/strict');
const fs = require('node:fs');
global.window = global;
global.document = {addEventListener(){}};
require('../js/game.js');
require('../js/play-ux.js');

const captureItems = {
  balls: [{key:'pokeball', name:'Adventure Ball', effect:'forged', cost:0, keyOverride:'masterball'}, {key:'unknownball',name:'Unknown'}],
  berries: [{key:'berry',name:'Adventure Berry',description:'Fictional Berry.'}]
};
const original = JSON.stringify(PLAY_BALLS);
const bag = {pokeball:3, greatball:2, unknownball:5};
assert.equal(playItemLabel('pokeball',captureItems),'Adventure Ball');
assert.equal(playItemLabel('berry',captureItems),'Adventure Berry');
assert.equal(playItemLabel('pokeball'),'Poké Ball');
assert.equal(playItemLabel('pokeball',{balls:[{key:'pokeball',name:'  '}]}),'Poké Ball');
assert.equal(playItemLabel('pokeball',{balls:{name:'bad'}}),'Poké Ball');
assert.equal(playItemLabel('unknown'),'unknown');
assert.equal(playBallInfo('unknownball',captureItems),null);
const renamed = playBallInfo('pokeball',captureItems);
assert.equal(renamed.name,'Adventure Ball');
assert.equal(renamed.cost,playBallInfo('pokeball').cost);
assert.equal(renamed.effect,playBallInfo('pokeball').effect);
assert.deepEqual(playOwnedBalls(bag,captureItems).map(r=>r.key),playOwnedBalls(bag).map(r=>r.key));
assert.deepEqual(playFavoriteBalls(bag,{favoriteBalls:['greatball','pokeball']},captureItems).map(r=>r.key),['greatball','pokeball']);
assert.equal(JSON.stringify(PLAY_BALLS),original);
assert.match(playBagRowHtml('pokeball',3,captureItems),/Adventure Ball/);
assert.match(playItemDetailHtml('berry',2,captureItems),/Adventure Berry/);
assert.match(playStatusItem('berry',captureItems),/Adventure Berry selected/);
assert.match(playStatusBall('pokeball',captureItems),/Adventure Ball selected/);
assert.match(playUsedSummaryHtml({prep:'berry',ball:'pokeball'},{},captureItems),/Adventure Berry.*Adventure Ball/);
const hostile={balls:[{key:'pokeball',name:'<img src=x onerror=alert(1)>'}]};
assert.match(playItemDetailHtml('pokeball',3,hostile),/&lt;img/);
assert(!playBagRowHtml('pokeball',3,hostile).includes('<img src=x'));
assert.equal(playItemLabel('pokeball',{balls:[{key:'pokeball',name:'Next account Ball'}]}),'Next account Ball');
assert.equal(playItemLabel('pokeball'),'Poké Ball');
const inv=fs.readFileSync('js/inventory.js','utf8'),play=fs.readFileSync('js/play.js','utf8');
assert.match(inv,/lastBag = \{\}; lastCapture = null/);
assert.match(inv,/playItemLabel\(row.key, lastCapture\)/);
assert.match(play,/playOwnedBalls\(bag, data\?\.captureItems\)/);
assert.match(play,/playOwnedBalls\(bag, state\?\.captureItems\)/);
assert.match(play,/playEscapeAttr\(row.name\)/);
console.log('Catalogue names reach Bag/detail/selection/status; defaults, unknowns, escaping, account isolation and unchanged owned/favorite keys pass.');
