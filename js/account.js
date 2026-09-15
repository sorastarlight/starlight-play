(() => {
  const gate = document.getElementById("gate");
  const app = document.getElementById("account-app");
  const status = document.getElementById("account-status");
  const list = document.getElementById("connection-list");
  const pending = document.getElementById("pending-link");
  const warn = document.getElementById("twitch-warn");
  const usernameInput = document.getElementById("acc-username");
  const securityEmail = document.getElementById("security-email");
  const claimForm = document.getElementById("claim-form");
  let state = null;
  let pendingOauth = "";

  window.playBindAccountNav({
    onSignOut() {
      if (app) app.hidden = true;
      if (gate) {
        gate.hidden = false;
        gate.textContent = "Sign in to manage your Trainer Account.";
      }
    }
  });

  function setStatus(text) {
    if (status) status.textContent = text || "";
  }

  function kindLabel(conn) {
    return window.playTwitchConnectionKindLabel(conn);
  }

  function renderConnections() {
    const rows = state?.connections || [];
    const advanced = rows.length > 1 || Boolean(state?.staffRole);
    const unconfirmed = rows.filter((row) => row.confirmed === false);
    const intent = window.playReadOAuthIntent();
    if (unconfirmed.length) {
      const row = unconfirmed[0];
      const mismatch = intent.intent === "reauthorize" && intent.target && intent.target !== row.twitchUserId;
      pending.hidden = false;
      pending.innerHTML = mismatch
        ? `<strong>Identity mismatch</strong>
           <p>You started reauthorization for a different Twitch account. This returned <strong>${window.playEscapeAttr(row.displayName || row.login)}</strong> (@${window.playEscapeAttr(row.login || "")}). It was not connected.</p>
           <div class="links"><button type="button" data-cancel-link="${window.playEscapeAttr(row.twitchUserId)}">Dismiss</button></div>`
        : `<strong>Twitch account found</strong>
           <div class="connection-found">
             ${row.avatar ? `<img class="avatar" src="${window.playEscapeAttr(row.avatar)}" alt="">` : ""}
             <div>
               <strong>${window.playEscapeAttr(row.displayName || row.login || "Twitch")}</strong>
               <p class="muted">@${window.playEscapeAttr(row.login || "")}</p>
             </div>
           </div>
           <p>Is this the Twitch account you want to connect?</p>
           <div class="links">
             <button type="button" data-confirm-link="${window.playEscapeAttr(row.twitchUserId)}">Yes, link this account</button>
             <button type="button" class="secondary" data-cancel-link="${window.playEscapeAttr(row.twitchUserId)}">Cancel</button>
           </div>`;
      if (mismatch) {
        window.playCall("play_cancel_twitch_link", { p_twitch_user_id: row.twitchUserId }).catch(() => {});
      }
    } else {
      pending.hidden = true;
      pending.innerHTML = "";
      if (intent.intent === "reauthorize" && pendingOauth === "done") {
        pending.hidden = false;
        pending.innerHTML = `<strong>Twitch reauthorized.</strong> The same identity was confirmed. Primary did not change.`;
      }
    }
    const shown = rows.filter((row) => row.confirmed !== false);
    list.innerHTML = shown.map((row) => {
      const badges = [];
      if (row.primary) badges.push(`<span class="conn-badge conn-primary">Primary</span>`);
      else badges.push(`<span class="conn-badge">Linked</span>`);
      if (row.type === "bot" || row.type === "utility") badges.push(`<span class="conn-badge">Bot / Utility</span>`);
      badges.push(`<span class="conn-badge">${row.gameplayEnabled ? "Gameplay enabled" : "Gameplay disabled"}</span>`);
      if (advanced) badges.push(`<span class="conn-badge">${row.loginEnabled ? "Login enabled" : "Login disabled"}</span>`);
      badges.push(`<span class="conn-badge">${row.status === "connected" ? "Connected" : "Needs reauthorization"}</span>`);
      const actions = [];
      if (!row.primary) actions.push(`<button type="button" data-primary="${window.playEscapeAttr(row.twitchUserId)}">Make Primary</button>`);
      actions.push(`<button type="button" class="secondary" data-reauth="${window.playEscapeAttr(row.twitchUserId)}">Reauthorize</button>`);
      if (!row.primary) actions.push(`<button type="button" class="secondary" data-disconnect="${window.playEscapeAttr(row.twitchUserId)}">Disconnect</button>`);
      if (advanced && row.type !== "bot" && row.type !== "utility") {
        actions.push(`<button type="button" class="secondary" data-bot="${window.playEscapeAttr(row.twitchUserId)}">Mark bot / utility</button>`);
      }
      return `<article class="connection-card${row.primary ? " is-primary" : ""}">
        <div class="connection-head">
          ${row.avatar ? `<img class="avatar" src="${window.playEscapeAttr(row.avatar)}" alt="">` : `<span class="avatar-fallback">${window.playEscapeAttr((row.displayName || "T").slice(0, 1))}</span>`}
          <div>
            <strong>${window.playEscapeAttr(row.displayName || row.login || "Twitch")}</strong>
            <p class="muted">@${window.playEscapeAttr(row.login || "")} · ${window.playEscapeAttr(kindLabel(row))}</p>
          </div>
        </div>
        <div class="conn-badges">${badges.join("")}</div>
        <p class="muted conn-help">${row.primary
          ? "Primary is your default Twitch-facing identity. Changing it does not move Pokémon, inventory, or XP."
          : "This identity stays linked to the same Trainer Account."}</p>
        <div class="links">${actions.join("")}</div>
      </article>`;
    }).join("") || `<p class="muted">No Twitch account is linked yet. Connect Twitch to join stream features.</p>`;
  }

  function renderSecurity() {
    if (securityEmail) {
      securityEmail.textContent = state?.emailLogin
        ? "Email & password login is enabled for this Trainer Account."
        : "This Trainer was originally created through Twitch. Add an email and password so you can sign in even if Twitch changes.";
    }
    if (claimForm) {
      claimForm.hidden = Boolean(state?.emailLogin);
    }
    const passwordForm = document.getElementById("password-form");
    if (passwordForm) passwordForm.hidden = !state?.emailLogin;
  }

  function render() {
    if (usernameInput) usernameInput.value = state?.username || "";
    renderSecurity();
    renderConnections();
  }

  async function loadAccount() {
    const { data: sessionData } = await window.playSupabase.auth.getSession();
    const session = sessionData.session;
    if (!session) {
      window.playSetAccountNav(null);
      if (app) app.hidden = true;
      if (gate) gate.hidden = false;
      return;
    }
    const allowed = await window.playGuardTwitchLogin();
    if (!allowed) return;
    const { data: profile } = await window.playSupabase
      .from("profiles")
      .select("display_name, twitch_login, avatar_url, username")
      .eq("id", session.user.id)
      .maybeSingle();
    let extras = {};
    try {
      const snapshot = await window.playCall("play_sync");
      extras = { isAdmin: Boolean(snapshot?.isAdmin), trainer: snapshot?.trainer };
    } catch (_) {}
    window.playSetAccountNav(session, profile, extras);
    try {
      state = await window.playCall("play_account_state");
    } catch (error) {
      setStatus(window.playRpcError(error));
      return;
    }
    if (gate) gate.hidden = true;
    if (app) app.hidden = false;
    render();
    const jump = new URLSearchParams(location.search).get("tab") || location.hash.replace(/^#/, "");
    if (jump === "connections") document.getElementById("connections")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  document.getElementById("save-username")?.addEventListener("click", async () => {
    setStatus("Saving username…");
    try {
      const data = await window.playCall("play_set_username", { p_username: usernameInput?.value || "" });
      state = data;
      render();
      setStatus(data?.message || "Username saved.");
    } catch (error) {
      setStatus(window.playRpcError(error));
    }
  });

  claimForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("Adding login method…");
    const result = await window.playClaimEmailPassword(
      document.getElementById("claim-email")?.value,
      document.getElementById("claim-password")?.value
    );
    setStatus(result.message);
    if (result.ok) await loadAccount();
  });

  document.getElementById("password-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const pass = document.getElementById("new-password")?.value || "";
    if (pass.length < 8) {
      setStatus("Use at least 8 characters for your password.");
      return;
    }
    setStatus("Updating password…");
    const { error } = await window.playSupabase.auth.updateUser({ password: pass });
    setStatus(error ? "Could not update that password." : "Password updated.");
  });

  document.getElementById("link-twitch")?.addEventListener("click", () => {
    pendingOauth = "link";
    if (typeof warn?.showModal === "function") warn.showModal();
    else startLink();
  });
  document.getElementById("twitch-warn-go")?.addEventListener("click", (event) => {
    event.preventDefault();
    warn?.close?.("yes");
    startLink();
  });

  async function startLink() {
    setStatus("Opening Twitch…");
    const result = await window.playLinkTwitch({
      intent: pendingOauth === "reauth" ? "reauthorize" : "link",
      target: pendingOauth === "reauth" ? window.playReadOAuthIntent().target : ""
    });
    if (result && !result.ok) setStatus(result.message);
  }

  list?.addEventListener("click", async (event) => {
    const primary = event.target.closest("[data-primary]");
    const disconnect = event.target.closest("[data-disconnect]");
    const reauth = event.target.closest("[data-reauth]");
    const bot = event.target.closest("[data-bot]");
    try {
      if (primary) {
        setStatus("Updating Primary…");
        state = await window.playCall("play_set_primary_twitch", { p_twitch_user_id: primary.dataset.primary });
        render();
        setStatus(state?.message || "Primary updated. RPG progress is unchanged.");
        return;
      }
      if (disconnect) {
        if (!window.confirm("Disconnect this Twitch identity? Pokémon, inventory, and XP stay on this Trainer Account.")) return;
        setStatus("Disconnecting…");
        state = await window.playCall("play_disconnect_twitch", { p_twitch_user_id: disconnect.dataset.disconnect });
        render();
        setStatus(state?.message || "Disconnected.");
        return;
      }
      if (bot) {
        if (!window.confirm("Mark this Twitch identity as bot/utility? It will stay linked but will not join gameplay or sign in.")) return;
        setStatus("Updating connection…");
        state = await window.playCall("play_set_twitch_flags", {
          p_twitch_user_id: bot.dataset.bot,
          p_connection_type: "bot",
          p_gameplay_enabled: false,
          p_login_enabled: false
        });
        render();
        setStatus(state?.message || "Marked as bot/utility.");
        return;
      }
      if (reauth) {
        pendingOauth = "reauth";
        window.playSetOAuthIntent("reauthorize", reauth.dataset.reauth);
        if (typeof warn?.showModal === "function") warn.showModal();
        else startLink();
      }
    } catch (error) {
      setStatus(window.playRpcError(error));
    }
  });

  pending?.addEventListener("click", async (event) => {
    const confirmBtn = event.target.closest("[data-confirm-link]");
    const cancelBtn = event.target.closest("[data-cancel-link]");
    try {
      if (confirmBtn) {
        setStatus("Linking…");
        state = await window.playCall("play_confirm_twitch_link", { p_twitch_user_id: confirmBtn.dataset.confirmLink });
        window.playClearOAuthIntent();
        render();
        setStatus(state?.message || "Twitch account linked.");
      }
      if (cancelBtn) {
        setStatus("Cancelling…");
        state = await window.playCall("play_cancel_twitch_link", { p_twitch_user_id: cancelBtn.dataset.cancelLink });
        window.playClearOAuthIntent();
        render();
        setStatus(state?.message || "Link cancelled.");
      }
    } catch (error) {
      setStatus(window.playRpcError(error));
    }
  });

  window.playSupabase.auth.onAuthStateChange((event) => {
    if (window.playAuthNoise(event)) return;
    if (event === "SIGNED_IN") pendingOauth = pendingOauth || "done";
    loadAccount();
  });
  loadAccount();
})();
