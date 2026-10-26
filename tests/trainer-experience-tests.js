const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('js/store.js','utf8');
const start=source.indexOf('  function setCartQty('),end=source.indexOf('\n  function renderFloors',start);
const fixture=`let cart=[],checkoutNote='',lastPurchase=null;const CART_MAX_QTY=99,lastOwned=['owned'];const items={ball:{},pack:{pack:'new'},owned:{pack:'owned'},bits:{bits:50}};const findSku=k=>items[k];let saves=0,renders=0;const saveCart=()=>saves++,syncCheckoutUi=()=>renders++;${source.slice(start,end)};globalThis.change=setCartQty;globalThis.rows=()=>JSON.parse(JSON.stringify(cart));`;
const ctx=vm.createContext({});vm.runInContext(fixture,ctx);
ctx.change('ball',7);assert.deepEqual(JSON.parse(JSON.stringify(ctx.rows())),[{sku:'ball',qty:7}]);ctx.change('ball',1000);assert.equal(ctx.rows()[0].qty,99);ctx.change('ball',0);assert.equal(ctx.rows().length,0);
ctx.change('pack',5);assert.equal(ctx.rows()[0].qty,1);ctx.change('owned',1);ctx.change('bits',1);ctx.change('missing',1);assert.equal(ctx.rows().length,1);
const nav=fs.readFileSync('js/nav.js','utf8');const handlers={};class Dialog{constructor(){this.open=true;this.allow=true;}matches(){return this.open;}getBoundingClientRect(){return{left:100,top:100,right:300,bottom:300};}dispatchEvent(){return this.allow;}close(){this.open=false;}}
vm.runInNewContext(nav.slice(nav.indexOf('// Dismiss only a deliberate')),{document:{addEventListener:(n,f)=>handlers[n]=f},HTMLDialogElement:Dialog,Event:class{}});
const click=(d,x,y,button=0)=>{const e={target:d,clientX:x,clientY:y,button};handlers.pointerdown(e);handlers.click(e);};
let d=new Dialog();click(d,200,200);assert(d.open);click(d,10,10,2);assert(d.open);click(d,10,10);assert(!d.open);d=new Dialog();d.allow=false;click(d,10,10);assert(d.open);d=new Dialog();handlers.pointerdown({target:d,button:0,clientX:200,clientY:200});handlers.click({target:d,button:0,clientX:10,clientY:10});assert(d.open);
console.log('Cart quantity bounds/ownership/payment exclusion and modal inside/right-click/drag/cancel safeguards pass');

