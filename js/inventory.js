(() => {
  const supabase = window.playSupabase;
  const els = {
    gate: document.getElementById("gate"),
    trainer: document.getElementById("trainer"),
    card: document.getElementById("trainer-card"),
    bag: document.getElementById("bag-grid"),
    capacity: document.getElementById("capacity-note"),
    capacityBar: document.getElementById("capacity-bar"),
    status: document.getElementById("inv-status"),
    lurePanel: document.getElementById("lure-panel"),
    ledger: document.getElementById("item-ledger"),
    tabs: document.getElementById("bag-tabs"),
    search: document.getElementById("bag-search"),
    sort: document.getElementById("bag-sort"),
    unowned: document.getElementById("bag-unowned"),
    detail: document.getElementById("item-detail"),
    detailBody: document.getElementById("item-detail-body")
  };
  let invChannel = null;
  let lastBag = {};
  let lastCapture = null;
  let lastCollection = null;
  let lastLedgerOrder = [];
  let tab = "balls";
  const TABS = [
    ["balls", "Poké Balls"],
    ["berries", "Berries"],
    ["community", "Community Items"],
    ["evolution", "Evolution Items"],
    ["valuables", "Valuables"],
    ["special", "Special Items"]
  ];

  window.playBindAccountNav({
    onSignOut() {
      els.trainer.hidden = true;
      window.playRestoreGate(els.gate, "Sign in to open your inventory.");
    }
  });

  function renderCard(trainer) {
    if (!trainer) {
      els.card.innerHTML = "";
      return;
    }
    const pct = Math.max(0, Math.min(100, Math.round((trainer.xpInto / Math.max(1, trainer.xpNeed)) * 100)));
    els.card.innerHTML = `
      ${window.playTwitchFaceHtml(trainer.avatar, trainer.displayName, "twitch-face-hero")}
      <div>
        <h2>${window.playEscapeAttr(trainer.displayName)}</h2>
        <p class="muted">@${window.playEscapeAttr(trainer.login || "trainer")} · ${trainer.online ? "Online on Play" : "Away"}</p>
        <p><strong>Lv. ${trainer.level}</strong> · ${trainer.caught} caught · ${trainer.species}/${window.playNationalTotal?.() || "?"} · ${window.playWatchHours(trainer.watchSeconds)} watched</p>
        <div class="xp-bar" aria-hidden="true"><i style="width:${pct}%"></i></div>
      </div>`;
  }

  function allKeys(bag) {
    const keys = new Set(["coins", "bait", "lure", "rarecandy", "firestone", "waterstone", "thunderstone", "leafstone", "moonstone", "linkingcord", "stardust", "pearl", "starpiece", "nugget", "bigpearl", "bignugget"]);
    (window.PLAY_BALLS || []).forEach((row) => keys.add(row.key));
    (window.playBerryCatalog?.(lastCapture) || window.PLAY_BERRIES || []).forEach((row) => keys.add(row.key));
    Object.keys(bag || {}).forEach((key) => {
      if (!["capacity", "used", "lureArmed", "lureUntil"].includes(key)) keys.add(key);
    });
    return [...keys];
  }

  function renderBag(bag) {
    lastBag = bag || {};
    const pins = window.playBagPins?.() || [];
    const showUnowned = Boolean(els.unowned?.checked);
    const query = String(els.search?.value || "").trim().toLowerCase();
    const sort = els.sort?.value || "category";
    window.playFillBagMeter(bag);
    window.playFillLurePanel(bag);
    if (els.tabs) {
      els.tabs.innerHTML = TABS.map(([id, label]) => (
        `<button type="button" class="mart-tab${tab === id ? " is-on" : ""}" data-bag-tab="${id}" aria-pressed="${tab === id}">${label}</button>`
      )).join("");
    }
    const rows = allKeys(bag)
      .filter((key) => key !== "coins")
      .map((key) => ({ key, qty: Number(bag[key] || 0), category: window.playItemCategory(key) }))
      .filter((row) => row.category === tab)
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
      return a.key.localeCompare(b.key);
    });
    const wallet = `<section class="bag-group">
      <h3>Wallet</h3>
      <p class="muted bag-group-note">Spend these on Starlight Mart.</p>
      <div class="bag-rows">${window.playBagRowHtml("coins", bag.coins || 0, lastCapture, { pins })}</div>
    </section>`;
    const body = rows.length
      ? `<div class="bag-rows">${rows.map((row) => window.playBagRowHtml(row.key, row.qty, lastCapture, { pins })).join("")}</div>`
      : `<p class="muted">${showUnowned ? "No items match this filter." : "Nothing in this pocket yet. Visit Starlight Mart or join encounters to fill it."}</p>`;
    const specialist = ["netball", "diveball", "duskball", "lureball", "moonball", "repeatball", "nestball", "fastball", "heavyball"];
    const tip = tab === "evolution" && rows.some((row) => Number(bag[row.key] || 0) > 0 && ["firestone", "waterstone", "thunderstone", "leafstone", "moonstone"].includes(row.key))
      ? window.playTipHtml?.("first-stone", "Evolution Items can be used with Evolution Candy to evolve eligible Pokémon along their Evolution Line.")
      : tab === "community" && Number(bag.bait || 0) > 0
        ? window.playTipHtml?.("first-honey", "Honey is a community contribution. It helps the shared encounter, does not replace your Poké Ball, and does not guarantee a catch.")
        : tab === "balls" && rows.some((row) => specialist.includes(row.key) && row.qty > 0)
          ? window.playTipHtml?.("first-specialist", "Some Poké Balls are more effective against certain Pokémon. Watch for the recommended indicator during encounters.")
          : "";
    els.bag.innerHTML = `${wallet}${tip || ""}<section class="bag-group"><h3>${TABS.find((row) => row[0] === tab)?.[1] || "Items"}</h3>${body}</section>`;
  }

  function openDetail(key) {
    if (!els.detail || !els.detailBody) return;
    window.playMarkItemSeen?.(key);
    els.detailBody.innerHTML = `${window.playItemDetailHtml(key, lastBag[key] || 0, lastCapture)}
      <div class="links">
        <button type="button" class="secondary" data-pin-item="${key}">${(window.playBagPins?.() || []).includes(key) ? "Unpin" : "Pin in Bag"}</button>
        <a class="button secondary" href="./store.html">Open Mart</a>
      </div>`;
    if (typeof els.detail.showModal === "function") els.detail.showModal();
    else els.detail.setAttribute("open", "");
    renderBag(lastBag);
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
    renderCard(snapshot?.trainer);
    lastCapture = snapshot?.captureItems || null;
    let bag = snapshot?.bag || {};
    try {
      lastCollection = await window.playCall("play_collection");
      bag = { ...bag, ...(lastCollection?.items || {}) };
    } catch (_) {}
    renderBag(bag);
    const candyFirst = (lastCollection?.candy || []).find((row) => Number(row.qty || 0) > 0);
    if (candyFirst && typeof window.playTipHtml === "function" && !window.playTipDone("first-candy")) {
      els.status.innerHTML = window.playTipHtml("first-candy", `You earned ${candyFirst.name} Evolution Candy! Catch Pokémon from the same Evolution Line to earn more Candy for evolution.`);
    }
    try {
      const hist = await window.playCall("play_item_ledger", { p_limit: 20 });
      const rows = hist?.rows || [];
      if (els.ledger) {
        lastLedgerOrder = [...new Set(rows.map((row) => row.item).filter(Boolean))];
        els.ledger.innerHTML = rows.length
          ? `<table class="report-table"><thead><tr><th>Item</th><th>Qty</th><th>Source</th></tr></thead><tbody>${
            rows.map((row) => `<tr><td>${window.playEscapeAttr(window.playItemLabel(row.item))}</td><td>${row.amount > 0 ? "+" : ""}${row.amount}</td><td>${window.playEscapeAttr(window.playLedgerLabel?.(row.reason) || row.reason)}</td></tr>`).join("")
          }</tbody></table>`
          : `<p class="muted">No item history yet.</p>`;
      }
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
          renderCard(snap?.trainer);
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
    renderBag(lastBag);
  });
  els.search?.addEventListener("input", () => renderBag(lastBag));
  els.sort?.addEventListener("change", () => renderBag(lastBag));
  els.unowned?.addEventListener("change", () => renderBag(lastBag));
  els.bag?.addEventListener("click", (event) => {
    const row = event.target.closest("[data-item]");
    if (row) openDetail(row.dataset.item);
  });
  els.detail?.addEventListener("click", (event) => {
    const pin = event.target.closest("[data-pin-item]");
    if (!pin) return;
    window.playToggleBagPin?.(pin.dataset.pinItem);
    openDetail(pin.dataset.pinItem);
  });

  supabase.auth.onAuthStateChange((event) => { if (window.playAuthNoise(event)) return; load(); });
  load();
})();
