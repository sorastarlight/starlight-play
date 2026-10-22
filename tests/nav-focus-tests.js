// Actual shared navigation source with modeled DOM keyboard events; no account/network calls.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function fixture(minimal=false){
 const keyHandlers=[],nodes={};let doc;
 function node(id){const classes=new Set();return nodes[id]={id,hidden:false,disabled:false,dataset:{},attrs:{},classList:{add:k=>classes.add(k),remove:k=>classes.delete(k),contains:k=>classes.has(k),toggle(k,on){on=on??!classes.has(k);on?classes.add(k):classes.delete(k);return on;}},setAttribute(k,v){this.attrs[k]=v;},getAttribute(k){return this.attrs[k];},removeAttribute(k){delete this.attrs[k];},addEventListener(){},querySelector(){return null;},querySelectorAll(){return [];},contains(el){return el===this||el?.parent===this;},focus(){doc.activeElement=this;}};}
 const nav=node('nav'),links=node('topnav-links'),toggle=node('nav-toggle'),button=node('account-button'),menu=node('account-menu'),navItem=node('nav-item'),accountItem=node('account-item'),outside=node('outside');navItem.parent=links;accountItem.parent=menu;menu.hidden=true;
 doc={body:{dataset:{page:'help'},classList:node('body').classList},getElementById:id=>minimal?null:nodes[id]||null,querySelector:s=>!minimal&&s==='.topnav'?nav:null,addEventListener:(event,fn)=>{if(event==='keydown')keyHandlers.push(fn);},activeElement:outside};
 const root={addEventListener(){}};vm.runInNewContext(fs.readFileSync(require.resolve('../js/nav.js'),'utf8'),{window:root,document:doc,sessionStorage:{getItem:()=>null},navigator:{onLine:true}});root.playBindAccountNav();
 return {doc,nav,links,toggle,button,menu,navItem,accountItem,outside,key(key){for(const fn of keyHandlers)fn({key});}};
}
let f=fixture();f.nav.classList.add('is-open');f.navItem.focus();f.key('Escape');assert.equal(f.doc.activeElement,f.toggle);assert(!f.nav.classList.contains('is-open'));assert.equal(f.toggle.attrs['aria-expanded'],'false');console.log('PASS Escape from navigation link closes panel and restores toggle');
f=fixture();f.button.disabled=false;f.menu.hidden=false;f.accountItem.focus();f.key('Escape');assert(f.menu.hidden);assert.equal(f.doc.activeElement,f.button);console.log('PASS Escape from account item restores account button');
f=fixture();f.nav.classList.add('is-open');f.outside.focus();f.key('Escape');assert.equal(f.doc.activeElement,f.outside);console.log('PASS Dismissing background menus does not steal unrelated modal/content focus');
f=fixture();f.outside.focus();f.key('Escape');assert.equal(f.doc.activeElement,f.outside);console.log('PASS Escape with menus closed leaves focus unchanged');
f=fixture();f.nav.classList.add('is-open');f.navItem.focus();f.key('Tab');assert(f.nav.classList.contains('is-open'));assert.equal(f.doc.activeElement,f.navItem);console.log('PASS Non-Escape keyboard handling remains unchanged');
f=fixture(true);f.key('Escape');console.log('PASS Missing navigation controls are tolerated');
console.log('6 LOCAL actual-source navigation focus checks passed');
