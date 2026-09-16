(() => {
  const root = typeof window !== "undefined" ? window : globalThis;

  root.PLAY_RESULT_HOLD_MS = 20 * 1000;
  root.PLAY_UNRESOLVED_KEEP_MS = 120 * 1000;
  root.PLAY_ROUND_IDLE_AFTER_MS = root.PLAY_RESULT_HOLD_MS;

  const PHASE_RANK = { join: 1, prepare: 2, throw: 3, reveal: 4, closed: 5 };

  function ts(value) {
    const n = Date.parse(value || "");
    return Number.isFinite(n) ? n : 0;
  }

  root.playPhaseRank = function playPhaseRank(phase) {
    return PHASE_RANK[phase] || 0;
  };

  root.playLocalPhase = function playLocalPhase(round, nowMs) {
    if (!round || round.cancelled) return "closed";
    const d = round.deadlines || {};
    const pause = Date.parse(round.pausedAt || "");
    const freeze = round.paused && Number.isFinite(pause) && !round.resolved;
    const now = freeze ? pause : (Number.isFinite(nowMs) ? nowMs : Date.now());
    const at = (key) => {
      const t = Date.parse(d[key] || "");
      return Number.isFinite(t) ? t : 0;
    };
    const join = at("join");
    const prepare = at("prepare");
    const throwAt = at("throw");
    const reveal = at("reveal");
    if (!join || !prepare || !throwAt || !reveal) {
      return round.phase || "closed";
    }
    if (now < join) return "join";
    if (now < prepare) return "prepare";
    if (now < throwAt) return "throw";
    if (now < reveal) return "reveal";
    return "closed";
  };

  root.playRoundIdleAt = function playRoundIdleAt(round) {
    if (!round) return 0;
    const hold = root.PLAY_RESULT_HOLD_MS || 12000;
    const updated = ts(round.updatedAt || round.updated_at || round.resolvedAt);
    if (round.cancelled) {
      return (updated || Date.now()) + hold;
    }
    if (round.resolved) {
      const from = updated || ts(round.deadlines?.reveal || round.endsAt || "");
      if (!from) return 0;
      return from + hold;
    }
    const reveal = ts(round.deadlines?.reveal || round.endsAt || "");
    if (!reveal) return 0;
    return reveal + (root.PLAY_UNRESOLVED_KEEP_MS || 120000);
  };

  root.playServerNowMs = function playServerNowMs(round, fallbackMs) {
    const sent = Date.parse(round?.serverNow || "");
    const receivedAt = Number(round?.receivedAt);
    if (Number.isFinite(sent) && Number.isFinite(receivedAt) && receivedAt > 0) {
      return sent + (Date.now() - receivedAt);
    }
    return Number.isFinite(fallbackMs) ? fallbackMs : Date.now();
  };

  root.playRoundNowMs = function playRoundNowMs(round, fallbackMs) {
    if (round?.paused && round.pausedAt && !round.resolved) {
      const pause = Date.parse(round.pausedAt);
      if (Number.isFinite(pause)) return pause;
    }
    return root.playServerNowMs(round, fallbackMs);
  };

  root.playDeadlineSecondsLeft = function playDeadlineSecondsLeft(round, iso) {
    const end = Date.parse(iso || "");
    if (!Number.isFinite(end)) return 0;
    return Math.max(0, Math.ceil((end - root.playRoundNowMs(round)) / 1000));
  };

  function deadlineMs(round, key) {
    const n = Date.parse(round?.deadlines?.[key] || "");
    return Number.isFinite(n) ? n : 0;
  }

  // Matches private.prepare_action_ok / throw_action_ok (1s grace on each edge).
  root.playActionWindowOpen = function playActionWindowOpen(round, kind) {
    if (!round || round.cancelled || round.paused) return false;
    const now = root.playRoundNowMs(round);
    const join = deadlineMs(round, "join");
    const prepare = deadlineMs(round, "prepare");
    const throwAt = deadlineMs(round, "throw");
    if (!join || !prepare || !throwAt) {
      return (round.serverPhase || round.phase) === kind;
    }
    if (kind === "prepare") return now >= join - 1000 && now < prepare + 1000;
    if (kind === "throw") return now >= prepare - 1000 && now < throwAt + 1000;
    return false;
  };

  root.playMergeRoundSnapshot = function playMergeRoundSnapshot(prev, incoming) {
    if (!incoming) return incoming;
    const stamped = { ...incoming, receivedAt: Date.now(), serverPhase: incoming.serverPhase || incoming.phase };
    if (!prev || prev.id !== incoming.id) {
      return { ...stamped, highestPhase: stamped.phase || "join" };
    }
    const prevTs = ts(prev.updatedAt);
    const nextTs = ts(incoming.updatedAt);
    if (nextTs && prevTs && nextTs < prevTs) {
      return prev;
    }
    const floor = prev.highestPhase || prev.phase;
    const nextRank = root.playPhaseRank(incoming.phase);
    const floorRank = root.playPhaseRank(floor);
    let phase = incoming.phase;
    let highestPhase = floor;
    if (nextRank < floorRank && !(nextTs > prevTs)) {
      phase = prev.phase;
    } else if (nextTs > prevTs && nextRank < floorRank) {
      highestPhase = incoming.phase;
    } else if (nextRank >= floorRank) {
      highestPhase = incoming.phase;
    }
    return { ...stamped, phase, highestPhase, serverPhase: incoming.phase };
  };

  root.playApplyLocalRound = function playApplyLocalRound(round, nowMs) {
    if (!round) return null;
    const snapshotPhase = round.serverPhase || round.phase;
    const now = Number.isFinite(nowMs) ? nowMs : root.playRoundNowMs(round);
    const idleAt = root.playRoundIdleAt(round);
    if (idleAt && now >= idleAt && !round.paused) return null;
    if (round.cancelled) {
      return { ...round, phase: "closed", endsAt: round.endsAt, highestPhase: round.highestPhase || "closed", serverPhase: snapshotPhase };
    }
    const local = root.playLocalPhase(round, now);
    const freeze = round.paused && !round.resolved;
    const revealAt = ts(round.deadlines?.reveal || round.endsAt || "");
    const revealPassed = Boolean(revealAt) && now >= revealAt && !freeze;
    const shown = revealPassed
      ? ((round.resolved || round.cancelled) ? "closed" : "reveal")
      : local;
    const highestPhase = root.playPhaseRank(shown) >= root.playPhaseRank(round.highestPhase || round.phase)
      ? shown
      : (round.highestPhase || round.phase);
    const ends = round.deadlines?.[shown] || round.endsAt;
    return { ...round, phase: shown, endsAt: ends || round.endsAt, highestPhase, serverPhase: snapshotPhase };
  };

  root.playKeepHeldRound = function playKeepHeldRound(incoming, prev, nowMs) {
    if (incoming) return incoming;
    if (!prev) return incoming;
    const idleAt = root.playRoundIdleAt(prev);
    const now = Number.isFinite(nowMs) ? nowMs : root.playRoundNowMs(prev);
    if (idleAt && now < idleAt) return prev;
    return incoming;
  };

  root.playKeepPlayerMe = function playKeepPlayerMe(prev, incoming, choice) {
    const base = prev && typeof prev === "object" ? prev : {};
    const src = incoming && typeof incoming === "object" ? incoming : null;
    const next = { ...base, ...(src || {}), joined: true };
    if ((src == null || src.prep == null || src.prep === "") && base.prep) next.prep = base.prep;
    if ((src == null || src.ball == null || src.ball === "") && base.ball) next.ball = base.ball;
    if ((src == null || src.result == null || src.result === "") && base.result) next.result = base.result;
    if ((src == null || src.caught == null) && base.caught != null) next.caught = base.caught;
    if (choice?.prep) next.prep = choice.prep;
    if (choice?.ball) next.ball = choice.ball === "standard" ? "pokeball" : choice.ball;
    return next;
  };

  root.playActionStructureKey = function playActionStructureKey(plan) {
    const items = (plan?.buttons || []).map((row) => `${row.kind}:${row.item || ""}`).join("|");
    return items;
  };

  root.playReduceActionUi = function playReduceActionUi(prev, event) {
    const current = prev && typeof prev === "object" ? prev : { status: "IDLE", selected: "", pending: false };
    const type = event?.type;
    if (type === "click") {
      return { status: "PENDING", selected: event.item || "", pending: true };
    }
    if (type === "snapshot") {
      if (current.status === "PENDING") {
        return current;
      }
      const selected = event.selected || current.selected || "";
      if (event.phaseEnded) {
        return { status: "PHASE_ENDED", selected, pending: false };
      }
      if (selected) return { status: "CONFIRMED", selected, pending: false };
      return { status: "IDLE", selected: "", pending: false };
    }
    if (type === "success") {
      return { status: "CONFIRMED", selected: event.item || current.selected || "", pending: false };
    }
    if (type === "fail") {
      const phaseEnded = Boolean(event.phaseEnded);
      return {
        status: phaseEnded ? "PHASE_ENDED" : "ERROR",
        selected: "",
        pending: false,
        error: event.error || true
      };
    }
    return current;
  };

  root.playCreateRefreshCoordinator = function playCreateRefreshCoordinator(opts) {
    const run = opts?.run;
    const frozen = typeof opts?.frozen === "function" ? opts.frozen : () => false;
    let inFlight = false;
    let needed = false;
    let reason = "";
    function snapshot() {
      return { inFlight, needed, reason };
    }
    async function request(nextReason) {
      if (nextReason) reason = nextReason;
      if (frozen(reason || "sync")) {
        needed = true;
        return snapshot();
      }
      if (inFlight) {
        needed = true;
        return snapshot();
      }
      inFlight = true;
      needed = false;
      const used = reason || "sync";
      reason = "";
      try {
        await run(used);
      } finally {
        inFlight = false;
        if (needed && !frozen("followup")) {
          needed = false;
          await request(reason || "followup");
        }
      }
      return snapshot();
    }
    return {
      request,
      markNeeded(nextReason) {
        needed = true;
        if (nextReason) reason = nextReason;
      },
      snapshot
    };
  };

  // Test instrumentation only. Does not change RPC contracts.
  // A first-click PASS is: one physical click → one logical request → RPC accepted
  // → authoritative state confirms the same selection (RPC payload OR later sync).
  root.playExpectedActionChoice = function playExpectedActionChoice(kind, item) {
    if (kind === "join") return "joined";
    if (kind === "throw" && (item === "standard" || item === "poke")) return "pokeball";
    return item || "";
  };

  root.playRpcPayloadConfirmsAction = function playRpcPayloadConfirmsAction(kind, item, me) {
    if (!me) return false;
    if (kind === "join") return me.joined !== false;
    if (kind === "prepare") {
      const prep = me.prep;
      return prep != null && String(prep) !== "" && (!item || prep === item);
    }
    if (kind === "throw") {
      const expected = root.playExpectedActionChoice(kind, item);
      return me.ball != null && String(me.ball) !== "" && me.ball === expected;
    }
    return false;
  };

  root.playAuthoritativeConfirmsAction = function playAuthoritativeConfirmsAction(kind, item, me) {
    return root.playRpcPayloadConfirmsAction(kind, item, me);
  };

  root.playCreateFirstClickTracker = function playCreateFirstClickTracker() {
    const awaiting = [];
    return {
      awaiting() {
        return awaiting.slice();
      },
      recordRpcAccepted(row) {
        const next = {
          bucket: row.bucket || "",
          kind: row.kind,
          item: row.item || "",
          roundId: row.roundId || null,
          requestId: row.requestId || "",
          firstClick: Boolean(row.firstClick),
          rpcAccepted: true,
          payloadConfirms: Boolean(row.payloadConfirms),
          syncConfirms: false,
          confirmed: Boolean(row.payloadConfirms) || (row.kind === "join" && row.rpcOk !== false)
        };
        if (next.confirmed) return { ...next, justConfirmed: true };
        awaiting.push(next);
        return { ...next, justConfirmed: false };
      },
      recordSync(me, roundId) {
        const confirmed = [];
        for (let i = awaiting.length - 1; i >= 0; i -= 1) {
          const row = awaiting[i];
          if (roundId && row.roundId && row.roundId !== roundId) continue;
          if (root.playAuthoritativeConfirmsAction(row.kind, row.item, me)) {
            row.syncConfirms = true;
            row.confirmed = true;
            awaiting.splice(i, 1);
            confirmed.push(row);
          }
        }
        return confirmed;
      }
    };
  };
})();
