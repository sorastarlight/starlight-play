const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict");
const source=fs.readFileSync("js/settings.js","utf8"),html=fs.readFileSync("settings.html","utf8");
const sync=source.slice(source.indexOf("  function syncSubnav()"),source.indexOf("  function setHash()"));
const start=source.indexOf('  document.querySelector(".scc-subnav")?.addEventListener("keydown"');
const keys=source.slice(start,source.indexOf('  els.workspace?.addEventListener("keydown"',start));
const names=["identity","avatar","card-style","titles","showcase","team"],listeners={};let focused="",renders=0;
const tabs=names.map(name=>({dataset:{profileTab:name},classList:{toggle(){}},attrs:{},setAttribute(k,v){this.attrs[k]=v;},focus(){focused=name;}}));
const workspace={setAttribute(k,v){this[k]=v;}};
const context={profileTab:"identity",els:{workspace},document:{querySelectorAll:()=>tabs,querySelector:()=>({addEventListener:(key,handler)=>listeners[key]=handler})},renderProfileWorkspace:()=>renders++};
vm.createContext(context);vm.runInContext(sync+keys,context);context.syncSubnav();assert.deepEqual(tabs.map(t=>t.tabIndex),[0,-1,-1,-1,-1,-1]);assert.equal(workspace["aria-labelledby"],"profile-tab-identity");
function press(index,key,mod={}){let prevented=false;listeners.keydown({target:tabs[index],key,preventDefault(){prevented=true;},...mod});return prevented;}
assert(press(0,"ArrowLeft"));assert.equal(focused,"team");assert(press(5,"ArrowRight"));assert.equal(focused,"identity");assert(press(1,"End"));assert.equal(focused,"team");assert(press(5,"Home"));assert.equal(focused,"identity");assert.equal(renders,0);assert.equal(context.profileTab,"identity");assert(!press(0,"ArrowRight",{ctrlKey:true}));assert(!press(0,"Tab"));
context.profileTab="team";context.syncSubnav();assert.deepEqual(tabs.map(t=>t.tabIndex),[-1,-1,-1,-1,-1,0]);assert.equal(workspace["aria-labelledby"],"profile-tab-team");
for(const name of names)assert(html.includes(`id="profile-tab-${name}" aria-controls="profile-workspace"`));assert(html.includes('class="scc-workspace" role="tabpanel"'));
console.log("Actual Settings tab synchronization and key handler: roving focus, wrapping, modifiers, panel naming and no focus-only rendering pass.");
