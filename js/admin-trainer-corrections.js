/* Direct corrections: set a resulting value, never express an implicit gift. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PLAY_TRAINER_CORRECTIONS=api;})(globalThis,()=>{
'use strict';
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const whole=v=>Number.isSafeInteger(v)&&v>=0&&v<=2147483647;
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
 }else if(change?.type==='removePokemon'){
  if(!Array.isArray(change.ids)||!change.ids.length||change.ids.length>100||new Set(change.ids).size!==change.ids.length)throw Error('Select the exact Pokémon to remove.');
  const selected=change.ids.map(id=>snapshot.pokemon?.find(p=>p.id===id));
  if(selected.some(p=>!p||!uuid(p.id)||p.locked!==false||p.favorite!==false||p.trading!==false))throw Error('A selected Pokémon is unavailable, locked, favorited or being traded.');
  correction={type:'removePokemon',ids:selected.map(p=>p.id).sort()};
 }else throw Error('Choose a supported correction.');
 return {trainerId:snapshot.trainerId,expectedRevision:snapshot.revision,requestId,reason:reason.trim(),correction};
}
function controller(transport,onChange=()=>{}){
 let epoch=0,active=false;const state={phase:'closed',snapshot:null,review:null,message:''};
 const emit=()=>onChange(state);
 function reset(){epoch++;active=false;Object.assign(state,{phase:'closed',snapshot:null,review:null,message:''});emit();}
 async function open(trainerId){reset();if(!uuid(trainerId))throw Error('Choose a trainer.');active=true;const token=epoch;state.phase='loading';emit();try{const snapshot=await transport('read',{trainerId});if(!active||token!==epoch)return;if(snapshot?.trainerId!==trainerId||typeof snapshot.revision!=='string')throw Error('Trainer details could not be verified.');state.snapshot=structuredClone(snapshot);state.phase='ready';emit();}catch(e){if(active&&token===epoch){state.phase='error';state.message=e.message;emit();}}}
 function review(change,reason,requestId){if(state.phase!=='ready')throw Error('Reload the trainer before editing.');state.review=prepare(state.snapshot,change,reason,requestId);emit();return structuredClone(state.review);}
 async function save(){if(state.phase!=='ready'||!state.review)throw Error('Review the correction first.');const token=epoch,payload=structuredClone(state.review);state.phase='saving';emit();try{const receipt=await transport('save',payload);if(!active||token!==epoch)return;if(receipt?.requestId!==payload.requestId||receipt?.trainerId!==payload.trainerId||receipt?.status!=='saved')throw Error('The correction could not be confirmed.');state.phase='saved';state.message='Correction saved. Reload to see the updated trainer.';state.review=null;emit();}catch(e){if(!active||token!==epoch)return;if(String(e?.code)==='42501'){Object.assign(state,{phase:'error',snapshot:null,review:null,message:'Staff access changed. Reload the Hub.'});emit();return;}
 if(['40001','55P03','22023'].includes(String(e?.code))){state.phase='error';state.review=null;state.message=String(e.code)==='55P03'?'This trainer is completing another action. Reload and try again.':String(e.code)==='40001'?'This trainer’s account changed. Reload before making the correction.':e.message+' Reload this trainer before trying again.';emit();return;}
 state.phase='uncertain';state.message='The result could not be confirmed. Reload this trainer and check Recent corrections before trying again.';emit();}}
 return {state,reset,open,review,save,cancel(){if(state.phase!=='ready')throw Error('Wait for the current correction.');state.review=null;emit();}};
}
function mount(host,transport,trainerUi={}){
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let section='balances',query='',selected='',draftValue='',reason='',currentTrainerId=null,selectedIds=new Set();
 const model=controller(transport,render);
 const safeArt=src=>/^images\/[a-zA-Z0-9_./-]+\.(png|svg|webp)$/.test(src||'')&&!src.includes('..')?src:'images/items/inventory-bag.png';
 function focusReview(){host.querySelector(section==='pokemon'?'[data-remove-pokemon] button[type=submit]':'[data-correction-form] button[type=submit]')?.focus();}
 function selectedRow(){return model.state.snapshot?.values.find(r=>r.id===selected);}
 function pendingDraft(){const r=selectedRow();return r&&(String(draftValue)!==String(r.value)||reason.trim());}
 function allowed(){return model.state.phase==='ready'&&!model.state.review&&!model.state.snapshot?.protected;}
 function render(){
  const s=model.state;
  if(!s.snapshot){selected='';draftValue='';reason='';selectedIds.clear();host.innerHTML=`<p role="status">${esc(s.phase==='loading'?'Loading account details…':s.message||'Choose a trainer.')}</p>${currentTrainerId?`<button type="button" data-correction-load ${s.phase==='loading'?'disabled':''}>Reload account</button>`:''}`;return;}
  host.querySelectorAll('dialog').forEach(d=>d.close());
  host.innerHTML=`<header class="correction-toolbar"><div><h3>Account corrections</h3><p>Set the quantities this trainer should have. Gifts and normal gameplay rewards are recorded separately.</p></div><button type="button" data-correction-load ${s.phase==='saving'?'disabled':''}>Reload account</button></header><p role="status">${esc(s.message)}</p>${s.snapshot.protected?'<p class="notice">This is a protected account. Corrections are disabled.</p>':''}<nav class="correction-tabs" aria-label="Correction tools">${[['balances','Balances & capacity'],['items','Items'],['candy','Evolution Candy'],['pokemon','Pokémon'],['history','Recent corrections']].map(([key,label])=>`<button type="button" data-section="${key}" aria-pressed="${section===key}" ${s.phase==='saving'?'disabled':''}>${label}</button>`).join('')}</nav><p role="alert" data-correction-error></p><div data-correction-body></div>`;
  const body=host.querySelector('[data-correction-body]');
  if(section==='history'){body.innerHTML=`<div class="correction-history">${(s.snapshot.history||[]).map(h=>`<article><h4>${h.correction.type==='removePokemon'?'Pokémon removed':h.correction.id==='coins'?'PokéCoins corrected':h.correction.id==='capacity'?'Capacity corrected':'Quantity corrected'}</h4><p>${esc(h.actor)} · ${esc(new Date(h.createdAt).toLocaleString())}</p><p>${esc(h.reason)}</p><strong>${h.correction.type==='quantity'?esc(h.correction.before)+' → '+esc(h.correction.after):esc(h.correction.ids.length)+' selected Pokémon'}</strong></article>`).join('')||'<p>No corrections recorded.</p>'}</div>`;return;}
  if(section==='pokemon'){
   body.innerHTML=`<p>Select up to 100 exact Pokémon to remove at a time. No Candy, coins or release rewards are awarded. Locked, favorited and trading Pokémon cannot be removed.</p><label>Find a Pokémon<input type="search" data-mon-search value="${esc(query)}" placeholder="Name or specimen number"></label><div class="correction-mons" data-mon-list></div><form data-remove-pokemon><p data-selection-count></p><label>Staff reason<textarea name="reason" required minlength="3" maxlength="1000" ${allowed()?'':'disabled'}>${esc(reason)}</textarea></label><button type="submit" ${allowed()?'':'disabled'}>Review selected Pokémon</button></form>`;monList();
  }else{
   body.innerHTML=`<div class="correction-layout"><aside><label>Find a balance<input type="search" data-value-search value="${esc(query)}" placeholder="Name"></label><div class="correction-value-list" data-value-list></div></aside><section data-value-editor></section></div>`;valueList();valueEditor();
  }
  if(s.review&&s.phase==='ready'){
   const c=s.review.correction,d=document.createElement('dialog');d.className='mart-dialog correction-dialog';d.setAttribute('aria-label','Review account correction');
   d.innerHTML=`<h3>Review account correction</h3>${c.type==='quantity'?`<p>${esc(selectedRow()?.name||c.id)}</p><p class="correction-change"><strong>${c.before}</strong> → <strong>${c.after}</strong></p>`:`<p>Remove ${c.ids.length === 1 ? "this Pokémon" : "these " + c.ids.length + " individually selected Pokémon"}:</p><ul>${c.ids.map(id=>{const p=s.snapshot.pokemon.find(p=>p.id===id);return `<li><strong>${esc(p.name)}${p.variant==='shiny'?' · Shiny':''}</strong> · ${esc(p.publicId||p.id)} · Level ${esc(p.level)}</li>`;}).join('')}</ul><p>These specimens leave the trainer’s PC without granting rewards. Their records are retained for recovery.</p>`}<p>Reason: ${esc(s.review.reason)}</p><div class="mart-actions"><button type="button" data-correction-cancel>Back to editing</button><button type="button" data-correction-save>Save correction</button></div>`;host.append(d);d.addEventListener('cancel',e=>{e.preventDefault();model.cancel();focusReview();});d.showModal();
  }
 }
 function valueList(){const s=model.state;const rows=s.snapshot.values.filter(r=>(section==='balances'?['balance','currency','capacity'].includes(r.kind):r.kind===(section==='candy'?'candy':'item'))&&(r.name||r.id).toLocaleLowerCase().includes(query.toLocaleLowerCase()));host.querySelector('[data-value-list]').innerHTML=rows.map(r=>`<button type="button" data-value-id="${esc(r.id)}" aria-pressed="${selected===r.id}" ${allowed()?'':'disabled'}><img src="${esc(safeArt(r.sprite))}" alt="" width="40" height="40"><span><strong>${esc(r.name)}</strong><small>Current: ${esc(r.value)}</small></span></button>`).join('')||'<p>No matching balances.</p>';}
 function valueEditor(){const r=selectedRow(),slot=host.querySelector('[data-value-editor]');if(!r){slot.innerHTML='<h4>Choose a balance</h4><p>Select an item or balance to set its resulting quantity.</p>';return;}
 slot.innerHTML=`<h4>${esc(r.name)}</h4><p>Current quantity: <strong>${esc(r.value)}</strong></p>${r.kind==='capacity'?`<p>${r.used} spaces in use. The minimum includes the trainer’s base capacity and any active Pass allowance.</p>`:''}<form data-correction-form><label>Resulting quantity<input type="number" name="value" value="${esc(draftValue)}" min="${r.minimum||0}" max="${r.maximum??2147483647}" step="1" required ${allowed()?'':'disabled'}></label><label>Staff reason<textarea name="reason" minlength="3" maxlength="1000" required ${allowed()?'':'disabled'}>${esc(reason)}</textarea></label><div class="mart-actions"><button type="button" data-discard ${allowed()?'':'disabled'}>Discard changes</button><button type="submit" ${allowed()?'':'disabled'}>Review correction</button></div></form>`;
 }
 function monList(){const rows=model.state.snapshot.pokemon.filter(p=>(p.name+' '+(p.publicId||p.id)).toLocaleLowerCase().includes(query.toLocaleLowerCase()));host.querySelector('[data-mon-list]').innerHTML=rows.map(p=>`<article><label><input type="checkbox" name="specimen" value="${esc(p.id)}" ${selectedIds.has(p.id)?'checked':''} ${!allowed()||p.locked!==false||p.favorite!==false||p.trading!==false?'disabled':''}><span>${trainerUi.monArt?.(p)||''}<strong>${esc(p.name)}${p.variant==='shiny'?' · Shiny':''}</strong><small>${esc(p.publicId||p.id)} · Level ${esc(p.level)}</small><small>${p.locked?'Locked · ':''}${p.favorite?'Favorite · ':''}${p.trading?'In a trade':''}</small></span></label><button type="button" data-mon-stats="${esc(p.id)}">View stats</button></article>`).join('')||'<p>No matching Pokémon.</p>';host.querySelector('[data-selection-count]').textContent=selectedIds.size+' selected';}
 host.addEventListener('input',e=>{if(e.target.matches('[data-value-search]')){query=e.target.value;valueList();}else if(e.target.matches('[data-mon-search]')){query=e.target.value;monList();}else if(e.target.name==='value')draftValue=e.target.value;else if(e.target.name==='reason')reason=e.target.value;});
 host.addEventListener('change',e=>{if(e.target.name==='specimen'){if(e.target.checked)selectedIds.add(e.target.value);else selectedIds.delete(e.target.value);host.querySelector('[data-selection-count]').textContent=selectedIds.size+' selected';}});
 host.addEventListener('click',e=>{try{
  if(e.target.closest('[data-correction-load]')){model.open(currentTrainerId||model.state.snapshot?.trainerId);return;}
  if(e.target.closest('[data-correction-save]')){model.save();return;}
  if(e.target.closest('[data-correction-cancel]')){model.cancel();focusReview();return;}
  const pane=e.target.closest('[data-section]');if(pane){if(pendingDraft())throw Error('Review or discard this correction before changing tools.');section=pane.dataset.section;query='';selected='';draftValue='';reason='';render();host.querySelector(`[data-section="${section}"]`)?.focus();return;}
  const pick=e.target.closest('[data-value-id]');if(pick){if(pendingDraft())throw Error('Review or discard this correction before choosing another balance.');selected=pick.dataset.valueId;draftValue=selectedRow().value;reason='';valueList();valueEditor();host.querySelector('[data-correction-form] input[name=value]')?.focus();return;}
  if(e.target.closest('[data-discard]')){draftValue=selectedRow().value;reason='';valueEditor();return;}
  const stats=e.target.closest('[data-mon-stats]');if(stats){const p=model.state.snapshot.pokemon.find(p=>p.id===stats.dataset.monStats);const d=document.createElement('dialog');d.className='mart-dialog';d.setAttribute('aria-label','Selected Pokémon stats');d.innerHTML=`<h3>${esc(p.name)}</h3><p>${esc(p.publicId||p.id)} · Level ${esc(p.level)}</p>${trainerUi.statsPanel?.(p)||'<p>Stats are not available.</p>'}<button type="button" data-close-stats>Close</button>`;host.append(d);d.querySelector('[data-close-stats]').onclick=()=>d.close();d.onclose=()=>d.remove();d.showModal();}
 }catch(error){host.querySelector('[data-correction-error]').textContent=error.message;}});
 host.addEventListener('submit',e=>{if(!e.target.matches('[data-correction-form],[data-remove-pokemon]'))return;e.preventDefault();try{if(e.target.matches('[data-remove-pokemon]'))model.review({type:'removePokemon',ids:[...selectedIds]},reason,crypto.randomUUID());else model.review({type:'quantity',id:selected,value:Number(draftValue)},reason,crypto.randomUUID());}catch(error){host.querySelector('[data-correction-error]').textContent=error.message;}});
 return {...model,open(id){currentTrainerId=id;return model.open(id);},reset(){currentTrainerId=null;model.reset();}};
}
function adapter({session,identity,allowed,call}){return async(kind,payload)=>{
 const actor=identity(),target=payload?.trainerId;if(!uuid(target))throw Error('Choose a trainer.');
 const check=async()=>{const r=await session();if(r.error||!actor||!allowed(target)||identity()!==actor||r.data?.session?.user?.id!==actor)throw Object.assign(Error('Staff session changed. Reload the Hub.'),{code:'42501'});};await check();
 let result;try{if(kind==='read')result=await call('admin_trainer_corrections_read',{p_user:target});else if(kind==='save')result=await call('admin_trainer_correction_write',{p_intent:structuredClone(payload)});else throw Error('Unsupported correction operation.');}catch(e){if(/Only admins|restricted to staff|Access denied/i.test(e.message||''))e.code='42501';throw e;}
 await check();return result;
};}
return {prepare,controller,mount,adapter};
});
