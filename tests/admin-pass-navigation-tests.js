const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const source=fs.readFileSync(process.argv[2]||'js/admin-next-pass.js','utf8');
const start=source.indexOf("doc.addEventListener('click'"),end=source.indexOf("doc.defaultView.addEventListener('beforeunload'",start);
assert(start>=0&&end>start);
function fixture(phase='saving',dirty=true){
  let handler,confirm=0,discard=0,reset=0,clicked=0,prevented=0,stopped=0;const dialogs=[];
  const model={state:{phase,locked:false},dirty:()=>dirty,discard(){discard++;dirty=false;},reset(){reset++;dirty=false;}};
  const link={dataset:{nextTab:'mart'},click(){clicked++;}};
  const context={model,root:{contains:()=>false,closest:()=>null},doc:{addEventListener(name,fn,capture){assert.equal(name,'click');assert.equal(capture,true);handler=fn;}},modal(title,body){const back={textContent:''};dialogs.push({title,body,back});return{querySelector:()=>back};},confirmDiscard(fn){confirm++;fn();}};
  vm.runInNewContext(source.slice(start,end),context);
  const event={target:{closest:()=>link},preventDefault(){prevented++;},stopImmediatePropagation(){stopped++;}};
  return {event,link,model,dialogs,run(){handler(event);return {confirm,discard,reset,clicked,prevented,stopped};}};
}
const pending=fixture();assert.deepEqual(pending.run(),{confirm:0,discard:0,reset:0,clicked:0,prevented:1,stopped:1});assert.equal(pending.dialogs[0].title,'Save in progress');assert(pending.dialogs[0].body.includes('does not cancel or repeat'));assert.equal(pending.dialogs[0].back.textContent,'Return to pending save');
const ready=fixture('ready');assert.deepEqual(ready.run(),{confirm:1,discard:1,reset:0,clicked:1,prevented:1,stopped:1});
const uncertain=fixture('ready');uncertain.model.state.locked=true;assert.equal(uncertain.run().reset,1);
for(const modifier of ['ctrlKey','metaKey','shiftKey','altKey']){const f=fixture();f.event[modifier]=true;assert.equal(f.run().prevented,0);}
const same=fixture();same.link.dataset.nextTab='config';assert.equal(same.run().prevented,0);const clean=fixture('ready',false);assert.equal(clean.run().prevented,0);
console.log('Actual navigation handler: pending save has no discard/retry, ready/uncertain paths and modifier/current-tab behavior pass.');
