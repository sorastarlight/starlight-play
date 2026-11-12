(function(root){
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const categories={account:'Login / account / access',linking:'Password / Twitch linking',pokemon:'Missing Pokémon',inventory:'Bag / items / Evolution Candy / PokéCoins',pass:'Starlight Pass / Twitch rewards',bug:'Technical bug',store:'Store / Bits / transactions',other:'Other'};
const label=s=>({open:'Open',waiting_staff:'Waiting for staff',waiting_player:'Waiting for player',resolved:'Resolved',closed:'Closed',general:'General question',missing:'Missing reward',amount:'Incorrect amount',access:'Cannot access'}[s]||String(s||'').replaceAll('_',' ')),date=s=>typeof s==='string'&&s.trim()&&Number.isFinite(Date.parse(s))?new Date(s).toLocaleString():'Not recorded';
const options=(items,selected='')=>Object.entries(items).map(([v,l])=>`<option value="${esc(v)}" ${v===selected?'selected':''}>${esc(l)}</option>`).join('');
const mounts=new WeakMap();
function mount(host,{staff=false,playerId='',readonly=false}={}){
 if(!host)return;const old=mounts.get(host),configKey=JSON.stringify({staff,playerId,readonly});if(old&&!old.dead&&old.configKey===configKey)return old;if(old&&!old.dead)old.stop();
 const state={configKey,dead:false,epoch:0,listRevision:0,listKey:null,detailRevision:0,actor:'',selected:'',tickets:[],cursor:null,messageCursor:null,messages:[],ticket:null,busy:false,mutationPending:false};mounts.set(host,state);
 host.classList.add('support-workspace');host.innerHTML='<p role="status">Checking sign-in…</p>';
 const client=root.playSupabase;let authSubscription;
 const alive=(epoch)=>!state.dead&&host.isConnected&&state.epoch===epoch;
 function stop(){root.PLAY_ADMIN_RECOVERY_EMAIL?.clear();state.dead=true;state.epoch++;state.ticket=null;state.messages=[];state.events=[];state.tickets=[];state.selected='';state.cursor=null;state.listKey=null;state.messageCursor=null;host.querySelector('dialog')?.close();authSubscription?.unsubscribe();host.innerHTML='';}
 state.stop=stop;
 async function identity(){const result=await client.auth.getUser();if(result.error||!result.data?.user)throw Error('Sign in to use the Service Desk.');return result.data.user.id;}
 async function call(action,payload={},current=()=>true){const actor=await identity();if(actor!==state.actor||state.dead)throw Error('Account changed. Reload the Service Desk.');if(!current())throw Error('This request is no longer active.');const {data,error}=await client.rpc('support_call',{p_action:action,p_payload:{...payload,actorId:state.actor,mode:staff?'staff':'player'}});if(error)throw Error(error.code==='42501'?'The Service Desk is unavailable for your account.':['list','get'].includes(action)?'Tickets could not be loaded. Please try again.':'Could not complete that request. Your draft has been kept; check the case before submitting again.');if(data?.state==='disabled')throw Error('Service Desk tickets are not available yet.');return data;}
 async function attachmentCall(action, payload={}, file=null, reply=false, current=()=>true) {
  const actor=await identity();
  if(actor!==state.actor||state.dead) throw Error('Account changed. Reload the Service Desk.');
  if(!current())throw Error('This request is no longer active.');
  const {data,error}=await client.rpc(reply?'support_reply_attachment_call':'support_attachment_call',{
   p_action:action,p_payload:{...payload,actorId:actor,mode:staff?'staff':'player'},p_file:file
  });
  if(error||data?.state==='disabled') throw Error('The attachment request could not be confirmed. Check your ticket before trying again.');
  return data;
 }
 async function showAttachment(ticket, container) {
  const current=()=>!state.dead&&state.ticket===ticket&&container.isConnected;
  try {
   const {attachment}=await attachmentCall('inspect',{ticketId:ticket.id});
   if(!attachment||!current())return;
   const button=container.ownerDocument.createElement('button');
   button.type='button';
   button.textContent='Download screenshot';
   container.append(button);
   button.onclick=async()=>{
    button.disabled=true;
    try {
     const {attachment:file}=await attachmentCall('download',{ticketId:ticket.id});
     if(!current())return;
     if(!file||!['image/png','image/jpeg'].includes(file.mime))throw Error('Screenshot unavailable.');
     const bytes=Uint8Array.from(atob(file.base64),char=>char.charCodeAt(0));
     const url=URL.createObjectURL(new Blob([bytes],{type:file.mime}));
     const link=container.ownerDocument.createElement('a');
     link.href=url;
     link.download=file.mime==='image/png'?'ticket-screenshot.png':'ticket-screenshot.jpg';
     link.click();
     setTimeout(()=>URL.revokeObjectURL(url),1000);
    } catch(error) {if(current())status(error.message);}
    finally {button.disabled=false;}
   };
  } catch (_) {}
 }
 async function replyAttachments(ticket, detail) {
  const form=detail.querySelector('[data-reply]');
  const current=()=>!state.dead&&state.ticket===ticket&&detail.isConnected;
  if(form?.querySelector('[data-reply-attachment]'))try {
   const result=await attachmentCall('capability',{ticketId:ticket.id},null,true);
   if(current()&&result.replyAttachments===true){
    const field=form.querySelector('[data-reply-attachment]');
    field.hidden=false;
    field.disabled=false;
   }
  } catch(_) {}
  for(const button of detail.querySelectorAll('[data-reply-screenshot]'))button.onclick=async()=>{
   if(!current())return;
   button.disabled=true;
   try {
    const {attachment:file}=await attachmentCall('download',{ticketId:ticket.id,messageId:button.dataset.replyScreenshot},null,true);
    if(!current())return;
    if(!file||!['image/png','image/jpeg'].includes(file.mime))throw Error('Screenshot unavailable.');
    const bytes=Uint8Array.from(atob(file.base64),char=>char.charCodeAt(0));
    const url=URL.createObjectURL(new Blob([bytes],{type:file.mime}));
    const link=detail.ownerDocument.createElement('a');
    link.href=url;link.download=file.mime==='image/png'?'reply-screenshot.png':'reply-screenshot.jpg';
    link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
   } catch(error) {if(current())status(error.message);}
   finally {button.disabled=false;}
  };
 }
 async function screenshotBytes(file){
  if(!file)return null;
  if(!['image/png','image/jpeg'].includes(file.type)||file.size>524288||file.size<12)throw Error('Choose a PNG or JPEG screenshot up to 512 KB.');
  return new Uint8Array(await file.arrayBuffer());
 }
 function status(text){const el=host.querySelector('[data-support-status]');if(el)el.textContent=text;}
 function shell(){host.innerHTML=`<div class="support-layout"><aside class="support-card"><h2>${staff?(playerId?'Trainer ticket history':'Service Desk inbox'):'Your tickets'}</h2>${staff&&playerId?'<p class="support-muted">Only tickets from this trainer are shown.</p>':''}${!staff&&!readonly?'<button class="support-primary" data-new disabled>New ticket</button>':''}<form data-search><label>Search cases<input type="search" name="query" maxlength="120" placeholder="Case number or subject"></label><label>Status<select name="state">${options({'':'All statuses',open:'Open',waiting_staff:'Waiting for staff',waiting_player:'Waiting for player',resolved:'Resolved',closed:'Closed'})}</select></label><label>Category<select name="category">${options({'':'All categories',...categories})}</select></label>${staff?`<div class="support-more-filters"><div><label>Assignee<select name="assignee">${options({'':'All assignees',me:'Assigned to me',unassigned:'Unassigned'})}</select></label><label>Priority<select name="priority">${options({'':'All priorities',low:'Low',normal:'Normal',high:'High',urgent:'Urgent'})}</select></label></div></div>`:''}<button>Find tickets</button><p role="status" data-search-summary hidden></p></form><p data-counts></p><div data-list></div><button data-more-list hidden>More tickets</button></aside><section class="support-card" data-detail><p>Select a ticket to read the conversation.</p></section></div><p role="status" aria-live="polite" data-support-status></p><p class="support-muted">Do not include passwords, reset links, payment details or identity documents. Completed tickets are kept for 90 days.</p>`;
 host.querySelector('[data-search]').onsubmit=async e=>{
  e.preventDefault();
  const form=e.currentTarget,doc=host.ownerDocument,opener=doc?.activeElement;
  const loaded=loadList(),revision=state.listRevision;
  const ok=await loaded;
  if(!form?.contains?.(opener)||state.dead||revision!==state.listRevision||doc.activeElement!==opener)return;
  const summary=host.querySelector('[data-search-summary]');
  const count=state.tickets.length;
  summary.textContent=ok?(count===0?'No matching tickets.':count+' matching '+(count===1?'ticket':'tickets')+' shown.'):'Tickets unavailable. Use Find tickets to try again.';
  summary.hidden=false;summary.tabIndex=-1;summary.focus({preventScroll:true});
 };host.querySelector('[data-new]')?.addEventListener('click',newTicket);host.querySelector('[data-more-list]').onclick=async e=>{
  const button=e?.currentTarget,doc=host.ownerDocument,focused=button&&doc?.activeElement===button;
  const previousCount=state.tickets.length,previousKey=state.listKey;
  const pending=loadList(true),revision=state.listRevision;
  const ok=await pending;
  if(!focused||state.dead||revision!==state.listRevision)return;
  const retry=host.querySelector('[data-search] button');
  if(doc.activeElement!==button&&doc.activeElement!==doc.body&&(ok||doc.activeElement!==retry))return;
  const firstNew=previousKey===state.listKey?previousCount:0;
  const entries=host.querySelectorAll('[data-list] [data-ticket]');
  if(ok&&entries[firstNew]){entries[firstNew].focus({preventScroll:false});return;}
  const summary=host.querySelector('[data-search-summary]');
  summary.textContent=ok?'No more matching tickets.':'Tickets unavailable. Use Find tickets to try again.';
  summary.hidden=false;summary.tabIndex=-1;summary.focus({preventScroll:true});
 };
 host.querySelector('[data-list]').onclick=e=>{const b=e.target.closest('[data-ticket]');if(b)loadDetail(b.dataset.ticket);};}
 async function loadList(append=false){const f=host.querySelector('[data-search]');const summary=host.querySelector('[data-search-summary]');if(summary){summary.hidden=true;summary.textContent='';}const p=Object.fromEntries(new FormData(f));if(playerId)p.playerId=playerId;const listKey=JSON.stringify(p);if(append&&!state.cursor)return;if(append&&listKey!==state.listKey)append=false;const epoch=state.epoch,revision=++state.listRevision;const current=()=>alive(epoch)&&revision===state.listRevision;status('Loading tickets…');if(!append){state.cursor=null;host.querySelector('[data-more-list]').hidden=true;}if(append&&state.cursor){p.cursorTime=state.cursor.time;p.cursorId=state.cursor.id;}
 try{const data=await call('list',p);if(!current())return;if(host.querySelector('[data-new]'))host.querySelector('[data-new]').disabled=false;state.tickets=append?state.tickets.concat(data.tickets):data.tickets;state.cursor=data.nextCursor;state.listKey=listKey;host.querySelector('[data-counts]').textContent=`${data.openCount} open ${data.openCount===1?'ticket':'tickets'}`;host.querySelector('[data-list]').innerHTML=state.tickets.map(t=>`<button class="support-ticket" data-ticket="${esc(t.id)}" aria-current="${t.id===state.selected}"><small>CASE #${esc(t.caseNo)}</small><br>${esc(t.subject)}<br><span class="support-tag">${esc(label(t.state))}</span></button>`).join('')||'<p>No matching tickets.</p>';host.querySelector('[data-more-list]').hidden=!state.cursor;status('');return true;}catch(e){if(current()){if(host.querySelector('[data-new]'))host.querySelector('[data-new]').disabled=true;state.tickets=[];state.cursor=null;state.listKey=null;host.querySelector('[data-counts]').textContent='';host.querySelector('[data-list]').textContent='Tickets unavailable. Choose Find tickets to try again.';const more=host.querySelector('[data-more-list]'),lostFocus=host.ownerDocument?.activeElement===more;more.hidden=true;status(e.message+' Choose Find tickets to reload the list.');if(lostFocus)host.querySelector('[data-search] button')?.focus();}}return false;}
 async function loadDetail(id,append=false){
 const epoch=state.epoch,revision=++state.detailRevision;
 const messages=append&&state.ticket?.id===id?state.messages:[],cursor=append&&state.ticket?.id===id?state.messageCursor:null;
 const current=()=>alive(epoch)&&revision===state.detailRevision&&state.selected===id;
 state.selected=id;state.ticket=null;state.messages=[];state.messageCursor=null;state.events=[];
 root.PLAY_ADMIN_RECOVERY_EMAIL?.clear();
 const detailHost=host.querySelector('[data-detail]'),hadDetailFocus=detailHost.contains?.(host.ownerDocument?.activeElement);
 detailHost.innerHTML='<p role="status" tabindex="-1" data-conversation-loading>Loading conversation…</p>';
 if(hadDetailFocus)detailHost.querySelector('[data-conversation-loading]')?.focus({preventScroll:true});
 for(const b of host.querySelectorAll('[data-ticket]'))b.setAttribute('aria-current',String(b.dataset.ticket===id));status('Loading conversation…');
 try{const p={ticketId:id};if(cursor){p.cursorTime=cursor.time;p.cursorId=cursor.id;}const d=await call('get',p);if(!current())return;
 const focused=host.contains?.(host.ownerDocument?.activeElement);
 state.ticket=d.ticket;state.events=d.events||[];state.messages=messages.concat(d.messages);state.messageCursor=d.nextCursor;detail();status('');if(focused)host.querySelector('[data-case-heading]')?.focus({preventScroll:true});return true;
 }catch(e){if(current()){host.querySelector('[data-detail]').innerHTML='<p role="status">Conversation unavailable. Select this case again to retry.</p>';status(e.message);}}
 return false;
 }
 function detail(){root.PLAY_ADMIN_RECOVERY_EMAIL?.clear();const t=state.ticket;const d=host.querySelector('[data-detail]');d.innerHTML=`<p class="eyebrow">CASE #${esc(t.caseNo)}</p><h2 tabindex="-1" data-case-heading class="support-title">${esc(t.subject)}</h2><div class="support-row"><span class="support-tag">${esc(label(t.state))}</span><small>${esc(categories[t.category])} · ${esc(label(t.subcategory))}</small></div><p class="support-date">Opened ${esc(date(t.createdAt))} · Updated ${esc(date(t.updatedAt))}</p>${t.reference?`<p>Related reference: ${esc(t.reference)}</p>`:''}${staff?`<p><a href="./admin-next.html?section=support&trainer=${esc(t.playerId)}">View this trainer’s ticket history</a></p><section class="support-account"><h3>Account help</h3><div data-recovery></div></section>`:''}<div data-support-attachment></div><div class="support-conversation" role="region" tabindex="0" aria-label="Conversation">${state.messages.slice().reverse().map(m=>`<article class="support-message ${m.internal?'is-internal':''}"><strong>${esc(m.author)}${m.internal?' · Internal note':''}</strong><div class="support-date">${esc(date(m.createdAt))}</div><div>${esc(m.body)}</div>${m.hasScreenshot?'<button type="button" data-reply-screenshot="'+esc(m.id)+'">Download screenshot</button>':''}</article>`).join('')}</div>${state.messageCursor?'<button data-more-messages>Older messages</button>':''}${staff?`<section class="support-activity"><h3>Recent activity</h3>${(state.events||[]).map(e=>`<p><strong>${esc(e.action)}</strong> · ${esc(date(e.createdAt))}<br>${esc(e.reason)}</p>`).join('')||'<p>No recent changes.</p>'}</section>`:''}${readonly?'':`<form data-reply>${staff?`<label>Message visibility<select name="internal">${options({false:'Public reply · player can see',true:'Internal note · staff only'})}</select></label><label>Reply template<select data-canned>${options({'':'Choose a draft',details:'Could you share the reward or Pokémon reference and approximately when this happened? Please do not send passwords or reset links.',resolved:'Thanks for reporting this. Please check your account and let us know whether the issue is resolved.'})}</select></label>`:''}<label>${staff?'Reply or internal note':'Reply to Service Desk'}<textarea name="body" rows="3" required minlength="3" maxlength="5000"></textarea></label>${staff?'<label>Staff reason<input name="reason" required minlength="3" maxlength="1000"></label>':''}<fieldset data-reply-attachment hidden disabled><label>Attach screenshot (optional)<input type="file" data-reply-file accept="image/png,image/jpeg"></label><small>One PNG or JPEG screenshot, up to 512 KB.</small></fieldset><button class="support-primary">${staff?'Add message':'Send reply'}</button><p data-reply-status role="status"></p></form><div class="support-row" style="margin-top:16px"><button data-transition="resolved">Mark resolved</button><button data-transition="closed">Close ticket</button>${['closed','resolved'].includes(t.state)?'<button data-transition="waiting_staff">Reopen ticket</button>':''}${staff?'<button data-transition="waiting_player">Wait for player</button>':''}</div>${staff?`<section class="support-assignment"><h3>Assignment and priority</h3><form data-triage><label>Priority<select name="priority">${options({low:'Low',normal:'Normal',high:'High',urgent:'Urgent'},t.priority)}</select></label><label>Assignee<select name="assignee">${options({'':'Unassigned',me:'Assign to me'},t.assignee===state.actor?'me':'')}</select></label><label>Staff reason<input name="reason" minlength="3" maxlength="1000" required></label><button>Save assignment</button><p role="status" data-action-status></p></form></section>`:''}`}`;
 if(staff){
 const workspace=document.createElement('div');workspace.className='support-ticket-workspace';
 const conversation=document.createElement('section');conversation.className='support-ticket-main';conversation.setAttribute('aria-label','Ticket conversation');
 const sidebar=document.createElement('aside');sidebar.className='support-ticket-sidebar';sidebar.setAttribute('aria-label','Ticket management');
 for(const node of [...d.children]){
  if(node.matches('.support-conversation,[data-more-messages],[data-reply]'))conversation.append(node);
  else if(node.matches('.support-assignment,.support-account,.support-activity')||node.querySelector('[data-transition]'))sidebar.append(node);
 }
 workspace.append(conversation,sidebar);d.append(workspace);
 }
 void showAttachment(t,d.querySelector('[data-support-attachment]'));
 void replyAttachments(t,d);
 d.querySelector('[data-more-messages]')?.addEventListener('click',()=>loadDetail(t.id,true));
 if(staff&&root.PLAY_ADMIN_RECOVERY_EMAIL)root.PLAY_ADMIN_RECOVERY_EMAIL.mount(d.querySelector('[data-recovery]'),{id:t.playerId,displayName:'Trainer for case #'+t.caseNo},body=>client.functions.invoke('owner-recovery-email',{body}));
 d.querySelector('[data-canned]')?.addEventListener('change',e=>{if(e.target.value)d.querySelector('[data-reply] textarea').value=e.target.value;});
 d.querySelector('[data-reply]')?.addEventListener('submit',async e=>{e.preventDefault();const f=e.target,p=Object.fromEntries(new FormData(f));p.internal=p.internal==='true';await mutate('reply',p,f);});
 d.querySelector('[data-triage]')?.addEventListener('submit',async e=>{e.preventDefault();await mutate('triage',Object.fromEntries(new FormData(e.target)),e.target);});
 for(const b of d.querySelectorAll('[data-transition]'))b.onclick=()=>transition(b.dataset.transition);
 }
 async function mutate(action,payload,form){
 if(state.dead||state.mutationPending||!form.isConnected)return false;
 const notify=message=>{status(message);const local=form.querySelector('[data-action-status]')||form.querySelector('[data-reply-status]');if(local)local.textContent=message;};
 const ticket=state.ticket;if(!ticket||ticket.id!==state.selected){notify('Wait for the selected conversation to load before making changes.');return false;}
 state.mutationPending=true;const epoch=state.epoch,revision=state.detailRevision,buttons=[...form.querySelectorAll('button')];
 const current=()=>alive(epoch)&&state.selected===ticket.id&&state.detailRevision===revision&&form.isConnected&&(!form.closest?.('dialog')||form.closest('dialog').open);
 const focused=form.contains?.(host.ownerDocument?.activeElement);
 buttons.forEach(b=>b.disabled=true);notify('Saving…');if(focused){const local=form.querySelector('[data-action-status]')||form.querySelector('[data-reply-status]');if(local){local.tabIndex=-1;local.focus({preventScroll:true});}}const requestUuid=form.dataset.requestUuid||(form.dataset.requestUuid=crypto.randomUUID());
 try{
 const bytes=action==='reply'?await screenshotBytes(form.querySelector('[data-reply-file]')?.files[0]):null;
 if(!current()||!form.isConnected)return false;
 const args={...payload,ticketId:ticket.id,expectedRevision:ticket.revision,requestUuid};
 const data=bytes?await attachmentCall('reply',args,btoa(Array.from(bytes,char=>String.fromCharCode(char)).join('')),true,current):await call(action,args,current);if(!current())return false;
 if(data?.state==='conflict'){delete form.dataset.requestUuid;notify('This case changed. Your draft is kept. Copy it before reloading the conversation.');return false;}
 if(data?.state==='limited'){delete form.dataset.requestUuid;notify('You have reached the ticket request limit. Please wait before trying again.');return false;}
 if(data?.state!=='saved')throw Error('Could not confirm this request. Check the case before submitting again.');
 const detailLoaded=await loadDetail(ticket.id);if(!alive(epoch)||state.selected!==ticket.id)return true;const listLoaded=await loadList();if(alive(epoch)&&state.selected===ticket.id){
  notify(detailLoaded&&listLoaded?(action==='triage'?'Assignment and priority saved.':'Saved.'):'Saved, but the conversation or ticket list could not be refreshed. Do not submit again. Select the case or use Find tickets to reload.');
  const doc=host.ownerDocument;
  if(focused&&(action==='triage'||(action==='reply'&&(!detailLoaded||!listLoaded)))&&(doc.activeElement===doc.body||doc.activeElement===host.querySelector('[data-case-heading]'))){
   const outcome=host.querySelector('[data-support-status]');
   outcome.tabIndex=-1;outcome.focus({preventScroll:true});
  }
 }return true;
 }catch(e){if(current())notify(e.message);return false;}finally{state.mutationPending=false;if(alive(epoch)&&form.isConnected)buttons.forEach(b=>b.disabled=false);}
 }
 function transition(next){const reviewEpoch=state.epoch,reviewTicket=state.selected;const modal=document.createElement('dialog');modal.setAttribute('aria-label','Change ticket status');modal.innerHTML=`<form><h3>Change ticket status</h3><p>Set this case to ${esc(label(next))}?</p>${staff?'<label>Staff reason<textarea name="reason" required minlength="3" maxlength="1000"></textarea></label>':''}<p role="status" data-action-status></p><div class="support-row"><button type="button" data-cancel>Cancel</button><button class="support-primary">Confirm status change</button></div></form>`;host.append(modal);modal.showModal();modal.querySelector('[data-cancel]').onclick=()=>modal.close();modal.onclose=()=>modal.remove();modal.querySelector('form').onsubmit=async e=>{e.preventDefault();const saved=await mutate('transition',{state:next,reason:new FormData(e.target).get('reason')||''},e.target);if(saved&&modal.isConnected){modal.close();const outcome=host.querySelector('[data-support-status]');if(alive(reviewEpoch)&&state.selected===reviewTicket&&outcome?.textContent){if(outcome.textContent==='Saved.')status('Case status changed to '+label(next)+'.');outcome.tabIndex=-1;outcome.focus({preventScroll:true});}}};}
 async function newTicket(){const epoch=state.epoch;let attachments=false;try{attachments=(await attachmentCall('capability')).state==='ready';}catch(_){}if(!alive(epoch)||host.querySelector('dialog'))return;const modal=document.createElement('dialog');modal.setAttribute('aria-label','New Service Desk ticket');modal.innerHTML=`<form><h2>New Service Desk ticket</h2><p>Tell us what happened. Do not include secrets or identity documents.</p><label>Category<select name="category" required>${options({'':'Choose a category',...categories})}</select></label><label>Subcategory<select name="subcategory">${options({general:'General question',missing:'Missing reward',amount:'Incorrect amount',access:'Cannot access'})}</select></label><label>Subject<input name="subject" required minlength="5" maxlength="120"></label><label>What happened?<textarea name="body" required minlength="20" maxlength="5000" rows="4"></textarea></label>${attachments?'<label>Attach files (optional)<input type="file" data-attachment accept="image/png,image/jpeg"></label><p>One PNG or JPEG screenshot, up to 512 KB.</p>':'<label>Related reference (optional)<input name="reference" maxlength="100"></label>'}<p>Completed tickets are kept for 90 days.</p><div class="support-row"><button type="button" data-cancel>Cancel</button><button class="support-primary">Create ticket</button></div><p role="status" data-create-status></p></form>`;host.append(modal);modal.showModal();modal.querySelector('[data-cancel]').onclick=()=>modal.close();modal.onclose=()=>modal.remove();let pending=false;const requestUuid=crypto.randomUUID();modal.querySelector('form').onsubmit=async e=>{e.preventDefault();if(pending)return;pending=true;const epoch=state.epoch;const b=e.target.querySelector('button[type="submit"],button.support-primary');b.disabled=true;const current=()=>alive(epoch)&&modal.isConnected&&modal.open;try{const payload={...Object.fromEntries(new FormData(e.target)),requestUuid};
 const file=modal.querySelector('[data-attachment]')?.files[0];
 const bytes=await screenshotBytes(file);
 if(!current())return;
 const d=bytes?await attachmentCall('create',payload,btoa(Array.from(bytes,char=>String.fromCharCode(char)).join('')),false,current):await call('create',payload,current);if(!current())return;if(d?.state==='limited'){modal.querySelector('[data-create-status]').textContent='Please wait before creating another ticket.';return;}if(d?.state!=='saved'||typeof d.ticket?.id!=='string'||!d.ticket.id.trim())throw Error('Could not confirm ticket creation. Check your list before retrying.');const viewRevision=state.detailRevision;modal.close();const returnFocus=host.ownerDocument?.activeElement;const listLoaded=await loadList();if(!alive(epoch)||state.detailRevision!==viewRevision)return;const detailLoaded=await loadDetail(d.ticket.id);if(alive(epoch)&&state.selected===d.ticket.id){
 const doc=host.ownerDocument, outcome=host.querySelector('[data-support-status]');
 status(listLoaded&&detailLoaded?'Ticket created.':'Ticket created, but the conversation or ticket list could not be refreshed. Do not create another ticket. Use Find tickets and select the case to reload.');
 if(doc&&(doc.activeElement===returnFocus||doc.activeElement===doc.body||doc.activeElement===host.querySelector('[data-case-heading]'))){outcome.tabIndex=-1;outcome.focus({preventScroll:true});}
 }
 }catch(error){if(modal.isConnected){const outcome=modal.querySelector('[data-create-status]');outcome.textContent=error.message;const doc=modal.ownerDocument,active=doc?.activeElement;if(doc&&(active===b||active===modal||active===doc.body)){outcome.tabIndex=-1;outcome.focus({preventScroll:true});}}}finally{pending=false;if(modal.isConnected)b.disabled=false;}};}
 // Keep subscription handle so re-mounts cannot accumulate listeners.
 const sub=client.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'||(state.actor&&session?.user?.id&&session.user.id!==state.actor)){stop();host.innerHTML='<p>Account changed. Reload the Service Desk to continue.</p>';}});authSubscription=sub.data.subscription;
 (async()=>{try{state.actor=await identity();if(state.dead)return;shell();await loadList();}catch(e){if(!state.dead)host.innerHTML=`<p>${esc(e.message)}</p><a href="./signin.html">Sign in</a>`;}})();return state;
}
root.PLAY_SUPPORT={mount,unmount:host=>mounts.get(host)?.stop(),categories,escape:esc};if(document.getElementById('player-support'))mount(document.getElementById('player-support'));
})(window);
