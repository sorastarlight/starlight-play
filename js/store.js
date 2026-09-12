(() => {
  const supabase = window.playSupabase;
  const els = {
    floors: document.getElementById("mart-floors"),
    status: document.getElementById("mart-status"),
    wallet: document.getElementById("coin-wallet"),
    coins: document.getElementById("capacity-note"),
    hint: document.getElementById("mart-wallet-slots"),
    banner: document.getElementById("mart-wallet"),
    ballModal: document.getElementById("ball-modal"),
    ballGrid: document.getElementById("ball-grid")
  };
  let lastCatalog = null;
  let lastWallet = null;
  let lastPass = null;
  let lastOwned = [];
  let lastTab = "";
  const CHECKOUT_TAB = "checkout";
  const CART_KEY = "play-mart-checkout";
  const CART_MAX_QTY = 99;
  let cart = loadCart();
  let checkoutNote = "";

  window.playBindAccountNav({
    onSignOut() {
      fillWallet(null);
      lastPass = null;
      lastWallet = null;
      lastOwned = [];
      renderFloors(lastCatalog, null, null, []);
    }
  });

  function esc(value) {
    return window.playEscapeAttr(value);
  }

  function loadCart() {
    try {
      const raw = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
      if (!Array.isArray(raw)) return [];
      return raw
        .map((row) => ({ sku: String(row?.sku || ""), qty: Math.trunc(Number(row?.qty) || 0) }))
        .filter((row) => row.sku && row.qty > 0)
        .slice(0, 40);
    } catch (_) {
      return [];
    }
  }

  function saveCart() {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart.map((row) => ({ sku: row.sku, qty: row.qty }))));
    } catch (_) {}
  }

  function cartCount() {
    return cart.reduce((n, row) => n + Number(row.qty || 0), 0);
  }

  function catalogItems() {
    const floors = lastCatalog?.floors?.length ? lastCatalog.floors : fallbackFloors(lastCatalog);
    const items = [];
    for (const floor of floors) {
      for (const item of floor.items || []) items.push(item);
      if (floor.kind === "avatars" && !(floor.items || []).length) {
        items.push(...(window.PLAY_AVATAR_PACKS || []));
      }
    }
    if (Array.isArray(lastCatalog?.avatars)) items.push(...lastCatalog.avatars);
    return items;
  }

  function findSku(sku) {
    return catalogItems().find((item) => item.sku === sku) || null;
  }

  function addButton(sku, { avatar } = {}) {
    const attr = avatar ? `data-avatar-sku="${esc(sku)}"` : `data-sku="${esc(sku)}"`;
    return `<button type="button" class="mart-add" ${attr}>Add To Checkout</button>`;
  }

  function art(item, fallback) {
    return typeof window.playMartArt === "function"
      ? window.playMartArt(item, fallback)
      : window.playItemSprite((item && (item.thumb || item.sprite)) || fallback || item?.sku);
  }

  function fillWallet(wallet) {
    const coinsEl = document.getElementById("coin-wallet");
    const note = document.getElementById("capacity-note");
    const bar = document.getElementById("capacity-bar");
    const meter = bar?.parentElement;
    const slots = document.getElementById("mart-wallet-slots");
    const banner = document.getElementById("mart-wallet");
    els.wallet = coinsEl;
    if (!wallet) {
      banner?.classList.remove("is-full");
      if (coinsEl) {
        coinsEl.innerHTML = window.playCoinsHtml(null);
        coinsEl.classList.remove("bag-warn");
      }
      if (note) {
        note.textContent = "—";
        note.classList.remove("bag-warn");
      }
      if (bar) bar.style.width = "0%";
      meter?.classList.remove("is-full");
      if (slots) slots.textContent = "Sign in to see bag space.";
      const warn = document.getElementById("bag-full-warn");
      if (warn) {
        warn.hidden = true;
        warn.textContent = "";
      }
      return;
    }
    const coins = Number(wallet.coins || 0);
    const used = Number(wallet.used || 0);
    const cap = Number(wallet.capacity || 0);
    if (coinsEl) coinsEl.innerHTML = window.playCoinsHtml(coins);
    window.playFillBagMeter(wallet);
    if (note) note.textContent = `${used.toLocaleString()} / ${cap.toLocaleString()}`;
    banner?.classList.toggle("is-full", typeof window.playBagIsFull === "function" && window.playBagIsFull(wallet));
    if (slots) {
      const free = cap - used;
      slots.textContent = cap
        ? (free > 0 ? `${free.toLocaleString()} slot${free === 1 ? "" : "s"} free` : "No slots free")
        : "Sign in to see bag space.";
    }
  }

  function describePass(pass, wallet) {
    if (!pass) return { note: "Sign in to check your Pass.", active: false };
    if (pass.active) {
      const source = pass.source === "twitch-sub"
        ? "Your Twitch sub is on"
        : pass.source === "admin"
          ? "Staff granted your Pass"
          : pass.source === "broadcaster"
            ? "You're the channel, so the Pass is on"
            : "Your Pass is on";
      const gifts = [];
      if (wallet?.dailyReady) gifts.push("daily gift ready");
      if (wallet?.weeklyReady) gifts.push("weekly crate ready");
      return {
        note: gifts.length ? `${source}. ${gifts.join(" · ")}.` : `${source}. Gifts on cooldown.`,
        active: true
      };
    }
    return { note: "No Pass on this account yet.", active: false };
  }

  function withLureBlurb(item) {
    if (item?.sku !== "radar1" && item?.sku !== "lure1") return item;
    return { ...item, blurb: "Detects nearby Pokémon & joins you to an encounter automatically. Lasts 30 mins." };
  }

  function ballView(item) {
    const key = item.ballKey || Object.keys(item.grants || {})[0] || "";
    const info = (typeof window.playBallInfo === "function" ? window.playBallInfo(key) : null) || {};
    const qty = Number(item.qty || item.grants?.[key] || 1);
    return {
      ...item,
      key,
      qty,
      rate: info.rate ?? 0.45,
      multiplier: info.multiplier || (key === "masterball" ? "Always" : "1×"),
      name: item.name || info.name || key
    };
  }

  function fallbackFloors(catalog) {
    return [
      {
        key: "pass",
        kind: "pass",
        name: "Starlight Pass",
        blurb: "Twitch subscriber perk",
        icon: "rainbow-pass.png",
        extra: {
          perks: [
            "+25 bag space while active",
            "Daily: 2 Berries, 1 Honey, 20 PokéCoins",
            "Weekly: 5 Poké Balls, 3 Berries, 1 Poké Radar, 150 PokéCoins"
          ]
        },
        items: []
      },
      {
        key: "field-kit",
        kind: "coins",
        name: "Field Kit",
        blurb: "",
        icon: "relic-gold.png",
        items: catalog?.coins || []
      },
      {
        key: "balls",
        kind: "balls",
        name: "Poké Balls",
        blurb: "Poké Ball, Great Ball, Ultra Ball, Master Ball, and Premier Ball are on the shelf. Master Ball always catches.",
        icon: "poke-ball.png",
        items: catalog?.balls || []
      },
      {
        key: "avatars",
        kind: "avatars",
        name: "Premium Avatars",
        blurb: "Sprite series for your Trainer ID. Buy once, then pick a look in Settings. These do not use bag space.",
        icon: "images/trainers/premium-avatars.png",
        items: catalog?.avatars || window.PLAY_AVATAR_PACKS || []
      },
      {
        key: "bits",
        kind: "bits",
        name: "Twitch Power-Ups",
        blurb: "Use the matching Custom Power-Up on Twitch while Sora is live. Sign into Play once so the pack can find your bag. You get what's listed — nothing random.",
        icon: "amulet-coin.png",
        items: catalog?.bits || []
      }
    ];
  }

  function money(n) {
    return typeof window.playFormatCoins === "function" ? window.playFormatCoins(n) : String(n || 0);
  }

  function costHtml(item, mode) {
    if (mode === "bits") return `<span class="mart-cost">${money(item.bits || 0)} Bits</span>`;
    return `<span class="mart-cost"><img src="${window.playItemSprite("coins")}" alt="">${money(item.cost || 0)}</span>`;
  }

  function grantListHtml(item) {
    const grants = typeof window.playGrantLines === "function" ? window.playGrantLines(item.grants) : [];
    if (!grants.length) return "";
    return `<ul class="mart-grants">${grants.map((line) => `<li><img src="${line.sprite}" alt=""><span>${esc(line.label)}</span></li>`).join("")}</ul>`;
  }

  function splitFeatured(items) {
    const list = Array.isArray(items) ? items.slice() : [];
    const index = list.findIndex((row) => row.featured);
    const featured = (index >= 0 ? list.splice(index, 1)[0] : list.shift()) || null;
    return { featured, rest: list };
  }

  function shelfCard(item, mode) {
    const row = withLureBlurb(item);
    const sprite = art(row, row.sku || Object.keys(row.grants || {})[0]);
    const action = mode === "bits" ? "" : addButton(row.sku);
    const blurb = mode !== "bits" && row.blurb ? `<p>${esc(row.blurb)}</p>` : "";
    return `
      <article class="mart-item${mode === "bits" ? " mart-item-bits" : ""}${row.sku === "radar1" || row.sku === "lure1" ? " mart-item-radar" : ""}">
        <div class="mart-sprite"><img src="${esc(sprite)}" alt=""></div>
        <div class="mart-copy">
          <strong>${esc(row.name)}</strong>
          ${blurb}
        </div>
        <div class="mart-price">
          ${costHtml(row, mode)}
          ${action}
        </div>
        ${mode === "bits" ? grantListHtml(row) : ""}
      </article>`;
  }

  function ballTile(item) {
    const row = ballView(item);
    const pct = Math.round((row.rate || 0) * 100);
    const pack = row.qty > 1 ? ` ×${row.qty}` : "";
    const rate = row.key === "masterball" ? "Always · 100% catch" : `${esc(row.multiplier)} · ${pct}% catch`;
    return `<article class="ball-tile">
      <img src="${esc(art(row, row.key))}" alt="">
      <strong>${esc(row.name)}${pack}</strong>
      <span class="ball-rate">${rate}</span>
      ${costHtml(row, "coins")}
      ${addButton(row.sku)}
    </article>`;
  }

  function packThumb(item) {
    const raw = item?.thumb || item?.sprite || "pack-thumb.png";
    if (!raw || raw === "premium-avatars.png" || raw === "images/trainers/premium-avatars.png" || raw === "poke-ball.png") {
      return "pack-thumb.png";
    }
    return raw;
  }

  function avatarCard(item, ownedPacks) {
    const owned = new Set(ownedPacks || []);
    const have = owned.has(item.pack);
    return `<article class="avatar-pack${have ? " is-owned" : ""}">
      <img class="avatar-pack-art" src="${esc(window.playItemSprite(packThumb(item)))}" alt="">
      <div class="avatar-pack-copy">
        <strong>${esc(item.name)}</strong>
        <p>${esc(item.blurb || "")}</p>
      </div>
      <div class="avatar-pack-foot">
        ${costHtml(item, "coins")}
        ${have
          ? `<span class="owned-mark">Owned</span>`
          : addButton(item.sku, { avatar: true })}
      </div>
    </article>`;
  }

  function passFloor(floor, pass, wallet) {
    const info = describePass(pass, wallet);
    const perks = Array.isArray(floor.extra?.perks) && floor.extra.perks.length
      ? floor.extra.perks
      : ["+25 bag space while active", "Daily: 2 Berries, 1 Honey, 20 PokéCoins", "Weekly: 5 Poké Balls, 3 Berries, 1 Poké Radar, 150 PokéCoins"];
    const title = floor.name || "Starlight Pass";
    return `
      <div class="mart-pass">
        <section class="pass-showcase${info.active ? " active" : ""}" data-pass-hero>
          <img class="pass-sprite" src="${esc(window.playItemSprite(floor.icon || "rainbow-pass.png"))}" alt="">
          <div>
            <p class="eyebrow">${esc(floor.blurb || "Twitch subscriber perk")}</p>
            <h2>${esc(title)} <span data-pass-state class="pass-state ${info.active ? "on" : "off"}">${info.active ? "Active" : "Inactive"}</span></h2>
            <ul>${perks.map((line) => `<li>${esc(line)}</li>`).join("")}</ul>
            <p data-pass-status class="muted">${esc(info.note)}</p>
            <div class="links pass-actions">
              <button id="claim-daily" type="button"${info.active && wallet?.dailyReady ? "" : " disabled"}>${info.active && !wallet?.dailyReady ? "Daily claimed" : "Claim daily gift"}</button>
              <button id="claim-weekly" class="gold" type="button"${info.active && wallet?.weeklyReady ? "" : " disabled"}>${info.active && !wallet?.weeklyReady ? "Weekly claimed" : "Claim weekly crate"}</button>
              <button id="check-pass" class="secondary" type="button">Check my subscription</button>
            </div>
          </div>
          <p class="pass-subscribe">
            Want the Starlight Pass?
            <a href="https://www.twitch.tv/subs/sorastarlight" target="_blank" rel="noreferrer">Subscribe on Twitch now</a>
          </p>
        </section>
      </div>`;
  }

  function featuredCard(item, mode, ownedPacks) {
    if (!item) return "";
    const owned = new Set(ownedPacks || []);
    let row = item;
    let sprite = art(row, row.sku || Object.keys(row.grants || {})[0]);
    let extra = "";
    let action = mode === "bits" ? "" : addButton(row.sku);
    let blurb = row.blurb || "";
    let artClass = "";
    if (mode === "balls") {
      row = ballView(item);
      sprite = art(row, row.key);
      blurb = "";
      const pct = Math.round((row.rate || 0) * 100);
      extra = `<p class="ball-rate">${row.key === "masterball" ? "Always · 100% catch" : `${esc(row.multiplier)} · ${pct}% catch`}</p>`;
    } else if (mode === "avatars") {
      const have = owned.has(item.pack);
      sprite = window.playItemSprite(packThumb(item));
      artClass = " is-wide";
      action = have
        ? `<span class="owned-mark">Owned</span>`
        : addButton(item.sku, { avatar: true });
    } else {
      row = withLureBlurb(item);
      sprite = art(row, row.sku || Object.keys(row.grants || {})[0]);
      if (mode === "bits") {
        blurb = "";
        extra = grantListHtml(row);
      }
    }
    const mark = item.featured ? "Featured" : "Special";
    return `<article class="mart-featured">
      <div class="mart-featured-art${artClass}" aria-hidden="true">
        <img src="${esc(sprite)}" alt="">
      </div>
      <div class="mart-copy">
        <p class="mart-featured-mark">${mark}</p>
        <strong>${esc(row.name)}</strong>
        ${blurb ? `<p>${esc(blurb)}</p>` : ""}
        ${extra}
      </div>
      <div class="mart-price">
        ${costHtml(row, mode === "avatars" ? "coins" : mode)}
        ${action}
      </div>
    </article>`;
  }

  function floorTabId(floor, index) {
    if (floor?.kind === "avatars") return "premium-avatars";
    const raw = String(floor?.key || floor?.kind || floor?.name || `floor-${index}`);
    return raw.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || `floor-${index}`;
  }

  function floorShell(floor, icon, body, extraStatus = "", index = 0) {
    const id = floorTabId(floor, index);
    const bits = floor.kind === "bits";
    const avatars = floor.kind === "avatars";
    const title = floor.name || "Shelf";
    return `<section class="mart-floor${bits ? " bits-floor" : ""}${avatars ? " avatar-floor" : ""}" id="${esc(id)}" role="tabpanel" aria-labelledby="mart-tab-${esc(id)}" data-mart-panel="${esc(id)}" hidden>
      <header class="mart-sign">
        <img src="${esc(window.playItemSprite(icon))}" alt="">
        <div>
          <h2 class="visually-hidden">${esc(title)}</h2>
          ${floor.blurb ? `<p class="muted">${esc(floor.blurb)}</p>` : `<p class="mart-sign-title">${esc(title)}</p>`}
        </div>
      </header>
      ${body}
    </section>`;
  }

  function stageHtml(featuredHtml, restHtml, restClass) {
    return `<div class="mart-stage">
      ${featuredHtml || ""}
      ${restHtml ? `<div class="${restClass}">${restHtml}</div>` : ""}
    </div>`;
  }

  function coinsFloor(floor, index) {
    const { featured, rest } = splitFeatured((floor.items || []).map(withLureBlurb));
    return floorShell(
      floor,
      floor.icon || "relic-gold.png",
      stageHtml(featuredCard(featured, "coins"), rest.map((item) => shelfCard(item, "coins")).join(""), "mart-shelf"),
      "",
      index
    );
  }

  function ballsFloor(floor, index) {
    const { featured, rest } = splitFeatured((floor.items || []).map(ballView));
    return floorShell(
      floor,
      floor.icon || "poke-ball.png",
      stageHtml(featuredCard(featured, "balls"), rest.map(ballTile).join(""), "ball-grid ball-grid-compact"),
      " data-ball-status",
      index
    );
  }

  function avatarsFloor(floor, ownedPacks, index) {
    const items = floor.items?.length ? floor.items : (window.PLAY_AVATAR_PACKS || []);
    const { featured, rest } = splitFeatured(items);
    return floorShell(
      floor,
      floor.icon || "images/trainers/premium-avatars.png",
      stageHtml(featuredCard(featured, "avatars", ownedPacks), rest.map((item) => avatarCard(item, ownedPacks)).join(""), "avatar-shelf"),
      " data-avatar-status",
      index
    );
  }

  function bitsFloor(floor, index) {
    const { featured, rest } = splitFeatured(floor.items || []);
    return floorShell(
      floor,
      floor.icon || "amulet-coin.png",
      stageHtml(featuredCard(featured, "bits"), rest.map((item) => shelfCard(item, "bits")).join(""), "mart-shelf"),
      "",
      index
    );
  }

  function genericFloor(floor, index) {
    const mode = floor.kind === "bits" ? "bits" : "coins";
    const { featured, rest } = splitFeatured(floor.items || []);
    return floorShell(
      floor,
      floor.icon || "poke-ball.png",
      stageHtml(featuredCard(featured, mode), rest.map((item) => shelfCard(item, mode)).join(""), "mart-shelf"),
      "",
      index
    );
  }

  function renderBallCase(catalog) {
    if (!els.ballGrid) return;
    const floors = catalog?.floors?.length ? catalog.floors : fallbackFloors(catalog);
    const balls = floors.find((floor) => floor.kind === "balls");
    const { rest } = splitFeatured((balls?.items || []).map(ballView));
    els.ballGrid.innerHTML = rest.map(ballTile).join("");
  }

  function tabButtons(floors) {
    const count = cartCount();
    const shelves = floors.map((floor, index) => {
      const id = floorTabId(floor, index);
      return `<button class="mart-tab" type="button" role="tab" id="mart-tab-${esc(id)}" data-mart-tab="${esc(id)}" aria-controls="${esc(id)}" aria-selected="false" tabindex="-1">${esc(floor.name || "Shelf")}</button>`;
    }).join("");
    const checkout = `<button class="mart-tab mart-tab-checkout" type="button" role="tab" id="mart-tab-${CHECKOUT_TAB}" data-mart-tab="${CHECKOUT_TAB}" aria-controls="${CHECKOUT_TAB}" aria-selected="false" tabindex="-1">Checkout${count ? `<span class="mart-cart-count">${count}</span>` : ""}</button>`;
    return `<div class="mart-tabs" role="tablist" aria-label="Store shelves">${shelves}${checkout}</div>`;
  }

  function floorHtml(floor, index, ownedPacks) {
    if (floor.kind === "coins") return coinsFloor(floor, index);
    if (floor.kind === "balls") return ballsFloor(floor, index);
    if (floor.kind === "avatars") return avatarsFloor(floor, ownedPacks, index);
    if (floor.kind === "bits") return bitsFloor(floor, index);
    return genericFloor(floor, index);
  }

  function shopFloors(floors) {
    return (floors || []).filter((floor) => floor.kind !== "pass");
  }

  function resolveTab(floors, wanted) {
    const shop = shopFloors(floors);
    const ids = shop.map((floor) => floorTabId(floor, floors.indexOf(floor)));
    const raw = String(wanted || "").replace(/^#/, "");
    if (raw === "pass") return ids[0] || "";
    if (raw === CHECKOUT_TAB) return CHECKOUT_TAB;
    if (raw && ids.includes(raw)) return raw;
    if (raw === "avatars" || raw === "premium-avatars") {
      const match = shop.find((floor) => floor.kind === "avatars");
      if (match) return floorTabId(match, floors.indexOf(match));
    }
    if (raw && shop.some((floor) => floor.kind === raw)) {
      const match = shop.find((floor) => floor.kind === raw);
      return floorTabId(match, floors.indexOf(match));
    }
    if (lastTab === CHECKOUT_TAB) return CHECKOUT_TAB;
    if (lastTab && ids.includes(lastTab)) return lastTab;
    return ids[0] || "";
  }

  function showTab(id, { updateHash = true } = {}) {
    if (!els.floors || !id) return;
    lastTab = id;
    const tabs = [...els.floors.querySelectorAll(".mart-tab")];
    const panels = [...els.floors.querySelectorAll("[data-mart-panel]")];
    tabs.forEach((tab) => {
      const on = tab.dataset.martTab === id;
      tab.classList.toggle("is-on", on);
      tab.setAttribute("aria-selected", on ? "true" : "false");
      tab.tabIndex = on ? 0 : -1;
    });
    panels.forEach((panel) => {
      panel.hidden = panel.dataset.martPanel !== id;
    });
    const folder = els.floors.querySelector(".mart-folder");
    folder?.classList.toggle("is-first", tabs[0]?.dataset.martTab === id);
    folder?.classList.toggle("is-checkout", id === CHECKOUT_TAB);
    if (updateHash && location.hash.replace(/^#/, "") !== id) {
      history.replaceState(null, "", `#${id}`);
    }
  }

  function parkWallet() {
    const wallet = document.getElementById("mart-wallet");
    if (wallet && els.floors?.contains(wallet)) els.floors.before(wallet);
  }

  function placeWallet() {
    const wallet = document.getElementById("mart-wallet");
    const folder = els.floors?.querySelector(".mart-folder");
    if (!wallet || !folder) return;
    folder.before(wallet);
  }

  function cartLineSprite(item) {
    if (!item) return window.playItemSprite("poke-ball.png");
    if (item.pack) return window.playItemSprite(packThumb(item));
    return art(item, item.sku || Object.keys(item.grants || {})[0]);
  }

  function checkoutHtml() {
    const count = cartCount();
    const lines = cart.map((row) => {
      const item = findSku(row.sku);
      const name = item?.name || row.sku;
      const cost = Number(item?.cost || 0);
      const line = cost * row.qty;
      const avatar = Boolean(item?.pack);
      return `<article class="mart-cart-row">
        <img src="${esc(cartLineSprite(item))}" alt="">
        <div class="mart-cart-copy">
          <strong>${esc(name)}</strong>
          <span class="mart-cost"><img src="${window.playItemSprite("coins")}" alt="">${money(cost)} each</span>
        </div>
        <div class="mart-cart-qty">
          <button type="button" data-cart-dec="${esc(row.sku)}"${row.qty <= 1 || avatar ? " disabled" : ""} aria-label="Fewer">−</button>
          <span>${row.qty}</span>
          <button type="button" data-cart-inc="${esc(row.sku)}"${avatar || row.qty >= CART_MAX_QTY ? " disabled" : ""} aria-label="More">+</button>
        </div>
        <div class="mart-cart-line">
          <span class="mart-cost"><img src="${window.playItemSprite("coins")}" alt="">${money(line)}</span>
          <button type="button" class="secondary" data-cart-remove="${esc(row.sku)}">Remove</button>
        </div>
      </article>`;
    }).join("");
    const total = cart.reduce((n, row) => n + Number(findSku(row.sku)?.cost || 0) * row.qty, 0);
    const coins = Number(lastWallet?.coins || 0);
    const short = Boolean(lastWallet) && coins < total;
    const body = count
      ? `<div class="mart-cart-list">${lines}</div>
         <div class="mart-cart-foot">
           <p class="mart-cart-total"><span>Total</span> <span class="mart-cost"><img src="${window.playItemSprite("coins")}" alt="">${money(total)}</span></p>
           ${short ? `<p class="mart-cart-warn">You need ${money(total - coins)} more PokéCoins.</p>` : ""}
           <button type="button" class="gold" data-checkout-buy${short ? " disabled" : ""}>Purchase</button>
         </div>`
      : `<div class="mart-cart-empty">
           <p>Your checkout is empty.</p>
           <p class="muted">Add items from the shelves, then come here to review quantities and purchase.</p>
         </div>`;
    return `<section class="mart-floor mart-checkout-floor" id="${CHECKOUT_TAB}" role="tabpanel" aria-labelledby="mart-tab-${CHECKOUT_TAB}" data-mart-panel="${CHECKOUT_TAB}" hidden>
      <header class="mart-sign">
        <img src="${esc(window.playItemSprite("relic-gold.png"))}" alt="">
        <div>
          <h2 class="visually-hidden">Checkout</h2>
          <p class="mart-sign-title">Checkout</p>
          <p class="muted">Review your items, then purchase them all at once.</p>
        </div>
      </header>
      ${body}
      <p class="mart-checkout-note" data-checkout-status${checkoutNote ? "" : " hidden"}>${esc(checkoutNote)}</p>
    </section>`;
  }

  function checkoutTabLabel() {
    const count = cartCount();
    return `Checkout${count ? `<span class="mart-cart-count">${count}</span>` : ""}`;
  }

  function syncCheckoutUi({ bump } = {}) {
    const tab = els.floors?.querySelector(".mart-tab-checkout");
    if (tab) {
      tab.innerHTML = checkoutTabLabel();
      if (bump) {
        tab.classList.add("is-bump");
        window.setTimeout(() => tab.classList.remove("is-bump"), 420);
      }
    }
    const panel = els.floors?.querySelector(`[data-mart-panel="${CHECKOUT_TAB}"]`);
    if (!panel) return;
    const wrap = document.createElement("div");
    wrap.innerHTML = checkoutHtml();
    const next = wrap.firstElementChild;
    if (!next) return;
    const hidden = panel.hidden;
    panel.replaceWith(next);
    next.hidden = hidden;
  }

  function addToCheckout(sku) {
    if (!sku) return;
    const item = findSku(sku);
    if (!item || Number(item.bits || 0) > 0) return;
    if (item.pack && (lastOwned || []).includes(item.pack)) return;
    checkoutNote = "";
    const row = cart.find((entry) => entry.sku === sku);
    if (item.pack) {
      if (!row) cart.push({ sku, qty: 1 });
    } else if (row) {
      row.qty = Math.min(CART_MAX_QTY, row.qty + 1);
    } else {
      cart.push({ sku, qty: 1 });
    }
    saveCart();
    syncCheckoutUi({ bump: true });
  }

  function setCartQty(sku, qty) {
    const item = findSku(sku);
    const next = Math.trunc(Number(qty) || 0);
    checkoutNote = "";
    if (next < 1) {
      cart = cart.filter((row) => row.sku !== sku);
    } else {
      const row = cart.find((entry) => entry.sku === sku);
      const cap = item?.pack ? 1 : CART_MAX_QTY;
      if (row) row.qty = Math.min(cap, next);
    }
    saveCart();
    syncCheckoutUi();
  }

  function renderFloors(catalog, wallet, pass, ownedPacks) {
    if (!els.floors) return;
    parkWallet();
    const floors = catalog?.floors?.length ? catalog.floors : fallbackFloors(catalog);
    const shop = shopFloors(floors);
    const passRow = floors.find((floor) => floor.kind === "pass");
    const tab = resolveTab(floors, location.hash);
    const passHtml = passRow ? passFloor(passRow, pass, wallet) : "";
    const folderHtml = shop.length
      ? `<div class="mart-folder">
          ${tabButtons(shop)}
          <div class="mart-folder-body">
            ${shop.map((floor) => floorHtml(floor, floors.indexOf(floor), ownedPacks)).join("")}
            ${checkoutHtml()}
          </div>
        </div>`
      : "";
    els.floors.innerHTML = `${passHtml}${folderHtml}`;
    placeWallet();
    showTab(tab, { updateHash: Boolean(location.hash) && location.hash.replace(/^#/, "") !== "pass" });
    renderBallCase(catalog);
  }

  async function functionMessage(error, fallback) {
    try {
      const ctx = error?.context;
      if (ctx && typeof ctx.json === "function") {
        const body = await ctx.json();
        if (body?.message) return body.message;
      }
    } catch (_) {}
    if (String(error?.message || "").includes("non-2xx")) return fallback;
    return error?.message || fallback;
  }

  async function refreshStore() {
    try {
      const data = await window.playCall("play_store");
      const wallet = data.wallet;
      lastCatalog = data.catalog;
      lastWallet = wallet;
      lastPass = data.pass;
      lastOwned = data.ownedAvatarPacks || [];
      window._playOwnedAvatarPacks = lastOwned;
      fillWallet(wallet);
      renderFloors(lastCatalog, lastWallet, lastPass, lastOwned);
      return data;
    } catch (error) {
      if (els.status) els.status.textContent = window.playRpcError(error, "Mart catalog is not live yet.");
      renderFloors(lastCatalog, lastWallet, lastPass, lastOwned);
      return null;
    }
  }

  async function load() {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session) {
      window.playSetAccountNav(null);
      fillWallet(null);
      await refreshStore();
      return;
    }
    const { data: profile } = await supabase.from("profiles").select("display_name, twitch_login, avatar_url, starlight_pass, pass_source").eq("id", session.user.id).maybeSingle();
    const store = await refreshStore();
    window.playSetAccountNav(session, profile, { isAdmin: Boolean(store?.isAdmin), trainer: store?.trainer });
  }

  async function purchaseCart(button) {
    if (!cart.length) return;
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      checkoutNote = "Sign in with Twitch first.";
      syncCheckoutUi();
      return;
    }
    if (button) button.disabled = true;
    try {
      const data = await window.playCall("play_buy_cart", {
        p_items: cart.map((row) => ({ sku: row.sku, qty: row.qty }))
      });
      cart = [];
      saveCart();
      checkoutNote = data.message || "Purchased.";
      await refreshStore();
    } catch (error) {
      checkoutNote = window.playRpcError(error);
      syncCheckoutUi();
      if (button && button.isConnected) button.disabled = false;
    }
  }

  els.floors?.addEventListener("click", async (event) => {
    const tab = event.target.closest(".mart-tab[data-mart-tab]");
    if (tab) {
      showTab(tab.dataset.martTab);
      return;
    }
    const add = event.target.closest("button[data-sku], button[data-avatar-sku]");
    if (add) {
      addToCheckout(add.dataset.sku || add.dataset.avatarSku);
      return;
    }
    const inc = event.target.closest("[data-cart-inc]");
    if (inc) {
      const sku = inc.dataset.cartInc;
      setCartQty(sku, (cart.find((row) => row.sku === sku)?.qty || 0) + 1);
      return;
    }
    const dec = event.target.closest("[data-cart-dec]");
    if (dec) {
      const sku = dec.dataset.cartDec;
      setCartQty(sku, (cart.find((row) => row.sku === sku)?.qty || 0) - 1);
      return;
    }
    const remove = event.target.closest("[data-cart-remove]");
    if (remove) {
      setCartQty(remove.dataset.cartRemove, 0);
      return;
    }
    const buyAll = event.target.closest("[data-checkout-buy]");
    if (buyAll) {
      await purchaseCart(buyAll);
      return;
    }
    if (event.target.closest("[data-open-balls]")) {
      renderBallCase(lastCatalog);
      if (typeof els.ballModal?.showModal === "function") els.ballModal.showModal();
      else els.ballModal?.setAttribute("open", "");
      return;
    }
    if (event.target.closest("#check-pass")) {
      const note = document.querySelector("[data-pass-status]") || els.status;
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session) {
        if (note) note.textContent = "Sign in with Twitch first.";
        return;
      }
      if (!session.provider_token) {
        if (note) note.textContent = "Twitch did not keep a session token. Sign out, sign in again, then check immediately.";
        return;
      }
      if (note) note.textContent = "Checking Twitch…";
      const { data, error } = await supabase.functions.invoke("refresh-pass", {
        body: { accessToken: session.provider_token }
      });
      if (error) {
        if (note) note.textContent = await functionMessage(error, "Staff still needs to save the Play Twitch Client ID, or grant the pass by login.");
        return;
      }
      if (note) note.textContent = data?.message || (data?.active ? "Starlight Pass is active." : "Twitch says you are not subscribed right now.");
      await load();
      return;
    }
    if (event.target.closest("#claim-daily")) {
      const note = document.querySelector("[data-pass-status]") || els.status;
      try {
        const data = await window.playCall("play_claim_pass", { p_kind: "daily" });
        if (note) note.textContent = data.message;
        await refreshStore();
      } catch (error) {
        if (note) note.textContent = window.playRpcError(error);
      }
      return;
    }
    if (event.target.closest("#claim-weekly")) {
      const note = document.querySelector("[data-pass-status]") || els.status;
      try {
        const data = await window.playCall("play_claim_pass", { p_kind: "weekly" });
        if (note) note.textContent = data.message;
        await refreshStore();
      } catch (error) {
        if (note) note.textContent = window.playRpcError(error);
      }
    }
  });

  els.floors?.addEventListener("keydown", (event) => {
    if (!event.target.closest(".mart-tab")) return;
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft" && event.key !== "Home" && event.key !== "End") return;
    const tabs = [...els.floors.querySelectorAll(".mart-tab")];
    const index = tabs.indexOf(event.target.closest(".mart-tab"));
    if (index < 0) return;
    event.preventDefault();
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = tabs.length - 1;
    const tab = tabs[next];
    tab?.focus();
    if (tab) showTab(tab.dataset.martTab);
  });

  window.addEventListener("hashchange", () => {
    const floors = lastCatalog?.floors?.length ? lastCatalog.floors : fallbackFloors(lastCatalog);
    showTab(resolveTab(floors, location.hash));
  });

  els.ballModal?.addEventListener("click", (event) => {
    if (event.target === els.ballModal) els.ballModal.close("cancel");
  });
  els.ballGrid?.addEventListener("click", (event) => {
    const add = event.target.closest("button[data-sku]");
    if (add) addToCheckout(add.dataset.sku);
  });

  supabase.auth.onAuthStateChange((event) => { if (window.playAuthNoise(event)) return; load(); });
  load();
})();
