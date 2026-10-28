/* Disconnected diagnostic component. No production page imports this module. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.PLAY_ADMIN_HEALTH_CHECKS=api;})(typeof window==='undefined'?globalThis:window,root=>{
 'use strict';
 const titles=Object.freeze({content:'Content checks',captures:'Capture records',events:'Event readiness',economy:'Trainer & supply statistics',supplies:'Bag item totals'});
 const notes=Object.freeze({content:'Checks stored product and appearance references. It does not download images or contact Twitch.',captures:'Recorded Ball totals cover all retained history. Missing capture logs cover the last 14 days. Self-tests are separate from real gameplay acceptance.',events:'Checks event status records without scheduling, advancing or settling an event. Availability counts describe configured spawn scope, not complete acquisition coverage.',economy:'Population and median holdings exclude only the account named playtester; staff and other test accounts remain. Seven-day item mixes can include cancelled rounds, unlike the headline throw count.',supplies:'Totals cover items in bags, not My PC or pending gifts. Stone totals include the five original evolution stones only. These are statistics, not an accounting health check.'});
 const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
 const count=v=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0?v:null;
 const scalar=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0?v:null;
 const text=v=>typeof v==='string'?v.slice(0,2000):'Unavailable';
 const itemLabel=key=>{const label=root.playItemLabel?.(key);if(typeof label==='string'&&label!==key)return text(label);return({none:'No berry',unknown:'Unknown item',pokeball:'Poké Ball',greatball:'Great Ball',ultraball:'Ultra Ball',masterball:'Master Ball',oran:'Oran Berry',pecha:'Pecha Berry',razz:'Razz Berry'})[key]||'Unrecognized item: '+key;};
 const selfTestName=value=>({'Two Trainers roll independently':'Two secure random draws differ','One capture row per Trainer per encounter':'Named capture-log index exists','Duplicate throws cannot spend two Poke Balls':'Throw-processing column exists','Berries are never treated as throwable Poke Balls':'Razz and Golden Razz are not throwable Balls','Maximum chance is never exceeded':'High-chance sample stays within the configured cap','Minimum chance is never breached':'Low-chance sample stays above the configured floor','Female variants use the species base rate':'Nidoran variants use matching base rates'})[value]||text(value);
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function project(view,raw){
  if(!Object.hasOwn(titles,view)||!object(raw)||raw.error)throw Error('Check unavailable.');
  const metrics=[],tables=[];let partial=false,findings=false;const informational=view==='economy'||view==='supplies';
  const add=(key,label,scope,finding=true)=>{const value=count(raw[key]);metrics.push({label,value,scope});if(value===null)partial=true;else if(finding&&value>0)findings=true;return value;};
  if(view==='content'){
   if(typeof raw.ok!=='boolean')throw Error('Content check unavailable.');
   for(const row of [['missingIcons','Missing product artwork','Live products without an artwork reference'],['missingPortraits','Missing appearance portraits','Visible appearances without a portrait reference'],['brokenPacks','Empty reward packs','All pack products, including drafts'],['dualCurrency','Products with two prices','Products with both a PokéCoin price and Bits price'],['negativeInventory','Negative basic balances','PokéCoins or basic Poké Balls only'],['bitsInvalid','Incomplete Bits products','Live Bits products with missing required fields']])add(...row);
   if(!Array.isArray(raw.bitsCollisions)||raw.bitsCollisions.length>500){partial=true;tables.push({title:'Duplicate Bits amounts',columns:['Bits','Product codes'],rows:null});}
   else{const rows=[];for(const r of raw.bitsCollisions){if(!object(r)||count(r.bits)===null||!Array.isArray(r.skus)||r.skus.length>500||!r.skus.every(x=>typeof x==='string'&&x.length<=200)){partial=true;continue;}rows.push([r.bits,r.skus.join(', ')]);}if(rows.length)findings=true;tables.push({title:'Duplicate Bits amounts',columns:['Bits','Product codes'],rows});}
   if(raw.ok===false)findings=true;
  }else if(view==='captures'){
   if(raw.ok!==true)throw Error('Capture check unavailable.');
   for(const row of [['unknownBalls','Unknown Ball conditions','All retained capture logs'],['shinyFemaleUnflagged','Missing Shiny flags','Shiny-female logs across retained history'],['missingLogs','Missing capture logs','Rounds started in the last 14 days']])add(...row);
   const recent=object(raw.recent)?raw.recent:{};
   for(const [key,label,decimal]of [['throws','Recorded throws',false],['actual','Recorded catches',false],['expected','Expected catches from recorded chances',true]]){const value=(decimal?scalar:count)(recent[key]);if(value===null)partial=true;metrics.push({label,value,scope:'All retained non-Master-Ball logs with a recorded Ball'});}
   if(!Array.isArray(raw.selfTest)||raw.selfTest.length>500){partial=true;tables.push({title:'Self-test samples and structural checks',columns:['Check','Result','Notes'],rows:null});}
   else{const rows=[];if(!raw.selfTest.length)partial=true;for(const t of raw.selfTest){if(!object(t)||typeof t.name!=='string'||typeof t.passed!=='boolean'){partial=true;continue;}if(!t.passed)findings=true;rows.push([selfTestName(t.name),t.passed?'Passed':'Finding',text(t.detail)]);}tables.push({title:'Self-test samples and structural checks',columns:['Check','Result','Notes'],rows});}
   const build=typeof raw.clientBuild==='string'&&raw.clientBuild.length>0?text(raw.clientBuild):null;const multiplier=scalar(raw.ultraMultiplier);if(build===null||multiplier===null)partial=true;
   tables.push({title:'Reported capture configuration',columns:['Setting','Value'],rows:[['Client build',build??'Unavailable'],['Ultra Ball base multiplier',multiplier===null?'Unavailable':multiplier+'×']]});
  }else if(view==='economy'){
   if(raw.ok!==true)throw Error('Statistics unavailable.');
   for(const row of [['trainers','Trainers counted','Current profiles; excludes the exact username playtester'],['throws7d','Throws in the last 7 days','Excludes test encounters and cancelled rounds'],['catches7d','Catches in the last 7 days','Excludes test encounters and cancelled rounds'],['coinGrants7d','Recorded reward coin grants','Coins recorded as reward grants in the last 7 days; not every coin source']])add(...row,false);
   const medians=[['medianCoins','PokéCoins'],['medianPokeball','Basic Poké Balls'],['medianGreatball','Great Balls'],['medianUltraball','Ultra Balls'],['medianHoney','Honey'],['medianBerry','Oran Berries only'],['medianFamilyCandy','Family Evolution Candy'],['medianBagBonus','Purchased bag bonus only']].map(([key,label])=>{const n=count(raw[key]);if(n===null)partial=true;return[label,n===null?'Unavailable':n];});
   tables.push({title:'Median holdings (middle value per trainer)',columns:['Item or balance','Median'],rows:medians});
   const success=typeof raw.captureRate7d==='number'&&Number.isFinite(raw.captureRate7d)&&raw.captureRate7d>=0&&raw.captureRate7d<=100?raw.captureRate7d:null;
   if(success===null)partial=true;
   metrics.push({label:'Capture success over 7 days',value:success,display:raw.throws7d===0?'No recorded throws':success===null?'Unavailable':success+'%',scope:'Successful catches as a share of eligible throws'});
   for(const [key,title]of [['ballMix7d','Most-used Balls over 7 days'],['berryMix7d','Most-used berries over 7 days']]){const rawRows=raw[key];let rows=null;if(object(rawRows)&&Object.keys(rawRows).length<=8){rows=[];for(const [name,value]of Object.entries(rawRows)){const n=count(value);if(name.length>200||n===null){partial=true;continue;}rows.push([itemLabel(name),n]);}}else partial=true;tables.push({title,columns:['Item','Throws'],rows,empty:'No recorded item use.'});}
  }else if(view==='supplies'){
   if(raw.ok!==true)throw Error('Bag totals unavailable.');
   const inv=object(raw.inventory)?raw.inventory:{};const rows=[['trainers','Inventories counted'],['pokeball','Basic Poké Balls'],['greatball','Great Balls'],['ultraball','Ultra Balls'],['honey','Honey'],['oran','Oran Berries'],['masterball','Master Balls'],['linkingcord','Linking Cords'],['rarecandy','Rare Candy'],['stones','Fire, Water, Thunder, Leaf and Moon Stones']].map(([key,label])=>{const value=count(inv[key]);if(value===null)partial=true;return[label,value===null?'Unavailable':value];});tables.push({title:'Items currently in bags',columns:['Item or balance','Total'],rows});
   let warnings=null;if(Array.isArray(raw.warnings)&&raw.warnings.length<=100&&raw.warnings.every(v=>typeof v==='string'&&v.length<=2000)){warnings=raw.warnings.map(v=>[v==='Average active trainer owns 20+ Ultra Balls.'?'Average inventory holds at least 20 Ultra Balls (all inventories).':v]);}else partial=true;
   tables.push({title:'Supply notes to review',columns:['Note'],rows:warnings,empty:'No supply notes returned.'});
   // Exclude raw configuration and Bits product definitions; existing native editors own those.
  }else{
   if(!['HEALTHY','WARNING','ACTION NEEDED'].includes(raw.status))throw Error('Event check unavailable.');
   const live=add('liveCount','Live events','Currently marked LIVE',false);const waiting=add('stuckCount','Events needing attention','Waiting for stream or marked as needing staff action');
   if(live!==null&&live>1)findings=true;if(raw.status!=='HEALTHY')findings=true;
   // Deliberately exclude raw event notes, provider settings and entire scheduled records.
   if(waiting===null)partial=true;
   const eventRows=[];for(const [key,label]of [['nextScheduled','Next scheduled event'],['lastCompleted','Last completed event']]){const e=raw[key];if(e===null){eventRows.push([label,'None recorded','—']);continue;}if(!object(e)){partial=true;eventRows.push([label,'Unavailable','Unavailable']);continue;}const species=typeof e.speciesName==='string'?text(e.speciesName):'Unavailable';const value=key==='nextScheduled'?e.startsAt:e.updatedAt;const date=typeof value==='string'&&Number.isFinite(Date.parse(value))?new Date(value).toLocaleString(undefined,{timeZoneName:'short'}):'Unavailable';if(species==='Unavailable'||date==='Unavailable')partial=true;eventRows.push([label,species,date]);}
   tables.push({title:'Event timing',columns:['Event','Pokémon','Time on your device'],rows:eventRows});
   const availability=object(raw.availability)?raw.availability:{};const rows=[['normal','Ordinary spawn classification'],['special','Special spawn classification'],['total','Configured highest Pokédex number']].map(([key,label])=>{const n=count(availability[key]);if(n===null)partial=true;return[label,n===null?'Unavailable':n];});tables.push({title:'Configured spawn scope',columns:['Setting or classification','Count or Dex limit'],rows});
  }
  return{view,title:titles[view],note:notes[view],phase:findings?'findings':partial?'partial':informational?'information':'clear',partial,metrics,tables};
 }
 function controller(read,update=()=>{}){
  let active=false,epoch=0,serial=0;const state={view:'content',phase:'closed',report:null,at:null};
  const emit=()=>update(state);
  return{state,open(){active=true;if(state.phase==='closed')state.phase='idle';emit();},select(view){if(!active||!Object.hasOwn(titles,view)||view===state.view)return;serial++;Object.assign(state,{view,phase:'idle',report:null,at:null});emit();},async load(){if(!active||state.phase==='loading')return;const gen=epoch,request=++serial,view=state.view;Object.assign(state,{phase:'loading',report:null,at:null});emit();try{const raw=await read(view);if(!active||epoch!==gen||serial!==request)return;const report=project(view,raw);Object.assign(state,{phase:report.phase,report,at:new Date().toISOString()});}catch(_){if(!active||epoch!==gen||serial!==request)return;Object.assign(state,{phase:'error',report:null,at:null});}emit();},reset(){active=false;epoch++;serial++;Object.assign(state,{view:'content',phase:'closed',report:null,at:null});emit();}};
 }
 function mount(host,read){
  if(!host)return null;
  host.innerHTML=`<div class="health-check-toolbar"><label>Choose a check<select data-check-view>${Object.entries(titles).map(([v,t])=>`<option value="${v}">${esc(t)}</option>`).join('')}</select></label><button type="button" data-check-load>Load check</button></div><p data-check-note></p><p role="status" data-check-status></p><div data-check-results></div>`;
  const select=host.querySelector('select'),button=host.querySelector('button'),status=host.querySelector('[data-check-status]'),results=host.querySelector('[data-check-results]');
  const ui=controller(read,state=>{
   select.value=state.view;host.querySelector('[data-check-note]').textContent=notes[state.view];host.setAttribute('aria-busy',String(state.phase==='loading'));button.disabled=state.phase==='closed'||state.phase==='loading';button.textContent=state.report?'Refresh check':'Load check';
   const labels={closed:'Staff session ended. Reopen Checks to continue.',idle:'Choose Load check when you are ready.',loading:'Loading check…',error:'Couldn’t load this check. Choose Load check to try again.',findings:'Findings need review. No repairs have been made.',partial:'Some results are unavailable. This is not a complete check.',clear:'No findings in the checks listed below.',information:'Statistics loaded. These totals do not establish accounting or reward health.'};
   status.textContent=labels[state.phase]+(state.report?.partial&&state.phase==='findings'?' Some results are also unavailable.':'')+(state.at?' Updated '+new Date(state.at).toLocaleString(undefined,{timeZoneName:'short'})+' (your device time).':'');
   results.innerHTML=state.report?`<div class="health-check-metrics" data-count="${state.report.metrics.length}">${state.report.metrics.map(m=>`<article><h4>${esc(m.label)}</h4><strong>${m.display!==undefined?esc(m.display):m.value===null?'Unavailable':esc(m.value.toLocaleString())}</strong><p>${esc(m.scope)}</p></article>`).join('')}</div><div class="health-check-tables">${state.report.tables.map(t=>`<div class="health-check-table"><table><caption>${esc(t.title)}</caption><thead><tr>${t.columns.map(c=>`<th scope="col">${esc(c)}</th>`).join('')}</tr></thead><tbody>${t.rows===null?`<tr><td colspan="${t.columns.length}">Unavailable</td></tr>`:!t.rows.length?`<tr><td colspan="${t.columns.length}">${esc(t.empty||(state.view==='captures'?'No self-test results were returned.':'No recorded collisions.'))}</td></tr>`:t.rows.map(r=>`<tr>${r.map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`).join('')}</div>`:'';
  });
  select.addEventListener('change',()=>ui.select(select.value));button.addEventListener('click',()=>ui.load());ui.reset();return ui;
 }
 return Object.freeze({titles,project,controller,mount,esc});
});
