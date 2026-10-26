const assert=require('node:assert/strict'),m=require('../tools/berry-drop-balance');
const items=m.pool(require('../docs/project-command-center/berry-drop-catalog-snapshot.json').rows);
for(const [xp,p] of m.anchors)assert.equal(m.chance(xp),p);
let prior=1;
for(let xp=0;xp<=100000;xp++){const p=m.chance(xp);assert(p<=prior+1e-12&&p>=.35&&p<=.9);prior=p;}
for(const xp of [-1,NaN,Infinity])assert.throws(()=>m.chance(xp));
assert.equal(m.chance(2147483647),.35);
assert(!items.some(x=>['bag_bonus','masterball','coins'].includes(x.key)));
assert(items.every(x=>x.quantity===1));
for(const rarity of Object.keys(m.weights)){
  assert.equal(m.weights[rarity].reduce((a,b)=>a+b),100);
  assert(m.expectedValue(items,rarity)>0);
  assert.equal(m.choose(items,rarity,8428,[.35,0,0]),null);
  assert(m.choose(items,rarity,0,[.899999,0,.99999]));
  for(let bucket=0;bucket<100;bucket++)assert(items.includes(m.choose(items,rarity,0,[0,(bucket+.5)/100,.5])));
}
assert.equal(m.milestones().find(x=>x.level===10).xp,8428);
assert.equal(m.milestones().find(x=>x.level===20).xp,45742);
assert(m.scenario(100,.5,50).expectedDrops>m.scenario(100,.5,50,100).expectedDrops);
console.log('Offline berry model: 100001 XP monotonicity points, reward boundaries, all rarity buckets, exclusions and progression benchmarks pass; no gameplay execution');
