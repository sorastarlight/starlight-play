/* Direct corrections: set a resulting value, never express an implicit gift. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PLAY_TRAINER_CORRECTIONS=api;})(globalThis,()=>{
'use strict';
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const whole=v=>Number.isSafeInteger(v)&&v>=0&&v<=2147483647;
function historyView(history){
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const unavailable='<article><h4>Correction details unavailable</h4><p>This record could not be displayed. Reload the trainer’s history.</p></article>';
 if(history==null)return '<p>No corrections recorded.</p>';
 if(!Array.isArray(history))return unavailable;
 const entries=history.map(h=>{
  const c=h&&typeof h==='object'&&!Array.isArray(h)?h.correction:null;
  if(!c||typeof c!=='object'||Array.isArray(c))return unavailable;
  let title,summary;
  if(['quantity','pokemonQuantity'].includes(c.type)){
   if(!whole(c.before)||!whole(c.after)||(c.type==='quantity'&&(typeof c.id!=='string'||!c.id)))return unavailable;
   title=c.type==='pokemonQuantity'?'Pokémon quantity corrected':c.id==='coins'?'PokéCoins corrected':c.id==='capacity'?'Capacity corrected':'Quantity corrected';
   summary=c.before+' → '+c.after;
  }else if(['removePokemon','repairTradeHold'].includes(c.type)){
   if(!Array.isArray(c.ids)||!c.ids.length||c.ids.some(id=>!uuid(id))||new Set(c.ids).size!==c.ids.length)return unavailable;
   title=c.type==='repairTradeHold'?'Expired trade hold repaired':'Pokémon removed';
   summary=c.type==='repairTradeHold'?'Expired hold cleared for '+c.ids.length+' Pokémon':c.ids.length+' Pokémon removed';
  }else return unavailable;
  const actor=typeof h.actor==='string'&&h.actor.trim()?h.actor:'Not recorded',reason=typeof h.reason==='string'&&h.reason.trim()?h.reason:'No reason recorded';
  const at=typeof h.createdAt==='string'&&Number.isFinite(Date.parse(h.createdAt))?new Date(h.createdAt).toLocaleString():'Not recorded';
  return '<article><h4>'+esc(title)+'</h4><p>'+esc(actor)+' · '+esc(at)+'</p><p>'+esc(reason)+'</p><strong>'+esc(summary)+'</strong></article>';
 });
 return entries.length?'<div class="correction-history">'+entries.join('')+'</div>':'<p>No corrections recorded.</p>';
}
function prepare(snapshot,change,reason,requestId){
 if(!snapshot||!uuid(snapshot.trainerId)||typeof snapshot.revision!=='string'||!snapshot.revision||!uuid(requestId))throw Error('Reload this trainer before making a correction.');
 if(snapshot.protected===true)throw Error('Account corrections are disabled for this protected trainer.');
 if(typeof reason!=='string'||reason.trim().length<3||reason.trim().length>1000)throw Error('Add a staff reason between 3 and 1,000 characters.');
 let correction;
 if(change?.type==='quantity'){
  const row=snapshot.values?.find(r=>r.id===change.id);
  if(!row||row.editable!==true||!whole(row.value)||!whole(change.value))throw Error('Choose an editable balance and a whole resulting quantity.');
  if(change.value===row.value)throw Error('The quantity has not changed.');
  if(row.kind==='capacity'&&(!whole(row.used)||change.value<row.used))throw Error('Capacity cannot be lower than the space already used.');
  if(Number.isSafeInteger(row.minimum)&&change.value<row.minimum)throw Error('This value is below the supported limit.');
  if(Number.isSafeInteger(row.maximum)&&change.value>row.maximum)throw Error('This value exceeds the supported limit.');
  correction={type:'quantity',id:row.id,before:row.value,after:change.value};
 }else if(change?.type==='pokemonQuantity'){
  const option=snapshot.pokemonOptions?.find(p=>p.catalogId===change.catalogId),before=snapshot.pokemon.filter(p=>p.dex===option?.dex).length;
  if(!option||!whole(change.value)||change.value<=before||change.value-before>100||!Number.isInteger(change.level)||change.level<1||change.level>100||typeof change.shiny!=='boolean')throw Error('Choose a higher species total, adding up to 100 Pokémon. Select exact specimens for reductions.');
  correction={type:'pokemonQuantity',catalogId:option.catalogId,before,after:change.value,level:change.level,shiny:change.shiny,version:1};
 }else if(change?.type==='repairTradeHold'){
  const hold=snapshot.tradeHolds?.find(p=>p.id===change.id);
  if(!hold||!uuid(hold.id)||hold.repairable!==true)throw Error('Choose an expired hold without an active trade or cooldown.');
  correction={type:'repairTradeHold',ids:[hold.id]};
 }else if(change?.type==='removePokemon'){
  if(!Array.isArray(change.ids)||!change.ids.length||change.ids.length>100||new Set(change.ids).size!==change.ids.length)throw Error('Select the exact Pokémon to remove.');
  const selected=change.ids.map(id=>snapshot.pokemon?.find(p=>p.id===id));
  if(selected.some(p=>!p||!uuid(p.id)||p.locked!==false||p.favorite!==false||p.trading!==false))throw Error('A selected Pokémon is unavailable, locked, favorited or being traded.');
  correction={type:'removePokemon',ids:selected.map(p=>p.id).sort()};
 }else throw Error('Choose a supported correction.');
 return {trainerId:snapshot.trainerId,expectedRevision:snapshot.revision,requestId,reason:reason.trim(),correction};
}
function controller(transport,onChange=()=>{}){
 let epoch=0,active=false;const state={phase:'closed',snapshot:null,review:null,recovery:null,message:''};
 const emit=()=>onChange(state);
 function reset(){epoch++;active=false;Object.assign(state,{phase:'closed',snapshot:null,review:null,recovery:null,message:''});emit();}
 async function open(trainerId){const recovery=state.recovery?.trainerId===trainerId?state.recovery:null;reset();state.recovery=recovery;if(!uuid(trainerId))throw Error('Choose a trainer.');active=true;const token=epoch;state.phase='loading';emit();try{const snapshot=await transport('read',{trainerId});if(!active||token!==epoch)return;if(snapshot?.trainerId!==trainerId||typeof snapshot.revision!=='string')throw Error('Trainer details could not be verified.');state.snapshot=structuredClone(snapshot);if(state.recovery){const matches=Array.isArray(snapshot.history)?snapshot.history.filter(h=>h&&h.requestId===state.recovery.requestId):[];if(matches.length===1&&matches[0].status==='saved'){state.recovery=null;state.message='The previous correction is recorded as saved in Recent corrections.';}else state.message='The previous correction is still unconfirmed. Check Recent corrections before making another change. Reference: '+state.recovery.requestId;}state.phase='ready';emit();}catch(e){if(active&&token===epoch){state.phase='error';state.message=e.message;emit();}}}
 function review(change,reason,requestId){if(state.phase!=='ready'||state.recovery)throw Error('Inspect the previous correction before editing this trainer.');state.review=prepare(state.snapshot,change,reason,requestId);emit();return structuredClone(state.review);}
 async function save(){if(state.phase!=='ready'||!state.review)throw Error('Review the correction first.');const token=epoch,payload=structuredClone(state.review);state.phase='saving';emit();try{const receipt=await transport('save',payload);if(!active||token!==epoch)return;if(receipt?.requestId!==payload.requestId||receipt?.trainerId!==payload.trainerId||receipt?.status!=='saved')throw Error('The correction could not be confirmed.');state.phase='saved';state.message='Correction saved. Reload to see the updated trainer.';state.review=null;emit();}catch(e){if(!active||token!==epoch)return;if(e?.correctionOutcomeUnknown===true){Object.assign(state,{phase:'uncertain',snapshot:null,review:null,recovery:Object.freeze({requestId:payload.requestId,trainerId:payload.trainerId}),message:'The correction was sent, but its result could not be verified after the session check. Trainer details cleared. Reload and inspect Recent corrections. Do not repeat it. Reference: '+payload.requestId});try{emit();}catch(_){}return;}if(String(e?.code)==='42501'){Object.assign(state,{phase:'error',snapshot:null,review:null,message:'Staff access changed. Reload the Hub.'});emit();return;}
 if(['40001','55P03','22023'].includes(String(e?.code))){state.phase='error';state.review=null;state.message=String(e.code)==='55P03'?'This trainer is completing another action. Reload and try again.':String(e.code)==='40001'?'This trainer’s account changed. Reload before making the correction.':e.message+' Reload this trainer before trying again.';emit();return;}
 state.phase='uncertain';state.message='The result could not be confirmed. Reload this trainer and check Recent corrections before trying again.';emit();}}
 return {state,reset,open,review,save,cancel(){if(state.phase!=='ready')throw Error('Wait for the current correction.');state.review=null;emit();}};
}
function mount(host,transport,trainerUi={}){
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let presentationVersion=0,historyLoading=false;let holdChoice='';let addChoice='',addTotal='',addLevel='5',addShiny=false;let section='balances',query='',selected='',draftValue='',reason='',currentTrainerId=null,selectedIds=new Set();
 const model=controller(transport,render);
 const safeArt=src=>/^images\/[a-zA-Z0-9_./-]+\.(png|svg|webp)$/.test(src||'')&&!src.includes('..')?src:'images/items/inventory-bag.png';
 function focusReview(){host.querySelector(section==='tradeHolds'?'[data-repair-hold] button[type=submit]':section==='addPokemon'?'[data-add-pokemon] button[type=submit]':section==='pokemon'?'[data-remove-pokemon] button[type=submit]':'[data-correction-form] button[type=submit]')?.focus();}
 function selectedRow(){return model.state.snapshot?.values.find(r=>r.id===selected);}
 function pendingDraft(){if(model.state.phase!=='ready')return false;if(section==='pokemon')return selectedIds.size>0||!!reason.trim();if(section==='tradeHolds')return !!reason.trim();if(section==='addPokemon')return !!(addTotal||reason.trim());const r=selectedRow();return r&&(String(draftValue)!==String(r.value)||reason.trim());}
 function allowed(){return model.state.phase==='ready'&&!model.state.review&&!model.state.recovery&&!model.state.snapshot?.protected;}
 function render(){
  const version=++presentationVersion;
  const s=model.state,focused=host.contains(document.activeElement);
  const historyLoaded=historyLoading&&s.phase==='ready';
  historyLoading=section==='history'&&s.phase==='loading';
  if(!s.snapshot){selected='';draftValue='';reason='';selectedIds.clear();host.innerHTML=`<p role="status" tabindex="-1">${esc(s.phase==='loading'?'Loading account details…':s.message||'Choose a trainer.')}</p>${currentTrainerId?`<button type="button" data-correction-load ${s.phase==='loading'?'disabled':''}>Reload account</button>`:''}`;
   if(['error','uncertain'].includes(s.phase)){
    const notice=host.querySelector('[role=status]'),view=host.ownerDocument?.defaultView;
    view?.setTimeout?.(()=>{
     if(version!==presentationVersion||!notice?.isConnected)return;
     const active=host.ownerDocument.activeElement;
     if(active===host.ownerDocument.body||host.contains(active)){
      const text=notice.textContent;
      notice.innerHTML='<span aria-hidden="true">'+esc(text)+'</span>';
      notice.setAttribute('aria-label',text);
      notice.focus({preventScroll:true});
     }
    },180);
   }
   return;
  }
  host.querySelectorAll('dialog').forEach(d=>d.close());
  host.innerHTML=`<header class="correction-toolbar"><div><h3>Account corrections</h3><p>Set the quantities this trainer should have. Gifts and normal gameplay rewards are recorded separately.</p></div><button type="button" data-correction-load ${s.phase==='saving'?'disabled':''}>Reload account</button></header><p role="status" tabindex="-1">${esc(s.message)}</p>${s.snapshot.protected?'<p class="notice">This is a protected account. Corrections are disabled.</p>':''}<nav class="correction-tabs" aria-label="Correction tools">${[['balances','Balances & capacity'],['items','Items'],['candy','Evolution Candy'],['pokemon','Remove Pokémon'],['addPokemon','Pokémon quantity'],['tradeHolds','Trade holds'],['history','Recent corrections']].map(([key,label])=>`<button type="button" data-section="${key}" aria-pressed="${section===key}" ${s.phase==='saving'?'disabled':''}>${label}</button>`).join('')}</nav><p role="alert" tabindex="-1" data-correction-error></p><div data-correction-body></div>`;
  const body=host.querySelector('[data-correction-body]');
  if(section==='history'){
   body.innerHTML='<h4 tabindex="-1" data-history-heading>Recent corrections</h4>'+historyView(s.snapshot.history);
   if(historyLoaded){
    const heading=host.querySelector('[data-history-heading]');
    host.ownerDocument?.defaultView?.setTimeout?.(()=>{
     if(version!==presentationVersion||!heading?.isConnected)return;
     const active=host.ownerDocument.activeElement;
     if(active===host.ownerDocument.body||host.contains(active))heading.focus({preventScroll:true});
    },180);
   }
   return;
  }
  if(section==='tradeHolds'){
   const holds=s.snapshot.tradeHolds||[],hold=holds.find(h=>h.id===holdChoice);body.innerHTML=`<p>Repair only expired transaction holds. Personal locks and favorites are preserved. Active trades and live cooldowns cannot be cleared here.</p><div class="correction-layout"><aside><div class="correction-value-list">${holds.map(h=>`<button type="button" data-hold-choice="${esc(h.id)}" aria-pressed="${holdChoice===h.id}"><strong>${esc(h.name)}</strong><small>${esc(h.publicId||h.id)} · ${h.repairable?'Expired hold':'Not ready'}</small></button>`).join('')||'<p>No trade holds found.</p>'}</div></aside><section>${hold?`<h4>${esc(hold.name)}</h4><p>${esc(hold.publicId||hold.id)}</p><p>${esc(hold.reason)}</p><p>Personal lock: ${hold.locked?'On':'Off'} · Favorite: ${hold.favorite?'Yes':'No'}</p><form data-repair-hold><fieldset ${allowed()&&hold.repairable?'':'disabled'}><label>Staff reason<textarea name="reason" required minlength="3" maxlength="1000">${esc(reason)}</textarea></label><div class="mart-actions"><button type="button" data-discard-hold>Discard changes</button><button type="submit">Review expired hold repair</button></div></fieldset></form>`:'<h4>Choose a Pokémon with a trade hold</h4><p>Select a record to inspect its current hold.</p>'}</section></div>`;
  }else if(section==='addPokemon'){
   const option=(s.snapshot.pokemonOptions||[]).find(p=>p.catalogId===addChoice),before=option?s.snapshot.pokemon.filter(p=>p.dex===option.dex).length:0;
   body.innerHTML=`<p>Set a higher total for one species. Existing Pokémon keep their stats and history. New specimens are generated individually and recorded as a correction, with no gift announcement or catch rewards. To reduce a total, select exact specimens in Remove Pokémon.</p><form data-add-pokemon><fieldset ${allowed()?'':'disabled'}><label>Pokémon<select name="addChoice"><option value="">Choose a Pokémon</option>${(s.snapshot.pokemonOptions||[]).map(p=>`<option value="${esc(p.catalogId)}" ${addChoice===p.catalogId?'selected':''}>${esc(p.name)}</option>`).join('')}</select></label>${option?`<div class="correction-add-summary"><img src="${esc(safeArt(option.sprite))}" alt="" width="80" height="80"><div><h4>${esc(option.name)}</h4><p>Current species total: <strong>${before}</strong> · includes all forms and variants</p></div></div><div class="correction-add-fields"><label>Resulting species total<input name="addTotal" type="number" min="${before+1}" max="${before+100}" step="1" required value="${esc(addTotal)}"></label><label>New Pokémon level<input name="addLevel" type="number" min="1" max="100" step="1" required value="${esc(addLevel)}"></label><label><input name="addShiny" type="checkbox" ${addShiny?'checked':''}>Make the new Pokémon Shiny</label></div><label>Staff reason<textarea name="reason" required minlength="3" maxlength="1000">${esc(reason)}</textarea></label><div class="mart-actions"><button type="button" data-discard-add>Discard changes</button><button type="submit">Review Pokémon quantity</button></div>`:'<p>Only currently supported species are listed.</p>'}</fieldset></form>`;
  }else if(section==='pokemon'){
   body.innerHTML=`<p>Select up to 100 exact Pokémon to remove at a time. No Candy, coins or release rewards are awarded. Locked, favorited and trading Pokémon cannot be removed.</p><label>Find a Pokémon<input type="search" data-mon-search value="${esc(query)}" placeholder="Name or specimen number"></label><div class="correction-mons" data-mon-list></div><form data-remove-pokemon><p data-selection-count></p><label>Staff reason<textarea name="reason" required minlength="3" maxlength="1000" ${allowed()?'':'disabled'}>${esc(reason)}</textarea></label><button type="button" data-discard-removal ${allowed()?'':'disabled'}>Clear selection and reason</button><button type="submit" ${allowed()?'':'disabled'}>Review selected Pokémon</button></form>`;monList();
  }else{
   body.innerHTML=`<div class="correction-layout"><aside><label>Find a balance<input type="search" data-value-search value="${esc(query)}" placeholder="Name"></label><div class="correction-value-list" data-value-list></div></aside><section data-value-editor></section></div>`;valueList();valueEditor();
  }
  if(s.review&&s.phase==='ready'){
   const c=s.review.correction,d=document.createElement('dialog');d.className='mart-dialog correction-dialog';d.setAttribute('aria-label','Review account correction');
   d.innerHTML=`<h3>Review account correction</h3>${c.type==='pokemonQuantity'?`<p><strong>${esc(s.snapshot.pokemonOptions.find(p=>p.catalogId===c.catalogId)?.name)}</strong> species total</p><p class="correction-change">${c.before} → ${c.after}</p><p>Add ${c.after-c.before} individually generated ${c.shiny?'Shiny ':''}Pokémon at level ${c.level}. Existing specimens are unchanged. This is a recorded correction, not a gift.</p>`:c.type==='repairTradeHold'?`<p>Repair the expired trade hold for <strong>${esc(s.snapshot.tradeHolds.find(h=>h.id===c.ids[0])?.name)}</strong> · ${esc(s.snapshot.tradeHolds.find(h=>h.id===c.ids[0])?.publicId||c.ids[0])}?</p><p>This clears only the stale transaction reservation and expired trade timer. Personal locks, favorites, ownership, stats and rewards are unchanged. The server checks active trades again before saving.</p>`:c.type==='quantity'?`<p>${esc(selectedRow()?.name||c.id)}</p><p class="correction-change"><strong>${c.before}</strong> → <strong>${c.after}</strong></p>`:`<p>Remove ${c.ids.length === 1 ? "this Pokémon" : "these " + c.ids.length + " individually selected Pokémon"}:</p><ul>${c.ids.map(id=>{const p=s.snapshot.pokemon.find(p=>p.id===id);return `<li><strong>${esc(p.name)}${p.variant==='shiny'?' · Shiny':''}</strong> · ${esc(p.publicId||p.id)} · Level ${esc(p.level)}</li>`;}).join('')}</ul><p>These specimens leave the trainer’s PC without granting rewards. Their records are retained for recovery.</p>`}<p>Reason: ${esc(s.review.reason)}</p><div class="mart-actions"><button type="button" data-correction-cancel>Back to editing</button><button type="button" data-correction-save>Save correction</button></div>`;host.append(d);d.addEventListener('cancel',e=>{e.preventDefault();model.cancel();focusReview();});d.showModal();
  }
  if(focused&&['saving','saved','uncertain','error'].includes(s.phase))host.querySelector('[role=status]')?.focus({preventScroll:true});
 }
 function valueList(){const s=model.state;const rows=s.snapshot.values.filter(r=>(section==='balances'?['balance','currency','capacity'].includes(r.kind):r.kind===(section==='candy'?'candy':'item'))&&(r.name||r.id).toLocaleLowerCase().includes(query.toLocaleLowerCase()));host.querySelector('[data-value-list]').innerHTML=rows.map(r=>`<button type="button" data-value-id="${esc(r.id)}" aria-pressed="${selected===r.id}" ${allowed()?'':'disabled'}><img src="${esc(safeArt(r.sprite))}" alt="" width="40" height="40"><span><strong>${esc(r.name)}</strong><small>Current: ${esc(r.value)}</small></span></button>`).join('')||'<p>No matching balances.</p>';}
 function valueEditor(){const r=selectedRow(),slot=host.querySelector('[data-value-editor]');if(!r){slot.innerHTML='<h4>Choose a balance</h4><p>Select an item or balance to set its resulting quantity.</p>';return;}
 slot.innerHTML=`<h4>${esc(r.name)}</h4><p>Current quantity: <strong>${esc(r.value)}</strong></p>${r.kind==='capacity'?`<p>${r.used} spaces in use. The minimum includes the trainer’s base capacity and any active Pass allowance.</p>`:''}<form data-correction-form><label>Resulting quantity<input type="number" name="value" value="${esc(draftValue)}" min="${r.minimum||0}" max="${r.maximum??2147483647}" step="1" required ${allowed()?'':'disabled'}></label><label>Staff reason<textarea name="reason" minlength="3" maxlength="1000" required ${allowed()?'':'disabled'}>${esc(reason)}</textarea></label><div class="mart-actions"><button type="button" data-discard ${allowed()?'':'disabled'}>Discard changes</button><button type="submit" ${allowed()?'':'disabled'}>Review correction</button></div></form>`;
 }
 function showCorrectionError(error){
  const source=host.ownerDocument.activeElement;
  const dialog=host.ownerDocument.createElement('dialog');
  dialog.className='mart-dialog correction-dialog';
  dialog.setAttribute('aria-label','Correction needs attention');
  dialog.innerHTML='<p>'+esc(error.message)+'</p><button type="button">Continue editing</button>';
  host.append(dialog);
  dialog.querySelector('button').onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>{dialog.remove();if(source?.isConnected)source.focus({preventScroll:true});},{once:true});
  dialog.showModal();
 }
 function monList(){const rows=model.state.snapshot.pokemon.filter(p=>(p.name+' '+(p.publicId||p.id)).toLocaleLowerCase().includes(query.toLocaleLowerCase()));host.querySelector('[data-mon-list]').innerHTML=rows.map(p=>`<article><label><input type="checkbox" name="specimen" value="${esc(p.id)}" ${selectedIds.has(p.id)?'checked':''} ${!allowed()||p.locked!==false||p.favorite!==false||p.trading!==false?'disabled':''}><span>${trainerUi.monArt?.(p)||''}<strong>${esc(p.name)}${p.variant==='shiny'?' · Shiny':''}</strong><small>${esc(p.publicId||p.id)} · Level ${esc(p.level)}</small><small>${p.locked?'Locked · ':''}${p.favorite?'Favorite · ':''}${p.trading?'In a trade':''}</small></span></label><button type="button" data-mon-stats="${esc(p.id)}">View stats</button></article>`).join('')||'<p>No matching Pokémon.</p>';host.querySelector('[data-selection-count]').textContent=selectedIds.size+' selected';}
 host.addEventListener('input',e=>{if(e.target.matches('[data-value-search]')){query=e.target.value;valueList();}else if(e.target.matches('[data-mon-search]')){query=e.target.value;monList();}else if(e.target.name==='addTotal')addTotal=e.target.value;else if(e.target.name==='addLevel')addLevel=e.target.value;else if(e.target.name==='value')draftValue=e.target.value;else if(e.target.name==='reason')reason=e.target.value;});
 host.addEventListener('change',e=>{if(e.target.name==='addChoice'){addChoice=e.target.value;addTotal='';reason='';render();host.querySelector('[name=addTotal]')?.focus();return;}if(e.target.name==='addShiny'){addShiny=e.target.checked;return;}if(e.target.name==='specimen'){if(e.target.checked)selectedIds.add(e.target.value);else selectedIds.delete(e.target.value);host.querySelector('[data-selection-count]').textContent=selectedIds.size+' selected';}});
 host.addEventListener('click',e=>{try{
  if(e.target.closest('[data-discard-removal]')){selectedIds.clear();reason='';render();host.querySelector('[data-mon-search]')?.focus();return;}
  if(e.target.closest('[data-discard-hold]')){reason='';render();host.querySelector('[data-repair-hold] textarea')?.focus({preventScroll:true});return;}
  const holdButton=e.target.closest('[data-hold-choice]');if(holdButton){if(pendingDraft())throw Error('Review or discard this correction first.');holdChoice=holdButton.dataset.holdChoice;reason='';render();const reasonField=host.querySelector('[data-repair-hold] textarea');if(reasonField&&!reasonField.disabled)reasonField.focus();else [...host.querySelectorAll('[data-hold-choice]')].find(b=>b.dataset.holdChoice===holdChoice)?.focus();return;}
  if(e.target.closest('[data-discard-add]')){addTotal='';reason='';render();host.querySelector('[name=addTotal]')?.focus();return;}
  if(e.target.closest('[data-correction-load]')){if(model.state.phase==='saving'||model.state.review||pendingDraft())throw Error('Finish reviewing or discard this correction before reloading.');if(['saved','uncertain'].includes(model.state.phase))addTotal='';model.open(currentTrainerId||model.state.snapshot?.trainerId);return;}
  if(e.target.closest('[data-correction-save]')){model.save();return;}
  if(e.target.closest('[data-correction-cancel]')){model.cancel();focusReview();return;}
  const pane=e.target.closest('[data-section]');if(pane){if(pendingDraft())throw Error('Review or discard this correction before changing tools.');section=pane.dataset.section;query='';selected='';draftValue='';reason='';render();host.querySelector(`[data-section="${section}"]`)?.focus();return;}
  const pick=e.target.closest('[data-value-id]');if(pick){if(pendingDraft())throw Error('Review or discard this correction before choosing another balance.');selected=pick.dataset.valueId;draftValue=selectedRow().value;reason='';valueList();valueEditor();host.querySelector('[data-correction-form] input[name=value]')?.focus();return;}
  if(e.target.closest('[data-discard]')){draftValue=selectedRow().value;reason='';valueEditor();host.querySelector('[data-correction-form] [name=value]')?.focus({preventScroll:true});return;}
  const stats=e.target.closest('[data-mon-stats]');if(stats){const p=model.state.snapshot.pokemon.find(p=>p.id===stats.dataset.monStats);const d=document.createElement('dialog');d.className='mart-dialog';d.setAttribute('aria-label','Selected Pokémon stats');d.innerHTML=`<h3>${esc(p.name)}</h3><p>${esc(p.publicId||p.id)} · Level ${esc(p.level)}</p>${trainerUi.statsPanel?.(p)||'<p>Stats are not available.</p>'}<button type="button" data-close-stats>Close</button>`;host.append(d);d.querySelector('[data-close-stats]').onclick=()=>d.close();d.onclose=()=>d.remove();d.showModal();}
 }catch(error){showCorrectionError(error);}});
 host.addEventListener('submit',e=>{if(!e.target.matches('[data-correction-form],[data-remove-pokemon],[data-add-pokemon],[data-repair-hold]'))return;e.preventDefault();try{if(e.target.matches('[data-repair-hold]'))model.review({type:'repairTradeHold',id:holdChoice},reason,crypto.randomUUID());else if(e.target.matches('[data-add-pokemon]'))model.review({type:'pokemonQuantity',catalogId:addChoice,value:Number(addTotal),level:Number(addLevel),shiny:addShiny},reason,crypto.randomUUID());else if(e.target.matches('[data-remove-pokemon]'))model.review({type:'removePokemon',ids:[...selectedIds]},reason,crypto.randomUUID());else model.review({type:'quantity',id:selected,value:Number(draftValue)},reason,crypto.randomUUID());}catch(error){showCorrectionError(error);}});
 host.ownerDocument?.defaultView?.addEventListener('beforeunload',e=>{if(model.state.phase==='saving'||model.state.review||model.state.recovery||pendingDraft()){e.preventDefault();e.returnValue='';}});
 return {...model,canLeave(){return model.state.phase!=='saving'&&!model.state.review&&!model.state.recovery&&!pendingDraft();},warnBeforeLeaving(){const error=host.querySelector('[data-correction-error]')||host.querySelector('[role=status]');if(error){error.textContent=model.state.recovery?'The previous correction is unconfirmed. Reload this account and inspect Recent corrections. Do not repeat it. Reference: '+model.state.recovery.requestId:model.state.phase==='saving'?'A correction is being saved. Wait for its result before leaving this record.':'Finish reviewing or discard this correction before leaving this record.';error.focus({preventScroll:true});}},open(id){if(id!==currentTrainerId){addChoice='';addTotal='';addLevel='5';addShiny=false;}currentTrainerId=id;return model.open(id);},reset(){currentTrainerId=null;holdChoice='';addChoice='';addTotal='';addLevel='5';addShiny=false;model.reset();}};
}
function adapter({session,identity,allowed,call}){return async(kind,payload)=>{
 const actor=identity(),target=payload?.trainerId;if(!uuid(target))throw Error('Choose a trainer.');
 const check=async()=>{const r=await session();if(r.error||!actor||!allowed(target)||identity()!==actor||r.data?.session?.user?.id!==actor)throw Object.assign(Error('Staff session changed. Reload the Hub.'),{code:'42501'});};await check();
 let result;try{if(kind==='read')result=await call('admin_trainer_corrections_read',{p_user:target});else if(kind==='save')result=await call('admin_trainer_correction_write',{p_intent:structuredClone(payload)});else throw Error('Unsupported correction operation.');}catch(e){if(/Only admins|restricted to staff|Access denied/i.test(e.message||''))e.code='42501';throw e;}
 try{await check();}catch(_){throw Object.assign(Error('Staff session could not be verified after the correction request.'),{code:'42501',correctionOutcomeUnknown:kind==='save'});}return result;
};}
return {prepare,controller,mount,adapter,historyView};
});
