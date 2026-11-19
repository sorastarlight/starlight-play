// Actual gift-choice/review UI. Fictional catalogs and stubbed writes only.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),puppeteer=require('puppeteer');
async function appearanceFixture(){
 window.writes=[];window.ids=0;
 Object.defineProperty(crypto,'randomUUID',{value:()=>`11111111-1111-4111-8111-${String(++ids).padStart(12,'0')}`,configurable:true});
 window.PLAY_ACHIEVEMENT_RIBBON_MAP={mappings:[{badgeId:'fixture-ribbon',localIcon:'images/ribbons/fixture.png'}]};
 window.giftData={canWrite:true,catalog:{items:[],titles:[{id:'fixture-title',name:'Forest Friend'},{id:'fixture-title-2',name:'Helpful Trainer'}],badges:[{id:'fixture-ribbon',name:'Forest Ribbon'},{id:'fixture-ribbon-2',name:'Helpful Ribbon'}],cosmetics:[{id:'fixture-bg',kind:'background',name:'Forest Clearing'},{id:'fixture-bg-2',kind:'background',name:'Quiet Garden'},{id:'fixture-team',kind:'team_background',name:'Forest Team'},{id:'fixture-frame',kind:'frame',name:'Retired Forest Frame'}]},actions:[]};
 window.mountAppearance=()=>PLAY_ADMIN_REWARDS.mount(document.querySelector('#editor'),{id:'fictional-trainer',login:'FixtureTrainer'},'gifts',{previewOnly:window.previewOnly===true,read:async()=>structuredClone(giftData),write:async intent=>{writes.push(structuredClone(intent));return{ok:true,requestId:intent.p_request,message:'Fictional appearance gift confirmed.'};}});
 window.chooseGiftKind=kind=>{const n=document.querySelector('[name=gift_kind]');n.focus();n.value=kind;n.dispatchEvent(new Event('change',{bubbles:true}));};
 await mountAppearance();
}
(async()=>{const b=await puppeteer.launch({browser:'firefox',headless:true});try{
 for(const kind of ['title','badge','background','team_background'])for(const mode of ['search','cancel','success','stale','preview','reopen','filter-selected','switch-kind']){
  if(process.env.APPEARANCE_CASE&&process.env.APPEARANCE_CASE!==kind+'/'+mode)continue;
  const p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(5000);await p.setRequestInterception(true);p.on('request',r=>r.abort());await p.setContent('<button id="outside">Outside editor</button><main id="editor"><div data-trainer-rewards></div></main>');await p.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../js/admin-next-rewards.js'),'utf8')});await p.evaluate(mode=>window.previewOnly=mode==='preview',mode);await p.evaluate(appearanceFixture);await p.evaluate(kind=>chooseGiftKind(kind),kind);
  const id={title:'fixture-title',badge:'fixture-ribbon',background:'fixture-bg',team_background:'fixture-team'}[kind],name={title:'Forest Friend',badge:'Forest Ribbon',background:'Forest Clearing',team_background:'Forest Team'}[kind];
  const values=await p.$$eval('[data-gift-choice] option',n=>n.map(x=>x.value));assert(values.includes(id));assert(!values.includes('fixture-frame'));assert.deepEqual(values.filter(Boolean).sort(),{title:['fixture-title','fixture-title-2'],badge:['fixture-ribbon','fixture-ribbon-2'],background:['fixture-bg','fixture-bg-2'],team_background:['fixture-team']}[kind].sort());
  if(mode==='filter-selected'){await p.select('[name=id]',id);await p.focus('[data-gift-search]');await p.keyboard.type('zzzz');await p.keyboard.press('Enter');assert.equal(await p.$eval('[name=id]',n=>n.value),'');assert.equal(await p.$eval('[name=id]',n=>n.validity.valid),false);await p.focus('[data-reward-form] [type=submit]');await p.keyboard.press('Enter');assert.equal(await p.$('dialog'),null);}
  else if(mode==='switch-kind'){await p.select('[name=id]',id);await p.evaluate(kind=>chooseGiftKind(kind==='badge'?'title':'badge'),kind);assert.equal(await p.$eval('[name=id]',n=>n.value),'');assert.equal(await p.$eval('[name=id]',n=>n.validity.valid),false);}
  else if(mode==='search'){
   for(const query of ['zzzz','Forest']){await p.focus('[data-gift-search]');await p.keyboard.down('Control');await p.keyboard.press('a');await p.keyboard.up('Control');await p.keyboard.type(query);await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>document.activeElement.getAttribute('role')),'status');assert.match(await p.$eval('[data-choice-count]',n=>n.getAttribute('aria-label')),query==='zzzz'?/No matching/:/Matches: 1/);assert.equal(await p.$('dialog'),null);}
   await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>document.activeElement.name),'id');await p.select('[name=id]',id);
  }else{
   await p.select('[name=id]',id);await p.focus('[data-reward-form] [type=submit]');await p.keyboard.press('Enter');await p.waitForSelector('.reward-review-form');assert.match(await p.$eval('.reward-review-hero',n=>n.textContent),new RegExp(name+'.*FixtureTrainer'));if(kind==='badge')assert.match(await p.$eval('.reward-review-hero img',n=>n.getAttribute('src')),/ribbons\/fixture.png/);
   if(mode==='cancel'){await p.keyboard.press('Escape');await new Promise(r=>setTimeout(r,100));assert.equal(await p.evaluate(()=>document.activeElement.textContent),'Review gift');}
   else{
    if(mode==='reopen'){await p.evaluate(()=>window.oldAppearanceReview=document.querySelector('dialog form'));await p.keyboard.press('Escape');await new Promise(r=>setTimeout(r,100));await p.keyboard.press('Enter');await p.waitForSelector('.reward-review-form');await p.evaluate(()=>{oldAppearanceReview.querySelector('textarea').value='Obsolete fixture review';oldAppearanceReview.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));});assert.equal(await p.evaluate(()=>writes.length),0);}
    await p.evaluate(mode=>{const d=document.querySelector('dialog'),f=d.querySelector('form');f.querySelector('textarea').value='Local fixture review';if(mode==='stale')d.close();f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));},mode);await new Promise(r=>setTimeout(r,260));
   }
  }
  const expected=['success','reopen'].includes(mode)?1:0;assert.equal(await p.evaluate(()=>writes.length),expected);if(expected){const intent=await p.evaluate(()=>writes[0]);assert.equal(intent.p_user,'fictional-trainer');assert.equal(intent.p_action,['background','team_background'].includes(kind)?'cosmetic':kind);assert.deepEqual(intent.p_payload,{id});assert.equal(intent.p_reason,'Local fixture review');}assert.deepEqual(errors,[]);console.log('PASS appearance gift '+kind+'/'+mode);await p.close();
 }
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
