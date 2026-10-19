/* Audited staff reward UI. Transport is supplied by the gated controller. */
(function(root,factory){
  if(typeof module==="object"&&module.exports) module.exports=factory();
  else root.PLAY_ADMIN_REWARDS=factory();
}(typeof globalThis!=="undefined"?globalThis:this,function(){
  const esc=(v)=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  const date=(v)=>v&&Number.isFinite(new Date(v).getTime())?new Date(v).toLocaleString(undefined,{timeZoneName:"short"}):"Not recorded";
  const source=(v)=>({admin:"Staff gift","twitch-sub":"Twitch subscription",broadcaster:"Broadcaster entitlement"}[v]||v||"Not recorded");
  const itemName=(row)=>({coins:"PokéCoins",bag_bonus:"Inventory Space",berry:"Berries",bait:"Bait",lure:"Lure",pokeball:"Poké Ball",greatball:"Great Ball",ultraball:"Ultra Ball"}[row.id]||row.name||row.id);
  const actionNames={pass_on:"Turn Pass on",pass_off:"Turn Pass off",pass_sync:"Clear staff override",pass_daily:"Give daily rewards again",pass_weekly:"Give weekly rewards again",item:"Give items",pokemon:"Give a Pokémon",candy:"Give Evolution Candy",title:"Give a title",cosmetic:"Give a cosmetic",badge:"Give a badge"};
  const bundleText=(items)=>Object.entries(items||{}).map(([id,qty])=>`${qty} ${itemName({id,name:id})}`).join(", ")||"None recorded";
  function intentSummary(intent,data){
    const p=intent.p_payload;
    if(intent.p_action==="item")return `${p.qty} ${itemName((data.catalog?.items||[]).find(row=>row.id===p.key)||{id:p.key})}`;
    if(intent.p_action==="pokemon")return `Kanto #${p.dex}, level ${p.level}${p.shiny?", Shiny":""}`;
    if(intent.p_action==="candy")return `${p.qty} Evolution Candy for species #${p.dex}`;
    if(intent.p_action==="pass_daily"||intent.p_action==="pass_weekly")return bundleText(data.bundles?.[intent.p_action==="pass_daily"?"daily":"weekly"]);
    if(p.id)return (data.catalog?.[intent.p_action==="title"?"titles":intent.p_action==="badge"?"badges":"cosmetics"]||[]).find(row=>row.id===p.id)?.name||p.id;
    return "Staff override remains until explicitly cleared.";
  }
  function delivery(claim){
    const requested=claim.requested||{};
    const entries=Object.entries(requested);
    if(!entries.length||entries.some(([key,qty])=>!Number.isInteger(Number(qty))||Number(qty)<0||key.startsWith("_")))return "Delivery not verified";
    return entries.every(([key,qty])=>Number(key==="coins"?claim.coins:claim.items?.[key]||0)===Number(qty))?"Delivery verified":"Delivery not verified";
  }
  function claimHtml(data){
    const claims=data.claims||[];
    return `<h4>Player reward claims</h4><p class="record-note">Most recent ${data.historyLimit||50} recorded claims. Earlier failed attempts may not have been recorded. Delivery is verified against item and coin ledger entries, not the claim timestamp.</p>${claims.length?`<div class="reward-history">${claims.map(row=>`<article><strong>${esc(row.kind==="pass-daily"?"Daily reward":"Weekly reward")}</strong><span>${esc(date(row.at))}</span><strong>${esc(delivery(row))}</strong><small>Requested: ${esc(bundleText(row.requested))}<br>Recorded items: ${esc(bundleText(row.items))} · PokéCoins: ${esc(row.coins)}</small></article>`).join("")}</div>`:`<p class="record-note">No recorded claims returned.</p>`}`;
  }
  function auditHtml(data){return `<h4>Staff reward history</h4>${(data.actions||[]).length?`<div class="reward-history">${data.actions.map(row=>`<article><strong>${esc(actionNames[row.action]||row.action)} · ${esc(row.status)}</strong><span>${esc(date(row.created_at))}</span><span>${esc(row.result?.requested?bundleText(row.result.requested):intentSummary({p_action:row.action,p_payload:row.payload||{}},data))}</span><span>${esc(row.reason)}</span><small>Request ${esc(row.request_id)} · Staff ${esc(row.actor_id)}</small></article>`).join("")}</div>`:`<p class="record-note">No staff reward actions recorded.</p>`}`;}
  function passHtml(data){
    const pass=data.pass||{};
    const override=pass.override===true?"Staff override: on":pass.override===false?"Staff override: off":"Following subscription status";
    return `<h4>Starlight Pass</h4><dl class="record-facts"><div><dt>Current status</dt><dd>${pass.active?"Active":"Off"}</dd></div><div><dt>Origin</dt><dd>${esc(source(pass.source))}</dd></div><div><dt>Staff control</dt><dd>${override}</dd></div><div><dt>Origin before override</dt><dd>${esc(source(pass.sourceBeforeOverride))}</dd></div><div><dt>Last daily claim</dt><dd>${esc(date(pass.dailyAt))}</dd></div><div><dt>Last weekly claim</dt><dd>${esc(date(pass.weeklyAt))}</dd></div><div><dt>Underlying subscription</dt><dd>${pass.subscriptionActive==null?"Not recorded":pass.subscriptionActive?"Active":"Inactive"}</dd></div><div><dt>Last subscription check</dt><dd>${esc(date(pass.subscriptionCheckedAt||pass.checkedAt))}</dd></div></dl>
      <form data-reward-form="pass" class="reward-form"><label>Staff reason<input name="reason" required minlength="3" maxlength="500" autocomplete="off"></label><div class="reward-actions"><button type="submit" data-pass-action="pass_on">Turn Pass on</button><button type="submit" data-pass-action="pass_off">Turn Pass off</button><button type="submit" data-pass-action="pass_sync" ${pass.override==null?"disabled":""}>Clear staff override</button><button type="submit" data-pass-action="pass_daily">Give daily rewards again</button><button type="submit" data-pass-action="pass_weekly">Give weekly rewards again</button></div></form>
      <p class="record-note">Staff overrides remain until cleared. Re-grants bypass Pass eligibility and claim cooldowns without changing the player's next claim time. Normal inventory limits and server validation still apply.</p>${claimHtml(data)}${auditHtml(data)}`;
  }
  const options=(rows,format=(r)=>r.name||r.id)=>(rows||[]).map(row=>`<option value="${esc(row.id)}">${esc(format(row))}</option>`).join("");
  function giftFields(data,kind){
    if(kind==="item")return `<label>Item<select name="key" required>${options(data.catalog?.items,itemName)}</select></label><label>Quantity<input name="qty" type="number" min="1" max="10000" value="1" required></label>`;
    if(kind==="pokemon"||kind==="candy")return `<label>Pokédex number (Kanto 1–151)<input name="dex" type="number" min="1" max="151" value="1" required></label>${kind==="pokemon"?`<label>Level<input name="level" type="number" min="1" max="100" value="5" required></label><label class="reward-check"><input name="shiny" type="checkbox"> Shiny</label><p class="record-note">Base form, ordinary ability and server-generated individual stats. No hidden abilities or invented specimen data.</p>`:`<label>Evolution Candy quantity<input name="qty" type="number" min="1" max="10000" value="1" required></label>`}`;
    return `<label>${kind==="title"?"Title":kind==="badge"?"Badge":"Cosmetic / other unlockable"}<select name="id" required>${options(data.catalog?.[kind==="title"?"titles":kind==="badge"?"badges":"cosmetics"])}</select></label>`;
  }
  function giftHtml(data,kind="item"){return `<h4>Special gifts</h4><form data-reward-form="gift" class="reward-form"><label>Gift type<select name="gift_kind"><option value="item">Items, PokéCoins or Inventory Space</option><option value="pokemon">Pokémon</option><option value="candy">Evolution Candy</option><option value="title">Title</option><option value="cosmetic">Cosmetic / other unlockable</option><option value="badge">Badge</option></select></label><div data-gift-fields>${giftFields(data,kind)}</div><label>Staff reason<input name="reason" required minlength="3" maxlength="500" autocomplete="off"></label><button type="submit">Review gift</button></form>${auditHtml(data)}`;}
  function makeIntent(form,submitter,userId,requestId){
    const fields=form.elements;
    const get=(name)=>fields.namedItem(name)?.value;
    const action=form.dataset.rewardForm==="pass"?submitter?.dataset.passAction:get("gift_kind");
    const payload=action==="item"?{key:get("key"),qty:Number(get("qty"))}:action==="pokemon"?{dex:Number(get("dex")),level:Number(get("level")),shiny:fields.namedItem("shiny").checked}:action==="candy"?{dex:Number(get("dex")),qty:Number(get("qty"))}:action?.startsWith("pass_")?{}:{id:get("id")};
    return {p_user:userId,p_request:requestId,p_action:action,p_payload:payload,p_reason:get("reason")?.trim()};
  }
  let contexts=new WeakMap();
  async function mount(root,user,pane,transport){
    const slot=root.querySelector("[data-trainer-rewards]");
    if(!slot||!user?.id)return;
    const ctx={userId:user.id,pane,slot,busy:false,pending:null};contexts.set(root,ctx);
    const current=()=>contexts.get(root)===ctx&&root.contains(slot);
    function status(text){if(current())slot.querySelector('[data-reward-status]').textContent=text;}
    function draw(data){
      if(!current())return;
      ctx.data=data;
      slot.innerHTML=`<p role="status" data-reward-status></p>${pane==="pass"?passHtml(data):giftHtml(data)}<button type="button" class="secondary" data-reward-retry hidden>Retry the same request</button>`;
      if(data.canWrite===false){slot.querySelectorAll('form').forEach(form=>form.remove());status("Protected trainer: account changes require separately scoped authorization.");}
    }
    async function send(intent){
      if(!current()||ctx.busy)return;
      ctx.busy=true;slot.querySelectorAll('button').forEach(button=>button.disabled=true);
      try{
        const result=await transport.write(intent);
        if(!current())return;
        ctx.pending=null;
        const refreshed=await transport.read(user.id);
        if(!current())return;
        draw(refreshed);status(result.message|| (result.ok?"Action completed.":"Action failed; nothing was granted."));
        if(result.ok) await transport.changed?.(user.id);
      }catch(error){
        if(!current())return;
        ctx.pending=intent;
        status("The result is uncertain. Retry this same request to retrieve its receipt without granting twice. Do not start a new grant for this result.");
        const retry=slot.querySelector('[data-reward-retry]');retry.hidden=false;retry.disabled=false;
      }finally{ctx.busy=false;}
    }
    try{draw(await transport.read(user.id));}catch(error){
      if(current())slot.innerHTML=`<h4>${pane==="pass"?"Starlight Pass":"Gifts"}</h4><p class="record-note">${error?.code==="42501"?"These tools require owner or admin permission.":"Reward history and audited controls are awaiting server setup. No account changes are available here yet."}</p>`;
      return;
    }
    slot.addEventListener('change',(event)=>{
      if(event.target.name!=="gift_kind"||ctx.busy)return;
      slot.querySelector('[data-gift-fields]').innerHTML=giftFields(ctx.data,event.target.value);
    });
    slot.addEventListener('click',(event)=>{if(event.target.closest('[data-reward-retry]')&&ctx.pending)send(ctx.pending);});
    slot.addEventListener('submit',async(event)=>{
      const form=event.target.closest('[data-reward-form]');if(!form)return;event.preventDefault();
      if(ctx.busy||ctx.pending||!current())return;
      ctx.busy=true;
      const intent=makeIntent(form,event.submitter,user.id,crypto.randomUUID());
      try{
        const approved=await transport.confirm({title:actionNames[intent.p_action]||"Confirm staff action",body:`Trainer: ${user.displayName||user.login||"Trainer"} (${user.id}). ${intentSummary(intent,ctx.data)}. Reason: ${intent.p_reason}`,confirmLabel:"Confirm staff action",cancelLabel:"Cancel"});
        if(!approved||!current())return;
      }finally{ctx.busy=false;}
      await send(intent);
    });
  }
  return {mount,clear(){contexts=new WeakMap();},delivery,passHtml,giftHtml,giftFields,makeIntent,intentSummary};
}));
