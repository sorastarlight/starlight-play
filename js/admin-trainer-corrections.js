/* Direct corrections: set a resulting value, never express an implicit gift. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PLAY_TRAINER_CORRECTIONS=api;})(globalThis,()=>{
'use strict';
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const whole=v=>Number.isSafeInteger(v)&&v>=0&&v<=2147483647;
function prepare(snapshot,change,reason,requestId){
 if(!snapshot||!uuid(snapshot.trainerId)||typeof snapshot.revision!=='string'||!snapshot.revision||!uuid(requestId))throw Error('Reload this trainer before making a correction.');
 if(typeof reason!=='string'||reason.trim().length<3||reason.trim().length>1000)throw Error('Add a staff reason between 3 and 1,000 characters.');
 let correction;
 if(change?.type==='quantity'){
  const row=snapshot.values?.find(r=>r.id===change.id);
  if(!row||row.editable!==true||!whole(row.value)||!whole(change.value))throw Error('Choose an editable balance and a whole resulting quantity.');
  if(change.value===row.value)throw Error('The quantity has not changed.');
  if(row.kind==='capacity'&&(!whole(row.used)||change.value<row.used))throw Error('Capacity cannot be lower than the space already used.');
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
 async function open(trainerId){reset();if(!uuid(trainerId))throw Error('Choose a trainer.');active=true;const token=epoch;state.phase='loading';emit();try{const snapshot=await transport('read',{trainerId});if(!active||token!==epoch)return;if(snapshot?.trainerId!==trainerId||typeof snapshot.revision!=='string')throw Error('Trainer details could not be verified.');state.snapshot=snapshot;state.phase='ready';emit();}catch(e){if(active&&token===epoch){state.phase='error';state.message=e.message;emit();}}}
 function review(change,reason,requestId){if(state.phase!=='ready')throw Error('Reload the trainer before editing.');state.review=prepare(state.snapshot,change,reason,requestId);emit();return state.review;}
 async function save(){if(state.phase!=='ready'||!state.review)throw Error('Review the correction first.');const token=epoch,payload=structuredClone(state.review);state.phase='saving';emit();try{const receipt=await transport('save',payload);if(!active||token!==epoch)return;if(receipt?.requestId!==payload.requestId||receipt?.trainerId!==payload.trainerId||receipt?.status!=='saved')throw Error('The correction could not be confirmed.');state.phase='saved';state.message='Correction saved. Reload to see the updated trainer.';state.review=null;emit();}catch(e){if(!active||token!==epoch)return;state.phase='uncertain';state.message='The result could not be confirmed. Check the correction history before trying again.';emit();}}
 return {state,reset,open,review,save};
}
function mount(host,transport){
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let change=null,request=null,draft={},draftReason="",selectedIds=new Set();
 const model=controller(transport,render);
 function render(){
  const s=model.state;if(!s.snapshot){draft={};draftReason='';selectedIds.clear();host.innerHTML=`<p role="status">${esc(s.phase==='loading'?'Loading trainer balances…':s.message||'Choose a trainer.')}</p>`;return;}
  host.innerHTML=`<h3>Correct account details</h3><p>Set the amount this trainer should have. Corrections are recorded separately from gifts.</p><p role="status">${esc(s.message)}</p><fieldset ${s.phase!=='ready'||s.review?'disabled':''}><form data-correction-form><div class="correction-values">${(s.snapshot.values||[]).filter(r=>r.editable).map(r=>`<label>${esc(r.name||r.id)}<span>Current: ${esc(r.value)}</span><input type="number" data-correction-id="${esc(r.id)}" value="${esc(draft[r.id]??r.value)}" min="0" step="1" max="${r.maximum||2147483647}" required></label>`).join('')}</div><label>Staff reason<textarea name="reason" minlength="3" maxlength="1000" required>${esc(draftReason)}</textarea></label><p role="alert" data-correction-error></p><button type="submit">Review correction</button></form><details><summary>Remove specific Pokémon</summary><p>Select each Pokémon to remove. Locked, favorited and trading Pokémon cannot be selected.</p><form data-remove-pokemon>${(s.snapshot.pokemon||[]).map(p=>`<label class="correction-specimen"><input type="checkbox" name="specimen" value="${esc(p.id)}" ${selectedIds.has(p.id)?'checked':''} ${p.locked!==false||p.favorite!==false||p.trading!==false?'disabled':''}><strong>${esc(p.name||'Pokémon')}</strong> · ${esc(p.publicId||p.id)} · Level ${esc(p.level??'unavailable')}${p.favorite?' · Favorite':''}${p.locked?' · Locked':''}${p.trading?' · In a trade':''}</label>`).join('')||'<p>No Pokémon available.</p>'}<label>Staff reason<textarea name="reason" minlength="3" maxlength="1000" required>${esc(draftReason)}</textarea></label><p role="alert" data-removal-error></p><button type="submit">Review selected Pokémon</button></form></details></fieldset>${s.review?`<section class="correction-review" aria-label="Review correction"><h4>Review correction</h4>${s.review.correction.type==='quantity'?`<p>${esc(s.snapshot.values.find(r=>r.id===s.review.correction.id)?.name||s.review.correction.id)}: <strong>${esc(s.review.correction.before)} → ${esc(s.review.correction.after)}</strong></p>`:`<p>Remove these ${s.review.correction.ids.length} Pokémon:</p><ul>${s.review.correction.ids.map(id=>{const p=s.snapshot.pokemon.find(p=>p.id===id);return `<li>${esc(p.name||'Pokémon')} · ${esc(p.publicId||id)}</li>`}).join('')}</ul>`}<p>${esc(s.review.reason)}</p><button type="button" data-correction-save ${s.phase!=='ready'?'disabled':''}>Save correction</button><button type="button" data-correction-cancel ${s.phase!=='ready'?'disabled':''}>Back to editing</button></section>`:''}`;
 }
 host.addEventListener('input',e=>{if(e.target.matches('[data-correction-id]'))draft[e.target.dataset.correctionId]=e.target.value;if(e.target.name==='reason')draftReason=e.target.value;if(e.target.name==='specimen'){if(e.target.checked)selectedIds.add(e.target.value);else selectedIds.delete(e.target.value);}});
 host.addEventListener('submit',e=>{if(e.target.matches('[data-remove-pokemon]')){e.preventDefault();try{model.review({type:'removePokemon',ids:[...selectedIds]},e.target.elements.reason.value,crypto.randomUUID());host.querySelector('.correction-review h4').tabIndex=-1;host.querySelector('.correction-review h4').focus();}catch(error){host.querySelector('[data-removal-error]').textContent=error.message;}return;}if(!e.target.matches('[data-correction-form]'))return;e.preventDefault();try{
  const changes=[...e.target.querySelectorAll('[data-correction-id]')].filter(i=>Number(i.value)!==model.state.snapshot.values.find(r=>r.id===i.dataset.correctionId).value);
  if(changes.length!==1)throw Error('Change one balance at a time so each correction has a clear history.');
  change={type:'quantity',id:changes[0].dataset.correctionId,value:Number(changes[0].value)};request=crypto.randomUUID();model.review(change,e.target.elements.reason.value,request);
  host.querySelector('.correction-review h4').tabIndex=-1;host.querySelector('.correction-review h4').focus();
 }catch(error){host.querySelector('[data-correction-error]').textContent=error.message;}});
 host.addEventListener('click',e=>{if(e.target.closest('[data-correction-save]'))model.save();if(e.target.closest('[data-correction-cancel]')){model.state.review=null;render();}});
 return model;
}
return {prepare,controller,mount};
});
