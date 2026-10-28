(function (host, factory) {
  const api = factory(host);
  if (typeof module === "object" && module.exports) module.exports = api;
  else host.PLAY_ADMIN_NEXT_MART = api;
})(typeof window === "undefined" ? globalThis : window, function (runtime) {
  "use strict";
  const copy = value => JSON.parse(JSON.stringify(value));
  const object = value => value && typeof value === "object" && !Array.isArray(value);
  const fields = ["name", "blurb", "detail", "cost", "quantity", "bits", "quantities", "bitsTitles", "looks", "status", "visible", "featured"];
  const labels = { name: "Public name", blurb: "Short description", detail: "Full description", cost: "PokéCoin price", quantity: "Reward quantity", bits: "Bits price", quantities: "Bundle contents", bitsTitles: "Twitch Power-Up titles", looks: "Trainer appearances", status: "Publication", visible: "Visible in Mart", featured: "Featured" };
  function eligible(row, categories) {
    const cat = categories.find(c => c.id === row?.categoryId);
    if (!row?.sku || !cat || !["coins", "balls", "bits", "avatars"].includes(cat.kind)) return false;
    if (row.bits != null && (!Number.isSafeInteger(row.bits) || row.bits < 0)) return false;
    if (row.extra != null && !object(row.extra)) return false;
    const extra = row.extra || {};
    if ((extra.looks != null && !Array.isArray(extra.looks)) || (extra.bitsTitles != null && !Array.isArray(extra.bitsTitles))) return false;
    if (!["item", "pack", "bits", "avatar"].includes(row.productKind || extra.productKind || "item")) return false;
    if (row.productKind && extra.productKind && row.productKind !== extra.productKind) return false;
    if (!object(row.grants) || Object.keys(row.grants).some(k => !/^[a-z0-9_-]+$/.test(k) || k === "masterball")) return false;
    if (Object.values(row.grants).some(v => !Number.isSafeInteger(v) || v < 1)) return false;
    if (!Number.isSafeInteger(row.cost) || row.cost < 0 || typeof row.visible !== "boolean" || typeof row.featured !== "boolean") return false;
    const status = row.status || extra.status || "published";
    return ["draft", "published"].includes(status) && !(row.status && extra.status && row.status !== extra.status);
  }
  function draft(row) {
    return { name: row.name || "", blurb: row.blurb || "", detail: row.detail ?? row.extra?.detail ?? "", cost: String(row.cost), quantity: String(Object.values(row.grants || {})[0] ?? ""), bits: String(row.bits || 0), quantities: Object.fromEntries(Object.entries(row.grants || {}).map(([k,v])=>[k,String(v)])), bitsTitles: (row.extra?.bitsTitles || []).join("\n"), looks: [...(row.extra?.looks || [])], status: row.status || row.extra?.status || "published", visible: row.visible, featured: row.featured };
  }
  function integer(value, minimum) {
    if (!/^\d+$/.test(String(value))) throw Error("Price and quantity must be whole numbers.");
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number < minimum || number > 2147483647) throw Error("Use a non-negative price and a reward quantity of at least one.");
    return number;
  }
  function payload(row, edited, categories, rewardOptions = null) {
    if (!eligible(row, categories)) throw Error("This product contains invalid catalog data. Reload the catalog before editing.");
    if (!String(edited.name || "").trim()) throw Error("Enter a public product name.");
    if (!["draft", "published"].includes(edited.status) || typeof edited.visible !== "boolean" || typeof edited.featured !== "boolean") throw Error("Invalid publication settings.");
    const next = copy(row), key = Object.keys(row.grants)[0];
    next.name = String(edited.name).trim(); next.blurb = String(edited.blurb ?? ""); next.detail = String(edited.detail ?? "");
    next.cost = integer(edited.cost, 0); next.bits = integer(edited.bits, 0);
    if (!object(edited.quantities)) throw Error('Choose supported product rewards.');
    const wanted=Object.keys(edited.quantities);if(wanted.length>100||wanted.some(k=>k==='masterball'||!/^[a-z0-9_]{1,64}$/.test(k)))throw Error('Choose supported product rewards.');
    if(rewardOptions===null&&wanted.sort().join('|')!==Object.keys(row.grants).sort().join('|'))throw Error('Load shop items before changing the reward list.');
    if(rewardOptions!==null&&wanted.some(k=>!Object.hasOwn(row.grants,k)&&!rewardOptions.some(r=>r.key===k)))throw Error('Choose an available shop item.');
    const category=categories.find(c=>c.id===row.categoryId);if(category?.kind==='balls'&&wanted.slice().sort().join('|')!==Object.keys(row.grants).sort().join('|'))throw Error('Standard Poké Ball listings keep their Ball type. Create mixed bundles under Add product.');
    if(!wanted.length&&row.extra?.ballKey==='masterball'&&(edited.status!=='draft'||edited.visible!==false))throw Error('This Master Ball placeholder cannot be published. Master Balls are not sold.');
    if(!wanted.length&&category?.kind!=='avatars'&&!(Object.keys(row.grants).length===0&&edited.status==='draft'&&edited.visible===false))throw Error('Add at least one product reward.');
    next.grants = Object.fromEntries(Object.entries(edited.quantities).map(([k,v])=>[k,integer(Object.keys(row.grants).length===1&&Object.keys(edited.quantities).length===1&&Object.hasOwn(row.grants,k)?edited.quantity:v,1)]));
    if (!Array.isArray(edited.looks) || edited.looks.some(v=>typeof v!=='string') || new Set(edited.looks).size!==edited.looks.length) throw Error('Choose valid trainer appearances.');
    if(category?.kind==='avatars'&&edited.status==='published'&&!edited.looks.length)throw Error('Add at least one Trainer appearance before publishing this collection.');
    const titles=String(edited.bitsTitles||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
    if(next.bits>0&&edited.status==='published'&&!titles.length)throw Error('Add the Twitch Power-Up title for this Bits product.');
    next.status = edited.status; next.visible = edited.visible; next.featured = edited.featured;
    next.extra = { ...(next.extra || {}), status: next.status, detail: next.detail, bitsTitles: titles, looks: [...edited.looks] };
    if(category?.kind==='coins'&&Object.keys(next.grants).sort().join('|')!==Object.keys(row.grants).sort().join('|')){const productKind=Object.keys(next.grants).length>1?'pack':'item';next.extra.productKind=productKind;if(next.productKind!==undefined)next.productKind=productKind;delete next.extra.ballKey;}
    return { p_row: next };
  }
  function createController(transport, notify = () => {}) {
    let epoch = 0, active = false;
    const state = { phase: "closed", catalog: null, row: null, draft: null, message: "", uncertain: false, rewardOptions:null, optionsLoading:false };
    const emit = () => notify(state);
    function reset() { epoch++; active = false; Object.assign(state, { phase: "closed", catalog: null, row: null, draft: null, message: "", uncertain: false,rewardOptions:null,optionsLoading:false }); emit(); }
    async function load() {
      if (!active || state.phase === "saving") return;
      const token = ++epoch;
      Object.assign(state, { phase: "loading", catalog: null, row: null, draft: null, message: "Loading catalog…", uncertain: false,rewardOptions:null,optionsLoading:false }); emit();
      try {
        const data = await transport("admin_store_get");
        if (!active || token !== epoch) return;
        if (!Array.isArray(data?.items) || !Array.isArray(data?.categories)) throw Error("Invalid catalog response.");
        const skus = data.items.map(row => row.sku);
        if (new Set(skus).size !== skus.length) throw Error("Ambiguous product identities.");
        Object.assign(state, { phase: "ready", catalog: copy(data), message: "Choose a product to view or edit." }); emit();
      } catch (_) { if (active && token === epoch) { state.phase = "error"; state.message = "Catalog unavailable or access denied. No product data is retained. Try loading again."; emit(); } }
    }
    function select(sku) {
      if (state.phase !== "ready" || state.uncertain) return false;
      const row = state.catalog.items.find(item => item.sku === sku);
      state.row = row ? copy(row) : null; state.draft = row && eligible(row, state.catalog.categories) ? draft(row) : null; emit(); return true;
    }
    function dirty() { return !!state.draft && JSON.stringify(state.draft) !== JSON.stringify(draft(state.row)); }
    async function save() {
      if (!active || state.phase !== "ready" || state.uncertain || !dirty()) return;
      const args = payload(state.row, state.draft, state.catalog.categories,state.rewardOptions), token = epoch;
      state.phase = "saving"; state.message = "Saving once…"; emit();
      try {
        // Never retry writes. Even a lost receipt may follow a committed save.
        const receipt = await transport("admin_store_save_item", args);
        if (!active || token !== epoch) return;
        if (!receipt || receipt.ok === false || receipt.error || receipt.sku !== args.p_row.sku) throw Error("Unconfirmed receipt.");
        state.phase = "ready"; state.uncertain = true; state.message = "Changes saved. Reload the catalog to verify the stored product before editing again."; emit();
      } catch (error) {
        if (!active || token !== epoch) return;
        if (["42501", "401", "403"].includes(String(error?.code || error?.status))) {
          Object.assign(state, { phase: "error", catalog: null, row: null, draft: null, uncertain: false, message: "Save denied. Product data was cleared; reload after checking your staff access." }); emit(); return;
        }
        state.phase = "ready"; state.uncertain = true; state.message = "Save could not be confirmed or was denied. Your draft remains below. Do not retry: reload and compare the stored product first."; emit();
      }
    }
    async function loadRewardOptions(){
      if(!active||state.phase!=="ready"||state.uncertain||state.optionsLoading||!state.row)return null;
      if(state.rewardOptions)return copy(state.rewardOptions);
      const token=epoch,sku=state.row.sku;state.optionsLoading=true;state.message="Loading shop items…";emit();
      try{const raw=await transport("admin_store_draft_options");if(!active||token!==epoch)return null;const validator=runtime.PLAY_ADMIN_CREATE||(typeof module==='object'&&module.exports?require('./admin-next-create.js'):null);if(raw?.ok!==true||!validator)throw Error('Unavailable shop items');state.rewardOptions=validator.options(raw.rewards);state.optionsLoading=false;state.message="Shop items loaded. Master Balls are for staff gifts and Pass rewards only.";emit();return copy(state.rewardOptions);}catch(e){if(active&&token===epoch){state.optionsLoading=false;state.message="Shop items could not be loaded. Check admin access and try again.";emit();}return null;}
    }
    function addReward(key,quantity){if(!active||state.phase!=="ready"||state.uncertain||!state.rewardOptions?.some(r=>r.key===key))throw Error('Load an available shop item first.');const total=integer(quantity,1)+Number(Object.keys(state.draft.quantities).length===1&&Object.hasOwn(state.draft.quantities,key)?state.draft.quantity:state.draft.quantities[key]||0);integer(total,1);if(Object.keys(state.draft.quantities).length>=100&&!Object.hasOwn(state.draft.quantities,key))throw Error('A product can contain at most100 rewards.');if(Object.keys(state.draft.quantities).length===1){const only=Object.keys(state.draft.quantities)[0];state.draft.quantities[only]=state.draft.quantity;}state.draft.quantities[key]=String(total);if(Object.keys(state.draft.quantities).length===1)state.draft.quantity=String(total);state.message=quantity+" "+state.rewardOptions.find(r=>r.key===key).name+" added to this draft.";emit();}
    function removeReward(key){if(!active||state.phase!=="ready"||state.uncertain||!state.rewardOptions)return;if(Object.keys(state.draft.quantities).length===1){const only=Object.keys(state.draft.quantities)[0];state.draft.quantities[only]=state.draft.quantity;}delete state.draft.quantities[key];if(Object.keys(state.draft.quantities).length===1)state.draft.quantity=String(Object.values(state.draft.quantities)[0]);state.message="Item removed from this draft.";emit();}
    return { state, reset, load, select, dirty, save,loadRewardOptions,addReward,removeReward, open() { active = true; return load(); } };
  }
  const searchText = value => String(value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  function searchProducts(items, query = "", floor = "") {
    const words = searchText(query).split(/\s+/).filter(Boolean);
    return items.filter(row => (!floor || row.categoryId === floor) && words.every(word => searchText([row.name,row.sku,row.blurb,row.detail ?? row.extra?.detail].join(" ")).includes(word)));
  }
  function mount(root, transport, { onCopy } = {}) {
    if (!root) return null;
    let query = "", floor = "", focusReturn = null, pane="details";
    const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const reward = key => controller.state.rewardOptions?.find(r=>r.key===key)?.name || (runtime.playItemLabel?.(key)!==key?runtime.playItemLabel?.(key):null) || ({berry:"Berry",bait:"Honey",pokeball:"Poké Ball",greatball:"Great Ball",ultraball:"Ultra Ball",lure:"Poké Radar",coins:"PokéCoins",bag_bonus:"Inventory Space"}[key]) || key.replace(/_/g,' ').replace(/^./,c=>c.toUpperCase());
    const controller = createController(transport, render);
    function render() {
      const s = controller.state,listScroll=root.querySelector("[data-mart-list]")?.scrollTop||0;
      const restoreFocus = root.contains(root.ownerDocument.activeElement) && s.phase !== "closed";
      if (s.phase === "closed") { query = ""; floor = ""; pane="details"; }
      root.querySelector("dialog")?.close();
      root.innerHTML = `<p role="status" tabindex="-1" class="mart-status">${esc(s.message)}</p><button type="button" data-mart-load ${["loading", "saving", "closed"].includes(s.phase) ? "disabled" : ""}>Reload catalog</button><div data-mart-body></div>`;
      if (s.catalog) {
        root.querySelector("[data-mart-body]").innerHTML = `<div class="mart-layout"><aside class="admin-mart-card"><label>Search products<input type="search" data-mart-search placeholder="Name, product code or description" value="${esc(query)}"></label><label>Category<select data-mart-floor><option value="">All categories</option>${s.catalog.categories.map(c => `<option value="${esc(c.id)}" ${floor === c.id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></label><div data-mart-list></div></aside><section class="admin-mart-card" data-mart-editor></section></div>`;
        list();root.querySelector("[data-mart-list]").scrollTop=listScroll; editor();
      }
      if (restoreFocus) {
        const target = s.phase === "ready" && s.row && !s.uncertain
          ? root.querySelector("[data-mart-editor] h3") : root.querySelector(".mart-status");
        target?.setAttribute("tabindex", "-1");
        target?.focus();
      }
    }
    function list() {
      const s = controller.state, host = root.querySelector("[data-mart-list]"); if (!host) return;
      const rows = searchProducts(s.catalog.items, query, floor);
      host.innerHTML = `<p class="muted">${rows.length} ${rows.length === 1 ? "product" : "products"}</p>` + rows.map(p => `<button type="button" class="mart-product" data-mart-sku="${esc(p.sku)}" aria-pressed="${p.sku === s.row?.sku}" ${s.phase === "saving" || s.uncertain ? "disabled" : ""}><strong>${esc(p.name || p.sku)}</strong><small>${eligible(p, s.catalog.categories) ? esc(p.bits > 0 ? p.bits : p.cost) + (p.bits > 0 ? " Bits" : " PokéCoins") + " · " + ((p.status||p.extra?.status||"published")==='draft'?'Draft':!p.visible?'Hidden':'Published') : "Product data needs review"}</small></button>`).join("") + (!rows.length ? "<p>No products match these filters.</p>" : "");
    }
    function editor() {
      const s = controller.state, host = root.querySelector("[data-mart-editor]");
      if (!s.row) { host.innerHTML = "<h3>Product editor</h3><p>Select a product from the list.</p>"; return; }
      if (!s.draft) { host.innerHTML = `<h3>${esc(s.row.name || s.row.sku)}</h3><p>This product has invalid catalog data. Reload the catalog before editing.</p>`; return; }
      const d = s.draft, keys = Object.keys(d.quantities), key = keys[0], cat = s.catalog.categories.find(c=>c.id===s.row.categoryId);
      host.innerHTML = `<button type="button" class="mart-pick-another" data-mart-back-to-list>Choose another product</button><p class="eyebrow">Product</p><h3>${esc(s.row.name)}</h3><p class="muted">Product code: ${esc(s.row.sku)}${keys.length===1?" · "+esc(reward(key)):keys.length?" · "+keys.length+" rewards":cat.kind==='avatars'?" · Trainer appearances":" · No rewards configured"}</p>${typeof onCopy==='function'&&['coins','balls'].includes(cat.kind)?`<button type="button" data-mart-copy ${s.phase!=='ready'||s.uncertain||controller.dirty()?'disabled':''}>Make a copy</button><p class="muted" data-copy-unsaved ${controller.dirty()?'':'hidden'}>Save or discard your edits before copying this product.</p>`:''}<form data-mart-form><div class="mart-editor-tabs" role="tablist" aria-label="Product editor"><button type="button" role="tab" id="mart-product-tab-details" aria-controls="mart-product-pane-details" data-mart-pane="details">Details</button><button type="button" role="tab" id="mart-product-tab-contents" aria-controls="mart-product-pane-contents" data-mart-pane="contents">Contents</button><button type="button" role="tab" id="mart-product-tab-publication" aria-controls="mart-product-pane-publication" data-mart-pane="publication">Publication</button></div><fieldset ${s.phase === "saving" || s.uncertain ? "disabled" : ""}><div class="mart-fields">${["name", ...(cat.kind==='bits'||Number(d.bits)>0?["bits"]:["cost"]), "blurb", "detail", ...(keys.length===1?["quantity"]:[])].map(key => `<label class="${["blurb", "detail"].includes(key) ? "mart-wide" : ""}">${labels[key]}${["blurb", "detail"].includes(key) ? `<textarea name="${key}" rows="${key === "detail" ? 3 : 2}">${esc(d[key])}</textarea>` : `<input name="${key}" value="${esc(d[key])}" required ${["cost", "bits", "quantity"].includes(key) ? `type="number" step="1" min="${key !== "quantity" ? 0 : 1}"` : ""}>`}</label>`).join("")}${keys.length>1?`<section class="mart-wide"><h4>Bundle contents</h4><div class="mart-fields">${keys.map(k=>`<label>${esc(reward(k))}<input data-reward-quantity="${esc(k)}" type="number" min="1" step="1" required value="${esc(d.quantities[k])}"></label>`).join('')}</div></section>`:''}${cat.kind==='bits'||Number(d.bits)>0?`<label class="mart-wide">Twitch Power-Up titles<textarea name="bitsTitles" rows="3">${esc(d.bitsTitles)}</textarea><small>One exact Twitch title per line.</small></label>`:''}${cat.kind==='avatars'?`<section class="mart-wide"><h4>Trainer appearances</h4><div class="mart-looks">${(s.catalog.looks||[]).map(look=>`<label><input type="checkbox" data-product-look="${esc(look.id)}" ${d.looks.includes(look.id)?'checked':''} ${look.pack&&look.pack!==s.row.extra?.pack&&!d.looks.includes(look.id)?'disabled':''}>${esc(look.name||look.id)}</label>`).join('')||'<p>No appearances available.</p>'}</div></section>`:''}<label>Publication<select name="status"><option value="draft" ${d.status === "draft" ? "selected" : ""}>Draft</option><option value="published" ${d.status === "published" ? "selected" : ""}>Published</option></select></label><label class="mart-check"><input type="checkbox" name="visible" ${d.visible ? "checked" : ""}>Visible in Mart</label><label class="mart-check"><input type="checkbox" name="featured" ${d.featured ? "checked" : ""}>Featured in category</label></div><div class="mart-preview"><p class="eyebrow">Listing summary</p><p data-preview-price></p><p data-preview-status></p></div><p data-mart-validation role="alert"></p><div class="mart-actions"><button type="button" data-mart-discard>Discard changes</button><button type="submit">Review changes</button></div></fieldset></form>`;
      for(const label of host.querySelectorAll('label')){
        const field=label.querySelector('input,textarea,select')?.name;
        if(["name","blurb","detail","cost","bits"].includes(field))label.dataset.martFieldPane='details';if(['blurb','detail'].includes(field))label.classList.remove('mart-wide');
        if(["status","visible","featured"].includes(field))label.dataset.martFieldPane='publication';
        if(field==='quantity')label.hidden=true;
        if(field==='bitsTitles')label.dataset.martFieldPane='contents';
      }
      host.querySelectorAll('.mart-fields>section').forEach(section=>{section.dataset.martFieldPane='contents';if(section.querySelector('[data-reward-quantity]'))section.remove();});
      if(cat.kind!=='avatars'){
        const contents=root.ownerDocument.createElement('section');contents.className='mart-wide mart-content-editor';contents.dataset.martFieldPane='contents';contents.innerHTML=`<h4>Product rewards</h4><p>${cat.kind==='balls'?'Standard Poké Ball listings keep their Ball type. Mixed bundles are created under Add product.':'Add or remove items, then review the complete change.'}</p><ul class="mart-content-rows">${keys.map(k=>`<li><label>${esc(reward(k))}<input type="number" data-reward-quantity="${esc(k)}" min="1" max="2147483647" step="1" required value="${esc(d.quantities[k])}"></label><button type="button" data-remove-product-reward="${esc(k)}" ${s.optionsLoading||s.phase==='saving'||s.uncertain?'disabled':''} ${cat.kind==='balls'?'hidden':''}>Remove</button></li>`).join('')||(s.row.extra?.ballKey==='masterball'?'<li>This Master Ball placeholder is not for sale.</li>':'<li>No rewards configured. Add an item before publishing this listing.</li>')}</ul><button type="button" data-mart-add-reward ${cat.kind==='balls'?'hidden':''} ${s.optionsLoading||s.phase==='saving'||s.uncertain?'disabled':''}>${s.optionsLoading?'Loading shop items…':'Add item'}</button>`;host.querySelector('.mart-fields').append(contents);
      }
      const grid=host.querySelector('.mart-fields');for(const p of ['details','contents','publication']){const panel=root.ownerDocument.createElement('section');panel.className='mart-wide';panel.dataset.martPanel=p;panel.id='mart-product-pane-'+p;panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby','mart-product-tab-'+p);const content=root.ownerDocument.createElement('div');content.className='mart-fields';for(const e of host.querySelectorAll('[data-mart-field-pane="'+p+'"]'))content.append(e);panel.append(content);grid.append(panel);}
      showPane();preview();
    }
    function showPane(){for(const e of root.querySelectorAll('[data-mart-panel]'))e.hidden=e.dataset.martPanel!==pane;for(const e of root.querySelectorAll('[data-mart-field-pane]'))e.hidden=e.dataset.martFieldPane!==pane;for(const e of root.querySelectorAll('[data-mart-pane]')){const active=e.dataset.martPane===pane;e.setAttribute('aria-selected',String(active));e.tabIndex=active?0:-1;}}
    function preview() {
      const copyButton=root.querySelector("[data-mart-copy]");if(copyButton)copyButton.disabled=controller.state.phase!=="ready"||controller.state.uncertain||controller.dirty();const copyHint=root.querySelector("[data-copy-unsaved]");if(copyHint)copyHint.hidden=!controller.dirty();
      const s = controller.state, d = s.draft; if (!d) return;
      const previewHost = root.querySelector(".mart-preview");
      if (!previewHost.querySelector("img")) {
        const raw = String(s.row.thumb || s.row.sprite || "");
        // Existing local artwork only; no new uploads or arbitrary remote requests.
        const file = raw.replace(/^\.?\/?images\/items\//, "");
        if (/^[a-zA-Z0-9_-]+\.(?:png|webp|gif|jpg|jpeg)$/.test(file)) {
          const art = root.ownerDocument.createElement("img"); art.src = "images/items/" + file;
          art.alt = ""; art.width = 64; art.height = 64; previewHost.prepend(art);
        }
      }
      const nameSlot=root.querySelector("[data-preview-name]");if(nameSlot)nameSlot.textContent = d.name;
      const descriptionSlot=root.querySelector("[data-preview-blurb]");if(descriptionSlot)descriptionSlot.textContent = d.blurb;
      root.querySelector("[data-preview-price]").textContent = `${Number(d.bits)>0?d.bits+" Bits":d.cost+" PokéCoins"} · ${Object.keys(d.quantities).map(k=>reward(k)+" ×"+d.quantities[k]).join(", ") || (s.catalog.categories.find(c=>c.id===s.row.categoryId)?.kind==='avatars'?"Trainer appearances":"No rewards configured")}`;
      root.querySelector("[data-preview-status]").textContent = d.status === "draft" ? "Draft — not published" : d.visible ? "Published and visible" : "Published, hidden from Mart";
    }
    function dialog(title, content, action, label) {
      focusReturn = root.ownerDocument.activeElement;
      const dlg = root.ownerDocument.createElement("dialog"); dlg.className = "mart-dialog";
      dlg.setAttribute("aria-labelledby", "mart-dialog-title"); dlg.innerHTML = `<h3 id="mart-dialog-title">${esc(title)}</h3>${content}<div class="mart-actions"><button type="button" data-cancel autofocus>Return to editor</button><button type="button" data-confirm>${esc(label)}</button></div>`;
      root.append(dlg); dlg.querySelector("[data-cancel]").onclick = () => dlg.close();
      dlg.querySelector("[data-confirm]").onclick = () => { dlg.close(); action(); };
      dlg.addEventListener("keydown", event => {
        if (event.key !== "Tab") return;
        const buttons = [...dlg.querySelectorAll("button:not(:disabled)")];
        const first = buttons[0], last = buttons[buttons.length - 1], active = root.ownerDocument.activeElement;
        if (event.shiftKey && active === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus(); }
      });
      dlg.onclose = () => { dlg.remove(); if (focusReturn?.isConnected) focusReturn.focus({ preventScroll: true }); };
      dlg.showModal(); if (dlg.scrollHeight > dlg.clientHeight) { const heading = dlg.querySelector('h3'); heading.tabIndex = -1; heading.focus({ preventScroll: true }); dlg.scrollTop = 0; }
    }
    root.addEventListener("input", event => {
      if (event.target.matches("[data-mart-search]")) { query = event.target.value; list(); return; }
      const form = event.target.closest("[data-mart-form]"); if (!form || controller.state.phase !== "ready" || controller.state.uncertain) return;
      for (const key of fields) if(form.elements[key]) controller.state.draft[key] = ["visible", "featured"].includes(key) ? form.elements[key].checked : form.elements[key].value;
      for(const input of form.querySelectorAll('[data-reward-quantity]'))controller.state.draft.quantities[input.dataset.rewardQuantity]=input.value;
      if(Object.keys(controller.state.draft.quantities).length===1)controller.state.draft.quantity=String(Object.values(controller.state.draft.quantities)[0]);
      if(form.querySelector('[data-product-look]'))controller.state.draft.looks=[...controller.state.draft.looks.filter(id=>!controller.state.catalog.looks?.some(l=>l.id===id)),...[...form.querySelectorAll('[data-product-look]:checked')].map(i=>i.dataset.productLook)];
      preview();
    });
    root.addEventListener("change", event => { if (event.target.matches("[data-mart-floor]")) { floor = event.target.value; list(); } });
    async function chooseReward(){const sku=controller.state.row?.sku,options=await controller.loadRewardOptions();if(controller.state.row?.sku!==sku||!options||controller.state.phase!=="ready"||controller.state.uncertain)return;const dlg=root.ownerDocument.createElement('dialog');dlg.className='mart-reward-dialog';dlg.setAttribute('aria-label','Choose product rewards');dlg.innerHTML='<h3>Choose product rewards</h3><p>Choose known items for this product. Master Balls are for staff gifts and Pass rewards only.</p><div data-shop-picker></div><button type="button" data-picker-close>Done</button>';root.append(dlg);let picker;const rows=options.map(r=>({id:r.key==='bag_bonus'?'space':'item:'+r.key,kind:r.key==='bag_bonus'?'space':'item',name:r.name,category:r.category,sprite:'images/items/'+r.sprite,enabled:true,maxQuantity:2147483647}));picker=runtime.PLAY_REWARD_PICKER.mount(dlg.querySelector('[data-shop-picker]'),rows,entry=>{const key=entry.catalogId==='space'?'bag_bonus':entry.catalogId.slice(5);controller.addReward(key,entry.quantity);dlg.close();},'shop');dlg.querySelector('[data-picker-close]').onclick=()=>dlg.close();dlg.onclose=()=>{picker?.clear();dlg.remove();requestAnimationFrame(()=>root.querySelector('[data-mart-add-reward]')?.focus());};dlg.showModal();dlg.querySelector('[data-reward-search]')?.focus();}
    root.addEventListener('invalid',e=>{const field=e.target.closest('[data-mart-field-pane]');if(field){pane=field.dataset.martFieldPane;showPane();}},true);
    root.addEventListener('keydown',e=>{const tab=e.target.closest('[data-mart-pane]');if(!tab)return;const tabs=[...root.querySelectorAll('[data-mart-pane]')],i=tabs.indexOf(tab);let next;if(e.key==='Home')next=0;else if(e.key==='End')next=tabs.length-1;else if(e.key==='ArrowRight')next=(i+1)%tabs.length;else if(e.key==='ArrowLeft')next=(i+tabs.length-1)%tabs.length;if(next!==undefined){e.preventDefault();tabs[next].focus();}});
    root.addEventListener("click", event => {
      const copyButton=event.target.closest('[data-mart-copy]');if(copyButton){if(typeof onCopy==='function'&&controller.state.phase==='ready'&&!controller.state.uncertain&&!controller.dirty())onCopy(controller.state.row.sku,copyButton);return;}
      if(event.target.closest('[data-mart-back-to-list]')){root.querySelector('[data-mart-search]')?.focus();return;}
      const tab=event.target.closest('[data-mart-pane]');if(tab){pane=tab.dataset.martPane;showPane();return;}
      if(event.target.closest('[data-mart-add-reward]')){chooseReward().catch(()=>{controller.state.message='Shop item picker unavailable. Reload the catalog before continuing.';render();});return;}
      const remove=event.target.closest('[data-remove-product-reward]');if(remove){const sku=controller.state.row?.sku,key=remove.dataset.removeProductReward;controller.loadRewardOptions().then(rows=>{if(rows&&controller.state.row?.sku===sku){controller.removeReward(key);root.querySelector('[data-mart-add-reward]')?.focus();}});return;}

      const item = event.target.closest("[data-mart-sku]");
      const load = event.target.closest("[data-mart-load]");
      const discard = event.target.closest("[data-mart-discard]");
      if (!item && !load && !discard) return;
      const action = () => load ? controller.load() : controller.select(item ? item.dataset.martSku : controller.state.row.sku);
      if(controller.state.uncertain)dialog("Reload the stored product?","<p>This checks the saved product without repeating your save.</p>",action,"Reload products");
      else if (controller.dirty()) dialog("Discard this local draft?", "<p>Unsaved edits will be lost. Reloading checks the current stored product; it does not repeat a save.</p>", action, "Discard and continue");
      else action();
    });
    root.addEventListener("submit", event => {
      if (!event.target.matches("[data-mart-form]")) return; event.preventDefault();
      const s = controller.state;
      try {
        payload(s.row, s.draft, s.catalog.categories,s.rewardOptions);
        if (s.optionsLoading) throw Error("Wait for shop items to finish loading.");
        if (!controller.dirty()) throw Error("No changes to review.");
        const before = draft(s.row), changes = fields.filter(k => JSON.stringify(before[k]) !== JSON.stringify(s.draft[k])).filter(k=>k!=="quantity"||JSON.stringify(before.quantities)===JSON.stringify(s.draft.quantities));
        const display = (key, value) => key === "quantities" ? Object.entries(value).map(([k,v])=>reward(k)+" ×"+v).join(", ") : key === "looks" ? value.map(id=>s.catalog.looks?.find(l=>l.id===id)?.name||id).join(", ") : ["visible", "featured"].includes(key) ? value ? "Yes" : "No" : key === "status" ? value === "draft" ? "Draft" : "Published" : String(value || "(empty)");
        dialog("Review product changes", `<p><strong>${esc(s.row.name)}</strong> · ${esc(s.row.sku)}</p><p>This updates the Mart product for all trainers. Existing purchases are unchanged.</p><dl class="mart-comparison">${changes.map(k => `<div><dt>${labels[k]}</dt><dd><span>Current: ${esc(display(k, before[k]))}</span><strong>New: ${esc(display(k, s.draft[k]))}</strong></dd></div>`).join("")}</dl><p>Another staff member may have updated this product. Reload first if you are editing together.</p>`, () => controller.save(), "Save product");
      } catch (error) { root.querySelector("[data-mart-validation]").textContent = error.message; }
    });
    const unload = event => { if (controller.dirty()&&!controller.state.uncertain) { event.preventDefault(); event.returnValue = ""; } };
    root.ownerDocument.defaultView.addEventListener("beforeunload", unload);
    render(); return controller;
  }
  return { eligible, draft, payload, createController, mount, searchProducts };
});

