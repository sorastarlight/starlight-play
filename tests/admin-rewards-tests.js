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
test("Confirmed request binds target, UUID, action, reason and payload",()=>{
 const values={gift_kind:{value:"pokemon"},dex:{value:"25"},level:{value:"5"},shiny:{checked:true},reason:{value:"Gift reward"}};
 const intent=ui.makeIntent({dataset:{rewardForm:"gift"},elements:{namedItem:key=>values[key]}},null,"target","request");
 assert.deepEqual(intent,{p_user:"target",p_request:"request",p_action:"pokemon",p_payload:{dex:25,level:5,shiny:true},p_reason:"Gift reward"});
 assert(ui.intentSummary(intent,{}).includes("Kanto #25"));
});
test("Reward writes stay separate from the read allowlist and refresh is scoped",()=>{
 const source=fs.readFileSync(path.join(__dirname,"../js/admin-next.js"),"utf8");
 const allow=source.match(/const READ_RPCS = Object.freeze\(\[([\s\S]*?)\]\)/)[1];
 assert(allow.includes("admin_trainer_rewards"));assert(!allow.includes("admin_trainer_reward_action"));
 assert(source.includes("staffOpen && trainerSelectedId===userId"));
 const client=fs.readFileSync(path.join(__dirname,"../js/admin-next-rewards.js"),"utf8");
 assert(client.includes("contexts.get(root)===ctx"));assert(client.includes("ctx.pending=intent"));assert(client.includes("send(ctx.pending)"));
});
console.log(`${count} passed`);
