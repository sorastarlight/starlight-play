const assert=require('node:assert/strict'),{at,validate}=require('../js/supply-rotation'),plan=require('../data/supply-rotation-proposal.json');
validate(plan);
for(let n=0;n<1461;n++){
 const date=new Date(Date.UTC(2026,0,1+n)),r=at(plan,date);assert.equal(r.daily.coins,50);assert.equal(Object.keys(r.daily).length,2);assert.equal(Object.values(r.daily).filter(v=>v===1).length,1);assert(!Object.hasOwn(r.weekly,'masterball'));assert(!Object.hasOwn(r.weekly,'bag_bonus'));assert.equal(Object.values(r.weekly).reduce((a,b)=>a+b,0)-plan.weeklyCoins,7);
 const next=at(plan,new Date(date.getTime()+28*86400000));assert.deepEqual(next.daily,r.daily);assert.deepEqual(next.weekly,r.weekly);
}
for(const date of ['2026-03-08T23:59:59Z','2026-11-01T23:59:59Z','2027-01-03T23:59:59Z'])assert.equal(at(plan,date).daily.coins,50);
assert.throws(()=>at(plan,'invalid'));
for(const key of ['masterball','bag_bonus']){const bad=structuredClone(plan);bad.weeks[0].daily[0]=key;assert.throws(()=>validate(bad));}
assert.equal(plan.oak.candyQuantity,10);assert(!plan.oak.rareBalls.includes('masterball'));
console.log('PASS 1461 UTC dates, four-week repetition, one daily item/50 coins, seven weekly items and excluded rewards');
