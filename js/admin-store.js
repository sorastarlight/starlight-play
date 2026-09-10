(() => {
  const supabase = window.playSupabase;
  const els = {
    gate: document.getElementById("gate"),
    staff: document.getElementById("staff"),
    status: document.getElementById("store-status"),
    catList: document.getElementById("cat-list"),
    itemList: document.getElementById("item-list"),
    catForm: document.getElementById("cat-form"),
    itemForm: document.getElementById("item-form"),
    catName: document.getElementById("cat-name"),
    catBlurb: document.getElementById("cat-blurb"),
    catKind: document.getElementById("cat-kind"),
    catPerks: document.getElementById("cat-perks"),
    catVisible: document.getElementById("cat-visible"),
    catIconPreview: document.getElementById("cat-icon-preview"),
    catIconLabel: document.getElementById("cat-icon-label"),
    itemSku: document.getElementById("item-sku"),
    itemName: document.getElementById("item-name"),
    itemBlurb: document.getElementById("item-blurb"),
    itemCost: document.getElementById("item-cost"),
    itemBits: document.getElementById("item-bits"),
    itemFeatured: document.getElementById("item-featured"),
    itemVisible: document.getElementById("item-visible"),
    itemBallKey: document.getElementById("item-ball-key"),
    itemPack: document.getElementById("item-pack"),
    itemLooks: document.getElementById("item-looks"),
    itemBitsTitles: document.getElementById("item-bits-titles"),
    itemSpritePreview: document.getElementById("item-sprite-preview"),
    itemSpriteLabel: document.getElementById("item-sprite-label"),
    itemThumbPreview: document.getElementById("item-thumb-preview"),
    itemThumbLabel: document.getElementById("item-thumb-label"),
    grantGrid: document.getElementById("grant-grid"),
    spriteModal: document.getElementById("sprite-modal"),
    spriteGrid: document.getElementById("sprite-grid"),
    spriteFilter: document.getElementById("sprite-filter"),
    spriteUpload: document.getElementById("sprite-upload"),
    spriteUploadStatus: document.getElementById("sprite-upload-status")
  };

  const CORE_GRANTS = [
    ["berry", "Berry"],
    ["bait", "Honey"],
    ["pokeball", "Poké Ball"],
    ["greatball", "Great Ball"],
    ["ultraball", "Ultra Ball"],
    ["lure", "Poké Radar"],
    ["coins", "PokéCoins"],
    ["bag_bonus", "Bag space"]
  ];

  let catalog = { categories: [], items: [], assets: [] };
  let selectedCatId = "";
  let selectedSku = "";
  let catIcon = "poke-ball.png";
  let itemSprite = "poke-ball.png";
  let itemThumb = "";
  let pickerTarget = "item-sprite";
  let localPreviews = {};
  let skuLocked = false;

  function setSignedOut() {
    els.staff.hidden = true;
    els.gate.hidden = false;
    els.gate.textContent = "Sign in with Twitch to open the Store editor.";
    window.playSetAccountNav(null);
  }

  window.playBindAccountNav({ onSignOut: setSignedOut });

  function esc(value) {
    return window.playEscapeAttr(value);
  }

  function art(path) {
    return localPreviews[path] || window.playItemSprite(path || "poke-ball.png");
  }

  function grantFields() {
    const keys = CORE_GRANTS.slice();
    (window.PLAY_BALLS || []).forEach((row) => {
      if (!keys.some((pair) => pair[0] === row.key)) keys.push([row.key, row.name]);
    });
    return keys;
  }

  function selectedCat() {
    return (catalog.categories || []).find((row) => row.id === selectedCatId) || catalog.categories?.[0] || null;
  }

  function catItems(catId) {
    return (catalog.items || [])
      .filter((row) => row.categoryId === catId)
      .sort((a, b) => (a.sort - b.sort) || String(a.name).localeCompare(String(b.name)));
  }

  function selectedItem() {
    return catItems(selectedCatId).find((row) => row.sku === selectedSku) || null;
  }

  function setIconButton(preview, label, path, emptyCopy) {
    const value = path || "";
    preview.src = art(value || "poke-ball.png");
    label.textContent = value || emptyCopy || "pick a sprite";
  }

  function fillGrants(grants) {
    const qty = grants || {};
    els.grantGrid.innerHTML = grantFields().map(([key, name]) => (
      `<label class="field">${esc(name)}
        <input data-grant="${esc(key)}" type="number" min="0" step="1" value="${Number(qty[key] || 0)}">
      </label>`
    )).join("");
  }

  function readGrants() {
    const grants = {};
    els.grantGrid.querySelectorAll("[data-grant]").forEach((input) => {
      const n = Number(input.value || 0);
      if (n > 0) grants[input.dataset.grant] = n;
    });
    return grants;
  }

  function lines(text) {
    return String(text || "").split(/\r?\n/).map((row) => row.trim()).filter(Boolean);
  }

  function applyCatalog(data) {
    catalog = {
      categories: data.categories || [],
      items: data.items || [],
      assets: data.assets || []
    };
    if (!catalog.categories.some((row) => row.id === selectedCatId)) {
      selectedCatId = catalog.categories[0]?.id || "";
    }
    const items = catItems(selectedCatId);
    if (!items.some((row) => row.sku === selectedSku)) {
      selectedSku = items[0]?.sku || "";
    }
    renderCats();
    renderItems();
    fillCatForm();
    fillItemForm();
  }

  function renderCats() {
    els.catList.innerHTML = (catalog.categories || []).map((row) => `
      <button class="store-cat${row.id === selectedCatId ? " is-on" : ""}" type="button" data-cat="${esc(row.id)}">
        <img src="${esc(art(row.icon))}" alt="">
        <span><strong>${esc(row.name)}</strong><br><em class="muted">${esc(row.kind)}${row.visible ? "" : " · hidden"}</em></span>
      </button>`).join("");
  }

  function renderItems() {
    const rows = catItems(selectedCatId);
    els.itemList.innerHTML = rows.length
      ? rows.map((row) => `
        <button class="store-sku${row.sku === selectedSku ? " is-on" : ""}" type="button" data-sku="${esc(row.sku)}">
          <img src="${esc(art(row.thumb || row.sprite))}" alt="">
          <span><strong>${esc(row.name)}</strong><br><em class="muted">${esc(row.sku)}${row.visible ? "" : " · hidden"}</em></span>
        </button>`).join("")
      : `<p class="muted">No items on this floor yet.</p>`;
  }

  function fillCatForm() {
    const cat = selectedCat();
    const pass = cat?.kind === "pass";
    els.catName.value = cat?.name || "";
    els.catBlurb.value = cat?.blurb || "";
    els.catKind.value = cat?.kind || "coins";
    els.catKind.disabled = Boolean(cat?.system);
    els.catVisible.checked = cat?.visible !== false;
    els.catPerks.value = Array.isArray(cat?.extra?.perks) ? cat.extra.perks.join("\n") : "";
    els.catPerks.closest(".field").hidden = !pass;
    catIcon = cat?.icon || "poke-ball.png";
    setIconButton(els.catIconPreview, els.catIconLabel, catIcon);
    document.getElementById("cat-delete").hidden = Boolean(cat?.system);
    document.getElementById("item-add").disabled = pass;
  }

  function fillItemForm() {
    const item = selectedItem();
    const cat = selectedCat();
    skuLocked = Boolean(item);
    els.itemSku.value = item?.sku || "";
    els.itemSku.readOnly = skuLocked;
    els.itemName.value = item?.name || "";
    els.itemBlurb.value = item?.blurb || "";
    els.itemCost.value = item?.cost || 0;
    els.itemBits.value = item?.bits || 0;
    els.itemFeatured.checked = Boolean(item?.featured);
    els.itemVisible.checked = item ? item.visible !== false : true;
    itemSprite = item?.sprite || "poke-ball.png";
    itemThumb = item?.thumb || "";
    setIconButton(els.itemSpritePreview, els.itemSpriteLabel, itemSprite);
    setIconButton(els.itemThumbPreview, els.itemThumbLabel, itemThumb, "(same as sprite)");
    fillGrants(item?.grants || {});
    els.itemBallKey.value = item?.extra?.ballKey || "";
    els.itemPack.value = item?.extra?.pack || "";
    els.itemLooks.value = Array.isArray(item?.extra?.looks) ? item.extra.looks.join("\n") : "";
    els.itemBitsTitles.value = Array.isArray(item?.extra?.bitsTitles) ? item.extra.bitsTitles.join("\n") : "";
    const kind = cat?.kind || "coins";
    els.itemBits.closest(".field").hidden = kind !== "bits";
    els.itemCost.closest(".field").hidden = kind === "bits" || kind === "pass";
    els.itemFeatured.closest(".field").hidden = kind !== "balls";
    els.itemPack.closest(".field").hidden = kind !== "avatars";
    els.itemLooks.closest(".field").hidden = kind !== "avatars";
    els.itemBitsTitles.closest(".field").hidden = kind !== "bits";
    els.itemBallKey.closest(".field").hidden = kind !== "balls";
    els.itemForm.hidden = kind === "pass";
    document.getElementById("item-up").disabled = kind === "pass";
    document.getElementById("item-down").disabled = kind === "pass";
  }

  function note(message) {
    els.status.textContent = message || "";
  }

  async function reload(data) {
    if (data) applyCatalog(data);
    else applyCatalog(await window.playCall("admin_store_get"));
  }

  function slug(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
  }

  async function saveCategory(extra) {
    const cat = selectedCat() || {};
    const row = {
      id: cat.id || "",
      name: els.catName.value.trim(),
      blurb: els.catBlurb.value,
      kind: els.catKind.value,
      icon: catIcon,
      visible: els.catVisible.checked,
      sort: cat.sort,
      extra: {
        ...(cat.extra || {}),
        perks: lines(els.catPerks.value)
      },
      ...extra
    };
    note("Saving floor…");
    const data = await window.playCall("admin_store_save_category", { p_row: row });
    if (data.categoryId) selectedCatId = data.categoryId;
    await reload(data);
    note(data.message || "Floor saved.");
  }

  async function saveItem() {
    const cat = selectedCat();
    if (!cat) return;
    const sku = (els.itemSku.value || slug(els.itemName.value)).trim();
    const extra = {
      ballKey: els.itemBallKey.value.trim(),
      pack: els.itemPack.value.trim(),
      looks: lines(els.itemLooks.value),
      bitsTitles: lines(els.itemBitsTitles.value)
    };
    note("Saving item…");
    const data = await window.playCall("admin_store_save_item", {
      p_row: {
        sku,
        categoryId: cat.id,
        name: els.itemName.value.trim() || sku,
        blurb: els.itemBlurb.value,
        cost: Number(els.itemCost.value || 0),
        bits: Number(els.itemBits.value || 0),
        grants: readGrants(),
        sprite: itemSprite,
        thumb: itemThumb,
        featured: els.itemFeatured.checked,
        visible: els.itemVisible.checked,
        sort: selectedItem()?.sort ?? 100,
        extra
      }
    });
    selectedSku = data.sku || sku;
    await reload(data);
    note(data.message || "Item saved.");
  }

  async function reorder(kind, ids) {
    note("Saving order…");
    const data = await window.playCall("admin_store_reorder", { p_kind: kind, p_ids: ids });
    await reload(data);
    note(data.message || "Order saved.");
  }

  function move(list, id, dir) {
    const index = list.indexOf(id);
    const next = index + dir;
    if (index < 0 || next < 0 || next >= list.length) return list;
    const copy = list.slice();
    const [row] = copy.splice(index, 1);
    copy.splice(next, 0, row);
    return copy;
  }

  function renderSpriteGrid() {
    const q = String(els.spriteFilter.value || "").toLowerCase();
    const assets = (catalog.assets || []).filter((row) => {
      const hay = `${row.filename} ${row.label}`.toLowerCase();
      return !q || hay.includes(q);
    });
    els.spriteGrid.innerHTML = assets.map((row) => `
      <button class="sprite-pick" type="button" data-file="${esc(row.filename)}">
        <img src="${esc(art(row.filename))}" alt="">
        <span>${esc(row.label || row.filename)}</span>
      </button>`).join("") || `<p class="muted">No sprites match.</p>`;
  }

  function openPicker(target) {
    pickerTarget = target;
    els.spriteFilter.value = "";
    els.spriteUploadStatus.textContent = "";
    renderSpriteGrid();
    if (typeof els.spriteModal?.showModal === "function") els.spriteModal.showModal();
    else els.spriteModal?.setAttribute("open", "");
  }

  function applyPick(filename, previewUrl) {
    if (previewUrl) localPreviews[filename] = previewUrl;
    if (pickerTarget === "cat-icon") {
      catIcon = filename;
      setIconButton(els.catIconPreview, els.catIconLabel, catIcon);
    } else if (pickerTarget === "item-thumb") {
      itemThumb = filename;
      setIconButton(els.itemThumbPreview, els.itemThumbLabel, itemThumb, "(same as sprite)");
    } else {
      itemSprite = filename;
      setIconButton(els.itemSpritePreview, els.itemSpriteLabel, itemSprite);
    }
    els.spriteModal?.close?.("ok");
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const raw = String(reader.result || "");
        const comma = raw.indexOf(",");
        resolve({ dataUrl: raw, base64: comma >= 0 ? raw.slice(comma + 1) : raw });
      };
      reader.onerror = () => reject(new Error("Could not read that file."));
      reader.readAsDataURL(file);
    });
  }

  async function loadHub() {
    const session = (await supabase.auth.getSession()).data.session;
    if (!session) {
      setSignedOut();
      return;
    }
    const { data: profile } = await supabase.from("profiles").select("display_name, twitch_login, avatar_url").eq("id", session.user.id).maybeSingle();
    const { data: isAdmin, error } = await supabase.rpc("is_play_admin");
    window.playSetAccountNav(session, profile, { isAdmin: Boolean(isAdmin) });
    if (error || !isAdmin) {
      els.staff.hidden = true;
      els.gate.hidden = false;
      els.gate.textContent = "This page is for moderators and admins.";
      return;
    }
    els.gate.hidden = true;
    els.staff.hidden = false;
    try {
      await reload();
      note("Edit floors and items, then check the public mart.");
    } catch (err) {
      note(window.playRpcError(err, "Could not load the store catalog."));
    }
  }

  els.catList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-cat]");
    if (!button) return;
    selectedCatId = button.dataset.cat;
    selectedSku = catItems(selectedCatId)[0]?.sku || "";
    renderCats();
    renderItems();
    fillCatForm();
    fillItemForm();
  });

  els.itemList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-sku]");
    if (!button) return;
    selectedSku = button.dataset.sku;
    renderItems();
    fillItemForm();
  });

  els.catForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try { await saveCategory(); }
    catch (error) { note(window.playRpcError(error)); }
  });

  els.itemForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try { await saveItem(); }
    catch (error) { note(window.playRpcError(error)); }
  });

  document.getElementById("cat-add").addEventListener("click", async () => {
    const name = window.prompt("New floor name?", "New floor");
    if (!name) return;
    selectedCatId = "";
    els.catName.value = name;
    els.catBlurb.value = "";
    els.catKind.value = "coins";
    els.catKind.disabled = false;
    els.catVisible.checked = true;
    catIcon = "poke-ball.png";
    try { await saveCategory({ id: "", name, kind: "coins", sort: 100 }); }
    catch (error) { note(window.playRpcError(error)); }
  });

  document.getElementById("cat-hide").addEventListener("click", async () => {
    els.catVisible.checked = !els.catVisible.checked;
    try { await saveCategory(); }
    catch (error) { note(window.playRpcError(error)); }
  });

  document.getElementById("cat-delete").addEventListener("click", async () => {
    const cat = selectedCat();
    if (!cat || cat.system) return;
    if (!window.confirm(`Remove ${cat.name}?`)) return;
    try {
      note("Removing floor…");
      const data = await window.playCall("admin_store_delete_category", { p_id: cat.id });
      selectedCatId = "";
      await reload(data);
      note(data.message || "Floor removed.");
    } catch (error) {
      note(window.playRpcError(error));
    }
  });

  document.getElementById("cat-up").addEventListener("click", async () => {
    const ids = (catalog.categories || []).map((row) => row.id);
    try { await reorder("category", move(ids, selectedCatId, -1)); }
    catch (error) { note(window.playRpcError(error)); }
  });
  document.getElementById("cat-down").addEventListener("click", async () => {
    const ids = (catalog.categories || []).map((row) => row.id);
    try { await reorder("category", move(ids, selectedCatId, 1)); }
    catch (error) { note(window.playRpcError(error)); }
  });

  document.getElementById("item-add").addEventListener("click", () => {
    selectedSku = "";
    skuLocked = false;
    els.itemSku.readOnly = false;
    els.itemSku.value = "";
    els.itemName.value = "New item";
    els.itemBlurb.value = "";
    els.itemCost.value = 10;
    els.itemBits.value = 0;
    els.itemFeatured.checked = false;
    els.itemVisible.checked = true;
    itemSprite = "poke-ball.png";
    itemThumb = "";
    setIconButton(els.itemSpritePreview, els.itemSpriteLabel, itemSprite);
    setIconButton(els.itemThumbPreview, els.itemThumbLabel, "", "(same as sprite)");
    fillGrants({});
    els.itemBallKey.value = "";
    els.itemPack.value = "";
    els.itemLooks.value = "";
    els.itemBitsTitles.value = "";
    renderItems();
  });

  document.getElementById("item-delete").addEventListener("click", async () => {
    const item = selectedItem();
    if (!item) return;
    if (!window.confirm(`Remove ${item.name}?`)) return;
    try {
      note("Removing item…");
      const data = await window.playCall("admin_store_delete_item", { p_sku: item.sku });
      selectedSku = "";
      await reload(data);
      note(data.message || "Item removed.");
    } catch (error) {
      note(window.playRpcError(error));
    }
  });

  document.getElementById("item-up").addEventListener("click", async () => {
    const ids = catItems(selectedCatId).map((row) => row.sku);
    try { await reorder("item", move(ids, selectedSku, -1)); }
    catch (error) { note(window.playRpcError(error)); }
  });
  document.getElementById("item-down").addEventListener("click", async () => {
    const ids = catItems(selectedCatId).map((row) => row.sku);
    try { await reorder("item", move(ids, selectedSku, 1)); }
    catch (error) { note(window.playRpcError(error)); }
  });

  document.getElementById("cat-icon-pick").addEventListener("click", () => openPicker("cat-icon"));
  document.getElementById("item-sprite-pick").addEventListener("click", () => openPicker("item-sprite"));
  document.getElementById("item-thumb-pick").addEventListener("click", () => openPicker("item-thumb"));

  els.spriteFilter.addEventListener("input", renderSpriteGrid);
  els.spriteGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-file]");
    if (button) applyPick(button.dataset.file);
  });
  els.spriteModal?.addEventListener("click", (event) => {
    if (event.target === els.spriteModal) els.spriteModal.close("cancel");
  });

  els.spriteUpload.addEventListener("change", async () => {
    const file = els.spriteUpload.files?.[0];
    els.spriteUpload.value = "";
    if (!file) return;
    if (file.size > 900000) {
      els.spriteUploadStatus.textContent = "Keep sprites under 900 KB.";
      return;
    }
    els.spriteUploadStatus.textContent = "Uploading…";
    try {
      const { dataUrl, base64 } = await fileToBase64(file);
      const { data, error } = await supabase.functions.invoke("store-asset", {
        body: {
          filename: file.name,
          contentBase64: base64,
          label: file.name.replace(/\.[^.]+$/, ""),
          kind: pickerTarget === "cat-icon" ? "item" : "item"
        }
      });
      if (error) {
        els.spriteUploadStatus.textContent = error.message || "Upload failed.";
        applyPick(file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-"), dataUrl);
        return;
      }
      if (data?.assets) catalog.assets = data.assets;
      const filename = data?.filename || file.name;
      applyPick(filename, dataUrl);
      els.spriteUploadStatus.textContent = data?.message || "Uploaded. GitHub Pages may take a minute.";
      renderSpriteGrid();
    } catch (error) {
      els.spriteUploadStatus.textContent = window.playRpcError(error, "Upload failed.");
    }
  });

  supabase.auth.onAuthStateChange((event) => { if (window.playAuthNoise(event)) return; loadHub(); });
  loadHub();
})();
