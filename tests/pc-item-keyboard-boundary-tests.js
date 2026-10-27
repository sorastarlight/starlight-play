const assert=require('node:assert/strict');
const {create}=require('../js/pc-items');
const handlers={},focused=[];
const el={addEventListener:(name,fn)=>handlers[name]=fn,querySelector:s=>({focus:()=>focused.push(s)})};
create(el,{client:{},call:()=>{throw Error('Keyboard navigation must not call the server')}});
const cases=[[0,'ArrowLeft',0],[0,'ArrowUp',0],[29,'ArrowRight',29],[29,'ArrowDown',29],[8,'ArrowUp',2],[8,'ArrowDown',14],[12,'Home',0],[12,'End',29]];
for(const [slot,key,expected] of cases){let prevented=false;handlers.keydown({key,target:{closest:()=>({dataset:{slot:String(slot)}})},preventDefault:()=>prevented=true});assert(prevented);assert.equal(focused.pop(),`[data-slot="${expected}"]`)}
let prevented=false;handlers.keydown({key:'Tab',target:{closest:()=>({dataset:{slot:'0'}})},preventDefault:()=>prevented=true});assert.equal(prevented,false,'Tab must retain native navigation');
handlers.keydown({key:'ArrowDown',target:{closest:()=>null},preventDefault:()=>{throw Error('Do not intercept non-grid inputs')}});
console.log('PASS PC grid keyboard boundaries, Home/End, native Tab and non-grid inputs');
