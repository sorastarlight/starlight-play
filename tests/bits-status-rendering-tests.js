// Actual rendering source only; no SDK, staff bootstrap, provider request or RPC.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('js/admin-tools.js','utf8'),nav=fs.readFileSync('js/nav.js','utf8');
const window={};vm.runInNewContext(nav.match(/window\.playEscapeAttr = function[\s\S]*?^};/m)[0],{window});
const payload='Fictional <em data-probe="literal">message</em> & "quotes"';
const templates=[...source.matchAll(/`<span class="status-(?:ok|bad)">[^`]*`/g)].map(m=>m[0]).filter(t=>/\$\{/.test(t));
let checks=0;
for(const template of templates){const html=new Function('window','info','data','error','return '+template)(window,{message:payload,status:payload},{message:payload},{message:payload});assert(!html.includes('<em'),'Bits response/error text must not become markup');assert(html.includes('&lt;em'),'Bits response/error text must remain visible');checks++;}
const render=source.slice(source.indexOf('  function renderBitsStatus(bits)'),source.indexOf('  async function loadBitsFulfillment()'));
const node={innerHTML:''},context={window,els:{bitsAutoStatus:node},bitsSticky:''};vm.createContext(context);vm.runInContext(render,context);
for(const [info,expected] of [[{status:payload},'Twitch status:'],[{status:'disabled',lastDetail:payload},'Last grant:'],[{pending:payload},'waiting for a Play sign-in.']]){context.input=info;vm.runInContext('renderBitsStatus(input)',context);assert(node.innerHTML.includes(expected));assert(!node.innerHTML.includes('<em'));assert(node.innerHTML.includes('&lt;em'));checks++;}
context.input={connected:true,pending:1};vm.runInContext('renderBitsStatus(input)',context);assert(node.innerHTML.includes('Auto-credit is on.'));assert(node.innerHTML.includes('1 pack waiting'));checks++;
context.bitsSticky='<span class="status-ok">Known safe status</span>';vm.runInContext('renderBitsStatus({})',context);assert.equal(node.innerHTML,context.bitsSticky);checks++;
assert(templates.length>=6);console.log(checks+' actual Bits status/template checks; text escaped, layout and status behavior preserved; no RPC/network');
