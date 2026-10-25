const assert=require('node:assert/strict'),api=require('../js/admin-reward-catalog.js');
const rows=api.catalog([
{id:'ball:ultra',kind:'item',name:'Ultra Ball',category:'Poké Balls',sprite:'images/items/ultra-ball.png',enabled:true,maxQuantity:999},
{id:'pokemon:1',kind:'pokemon',name:'Bulbasaur',category:'Pokémon',sprite:'images/pokemon/home/1.png',enabled:true,maxQuantity:100},
{id:'candy:1',kind:'candy',name:'Bulbasaur Evolution Candy',category:'Evolution Candy',sprite:'images/items/evolution-candy/1.png',enabled:true,maxQuantity:999},
{id:'held',kind:'item',name:'Unavailable item',category:'Other',sprite:'images/items/honey.png',enabled:false,maxQuantity:1}]);
assert.equal(api.search(rows,'poke ball').length,1);
assert.equal(api.search(rows,'bulb candy').length,1);
assert.equal(api.search(rows,'','Pokémon').length,1);
const mon={catalogId:'pokemon:1',quantity:2,secret:true,level:5,shiny:false};
assert.deepEqual(api.preview(mon,rows,true),{name:'Secret Gift',sprite:'images/items/secret-gift.svg',secret:true});
assert.equal(api.preview(mon,rows).name,'Bulbasaur');
assert.equal(api.bundle([mon],rows).version,2);
for(const bad of [{...mon,quantity:0},{...mon,quantity:101},{...mon,quantity:1.5},{...mon,level:101},{...mon,shiny:'false'},{...mon,secret:'true'},{...mon,extra:1},{...mon,catalogId:'missing'},{catalogId:'held',quantity:1,secret:false}])assert.throws(()=>api.reward(bad,rows));
assert.throws(()=>api.reward({catalogId:'ball:ultra',quantity:1,secret:false,level:5},rows));
assert.throws(()=>api.catalog([rows[0],rows[0]]));
assert.throws(()=>api.catalog([{...rows[0],sprite:'images/../secret.png'}]));
assert.throws(()=>api.bundle([],rows));
assert.throws(()=>api.bundle(Array(101).fill(mon),rows));
console.log('Shared rewards: search, strict quantities/types, catalog identity, Pokémon details, disabled entries and concealed preview pass. Local model only; no delivery claims.');

const master={...rows[0],id:"item:masterball",name:"Master Ball"};assert.equal(api.catalog([master],"shop")[0].enabled,false);assert.equal(api.catalog([master],"pass")[0].enabled,true);assert.equal(api.catalog([master],"staff")[0].enabled,true);

assert.throws(()=>api.bundle([{...mon,quantity:60},{...mon,quantity:60}],rows));
