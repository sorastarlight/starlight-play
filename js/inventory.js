(() => {
  const supabase = window.playSupabase;
  const els = {
    gate: document.getElementById("gate"),
    trainer: document.getElementById("trainer"),
    bag: document.getElementById("bag-grid"),
    capacity: document.getElementById("capacity-note"),
    capacityBar: document.getElementById("capacity-bar"),
    status: document.getElementById("inv-status"),
    lurePanel: document.getElementById("lure-panel"),
    ledger: document.getElementById("item-ledger"),
    tabs: document.getElementById("bag-tabs"),
    search: document.getElementById("bag-search"),
    sort: document.getElementById("bag-sort"),
    detail: document.getElementById("item-detail"),
    detailBody: document.getElementById("item-detail-body"),
    wallet: document.getElementById("bag-wallet")
  };
  let invChannel = null;
  let lastBag = {};
  let lastCapture = null;
  let lastCollection = null;
  let lastLedgerOrder = [];
  let tab = "all";
  let selectedKey = "";
  const TABS = [
    ["all", "All"],
    ["balls", "Poké Balls"],
    ["community", "Medicine / Supplies"],
    ["berries", "Berries"],
    ["evolution", "Evolution"],
    ["special", "Key / Special"],
    ["valuables", "Other"]
  ];
  const HIGHLIGHT = new Set([
    "masterball", "rarecandy", "firestone", "waterstone", "thunderstone",
    "leafstone", "moonstone", "linkingcord", "bait", "lure", "nugget", "bignugget"
  ]);

  window.playBindAccountNav({
    onSignOut() {
      els.trainer.hidden = true;
      window.playRestoreGate(els.gate, "Sign in to open your inventory.");
    }
  });

  function allKeys(bag) {
    const keys = new Set(["bait", "lure", "rarecandy", "firestone", "waterstone", "thunderstone", "leafstone", "moonstone", "linkingcord", "stardust", "pearl", "starpiece", "nugget", "bigpearl", "bignugget"]);
    (window.PLAY_BALLS || []).forEach((row) => keys.add(row.key));
    (window.playBerryCatalog?.(lastCapture) || window.PLAY_BERRIES || []).forEach((row) => keys.add(row.key));
    Object.keys(bag || {}).forEach((key) => {
      if (!["capacity", "used", "lureArmed", "lureUntil", "coins"].includes(key)) keys.add(key);
    });
    return [...keys];
  }

  function pocketOf(key) {
    const cat = window.playItemCategory(key);
    if (cat === "balls") return "balls";
    if (cat === "berries") return "berries";
    if (cat === "community") return "community";
    if (cat === "evolution") return "evolution";
    if (cat === "valuables") return "valuables";
    return "special";
  }

  function walletHtml(bag) {
    const coins = Number(bag?.coins || 0);
    const used = Number(bag?.used || 0);
    const cap = Number(bag?.capacity || 0);
    const pct = cap ? Math.min(100, Math.round((used / cap) * 100)) : 0;
    const mark = typeof window.playItemSprite === "function"
      ? window.playItemSprite("coins")
      : "images/items/pokecoin.png";
    const bagArt = "images/items/inventory-bag.png";
    return `<section class="bag-hero" aria-label="My Inventory summary">
      <div class="bag-hero-identity">
        <img class="bag-hero-art" src="${bagArt}" alt="" width="56" height="56" decoding="async">
        <div>
          <p class="eyebrow">Trainer Bag</p>
          <h3 class="bag-hero-title">My Inventory</h3>
        </div>
      </div>
      <div class="bag-hero-stats">
        <div class="bag-hero-coin">
          <img class="poke-cash-mark" src="${mark}" alt="" width="22" height="22" decoding="async">
          <strong>${window.playFormatCoins?.(coins) ?? coins}</strong>
          <span>PokéCoins</span>
        </div>
        <div class="bag-hero-cap">
          <div class="bag-hero-cap-row">
            <span>Capacity</span>
            <strong>${used.toLocaleString()} / ${cap.toLocaleString()}</strong>
          </div>
          <div class="bag-space" aria-hidden="true"><i style="width:${pct}%"></i></div>
        </div>
      </div>
    </section>`;
  }

  function itemCardHtml(row) {
    const key = row.key;
    const qty = row.qty;
    const name = window.playItemLabel(key);
    const blurb = window.playItemPlayerText(key, lastCapture);
    const pocket = TABS.find((t) => t[0] === pocketOf(key))?.[1] || "Items";
    const isNew = window.playIsNewItem?.(key, qty, { recentKeys: lastLedgerOrder.slice(0, 8) });
    const pinned = (window.playBagPins?.() || []).includes(key);
    const hot = HIGHLIGHT.has(key);
    const on = selectedKey === key;
    return `<button type="button" class="bag-item${hot ? " is-hot" : ""}${on ? " is-selected" : ""}${qty < 1 ? " is-empty" : ""}" data-item="${key}" aria-pressed="${on}">
      <span class="bag-item-sprite"><img class="item-sprite" src="${window.playItemSprite(key)}" alt="" width="40" height="40" loading="lazy" decoding="async"></span>
      <span class="bag-item-copy">
        <strong class="bag-item-name">${window.playEscapeAttr(name)}${isNew ? ` <span class="chip chip-new">NEW</span>` : ""}${pinned ? ` <span class="chip">PINNED</span>` : ""}</strong>
        <span class="bag-item-meta">${window.playEscapeAttr(pocket)}</span>
        <span class="muted bag-item-blurb">${window.playEscapeAttr(blurb)}</span>
      </span>
      <span class="bag-item-qty" aria-label="Quantity ${qty}">×${Number(qty || 0).toLocaleString()}</span>
    </button>`;
  }

  function detailPaneHtml(key, bag) {
    if (!key) {
      return `<aside class="bag-detail is-empty" aria-label="Item detail">
        <div class="bag-detail-empty">
          <img src="images/items/inventory-bag.png" alt="" width="72" height="72" decoding="async">
          <p><strong>Choose an item to inspect</strong></p>
          <p class="muted">Pick something from your Bag pockets to see details.</p>
        </div>
      </aside>`;
    }
    const qty = Number(bag[key] || 0);
    return `<aside class="bag-detail" aria-label="Item detail">
      ${window.playItemDetailHtml(key, qty, lastCapture)}
      <div class="links">
        <button type="button" class="secondary" data-pin-item="${key}">${(window.playBagPins?.() || []).includes(key) ? "Unpin" : "Pin in Bag"}</button>
        <a class="button secondary" href="./store.html">Open Mart</a>
      </div>
    </aside>`;
  }

  function renderBag(bag) {
    lastBag = bag || {};
    const pins = window.playBagPins?.() || [];
    const showUnowned = false;
    const query = String(els.search?.value || "").trim().toLowerCase();
    const sort = els.sort?.value || "category";
    window.playFillBagMeter(bag);
    window.playFillLurePanel(bag);
    if (els.wallet) els.wallet.innerHTML = walletHtml(bag);
    if (els.tabs) {
      els.tabs.innerHTML = TABS.map(([id, label]) => (
        `<button type="button" class="mart-tab bag-pocket${tab === id ? " is-on" : ""}" data-bag-tab="${id}" aria-pressed="${tab === id}">${label}</button>`
      )).join("");
    }
    const rows = allKeys(bag)
      .map((key) => ({ key, qty: Number(bag[key] || 0), pocket: pocketOf(key) }))
      .filter((row) => tab === "all" || row.pocket === tab)
      .filter((row) => showUnowned || row.qty > 0 || pins.includes(row.key))
      .filter((row) => !query || window.playItemLabel(row.key).toLowerCase().includes(query) || row.key.includes(query));
    rows.sort((a, b) => {
      if (sort === "quantity") return b.qty - a.qty || a.key.localeCompare(b.key);
      if (sort === "name") return window.playItemLabel(a.key).localeCompare(window.playItemLabel(b.key));
      if (sort === "recent") {
        const idx = (key) => {
          const i = lastLedgerOrder.indexOf(key);
          return i < 0 ? 999 : i;
        };
        return idx(a.key) - idx(b.key) || b.qty - a.qty;
      }
      if (pins.includes(a.key) !== pins.includes(b.key)) return pins.includes(a.key) ? -1 : 1;
      if (HIGHLIGHT.has(a.key) !== HIGHLIGHT.has(b.key)) return HIGHLIGHT.has(a.key) ? -1 : 1;
      return a.pocket.localeCompare(b.pocket) || a.key.localeCompare(b.key);
    });
    if (selectedKey && !rows.some((row) => row.key === selectedKey)) selectedKey = rows[0]?.key || "";
    const pocketLabel = TABS.find((row) => row[0] === tab)?.[1] || "Items";
    const list = rows.length
      ? `<div class="bag-item-list">${rows.map((row) => itemCardHtml(row)).join("")}</div>`
      : `<p class="muted bag-empty">${showUnowned
        ? "No items match this filter."
        : tab === "all"
          ? "Your bag is empty. Visit the Mart or join encounters to fill it."
          : `Nothing in the ${pocketLabel} pocket yet.`}</p>`;
    const tip = tab === "evolution" && rows.some((row) => Number(bag[row.key] || 0) > 0 && ["firestone", "waterstone", "thunderstone", "leafstone", "moonstone"].includes(row.key))
      ? window.playTipHtml?.("first-stone", "Evolution Items can be used with Evolution Candy to evolve eligible Pokémon along their Evolution Line.")
      : tab === "community" && Number(bag.bait || 0) > 0
        ? window.playTipHtml?.("first-honey", "Honey is a community contribution. It helps the shared encounter, does not replace your Poké Ball, and does not guarantee a catch.")
        : "";
    els.bag.innerHTML = `
      ${els.wallet ? "" : walletHtml(bag)}
      ${tip || ""}
      <div class="bag-layout">
        <section class="bag-main" aria-label="${pocketLabel}">
          <header class="bag-main-head">
            <h3>${pocketLabel}</h3>
            <p class="muted">${rows.length} item${rows.length === 1 ? "" : "s"}</p>
          </header>
          ${list}
        </section>
        ${detailPaneHtml(selectedKey, bag)}
      </div>`;
  }

  function openDetail(key) {
    if (!key) return;
    selectedKey = key;
    window.playMarkItemSeen?.(key);
    renderBag(lastBag);
    if (els.detail && els.detailBody && window.matchMedia("(max-width: 780px)").matches) {
      els.detailBody.innerHTML = `${window.playItemDetailHtml(key, lastBag[key] || 0, lastCapture)}
        <div class="links">
          <button type="button" class="secondary" data-pin-item="${key}">${(window.playBagPins?.() || []).includes(key) ? "Unpin" : "Pin in Bag"}</button>
          <a class="button secondary" href="./store.html">Open Mart</a>
        </div>`;
      if (typeof els.detail.showModal === "function") els.detail.showModal();
      else els.detail.setAttribute("open", "");
    }
  }

  async function load() {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session) {
      els.trainer.hidden = true;
      window.playRestoreGate(els.gate, "Sign in to open your inventory.");
      window.playSetAccountNav(null);
      return;
    }
    window.playSetLoadingGate(els.gate, els.trainer, { soft: !els.trainer?.hidden });
    const { data: profile } = await supabase.from("profiles").select("display_name, twitch_login, avatar_url").eq("id", session.user.id).maybeSingle();
    let snapshot = null;
    try {
      snapshot = await window.playCall("play_state");
    } catch (_) {
      snapshot = null;
    }
    window.playSetAccountNav(session, profile, { isAdmin: Boolean(snapshot?.isAdmin), trainer: snapshot?.trainer });
    lastCapture = snapshot?.captureItems || null;
    let bag = snapshot?.bag || {};
    try {
      lastCollection = await window.playCall("play_collection");
      bag = { ...bag, ...(lastCollection?.items || {}) };
    } catch (_) {}
    window.playSeedSeenBag?.(bag);
    renderBag(bag);
    const candyFirst = (lastCollection?.candy || []).find((row) => Number(row.qty || 0) > 0);
    if (candyFirst && typeof window.playTipHtml === "function" && !window.playTipDone("first-candy")) {
      els.status.innerHTML = window.playTipHtml("first-candy", `You earned ${candyFirst.name} Evolution Candy! Catch Pokémon from the same Evolution Line to earn more Candy for evolution.`);
    }
    try {
      const hist = await window.playCall("play_item_ledger", { p_limit: 20 });
      const rows = hist?.rows || [];
      lastLedgerOrder = [...new Set(rows.map((row) => row.item).filter(Boolean))];
      if (els.ledger) {
        els.ledger.innerHTML = rows.length
          ? `<table class="report-table"><thead><tr><th>Item</th><th>Qty</th><th>Source</th></tr></thead><tbody>${
            rows.map((row) => `<tr><td>${window.playEscapeAttr(window.playItemLabel(row.item))}</td><td>${row.amount > 0 ? "+" : ""}${row.amount}</td><td>${window.playEscapeAttr(window.playLedgerLabel?.(row.reason) || row.reason)}</td></tr>`).join("")
          }</tbody></table>`
          : `<p class="muted">No item history yet.</p>`;
      }
      renderBag(bag);
    } catch (_) {
      if (els.ledger) els.ledger.innerHTML = "";
    }
    els.gate.hidden = true;
    els.trainer.hidden = false;
    if (invChannel) supabase.removeChannel(invChannel);
    invChannel = supabase.channel("play-inv")
      .on("postgres_changes", { event: "*", schema: "public", table: "inventories", filter: `user_id=eq.${session.user.id}` }, async () => {
        try {
          const snap = await window.playCall("play_state");
          lastCapture = snap?.captureItems || lastCapture;
          let nextBag = snap?.bag || {};
          try {
            const collection = await window.playCall("play_collection");
            nextBag = { ...nextBag, ...(collection?.items || {}) };
          } catch (_) {}
          renderBag(nextBag);
        } catch (_) {}
      })
      .subscribe();
  }

  window.playBindLureButton((data) => {
    renderBag(data.bag);
  });
  window.playBindTips?.(document.body);

  els.tabs?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-bag-tab]");
    if (!btn) return;
    tab = btn.dataset.bagTab;
    selectedKey = "";
    renderBag(lastBag);
  });
  els.search?.addEventListener("input", () => renderBag(lastBag));
  els.sort?.addEventListener("change", () => renderBag(lastBag));
  els.bag?.addEventListener("click", (event) => {
    const pin = event.target.closest("[data-pin-item]");
    if (pin) {
      window.playToggleBagPin?.(pin.dataset.pinItem);
      openDetail(pin.dataset.pinItem);
      return;
    }
    const row = event.target.closest("[data-item]");
    if (row) openDetail(row.dataset.item);
  });
  els.detail?.addEventListener("click", (event) => {
    const pin = event.target.closest("[data-pin-item]");
    if (!pin) return;
    window.playToggleBagPin?.(pin.dataset.pinItem);
    openDetail(pin.dataset.pinItem);
  });

  supabase.auth.onAuthStateChange((event, session) => { if (window.playAuthNoise(event, session)) return; load(); });
  load();
})();
