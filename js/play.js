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
  let joiningPending = false;
  let reconnecting = false;
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
      if ((prev.caught === true || String(prev.result || "").toLowerCase() === "caught")
        && incoming.caught !== true
        && !incoming.result) {
        merged.caught = true;
        merged.result = prev.result || "Caught";
      }
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
    const species = round ? window.playDisplayName(round, { plain: true }) : "the Pokémon";
    if (!round || round.phase === "closed") {
      let closedStatus = "";
      if (round?.resolved && me) {
        if (me.caught) closedStatus = `Gotcha! ${species} was caught!`;
        else if (!me.ball) closedStatus = window.PLAY_STATUS?.noBall || "You didn't choose a Poké Ball in time!";
        else if (me.result) closedStatus = `Oh no! ${species} broke free! Better luck next encounter!`;
      }
      return {
        key: `idle:${round?.id || ""}:${me?.result || ""}`,
        buttons: [],
        groups: [],
        status: closedStatus
      };
    }
    if (!signedIn) {
      return { key: "signin", buttons: [], status: "Sign in with Twitch to join this encounter." };
    }
    if (round.paused) {
      return {
        key: `paused:${round.id}:${round.pausedForBreak ? "ad" : "admin"}`,
        buttons: [],
        status: round.pausedForBreak
          ? (window.PLAY_STATUS?.adPause || "A Twitch ad break is currently running. The encounter will resume when the stream returns.")
          : "Encounter temporarily paused."
      };
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
        groups: [],
        used: me,
        status: me?.ball ? "The Poké Ball is shaking…" : (window.PLAY_STATUS?.noBall || "You didn't choose a Poké Ball in time!")
      };
    }
    const lockedPrep = Boolean(me?.prep);
    const lockedBall = Boolean(me?.ball);
    const prepActive = preparing && me && !lockedPrep;
    const throwActive = throwing && me && !lockedBall;
    if (joining && !me) {
      const pending = joiningPending;
      buttons.push({
        kind: "join",
        item: "",
        label: pending ? (window.PLAY_STATUS?.joining || "JOINING…") : "JOIN ENCOUNTER",
        hint: pending ? "Please wait…" : (window.playRadarOn?.(bag) ? "Poké Radar joining…" : "Join before the timer ends!"),
        disabled: pending
      });
    }
    if ((preparing || joining) && me) {
      const owned = window.playOwnedBerries(bag, data?.captureItems);
      const berries = owned.map((row) => ({
        kind: "prepare",
        item: row.key,
        label: row.name,
        qty: row.qty,
        effect: row.description || "Makes this Pokémon easier to catch.",
        selected: me.prep === row.key,
        disabled: !prepActive || row.qty < 1,
        reason: me.prep && me.prep !== row.key ? "ENCOUNTER LOCKED" : (row.qty < 1 ? "OUT OF STOCK" : (joining ? "Opens in item selection" : "")),
        sprite: row.key
      }));
      const honeyQty = Number(bag.bait || 0);
      const honey = {
        kind: "prepare",
        item: "bait",
        label: "Honey",
        qty: honeyQty,
        effect: "Contribute Honey to improve the catch bonus for all Trainers.",
        selected: me.prep === "bait",
        disabled: !prepActive || honeyQty < 1,
        reason: me.prep && me.prep !== "bait" ? "ENCOUNTER LOCKED" : (honeyQty < 1 ? "OUT OF STOCK" : (joining ? "Opens in item selection" : "")),
        sprite: "bait"
      };
      const skip = {
        kind: "prepare",
        item: "none",
        label: "No item",
        effect: "Skip this phase. You can still throw a Poké Ball.",
        selected: me.prep === "none",
        disabled: !prepActive,
        reason: lockedPrep && me.prep !== "none" ? "ENCOUNTER LOCKED" : (joining ? "Opens in item selection" : ""),
        sprite: "berry"
      };
      if (prepActive || lockedPrep) {
        buttons.push(...berries, honey, skip);
      }
    }
    if (throwing && me) {
      const advice = Array.isArray(data?.ballAdvice) ? data.ballAdvice : [];
      const owned = window.playOwnedBalls(bag);
      const pins = typeof window.playBagPins === "function" ? window.playBagPins() : [];
      const recent = typeof window.playRecentKeys === "function" ? window.playRecentKeys("balls") : [];
      let rows = advice.length
        ? advice.map((row) => ({
          kind: "throw",
          item: row.ballId,
          key: row.ballId,
          label: row.name,
          qty: Number(bag[row.ballId] ?? row.quantity ?? 0),
          effect: row.description,
          effectiveness: row.effectiveness,
          recommended: Boolean(row.recommended),
          specialist: Boolean(row.specialist),
          selected: me.ball === row.ballId,
          disabled: lockedBall || Number(bag[row.ballId] ?? row.quantity ?? 0) < 1,
          reason: lockedBall && me.ball !== row.ballId ? "ENCOUNTER LOCKED" : (Number(bag[row.ballId] ?? 0) < 1 ? "OUT OF STOCK" : ""),
          sprite: row.ballId
        }))
        : owned.map((row) => ({
          kind: "throw",
          item: row.key,
          key: row.key,
          label: row.name,
          qty: Number(bag[row.key] || 0),
          effect: row.effect || "A Poké Ball for this encounter.",
          selected: me.ball === row.key,
          disabled: lockedBall || Number(bag[row.key] || 0) < 1,
          reason: lockedBall && me.ball !== row.key ? "ENCOUNTER LOCKED" : (Number(bag[row.key] || 0) < 1 ? "OUT OF STOCK" : ""),
          sprite: row.key
        }));
      if (typeof window.playSortEncounterBalls === "function") {
        rows = window.playSortEncounterBalls(rows, pins.concat(recent));
      }
      if (!rows.length && throwActive) {
        rows = [{
          kind: "throw",
          item: "standard",
          label: "Poké Ball",
          qty: 1,
          effect: "A free standard throw is available.",
          selected: false,
          disabled: false,
          sprite: "pokeball"
        }];
      }
      buttons.push(...rows);
    }
    const esc = (value) => window.playEscapeAttr(String(value || ""));
    let status = "";
    let statusHtml = "";
    if (joining && !me && joiningPending) status = window.PLAY_STATUS?.joining || "JOINING…";
    else if (joining && me) status = window.PLAY_STATUS?.joined || "You have joined the encounter! Please wait while other Trainers join you.";
    else if (preparing && me?.prep === "none") status = window.PLAY_STATUS?.noItem || "You chose not to use an item. Please wait while the other Trainers make their choices.";
    else if (preparing && me?.prep === "bait") status = window.PLAY_STATUS?.honey || "You have contributed Honey! Please wait while the other Trainers make their choices.";
    else if (preparing && me?.prep) {
      const label = window.playItemLabel(me.prep);
      status = `You have selected ${label}! Please wait while the other Trainers make their choices.`;
      statusHtml = `You have selected <strong>${esc(label)}</strong>! Please wait while the other Trainers make their choices.`;
    } else if (throwing && me?.ball) {
      const label = window.playItemLabel(me.ball);
      status = `You have chosen ${label}! Please wait while the other Trainers make their choices.`;
      statusHtml = `You have chosen <strong>${esc(label)}</strong>! Please wait while the other Trainers make their choices.`;
    } else if (preparing && me) status = window.PLAY_STATUS?.firstPrep || "Choose a Berry to help yourself, Honey to help everyone, or skip.";
    else if (throwing && me && !buttons.length) status = window.PLAY_STATUS?.emptyBalls || "You don't have a Poké Ball available for this encounter.";
    else if (throwing && me) status = window.PLAY_STATUS?.firstThrow || "Choose a Poké Ball. Recommended Balls are marked.";
    else if (joining && !me) status = `A wild ${species} appeared! Join the encounter?`;
    if (reconnecting) status = window.PLAY_STATUS?.reconnect || "Reconnecting…";
    return {
      key: buttons.map((row) => `${row.kind}:${row.item}:${row.disabled ? "off" : "on"}:${row.selected ? "on" : ""}`).join("|") + `::${status}`,
      buttons,
      status,
      statusHtml,
      phase,
      used: capturing ? me : null
    };
  }

  function setActionStatus(plan) {
    if (plan?.statusHtml) els.actionStatus.innerHTML = plan.statusHtml;
    else els.actionStatus.textContent = plan?.status || "";
  }

  function renderActionCard(row) {
    if (typeof window.playEncounterCardHtml === "function" && row.kind !== "join") {
      return window.playEncounterCardHtml(row);
    }
    const sprite = row.sprite || (row.kind === "join" ? "pokeball" : "");
    const icon = sprite
      ? `<span class="item-icon item-icon-img"><img src="${window.playItemSprite(sprite)}" alt=""></span>`
      : `<span class="item-icon" aria-hidden="true"></span>`;
    const disabled = row.disabled ? "disabled" : "";
    const joinClass = row.kind === "join" ? " enc-join-btn" : "";
    return `<button type="button" class="item-btn${joinClass}${row.selected ? " is-selected" : ""}" data-kind="${row.kind}" data-item="${row.item}" ${disabled} aria-pressed="${row.selected ? "true" : "false"}">
      ${icon}
      <span class="item-copy"><strong>${row.label}</strong>${row.hint ? `<em>${row.hint}</em>` : ""}${row.selected ? `<span class="enc-selected-mark">SELECTED ✓</span>` : ""}</span>
    </button>`;
  }

  function renderActions(data) {
    const plan = actionPlan(data);
    if (acting) plan.buttons.forEach((row) => { row.disabled = true; });
    const key = plan.key;
    if (key === lastActionKey && els.actions.querySelector("[data-kind]")) {
      plan.buttons.forEach((row) => {
        const btn = els.actions.querySelector(`[data-kind="${row.kind}"][data-item="${row.item}"]`);
        if (!btn) return;
        btn.disabled = Boolean(row.disabled);
      });
      if (plan.status || plan.statusHtml) setActionStatus(plan);
      return;
    }
    lastActionKey = key;
    setActionStatus(plan);
    const berries = plan.buttons.filter((row) => row.kind === "prepare" && row.item !== "bait" && row.item !== "none");
    const honey = plan.buttons.filter((row) => row.kind === "prepare" && row.item === "bait");
    const skip = plan.buttons.filter((row) => row.kind === "prepare" && row.item === "none");
    const balls = plan.buttons.filter((row) => row.kind === "throw");
    const joins = plan.buttons.filter((row) => row.kind === "join");
    const tip = plan.phase === "prepare" && !data?.me?.prep
      ? (typeof window.playTipHtml === "function" ? window.playTipHtml("first-prep", window.PLAY_STATUS.firstPrep) : "")
      : plan.phase === "throw" && !data?.me?.ball
        ? (typeof window.playTipHtml === "function" ? window.playTipHtml("first-throw", window.PLAY_STATUS.firstThrow) : "")
        : "";
    let html = "";
    if (joins.length) html += `<div class="enc-join">${joins.map(renderActionCard).join("")}</div>`;
    if (plan.phase === "join" && data?.me && !berries.length && !honey.length && !skip.length) {
      html += `<div class="enc-joined" role="status"><strong>${window.PLAY_STATUS?.joinedShort || "JOINED ✓"}</strong><em>You're in! Waiting for other Trainers…</em></div>`;
    }
    if (berries.length || honey.length || skip.length) {
      html += `<div class="enc-split">
        <section class="enc-pane">
          <h3>For you</h3>
          <p class="muted">Berries help only your catch.</p>
          <div class="enc-card-row">${berries.length ? berries.map(renderActionCard).join("") : `<p class="muted">${window.PLAY_STATUS?.emptyItems || "No encounter items available."}</p>`}</div>
        </section>
        <section class="enc-pane">
          <h3>Help everyone</h3>
          <p class="muted">Honey raises the community bonus.</p>
          <div class="enc-card-row">${honey.map(renderActionCard).join("")}</div>
        </section>
      </div>
      <div class="enc-skip">${skip.map(renderActionCard).join("")}</div>`;
    }
    if (balls.length) {
      html += `<div class="enc-ball-scroller" role="list">${balls.map(renderActionCard).join("")}</div>`;
    }
    if (plan.used && typeof window.playUsedSummaryHtml === "function") {
      html += window.playUsedSummaryHtml(plan.used, liveRound(data));
    }
    const round = liveRound(data);
    if (round?.resolved && typeof window.playCatchFanfareHtml === "function") {
      html += window.playCatchFanfareHtml(round);
    }
    els.actions.classList.toggle("single", joins.length === 1 && plan.buttons.length === 1);
    els.actions.classList.toggle("throw-picks", balls.length > 0);
    els.actions.classList.toggle("enc-actions", true);
    els.actions.innerHTML = `${tip}${html}`;
  }

  function openThrowBalls(bag, mode) {
    if (!els.throwModal || !els.throwGrid) return;
    if (mode === "throw" && state?.me?.ball) return;
    throwViewOnly = mode === "view";
    pickerKind = "balls";
    if (els.throwTitle) els.throwTitle.textContent = throwViewOnly ? "Your Poké Balls" : "All my Poké Balls";
    if (els.throwHint) {
      els.throwHint.textContent = throwViewOnly
        ? "Balls you own. Recommendations come from this encounter — not a raw multiplier."
        : "Only balls in your bag. Recommended Balls are marked. Master Ball always catches and asks for confirmation.";
    }
    const rows = window.playOwnedBalls(bag);
    const adviceMap = new Map((state?.ballAdvice || []).map((row) => [row.ballId, row]));
    const adviceFor = (key) => {
      const rec = adviceMap.get(key);
      if (rec?.recommended) return `<span class="muted">★ Recommended</span>`;
      if (rec?.effectiveness) return `<span class="muted">${rec.effectiveness}</span>`;
      return `<span class="muted">${Number(bag?.[key] || 0)} in bag</span>`;
    };
    if (!rows.length) {
      els.throwGrid.innerHTML = throwViewOnly
        ? `<p class="muted">You don’t have any Poké Balls right now. Buy more in the Store.</p>`
        : `<button type="button" class="ball-tile" data-throw="standard">
            <img src="${window.playItemSprite("pokeball")}" alt="">
            <strong>Standard throw</strong>
            <span class="ball-rate">1× catch power</span>
            <span class="muted">Free Poké Ball · always available</span>
          </button>`;
    } else {
      els.throwGrid.innerHTML = rows.map((row) => {
        const qty = Number(bag?.[row.key] || 0);
        const disabled = throwViewOnly ? "disabled" : "";
        return `<button type="button" class="ball-tile" data-throw="${row.key}" ${disabled}>
          <img src="${window.playItemSprite(row.key)}" alt="">
          <strong>${row.name}</strong>
          <span class="ball-rate">${adviceMap.get(row.key)?.effectiveness || row.effect || "Poké Ball"}</span>
          ${throwViewOnly ? `<span class="muted">${qty} in bag</span>` : adviceFor(row.key)}
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
      const item = favorite?.key || (window.playThrowableTotal(bag) < 1 ? "standard" : "");
      if (item && maybeAutoAct._throw !== round.id) {
        maybeAutoAct._throw = round.id;
        act("throw", item);
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
    const key = `${round?.id || "none"}:${seqPhase}:${round?.resolved || false}:${round?.paused || false}:${round?.variant || ""}:${round?.hidden || false}:${state?.me?.ball || ""}:${state?.me?.caught || ""}:${state?.me?.result || ""}`;
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
    const storeLink = document.querySelector(".bag-store");
    if (storeLink) storeLink.hidden = Boolean(round && ["prepare", "throw", "reveal"].includes(round.phase));
    els.encounter?.closest(".dex-card")?.classList.toggle("is-encounter-live", Boolean(round && round.phase && round.phase !== "closed"));
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
      reconnecting = false;
      if (data?.channel !== undefined) loadStream(data.channel);
      render(data);
    } catch (error) {
      const message = window.playHumanRpcError
        ? window.playHumanRpcError(error, "Could not load the encounter.")
        : window.playRpcError(error, "Could not load the encounter.");
      reconnecting = /reconnecting/i.test(message);
      if (reconnecting) els.actionStatus.textContent = message;
      else if (!/failed to fetch|networkerror|load failed/i.test(message)) {
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
    if (kind === "join") joiningPending = true;
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
      reconnecting = false;
      if (kind === "join") joiningPending = false;
      if (kind === "join" && roundId) joinedMe.set(roundId, data?.me || { joined: true });
      if ((kind === "prepare" || kind === "throw") && roundId && data?.me) joinedMe.set(roundId, data.me);
      if (kind === "prepare" && item) window.playRememberUsed?.("berries", item);
      if (kind === "throw" && item) window.playRememberUsed?.("balls", item);
      if (kind === "throw" && els.throwModal?.open && !throwViewOnly) {
        try { els.throwModal.close(); } catch (_) {}
      }
      render(data);
      if (kind === "throw" && typeof window.playShowNotices === "function") {
        setTimeout(() => window.playShowNotices(), 900);
      }
    } catch (error) {
      if (roundId && prevMe && (kind === "prepare" || kind === "throw")) joinedMe.set(roundId, prevMe);
      if (kind === "join") joiningPending = false;
      const message = window.playHumanRpcError ? window.playHumanRpcError(error) : window.playRpcError(error);
      els.actionStatus.textContent = message;
      lastActionKey = "";
      if (/phase has ended/i.test(message)) {
        lastEncounterKey = "";
        refresh();
      } else {
        renderActions({ ...state, round: liveRound(state) });
      }
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
    if (button.dataset.kind === "throw" && button.dataset.item === "masterball" && window.playConfirmRare?.() !== false) {
      const modal = document.getElementById("master-modal");
      if (modal) {
        if (typeof modal.showModal === "function") modal.showModal();
        else modal.setAttribute("open", "");
        return;
      }
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
    if (kind === "throw" && item === "masterball" && window.playConfirmRare?.() !== false) {
      const modal = document.getElementById("master-modal");
      if (modal) {
        if (typeof modal.showModal === "function") modal.showModal();
        else modal.setAttribute("open", "");
        return;
      }
    }
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

  document.getElementById("master-use")?.addEventListener("click", () => {
    const modal = document.getElementById("master-modal");
    try { modal?.close?.(); } catch (_) {}
    act("throw", "masterball");
  });
  document.getElementById("live-feed")?.addEventListener("scroll", () => {
    const list = document.getElementById("live-feed");
    if (!list) return;
    const nearTop = list.scrollTop < 28;
    list.dataset.pinScroll = nearTop ? "0" : "1";
    if (nearTop) document.querySelector("[data-feed-jump]")?.setAttribute("hidden", "");
  });
  document.querySelector("[data-feed-jump]")?.addEventListener("click", () => {
    const list = document.getElementById("live-feed");
    if (!list) return;
    list.dataset.pinScroll = "0";
    list.scrollTop = 0;
    document.querySelector("[data-feed-jump]")?.setAttribute("hidden", "");
  });
  window.playBindTips?.(document.body);

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
