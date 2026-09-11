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
    itemThumbUpload: document.getElementById("item-thumb-upload"),
    itemThumbStatus: document.getElementById("item-thumb-status"),
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
  const PACK_THUMB = "pack-thumb.png";
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

  function formatMoney(n) {
    return typeof window.playFormatCoins === "function" ? window.playFormatCoins(n) : String(n ?? 0);
  }

  function parseMoney(raw) {
    const n = typeof window.playParseCoins === "function"
      ? window.playParseCoins(raw)
      : Number(String(raw || "").replace(/,/g, ""));
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.round(n);
  }

  function bindMoneyInput(el) {
    if (!el || el.dataset.moneyBound) return;
    el.dataset.moneyBound = "1";
    const apply = (live) => {
      const start = el.selectionStart;
      const before = el.value.slice(0, start);
      const digitGoal = (before.match(/\d/g) || []).length;
      const stripped = el.value.replace(/,/g, "");
      const keepDot = live && /\.\d*$/.test(stripped);
      const parsed = typeof window.playParseCoins === "function" ? window.playParseCoins(el.value) : parseMoney(el.value);
      let text = formatMoney(live ? parsed : parseMoney(el.value));
      if (text === "—") text = "";
      if (keepDot) {
        const frac = (stripped.split(".")[1] || "").replace(/\D/g, "").slice(0, 2);
        const whole = formatMoney(Math.trunc(parsed));
        text = (whole === "—" ? "0" : whole) + "." + frac;
      }
      el.value = text;
      if (document.activeElement !== el) return;
      let seen = 0;
      let pos = text.length;
      for (let i = 0; i < text.length; i += 1) {
        if (/\d/.test(text[i])) {
          seen += 1;
          if (seen >= digitGoal) {
            pos = i + 1;
            break;
          }
        }
      }
      try { el.setSelectionRange(pos, pos); } catch (_) {}
    };
    el.addEventListener("input", () => apply(true));
    el.addEventListener("blur", () => apply(false));
  }

  function isSharedPackArt(path) {
    const raw = String(path || "").trim();
    return !raw || raw === "premium-avatars.png" || raw === "images/trainers/premium-avatars.png" || raw === "poke-ball.png";
  }

  function art(path) {
    const raw = String(path || "").trim();
    if (localPreviews[raw]) return localPreviews[raw];
    return window.playItemSprite(raw || "poke-ball.png");
  }

  function isAvatarsFloor() {
    return selectedCat()?.kind === "avatars";
  }

  function thumbEmptyCopy() {
    return isAvatarsFloor() ? PACK_THUMB : "(same as sprite)";
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

  function rememberPreview(filename, url) {
    const key = String(filename || "").trim();
    if (!key || !url) return;
    const prev = localPreviews[key];
    if (prev && prev !== url && String(prev).startsWith("blob:")) URL.revokeObjectURL(prev);
    localPreviews[key] = url;
  }

  function stockCatIcon() {
    const kind = selectedCat()?.kind || els.catKind.value;
    if (kind === "avatars") return "images/trainers/premium-avatars.png";
    if (kind === "pass") return "rainbow-pass.png";
    if (kind === "bits") return "amulet-coin.png";
    return "poke-ball.png";
  }

  function stockSprite() {
    return isAvatarsFloor() ? PACK_THUMB : "poke-ball.png";
  }

  function stockThumb() {
    return isAvatarsFloor() ? PACK_THUMB : "";
  }

  function setIconButton(preview, label, path, emptyCopy) {
    const value = path || "";
    const src = art(value || "poke-ball.png");
    preview.dataset.playRawTried = "";
    preview.onerror = null;
    if (preview.getAttribute("src") === src) preview.removeAttribute("src");
    preview.src = src;
    label.textContent = value || emptyCopy || "pick a sprite";
  }

  function sanitizeFilename(name, mime) {
    let base = String(name || "sprite").toLowerCase().replace(/\\/g, "/").split("/").pop() || "sprite";
    base = base.replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
    if (!/\.(png|webp|gif|jpe?g)$/.test(base)) {
      const type = String(mime || "");
      const ext = type.includes("webp") ? ".webp" : type.includes("gif") ? ".gif" : type.includes("jpeg") || type.includes("jpg") ? ".jpg" : ".png";
      base = `${base.replace(/\.[^.]+$/, "") || "sprite"}${ext}`;
    }
    return base.slice(0, 80);
  }

  function decodeImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve();
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("That file could not be read as an image. Use PNG, WebP, GIF, or JPEG."));
      };
      img.src = url;
    });
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
          <span><strong>${esc(row.name)}</strong><br><em class="muted">${esc(row.sku)}${row.featured ? " · featured" : ""}${row.visible ? "" : " · hidden"} · ${formatMoney((selectedCat()?.kind === "bits" ? row.bits : row.cost) || 0)}${selectedCat()?.kind === "bits" ? " Bits" : ""}</em></span>
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
    els.itemCost.value = formatMoney(item?.cost || 0);
    els.itemBits.value = formatMoney(item?.bits || 0);
    els.itemFeatured.checked = Boolean(item?.featured);
    els.itemVisible.checked = item ? item.visible !== false : true;
    const kind = cat?.kind || "coins";
    const avatars = kind === "avatars";
    itemThumb = avatars
      ? (isSharedPackArt(item?.thumb) ? PACK_THUMB : item.thumb)
      : (item?.thumb || "");
    itemSprite = avatars
      ? (itemThumb || PACK_THUMB)
      : (item?.sprite || "poke-ball.png");
    setIconButton(els.itemSpritePreview, els.itemSpriteLabel, itemSprite);
    setIconButton(els.itemThumbPreview, els.itemThumbLabel, itemThumb, thumbEmptyCopy());
    fillGrants(item?.grants || {});
    els.itemBallKey.value = item?.extra?.ballKey || "";
    els.itemPack.value = item?.extra?.pack || "";
    els.itemLooks.value = Array.isArray(item?.extra?.looks) ? item.extra.looks.join("\n") : "";
    els.itemBitsTitles.value = Array.isArray(item?.extra?.bitsTitles) ? item.extra.bitsTitles.join("\n") : "";
    document.getElementById("item-sprite-field").hidden = avatars;
    els.itemBits.closest(".field").hidden = kind !== "bits";
    els.itemCost.closest(".field").hidden = kind === "bits" || kind === "pass";
    els.itemFeatured.closest(".field").hidden = kind === "pass";
    els.itemPack.closest(".field").hidden = !avatars;
    els.itemLooks.closest(".field").hidden = !avatars;
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
        cost: parseMoney(els.itemCost.value),
        bits: parseMoney(els.itemBits.value),
        grants: readGrants(),
        sprite: isAvatarsFloor() ? (itemThumb || PACK_THUMB) : itemSprite,
        thumb: isAvatarsFloor() ? (itemThumb || PACK_THUMB) : itemThumb,
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

  function applyPick(filename, previewUrl, closeModal = true) {
    if (previewUrl) rememberPreview(filename, previewUrl);
    if (pickerTarget === "cat-icon") {
      catIcon = filename;
      setIconButton(els.catIconPreview, els.catIconLabel, catIcon);
    } else if (pickerTarget === "item-thumb") {
      itemThumb = filename;
      if (isAvatarsFloor()) itemSprite = filename;
      setIconButton(els.itemThumbPreview, els.itemThumbLabel, itemThumb, thumbEmptyCopy());
    } else {
      itemSprite = filename;
      setIconButton(els.itemSpritePreview, els.itemSpriteLabel, itemSprite);
    }
    const item = selectedItem();
    if (item && pickerTarget === "item-thumb") item.thumb = filename;
    if (item && pickerTarget === "item-sprite") item.sprite = filename;
    if (item && isAvatarsFloor() && pickerTarget === "item-thumb") item.sprite = filename;
    const cat = selectedCat();
    if (cat && pickerTarget === "cat-icon") cat.icon = filename;
    if (pickerTarget === "cat-icon") renderCats();
    else renderItems();
    if (closeModal && els.spriteModal?.open) els.spriteModal.close("ok");
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
    els.itemCost.value = formatMoney(10);
    els.itemBits.value = formatMoney(0);
    els.itemFeatured.checked = false;
    els.itemVisible.checked = true;
    const avatars = isAvatarsFloor();
    itemSprite = avatars ? PACK_THUMB : "poke-ball.png";
    itemThumb = avatars ? PACK_THUMB : "";
    setIconButton(els.itemSpritePreview, els.itemSpriteLabel, itemSprite);
    setIconButton(els.itemThumbPreview, els.itemThumbLabel, itemThumb, thumbEmptyCopy());
    document.getElementById("item-sprite-field").hidden = avatars;
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
  document.getElementById("cat-icon-default").addEventListener("click", () => {
    pickerTarget = "cat-icon";
    applyPick(stockCatIcon());
  });
  document.getElementById("item-sprite-default").addEventListener("click", () => {
    pickerTarget = "item-sprite";
    applyPick(stockSprite());
  });
  document.getElementById("item-thumb-default").addEventListener("click", () => {
    pickerTarget = "item-thumb";
    applyPick(stockThumb() || (isAvatarsFloor() ? PACK_THUMB : "poke-ball.png"), "", false);
    if (!isAvatarsFloor()) {
      itemThumb = "";
      const item = selectedItem();
      if (item) item.thumb = "";
      setIconButton(els.itemThumbPreview, els.itemThumbLabel, "", thumbEmptyCopy());
      renderItems();
    }
  });

  els.spriteFilter.addEventListener("input", renderSpriteGrid);
  els.spriteGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-file]");
    if (button) applyPick(button.dataset.file);
  });
  els.spriteModal?.addEventListener("click", (event) => {
    if (event.target === els.spriteModal) els.spriteModal.close("cancel");
  });

  async function uploadErrorMessage(error, data) {
    if (data?.message) return data.message;
    try {
      const res = error?.context;
      if (res && typeof res.json === "function") {
        const body = await (typeof res.clone === "function" ? res.clone().json() : res.json());
        if (body?.message) return body.message;
      }
    } catch (_) { /* use fallback */ }
    if (String(error?.message || "").includes("non-2xx")) {
      return "Save a GitHub token on Staff tools (Store image hosting) first, then try again.";
    }
    return window.playRpcError(error, "Upload failed.");
  }

  async function persistUpload() {
    if (pickerTarget === "cat-icon") {
      if (!selectedCat()?.id) return;
      await saveCategory();
      return;
    }
    if (els.itemForm.hidden) return;
    if (!selectedItem() && !els.itemSku.value.trim()) return;
    await saveItem();
  }

  async function prepareStoreImage(file) {
    await decodeImage(file);
    const name = file.name || "sprite.png";
    const type = file.type || "";
    const keep = type === "image/png" || type === "image/webp" || type === "image/gif"
      || /\.(png|webp|gif)$/i.test(name);
    if (keep) return file;
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not convert that image.");
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close?.();
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((next) => next ? resolve(next) : reject(new Error("Could not convert that image to PNG.")), "image/png");
    });
    const filename = sanitizeFilename(name, "image/png").replace(/\.[^.]+$/, ".png");
    return new File([blob], filename, { type: "image/png" });
  }

  async function uploadStoreAsset(file, statusEl) {
    if (!file) return;
    if (file.size > 900000) {
      statusEl.textContent = "Keep images under 900 KB.";
      return;
    }
    statusEl.textContent = "Uploading…";
    try {
      const prepared = await prepareStoreImage(file);
      const filename = sanitizeFilename(prepared.name, prepared.type);
      const blobUrl = URL.createObjectURL(prepared);
      applyPick(filename, blobUrl, false);
      const { base64 } = await fileToBase64(prepared);
      const { data, error } = await supabase.functions.invoke("store-asset", {
        body: {
          filename,
          mime: prepared.type || "image/png",
          contentBase64: base64,
          label: filename.replace(/\.[^.]+$/, ""),
          kind: "item"
        }
      });
      if (error) {
        statusEl.textContent = await uploadErrorMessage(error, data);
        renderSpriteGrid();
        return;
      }
      if (data?.ok === false) {
        statusEl.textContent = data.message || "Upload failed.";
        renderSpriteGrid();
        return;
      }
      if (data?.assets) catalog.assets = data.assets;
      const saved = data?.filename || filename;
      rememberPreview(saved, blobUrl);
      if (saved !== filename) rememberPreview(filename, blobUrl);
      applyPick(saved, blobUrl, true);
      statusEl.textContent = data?.message || "Uploaded.";
      renderSpriteGrid();
      await persistUpload();
    } catch (error) {
      statusEl.textContent = await uploadErrorMessage(error);
    }
  }

  els.spriteUpload.addEventListener("change", async () => {
    const file = els.spriteUpload.files?.[0];
    els.spriteUpload.value = "";
    await uploadStoreAsset(file, els.spriteUploadStatus);
  });

  els.itemThumbUpload?.addEventListener("change", async () => {
    const file = els.itemThumbUpload.files?.[0];
    els.itemThumbUpload.value = "";
    pickerTarget = "item-thumb";
    await uploadStoreAsset(file, els.itemThumbStatus);
  });

  bindMoneyInput(els.itemCost);
  bindMoneyInput(els.itemBits);

  supabase.auth.onAuthStateChange((event) => { if (window.playAuthNoise(event)) return; loadHub(); });
  loadHub();
})();
