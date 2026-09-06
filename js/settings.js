(() => {
  const supabase = window.playSupabase;
  const els = {
    gate: document.getElementById("gate"),
    box: document.getElementById("settings"),
    login: document.getElementById("twitch-login"),
    name: document.getElementById("display-name"),
    favorite: document.getElementById("favorite-mon"),
    save: document.getElementById("save-profile"),
    status: document.getElementById("edit-status"),
    view: document.getElementById("view-id"),
    pass: document.getElementById("pass-status"),
    check: document.getElementById("check-pass")
  };

  window.playBindAccountNav({
    onSignOut() {
      els.box.hidden = true;
      els.gate.hidden = false;
    }
  });

  function fillFavorite(card, options) {
    const opts = options || [];
    els.favorite.innerHTML = `<option value="">No favorite yet</option>` + opts.map((row) => {
      const value = `${row.dex}:${row.variant || "normal"}`;
      const label = `${window.playPadDex(row.dex)} ${String(row.variant || "").includes("shiny") ? "Shiny " : ""}${row.name}`;
      const selected = card.favoriteDex === row.dex && (card.favoriteVariant || "normal") === (row.variant || "normal");
      return `<option value="${value}"${selected ? " selected" : ""}>${label}</option>`;
    }).join("");
  }

  function describePass(pass) {
    if (!pass) return "Sign in to check your pass.";
    if (pass.active) {
      if (pass.source === "twitch-sub") return "Starlight Pass is active from your Twitch subscription.";
      if (pass.source === "admin") return "Starlight Pass is active (staff grant).";
      if (pass.source === "broadcaster") return "Starlight Pass is active because this is the channel account.";
      return "Starlight Pass is active.";
    }
    return "No Starlight Pass yet. Subscribe on Twitch, then check again.";
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

  async function load() {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session) {
      window.playSetAccountNav(null);
      els.box.hidden = true;
      els.gate.hidden = false;
      return;
    }
    const { data: profile } = await supabase.from("profiles").select("display_name, twitch_login, avatar_url").eq("id", session.user.id).maybeSingle();
    const login = profile?.twitch_login || "";
    let extras = {};
    let card = null;
    let options = [];
    try {
      const snapshot = await window.playCall("play_state");
      extras = { isAdmin: Boolean(snapshot?.isAdmin), trainer: snapshot?.trainer };
      els.pass.textContent = describePass(snapshot?.pass);
    } catch (_) {
      els.pass.textContent = "Pass status is not available right now.";
    }
    window.playSetAccountNav(session, profile, extras);
    if (!login) {
      els.gate.textContent = "Twitch login is missing from this session. Sign out and sign in again.";
      els.box.hidden = true;
      els.gate.hidden = false;
      return;
    }
    try {
      const data = await window.playCall("play_trainer", { p_login: login });
      card = data.trainer;
      options = data.caughtOptions || [];
    } catch (error) {
      els.gate.textContent = window.playRpcError(error, "Could not load your Trainer ID.");
      els.box.hidden = true;
      els.gate.hidden = false;
      return;
    }
    els.login.textContent = `@${login}`;
    els.view.href = `./trainer.html?u=${encodeURIComponent(login)}`;
    els.name.value = card.displayName || "";
    fillFavorite(card, options);
    els.gate.hidden = true;
    els.box.hidden = false;
  }

  els.save.addEventListener("click", async () => {
    const fav = els.favorite.value;
    const [dex, variant] = fav ? fav.split(":") : [null, "normal"];
    els.status.textContent = "Saving…";
    try {
      const data = await window.playCall("play_update_profile", {
        p_display_name: els.name.value,
        p_favorite_dex: dex ? Number(dex) : null,
        p_favorite_variant: variant || "normal"
      });
      els.status.textContent = data.message || "Saved.";
      await load();
    } catch (error) {
      els.status.textContent = window.playRpcError(error);
    }
  });

  els.check.addEventListener("click", async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session) {
      els.pass.textContent = "Sign in with Twitch first.";
      return;
    }
    if (!session.provider_token) {
      els.pass.textContent = "Twitch did not keep a session token. Sign out, sign in again, then check immediately.";
      return;
    }
    els.pass.textContent = "Checking Twitch…";
    const { data, error } = await supabase.functions.invoke("refresh-pass", {
      body: { accessToken: session.provider_token }
    });
    if (error) {
      els.pass.textContent = await functionMessage(error, "Could not check your subscription right now.");
      return;
    }
    els.pass.textContent = data?.message || (data?.active ? "Starlight Pass is active." : "Twitch says you are not subscribed right now.");
    await load();
  });

  supabase.auth.onAuthStateChange((event) => {
    if (window.playAuthNoise(event)) return;
    load();
  });
  load();
})();
