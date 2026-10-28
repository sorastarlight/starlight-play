/* Disconnected diagnostic component. No production page imports this module. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PLAY_ADMIN_HEALTH_CHECKS=api;})(typeof window==='undefined'?globalThis:window,()=>{
 'use strict';
 const titles=Object.freeze({content:'Content checks',captures:'Capture records',events:'Event readiness'});
 const notes=Object.freeze({content:'Checks stored product and appearance references. It does not download images or contact Twitch.',captures:'Recorded Ball totals cover all retained history. Missing capture logs cover the last 14 days. Self-tests are separate from real gameplay acceptance.',events:'Checks event status records without scheduling, advancing or settling an event.'});
 const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
 const count=v=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0?v:null;
 const scalar=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0?v:null;
 const text=v=>typeof v==='string'?v.slice(0,2000):'Unavailable';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function project(view,raw){
  if(!Object.hasOwn(titles,view)||!object(raw)||raw.error)throw Error('Check unavailable.');
  const metrics=[],tables=[];let partial=false,findings=false;
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
   if(!Array.isArray(raw.selfTest)||raw.selfTest.length>500){partial=true;tables.push({title:'Separate self-test results',columns:['Check','Result','Notes'],rows:null});}
   else{const rows=[];if(!raw.selfTest.length)partial=true;for(const t of raw.selfTest){if(!object(t)||typeof t.name!=='string'||typeof t.passed!=='boolean'){partial=true;continue;}if(!t.passed)findings=true;rows.push([text(t.name),t.passed?'Passed':'Finding',text(t.detail)]);}tables.push({title:'Separate self-test results',columns:['Check','Result','Notes'],rows});}
  }else{
   if(!['HEALTHY','WARNING','ACTION NEEDED'].includes(raw.status))throw Error('Event check unavailable.');
   const live=add('liveCount','Live events','Currently marked LIVE',false);const waiting=add('stuckCount','Events needing attention','Waiting for stream or marked as needing staff action');
   if(live!==null&&live>1)findings=true;if(raw.status!=='HEALTHY')findings=true;
   // Deliberately exclude raw event notes, provider settings and entire scheduled records.
   if(waiting===null)partial=true;
  }
  return{view,title:titles[view],note:notes[view],phase:findings?'findings':partial?'partial':'clear',partial,metrics,tables};
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
   const labels={closed:'Staff session ended. Reopen Checks to continue.',idle:'Choose Load check when you are ready.',loading:'Loading check…',error:'Couldn’t load this check. Choose Load check to try again.',findings:'Findings need review. No repairs have been made.',partial:'Some results are unavailable. This is not a complete check.',clear:'No findings in the checks listed below.'};
   status.textContent=labels[state.phase]+(state.report?.partial&&state.phase==='findings'?' Some results are also unavailable.':'')+(state.at?' Updated '+new Date(state.at).toLocaleString(undefined,{timeZoneName:'short'})+' (your device time).':'');
   results.innerHTML=state.report?`<div class="health-check-metrics">${state.report.metrics.map(m=>`<article><h4>${esc(m.label)}</h4><strong>${m.value===null?'Unavailable':esc(m.value.toLocaleString())}</strong><p>${esc(m.scope)}</p></article>`).join('')}</div>${state.report.tables.map(t=>`<div class="health-check-table"><table><caption>${esc(t.title)}</caption><thead><tr>${t.columns.map(c=>`<th scope="col">${esc(c)}</th>`).join('')}</tr></thead><tbody>${t.rows===null?`<tr><td colspan="${t.columns.length}">Unavailable</td></tr>`:!t.rows.length?`<tr><td colspan="${t.columns.length}">${state.view==='captures'?'No self-test results were returned.':'No recorded collisions.'}</td></tr>`:t.rows.map(r=>`<tr>${r.map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`).join('')}`:'';
  });
  select.addEventListener('change',()=>ui.select(select.value));button.addEventListener('click',()=>ui.load());ui.reset();return ui;
 }
 return Object.freeze({titles,project,controller,mount,esc});
});
