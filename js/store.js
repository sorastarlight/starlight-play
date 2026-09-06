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
    passHero: document.getElementById("pass-hero")
  };

  window.playBindAccountNav({
    onSignOut() {
      els.status.textContent = "Sign in to check your pass.";
      els.wallet.textContent = "Sign in to see your balance.";
    }
  });

  function describePass(pass, wallet) {
    if (!pass) return { title: "Starlight Pass", note: "Sign in to check your Twitch subscription.", active: false };
    if (pass.active) {
      const source = pass.source === "twitch-sub"
        ? "Twitch subscription"
        : pass.source === "admin"
          ? "staff grant"
          : pass.source === "broadcaster"
            ? "channel account"
            : "active";
      const gifts = [];
      if (wallet?.dailyReady) gifts.push("daily gift ready");
      if (wallet?.weeklyReady) gifts.push("weekly crate ready");
      return {
        title: "Starlight Pass · Active",
        note: `Perk status: ${source}. ${gifts.length ? gifts.join(" · ") : "Daily and weekly gifts on cooldown."}`,
        active: true
      };
    }
    return { title: "Starlight Pass", note: "Subscribe on Twitch, then check again. Pass is required for daily and weekly gifts.", active: false };
  }

  function grantLine(grants) {
    return Object.entries(grants || {}).map(([key, amount]) => `${amount} ${window.playItemLabel(key) || key}`).join(" · ");
  }

  function shelfCard(item, mode) {
    const sprite = window.playItemSprite(item.sku) || window.playItemSprite(Object.keys(item.grants || {})[0]);
    const price = mode === "bits" ? `${item.bits} Bits` : `${item.cost}`;
    const priceLabel = mode === "bits" ? "Twitch Power-Up" : "PokéCoins";
    const action = mode === "coins"
      ? `<button type="button" data-sku="${item.sku}">Get</button>`
      : `<p class="muted">Unlock on Twitch while live</p>`;
    return `
      <article class="mart-item">
        <div class="mart-sprite"><img src="${sprite}" alt=""></div>
        <div class="mart-copy">
          <strong>${item.name}</strong>
          <p>${item.blurb}</p>
          <p class="muted">${grantLine(item.grants)}</p>
        </div>
        <div class="mart-price">
          <img src="${window.playItemSprite(mode === "bits" ? item.sku : "coins")}" alt="">
          <span>${price}</span>
          <em>${priceLabel}</em>
          ${action}
        </div>
      </article>`;
  }

  function renderShelf(target, items, mode) {
    target.innerHTML = (items || []).map((item) => shelfCard(item, mode)).join("");
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
    els.status.textContent = info.note;
    if (els.passHero) {
      els.passHero.classList.toggle("active", Boolean(info.active));
      els.passHero.querySelector("[data-pass-title]").textContent = info.title;
      els.daily.disabled = !info.active || !wallet?.dailyReady;
      els.weekly.disabled = !info.active || !wallet?.weeklyReady;
      els.daily.textContent = wallet?.dailyReady ? "Claim daily gift" : "Daily claimed";
      els.weekly.textContent = wallet?.weeklyReady ? "Claim weekly crate" : "Weekly claimed";
    }
  }

  async function refreshStore() {
    try {
      const data = await window.playCall("play_store");
      const wallet = data.wallet;
      if (wallet) {
        els.wallet.textContent = `${wallet.coins} PokéCoins · ${wallet.used}/${wallet.capacity} item space`;
      }
      renderPass(data.pass, wallet);
      renderShelf(els.coins, data.catalog?.coins, "coins");
      renderShelf(els.bits, data.catalog?.bits, "bits");
      return data;
    } catch (error) {
      els.coinStatus.textContent = window.playRpcError(error, "Mart catalog is not live yet.");
      return null;
    }
  }

  async function load() {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session) {
      window.playSetAccountNav(null);
      els.status.textContent = "Sign in to check your pass.";
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
  els.coins.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-sku]");
    if (!button) return;
    els.coinStatus.textContent = "Working…";
    try {
      const data = await window.playCall("play_buy_sku", { p_sku: button.dataset.sku });
      els.coinStatus.textContent = data.message || "Added to inventory.";
      await refreshStore();
    } catch (error) {
      els.coinStatus.textContent = window.playRpcError(error);
    }
  });

  supabase.auth.onAuthStateChange((event) => { if (window.playAuthNoise(event)) return; load(); });
  load();
})();
