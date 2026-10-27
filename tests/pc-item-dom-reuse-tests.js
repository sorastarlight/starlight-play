const assert=require('node:assert/strict');
const {cards,reorderCells}=require('../js/pc-items');
const grid=require('./helpers/pc-grid-dom')();
const original=['a','b',...Array(28).fill(null)];
grid.innerHTML=cards({slots:original,stored:{a:3,b:4}},'',k=>k,()=>'/sprite.png');
const before=grid.children.slice(),images=before.map(n=>n.image),next=original.slice();
[next[0],next[12]]=[next[12],next[0]];
reorderCells(grid,next);
assert.equal(grid.children[12],before[0]);assert.equal(grid.children[12].image,images[0]);
assert.equal(grid.children[1],before[1]);assert.equal(new Set(grid.children).size,30);
for(let i=0;i<30;i++)assert.equal(grid.children[i].dataset.slot,String(i));
reorderCells(grid,original);
assert.equal(grid.children[0],before[0]);assert.equal(grid.children[1],before[1]);
assert(before.every(n=>grid.children.includes(n)),'all cells survive both moves');
const order=grid.children.slice();assert.throws(()=>reorderCells(grid,['unknown',...Array(29).fill(null)]));assert.deepEqual(grid.children,order,'drift refuses before touching DOM');
console.log('PASS item moves preserve all cell and sprite identities; slot indices and drift refusal');

// Repeated arrangements across sparse and full boxes must preserve decoded nodes.
for(const occupied of [1,12,30]){
 const box=require('./helpers/pc-grid-dom')();
 const layout=Array.from({length:30},(_,i)=>i<occupied?'item'+i:null);
 box.innerHTML=cards({slots:layout,stored:Object.fromEntries(layout.filter(Boolean).map(k=>[k,17]))},'',k=>k,()=>'/sprite.png');
 const nodes=box.children.slice(),byKey=new Map(nodes.filter(n=>n.dataset.select).map(n=>[n.dataset.select,{node:n,image:n.image}]));
 let seed=12345;
 for(let step=0;step<500;step++){
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;const a=seed%30;
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;const b=seed%30;
  [layout[a],layout[b]]=[layout[b],layout[a]];reorderCells(box,layout);
  assert.equal(box.children.length,30);assert.equal(new Set(box.children).size,30);
  assert(nodes.every(node=>box.children.includes(node)));
  layout.forEach((key,i)=>{assert.equal(box.children[i].dataset.slot,String(i));assert.equal(box.children[i].dataset.select||null,key);if(key){assert.equal(box.children[i],byKey.get(key).node);assert.equal(box.children[i].image,byKey.get(key).image);}});
 }
}
console.log('PASS 1500 seeded sparse/partial/full arrangements preserve nodes, sprites and slot order');
