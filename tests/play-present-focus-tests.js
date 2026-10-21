// Actual presentation source/public API with a small modeled DOM. No RPC or account.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
async function main(){
 const handlers=new Map(),checks=[];
 const emit=(type,event)=>{for(const fn of [...(handlers.get(type)||[])])fn(event);};
 const doc={addEventListener(type,fn){if(!handlers.has(type))handlers.set(type,new Set());handlers.get(type).add(fn);},removeEventListener(type,fn){handlers.get(type)?.delete(fn);},activeElement:null};
 const make=()=>({inert:false,isConnected:true,tabIndex:0,hidden:false,style:{},dataset:{},classList:{add(){},remove(){}},setAttribute(){},addEventListener(){},focus(){if(this.inert)return;doc.activeElement=this;emit('focusin',{target:this});},matches(){return this.disabled;},closest(){return this.hidden||this.inert;},getClientRects(){return this.hidden?[]:[{}];}});
 const opener=make(),preexistingInert=make();preexistingInert.inert=true;
 const stage=make();stage.tabIndex=-1;stage.buttons=[];stage.contains=el=>el===stage||stage.buttons.includes(el);
 Object.defineProperty(stage,'innerHTML',{set(html){stage.buttons=Array.from(html.matchAll(/<button\b([^>]*)>(.*?)<\/button>/gs),m=>Object.assign(make(),{attrs:m[1],label:m[2]}));}});
 stage.querySelector=sel=>stage.buttons.find(b=>sel.includes('data-present-equip')&&b.attrs.includes('data-present-equip'))||stage.buttons.find(b=>sel.includes('data-present-continue')&&b.attrs.includes('data-present-continue'))||null;
 stage.querySelectorAll=()=>stage.buttons;
 const overlay=make();overlay.querySelector=()=>stage;
 doc.body={children:[opener,preexistingInert],classList:{add(){},remove(){}},append(el){this.children.push(el);}};
 doc.createElement=()=>{if(!doc.body.children.includes(overlay))return overlay;return Object.assign(make(),{remove(){}});};doc.getElementById=()=>null;
 const ctx={document:doc,setTimeout,clearTimeout,console,Promise,Map,Set,window:null,sessionStorage:{getItem(){return null;},setItem(){}},localStorage:{getItem(){return null;}},matchMedia:()=>({matches:false})};ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync(require.resolve('../js/play-present.js'),'utf8'),ctx);
 const open=async kind=>{opener.focus();ctx.playPresentPreview(kind,{reducedMotion:true});await Promise.resolve();await Promise.resolve();};
 const key=(key,shiftKey=false)=>{const e={key,shiftKey,target:doc.activeElement,preventDefault(){this.prevented=true;}};emit('keydown',e);return e;};
 const pass=s=>checks.push(s);
 await open('level');assert.equal(doc.activeElement,stage.buttons[0]);assert(opener.inert&&preexistingInert.inert);pass('Level popup focuses Continue and isolates existing page controls');
 assert(key('Tab').prevented);assert.equal(doc.activeElement,stage.buttons[0]);assert(key('Tab',true).prevented);pass('Single-control forward/backward Tab wraps');
 const injected=make();doc.body.append(injected);injected.focus();assert.equal(doc.activeElement,stage.buttons[0]);pass('Focus entering newly added background content is returned to popup');
 key('Escape');await ctx.playPresentFlush();assert.equal(doc.activeElement,opener);assert(!opener.inert&&preexistingInert.inert);pass('Escape restores opener and preserves preexisting inert state');
 await open('title');assert.equal(stage.buttons.length,2);const [equip,later]=stage.buttons;assert.equal(doc.activeElement,equip);assert(key('Tab',true).prevented);assert.equal(doc.activeElement,later);assert(key('Tab').prevented);assert.equal(doc.activeElement,equip);pass('Two-control unlock wraps at both edges');
 equip.hidden=true;key('Tab');assert.equal(doc.activeElement,later);pass('A control hidden after rendering is excluded from keyboard targets');
 later.disabled=true;key('Tab');assert.equal(doc.activeElement,stage);pass('No available control keeps focus on popup stage');
 ctx.playPresentReset();await ctx.playPresentFlush();assert.equal(doc.activeElement,opener);assert(!opener.inert&&preexistingInert.inert);assert.equal(handlers.get('keydown').size,0);assert.equal(handlers.get('focusin').size,0);pass('Reset restores page interactivity/focus and removes modal listeners');
 await open('achievement');key('Escape');await ctx.playPresentFlush();assert.equal(doc.activeElement,opener);pass('A subsequent achievement popup remains dismissible after reset');
 console.log(JSON.stringify({classification:'LOCAL HARNESS actual-source modeled-DOM events;not native keyboard or screen-reader certification',passed:checks.length,checks},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
