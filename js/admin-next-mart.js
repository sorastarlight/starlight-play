(function (host, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else host.PLAY_ADMIN_NEXT_MART = api;
})(typeof window === "undefined" ? globalThis : window, function () {
  "use strict";
  const copy = value => JSON.parse(JSON.stringify(value));
  const object = value => value && typeof value === "object" && !Array.isArray(value);
  const fields = ["name", "blurb", "detail", "cost", "quantity", "status", "visible", "featured"];
  const labels = { name: "Public name", blurb: "Short description", detail: "Full description", cost: "PokéCoin price", quantity: "Reward quantity", status: "Publication", visible: "Visible in Mart", featured: "Featured" };
  function eligible(row, categories) {
    const cat = categories.find(c => c.id === row?.categoryId);
    if (!row?.sku || !cat || !["coins", "balls"].includes(cat.kind)) return false;
    if (row.bits != null && row.bits !== 0) return false;
    if (row.extra != null && !object(row.extra)) return false;
    const extra = row.extra || {};
    if ((extra.looks != null && !Array.isArray(extra.looks)) || (extra.bitsTitles != null && !Array.isArray(extra.bitsTitles))) return false;
    if ((row.productKind || extra.productKind || "item") !== "item" || extra.pack || extra.looks?.length || extra.bitsTitles?.length) return false;
    if (row.productKind && extra.productKind && row.productKind !== extra.productKind) return false;
    if (!object(row.grants) || Object.keys(row.grants).length !== 1) return false;
    if (!Number.isSafeInteger(Object.values(row.grants)[0]) || Object.values(row.grants)[0] < 1) return false;
    if (!Number.isSafeInteger(row.cost) || row.cost < 0 || typeof row.visible !== "boolean" || typeof row.featured !== "boolean") return false;
    const status = row.status || extra.status || "published";
    return ["draft", "published"].includes(status) && !(row.status && extra.status && row.status !== extra.status);
  }
  function draft(row) {
    return { name: row.name || "", blurb: row.blurb || "", detail: row.detail ?? row.extra?.detail ?? "", cost: String(row.cost), quantity: String(Object.values(row.grants || {})[0] ?? ""), status: row.status || row.extra?.status || "published", visible: row.visible, featured: row.featured };
  }
  function integer(value, minimum) {
    if (!/^\d+$/.test(String(value))) throw Error("Price and quantity must be whole numbers.");
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number < minimum) throw Error("Use a non-negative price and a reward quantity of at least one.");
    return number;
  }
  function payload(row, edited, categories) {
    if (!eligible(row, categories)) throw Error("This product must use the current editor.");
    if (!String(edited.name || "").trim()) throw Error("Enter a public product name.");
    if (!["draft", "published"].includes(edited.status) || typeof edited.visible !== "boolean" || typeof edited.featured !== "boolean") throw Error("Invalid publication settings.");
    const next = copy(row), key = Object.keys(row.grants)[0];
    next.name = String(edited.name).trim(); next.blurb = String(edited.blurb ?? ""); next.detail = String(edited.detail ?? "");
    next.cost = integer(edited.cost, 0); next.grants[key] = integer(edited.quantity, 1);
    next.status = edited.status; next.visible = edited.visible; next.featured = edited.featured;
    next.extra = { ...(next.extra || {}), status: next.status, detail: next.detail };
    return { p_row: next };
  }
  function createController(transport, notify = () => {}) {
    let epoch = 0, active = false;
    const state = { phase: "closed", catalog: null, row: null, draft: null, message: "", uncertain: false };
    const emit = () => notify(state);
    function reset() { epoch++; active = false; Object.assign(state, { phase: "closed", catalog: null, row: null, draft: null, message: "", uncertain: false }); emit(); }
    async function load() {
      if (!active || state.phase === "saving") return;
      const token = ++epoch;
      Object.assign(state, { phase: "loading", catalog: null, row: null, draft: null, message: "Loading catalog…", uncertain: false }); emit();
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
      const args = payload(state.row, state.draft, state.catalog.categories), token = epoch;
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
    return { state, reset, load, select, dirty, save, open() { active = true; return load(); } };
  }
  const searchText = value => String(value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  function searchProducts(items, query = "", floor = "") {
    const words = searchText(query).split(/\s+/).filter(Boolean);
    return items.filter(row => (!floor || row.categoryId === floor) && words.every(word => searchText([row.name,row.sku,row.blurb,row.detail ?? row.extra?.detail].join(" ")).includes(word)));
  }
  function mount(root, transport) {
    if (!root) return null;
    let query = "", floor = "", focusReturn = null;
    const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const reward = key => ({ berry: "Berry", bait: "Honey", pokeball: "Poké Ball", greatball: "Great Ball", ultraball: "Ultra Ball", lure: "Poké Radar", coins: "PokéCoins", bag_bonus: "Inventory Space" }[key] || "Existing reward (" + key + ")");
    const controller = createController(transport, render);
    function render() {
      const s = controller.state;
      const restoreFocus = root.contains(root.ownerDocument.activeElement) && s.phase !== "closed";
      if (s.phase === "closed") { query = ""; floor = ""; }
      root.querySelector("dialog")?.close();
      root.innerHTML = `<p role="status" tabindex="-1" class="mart-status">${esc(s.message)}</p><button type="button" data-mart-load ${["loading", "saving", "closed"].includes(s.phase) ? "disabled" : ""}>Reload catalog</button><div data-mart-body></div>`;
      if (s.catalog) {
        root.querySelector("[data-mart-body]").innerHTML = `<div class="mart-layout"><aside class="admin-mart-card"><label>Search products<input type="search" data-mart-search placeholder="Name, product code or description" value="${esc(query)}"></label><label>Category<select data-mart-floor><option value="">All categories</option>${s.catalog.categories.map(c => `<option value="${esc(c.id)}" ${floor === c.id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></label><div data-mart-list></div></aside><section class="admin-mart-card" data-mart-editor></section></div>`;
        list(); editor();
      }
      if (restoreFocus) {
        const target = s.phase === "ready" && s.row && !s.uncertain
          ? root.querySelector("[data-mart-editor] h3") : root.querySelector(".mart-status");
        target?.setAttribute("tabindex", "-1");
        target?.focus({ preventScroll: true });
      }
    }
    function list() {
      const s = controller.state, host = root.querySelector("[data-mart-list]"); if (!host) return;
      const rows = searchProducts(s.catalog.items, query, floor);
      host.innerHTML = `<p class="muted">${rows.length} ${rows.length === 1 ? "product" : "products"}</p>` + rows.map(p => `<button type="button" class="mart-product" data-mart-sku="${esc(p.sku)}" aria-pressed="${p.sku === s.row?.sku}" ${s.phase === "saving" || s.uncertain ? "disabled" : ""}><strong>${esc(p.name || p.sku)}</strong><small>${eligible(p, s.catalog.categories) ? esc(p.cost) + " PokéCoins" : "Current editor required"}</small></button>`).join("") + (!rows.length ? "<p>No products match these filters.</p>" : "");
    }
    function editor() {
      const s = controller.state, host = root.querySelector("[data-mart-editor]");
      if (!s.row) { host.innerHTML = "<h3>Product editor</h3><p>Select a product from the list.</p>"; return; }
      if (!s.draft) { host.innerHTML = `<h3>${esc(s.row.name || s.row.sku)}</h3><p>This product has a different reward or payment structure. Use the current editor to preserve it.</p><a href="./admin.html?section=economy&amp;view=catalog">Open current Mart editor</a>`; return; }
      const d = s.draft, key = Object.keys(s.row.grants)[0];
      host.innerHTML = `<p class="eyebrow">Existing product</p><h3>${esc(s.row.name)}</h3><p class="muted">Product code: ${esc(s.row.sku)} · Reward: ${esc(reward(key))}</p><form data-mart-form><fieldset ${s.phase === "saving" || s.uncertain ? "disabled" : ""}><div class="mart-fields">${["name", "blurb", "detail", "cost", "quantity"].map(key => `<label class="${["blurb", "detail"].includes(key) ? "mart-wide" : ""}">${labels[key]}${["blurb", "detail"].includes(key) ? `<textarea name="${key}" rows="${key === "detail" ? 3 : 2}">${esc(d[key])}</textarea>` : `<input name="${key}" value="${esc(d[key])}" required ${["cost", "quantity"].includes(key) ? `type="number" step="1" min="${key === "cost" ? 0 : 1}"` : ""}>`}</label>`).join("")}<label>Publication<select name="status"><option value="draft" ${d.status === "draft" ? "selected" : ""}>Draft</option><option value="published" ${d.status === "published" ? "selected" : ""}>Published</option></select></label><label class="mart-check"><input type="checkbox" name="visible" ${d.visible ? "checked" : ""}>Visible in Mart</label><label class="mart-check"><input type="checkbox" name="featured" ${d.featured ? "checked" : ""}>Featured in category</label></div><div class="mart-preview"><p class="eyebrow">Player preview</p><h4 data-preview-name></h4><p data-preview-blurb></p><p data-preview-price></p><p data-preview-status></p></div><p data-mart-validation role="alert"></p><div class="mart-actions"><button type="button" data-mart-discard>Discard changes</button><button type="submit">Review changes</button></div></fieldset></form>`;
      preview();
    }
    function preview() {
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
      root.querySelector("[data-preview-name]").textContent = d.name;
      root.querySelector("[data-preview-blurb]").textContent = d.blurb;
      root.querySelector("[data-preview-price]").textContent = `${d.cost} PokéCoins · ${reward(Object.keys(s.row.grants)[0])} ×${d.quantity}`;
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
      for (const key of fields) controller.state.draft[key] = ["visible", "featured"].includes(key) ? form.elements[key].checked : form.elements[key].value;
      preview();
    });
    root.addEventListener("change", event => { if (event.target.matches("[data-mart-floor]")) { floor = event.target.value; list(); } });
    root.addEventListener("click", event => {
      const item = event.target.closest("[data-mart-sku]");
      const load = event.target.closest("[data-mart-load]");
      const discard = event.target.closest("[data-mart-discard]");
      if (!item && !load && !discard) return;
      const action = () => load ? controller.load() : controller.select(item ? item.dataset.martSku : controller.state.row.sku);
      if (controller.dirty()) dialog("Discard this local draft?", "<p>Unsaved edits will be lost. Reloading checks the current stored product; it does not repeat a save.</p>", action, "Discard and continue");
      else action();
    });
    root.addEventListener("submit", event => {
      if (!event.target.matches("[data-mart-form]")) return; event.preventDefault();
      const s = controller.state;
      try {
        payload(s.row, s.draft, s.catalog.categories);
        if (!controller.dirty()) throw Error("No changes to review.");
        const before = draft(s.row), changes = fields.filter(k => String(before[k]) !== String(s.draft[k]));
        const display = (key, value) => ["visible", "featured"].includes(key) ? value ? "Yes" : "No" : key === "status" ? value === "draft" ? "Draft" : "Published" : String(value || "(empty)");
        dialog("Review product changes", `<p><strong>${esc(s.row.name)}</strong> · ${esc(s.row.sku)}</p><p>This updates the Mart product for all trainers. Existing purchases are unchanged.</p><dl class="mart-comparison">${changes.map(k => `<div><dt>${labels[k]}</dt><dd><span>Current: ${esc(display(k, before[k]))}</span><strong>Proposed: ${esc(display(k, s.draft[k]))}</strong></dd></div>`).join("")}</dl><p>Another staff edit may have occurred since loading. This editor does not lock the product.</p>`, () => controller.save(), "Save product");
      } catch (error) { root.querySelector("[data-mart-validation]").textContent = error.message; }
    });
    const unload = event => { if (controller.dirty()) { event.preventDefault(); event.returnValue = ""; } };
    root.ownerDocument.defaultView.addEventListener("beforeunload", unload);
    render(); return controller;
  }
  return { eligible, draft, payload, createController, mount, searchProducts };
});

