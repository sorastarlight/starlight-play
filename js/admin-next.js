(() => {
  const READ_RPCS = Object.freeze([
    "admin_build_health",
    "admin_game_health",
    "admin_live_snapshot",
    "admin_list_users",
    "admin_user_account",
    "admin_identity_inspect",
    "admin_trainer_rewards"
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
  const trainersUi = window.PLAY_ADMIN_NEXT_TRAINERS || {};
  const els = {
    gate: document.getElementById("gate"),
    staff: document.getElementById("staff"),
    nav: document.getElementById("hub-nav"),
    toggle: document.getElementById("hub-nav-toggle"),
    opsStatus: document.getElementById("next-ops-status"),
    opsMetrics: document.getElementById("next-ops-metrics"),
    opsFreshness: document.getElementById("next-ops-freshness"),
    healthStatus: document.getElementById("next-health-status"),
    healthRefresh: document.getElementById("next-health-refresh"),
    health: document.getElementById("next-health"),
    trainerRoot: document.getElementById("next-trainers"),
    trainerList: document.getElementById("next-trainer-list"),
    trainerListStatus: document.getElementById("next-trainer-list-status"),
    trainerDetail: document.getElementById("next-trainer-detail"),
    trainerDetailStatus: document.getElementById("next-trainer-detail-status"),
    trainerSearch: document.querySelector("[data-trainers-search]"),
    trainerQuery: document.getElementById("next-trainer-q"),
    trainerPrev: document.querySelector("[data-trainers-prev]"),
    trainerNext: document.querySelector("[data-trainers-next]"),
    trainerBack: document.querySelector("[data-trainers-back]"),
    trainerDetailWrap: document.querySelector("[data-trainers-detail]")
  };

  let healthLoaded = false;
  let healthInFlight = false;
  let healthGeneration = 0;
  let opsTimer = null;
  let opsInFlight = false;
  let opsActive = false;
  let staffOpen = false;
  let hubGeneration = 0;
  let martIdentity = "";
  let analyticsIdentity = "";
  let configIdentity = "";
  let opsIdentity = "", opsSequence = 0;
  const sessionApi = window.PLAY_ADMIN_SESSION;
  const sessionControls = sessionApi?.mount(document.getElementById("next-session-controls"), sessionApi.adapter({
    session: () => supabase.auth.getSession(), identity: () => opsIdentity,
    allowed: () => staffOpen && currentTab() === "operations" && !document.hidden, call: (name, args) => window.playCall(name, args)
  }), () => staffOpen && currentTab() === "operations" && !document.hidden, raw => renderOperationsView(presentOps(raw ? { payload: raw } : { error: "missing" })));
  function resetOperations() { opsIdentity = ""; opsSequence++; sessionControls?.reset(); }
  const configApi = window.PLAY_ADMIN_NEXT_CONFIG;
  const config = configApi?.mount(document.getElementById("next-config"), configApi.adapter({
    session: () => supabase.auth.getSession(), identity: () => configIdentity,
    allowed: () => staffOpen, call: (command, args) => window.playCall(command, args)
  }));
  const passApi = window.PLAY_ADMIN_PASS_EDITOR;
  const passBundles = passApi?.mount(document.getElementById("next-pass-bundles"), passApi.adapter({
    session: () => supabase.auth.getSession(), identity: () => configIdentity,
    allowed: () => staffOpen, call: (name, args) => {
      if (name === "admin_pass_rewards_read") return window.playCall("admin_pass_rewards_read");
      if (name === "admin_pass_rewards_save") return window.playCall("admin_pass_rewards_save", args);
      throw new Error("Unsupported Pass operation.");
    }
  }));
  const analyticsApi = window.PLAY_ADMIN_NEXT_ANALYTICS;
  const analytics = analyticsApi?.mount(document.getElementById("next-analytics-reports"), analyticsApi.adapter({
    session: () => supabase.auth.getSession(), identity: () => analyticsIdentity,
    allowed: () => staffOpen, call: (name, args) => window.playCall(name, args)
  }), document.getElementById("next-analytics-health"), () => loadHealth());
  const mart = window.PLAY_ADMIN_NEXT_MART?.mount(document.getElementById("next-mart"), async (name, args) => {
    if (!["admin_store_get", "admin_store_save_item"].includes(name)) throw new Error("Unsupported Mart operation.");
    const identity = martIdentity;
    const { data, error } = await supabase.auth.getSession();
    if (error || !staffOpen || !identity || data?.session?.user?.id !== identity || martIdentity !== identity) throw new Error("Staff session changed.");
    return name === "admin_store_get"
      ? window.playCall("admin_store_get")
      : window.playCall("admin_store_save_item", args);
  });
  const floorsApi = window.PLAY_ADMIN_FLOORS;
  const floorEditor = floorsApi?.mount(document.getElementById("next-mart-floors"), floorsApi.adapter({
    session: () => supabase.auth.getSession(), identity: () => martIdentity,
    allowed: () => staffOpen, call: (name, args) => name === "admin_store_get"
      ? window.playCall("admin_store_get") : window.playCall("admin_store_save_category", args)
  }));
  const createApi = window.PLAY_ADMIN_CREATE;
  const draftCreator = createApi?.mount(document.getElementById("next-mart-create"), createApi.adapter({
    session: () => supabase.auth.getSession(), identity: () => martIdentity,
    allowed: () => staffOpen, call: (name, args) => name === "admin_store_get"
      ? window.playCall("admin_store_get") : window.playCall("admin_store_create_draft", args)
  }));
  const boundedApi = window.PLAY_ADMIN_LIMITS_ORDER;
  const floorOrder = boundedApi?.mount(document.getElementById("next-floor-order"), "order", boundedApi.adapter("order", {
    session: () => supabase.auth.getSession(), identity: () => martIdentity,
    allowed: () => staffOpen, call: (name, args) => name === "admin_store_get"
      ? window.playCall("admin_store_get") : window.playCall("admin_store_reorder", args)
  }));
  const captureLimits = boundedApi?.mount(document.getElementById("next-capture-limits"), "capture", boundedApi.adapter("capture", {
    session: () => supabase.auth.getSession(), identity: () => configIdentity,
    allowed: () => staffOpen, call: (name, args) => name === "admin_capture_overview"
      ? window.playCall("admin_capture_overview") : window.playCall("admin_capture_save_balance", args)
  }));
  let trainerQuery = "";
  let trainerOffset = 0;
  let trainerTotal = 0;
  let trainerUsers = [];
  let trainerSelectedId = "";
  let trainerDirectoryScroll = 0;
  let trainerPane = "overview";
  let roster = null;
  let corrections = null;
  let trainerListGen = 0;
  let trainerProfileGen = 0;
  let trainerDirLoaded = false;
  let trainerAccount = null;
  let trainerIdentity = null;

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
      status: presenter.FALLBACK_STATUS || "Live status is unavailable. Reload Operations to try again.",
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

  async function readCall(name, args) {
    if (!READ_RPCS.includes(name)) throw new Error("Preview shell cannot call that command.");
    return window.playCall(name, args);
  }

  function classifyTrainerError(error) {
    const code = String(error?.code || "");
    const message = String(error?.message || "").toLowerCase();
    if (code === "42501" || message.includes("not allowed") || message.includes("permission denied")) {
      return "denied";
    }
    return window.playRpcError?.(error, "Could not load trainers.") || "Could not load trainers.";
  }

  function resetTrainers() {
    roster?.reset(); roster = null;
    corrections?.reset(); corrections = null;
    window.PLAY_ADMIN_REWARDS?.clear();
    window.PLAY_ADMIN_DIAGNOSTICS?.clear();
    const supportContext = document.getElementById("next-support-context");
    if (supportContext) { supportContext.textContent = ""; supportContext.hidden = true; }
    trainerQuery = "";
    trainerOffset = 0;
    trainerTotal = 0;
    trainerUsers = [];
    trainerSelectedId = "";
    trainerPane = "overview";
    trainerListGen += 1;
    trainerProfileGen += 1;
    trainerDirLoaded = false;
    trainerAccount = null;
    trainerIdentity = null;
    if (els.trainerQuery) els.trainerQuery.value = "";
    if (els.trainerRoot) els.trainerRoot.classList.remove("is-profile");
    if (els.trainerDetailWrap) els.trainerDetailWrap.hidden = true;
    if (els.trainerList) els.trainerList.innerHTML = "";
    if (els.trainerDetail) els.trainerDetail.innerHTML = "";
    if (els.trainerListStatus) els.trainerListStatus.textContent = "Open this tab to load the first page of trainers.";
    if (els.trainerDetailStatus) els.trainerDetailStatus.textContent = "";
    if (els.trainerPrev) els.trainerPrev.disabled = true;
    if (els.trainerNext) els.trainerNext.disabled = true;
  }

  function renderTrainerDirectory(view) {
    if (els.trainerListStatus) els.trainerListStatus.textContent = view.status;
    if (els.trainerList) els.trainerList.innerHTML = trainersUi.directoryHtml ? trainersUi.directoryHtml(view) : "";
    if (els.trainerPrev) els.trainerPrev.disabled = !view.canPrev;
    if (els.trainerNext) els.trainerNext.disabled = !view.canNext;
    const pager = els.trainerPrev && els.trainerPrev.parentElement;
    if (pager) pager.hidden = !view.showPager;
  }

  function renderTrainerProfile(view) {
    roster?.reset(); roster = null;
    corrections?.reset(); corrections = null;
    if (els.trainerDetailWrap) els.trainerDetailWrap.hidden = !trainerSelectedId;
    if (els.trainerRoot) els.trainerRoot.classList.toggle("is-profile", Boolean(trainerSelectedId));
    if (els.trainerDetailStatus) {
      els.trainerDetailStatus.textContent = view.loading
        ? "Loading trainer…"
        : (view.denied || view.error ? (view.error || "Trainer inspect is restricted to staff.") : "Trainer record.");
    }
    if (els.trainerDetail) window.PLAY_SUPPORT?.unmount(els.trainerDetail.querySelector("[data-support-trainer]"));
    if (els.trainerDetail) trainersUi.renderRecord(els.trainerDetail, view);
    if (view.pane === "pokemon" && view.user && window.PLAY_ADMIN_ROSTER) roster = window.PLAY_ADMIN_ROSTER.mount(els.trainerDetail?.querySelector('[data-trainer-roster]'),view.user.id,window.PLAY_ADMIN_ROSTER.adapter({session:()=>supabase.auth.getSession(),identity:()=>configIdentity,allowed:target=>staffOpen&&trainerSelectedId===target,call:(_name,args)=>window.playCall("admin_trainer_pokemon",args)}),trainersUi);
    if (view.pane === "corrections" && view.user && window.PLAY_TRAINER_CORRECTIONS) {
      const api=window.PLAY_TRAINER_CORRECTIONS;
      corrections=api.mount(els.trainerDetail?.querySelector('[data-trainer-corrections]'),api.adapter({
        session:()=>supabase.auth.getSession(),identity:()=>configIdentity,allowed:target=>staffOpen&&trainerSelectedId===target,
        call:(name,args)=>{
          if(name==='admin_trainer_corrections_read')return window.playCall('admin_trainer_corrections_read',args);
          if(name==='admin_trainer_correction_write')return window.playCall('admin_trainer_correction_write',args);
          throw new Error('Unsupported correction operation.');
        }
      }),trainersUi);
      corrections.open(view.user.id);
    }
    if (view.pane === "tickets" && view.user) window.PLAY_SUPPORT?.mount(els.trainerDetail?.querySelector("[data-support-trainer]"),{staff:true,playerId:view.user.id});
    if (els.trainerDetail && view.user) window.PLAY_ADMIN_DIAGNOSTICS?.mount(els.trainerDetail,view.user,view.pane,
      targetUuid => window.playSupabase.functions.invoke("owner-account-diagnostics",{body:{targetUuid}}),
      body => window.playSupabase.functions.invoke("owner-recovery-email",{body}));
    if (els.trainerDetail && view.user) window.PLAY_ADMIN_REWARDS?.mount(els.trainerDetail,view.user,view.pane,{
      read: (userId) => readCall("admin_trainer_rewards",{p_user:userId}),
      write: (intent) => window.playCall("admin_trainer_reward_action",intent),
      changed: (userId) => staffOpen && trainerSelectedId===userId ? loadTrainerProfile(userId,true,true) : undefined
    });
  }

  async function loadTrainerDirectory() {
    if (!staffOpen || currentTab() !== "trainers") return;
    const gen = ++trainerListGen;
    renderTrainerDirectory(trainersUi.presentDirectory({
      error: "loading",
      query: trainerQuery,
      selectedId: trainerSelectedId,
      users: trainerUsers,
      total: trainerTotal,
      offset: trainerOffset
    }));
    try {
      const data = await readCall("admin_list_users", {
        p_query: trainerQuery,
        p_offset: trainerOffset
      });
      if (gen !== trainerListGen) return;
      trainerUsers = Array.isArray(data?.users) ? data.users : [];
      trainerTotal = Number(data?.total || 0);
      trainerOffset = Number(data?.offset || trainerOffset || 0);
      trainerDirLoaded = true;
      renderTrainerDirectory(trainersUi.presentDirectory({
        data,
        query: trainerQuery,
        selectedId: trainerSelectedId
      }));
    } catch (error) {
      if (gen !== trainerListGen) return;
      const kind = classifyTrainerError(error);
      if (kind === "denied") {
        resetTrainers();
        renderTrainerDirectory(trainersUi.presentDirectory({ error: "denied", query: trainerQuery }));
        return;
      }
      renderTrainerDirectory(trainersUi.presentDirectory({
        error: kind,
        query: trainerQuery,
        selectedId: trainerSelectedId,
        users: trainerUsers,
        total: trainerTotal,
        offset: trainerOffset
      }));
    }
  }

  async function loadTrainerProfile(userId,refresh=false,cacheOnly=false) {
    if (!staffOpen || !userId) return;
    if (!trainerSelectedId) trainerDirectoryScroll = window.scrollY;
    trainerSelectedId = userId;
    if (!refresh) { trainerAccount = null; trainerIdentity = null; }
    const gen = ++trainerProfileGen;
    renderTrainerDirectory(trainersUi.presentDirectory({
      data: { users: trainerUsers, total: trainerTotal, offset: trainerOffset },
      query: trainerQuery,
      selectedId: trainerSelectedId
    }));
    if (!refresh) {
      renderTrainerProfile(trainersUi.presentProfile({ error: "loading", pane: trainerPane }));
      els.trainerBack?.focus({preventScroll:true});
    }
    try {
      const [account, identity] = await Promise.all([
        readCall("admin_user_account", { p_user: userId }),
        readCall("admin_identity_inspect", { p_user: userId })
      ]);
      if (gen !== trainerProfileGen) return;
      trainerAccount = account;
      trainerIdentity = identity;
      if (cacheOnly) {
        const passChip=els.trainerDetail?.querySelector("[data-record-pass]");
        if(passChip){passChip.textContent=account.user?.pass?"Starlight Pass":"No Pass";passChip.classList.toggle("is-pass",Boolean(account.user?.pass));}
        return;
      }
      renderTrainerProfile(trainersUi.presentProfile({
        account,
        identity,
        pane: trainerPane
      }));
    } catch (error) {
      if (gen !== trainerProfileGen) return;
      if (cacheOnly) return;
      const kind = classifyTrainerError(error);
      if (kind === "denied") {
        resetTrainers();
        renderTrainerDirectory(trainersUi.presentDirectory({ error: "denied", query: trainerQuery }));
        renderTrainerProfile(trainersUi.presentProfile({ error: "denied", pane: trainerPane }));
        return;
      }
      renderTrainerProfile(trainersUi.presentProfile({
        error: kind,
        pane: trainerPane
      }));
    }
  }

  function closeTrainerProfile() {
    const previousId = trainerSelectedId;
    trainerSelectedId = "";
    trainerPane = "overview";
    trainerProfileGen += 1;
    trainerAccount = null;
    trainerIdentity = null;
    if (els.trainerRoot) els.trainerRoot.classList.remove("is-profile");
    if (els.trainerDetailWrap) els.trainerDetailWrap.hidden = true;
    if (els.trainerDetail) els.trainerDetail.innerHTML = "";
    if (els.trainerDetailStatus) els.trainerDetailStatus.textContent = "";
    renderTrainerDirectory(trainersUi.presentDirectory({
      data: { users: trainerUsers, total: trainerTotal, offset: trainerOffset },
      query: trainerQuery,
      selectedId: ""
    }));
    const previousRow = Array.from(els.trainerList?.querySelectorAll("[data-open-trainer]") || [])
      .find((row) => row.getAttribute("data-open-trainer") === previousId);
    (previousRow || els.trainerQuery)?.focus({ preventScroll: true });
    window.scrollTo({ top: trainerDirectoryScroll, behavior: "instant" });
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
    const sequence = ++opsSequence, identity = opsIdentity;
    try {
      const payload = await readCall("admin_live_snapshot");
      if (!opsActive || !staffOpen || sequence !== opsSequence || identity !== opsIdentity || document.hidden) return;
      if (!payload || payload.ok !== true || payload.contract !== "gate-17-s1-v2") {
        sessionControls?.observe(null);
        renderOperationsView(presentOps({ error: "missing" }));
        return;
      }
      sessionControls?.observe(payload);
      renderOperationsView(presentOps({ payload }));
    } catch (error) {
      if (!opsActive || sequence !== opsSequence || identity !== opsIdentity) return;
      sessionControls?.observe(null);
      renderOperationsView(presentOps({ error: classifyOpsError(error) }));
    } finally {
      opsInFlight = false;
    }
  }

  function stopOpsPoll() {
    opsSequence++;
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
      btn.tabIndex = btn.dataset.nextTab === next ? 0 : -1;
    });
    const url = new URL(window.location.href);
    url.searchParams.set("section", next);
    const href = `${url.pathname}${url.search}${url.hash}`;
    if (push) history.pushState({ section: next }, "", href);
    else history.replaceState({ section: next }, "", href);
    if (next === "support" && staffOpen) window.PLAY_SUPPORT?.mount(document.getElementById("owner-support"),{staff:true,playerId:new URL(location.href).searchParams.get("trainer")||""});
    if (next === "analytics") {
      if (analytics && staffOpen) analytics.open();
      else if (!analytics) loadHealth();
    }
    sessionControls?.repaint();
    if (next === "operations") startOpsPoll();
    else stopOpsPoll();
    if (next === "trainers" && staffOpen && !trainerDirLoaded) loadTrainerDirectory();
    if (next === "mart" && staffOpen && mart?.state.phase === "closed") mart.open();
    if (next === "config" && staffOpen && config?.state.phase === "closed") config.open();
  }

  function resetHealth() {
    configIdentity = "";
    config?.reset();
    captureLimits?.reset();
    passBundles?.reset();
    analyticsIdentity = "";
    analytics?.reset();
    healthGeneration++;
    healthLoaded = false;
    healthInFlight = false;
    if (els.health) els.health.innerHTML = "";
    if (els.healthStatus) els.healthStatus.textContent = "No health snapshot loaded.";
    if (els.healthRefresh) {
      els.healthRefresh.setAttribute("aria-disabled", "false");
      els.healthRefresh.textContent = "Refresh health";
    }
  }

  async function loadHealth(force = false) {
    if (!els.health || !staffOpen || healthInFlight || (healthLoaded && !force)) return;
    const generation = ++healthGeneration;
    healthInFlight = true;
    if (els.healthRefresh) {
      // Keep keyboard focus on the control; single-flight rejects repeat requests.
      els.healthRefresh.setAttribute("aria-disabled", "true");
      els.healthRefresh.textContent = "Refreshing…";
    }
    els.health.innerHTML = "";
    if (els.healthStatus) els.healthStatus.textContent = "Loading health…";
    try {
      const [build, game] = await Promise.all([
        readCall("admin_build_health").catch(() => null),
        readCall("admin_game_health").catch(() => null)
      ]);
      if (generation !== healthGeneration || !staffOpen) return;
      healthLoaded = Boolean(build && game);
      const bits = [];
      if (build) {
        bits.push(metric("Client build", build.clientBuild || build.appBuild || "—"));
        bits.push(metric("Database migration", build.dbMigration || build.migration || build.latestMigration || "—"));
      }
      if (game) {
        const app = game.application || {};
        const twitch = game.twitch || {};
        const appStatus = app.status || game.status || game.appStatus || "UNKNOWN";
        bits.push(metric("Application", appStatus, ["HEALTHY", "OK"].includes(String(appStatus).toUpperCase()) ? "active" : "unknown"));
        const liveKnown = typeof twitch.live === "boolean";
        const twitchLabel = liveKnown ? (twitch.live ? "LIVE" : "OFFLINE") : "UNKNOWN";
        bits.push(metric("Twitch stream", twitchLabel, liveKnown ? (twitch.live ? "active" : "inactive") : "unknown"));
      }
      els.health.innerHTML = bits.join("");
      if (els.healthStatus) els.healthStatus.textContent = !build && !game
        ? "Health is unavailable. Refresh to try again."
        : !build || !game ? "Partial health snapshot. Some checks are unavailable; refresh to try again."
          : "System health summary. Open Operations for Live RPG status and controls.";
    } catch (error) {
      if (generation === healthGeneration && staffOpen && els.healthStatus) {
        els.healthStatus.textContent = window.playRpcError?.(error, "Could not load health.") || "Could not load health.";
      }
    } finally {
      if (generation === healthGeneration) {
        healthInFlight = false;
        if (els.healthRefresh) {
          els.healthRefresh.setAttribute("aria-disabled", "false");
          els.healthRefresh.textContent = "Refresh health";
        }
      }
    }
  }

  function setSignedOut() {
    hubGeneration++;
    resetOperations();
    martIdentity = "";
    mart?.reset();
    floorEditor?.reset();
    draftCreator?.reset();
    floorOrder?.reset();
    staffOpen = false;
    stopOpsPoll();
    resetHealth();
    resetTrainers();
    if (els.staff) els.staff.hidden = true;
    if (els.gate) {
      els.gate.hidden = false;
      els.gate.textContent = "Sign in to open the Admin Hub.";
    }
    renderOperationsFallback();
  }

  async function loadHub(passedSession) {
    const generation = ++hubGeneration;
    const session = passedSession || (await supabase.auth.getSession()).data.session;
    if (generation !== hubGeneration) return;
    if (martIdentity !== (session?.user?.id || "")) {
      martIdentity = "";
      mart?.reset();
      floorEditor?.reset();
      draftCreator?.reset();
      floorOrder?.reset();
      resetOperations();
      staffOpen = false;
      stopOpsPoll();
      resetHealth();
      resetTrainers();
      if (els.staff) els.staff.hidden = true;
      if (els.gate) { els.gate.hidden = false; els.gate.textContent = "Checking staff access…"; }
      renderOperationsFallback();
    }
    if (!session) {
      setSignedOut();
      return;
    }
    const { data: profile } = await supabase.from("profiles").select("display_name, twitch_login, avatar_url").eq("id", session.user.id).maybeSingle();
    const { data: isAdmin, error } = await supabase.rpc("is_play_admin");
    if (generation !== hubGeneration) return;
    window.playSetAccountNav?.(session, profile, { isAdmin: Boolean(isAdmin) });
      if (error || !isAdmin) {
      resetOperations();
      staffOpen = false;
      martIdentity = "";
      mart?.reset();
      floorEditor?.reset();
      draftCreator?.reset();
      floorOrder?.reset();
      resetHealth();
      stopOpsPoll();
      resetTrainers();
      if (els.staff) els.staff.hidden = true;
      if (els.gate) {
        els.gate.hidden = false;
        els.gate.textContent = error
          ? "Staff access could not be verified. Reload this page to try again."
          : "This workspace is for staff. Your trainer account does not have access.";
      }
      renderOperationsFallback();
      return;
    }
    if (els.gate) els.gate.hidden = true;
    if (els.staff) els.staff.hidden = false;
    staffOpen = true;
    martIdentity = session.user.id;
    analyticsIdentity = session.user.id;
    configIdentity = session.user.id;
    opsIdentity = session.user.id;
    const section = new URL(window.location.href).searchParams.get("section");
    showTab(section, false);
  }

  els.toggle?.addEventListener("click", () => {
    const open = els.nav?.classList.toggle("is-open");
    els.toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
  els.healthRefresh?.addEventListener("click", () => loadHealth(true));
  document.querySelector(".hub-nav-list")?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-next-tab]");
    if (!btn) return;
    showTab(btn.dataset.nextTab, true);
  });
  document.querySelector(".hub-nav-list")?.addEventListener("keydown", (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const btn = event.target.closest("[data-next-tab]");
    const tabs = [...document.querySelectorAll("[data-next-tab]")];
    const index = tabs.indexOf(btn);
    if (index < 0 || !["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1
      : (index + (event.key === "ArrowDown" ? 1 : -1) + tabs.length) % tabs.length;
    tabs.forEach((tab, i) => { tab.tabIndex = i === next ? 0 : -1; });
    tabs[next].focus({ preventScroll: true });
    // Manual activation: arrow navigation never loads a section or starts polling.
    // Native Enter/Space activates the existing button click handler.
  });
  els.trainerSearch?.addEventListener("submit", (event) => {
    event.preventDefault();
    trainerQuery = String(els.trainerQuery?.value || "");
    trainerOffset = 0;
    loadTrainerDirectory();
  });
  els.trainerPrev?.addEventListener("click", () => {
    trainerOffset = Math.max(0, trainerOffset - (trainersUi.PAGE || 50));
    loadTrainerDirectory();
  });
  els.trainerNext?.addEventListener("click", () => {
    trainerOffset += trainersUi.PAGE || 50;
    loadTrainerDirectory();
  });
  els.trainerBack?.addEventListener("click", () => {
    closeTrainerProfile();
  });
  els.trainerList?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-open-trainer]");
    if (!btn) return;
    trainerPane = "overview";
    loadTrainerProfile(btn.getAttribute("data-open-trainer"));
  });
  els.trainerDetail?.addEventListener("click", (event) => {
    const supportLink = event.target.closest("[data-record-support]");
    if (supportLink && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
      event.preventDefault();
      const user = trainerAccount?.user;
      const context = document.getElementById("next-support-context");
      if (context && user) {
        context.textContent = `Selected trainer: ${user.displayName || user.login || "Trainer"} · @${user.login || "Unavailable"} · ${user.id || "Unavailable"}. Read-only context from the last account snapshot.`;
        context.hidden = false;
      }
      history.pushState({ section: "support" }, "", supportLink.getAttribute("href"));
      showTab("support", false);
      const heading = document.querySelector('#next-panel-support h2');
      heading?.setAttribute("tabindex", "-1");
      heading?.focus();
      return;
    }
    const btn = event.target.closest("[data-trainer-pane]");
    if (!btn) return;
    trainerPane = btn.getAttribute("data-trainer-pane") || "overview";
    if (trainerAccount || trainerIdentity) {
      renderTrainerProfile(trainersUi.presentProfile({
        account: trainerAccount,
        identity: trainerIdentity,
        pane: trainerPane
      }));
      els.trainerDetail?.querySelector('[data-trainer-pane][aria-selected="true"]')?.focus({ preventScroll: true });
      return;
    }
    if (trainerSelectedId) loadTrainerProfile(trainerSelectedId);
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
