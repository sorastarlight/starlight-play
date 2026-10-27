const fs=require('fs'),assert=require('node:assert/strict'),vm=require('node:vm'),calendar=require('../js/pass-calendar');
const days=Array.from({length:7},(_,i)=>({start:new Date(Date.UTC(2026,9,26+i)).toISOString(),today:i===2,state:i<2?'unverified':i===2?'ready':'upcoming'}));
const html=calendar.html({oakDays:days},true,{scope:'oak'});
assert.equal((html.match(/Tomorrow's Reward!/g)||[]).length,1);assert(html.includes('Soon~'));assert(html.includes('Unclaimed'));assert(html.includes('Today · Day 3'));assert(calendar.dayDetails({unavailable:true,status:'Soon~'}).includes('Not Available Yet'));
const src=fs.readFileSync('js/nav.js','utf8'),start=src.indexOf('  function pcGiftBadge()'),end=src.indexOf('  window.addEventListener("play-notifications-changed"',start),memory={},nodes=[];
const ctx={window:{addEventListener(){}},localStorage:{getItem:k=>memory[k],setItem:(k,v)=>memory[k]=v},document:{querySelectorAll:()=>nodes.splice(0).map(()=>({remove(){}})),querySelector:()=>({insertAdjacentHTML:(_,s)=>nodes.push(s)})}};
vm.createContext(ctx);vm.runInContext("let notificationUser='trainer-a';"+src.slice(start,end)+";globalThis.switchUser=id=>{notificationUser=id;pcGiftBadge();}",ctx);
ctx.window.playSetPcGiftCount(null);assert.equal(nodes.length,1);ctx.switchUser('trainer-b');assert.equal(nodes.length,0);ctx.window.playSetPcGiftCount(8,'trainer-a');assert.equal(nodes.length,0);ctx.switchUser('trainer-a');assert.equal(nodes.length,1);ctx.window.playSetPcGiftCount(0);assert.equal(nodes.length,0);ctx.switchUser(null);assert.equal(nodes.length,0);
console.log('Calendar labels, future preview denial and account-isolated observed gift badge pass');
