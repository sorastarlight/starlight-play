const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const api=require('../js/admin-reward-catalog.js');
const root={PLAY_REWARD_CATALOG:api};vm.runInNewContext(fs.readFileSync('js/admin-reward-picker.js','utf8'),{window:root});
const master={id:'item:masterball',kind:'item',name:'Master Ball',category:'Balls',sprite:'images/items/master-ball.png',enabled:true,maxQuantity:100};
function host(){const nodes=new Map(),listeners=new Map();return {listeners,innerHTML:'',querySelector(selector){if(!nodes.has(selector))nodes.set(selector,{value:'',textContent:'',innerHTML:''});return nodes.get(selector);},addEventListener(t,h){if(!listeners.has(t))listeners.set(t,new Set());listeners.get(t).add(h);},removeEventListener(t,h){listeners.get(t).delete(h);},replaceChildren(){this.innerHTML='';}};}
const h=host();const shop=root.PLAY_REWARD_PICKER.mount(h,[master],()=>{},'shop');
assert.match(h.querySelector('[data-reward-results]').innerHTML,/Staff gifts and Pass rewards only/);
assert.equal([...h.listeners.values()].reduce((n,s)=>n+s.size,0),4);
shop.clear();shop.clear();assert.equal([...h.listeners.values()].reduce((n,s)=>n+s.size,0),0);
for(const context of ['pass','staff']){const picker=root.PLAY_REWARD_PICKER.mount(h,[master],()=>{},context);assert.doesNotMatch(h.querySelector('[data-reward-results]').innerHTML,/Staff gifts and Pass rewards only/);picker.clear();}
assert.throws(()=>root.PLAY_REWARD_PICKER.mount(h,[master],()=>{},'unknown'));
console.log('Reward picker: purchase policy propagated; Pass/staff allowed; teardown removes handlers before remount.');
