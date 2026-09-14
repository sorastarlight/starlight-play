(() => {
  window.playBagIsFull = function playBagIsFull(bag) {
    const used = Number(bag?.used || 0);
    const cap = Number(bag?.capacity || 0);
    return cap > 0 && used >= cap;
  };

  window.playBagFullCopy = function playBagFullCopy(bag) {
    const cap = Number(bag?.capacity || 0);
    const max = window.PLAY_BAG_MAX || 10000;
    if (cap >= max) {
      return "Your bag is full. That’s the 10,000 item maximum — use some items to make space.";
    }
    return "Your bag is full. Buy a Pouch on the Store for more space, or use some items first.";
  };

  window.playFillBagMeter = function playFillBagMeter(bag) {
    const note = document.getElementById("capacity-note");
    const bar = document.getElementById("capacity-bar");
    const meter = bar?.parentElement;
    const warn = document.getElementById("bag-full-warn");
    const wallet = document.getElementById("coin-wallet");
    const used = Number(bag?.used || 0);
    const cap = Number(bag?.capacity || 50);
    const pct = Math.round((used / Math.max(1, cap)) * 100);
    const full = window.playBagIsFull(bag);
    if (note) {
      note.textContent = `${used} / ${cap} item space`;
      note.classList.toggle("bag-warn", full);
    }
    if (bar) bar.style.width = `${Math.min(100, pct)}%`;
    if (meter) meter.classList.toggle("is-full", full);
    if (wallet && bag && Number.isFinite(Number(bag.used))) {
      wallet.classList.toggle("bag-warn", full);
    }
    if (warn) {
      warn.hidden = !full;
      warn.textContent = full ? window.playBagFullCopy(bag) : "";
    }
  };

  window.playRenderBagStrip = function playRenderBagStrip(bag) {
    const items = [
      ["coins", "Coins"],
      ["berry", "Oran Berry"],
      ["bait", "Honey"],
      ["pokeball", "Poké Ball"],
      ["greatball", "Great"],
      ["ultraball", "Ultra"],
      ["lure", "Poké Radar"]
    ];
    (window.PLAY_BERRIES || []).forEach((row) => {
      if (row.key !== "berry" && Number(bag?.[row.key] || 0) > 0) items.splice(2, 0, [row.key, row.name]);
    });
    (window.PLAY_BALLS || []).forEach((row) => {
      if (row.extra && Number(bag?.[row.key] || 0) > 0) items.splice(items.length - 1, 0, [row.key, row.name]);
    });
    if (!bag) {
      return `<p class="muted">Sign in to see your inventory.</p>`;
    }
    return `<ul class="bag-strip inv-strip">${items.map(([key, label]) => (
      `<li><img src="${window.playItemSprite(key)}" alt=""><span>${label}</span><strong>${key === "coins" && typeof window.playCoinsHtml === "function" ? window.playCoinsHtml(bag[key] ?? 0) : (bag[key] ?? 0)}</strong></li>`
    )).join("")}</ul>`;
  };

  window.playRadarOn = function playRadarOn(bag) {
    return Boolean(bag?.lureArmed) && Boolean(window.playRadarLeft(bag?.lureUntil) || (bag?.lureArmed && !bag?.lureUntil));
  };

  window.playRadarLeft = function playRadarLeft(until) {
    const ms = new Date(until || 0).getTime() - Date.now();
    if (!(ms > 0)) return "";
    const total = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")} left`;
  };

  window.playFillLurePanel = function playFillLurePanel(bag) {
    const panel = document.getElementById("lure-panel");
    if (!panel) return;
    const button = document.getElementById("use-lure");
    const help = document.getElementById("lure-help");
    const countEl = document.getElementById("lure-count");
    const qtyLabel = document.getElementById("lure-qty-label");
    const eyebrow = document.getElementById("lure-eyebrow");
    const title = document.getElementById("lure-title");
    const count = Number(bag?.lure || 0);
    const left = window.playRadarLeft(bag?.lureUntil);
    const on = typeof window.playRadarOn === "function" ? window.playRadarOn(bag) : Boolean(bag?.lureArmed);
    const signedIn = Boolean(bag);

    panel.classList.toggle("is-active", on);
    panel.classList.toggle("is-empty", !on && (!signedIn || count < 1));
    window._playBag = bag || null;
    if (countEl) countEl.textContent = signedIn ? String(count) : "0";
    if (qtyLabel) qtyLabel.textContent = !signedIn ? "sign in" : on ? left : count < 1 ? "none" : "ready";
    if (eyebrow) eyebrow.textContent = !signedIn ? "Nearby Pokémon" : on ? "Scanning" : count < 1 ? "Need a Poké Radar" : "Nearby Pokémon";
    if (title) title.textContent = !signedIn ? "Activate a Poké Radar" : on ? "Poké Radar is on" : count < 1 ? "No Poké Radar yet" : "Activate a Poké Radar";
    if (button) {
      button.disabled = !signedIn || on || count < 1;
      button.textContent = !signedIn
        ? "Sign in to activate"
        : on ? `Scanning · ${left}` : count < 1 ? "Need a Poké Radar" : "Activate Poké Radar";
    }
    if (help) {
      help.textContent = !signedIn
        ? "Sign in with Twitch to turn on a Poké Radar from this screen."
        : on
          ? `Automatically detects nearby Pokémon and joins you to any encounter that appears. ${left}.`
          : count < 1
            ? "You don’t have a Poké Radar yet. Get one from a Power-Up, a Pass crate, or the Store."
            : "Automatically detects nearby Pokémon and joins you to any encounter that appears. Lasts 30 minutes.";
    }
  };

  window.playBindLureButton = function playBindLureButton(onDone) {
    if (!window._playRadarTick) {
      window._playRadarTick = setInterval(() => {
        if (window._playBag) window.playFillLurePanel(window._playBag);
      }, 1000);
    }
    const button = document.getElementById("use-lure");
    if (!button || button.dataset.bound === "1") return;
    button.dataset.bound = "1";
    button.addEventListener("click", async () => {
      const status = document.getElementById("lure-status") || document.getElementById("inv-status") || document.getElementById("action-status");
      if (status) status.textContent = "Turning on Poké Radar…";
      button.disabled = true;
      try {
        const data = await window.playCall("play_use_lure");
        window.playFillLurePanel(data.bag);
        if (status) status.textContent = data.message || "Poké Radar is on for 30 minutes.";
        onDone?.(data);
      } catch (error) {
        if (status) status.textContent = window.playRpcError(error);
        window.playFillLurePanel(window._playBag || null);
      }
    });
  };

  window.playRenderPlayKit = function playRenderPlayKit(bag) {
    if (!bag) {
      return `<p class="muted">Sign in to see Berries, Honey, and Poké Radar.</p>`;
    }
    const berries = window.playOwnedBerries(bag).reduce((sum, row) => sum + row.qty, 0);
    const items = [
      ["berry", "Berries", berries],
      ["bait", "Honey", bag.bait ?? 0],
      ["lure", "Radar", bag.lure ?? 0]
    ];
    return `<ul class="bag-strip play-kit">${items.map(([key, label, qty]) => (
      `<li><img src="${window.playItemSprite(key)}" alt=""><span>${label}</span><strong>${qty}</strong></li>`
    )).join("")}</ul>
      <button type="button" id="view-balls" class="secondary view-balls">View Poké Balls</button>`;
  };

  window.playGenderChipHtml = function playGenderChipHtml(gender) {
    const key = String(gender || "");
    if (key === "Male") return `<span class="type-chip gender-chip is-male">Male ♂</span>`;
    if (key === "Female") return `<span class="type-chip gender-chip is-female">Female ♀</span>`;
    if (key === "Genderless") return `<span class="type-chip gender-chip is-none">Genderless</span>`;
    return `<span class="type-chip gender-chip is-none">${window.playEscapeAttr(key || "Unknown")}</span>`;
  };

  window.playRenderEncounter = function playRenderEncounter(round, options) {
    const opts = options || {};
    if (!round) {
      return `
        <div class="dex-idle">
          <div class="dex-idle-field" aria-hidden="true">
            <span class="dex-idle-cloud"></span>
            <span class="dex-idle-cloud is-two"></span>
            <i></i><i></i><i></i><i></i>
          </div>
          <div class="dex-idle-copy">
            <span class="dex-idle-mark">?</span>
            <p class="wild-label">Searching</p>
            <h2>The tall grass is quiet</h2>
            <p class="muted">${opts.emptyNote || "A wild Pokémon will appear here when Sora starts an encounter."}</p>
          </div>
        </div>`;
    }
    const name = window.playDisplayName(round, { plain: true });
    const fullName = window.playDisplayName(round);
    const seconds = window.playEncounterSecondsLeft(round);
    const phase = window.playPhaseLabel(round.phase);
    const timeText = typeof window.playEncounterTimeText === "function"
      ? window.playEncounterTimeText(round)
      : (round.paused ? "PAUSED" : (seconds ? `${seconds}s left` : "Waiting"));
    const warnClass = typeof window.playTimerWarnClass === "function"
      ? window.playTimerWarnClass(seconds)
      : "";
    const sprite = window.playSpriteUrl(round.dex, round.variant);
    const shiny = String(round.variant || "").includes("shiny");
    const location = window.playHabitat(round.dex, round.location);
    const hidden = round.hidden ? `<span class="chip warn">Hidden</span>` : "";
    const paused = round.paused
      ? `<span class="chip pause">${round.pausedForBreak ? "Ad break" : "Paused"}</span>`
      : "";
    const live = round.phase && round.phase !== "closed";
    const honey = opts.showHoney === false
      ? ""
      : (typeof window.playHoneyMeterHtml === "function" && round.phase && round.phase !== "closed"
        ? window.playHoneyMeterHtml(round)
        : window.playHoneyCrewHtml(round));
    const staffPanel = opts.staff ? window.playStaffRoundHtml(round) : "";
    const catchSeq = opts.staff ? "" : window.playCatchSeqHtml(round, opts);
    const seqScene = catchSeq ? window.playAdvanceCatchSeqState(round, opts.me || null).scene : "";
    const lastAction = opts.showLastAction === false
      ? ""
      : (round.lastAction ? `<p class="last-action" data-last>${round.lastAction}</p>` : `<p class="last-action" data-last hidden></p>`);
    const header = live
      ? `<div class="dex-head dex-live-fanfare">
          <span class="live-burst">LIVE</span>
          <strong>A wild Pokémon appeared!</strong>
          ${hidden}
          ${paused}
        </div>`
      : `<div class="dex-head"><span class="dex-ended">Encounter ended</span>${hidden}${paused}</div>`;
    return `
      ${header}
      <div class="dex-stage${seqScene === "results" ? " is-revealed" : catchSeq ? " is-throwing" : ""}">
        ${sprite ? `<img src="${sprite}" alt="${fullName}" onerror="window.playSpriteOnError(this)">` : ""}
        <div class="dex-copy">
          <p class="wild-label">A wild</p>
          <h2>${name}</h2>
          <div class="wild-meta">
            ${window.playGenderChipHtml(round.gender)}
            ${shiny ? `<span class="type-chip gender-chip is-shiny">Shiny</span>` : ""}
            <span class="type-chip location-chip">${window.playEscapeAttr(location)}</span>
          </div>
        </div>
      </div>
      <div class="phase-wrap ${warnClass}" data-phase-wrap>
        <div class="phase-label"><span data-phase-name>${phase}</span><span data-time-copy>${timeText}</span></div>
        <div class="phase-bar" aria-hidden="true"><i data-bar style="width:${opts.bar || 0}%"></i></div>
      </div>
      <dl class="dex-stats">
        <div><dt>Trainers</dt><dd data-stat="participants">${round.participants || 0}</dd></div>
        <div><dt>Prepared</dt><dd data-stat="prepared">${round.prepared || 0}</dd></div>
        <div><dt>Throws</dt><dd data-stat="thrown">${round.thrown || 0}</dd></div>
        <div><dt>Honey bonus</dt><dd data-stat="bait">+${round.baitBonusPercent || 0}%</dd></div>
      </dl>
      ${lastAction}
      ${honey}
      ${catchSeq}
      ${staffPanel}`;
  };

  window.playPhaseBarPercent = function playPhaseBarPercent(round) {
    if (!round?.deadlines || !round.phase || round.phase === "closed") return 0;
    const keys = ["join", "prepare", "throw", "reveal"];
    const index = keys.indexOf(round.phase);
    if (index < 0) return 0;
    const startKey = keys[index - 1];
    const start = Date.parse(startKey ? round.deadlines[startKey] : round.startedAt);
    const end = Date.parse(round.deadlines[round.phase]);
    const now = round.pausedAt ? Date.parse(round.pausedAt) : Date.now();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
    return Math.max(0, Math.min(100, ((end - now) / (end - start)) * 100));
  };

  function staffRows(round, key) {
    const rows = Array.isArray(round?.[key]) ? round[key] : [];
    if (rows.length || key !== "catchers") return rows;
    return Array.isArray(round?.results?.catchers) ? round.results.catchers : [];
  }

  window.playStaffRoundKey = function playStaffRoundKey(round) {
    const results = round?.results || {};
    return [
      round?.id || "",
      round?.phase || "",
      round?.resolved ? "1" : "0",
      staffRows(round, "throwers").length,
      staffRows(round, "catchers").length,
      results.caught || 0,
      results.escaped || 0,
      results.noThrow || 0
    ].join(":");
  };

  window.playStaffRoundHtml = function playStaffRoundHtml(round) {
    if (!round) return "";
    const throwers = staffRows(round, "throwers");
    const catchers = staffRows(round, "catchers");
    const results = round.results || null;
    const row = (entry) => {
      const ball = entry?.ball || "pokeball";
      return `<li>
        <img src="${window.playItemSprite(ball)}" alt="">
        <span>${window.playEscapeAttr(entry?.name || "Trainer")}</span>
        <em>${window.playEscapeAttr(window.playItemLabel(ball))}</em>
      </li>`;
    };
    const throwBlock = `<div class="staff-block">
      <h4>Throws <span>${throwers.length}</span></h4>
      ${throwers.length
        ? `<ul class="staff-list">${throwers.map(row).join("")}</ul>`
        : `<p class="muted">No Poké Balls locked in yet.</p>`}
    </div>`;
    const resultBlock = results
      ? `<div class="staff-block">
          <h4>Results <span>${Number(results.caught || 0)} caught</span></h4>
          <dl class="staff-tiles">
            <div><dt>Caught</dt><dd>${Number(results.caught || 0)}</dd></div>
            <div><dt>Escaped</dt><dd>${Number(results.escaped || 0)}</dd></div>
            <div><dt>No throw</dt><dd>${Number(results.noThrow || 0)}</dd></div>
          </dl>
          ${catchers.length
            ? `<ul class="staff-list">${catchers.map(row).join("")}</ul>`
            : `<p class="muted">Nobody caught it.</p>`}
        </div>`
      : `<div class="staff-block">
          <h4>Results</h4>
          <p class="muted">${round.resolved ? "Waiting on the server." : "Not rolled yet."}</p>
        </div>`;
    return `<aside class="staff-round" data-staff-round="${window.playEscapeAttr(window.playStaffRoundKey(round))}">
      ${throwBlock}
      ${resultBlock}
    </aside>`;
  };

  const catchSeqByRound = new Map();
  const SHAKE_MS = 480;
  const CATCH_CLICK_MS = 620;

  window.playShowCatchSeq = function playShowCatchSeq(round) {
    if (!round || round.cancelled) return false;
    if (round.phase === "reveal" || round.phase === "closed") return true;
    if (round.resolved) return true;
    return false;
  };

  window.playRevealSeqProgress = function playRevealSeqProgress(round) {
    const start = Date.parse(round?.deadlines?.throw || "");
    const end = Date.parse(round?.deadlines?.reveal || "");
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      return round?.resolved ? 100 : 8;
    }
    const freeze = round.paused && !round.resolved;
    const now = freeze ? Date.parse(round.pausedAt || "") : Date.now();
    const t = Number.isFinite(now) ? now : Date.now();
    return Math.max(8, Math.min(100, ((t - start) / (end - start)) * 100));
  };

  window.playThrowWaitProgress = function playThrowWaitProgress(round) {
    return window.playRevealSeqProgress(round);
  };

  function catchSeqState(roundId) {
    let st = catchSeqByRound.get(roundId);
    if (!st) {
      st = { scene: "wobble", personalAt: 0, outcome: "", shakes: 3, live: false };
      catchSeqByRound.set(roundId, st);
    }
    return st;
  }

  function seqHash(text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return Math.abs(h);
  }

  // Drama only. The server already decided; the shake count never changes the result.
  function seqShakes(round, me, outcome) {
    if (outcome === "caught") return 3;
    const chance = Number(me?.chance || 0);
    const lean = chance >= 0.45 ? 2 : chance >= 0.22 ? 1 : 0;
    return Math.max(0, Math.min(3, lean + (seqHash(`${round.id}:${me?.ball || ""}`) % 2)));
  }

  function isCaughtFlag(value) {
    return value === true || value === 1 || value === "1" || /^true$/i.test(String(value ?? ""));
  }

  function resultKind(result) {
    const text = String(result || "").trim().toLowerCase();
    if (text === "caught") return "caught";
    if (text === "escaped" || text === "no throw") return "broke";
    return "";
  }

  function inferredSoloCatch(round, me) {
    if (!round?.resolved || !me?.ball) return false;
    const caughtN = Number(round.results?.caught || 0);
    const escaped = Number(round.results?.escaped || 0);
    const noThrow = Number(round.results?.noThrow || 0);
    const thrown = Number(round.thrown || 0);
    return caughtN === 1 && escaped === 0 && noThrow === 0 && thrown <= 1;
  }

  function throwOutcome(me, round) {
    if (!me?.ball) return "";
    if (me.ball === "masterball") return "caught";
    if (isCaughtFlag(me.caught) || resultKind(me.result) === "caught") return "caught";
    if (inferredSoloCatch(round, me)) return "caught";
    if (resultKind(me.result) === "broke" || me.result) return "broke";
    return "";
  }

  // Every Trainer rolls separately, so the card reports the viewer's own result.
  function personalResult(round, me, species) {
    const caughtN = Number(round?.results?.caught || 0);
    const outcome = throwOutcome(me, round);
    if (!me?.joined && !me?.ball) {
      return {
        win: caughtN > 0,
        headline: caughtN > 0 ? "Gotcha!" : "Sorry!",
        sub: caughtN > 0
          ? `${caughtN} Trainer${caughtN === 1 ? "" : "s"} caught ${species}`
          : `Nobody caught ${species}`,
        note: ""
      };
    }
    if (!me.ball) {
      return { win: false, headline: "Oh no!", sub: "You didn't choose a Poké Ball in time!", note: "Better luck next encounter!" };
    }
    if (outcome === "caught") {
      return {
        win: true,
        headline: "Gotcha!",
        sub: `${species} was caught!`,
        note: `Caught with ${window.playItemLabel(me.ball)}`
      };
    }
    if (outcome === "broke") {
      return {
        win: false,
        headline: "Oh no!",
        sub: `${species} broke free!`,
        note: `Better luck next encounter! · ${window.playItemLabel(me.ball)}${me.prep && me.prep !== "none" && me.prep !== "bait" ? ` · ${window.playItemLabel(me.prep)}` : ""}`
      };
    }
    return {
      win: false,
      headline: "Waiting for the result…",
      sub: "",
      note: ""
    };
  }

  function catchSeqCopy(st, round, species, me) {
    if (st.scene === "results") {
      return personalResult(round, me, species).headline;
    }
    const pct = window.playRevealSeqProgress(round);
    if (pct >= 100 && !round.resolved && !throwOutcome(me, round)) return "Waiting for the result…";
    return "The Poké Ball is shaking…";
  }

  function catchSeqSubcopy(st, round, species, me) {
    if (st.scene !== "results") return "";
    return personalResult(round, me, species).sub;
  }

  function catchSeqNote(st, round, species, me) {
    if (st.scene !== "results") return "";
    return personalResult(round, me, species).note;
  }

  window.playAdvanceCatchSeqState = function playAdvanceCatchSeqState(round, me) {
    const st = catchSeqState(round.id);
    if (round.paused && !round.resolved) return st;
    const pct = window.playRevealSeqProgress(round);
    const countdownDone = pct >= 99.5 || round.phase === "closed";
    const outcome = throwOutcome(me, round);
    if (st.outcome !== "caught" && outcome === "caught") st.outcome = "caught";
    if (round.resolved && countdownDone) {
      st.outcome = outcome || st.outcome;
      // Only trainers who watched their own ball fly get the shake sequence.
      if (st.live && me?.ball) {
        if (!st.personalAt) {
          st.personalAt = Date.now();
          st.shakes = seqShakes(round, me, st.outcome);
        }
        if (Date.now() - st.personalAt < st.shakes * SHAKE_MS + CATCH_CLICK_MS) {
          st.scene = "personal";
          return st;
        }
      }
      st.scene = "results";
      return st;
    }
    st.live = true;
    st.scene = "wobble";
    st.personalAt = 0;
    return st;
  };

  window.playCatchSeqHtml = function playCatchSeqHtml(round, opts) {
    if (!window.playShowCatchSeq(round)) return "";
    const me = opts?.me || null;
    const st = window.playAdvanceCatchSeqState(round, me);
    const ballKey = opts?.throwBall || me?.ball || "pokeball";
    const species = window.playDisplayName(round, { plain: true });
    const sprite = window.playSpriteUrl(round.dex, round.variant);
    const pct = window.playRevealSeqProgress(round);
    const results = round.results || {};
    const caughtN = Number(results.caught || 0);
    const missed = Number(results.escaped || 0) + Number(results.noThrow || 0);
    const copy = catchSeqCopy(st, round, species, me);
    const sub = catchSeqSubcopy(st, round, species, me);
    const note = catchSeqNote(st, round, species, me);
    const win = st.scene === "results" && personalResult(round, me, species).win;
    const sceneClass = `is-${st.scene}${st.outcome ? ` is-${st.outcome}` : ""}${st.scene === "results" ? (win ? " is-win" : " is-miss") : ""}`;
    return `<aside class="catch-seq ${sceneClass}" data-catch-seq data-seq="${st.scene}" data-outcome="${st.outcome || ""}" style="--shakes:${st.shakes}">
      <div class="catch-seq-fx" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
      <div class="catch-seq-stage">
        ${sprite ? `<img class="catch-seq-mon" src="${sprite}" alt="" onerror="window.playSpriteOnError(this)">` : ""}
        <img class="catch-seq-ball" src="${window.playItemSprite(ballKey)}" alt="">
        <span class="catch-seq-stars" aria-hidden="true"></span>
        <span class="catch-seq-click" aria-hidden="true"></span>
      </div>
      <p class="catch-seq-copy" data-seq-copy>
        <span data-seq-headline>${window.playEscapeAttr(copy)}</span>
        <span data-seq-sub${sub ? "" : " hidden"}>${window.playEscapeAttr(sub)}</span>
      </p>
      <div class="catch-seq-bar" aria-hidden="true"><i data-throw-bar style="width:${pct}%"></i></div>
      <div class="catch-seq-counts" data-seq-results>
        <p class="catch-seq-note" data-seq-note${note ? "" : " hidden"}>${window.playEscapeAttr(note)}</p>
        <div class="catch-seq-score">
          <p class="catch-seq-score-win"><strong data-seq-caught>${caughtN}</strong><span>caught</span></p>
          <p class="catch-seq-score-miss"><strong data-seq-missed>${missed}</strong><span>didn’t catch it</span></p>
        </div>
      </div>
    </aside>`;
  };

  window.playAdvanceCatchSeq = function playAdvanceCatchSeq(root, round, me) {
    const box = root?.querySelector("[data-catch-seq]");
    if (!box || !round) return false;
    const st = window.playAdvanceCatchSeqState(round, me);
    const species = window.playDisplayName(round, { plain: true });
    const copy = catchSeqCopy(st, round, species, me);
    const sub = catchSeqSubcopy(st, round, species, me);
    const note = catchSeqNote(st, round, species, me);
    const headlineEl = box.querySelector("[data-seq-headline]");
    const subEl = box.querySelector("[data-seq-sub]");
    const noteEl = box.querySelector("[data-seq-note]");
    if (headlineEl && headlineEl.textContent !== copy) headlineEl.textContent = copy;
    if (subEl) {
      if (subEl.textContent !== sub) subEl.textContent = sub;
      subEl.hidden = !sub;
    }
    if (noteEl) {
      if (noteEl.textContent !== note) noteEl.textContent = note;
      noteEl.hidden = !note;
    }
    const bar = box.querySelector("[data-throw-bar]");
    if (bar && st.scene === "wobble") bar.style.width = `${window.playRevealSeqProgress(round)}%`;
    const results = round.results || {};
    const caughtN = Number(results.caught || 0);
    const missed = Number(results.escaped || 0) + Number(results.noThrow || 0);
    const caughtEl = box.querySelector("[data-seq-caught]");
    const missedEl = box.querySelector("[data-seq-missed]");
    if (caughtEl) caughtEl.textContent = caughtN;
    if (missedEl) missedEl.textContent = missed;
    box.dataset.seq = st.scene;
    box.dataset.outcome = st.outcome || "";
    box.style.setProperty("--shakes", String(st.shakes));
    box.classList.toggle("is-wobble", st.scene === "wobble");
    box.classList.toggle("is-personal", st.scene === "personal");
    box.classList.toggle("is-results", st.scene === "results");
    const personal = personalResult(round, me, species);
    box.classList.toggle("is-caught", st.outcome === "caught" || personal.win);
    box.classList.toggle("is-broke", st.outcome === "broke" && !personal.win);
    box.classList.toggle("is-win", st.scene === "results" && personal.win);
    box.classList.toggle("is-miss", st.scene === "results" && throwOutcome(me, round) === "broke");
    const stage = root.querySelector(".dex-stage");
    stage?.classList.toggle("is-throwing", st.scene !== "results");
    stage?.classList.toggle("is-revealed", st.scene === "results");
    return true;
  };

  window.playThrowWaitHtml = function playThrowWaitHtml(round, ball) {
    return window.playCatchSeqHtml(round, { throwBall: ball });
  };

  window.playHoneyCrewHtml = function playHoneyCrewHtml(round) {
    const rows = Array.isArray(round?.honeyTrainers) ? round.honeyTrainers : [];
    if (!rows.length) return "";
    const bonus = round.baitBonusPercent || 0;
    return `<aside class="honey-crew" data-honey="${rows.length}:${bonus}">
      <img src="${window.playItemSprite("bait")}" alt="">
      <div>
        <strong>Honey team-up</strong>
        <p>These trainers used Honey so the whole community had a better catch rate. Shared bonus <em>+${bonus}%</em>.</p>
        <ul>${rows.map((row) => `<li>${window.playEscapeAttr(row.name || "Trainer")}</li>`).join("")}</ul>
      </div>
    </aside>`;
  };

  window.playCatchFanfareHtml = function playCatchFanfareHtml(round) {
    if (!round?.resolved) return "";
    const results = round.results || {};
    const caughtN = Number(results.caught || 0);
    const missed = Number(results.escaped || 0) + Number(results.noThrow || 0);
    const species = window.playDisplayName(round);
    return `<section class="catch-fanfare${caughtN ? " is-win" : ""}">
      <p class="fanfare-kicker">Results</p>
      <h3>${window.playEscapeAttr(species)}</h3>
      <p class="result-counts"><strong>${caughtN}</strong> caught</p>
      <p class="result-counts"><strong>${missed}</strong> didn’t catch it</p>
    </section>`;
  };

  window.playPatchEncounter = function playPatchEncounter(root, round, bar, extra) {
    if (!root || !round) return false;
    if (!root.querySelector(".dex-stage")) return false;
    const seconds = window.playEncounterSecondsLeft(round);
    const phase = window.playPhaseLabel(round.phase);
    const timeText = typeof window.playEncounterTimeText === "function"
      ? window.playEncounterTimeText(round)
      : (round.paused ? "PAUSED" : (seconds ? `${seconds}s left` : "Waiting"));
    const warnClass = typeof window.playTimerWarnClass === "function"
      ? window.playTimerWarnClass(seconds)
      : "";
    const time = root.querySelector("[data-time]");
    const timeCopy = root.querySelector("[data-time-copy]");
    const phaseEl = root.querySelector("[data-phase]");
    const phaseName = root.querySelector("[data-phase-name]");
    const barEl = root.querySelector("[data-bar]");
    const last = root.querySelector("[data-last]");
    if (time) time.textContent = round.paused ? "PAUSED" : `${seconds || 0}s`;
    if (timeCopy) timeCopy.textContent = timeText;
    root.querySelector("[data-phase-wrap]")?.classList.toggle("is-warn", warnClass === "is-warn");
    root.querySelector("[data-phase-wrap]")?.classList.toggle("is-urgent", warnClass === "is-urgent");
    if (phaseEl) phaseEl.textContent = phase;
    if (phaseName) phaseName.textContent = phase;
    if (barEl) barEl.style.width = `${bar || 0}%`;
    if (extra?.staff) {
      const panel = root.querySelector("[data-staff-round]");
      if (!panel) return false;
      const key = window.playStaffRoundKey(round);
      if (panel.dataset.staffRound !== key) panel.outerHTML = window.playStaffRoundHtml(round);
    } else {
      const wantsSeq = window.playShowCatchSeq(round);
      const hasSeq = Boolean(root.querySelector("[data-catch-seq]"));
      if (wantsSeq !== hasSeq) return false;
      if (wantsSeq) window.playAdvanceCatchSeq(root, round, extra?.me || null);
    }
    if (extra?.showHoney !== false) {
      const liveHoney = round.phase && round.phase !== "closed" && typeof window.playHoneyMeterHtml === "function";
      const honeyHtml = liveHoney ? window.playHoneyMeterHtml(round) : window.playHoneyCrewHtml(round);
      const honeyEl = root.querySelector(".honey-meter, .honey-crew");
      const honeyKey = liveHoney
        ? `${round.honeyContributors || 0}:${round.honeyParticipants || 0}:${round.baitBonusPercent || 0}`
        : `${(round.honeyTrainers || []).length}:${round.baitBonusPercent || 0}`;
      if (!honeyHtml) honeyEl?.remove();
      else if (honeyEl?.dataset.honey === honeyKey) { /* already current */ }
      else if (honeyEl) honeyEl.outerHTML = honeyHtml;
      else {
        const mount = document.createElement("div");
        mount.innerHTML = honeyHtml;
        const node = mount.firstElementChild;
        const seq = root.querySelector("[data-catch-seq]");
        const lastLine = root.querySelector("[data-last]");
        const stats = root.querySelector(".dex-stats");
        if (seq) seq.before(node);
        else if (lastLine) lastLine.after(node);
        else if (stats) stats.after(node);
        else root.append(node);
      }
    }
    const setStat = (key, value) => {
      const el = root.querySelector(`[data-stat="${key}"]`);
      if (el) el.textContent = value;
    };
    setStat("participants", round.participants || 0);
    setStat("prepared", round.prepared || 0);
    setStat("thrown", round.thrown || 0);
    setStat("bait", `+${round.baitBonusPercent || 0}%`);
    if (last) {
      last.hidden = !round.lastAction;
      last.textContent = round.lastAction || "";
    }
    return true;
  };

  window.playConsoleLine = function playConsoleLine(row) {
    const name = window.playEscapeAttr(row?.name || "A trainer");
    const stamp = row?.at ? new Date(row.at) : null;
    const time = stamp && !Number.isNaN(stamp.getTime())
      ? `<time datetime="${stamp.toISOString()}">${stamp.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })}</time>`
      : `<time></time>`;
    const message = String(row?.message || "").trim();
    const ball = window.playEscapeAttr(window.playArticle(window.playItemLabel(row?.item)));
    if (row?.kind === "joined") return `<li>${time}<span><strong>${name}</strong> joined the encounter!</span></li>`;
    if (row?.kind === "prepared" && row.item === "bait") {
      return `<li class="is-honey">${time}<span><strong>${name}</strong> added Honey to the encounter!</span></li>`;
    }
    if (row?.kind === "prepared" && (row.item === "none" || !row.item)) {
      return `<li>${time}<span><strong>${name}</strong> is ready.</span></li>`;
    }
    if (row?.kind === "prepared") return `<li>${time}<span><strong>${name}</strong> is ready.</span></li>`;
    if (row?.kind === "selected") {
      return `<li>${time}<span><strong>${name}</strong> has chosen ${ball} and is ready to throw!</span></li>`;
    }
    if (row?.kind === "threw") return `<li class="is-throw">${time}<span><strong>${name}</strong> has thrown ${ball}!</span></li>`;
    if (row?.kind === "caught") {
      const mon = window.playEscapeAttr(row.item || "the Pokémon");
      const copy = message ? window.playEscapeAttr(message) : `⭐ <strong>${name}</strong> caught ${mon}!`;
      return `<li class="is-catch">${time}<span>${copy}</span></li>`;
    }
    if (row?.kind === "escaped") {
      const mon = window.playEscapeAttr(row.item || "the Pokémon");
      const copy = message
        ? window.playEscapeAttr(message)
        : `✖ <strong>${name}</strong> was unable to catch ${mon}. Better luck next encounter!`;
      return `<li class="is-escape">${time}<span>${copy}</span></li>`;
    }
    if (row?.kind === "timeout") {
      const copy = message
        ? window.playEscapeAttr(message)
        : `⌛ <strong>${name}</strong> did not choose a Poké Ball in time.`;
      return `<li class="is-timeout">${time}<span>${copy}</span></li>`;
    }
    if (row?.kind === "phase") {
      return `<li class="is-phase">${time}<span>${window.playEscapeAttr(message)}</span></li>`;
    }
    if (row?.kind === "pause") {
      return `<li>${time}<span>⏸ ${message ? window.playEscapeAttr(message) : "The encounter has been paused for a Twitch ad break."}</span></li>`;
    }
    if (row?.kind === "resume") {
      return `<li>${time}<span>▶ ${message ? window.playEscapeAttr(message) : "The encounter is resuming!"}</span></li>`;
    }
    if (row?.kind === "gift") {
      return `<li>${time}<span>${row.message ? window.playEscapeAttr(row.message) : `Staff sent +1 ${window.playEscapeAttr(window.playItemLabel(row.item))}`}</span></li>`;
    }
    if (row?.message) return `<li>${time}<span>${window.playEscapeAttr(row.message)}</span></li>`;
    return `<li>${time}<span><strong>${name}</strong></span></li>`;
  };

  window.playConsoleRows = function playConsoleRows(source, round) {
    const rows = Array.isArray(source)
      ? source.slice()
      : (Array.isArray(source?.activity) ? source.activity.slice() : []);
    const live = round || (source && !Array.isArray(source) && source.phase ? source : null);
    if (!live || (live.phase !== "reveal" && live.phase !== "closed")) return rows;
    const throwers = Array.isArray(live.throwers) ? live.throwers : [];
    if (!throwers.length) return rows;
    const have = new Set(
      rows.filter((row) => row?.kind === "threw").map((row) => String(row.name || "").toLowerCase())
    );
    const extra = [];
    for (const thrower of throwers) {
      const name = thrower?.name || "A trainer";
      if (have.has(name.toLowerCase())) continue;
      extra.push({
        name,
        kind: "threw",
        item: thrower.ball,
        at: live.deadlines?.throw || new Date().toISOString()
      });
    }
    return extra.concat(rows).sort((a, b) => {
      const ta = Date.parse(a?.at || "") || 0;
      const tb = Date.parse(b?.at || "") || 0;
      return tb - ta;
    });
  };

  window.playConsoleFilterMatch = function playConsoleFilterMatch(row, filter) {
    const kind = String(row?.kind || "");
    const text = `${row?.message || ""} ${row?.item || ""}`.toLowerCase();
    if (!filter || filter === "all") return true;
    if (filter === "results") return kind === "caught" || kind === "escaped" || kind === "timeout";
    if (filter === "ads") return kind === "pause" || kind === "resume" || /ad break|twitch ad/.test(text);
    if (filter === "system") return kind === "phase" || kind === "gift" || kind === "cancelled" || kind === "hidden" || kind === "resolved";
    if (filter === "encounter") {
      return kind === "joined" || kind === "prepared" || kind === "selected" || kind === "threw" || kind === "appeared"
        || (!kind && text);
    }
    return true;
  };

  window.playRenderLiveFeed = function playRenderLiveFeed(source, targetId, round) {
    const list = document.getElementById(targetId || "live-feed");
    if (!list) return;
    const filter = list.dataset.consoleFilter || "all";
    const rows = window.playConsoleRows(source, round).filter((row) => window.playConsoleFilterMatch(row, filter));
    const pin = list.dataset.pinScroll === "1";
    const nearTop = list.scrollTop < 28;
    if (!rows.length) {
      list.innerHTML = `<li class="muted">Waiting for trainers to join, use Honey or a Berry, and throw a ball.</li>`;
      return;
    }
    list.innerHTML = rows.map((row) => window.playConsoleLine(row)).join("");
    if (!pin || nearTop) {
      list.scrollTop = 0;
      list.dataset.pinScroll = "0";
      list.parentElement?.querySelector("[data-feed-jump]")?.setAttribute("hidden", "");
    } else {
      const jump = list.parentElement?.querySelector("[data-feed-jump]");
      if (jump) jump.removeAttribute("hidden");
    }
  };
})();
