(() => {
  const READ_RPCS = Object.freeze([
    "admin_live_dashboard",
    "admin_build_health",
    "admin_game_health"
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

  const supabase = window.playSupabase;
  const els = {
    gate: document.getElementById("gate"),
    staff: document.getElementById("staff"),
    nav: document.getElementById("hub-nav"),
    toggle: document.getElementById("hub-nav-toggle"),
    opsStatus: document.getElementById("next-ops-status"),
    opsMetrics: document.getElementById("next-ops-metrics"),
    healthStatus: document.getElementById("next-health-status"),
    health: document.getElementById("next-health")
  };

  function esc(value) {
    return window.playEscapeAttr ? window.playEscapeAttr(value) : String(value ?? "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function metric(label, value) {
    return `<div class="hub-metric"><p class="eyebrow">${esc(label)}</p><p>${esc(value)}</p></div>`;
  }

  function resolveTab(raw) {
    const key = String(raw || "").toLowerCase();
    return TABS.includes(key) ? key : "operations";
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
  }

  async function readCall(name) {
    if (!READ_RPCS.includes(name)) throw new Error("Preview shell cannot call that command.");
    return window.playCall(name);
  }

  function yn(value) {
    if (value === true) return "Yes";
    if (value === false) return "No";
    return "—";
  }

  async function loadOperations() {
    if (!els.opsStatus || !els.opsMetrics) return;
    els.opsStatus.textContent = "Loading live state…";
    try {
      const data = await readCall("admin_live_dashboard");
      const stream = data?.stream || {};
      const director = data?.director || data || {};
      const twitchLive = Boolean(stream.twitchLive);
      const rpg = Boolean(stream.rpgSession);
      const known = Boolean(stream.liveKnown);
      const twitch = twitchLive ? "LIVE" : (known ? "OFFLINE" : "UNKNOWN");
      const rpgLabel = rpg ? "ACTIVE" : "IDLE";
      els.opsMetrics.innerHTML = [
        metric("Twitch", twitch),
        metric("Live RPG session", rpgLabel),
        metric("Director", director.status || director.directorStatus || "—"),
        metric("Auto encounters", yn(director.autoEnabled ?? director.auto_enabled)),
        metric("Manual hold", yn(director.manualHold ?? director.manual_hold)),
        metric("Permission model", "LIVE permits · OFFLINE ends · Start is explicit")
      ].join("");
      if (!twitchLive && !rpg) {
        els.opsStatus.textContent = "Stream offline. Live RPG is inactive.";
      } else if (twitchLive && !rpg) {
        els.opsStatus.textContent = "Twitch is LIVE. Live RPG stays IDLE until staff Start it on the current Dashboard.";
      } else if (twitchLive && rpg) {
        els.opsStatus.textContent = "Twitch is LIVE and a Live RPG session is active.";
      } else {
        els.opsStatus.textContent = "Live RPG is marked active while Twitch is not LIVE. Use the current Dashboard.";
      }
    } catch (error) {
      els.opsStatus.textContent = window.playRpcError?.(error, "Could not load operations.") || "Could not load operations.";
      els.opsMetrics.innerHTML = "";
    }
  }

  let healthLoaded = false;
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
        bits.push(metric("Database migration", build.migration || build.latestMigration || "—"));
      }
      if (game) {
        bits.push(metric("Game health", game.status || game.appStatus || "—"));
        bits.push(metric("Twitch", game.twitchStatus || (game.twitchLive ? "LIVE" : "—")));
      }
      els.health.innerHTML = bits.join("") || "<p class='muted'>Health RPCs did not return a snapshot.</p>";
      if (els.healthStatus) els.healthStatus.textContent = "Read-only snapshot. Mutation health tools stay on the current hub.";
    } catch (error) {
      if (els.healthStatus) {
        els.healthStatus.textContent = window.playRpcError?.(error, "Could not load health.") || "Could not load health.";
      }
    }
  }

  function setSignedOut() {
    if (els.staff) els.staff.hidden = true;
    if (els.gate) {
      els.gate.hidden = false;
      els.gate.textContent = "Sign in to open the Admin Hub preview.";
    }
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
      if (els.staff) els.staff.hidden = true;
      if (els.gate) {
        els.gate.hidden = false;
        els.gate.textContent = "This preview is for moderators and admins. Viewer logins cannot open it.";
      }
      return;
    }
    if (els.gate) els.gate.hidden = true;
    if (els.staff) els.staff.hidden = false;
    const section = new URL(window.location.href).searchParams.get("section");
    showTab(section, false);
    await loadOperations();
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

  window.playBindAccountNav?.({
    onSignOut: setSignedOut
  });
  supabase.auth.onAuthStateChange((event, session) => {
    if (window.playAuthNoise?.(event, session)) return;
    loadHub(session);
  });
  loadHub();

  window.PLAY_ADMIN_NEXT = { READ_RPCS, TABS };
})();
