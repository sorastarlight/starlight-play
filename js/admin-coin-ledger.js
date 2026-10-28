/* Native read-only transaction view. Reports load only through the explicit staff action. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PLAY_ADMIN_COIN_LEDGER=api;})(globalThis,()=>{
  'use strict';
  const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
  const uuid=x=>typeof x==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(x);
  const id=x=>typeof x==='string'&&/^[1-9][0-9]{0,18}$/.test(x)&&BigInt(x)<=9223372036854775807n;
  const integer=x=>Number.isInteger(x)&&x>=-2147483648&&x<=2147483647;
  const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=x=>Number(x).toLocaleString();
  const stamp=x=>new Date(x).toLocaleString(undefined,{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'});
  function query(value={}) {
    if(!object(value)||Object.keys(value).some(k=>!['p_limit','p_before_id','p_user'].includes(k)))throw Error('Unsupported transaction request.');
    const limit=value.p_limit??40,before=value.p_before_id??null,user=value.p_user??null;
    if(!Number.isInteger(limit)||limit<1||limit>100||(before!==null&&!id(before))||(user!==null&&!uuid(user)))throw Error('Invalid transaction page.');
    return Object.freeze({p_limit:limit,p_before_id:before,p_user:user});
  }
  function project(raw,request=query()) {
    if(raw?.ok!==true||!Array.isArray(raw.rows)||raw.rows.length>request.p_limit||typeof raw.hasMore!=='boolean')throw Error('Transaction report unavailable.');
    const seen=new Set(),rows=raw.rows.map((r,i)=>{
      if(!object(r)||!id(r.id)||seen.has(r.id)||(i&&BigInt(raw.rows[i-1].id)<=BigInt(r.id))||!uuid(r.userId)||(request.p_user&&r.userId!==request.p_user)||typeof r.at!=='string'||!Number.isFinite(Date.parse(r.at))||typeof r.trainer!=='string'||r.trainer.length>160||typeof r.type!=='string'||r.type.length>100||typeof r.reason!=='string'||r.reason.length>2000||typeof r.reasonTruncated!=='boolean'||![r.amount,r.before,r.after].every(integer))throw Error('Transaction details are incomplete.');
      if(request.p_before_id&&BigInt(r.id)>=BigInt(request.p_before_id))throw Error('Transaction page is out of sequence.');
      seen.add(r.id);
      return {id:r.id,at:r.at,userId:r.userId,trainer:r.trainer,type:r.type,reason:r.reason,reasonTruncated:r.reasonTruncated,amount:r.amount,before:r.before,after:r.after,mismatch:r.before+r.amount!==r.after};
    });
    if(raw.hasMore?(!rows.length||!id(raw.next)||raw.next!==rows.at(-1).id):raw.next!==null)throw Error('Transaction paging is incomplete.');
    return {rows,hasMore:raw.hasMore,next:raw.next};
  }
  function adapter({session,identity,allowed,call}) {
    return async(value)=>{
      const args=query(value),actor=identity();
      const check=async()=>{const s=await session();if(!actor||!allowed()||identity()!==actor||s.error||s.data?.session?.user?.id!==actor)throw Object.assign(Error('Staff access changed.'),{code:'LEDGER_ACCESS_CHANGED'});};
      await check();const raw=await call('admin_hub_coin_ledger',args);await check();return project(raw,args);
    };
  }
  function controller(read,changed=()=>{}) {
    let active=false,epoch=0;
    const state={phase:'closed',report:null,user:null,limit:40,cursor:null,history:[],observed:null};
    async function load(cursor=state.cursor,history=state.history) {
      if(!active||state.phase==='loading')return false;
      const token=epoch,args=query({p_limit:state.limit,p_before_id:cursor,p_user:state.user});
      Object.assign(state,{phase:'loading',report:null,observed:null});changed(state);
      try{const report=await read(args);if(!active||token!==epoch)return false;Object.assign(state,{phase:'ready',report,cursor,history:[...history],observed:new Date().toISOString()});}
      catch(e){if(!active||token!==epoch)return false;Object.assign(state,{phase:e?.code==='LEDGER_ACCESS_CHANGED'||e?.code==='42501'?'denied':'error',report:null,observed:null});}
      changed(state);return state.phase==='ready';
    }
    return {state,
      open(user=null){query({p_user:user});if(!active||user!==state.user){epoch++;active=true;Object.assign(state,{phase:'idle',report:null,user,cursor:null,history:[]});return load();}return state.report?Promise.resolve(true):load();},
      refresh(){return load(null,[]);},
      older(){return state.report?.hasMore?load(state.report.next,[...state.history,state.cursor]):Promise.resolve(false);},
      newer(){return state.history.length?load(state.history.at(-1),state.history.slice(0,-1)):Promise.resolve(false);},
      size(limit){query({p_limit:limit});if(state.phase==='loading')return Promise.resolve(false);state.limit=limit;return load(null,[]);},
      reset(){epoch++;active=false;Object.assign(state,{phase:'closed',report:null,user:null,limit:40,cursor:null,history:[],observed:null});changed(state);}
    };
  }
  const types={STORE_PURCHASE:'Mart purchase',STORE_SELL:'Mart sale',CATCH:'Catch reward',CAPTURE:'Catch reward',DAILY_SUPPLY:'Daily supplies',ADMIN_GRANT:'Staff gift',ADMIN_SET:'Staff correction',PASS_DAILY:'Daily Pass supply',PASS_WEEKLY:'Weekly Pass bonus'};
  const typeName=x=>types[x]||x.toLowerCase().replace(/[_-]+/g,' ').replace(/^./,c=>c.toUpperCase());
  function details(row) {
    return `<header class="ledger-dialog-head"><h3>Transaction details</h3><button type="button" data-ledger-close>Close</button></header><dl>${[['Trainer',row.trainer],['Recorded',stamp(row.at)],['Activity',typeName(row.type)],['Before',money(row.before)+' PokéCoins'],['Change',(row.amount>0?'+':'')+money(row.amount)+' PokéCoins'],['After',money(row.after)+' PokéCoins'],['Record',row.id]].map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl><h4>Note</h4><p>${esc(row.reason||'No note recorded.')}</p>${row.reasonTruncated?'<p>The note is shortened to 2,000 characters in this report.</p>':''}${row.mismatch?'<p role="alert">The recorded change does not match the before and after balances. Review this transaction before making any correction.</p>':''}`;
  }
  function results(report) {
    if(!report)return '';
    if(!report.rows.length)return '<p>No transactions were recorded for this selection.</p>';
    return `<table><caption>Most recently recorded PokéCoin transactions</caption><thead><tr>${['Recorded','Trainer','Activity','Change','Balance after'].map(x=>`<th scope="col">${x}</th>`).join('')}</tr></thead><tbody>${report.rows.map(r=>`<tr><td><time datetime="${esc(r.at)}">${esc(stamp(r.at))}</time></td><td><span class="ledger-trainer-name" title="${esc(r.trainer)}">${esc(r.trainer)}</span></td><td><button type="button" data-ledger-detail="${esc(r.id)}" aria-label="View ${esc(typeName(r.type))} transaction for ${esc(r.trainer)}">${esc(typeName(r.type))}</button>${r.mismatch?'<span class="ledger-warning">Review balances</span>':''}</td><td class="${r.amount<0?'ledger-spent':'ledger-earned'}">${r.amount>0?'+':''}${esc(money(r.amount))}</td><td>${esc(money(r.after))}</td></tr>`).join('')}</tbody></table>`;
  }
  function mount(host,read) {
    if(!host)return null;
    const doc=host.ownerDocument;let dialog=null,opener=null;
    host.classList.add('admin-coin-ledger');
    host.innerHTML='<h3>PokéCoin transactions</h3><p>Review recorded changes to trainer balances. This view does not change PokéCoins.</p><div class="ledger-toolbar"><label>Transactions per page<select data-ledger-size><option>20</option><option selected>40</option><option>100</option></select></label><button type="button" data-ledger-refresh>Refresh</button></div><p data-ledger-status role="status" tabindex="-1"></p><div data-ledger-results></div><div class="ledger-pager"><button type="button" data-ledger-newer>Newer</button><span data-ledger-count></span><button type="button" data-ledger-older>Older</button></div>';
    const find=s=>host.querySelector(s),close=()=>{dialog?.close();dialog?.remove();dialog=null;};
    const model=controller(read,s=>{
      close();const busy=s.phase==='loading';
      find('[data-ledger-results]').innerHTML=results(s.report);
      find('[data-ledger-status]').textContent=busy?'Loading transactions…':s.phase==='denied'?'Staff access could not be confirmed. Reopen the workspace after signing in.':s.phase==='error'?'Transactions could not load. Refresh to try again.':s.report?'Retrieved '+stamp(s.observed)+'. Times are local to your device.':'No transaction report loaded.';
      find('[data-ledger-results]').setAttribute('aria-busy',String(busy));find('[data-ledger-refresh]').disabled=busy;find('[data-ledger-refresh]').textContent=s.phase==='closed'?'Load transactions':'Refresh';find('[data-ledger-size]').disabled=busy||s.phase==='closed';find('[data-ledger-size]').value=String(s.limit);
      find('[data-ledger-newer]').disabled=busy||!s.history.length;find('[data-ledger-older]').disabled=busy||!s.report?.hasMore;find('[data-ledger-count]').textContent=s.report?s.report.rows.length+' shown':'';
    });
    find('[data-ledger-refresh]').onclick=()=>model.state.phase==='closed'?model.open():model.refresh();find('[data-ledger-older]').onclick=()=>model.older();find('[data-ledger-newer]').onclick=()=>model.newer();find('[data-ledger-size]').onchange=e=>model.size(Number(e.target.value));
    host.addEventListener('click',e=>{
      const button=e.target.closest('[data-ledger-detail]');if(!button||!host.contains(button)||dialog)return;
      const row=model.state.report?.rows.find(r=>r.id===button.dataset.ledgerDetail);if(!row)return;opener=button;
      dialog=doc.createElement('dialog');dialog.className='ledger-detail-dialog';dialog.setAttribute('aria-label','PokéCoin transaction details');dialog.innerHTML=details(row);host.append(dialog);
      const current=dialog;current.querySelector('[data-ledger-close]').onclick=()=>current.close();current.addEventListener('click',event=>{if(event.target!==current)return;const r=current.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)current.close();});
      current.addEventListener('close',()=>{current.remove();if(dialog===current)dialog=null;if(opener?.isConnected)opener.focus({preventScroll:true});});current.showModal();
    });
    model.reset();return model;
  }
  return Object.freeze({query,project,adapter,controller,results,details,mount,esc});
});
