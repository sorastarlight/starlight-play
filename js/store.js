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
  let ownerRewardTimer = null;
  let lastPass = null;
  let lastPassRewards = null;
  let lastOwned = [];
  let lastBag = null;
  let lastTab = "";
  const CHECKOUT_TAB = "checkout";
  const SELL_TAB = "mart-sell";
  const CART_KEY = "play-mart-checkout";
  const CART_MAX_QTY = 99;
  let cart = loadCart();
  let checkoutNote = "";
  let checkoutBusy = false;
  let checkoutActor = null, checkoutAttempt = null, checkoutEpoch = 0, checkoutRecoveryBlocked = false;
  let martReadSerial = 0, martLoadSerial = 0, sellReadSerial = 0;
  let emptyCartBusy = false;
  let lastPurchase = null;
  let lastLinkedLogin = "";
  let lastSupport = { events: [], bitsTotal: 0, pending: false };
  let martMode = "buy"; // buy | sell
  let sellShelf = [];
  let sellQty = {};
  let sellBusy = false, sellAttempt = null, sellRecoveryBlocked = false;
  let sellNote = "";

  window.playBindAccountNav({
    onSignOut() {
      martLoadSerial++;
      setCheckoutAccount(null);
      fillWallet(null);
      lastPass = null;
      lastWallet = null;
      lastOwned = [];
      lastBag = null;
      lastSupport = { events: [], bitsTotal: 0, pending: false };
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

  function clearMartAccountData() {
    lastWallet = null; lastPass = null; lastPassRewards = null; lastOwned = []; lastBag = null; lastLinkedLogin = "";
    lastSupport = { events: [], bitsTotal: 0, pending: false }; sellShelf = []; sellQty = {}; sellNote = ""; sellBusy = false; sellAttempt = null; sellRecoveryBlocked = false; passCheckBusy = false; claimBusy = false; claimNeedsRefresh = false;
    window._playOwnedAvatarPacks = []; clearTimeout(ownerRewardTimer); ownerRewardTimer = null;
  }

  async function martSessionMatches(actor, epoch) {
    try {
      const result = await supabase.auth.getSession();
      return epoch === checkoutEpoch && !result.error && (result.data?.session?.user?.id || null) === actor;
    } catch (_) { return false; }
  }

  function setCheckoutAccount(id) {
    if (id === checkoutActor) return;
    checkoutEpoch++; checkoutActor = id; checkoutAttempt = null; checkoutRecoveryBlocked = false; checkoutBusy = false; lastPurchase = null; checkoutNote = ""; clearMartAccountData();
    if (!id) return;
    try {
      const saved = JSON.parse(sessionStorage.getItem("play-mart-order:" + id) || "null");
      if (saved && saved.actor === id && /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(saved.orderId) && Array.isArray(saved.items) && saved.items.length > 0 && saved.items.length <= 40 && saved.items.every(row => typeof row.sku === "string" && row.sku.length > 0 && Number.isInteger(row.qty) && row.qty >= 1 && row.qty <= CART_MAX_QTY)) {
        checkoutAttempt = { actor: id, orderId: saved.orderId, items: saved.items.map(row => ({ sku: row.sku, qty: row.qty })) };
        cart = checkoutAttempt.items.map(row => ({ ...row }));
        checkoutNote = "Check your previous purchase before changing the cart. This uses the original order and cannot charge it twice.";
      } else if (saved !== null) throw Error("Invalid saved checkout recovery.");
    } catch (_) { checkoutRecoveryBlocked = true; checkoutNote = "Your browser could not load checkout recovery. Do not purchase again until site storage is available and the previous order is checked."; }
    restoreSale(id);
  }

  function restoreSale(id) {
    try {
      const saved = JSON.parse(sessionStorage.getItem("play-mart-sale:" + id) || "null");
      if (saved === null) return;
      if (saved.actor !== id || typeof saved.item !== "string" || !saved.item || !Number.isInteger(saved.quantity) || saved.quantity < 1 || saved.quantity > 99 || !/^mart-sell:[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(saved.key)) throw Error("Invalid saved sale.");
      sellAttempt = { actor: id, item: saved.item, quantity: saved.quantity, key: saved.key };
      sellNote = "Check your previous sale before selling more items. It uses the original request.";
    } catch (_) { sellRecoveryBlocked = true; sellNote = "Sale recovery could not be loaded. Check browser storage and the previous sale before selling again."; }
  }

  function rememberSale() {
    const key = "play-mart-sale:" + checkoutActor;
    if (sellAttempt) sessionStorage.setItem(key, JSON.stringify(sellAttempt));
    else sessionStorage.removeItem(key);
  }

  function rememberCheckout() {
    if (!checkoutActor) throw Error("Sign in before preparing checkout.");
    const key = "play-mart-order:" + checkoutActor;
    if (checkoutAttempt) sessionStorage.setItem(key, JSON.stringify(checkoutAttempt));
    else sessionStorage.removeItem(key);
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

  function grantKey(item) {
    return item?.ballKey || item?.extra?.ballKey || Object.keys(item?.grants || {})[0] || "";
  }

  function ownedQty(item) {
    const key = grantKey(item);
    if (!key || !lastBag) return 0;
    if (key === "bait") return Number(lastBag.bait || 0);
    return Number(lastBag[key] || 0);
  }

  function ownedLine(item) {
    if (!lastBag || item?.pack || item?.bits) return "";
    const qty = ownedQty(item);
    return `<p class="muted">You own ${qty.toLocaleString()}</p>`;
  }

  function showPurchasePop(purchase, bag) {
    if(typeof window.playPresentEnqueue!=='function')return;
    const rewards=(purchase?.lines||[]).map(row=>({type:row.sku,amount:Number(row.qty),label:row.name+' ×'+row.qty,sprite:row.sprite}));
    if(purchase?.premierBonus)rewards.push({type:'premierball',amount:Number(purchase.premierBonus),label:'Bonus Premier Ball ×'+Number(purchase.premierBonus)});
    const totals=[purchase?.total==null?'Previous purchase confirmed':'Spent '+money(purchase.total)+' PokéCoins',bag?.coins!=null?'Balance: '+money(bag.coins)+' PokéCoins':''].filter(Boolean).join(' · ');
    const pack=(purchase?.lines||[]).some(row=>isPackProduct(findSku(row.sku)));
    window.playPresentEnqueue([{id:'purchase:'+purchase?.orderId,type:'item',kind:'supply-claim',tier:'card',title:pack?'Pack purchased!':'Purchase complete!',kicker:'Thank you for shopping',body:totals,rewards,source:'store'}],{source:'store',noSummary:true});
  }

  function presentClaim(title, data, source) {
    const grants = data?.grants || {};
    const revealed = window.PLAY_PASS_REWARDS?.rows(data?.revealedRewards) || [];
    const rewards = revealed.length ? revealed.map(r=>({type:r.name,amount:r.quantity||1,label:window.PLAY_PASS_REWARDS.text(r),sprite:r.sprite})) : Object.entries(grants)
      .filter(([, amount]) => Number(amount) > 0)
      .map(([type, amount]) => ({ type, amount: Number(amount) || 0 }));
    const lines = rewards.map((row) => {
      if (row.label) return row.label;
      if (row.type === "coins") return `PokéCoins ×${row.amount}`;
      const label = typeof window.playItemLabel === "function" ? window.playItemLabel(row.type) : row.type;
      return `${label} ×${row.amount}`;
    });
    const claimTitle = /weekly/i.test(String(title))
      ? "Weekly Pass rewards claimed!"
      : /pass|daily gift/i.test(String(title)) && !/supply/i.test(String(title))
        ? "Daily Pass rewards claimed!"
        : /supply/i.test(String(title))
          ? "Daily Trainer Supply claimed!"
          : String(title || "Rewards claimed!");
    const delivery = data?.delivery;
    const stored = Object.values(delivery?.stored || {}).some(n => Number(n) > 0);
    const inBag = Object.values(delivery?.inBag || {}).some(n => Number(n) > 0);
    const destination = stored
      ? (inBag ? "Items arrived in Your Bag and My PC." : "Your item bundle was saved in My PC. Withdraw it into Your Bag before using it.")
      : inBag ? "Your item bundle was added to Your Bag." : "Your rewards have arrived.";
    window.playToast?.({kind:"success",title:claimTitle,body:destination});
    if (typeof window.playPresentEnqueue !== "function") return;
    window.playPresentEnqueue([{
      id: `${source}:claim:${data?.receiptId || newOrderId()}`,
      type: "item",
      tier: "card",
      kind: "supply-claim",
      title: claimTitle,
      body: destination,
      rewards,
      severity: "success",
      source
    }], { source, noSummary: true });
  }

  function newOrderId() {
    if (typeof window.playId === "function") return window.playId();
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
      const n = Math.floor(Math.random() * 16);
      return (ch === "x" ? n : (n & 0x3) | 0x8).toString(16);
    });
  }

  function addButton(sku, { avatar } = {}) {
    const item = findSku(sku);
    const count = cart.find(row => row.sku === sku)?.qty || 0;
    const qty = `<div class="mart-product-quantity" data-product-quantity="${esc(sku)}"><button type="button" class="secondary" data-product-step="-1" data-product-sku="${esc(sku)}" aria-label="Remove one ${esc(displayName(item))} from cart">−</button><input type="number" min="0" max="${item?.pack ? 1 : CART_MAX_QTY}" step="1" value="${count}" data-product-count="${esc(sku)}" aria-label="${esc(displayName(item))} quantity in cart"><button type="button" class="secondary" data-product-step="1" data-product-sku="${esc(sku)}" aria-label="Add one ${esc(displayName(item))} to cart">+</button></div>`;
    return qty;
  }

  function cartIconHtml(className) {
    return `<svg class="${className || "mart-cart-icon"}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M3 3h2.2l.5 2h14.1l-1.7 8.2H8.4L8 15h11v2H6.2l.7-3.2L5 5H3zm5.2 16.2a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3m9.3 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3"/>
    </svg>`;
  }

  function floorTabIcon(floor) {
    if (floor?.kind === "balls") return window.playItemSprite(floor.icon || "poke-ball.png");
    if (floor?.kind === "avatars") return window.playItemSprite(floor.icon || "images/trainers/premium-avatars.png");
    if (floor?.kind === "bits") return window.playItemSprite(floor.icon || "amulet-coin.png");
    return window.playItemSprite(floor?.icon || "pokecoin.png");
  }

  function art(item, fallback) {
    return typeof window.playMartArt === "function"
      ? window.playMartArt(item, fallback)
      : window.playItemSprite((item && (item.thumb || item.sprite)) || fallback || item?.sku || grantKey(item));
  }

  function displayName(item) {
    return String(item?.name || "").replace(/\s*[×xX]\s*\d+\s*$/u, "").trim();
  }

  function itemBlurb(item, mode) {
    const row = mode === "balls" ? ballView(item) : withLureBlurb(item);
    const key = row.key || grantKey(row);
    if (mode === "balls" && typeof window.playBallShopBlurb === "function") {
      const shop = window.playBallShopBlurb(key);
      if (shop) return shop;
    }
    const raw = String(row.blurb || row.effect || "").trim();
    if (raw && !/^\d+%\s*catch/i.test(raw)) return raw;
    if (typeof window.playItemPlayerText === "function" && key) {
      const text = window.playItemPlayerText(key);
      if (text) return text;
    }
    return raw;
  }

  function useLinesHtml(item) {
    const key = grantKey(item);
    const uses = typeof window.playItemUseLines === "function" ? window.playItemUseLines(key) : [];
    if (!uses.length) return "";
    const list = uses.map(([from, to]) => `${from} → ${to}`).join(", ");
    return `<p class="mart-uses">Used for ${esc(list)}.</p>`;
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
        coinsEl.classList.remove("poke-cash");
        coinsEl.textContent = "—";
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
    if (coinsEl) {
      // Card already shows one PokéCoin art — value is number-only (no nested mark).
      coinsEl.classList.remove("poke-cash");
      coinsEl.textContent = window.playFormatCoins(coins);
    }
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
    return { note: "Starlight Pass is inactive.", active: false };
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
      multiplier: info.multiplier || (key === "masterball" ? "Always" : "1×"),
      effect: info.effect || "",
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
            "Daily: one rotating item and 50 PokéCoins",
            "Weekly: rotating supplies and 150 PokéCoins"
          ]
        },
        items: []
      },
      {
        key: "field-kit",
        kind: "coins",
        name: "Field Kit",
        blurb: "",
        icon: "pokecoin.png",
        items: catalog?.coins || []
      },
      {
        key: "balls",
        kind: "balls",
        name: "Poké Balls",
        blurb: "Poké Ball, Great Ball, Ultra Ball, and specialist Balls are on the shelf. Master Ball is not sold here.",
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
        blurb: "Optional stream support with guaranteed in-game supplies. Use the matching Custom Power-Up on Twitch while Sora is live. Contents are listed here. A general cheer is not a Mart checkout — and Power-Ups are never required to catch Pokémon.",
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

  function isPackProduct(item) {
    if (!item) return false;
    if (item.productKind === "pack") return true;
    const keys = Object.keys(item.grants || {}).filter((key) => Number(item.grants[key]) > 0);
    return keys.length > 1;
  }

  function purposeText(item, mode) {
    const row = mode === "balls" ? ballView(item) : item;
    const key = row.key || grantKey(row);
    const blurb = String(row.blurb || "").trim();
    if (mode === "bits") return "Guaranteed contents. Not a random pack.";
    if (mode === "avatars" || row.pack) {
      return blurb || "A Trainer look for your ID, Profile, and Rankings.";
    }
    if (key === "bag_bonus" || Number(row.grants?.bag_bonus) > 0) {
      const n = Number(row.grants?.bag_bonus) || 0;
      if (blurb) return blurb;
      if (row.identity?.bestUse) return row.identity.bestUse;
      if (typeof window.playItemPurpose === "function") {
        const purpose = window.playItemPurpose(key, null, row.identity);
        if (purpose && purpose !== "A useful Trainer item.") return purpose;
      }
      return n > 0 ? `Permanently add +${n} bag slots.` : "Permanently add bag slots.";
    }
    if (row.identity?.category === "berries" && row.identity.playerText) return row.identity.playerText;
    if (row.identity?.bestUse) return row.identity.bestUse;
    if (typeof window.playItemPurpose === "function") {
      const purpose = window.playItemPurpose(key, null, row.identity);
      if (purpose && purpose !== "A useful Trainer item.") return purpose;
    }
    return itemBlurb(row, mode);
  }

  function detailWorthShowing(item, mode) {
    const purpose = purposeText(item, mode);
    const parts = typeof window.playMartDetailParts === "function"
      ? window.playMartDetailParts(item).parts
      : [];
    if (isPackProduct(item) || item.pack) return true;
    if (item.detail && item.detail !== purpose && item.detail !== item.blurb) return true;
    return parts.some((line) => line && line !== purpose);
  }

  function openMartDetail(item, mode) {
    const dialog = document.getElementById("mart-detail");
    if (!dialog) return;
    const row = mode === "balls" ? ballView(item) : withLureBlurb(item);
    const key = row.key || grantKey(row);
    const purpose = row.identity?.collector ? "This is a rare Poké Ball for collectors. Catch power matches a Poké Ball." : purposeText(row, mode);
    const info = typeof window.playMartDetailParts === "function" ? window.playMartDetailParts(row) : { parts: [] };
    const grants = isPackProduct(row) || mode === "bits" ? grantListHtml(row) : "";
    const uses = useLinesHtml(row);
    dialog.querySelector("#mart-detail-title").textContent = displayName(row);
    dialog.querySelector("#mart-detail-body").innerHTML = `
      <div class="mart-detail-hero">
        <img src="${esc(art(row, key || row.sku))}" alt="">
        <p>${esc(purpose)}</p>
      </div>
      ${(info.parts || []).map((line) => `<p>${esc(line)}</p>`).join("")}
      ${row.detail && row.detail !== purpose ? `<p>${esc(row.detail)}</p>` : ""}
      ${uses}
      ${grants}
      ${ownedLine(row)}
      ${costHtml(row, mode === "avatars" ? "coins" : mode)}`;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function packThumb(item) {
    const raw = item?.thumb || item?.sprite || "pack-thumb.png";
    if (!raw || raw === "premium-avatars.png" || raw === "images/trainers/premium-avatars.png" || raw === "poke-ball.png") {
      return "pack-thumb.png";
    }
    return raw;
  }

  function shelfCard(item, mode) {
    const row = mode === "balls" ? ballView(item) : withLureBlurb(item);
    const sprite = art(row, row.key || row.sku || grantKey(row));
    const action = mode === "bits" ? "" : addButton(row.sku);
    const purpose = row.identity?.collector ? "This is a rare Poké Ball for collectors. Catch power matches a Poké Ball." : purposeText(row, mode);
    const details = "";
    const collector = row.identity?.collector ? `<span class="studio-chip">Collector</span>` : "";
    return `
      <article class="mart-card${mode === "bits" ? " is-bits" : ""}${row.sku === "radar1" || row.sku === "lure1" ? " is-radar" : ""}${row.featured ? " is-featured" : ""}">
        <div class="mart-card-media"><img src="${esc(sprite)}" alt=""></div>
        <div class="mart-card-body">
          <strong class="mart-card-name">${esc(displayName(row))}${collector}</strong>
          <p class="mart-card-desc">${esc(purpose || "\u00a0")}</p>
          <div class="mart-card-owned">${ownedLine(row) || "<span class=\"muted\">&nbsp;</span>"}</div>
        </div>
        <div class="mart-card-actions">
          <div class="mart-card-price">${costHtml(row, mode)}</div>
          ${details}
          ${action || `<span class="mart-add-spacer" aria-hidden="true"></span>`}
        </div>
      </article>`;
  }

  function avatarCard(item, ownedPacks) {
    const owned = new Set(ownedPacks || []);
    const have = owned.has(item.pack);
    return `<article class="mart-card is-pack${have ? " is-owned" : ""}">
      <div class="mart-card-media is-wide"><img src="${esc(window.playItemSprite(packThumb(item)))}" alt=""></div>
      <div class="mart-card-body">
        <strong class="mart-card-name">${esc(displayName(item))}</strong>
        <p class="mart-card-desc">${esc(item.blurb || "A Trainer look for your ID and Profile.")}</p>
        <div class="mart-card-owned">${have ? `<span class="owned-mark">Owned</span>` : "<span class=\"muted\">&nbsp;</span>"}</div>
      </div>
      <div class="mart-card-actions">
        <div class="mart-card-price">${costHtml(item, "coins")}</div>
        <span class="mart-more-spacer" aria-hidden="true"></span>
        ${have ? `<span class="owned-mark">Owned</span>` : addButton(item.sku, { avatar: true })}
      </div>
    </article>`;
  }

  function renderChoices(wallet) {
    const rows = wallet?.pendingChoices || [];
    if (!rows.length) return "";
    return rows.map((row) => `
      <section class="card body daily-supply-card">
        <p class="eyebrow">Choose a reward</p>
        <p>Pick ${Number(row.remaining || 1)} Evolution Stone${Number(row.remaining || 1) === 1 ? "" : "s"}. This cannot be changed later.</p>
        <div class="links">
          ${(row.options || []).map((key) => `<button type="button" data-choice-key="${esc(row.rewardKey)}" data-choice-item="${esc(key)}">${esc(window.playItemLabel(key))}</button>`).join("")}
        </div>
      </section>`).join("");
  }

  function dailyBonusLine(wallet) {
    const preview = wallet?.dailyPreview || {};
    const extras = [];
    if (Number(preview.greatball || 0) > 0) extras.push(`${preview.greatball} Great Ball`);
    if (Number(preview.bait || 0) > 0) extras.push(`${preview.bait} Honey`);
    if (Number(preview.razz || 0) > 0) extras.push(`${preview.razz} Razz Berry`);
    if (Number(preview.ultraball || 0) > 0) extras.push(`${preview.ultraball} Ultra Ball`);
    return extras.length ? ` + ${extras.join(", ")}` : "";
  }

  function passSupplyTiming(wallet, kind) {
    const daily = kind === 'daily', ready = wallet?.[daily ? 'dailyReady' : 'weeklyReady'];
    const next = wallet?.[daily ? 'passDailyNextAt' : 'passWeeklyNextAt'];
    const last = wallet?.[daily ? 'passDailyClaimedAt' : 'passWeeklyClaimedAt'];
    const date = value => window.PLAY_PASS_CALENDAR?.localTime?.(value,wallet?.rewardTimezone)||(value && Number.isFinite(new Date(value).getTime()) ? new Date(value).toLocaleString(undefined,{timeZoneName:'short'}) : null);
    if(['UTC','LOCAL'].includes(wallet?.calendar) && !wallet?.[daily?'passDailyVerified':'passWeeklyVerified']) return 'Check your subscription to unlock these supplies.';
    if(wallet?.ownerRepeat) return ready ? 'Owner testing: ready to claim again.' : 'Owner testing: 30 seconds between claims of this reward.';
    const available = ready ? 'Available now.' : date(next) ? `Next supply: ${date(next)}.` : 'Check back for your next supply.';
    return available + (date(last) ? ` Last claimed: ${date(last)}.` : '');
  }

  function passFloor(floor, pass, wallet) {
    const info = describePass(pass, wallet);
    const resets=window.PLAY_PASS_CALENDAR?.resets?.(wallet)||{};
    const passState=kind=>!info.active?'Pass needed':wallet?.[kind==='daily'?'dailyReady':'weeklyReady']?'Ready':wallet?.ownerRepeat&&wallet?.[kind==='daily'?'passDailyVerified':'passWeeklyVerified']?'30-second wait':['UTC','LOCAL'].includes(wallet?.calendar)?(wallet?.[kind==='daily'?'passDailyDelivered':'passWeeklyDelivered']?'Claimed':'Verify Pass'):'Cooldown';
    return `<div class="mart-pass mart-pass-compact">
      <section class="pass-showcase${info.active ? ' is-active' : ''}" data-pass-hero>
        <header class="pass-compact-heading">
          <img class="pass-compact-icon" src="${esc(window.playItemSprite(floor.icon || 'rainbow-pass.png'))}" alt="">
          <div><h2 class="pass-title">Starlight Pass <span data-pass-state class="pass-state ${info.active ? 'on' : 'off'}">${info.active ? 'Active' : 'Inactive'}</span></h2>
          <p data-pass-status class="pass-status">${info.active ? 'Daily supplies · Weekly bonus' : esc(info.note)}</p></div>
          <div class="pass-compact-tools"><button id="check-pass" class="pass-check-btn" type="button">Check subscription</button>
          ${pass?.checkedAt ? `<small>Checked ${esc(new Date(pass.checkedAt).toLocaleString())}</small>` : ''}</div>
        </header>
        <div class="pass-calendar-heading"><h3>Your week of supplies</h3><small>${wallet?.rewardTimezone?'Dates follow your reward time zone':'Dates shown in your local time'}</small></div>
        ${window.PLAY_PASS_CALENDAR?.html(wallet, info.active) || ''}
        <div class="pass-reward-panels">
          <article class="pass-reward-card pass-gift-card${info.active && wallet?.dailyReady ? ' is-ready' : ''}">
            <header class="pass-reward-head"><h3>Today’s Pass supply</h3><span class="pass-reward-chip">${passState('daily')}</span></header>
            ${window.PLAY_PASS_REWARDS?.html(lastPassRewards?.daily) || ''}
            <p class="pass-time-note">${esc(passSupplyTiming(wallet, 'daily'))}</p>
            ${!wallet?.ownerRepeat && Array.isArray(wallet?.passDays) && wallet.passDays.length===7 && wallet?.dailyReady && info.active ? '<p class="pass-time-note">Claim today’s supply in the calendar above.</p>' : `<button id="claim-daily" class="pass-claim-btn" type="button"${info.active && wallet?.dailyReady ? '' : ' disabled'}>${info.active && !wallet?.dailyReady ? (['UTC','LOCAL'].includes(wallet?.calendar)?passState('daily'):'On cooldown') : 'Claim daily supply'}</button>`}
          </article>
          <article class="pass-reward-card pass-weekly-card${info.active && wallet?.weeklyReady ? ' is-ready' : ''}">
            <header class="pass-reward-head"><h3>Weekly bonus</h3><span class="pass-reward-chip">${passState('weekly')}</span></header>
            ${window.PLAY_PASS_REWARDS?.html(lastPassRewards?.weekly) || ''}
            <p class="pass-time-note">${esc(passSupplyTiming(wallet, 'weekly'))}</p>
            <button id="claim-weekly" class="pass-claim-btn is-weekly" type="button"${info.active && wallet?.weeklyReady ? '' : ' disabled'}>${info.active && !wallet?.weeklyReady ? (['UTC','LOCAL'].includes(wallet?.calendar)?passState('weekly'):'On cooldown') : 'Claim weekly bonus'}</button>
          </article>
        </div>
        ${window.PLAY_REWARD_TIMEZONE?.note(wallet)||''}${window.PLAY_REWARD_TIMEZONE?.timer(wallet?.rewardDailyResetAt,wallet)||''}${['UTC','LOCAL'].includes(wallet?.calendar)?`<p class="pass-time-note">${resets.daily?'Daily reset: '+esc(resets.daily)+'. ':''}${resets.weekly?'Weekly reset: '+esc(resets.weekly)+'. ':''}Times ${wallet?.rewardTimezone?'follow your saved reward time zone':'are local to your device'}. Saved supplies wait in <a href="storage.html#items">My PC</a>.</p>`:''}
        ${!info.active ? '<p class="pass-subscribe"><a href="https://www.twitch.tv/subs/sorastarlight" target="_blank" rel="noreferrer">Subscribe on Twitch</a> · Connect Twitch in My Account.</p>' : ''}

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
    let artClass = "";
    if (mode === "balls") {
      row = ballView(item);
      sprite = art(row, row.key);
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
      if (mode === "bits") extra = grantListHtml(row);
    }
    const mark = item.featured ? "Featured" : "Special";
    const purpose = row.identity?.collector ? "This is a rare Poké Ball for collectors. Catch power matches a Poké Ball." : purposeText(row, mode);
    return `<article class="mart-featured${item.featured ? " is-glow" : ""}">
      <div class="mart-featured-art${artClass}" aria-hidden="true">
        <img src="${esc(sprite)}" alt="">
      </div>
      <div class="mart-featured-copy mart-copy">
        <p class="mart-featured-mark">${mark}</p>
        <strong class="mart-featured-name">${esc(displayName(row))}</strong>
        <p class="mart-featured-desc mart-purpose">${esc(purpose || "\u00a0")}</p>
        <div class="mart-featured-owned">${ownedLine(row) || "<span class=\"muted\">&nbsp;</span>"}</div>
      </div>
      <div class="mart-featured-actions mart-price">
        <div class="mart-card-price">${costHtml(row, mode === "avatars" ? "coins" : mode)}</div>

        ${action || `<span class="mart-add-spacer" aria-hidden="true"></span>`}
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
    const blurb = floor.blurb || (avatars
      ? "Premium Trainer looks for your ID and Profile."
      : bits
        ? "Optional stream support Power-Ups."
        : "Stocked for this department.");
    return `<section class="mart-floor${bits ? " bits-floor" : ""}${avatars ? " avatar-floor" : ""}" id="${esc(id)}" role="tabpanel" aria-labelledby="mart-tab-${esc(id)}" data-mart-panel="${esc(id)}" hidden>
      <header class="mart-dept-head">
        <img class="mart-dept-icon" src="${esc(window.playItemSprite(icon))}" alt="" width="48" height="48">
        <div class="mart-dept-copy">
          <h2 class="mart-dept-title">${esc(title)}</h2>
          <p class="mart-dept-blurb">${esc(blurb)}</p>
        </div>
      </header>
      ${body || `<p class="muted">No items are available here right now.</p>`}
    </section>`;
  }

  function stageHtml(featuredHtml, restHtml, restClass) {
    const featured = featuredHtml || `<div class="mart-featured-slot is-empty" aria-hidden="true"></div>`;
    return `<div class="mart-stage">
      ${featured}
      <div class="${restClass || "mart-shelf"}">${restHtml || ""}</div>
    </div>`;
  }

  function coinsFloor(floor, index) {
    const { featured, rest } = splitFeatured((floor.items || []).map(withLureBlurb));
    return floorShell(
      floor,
      floor.icon || "pokecoin.png",
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
      stageHtml(featuredCard(featured, "balls"), rest.map((item) => shelfCard(item, "balls")).join(""), "mart-shelf"),
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
      stageHtml(featuredCard(featured, "avatars", ownedPacks), rest.map((item) => avatarCard(item, ownedPacks)).join(""), "mart-shelf is-pack-shelf"),
      " data-avatar-status",
      index
    );
  }

  function bitsFloor(floor, index) {
    const { featured, rest } = splitFeatured(floor.items || []);
    const history = Array.isArray(lastSupport.events) ? lastSupport.events : [];
    const historyHtml = history.length
      ? `<section class="support-recent" aria-label="Recent support rewards">
          <p class="eyebrow">Recent support rewards</p>
          ${lastSupport.bitsTotal ? `<p class="muted">You've supported Sora Starlight streams with ${money(lastSupport.bitsTotal)} Bits.</p>` : ""}
          ${lastSupport.pending ? `<p class="muted">A Power-Up is waiting until this Twitch account is linked for gameplay.</p>` : ""}
          <ul>${history.slice(0, 6).map((row) => `<li><strong>${esc(row.name || row.sku)}</strong> · ${esc(row.status)} · ${money(row.bits)} Bits</li>`).join("")}</ul>
        </section>`
      : (lastSupport.pending
        ? `<p class="muted">A Power-Up is waiting until this Twitch account is linked for gameplay.</p>`
        : `<p class="muted">Optional stream support: use a matching Custom Power-Up on Twitch for guaranteed supplies listed above. General cheers are thank-yous, not Mart checkouts. Twitch Bits are stream support — Pokémon StreamLink does not convert them into a Star Bits currency. Power-Ups are never required to catch Pokémon.</p>`);
    return floorShell(
      floor,
      floor.icon || "amulet-coin.png",
      stageHtml(featuredCard(featured, "bits"), rest.map((item) => shelfCard(item, "bits")).join(""), "mart-shelf") + historyHtml,
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
    els.ballGrid.innerHTML = rest.map((item) => shelfCard(item, "balls")).join("");
  }

  function floorTabLabel(floor) {
    const id = floorTabId(floor, 0);
    const kind = String(floor?.kind || "");
    if (kind === "balls" || id === "balls") return "Poké Balls";
    if (kind === "avatars" || id === "premium-avatars") return "Avatars";
    if (kind === "bits") return "Power-Ups";
    if (/berry/i.test(id) || /berry/i.test(floor?.name || "")) return "Berry Stand";
    if (/evol/i.test(id) || /evol/i.test(floor?.name || "")) return "Evolution";
    if (/suppl|field|kit|coin/i.test(id) || kind === "coins") return "Supplies";
    const name = String(floor?.name || "Shelf");
    return name.length > 14 ? name.slice(0, 12).trim() + "…" : name;
  }

  function modeToggleHtml() {
    return `<div class="mart-mode" role="tablist" aria-label="Buy or Sell">
      <button type="button" class="mart-mode-btn${martMode === "buy" ? " is-on" : ""}" data-mart-mode="buy" role="tab" aria-selected="${martMode === "buy"}" aria-controls="mart-mode-panel">
        <img class="mart-mode-icon" src="${esc(window.playItemSprite?.("inventory-bag") || "images/items/inventory-bag.png")}" alt="" width="22" height="22" decoding="async" aria-hidden="true">
        <span>Buy</span>
      </button>
      <button type="button" class="mart-mode-btn${martMode === "sell" ? " is-on" : ""}" data-mart-mode="sell" role="tab" aria-selected="${martMode === "sell"}" aria-controls="mart-mode-panel">
        <img class="mart-mode-icon" src="${esc(window.playItemSprite?.("pokecoin") || "images/items/pokecoin.png")}" alt="" width="22" height="22" decoding="async" aria-hidden="true">
        <span>Sell</span>
      </button>
    </div>`;
  }

  function syncModeMount() {
    /* Buy/Sell lives inside the Mart workspace (renderFloors) — no kicker mount. */
  }

  function martModeEl() {
    return document.querySelector(".mart-mode") || document.getElementById("mart-mode-mount");
  }

  function preserveMartModeViewport(run) {
    const el = martModeEl();
    const top = el ? el.getBoundingClientRect().top : null;
    return Promise.resolve(run()).then(() => new Promise((resolve) => {
      requestAnimationFrame(() => {
        const next = martModeEl();
        if (next && top != null) {
          window.scrollBy(0, next.getBoundingClientRect().top - top);
        }
        resolve();
      });
    }));
  }

  async function switchMartMode(nextMode) {
    if (nextMode === martMode) return;
    await preserveMartModeViewport(async () => {
      martMode = nextMode;
      try {
        const url = new URL(window.location.href);
        const hash = url.hash.replace(/^#/, "");
        if (nextMode === "sell") url.hash = SELL_TAB;
        else if (hash === SELL_TAB || hash === "sell") {
          url.hash = lastTab && lastTab !== SELL_TAB && lastTab !== "sell" ? lastTab : "";
        }
        window.history.replaceState(null, "", url);
      } catch (_) {}
      if (martMode === "sell") await refreshSellShelf();
      renderFloors(lastCatalog, lastWallet, lastPass, lastOwned);
    });
  }

  function sellCardHtml(item) {
    const slug = item.slug;
    const owned = Math.max(0, Number(item.owned || 0));
    const unit = Math.max(0, Number(item.unitPrice || 0));
    const qty = Math.max(1, Math.min(99, owned || 1, Number(sellQty[slug] || 1)));
    sellQty[slug] = qty;
    const total = unit * qty;
    const sprite = item.sprite || window.playItemSprite?.(slug) || "images/items/poke-ball.png";
    const coinHtml = typeof window.playCoinsHtml === "function" ? window.playCoinsHtml(total) : money(total);
    const unitHtml = typeof window.playCoinsHtml === "function" ? window.playCoinsHtml(unit) : money(unit);
    return `<article class="mart-card is-sell" data-sell-slug="${esc(slug)}">
      <div class="mart-card-media"><img class="mart-sell-art" src="${esc(sprite)}" alt="" width="72" height="72" loading="lazy" decoding="async"></div>
      <div class="mart-card-body">
        <strong class="mart-card-name">${esc(item.name || slug)}</strong>
        <p class="mart-card-desc">${esc(item.blurb || "A valuable item.")}</p>
        <div class="mart-card-owned"><span class="muted">Owned</span> <strong>${owned.toLocaleString()}</strong></div>
        <div class="mart-sell-unit"><span class="muted">Sell price</span> ${unitHtml}</div>
      </div>
      <div class="mart-card-actions is-sell-actions">
        <div class="mart-sell-qty" role="group" aria-label="Sell quantity">
          <button type="button" class="secondary" data-sell-dec="${esc(slug)}" ${qty <= 1 || sellBusy || sellAttempt || sellRecoveryBlocked ? "disabled" : ""}>−</button>
          <span class="mart-sell-qty-val">${qty}</span>
          <button type="button" class="secondary" data-sell-inc="${esc(slug)}" ${qty >= Math.min(99, owned) || sellBusy || sellAttempt || sellRecoveryBlocked ? "disabled" : ""}>+</button>
        </div>
        <div class="mart-sell-total"><span class="muted">Total</span> <strong>${coinHtml}</strong></div>
        <button type="button" class="gold mart-sell-go" data-sell-go="${esc(slug)}" ${owned < 1 || unit < 1 || sellBusy || sellAttempt || sellRecoveryBlocked ? "disabled" : ""}>Sell</button>
      </div>
    </article>`;
  }

  function sellFloorHtml() {
    const cards = sellShelf.length
      ? sellShelf.map(sellCardHtml).join("")
      : `<p class="muted">No sellable valuables in your bag yet. Complete Professor Oak Research or receive valuables, then sell them here for PokéCoins.</p>`;
    return `<section class="mart-floor mart-sell-floor" id="mart-sell-panel" role="tabpanel" aria-labelledby="mart-tab-${SELL_TAB}" data-mart-panel="${SELL_TAB}">
      <header class="mart-dept-head">
        <img class="mart-dept-icon" src="${esc(window.playItemSprite("pokecoin.png"))}" alt="" width="48" height="48">
        <div class="mart-dept-copy">
          <h2 class="mart-dept-title">Sell Valuables</h2>
          <p class="mart-dept-blurb">Trade valuables from your Bag for PokéCoins.</p>
        </div>
      </header>
      <p class="muted mart-sell-help">Only items you own that can be sold appear here. Review the quantity and PokéCoins you will receive before confirming.</p>
      <p class="mart-checkout-note" data-sell-status${sellNote ? "" : " hidden"}>${esc(sellNote)}</p><button type="button" data-sell-recover${sellAttempt ? "" : " hidden"}${sellBusy || sellRecoveryBlocked ? " disabled" : ""}>Check previous sale</button>
      <div class="mart-shelf mart-sell-grid">${cards}</div>
    </section>`;
  }

  async function refreshSellShelf(parentCurrent = () => true) {
    const epoch = checkoutEpoch, actor = checkoutActor, serial = ++sellReadSerial;
    const current = () => epoch === checkoutEpoch && serial === sellReadSerial && parentCurrent();
    try {
      if (!await martSessionMatches(actor, epoch) || !current()) return false;
      const data = await window.playCall("play_mart_sell_shelf");
      if (!await martSessionMatches(actor, epoch) || !current()) return false;
      sellShelf = Array.isArray(data?.items) ? data.items : [];
      const keep = new Set(sellShelf.map(row => row.slug));
      Object.keys(sellQty).forEach(key => { if (!keep.has(key)) delete sellQty[key]; });
      return true;
    } catch (_) { if (current()) sellShelf = []; return false; }
  }

  async function sellItem(slug) {
    if (sellBusy || sellRecoveryBlocked) return;
    const epoch = checkoutEpoch, actor = checkoutActor;
    if (!actor) { sellNote = "Sign in before selling items."; syncSellUi(); return; }
    const current = () => epoch === checkoutEpoch && actor === checkoutActor;
    const recovery = Boolean(sellAttempt);
    const verify = async () => {
      const valid = await martSessionMatches(actor, epoch);
      if (!current()) return false;
      if (!valid) { setCheckoutAccount(null); fillWallet(null); renderFloors(lastCatalog, null, null, []); if (els.status) els.status.textContent = "Your account changed. Reload the Mart before selling items."; }
      return valid;
    };
    let confirmed = false, sent = false;
    sellBusy = true;
    try {
      if (!recovery) {
        const row = sellShelf.find(item => item.slug === slug);
        if (!row) return;
        const owned = Number(row.owned), unit = Number(row.unitPrice), qty = Math.min(99, owned, Number(sellQty[slug] || 1));
        if (!Number.isSafeInteger(qty) || qty < 1 || !Number.isSafeInteger(unit) || unit < 1) throw Error("Choose 1–99 owned items with a valid sell price.");
        const body = `Sell ${qty} ${row.name || slug}?\n\nYou will receive: ${(unit * qty).toLocaleString()} PokéCoins`;
        const ok = window.playPresentConfirm ? await window.playPresentConfirm({ title: "Confirm sale", body, confirmLabel: "Sell Items", cancelLabel: "Cancel" }) : window.confirm(body);
        if (!ok || !current()) return;
        if (!await verify()) return;
        sellAttempt = { actor, item: slug, quantity: qty, key: "mart-sell:" + newOrderId() };
        try { rememberSale(); } catch (_) { sellAttempt = null; throw Error("Your browser could not save sale recovery. Nothing was sold. Check site storage before trying again."); }
      }
      if (!current() || !await verify()) return;
      const attempt = sellAttempt;
      sellNote = "Checking the original sale…"; syncSellUi(); sent = true;
      const data = await window.playCall("play_sell_item", { p_item_key: attempt.item, p_quantity: attempt.quantity, p_idempotency_key: attempt.key });
      if (!current() || !await verify()) return;
      if (data?.ok !== true || data.item !== attempt.item || data.quantity !== attempt.quantity || !Number.isSafeInteger(data.unitPrice) || data.unitPrice < 1 || !Number.isSafeInteger(data.coinsReceived) || data.coinsReceived !== data.unitPrice * data.quantity) throw Error("Sale receipt could not be confirmed.");
      confirmed = true; sellAttempt = null; sellShelf = []; sellNote = "";
      try { rememberSale(); } catch (_) { sellRecoveryBlocked = true; sellNote = "Sale completed, but browser recovery could not clear. Reload the Mart to inspect it."; }
      window.playPresentEnqueue?.([{ id: "mart-sale:" + attempt.key, type: "item", kind: "loot", title: data.duplicate === true ? "Previous sale confirmed" : "Sale complete!", subtitle: `Sold: ${data.displayName || attempt.item} ×${data.quantity}`, body: `Received: ${data.coinsReceived.toLocaleString()} PokéCoins`, rewards: [{ type: "coins", amount: data.coinsReceived }] }]);
      const refreshed = await refreshStore();
      if (!current() || !await verify()) return;
      if (!refreshed) sellNote = "Sale completed. Refresh the Mart to update your items and balance; do not sell them again.";
      if (martMode === "sell") renderFloors(lastCatalog, lastWallet, lastPass, lastOwned);
    } catch (error) {
      if (!current()) return;
      if (confirmed) sellNote = "Sale completed, but the display could not finish. Refresh the Mart to inspect your items and balance.";
      else if (sent && !recovery && ["P0001", "22023", "42501", "23514", "23503", "23505", "40001", "55P03"].includes(String(error?.code))) { sellAttempt = null; try { rememberSale(); } catch (_) {} sellNote = error.message || "Sale rejected. No items were sold by this attempt."; }
      else sellNote = sent ? "Sale outcome is unconfirmed. Use Check previous sale before selling more; it reuses the original request." : error.message || "Sale could not be prepared.";
    } finally { if (current()) { sellBusy = false; syncSellUi(); } }
  }

  function syncSellUi() {
    const panel = els.floors?.querySelector(`[data-mart-panel="${SELL_TAB}"]`);
    if (!panel) return;
    const note = panel.querySelector("[data-sell-status]");
    if (note) {
      note.hidden = !sellNote;
      note.textContent = sellNote;
    }
    const recovery = panel.querySelector("[data-sell-recover]");
    if (recovery) { recovery.hidden = !sellAttempt; recovery.disabled = sellBusy || sellRecoveryBlocked; }
    const grid = panel.querySelector(".mart-sell-grid");
    if (grid) grid.innerHTML = sellShelf.length
      ? sellShelf.map(sellCardHtml).join("")
      : `<p class="muted">No sellable valuables in your bag yet.</p>`;
  }

  function tabButtons(floors) {
    const shelves = floors.map((floor, index) => {
      const id = floorTabId(floor, index);
      const label = floorTabLabel(floor);
      const formal = floor.name || label;
      return `<button class="mart-tab" type="button" role="tab" id="mart-tab-${esc(id)}" data-mart-tab="${esc(id)}" aria-controls="${esc(id)}" aria-selected="false" tabindex="-1" title="${esc(formal)}"><img class="mart-tab-icon" src="${esc(floorTabIcon(floor))}" alt=""><span class="mart-tab-label">${esc(label)}</span></button>`;
    }).join("");
    const checkout = `<button class="mart-tab mart-tab-checkout" type="button" role="tab" id="mart-tab-${CHECKOUT_TAB}" data-mart-tab="${CHECKOUT_TAB}" aria-controls="${CHECKOUT_TAB}" aria-selected="false" tabindex="-1">${checkoutTabLabel()}</button>`;
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
    if (raw === SELL_TAB || raw === "sell") {
      martMode = "sell";
      return SELL_TAB;
    }
    if (raw === CHECKOUT_TAB) {
      martMode = "buy";
      return CHECKOUT_TAB;
    }
    if (raw && ids.includes(raw)) {
      martMode = "buy";
      return raw;
    }
    if (raw === "avatars" || raw === "premium-avatars") {
      martMode = "buy";
      const match = shop.find((floor) => floor.kind === "avatars");
      if (match) return floorTabId(match, floors.indexOf(match));
    }
    if (raw && shop.some((floor) => floor.kind === raw)) {
      martMode = "buy";
      const match = shop.find((floor) => floor.kind === raw);
      return floorTabId(match, floors.indexOf(match));
    }
    if (/^(evolution|firestone|waterstone|thunderstone|leafstone|moonstone|linkingcord)$/.test(raw)) {
      martMode = "buy";
      const match = shop.find((floor, index) => {
        const id = floorTabId(floor, floors.indexOf(floor));
        return id === "evolution" || floor.key === "evolution" || /evol/i.test(String(floor.name || floor.key || ""));
      });
      if (match) return floorTabId(match, floors.indexOf(match));
    }
    if (martMode === "sell") return SELL_TAB;
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
          <strong>${esc(displayName({ name }))}</strong>
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
    const cartBody = count
      ? `<div class="mart-cart-list">${lines}</div>
         <div class="mart-cart-foot">
           <p class="mart-cart-total"><span>Total</span> <span class="mart-cost"><img src="${window.playItemSprite("coins")}" alt="">${money(total)}</span></p>
           ${short ? `<p class="mart-cart-warn">You need ${money(total - coins)} more PokéCoins.</p>` : (lastWallet ? `<p class="muted">Cost: ${money(total)} · Balance after: ${money(coins - total)}</p>` : "")}
           ${typeof window.playPremierPreview === "function" && window.playPremierPreview(cart, findSku) > 0
             ? `<p class="mart-cart-fanfare-kicker">Bonus: Premier Ball ×${window.playPremierPreview(cart, findSku)}</p>`
             : ""}
           <div class="mart-checkout-buttons"><button type="button" class="secondary" data-cart-empty${checkoutBusy || checkoutAttempt ? " disabled" : ""}>Empty cart</button><button type="button" class="gold" data-checkout-buy${(short && !checkoutAttempt) || checkoutBusy || checkoutRecoveryBlocked ? " disabled" : ""}>${checkoutAttempt ? "Check previous purchase" : "Purchase"}</button></div>
         </div>`
      : `<div class="mart-cart-empty is-compact">
           ${cartIconHtml("mart-cart-empty-icon")}
           <p><strong>Your Cart Is Empty</strong></p>
         </div>`;
    const fanfare = lastPurchase ? purchaseFanfareHtml(lastPurchase) : "";
    return `<section class="mart-floor mart-checkout-floor${lastPurchase ? " is-fanfare" : ""}${count ? "" : " is-empty-cart"}" id="${CHECKOUT_TAB}" role="tabpanel" aria-labelledby="mart-tab-${CHECKOUT_TAB}" data-mart-panel="${CHECKOUT_TAB}" hidden>
      <header class="mart-dept-head">
        ${cartIconHtml("mart-dept-icon mart-sign-cart")}
        <div class="mart-dept-copy">
          <h2 class="mart-dept-title">Checkout</h2>
          <p class="mart-dept-blurb">${lastPurchase ? "Your items are in your bag!" : "Review quantities, then purchase once."}</p>
        </div>
      </header>
      ${fanfare || cartBody}
      <p class="mart-checkout-note" data-checkout-status${checkoutNote ? "" : " hidden"}>${esc(checkoutNote)}</p>
    </section>`;
  }

  function purchaseFanfareHtml(receipt) {
    const items = (receipt.lines || []).map((row) => `
      <li>
        <img src="${esc(row.sprite)}" alt="">
        <strong>${esc(row.name)}</strong>
        <span>×${row.qty}</span>
      </li>`).join("");
    return `<div class="mart-cart-fanfare" data-purchase-fanfare>
      <div class="mart-cart-fanfare-burst" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
      <p class="mart-cart-fanfare-kicker">Sold!</p>
      <h3>Thank you for your purchase!</h3>
      <ul class="mart-cart-fanfare-items">${items}</ul>
      ${receipt.total == null ? `<p class="muted">Your previous order is confirmed.</p>` : `<p class="mart-cart-fanfare-total"><span>Paid</span> <span class="mart-cost"><img src="${window.playItemSprite("coins")}" alt="">${money(receipt.total)}</span></p>`}
      ${receipt.premierBonus ? `<p class="mart-cart-fanfare-kicker">Bonus! You received ${money(receipt.premierBonus)} Premier Ball${Number(receipt.premierBonus) === 1 ? "" : "s"}!</p>` : ""}
      ${receipt.after != null ? `<p class="muted">You have ${money(receipt.after)} PokéCoins left.</p>` : `<p class="muted">They’re in your bag now. Come back any time!</p>`}
    </div>`;
  }

  function checkoutTabLabel() {
    const count = cartCount();
    return `${cartIconHtml("mart-tab-icon mart-tab-cart")}<span class="mart-tab-label">Checkout</span>${count ? `<span class="mart-cart-count">${count}</span>` : ""}`;
  }

  function syncCheckoutUi({ bump } = {}) {
    document.querySelectorAll('[data-product-count]').forEach(input => { const count=cart.find(row=>row.sku===input.dataset.productCount)?.qty||0; if(document.activeElement!==input)input.value=count; });
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
    if (checkoutAttempt || checkoutRecoveryBlocked) next.querySelectorAll("[data-cart-inc],[data-cart-dec],[data-cart-remove],[data-cart-empty]").forEach(control => control.disabled = true);
  }

  function addToCheckout(sku) {
    setCartQty(sku, (cart.find(row => row.sku === sku)?.qty || 0) + 1);
  }

  function cartFeedback(body, kind = 'success') {
    window.playToast?.({ kind, title: kind === 'error' ? 'Cannot add item' : 'Cart updated', body });
  }

  function emptyCart() {
    if (checkoutBusy || checkoutAttempt || checkoutRecoveryBlocked || !cart.length) return;
    cart = [];
    checkoutNote = '';
    lastPurchase = null;
    saveCart();
    syncCheckoutUi();
    cartFeedback('Your cart is empty.');
  }

  async function confirmEmptyCart() {
    if(checkoutBusy||checkoutAttempt||checkoutRecoveryBlocked||emptyCartBusy||!cart.length)return;
    const snapshot=JSON.stringify(cart),epoch=checkoutEpoch;emptyCartBusy=true;
    try{
      const body='Remove all items from Your Cart?';
      const yes=window.playPresentConfirm?await window.playPresentConfirm({title:'Empty Your Cart?',body,confirmLabel:'Empty cart',cancelLabel:'Keep items'}):window.confirm(body);
      if(!yes)return;
      if(epoch!==checkoutEpoch||checkoutBusy||checkoutAttempt||JSON.stringify(cart)!==snapshot){window.playToast?.({kind:'warning',title:'Your cart changed',body:'Review Your Cart before emptying it.'});return;}
      emptyCart();
    }finally{emptyCartBusy=false;}
  }

  function setCartQty(sku, qty) {
    if (checkoutBusy) return;
    if (checkoutAttempt || checkoutRecoveryBlocked) { cartFeedback("Check your previous purchase in Checkout before changing the cart.", "error"); return; }
    const item = findSku(sku);
    if (!Number.isSafeInteger(Number(qty)) || Number(qty) < 0) return;
    const previous = cart.find(row => row.sku === sku)?.qty || 0;
    const next = Math.min(item?.pack ? 1 : CART_MAX_QTY, Number(qty));
    if (next === previous) return;
    if (next > previous) {
      if (!item || Number(item.bits) > 0 || (item.pack && lastOwned.includes(item.pack))) return;
      const coins = Number(lastWallet?.coins);
      const cost = Number(item.cost);
      const total = cart.reduce((sum, row) => sum + (row.sku === sku ? 0 : Number(findSku(row.sku)?.cost || 0) * row.qty), 0) + cost * next;
      if (!lastWallet || !Number.isFinite(coins) || !Number.isFinite(cost) || cost < 0) {
        cartFeedback('Sign in and wait for your balance to load.', 'error');
        syncCheckoutUi();
        return;
      }
      if (total > coins) {
        cartFeedback('You do not have enough PokéCoins to add that quantity.', 'error');
        syncCheckoutUi();
        return;
      }
    }
    checkoutNote = "";
    lastPurchase = null;
    if (next < 1) {
      cart = cart.filter((row) => row.sku !== sku);
    } else {
      const row = cart.find((entry) => entry.sku === sku);
      const cap = item?.pack ? 1 : CART_MAX_QTY;
      if (row) row.qty = Math.min(cap, next);
      else if(item && !Number(item.bits) && !(item.pack && (lastOwned||[]).includes(item.pack))) cart.push({sku,qty:Math.min(cap,next)});
    }
    saveCart();
    syncCheckoutUi({ bump: next > previous });
    cartFeedback(next > previous ? `${next - previous} × ${displayName(item)} added to your cart.` : `${previous - next} × ${displayName(item || {name:sku})} removed from your cart.`);
  }

  function renderFloors(catalog, wallet, pass, ownedPacks) {
    if (!els.floors) return;
    parkWallet();
    const floors = catalog?.floors?.length ? catalog.floors : fallbackFloors(catalog);
    const shop = shopFloors(floors);
    const passRow = floors.find((floor) => floor.kind === "pass");
    const tab = resolveTab(floors, location.hash);
    const passHtml = passRow ? passFloor(passRow, pass, wallet) : "";
    const choiceHtml = renderChoices(wallet);
    const tabs = shop.length ? tabButtons(shop) : "";
    const buyBody = shop.length
      ? `${shop.map((floor) => floorHtml(floor, floors.indexOf(floor), ownedPacks)).join("")}${checkoutHtml()}`
      : "";
    const sellBody = sellFloorHtml();
    const folder = `<div class="mart-folder${martMode === "sell" ? " is-sell-mode" : " is-buy-mode"}">
          ${tabs}
          <div class="mart-mode-workspace">
            ${modeToggleHtml()}
            <div class="mart-folder-body" id="mart-mode-panel" role="tabpanel">
              ${martMode === "sell" ? sellBody : buyBody}
            </div>
          </div>
        </div>`;
    els.floors.innerHTML = `${choiceHtml}${passHtml}${shop.length || martMode === "sell" ? folder : ""}`;
    syncModeMount();
    placeWallet();
    if (martMode === "sell") {
      lastTab = SELL_TAB;
      if (location.hash.replace(/^#/, "") !== SELL_TAB) {
        try {
          const url = new URL(window.location.href);
          url.hash = SELL_TAB;
          window.history.replaceState(null, "", url);
        } catch (_) {}
      }
      // Keep a department tab visually selected so tab padding/height stay stable.
      const tabs = els.floors?.querySelectorAll(".mart-tab[data-mart-tab]");
      if (tabs?.length && !els.floors.querySelector(".mart-tab.is-on")) {
        tabs[0].classList.add("is-on");
      }
    } else {
      showTab(tab, { updateHash: Boolean(location.hash) && location.hash.replace(/^#/, "") !== "pass" });
    }
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

  let passCheckBusy = false;
  async function checkPass(button) {
    if (passCheckBusy) return;
    const actor = checkoutActor, epoch = checkoutEpoch;
    const current = () => checkoutActor === actor && checkoutEpoch === epoch;
    const note = document.querySelector("[data-pass-status]") || els.status;
    if (!actor) { if (note) note.textContent = "Sign in first."; return; }
    const verify = async () => {
      const valid = await martSessionMatches(actor, epoch);
      if (!current()) return false;
      if (!valid) { setCheckoutAccount(null); fillWallet(null); renderFloors(lastCatalog, null, null, []); }
      return valid;
    };
    passCheckBusy = true;
    const wasDisabled = Boolean(button?.disabled);
    const fallback = "Could not check Starlight Pass right now. Please try again.";
    if (button) { button.disabled = true; button.setAttribute("aria-busy", "true"); }
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (!current()) return;
      const session = sessionData?.session;
      if (sessionError) throw sessionError;
      if (!session || session.user?.id !== actor) { await verify(); return; }
      // The server decides whether a provider token is required (the channel owner does not need one).
      if (note) note.textContent = "Checking Twitch…";
      const { data, error } = await supabase.functions.invoke("refresh-pass", { body: { accessToken: session.provider_token || "" } });
      if (!current() || !await verify()) return;
      if (error) {
        const message = await functionMessage(error, fallback);
        if (current() && await verify() && note) note.textContent = message;
        return;
      }
      const resultMessage = data?.message || (data?.active ? "Starlight Pass is active." : "Twitch says you are not subscribed right now.");
      if (note) note.textContent = resultMessage;
      try {
        await load();
        if (!current() || !await verify()) return;
        const refreshedNote = document.querySelector("[data-pass-status]") || note;
        if (refreshedNote) refreshedNote.textContent = resultMessage;
      } catch (_) {
        if (current() && await verify() && note) note.textContent = resultMessage + " The Mart could not refresh. Reload the page for the latest display.";
      }
    } catch (_) {
      if (current() && await verify() && note) note.textContent = fallback;
    } finally {
      if (current()) {
        passCheckBusy = false;
        if (button?.isConnected) { button.disabled = wasDisabled; button.removeAttribute("aria-busy"); }
      }
    }
  }

  function scheduleOwnerRewards() {
    clearTimeout(ownerRewardTimer);
    const wallet=lastWallet;
    if(!wallet?.ownerRepeat)return;
    const pending=[];
    for(const kind of ['daily','weekly']){
      const prefix=kind==='daily'?'passDaily':'passWeekly';
      if(!wallet[prefix+'Verified'])continue;
      const wait=Date.parse(wallet[prefix+'NextAt'])-Date.now();
      if(Number.isFinite(wait)&&wait>0)pending.push(wait);
    }
    if(!pending.length)return;
    ownerRewardTimer=setTimeout(()=>{
      if(lastWallet!==wallet)return;
      for(const kind of ['daily','weekly']){
        const prefix=kind==='daily'?'passDaily':'passWeekly';
        if(wallet[prefix+'Verified']&&Date.parse(wallet[prefix+'NextAt'])<=Date.now()){
          wallet[kind==='daily'?'dailyReady':'weeklyReady']=true;
          const button=document.getElementById('claim-'+kind);
          if(button&&!claimBusy&&!claimNeedsRefresh&&describePass(lastPass,wallet).active){
            button.disabled=false;button.textContent=kind==='daily'?'Claim daily supply':'Claim weekly bonus';
            const card=button.closest?.('.pass-reward-card'),chip=card?.querySelector('.pass-reward-chip'),note=card?.querySelector('.pass-time-note');
            if(chip)chip.textContent='Ready';
            if(note)note.textContent='Owner testing: ready to claim again.';
          }
        }
      }
      scheduleOwnerRewards();
    },Math.min(...pending)+100);
  }

  async function refreshStore() {
    const epoch = checkoutEpoch, actor = checkoutActor, serial = ++martReadSerial;
    const current = () => epoch === checkoutEpoch && serial === martReadSerial;
    const verify = async () => {
      const valid = await martSessionMatches(actor, epoch);
      if (!current()) return false;
      if (!valid) { clearMartAccountData(); fillWallet(null); renderFloors(lastCatalog, null, null, []); if (els.status) els.status.textContent = "Your account changed. Reload the Mart to view its balance and rewards."; }
      return valid;
    };
    try {
      if (!await verify()) return null;
      await window.PLAY_REWARD_TIMEZONE?.ensure();
      if (!current()) return null;
      const data = await window.playCall("play_store");
      if (!await verify()) return null;
      if (data?.ok !== true || !data.catalog || typeof data.catalog !== "object" || Array.isArray(data.catalog)) throw Error("Mart catalog could not be verified.");
      let support;
      try { support = await window.playCall("play_support_recent") || { events: [], bitsTotal: 0, pending: false }; }
      catch (_) { support = { events: [], bitsTotal: 0, pending: false }; }
      if (!await verify()) return null;
      await refreshSellShelf(current);
      if (!await verify()) return null;
      lastCatalog = data.catalog; lastWallet = data.wallet; lastPass = data.pass; lastPassRewards = data.passRewards || null;
      lastOwned = data.ownedAvatarPacks || []; lastBag = data.bag || null; lastSupport = support;
      window._playOwnedAvatarPacks = lastOwned;
      fillWallet(lastWallet); renderFloors(lastCatalog, lastWallet, lastPass, lastOwned); scheduleOwnerRewards();
      return data;
    } catch (error) {
      if (!current()) return null;
      if (!await verify()) return null;
      if (els.status) els.status.textContent = window.playRpcError(error, "Mart catalog is not live yet.");
      await refreshSellShelf(current);
      if (!current() || !await verify()) return null;
      renderFloors(lastCatalog, lastWallet, lastPass, lastOwned);
      return null;
    }
  }

  async function load() {
    const serial = ++martLoadSerial;
    try {
      if (!sessionStorage.getItem("play-mart-enter")) { sessionStorage.setItem("play-mart-enter", "1"); document.body.classList.add("is-mart-enter"); }
    } catch (_) {}
    let epoch = checkoutEpoch;
    const current = () => serial === martLoadSerial && epoch === checkoutEpoch;
    try {
      const result = await supabase.auth.getSession();
      if (!current()) return;
      if (result.error) throw Error("Sign-in could not be verified.");
      const session = result.data?.session;
      const changed = checkoutActor !== (session?.user?.id || null);
      setCheckoutAccount(session?.user?.id || null); epoch = checkoutEpoch;
      if (changed || !session) fillWallet(null);
      if (!session) { window.playSetAccountNav(null); await refreshStore(); return; }
      const { data: profile } = await supabase.from("profiles").select("display_name, twitch_login, avatar_url, starlight_pass, pass_source").eq("id", session.user.id).maybeSingle();
      if (!current()) return;
      let linkedLogin = "";
      try {
        const { data: cons } = await supabase.from("twitch_connections").select("twitch_login, confirmed, connection_type, is_primary").eq("user_id", session.user.id);
        const row = (cons || []).filter(c => c.confirmed && (c.connection_type === "player" || c.connection_type === "secondary")).sort((a,b) => Number(b.is_primary) - Number(a.is_primary))[0];
        linkedLogin = row?.twitch_login || "";
      } catch (_) {}
      if (!current() || !await martSessionMatches(session.user.id, epoch)) return;
      const store = await refreshStore();
      if (!current() || !await martSessionMatches(session.user.id, epoch)) return;
      lastLinkedLogin = linkedLogin;
      window.playSetAccountNav(session, profile, { isAdmin: Boolean(store?.isAdmin), trainer: store?.trainer, twitchLinked: store?.twitchLinked });
    } catch (error) {
      if (!current()) return;
      clearMartAccountData(); fillWallet(null); window.playSetAccountNav(null);
      if (els.status) els.status.textContent = window.playRpcError(error, "Mart sign-in could not be checked. Reload to try again.");
    }
  }

  async function purchaseCart(button) {
    if ((!cart.length && !checkoutAttempt) || checkoutBusy || checkoutRecoveryBlocked) return;
    checkoutBusy = true;
    let epoch = checkoutEpoch, confirmed = false, sent = false, recovery = false;
    try {
      const before = await supabase.auth.getSession();
      if (before.error) throw Error("Your sign-in could not be verified. Reload the Mart before purchasing.");
      const session = before.data?.session;
      if (epoch !== checkoutEpoch) return;
      if (!session?.user?.id) { setCheckoutAccount(null); epoch = checkoutEpoch; checkoutNote = "Sign in first."; return; }
      if (checkoutActor && checkoutActor !== session.user.id) { setCheckoutAccount(session.user.id); epoch = checkoutEpoch; checkoutNote = "Your account changed. Reload the Mart and review the cart before purchasing."; return; }
      setCheckoutAccount(session.user.id); epoch = checkoutEpoch; checkoutBusy = true;
      if (checkoutRecoveryBlocked) return;
      if (!checkoutAttempt && !lastWallet) throw Error("Wait for your current account balance to load before purchasing.");
      recovery = Boolean(checkoutAttempt);
      if (button) button.disabled = true;
      const items = (checkoutAttempt?.items || cart).map(row => ({ sku: row.sku, qty: row.qty }));
      const receipt = { total: items.reduce((n, row) => n + Number(findSku(row.sku)?.cost || 0) * row.qty, 0), lines: items.map(row => { const item = findSku(row.sku); return { sku: row.sku, qty: row.qty, name: item?.name || row.sku, sprite: cartLineSprite(item) }; }) };
      if (!checkoutAttempt) {
        checkoutAttempt = { actor: checkoutActor, orderId: newOrderId(), items };
        try { rememberCheckout(); } catch (_) { checkoutAttempt = null; throw Error("Your browser could not save the checkout request. Nothing was purchased. Check site storage and try again."); }
      }
      const attempt = checkoutAttempt;
      sent = true;
      const data = await window.playCall("play_buy_cart", { p_items: attempt.items.map(row => ({ ...row })), p_order_id: attempt.orderId });
      const afterSession = await supabase.auth.getSession();
      if (afterSession.error) throw Error("The checkout session could not be verified.");
      const after = afterSession.data?.session;
      if (epoch !== checkoutEpoch) return;
      if (after?.user?.id !== attempt.actor) { setCheckoutAccount(after?.user?.id || null); epoch = checkoutEpoch; checkoutNote = "Your account changed. Reload the Mart to inspect purchases for this account."; return; }
      if (data?.ok !== true || (data.duplicate !== true && data.orderId !== attempt.orderId)) throw Error("The checkout receipt could not be confirmed.");
      confirmed = true;
      checkoutAttempt = null; cart = []; checkoutNote = ""; saveCart();
      try { rememberCheckout(); } catch (_) { checkoutNote = "Purchase completed, but browser recovery could not clear. Refresh the Mart to check your items."; }
      lastPurchase = { ...receipt, orderId: attempt.orderId, total: data.duplicate === true ? null : receipt.total, message: data.message || "Purchased.", premierBonus: Number(data.premierBonus || 0), after: data.bag?.coins == null ? null : Number(data.bag.coins) };
      lastTab = CHECKOUT_TAB;
      showPurchasePop(lastPurchase, data.bag);
      await refreshStore();
    } catch (error) {
      if (epoch !== checkoutEpoch) return;
      if (confirmed) checkoutNote = "Purchase completed, but the display could not finish. Refresh the Mart to check your items; do not purchase them again.";
      else if (sent && !recovery && ["P0001", "22023", "42501", "23514", "23503", "23505", "40001", "55P03"].includes(String(error?.code))) {
        checkoutAttempt = null;
        try { rememberCheckout(); } catch (_) {}
        checkoutNote = window.playPresentError ? window.playPresentError(error, "Checkout was rejected. No purchase from this attempt completed.") : error.message;
      } else checkoutNote = sent ? "Purchase outcome is unconfirmed. Use Check previous purchase before changing the cart; it reuses the original order." : error.message || "Checkout could not be prepared.";
    } finally {
      if (epoch === checkoutEpoch) { checkoutBusy = false; syncCheckoutUi(); }
    }
  }

  let claimBusy = false, claimNeedsRefresh = false;
  async function claimStoreReward(kind, button) {
    if (claimBusy || claimNeedsRefresh) return;
    const actor = checkoutActor, epoch = checkoutEpoch;
    const current = () => actor === checkoutActor && epoch === checkoutEpoch;
    const note = kind === "choice" ? els.status : document.querySelector("[data-pass-status]") || els.status;
    const say = message => { const target = kind === "choice" ? els.status : document.querySelector("[data-pass-status]") || note; if (target) target.textContent = message; };
    if (!actor) { say("Sign in before claiming rewards."); return; }
    const verify = async () => {
      const valid = await martSessionMatches(actor, epoch);
      if (!current()) return false;
      if (!valid) { setCheckoutAccount(null); fillWallet(null); renderFloors(lastCatalog, null, null, []); }
      return valid;
    };
    const item = kind === "choice" ? button?.getAttribute("data-choice-item") : null;
    const key = kind === "choice" ? button?.getAttribute("data-choice-key") : null;
    let confirmed = false, sent = false;
    claimBusy = true;
    if (button) button.disabled = true;
    try {
      if (!await verify()) return;
      sent = true; claimNeedsRefresh = true;
      const data = await window.playCall(kind === "choice" ? "play_claim_choice" : "play_claim_pass", kind === "choice" ? { p_reward_key: key, p_item: item } : { p_kind: kind });
      if (!current() || !await verify()) return;
      if (data?.ok !== true || (kind === "choice" ? data.item !== item : typeof data.receiptId !== "string" || !data.receiptId.trim())) throw Error("Reward receipt could not be confirmed.");
      confirmed = true;
      say(data.message || "Rewards received.");
      presentClaim(kind === "choice" ? "Reward chosen" : kind === "daily" ? "Starlight Pass daily gift" : "Starlight Pass weekly crate", data, kind === "choice" ? "store" : "pass");
      const refreshed = await refreshStore();
      if (!current() || !await verify()) return;
      if (!refreshed) throw Error("Reward display refresh unavailable.");
      claimNeedsRefresh = false;
    } catch (error) {
      if (!current() || !await verify()) return;
      if (confirmed) {
        say("Rewards received, but the display could not finish. Reload the Mart to see your items and claim status.");
      } else if (!sent || ["P0001", "22023", "42501", "23514", "23503", "23505", "40001", "55P03"].includes(String(error?.code))) {
        claimNeedsRefresh = false;
        say(error.message || "This reward could not be claimed.");
        if (button?.isConnected) button.disabled = false;
      } else say("Claim outcome is unconfirmed. Reload the Mart to check your items and reward calendar before trying again.");
    } finally { if (current()) { claimBusy = false; if (claimNeedsRefresh) document.querySelectorAll("#claim-daily, #claim-weekly, [data-choice-item]").forEach(btn => { btn.disabled = true; }); } }
  }


  document.addEventListener("click", async (event) => {
    const modeBtn = event.target.closest("#mart-mode-mount [data-mart-mode]");
    if (!modeBtn) return;
    await switchMartMode(modeBtn.dataset.martMode === "sell" ? "sell" : "buy");
  });

  els.floors?.addEventListener("click", async (event) => {
    if (event.target.closest('[data-cart-empty]')) { await confirmEmptyCart(); return; }
    const modeBtn = event.target.closest("[data-mart-mode]");
    if (modeBtn) {
      await switchMartMode(modeBtn.dataset.martMode === "sell" ? "sell" : "buy");
      return;
    }
    if (event.target.closest("[data-sell-recover]")) { await sellItem(sellAttempt?.item); return; }
    const sellInc = event.target.closest("[data-sell-inc]");
    if (sellInc) {
      if (sellBusy || sellAttempt || sellRecoveryBlocked) return;
      const slug = sellInc.dataset.sellInc;
      const row = sellShelf.find((item) => item.slug === slug);
      const owned = Math.max(0, Number(row?.owned || 0));
      sellQty[slug] = Math.min(owned, Math.max(1, Number(sellQty[slug] || 1) + 1));
      syncSellUi();
      return;
    }
    const sellDec = event.target.closest("[data-sell-dec]");
    if (sellDec) {
      if (sellBusy || sellAttempt || sellRecoveryBlocked) return;
      const slug = sellDec.dataset.sellDec;
      sellQty[slug] = Math.max(1, Number(sellQty[slug] || 1) - 1);
      syncSellUi();
      return;
    }
    const sellGo = event.target.closest("[data-sell-go]");
    if (sellGo) {
      await sellItem(sellGo.dataset.sellGo);
      return;
    }
    const tab = event.target.closest(".mart-tab[data-mart-tab]");
    if (tab) {
      showTab(tab.dataset.martTab);
      return;
    }
    const more = event.target.closest("[data-mart-detail]");
    if (more) {
      openMartDetail(findSku(more.dataset.martDetail), more.dataset.martMode);
      return;
    }
    const step = event.target.closest('[data-product-step]');
    if(step){const sku=step.dataset.productSku;setCartQty(sku,(cart.find(row=>row.sku===sku)?.qty||0)+Number(step.dataset.productStep));return;}
    const add = event.target.closest("button[data-sku], button[data-avatar-sku]");
    if (add) {
      const sku = add.dataset.sku || add.dataset.avatarSku;
      const times = Math.max(1, Number(add.dataset.addQty || 1));
      for (let i = 0; i < times; i += 1) addToCheckout(sku);
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
      const reviewedEpoch = checkoutEpoch, reviewedCart = JSON.stringify(cart);
      const total = cart.reduce((n, row) => n + Number(findSku(row.sku)?.cost || 0) * row.qty, 0);
      const premium = cart.some((row) => findSku(row.sku)?.pack) || total >= 1000;
      if (premium && !checkoutAttempt) {
        const body = `Cost: ${total} PokéCoins\nCurrent balance: ${Number(lastWallet?.coins || 0)}\nBalance after: ${Number(lastWallet?.coins || 0) - total}`;
        const ok = typeof window.playPresentConfirm === "function"
          ? await window.playPresentConfirm({ title: "Confirm purchase", body, confirmLabel: "Buy" })
          : window.confirm(`Buy this checkout?\n${body}`);
        if (!ok) return;
        if (reviewedEpoch !== checkoutEpoch || reviewedCart !== JSON.stringify(cart)) { window.playToast?.({ kind: "warning", title: "Checkout changed", body: "Review the current account and cart before purchasing." }); return; }
      }
      await purchaseCart(buyAll);
      return;
    }
    if (event.target.closest("[data-open-balls]")) {
      renderBallCase(lastCatalog);
      if (typeof els.ballModal?.showModal === "function") els.ballModal.showModal();
      else els.ballModal?.setAttribute("open", "");
      return;
    }
    if (event.target.closest("[data-pass-missed]")) {
      const body = "Your missed supplies are saved as crates in My PC → Items. Withdraw a crate into your bag, then open it. Crates open oldest first; the matching day will be marked claimed when you return here.";
      const go = window.playPresentConfirm ? await window.playPresentConfirm({title:"Collect your saved supplies?",body,confirmLabel:"Go to My PC",cancelLabel:"Stay here"}) : window.confirm(body);
      if (go) window.location.assign("storage.html#items");
      return;
    }
    const passButton = event.target.closest("#check-pass");
    if (passButton) {
      await checkPass(passButton);
      return;
    }
    const choiceBtn = event.target.closest("[data-choice-item]");
    if (choiceBtn) { await claimStoreReward("choice", choiceBtn); return; }
    const dailyBtn = event.target.closest("#claim-daily");
    if (dailyBtn) { await claimStoreReward("daily", dailyBtn); return; }
    const weeklyBtn = event.target.closest("#claim-weekly");
    if (weeklyBtn) await claimStoreReward("weekly", weeklyBtn);
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
    const step=event.target.closest("[data-product-step]");
    if(step){const sku=step.dataset.productSku;setCartQty(sku,(cart.find(row=>row.sku===sku)?.qty||0)+Number(step.dataset.productStep));return;}
    const add = event.target.closest("button[data-sku]");
    if (add) addToCheckout(add.dataset.sku);
  });

  document.addEventListener('change',event=>{const input=event.target.closest('[data-product-count]');if(!input)return;const n=Number(input.value);if(!Number.isSafeInteger(n)||n<0){input.value=cart.find(row=>row.sku===input.dataset.productCount)?.qty||0;return;}setCartQty(input.dataset.productCount,n);input.value=cart.find(row=>row.sku===input.dataset.productCount)?.qty||0;});
  supabase.auth.onAuthStateChange((event, session) => { if (window.playAuthNoise(event, session)) return; load(); });
  // A browser Back navigation can restore the Mart before a crate was opened in My Bag.
  window.addEventListener('pageshow', event => { if (event.persisted) refreshStore(); });
  load();
})();
