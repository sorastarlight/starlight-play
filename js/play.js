(() => {
  const supabase = window.playSupabase;
  const els = {
    stream: document.getElementById("stream-frame"),
    streamNote: document.getElementById("stream-note"),
    encounter: document.getElementById("encounter"),
    actions: document.getElementById("actions"),
    actionStatus: document.getElementById("action-status"),
    bag: document.getElementById("bag-status"),
    live: document.getElementById("live-feed"),
    throwModal: document.getElementById("throw-modal"),
    throwGrid: document.getElementById("throw-ball-grid"),
    throwTitle: document.getElementById("throw-title"),
    throwHint: document.getElementById("throw-hint")
  };
  let state = null;
  let profile = null;
  let lastChannel = "";
  let lastEncounterKey = "";
  let lastActionKey = "";
  let lastKitKey = "";
  let lureJoinRound = "";
  let acting = false;
  let pointerHeld = false;
  let lastLocalPhase = "";
  let throwViewOnly = false;
  const joinedMe = new Map();

  window.playBindAccountNav({
    onSignOut() {
      profile = null;
      lastActionKey = "";
      refresh();
    }
  });

  function liveRound(data) {
    const round = data?.round;
    if (!round) return null;
    const hasCatch = Number(round.results?.caught || 0) > 0 || (Array.isArray(round.catchers) && round.catchers.length > 0);
    if (round.cancelled && !hasCatch) return null;
    const local = typeof window.playApplyLocalRound === "function" ? window.playApplyLocalRound(round) : round;
    return local || round;
  }

  function phaseBar(round) {
    if (!round?.deadlines || !round.phase || round.phase === "closed") return 0;
    const keys = ["join", "prepare", "throw", "reveal"];
    const index = keys.indexOf(round.phase);
    const startKey = keys[index - 1];
    const start = startKey ? new Date(round.deadlines[startKey]).getTime() : new Date(round.startedAt).getTime();
    const end = new Date(round.deadlines[round.phase]).getTime();
    const now = round.pausedAt ? new Date(round.pausedAt).getTime() : Date.now();
    if (end <= start) return 0;
    return Math.max(0, Math.min(100, ((end - now) / (end - start)) * 100));
  }

  function attachMe(data) {
    if (!data) return data;
    const id = data.round?.id;
    const incoming = data.me && data.me.joined !== false ? data.me : (data.youJoined ? { joined: true } : null);
    if (id && incoming) joinedMe.set(id, { ...(joinedMe.get(id) || {}), ...incoming });
    const mine = incoming || (id ? joinedMe.get(id) : null) || null;
    return { ...data, me: mine };
  }

  function actionPlan(data) {
    const round = liveRound(data);
    const me = data?.me;
    const bag = data?.bag || {};
    const signedIn = Boolean(data?.bag);
    if (!round || round.phase === "closed") {
      return {
        key: `idle:${round?.id || ""}:${me?.result || ""}`,
        buttons: [],
        status: round?.resolved && me?.result
          ? (me.caught ? `You caught it! (${Math.round((me.chance || 0) * 100)}%)` : `Your result: ${me.result}.`)
          : ""
      };
    }
    if (!signedIn) {
      return { key: "signin", buttons: [], status: "Sign in with Twitch to join this encounter." };
    }
    if (round.paused) {
      return { key: `paused:${round.id}`, buttons: [], status: "This encounter is paused." };
    }
    const buttons = [];
    const canPrep = (round.phase === "join" || round.phase === "prepare") && me && !me.prep;
    if ((round.phase === "join" && !me) || (round.phase === "prepare" && !me)) {
      buttons.push({
        kind: "join",
        item: "",
        label: "Join encounter",
        hint: round.phase === "prepare" ? "Still needed for berries" : (window.playRadarOn?.(bag) ? "Poké Radar joining…" : "")
      });
    }
    if (canPrep) {
      buttons.push({ kind: "prepare", item: "berry", label: "Berry", hint: `${bag.berry ?? 0} left · +catch`, sprite: "berry" });
      buttons.push({ kind: "prepare", item: "bait", label: "Honey", hint: `${bag.bait ?? 0} left · team bonus`, sprite: "bait" });
    }
    if (round.phase === "throw" && me && me.prep && !me.ball) {
      buttons.push({ kind: "open-balls", item: "pokeball", label: "Choose a Poké Ball", hint: "See catch rates in your bag", sprite: "pokeball" });
    }
    if (!buttons.length) {
      let status = "";
      if (round.phase === "join" && me && me.prep) status = `Prepared with ${window.playItemLabel(me.prep)}. Wait for throws.`;
      else if (round.phase === "join" && me) status = "You joined. Use a Berry or Honey, then wait for throws.";
      else if (round.phase === "prepare" && me?.prep) status = `Prepared with ${window.playItemLabel(me.prep)}. Wait for throws.`;
      else if (round.phase === "throw" && me?.ball) status = `${window.playItemLabel(me.ball)} locked in.`;
      else if (round.phase === "reveal") status = me?.result || "Results incoming.";
      else if (round.phase === "prepare" && !me) status = "Join this encounter to use a Berry or Honey.";
      else if (round.phase !== "join") status = "You needed to join during the join window.";
      return { key: `wait:${round.phase}:${me?.prep || ""}:${me?.ball || ""}`, buttons, status };
    }
    return { key: buttons.map((row) => `${row.kind}:${row.item}:${row.hint}`).join("|"), buttons, status: "" };
  }

  function renderActions(data) {
    const plan = actionPlan(data);
    const key = plan.buttons.map((row) => `${row.kind}:${row.item}`).join("|") + `::${plan.status || ""}`;
    const heldBtn = pointerHeld ? els.actions.querySelector("button[data-kind]") : null;
    const heldKind = heldBtn?.dataset.kind;
    const nextKinds = plan.buttons.map((row) => row.kind).join("|");
    if (heldBtn && nextKinds && nextKinds.split("|").every((kind) => kind === heldKind)) {
      if (plan.status) els.actionStatus.textContent = plan.status;
      return;
    }
    if (key === lastActionKey && els.actions.children.length === plan.buttons.length) {
      plan.buttons.forEach((row, index) => {
        const hint = els.actions.children[index]?.querySelector("em");
        if (hint && row.hint) hint.textContent = row.hint;
      });
      if (plan.status) els.actionStatus.textContent = plan.status;
      return;
    }
    lastActionKey = key;
    els.actionStatus.textContent = plan.status;
    els.actions.classList.toggle("single", plan.buttons.length === 1);
    els.actions.innerHTML = plan.buttons.map((row) => {
      const sprite = row.sprite || (row.kind === "open-balls" ? "pokeball" : "");
      const icon = sprite
        ? `<span class="item-icon item-icon-img"><img src="${window.playItemSprite(sprite)}" alt=""></span>`
        : `<span class="item-icon" aria-hidden="true"></span>`;
      return `<button type="button" class="item-btn" data-kind="${row.kind}" data-item="${row.item}">
        ${icon}
        <span class="item-copy"><strong>${row.label}</strong>${row.hint ? `<em>${row.hint}</em>` : ""}</span>
      </button>`;
    }).join("");
  }

  function openThrowBalls(bag, mode) {
    if (!els.throwModal || !els.throwGrid) return;
    throwViewOnly = mode === "view";
    if (els.throwTitle) els.throwTitle.textContent = throwViewOnly ? "Your Poké Balls" : "Choose a Poké Ball";
    if (els.throwHint) {
      els.throwHint.textContent = throwViewOnly
        ? "A quick look at the balls in your bag. Catch rates are the Play throw chances."
        : "Catch rates are the Play throw chances. Master Ball always catches. Other extra balls look different.";
    }
    const rows = window.PLAY_BALLS || [];
    els.throwGrid.innerHTML = rows.map((row) => {
      const qty = Number(bag?.[row.key] || 0);
      const pct = Math.round((row.rate || 0) * 100);
      const disabled = throwViewOnly || qty < 1 ? "disabled" : "";
      return `<button type="button" class="ball-tile" data-throw="${row.key}" ${disabled}>
        <img src="${window.playItemSprite(row.key)}" alt="">
        <strong>${row.name}</strong>
        <span class="ball-rate">${row.multiplier} · ${pct}% catch</span>
        <span class="muted">${qty} in bag</span>
      </button>`;
    }).join("");
    if (typeof els.throwModal.showModal === "function") els.throwModal.showModal();
    else els.throwModal.setAttribute("open", "");
  }

  function maybeRadarJoin(data) {
    const round = liveRound(data);
    const bag = data?.bag || {};
    if (!round || data?.me) return;
    if (round.paused) return;
    if (round.phase !== "join" && round.phase !== "prepare") return;
    if (!window.playRadarOn?.(bag) || lureJoinRound === round.id) return;
    lureJoinRound = round.id;
    act("join", "");
  }

  function render(data) {
    state = attachMe(data);
    const round = liveRound(state);
    const view = { ...state, round };
    const results = round?.results;
    if (round?.paused && els.throwModal?.open) {
      try { els.throwModal.close(); } catch (_) {}
    }
    const key = `${round?.id || "none"}:${round?.phase || "idle"}:${round?.paused || false}:${round?.variant || ""}:${round?.hidden || false}:${round?.resolved || false}:${results?.caught || 0}:${(round?.catchers || []).length}`;
    const bar = phaseBar(round);
    lastLocalPhase = round?.phase || "";
    const hasLiveDom = Boolean(els.encounter?.querySelector(".dex-stage"));
    const paintFull = () => {
      els.encounter.innerHTML = window.playRenderEncounter(round, { bar, showHoney: false });
      lastEncounterKey = key;
    };
    if (pointerHeld && hasLiveDom) {
      window.playPatchEncounter(els.encounter, round, bar);
    } else if (key !== lastEncounterKey || Boolean(round) !== hasLiveDom) {
      paintFull();
    } else if (hasLiveDom) {
      window.playPatchEncounter(els.encounter, round, bar);
    }
    const bag = state?.bag;
    const kitKey = bag ? `in:${bag.berry}:${bag.bait}:${bag.lure}` : "out";
    if (kitKey !== lastKitKey) {
      lastKitKey = kitKey;
      els.bag.innerHTML = window.playRenderPlayKit(bag);
    }
    window.playFillLurePanel(bag);
    window.playRenderLiveFeed(data?.console || round);
    renderActions(view);
    maybeRadarJoin(view);
    window.playSetAccountNav(window._playSession || null, profile, {
      isAdmin: Boolean(data?.isAdmin),
      trainer: data?.trainer
    });
  }

  function loadStream(login) {
    const channel = (login || "").trim();
    if (channel === lastChannel) return;
    lastChannel = channel;
    if (!channel) {
      els.stream.removeAttribute("src");
      els.streamNote.textContent = "The stream channel is not set yet.";
      return;
    }
    const parent = encodeURIComponent(window.playTwitchParent());
    els.stream.src = `https://player.twitch.tv/?channel=${encodeURIComponent(channel)}&parent=${parent}&muted=true`;
    els.streamNote.textContent = `Watching ${channel}.`;
  }

  let refreshQueued = false;
  async function refresh() {
    if (acting || pointerHeld) {
      refreshQueued = true;
      return;
    }
    refreshQueued = false;
    try {
      const data = await window.playCall("play_sync", { p_round_id: liveRound(state)?.id || null });
      if (data?.channel !== undefined) loadStream(data.channel);
      render(data);
    } catch (error) {
      const message = window.playRpcError(error, "Could not load the encounter.");
      if (!/failed to fetch|networkerror|load failed/i.test(message)) {
        els.actionStatus.textContent = message;
      }
    }
  }

  async function act(kind, item) {
    if (acting) return;
    if (liveRound(state)?.paused) {
      els.actionStatus.textContent = "This encounter is paused.";
      return;
    }
    acting = true;
    try {
      const roundId = liveRound(state)?.id || null;
      const data = kind === "join"
        ? await window.playCall("play_join", { p_round_id: roundId })
        : kind === "prepare"
          ? await window.playCall("play_prepare", { p_item: item, p_round_id: roundId })
          : await window.playCall("play_throw", { p_item: item, p_round_id: roundId });
      lastActionKey = "";
      if (kind === "join" && roundId) joinedMe.set(roundId, data?.me || { joined: true });
      if ((kind === "prepare" || kind === "throw") && roundId && data?.me) joinedMe.set(roundId, data.me);
      render(data);
      els.actionStatus.textContent = data.message || "";
    } catch (error) {
      els.actionStatus.textContent = window.playRpcError(error);
    } finally {
      acting = false;
      if (refreshQueued) refresh();
    }
  }

  function pressAction(button) {
    if (!button || button.disabled) return;
    if (button.dataset.kind === "open-balls") {
      openThrowBalls(state?.bag || {}, "throw");
      return;
    }
    button.disabled = true;
    act(button.dataset.kind, button.dataset.item || "").finally(() => {
      if (button.isConnected) button.disabled = false;
    });
  }

  els.actions.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const button = event.target.closest("button[data-kind]");
    if (!button) return;
    pointerHeld = true;
    pressAction(button);
  });
  els.actions.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-kind]");
    if (!button || button.disabled || acting) {
      event.preventDefault();
      return;
    }
    pressAction(button);
  });
  window.addEventListener("pointerup", () => {
    pointerHeld = false;
    if (refreshQueued) refresh();
  });
  window.addEventListener("pointercancel", () => {
    pointerHeld = false;
    if (refreshQueued) refresh();
  });

  els.throwModal?.addEventListener("click", (event) => {
    if (event.target === els.throwModal) els.throwModal.close("cancel");
  });

  els.throwGrid?.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const button = event.target.closest("button[data-throw]");
    if (!button || button.disabled || throwViewOnly) return;
    pointerHeld = true;
    button.disabled = true;
    els.throwModal?.close?.();
    act("throw", button.dataset.throw).finally(() => {
      if (button.isConnected) button.disabled = false;
    });
  });
  els.throwGrid?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-throw]");
    if (!button || button.disabled || throwViewOnly || acting) {
      event.preventDefault();
      return;
    }
    button.disabled = true;
    els.throwModal?.close?.();
    act("throw", button.dataset.throw).finally(() => {
      if (button.isConnected) button.disabled = false;
    });
  });

  async function loadProfile() {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    window._playSession = session;
    if (!session) {
      profile = null;
      window.playSetAccountNav(null);
      await refresh();
      return;
    }
    const { data } = await supabase.from("profiles").select("display_name, twitch_login, avatar_url").eq("id", session.user.id).maybeSingle();
    profile = data;
    window.playSetAccountNav(session, profile);
    await refresh();
  }

  async function heartbeat() {
    if (document.visibilityState !== "visible") return;
    if (!window._playSession) return;
    try {
      const data = await window.playCall("play_heartbeat", { p_seconds: 20 });
      if (data) render(data);
    } catch (_) {
      // Rankings still work if the heartbeat RPC is not live yet.
    }
  }

  let liveRefreshTimer = 0;
  function scheduleRefresh() {
    clearTimeout(liveRefreshTimer);
    liveRefreshTimer = setTimeout(() => {
      if (pointerHeld || acting) {
        refreshQueued = true;
        return;
      }
      refresh();
    }, 200);
  }

  function secondsToNextPhase(round) {
    const phase = round?.phase;
    const end = Date.parse(round?.deadlines?.[phase] || round?.endsAt || "");
    if (!Number.isFinite(end)) return 99;
    return (end - Date.now()) / 1000;
  }

  function tickLive() {
    if (document.visibilityState !== "visible" || !state) return;
    const round = liveRound(state);
    if (!round) {
      if (lastLocalPhase || (lastEncounterKey && !lastEncounterKey.startsWith("none:idle"))) {
        lastLocalPhase = "";
        lastEncounterKey = "";
        lastActionKey = "";
        render(state);
      }
      return;
    }
    const bar = phaseBar(round);
    if (!window.playPatchEncounter(els.encounter, round, bar)) {
      lastEncounterKey = "";
      if (!pointerHeld) render({ ...state, round });
      return;
    }
    if (pointerHeld) return;
    if (round.phase && round.phase !== lastLocalPhase) {
      lastLocalPhase = round.phase;
      lastEncounterKey = "";
      lastActionKey = "";
      render({ ...state, round });
      refresh();
    }
  }

  els.bag.addEventListener("click", (event) => {
    if (!event.target.closest("#view-balls")) return;
    openThrowBalls(state?.bag || {}, "view");
  });

  supabase.auth.onAuthStateChange((event) => { if (window.playAuthNoise(event)) return; loadProfile(); });
  supabase.channel("play-live")
    .on("postgres_changes", { event: "*", schema: "public", table: "encounter_rounds" }, scheduleRefresh)
    .on("postgres_changes", { event: "*", schema: "public", table: "encounter_activity" }, scheduleRefresh)
    .on("postgres_changes", { event: "*", schema: "public", table: "play_console_log" }, scheduleRefresh)
    .on("postgres_changes", { event: "*", schema: "public", table: "inventories" }, scheduleRefresh)
    .on("postgres_changes", { event: "*", schema: "public", table: "stream_status" }, scheduleRefresh)
    .subscribe();
  setInterval(tickLive, 200);
  setInterval(() => {
    if (document.visibilityState !== "visible" || pointerHeld || acting) return;
    const round = liveRound(state);
    const left = secondsToNextPhase(round);
    if (round?.paused) {
      if (!tickLive._n) tickLive._n = 0;
      tickLive._n += 1;
      if (tickLive._n % 8 === 0) refresh();
    } else if (round && round.phase && round.phase !== "closed" && left <= 2) refresh();
    else if (round && round.phase && round.phase !== "closed") {
      if (!tickLive._n) tickLive._n = 0;
      tickLive._n += 1;
      if (tickLive._n % 5 === 0) refresh();
    } else {
      if (!tickLive._idle) tickLive._idle = 0;
      tickLive._idle += 1;
      if (tickLive._idle % 3 === 0) refresh();
    }
  }, 1000);
  setInterval(heartbeat, 20000);
  loadProfile();
  window.playBindLureButton((data) => {
    lastActionKey = "";
    render(data);
  });
})();
