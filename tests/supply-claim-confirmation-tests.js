const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('js/store.js','utf8');const fn=source.slice(source.indexOf('  function presentClaim('),source.indexOf('  function newOrderId('));
const queue=[],toasts=[];let id=0;const window={playPresentEnqueue:n=>queue.push(n[0]),playToast:n=>toasts.push(n),playItemLabel:k=>k};
const ctx={window,newOrderId:()=>`fresh-${++id}`};vm.createContext(ctx);vm.runInContext(fn+';this.claim=presentClaim',ctx);
const data={grants:{pokeball:5},delivery:{inBag:{pokeball:5},stored:{}}};
ctx.claim('Starlight Pass weekly crate',data,'pass');ctx.claim('Starlight Pass weekly crate',data,'pass');assert.notEqual(queue[0].id,queue[1].id);assert.match(queue[0].body,/Your Bag/);
ctx.claim('Starlight Pass weekly crate',{...data,receiptId:'week-2',delivery:{inBag:{},stored:{pokeball:5}}},'pass');assert.equal(queue[2].id,'pass:claim:week-2');assert.match(queue[2].body,/saved in My PC/);
window.playPresentEnqueue=undefined;ctx.claim('Starlight Pass weekly crate',data,'pass');assert.equal(toasts.length,4);assert.equal(toasts[3].kind,'success');
console.log('PASS supply receipt identity, identical later claims, destinations and toast fallback');
