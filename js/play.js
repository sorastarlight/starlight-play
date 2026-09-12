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
    if (!round || round.cancelled) return null;
    const local = typeof window.playApplyLocalRound === "function" ? window.playApplyLocalRound(round) : round;
    return local;
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
    if (id && incoming) {
      const prev = joinedMe.get(id) || {};
      const merged = { ...prev, ...incoming };
      if (!merged.prep && prev.prep) merged.prep = prev.prep;
      if (!merged.ball && prev.ball) merged.ball = prev.ball;
      if (merged.result == null && prev.result) merged.result = prev.result;
      joinedMe.set(id, merged);
    }
    const mine = (id ? joinedMe.get(id) : null) || incoming || null;
    return { ...data, me: mine };
  }

  function actionPlan(data) {
    const round = liveRound(data);
    const me = data?.me;
    const bag = data?.bag || {};
    const signedIn = Boolean(data?.bag);
    const prefs = window.playEncounterSettings(data?.encounterSettings);
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
    const phase = round.phase;
    const throwing = phase === "throw";
    const preparing = phase === "prepare";
    const joining = phase === "join";
    const pushPrep = (disabled, used) => {
      const hintFor = (item, qtyHint) => {
        if (used === item) return "Locked in";
        if (used) return "Already prepared";
        if (disabled) return "Opens in Prepare";
        return qtyHint;
      };
      buttons.push({
        kind: "prepare",
        item: "berry",
        label: "Berry",
        hint: hintFor("berry", `${bag.berry ?? 0} left · +catch`),
        sprite: "berry",
        disabled: disabled || Boolean(used)
      });
      buttons.push({
        kind: "prepare",
        item: "bait",
        label: "Honey",
        hint: hintFor("bait", `${bag.bait ?? 0} left · team bonus`),
        sprite: "bait",
        disabled: disabled || Boolean(used)
      });
    };
    const pushBalls = (disabled, used) => {
      const favorites = window.playFavoriteBalls(bag, prefs);
      favorites.forEach((row) => {
        const qty = Number(bag[row.key] || 0);
        const hint = used === row.key
          ? "Locked in"
          : used
            ? "Already thrown"
            : disabled
              ? "Opens in Throw"
              : (qty < 1 ? "None left" : `${qty} left · ${Math.round((row.rate || 0) * 100)}%`);
        buttons.push({
          kind: "throw",
          item: row.key,
          label: row.name,
          hint,
          sprite: row.key,
          disabled: disabled || Boolean(used) || qty < 1
        });
      });
      buttons.push({
        kind: "open-balls",
        item: "pokeball",
        label: "All my Poké Balls",
        hint: used ? "Locked in" : disabled ? "Opens in Throw" : "Only balls you own",
        sprite: "pokeball",
        disabled: disabled || Boolean(used)
      });
    };
    if ((joining && !me) || (preparing && !me)) {
      buttons.push({
        kind: "join",
        item: "",
        label: "Join encounter",
        hint: joining ? (window.playRadarOn?.(bag) ? "Poké Radar joining…" : "") : "Still needed for berries"
      });
    }
    if (joining && me && !me.prep) pushPrep(true);
    if (preparing && me && !me.prep) pushPrep(false);
    if (preparing && me && me.prep) {
      pushPrep(true, me.prep);
      if (!me.ball) {
        buttons.push({
          kind: "open-balls",
          item: "pokeball",
          label: "Poké Balls",
          hint: "Opens in Throw",
          sprite: "pokeball",
          disabled: true
        });
      }
    }
    if (throwing && me && !me.ball) pushBalls(false);
    if (throwing && me && me.ball) pushBalls(true, me.ball);
    const chose = (item) => `You chose ${window.playItemLabel(item)}. Please wait for this phase to complete, or for other trainers to finish.`;
    const ballReady = (item) => `You chose ${window.playItemLabel(item)}. It's ready to throw. Waiting for this phase to end, or for other trainers to lock in their choices.`;
    let status = "";
    if (joining && me && me.prep) status = chose(me.prep);
    else if (joining && me) status = "You joined the encounter! Wait for the next phase, and then use either a Berry or Honey.";
    else if (preparing && me?.prep) status = chose(me.prep);
    else if (throwing && me?.ball) status = ballReady(me.ball);
    else if (phase === "reveal" && me?.ball && !round.resolved) status = ballReady(me.ball);
    else if (!buttons.length && phase === "reveal") status = me?.result || "Results incoming.";
    else if (!buttons.length && preparing && !me) status = "Join this encounter to take part.";
    else if (!buttons.length && throwing && !me) status = "You needed to join before Throw.";
    else if (!buttons.length && phase !== "join") status = "You needed to join during the join window.";
    if (!buttons.length) {
      return { key: `wait:${phase}:${me?.prep || ""}:${me?.ball || ""}:${me?.result || ""}`, buttons, status };
    }
    return { key: buttons.map((row) => `${row.kind}:${row.item}:${row.disabled ? "off" : "on"}:${row.hint}`).join("|"), buttons, status };
  }

  function renderActions(data) {
    const plan = actionPlan(data);
    if (acting) plan.buttons.forEach((row) => { row.disabled = true; });
    const key = plan.buttons.map((row) => `${row.kind}:${row.item}:${row.disabled ? "off" : "on"}`).join("|") + `::${plan.status || ""}`;
    const heldBtn = pointerHeld ? els.actions.querySelector("button[data-kind]") : null;
    const heldKind = heldBtn?.dataset.kind;
    const nextKinds = plan.buttons.map((row) => row.kind).join("|");
    if (heldBtn && nextKinds && nextKinds.split("|").every((kind) => kind === heldKind)) {
      plan.buttons.forEach((row, index) => {
        const btn = els.actions.children[index];
        if (!btn) return;
        btn.disabled = Boolean(row.disabled);
        const hint = btn.querySelector("em");
        if (hint && row.hint) hint.textContent = row.hint;
      });
      if (plan.status) els.actionStatus.textContent = plan.status;
      return;
    }
    if (key === lastActionKey && els.actions.children.length === plan.buttons.length) {
      plan.buttons.forEach((row, index) => {
        const btn = els.actions.children[index];
        if (!btn) return;
        btn.disabled = Boolean(row.disabled);
        const hint = btn.querySelector("em");
        if (hint && row.hint) hint.textContent = row.hint;
      });
      if (plan.status) els.actionStatus.textContent = plan.status;
      return;
    }
    lastActionKey = key;
    els.actionStatus.textContent = plan.status;
    els.actions.classList.toggle("single", plan.buttons.length === 1);
    els.actions.classList.toggle("throw-picks", plan.buttons.some((row) => row.kind === "throw"));
    els.actions.innerHTML = plan.buttons.map((row) => {
      const sprite = row.sprite || (row.kind === "open-balls" ? "pokeball" : "");
      const icon = sprite
        ? `<span class="item-icon item-icon-img"><img src="${window.playItemSprite(sprite)}" alt=""></span>`
        : `<span class="item-icon" aria-hidden="true"></span>`;
      const disabled = row.disabled ? "disabled" : "";
      return `<button type="button" class="item-btn" data-kind="${row.kind}" data-item="${row.item}" ${disabled}>
        ${icon}
        <span class="item-copy"><strong>${row.label}</strong>${row.hint ? `<em>${row.hint}</em>` : ""}</span>
      </button>`;
    }).join("");
  }

  function openThrowBalls(bag, mode) {
    if (!els.throwModal || !els.throwGrid) return;
    if (mode === "throw" && state?.me?.ball) return;
    throwViewOnly = mode === "view";
    if (els.throwTitle) els.throwTitle.textContent = throwViewOnly ? "Your Poké Balls" : "All my Poké Balls";
    if (els.throwHint) {
      els.throwHint.textContent = throwViewOnly
        ? "Balls you own. Catch rates are the Play throw chances."
        : "Only balls in your bag. Catch rates are the Play throw chances. Master Ball always catches.";
    }
    const rows = window.playOwnedBalls(bag);
    if (!rows.length) {
      els.throwGrid.innerHTML = `<p class="muted">You don’t have any Poké Balls right now. Buy more in the Store.</p>`;
    } else {
      els.throwGrid.innerHTML = rows.map((row) => {
        const qty = Number(bag?.[row.key] || 0);
        const pct = Math.round((row.rate || 0) * 100);
        const disabled = throwViewOnly ? "disabled" : "";
        return `<button type="button" class="ball-tile" data-throw="${row.key}" ${disabled}>
          <img src="${window.playItemSprite(row.key)}" alt="">
          <strong>${row.name}</strong>
          <span class="ball-rate">${row.multiplier} · ${pct}% catch</span>
          <span class="muted">${qty} in bag</span>
        </button>`;
      }).join("");
    }
    if (typeof els.throwModal.showModal === "function") els.throwModal.showModal();
    else els.throwModal.setAttribute("open", "");
  }

  function maybeAutoAct(data) {
    const round = liveRound(data);
    const me = data?.me;
    const bag = data?.bag || {};
    const prefs = window.playEncounterSettings(data?.encounterSettings);
    if (!round || round.paused || acting || !me) return;
    if (!me.prep && prefs.autoPrep && prefs.defaultPrep !== "ask" && round.phase === "prepare") {
      if (maybeAutoAct._prep !== round.id) {
        maybeAutoAct._prep = round.id;
        act("prepare", prefs.defaultPrep);
      }
      return;
    }
    if (round.phase === "throw" && !me.ball && prefs.autoThrow) {
      const favorite = window.playFavoriteBalls(bag, prefs).find((row) => Number(bag[row.key] || 0) > 0);
      if (favorite && maybeAutoAct._throw !== round.id) {
        maybeAutoAct._throw = round.id;
        act("throw", favorite.key);
      }
    }
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
    if ((!round || round.paused || (state?.me?.ball && !throwViewOnly)) && els.throwModal?.open) {
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
    maybeAutoAct(view);
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
    els.actions.querySelectorAll("button[data-kind]").forEach((btn) => { btn.disabled = true; });
    els.throwGrid?.querySelectorAll("button[data-throw]").forEach((btn) => { btn.disabled = true; });
    const roundId = liveRound(state)?.id || null;
    const prevMe = roundId ? { ...(joinedMe.get(roundId) || { joined: true }) } : null;
    if (roundId && kind === "prepare") joinedMe.set(roundId, { ...prevMe, prep: item });
    if (roundId && kind === "throw") joinedMe.set(roundId, { ...prevMe, ball: item });
    if (kind === "prepare" || kind === "throw") {
      lastActionKey = "";
      const optimistic = attachMe({ ...state, me: roundId ? joinedMe.get(roundId) : state?.me });
      renderActions({ ...optimistic, round: liveRound(optimistic) });
    }
    try {
      const data = kind === "join"
        ? await window.playCall("play_join", { p_round_id: roundId })
        : kind === "prepare"
          ? await window.playCall("play_prepare", { p_item: item, p_round_id: roundId })
          : await window.playCall("play_throw", { p_item: item, p_round_id: roundId });
      lastActionKey = "";
      if (kind === "join" && roundId) joinedMe.set(roundId, data?.me || { joined: true });
      if ((kind === "prepare" || kind === "throw") && roundId && data?.me) joinedMe.set(roundId, data.me);
      if (kind === "throw" && els.throwModal?.open && !throwViewOnly) {
        try { els.throwModal.close(); } catch (_) {}
      }
      render(data);
      if (kind === "join") els.actionStatus.textContent = data.message || "";
    } catch (error) {
      if (roundId && prevMe && (kind === "prepare" || kind === "throw")) joinedMe.set(roundId, prevMe);
      els.actionStatus.textContent = window.playRpcError(error);
      lastActionKey = "";
      renderActions({ ...state, round: liveRound(state) });
    } finally {
      acting = false;
      if (refreshQueued) refresh();
    }
  }

  function pressAction(button) {
    if (!button || button.disabled) return;
    if (button.dataset.kind === "open-balls") {
      if (state?.me?.ball) return;
      openThrowBalls(state?.bag || {}, "throw");
      return;
    }
    button.disabled = true;
    act(button.dataset.kind, button.dataset.item || "");
  }

  els.actions.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const button = event.target.closest("button[data-kind]");
    if (!button || button.disabled) return;
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
    els.throwGrid.querySelectorAll("button[data-throw]").forEach((btn) => { btn.disabled = true; });
    els.throwModal?.close?.();
    act("throw", button.dataset.throw);
  });
  els.throwGrid?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-throw]");
    if (!button || button.disabled || throwViewOnly || acting) {
      event.preventDefault();
      return;
    }
    button.disabled = true;
    els.throwGrid.querySelectorAll("button[data-throw]").forEach((btn) => { btn.disabled = true; });
    els.throwModal?.close?.();
    act("throw", button.dataset.throw);
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
    if (round.phase && round.phase !== lastLocalPhase) {
      lastLocalPhase = round.phase;
      lastEncounterKey = "";
      lastActionKey = "";
      if (pointerHeld) {
        renderActions({ ...state, round });
        return;
      }
      render({ ...state, round });
      refresh();
      return;
    }
    if (pointerHeld) return;
    renderActions({ ...state, round });
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
    } else if (round && round.phase && round.phase !== "closed") {
      refresh();
    } else {
      if (!tickLive._idle) tickLive._idle = 0;
      tickLive._idle += 1;
      if (tickLive._idle % 2 === 0) refresh();
    }
  }, 1000);
  setInterval(heartbeat, 20000);
  loadProfile();
  window.playBindLureButton((data) => {
    lastActionKey = "";
    render(data);
  });
})();
