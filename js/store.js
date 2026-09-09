(() => {
  const supabase = window.playSupabase;
  const els = {
    status: document.getElementById("pass-status"),
    check: document.getElementById("check-pass"),
    daily: document.getElementById("claim-daily"),
    weekly: document.getElementById("claim-weekly"),
    wallet: document.getElementById("coin-wallet"),
    coins: document.getElementById("coin-shelf"),
    coinStatus: document.getElementById("coin-status"),
    bits: document.getElementById("bits-shelf"),
    bitsStatus: document.getElementById("bits-status"),
    passHero: document.getElementById("pass-hero"),
    openBalls: document.getElementById("open-balls"),
    ballModal: document.getElementById("ball-modal"),
    ballGrid: document.getElementById("ball-grid"),
    ballStatus: document.getElementById("ball-status"),
    masterShelf: document.getElementById("master-shelf"),
    avatars: document.getElementById("avatar-shelf"),
    avatarStatus: document.getElementById("avatar-status")
  };
  const CORE_BALL_SKUS = new Set(["poke5", "great3", "ultra1"]);

  window.playBindAccountNav({
    onSignOut() {
      els.status.textContent = "Sign in to check your Pass.";
      els.wallet.textContent = "Sign in to see your balance.";
      renderPass(null, null);
    }
  });

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

  function shelfCard(item, mode) {
    const sprite = window.playItemSprite(item.sku) || window.playItemSprite(Object.keys(item.grants || {})[0]);
    const cost = mode === "bits"
      ? `<span class="mart-cost">${item.bits} Bits</span>`
      : `<span class="mart-cost"><img src="${window.playItemSprite("coins")}" alt="">${item.cost}</span>`;
    const action = mode === "coins"
      ? `<button type="button" data-sku="${item.sku}">Get</button>`
      : "";
    const grants = typeof window.playGrantLines === "function" ? window.playGrantLines(item.grants) : [];
    const grantList = mode === "bits" && grants.length
      ? `<ul class="mart-grants">${grants.map((row) => `<li><img src="${row.sprite}" alt=""><span>${row.label}</span></li>`).join("")}</ul>`
      : "";
    const blurb = mode !== "bits" && item.blurb ? `<p>${item.blurb}</p>` : "";
    return `
      <article class="mart-item${mode === "bits" ? " mart-item-bits" : ""}">
        <div class="mart-sprite"><img src="${sprite}" alt=""></div>
        <div class="mart-copy">
          <strong>${item.name}</strong>
          ${blurb}
        </div>
        <div class="mart-price">
          ${cost}
          ${action}
        </div>
        ${grantList}
      </article>`;
  }

  function renderShelf(target, items, mode) {
    const rows = mode === "coins"
      ? (items || []).filter((item) => !CORE_BALL_SKUS.has(item.sku))
      : items;
    target.innerHTML = (rows || []).map((item) => shelfCard(item, mode)).join("");
  }

  function renderMasterShelf() {
    const row = (window.PLAY_BALLS || []).find((item) => item.key === "masterball");
    if (!els.masterShelf || !row) return;
    els.masterShelf.innerHTML = shelfCard({
      sku: row.sku,
      name: row.name,
      cost: row.cost,
      grants: { [row.key]: row.qty },
      blurb: "Always catches. The catch cap does not apply."
    }, "coins");
  }

  function renderBallCase() {
    if (!els.ballGrid) return;
    els.ballGrid.innerHTML = (window.PLAY_BALLS || []).map((row) => {
      const pct = Math.round((row.rate || 0) * 100);
      const pack = row.qty > 1 ? ` ×${row.qty}` : "";
      return `<article class="ball-tile">
        <img src="${window.playItemSprite(row.key)}" alt="">
        <strong>${row.name}${pack}</strong>
        <span class="ball-rate">${row.multiplier} · ${pct}% catch</span>
        <span class="mart-cost"><img src="${window.playItemSprite("coins")}" alt="">${row.cost}</span>
        <button type="button" data-sku="${row.sku}">Get</button>
      </article>`;
    }).join("");
  }

  function renderAvatars(catalog, ownedPacks) {
    if (!els.avatars) return;
    const owned = new Set(ownedPacks || []);
    const rows = catalog?.avatars?.length ? catalog.avatars : (window.PLAY_AVATAR_PACKS || []);
    els.avatars.innerHTML = rows.map((item) => {
      const have = owned.has(item.pack);
      const looks = item.looks || [];
      return `<article class="avatar-pack${have ? " is-owned" : ""}">
        <div class="avatar-pack-looks">
          ${looks.map((id) => {
            const look = typeof window.playTrainerLook === "function" ? window.playTrainerLook(id) : null;
            const name = look?.trainer?.name || id;
            return `<figure>
              <img src="${window.playTrainerSpriteUrl(id)}" alt="">
              <figcaption>${name}</figcaption>
            </figure>`;
          }).join("")}
        </div>
        <div class="avatar-pack-copy">
          <strong>${item.name}</strong>
          <p>${item.blurb || ""}</p>
        </div>
        <div class="avatar-pack-foot">
          <span class="mart-cost"><img src="${window.playItemSprite("coins")}" alt="">${item.cost}</span>
          ${have
            ? `<span class="owned-mark">Owned</span>`
            : `<button type="button" data-avatar-sku="${item.sku}">Get</button>`}
        </div>
      </article>`;
    }).join("");
  }

  async function functionMessage(error, fallback) {
    try {
      const ctx = error?.context;
      if (ctx && typeof ctx.json === "function") {
        const body = await ctx.json();
        if (body?.message) return body.message;
      }
    } catch (_) {}
    if (String(error?.message || "").includes("non-2xx")) {
      return fallback;
    }
    return error?.message || fallback;
  }

  function renderPass(pass, wallet) {
    const info = describePass(pass, wallet);
    const state = els.passHero?.querySelector("[data-pass-state]");
    els.status.textContent = info.note;
    if (els.passHero) {
      els.passHero.classList.toggle("active", Boolean(info.active));
      if (state) {
        state.textContent = info.active ? "Active" : "Inactive";
        state.classList.toggle("on", Boolean(info.active));
        state.classList.toggle("off", !info.active);
      }
      els.daily.disabled = !info.active || !wallet?.dailyReady;
      els.weekly.disabled = !info.active || !wallet?.weeklyReady;
      els.daily.textContent = info.active && !wallet?.dailyReady ? "Daily claimed" : "Claim daily gift";
      els.weekly.textContent = info.active && !wallet?.weeklyReady ? "Weekly claimed" : "Claim weekly crate";
    }
  }

  async function refreshStore() {
    try {
      const data = await window.playCall("play_store");
      const wallet = data.wallet;
      if (wallet) {
        els.wallet.textContent = `${wallet.coins} PokéCoins · ${wallet.used}/${wallet.capacity} space`;
      }
      renderPass(data.pass, wallet);
      renderShelf(els.coins, data.catalog?.coins, "coins");
      renderShelf(els.bits, data.catalog?.bits, "bits");
      renderMasterShelf();
      renderBallCase();
      window._playOwnedAvatarPacks = data.ownedAvatarPacks || [];
      renderAvatars(data.catalog, data.ownedAvatarPacks);
      return data;
    } catch (error) {
      els.coinStatus.textContent = window.playRpcError(error, "Mart catalog is not live yet.");
      renderMasterShelf();
      renderBallCase();
      renderAvatars(null, []);
      return null;
    }
  }

  async function load() {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session) {
      window.playSetAccountNav(null);
      els.status.textContent = "Sign in to check your Pass.";
      await refreshStore();
      return;
    }
    const { data: profile } = await supabase.from("profiles").select("display_name, twitch_login, avatar_url, starlight_pass, pass_source").eq("id", session.user.id).maybeSingle();
    const store = await refreshStore();
    window.playSetAccountNav(session, profile, { isAdmin: Boolean(store?.isAdmin), trainer: store?.trainer });
  }

  els.check.addEventListener("click", async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session) {
      els.status.textContent = "Sign in with Twitch first.";
      return;
    }
    if (!session.provider_token) {
      els.status.textContent = "Twitch did not keep a session token. Sign out, sign in again, then check immediately.";
      return;
    }
    els.status.textContent = "Checking Twitch…";
    const { data, error } = await supabase.functions.invoke("refresh-pass", {
      body: { accessToken: session.provider_token }
    });
    if (error) {
      els.status.textContent = await functionMessage(error, "Staff still needs to save the Play Twitch Client ID, or grant the pass by login.");
      return;
    }
    els.status.textContent = data?.message || (data?.active ? "Starlight Pass is active." : "Twitch says you are not subscribed right now.");
    await load();
  });

  els.daily.addEventListener("click", async () => {
    try {
      const data = await window.playCall("play_claim_pass", { p_kind: "daily" });
      els.status.textContent = data.message;
      await refreshStore();
    } catch (error) {
      els.status.textContent = window.playRpcError(error);
    }
  });
  els.weekly.addEventListener("click", async () => {
    try {
      const data = await window.playCall("play_claim_pass", { p_kind: "weekly" });
      els.status.textContent = data.message;
      await refreshStore();
    } catch (error) {
      els.status.textContent = window.playRpcError(error);
    }
  });
  async function buySku(button, note) {
    if (!button) return;
    note.textContent = "Working…";
    try {
      const data = await window.playCall("play_buy_sku", { p_sku: button.dataset.sku });
      note.textContent = data.message || "Added to inventory.";
      await refreshStore();
      renderBallCase();
    } catch (error) {
      note.textContent = window.playRpcError(error);
    }
  }

  els.coins.addEventListener("click", async (event) => {
    await buySku(event.target.closest("button[data-sku]"), els.coinStatus);
  });
  els.masterShelf?.addEventListener("click", async (event) => {
    await buySku(event.target.closest("button[data-sku]"), els.ballStatus || els.coinStatus);
  });

  els.openBalls?.addEventListener("click", () => {
    renderBallCase();
    if (typeof els.ballModal?.showModal === "function") els.ballModal.showModal();
    else els.ballModal?.setAttribute("open", "");
  });

  els.ballModal?.addEventListener("click", (event) => {
    if (event.target === els.ballModal) els.ballModal.close("cancel");
  });

  els.avatars?.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-avatar-sku]");
    if (!button) return;
    els.avatarStatus.textContent = "Working…";
    try {
      const data = await window.playCall("play_buy_sku", { p_sku: button.dataset.avatarSku });
      els.avatarStatus.textContent = data.message || "Series unlocked.";
      await refreshStore();
    } catch (error) {
      els.avatarStatus.textContent = window.playRpcError(error);
    }
  });

  els.ballGrid?.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-sku]");
    if (!button) return;
    const note = els.ballStatus || els.coinStatus;
    note.textContent = "Working…";
    try {
      const data = await window.playCall("play_buy_sku", { p_sku: button.dataset.sku });
      note.textContent = data.message || "Added to inventory.";
      await refreshStore();
      renderBallCase();
    } catch (error) {
      note.textContent = window.playRpcError(error);
    }
  });

  supabase.auth.onAuthStateChange((event) => { if (window.playAuthNoise(event)) return; load(); });
  load();
})();
