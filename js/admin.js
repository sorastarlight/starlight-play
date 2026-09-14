(() => {
  const supabase = window.playSupabase;
  const els = {
    gate: document.getElementById("gate"),
    staff: document.getElementById("staff"),
    stream: document.getElementById("stream-frame"),
    streamNote: document.getElementById("stream-note"),
    encounter: document.getElementById("encounter"),
    trainers: document.getElementById("trainer-count"),
    commandStatus: document.getElementById("command-status"),
    settingsStatus: document.getElementById("settings-status"),
    dexPick: document.getElementById("dex-pick"),
    dexSuggest: document.getElementById("dex-suggest"),
    genderRow: document.getElementById("gender-row"),
    shinyRow: document.getElementById("shiny-row"),
    formPreview: document.getElementById("form-preview"),
    formCopy: document.getElementById("form-copy"),
    hide: document.getElementById("toggle-hidden"),
    clearRound: document.getElementById("clear-round"),
    advancePhase: document.getElementById("advance-phase"),
    pause: document.getElementById("pause-round"),
    resume: document.getElementById("sync-clock"),
    gift: document.getElementById("gift-item"),
    giftModal: document.getElementById("gift-modal"),
    giftGrid: document.getElementById("gift-grid"),
    giftFilter: document.getElementById("gift-filter"),
    giftStatus: document.getElementById("gift-status"),
    clearLog: document.getElementById("clear-log"),
    console: document.getElementById("admin-console"),
    bridgeStatus: document.getElementById("bridge-status"),
    join: document.getElementById("join-seconds"),
    prepare: document.getElementById("prepare-seconds"),
    throw: document.getElementById("throw-seconds"),
    reveal: document.getElementById("reveal-seconds"),
    capMin: document.getElementById("cap-min"),
    capMax: document.getElementById("cap-max"),
    capShiny: document.getElementById("cap-shiny"),
    capEvent: document.getElementById("cap-event"),
    capHoneyBonus: document.getElementById("cap-honey-bonus"),
    capReward: document.getElementById("cap-reward"),
    capTiers: document.getElementById("cap-tiers"),
    capHoney: document.getElementById("cap-honey"),
    balanceStatus: document.getElementById("balance-status"),
    simBall: document.getElementById("sim-ball"),
    simBerry: document.getElementById("sim-berry"),
    simOut: document.getElementById("sim-out"),
    reportDays: document.getElementById("report-days"),
    reportOut: document.getElementById("report-out"),
    ecoOverview: document.getElementById("eco-overview"),
    ecoJoin: document.getElementById("eco-join"),
    ecoCatch: document.getElementById("eco-catch"),
    ecoDex: document.getElementById("eco-dex"),
    ecoShiny: document.getElementById("eco-shiny"),
    ecoLegend: document.getElementById("eco-legend"),
    ecoStream: document.getElementById("eco-stream"),
    ecoStatus: document.getElementById("economy-status"),
    ecoSimOut: document.getElementById("eco-sim-out"),
    ecoLedger: document.getElementById("eco-ledger"),
    progOverview: document.getElementById("prog-overview"),
    progXpBase: document.getElementById("prog-xp-base"),
    progXpExp: document.getElementById("prog-xp-exp"),
    progJoinXp: document.getElementById("prog-join-xp"),
    progCatchXp: document.getElementById("prog-catch-xp"),
    progStatus: document.getElementById("progression-status"),
    collectionOverview: document.getElementById("collection-overview"),
    collectionStatus: document.getElementById("collection-status"),
    candySimOut: document.getElementById("candy-sim-out"),
    lootOverview: document.getElementById("loot-overview"),
    lootPart: document.getElementById("loot-part"),
    lootCatch: document.getElementById("loot-catch"),
    lootEvent: document.getElementById("loot-event"),
    lootStatus: document.getElementById("loot-status"),
    lootTables: document.getElementById("loot-tables"),
    lootSimOut: document.getElementById("loot-sim-out"),
    spawnOut: document.getElementById("spawn-out"),
    anaOverview: document.getElementById("ana-overview"),
    anaOverviewMeta: document.getElementById("ana-overview-meta"),
    anaSpawns: document.getElementById("ana-spawns"),
    anaSessions: document.getElementById("ana-sessions"),
    reportMeta: document.getElementById("report-meta"),
    xpPreview: document.getElementById("xp-preview"),
    evoRulesOut: document.getElementById("evo-rules-out"),
    evoBalanceMeta: document.getElementById("evo-balance-meta"),
    evoValidateStatus: document.getElementById("evo-validate-status"),
    evoVersion: document.getElementById("evo-version"),
    dirSimOut: document.getElementById("dir-sim-out")
  };
  let pickGender = "";
  let pickShiny = false;
  let overviewTimer = 0;
  let lastChannel = "";
  let giftItems = [];
  let lastOverview = null;
  let lastHubKey = "";
  let lastProgression = null;
  let lastCollection = null;
  let lastEconomy = null;
  let lastLoot = null;
  let lastCaptureReport = null;
  let lastReportAt = null;
  let lastSpeciesRows = null;
  let spawnRowsPromise = null;
  const HUB_SECTIONS = ["dashboard", "encounters", "trainers", "content", "economy", "analytics", "system"];
  const HUB_ALIASES = { live: "dashboard", players: "trainers", store: "economy", pokemon: "content", settings: "system" };
  const ENC_VIEWS = ["overview", "rules", "capture", "spawn", "sim"];
  const ECO_VIEWS = ["catalog", "rewards", "loot"];
  const SYS_VIEWS = ["twitch", "ads", "bits", "github", "pass", "system"];
  const CONTENT_VIEWS = ["evolution", "progression"];
  const ANA_VIEWS = ["overview", "captures", "spawns", "progression", "evolution", "economy", "sessions", "sims"];
  const VIEW_ALIASES = {
    encounters: { simulator: "sim", capture: "capture" },
    economy: { economy: "rewards", currency: "rewards" },
    system: { general: "twitch", maintenance: "system", settings: "twitch" },
    content: { pokemon: "evolution", items: "evolution" },
    analytics: { capture: "captures", evo: "evolution", trading: "evolution", sim: "sims", simulator: "sims" }
  };

  function resolveHubSection(raw) {
    const key = String(raw || "").toLowerCase();
    if (HUB_ALIASES[key]) return HUB_ALIASES[key];
    return HUB_SECTIONS.includes(key) ? key : "dashboard";
  }

  function resolveView(section, raw) {
    const key = String(raw || "").toLowerCase();
    const aliased = VIEW_ALIASES[section]?.[key] || key;
    const lists = {
      encounters: ENC_VIEWS,
      economy: ECO_VIEWS,
      system: SYS_VIEWS,
      content: CONTENT_VIEWS,
      analytics: ANA_VIEWS
    };
    const allowed = lists[section];
    if (!allowed) return "";
    if (allowed.includes(aliased)) return aliased;
    return allowed[0];
  }

  function showHubTab(tab, view, opts) {
    const next = resolveHubSection(tab);
    const push = Boolean(opts?.push);
    document.querySelectorAll("[data-hub-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.hubPanel !== next;
    });
    document.querySelectorAll("[data-hub-tab]").forEach((btn) => {
      btn.setAttribute("aria-selected", btn.dataset.hubTab === next ? "true" : "false");
    });
    let nextView = view || "";
    if (next === "encounters") {
      nextView = resolveView("encounters", view);
      document.querySelectorAll("[data-enc-view]").forEach((el) => {
        el.hidden = el.dataset.encView !== nextView;
      });
      document.querySelectorAll("[data-hub-view]").forEach((btn) => {
        btn.setAttribute("aria-selected", btn.dataset.hubView === nextView ? "true" : "false");
      });
    }
    if (next === "economy") {
      nextView = resolveView("economy", view);
      document.querySelectorAll("[data-eco-panel]").forEach((el) => {
        el.hidden = el.dataset.ecoPanel !== nextView;
      });
      document.querySelectorAll("[data-eco-view]").forEach((btn) => {
        btn.setAttribute("aria-selected", btn.dataset.ecoView === nextView ? "true" : "false");
      });
    }
    if (next === "system") {
      nextView = resolveView("system", view);
      document.querySelectorAll("[data-sys-panel]").forEach((el) => {
        el.hidden = el.dataset.sysPanel !== nextView;
      });
      document.querySelectorAll("[data-sys-view]").forEach((btn) => {
        btn.setAttribute("aria-selected", btn.dataset.sysView === nextView ? "true" : "false");
      });
    }
    if (next === "content") {
      nextView = resolveView("content", view);
      document.querySelectorAll("[data-content-panel]").forEach((el) => {
        el.hidden = el.dataset.contentPanel !== nextView;
      });
      document.querySelectorAll("[data-content-view]").forEach((btn) => {
        btn.setAttribute("aria-selected", btn.dataset.contentView === nextView ? "true" : "false");
      });
    }
    if (next === "analytics") {
      nextView = resolveView("analytics", view);
      document.querySelectorAll("[data-ana-panel]").forEach((el) => {
        el.hidden = el.dataset.anaPanel !== nextView;
      });
      document.querySelectorAll("[data-ana-view]").forEach((btn) => {
        btn.setAttribute("aria-selected", btn.dataset.anaView === nextView ? "true" : "false");
      });
    }
    const url = new URL(window.location.href);
    url.searchParams.delete("tab");
    url.searchParams.set("section", next);
    if (nextView && ["encounters", "economy", "system", "content", "analytics"].includes(next)) {
      url.searchParams.set("view", nextView);
    } else url.searchParams.delete("view");
    const href = `${url.pathname}${url.search}${url.hash}`;
    if (push) history.pushState({ section: next, view: nextView }, "", href);
    else history.replaceState({ section: next, view: nextView }, "", href);
    if (next === "economy" && nextView === "catalog") {
      const frame = document.querySelector("[data-hub-panel='economy'] iframe[data-src]");
      if (frame && !frame.getAttribute("src")) frame.src = frame.dataset.src;
    }
    if (next === "trainers" && typeof window.playStaffLoadUsers === "function") window.playStaffLoadUsers();
    if (next === "encounters" && nextView === "spawn") renderSpawnConfig();
    if (next === "content") {
      if (nextView === "evolution") loadEvolutionRules();
      if (nextView === "progression") updateXpPreview();
    }
    if (next === "analytics") {
      if (nextView === "overview") renderAnalyticsOverview();
      if (nextView === "captures" && !lastCaptureReport) loadReport();
      if (nextView === "spawns") renderSpawnAnalytics();
      if (nextView === "sessions") renderSessionAnalytics();
    }
    document.getElementById("hub-nav")?.classList.remove("is-open");
  }
  window.playShowHubTab = showHubTab;

  function updateHubChip(state) {
    window.playHubLiveState = state;
    renderSpawnAnalytics();
    renderSessionAnalytics();
    const chip = document.getElementById("hub-live-chip");
    if (!chip) return;
    const s = state?.stream || {};
    const enc = state?.activeEncounter;
    const ad = state?.adState || {};
    const live = s.twitchLive ? "LIVE" : (s.liveKnown ? "OFFLINE" : "UNKNOWN");
    const phase = enc?.phase ? String(enc.phase).replace(/_/g, " ") : "";
    const adLeft = ad.nextAdAt ? Math.max(0, Math.floor((Date.parse(ad.nextAdAt) - Date.now()) / 1000)) : null;
    const adClock = adLeft == null ? "" : (adLeft >= 60 ? `${Math.floor(adLeft / 60)}m` : `${adLeft}s`);
    chip.hidden = false;
    chip.innerHTML = `<strong>${live}</strong><span>${enc ? `${enc.name}${phase ? ` · ${phase}` : ""}` : "No encounter"}</span>${adClock ? `<span>Next ad ${adClock}</span>` : ""}`;
  }

  function setSignedOut() {
    els.staff.hidden = true;
    els.gate.hidden = false;
    els.gate.textContent = "Sign in with Twitch to open the Admin Hub.";
    window.playSetAccountNav(null);
  }

  window.playBindAccountNav({ onSignOut: setSignedOut });

  function renderSuggest() {
    if (!els.dexSuggest) return;
    const matches = window.playParseSpeciesQuery(els.dexPick.value);
    if (!els.dexPick.value.trim() || matches.length === 0) {
      els.dexSuggest.hidden = true;
      els.dexSuggest.innerHTML = "";
      return;
    }
    els.dexSuggest.hidden = false;
    els.dexSuggest.innerHTML = matches.slice(0, 12).map((row) => (
      `<li><button type="button" data-dex="${row.dex}">${window.playPadDex(row.dex)} ${row.name}</button></li>`
    )).join("");
  }

  function pickSpecies(dex) {
    if (!dex) return;
    els.dexPick.value = `${window.playPadDex(dex)} ${window.playSpeciesName(dex)}`;
    if (els.dexSuggest) {
      els.dexSuggest.hidden = true;
      els.dexSuggest.innerHTML = "";
    }
    renderAppearance(dex);
  }

  function loadStream(login) {
    const channel = (login || "").trim();
    if (channel === lastChannel) return;
    lastChannel = channel;
    if (!channel) {
      els.stream.removeAttribute("src");
      els.streamNote.textContent = "Set a Twitch login to preview the stream.";
      return;
    }
    const parent = encodeURIComponent(window.playTwitchParent());
    els.stream.src = `https://player.twitch.tv/?channel=${encodeURIComponent(channel)}&parent=${parent}&muted=true`;
    els.streamNote.textContent = `Previewing ${channel}.`;
  }

  function fillSettings(settings) {
    if (!settings) return;
    els.join.value = settings.joinSeconds ?? 30;
    els.prepare.value = settings.prepareSeconds ?? 30;
    els.throw.value = settings.throwSeconds ?? 30;
    els.reveal.value = settings.revealSeconds ?? 15;
  }

  function parseDex(value) {
    const matches = window.playParseSpeciesQuery(value);
    return matches.length ? matches[0].dex : null;
  }

  function hubRound(round) {
    if (!round || round.cancelled) return null;
    if (typeof window.playApplyLocalRound === "function") return window.playApplyLocalRound(round);
    return round;
  }

  function renderRound(round) {
    const shown = hubRound(round);
    const bar = typeof window.playPhaseBarPercent === "function" ? window.playPhaseBarPercent(shown) : 0;
    const key = shown
      ? `${shown.id}:${shown.phase}:${shown.resolved || false}:${shown.paused || false}:${shown.hidden || false}`
      : "idle";
    const live = Boolean(shown && shown.phase && shown.phase !== "closed" && !shown.cancelled && !shown.resolved);
    if (els.clearRound) els.clearRound.disabled = !shown || live;
    if (els.advancePhase) {
      els.advancePhase.disabled = !shown || shown.phase === "closed" || shown.cancelled;
    }
    if (typeof window.playRenderLiveFeed === "function" && lastOverview) {
      window.playRenderLiveFeed(lastOverview.console || [], "admin-console", shown);
    }
    if (shown && String(lastHubKey).startsWith(`${shown.id}:`)
      && window.playPatchEncounter(els.encounter, shown, bar, { staff: true })) {
      lastHubKey = key;
      return;
    }
    if (key === lastHubKey && els.encounter.querySelector(".dex-stage, .dex-idle")) return;
    lastHubKey = key;
    els.encounter.innerHTML = window.playRenderEncounter(shown, {
      staff: true,
      bar,
      emptyNote: "Waiting for the next encounter."
    });
    els.hide.textContent = "Hide overlay";
  }

  function applyOverview(data, fillForms) {
    if (fillForms) fillSettings(data.settings);
    loadStream(data.channel);
    lastOverview = data;
    const shown = hubRound(data.round);
    renderRound(data.round);
    if (typeof window.playRenderLiveFeed === "function") {
    window.playRenderLiveFeed(data.console || [], "admin-console", shown);
    }
    els.trainers.textContent = `${data.trainers} trainer${data.trainers === 1 ? "" : "s"} on Play.`;
    const live = Boolean(shown && shown.phase && shown.phase !== "closed" && !shown.cancelled);
    const paused = Boolean(shown?.paused);
    if (els.pause) els.pause.disabled = !live || paused;
    if (els.resume) els.resume.disabled = !paused;
    if (els.gift) els.gift.disabled = !live;
    if (els.advancePhase) {
      els.advancePhase.disabled = !shown || shown.phase === "closed" || shown.cancelled;
    }
    const bridge = data.bridge || {};
    if (els.bridgeStatus) {
      if (!bridge.configured) {
        els.bridgeStatus.innerHTML = `<span class="status-bad">Stream bridge is not linked yet.</span> A token should already be on this stream PC. Only create a new one if Data/play-bridge.json is missing.`;
      } else if (bridge.online) {
        els.bridgeStatus.innerHTML = `<span class="status-ok">Stream bridge online.</span> ${bridge.pending ? `${bridge.pending} command${bridge.pending === 1 ? "" : "s"} in flight.` : "Ready for staff commands."}`;
      } else {
        els.bridgeStatus.innerHTML = `<span class="status-bad">Stream bridge offline.</span> Commands wait until the Play bridge is running.`;
      }
      if (bridge.lastError && !/must join this encounter/i.test(bridge.lastError)) {
        els.bridgeStatus.innerHTML += ` Last stream note: ${bridge.lastError}`;
      }
    }
    if (typeof window.playApplyStaffOverview === "function") window.playApplyStaffOverview(data, fillForms);
  }

  async function refreshOverview(fillForms) {
    try {
      const data = await window.playCall("admin_overview");
      applyOverview(data, fillForms);
    } catch (error) {
      const message = window.playRpcError(error, "Could not load staff overview.");
      if (els.bridgeStatus && !/failed to fetch|networkerror|load failed/i.test(message)) {
        els.bridgeStatus.innerHTML = `<span class="status-bad">${message}</span>`;
      }
    }
  }

  function scheduleOverview() {
    clearTimeout(overviewTimer);
    overviewTimer = setTimeout(() => refreshOverview(false), 600);
  }

  async function loadHub(passedSession) {
    const session = passedSession || (await supabase.auth.getSession()).data.session;
    if (!session) {
      setSignedOut();
      return;
    }
    const { data: profile } = await supabase.from("profiles").select("display_name, twitch_login, avatar_url").eq("id", session.user.id).maybeSingle();
    const { data: isAdmin, error } = await supabase.rpc("is_play_admin");
    window.playSetAccountNav(session, profile, { isAdmin: Boolean(isAdmin) });
    if (error || !isAdmin) {
      els.staff.hidden = true;
      els.gate.hidden = false;
      els.gate.textContent = "This hub is for moderators and admins. Viewer logins cannot open it.";
      return;
    }
    els.gate.hidden = true;
    els.staff.hidden = false;
    await refreshOverview(true);
    await loadCapture();
    await loadEconomy();
    await loadLoot();
    await loadProgression();
    await loadCollection();
    await loadReport();
    renderSpawnConfig();
    loadEvolutionRules();
  }

  async function run(name, args, statusEl) {
    const target = statusEl || els.commandStatus;
    target.textContent = "Working…";
    try {
      const data = await window.playCall(name, args);
      target.textContent = String(data?.message || "Done.").replace(/Mix It Up/gi, "the stream");
      await refreshOverview(false);
    } catch (error) {
      target.textContent = window.playRpcError(error);
    }
  }

  function selectedGender(dex) {
    const options = window.playGenderOptions(dex);
    if (options.length === 1) return options[0];
    if (pickGender && options.includes(pickGender)) return pickGender;
    return dex ? (options[0] || "") : pickGender;
  }

  function mixPayload(dex) {
    const payload = {};
    if (dex) payload.dex = dex;
    const gender = selectedGender(dex);
    const shiny = pickShiny;
    if (gender) payload.gender = gender;
    if (dex || shiny) payload.shiny = shiny;
    const variant = window.playSpriteVariant(dex, gender, shiny);
    if (dex || shiny) payload.variant = variant;
    return payload;
  }

  function renderAppearance(dex) {
    const genderEl = els.genderRow;
    const shinyEl = els.shinyRow;
    if (!genderEl || !shinyEl) return;
    const options = window.playGenderOptions(dex);
    if (!dex) {
      genderEl.innerHTML = ["Male", "Female"].map((name) => (
        `<button type="button" data-gender="${name}" aria-pressed="${pickGender === name}">${name}</button>`
      )).join("");
    } else if (options.length === 1) {
      pickGender = options[0];
      genderEl.innerHTML = `<span class="chip">${options[0]}</span>`;
    } else {
      if (!options.includes(pickGender)) pickGender = options[0];
      genderEl.innerHTML = options.map((name) => (
        `<button type="button" data-gender="${name}" aria-pressed="${pickGender === name}">${name}</button>`
      )).join("");
    }
    shinyEl.innerHTML = `<button type="button" data-shiny="1" aria-pressed="${pickShiny}">Shiny</button>`;
    const gender = selectedGender(dex);
    const variant = window.playSpriteVariant(dex, gender, pickShiny);
    if (!dex) {
      if (els.formCopy) els.formCopy.textContent = pickShiny || pickGender
        ? `${pickGender || "Any gender"}${pickShiny ? " · Shiny" : ""} · random species`
        : "Pick a species to preview, or start a random encounter.";
      if (els.formPreview) els.formPreview.removeAttribute("src");
      return;
    }
    if (els.formPreview) {
      delete els.formPreview.dataset.playSpriteDone;
      delete els.formPreview.dataset.playSpriteLock;
      els.formPreview.src = window.playSpriteUrl(dex, variant);
      els.formPreview.alt = `${window.playSpeciesName(dex)} ${gender}${pickShiny ? " Shiny" : ""}`;
    }
    if (els.formCopy) {
      const place = window.playHabitat(dex);
      els.formCopy.textContent = `${window.playSpeciesName(dex)} · ${gender}${pickShiny ? " · Shiny" : ""} · ${place}`;
    }
  }

  async function queueMix(action, payload) {
    els.commandStatus.textContent = "Working…";
    try {
      const data = await window.playCall("admin_queue_stream_command", { p_action: action, p_payload: payload || {} });
      els.commandStatus.textContent = String(data?.message || "Queued for the stream.").replace(/Mix It Up/gi, "the stream");
      await refreshOverview(false);
    } catch (error) {
      const message = window.playRpcError(error);
      if (!/could not find|schema cache|does not exist|admin_queue_stream_command/i.test(message)) {
        els.commandStatus.textContent = message;
        return;
      }
      if (action === "start") return run("admin_start_round", {
        p_dex: payload?.dex ?? null,
        p_gender: payload?.gender ?? null,
        p_shiny: payload?.shiny ?? null
      });
      if (action === "cancel") return run("admin_cancel_round");
      if (action === "hide") return run("admin_hide_round", { p_hidden: true });
      els.commandStatus.textContent = message;
    }
  }

  document.getElementById("start-random").addEventListener("click", () => queueMix("start", mixPayload(null)));
  document.getElementById("start-dex").addEventListener("click", () => {
    const dex = parseDex(els.dexPick.value);
    if (!dex) {
      els.commandStatus.textContent = "Pick a Pokédex number from 1 to 151.";
      return;
    }
    queueMix("start", mixPayload(dex));
  });
  els.dexPick.addEventListener("input", () => {
    renderSuggest();
    const matches = window.playParseSpeciesQuery(els.dexPick.value);
    renderAppearance(matches.length === 1 ? matches[0].dex : parseDex(els.dexPick.value));
  });
  els.dexSuggest?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-dex]");
    if (!button) return;
    pickSpecies(Number(button.dataset.dex));
  });
  els.dexPick.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const matches = window.playParseSpeciesQuery(els.dexPick.value);
    if (matches[0]) pickSpecies(matches[0].dex);
  });
  els.genderRow?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-gender]");
    if (!button) return;
    pickGender = pickGender === button.dataset.gender && !parseDex(els.dexPick.value)
      ? ""
      : button.dataset.gender;
    renderAppearance(parseDex(els.dexPick.value));
  });
  els.shinyRow?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-shiny]");
    if (!button) return;
    pickShiny = !pickShiny;
    renderAppearance(parseDex(els.dexPick.value));
  });
  document.getElementById("cancel-round").addEventListener("click", async () => {
    els.commandStatus.textContent = "Working…";
    try {
      const data = await window.playCall("admin_cancel_round");
      try {
        await window.playCall("admin_queue_stream_command", { p_action: "cancel", p_payload: {} });
      } catch (_) {}
      els.commandStatus.textContent = String(data?.message || "Encounter cancelled.").replace(/Mix It Up/gi, "the stream");
      await refreshOverview(false);
    } catch (error) {
      els.commandStatus.textContent = window.playRpcError(error);
    }
  });
  els.clearRound?.addEventListener("click", async () => {
    els.commandStatus.textContent = "Working…";
    try {
      const data = await window.playCall("admin_clear_round");
      els.commandStatus.textContent = data?.message || "Encounter cleared.";
      applyOverview(data, false);
    } catch (error) {
      els.commandStatus.textContent = window.playRpcError(error);
    }
  });
  els.advancePhase?.addEventListener("click", () => run("admin_advance_phase"));
  document.getElementById("sync-clock").addEventListener("click", () => run("admin_resume_round"));
  els.pause?.addEventListener("click", () => run("admin_pause_round"));
  async function clearLiveConsole() {
    if (els.commandStatus) els.commandStatus.textContent = "Working…";
    if (els.console) els.console.innerHTML = `<li class="muted">Clearing…</li>`;
    try {
      const data = await window.playCall("admin_clear_console");
      if (els.commandStatus) els.commandStatus.textContent = data?.message || "Live console cleared.";
      if (typeof window.playRenderLiveFeed === "function") {
        window.playRenderLiveFeed(data?.console || [], "admin-console");
      }
      await refreshOverview(false);
    } catch (error) {
      if (els.commandStatus) els.commandStatus.textContent = window.playRpcError(error);
    }
  }
  els.clearLog?.addEventListener("click", clearLiveConsole);
  document.getElementById("clear-live-console")?.addEventListener("click", clearLiveConsole);

  function esc(value) {
    return window.playEscapeAttr ? window.playEscapeAttr(value) : String(value || "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  }

  function renderGiftGrid() {
    if (!els.giftGrid) return;
    const q = String(els.giftFilter?.value || "").toLowerCase();
    const rows = giftItems.filter((item) => {
      const hay = `${item.name || ""} ${item.key || ""} ${item.floor || ""}`.toLowerCase();
      return !q || hay.includes(q);
    });
    els.giftGrid.innerHTML = rows.length
      ? rows.map((item) => `
          <button class="gift-pick" type="button" data-gift="${esc(item.key)}">
            <img src="${esc(window.playItemSprite(item.sprite || item.key))}" alt="">
            <strong>${esc(item.name || item.key)}</strong>
            <span>${esc(item.floor || "")}</span>
          </button>`).join("")
      : `<p class="muted">No supplies or Poké Balls match.</p>`;
  }

  async function openGiftModal() {
    if (!els.giftModal) return;
    if (els.giftStatus) els.giftStatus.textContent = "Loading items…";
    try {
      const data = await window.playCall("admin_gift_catalog");
      giftItems = (data?.items || []).filter((item) => item.key);
      renderGiftGrid();
      if (els.giftStatus) els.giftStatus.textContent = "Tap an item to send +1 to every trainer who joined.";
    } catch (error) {
      giftItems = [];
      renderGiftGrid();
      if (els.giftStatus) els.giftStatus.textContent = window.playRpcError(error);
    }
    if (typeof els.giftModal.showModal === "function") els.giftModal.showModal();
    else els.giftModal.setAttribute("open", "");
  }

  els.gift?.addEventListener("click", () => openGiftModal());
  els.giftFilter?.addEventListener("input", renderGiftGrid);
  els.giftGrid?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-gift]");
    if (!button) return;
    const key = button.dataset.gift;
    if (els.giftStatus) els.giftStatus.textContent = "Sending…";
    try {
      const data = await window.playCall("admin_gift_joined", { p_key: key });
      if (els.giftStatus) els.giftStatus.textContent = data?.message || "Sent.";
      els.commandStatus.textContent = data?.message || "Sent.";
      await refreshOverview(false);
    } catch (error) {
      const message = window.playRpcError(error);
      if (els.giftStatus) els.giftStatus.textContent = message;
      els.commandStatus.textContent = message;
    }
  });
  els.hide.addEventListener("click", () => queueMix("hide"));
  document.getElementById("save-settings").addEventListener("click", async () => {
    const settings = {
      joinSeconds: Number(els.join.value),
      prepareSeconds: Number(els.prepare.value),
      throwSeconds: Number(els.throw.value),
      revealSeconds: Number(els.reveal.value)
    };
    els.settingsStatus.textContent = "Saving…";
    try {
      const saved = await window.playCall("admin_save_game_settings", { p_settings: settings });
      try {
        const queued = await window.playCall("admin_queue_stream_command", { p_action: "settings", p_payload: settings });
        els.settingsStatus.textContent = String(queued?.message || saved?.message || "Saved.").replace(/Mix It Up/gi, "the stream");
      } catch (_) {
        els.settingsStatus.textContent = saved?.message || "Saved on Play. The stream PC will follow once the bridge is linked.";
      }
      await refreshOverview(false);
    } catch (error) {
      els.settingsStatus.textContent = window.playRpcError(error);
    }
  });

  let captureBalance = null;

  function pct(value) {
    if (value == null || Number.isNaN(Number(value))) return "—";
    return `${Math.round(Number(value || 0) * 1000) / 10}%`;
  }

  function catchRateLabel(rows, index) {
    const min = Number(rows[index].minCatchRate);
    const higher = rows.map((row) => Number(row.minCatchRate)).filter((n) => n > min);
    const max = higher.length ? Math.min(...higher) - 1 : 255;
    return `${min}–${max}`;
  }

  function honeyLabel(rows, index) {
    const min = Math.round(Number(rows[index].minRate) * 100);
    const higher = rows.map((row) => Math.round(Number(row.minRate) * 100)).filter((n) => n > min);
    const max = higher.length ? Math.min(...higher) - 1 : 100;
    if (min === 100) return "100%";
    if (min === 0) return "0%";
    return `${min}–${max}%`;
  }

  function tierRows(box, rows, valueKey, labelFor) {
    box.innerHTML = (rows || []).map((row, index) => `
      <label class="field hub-num" for="${box.id}-${index}">${labelFor(row, index)}
        <input id="${box.id}-${index}" data-tier="${index}" type="number" min="0" max="3" step="0.01" value="${row[valueKey]}">
      </label>`).join("");
  }

  function renderBalance(balance) {
    captureBalance = balance || {};
    els.capMin.value = captureBalance.minChance ?? 0.02;
    els.capMax.value = captureBalance.maxChance ?? 0.85;
    els.capShiny.value = captureBalance.shinyMultiplier ?? 1;
    els.capEvent.value = captureBalance.eventMultiplier ?? 1;
    els.capHoneyBonus.value = captureBalance.honeyContributorBonus ?? 1.03;
    els.capReward.value = captureBalance.rewardBonusCoins ?? 10;
    const tiers = captureBalance.baseChanceTiers || [];
    const honey = captureBalance.honeyTiers || [];
    tierRows(els.capTiers, tiers, "chance", (_row, index) => catchRateLabel(tiers, index));
    tierRows(els.capHoney, honey, "multiplier", (_row, index) => honeyLabel(honey, index));
  }

  function hubEmpty(message) {
    return `<p class="hub-empty">${message}</p>`;
  }

  function hubKpis(items) {
    return `<div class="hub-kpi-grid">${items.map((item) => `
      <${item.jump ? `button type="button" class="hub-metric" data-hub-tab-jump="${item.jump}" data-hub-view-jump="${item.view || ""}"` : `div class="hub-metric"`}>
        <em>${item.label}</em>
        <strong>${item.value}</strong>
      ${item.jump ? "</button>" : "</div>"}`).join("")}</div>`;
  }

  function hubDist(title, rows) {
    const list = (rows || []).filter((row) => row);
    const max = Math.max(1, ...list.map((row) => Number(row.count || 0)));
    if (!list.length) return "";
    return `<div class="hub-card"><h3>${title}</h3>
      <div class="hub-dist">${list.map((row) => `
        <div class="hub-dist-row">
          <span>${row.label}</span>
          <i style="width:${Math.max(6, Math.round((Number(row.count || 0) / max) * 100))}%"></i>
          <strong>${row.count || 0}</strong>
        </div>`).join("")}</div></div>`;
  }

  function clockTime(value) {
    try {
      return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    } catch (_) {
      return "—";
    }
  }

  function fillSimPickers(balls, berries) {
    if (els.simBall && !els.simBall.options.length) {
      els.simBall.innerHTML = (balls || []).map((row) => (
        `<option value="${row.key}"${row.key === "pokeball" ? " selected" : ""}>${row.name}</option>`
      )).join("");
    }
    if (els.simBerry && !els.simBerry.options.length) {
      const usable = (berries || []).filter((row) => row.enabled && row.capture_enabled);
      els.simBerry.innerHTML = `<option value="">No Berry</option>${usable.map((row) => (
        `<option value="${row.key}">${row.name}</option>`
      )).join("")}`;
    }
  }

  async function loadCapture() {
    if (!els.capTiers) return;
    try {
      const data = await window.playCall("admin_capture_overview", {});
      renderBalance(data?.balance);
      fillSimPickers(data?.balls, data?.berries);
    } catch (error) {
      els.balanceStatus.textContent = window.playRpcError(error);
    }
  }

  document.getElementById("save-balance")?.addEventListener("click", async () => {
    const tiers = (captureBalance?.baseChanceTiers || []).map((row, index) => ({
      ...row,
      chance: Number(els.capTiers.querySelector(`[data-tier="${index}"]`)?.value ?? row.chance)
    }));
    const honey = (captureBalance?.honeyTiers || []).map((row, index) => ({
      ...row,
      multiplier: Number(els.capHoney.querySelector(`[data-tier="${index}"]`)?.value ?? row.multiplier)
    }));
    els.balanceStatus.textContent = "Saving…";
    try {
      const saved = await window.playCall("admin_capture_save_balance", {
        p_balance: {
          minChance: Number(els.capMin.value),
          maxChance: Number(els.capMax.value),
          shinyMultiplier: Number(els.capShiny.value),
          eventMultiplier: Number(els.capEvent.value),
          honeyContributorBonus: Number(els.capHoneyBonus.value),
          rewardBonusCoins: Number(els.capReward.value),
          baseChanceTiers: tiers,
          honeyTiers: honey
        }
      });
      renderBalance(saved?.balance);
      els.balanceStatus.textContent = saved?.message || "Saved.";
    } catch (error) {
      els.balanceStatus.textContent = window.playRpcError(error);
    }
  });

  document.getElementById("run-sim")?.addEventListener("click", async () => {
    els.simOut.innerHTML = `<p class="muted">Running…</p>`;
    try {
      const data = await window.playCall("admin_capture_simulate", {
        p_dex: Number(document.getElementById("sim-dex").value),
        p_ball: els.simBall.value,
        p_berry: els.simBerry.value || null,
        p_joined: Number(document.getElementById("sim-joined").value),
        p_honey: Number(document.getElementById("sim-honey").value),
        p_contributed: document.getElementById("sim-contrib").checked,
        p_owns: document.getElementById("sim-owns").checked,
        p_shiny: document.getElementById("sim-shiny").checked,
        p_trials: Number(document.getElementById("sim-trials").value)
      });
      const calc = data?.calc || {};
      const ball = calc.ball || {};
      const berry = calc.berry || {};
      const honey = calc.honey || {};
      const trials = Number(data.trials || 0);
      const observed = data.observedRate;
      const successes = observed == null ? null : Math.round(Number(observed) * trials);
      els.simOut.innerHTML = `<p class="hub-sim-banner">Simulation only. No inventory, catches, or rewards are changed.</p>
        <dl class="sim-grid">
        <div><dt>Expected catch rate</dt><dd><strong>${calc.guaranteed ? "Guaranteed" : pct(calc.finalChance)}</strong></dd></div>
        <div><dt>Successful trials</dt><dd>${successes == null ? "—" : money(successes)}</dd></div>
        <div><dt>Failed trials</dt><dd>${successes == null ? "—" : money(Math.max(0, trials - successes))}</dd></div>
        <div><dt>Observed rate</dt><dd>${observed == null ? "—" : pct(observed)}</dd></div>
        <div><dt>Species</dt><dd>${calc.species} · catch rate ${calc.catchRate}</dd></div>
        <div><dt>Base chance</dt><dd>${pct(calc.baseChance)}</dd></div>
        <div><dt>Ball</dt><dd>${ball.name} ×${ball.multiplier}${ball.condition === "NONE" ? "" : ball.conditionMet ? " (met)" : " (not met)"}</dd></div>
        <div><dt>Berry</dt><dd>${berry.key ? `${berry.name} ×${berry.multiplier}` : "None"}</dd></div>
        <div><dt>Honey</dt><dd>×${honey.multiplier} · ${honey.contributors}/${honey.participants}</dd></div>
        <div><dt>Contributor</dt><dd>×${calc.honeyContributorMultiplier}</dd></div>
        <div><dt>Shiny / event</dt><dd>×${calc.shinyMultiplier} / ×${calc.eventMultiplier}</dd></div>
        <div><dt>Raw chance</dt><dd>${pct(calc.rawChance)}</dd></div>
        <div><dt>Trials</dt><dd>${money(trials)}</dd></div>
      </dl>`;
    } catch (error) {
      els.simOut.innerHTML = `<p class="muted">${window.playRpcError(error)}</p>`;
    }
  });

  function reportTable(title, rows, labelKey) {
    if (!rows || !rows.length) return "";
    return `<h3>${title}</h3>
      <table class="report-table"><thead><tr><th>${title}</th><th>Throws</th><th>Caught</th><th>Rate</th></tr></thead>
      <tbody>${rows.map((row) => `<tr>
        <td>${row[labelKey] ?? "—"}</td><td>${row.throws}</td><td>${row.caught}</td><td>${pct(row.rate)}</td>
      </tr>`).join("")}</tbody></table>`;
  }

  function renderCaptureReport(data) {
    const o = data?.overall || {};
    const honey = data?.honey || {};
    const col = data?.collections || {};
    const days = Number(els.reportDays?.value || 30);
    if (els.reportMeta) {
      els.reportMeta.textContent = lastReportAt
        ? `Last refreshed: ${clockTime(lastReportAt)} · Time range: ${days} days`
        : `Time range: ${days} days`;
    }
    if (!els.reportOut) return;
    if (!o.throws) {
      els.reportOut.innerHTML = hubEmpty("No captures found for this period.");
      return;
    }
    els.reportOut.innerHTML = `
      <h3>Summary</h3>
      ${hubKpis([
        { label: "Throws", value: money(o.throws) },
        { label: "Successful catches", value: money(o.caught) },
        { label: "Success rate", value: pct(o.rate) },
        { label: "Unique Trainers", value: money(col.trainers) }
      ])}
      <div class="hub-split">
        <div class="hub-card"><h3>Honey</h3>
          <p>Average turnout ${pct(honey.averageParticipation)}</p>
          <p>With Honey ${pct(honey.withHoney?.rate)} · Without ${pct(honey.withoutHoney?.rate)}</p>
        </div>
        <div class="hub-card"><h3>Expected vs observed</h3>
          <p>Average final chance ${pct(o.averageFinalChance)}</p>
          <p>Average unique species ${col.averageSpecies ?? 0}</p>
        </div>
      </div>
      ${reportTable("By difficulty", data?.byCatchRateTier, "tier")}
      ${reportTable("By Poké Ball", data?.byBall, "name")}
      ${reportTable("By Berry", data?.byBerry, "name")}
      ${reportTable("By Pokémon", data?.bySpecies, "name")}`;
  }

  async function loadReport() {
    if (!els.reportOut) return;
    els.reportOut.innerHTML = `<p class="muted">Refreshing…</p>`;
    if (els.reportMeta) els.reportMeta.textContent = "Refreshing…";
    try {
      const data = await window.playCall("admin_capture_report", { p_days: Number(els.reportDays.value) });
      lastCaptureReport = data;
      lastReportAt = new Date();
      renderCaptureReport(data);
      if (els.reportMeta) els.reportMeta.textContent = `Updated. Last refreshed: ${clockTime(lastReportAt)} · Time range: ${els.reportDays.value} days`;
      renderAnalyticsOverview();
    } catch (error) {
      els.reportOut.innerHTML = `<p class="muted">${window.playRpcError(error)}</p>`;
      if (els.reportMeta) els.reportMeta.textContent = window.playRpcError(error);
    }
  }

  document.getElementById("run-report")?.addEventListener("click", loadReport);

  let economyConfig = null;

  function money(value) {
    return Number(value || 0).toLocaleString();
  }

  function fillEconomy(data) {
    const cfg = data?.config || {};
    economyConfig = cfg;
    if (els.ecoJoin) els.ecoJoin.value = cfg.participationReward ?? 25;
    if (els.ecoCatch) els.ecoCatch.value = cfg.captureReward ?? 25;
    if (els.ecoDex) els.ecoDex.value = cfg.newDexReward ?? 100;
    if (els.ecoShiny) els.ecoShiny.value = cfg.shinyReward ?? 250;
    if (els.ecoLegend) els.ecoLegend.value = cfg.legendaryReward ?? 350;
    if (els.ecoStream) els.ecoStream.value = cfg.streamAttendanceReward ?? 50;
    const dist = data?.distribution || {};
    const inflation = data?.inflation || {};
    lastEconomy = data;
    if (els.ecoOverview) {
      els.ecoOverview.innerHTML = `
        ${hubKpis([
          { label: "PokéCoins in circulation", value: money(data.circulation) },
          { label: "Created today", value: money(data.createdToday) },
          { label: "Spent today", value: money(data.spentToday) },
          { label: "Store revenue today", value: money(data.storeRevenueToday) },
          { label: "Average / median balance", value: `${money(data.averageBalance)} / ${money(data.medianBalance)}` },
          { label: "Created / spent (all-time)", value: `${money(inflation.created)} / ${money(inflation.destroyed)}` }
        ])}
        <div class="hub-split">
          <div class="hub-card">
            <h3>Item usage</h3>
            <p>Ultra Ball ${pct(data.ultraShare)} · Golden Razz ${pct(data.goldenRazzShare)}</p>
            <p>Honey turnout ${pct(data.honeyParticipation)}</p>
            <p>Master Balls owned ${money(data.masterBallsOwned)}</p>
          </div>
          ${hubDist("Trainer balances", [
            { label: "0–499", count: dist["0-499"] },
            { label: "500–999", count: dist["500-999"] },
            { label: "1,000–2,499", count: dist["1000-2499"] },
            { label: "2,500–4,999", count: dist["2500-4999"] },
            { label: "5,000–9,999", count: dist["5000-9999"] },
            { label: "10,000+", count: dist["10000+"] }
          ])}
        </div>`;
    }
    renderAnalyticsOverview();
  }

  async function loadEconomy() {
    if (!els.ecoJoin && !els.ecoOverview) return;
    try {
      fillEconomy(await window.playCall("admin_economy_overview", {}));
    } catch (error) {
      if (els.ecoStatus) els.ecoStatus.textContent = window.playRpcError(error);
    }
  }

  document.getElementById("save-economy")?.addEventListener("click", async () => {
    if (els.ecoStatus) els.ecoStatus.textContent = "Saving…";
    try {
      const saved = await window.playCall("admin_economy_save", {
        p_balance: {
          ...(economyConfig || {}),
          participationReward: Number(els.ecoJoin.value),
          captureReward: Number(els.ecoCatch.value),
          newDexReward: Number(els.ecoDex.value),
          shinyReward: Number(els.ecoShiny.value),
          legendaryReward: Number(els.ecoLegend.value),
          streamAttendanceReward: Number(els.ecoStream.value)
        }
      });
      economyConfig = saved?.config || economyConfig;
      if (els.ecoStatus) els.ecoStatus.textContent = saved?.message || "Saved.";
    } catch (error) {
      if (els.ecoStatus) els.ecoStatus.textContent = window.playRpcError(error);
    }
  });

  document.getElementById("run-economy-sim")?.addEventListener("click", async () => {
    if (els.ecoSimOut) els.ecoSimOut.innerHTML = `<p class="muted">Running…</p>`;
    try {
      const data = await window.playCall("admin_economy_simulate", {
        p_encounters: Number(document.getElementById("eco-encounters").value),
        p_streams: Number(document.getElementById("eco-streams").value),
        p_join_rate: Number(document.getElementById("eco-join-rate").value),
        p_catch_rate: Number(document.getElementById("eco-catch-rate").value),
        p_strategy: "regular"
      });
      const stream = data.perStream || {};
      const week = data.weekly || {};
      els.ecoSimOut.innerHTML = `<p class="hub-sim-banner">Simulation only. No PokéCoins or bags are changed.</p><dl class="sim-grid">
        <div><dt>Per stream</dt><dd>${money(stream.coinsEarned)} PokéCoins</dd></div>
        <div><dt>Poké Balls</dt><dd>${stream.pokeBallsAffordable}</dd></div>
        <div><dt>Great Balls</dt><dd>${stream.greatBallsAffordable}</dd></div>
        <div><dt>Ultra Balls</dt><dd>${stream.ultraBallsAffordable}</dd></div>
        <div><dt>Weekly</dt><dd>${money(week.coinsEarned)} PokéCoins</dd></div>
        <div><dt>Weekly Ultra Balls</dt><dd>${week.ultraBallsAffordable}</dd></div>
      </dl><p class="muted">${week.note || "Dry run only."}</p>`;
    } catch (error) {
      els.ecoSimOut.innerHTML = `<p class="muted">${window.playRpcError(error)}</p>`;
    }
  });

  async function loadLoot() {
    if (!els.lootOverview) return;
    try {
      const data = await window.playCall("admin_loot_overview", {});
      const inv = data.inventory || {};
      const cfg = data.config || {};
      if (els.lootPart) els.lootPart.value = cfg.participationDropChance ?? 0.15;
      if (els.lootCatch) els.lootCatch.value = cfg.captureDropChance ?? 0.25;
      if (els.lootEvent) els.lootEvent.value = cfg.eventDropModifier ?? 1;
      lastLoot = data;
      els.lootOverview.innerHTML = `<h3>Item supply</h3>
        ${hubKpis([
          { label: "Poké Balls held", value: money(inv.pokeball) },
          { label: "Great / Ultra", value: `${money(inv.greatball)} / ${money(inv.ultraball)}` },
          { label: "Honey", value: money(inv.honey) },
          { label: "Master Balls", value: money(inv.masterball) },
          { label: "Stones / Linking Cords", value: `${money(inv.stones)} / ${money(inv.linkingcord)}` }
        ])}
      ${(data.warnings || []).map((line) => `<p class="muted">${esc(line)}</p>`).join("")}
      <h3>Bits packs stay guaranteed</h3>
      ${(data.bitsPacks || []).map((row) => `<p>${esc(row.name)} · ${row.bits} Bits · ${esc(JSON.stringify(row.grants || {}))}</p>`).join("")}`;
      const tables = await window.playCall("admin_loot_tables", {});
      els.lootTables.innerHTML = (tables.tables || []).map((table) => `
        <h4>${esc(table.name)} <span class="muted">${esc(table.tier || "")}</span></h4>
        <table class="report-table"><thead><tr><th>Item</th><th>Weight</th><th>Approx</th><th>Qty</th></tr></thead>
        <tbody>${(table.entries || []).map((entry) => `<tr>
          <td>${esc(entry.label)}</td>
          <td><input data-loot-entry="${entry.id}" data-loot-field="weight" data-loot-min="${entry.minQty}" data-loot-max="${entry.maxQty}" type="number" min="0" value="${entry.weight}"></td>
          <td>${entry.approx}%</td>
          <td>${entry.minQty}–${entry.maxQty}</td>
        </tr>`).join("")}</tbody></table>`).join("");
    } catch (error) {
      if (els.lootStatus) els.lootStatus.textContent = window.playRpcError(error);
    }
  }

  document.getElementById("save-loot")?.addEventListener("click", async () => {
    if (els.lootStatus) els.lootStatus.textContent = "Saving…";
    try {
      const saved = await window.playCall("admin_loot_save_config", {
        p_balance: {
          participationDropChance: Number(els.lootPart.value),
          captureDropChance: Number(els.lootCatch.value),
          eventDropModifier: Number(els.lootEvent.value)
        }
      });
      const weights = [...document.querySelectorAll("[data-loot-entry][data-loot-field='weight']")];
      for (const input of weights) {
        await window.playCall("admin_loot_save_entry", {
          p_id: input.getAttribute("data-loot-entry"),
          p_weight: Number(input.value),
          p_min: Number(input.getAttribute("data-loot-min") || 1),
          p_max: Number(input.getAttribute("data-loot-max") || 1),
          p_enabled: true
        });
      }
      if (els.lootStatus) els.lootStatus.textContent = saved?.message || "Saved.";
      await loadLoot();
    } catch (error) {
      if (els.lootStatus) els.lootStatus.textContent = window.playRpcError(error);
    }
  });

  document.getElementById("run-loot-sim")?.addEventListener("click", async () => {
    if (els.lootSimOut) els.lootSimOut.innerHTML = `<p class="muted">Running dry simulation…</p>`;
    try {
      const data = await window.playCall("admin_loot_simulate", { p_encounters: 10000, p_catch_rate: 0.35 });
      const per = data.per100Joined || {};
      els.lootSimOut.innerHTML = `<p class="hub-sim-banner">Simulation only. No items are granted or removed.</p><dl class="sim-grid">
        <div><dt>Expected item value / encounter</dt><dd>${data.expectedValuePerEncounter} PokéCoins</dd></div>
        <div><dt>Drops / 100 joined</dt><dd>${per.items}</dd></div>
        <div><dt>Ultra Balls / 100 catches</dt><dd>${per.ultraBallsPer100Catches}</dd></div>
        <div><dt>Stones / 100 catches</dt><dd>${per.stonesPer100Catches}</dd></div>
        <div><dt>Linking Cords / 100 catches</dt><dd>${per.cordsPer100Catches}</dd></div>
      </dl><p class="muted">${data.note || ""}</p>`;
    } catch (error) {
      els.lootSimOut.innerHTML = `<p class="muted">${window.playRpcError(error)}</p>`;
    }
  });

  document.getElementById("run-loot-tests")?.addEventListener("click", async () => {
    if (els.lootStatus) els.lootStatus.textContent = "Testing…";
    try {
      const data = await window.playCall("admin_loot_self_test", {});
      const rows = data.results || [];
      const failed = rows.filter((row) => !row.passed);
      if (els.lootStatus) els.lootStatus.textContent = failed.length ? `${failed.length} loot tests failed.` : `${rows.length} loot tests passed.`;
      els.lootSimOut.innerHTML = rows.map((row) => `<p>${row.passed ? "✓" : "✗"} ${esc(row.name)} · ${esc(row.detail || "")}</p>`).join("");
    } catch (error) {
      if (els.lootStatus) els.lootStatus.textContent = window.playRpcError(error);
    }
  });

  document.getElementById("load-ledger")?.addEventListener("click", async () => {
    if (els.ecoLedger) els.ecoLedger.innerHTML = `<p class="muted">Loading…</p>`;
    try {
      const data = await window.playCall("admin_coin_ledger", { p_limit: 40 });
      const rows = data.rows || [];
      els.ecoLedger.innerHTML = rows.length
        ? `<table class="report-table"><thead><tr><th>When</th><th>Trainer</th><th>Type</th><th>Amount</th><th>After</th></tr></thead>
           <tbody>${rows.map((row) => `<tr>
             <td>${escTime(row.at)}</td><td>${row.trainer || "—"}</td><td>${row.type}</td>
             <td>${row.amount > 0 ? "+" : ""}${money(row.amount)}</td><td>${money(row.after)}</td>
           </tr>`).join("")}</tbody></table>`
        : `<p class="muted">No ledger rows yet.</p>`;
    } catch (error) {
      els.ecoLedger.innerHTML = `<p class="muted">${window.playRpcError(error)}</p>`;
    }
  });

  function fillProgression(data) {
    lastProgression = data;
    const cfg = data?.config || {};
    if (els.progXpBase) els.progXpBase.value = cfg.xpBase ?? 100;
    if (els.progXpExp) els.progXpExp.value = cfg.xpExponent ?? 1.35;
    if (els.progJoinXp) els.progJoinXp.value = cfg.joinXp ?? 5;
    if (els.progCatchXp) els.progCatchXp.value = cfg.catchXp ?? 10;
    updateXpPreview();
    const dex = data?.dexDistribution || {};
    const levels = data?.levelBuckets || {};
    if (els.progOverview) {
      const unlocks = data.achievementUnlocks || [];
      const titles = data.activeTitles || [];
      els.progOverview.innerHTML = `
        ${hubKpis([
          { label: "Active Trainers", value: money(data.trainers) },
          { label: "Average Trainer Level", value: data.averageLevel || 0 },
          { label: "Median Trainer Level", value: data.medianLevel || 0 },
          { label: "Average unique species", value: data.averageSpecies || 0 }
        ])}
        <div class="hub-split">
          ${hubDist("Trainer level distribution", [
            { label: "Level 1–10", count: levels["1-10"] },
            { label: "Level 11–25", count: levels["11-25"] },
            { label: "Level 26–50", count: levels["26-50"] },
            { label: "Level 51–100", count: levels["51-100"] }
          ])}
          ${hubDist("Pokédex completion", [
            { label: "0–25", count: dex["0-25"] },
            { label: "26–50", count: dex["26-50"] },
            { label: "51–75", count: dex["51-75"] },
            { label: "76–100", count: dex["76-100"] },
            { label: "101–125", count: dex["101-125"] },
            { label: "126–140", count: dex["126-140"] },
            { label: "141–150", count: dex["141-150"] },
            { label: "151", count: dex["151"] }
          ])}
        </div>
        <div class="hub-split">
          ${unlocks.length ? hubDist("Achievement unlocks", unlocks.map((row) => ({ label: row.id, count: row.count }))) : `<div class="hub-card"><h3>Achievement unlocks</h3>${hubEmpty("No achievement unlocks have been recorded yet.")}</div>`}
          ${titles.length ? hubDist("Active titles", titles.map((row) => ({ label: row.title, count: row.count }))) : `<div class="hub-card"><h3>Active titles</h3>${hubEmpty("No titles recorded yet.")}</div>`}
        </div>`;
    }
    renderAnalyticsOverview();
  }

  async function loadProgression() {
    if (!els.progOverview) return;
    try {
      fillProgression(await window.playCall("admin_progression_overview", {}));
    } catch (error) {
      if (els.progStatus) els.progStatus.textContent = window.playRpcError(error);
    }
  }

  async function loadCollection() {
    if (!els.collectionOverview) return;
    try {
      const data = await window.playCall("admin_collection_overview", {});
      lastCollection = data;
      const eevee = data.eevee || {};
      const starters = data.starters || {};
      const dratini = data.dratini || {};
      const trade = data.tradeVsCord || {};
      const recent = data.recentEvo || [];
      const most = data.mostEvolved || [];
      if (els.evoVersion) els.evoVersion.textContent = `Balance version: v${data.balanceVersion || 1}`;
      if (els.evoBalanceMeta) els.evoBalanceMeta.textContent = `Balance version: v${data.balanceVersion || 1}`;
      els.collectionOverview.innerHTML = `
        ${hubKpis([
          { label: "Evolutions logged", value: money(data.evolutions) },
          { label: "Trainers ready to evolve", value: money(data.readyPlayers) },
          { label: "Family Candy held", value: money(data.candyTotal) },
          { label: "Trainers with Candy", value: money(data.candyTrainers) }
        ])}
        <div class="hub-split">
          <div class="hub-card">
            <h3>Evolution activity</h3>
            <p>Species mastered ${money(data.mastered)}</p>
          </div>
          <div class="hub-card">
            <h3>Trading</h3>
            <p>Open GTS listings ${money(data.openGts)}</p>
            <p>Direct trades ${money(data.directTrades)}</p>
            <p>Trade evolutions ${money(trade.trade)} · Linking Cord ${money(trade.cord)}</p>
          </div>
        </div>
        <div class="hub-card">
          <h3>Notable families</h3>
          <div class="hub-split-4">
            <div><em>Starters</em><p>Venusaur ${starters.venusaur || 0} · Charizard ${starters.charizard || 0} · Blastoise ${starters.blastoise || 0}</p></div>
            <div><em>Eevee</em><p>Vaporeon ${eevee.vaporeon || 0} · Jolteon ${eevee.jolteon || 0} · Flareon ${eevee.flareon || 0}</p></div>
            <div><em>Dratini</em><p>Dragonair ${dratini.dragonair || 0} · Dragonite ${dratini.dragonite || 0}</p></div>
            <div><em>Magikarp</em><p>Gyarados ${data.magikarp || 0}</p></div>
          </div>
        </div>
        <div class="hub-split">
          <div class="hub-card">
            <h3>Recent activity</h3>
            ${recent.length
              ? `<table class="report-table"><thead><tr><th>Trainer</th><th>Evolution</th><th>Candy</th></tr></thead><tbody>${
                recent.map((row) => `<tr><td>${window.playEscapeAttr(row.player || "Trainer")}</td><td>#${row.fromDex} → #${row.toDex}</td><td>${row.candy}</td></tr>`).join("")
              }</tbody></table>`
              : hubEmpty("No evolution activity has been recorded yet.")}
          </div>
          <div class="hub-card">
            <h3>Most evolved</h3>
            ${most.length
              ? `<ol class="hub-rank">${most.map((row) => `<li>#${row.dex} · ${row.count}</li>`).join("")}</ol>`
              : hubEmpty("No evolution activity has been recorded yet.")}
          </div>
        </div>`;
      renderAnalyticsOverview();
    } catch (error) {
      if (els.collectionStatus) els.collectionStatus.textContent = window.playRpcError(error);
    }
  }

  document.getElementById("run-candy-sim")?.addEventListener("click", async () => {
    if (els.candySimOut) els.candySimOut.innerHTML = `<p class="muted">Running…</p>`;
    try {
      const data = await window.playCall("admin_candy_simulate", {
        p_family: Number(document.getElementById("candy-family").value),
        p_catches: Number(document.getElementById("candy-catches").value)
      });
      const first = data.firstEvolution;
      const last = data.finalEvolution;
      els.candySimOut.innerHTML = `<p class="hub-sim-banner">Simulation only. No Candy, evolutions, or inventory are changed.</p>
      <dl class="sim-grid">
        <div><dt>${window.playEscapeAttr(data.family)} Candy / catch</dt><dd>${data.candyPerCatch}</dd></div>
        <div><dt>Expected Candy</dt><dd>${data.expectedCandy}</dd></div>
        ${first ? `<div><dt>First evo</dt><dd>${first.catchesNeeded} catches · ${first.cost} Candy</dd></div>` : ""}
        ${last ? `<div><dt>Final evo</dt><dd>${last.catchesNeeded} first-stage equivalent · ${last.cost} Candy</dd></div>` : ""}
      </dl>
      <p class="muted">${window.playEscapeAttr(data.note || "")}</p>
      ${first?.range ? `<p class="muted">${window.playEscapeAttr(first.range)}</p>` : ""}
      ${last?.range ? `<p class="muted">${window.playEscapeAttr(last.range)}</p>` : ""}`;
    } catch (error) {
      if (els.candySimOut) els.candySimOut.innerHTML = `<p class="muted">${window.playRpcError(error)}</p>`;
    }
  });

  document.getElementById("unlock-catch-btn")?.addEventListener("click", async () => {
    const id = String(document.getElementById("unlock-catch")?.value || "").trim();
    if (!id) {
      if (els.collectionStatus) els.collectionStatus.textContent = "Enter a catch / instance ID first.";
      return;
    }
    const ok = window.confirm("Clear the transaction lock for this Pokémon instance?\n\nThis should only be used to recover a stuck transaction. Ownership will not be changed.");
    if (!ok) return;
    if (els.collectionStatus) els.collectionStatus.textContent = "Working…";
    try {
      const result = await window.playCall("admin_unlock_catch", {
        p_catch: id,
        p_reason: "admin unlock"
      });
      if (els.collectionStatus) els.collectionStatus.textContent = result.message || "Unlocked.";
    } catch (error) {
      if (els.collectionStatus) els.collectionStatus.textContent = window.playRpcError(error);
    }
  });

  document.getElementById("save-progression")?.addEventListener("click", async () => {
    if (els.progStatus) els.progStatus.textContent = "Saving…";
    try {
      const saved = await window.playCall("admin_progression_save", {
        p_balance: {
          xpBase: Number(els.progXpBase.value),
          xpExponent: Number(els.progXpExp.value),
          joinXp: Number(els.progJoinXp.value),
          catchXp: Number(els.progCatchXp.value),
          levelCatchBonus: false
        }
      });
      if (els.progStatus) els.progStatus.textContent = saved?.message || "Saved.";
      updateXpPreview();
    } catch (error) {
      if (els.progStatus) els.progStatus.textContent = window.playRpcError(error);
    }
  });

  function updateXpPreview() {
    if (!els.xpPreview) return;
    const base = Number(els.progXpBase?.value || 100);
    const exp = Number(els.progXpExp?.value || 1.35);
    const cost = (level) => Math.max(1, Math.round(base * Math.pow(Math.max(level, 1), exp)));
    els.xpPreview.innerHTML = `<p>Level 1 → 2: <strong>${cost(1)}</strong> XP</p><p>Level 10 → 11: <strong>${cost(10)}</strong> XP</p>`;
  }

  function spawnDefaults() {
    return {
      bandWeights: {
        COMMON: 50, UNCOMMON: 28, RARE: 15, VERY_RARE: 5, ULTRA_RARE: 2, LEGENDARY: 0, EVENT: 0
      },
      allowLegendaryAuto: false,
      allowEventAuto: false,
      recentWindow: 8,
      sameAsLastMultiplier: 0,
      recentSpeciesMultiplier: 0.25,
      recentFamilyMultiplier: 0.6
    };
  }

  function spawnConfig() {
    const defaults = spawnDefaults();
    const saved = lastOverview?.settings?.spawnBalance || {};
    return {
      ...defaults,
      ...saved,
      bandWeights: { ...defaults.bandWeights, ...(saved.bandWeights || {}) }
    };
  }

  function spawnBandFor(row) {
    if (row.is_legendary) return "LEGENDARY";
    if (row.mythical) return "EVENT";
    if (row.spawn_band_override) return row.spawn_band_override;
    const rate = Number(row.catch_rate ?? 45);
    if (rate >= 200) return "COMMON";
    if (rate >= 90) return "UNCOMMON";
    if (rate >= 45) return "RARE";
    if (rate >= 15) return "VERY_RARE";
    return "ULTRA_RARE";
  }

  async function loadSpeciesRows() {
    if (lastSpeciesRows) return lastSpeciesRows;
    if (spawnRowsPromise) return spawnRowsPromise;
    spawnRowsPromise = supabase.from("species")
      .select("dex,name,catch_rate,spawn_weight,spawn_band_override,is_legendary,mythical")
      .gte("dex", 1).lte("dex", 151).order("dex")
      .then(({ data, error }) => {
        lastSpeciesRows = error ? [] : (data || []);
        return lastSpeciesRows;
      })
      .catch(() => {
        lastSpeciesRows = [];
        return lastSpeciesRows;
      });
    return spawnRowsPromise;
  }

  async function renderSpawnConfig() {
    if (!els.spawnOut) return;
    const cfg = spawnConfig();
    const bands = ["COMMON", "UNCOMMON", "RARE", "VERY_RARE", "ULTRA_RARE", "LEGENDARY", "EVENT"];
    const rows = await loadSpeciesRows();
    const counts = Object.fromEntries(bands.map((band) => [band, 0]));
    rows.forEach((row) => {
      if (Number(row.spawn_weight || 0) <= 0) return;
      counts[spawnBandFor(row)] = (counts[spawnBandFor(row)] || 0) + 1;
    });
    const warnings = bands.filter((band) => Number(cfg.bandWeights[band] || 0) > 0 && counts[band] === 0 && rows.length);
    els.spawnOut.innerHTML = `
      <div class="hub-card">
        <h3>Spawn bands</h3>
        <table class="report-table"><thead><tr><th>Band</th><th>Weight</th><th>Eligible species</th></tr></thead>
        <tbody>${bands.map((band) => `<tr>
          <td>${band.replace(/_/g, " ")}</td>
          <td>${cfg.bandWeights[band] ?? 0}</td>
          <td>${rows.length ? counts[band] : "—"}</td>
        </tr>`).join("")}</tbody></table>
        ${warnings.map((band) => `<p class="hub-warn">${band.replace(/_/g, " ")} contains 0 eligible species.</p>`).join("")}
      </div>
      <div class="hub-card">
        <h3>Recent-spawn suppression</h3>
        <p>Recent window: ${cfg.recentWindow} encounters</p>
        <p>Same as last ×${cfg.sameAsLastMultiplier} · Recent species ×${cfg.recentSpeciesMultiplier} · Recent family ×${cfg.recentFamilyMultiplier}</p>
      </div>
      <div class="hub-card">
        <h3>Legendary / Event</h3>
        <p>Ordinary auto Legendary: ${cfg.allowLegendaryAuto ? "eligible" : "not eligible"}</p>
        <p>Ordinary auto Event: ${cfg.allowEventAuto ? "eligible" : "not eligible"}</p>
        <p class="muted">These flags are not changed from this page.</p>
      </div>
      ${rows.length ? `<div class="hub-card"><h3>Species spawn weights</h3>
        <label class="field" for="spawn-filter">Search
          <input id="spawn-filter" type="search" placeholder="Name or Dex">
        </label>
        <div id="spawn-species"></div></div>` : `<div class="hub-card"><h3>Species spawn weights</h3><p class="muted">Species rows are not readable from this Admin session. Band weights above are the current launcher defaults merged with any saved spawnBalance. There is no Admin editor RPC for individual weights yet.</p></div>`}`;
    const list = document.getElementById("spawn-species");
    const filter = document.getElementById("spawn-filter");
    const draw = () => {
      if (!list) return;
      const q = String(filter?.value || "").trim().toLowerCase();
      const shown = rows.filter((row) => !q || String(row.dex).includes(q) || String(row.name || "").toLowerCase().includes(q)).slice(0, 151);
      list.innerHTML = `<table class="report-table"><thead><tr><th>Dex</th><th>Pokémon</th><th>Band</th><th>Weight</th><th>Enabled</th></tr></thead>
        <tbody>${shown.map((row) => `<tr>
          <td>${row.dex}</td><td>${esc(row.name || window.playSpeciesName?.(row.dex) || row.dex)}</td>
          <td>${spawnBandFor(row).replace(/_/g, " ")}</td>
          <td>${row.spawn_weight ?? 0}</td>
          <td>${Number(row.spawn_weight || 0) > 0 ? "Yes" : "No"}</td>
        </tr>`).join("")}</tbody></table>`;
    };
    filter?.addEventListener("input", draw);
    draw();
  }

  function renderSpawnAnalytics() {
    if (!els.anaSpawns) return;
    const rows = window.playHubLiveState?.recentEncounters || [];
    if (!rows.length) {
      els.anaSpawns.innerHTML = hubEmpty("No recent encounter rows are available yet. Historical spawn counts appear here from the current Director session.");
      return;
    }
    const bands = {};
    const species = {};
    let shiny = 0;
    rows.forEach((row) => {
      const band = row.rarity || "Unknown";
      bands[band] = (bands[band] || 0) + 1;
      const name = row.name || `#${row.dex || "?"}`;
      species[name] = (species[name] || 0) + 1;
      if (String(row.variant || "").includes("shiny")) shiny += 1;
    });
    els.anaSpawns.innerHTML = `
      ${hubKpis([
        { label: "Recent encounters", value: money(rows.length) },
        { label: "Shinies in this list", value: money(shiny) }
      ])}
      <div class="hub-split">
        ${hubDist("Encounters by rarity band", Object.entries(bands).map(([label, count]) => ({ label, count })))}
        ${hubDist("Most common in this list", Object.entries(species).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, count]) => ({ label, count })))}
      </div>`;
  }

  function renderSessionAnalytics() {
    if (!els.anaSessions) return;
    const state = window.playHubLiveState || {};
    const s = state.stream || {};
    const d = state.director || {};
    const rows = state.recentEncounters || [];
    const auto = rows.filter((row) => /auto/i.test(row.trigger || "")).length;
    const manual = rows.filter((row) => /manual|admin|test/i.test(row.trigger || "")).length;
    els.anaSessions.innerHTML = `
      ${hubKpis([
        { label: "Session encounters (auto)", value: money(d.encountersAuto ?? d.encounters_auto ?? auto) },
        { label: "Session encounters (manual)", value: money(d.encountersManual ?? d.encounters_manual ?? manual) },
        { label: "Delayed by ads", value: money(d.encountersDelayedAds ?? d.encounters_delayed_ads) },
        { label: "Interrupted by ads", value: money(d.encountersPausedAds ?? d.encounters_paused_ads) }
      ])}
      <div class="hub-card">
        <h3>Current session</h3>
        <p>Live RPG ${s.rpgSession ? "active" : "inactive"} · Mode ${esc(d.streamMode || d.stream_mode || "—")}</p>
        <p>Recent encounter rows ${money(rows.length)}</p>
        <p class="muted">Dashboard remains the live operator view. Long-term session archives are not exposed by a separate Admin RPC yet.</p>
      </div>`;
  }

  function renderAnalyticsOverview() {
    if (!els.anaOverview) return;
    const prog = lastProgression || {};
    const col = lastCollection || {};
    const eco = lastEconomy || {};
    const cap = lastCaptureReport?.overall || {};
    const items = [
      { label: "Active Trainers", value: money(prog.trainers), jump: "analytics", view: "progression" },
      { label: "Average Trainer Level", value: prog.averageLevel ?? "—", jump: "analytics", view: "progression" },
      { label: "Median Trainer Level", value: prog.medianLevel ?? "—", jump: "analytics", view: "progression" },
      { label: "Average unique species", value: prog.averageSpecies ?? "—", jump: "analytics", view: "progression" },
      { label: "Total captures (report)", value: cap.caught == null ? "—" : money(cap.caught), jump: "analytics", view: "captures" },
      { label: "Capture success rate", value: cap.rate == null ? "—" : pct(cap.rate), jump: "analytics", view: "captures" },
      { label: "Total evolutions", value: money(col.evolutions), jump: "analytics", view: "evolution" },
      { label: "Open GTS listings", value: money(col.openGts), jump: "analytics", view: "evolution" },
      { label: "Total trades", value: money(col.directTrades), jump: "analytics", view: "evolution" },
      { label: "PokéCoins in circulation", value: money(eco.circulation), jump: "analytics", view: "economy" },
      { label: "Coins created / spent", value: `${money(eco.inflation?.created ?? eco.createdToday)} / ${money(eco.inflation?.destroyed ?? eco.spentToday)}`, jump: "analytics", view: "economy" }
    ];
    if (els.anaOverviewMeta) {
      els.anaOverviewMeta.textContent = lastReportAt
        ? `Capture report last refreshed ${clockTime(lastReportAt)}.`
        : "Capture totals appear after the Captures report is refreshed.";
    }
    els.anaOverview.innerHTML = hubKpis(items);
  }

  async function loadEvolutionRules() {
    if (!els.evoRulesOut) return;
    try {
      const { data, error } = await supabase.from("evolution_rules")
        .select("id,from_dex,to_dex,candy_cost,required_item,condition_type,enabled,sort_order")
        .eq("enabled", true)
        .order("sort_order");
      if (error) throw error;
      const rows = data || [];
      if (!rows.length) {
        els.evoRulesOut.innerHTML = hubEmpty("Enabled evolution rules could not be listed. Use Validate to check the ruleset.");
        return;
      }
      els.evoRulesOut.innerHTML = `<table class="report-table"><thead><tr><th>From</th><th>To</th><th>Candy</th><th>Requirement</th></tr></thead>
        <tbody>${rows.map((row) => `<tr>
          <td>#${row.from_dex} ${esc(window.playSpeciesName?.(row.from_dex) || "")}</td>
          <td>#${row.to_dex} ${esc(window.playSpeciesName?.(row.to_dex) || "")}</td>
          <td>${row.candy_cost ?? "—"}</td>
          <td>${[row.condition_type === "TRADE_OR_ITEM" ? "Trade or Linking Cord" : "", row.required_item || ""].filter(Boolean).join(" · ") || "Candy"}</td>
        </tr>`).join("")}</tbody></table>`;
    } catch (_) {
      els.evoRulesOut.innerHTML = `<p class="muted">Evolution costs and family rules are defined in the game services. Historical activity is in Analytics → Evolution &amp; Trading.</p>`;
    }
  }

  function escTime(value) {
    try {
      return new Date(value).toLocaleString();
    } catch (_) {
      return value || "—";
    }
  }

  document.querySelector(".hub-nav-list")?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-hub-tab]");
    if (btn) showHubTab(btn.dataset.hubTab, "", { push: true });
  });
  document.getElementById("hub-nav-toggle")?.addEventListener("click", () => {
    const nav = document.getElementById("hub-nav");
    const open = !nav?.classList.contains("is-open");
    nav?.classList.toggle("is-open", open);
    document.getElementById("hub-nav-toggle")?.setAttribute("aria-expanded", open ? "true" : "false");
  });
  document.querySelector("[data-hub-panel='encounters'] .hub-subnav")?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-hub-view]");
    if (btn) showHubTab("encounters", btn.dataset.hubView, { push: true });
  });
  document.querySelector("[data-hub-panel='economy'] .hub-subnav")?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-eco-view]");
    if (btn) showHubTab("economy", btn.dataset.ecoView, { push: true });
  });
  document.querySelector("[data-hub-panel='system'] .hub-subnav")?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-sys-view]");
    if (btn) showHubTab("system", btn.dataset.sysView, { push: true });
  });
  document.querySelector("[data-hub-panel='content'] .hub-subnav")?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-content-view]");
    if (btn) showHubTab("content", btn.dataset.contentView, { push: true });
  });
  document.querySelector("[data-hub-panel='analytics'] .hub-subnav")?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-ana-view]");
    if (btn) showHubTab("analytics", btn.dataset.anaView, { push: true });
  });
  ["prog-xp-base", "prog-xp-exp"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", updateXpPreview);
  });
  document.getElementById("evo-validate-btn")?.addEventListener("click", async () => {
    if (els.evoValidateStatus) els.evoValidateStatus.textContent = "Checking…";
    try {
      const data = await window.playCall("admin_evolution_validate", {});
      if (els.evoValidateStatus) {
        els.evoValidateStatus.textContent = data.ok
          ? `${data.enabledRules || 0} enabled rules look consistent.`
          : `${(data.invalidEnabled || []).length} enabled rules need attention.`;
      }
    } catch (error) {
      if (els.evoValidateStatus) els.evoValidateStatus.textContent = window.playRpcError(error);
    }
  });
  document.getElementById("run-dir-sim")?.addEventListener("click", async () => {
    if (els.dirSimOut) els.dirSimOut.innerHTML = `<p class="muted">Running…</p>`;
    try {
      const data = await window.playCall("admin_director_simulate", {
        p_hours: Number(document.getElementById("dir-hours").value),
        p_ad_every_min: Number(document.getElementById("dir-ad-every").value),
        p_ad_sec: Number(document.getElementById("dir-ad-sec").value)
      });
      els.dirSimOut.innerHTML = `<p class="hub-sim-banner">Simulation only. No encounters or ads are changed.</p>
        <dl class="sim-grid">
          <div><dt>Estimated starts</dt><dd>${data.encounters ?? "—"}</dd></div>
          <div><dt>Delayed by ads</dt><dd>${data.delayedByAds ?? "—"}</dd></div>
          <div><dt>Interrupted by ads</dt><dd>${data.interrupted ?? "—"}</dd></div>
          <div><dt>Average gap</dt><dd>${data.averageGapMinutes ?? "—"} min</dd></div>
        </dl>`;
    } catch (error) {
      if (els.dirSimOut) els.dirSimOut.innerHTML = `<p class="muted">${window.playRpcError(error)}</p>`;
    }
  });
  document.addEventListener("click", (event) => {
    const jump = event.target.closest("[data-hub-tab-jump]");
    if (jump) showHubTab(jump.dataset.hubTabJump, jump.dataset.hubViewJump || "", { push: true });
  });
  window.addEventListener("popstate", () => {
    const params = new URLSearchParams(window.location.search);
    showHubTab(params.get("section") || params.get("tab") || "dashboard", params.get("view") || "");
  });
  document.querySelector(".console-filters")?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-console-filter]");
    if (!btn || !els.console) return;
    els.console.dataset.consoleFilter = btn.dataset.consoleFilter;
    document.querySelectorAll("[data-console-filter]").forEach((item) => {
      item.setAttribute("aria-pressed", item === btn ? "true" : "false");
    });
    if (lastOverview) renderRound(lastOverview.round);
  });
  els.console?.addEventListener("scroll", () => {
    const list = els.console;
    const nearTop = list.scrollTop < 28;
    list.dataset.pinScroll = nearTop ? "0" : "1";
    if (nearTop) list.parentElement?.querySelector("[data-feed-jump]")?.setAttribute("hidden", "");
  });
  document.querySelector("[data-feed-jump]")?.addEventListener("click", () => {
    const list = els.console;
    if (!list) return;
    list.dataset.pinScroll = "0";
    list.scrollTop = 0;
    list.parentElement?.querySelector("[data-feed-jump]")?.setAttribute("hidden", "");
  });
  {
    const params = new URLSearchParams(window.location.search);
    showHubTab(params.get("section") || params.get("tab") || "dashboard", params.get("view") || "");
  }
  if (typeof window.playBindLiveOps === "function") {
    window.playBindLiveOps({
      embedded: true,
      root: document.getElementById("live-app") || document,
      onState: updateHubChip,
      onOpenDetails: () => showHubTab("encounters", "overview", { push: true })
    });
  }

  supabase.auth.onAuthStateChange((event, session) => {
    if (window.playAuthNoise(event)) return;
    loadHub(session);
  });
  supabase.channel("play-staff")
    .on("postgres_changes", { event: "*", schema: "public", table: "encounter_rounds" }, scheduleOverview)
    .on("postgres_changes", { event: "*", schema: "public", table: "play_console_log" }, scheduleOverview)
    .on("postgres_changes", { event: "*", schema: "public", table: "encounter_activity" }, scheduleOverview)
    .subscribe();
  setInterval(() => {
    if (!els.staff.hidden) refreshOverview(false);
  }, 4000);
  setInterval(() => {
    if (els.staff.hidden || !lastOverview) return;
    renderRound(lastOverview.round);
  }, 250);
  loadHub();
})();
