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
    const action = mode === "bits" ? "" : `<button type="button" data-sku="${esc(row.sku)}">Get</button>`;
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
      <button type="button" data-sku="${esc(row.sku)}">Get</button>
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
          : `<button type="button" data-avatar-sku="${esc(item.sku)}">Get</button>`}
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
    let action = mode === "bits" ? "" : `<button type="button" data-sku="${esc(row.sku)}">Get</button>`;
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
        : `<button type="button" data-avatar-sku="${esc(item.sku)}">Get</button>`;
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
      <p class="muted" data-floor-status${extraStatus}></p>
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
    return `<div class="mart-tabs" role="tablist" aria-label="Store shelves">${floors.map((floor, index) => {
      const id = floorTabId(floor, index);
      return `<button class="mart-tab" type="button" role="tab" id="mart-tab-${esc(id)}" data-mart-tab="${esc(id)}" aria-controls="${esc(id)}" aria-selected="false" tabindex="-1">${esc(floor.name || "Shelf")}</button>`;
    }).join("")}</div>`;
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
    if (raw && ids.includes(raw)) return raw;
    if (raw === "avatars" || raw === "premium-avatars") {
      const match = shop.find((floor) => floor.kind === "avatars");
      if (match) return floorTabId(match, floors.indexOf(match));
    }
    if (raw && shop.some((floor) => floor.kind === raw)) {
      const match = shop.find((floor) => floor.kind === raw);
      return floorTabId(match, floors.indexOf(match));
    }
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

  function noteEl(from) {
    return from?.closest("section")?.querySelector("[data-floor-status]")
      || document.querySelector("[data-ball-status]")
      || document.querySelector("[data-pass-status]")
      || els.status;
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

  async function buySku(button) {
    if (!button) return;
    const note = noteEl(button);
    if (note) note.textContent = "Working…";
    try {
      const sku = button.dataset.sku || button.dataset.avatarSku;
      const data = await window.playCall("play_buy_sku", { p_sku: sku });
      if (note) note.textContent = data.message || "Added to inventory.";
      await refreshStore();
    } catch (error) {
      if (note) note.textContent = window.playRpcError(error);
    }
  }

  els.floors?.addEventListener("click", async (event) => {
    const tab = event.target.closest(".mart-tab[data-mart-tab]");
    if (tab) {
      showTab(tab.dataset.martTab);
      return;
    }
    const buy = event.target.closest("button[data-sku], button[data-avatar-sku]");
    if (buy) {
      await buySku(buy);
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
  els.ballGrid?.addEventListener("click", async (event) => {
    await buySku(event.target.closest("button[data-sku]"));
  });

  supabase.auth.onAuthStateChange((event) => { if (window.playAuthNoise(event)) return; load(); });
  load();
})();
