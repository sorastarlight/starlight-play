(() => {
  const supabase = window.playSupabase;
  const els = {
    stream: document.getElementById("stream-frame"),
    streamNote: document.getElementById("stream-note"),
    encounter: document.getElementById("encounter"),
    actions: document.getElementById("actions"),
    actionStatus: document.getElementById("action-status"),
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
  window.__playErrors = window.__playErrors || [];
  window.addEventListener("error", (event) => {
    window.__playErrors.push({
      type: "error",
      message: String(event.message || "error"),
      page: location.pathname,
      at: Date.now()
    });
  });
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    window.__playErrors.push({
      type: "unhandledrejection",
      message: String(reason && reason.message ? reason.message : reason || "rejection"),
      page: location.pathname,
      at: Date.now()
    });
  });
  let lureJoinRound = "";
  let acting = false;
  let pointerHeld = false;
  let lastLocalPhase = "";
  let throwViewOnly = false;
  let pickerKind = "balls";
  let joiningPending = false;
  let reconnecting = false;
  let pendingAction = null;
  let masterIntent = null;
  let actionSeq = 0;
  const actionTrace = [];
  function emptyActionMetric() {
    return {
      clicks: 0,
      rpcs: 0,
      rpcOk: 0,
      rpcAccepted: 0,
      confirmed: 0,
      authoritativeConfirmed: 0,
      dup: 0,
      fail: 0,
      firstClickOk: 0
    };
  }
  const actionMetrics = {
    join: emptyActionMetric(),
    berry: emptyActionMetric(),
    honey: emptyActionMetric(),
    none: emptyActionMetric(),
    throw: emptyActionMetric(),
    pokeball: emptyActionMetric(),
    greatball: emptyActionMetric(),
    ultraball: emptyActionMetric(),
    masterball: emptyActionMetric(),
    resultShown: 0,
    resultExpected: 0,
    duplicateSpends: 0,
    domReplaceDuringHold: 0,
    inventoryEvents: 0,
    inventoryIgnored: 0
  };
  const firstClickTracker = typeof window.playCreateFirstClickTracker === "function"
    ? window.playCreateFirstClickTracker()
    : null;
  window.__playActionTrace = actionTrace;
  window.__playActionMetrics = actionMetrics;
  let refreshGen = 0;
  let holdReleaseTimer = 0;
  let lastSnapshotAt = 0;
  let lastRpcAction = "";
  let lastRpcStatus = "";
  let lastActionError = "";
  let lastRefreshReason = "";
  let lastRoundId = "";
  let lastRealtimeEvent = "";
  let prevServerRound = null;
  let refreshCoordinator = null;
  let actionDomReplaces = 0;
  const joinedMe = new Map();

  function playDebugOn() {
    try {
      return localStorage.getItem("playDebug") === "1"
        || /(?:\?|&)playDebug=1(?:&|$)/.test(location.search);
    } catch (_) {
      return false;
    }
  }

  function nudgeEncounterIntoView() {
    const target = els.actions || els.encounter?.closest(".dex-card");
    if (!target || typeof target.scrollIntoView !== "function") return;
    try { target.scrollIntoView({ block: "nearest", behavior: "smooth" }); } catch (_) {}
  }

  function metricBucket(kind, item) {
    if (kind === "join") return "join";
    if (kind === "prepare") {
      if (item === "bait") return "honey";
      if (item === "none") return "none";
      return "berry";
    }
    if (kind === "throw") {
      if (item === "standard" || item === "pokeball" || item === "poke") return "pokeball";
      if (item === "greatball") return "greatball";
      if (item === "ultraball") return "ultraball";
      if (item === "masterball") return "masterball";
      return "throw";
    }
    return "";
  }

  function metricBuckets(kind, item) {
    const primary = metricBucket(kind, item);
    if (!primary) return [];
    if (kind === "throw" && primary !== "throw") return [primary, "throw"];
    return [primary];
  }

  function bumpMetric(names, field, amount) {
    const delta = amount == null ? 1 : amount;
    (Array.isArray(names) ? names : [names]).forEach((name) => {
      const bucket = name && actionMetrics[name];
      if (!bucket || typeof bucket !== "object") return;
      bucket[field] = Number(bucket[field] || 0) + delta;
    });
  }

  function markFirstClickConfirmed(row) {
    if (!row?.bucket) return;
    bumpMetric(metricBuckets(row.kind, row.item), "confirmed");
    bumpMetric(metricBuckets(row.kind, row.item), "authoritativeConfirmed");
    if (row.firstClick) bumpMetric(metricBuckets(row.kind, row.item), "firstClickOk");
  }

  function confirmFirstClicksFromMe(me, roundId) {
    if (!firstClickTracker) return;
    const confirmed = firstClickTracker.recordSync(me, roundId) || [];
    confirmed.forEach((row) => {
      markFirstClickConfirmed(row);
      logPlayAction("AUTHORITATIVE CONFIRMED", {
        round_id: row.roundId,
        item_key: row.item || row.kind,
        action_type: row.kind,
        request_id: row.requestId,
        via: "sync"
      });
    });
  }

  function actionLogBase(extra) {
    const round = liveRound(state);
    const me = state?.me || null;
    return {
      action_type: extra?.action_type || extra?.kind || extra?.item_key || extra?.item || "",
      round_id: extra?.round_id !== undefined ? extra.round_id : (round?.id || null),
      phase: extra?.phase !== undefined ? extra.phase : (round?.phase || ""),
      trainer_id: window._playSession?.user?.id || null,
      participant_id: me?.id || me?.participantId || (me?.joined ? (window._playSession?.user?.id || null) : null),
      request_id: extra?.request_id || pendingAction?.id || masterIntent?.id || null,
      pending: Boolean(pendingAction || masterIntent),
      pointer_held: Boolean(pointerHeld),
      ...(extra || {})
    };
  }

  function logPlayAction(stage, extra) {
    const payload = actionLogBase(extra);
    const row = { stage, at: Date.now(), ...payload };
    actionTrace.push(row);
    if (actionTrace.length > 500) actionTrace.splice(0, actionTrace.length - 500);
    if (!playDebugOn()) return;
    try {
      console.info("[play-action]", stage, payload);
    } catch (_) {}
  }

  function actionDomFrozen() {
    return Boolean(pointerHeld || pendingAction || masterIntent);
  }

  function requestRefresh(reason) {
    lastRefreshReason = reason || "sync";
    if (refreshCoordinator) return refreshCoordinator.request(reason || "sync");
    return runRefresh(reason || "sync");
  }

  function busyNow() {
    return Boolean(acting || pendingAction || masterIntent);
  }

  function freezeMasterIntent(roundId) {
    const id = `m${++actionSeq}`;
    masterIntent = { id, kind: "throw", item: "masterball", roundId: roundId || liveRound(state)?.id || null, at: Date.now() };
    pointerHeld = true;
    markLocalPending("throw", "masterball");
    logPlayAction("MASTER INTENT FROZEN", {
      action_type: "throw",
      item: "masterball",
      request_id: id,
      round_id: masterIntent.roundId
    });
  }

  function clearMasterIntent(reason) {
    if (!masterIntent) return;
    logPlayAction("MASTER INTENT CLEAR", { action_type: "throw", item: "masterball", reason: reason || "" });
    masterIntent = null;
    pointerHeld = false;
  }

  function ratingLabel(raw) {
    return typeof window.playBallRatingLabel === "function"
      ? window.playBallRatingLabel(raw)
      : String(raw || "").toUpperCase();
  }

  window.playBindAccountNav({
    onSignOut() {
      profile = null;
      lastActionKey = "";
      requestRefresh("signout");
    }
  });

  function liveRound(data) {
    const round = data?.round;
    if (!round) return null;
    const local = typeof window.playApplyLocalRound === "function" ? window.playApplyLocalRound(round) : round;
    return local;
  }

  function phaseBar(round) {
    if (typeof window.playPhaseBarPercent === "function") return window.playPhaseBarPercent(round);
    if (!round?.deadlines || !round.phase || round.phase === "closed") return 0;
    const keys = ["join", "prepare", "throw", "reveal"];
    const index = keys.indexOf(round.phase);
    const startKey = keys[index - 1];
    const start = startKey ? new Date(round.deadlines[startKey]).getTime() : new Date(round.startedAt).getTime();
    const end = new Date(round.deadlines[round.phase]).getTime();
    const now = typeof window.playRoundNowMs === "function"
      ? window.playRoundNowMs(round)
      : (round.pausedAt ? new Date(round.pausedAt).getTime() : Date.now());
    if (end <= start) return 0;
    return Math.max(0, Math.min(100, ((end - now) / (end - start)) * 100));
  }

  function attachMe(data) {
    if (!data) return data;
    const id = data.round?.id;
    const incoming = data.me && data.me.joined !== false ? data.me : (data.youJoined ? { joined: true } : null);
    if (id && incoming) {
      const prev = joinedMe.get(id) || {};
      const merged = typeof window.playKeepPlayerMe === "function"
        ? window.playKeepPlayerMe(prev, incoming)
        : (() => {
          const next = { ...prev, ...incoming };
          if (!next.prep && prev.prep) next.prep = prev.prep;
          if (!next.ball && prev.ball) next.ball = prev.ball;
          return next;
        })();
      if (merged.result == null && prev.result) merged.result = prev.result;
      const resultKind = String(merged.result || "").trim().toLowerCase();
      if (resultKind === "caught" || resultKind.startsWith("caught")) merged.caught = true;
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
    if (round?.cancelled) {
      return {
        key: `cancel:${round.id}`,
        phase: "closed",
        buttons: [],
        groups: [],
        status: (window.PLAY_STATUS?.noJoin || "No Trainers joined. The wild {pokemon} wandered away.")
          .replace("{pokemon}", species)
      };
    }
    if (!round || round.phase === "closed") {
      let closedStatus = "";
      if (round?.resolved && me) {
        const outcome = typeof window.playThrowOutcome === "function" ? window.playThrowOutcome(me, round) : "";
        if (outcome === "caught" || me.caught) closedStatus = `Caught ${species}`;
        else if (!me.ball) closedStatus = window.PLAY_STATUS?.noBallTimeout || window.PLAY_STATUS?.noBall || "You didn't choose a Poké Ball in time!";
        else if (outcome === "broke") closedStatus = `${species} broke free. Better luck next encounter!`;
      }
      const results = round?.results || {};
      return {
        key: `idle:${round?.id || ""}:${me?.result || ""}:${Number(results.caught || 0)}:${Number(results.escaped || 0)}:${Number(results.noThrow || 0)}`,
        buttons: [],
        groups: [],
        status: closedStatus
      };
    }
    if (!signedIn) {
      return { key: "signin", buttons: [], status: "Sign in to join this encounter." };
    }
    if (round.paused) {
      return {
        key: `paused:${round.id}:${round.pausedForBreak ? "ad" : "admin"}`,
        buttons: [],
        status: round.pausedForBreak
          ? (window.PLAY_STATUS?.adPause || "Encounter paused for Twitch ad break.")
          : (window.PLAY_STATUS?.adminPause || "Encounter temporarily paused.")
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
        status: phase === "reveal"
          ? (window.PLAY_STATUS?.watching || "Watching the encounter…")
          : "You're watching this encounter. Get ready for the next one!"
      };
    }
    if (capturing) {
      return {
        key: `capture:${round.id}:${me?.ball || ""}:${round.resolved || false}`,
        buttons: [],
        groups: [],
        used: me,
        status: me?.ball
          ? "The Poké Ball is shaking…"
          : me?.joined
            ? (window.PLAY_STATUS?.noBall || "No Poké Ball was thrown.")
            : (window.PLAY_STATUS?.watching || "Watching the encounter…")
      };
    }
    const lockedPrep = Boolean(me?.prep);
    const lockedBall = Boolean(me?.ball);
    const prepOpen = typeof window.playActionWindowOpen === "function"
      ? window.playActionWindowOpen(round, "prepare")
      : preparing;
    const throwOpen = typeof window.playActionWindowOpen === "function"
      ? window.playActionWindowOpen(round, "throw")
      : throwing;
    const prepActive = Boolean(me && !lockedPrep && prepOpen);
    const throwActive = Boolean(me && !lockedBall && throwOpen);
    if (joining && !me) {
      const radar = Boolean(window.playRadarOn?.(bag));
      const pending = joiningPending || radar || pendingAction?.kind === "join";
      buttons.push({
        kind: "join",
        item: "",
        label: pending ? (window.PLAY_STATUS?.joining || "JOINING…") : "JOIN ENCOUNTER",
        hint: pending ? (radar ? "Poké Radar joining…" : "Please wait…") : "Join before the timer ends!",
        disabled: pending,
        joining: pending
      });
    }
    if (joining && me) {
      const radar = Boolean(window.playRadarOn?.(bag));
      buttons.push({
        kind: "join",
        item: "",
        label: window.PLAY_STATUS?.joinedShort || "✓ JOINED!",
        hint: radar ? "Poké Radar joined this encounter for you." : (window.PLAY_STATUS?.waitingOthers || "Waiting for other Trainers…"),
        disabled: true,
        joined: true
      });
    }
    if (preparing && me) {
      const owned = window.playOwnedBerries(bag, data?.captureItems);
      const berries = owned.map((row) => ({
        kind: "prepare",
        item: row.key,
        label: row.name,
        qty: row.qty,
        effect: row.description || "Makes this Pokémon easier to catch.",
        selected: me.prep === row.key,
        disabled: !prepActive || row.qty < 1,
        reason: me.prep && me.prep !== row.key ? "ENCOUNTER LOCKED" : (row.qty < 1 ? "OUT OF STOCK" : ""),
        sprite: row.key
      }));
      const honeyQty = Number(bag.bait || 0);
      const honey = {
        kind: "prepare",
        item: "bait",
        label: "Honey",
        qty: honeyQty,
        effect: "Community catch support. Helps everyone in this encounter. Does not replace your Poké Ball or guarantee a catch.",
        selected: me.prep === "bait",
        disabled: !prepActive || honeyQty < 1,
        reason: me.prep && me.prep !== "bait" ? "ENCOUNTER LOCKED" : (honeyQty < 1 ? "OUT OF STOCK" : ""),
        sprite: "bait"
      };
      const skip = {
        kind: "prepare",
        item: "none",
        label: "No item",
        effect: "Save your supplies. You can still throw a Poké Ball.",
        selected: me.prep === "none",
        disabled: !prepActive,
        reason: lockedPrep && me.prep !== "none" ? "ENCOUNTER LOCKED" : "",
        sprite: "berry"
      };
      if (prepActive || lockedPrep) {
        buttons.push(...berries, honey, skip);
      }
    }
    if (throwing && me) {
      const prefs = window.playEncounterSettings(data?.encounterSettings);
      const advice = Array.isArray(data?.ballAdvice) ? data.ballAdvice : [];
      const adviceMap = new Map(advice.map((row) => [row.ballId, row]));
      const owned = window.playOwnedBalls(bag);
      const ownedMap = new Map(owned.map((row) => [row.key, row]));
      const infoOf = (key) => ownedMap.get(key) || window.playBallInfo?.(key) || { key, name: window.playItemLabel?.(key) || key };
      let keys = Array.isArray(prefs.favoriteBalls) ? prefs.favoriteBalls.slice() : [];
      if (me.ball && me.ball !== "standard" && !keys.includes(me.ball)) keys.push(me.ball);
      keys = keys.filter((key, index, list) => key && list.indexOf(key) === index);
      keys = keys.filter((key) => {
        if (me.ball === key) return true;
        const qty = Number(bag[key] ?? adviceMap.get(key)?.quantity ?? 0);
        return qty > 0;
      });
      const ballRow = (key) => {
        const rec = adviceMap.get(key);
        const info = infoOf(key);
        const qty = Number(bag[key] ?? rec?.quantity ?? 0);
        const selected = me.ball === key;
        return {
          kind: "throw",
          item: key,
          key,
          label: rec?.name || info.name || key,
          qty,
          effect: rec?.description || info.effect || "A Poké Ball for this encounter.",
          effectiveness: rec?.effectiveness,
          recommended: Boolean(rec?.recommended),
          specialist: Boolean(rec?.specialist),
          selected,
          disabled: lockedBall || !throwActive || qty < 1,
          reason: lockedBall && !selected ? "ENCOUNTER LOCKED" : (qty < 1 ? "OUT OF STOCK" : ""),
          sprite: key
        };
      };
      let rows = keys.map(ballRow);
      // Never invent a free client-side Ball when the bag is empty.
      buttons.push(...rows);
      if (!lockedBall) {
        buttons.push({
          kind: "open-balls",
          item: "more",
          label: window.PLAY_STATUS?.otherBalls || "Other Poké Balls",
          effect: window.PLAY_STATUS?.otherBallsHint || "Choose any Poké Ball from your bag.",
          disabled: !throwActive,
          sprite: "premierball"
        });
      }
    }
    const waiting = window.PLAY_STATUS?.waitingOthers || "Waiting for other Trainers…";
    const emptyThrow = throwing && me && !me.ball
      && (typeof window.playThrowableTotal === "function" ? window.playThrowableTotal(bag) < 1 : !buttons.some((row) => row.kind === "throw"));
    let status = "";
    if (joining && !me && joiningPending) status = "";
    else if (joining && me) status = "";
    else if (preparing && me?.prep) {
      status = window.playStatusItem ? window.playStatusItem(me.prep) : waiting;
    } else if (throwing && me?.ball) {
      status = window.playStatusBall ? window.playStatusBall(me.ball) : waiting;
    } else if (preparing && me) status = "";
    else if (emptyThrow) status = window.PLAY_STATUS?.emptyBalls || "You don't have a Poké Ball available for this encounter. Restock at Starlight Mart.";
    else if (throwing && me && !buttons.length) status = window.PLAY_STATUS?.emptyBalls || "You don't have a Poké Ball available for this encounter.";
    else if (throwing && me) status = "";
    else if (joining && !me) status = "";
    if (reconnecting) status = window.PLAY_STATUS?.reconnect || "Reconnecting…";
    else if (lastActionError && !pendingAction) status = lastActionError;
    return {
      key: `${phase || ""}:${buttons.map((row) => `${row.kind}:${row.item || ""}`).join("|")}`,
      buttons,
      status,
      phase,
      readyBall: throwing && me?.ball && !buttons.some((row) => row.kind === "throw") ? me.ball : "",
      used: capturing ? me : null
    };
  }

  function applyPendingRows(buttons) {
    if (!pendingAction || !Array.isArray(buttons)) return;
    buttons.forEach((row) => {
      const match = row.kind === pendingAction.kind && String(row.item || "") === String(pendingAction.item || "");
      row.disabled = true;
      if (!match) return;
      if (row.kind === "join") {
        row.joining = true;
        row.selected = false;
        row.pending = false;
        row.label = window.PLAY_STATUS?.joining || "JOINING…";
        return;
      }
      row.selected = true;
      row.pending = true;
    });
  }

  function patchActionButtons(plan) {
    plan.buttons.forEach((row) => {
      const btn = els.actions.querySelector(`[data-kind="${row.kind}"][data-item="${row.item}"]`);
      if (!btn) return;
      if (row.kind === "join") {
        const joining = Boolean(row.joining);
        const joined = Boolean(row.joined);
        btn.disabled = Boolean(row.disabled || joining || joined);
        btn.classList.toggle("is-joining", joining && !joined);
        btn.classList.toggle("is-joined", joined);
        btn.classList.remove("is-pending", "is-selected");
        btn.setAttribute("aria-pressed", joined ? "true" : "false");
        btn.setAttribute("aria-busy", joining && !joined ? "true" : "false");
        const strong = btn.querySelector("strong");
        if (strong && strong.textContent !== row.label) strong.textContent = row.label;
        const hint = btn.querySelector("em");
        if (hint && row.hint != null) hint.textContent = row.hint;
        return;
      }
      const pending = Boolean(row.pending);
      const selected = Boolean(row.selected);
      btn.classList.toggle("is-pending", pending);
      btn.classList.toggle("is-selected", selected && !pending);
      btn.disabled = Boolean(row.disabled);
      btn.classList.toggle("is-locked-out", Boolean(row.disabled && !row.selected && row.reason === "ENCOUNTER LOCKED"));
      btn.setAttribute("aria-pressed", selected ? "true" : "false");
      btn.setAttribute("aria-busy", pending ? "true" : "false");
      const mark = btn.querySelector(".enc-selected-mark");
      if (mark) {
        mark.textContent = pending
          ? (row.kind === "throw" ? (window.PLAY_STATUS?.readying || "READYING…") : (window.PLAY_STATUS?.selecting || "SELECTING…"))
          : (row.kind === "throw" ? "✓ READY" : "✓ SELECTED");
      }
      const rating = btn.querySelector(".ball-rating");
      if (rating) {
        if (pending) {
          rating.textContent = window.PLAY_STATUS?.readying || "READYING…";
          rating.className = "ball-rating enc-badge is-state";
        } else if (selected) {
          rating.textContent = "✓ READY";
          rating.className = "ball-rating enc-badge is-state";
        } else {
          const label = ratingLabel(row.effectiveness) || "STANDARD";
          rating.textContent = label;
          rating.className = `ball-rating enc-badge is-${label.toLowerCase()}`;
        }
      }
      const qty = btn.querySelector(".enc-qty, .ball-count");
      if (qty && row.qty != null) {
        const next = `×${row.qty}`;
        if (qty.textContent !== next) qty.textContent = next;
      }
    });
    if (plan.status) setActionStatus(plan);
  }

  function markLocalPending(kind, item) {
    const buttons = els.actions.querySelectorAll("button[data-kind]");
    buttons.forEach((btn) => {
      const match = btn.dataset.kind === kind && String(btn.dataset.item || "") === String(item || "");
      if (kind === "join") {
        if (!match) return;
        btn.classList.add("is-joining");
        btn.classList.remove("is-pending", "is-selected", "is-joined");
        btn.setAttribute("aria-pressed", "false");
        btn.setAttribute("aria-busy", "true");
        btn.disabled = true;
        const strong = btn.querySelector("strong");
        if (strong) strong.textContent = window.PLAY_STATUS?.joining || "JOINING…";
        const hint = btn.querySelector("em");
        if (hint) hint.textContent = "Please wait…";
        return;
      }
      btn.classList.toggle("is-pending", match);
      btn.classList.toggle("is-selected", false);
      btn.disabled = true;
      btn.setAttribute("aria-pressed", match ? "true" : "false");
      btn.setAttribute("aria-busy", match ? "true" : "false");
      const mark = btn.querySelector(".enc-selected-mark");
      if (mark && match) {
        mark.textContent = kind === "throw"
          ? (window.PLAY_STATUS?.readying || "READYING…")
          : (window.PLAY_STATUS?.selecting || "SELECTING…");
      }
      const rating = btn.querySelector(".ball-rating");
      if (rating && match) {
        rating.textContent = window.PLAY_STATUS?.readying || "READYING…";
        rating.className = "ball-rating enc-badge is-state";
      }
    });
    els.throwGrid?.querySelectorAll("button[data-throw], button[data-prep]").forEach((btn) => { btn.disabled = true; });
  }

  function setActionStatus(plan) {
    if (plan?.statusHtml) els.actionStatus.innerHTML = plan.statusHtml;
    else els.actionStatus.textContent = plan?.status || "";
    if (els.actionStatus) els.actionStatus.hidden = !plan?.status && !plan?.statusHtml;
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
    const joiningClass = row.kind === "join" && row.joining ? " is-joining" : "";
    const joinedClass = row.kind === "join" && row.joined ? " is-joined" : "";
    const selectedClass = row.kind === "join" ? "" : (row.selected ? " is-selected" : "");
    return `<button type="button" class="item-btn${joinClass}${joiningClass}${joinedClass}${selectedClass}" data-kind="${row.kind}" data-item="${row.item}" ${disabled} aria-pressed="${row.joined || row.selected ? "true" : "false"}" aria-busy="${row.joining ? "true" : "false"}">
      ${icon}
      <span class="item-copy"><strong>${row.label}</strong>${row.hint ? `<em>${row.hint}</em>` : ""}${row.selected ? `<span class="enc-selected-mark">SELECTED ✓</span>` : ""}</span>
    </button>`;
  }

  function renderActions(data) {
    const plan = actionPlan(data);
    applyPendingRows(plan.buttons);
    if (acting && !pendingAction) {
      plan.buttons.forEach((row) => {
        row.disabled = true;
        if (row.selected) row.pending = true;
      });
    }
    const structure = plan.buttons?.length && typeof window.playActionStructureKey === "function"
      ? window.playActionStructureKey({ phase: plan.phase, buttons: plan.buttons })
      : "";
    const key = structure ? `${plan.phase || ""}:${structure}` : plan.key;
    const canPatch = Boolean(els.actions.querySelector("button[data-kind]"));
    if (actionDomFrozen() && lastActionKey) {
      refreshQueued = true;
      if (refreshCoordinator) refreshCoordinator.markNeeded("actions");
      if (canPatch) patchActionButtons(plan);
      if (plan.status) setActionStatus(plan);
      return;
    }
    if (key === lastActionKey) {
      if (canPatch) patchActionButtons(plan);
      if (plan.status) setActionStatus(plan);
      return;
    }
    lastActionKey = key;
    setActionStatus(plan);
    const berries = plan.buttons.filter((row) => row.kind === "prepare" && row.item !== "bait" && row.item !== "none");
    const honey = plan.buttons.filter((row) => row.kind === "prepare" && row.item === "bait");
    const skip = plan.buttons.filter((row) => row.kind === "prepare" && row.item === "none");
    const balls = plan.buttons.filter((row) => row.kind === "throw");
    const moreBalls = plan.buttons.filter((row) => row.kind === "open-balls");
    const joins = plan.buttons.filter((row) => row.kind === "join");
    const tip = plan.phase === "join" && joins.some((row) => !row.joined && !row.joining)
      ? (typeof window.playTipHtml === "function" ? window.playTipHtml("first-join", window.PLAY_STATUS.firstJoin) : "")
      : plan.phase === "prepare" && !data?.me?.prep
        ? (typeof window.playTipHtml === "function" ? window.playTipHtml("first-prep", window.PLAY_STATUS.firstPrep) : "")
        : plan.phase === "throw" && !data?.me?.ball
          ? (typeof window.playTipHtml === "function" ? window.playTipHtml("first-throw", window.PLAY_STATUS.firstThrow) : "")
          : "";
    let html = "";
    if (joins.length) html += `<div class="enc-join">${joins.map(renderActionCard).join("")}</div>`;
    if (berries.length || honey.length || skip.length) {
      html += `<div class="enc-split enc-hud-in">
        <section class="enc-pane">
          <h3>Berry</h3>
          <p class="muted">Personal effect — helps only your catch.</p>
          <div class="enc-card-row">${berries.length ? berries.map(renderActionCard).join("") : `<p class="muted">${window.PLAY_STATUS?.emptyItems || "No encounter items available."}</p>`}</div>
        </section>
        <section class="enc-pane">
          <h3>Honey</h3>
          <p class="muted">Community contribution — helps the whole encounter. Does not replace your Poké Ball.</p>
          <div class="enc-card-row">${honey.map(renderActionCard).join("")}</div>
        </section>
      </div>
      <div class="enc-skip enc-hud-in">${skip.map(renderActionCard).join("")}</div>`;
    }
    if (plan.readyBall && !balls.length) {
      const label = window.playItemLabel(plan.readyBall);
      html += `<div class="enc-ready enc-hud-in" role="status">
        <p class="enc-ready-kicker">READY TO THROW</p>
        <img src="${window.playItemSprite(plan.readyBall)}" alt="">
        <strong>${window.playEscapeAttr(label)}</strong>
        <em>${acting ? (window.PLAY_STATUS?.readying || "READYING…") : (window.PLAY_STATUS?.waitingOthers || "Waiting for other Trainers…")}</em>
      </div>`;
    }
    if (balls.length) {
      html += `<div class="enc-ball-scroller enc-hud-in" role="list">${balls.map(renderActionCard).join("")}</div>`;
    }
    if (moreBalls.length) {
      html += `<div class="enc-more-balls enc-hud-in">${moreBalls.map(renderActionCard).join("")}</div>`;
    }
    if (plan.used && typeof window.playUsedSummaryHtml === "function") {
      html += window.playUsedSummaryHtml(plan.used, liveRound(data));
    }
    const round = liveRound(data);
    if (round && typeof window.playCommunityResultReady === "function"
      ? window.playCommunityResultReady(round, data?.me)
      : round?.resolved) {
      if (typeof window.playCatchFanfareHtml === "function") html += window.playCatchFanfareHtml(round);
    }
    els.actions.classList.toggle("single", joins.length === 1 && plan.buttons.length === 1);
    els.actions.classList.toggle("throw-picks", balls.length > 0);
    els.actions.classList.toggle("enc-actions", true);
    actionDomReplaces += 1;
    if (actionDomFrozen()) {
      actionMetrics.domReplaceDuringHold += 1;
      logPlayAction("ACTION DOM REPLACEMENT DURING HOLD", {
        key,
        phase: plan.phase || "",
        round_id: liveRound(data)?.id || null,
        replaces: actionDomReplaces,
        timestamp: Date.now()
      });
    } else {
      logPlayAction("ACTION DOM REPLACEMENT", {
        key,
        phase: plan.phase || "",
        round_id: liveRound(data)?.id || null,
        replaces: actionDomReplaces,
        timestamp: Date.now()
      });
    }
    els.actions.innerHTML = `${tip}${html}`;
  }

  function openThrowBalls(bag, mode) {
    if (!els.throwModal || !els.throwGrid) return;
    if (mode === "throw" && state?.me?.ball) return;
    throwViewOnly = mode === "view";
    pickerKind = "balls";
    if (els.throwTitle) {
      els.throwTitle.textContent = throwViewOnly
        ? "Your Poké Balls"
        : (window.PLAY_STATUS?.otherBalls || "Other Poké Balls");
    }
    if (els.throwHint) {
      els.throwHint.textContent = throwViewOnly
        ? "Balls you own. Recommendations come from this encounter — not a raw multiplier."
        : (window.PLAY_STATUS?.otherBallsHint || "Choose any Poké Ball from your bag.");
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
      els.throwGrid.innerHTML = `<p class="muted">You don’t have any Poké Balls right now. Buy more in the <a href="./store.html">Mart</a>.</p>`;
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
      els.throwGrid.innerHTML = `<p class="muted">You don’t have any Berries right now. Buy more in the Mart.</p>`;
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
    if (!round || round.paused || acting || pendingAction || !me) return;
    if (!me.prep && prefs.autoPrep && prefs.defaultPrep !== "ask"
      && (typeof window.playActionWindowOpen === "function"
        ? window.playActionWindowOpen(round, "prepare")
        : round.phase === "prepare")) {
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
    if ((typeof window.playActionWindowOpen === "function"
      ? window.playActionWindowOpen(round, "throw")
      : round.phase === "throw") && !me.ball && prefs.autoThrow) {
      const favorite = window.playFavoriteBalls(bag, prefs).find((row) => Number(bag[row.key] || 0) > 0);
      const item = favorite?.key || "";
      if (item && maybeAutoAct._throw !== round.id) {
        maybeAutoAct._throw = round.id;
        act("throw", item);
      }
    }
  }

  let noticedRound = "";
  let specialIncomingRound = "";
  function maybeShowCatchNotices(round, me) {
    if (!round?.id || noticedRound === round.id) return;
    if (typeof window.playCommunityResultReady !== "function" || !window.playCommunityResultReady(round, me)) return;
    noticedRound = round.id;
    actionMetrics.resultShown += 1;
    const outcome = typeof window.playThrowOutcome === "function"
      ? window.playThrowOutcome(me, round)
      : (me?.caught ? "caught" : "");
    const caught = outcome === "caught";
    const opts = {
      source: "capture",
      species: round.dex,
      variant: round.variant || "normal",
      gender: round.gender || "",
      caughtName: window.playDisplayName?.(round, { plain: true }) || "",
      noSummary: !caught
    };
    setTimeout(async () => {
      let notices = [];
      if (typeof window.playShowNotices === "function") {
        notices = await window.playShowNotices(opts) || [];
      }
      if (!round.specialEvent || typeof window.playSpecialPresentation !== "function" || typeof window.playPresentEnqueue !== "function") return;
      const newDex = notices.some((row) => row.type === "pokedex" && Number(row.species) === Number(round.dex));
      const kind = caught && newDex ? "caught" : (outcome === "broke" ? "escaped" : "");
      if (!kind) return;
      const ev = window.playSpecialPresentation(kind, {
        species: round.dex,
        title: round.specialEvent.title,
        eventType: round.specialEvent.eventType,
        remainingRounds: round.specialEvent.remainingRounds,
        variant: round.variant
      });
      if (ev) {
        window.playPresentEnqueue([{ ...ev, id: `special-${kind}:${round.id}` }], { noSummary: true, source: "special-result", preview: false });
      }
    }, 900);
  }

  function maybeShowSpecialIncoming(round) {
    if (!round?.id || specialIncomingRound === round.id) return;
    if (!round.specialEvent || round.resolved || round.phase === "closed" || round.phase === "reveal") return;
    if (typeof window.playSpecialPresentation !== "function" || typeof window.playPresentEnqueue !== "function") return;
    specialIncomingRound = round.id;
    const ev = window.playSpecialPresentation("incoming", {
      species: round.dex,
      title: round.specialEvent.title,
      eventType: round.specialEvent.eventType,
      variant: round.variant
    });
    if (ev) {
      window.playPresentEnqueue([{ ...ev, id: `special-in:${round.id}` }], { noSummary: true, source: "special-incoming" });
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

  function catchCount(data) {
    const trainer = data?.trainer || {};
    const n = Number(
      trainer.caught
      ?? trainer.catches
      ?? trainer.catchCount
      ?? trainer.totalCatches
      ?? data?.stats?.catches
      ?? NaN
    );
    if (Number.isFinite(n)) return n;
    return null;
  }

  function renderFirstRunGuide(view) {
    const mount = document.getElementById("play-first-guide");
    if (!mount) return;
    const round = liveRound(view);
    const catches = catchCount(view);
    const zeroCatch = catches === 0;
    const live = Boolean(view?.live);
    // Join guidance lives in the action tip so the primary JOIN button stays adjacent.
    let message = "";
    let tipKey = "";
    if (!round && zeroCatch && live) {
      message = window.PLAY_STATUS?.nextZero || "Join a wild encounter to catch your first Pokémon.";
      tipKey = "next-zero";
    }
    if (!message || !tipKey) {
      mount.hidden = true;
      mount.innerHTML = "";
      return;
    }
    const tip = typeof window.playTipHtml === "function"
      ? window.playTipHtml(tipKey, message)
      : `<aside class="play-tip"><p>${window.playEscapeAttr(message)}</p></aside>`;
    if (!tip) {
      mount.hidden = true;
      mount.innerHTML = "";
      return;
    }
    mount.hidden = false;
    mount.innerHTML = tip;
  }

  function render(data) {
    let incomingRound = data?.round
      ? (typeof window.playMergeRoundSnapshot === "function"
        ? window.playMergeRoundSnapshot(prevServerRound, data.round)
        : data.round)
      : data?.round;
    if (typeof window.playKeepHeldRound === "function") {
      incomingRound = window.playKeepHeldRound(incomingRound, prevServerRound);
    }
    if (incomingRound?.id && incomingRound.id !== lastRoundId) {
      if (pendingAction && pendingAction.roundId !== incomingRound.id) pendingAction = null;
      joiningPending = false;
      lastActionKey = "";
      lastLocalPhase = "";
      lastRoundId = incomingRound.id;
    }
    if (!incomingRound) lastRoundId = "";
    prevServerRound = incomingRound || null;
    state = attachMe({ ...data, round: incomingRound });
    confirmFirstClicksFromMe(state?.me || null, incomingRound?.id || null);
    const trainer = state?.trainer || {};
    window._playTrainerName = trainer.displayName || trainer.display_name || trainer.name || profile?.display_name || "";
    window._playTrainerLogin = trainer.twitchLogin || trainer.twitch_login || profile?.twitch_login || "";
    const round = liveRound(state);
    const view = { ...state, round };
    const pickerStale = pickerKind === "berries"
      ? Boolean(state?.me?.prep) || round?.phase !== "prepare"
      : Boolean(state?.me?.ball) && !throwViewOnly;
    if ((!round || round.paused || pickerStale) && els.throwModal?.open) {
      try { els.throwModal.close(); } catch (_) {}
    }
    const key = `${round?.id || "none"}:${round ? "live" : "idle"}:${round?.variant || ""}:${round?.hidden || false}`;
    const bar = phaseBar(round);
    const patchOpts = { me: state?.me || null };
    const prevPhase = lastLocalPhase;
    lastLocalPhase = round?.phase || lastLocalPhase;
    const hasLiveDom = Boolean(els.encounter?.querySelector(".dex-stage"));
    const paintFull = () => {
      const live = Boolean(state?.live);
      const status = window.PLAY_STATUS || {};
      els.encounter.innerHTML = window.playRenderEncounter(round, {
        bar,
        showLastAction: false,
        throwBall: state?.me?.ball || "pokeball",
        me: state?.me || null,
        streamLive: live,
        emptyTitle: live ? status.idleLive : status.idleOffline,
        emptyNote: live ? status.idleLiveHint : status.idleOfflineHint
      });
      lastEncounterKey = key;
      renderFirstRunGuide(view);
    };
    if (key !== lastEncounterKey || Boolean(round) !== hasLiveDom) {
      paintFull();
    } else if (hasLiveDom) {
      window.playPatchEncounter(els.encounter, round, bar, patchOpts);
    }
    const bag = state?.bag;
    window.playFillLurePanel(bag);
    const storeLink = document.querySelector(".bag-store");
    if (storeLink) storeLink.hidden = Boolean(round && ["prepare", "throw", "reveal"].includes(round.phase));
    els.encounter?.closest(".dex-card")?.classList.toggle("is-encounter-live", Boolean(round && round.phase && round.phase !== "closed"));
    window.playRenderLiveFeed(data?.console || [], null, round);
    renderActions(view);
    if (round?.phase && round.phase !== prevPhase) nudgeEncounterIntoView();
    maybeShowCatchNotices(round, state?.me);
    maybeShowSpecialIncoming(round);
    if (typeof window.playSpecialMount === "function") {
      window.playSpecialMount(document.getElementById("special-upcoming"), data?.specialEvent);
    }
    if (!busyNow()) {
      maybeRadarJoin(view);
      maybeAutoAct(view);
    }
    window.playSetAccountNav(window._playSession || null, profile, {
      isAdmin: Boolean(data?.isAdmin),
      trainer: data?.trainer
    });
    const welcome = document.querySelector(".welcome-links");
    if (welcome) welcome.hidden = Boolean(window._playSession);
    const required = data?.settings?.clientBuild;
    window.__playServerBuild = required || "";
    const update = document.getElementById("play-update");
    if (typeof window.playRenderBuildNotice === "function") {
      window.playRenderBuildNotice({
        el: update,
        required,
        round,
        busy: busyNow()
      });
    } else if (update) {
      update.hidden = !(required && window.PLAY_BUILD && String(required) !== String(window.PLAY_BUILD));
    }
    const build = document.getElementById("play-build");
    if (build && window.PLAY_BUILD && playDebugOn()) {
      build.hidden = false;
      build.textContent = `Client build: ${window.PLAY_BUILD}`;
    } else if (build) {
      build.hidden = true;
    }
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
  async function runRefresh(reason) {
    const gen = ++refreshGen;
    refreshQueued = false;
    lastRefreshReason = reason || "sync";
    logPlayAction("REFRESH START", { reason: lastRefreshReason, round_id: liveRound(state)?.id || null });
    try {
      const data = await window.playCall("play_sync", { p_round_id: liveRound(state)?.id || null });
      if (gen !== refreshGen) return;
      lastSnapshotAt = Date.now();
      reconnecting = false;
      if (data?.channel !== undefined) loadStream(data.channel);
      logPlayAction("REFRESH COMPLETE", {
        reason: lastRefreshReason,
        round_id: data?.round?.id || null,
        phase: data?.round?.phase || "",
        subsequent_sync: Boolean(pendingAction || lastRpcStatus === "ok"),
        authoritative_choice: data?.me?.prep || data?.me?.ball || ""
      });
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
    if (acting || pendingAction) {
      bumpMetric(metricBuckets(kind, item), "dup");
      actionMetrics.duplicateSpends += 1;
      logPlayAction("ACT BLOCKED DUPLICATE", { action_type: kind, item_key: item || kind });
      return;
    }
    if (liveRound(state)?.paused) {
      els.actionStatus.textContent = "This encounter is paused.";
      return;
    }
    if (kind === "throw" && item === "masterball" && masterIntent) {
      const liveId = liveRound(state)?.id || null;
      if (masterIntent.roundId && liveId && masterIntent.roundId !== liveId) {
        clearMasterIntent("round-changed");
        lastActionKey = "";
        renderActions({ ...state, round: liveRound(state) });
        return;
      }
    }
    const requestId = masterIntent?.id || `a${++actionSeq}`;
    const roundId = liveRound(state)?.id || null;
    const bucketNames = metricBuckets(kind, item);
    const firstForClick = bucketNames.length > 0;
    acting = true;
    pointerHeld = false;
    clearTimeout(holdReleaseTimer);
    pendingAction = { id: requestId, kind, item, roundId, at: Date.now() };
    if (masterIntent) masterIntent = null;
    if (kind === "join") joiningPending = true;
    bumpMetric(bucketNames, "rpcs");
    logPlayAction("ITEM CLICK", {
      round_id: roundId,
      item_key: item || kind,
      action_type: kind,
      request_id: requestId,
      timestamp: pendingAction.at
    });
    markLocalPending(kind, item);
    const prevMe = roundId ? { ...(joinedMe.get(roundId) || { joined: true }) } : null;
    if (roundId && (kind === "prepare" || kind === "throw") && typeof window.playKeepPlayerMe === "function") {
      joinedMe.set(roundId, window.playKeepPlayerMe(
        prevMe,
        null,
        kind === "prepare" ? { prep: item } : { ball: item }
      ));
    }
    lastRpcAction = `${kind}:${item || ""}`;
    lastRpcStatus = "pending";
    lastActionError = "";
    logPlayAction("RPC START", {
      round_id: roundId,
      item_key: item || kind,
      action_type: kind,
      request_id: requestId,
      phase: liveRound(state)?.phase || ""
    });
    try {
      const data = kind === "join"
        ? await window.playCall("play_join", { p_round_id: roundId })
        : kind === "prepare"
          ? await window.playCall("play_prepare", { p_item: item, p_round_id: roundId })
          : await window.playCall("play_throw", { p_item: item, p_round_id: roundId });
      lastRpcStatus = "ok";
      lastActionError = "";
      const payloadConfirms = kind === "join"
        ? (data?.me?.joined !== false)
        : (typeof window.playRpcPayloadConfirmsAction === "function"
          ? window.playRpcPayloadConfirmsAction(kind, item, data?.me)
          : Boolean(kind === "prepare" ? data?.me?.prep : data?.me?.ball));
      const returnedChoice = kind === "prepare"
        ? (data?.me?.prep || "")
        : kind === "throw"
          ? (data?.me?.ball || "")
          : (data?.me?.joined ? "joined" : "");
      bumpMetric(bucketNames, "rpcOk");
      bumpMetric(bucketNames, "rpcAccepted");
      if (kind === "throw") actionMetrics.resultExpected += 1;
      const tracked = firstClickTracker?.recordRpcAccepted({
        bucket: bucketNames[0] || "",
        kind,
        item,
        roundId,
        requestId,
        firstClick: firstForClick,
        payloadConfirms: kind === "join" ? true : payloadConfirms,
        rpcOk: true
      });
      if (tracked?.justConfirmed) markFirstClickConfirmed(tracked);
      logPlayAction("ITEM RPC SUCCESS", {
        round_id: roundId,
        item_key: item || kind,
        action_type: kind,
        request_id: requestId,
        rpc_accepted: true,
        payload_confirms: Boolean(payloadConfirms),
        authoritative_choice: returnedChoice || (tracked?.justConfirmed ? (item || kind) : ""),
        prep: data?.me?.prep || "",
        ball: data?.me?.ball || ""
      });
      if (!payloadConfirms && kind !== "join") {
        logPlayAction("RPC PAYLOAD CONFIRMATION UNAVAILABLE", {
          round_id: roundId,
          item_key: item || kind,
          action_type: kind,
          request_id: requestId
        });
      }
      if (pendingAction?.id !== requestId) return;
      reconnecting = false;
      if (kind === "join") joiningPending = false;
      if (kind === "join" && roundId) joinedMe.set(roundId, data?.me || { joined: true });
      if ((kind === "prepare" || kind === "throw") && roundId) {
        const keep = typeof window.playKeepPlayerMe === "function"
          ? window.playKeepPlayerMe
          : (prev, incoming, choice) => ({ ...prev, ...(incoming || {}), ...(choice || {}), joined: true });
        joinedMe.set(roundId, keep(
          joinedMe.get(roundId) || prevMe || { joined: true },
          data?.me,
          kind === "prepare" ? { prep: item } : { ball: item }
        ));
      }
      if (kind === "prepare" && item) window.playRememberUsed?.("berries", item);
      if (kind === "throw" && item) window.playRememberUsed?.("balls", item);
      if (kind === "throw" && els.throwModal?.open && !throwViewOnly) {
        try { els.throwModal.close(); } catch (_) {}
      }
      pendingAction = null;
      acting = false;
      render(data);
    } catch (error) {
      lastRpcStatus = "error";
      bumpMetric(bucketNames, "fail");
      logPlayAction("ITEM RPC FAILURE", {
        round_id: roundId,
        item_key: item || kind,
        action_type: kind,
        request_id: requestId,
        phase: liveRound(state)?.phase || "",
        serverPhase: liveRound(state)?.serverPhase || "",
        error: String(error?.message || error || "error"),
        code: String(error?.code || error?.details || "")
      });
      if (pendingAction?.id !== requestId) return;
      pendingAction = null;
      acting = false;
      if (roundId && prevMe && (kind === "prepare" || kind === "throw")) joinedMe.set(roundId, prevMe);
      if (kind === "join") joiningPending = false;
      const message = window.playHumanRpcError ? window.playHumanRpcError(error) : window.playRpcError(error);
      const shown = kind === "join" && /phase has already ended|joining/i.test(message)
        ? (window.PLAY_STATUS?.joinFailed || "Unable to join this encounter.")
        : (kind === "prepare"
          ? (/phase has already ended|phase just ended/i.test(message)
            ? "That phase just ended. Nothing was used. Get ready to choose your Poké Ball!"
            : (message || "Your item couldn't be selected. Nothing was used. Try again."))
          : (kind === "throw" && /phase has already ended|phase just ended/i.test(message)
            ? "That phase just ended. No Poké Ball was thrown."
            : message));
      lastActionError = shown;
      els.actionStatus.textContent = shown;
      lastActionKey = "";
      if (/phase has ended/i.test(message)) {
        lastEncounterKey = "";
        requestRefresh("phase-ended");
      } else {
        renderActions({ ...state, round: liveRound(state) });
      }
    } finally {
      if (pendingAction?.id === requestId) pendingAction = null;
      acting = false;
      pointerHeld = false;
      clearTimeout(holdReleaseTimer);
      if (refreshQueued || refreshCoordinator?.snapshot?.().needed) requestRefresh("action");
    }
  }

  function pressAction(button) {
    if (!button || button.disabled || busyNow()) return;
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
        freezeMasterIntent(liveRound(state)?.id || null);
        if (typeof modal.showModal === "function") modal.showModal();
        else modal.setAttribute("open", "");
        return;
      }
    }
    act(button.dataset.kind, button.dataset.item || "");
  }

  function armActionHold() {
    pointerHeld = true;
    clearTimeout(holdReleaseTimer);
  }

  function releaseActionHold() {
    clearTimeout(holdReleaseTimer);
    holdReleaseTimer = setTimeout(() => {
      pointerHeld = false;
      if (refreshQueued || refreshCoordinator?.snapshot?.().needed) requestRefresh("pointerup");
    }, 0);
  }

  els.actions.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const button = event.target.closest("button[data-kind]");
    if (!button || button.disabled || busyNow()) return;
    logPlayAction("pointerdown", {
      round_id: liveRound(state)?.id || null,
      phase: liveRound(state)?.phase || "",
      item: button.dataset.item || button.dataset.kind,
      action_type: button.dataset.kind,
      timestamp: Date.now()
    });
    armActionHold();
  });
  els.actions.addEventListener("click", (event) => {
    if (event.target.closest("[data-dismiss-tip]")) return;
    const button = event.target.closest("button[data-kind]");
    if (!button) return;
    logPlayAction("click", {
      round_id: liveRound(state)?.id || null,
      phase: liveRound(state)?.phase || "",
      item: button.dataset.item || button.dataset.kind,
      action_type: button.dataset.kind,
      timestamp: Date.now()
    });
    if (button.disabled || busyNow()) {
      event.preventDefault();
      bumpMetric(metricBuckets(button.dataset.kind, button.dataset.item || ""), "dup");
      if (button.disabled && button.dataset.kind !== "join") {
        const why = button.getAttribute("title") || "";
        if (why && els.actionStatus) els.actionStatus.textContent = why;
      }
      return;
    }
    event.preventDefault();
    clearTimeout(holdReleaseTimer);
    bumpMetric(metricBuckets(button.dataset.kind, button.dataset.item || ""), "clicks");
    pressAction(button);
  });
  window.addEventListener("pointerup", () => {
    logPlayAction("pointerup", { timestamp: Date.now(), round_id: liveRound(state)?.id || null, action_type: pendingAction?.kind || "" });
    releaseActionHold();
  });
  window.addEventListener("pointercancel", () => {
    releaseActionHold();
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
        freezeMasterIntent(liveRound(state)?.id || null);
        if (typeof modal.showModal === "function") modal.showModal();
        else modal.setAttribute("open", "");
        return;
      }
    }
    if (acting || pendingAction || masterIntent) return;
    els.throwGrid.querySelectorAll("button[data-throw], button[data-prep]").forEach((btn) => { btn.disabled = true; });
    els.throwModal?.close?.();
    act(kind, item);
  }

  els.throwGrid?.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const button = event.target.closest("button[data-throw], button[data-prep]");
    if (!button || button.disabled || throwViewOnly || busyNow()) return;
    armActionHold();
  });
  els.throwGrid?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-throw], button[data-prep]");
    if (!button) return;
    if (button.disabled || throwViewOnly || busyNow()) {
      event.preventDefault();
      const gridKind = button.dataset.throw ? "throw" : "prepare";
      const gridItem = button.dataset.throw || button.dataset.prep;
      bumpMetric(metricBuckets(gridKind, gridItem), "dup");
      return;
    }
    event.preventDefault();
    clearTimeout(holdReleaseTimer);
    const gridKind = button.dataset.throw ? "throw" : "prepare";
    const gridItem = button.dataset.throw || button.dataset.prep;
    bumpMetric(metricBuckets(gridKind, gridItem), "clicks");
    pickFromGrid(button);
  });

  async function loadProfile() {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    window._playSession = session;
    if (typeof window.playSetTipUser === "function") {
      window.playSetTipUser(session?.user?.id || "");
    }
    if (!session) {
      profile = null;
      window.playSetAccountNav(null);
      bindInventoryRealtime(null);
      await requestRefresh("session");
      return;
    }
    if (typeof window.playGuardTwitchLogin === "function") {
      const allowed = await window.playGuardTwitchLogin();
      if (!allowed) return;
    }
    bindInventoryRealtime(session.user.id);
    const { data } = await supabase.from("profiles").select("display_name, twitch_login, avatar_url, username").eq("id", session.user.id).maybeSingle();
    profile = data;
    window.playSetAccountNav(session, profile);
    await requestRefresh("session");
  }

  async function heartbeat() {
    if (document.visibilityState !== "visible") return;
    if (!window._playSession) return;
    try {
      await window.playCall("play_heartbeat", { p_seconds: 20 });
    } catch (_) {
      // Rankings still work if the heartbeat RPC is not live yet.
    }
    requestRefresh("heartbeat");
  }

  function scheduleRefresh(reason) {
    requestRefresh(reason || "realtime");
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
      if (!els.encounter?.querySelector(".encounter-visual-stage")) {
        lastEncounterKey = "";
        render({ ...state, round });
      }
      return;
    }
    if (round.phase && round.phase !== lastLocalPhase) {
      lastLocalPhase = round.phase;
      if (!actionDomFrozen()) {
        renderActions({ ...state, round });
        nudgeEncounterIntoView();
      }
      else refreshQueued = true;
      maybeShowCatchNotices(round, state?.me);
      maybeShowSpecialIncoming(round);
      requestRefresh("phase");
      return;
    }
    if (actionDomFrozen()) {
      maybeShowCatchNotices(round, state?.me);
      maybeShowSpecialIncoming(round);
      return;
    }
    renderActions({ ...state, round });
    maybeShowCatchNotices(round, state?.me);
    maybeShowSpecialIncoming(round);
  }

  document.getElementById("master-use")?.addEventListener("click", () => {
    act("throw", "masterball");
    const modal = document.getElementById("master-modal");
    try { modal?.close?.("confirm"); } catch (_) {}
  });
  document.getElementById("master-modal")?.addEventListener("close", () => {
    if (acting || pendingAction) return;
    if (!masterIntent) return;
    clearMasterIntent("cancel");
    lastActionKey = "";
    renderActions({ ...state, round: liveRound(state) });
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

  refreshCoordinator = typeof window.playCreateRefreshCoordinator === "function"
    ? window.playCreateRefreshCoordinator({
      frozen: () => actionDomFrozen(),
      run: (reason) => runRefresh(reason)
    })
    : null;

  window.__playEncounterDebug = function playEncounterDebug() {
    const round = liveRound(state);
    const coord = refreshCoordinator?.snapshot?.() || {};
    const me = state?.me || null;
    return {
      roundId: round?.id || null,
      trainerId: window._playSession?.user?.id || null,
      participantJoined: Boolean(me?.joined || me),
      serverPhase: round?.serverPhase || prevServerRound?.phase || "",
      clientPhase: round?.phase || "",
      highestPhase: round?.highestPhase || prevServerRound?.highestPhase || "",
      pendingAction,
      masterIntent,
      metrics: actionMetrics,
      firstClickAwaiting: firstClickTracker?.awaiting?.() || [],
      selectedPrep: me?.prep || "",
      selectedBall: me?.ball || "",
      lastRpc: lastRpcAction,
      lastRpcStatus,
      lastRpcError: lastActionError,
      lastSnapshotAt,
      lastRealtimeEvent,
      lastRefreshReason,
      inventoryBag: state?.bag || null,
      actionDomReplaces,
      syncInFlight: Boolean(coord.inFlight),
      refreshQueued: Boolean(refreshQueued || coord.needed),
      resultState: round?.resolved ? "resolved" : (round?.cancelled ? "cancelled" : (round ? "live" : "idle")),
      clientBuild: window.PLAY_BUILD || "",
      serverBuild: window.__playServerBuild || "",
      pointerHeld,
      build: typeof window.__starlightBuildInfo === "function" ? window.__starlightBuildInfo() : null
    };
  };

  if (typeof window.__starlightBuildInfo === "function") {
    const prev = window.__starlightBuildInfo;
    window.__starlightBuildInfo = function starlightBuildInfoPlay() {
      const info = prev();
      try {
        info.debug = playDebugOn();
      } catch (_) {}
      info.serverBuild = window.__playServerBuild || info.serverBuild || "";
      return info;
    };
  }

  let invChannel = null;
  function bindInventoryRealtime(userId) {
    if (invChannel) {
      try { supabase.removeChannel(invChannel); } catch (_) {}
      invChannel = null;
    }
    if (!userId) return;
    invChannel = supabase.channel(`play-inv-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "inventories", filter: `user_id=eq.${userId}` }, (payload) => {
        actionMetrics.inventoryEvents += 1;
        const changed = payload?.new?.user_id || payload?.old?.user_id || "";
        if (changed && changed !== userId) {
          actionMetrics.inventoryIgnored += 1;
          return;
        }
        lastRealtimeEvent = "inventory";
        if (actionDomFrozen()) {
          refreshQueued = true;
          refreshCoordinator?.markNeeded("inventory");
          return;
        }
        scheduleRefresh("inventory");
      })
      .subscribe();
  }

  supabase.auth.onAuthStateChange((event) => { if (window.playAuthNoise(event)) return; loadProfile(); });
  supabase.channel("play-live")
    .on("postgres_changes", { event: "*", schema: "public", table: "encounter_rounds" }, () => { lastRealtimeEvent = "round"; scheduleRefresh("round"); })
    .on("postgres_changes", { event: "*", schema: "public", table: "encounter_activity" }, () => { lastRealtimeEvent = "activity"; scheduleRefresh("activity"); })
    .on("postgres_changes", { event: "*", schema: "public", table: "play_console_log" }, () => {
      if (actionDomFrozen()) {
        refreshQueued = true;
        refreshCoordinator?.markNeeded("console");
        return;
      }
      scheduleRefresh("console");
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "stream_status" }, () => scheduleRefresh("stream"))
    .subscribe();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") requestRefresh("reconnect");
  });
  setInterval(tickLive, 200);
  setInterval(() => {
    if (document.visibilityState !== "visible") return;
    requestRefresh(liveRound(state) ? "safety" : "idle");
  }, 12000);
  setInterval(heartbeat, 20000);
  loadProfile();
  window.playBindLureButton((data) => {
    if (actionDomFrozen()) {
      refreshQueued = true;
      refreshCoordinator?.markNeeded("lure");
      return;
    }
    lastActionKey = "";
    render(data);
  });
})();

