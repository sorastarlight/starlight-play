const assert=require("node:assert/strict");
const ui=require("../js/admin-next-rewards.js");
const record=require("../js/admin-next-record.js");
const fs=require("fs"),path=require("path");
let count=0;function test(name,fn){fn();count++;console.log("PASS "+name);}
test("Claim timestamps do not prove delivery",()=>{
 assert.equal(ui.delivery({requested:{berry:2,coins:20},items:{berry:2},coins:20}),"Delivery verified");
 assert.equal(ui.delivery({requested:{berry:2,coins:20},items:{berry:1},coins:20}),"Delivery not verified");
 assert.equal(ui.delivery({requested:{berry:2,coins:20},items:{berry:2},coins:0}),"Delivery not verified");
 assert.equal(ui.delivery({requested:{}}),"Delivery not verified");
});
test("Pass provenance remains readable when staff turns Pass off",()=>{
 const html=ui.passHtml({pass:{active:false,source:"twitch-sub",override:false,sourceBeforeOverride:"admin"}});
 assert(html.includes("Twitch subscription"));assert(html.includes("Staff gift"));assert(html.includes("Staff override: off"));assert(html.includes("Give daily rewards again"));assert(!html.includes("in snapshot"));
});
test("Reward history and labels escape arbitrary names and reasons",()=>{
 const html=ui.giftHtml({catalog:{items:[{id:'<bad>',name:'<script>'}]},actions:[{action:'<script>',reason:'<img>',status:'failed'}]});
 assert(!html.includes('<script>'));assert(!html.includes('<img>'));assert(html.includes("&lt;"));
});
test("Inventory groups use requested production labels",()=>{
 const view=record.presentProfile({account:{user:{id:"fixture"}},pane:"inventory"});
 const html=record.profileHtml(view);assert(html.includes("Evolution Candy"));assert(html.includes("PokéCoins and Inventory Space"));assert(!html.includes("in snapshot"));
});
test("Missing login is omitted instead of shown as @Unavailable",()=>{
 const html=record.profileHtml(record.presentProfile({account:{user:{id:"fixture",displayName:"Trainer"}},pane:"overview"}));
 assert(!html.includes("@Unavailable"));assert(html.includes("record-account-meta"));
});
test("Draft request binds target, UUID, action and payload before modal reason",()=>{
 const values={gift_kind:{value:"pokemon"},dex:{value:"25"},level:{value:"5"},shiny:{checked:true}};
 const intent=ui.makeIntent({dataset:{rewardForm:"gift"},elements:{namedItem:key=>values[key]}},null,"target","request");
 assert.deepEqual(intent,{p_user:"target",p_request:"request",p_action:"pokemon",p_payload:{dex:25,level:5,shiny:true},p_reason:undefined});
 assert(ui.intentSummary(intent,{}).includes("#25"));
});
test("Reward writes stay separate from the read allowlist and refresh is scoped",()=>{
 const source=fs.readFileSync(path.join(__dirname,"../js/admin-next.js"),"utf8");
 const allow=source.match(/const READ_RPCS = Object.freeze\(\[([\s\S]*?)\]\)/)[1];
 assert(allow.includes("admin_trainer_rewards"));assert(!allow.includes("admin_trainer_reward_action"));
 assert(source.includes("staffOpen && trainerSelectedId===userId"));
 const client=fs.readFileSync(path.join(__dirname,"../js/admin-next-rewards.js"),"utf8");
 assert(client.includes("contexts.get(root)===ctx"));assert(client.includes("ctx.pending=intent"));assert(client.includes("send(ctx.pending)"));
});


