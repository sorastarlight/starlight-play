(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PLAY_ADMIN_PASS_BUNDLES = api;
})(typeof window === 'undefined' ? globalThis : window, function () {
  'use strict';
  const items = Object.freeze({berry:['Berry','oran-berry'],bait:['Honey','honey'],pokeball:['Poké Ball','poke-ball'],greatball:['Great Ball','great-ball'],ultraball:['Ultra Ball','ultra-ball'],lure:['Poké Radar','poke-radar'],coins:['PokéCoins','pokecoin'],bag_bonus:['Inventory Space','inventory-bag']});
  const kinds = ['daily','weekly'];
  const commands = ['admin_content_studio','admin_save_pass_rewards'];
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function quantity(v) {
    if ((typeof v !== 'number' && typeof v !== 'string') || !/^\d+$/.test(String(v)) || !Number.isInteger(Number(v)) || Number(v)<1 || Number(v)>2147483647) throw Error('Use whole quantities from 1 to 2,147,483,647. Use Remove to exclude a reward.');
    return Number(v);
  }
  function bundle(bag, strings=false) {
    if (!bag || typeof bag !== 'object' || Array.isArray(bag) || !Object.keys(bag).length || Object.keys(bag).some(k=>!Object.hasOwn(items,k))) throw Error('Unsupported or empty bundle. Use the current Pass tools to review it.');
    return Object.fromEntries(Object.keys(items).filter(k=>Object.hasOwn(bag,k)).map(k=>{if(!strings && typeof bag[k]!=='number') throw Error('Malformed reward quantity.');return [k,quantity(bag[k])];}));
  }
  function project(raw) {
    const p=raw?.passRewards;
    if(raw?.ok!==true || !p || Object.keys(p).sort().join()!=='daily,weekly') throw Error('Pass rewards unavailable.');
    return {daily:bundle(p.daily),weekly:bundle(p.weekly)};
  }
  const copy = value => JSON.parse(JSON.stringify(value));
  const equal = (a,b) => JSON.stringify(a)===JSON.stringify(b);
  function payload(draft) {return {p_daily:bundle(draft?.daily,true),p_weekly:bundle(draft?.weekly,true)};}
  function adapter({session,identity,allowed,call}) {
    return async (name,args) => {
      if(!commands.includes(name)) throw Error('Unsupported Pass operation.');
      let safe;
      if(name===commands[1]) {
        if(!args || Object.keys(args).sort().join()!=='p_daily,p_weekly') throw Error('Unsupported Pass payload.');
        safe={p_daily:bundle(args.p_daily),p_weekly:bundle(args.p_weekly)};
      } else if(args!==undefined) throw Error('Unsupported Pass read payload.');
      const expected=identity();
      async function check(){const s=await session();if(!expected || !allowed() || identity()!==expected || s.error || s.data?.session?.user?.id!==expected) throw Object.assign(Error('Staff session changed.'),{code:'42501'});}
      await check(); const result=await call(name,safe); await check(); return result;
    };
  }
  function controller(transport,notify=()=>{}) {
    let active=false,epoch=0;
    const state={phase:'closed',current:null,draft:null,locked:false,message:'Load the current daily and weekly rewards to begin.'};
    const emit=()=>notify(state);
    function reset(){epoch++;active=false;Object.assign(state,{phase:'closed',current:null,draft:null,locked:false,message:'Load the current daily and weekly rewards to begin.'});emit();}
    function dirty(){if(!state.draft)return false;try{const p=payload(state.draft);return !equal(state.current,{daily:p.p_daily,weekly:p.p_weekly});}catch(_){return true;}}
    function editable(){return active && state.phase==='ready' && !state.locked;}
    async function load(){if(!active || ['loading','saving'].includes(state.phase))return;const token=++epoch;Object.assign(state,{phase:'loading',current:null,draft:null,locked:false,message:'Loading Pass rewards…'});emit();try{const raw=await transport(commands[0]);if(!active||token!==epoch)return;const current=project(raw);Object.assign(state,{phase:'ready',current,draft:copy(current),message:'Current bundles loaded. Edits apply to future eligible claims.'});}catch(_){if(!active||token!==epoch)return;Object.assign(state,{phase:'error',current:null,draft:null,message:'Pass rewards unavailable or unsupported. No defaults were substituted. Check access or use the current Pass tools.'});}emit();}
    function edit(kind,key,value){if(!editable()||!kinds.includes(kind)||!Object.hasOwn(state.draft[kind],key))return false;state.draft[kind][key]=value;return true;}
    function add(kind,key){if(!editable()||!kinds.includes(kind)||!Object.hasOwn(items,key)||Object.hasOwn(state.draft[kind],key))return false;state.draft[kind][key]=1;emit();return true;}
    function remove(kind,key){if(!editable()||!kinds.includes(kind)||!Object.hasOwn(state.draft[kind],key))return false;if(Object.keys(state.draft[kind]).length===1)throw Error('Keep at least one reward in each bundle.');delete state.draft[kind][key];emit();return true;}
    function discard(){if(!editable())return;state.draft=copy(state.current);emit();}
    async function save(){if(!editable())return;const sent=payload(state.draft);if(!dirty())throw Error('No changes to review.');const token=epoch;state.phase='saving';state.message='Sending the reviewed bundles once…';emit();try{const raw=await transport(commands[1],sent);if(!active||token!==epoch)return;const received=project(raw);if(!equal(received,{daily:sent.p_daily,weekly:sent.p_weekly}))throw Error('Receipt mismatch.');state.current=received;state.draft=copy(received);state.message='Save acknowledged. Reload the stored bundles before editing again.';}catch(error){if(!active||token!==epoch)return;if(['42501','401','403'].includes(String(error?.code||error?.status))){Object.assign(state,{phase:'error',current:null,draft:null,locked:false,message:'Access denied or session changed. Bundle data was cleared.'});emit();return;}state.message='Save could not be confirmed. Do not retry. Reload and compare the stored bundles first.';}state.phase='ready';state.locked=true;emit();}
    return {state,reset,dirty,load,edit,add,remove,discard,save,open(){active=true;return load();}};
  }
  function mount(root,transport){
    if(!root)return null;
    const doc=root.ownerDocument;let dialog=null;
    const model=controller(transport,render);
    function close(){if(dialog){const d=dialog;dialog=null;d.onclose=null;d.close();d.remove();}}
    function icon(key){return `<img src="images/items/${items[key][1]}.png" alt="" width="40" height="40">`;}
    function list(bag){return `<ul class="pass-summary">${Object.entries(bag).map(([k,v])=>`<li>${icon(k)}<span>${esc(items[k][0])}</span><strong>× ${Number(v).toLocaleString('en-US')}</strong></li>`).join('')}</ul>`;}
    function render(){close();const s=model.state,focused=root.contains(doc.activeElement)&&s.phase!=='closed';root.innerHTML=`<p role="status" tabindex="-1" class="pass-status">${esc(s.message)}</p><button type="button" data-pass-load ${['loading','saving'].includes(s.phase)?'disabled':''}>${s.phase==='closed'?'Load Pass rewards':'Reload Pass rewards'}</button>${s.draft?`<form data-pass-form><fieldset ${s.locked||s.phase==='saving'?'disabled':''}><div class="pass-bundles">${kinds.map(kind=>`<section><h4>${kind==='daily'?'Daily gift':'Weekly crate'}</h4><ul class="pass-rows">${Object.entries(s.draft[kind]).map(([key,value])=>`<li>${icon(key)}<label>${esc(items[key][0])}<input type="number" min="1" max="2147483647" step="1" required value="${esc(value)}" data-kind="${kind}" data-key="${key}" aria-label="${kind==='daily'?'Daily':'Weekly'} ${esc(items[key][0])} quantity"></label><button type="button" data-remove="${key}" data-kind="${kind}" aria-label="Remove ${esc(items[key][0])} from ${kind} bundle">Remove</button></li>`).join('')}</ul><button type="button" data-add="${kind}">Add ${kind} reward</button></section>`).join('')}</div><p role="alert" data-pass-error></p><div class="pass-actions"><button type="button" data-pass-discard>Discard local edits</button><button type="submit">Review bundles</button></div></fieldset></form>`:''}`;if(focused)root.querySelector('.pass-status').focus({preventScroll:true});}
    function modal(title,body,action,label){if(dialog)return;const opener=doc.activeElement,d=doc.createElement('dialog');dialog=d;d.className='pass-dialog';d.setAttribute('aria-labelledby','pass-dialog-heading');d.innerHTML=`<h3 id="pass-dialog-heading">${esc(title)}</h3>${body}<div class="pass-actions"><button type="button" data-back autofocus>Back to editing</button>${action?`<button type="button" data-confirm>${esc(label)}</button>`:''}</div>`;root.append(d);d.querySelector('[data-back]').onclick=()=>d.close();if(action)d.querySelector('[data-confirm]').onclick=()=>{d.close();action();};d.onclose=()=>{d.remove();if(dialog===d)dialog=null;if(opener?.isConnected&&!root.closest('[hidden]'))opener.focus({preventScroll:true});};d.showModal();if(d.scrollHeight>d.clientHeight){const h=d.querySelector('h3');h.tabIndex=-1;h.focus({preventScroll:true});d.scrollTop=0;}return d;}
    function confirmDiscard(action){if(model.dirty())modal('Discard this local draft?','<p>Unsaved bundle edits will be lost. Reloading does not repeat a save.</p>',action,'Discard and continue');else action();}
    root.addEventListener('input',e=>{if(e.target.matches('[data-key]')){model.edit(e.target.dataset.kind,e.target.dataset.key,e.target.value);e.target.removeAttribute('aria-invalid');}});
    root.addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return;try{
      if(t.hasAttribute('data-pass-load'))confirmDiscard(()=>model.state.phase==='closed'?model.open():model.load());
      if(t.hasAttribute('data-pass-discard'))confirmDiscard(()=>model.discard());
      if(t.dataset.remove){const kind=t.dataset.kind;model.remove(kind,t.dataset.remove);root.querySelector(`[data-add="${kind}"]`)?.focus();}
      if(t.dataset.add){const kind=t.dataset.add;const d=modal(`Add a ${kind} reward`,`<label>Find a reward<input type="search" data-pass-search></label><div class="pass-picker"></div>`);const update=()=>{const query=d.querySelector('input').value.normalize('NFKC').toLocaleLowerCase();const available=Object.keys(items).filter(k=>!Object.hasOwn(model.state.draft[kind],k)&&items[k][0].toLocaleLowerCase().includes(query));d.querySelector('.pass-picker').innerHTML=available.length?available.map(k=>`<button type="button" data-pick="${k}">${icon(k)}${esc(items[k][0])}</button>`).join(''):'<p>No matching rewards available.</p>';};d.querySelector('input').oninput=update;d.querySelector('.pass-picker').onclick=event=>{const pick=event.target.closest('[data-pick]');if(!pick)return;d.close();model.add(kind,pick.dataset.pick);root.querySelector(`[data-kind="${kind}"][data-key="${pick.dataset.pick}"]`)?.focus();};update();d.querySelector('input').focus();}
    }catch(error){root.querySelector('[data-pass-error]').textContent=error.message;}});
    root.addEventListener('submit',e=>{if(!e.target.matches('[data-pass-form]'))return;e.preventDefault();try{if(model.state.locked||model.state.phase!=='ready')return;const p=payload(model.state.draft);if(!model.dirty())throw Error('No changes to review.');modal('Review Pass bundles',`<p>These site-wide bundles apply to future eligible claims. This does not grant rewards or change eligibility, cooldowns or claim clocks. A claim already in progress may use the previous bundle.</p><div class="pass-bundles">${kinds.map(k=>`<section><h4>${k==='daily'?'Daily gift':'Weekly crate'}</h4><h5>Current</h5>${list(model.state.current[k])}<h5>Proposed</h5>${list(p['p_'+k])}</section>`).join('')}</div><p>Concurrent staff edits are not locked. This replaces both bundles. Save once, then reload to verify.</p>`,()=>model.save(),'Save Pass bundles');}catch(error){root.querySelector('[data-pass-error]').textContent=error.message;const bad=[...root.querySelectorAll('[data-key]')].find(input=>{try{quantity(input.value);return false;}catch(_){return true;}});if(bad){bad.setAttribute('aria-invalid','true');bad.focus();}}});
    doc.addEventListener('click',e=>{
      const link=e.target.closest('a[href],[data-next-tab]');
      if(!link||link.dataset.nextTab==='config'||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||root.contains(link)||!model.dirty()||root.closest('[hidden]')||e.defaultPrevented)return;
      e.preventDefault();e.stopImmediatePropagation();
      if(model.state.phase==='saving'){
        const d=modal('Save in progress','<p>The request has already been sent. Wait for its result before leaving this workspace. Closing this message does not cancel or repeat the save.</p>');
        if(d)d.querySelector('[data-back]').textContent='Return to pending save';
        return;
      }
      confirmDiscard(()=>{model.discard();if(model.state.locked)model.reset();link.click();});
    },true);
    doc.defaultView.addEventListener('beforeunload',e=>{if(model.dirty()){e.preventDefault();e.returnValue='';}});
    render();return model;
  }
  return Object.freeze({items,commands,quantity,bundle,project,payload,adapter,controller,mount});
});
