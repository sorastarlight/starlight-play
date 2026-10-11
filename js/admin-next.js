(() => {
  const READ_RPCS = Object.freeze([
    "admin_build_health",
    "admin_game_health",
    "admin_live_snapshot"
  ]);
  const TABS = Object.freeze([
    "operations",
    "trainers",
    "support",
    "mart",
    "config",
    "analytics",
    "system"
  ]);
  const OPS_POLL_MS = 30000;

  const supabase = window.playSupabase;
  const presenter = window.PLAY_ADMIN_NEXT_SNAPSHOT || {};
  const els = {
    gate: document.getElementById("gate"),
    staff: document.getElementById("staff"),
    nav: document.getElementById("hub-nav"),
    toggle: document.getElementById("hub-nav-toggle"),
    opsStatus: document.getElementById("next-ops-status"),
    opsMetrics: document.getElementById("next-ops-metrics"),
    opsFreshness: document.getElementById("next-ops-freshness"),
    healthStatus: document.getElementById("next-health-status"),
    health: document.getElementById("next-health")
  };

  let healthLoaded = false;
  let opsTimer = null;
  let opsInFlight = false;
  let opsActive = false;
  let staffOpen = false;

  function esc(value) {
    return window.playEscapeAttr ? window.playEscapeAttr(value) : String(value ?? "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function metric(label, value, state) {
    const tone = state ? ` is-${state}` : "";
    const stateAttr = state ? ` data-state="${esc(state)}"` : "";
    return `<div class="hub-metric admin-next-metric${tone}"${stateAttr}><p class="eyebrow">${esc(label)}</p><p>${esc(value)}</p></div>`;
  }

  function renderCard(card) {
    const tone = card.state ? ` is-${card.state}` : "";
    const stateAttr = card.state ? ` data-state="${esc(card.state)}"` : "";
    const meta = (card.meta || []).map((row) => (
      `<div><dt>${esc(row.label)}</dt><dd>${esc(row.value)}</dd></div>`
    )).join("");
    return `<article class="admin-next-ops-card hub-metric admin-next-metric${tone}"${stateAttr}>
      <p class="eyebrow">${esc(card.label)}</p>
      <p class="admin-next-ops-value">${esc(card.value)}</p>
      ${meta ? `<dl class="admin-next-ops-meta">${meta}</dl>` : ""}
    </article>`;
  }

  function resolveTab(raw) {
    const key = String(raw || "").toLowerCase();
    return TABS.includes(key) ? key : "operations";
  }

  function currentTab() {
    return document.querySelector("[data-next-panel]:not([hidden])")?.dataset.nextPanel || "operations";
  }

  function presentOps(input) {
    if (typeof presenter.presentLiveOperations === "function") {
      return presenter.presentLiveOperations(input);
    }
    return {
      status: presenter.FALLBACK_STATUS || "Live status unavailable in preview. Legacy Live Operations remains on the current Dashboard. This preview does not refresh, settle, or tick gameplay.",
      freshness: "—",
      cards: [
        { label: "Twitch", value: "UNAVAILABLE", state: "unavailable" },
        { label: "Live RPG session", value: "UNAVAILABLE", state: "unavailable" },
        { label: "Director", value: "UNAVAILABLE", state: "unavailable" },
        { label: "Current encounter", value: "UNAVAILABLE", state: "unavailable" },
        { label: "Last recorded encounter", value: "UNAVAILABLE", state: "unavailable" },
        { label: "Settlement", value: "UNAVAILABLE", state: "unavailable" }
      ]
    };
  }

  function renderOperationsView(view) {
    if (els.opsStatus) els.opsStatus.textContent = view.status;
    if (els.opsFreshness) {
      els.opsFreshness.textContent = view.freshness && view.freshness !== "—"
        ? `Last observation ${view.freshness}. Refreshes every 30 seconds while Operations is open.`
        : "No confirmed observation yet.";
    }
    if (els.opsMetrics) {
      els.opsMetrics.innerHTML = (view.cards || []).map(renderCard).join("");
    }
  }

  function renderOperationsFallback() {
    renderOperationsView(presentOps({ error: "missing" }));
  }

  async function readCall(name) {
    if (!READ_RPCS.includes(name)) throw new Error("Preview shell cannot call that command.");
    return window.playCall(name);
  }

  function classifyOpsError(error) {
    const code = String(error?.code || "");
    const message = String(error?.message || "").toLowerCase();
    if (code === "42501" || message.includes("not allowed") || message.includes("permission denied")) {
      return "denied";
    }
    return "network";
  }

  async function loadOperations() {
    if (!staffOpen || !opsActive || document.hidden || opsInFlight) return;
    opsInFlight = true;
    try {
      const payload = await readCall("admin_live_snapshot");
      if (!opsActive || document.hidden) return;
      if (!payload || payload.ok !== true || payload.contract !== "gate-17-s1-v2") {
        renderOperationsView(presentOps({ error: "missing" }));
        return;
      }
      renderOperationsView(presentOps({ payload }));
    } catch (error) {
      if (!opsActive) return;
      renderOperationsView(presentOps({ error: classifyOpsError(error) }));
    } finally {
      opsInFlight = false;
    }
  }

  function stopOpsPoll() {
    opsActive = false;
    if (opsTimer) {
      clearInterval(opsTimer);
      opsTimer = null;
    }
  }

  function startOpsPoll() {
    if (!staffOpen) return;
    opsActive = true;
    if (!opsTimer) {
      opsTimer = setInterval(() => {
        if (document.hidden || !opsActive || currentTab() !== "operations") return;
        loadOperations();
      }, OPS_POLL_MS);
    }
    loadOperations();
  }

  function showTab(tab, push) {
    const next = resolveTab(tab);
    document.querySelectorAll("[data-next-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.nextPanel !== next;
    });
    document.querySelectorAll("[data-next-tab]").forEach((btn) => {
      btn.setAttribute("aria-selected", btn.dataset.nextTab === next ? "true" : "false");
    });
    const url = new URL(window.location.href);
    url.searchParams.set("section", next);
    const href = `${url.pathname}${url.search}${url.hash}`;
    if (push) history.pushState({ section: next }, "", href);
    else history.replaceState({ section: next }, "", href);
    if (next === "analytics") loadHealth();
    if (next === "operations") startOpsPoll();
    else stopOpsPoll();
  }

  async function loadHealth() {
    if (!els.health || healthLoaded) return;
    if (els.healthStatus) els.healthStatus.textContent = "Loading health…";
    try {
      const [build, game] = await Promise.all([
        readCall("admin_build_health").catch(() => null),
        readCall("admin_game_health").catch(() => null)
      ]);
      healthLoaded = true;
      const bits = [];
      if (build) {
        bits.push(metric("Client build", build.clientBuild || build.appBuild || "—"));
        bits.push(metric("Database migration", build.dbMigration || build.migration || build.latestMigration || "—"));
      }
      if (game) {
        const app = game.application || {};
        const twitch = game.twitch || {};
        bits.push(metric("Application", app.status || game.status || game.appStatus || "UNKNOWN", "unknown"));
        const liveKnown = Object.prototype.hasOwnProperty.call(twitch, "live");
        const twitchLabel = liveKnown ? (twitch.live ? "LIVE" : "OFFLINE") : "UNKNOWN";
        bits.push(metric("Twitch stream", twitchLabel, liveKnown ? (twitch.live ? "active" : "inactive") : "unknown"));
      }
      els.health.innerHTML = bits.join("") || "<p class='muted'>Health RPCs did not return a snapshot.</p>";
      if (els.healthStatus) els.healthStatus.textContent = "Read-only health snapshot. Live RPG session state is not included. Mutation tools stay on the current hub.";
    } catch (error) {
      if (els.healthStatus) {
        els.healthStatus.textContent = window.playRpcError?.(error, "Could not load health.") || "Could not load health.";
      }
    }
  }

  function setSignedOut() {
    staffOpen = false;
    stopOpsPoll();
    healthLoaded = false;
    if (els.staff) els.staff.hidden = true;
    if (els.gate) {
      els.gate.hidden = false;
      els.gate.textContent = "Sign in to open the Admin Hub preview.";
    }
    renderOperationsFallback();
  }

  async function loadHub(passedSession) {
    const session = passedSession || (await supabase.auth.getSession()).data.session;
    if (!session) {
      setSignedOut();
      return;
    }
    const { data: profile } = await supabase.from("profiles").select("display_name, twitch_login, avatar_url").eq("id", session.user.id).maybeSingle();
    const { data: isAdmin, error } = await supabase.rpc("is_play_admin");
    window.playSetAccountNav?.(session, profile, { isAdmin: Boolean(isAdmin) });
    if (error || !isAdmin) {
      staffOpen = false;
      stopOpsPoll();
      if (els.staff) els.staff.hidden = true;
      if (els.gate) {
        els.gate.hidden = false;
        els.gate.textContent = "This preview is for moderators and admins. Viewer logins cannot open it.";
      }
      renderOperationsFallback();
      return;
    }
    if (els.gate) els.gate.hidden = true;
    if (els.staff) els.staff.hidden = false;
    staffOpen = true;
    const section = new URL(window.location.href).searchParams.get("section");
    showTab(section, false);
  }

  els.toggle?.addEventListener("click", () => {
    const open = els.nav?.classList.toggle("is-open");
    els.toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
  document.querySelector(".hub-nav-list")?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-next-tab]");
    if (!btn) return;
    showTab(btn.dataset.nextTab, true);
  });
  window.addEventListener("popstate", () => {
    showTab(new URL(window.location.href).searchParams.get("section"), false);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (opsTimer) {
        clearInterval(opsTimer);
        opsTimer = null;
      }
      return;
    }
    if (staffOpen && currentTab() === "operations") startOpsPoll();
  });

  window.playBindAccountNav?.({
    onSignOut: setSignedOut
  });
  supabase.auth.onAuthStateChange((event, session) => {
    if (window.playAuthNoise?.(event, session)) return;
    loadHub(session);
  });
  loadHub();

  window.PLAY_ADMIN_NEXT = { READ_RPCS, TABS, OPS_POLL_MS };
})();
