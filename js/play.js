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
  let pickerKind = "balls";
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
    const species = round ? window.playDisplayName(round, { plain: true }) : "the Pokémon";
    if (!round || round.phase === "closed") {
      let closedStatus = "";
      if (round?.resolved && me) {
        if (me.caught) closedStatus = `Gotcha! ${species} was caught!`;
        else if (!me.ball) closedStatus = "You didn't choose a Poké Ball in time!";
        else if (me.result) closedStatus = `Oh no! ${species} broke free! Better luck next encounter!`;
      }
      return {
        key: `idle:${round?.id || ""}:${me?.result || ""}`,
        buttons: [],
        status: closedStatus
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
    const capturing = phase === "reveal";
    // Joining closes with Phase 1. Everyone else watches this one out.
    if (!me && !joining) {
      return {
        key: `spectate:${round.id}:${phase}`,
        buttons: [],
        status: "You're watching this encounter. Get ready for the next one!"
      };
    }
    if (capturing) {
      return {
        key: `capture:${round.id}:${me?.ball || ""}`,
        buttons: [],
        status: me?.ball ? "The Poké Ball is shaking…" : "You didn't choose a Poké Ball in time!"
      };
    }
    const pushPrep = (disabled, used) => {
      const hintFor = (item, qtyHint) => {
        if (used === item) return "Locked in";
        if (used) return "Already prepared";
        if (disabled) return "Opens in Prepare";
        return qtyHint;
      };
      const owned = window.playOwnedBerries(bag, data?.captureItems);
      // A Berry the Trainer already committed to may be their last one.
      const shortlist = owned.slice(0, 3);
      if (used && !shortlist.some((row) => row.key === used) && used !== "bait") {
        shortlist.unshift({ key: used, name: window.playItemLabel(used), qty: 0 });
      }
      if (!shortlist.length) {
        buttons.push({
          kind: "prepare",
          item: "berry",
          label: "Berry",
          hint: disabled ? "Opens in Prepare" : "None left",
          sprite: "berry",
          disabled: true
        });
      }
      shortlist.slice(0, 3).forEach((row) => {
        buttons.push({
          kind: "prepare",
          item: row.key,
          label: row.name,
          hint: hintFor(row.key, `${row.qty} left · +catch`),
          sprite: row.key,
          disabled: disabled || Boolean(used) || row.qty < 1
        });
      });
      if (owned.length > 3) {
        buttons.push({
          kind: "open-berries",
          item: "berry",
          label: "All my Berries",
          hint: used ? "Locked in" : disabled ? "Opens in Prepare" : "Only Berries you own",
          sprite: "berry",
          disabled: disabled || Boolean(used)
        });
      }
      buttons.push({
        kind: "prepare",
        item: "bait",
        label: "Honey",
        hint: hintFor("bait", `${bag.bait ?? 0} left · team bonus`),
        sprite: "bait",
        disabled: disabled || Boolean(used) || Number(bag.bait || 0) < 1
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
              : (qty < 1 ? "None left" : `${qty} left · ${row.multiplier}`);
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
    if (joining && !me) {
      buttons.push({
        kind: "join",
        item: "",
        label: "Join encounter",
        hint: window.playRadarOn?.(bag) ? "Poké Radar joining…" : "Closes when the timer ends"
      });
    }
    if (joining && me && !me.prep) pushPrep(true);
    if (preparing && me && !me.prep) pushPrep(false);
    if (preparing && me && me.prep) pushPrep(true, me.prep);
    if (throwing && me && !me.ball) pushBalls(false);
    if (throwing && me && me.ball) pushBalls(true, me.ball);
    const esc = (value) => window.playEscapeAttr(String(value || ""));
    const joinWait = "You have joined the encounter! Please wait while other Trainers join you.";
    const prepWait = (item) => {
      const label = window.playItemLabel(item);
      return {
        status: `You have selected ${label}! Please wait while the other Trainers make their choices.`,
        statusHtml: `You have selected <strong>${esc(label)}</strong>! Please wait while the other Trainers make their choices.`
      };
    };
    const throwWait = (item) => {
      const label = window.playItemLabel(item);
      return {
        status: `You have chosen ${label}! Please wait while the other Trainers make their choices.`,
        statusHtml: `You have chosen <strong>${esc(label)}</strong>! Please wait while the other Trainers make their choices.`
      };
    };
    let status = "";
    let statusHtml = "";
    if (joining && me) {
      status = joinWait;
    } else if (preparing && me?.prep) {
      ({ status, statusHtml } = prepWait(me.prep));
    } else if (throwing && me?.ball) {
      ({ status, statusHtml } = throwWait(me.ball));
    } else if (preparing && me) {
      status = "Choose an item before the timer runs out.";
    } else if (throwing && me) {
      status = "Choose your Poké Ball before the timer runs out.";
    } else if (joining && !me) {
      status = `A wild ${species} appeared! Join the encounter?`;
    }
    if (!buttons.length) {
      return { key: `wait:${phase}:${me?.prep || ""}:${me?.ball || ""}:${me?.result || ""}`, buttons, status, statusHtml };
    }
    return { key: buttons.map((row) => `${row.kind}:${row.item}:${row.disabled ? "off" : "on"}:${row.hint}`).join("|"), buttons, status, statusHtml };
  }

  function setActionStatus(plan) {
    if (plan?.statusHtml) els.actionStatus.innerHTML = plan.statusHtml;
    else els.actionStatus.textContent = plan?.status || "";
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
      if (plan.status || plan.statusHtml) setActionStatus(plan);
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
      if (plan.status || plan.statusHtml) setActionStatus(plan);
      return;
    }
    lastActionKey = key;
    setActionStatus(plan);
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
    pickerKind = "balls";
    if (els.throwTitle) els.throwTitle.textContent = throwViewOnly ? "Your Poké Balls" : "All my Poké Balls";
    if (els.throwHint) {
      els.throwHint.textContent = throwViewOnly
        ? "Balls you own. Catch power is how much each ball improves your chance."
        : "Only balls in your bag. Catch power is how much each ball improves your chance. Master Ball always catches.";
    }
    const rows = window.playOwnedBalls(bag);
    if (!rows.length) {
      els.throwGrid.innerHTML = `<p class="muted">You don’t have any Poké Balls right now. Buy more in the Store.</p>`;
    } else {
      els.throwGrid.innerHTML = rows.map((row) => {
        const qty = Number(bag?.[row.key] || 0);
        const disabled = throwViewOnly ? "disabled" : "";
        return `<button type="button" class="ball-tile" data-throw="${row.key}" ${disabled}>
          <img src="${window.playItemSprite(row.key)}" alt="">
          <strong>${row.name}</strong>
          <span class="ball-rate">${row.multiplier} catch power</span>
          <span class="muted">${qty} in bag</span>
        </button>`;
      }).join("");
    }
    if (typeof els.throwModal.showModal === "function") els.throwModal.showModal();
    else els.throwModal.setAttribute("open", "");
  }

  function openBerryPicker(bag) {
    if (!els.throwModal || !els.throwGrid) return;
    if (state?.me?.prep) return;
    throwViewOnly = false;
    pickerKind = "berries";
    if (els.throwTitle) els.throwTitle.textContent = "All my Berries";
    if (els.throwHint) els.throwHint.textContent = "One Berry per encounter. It is used when the timer ends.";
    const rows = window.playOwnedBerries(bag, state?.captureItems);
    if (!rows.length) {
      els.throwGrid.innerHTML = `<p class="muted">You don’t have any Berries right now. Buy more in the Store.</p>`;
    } else {
      els.throwGrid.innerHTML = rows.map((row) => `
        <button type="button" class="ball-tile" data-prep="${row.key}">
          <img src="${window.playItemSprite(row.key)}" alt="">
          <strong>${row.name}</strong>
          <span class="ball-rate">${window.playEscapeAttr(row.description || "Helps with the catch.")}</span>
          <span class="muted">${row.qty} in bag</span>
        </button>`).join("");
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
      // "Berry" means whichever plain Berry is on hand, never the rare ones.
      const item = prefs.defaultPrep === "berry"
        ? window.playAutoBerryKey(bag, data?.captureItems)
        : prefs.defaultPrep;
      if (item && maybeAutoAct._prep !== round.id) {
        maybeAutoAct._prep = round.id;
        act("prepare", item);
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
    if (round.phase !== "join") return;
    if (!window.playRadarOn?.(bag) || lureJoinRound === round.id) return;
    lureJoinRound = round.id;
    act("join", "");
  }

  function render(data) {
    state = attachMe(data);
    const round = liveRound(state);
    const view = { ...state, round };
    const pickerStale = pickerKind === "berries"
      ? Boolean(state?.me?.prep) || round?.phase !== "prepare"
      : Boolean(state?.me?.ball) && !throwViewOnly;
    if ((!round || round.paused || pickerStale) && els.throwModal?.open) {
      try { els.throwModal.close(); } catch (_) {}
    }
    const seqPhase = round?.phase === "closed"
      ? (round.resolved ? "results" : "reveal")
      : (round?.phase || "idle");
    const key = `${round?.id || "none"}:${seqPhase}:${round?.resolved || false}:${round?.paused || false}:${round?.variant || ""}:${round?.hidden || false}:${state?.me?.ball || ""}:${state?.me?.result || ""}`;
    const bar = phaseBar(round);
    const patchOpts = { me: state?.me || null };
    lastLocalPhase = round?.phase || lastLocalPhase;
    const hasLiveDom = Boolean(els.encounter?.querySelector(".dex-stage"));
    const paintFull = () => {
      els.encounter.innerHTML = window.playRenderEncounter(round, {
        bar,
        showLastAction: false,
        throwBall: state?.me?.ball || "pokeball",
        me: state?.me || null
      });
      lastEncounterKey = key;
    };
    if (pointerHeld && hasLiveDom) {
      window.playPatchEncounter(els.encounter, round, bar, patchOpts);
    } else if (key !== lastEncounterKey || Boolean(round) !== hasLiveDom) {
      paintFull();
    } else if (hasLiveDom) {
      window.playPatchEncounter(els.encounter, round, bar, patchOpts);
    }
    const bag = state?.bag;
    const berryTotal = bag
      ? window.playOwnedBerries(bag, state?.captureItems).reduce((sum, row) => sum + row.qty, 0)
      : 0;
    const kitKey = bag ? `in:${berryTotal}:${bag.bait}:${bag.lure}` : "out";
    if (kitKey !== lastKitKey) {
      lastKitKey = kitKey;
      els.bag.innerHTML = window.playRenderPlayKit(bag);
    }
    window.playFillLurePanel(bag);
    window.playRenderLiveFeed(data?.console || [], null, round);
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
    if (button.dataset.kind === "open-berries") {
      if (state?.me?.prep) return;
      openBerryPicker(state?.bag || {});
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

  function pickFromGrid(button) {
    const kind = button.dataset.throw ? "throw" : "prepare";
    const item = button.dataset.throw || button.dataset.prep;
    button.disabled = true;
    els.throwGrid.querySelectorAll("button[data-throw], button[data-prep]").forEach((btn) => { btn.disabled = true; });
    els.throwModal?.close?.();
    act(kind, item);
  }

  els.throwGrid?.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const button = event.target.closest("button[data-throw], button[data-prep]");
    if (!button || button.disabled || throwViewOnly) return;
    pointerHeld = true;
    pickFromGrid(button);
  });
  els.throwGrid?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-throw], button[data-prep]");
    if (!button || button.disabled || throwViewOnly || acting) {
      event.preventDefault();
      return;
    }
    pickFromGrid(button);
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
    const patchOpts = { me: state?.me || null };
    if (!window.playPatchEncounter(els.encounter, round, bar, patchOpts)) {
      lastEncounterKey = "";
      if (!pointerHeld) render({ ...state, round });
      return;
    }
    if (round.phase && round.phase !== lastLocalPhase) {
      const keepSeq = lastLocalPhase === "reveal" && round.phase === "closed" && !round.resolved && els.encounter.querySelector("[data-catch-seq]");
      const fromThrow = lastLocalPhase === "throw" && round.phase === "reveal";
      lastLocalPhase = round.phase;
      lastActionKey = "";
      if (fromThrow) {
        window.playRenderLiveFeed(state?.console || [], null, round);
      }
      if (keepSeq) {
        renderActions({ ...state, round });
        refresh();
        return;
      }
      lastEncounterKey = "";
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
    } else if (round) {
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