const vm=require('node:vm');const namesContext={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../js/species.js'),'utf8'),namesContext);global.PLAY_SPECIES=namesContext.window.PLAY_SPECIES;
test('Sprite picker search matches names, padded dex and punctuation',()=>{const gen={min:1,max:151,name:'Generation I Kanto'};assert.deepEqual(ui.searchSpecies('Pika',gen),[25]);assert.deepEqual(ui.searchSpecies('#025',gen),[25]);assert.deepEqual(ui.searchSpecies('Mr Mime',gen),[122]);assert.deepEqual(ui.searchSpecies('nidoran female',gen),[29]);assert.deepEqual(ui.searchSpecies('Chikorita',gen),[]);});
test('Appearance and ribbons are correctly named; reasons only in review',()=>{const html=ui.giftHtml({catalog:{}});assert(html.includes('Ribbon'));assert(html.includes('Gym Badge grants are not available'));assert(!html.includes('Cosmetic / other'));assert(!html.includes('name="reason"'));assert(!ui.passHtml({}).includes('name="reason"'));assert.equal(ui.kindName('team_background'),'Pokémon team background');});
test('Player item labels are reused instead of storage keys',()=>{global.playItemLabel=key=>({firestone:'Fire Stone',bait:'Honey'}[key]||key);assert.equal(ui.itemName({id:'firestone'}),'Fire Stone');assert.equal(ui.itemName({id:'bait'}),'Honey');delete global.playItemLabel;});



const catalogContext={window:{},document:{addEventListener(){}}};
for(const file of ['evolution-candy-png','ribbon-catalog','achievement-ribbon-map','play-ribbons'])vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../js/'+file+'.js'),'utf8'),catalogContext);
Object.assign(global,{PLAY_EVO_CANDY_PNG:catalogContext.window.PLAY_EVO_CANDY_PNG,PLAY_ACHIEVEMENT_RIBBON_MAP:catalogContext.window.PLAY_ACHIEVEMENT_RIBBON_MAP,playRibbonForBadge:catalogContext.window.playRibbonForBadge});
test('Evolution stages show family candy artwork and name',()=>{for(const dex of [4,5,6]){assert.equal(ui.candyLine(dex),4);assert.equal(ui.candyName(dex),'Charmander Evolution Candy');const art=ui.reviewArt({p_action:'candy',p_payload:{dex}});assert(art.includes('evolution-candy/4.png'));assert(!art.includes('pokemon/home'));}assert.equal(Object.keys(global.PLAY_EVO_CANDY_PNG).length,151);for(const line of new Set(Object.values(global.PLAY_EVO_CANDY_PNG)))assert(fs.existsSync(path.join(__dirname,'../images/items/evolution-candy/'+line+'.png')));});
test('Ribbon review uses mapped local PNG',()=>{for(const id of ['dup-5','kanto-10','dex-75']){const art=ui.reviewArt({p_action:'badge',p_payload:{id}});assert(art.includes('images/ribbons/'));const url=art.match(/src="([^"]+)"/)[1];assert(fs.existsSync(path.join(__dirname,'..',url)));}});
test('Separated gift types preserve existing server payloads',()=>{for(const [kind,action,payload] of [['coins','item',{key:'coins',qty:7}],['space','item',{key:'bag_bonus',qty:7}],['background','cosmetic',{id:'bg-kanto'}],['team_background','cosmetic',{id:'bg-kanto'}]]){const values={gift_kind:{value:kind},qty:{value:'7'},id:{value:'bg-kanto'}};const intent=ui.makeIntent({dataset:{rewardForm:'gift'},elements:{namedItem:key=>values[key]}},null,'trainer','request');assert.equal(intent.p_action,action);assert.deepEqual(intent.p_payload,payload);}});
test('Appearance categories and ordinary items filter independently',()=>{const data={catalog:{items:[{id:'coins'},{id:'bag_bonus'},{id:'pokeball'}],cosmetics:[{id:'id-bg',name:'Kanto',kind:'background'},{id:'team-bg',name:'Route',kind:'team_background'},{id:'frame',name:'Classic',kind:'frame'}]}};assert(!ui.giftFields(data,'item').includes('value="coins"'));assert(!ui.giftFields(data,'item').includes('bag_bonus'));for(const [kind,id] of [['background','id-bg'],['team_background','team-bg'],['frame','frame']]){const html=ui.giftFields(data,kind);assert(html.includes('value="'+id+'"'));for(const other of ['id-bg','team-bg','frame'].filter(x=>x!==id))assert(!html.includes('value="'+other+'"'));}});
console.log(`${count} passed`);
