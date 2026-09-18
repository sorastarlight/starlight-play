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
    return "Your bag is full. Buy a Pouch on the Mart for more space, or use some items first.";
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
        ? "Sign in to turn on a Poké Radar from this screen."
        : on
          ? `Automatically detects nearby Pokémon and joins you to any encounter that appears. ${left}.`
          : count < 1
            ? "You don’t have a Poké Radar yet. Get one from a Power-Up, a Pass crate, or the Mart."
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

  window.playPokemonLevel = function playPokemonLevel(round) {
    const n = Number(round?.level);
    if (!Number.isFinite(n) || n < 1) return 0;
    return Math.round(n);
  };

  window.playLevelChipHtml = function playLevelChipHtml(round) {
    const level = window.playPokemonLevel(round);
    if (!level) return "";
    return `<span class="encounter-level-chip" data-level-chip>Lv. ${level}</span>`;
  };

  window.playEncounterIsSpecial = function playEncounterIsSpecial(round) {
    if (typeof window.playSpecialIsRound === "function") return window.playSpecialIsRound(round);
    return Boolean(round?.specialEvent?.id) || String(round?.triggerSource || "") === "SPECIAL_EVENT";
  };

  window.playEncounterHeadCopy = function playEncounterHeadCopy(round, catching) {
    if (!round || !round.phase || round.phase === "closed") return "Encounter ended";
    if (catching) return "Catch in progress";
    if (window.playEncounterIsSpecial(round)) {
      const name = window.playDisplayName(round, { plain: true }) || round.name || "Pokémon";
      return `${name} appeared!`;
    }
    return "A wild Pokémon appeared!";
  };

  window.playRenderEncounter = function playRenderEncounter(round, options) {
    const opts = options || {};
    if (!round) {
      const live = opts.streamLive === true;
      const title = live
        ? (opts.emptyTitle || "Waiting for the next wild Pokémon…")
        : (opts.emptyTitle || "Sora's stream is currently offline.");
      const note = live
        ? (opts.emptyNote || "Wild Pokémon appear throughout the stream.")
        : (opts.emptyNote || "Your Pokédex, PC, Mart, and Trainer ID are still available.");
      const label = live ? "Searching" : "Offline";
      return `
        <div class="dex-idle${live ? "" : " is-offline"}">
          <div class="dex-idle-field" aria-hidden="true">
            <span class="dex-idle-cloud"></span>
            <span class="dex-idle-cloud is-two"></span>
            <i></i><i></i><i></i><i></i>
          </div>
          <div class="dex-idle-copy">
            <span class="dex-idle-mark">?</span>
            <p class="wild-label">${window.playEscapeAttr(label)}</p>
            <h2>${window.playEscapeAttr(title)}</h2>
            <p class="muted">${window.playEscapeAttr(note)}</p>
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
    const timerLabel = typeof window.playEncounterTimerLabel === "function"
      ? window.playEncounterTimerLabel(round)
      : `${phase} — ${timeText}`;
    const warnClass = typeof window.playTimerWarnClass === "function"
      ? window.playTimerWarnClass(seconds)
      : "";
    const sprite = window.playSpriteUrl(round.dex, round.variant, window.playResolveFormId?.(round));
    const shiny = String(round.variant || "").includes("shiny");
    const location = window.playHabitat(round.dex, round.location);
    const locAttrs = typeof window.playLocationVisualAttrs === "function"
      ? window.playLocationVisualAttrs(location)
      : "";
    const locClass = locAttrs ? " has-location-bg" : "";
    const hidden = round.hidden ? `<span class="chip warn" data-enc-hidden>Hidden</span>` : "";
    const isTestRound = String(round.triggerSource || "") === "TEST"
      || round?.rules?.testMode === true
      || String(round?.rules?.rewardMode || "") === "test";
    const testChip = isTestRound
      ? `<span class="chip warn" data-enc-test>TEST MODE · accelerated timers</span>`
      : "";
    const paused = round.paused
      ? `<span class="chip pause" data-enc-pause-chip>${round.pausedForBreak ? "Ad break" : "Paused"}</span>`
      : `<span class="chip pause" data-enc-pause-chip hidden>Paused</span>`;
    const live = round.phase && round.phase !== "closed";
    const honey = opts.showHoney === false
      ? ""
      : (typeof window.playHoneyMeterHtml === "function" && round.phase && round.phase !== "closed"
        ? window.playHoneyMeterHtml(round)
        : window.playHoneyCrewHtml(round));
    const staffPanel = opts.staff ? window.playStaffRoundHtml(round) : "";
    const catchSeq = window.playCatchSeqHtml(round, { ...opts, me: opts.staff ? null : opts.me });
    const seqScene = catchSeq ? window.playAdvanceCatchSeqState(round, opts.staff ? null : (opts.me || null)).scene : "";
    const cinematic = Boolean(catchSeq);
    const visualMode = !cinematic ? "wild" : (seqScene === "results" ? "result" : "capture");
    const lastAction = opts.staff || opts.showLastAction === false
      ? ""
      : (round.lastAction ? `<p class="last-action" data-last>${round.lastAction}</p>` : `<p class="last-action" data-last hidden></p>`);
    const locChip = location && !/^unknown$/i.test(location)
      ? `<p class="encounter-location-chip" data-location-chip><span aria-hidden="true">📍</span><span>${window.playEscapeAttr(location)}</span></p>`
      : "";
    const catching = Boolean(catchSeq);
    const hud = window.playEncounterStageCopy(round, catching ? window.playAdvanceCatchSeqState(round, opts.me || null) : null, opts.me || null, name);
    window._playStageIntro = window._playStageIntro || new Set();
    const introKey = `${round.id || "none"}:wild`;
    const shinyKey = `${round.id || "none"}:shiny`;
    const wildIntro = !window._playStageIntro.has(introKey);
    if (wildIntro) window._playStageIntro.add(introKey);
    const shinyIntro = shiny && !window._playStageIntro.has(shinyKey);
    if (shinyIntro) window._playStageIntro.add(shinyKey);
    const header = live
      ? `<div class="dex-head dex-live-fanfare" data-enc-head>
          <span class="live-burst">LIVE</span>
          <strong data-enc-head-copy>${window.playEncounterHeadCopy(round, catching)}</strong>
          ${hidden}
          ${testChip}
          ${paused}
        </div>`
      : `<div class="dex-head" data-enc-head><span class="dex-ended" data-enc-head-copy>Encounter ended</span>${hidden}${testChip}${paused}</div>`;
    const statText = (key) => window.playEncounterStatText(round, key);
    const thrownLabel = round.phase === "throw" ? "Ready" : (round.phase === "prepare" || round.phase === "join" ? "Prepared" : "Throws");
    const identity = `${window.playGenderChipHtml(round.gender)}${shiny ? `<span class="type-chip gender-chip is-shiny">Shiny</span>` : ""}`;
    const meta = `<div class="encounter-meta-identity">${identity}</div>${window.playLevelChipHtml(round)}`;
    return `
      ${header}
      <div class="encounter-visual-stage${cinematic ? " is-capture" : ""}${window.playEncounterIsSpecial(round) ? " is-special" : ""}${round.paused && !round.resolved ? " is-paused" : ""}${cinematic && (seqScene === "personal" || seqScene === "results" || /is-mid-seq/.test(catchSeq)) ? " is-mid-catch" : ""}${shiny ? " is-shiny-wild" : ""}${wildIntro ? " is-wild-enter" : ""}${shinyIntro ? " is-shiny-intro" : ""}${hud.showBanner && /GOTCHA|SHINY/.test(hud.banner) ? " is-win-scene" : ""}${hud.showBanner && /BROKE FREE|OH NO/.test(hud.banner) ? " is-miss-scene" : ""}${locClass}" data-visual-mode="${visualMode}"${locAttrs}>
        <div class="encounter-map" aria-hidden="true"></div>
        <div class="encounter-map-scrim" aria-hidden="true"></div>
        <div class="encounter-map-vignette" aria-hidden="true"></div>
        ${locChip}
        <p class="encounter-pause-note" data-pause-note${!round.paused || round.resolved ? " hidden" : ""}>${round.pausedForBreak ? (window.PLAY_STATUS?.adPause || "Encounter paused for Twitch ad break.") : (window.PLAY_STATUS?.adminPause || "Encounter temporarily paused.")}</p>
        <div class="encounter-stage-meta">${meta}</div>
        ${shiny ? `<div class="encounter-shiny-burst" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>` : ""}
        <p class="encounter-stage-banner" data-stage-banner${hud.showBanner ? "" : " hidden"}>${window.playEscapeAttr(hud.banner)}</p>
        <div class="dex-stage${seqScene === "results" ? " is-revealed" : catchSeq ? " is-throwing" : ""}">
          <span class="encounter-ground-shadow" aria-hidden="true"></span>
          <div class="encounter-actor-frame" data-actor-frame>
            ${sprite ? `<img class="encounter-stage-actor" src="${sprite}" alt="${fullName}" onerror="window.playSpriteOnError(this)">` : ""}
          </div>
        </div>
        ${catchSeq}
        <p class="encounter-stage-status" data-stage-status${hud.status ? "" : " hidden"}><span data-seq-status>${window.playEscapeAttr(hud.status)}</span></p>
        ${(() => {
          const escaped = round.resolved && typeof window.playThrowOutcome === "function" && window.playThrowOutcome(opts.me || null, round) === "broke";
          const hint = typeof window.playSpecialRemainingHint === "function" ? window.playSpecialRemainingHint(round.specialEvent, escaped) : "";
          return hint ? `<p class="special-event-retry" data-special-hint>${window.playEscapeAttr(hint)}</p>` : `<p class="special-event-retry" data-special-hint hidden></p>`;
        })()}
      </div>
      <div class="phase-wrap ${warnClass}${cinematic ? " is-capture" : ""}" data-phase-wrap role="timer" aria-label="${window.playEscapeAttr(timerLabel)}">
        <div class="phase-label"><span data-phase-name>${phase}</span><span data-time-copy>${timeText}</span></div>
        <div class="phase-bar" aria-hidden="true"><i data-bar style="width:${opts.bar || 0}%"></i></div>
      </div>
      <dl class="dex-stats" data-stats-phase="${window.playEscapeAttr(round.phase || "closed")}">
        <div data-stat-box="participants"><dt>Trainers</dt><dd data-stat="participants">${statText("participants")}</dd></div>
        <div data-stat-box="progress"><dt data-stat-label="progress">${thrownLabel}</dt><dd data-stat="progress">${statText("progress")}</dd></div>
        <div data-stat-box="bait"><dt>Honey</dt><dd data-stat="bait">${statText("bait")}</dd></div>
      </dl>
      ${lastAction}
      ${honey}
      ${staffPanel}`;
  };

  window.playHiddenEncounterStats = function playHiddenEncounterStats(phase) {
    if (phase === "join") return { thrown: true };
    if (phase === "prepare") return { thrown: true };
    if (phase === "throw" || phase === "reveal" || phase === "closed") return { prepared: true };
    return {};
  };

  window.playMarkEncounterStatAria = function playMarkEncounterStatAria(statsEl, phase) {
    if (!statsEl) return;
    const hide = window.playHiddenEncounterStats(phase);
    statsEl.querySelectorAll("[data-stat-box]").forEach((el) => {
      el.setAttribute("aria-hidden", hide[el.dataset.statBox] ? "true" : "false");
    });
  };

  window.playEncounterStatText = function playEncounterStatText(round, key) {
    const trainers = Number(round?.participants || 0);
    const prepared = Number(round?.prepared || 0);
    const thrown = Number(round?.thrown || 0);
    if (key === "participants") return String(trainers);
    if (key === "progress") {
      if (round?.phase === "throw" || round?.phase === "reveal" || round?.phase === "closed") {
        return `${thrown} / ${trainers}`;
      }
      return `${prepared} / ${trainers}`;
    }
    if (key === "prepared") return `${prepared} / ${trainers}`;
    if (key === "thrown") {
      return (round?.phase === "throw" || round?.phase === "reveal")
        ? `${thrown} / ${trainers}`
        : String(thrown);
    }
    if (key === "bait") return `+${Number(round?.baitBonusPercent || 0)}%`;
    return "0";
  };

  window.playPhaseBarPercent = function playPhaseBarPercent(round) {
    if (!round?.deadlines || !round.phase || round.phase === "closed") return 0;
    const keys = ["join", "prepare", "throw", "reveal"];
    const index = keys.indexOf(round.phase);
    if (index < 0) return 0;
    const startKey = keys[index - 1];
    const start = Date.parse(startKey ? round.deadlines[startKey] : round.startedAt);
    const end = Date.parse(round.deadlines[round.phase]);
    const now = typeof window.playRoundNowMs === "function"
      ? window.playRoundNowMs(round)
      : (round.pausedAt ? Date.parse(round.pausedAt) : Date.now());
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
  window.PLAY_ENCOUNTER_STAGE = {
    actorWidth: "74%",
    actorHeight: "46%",
    actorHeightWin: "52%",
    ballSize: "clamp(42px, 16.5%, 58px)",
    wobbleDurationMs: 340,
    wobblePauseMs: 380,
    shakeMs: 340,
    clickMs: 650
  };
  window.playEncounterSpriteSizing = function playEncounterSpriteSizing(mode) {
    const stage = window.PLAY_ENCOUNTER_STAGE;
    if (mode === "success") return { width: stage.actorWidth, height: stage.actorHeightWin };
    return { width: stage.actorWidth, height: stage.actorHeight };
  };
  const SHAKE_MS = window.PLAY_ENCOUNTER_STAGE.shakeMs;
  const CATCH_CLICK_MS = window.PLAY_ENCOUNTER_STAGE.clickMs;

  window.playShowCatchSeq = function playShowCatchSeq(round) {
    if (!round || round.cancelled) return false;
    if (round.phase === "reveal" || round.phase === "closed") return true;
    if (round.resolved) return true;
    return false;
  };

  window.playCatchSeqElapsedMs = function playCatchSeqElapsedMs(round) {
    const start = Date.parse(round?.deadlines?.throw || "");
    if (!Number.isFinite(start)) return 0;
    const now = typeof window.playRoundNowMs === "function" ? window.playRoundNowMs(round) : Date.now();
    return Math.max(0, now - start);
  };

  window.playCatchSeqElapsedSec = function playCatchSeqElapsedSec(round) {
    return Math.max(0, Math.min(11, window.playCatchSeqElapsedMs(round) / 1000));
  };

  window.playRevealSeqProgress = function playRevealSeqProgress(round) {
    const start = Date.parse(round?.deadlines?.throw || "");
    const end = Date.parse(round?.deadlines?.reveal || "");
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      return round?.resolved ? 100 : 8;
    }
    const freeze = round.paused && !round.resolved;
    const now = freeze
      ? Date.parse(round.pausedAt || "")
      : (typeof window.playRoundNowMs === "function" ? window.playRoundNowMs(round) : Date.now());
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
    if (value === true || value === 1 || value === "1") return true;
    const text = String(value ?? "").trim().toLowerCase();
    return text === "true" || text === "caught" || text === "yes";
  }

  function resultKind(result) {
    const text = String(result || "").trim().toLowerCase();
    if (!text) return "";
    if (text === "caught" || text === "gotcha" || text === "success" || text.startsWith("caught")) return "caught";
    if (text === "escaped" || text === "broke" || text === "broke free" || text === "no throw" || text === "failed") return "broke";
    return "";
  }

  function listedCatcher(round) {
    const names = [window._playTrainerName, window._playTrainerLogin]
      .map((value) => String(value || "").trim().toLowerCase())
      .filter(Boolean);
    if (!names.length) return false;
    const rows = []
      .concat(Array.isArray(round?.catchers) ? round.catchers : [])
      .concat(Array.isArray(round?.results?.catchers) ? round.results.catchers : []);
    return rows.some((row) => {
      const label = typeof row === "string" ? row : (row?.name || row?.displayName || row?.login || "");
      return names.includes(String(label).trim().toLowerCase());
    });
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
    if (listedCatcher(round)) return "caught";
    if (inferredSoloCatch(round, me)) return "caught";
    if (resultKind(me.result) === "broke") return "broke";
    if (me.caught === false) return "broke";
    if (round?.resolved && round.results && Number(round.results.escaped || 0) > 0) return "broke";
    return "";
  }
  window.playThrowOutcome = throwOutcome;

  // Every Trainer rolls separately, so the card reports the viewer's own result.
  function personalResult(round, me, species) {
    const caughtN = Number(round?.results?.caught || 0);
    const outcome = throwOutcome(me, round);
    if (!me?.joined && !me?.ball) {
      return {
        win: false,
        spectator: true,
        outcome: "",
        headline: "Encounter complete",
        sub: caughtN > 0
          ? `${caughtN} Trainer${caughtN === 1 ? "" : "s"} caught ${species}`
          : `Nobody caught ${species}`,
        note: "You watched this encounter."
      };
    }
    if (!me.ball) {
      return { win: false, outcome: "nothrow", headline: "Oh no!", sub: "You didn't choose a Poké Ball in time!", note: "Better luck next encounter!" };
    }
    if (outcome === "caught") {
      return {
        win: true,
        outcome: "caught",
        headline: "Gotcha!",
        sub: `${species} was caught!`,
        note: `Caught with ${window.playArticle(window.playItemLabel(me.ball))}`
      };
    }
    if (outcome === "broke") {
      return {
        win: false,
        outcome: "broke",
        headline: "It broke free!",
        sub: `${species} escaped!`,
        note: `${window.PLAY_STATUS?.escapeNote || "Catch attempts aren't guaranteed—another wild Pokémon will appear."}${me.ball ? ` · ${window.playItemLabel(me.ball)}` : ""}${me.prep && me.prep !== "none" && me.prep !== "bait" ? ` · ${window.playItemLabel(me.prep)}` : ""}`
      };
    }
    return {
      win: false,
      outcome: "",
      headline: "Waiting for the result…",
      sub: "",
      note: ""
    };
  }

  window.playEncounterStageCopy = function playEncounterStageCopy(round, st, me, species) {
    const name = species || window.playDisplayName(round, { plain: true }) || "the Pokémon";
    const waiting = window.PLAY_STATUS?.waitingOthers || "Waiting for other Trainers…";
    if (!st) {
      if (round?.phase === "prepare") {
        if (me?.prep) return { banner: "", status: waiting, showBanner: false };
        return { banner: "", status: window.PLAY_STATUS?.firstPrep || "Choose a Berry, Honey, or No Item.", showBanner: false };
      }
      if (round?.phase === "throw") {
        if (me?.ball) return { banner: "", status: waiting, showBanner: false };
        return { banner: "", status: window.PLAY_STATUS?.firstThrow || "Choose a Poké Ball!", showBanner: false };
      }
      return { banner: "", status: "", showBanner: false };
    }
    const personal = personalResult(round, me, name);
    const shiny = String(round?.variant || "").includes("shiny");
    if (st.scene === "results") {
      if (personal.win) {
        return {
          banner: "✨ GOTCHA! ✨",
          status: shiny
            ? `✨ SHINY CAUGHT! ✨ · ${personal.note || personal.sub}`
            : (personal.note || personal.sub || `${name} was caught!`),
          showBanner: true
        };
      }
      if (personal.spectator) {
        return { banner: "", status: personal.sub || "Encounter complete", showBanner: false };
      }
      if (!me?.ball) {
        return { banner: "", status: window.PLAY_STATUS?.noBall || "No Poké Ball was thrown.", showBanner: false };
      }
      if (personal.outcome === "broke" || throwOutcome(me, round) === "broke") {
        return { banner: "IT BROKE FREE!", status: personal.sub || `${name} broke free!`, showBanner: true };
      }
      return { banner: "", status: "Waiting for the result…", showBanner: false };
    }
    if (personal.spectator) {
      return { banner: "", status: window.PLAY_STATUS?.watching || "Watching the encounter…", showBanner: false };
    }
    if (!me?.ball && me?.joined) {
      return { banner: "", status: window.PLAY_STATUS?.noBall || "No Poké Ball was thrown.", showBanner: false };
    }
    if (!me?.ball) {
      return { banner: "", status: window.PLAY_STATUS?.watching || "Watching the encounter…", showBanner: false };
    }
    const sinceThrow = window.playCatchSeqElapsedMs(round);
    if (st.scene === "wobble" && sinceThrow < 600) {
      return { banner: "", status: window.PLAY_STATUS?.thrown || "Poké Balls thrown!", showBanner: false };
    }
    return { banner: "", status: "The Poké Ball is shaking…", showBanner: false };
  };

  window.playFillEncounterStageHud = function playFillEncounterStageHud(root, round, me) {
    const visual = root?.querySelector?.(".encounter-visual-stage") || root;
    if (!visual || !round) return;
    const catching = window.playShowCatchSeq(round);
    const st = catching ? window.playAdvanceCatchSeqState(round, me || null) : null;
    const hud = window.playEncounterStageCopy(round, st, me || null, window.playDisplayName(round, { plain: true }));
    const banner = visual.querySelector("[data-stage-banner]");
    const status = visual.querySelector("[data-seq-status]");
    const plate = visual.querySelector("[data-stage-status]");
    if (banner) {
      banner.hidden = !hud.showBanner;
      if (hud.banner && banner.textContent !== hud.banner) banner.textContent = hud.banner;
    }
    if (plate) plate.hidden = !hud.status;
    if (status) {
      const next = hud.status || "";
      if (status.textContent !== next) status.textContent = next;
    }
    visual.classList.toggle("is-win-scene", Boolean(hud.showBanner && /GOTCHA|SHINY/.test(hud.banner)));
    visual.classList.toggle("is-miss-scene", Boolean(hud.showBanner && /BROKE FREE|OH NO/.test(hud.banner)));
    visual.classList.toggle("is-shiny-win", Boolean(hud.showBanner && /SHINY/.test(`${hud.banner} ${hud.status}`)));
    const hintEl = visual.querySelector("[data-special-hint]");
    if (hintEl) {
      const escaped = round.resolved && typeof window.playThrowOutcome === "function" && window.playThrowOutcome(me || null, round) === "broke";
      const hint = typeof window.playSpecialRemainingHint === "function" ? window.playSpecialRemainingHint(round.specialEvent, escaped) : "";
      hintEl.hidden = !hint;
      if (hint) hintEl.textContent = hint;
    }
    const pauseNote = visual.querySelector("[data-pause-note]");
    if (pauseNote) {
      const paused = Boolean(round.paused && !round.resolved);
      pauseNote.hidden = !paused;
      if (paused) {
        pauseNote.textContent = round.pausedForBreak
          ? (window.PLAY_STATUS?.adPause || "Encounter paused for Twitch ad break.")
          : (window.PLAY_STATUS?.adminPause || "Encounter temporarily paused.");
      }
    }
  };

  window.playAdvanceCatchSeqState = function playAdvanceCatchSeqState(round, me) {
    const st = catchSeqState(round.id);
    if (round.paused && !round.resolved) return st;
    const outcome = throwOutcome(me, round);
    if (outcome) st.outcome = outcome;
    if (st.scene === "results") {
      if (outcome) st.outcome = outcome;
      return st;
    }
    if (round.resolved) {
      st.outcome = outcome || st.outcome;
      const now = typeof window.playRoundNowMs === "function" ? window.playRoundNowMs(round) : Date.now();
      if (st.live && me?.ball) {
        if (!st.personalAt) {
          st.personalAt = now;
          st.shakes = seqShakes(round, me, st.outcome);
        }
        if (now - st.personalAt < st.shakes * SHAKE_MS + CATCH_CLICK_MS) {
          st.scene = "personal";
          return st;
        }
      }
      st.scene = "results";
      return st;
    }
    st.live = true;
    st.scene = "wobble";
    return st;
  };

  window.playCatchSeqHtml = function playCatchSeqHtml(round, opts) {
    if (!window.playShowCatchSeq(round)) return "";
    const me = opts?.me || null;
    const st = window.playAdvanceCatchSeqState(round, me);
    const threw = Boolean(me?.ball);
    const monitor = Boolean(opts?.staff);
    const ballKey = opts?.throwBall || me?.ball
      || (monitor && Array.isArray(round.throwers) && round.throwers[0]?.ball)
      || "pokeball";
    const species = window.playDisplayName(round, { plain: true });
    const sprite = window.playSpriteUrl(round.dex, round.variant, window.playResolveFormId?.(round));
    const elapsed = window.playCatchSeqElapsedSec(round);
    const personal = personalResult(round, me, species);
    const win = st.scene === "results" && personal.win;
    const miss = st.scene === "results" && personal.outcome === "broke";
    const shiny = String(round.variant || "").includes("shiny");
    const midSeq = st.scene === "wobble" && window.playCatchSeqElapsedMs(round) >= 450;
    const sceneClass = `is-${st.scene}${st.outcome ? ` is-${st.outcome}` : ""}${win ? " is-win" : ""}${miss ? " is-miss" : ""}${!threw ? " is-watch" : ""}${!threw && me?.joined ? " is-nothrow" : ""}${personal.spectator ? " is-spectator" : ""}${monitor ? " is-monitor" : ""}${win && shiny ? " is-shiny-win" : ""}${midSeq ? " is-mid-seq" : ""}`;
    return `<aside class="catch-seq ${sceneClass}" data-catch-seq data-seq="${st.scene}" data-seq-elapsed="${elapsed.toFixed(2)}" data-outcome="${st.outcome || ""}" style="--shakes:${st.shakes};--seq-elapsed:${elapsed.toFixed(2)}s">
      <div class="catch-seq-flash" aria-hidden="true"></div>
      <div class="catch-seq-fx" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
      <div class="catch-seq-stage">
        <span class="encounter-ground-shadow" aria-hidden="true"></span>
        <div class="encounter-actor-frame is-catch-mon" data-actor-frame>
          ${sprite ? `<img class="catch-seq-mon encounter-stage-actor" src="${sprite}" alt="" onerror="window.playSpriteOnError(this)">` : ""}
        </div>
        <span class="catch-seq-ball-shadow" aria-hidden="true"></span>
        <img class="catch-seq-ball" src="${window.playItemSprite(ballKey)}" alt="">
        <span class="catch-seq-stars" aria-hidden="true"></span>
        <span class="catch-seq-click" aria-hidden="true"></span>
      </div>
    </aside>`;
  };

  window.playAdvanceCatchSeq = function playAdvanceCatchSeq(root, round, me) {
    const box = root?.querySelector("[data-catch-seq]");
    if (!box || !round) return false;
    const st = window.playAdvanceCatchSeqState(round, me);
    const personal = personalResult(round, me, window.playDisplayName(round, { plain: true }));
    box.dataset.seq = st.scene;
    box.dataset.outcome = st.outcome || "";
    const elapsed = window.playCatchSeqElapsedSec(round);
    box.dataset.seqElapsed = elapsed.toFixed(2);
    box.style.setProperty("--shakes", String(st.shakes));
    box.style.setProperty("--seq-elapsed", `${elapsed.toFixed(2)}s`);
    box.classList.toggle("is-wobble", st.scene === "wobble");
    box.classList.toggle("is-personal", st.scene === "personal");
    box.classList.toggle("is-results", st.scene === "results");
    box.classList.toggle("is-caught", st.outcome === "caught" || personal.win);
    box.classList.toggle("is-broke", st.outcome === "broke" && !personal.win);
    box.classList.toggle("is-win", st.scene === "results" && personal.win);
    box.classList.toggle("is-miss", st.scene === "results" && personal.outcome === "broke");
    box.classList.toggle("is-spectator", Boolean(personal.spectator));
    box.classList.toggle("is-nothrow", Boolean(me?.joined && !me?.ball));
    box.classList.toggle("is-watch", !me?.ball);
    box.classList.toggle("is-shiny-win", st.scene === "results" && personal.win && String(round.variant || "").includes("shiny"));
    box.classList.toggle("is-mid-seq", st.scene === "wobble" && window.playCatchSeqElapsedMs(round) >= 450);
    const ball = box.querySelector(".catch-seq-ball");
    if (ball && me?.ball) {
      const src = window.playItemSprite(me.ball);
      if (src && ball.getAttribute("src") !== src) ball.setAttribute("src", src);
    }
    const stage = root.querySelector(".dex-stage");
    stage?.classList.toggle("is-throwing", st.scene !== "results");
    stage?.classList.toggle("is-revealed", st.scene === "results");
    const visual = root.querySelector(".encounter-visual-stage");
    if (visual) {
      visual.classList.toggle("is-capture", true);
      visual.classList.remove("is-exit");
      visual.classList.toggle("is-paused", Boolean(round.paused && !round.resolved));
      visual.classList.toggle("is-mid-catch", st.scene !== "wobble" || window.playCatchSeqElapsedMs(round) >= 450);
      visual.dataset.visualMode = st.scene === "results" ? "result" : "capture";
    }
    window.playFillEncounterStageHud(root, round, me);
    return true;
  };

  window.playThrowWaitHtml = function playThrowWaitHtml(round, ball) {
    return window.playCatchSeqHtml(round, { throwBall: ball });
  };

  window.playHoneyCrewHtml = function playHoneyCrewHtml(round) {
    const rows = Array.isArray(round?.honeyTrainers) ? round.honeyTrainers : [];
    const bonus = Number(round?.baitBonusPercent || 0);
    if (!rows.length && bonus <= 0) return "";
    return `<aside class="honey-crew honey-strip" data-honey="${rows.length}:${bonus}">
      <img src="${window.playItemSprite("bait")}" alt="">
      <strong>Honey Team-Up</strong>
      <span>${rows.length} Trainer${rows.length === 1 ? "" : "s"}</span>
      <em>+${bonus}%</em>
    </aside>`;
  };

  window.playCatchFanfareHtml = function playCatchFanfareHtml(round) {
    if (!round?.resolved) return "";
    const results = round.results || {};
    const caughtN = Number(results.caught || 0);
    const escaped = Number(results.escaped || 0) + Number(results.noThrow || 0);
    return `<section class="catch-fanfare catch-fanfare-slim${caughtN ? " is-win" : ""}">
      <p class="fanfare-kicker">Community result</p>
      <p class="result-counts"><strong>${caughtN}</strong> Trainer${caughtN === 1 ? "" : "s"} caught it · <strong>${escaped}</strong> escaped</p>
    </section>`;
  };

  window.playCommunityResultReady = function playCommunityResultReady(round, me) {
    if (!round?.resolved) return false;
    if (!window.playShowCatchSeq(round)) return true;
    const st = window.playAdvanceCatchSeqState(round, me || null);
    return st.scene === "results";
  };

  window.playPatchEncounter = function playPatchEncounter(root, round, bar, extra) {
    if (!root || !round) return false;
    if (!root.querySelector(".dex-stage") && !root.querySelector(".encounter-visual-stage")) return false;
    const seconds = window.playEncounterSecondsLeft(round);
    const phase = window.playPhaseLabel(round.phase);
    const timeText = typeof window.playEncounterTimeText === "function"
      ? window.playEncounterTimeText(round)
      : (round.paused ? "PAUSED" : (seconds ? `${seconds}s left` : "Waiting"));
    const timerLabel = typeof window.playEncounterTimerLabel === "function"
      ? window.playEncounterTimerLabel(round)
      : `${phase} — ${timeText}`;
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
    const phaseWrap = root.querySelector("[data-phase-wrap]");
    if (phaseWrap) {
      phaseWrap.setAttribute("aria-label", timerLabel);
      // Avoid aria-live spam: seconds tick every second; screen readers use the label on demand.
      phaseWrap.removeAttribute("aria-live");
    }
    root.querySelector("[data-phase-wrap]")?.classList.toggle("is-warn", warnClass === "is-warn");
    root.querySelector("[data-phase-wrap]")?.classList.toggle("is-urgent", warnClass === "is-urgent");
    if (phaseEl) phaseEl.textContent = phase;
    if (phaseName) phaseName.textContent = phase;
    if (barEl) barEl.style.width = `${bar || 0}%`;
    const capturing = window.playShowCatchSeq(round);
    phaseWrap?.classList.toggle("is-capture", capturing);
    const statsEl = root.querySelector(".dex-stats");
    if (statsEl) {
      statsEl.dataset.statsPhase = round.phase || "closed";
      window.playMarkEncounterStatAria(statsEl, round.phase);
    }
    const thrownLabel = root.querySelector("[data-stat-label=\"progress\"]");
    if (thrownLabel) {
      thrownLabel.textContent = round.phase === "throw"
        ? "Ready"
        : (round.phase === "prepare" || round.phase === "join" ? "Prepared" : "Throws");
    }
    const visual = root.querySelector(".encounter-visual-stage");
    const live = Boolean(round.phase && round.phase !== "closed");
    const head = root.querySelector("[data-enc-head]");
    if (head) {
      head.classList.toggle("dex-live-fanfare", live);
      const burst = head.querySelector(".live-burst");
      if (burst) burst.hidden = !live;
      const copy = root.querySelector("[data-enc-head-copy]");
      if (copy) {
        copy.textContent = window.playEncounterHeadCopy(round, capturing);
      }
      const pauseChip = root.querySelector("[data-enc-pause-chip]");
      if (pauseChip) {
        pauseChip.hidden = !round.paused;
        if (round.paused) pauseChip.textContent = round.pausedForBreak ? "Ad break" : "Paused";
      }
      let testChipEl = head.querySelector("[data-enc-test]");
      const isTestRound = String(round.triggerSource || "") === "TEST"
        || round?.rules?.testMode === true
        || String(round?.rules?.rewardMode || "") === "test";
      if (isTestRound) {
        if (!testChipEl) {
          testChipEl = document.createElement("span");
          testChipEl.className = "chip warn";
          testChipEl.dataset.encTest = "";
          const pause = head.querySelector("[data-enc-pause-chip]");
          head.insertBefore(testChipEl, pause || null);
        }
        testChipEl.textContent = "TEST MODE · accelerated timers";
      } else if (testChipEl) {
        testChipEl.remove();
      }
    }
    if (visual) {
      visual.classList.toggle("is-paused", Boolean(round.paused && !round.resolved));
      visual.classList.toggle("is-special", window.playEncounterIsSpecial(round));
      const hadSeq = Boolean(root.querySelector("[data-catch-seq]"));
      if (capturing) {
        visual.classList.remove("is-exit");
      } else if (hadSeq || visual.classList.contains("is-capture")) {
        visual.classList.remove("is-capture", "is-mid-catch", "is-wild-enter", "is-shiny-intro");
        visual.classList.add("is-exit");
        visual.querySelector(".dex-stage")?.classList.remove("is-throwing");
        visual.dataset.visualMode = round.phase === "closed" ? "result" : "wild";
      } else {
        visual.classList.remove("is-capture", "is-mid-catch", "is-exit");
        visual.dataset.visualMode = "wild";
      }
      window.playFillEncounterStageHud(root, round, extra?.staff ? null : (extra?.me || null));
    }
    if (extra?.staff) {
      const panel = root.querySelector("[data-staff-round]");
      if (!panel) return false;
      const key = window.playStaffRoundKey(round);
      if (panel.dataset.staffRound !== key) panel.outerHTML = window.playStaffRoundHtml(round);
    }
    const wantsSeq = capturing;
    let seqBox = root.querySelector("[data-catch-seq]");
    if (wantsSeq && !seqBox && visual) {
      const html = window.playCatchSeqHtml(round, extra);
      if (html) {
        const plate = visual.querySelector("[data-stage-status]");
        if (plate) plate.insertAdjacentHTML("beforebegin", html);
        else visual.insertAdjacentHTML("beforeend", html);
        seqBox = root.querySelector("[data-catch-seq]");
      }
    }
    if (!wantsSeq && seqBox) {
      seqBox.remove();
      visual?.classList.remove("is-capture", "is-mid-catch", "is-wild-enter");
      visual?.classList.add("is-exit");
    }
    if (wantsSeq) window.playAdvanceCatchSeq(root, round, extra?.staff ? null : extra?.me || null);
    if (extra?.showHoney !== false) {
      const liveHoney = round.phase && round.phase !== "closed" && typeof window.playHoneyMeterHtml === "function";
      const honeyHtml = liveHoney ? window.playHoneyMeterHtml(round) : window.playHoneyCrewHtml(round);
      const honeyEl = root.querySelector(".honey-meter, .honey-crew");
      const honeyKey = liveHoney
        ? `${round.honeyContributors || 0}:${round.honeyParticipants || 0}:${round.baitBonusPercent || 0}:${round.phase || ""}`
        : `${(round.honeyTrainers || []).length}:${round.baitBonusPercent || 0}`;
      if (!honeyHtml) honeyEl?.remove();
      else if (honeyEl?.dataset.honey === honeyKey) { /* already current */ }
      else if (honeyEl) honeyEl.outerHTML = honeyHtml;
      else {
        const mount = document.createElement("div");
        mount.innerHTML = honeyHtml;
        const node = mount.firstElementChild;
        const lastLine = root.querySelector("[data-last]");
        const stats = root.querySelector(".dex-stats");
        if (lastLine) lastLine.after(node);
        else if (stats) stats.after(node);
        else root.append(node);
      }
    }
    const setStat = (key, value) => {
      const el = root.querySelector(`[data-stat="${key}"]`);
      if (el) el.textContent = value;
    };
    setStat("participants", window.playEncounterStatText(round, "participants"));
    setStat("progress", window.playEncounterStatText(round, "progress"));
    setStat("prepared", window.playEncounterStatText(round, "prepared"));
    setStat("thrown", window.playEncounterStatText(round, "thrown"));
    setStat("bait", window.playEncounterStatText(round, "bait"));
    if (last) {
      if (extra?.staff || extra?.showLastAction === false) {
        last.hidden = true;
        last.textContent = "";
      } else {
        last.hidden = !round.lastAction;
        last.textContent = round.lastAction || "";
      }
    }
    return true;
  };

  window.playConsoleTime = function playConsoleTime(at) {
    if (!at) return 0;
    const raw = String(at).trim();
    const fixed = raw.replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00");
    const ms = Date.parse(fixed);
    if (!Number.isNaN(ms)) return ms;
    const ms2 = Date.parse(raw);
    return Number.isNaN(ms2) ? 0 : ms2;
  };

  window.playConsoleLine = function playConsoleLine(row) {
    const name = window.playEscapeAttr(row?.name || "A trainer");
    const ms = window.playConsoleTime(row?.at);
    const stamp = ms ? new Date(ms) : null;
    const time = stamp
      ? `<time datetime="${stamp.toISOString()}">${stamp.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })}</time>`
      : `<time></time>`;
    const message = String(row?.message || "").trim();
    const ball = window.playEscapeAttr(window.playArticle(window.playItemLabel(row?.item)));
    if (row?.kind === "joined") return `<li>${time}<span><strong>${name}</strong> joined the encounter!</span></li>`;
    if (row?.kind === "prepared" && row.item === "bait") {
      return `<li class="is-honey">${time}<span><strong>${name}</strong> used a honey to help everyone's catch rate!</span></li>`;
    }
    if (row?.kind === "prepared" && (row.item === "none" || !row.item)) {
      return `<li>${time}<span><strong>${name}</strong> is ready.</span></li>`;
    }
    if (row?.kind === "prepared") {
      const berry = window.playEscapeAttr(window.playItemLabel(row.item));
      return `<li>${time}<span><strong>${name}</strong> has chosen ${berry}!</span></li>`;
    }
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
    if (row?.kind === "appeared") {
      return `<li class="is-phase">${time}<span>${message ? window.playEscapeAttr(message) : "A wild Pokémon appeared!"}</span></li>`;
    }
    if (row?.kind === "phase") {
      return `<li class="is-phase">${time}<span>${window.playEscapeAttr(message)}</span></li>`;
    }
    if (row?.kind === "resolved") {
      return "";
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

  window.playConsoleKindRank = function playConsoleKindRank(kind) {
    const key = String(kind || "");
    if (key === "pause" || key === "resume") return 120;
    if (key === "caught") return 100;
    if (key === "escaped") return 90;
    if (key === "timeout") return 80;
    if (key === "threw") return 50;
    if (key === "selected") return 40;
    if (key === "prepared") return 30;
    if (key === "joined") return 20;
    if (key === "phase" || key === "appeared") return 5;
    if (key === "resolved") return 0;
    return 10;
  };

  window.playConsoleIsStatus = function playConsoleIsStatus(row) {
    const key = String(row?.kind || "");
    return key === "phase" || key === "appeared" || key === "pause" || key === "resume"
      || key === "cancelled" || key === "hidden" || key === "gift";
  };

  window.playConsoleIsChapterBanner = function playConsoleIsChapterBanner(row) {
    const key = String(row?.kind || "");
    return key === "phase" || key === "appeared";
  };

  window.playConsoleChapter = function playConsoleChapter(row) {
    const key = String(row?.kind || "");
    if (key === "appeared" || key === "joined") return "appeared";
    if (key === "prepared") return "prepare";
    if (key === "selected" || key === "threw" || key === "caught" || key === "escaped" || key === "timeout") return "throw";
    if (key === "phase") {
      const item = String(row?.item || "").toLowerCase();
      if (item) return item;
      const text = String(row?.message || "").toLowerCase();
      if (/pok[ée] ball|choosing/.test(text)) return "throw";
      if (/prepar|item/.test(text)) return "prepare";
      if (/join|appear/.test(text)) return "appeared";
      return "phase";
    }
    if (key === "pause" || key === "resume" || key === "cancelled" || key === "hidden" || key === "gift") {
      return `${key}:${window.playConsoleTime(row?.at)}`;
    }
    return "other";
  };

  window.playConsoleEncounterKey = function playConsoleEncounterKey(row) {
    const round = row?.round_id || row?.roundId;
    if (round) return `round:${round}`;
    return "";
  };

  window.playConsoleAssignGroups = function playConsoleAssignGroups(rows) {
    const ordered = rows.slice().sort((a, b) => {
      const ta = window.playConsoleTime(a?.at);
      const tb = window.playConsoleTime(b?.at);
      if (ta !== tb) return ta - tb;
      return (Number(a?._i) || 0) - (Number(b?._i) || 0);
    });
    const keys = new Map();
    let group = 0;
    let lastAt = 0;
    for (const row of ordered) {
      const roundKey = window.playConsoleEncounterKey(row);
      if (roundKey) {
        keys.set(row, roundKey);
        lastAt = window.playConsoleTime(row?.at) || lastAt;
        continue;
      }
      const kind = String(row?.kind || "");
      const item = String(row?.item || "").toLowerCase();
      const text = String(row?.message || "").toLowerCase();
      const at = window.playConsoleTime(row?.at);
      const gap = lastAt && at && at - lastAt > 4 * 60 * 1000;
      const newEncounter = kind === "appeared"
        || (kind === "phase" && (item === "join" || /appear|join/.test(text)));
      if (!keys.size) {
        group = 1;
      } else if (newEncounter || gap) {
        group += 1;
      }
      keys.set(row, `g${group}`);
      lastAt = at || lastAt;
    }
    return keys;
  };

  window.playConsoleRows = function playConsoleRows(source, round) {
    let rows = Array.isArray(source)
      ? source.slice()
      : (Array.isArray(source?.activity) ? source.activity.slice() : []);
    rows = rows.map((row, index) => ({
      ...row,
      name: row?.name || row?.display_name || "",
      at: row?.at || row?.created_at,
      _i: index
    }));
    const live = round || (source && !Array.isArray(source) && source.phase ? source : null);
    rows = rows.filter((row) => row?.kind !== "resolved");
    if (live && (live.phase === "reveal" || live.phase === "closed")) {
      const throwers = Array.isArray(live.throwers) ? live.throwers : [];
      const have = new Set(
        rows.filter((row) => row?.kind === "threw").map((row) => String(row.name || "").toLowerCase())
      );
      for (const thrower of throwers) {
        const name = thrower?.name || "A trainer";
        if (have.has(name.toLowerCase())) continue;
        have.add(name.toLowerCase());
        rows.push({
          name,
          kind: "threw",
          item: thrower.ball,
          at: live.deadlines?.throw || live.deadlines?.reveal || live.startedAt,
          round_id: live.id,
          _i: rows.length
        });
      }
    }
    const groups = window.playConsoleAssignGroups(rows);
    const groupTime = new Map();
    const chapterStart = new Map();
    for (const row of rows) {
      const group = groups.get(row) || "open";
      const at = window.playConsoleTime(row?.at);
      const prevGroup = groupTime.get(group);
      if (prevGroup == null || at > prevGroup) groupTime.set(group, at);
      const chapterKey = `${group}:${window.playConsoleChapter(row)}`;
      const prevChapter = chapterStart.get(chapterKey);
      if (prevChapter == null || at < prevChapter) chapterStart.set(chapterKey, at);
    }
    const bannerGraceMs = 2500;
    const sortTime = (row) => {
      const at = window.playConsoleTime(row?.at);
      if (!window.playConsoleIsChapterBanner(row)) return at;
      const group = groups.get(row) || "open";
      const start = chapterStart.get(`${group}:${window.playConsoleChapter(row)}`);
      if (start == null || !(at > start)) return at;
      const sameSecond = Math.floor(at / 1000) === Math.floor(start / 1000);
      if (sameSecond || at - start <= bannerGraceMs) return start;
      return at;
    };
    return rows.sort((a, b) => {
      const ga = groups.get(a) || "open";
      const gb = groups.get(b) || "open";
      const gta = groupTime.get(ga) ?? window.playConsoleTime(a?.at);
      const gtb = groupTime.get(gb) ?? window.playConsoleTime(b?.at);
      if (gtb !== gta) return gtb - gta;
      const ta = sortTime(a);
      const tb = sortTime(b);
      if (tb !== ta) return tb - ta;
      const bannerA = window.playConsoleIsChapterBanner(a);
      const bannerB = window.playConsoleIsChapterBanner(b);
      if (bannerA !== bannerB) return bannerA ? 1 : -1;
      const kind = window.playConsoleKindRank(b?.kind) - window.playConsoleKindRank(a?.kind);
      if (kind) return kind;
      return (Number(b?._i) || 0) - (Number(a?._i) || 0);
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
    list.innerHTML = rows.map((row) => window.playConsoleLine(row)).filter(Boolean).join("");
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
