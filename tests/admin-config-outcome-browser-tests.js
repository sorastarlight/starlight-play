// Isolated real DOM checks. Fictional transports only; no server or external requests.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer');
const cases = [
  {name:'rewards',file:'admin-next-config.js',api:'PLAY_ADMIN_NEXT_CONFIG',key:'participationReward',value:'26',prefix:'config',config:{participationReward:25,captureReward:25,newDexReward:100,shinyReward:250,legendaryReward:350,streamAttendanceReward:50,rewardBonusCoins:50}},
  {name:'timings',file:'admin-next-timings.js',api:'PLAY_ADMIN_TIMINGS',key:'joinSeconds',value:'21',prefix:'timings',config:{joinSeconds:20,prepareSeconds:20,throwSeconds:20,revealSeconds:10}},
  {name:'xp',file:'admin-next-progression.js',api:'PLAY_ADMIN_PROGRESSION',key:'joinXp',value:'6',prefix:'progression',config:{xpBase:100,xpExponent:1.35,joinXp:5,catchXp:10}},
  {name:'supplies',file:'admin-next-supplies.js',api:'PLAY_ADMIN_SUPPLIES',key:'participationDropChance',value:'16',reload:'[data-supply-load]',confirm:'[data-go]',config:{participationDropChance:.15,captureDropChance:.25,eventDropModifier:1}},
  {name:'capture',file:'admin-next-capture-rules.js',api:'PLAY_ADMIN_CAPTURE_RULES',key:'shinyMultiplier',value:'1.2',reload:'[data-capture-reload]',confirm:'[data-confirm]',balance:true,config:{shinyMultiplier:1,eventMultiplier:1,honeyContributorBonus:1.03,baseChanceTiers:[{minCatchRate:201,chance:.34},{minCatchRate:1,chance:.04}],honeyTiers:[{minRate:1,multiplier:1.22},{minRate:0,multiplier:1}],minChance:.02,maxChance:.85}},
  {name:'limits',file:'admin-next-limits-order.js',api:'PLAY_ADMIN_LIMITS_ORDER',kind:'capture',key:'minChance',value:'0.03',reload:'[data-bounded-load]',confirm:'[data-confirm]',balance:true,config:{minChance:.02,maxChance:.85}}
];
(async()=>{
  const browser = await puppeteer.launch({browser:'firefox',headless:true});
  let passed=0;
  try {
    const selected=cases.filter(c=>!process.argv[2]||c.name===process.argv[2]);
    assert(selected.length,'Choose an existing editor');
    for(const spec of selected) for(const outcome of ['success','denied','unknown',...(spec.name==='supplies'?['background','reset']:[])]) {
      const page=await browser.newPage();
      const errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.setRequestInterception(true);
      page.on('request',r=>r.abort());
      await page.setContent('<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'"><button id="outside">Outside editor</button><main id="editor"></main>');
      await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../js',spec.file),'utf8')});
      await page.evaluate(({spec,outcome})=>{
        window.calls=[];window.failRead=true;
        const config={...spec.config};
        const transport=async(name,args)=>{
          calls.push({name,args});
          if(!args){if(window.failRead){window.failRead=false;throw Error('Fictional read failure');}return {ok:true,[spec.balance?'balance':'config']:{...config},tables:[],revision:'a'.repeat(32)};}
          return new Promise((resolve,reject)=>window.complete=()=>{
            if(outcome==='denied')return reject(Object.assign(Error('Fictional denial'),{code:'42501'}));
            if(outcome==='unknown')return reject(Error('Fictional missing receipt'));
            Object.assign(config,args.p_balance||args.p_settings);
            resolve({ok:true,[spec.balance?'balance':'config']:{...config},tables:[],revision:'b'.repeat(32),commandQueued:false});
          });
        };
        const mountArgs=[document.querySelector('#editor'),...(spec.kind?[spec.kind]:[]),transport];
        window.app=window[spec.api].mount(...mountArgs);
        return app.open?app.open():app.load();
      },{spec,outcome});
      assert.equal(await page.evaluate(()=>app.state.phase),'error');
      await page.focus(spec.reload||`[data-${spec.prefix}-reload]`);
      await page.keyboard.press('Enter');
      await page.waitForFunction(()=>app.state.phase==='ready');
      assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('role')),'status',`${spec.name}: read retry focus`);
      await page.focus(`[name="${spec.key}"]`);
      await page.keyboard.down('Control');
      await page.keyboard.press('a');
      await page.keyboard.up('Control');
      await page.keyboard.type(spec.value);
      await page.focus('button[type=submit]');
      await page.keyboard.press('Enter');
      await page.waitForSelector('dialog[open]');
      assert(await page.evaluate(()=>document.querySelector('dialog').contains(document.activeElement)));
      await page.focus(spec.confirm||`[data-${spec.prefix}-confirm]`);
      await page.keyboard.press('Enter');
      await page.waitForFunction(()=>app.state.phase==='saving');
      if(outcome==='background'||outcome==='reset')await page.focus('#outside');
      if(outcome==='reset')await page.evaluate(()=>app.reset());
      await page.evaluate(()=>window.complete());
      await page.waitForFunction(()=>app.state.phase!=='saving');
      if(spec.name==='limits')await page.waitForFunction(()=>document.activeElement.getAttribute('role')==='status'&&document.activeElement.textContent.trim());
      const result=await page.evaluate(()=>({text:document.querySelector('[role=status]').textContent,focus:document.activeElement.id==='outside'?'outside':document.activeElement.getAttribute('role'),writes:calls.filter(c=>c.args).length,disabled:document.querySelector('fieldset')?.disabled,phase:app.state.phase,fields:document.querySelectorAll('input').length}));
      assert.equal(result.focus,outcome==='background'||outcome==='reset'?'outside':'status',`${spec.name}/${outcome}: terminal focus`);
      assert.equal(result.writes,1);
      if(outcome==='reset'){assert.equal(result.phase,'closed');assert.equal(result.fields,0);assert.doesNotMatch(result.text,/acknowledged|saved/);}
      else {
        assert.match(result.text,outcome==='success'||outcome==='background'?/acknowledged|saved/:outcome==='denied'?/denied|session changed|access changed/i:/not be confirmed|outcome uncertain/);
        if(outcome!=='denied')assert.equal(result.disabled,true);
        await page.focus(spec.reload||`[data-${spec.prefix}-reload]`);
        await page.keyboard.press('Enter');
        // Some editors require explicit local-draft discard before the read.
        if(await page.$('dialog[open]')){
          await page.focus(spec.confirm||`[data-${spec.prefix}-confirm]`);
          await page.keyboard.press('Enter');
        }
        await page.waitForFunction(()=>app.state.phase==='ready'&&!app.state.uncertain&&!app.state.locked);
        assert.equal(await page.evaluate(()=>calls.filter(c=>c.args).length),1,'Reload must never repeat the save');
        assert.equal(await page.$eval('fieldset',el=>el.disabled),false);
        assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('role')),'status');
      }
      assert.deepEqual(errors,[]);
      console.log(`PASS ${spec.name}/${outcome}: read retry, review, one fictional save, terminal focus`);
      passed++;
      await page.close();
    }
  } finally {await browser.close();}
  console.log(`PASS ${passed} Firefox DOM outcome scenarios; speech not tested`);
})().catch(e=>{console.error(e);process.exitCode=1;});
