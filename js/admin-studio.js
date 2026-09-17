(() => {
  const supabase = window.playSupabase;
  const staff = document.getElementById("staff");
  if (!staff) return;

  const NAV = [
    ["overview", "Overview"],
    ["items", "Items"],
    ["products", "Store products"],
    ["packs", "Packs"],
    ["bits", "Bits products"],
    ["avatars", "Trainer avatars"],
    ["pass", "Starlight Pass"],
    ["specials", "Special Events"],
    ["assets", "Asset library"]
  ];

  const state = {
    view: "overview",
    studio: null,
    library: [],
    health: null,
    pack: { sku: "", name: "", blurb: "", detail: "", cost: 0, bits: 0, currency: "coins", featured: false, status: "draft", grants: {}, sprite: "pack-thumb.png", categoryId: "", bitsTitles: [] },
    look: null,
    crop: { zoom: 1, x: 0, y: 0, kind: "pixel" },
    passDaily: {},
    passWeekly: {},
    libQ: "",
    libCat: ""
  };

  function esc(value) {
    return window.playEscapeAttr(value);
  }

  function money(n) {
    return typeof window.playFormatCoins === "function" ? window.playFormatCoins(n) : String(n ?? 0);
  }

  const MART_VALUE = {
    pokeball: 100, greatball: 225, ultraball: 500, berry: 60, bait: 125, lure: 80,
    nestball: 275, netball: 300, duskball: 325, razz: 200, bag_bonus: 12,
    firestone: 350, waterstone: 350, thunderstone: 350, leafstone: 350, moonstone: 450, linkingcord: 600
  };

  function packMartValue(grants) {
    return Object.entries(grants || {}).reduce((sum, [key, qty]) => sum + (MART_VALUE[key] || 0) * (Number(qty) || 0), 0);
  }

  function itemArt(key) {
    return window.playItemSprite ? window.playItemSprite(key) : `images/items/${key}.png`;
  }

  function lookSprite(look) {
    if (window.playTrainerSpriteUrl) return window.playTrainerSpriteUrl(look.id);
    return `images/trainers/${look.id}.${look.ext || "png"}`;
  }

  function lookPortrait(look) {
    if (look.portrait) {
      if (look.portrait.startsWith("images/") || look.portrait.startsWith("http") || look.portrait.startsWith("blob:")) return look.portrait;
      return `images/trainers/portraits/${look.portrait}`;
    }
    return lookSprite(look);
  }

  function note(message) {
    const el = document.getElementById("store-status");
    if (el) el.textContent = message || "";
  }

  function setView(view) {
    state.view = view;
    document.querySelectorAll("[data-studio-view]").forEach((btn) => {
      btn.setAttribute("aria-selected", btn.dataset.studioView === view ? "true" : "false");
    });
    document.querySelectorAll("[data-studio-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.studioPanel !== view;
    });
    const desk = document.getElementById("studio-products-desk");
    if (desk) desk.hidden = view !== "products";
    if (view === "overview") renderOverview();
    if (view === "items") loadLibrary();
    if (view === "packs" || view === "bits") renderPack();
    if (view === "avatars") renderAvatars();
    if (view === "pass") renderPass();
    if (view === "specials") renderSpecials();
    if (view === "assets") renderAssets();
  }

  function ensureShell() {
    if (document.getElementById("studio-nav")) return;
    const nav = document.createElement("div");
    nav.id = "studio-nav";
    nav.className = "hub-subnav studio-nav";
    nav.setAttribute("role", "tablist");
    nav.setAttribute("aria-label", "Content Studio");
    nav.innerHTML = NAV.map(([id, label]) => (
      `<button type="button" data-studio-view="${id}" aria-selected="${id === "overview" ? "true" : "false"}">${label}</button>`
    )).join("");
    const status = document.getElementById("store-status");
    status?.before(nav);

    const mount = document.createElement("div");
    mount.id = "studio-panels";
    mount.innerHTML = `
      <section class="card body" data-studio-panel="overview">
        <h2>Content Studio</h2>
        <p class="muted">Build Mart products, packs, items, and Trainer avatars without editing raw database rows.</p>
        <div id="studio-overview" class="studio-overview"></div>
      </section>
      <section class="card body" data-studio-panel="items" hidden>
        <h2>Item Library</h2>
        <div class="studio-picker-tools">
          <label class="field" for="lib-q">Search
            <input id="lib-q" type="search" placeholder="Net Ball, Razz, Honey…">
          </label>
          <label class="field" for="lib-cat">Category
            <select id="lib-cat">
              <option value="">All</option>
              <option value="balls">Poké Balls</option>
              <option value="berries">Berries</option>
              <option value="community">Honey / Radar</option>
              <option value="evolution">Evolution</option>
            </select>
          </label>
        </div>
        <div id="studio-library" class="studio-library"></div>
      </section>
      <section class="card body" data-studio-panel="packs" hidden>
        <h2>Pack builder</h2>
        <p class="muted">Guaranteed contents only. No odds, no Pokémon, no Shinies, no Master Balls.</p>
        <div id="studio-pack"></div>
      </section>
      <section class="card body" data-studio-panel="bits" hidden>
        <h2>Bits products</h2>
        <p class="muted">Custom Power-Ups only. Contents are guaranteed and listed before support. General cheers are not Store checkout. Master Ball cannot go in an ordinary Bits pack.</p>
        <div id="studio-bits-pack"></div>
      </section>
      <section class="card body" data-studio-panel="avatars" hidden>
        <h2>Trainer avatars</h2>
        <p class="muted">Each look has a full sprite and a profile portrait. Original sprites are never overwritten.</p>
        <div id="studio-avatars"></div>
      </section>
      <section class="card body" data-studio-panel="pass" hidden>
        <h2>Starlight Pass rewards</h2>
        <p class="muted">Daily and weekly claims use the same content picker as packs.</p>
        <div id="studio-pass"></div>
      </section>
      <section class="card body" data-studio-panel="specials" hidden>
        <h2>Special Events</h2>
        <p class="muted">Legendary and Mythical encounters are scheduled from Live Operations. This catalog shows current Kanto availability. Bits cannot buy Legendary access, Shinies, or catch odds.</p>
        <div id="studio-specials"></div>
      </section>
      <section class="card body" data-studio-panel="assets" hidden>
        <h2>Asset library</h2>
        <p class="muted">Upload, preview, and reuse Mart and Trainer art. This is not an image editor.</p>
        <div id="studio-assets"></div>
      </section>`;
    const desk = document.querySelector(".store-desk");
    if (desk) {
      desk.id = "studio-products-desk";
      desk.hidden = true;
      desk.dataset.studioPanel = "products";
      desk.before(mount);
    } else {
      staff.append(mount);
    }

    if (!document.getElementById("studio-item-modal")) {
      const itemModal = document.createElement("dialog");
      itemModal.id = "studio-item-modal";
      itemModal.className = "play-modal";
      itemModal.innerHTML = `<form class="play-modal-card" method="dialog"><header class="play-modal-head"><h3 id="studio-item-title">Item</h3><button class="secondary" value="cancel">Close</button></header><div id="studio-item-body"></div></form>`;
      document.body.appendChild(itemModal);
    }
    if (!document.getElementById("studio-crop-modal")) {
      const crop = document.createElement("dialog");
      crop.id = "studio-crop-modal";
      crop.className = "play-modal play-modal-wide";
      crop.innerHTML = `<form class="play-modal-card" method="dialog">
        <header class="play-modal-head"><h3>Portrait crop</h3><button class="secondary" value="cancel">Close</button></header>
        <div class="studio-crop-split">
          <figure><figcaption>Full sprite</figcaption><img id="crop-full" alt=""></figure>
          <figure><figcaption>Profile portrait</figcaption><canvas id="crop-preview" width="256" height="256"></canvas></figure>
        </div>
        <div class="studio-crop-controls">
          <label>Zoom <input id="crop-zoom" type="range" min="70" max="180" value="100"></label>
          <label>X <input id="crop-x" type="range" min="-40" max="40" value="0"></label>
          <label>Y <input id="crop-y" type="range" min="-40" max="40" value="0"></label>
          <label>Art type
            <select id="crop-kind">
              <option value="pixel">Pixel art</option>
              <option value="rendered">Rendered / 3D</option>
            </select>
          </label>
        </div>
        <p id="crop-status" class="muted" role="status"></p>
        <div class="links">
          <button id="crop-save" type="button">Save portrait</button>
        </div>
      </form>`;
      document.body.appendChild(crop);
    }
  }

  async function reloadStudio() {
    state.studio = await window.playCall("admin_content_studio");
    try { state.health = await window.playCall("admin_content_health"); } catch (_) { state.health = null; }
    return state.studio;
  }

  function grantChips(grants) {
    const lines = typeof window.playGrantLines === "function" ? window.playGrantLines(grants) : [];
    if (!lines.length) return `<p class="muted">Empty pack.</p>`;
    return `<ul class="mart-grants studio-pack-grants">${lines.map((line) => `<li><img src="${esc(line.sprite)}" alt=""><span>${esc(line.label)}</span> <button type="button" class="secondary" data-remove-grant="${esc(line.key)}">Remove</button></li>`).join("")}</ul>`;
  }

  function renderOverview() {
    const el = document.getElementById("studio-overview");
    if (!el) return;
    const o = state.studio?.overview || {};
    const health = state.health || {};
    el.innerHTML = `
      <div class="studio-stats">
        <article><strong>${o.live ?? "—"}</strong><span>Live products</span></article>
        <article><strong>${o.draft ?? "—"}</strong><span>Drafts</span></article>
        <article><strong>${o.coinProducts ?? "—"}</strong><span>PokéCoin</span></article>
        <article><strong>${o.bitsProducts ?? "—"}</strong><span>Bits</span></article>
        <article><strong>${o.packs ?? "—"}</strong><span>Packs</span></article>
        <article><strong>${o.items ?? "—"}</strong><span>Items</span></article>
        <article><strong>${o.avatars ?? "—"}</strong><span>Avatars</span></article>
        <article class="${o.missingPortraits ? "is-warn" : ""}"><strong>${o.missingPortraits ?? "—"}</strong><span>Missing portraits</span></article>
        <article class="${o.invalid ? "is-warn" : ""}"><strong>${o.invalid ?? "—"}</strong><span>Invalid products</span></article>
      </div>
      <p class="muted">${esc(health.detail || "Content health not loaded.")}</p>
      ${Array.isArray(health.bitsCollisions) && health.bitsCollisions.length
        ? `<p class="status-bad">Bits amount collisions: ${health.bitsCollisions.map((row) => esc(typeof row === "string" ? row : JSON.stringify(row))).join(" · ")}</p>`
        : ""}
      ${health.bitsInvalid ? `<p class="status-bad">${Number(health.bitsInvalid)} live Bits product${health.bitsInvalid === 1 ? "" : "s"} failed validation.</p>` : ""}
      <div class="links">
        <button type="button" data-studio-go="products" data-studio-new="item">+ New product</button>
        <button type="button" data-studio-go="packs">+ New pack</button>
        <button type="button" class="secondary" data-studio-go="bits">+ New Bits product</button>
        <button type="button" data-studio-go="avatars" data-studio-new="avatar">+ Add Trainer avatar</button>
        <button type="button" class="secondary" data-studio-go="avatars" data-studio-new="pack">+ Add avatar pack</button>
        <button type="button" class="secondary" data-studio-go="items">+ Add item</button>
        <a class="button secondary" href="./admin.html?section=encounters&view=special">Open Special Events</a>
      </div>`;
  }

  async function renderSpecials() {
    const el = document.getElementById("studio-specials");
    if (!el) return;
    el.innerHTML = `<p class="muted">Loading Kanto availability…</p>`;
    try {
      const data = await window.playCall("admin_special_event_command", { p_action: "list", p_payload: {} });
      const special = data?.availability?.special || [];
      const counts = data?.availability?.counts || {};
      el.innerHTML = `
        <p>${esc(counts.normal || 146)} normal spawn · ${esc(counts.special || 5)} Special Event · ${esc(counts.evolutionOnly || 0)} evolution-only · ${esc(counts.unavailable || 0)} unavailable.</p>
        <div class="special-species-grid">${special.map((row) => {
          const art = window.playSpriteUrl ? window.playSpriteUrl(row.dex, "normal") : "";
          return `<article class="special-species">
            ${art ? `<img src="${esc(art)}" alt="">` : ""}
            <strong>${esc(window.playPadDex ? window.playPadDex(row.dex) : row.dex)} ${esc(row.name)}</strong>
            <span>${row.mythical ? "MYTHICAL" : "SPECIAL"}</span>
          </article>`;
        }).join("")}</div>
        <div class="links">
          <a class="button" href="./admin.html?section=encounters&view=special">Schedule / start events</a>
        </div>`;
    } catch (error) {
      el.innerHTML = `<p class="muted">${window.playHumanRpcError ? window.playHumanRpcError(error) : esc(error.message || error)}</p>`;
    }
  }

  async function loadLibrary() {
    const el = document.getElementById("studio-library");
    if (!el) return;
    el.innerHTML = `<p class="muted">Loading items…</p>`;
    try {
      const data = await window.playCall("admin_item_library", {
        p_q: state.libQ || null,
        p_category: state.libCat || null
      });
      state.library = data.items || [];
      renderLibrary();
    } catch (error) {
      el.innerHTML = `<p class="muted">${esc(window.playRpcError(error, "Could not load the item library."))}</p>`;
    }
  }

  function renderLibrary() {
    const el = document.getElementById("studio-library");
    if (!el) return;
    el.innerHTML = (state.library || []).map((row) => `
      <button class="studio-item-card" type="button" data-item-key="${esc(row.key)}">
        <img src="${esc(itemArt(row.icon || row.key))}" alt="">
        <strong>${esc(row.name)}</strong>
        <span class="studio-chip">${esc(row.category)}</span>
        <span class="studio-chip">${esc(row.rarity || "—")}</span>
        <em>${esc(row.powerLabel || "")}${row.collector ? " · Collector" : ""}</em>
        <p>${esc(row.bestUse || row.playerText || "")}</p>
        <small>${row.storeAvailable === false ? "Not sold" : (row.shopPrice != null ? `${money(row.shopPrice)} PokéCoins` : "Mart")} · ${esc(row.adminText || row.condition || "")}</small>
      </button>`).join("") || `<p class="muted">No items match.</p>`;
  }

  function renderPack() {
    const bitsMode = state.view === "bits" || state.pack.currency === "bits";
    const el = document.getElementById(state.view === "bits" ? "studio-bits-pack" : "studio-pack");
    if (!el) return;
    const p = state.pack;
    const cats = (state.studio?.categories || []).filter((row) => bitsMode ? row.kind === "bits" : row.kind !== "pass");
    const collisions = state.health?.bitsCollisions || [];
    el.innerHTML = `
      <form id="pack-form" class="store-editor-form">
        <label class="field">Name <input id="pack-name" type="text" value="${esc(p.name)}" required></label>
        <label class="field">SKU <input id="pack-sku" type="text" value="${esc(p.sku)}" spellcheck="false"></label>
        <label class="field">Short description <textarea id="pack-blurb" rows="2">${esc(p.blurb)}</textarea></label>
        <label class="field">Detail <textarea id="pack-detail" rows="3">${esc(p.detail || "")}</textarea></label>
        <label class="field">Floor
          <select id="pack-cat">${cats.map((c) => `<option value="${esc(c.id)}"${c.id === p.categoryId ? " selected" : ""}>${esc(c.name)} (${esc(c.kind)})</option>`).join("")}</select>
        </label>
        <label class="field">Currency
          <select id="pack-currency">
            <option value="coins"${p.currency !== "bits" ? " selected" : ""}>PokéCoins</option>
            <option value="bits"${p.currency === "bits" ? " selected" : ""}>Bits</option>
          </select>
        </label>
        <label class="field">${bitsMode ? "Bits cost" : "Price"} <input id="pack-price" class="money" type="text" value="${esc(money(p.currency === "bits" ? p.bits : p.cost))}"></label>
        ${bitsMode ? `<label class="field">Power-Up title aliases <span class="muted">(one per line, must match Twitch)</span>
          <textarea id="pack-bits-titles" rows="3">${esc((p.bitsTitles || []).join("\n"))}</textarea>
        </label>` : ""}
        <label class="field">Status
          <select id="pack-status">
            <option value="draft"${p.status === "draft" ? " selected" : ""}>Draft</option>
            <option value="published"${p.status !== "draft" ? " selected" : ""}>Published</option>
          </select>
        </label>
        <label class="field field-check"><input id="pack-featured" type="checkbox"${p.featured ? " checked" : ""}> Featured</label>
        <p class="muted">Guaranteed contents — no odds field. Mart equivalent ${money(packMartValue(p.grants))} PokéCoins${p.bits ? ` · ${money(Math.round(packMartValue(p.grants) / Math.max(p.bits, 1)))} per Bit` : ""}.</p>
        ${grantChips(p.grants)}
        ${collisions.length ? `<p class="status-bad">Live Bits amount collisions: ${collisions.map((row) => esc(row.bits != null ? `${row.bits} Bits (${(row.skus || []).join(", ")})` : JSON.stringify(row))).join(" · ")}</p>` : ""}
        <div class="links">
          <button type="button" id="pack-add">Add content</button>
          <button type="button" class="secondary" id="pack-preview">Preview Mart + stream</button>
          <button type="submit" class="secondary">Save draft</button>
          <button type="button" id="pack-publish">Publish</button>
        </div>
      </form>
      <div id="pack-preview-wrap" class="studio-preview-pair" hidden>
        <aside id="pack-preview-card" class="mart-item studio-preview-card"></aside>
        <aside id="pack-preview-alert" class="studio-alert-preview"></aside>
      </div>`;
  }

  function packFromForm() {
    const currency = document.getElementById("pack-currency")?.value || "coins";
    const price = Number(String(document.getElementById("pack-price")?.value || "0").replace(/,/g, "")) || 0;
    state.pack.name = document.getElementById("pack-name")?.value.trim() || "";
    state.pack.sku = document.getElementById("pack-sku")?.value.trim() || "";
    state.pack.blurb = document.getElementById("pack-blurb")?.value || "";
    state.pack.detail = document.getElementById("pack-detail")?.value || "";
    state.pack.categoryId = document.getElementById("pack-cat")?.value || "";
    state.pack.currency = currency;
    state.pack.cost = currency === "coins" ? price : 0;
    state.pack.bits = currency === "bits" ? price : 0;
    state.pack.status = document.getElementById("pack-status")?.value || "draft";
    state.pack.featured = Boolean(document.getElementById("pack-featured")?.checked);
    const titles = document.getElementById("pack-bits-titles")?.value || "";
    state.pack.bitsTitles = titles.split(/\r?\n/).map((row) => row.trim()).filter(Boolean);
    return state.pack;
  }

  function previewPackHtml(p) {
    const lines = typeof window.playGrantLines === "function" ? window.playGrantLines(p.grants) : [];
    const price = p.currency === "bits" ? `${money(p.bits)} Bits` : `${money(p.cost)} PokéCoins`;
    return `<div class="mart-sprite"><img src="${esc(itemArt(p.sprite || "pack-thumb.png"))}" alt=""></div>
      <div class="mart-copy">
        <p class="eyebrow">Mart / player card</p>
        <strong>${esc(p.name || "Untitled pack")}</strong>
        <p class="mart-purpose">${esc(p.blurb || (p.currency === "bits" ? "Guaranteed contents. Not a random pack." : "Guaranteed Trainer supplies."))}</p>
        <p class="muted">${p.status === "draft" ? "Draft — not live" : "Live"}</p>
      </div>
      <ul class="mart-grants">${lines.map((line) => `<li><img src="${esc(line.sprite)}" alt=""><span>${esc(line.label)}</span></li>`).join("")}</ul>
      <div class="mart-foot"><span class="mart-cost">${esc(price)}</span></div>`;
  }

  function previewAlertHtml(p) {
    const lines = typeof window.playGrantLines === "function" ? window.playGrantLines(p.grants) : [];
    return `<p class="support-kicker">SUPPORT RECEIVED!</p>
      <p>A supporter supported with ${money(p.bits || 0)} Bits!</p>
      <p><strong>${esc(p.name || "Starlight pack")}</strong></p>
      <ul>${lines.map((line) => `<li>${esc(line.label)}</li>`).join("")}</ul>
      <p>Added to Trainer inventory. THANK YOU! ★</p>`;
  }

  async function savePack(publish) {
    const p = packFromForm();
    if (!p.name) {
      note("Name the pack first.");
      return;
    }
    if (!Object.values(p.grants).some((n) => Number(n) > 0)) {
      note("Add at least one item.");
      return;
    }
    const sku = p.sku || p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
    const status = publish ? "published" : "draft";
    const bits = p.currency === "bits";
    if (bits && publish && p.bits < 1) {
      note("Live Bits products need a Bits cost greater than 0.");
      return;
    }
    if (bits && publish && !(p.bitsTitles || []).length) {
      note("Live Bits products need at least one Twitch Power-Up title.");
      return;
    }
    note(publish ? "Publishing pack…" : "Saving draft…");
    const data = await window.playCall("admin_store_save_item", {
      p_row: {
        sku,
        categoryId: p.categoryId,
        name: p.name,
        blurb: p.blurb,
        detail: p.detail,
        cost: p.cost,
        bits: p.bits,
        grants: p.grants,
        sprite: p.sprite || "pack-thumb.png",
        thumb: p.sprite || "pack-thumb.png",
        featured: p.featured,
        visible: true,
        status,
        productKind: bits ? "bits" : "pack",
        bitsTitles: p.bitsTitles || [],
        extra: {
          productKind: bits ? "bits" : "pack",
          status,
          detail: p.detail,
          bitsTitles: p.bitsTitles || []
        }
      }
    });
    state.pack.sku = data.sku || sku;
    state.pack.status = status;
    const collisions = Array.isArray(data.bitsCollisions) ? data.bitsCollisions : [];
    note((data.message || (publish ? "Pack published." : "Draft saved.")) + (collisions.length ? " Warning: live Bits amounts collide." : ""));
    await reloadStudio();
  }

  function renderAvatars() {
    const el = document.getElementById("studio-avatars");
    if (!el) return;
    const looks = state.studio?.looks || [];
    const missing = looks.filter((row) => row.visible !== false && !row.portrait);
    el.innerHTML = `
      <div class="links">
        <label class="store-upload-file" for="avatar-sprite-upload">Upload full sprite
          <input id="avatar-sprite-upload" type="file" accept="image/png,image/webp,image/gif,image/jpeg">
        </label>
        <label class="store-upload-file" for="avatar-portrait-upload">Upload portrait
          <input id="avatar-portrait-upload" type="file" accept="image/png,image/webp,image/gif,image/jpeg">
        </label>
        <button type="button" id="avatar-generate"${missing.length ? "" : " disabled"}>Generate missing portraits (${missing.length})</button>
      </div>
      <p id="avatar-upload-status" class="muted" role="status"></p>
      <div class="studio-avatar-grid">
        ${looks.map((look) => `
          <button class="studio-avatar-card${look.portrait ? "" : " is-missing"}" type="button" data-look-id="${esc(look.id)}">
            <img src="${esc(lookPortrait(look))}" alt="">
            <strong>${esc(look.name || look.id)}</strong>
            <span>${esc(look.pack || look.groupLabel || "unassigned")}</span>
            <em>${look.portrait ? "Has portrait" : "Needs portrait"}</em>
          </button>`).join("") || `<p class="muted">No Trainer looks yet.</p>`}
      </div>`;
  }

  function renderPass() {
    const el = document.getElementById("studio-pass");
    if (!el) return;
    const rewards = state.studio?.passRewards || {};
    state.passDaily = { ...(rewards.daily || {}) };
    state.passWeekly = { ...(rewards.weekly || {}) };
    el.innerHTML = `
      <div class="studio-pass-cols">
        <section>
          <h3>Daily gift</h3>
          ${grantChips(state.passDaily)}
          <button type="button" data-pass-add="daily">Add reward</button>
        </section>
        <section>
          <h3>Weekly crate</h3>
          ${grantChips(state.passWeekly)}
          <button type="button" data-pass-add="weekly">Add reward</button>
        </section>
      </div>
      <div class="links"><button type="button" id="pass-save">Save Pass rewards</button></div>`;
  }

  function renderAssets() {
    const el = document.getElementById("studio-assets");
    if (!el) return;
    const assets = state.studio?.assets || [];
    el.innerHTML = `
      <div class="sprite-grid studio-asset-grid">
        ${assets.map((row) => `
          <figure class="sprite-pick">
            <img src="${esc(itemArt(row.filename))}" alt="">
            <figcaption>${esc(row.label || row.filename)} · ${esc(row.kind || "item")}</figcaption>
          </figure>`).join("") || `<p class="muted">No assets registered yet.</p>`}
      </div>`;
  }

  async function openItem(key) {
    const row = (state.library || []).find((item) => item.key === key);
    if (!row) return;
    const modal = document.getElementById("studio-item-modal");
    document.getElementById("studio-item-title").textContent = row.name;
    const conditions = ["NONE", "TARGET_TYPE", "NIGHT", "PLAYER_OWNS_SPECIES", "THROW_EARLY", "THROW_LATE", "TRAINER_LEVEL_GTE", "TARGET_GENDERED", "SPECIES_CATCH_RATE_MIN", "SPECIES_BASE_SPEED_MIN", "MOON_STONE_FAMILY", "SPECIES_WEIGHT_TIERS"];
    document.getElementById("studio-item-body").innerHTML = `
      <div class="studio-item-detail">
        <img src="${esc(itemArt(row.icon || row.key))}" alt="">
        <p><strong>Player:</strong> ${esc(row.playerText)}</p>
        <p><strong>Admin:</strong> ${esc(row.adminText)}</p>
        <p>Best use: ${esc(row.bestUse || "—")}</p>
      </div>
      <form id="item-identity-form" class="store-editor-form">
        <label class="field">Name <input name="name" value="${esc(row.name)}"></label>
        <label class="field">Player description <textarea name="description" rows="3">${esc(row.playerText || "")}</textarea></label>
        <label class="field">Rarity <input name="rarity" value="${esc(row.rarity || "")}"></label>
        ${row.category === "balls" ? `<label class="field">Condition
          <select name="conditionType">${conditions.map((c) => `<option${c === row.condition ? " selected" : ""}>${c}</option>`).join("")}</select>
        </label>
        <label class="field">Base multiplier <input name="baseMultiplier" type="number" step="0.05" min="0.5" max="5" value="${esc(row.baseEffect || 1)}"></label>
        <label class="field">Conditional multiplier <input name="conditionalMultiplier" type="number" step="0.05" min="0.5" max="5" value="${esc(row.effect || 1)}"></label>` : `
        <label class="field">Catch multiplier <input name="baseMultiplier" type="number" step="0.05" min="1" max="2" value="${esc(row.effect || 1)}"></label>
        <label class="field">Reward bonus <input name="rewardBonus" type="number" step="0.05" min="0" max="2" value="${esc(row.rewardBonus || 0)}"></label>`}
        <label class="field">Shop price <input name="shopPrice" type="number" min="0" step="1" value="${esc(row.shopPrice || 0)}"></label>
        <label class="field field-check"><input name="storeEnabled" type="checkbox"${row.storeAvailable !== false ? " checked" : ""}> Store available</label>
        <button type="submit">Save identity</button>
      </form>`;
    modal.querySelector("#item-identity-form").onsubmit = async (event) => {
      event.preventDefault();
      const form = event.target;
      const payload = {
        name: form.name.value,
        description: form.description.value,
        rarity: form.rarity.value,
        conditionType: form.conditionType?.value,
        baseMultiplier: Number(form.baseMultiplier.value),
        conditionalMultiplier: form.conditionalMultiplier ? Number(form.conditionalMultiplier.value) : undefined,
        rewardBonus: form.rewardBonus ? Number(form.rewardBonus.value) : undefined,
        shopPrice: Number(form.shopPrice.value),
        storeEnabled: form.storeEnabled.checked
      };
      try {
        const data = await window.playCall("admin_save_item_identity", { p_key: key, p_row: payload });
        note(data.message || "Item saved.");
        modal.close();
        await loadLibrary();
      } catch (error) {
        note(window.playRpcError(error));
      }
    };
    modal.showModal?.();
  }

  async function uploadKind(file, kind, statusEl) {
    if (!file) return null;
    statusEl.textContent = "Uploading…";
    const reader = await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result || ""));
      fr.onerror = () => reject(new Error("Could not read that file."));
      fr.readAsDataURL(file);
    });
    const comma = reader.indexOf(",");
    const filename = String(file.name || "sprite.png").toLowerCase().replace(/[^a-z0-9._-]+/g, "-").slice(0, 80);
    const { data, error } = await supabase.functions.invoke("store-asset", {
      body: {
        filename,
        mime: file.type || "image/png",
        contentBase64: comma >= 0 ? reader.slice(comma + 1) : reader,
        label: filename.replace(/\.[^.]+$/, ""),
        kind
      }
    });
    if (error || data?.ok === false) {
      statusEl.textContent = data?.message || error?.message || "Upload failed.";
      return null;
    }
    statusEl.textContent = data.message || "Uploaded.";
    return data;
  }

  async function openCrop(look) {
    state.look = look;
    const modal = document.getElementById("studio-crop-modal");
    const full = document.getElementById("crop-full");
    full.src = lookSprite(look);
    document.getElementById("crop-kind").value = look.assetKind || "pixel";
    const paint = async () => {
      try {
        const img = await window.playLoadImage(full.src);
        const rendered = window.playPortraitRender(img, {
          zoom: Number(document.getElementById("crop-zoom").value) / 100,
          x: Number(document.getElementById("crop-x").value) / 100,
          y: Number(document.getElementById("crop-y").value) / 100,
          kind: document.getElementById("crop-kind").value
        });
        const preview = document.getElementById("crop-preview");
        const ctx = preview.getContext("2d");
        ctx.imageSmoothingEnabled = !rendered.pixel;
        ctx.clearRect(0, 0, 256, 256);
        ctx.drawImage(rendered.canvas, 0, 0);
        state.crop.canvas = rendered.canvas;
        state.crop.pixel = rendered.pixel;
      } catch (error) {
        document.getElementById("crop-status").textContent = error.message || "Could not crop.";
      }
    };
    ["crop-zoom", "crop-x", "crop-y", "crop-kind"].forEach((id) => {
      document.getElementById(id).oninput = paint;
      document.getElementById(id).onchange = paint;
    });
    document.getElementById("crop-save").onclick = async () => {
      const status = document.getElementById("crop-status");
      if (!state.crop.canvas) {
        status.textContent = "Adjust the crop first.";
        return;
      }
      status.textContent = "Saving portrait…";
      const blob = await window.playPortraitBlob(state.crop.canvas);
      const file = new File([blob], `${look.id}-portrait.png`, { type: "image/png" });
      const uploaded = await uploadKind(file, "portrait", status);
      if (!uploaded) return;
      const saved = await window.playCall("admin_save_look_portrait", {
        p_id: look.id,
        p_file: uploaded.filename || `${look.id}-portrait.png`,
        p_crop: {
          zoom: Number(document.getElementById("crop-zoom").value) / 100,
          x: Number(document.getElementById("crop-x").value) / 100,
          y: Number(document.getElementById("crop-y").value) / 100
        },
        p_kind: document.getElementById("crop-kind").value
      });
      note(saved.message || "Portrait saved.");
      modal.close();
      await reloadStudio();
      renderAvatars();
    };
    modal.showModal?.();
    paint();
  }

  async function generateMissing() {
    const looks = (state.studio?.looks || []).filter((row) => row.visible !== false && !row.portrait);
    const status = document.getElementById("avatar-upload-status");
    if (!looks.length) {
      if (status) status.textContent = "Every visible look already has a portrait.";
      return;
    }
    if (status) status.textContent = `Generating ${looks.length} portraits…`;
    let done = 0;
    for (const look of looks) {
      try {
        const img = await window.playLoadImage(lookSprite(look));
        const rendered = window.playPortraitRender(img, { kind: look.assetKind || "pixel" });
        const blob = await window.playPortraitBlob(rendered.canvas);
        const file = new File([blob], `${look.id}-portrait.png`, { type: "image/png" });
        const uploaded = await uploadKind(file, "portrait", status);
        if (uploaded?.filename) {
          await window.playCall("admin_save_look_portrait", {
            p_id: look.id,
            p_file: uploaded.filename,
            p_crop: {},
            p_kind: look.assetKind || "pixel"
          });
          done += 1;
        }
      } catch (_) {}
    }
    await reloadStudio();
    renderAvatars();
    if (status) status.textContent = `Saved ${done} portraits. Original sprites were not changed.`;
  }

  staff.addEventListener("click", async (event) => {
    const tab = event.target.closest("[data-studio-view]");
    if (tab) {
      setView(tab.dataset.studioView);
      return;
    }
    const go = event.target.closest("[data-studio-go]");
    if (go) {
      setView(go.dataset.studioGo);
      if (go.dataset.studioNew === "item") document.getElementById("item-add")?.click();
      if (go.dataset.studioNew === "pack") {
        state.pack = { sku: "", name: "Trainer Starter Pack", blurb: "Guaranteed supplies for a new Trainer.", detail: "", cost: 5000, bits: 0, currency: "coins", featured: false, status: "draft", grants: {}, sprite: "pack-thumb.png", categoryId: (state.studio?.categories || []).find((c) => c.kind === "coins")?.id || "", bitsTitles: [] };
        renderPack();
      }
      if (go.dataset.studioGo === "bits") {
        state.pack = { sku: "", name: "Starlight Support Pack", blurb: "Guaranteed convenience for stream support. Not a random pack.", detail: "Draft. Contents listed before support.", cost: 0, bits: 175, currency: "bits", featured: false, status: "draft", grants: {}, sprite: "amulet-coin.png", categoryId: (state.studio?.categories || []).find((c) => c.kind === "bits")?.id || "", bitsTitles: ["starlight support pack"] };
        renderPack();
      }
      return;
    }
    const item = event.target.closest("[data-item-key]");
    if (item) {
      openItem(item.dataset.itemKey);
      return;
    }
    if (event.target.id === "pack-add") {
      const picked = await window.playContentPicker?.open({ title: "Add pack content", kind: "items" });
      if (picked?.key) {
        packFromForm();
        state.pack.grants[picked.key] = Number(state.pack.grants[picked.key] || 0) + Number(picked.qty || 1);
        renderPack();
      }
      return;
    }
    const remove = event.target.closest("[data-remove-grant]");
    if (remove) {
      if (state.view === "packs" || state.view === "bits") {
        packFromForm();
        delete state.pack.grants[remove.dataset.removeGrant];
        renderPack();
      } else if (state.view === "pass") {
        delete state.passDaily[remove.dataset.removeGrant];
        delete state.passWeekly[remove.dataset.removeGrant];
        renderPass();
      }
      return;
    }
    if (event.target.id === "pack-preview") {
      packFromForm();
      const wrap = document.getElementById("pack-preview-wrap");
      const card = document.getElementById("pack-preview-card");
      const alert = document.getElementById("pack-preview-alert");
      if (wrap) wrap.hidden = false;
      if (card) card.innerHTML = previewPackHtml(state.pack);
      if (alert) alert.innerHTML = previewAlertHtml(state.pack);
      return;
    }
    if (event.target.id === "pack-publish") {
      try { await savePack(true); renderPack(); } catch (error) { note(window.playRpcError(error)); }
      return;
    }
    if (event.target.id === "avatar-generate") {
      generateMissing();
      return;
    }
    const lookBtn = event.target.closest("[data-look-id]");
    if (lookBtn) {
      const look = (state.studio?.looks || []).find((row) => row.id === lookBtn.dataset.lookId);
      if (look) openCrop(look);
      return;
    }
    const passAdd = event.target.closest("[data-pass-add]");
    if (passAdd) {
      const picked = await window.playContentPicker?.open({ title: "Add Pass reward", kind: "items" });
      if (picked?.key) {
        const bag = passAdd.dataset.passAdd === "weekly" ? state.passWeekly : state.passDaily;
        bag[picked.key] = Number(bag[picked.key] || 0) + Number(picked.qty || 1);
        renderPass();
      }
      return;
    }
    if (event.target.id === "pass-save") {
      try {
        const data = await window.playCall("admin_save_pass_rewards", { p_daily: state.passDaily, p_weekly: state.passWeekly });
        note(data.message || "Pass rewards saved.");
        await reloadStudio();
        renderPass();
      } catch (error) {
        note(window.playRpcError(error));
      }
    }
  });

  staff.addEventListener("submit", async (event) => {
    if (event.target.id !== "pack-form") return;
    event.preventDefault();
    try { await savePack(false); } catch (error) { note(window.playRpcError(error)); }
  });

  staff.addEventListener("input", (event) => {
    if (event.target.id === "lib-q") {
      state.libQ = event.target.value;
      clearTimeout(state.libTimer);
      state.libTimer = setTimeout(loadLibrary, 200);
    }
  });
  staff.addEventListener("change", (event) => {
    if (event.target.id === "lib-cat") {
      state.libCat = event.target.value;
      loadLibrary();
    }
    if (event.target.id === "avatar-sprite-upload") {
      const file = event.target.files?.[0];
      event.target.value = "";
      uploadKind(file, "trainer", document.getElementById("avatar-upload-status")).then(async (data) => {
        if (!data?.filename) return;
        const id = String(data.filename).replace(/\.[^.]+$/, "");
        await window.playCall("admin_store_save_look", {
          p_row: { id, name: id.replace(/[-_]+/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase()), pack: "", groupKey: "custom", groupLabel: "Custom" }
        });
        await reloadStudio();
        renderAvatars();
      });
    }
    if (event.target.id === "avatar-portrait-upload") {
      const file = event.target.files?.[0];
      event.target.value = "";
      const look = state.look || (state.studio?.looks || [])[0];
      if (!look) {
        note("Open a Trainer look first, then upload its portrait.");
        return;
      }
      uploadKind(file, "portrait", document.getElementById("avatar-upload-status")).then(async (data) => {
        if (!data?.filename) return;
        await window.playCall("admin_save_look_portrait", { p_id: look.id, p_file: data.filename, p_crop: {}, p_kind: "pixel" });
        await reloadStudio();
        renderAvatars();
      });
    }
  });

  ensureShell();
  (async () => {
    try {
      await reloadStudio();
      setView("overview");
    } catch (_) {
      setView("overview");
    }
  })();
})();
