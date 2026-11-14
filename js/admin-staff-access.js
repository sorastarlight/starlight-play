/* Reviewed staff access. Role authority stays on the server. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PLAY_STAFF_ACCESS=api;})(globalThis,()=>{
'use strict';
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(v);
const label=v=>({player:'Player',moderator:'Moderator',admin:'Admin',owner:'Owner'}[v]||'Unavailable');
const roles=['player','moderator','admin','owner'],choices=['player','moderator','admin'];
function project(s,id){
 if(!s||s.trainerId!==id||!uuid(id)||!uuid(s.actorId)||typeof s.trainerName!=='string'||!s.trainerName.trim()||typeof s.revision!=='string'||!s.revision.trim()||!roles.includes(s.role)||!Array.isArray(s.choices)||new Set(s.choices).size!==s.choices.length||s.choices.some(r=>!choices.includes(r)))throw Error('Staff access could not be verified.');
 return structuredClone(s);
}
function historyView(history){
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const unavailable='<p>Access-change details unavailable. Reload this trainer’s access history.</p>';
 if(history==null||Array.isArray(history)&&!history.length)return '<p>No access changes recorded.</p>';
 if(!Array.isArray(history))return unavailable;
 return history.map(h=>{
  if(!h||typeof h!=='object'||!roles.includes(h.before)||!roles.includes(h.after))return unavailable;
  const at=typeof h.createdAt==='string'&&Number.isFinite(Date.parse(h.createdAt))?new Date(h.createdAt).toLocaleString():'Not recorded';
  return '<article class="record-surface"><strong>'+esc(label(h.before))+' → '+esc(label(h.after))+'</strong><p>'+esc(typeof h.reason==='string'?h.reason:'No reason recorded')+'</p><small>'+esc(at)+'</small></article>';
 }).join('');
}
function prepare(s,role,reason,requestId){
 if(!s||!uuid(s.trainerId)||!uuid(s.actorId)||!s.revision||!uuid(requestId))throw Error('Reload staff access before making a change.');
 if(!choices.includes(role)||!s.choices?.includes(role)||s.role===role)throw Error('Choose an allowed, different role.');
 if(typeof reason!=='string'||reason.trim().length<3||reason.trim().length>1000)throw Error('Add a staff reason between 3 and 1,000 characters.');
 return {trainerId:s.trainerId,requestId,revision:s.revision,role,reason:reason.trim()};
}
function controller(transport,changed=()=>{}){
 let epoch=0;const state={phase:'closed',snapshot:null,review:null,message:''};const emit=()=>changed(state);
 function reset(){epoch++;Object.assign(state,{phase:'closed',snapshot:null,review:null,message:''});emit();}
 async function open(id){reset();const generation=epoch;state.phase='loading';emit();try{const s=await transport('read',{trainerId:id});if(generation!==epoch)return;state.snapshot=project(s,id);state.phase='ready';emit();}catch(e){if(generation!==epoch)return;state.phase='error';state.message='Staff access could not be loaded. Reload to try again.';emit();}}
 function review(role,reason,id){if(state.phase!=='ready')throw Error('Reload staff access first.');state.review=prepare(state.snapshot,role,reason,id);emit();}
 async function save(){if(state.phase!=='ready'||!state.review)throw Error('Review the role change first.');const generation=epoch,payload=structuredClone(state.review);state.phase='saving';emit();try{const r=await transport('save',payload);if(generation!==epoch)return;if(r?.status!=='saved'||r.requestId!==payload.requestId||r.trainerId!==payload.trainerId)throw Error('Unconfirmed result');state.snapshot.role=payload.role;state.phase='saved';state.review=null;state.message='Staff access updated. Reload to see the current role and history.';emit();}catch(e){if(generation!==epoch)return;state.review=null;if(['42501','401','403'].includes(String(e?.code||e?.status)))state.snapshot=null;state.phase='error';state.message=['42501','401','403','40001','55P03','22023'].includes(String(e?.code||e?.status))?'Access or trainer details changed, or another action is in progress. Reload before trying again.':'The result could not be confirmed. Reload and check the role and history before trying again.';emit();}}
 return {state,reset,open,review,save,cancel(){if(state.phase!=='ready')return;state.review=null;emit();}};
}
function adapter({session,identity,allowed,call}){return async(kind,payload)=>{const actor=identity(),target=payload.trainerId;const check=async()=>{const r=await session();if(r.error||!uuid(target)||!actor||identity()!==actor||!allowed(target)||r.data?.session?.user?.id!==actor)throw Object.assign(Error('Session changed'),{code:'42501'});};await check();let result;if(kind==='read')result=await call('admin_staff_access_read',{p_user:target});else if(kind==='save')result=await call('admin_staff_access_save',{p_intent:structuredClone(payload)});else throw Error('Unsupported staff access action');await check();if(kind==='read'&&result?.actorId!==actor)throw Error('Actor mismatch');return result;};}
function mount(host,transport){
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));let trainerId=null,role='',reason='',presentationVersion=0,reloadRequested=false;
 const model=controller(transport,render);
 function canLeave(){return model.state.phase!=='saving'&&!model.state.review&&!(model.state.phase==='ready'&&(role||reason.trim()));}
 function announceStatus(notice,version,immediate=false){
  const text=notice?.textContent||'';if(!text)return;
  notice.setAttribute('role','status');notice.innerHTML='<span aria-hidden="true">'+esc(text)+'</span>';notice.setAttribute('aria-label',text);
  if(immediate){notice.focus({preventScroll:true});return;}
  host.ownerDocument?.defaultView?.setTimeout?.(()=>{if(version!==presentationVersion||!notice.isConnected)return;const active=host.ownerDocument.activeElement;if(active!==host.ownerDocument.body&&!host.contains(active))return;notice.focus({preventScroll:true});},180);
 }
 function showWarning(message){const dialog=host.querySelector('dialog');let error=host.querySelector('[data-role-warning]');if(dialog?.open){error=dialog.querySelector('[data-role-review-warning]');if(!error){error=host.ownerDocument.createElement('p');error.setAttribute('data-role-review-warning','');error.tabIndex=-1;dialog.append(error);}}if(error){error.textContent=message;announceStatus(error,++presentationVersion,true);}}
 function warnBeforeLeaving(){showWarning(model.state.phase==='saving'?'The access change is being saved. Wait for its result before leaving this record.':'Finish reviewing or discard the access change before leaving this record.');}
 function render(){const version=++presentationVersion,s=model.state;host.querySelector('dialog')?.close();host.innerHTML=`<header class="correction-toolbar"><div><h3>Staff access</h3><p>Choose who can help manage the game. Every change needs a staff reason.</p></div><button type="button" data-role-load ${s.phase==='loading'||s.phase==='saving'?'disabled':''}>Reload access</button></header><p role="status" tabindex="-1">${esc(s.message|| (s.phase==='loading'?'Loading staff access…':s.phase==='ready'?'Staff access loaded.':''))}</p><p role="alert" tabindex="-1" data-role-warning></p>`;
 if(!s.snapshot){if(s.phase==='error')announceStatus(host.querySelector('[role=status]'),version);return;}const v=s.snapshot,editable=s.phase==='ready'&&v.choices.length;
 host.insertAdjacentHTML('beforeend',`<div class="staff-access-layout"><section><h4>${esc(v.trainerName)}</h4><p>Current access: <strong>${esc(label(v.role))}</strong></p>${v.choices.length?`<form data-role-form><fieldset ${editable?'':'disabled'}><label>New role<select name="role" required><option value="">Choose a new role</option>${v.choices.filter(r=>r!==v.role).map(r=>`<option value="${r}" ${role===r?'selected':''}>${esc(label(r))}</option>`).join('')}</select></label><label>Staff reason<textarea name="reason" minlength="3" maxlength="1000" required>${esc(reason)}</textarea></label><button type="button" data-role-discard>Discard changes</button><button type="submit">Review access change</button></fieldset></form>`:'<p>This role cannot be changed here. You cannot change your own access or the owner’s access. Moderators can view roles.</p>'}<p>Moderators can use staff tools. Admins also manage staff access. Only the owner can grant Admin.</p></section><section><h4>Recent access changes</h4>${historyView(v.history)}</section></div>`);
 if(s.review){const d=document.createElement('dialog');d.className='mart-dialog';d.setAttribute('aria-label','Review staff access change');d.innerHTML=`<h3>Change staff access?</h3><p>${esc(v.trainerName)}</p><p><strong>${esc(label(v.role))} → ${esc(label(s.review.role))}</strong></p><p>${esc(s.review.reason)}</p><p>This changes which staff tools the trainer can use.</p><div class="mart-actions"><button type="button" data-role-cancel ${s.phase==='saving'?'disabled':''}>Back</button><button type="button" data-role-save ${s.phase==='saving'?'disabled':''}>${s.phase==='saving'?'Saving…':'Confirm role change'}</button></div>`;d.addEventListener('cancel',e=>{e.preventDefault();if(s.phase!=='saving'){model.cancel();host.querySelector('[data-role-form] button[type=submit]')?.focus();}});host.append(d);d.showModal();d.querySelector('[data-role-cancel]').focus();}
 if(['saved','error'].includes(s.phase)||reloadRequested&&s.phase==='ready'){reloadRequested=false;announceStatus(host.querySelector('[role=status]'),version);}
 }
 host.addEventListener('input',e=>{if(e.target.name==='reason')reason=e.target.value;});host.addEventListener('change',e=>{if(e.target.name==='role')role=e.target.value;});
 host.addEventListener('submit',e=>{if(!e.target.matches('[data-role-form]'))return;e.preventDefault();try{model.review(role,reason,crypto.randomUUID());}catch(err){showWarning(err.message);}});
 host.addEventListener('click',e=>{if(e.target.closest('[data-role-load]')){if(!canLeave()){warnBeforeLeaving();return;}role='';reason='';reloadRequested=true;model.open(trainerId);}else if(e.target.closest('[data-role-discard]')){if(model.state.phase!=='ready'||model.state.review)return;role='';reason='';render();host.querySelector('[name=role]')?.focus();}else if(e.target.closest('[data-role-cancel]')){model.cancel();host.querySelector('[data-role-form] button[type=submit]')?.focus();}else if(e.target.closest('[data-role-save]'))model.save();});
 host.ownerDocument?.defaultView?.addEventListener('beforeunload',e=>{if(!canLeave()){e.preventDefault();e.returnValue='';}});
 return {...model,canLeave,warnBeforeLeaving,open(id){reloadRequested=false;if(id!==trainerId){role='';reason='';}trainerId=id;return model.open(id);},reset(){trainerId=null;role='';reason='';reloadRequested=false;model.reset();}};
}
return {label,prepare,controller,adapter,mount,project,historyView};
});
