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
      ["berry", "Berry"],
      ["bait", "Honey"],
      ["pokeball", "Poké Ball"],
      ["greatball", "Great"],
      ["ultraball", "Ultra"],
      ["lure", "Poké Radar"]
    ];
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
    const items = [
      ["berry", "Berry"],
      ["bait", "Honey"],
      ["lure", "Radar"]
    ];
    return `<ul class="bag-strip play-kit">${items.map(([key, label]) => (
      `<li><img src="${window.playItemSprite(key)}" alt=""><span>${label}</span><strong>${bag[key] ?? 0}</strong></li>`
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
    const timeText = round.paused ? "Paused" : (seconds ? `${seconds}s left` : "Waiting");
    const sprite = window.playSpriteUrl(round.dex, round.variant);
    const shiny = String(round.variant || "").includes("shiny");
    const location = window.playHabitat(round.dex, round.location);
    const hidden = round.hidden ? `<span class="chip warn">Hidden</span>` : "";
    const paused = round.paused ? `<span class="chip pause">Paused</span>` : "";
    const live = round.phase && round.phase !== "closed";
    const honey = opts.showHoney === false ? "" : window.playHoneyCrewHtml(round);
    const fanfare = window.playCatchFanfareHtml(round);
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
      <div class="dex-stage">
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
      <div class="phase-wrap">
        <div class="phase-label"><span data-phase-name>${phase}</span><span data-time-copy>${timeText}</span></div>
        <div class="phase-bar" aria-hidden="true"><i data-bar style="width:${opts.bar || 0}%"></i></div>
      </div>
      <dl class="dex-stats">
        <div><dt>Trainers</dt><dd data-stat="participants">${round.participants || 0}</dd></div>
        <div><dt>Prepared</dt><dd data-stat="prepared">${round.prepared || 0}</dd></div>
        <div><dt>Throws</dt><dd data-stat="thrown">${round.thrown || 0}</dd></div>
        <div><dt>Honey bonus</dt><dd data-stat="bait">+${round.baitBonusPercent || 0}%</dd></div>
      </dl>
      ${round.lastAction ? `<p class="last-action" data-last>${round.lastAction}</p>` : `<p class="last-action" data-last hidden></p>`}
      ${honey}
      ${fanfare}`;
  };

  window.playHoneyCrewHtml = function playHoneyCrewHtml(round) {
    const rows = Array.isArray(round?.honeyTrainers) ? round.honeyTrainers : [];
    if (!rows.length) return "";
    const bonus = round.baitBonusPercent || 0;
    return `<aside class="honey-crew">
      <img src="${window.playItemSprite("bait")}" alt="">
      <div>
        <strong>Honey team-up</strong>
        <p>These trainers used Honey so the whole community had a better catch rate. Shared bonus <em>+${bonus}%</em>.</p>
        <ul>${rows.map((row) => `<li>${window.playEscapeAttr(row.name || "Trainer")}</li>`).join("")}</ul>
      </div>
    </aside>`;
  };

  window.playCatchFanfareHtml = function playCatchFanfareHtml(round) {
    const results = round?.results;
    const catchers = Array.isArray(round?.catchers) ? round.catchers : (results?.catchers || []);
    const caughtN = Number(results?.caught || 0);
    const escapedN = Number(results?.escaped || 0);
    const noThrowN = Number(results?.noThrow || 0);
    const settled = Boolean(results) && (caughtN + escapedN + noThrowN > 0 || catchers.length > 0);
    if (!settled) return "";
    const got = catchers.length || caughtN;
    const species = window.playDisplayName(round);
    const headline = got
      ? (got === 1 ? `1 trainer caught ${species}!` : `${got} trainers caught ${species}!`)
      : `${species} got away!`;
    const list = catchers.length
      ? `<ul class="catcher-list">${catchers.map((row) => `
          <li>
            <img src="${window.playItemSprite(row.ball || "pokeball")}" alt="">
            <span>${window.playEscapeAttr(row.name || "Trainer")}</span>
            <em>${window.playEscapeAttr(window.playItemLabel(row.ball || "pokeball"))}</em>
          </li>`).join("")}</ul>`
      : `<p class="fanfare-empty">Nobody landed a catch this time.</p>`;
    return `<section class="catch-fanfare${got ? " is-win" : ""}">
      <p class="fanfare-kicker">${got ? "Gotcha!" : "Encounter results"}</p>
      <h3>${window.playEscapeAttr(headline)}</h3>
      ${got ? `<p class="fanfare-sub">Everyone who caught it:</p>` : ""}
      ${list}
      <p class="result-line">Caught ${caughtN} · Escaped ${escapedN} · No throw ${noThrowN}</p>
    </section>`;
  };

  window.playPatchEncounter = function playPatchEncounter(root, round, bar) {
    if (!root || !round) return false;
    if (!root.querySelector(".dex-stage")) return false;
    const seconds = window.playEncounterSecondsLeft(round);
    const phase = window.playPhaseLabel(round.phase);
    const timeText = round.paused ? "Paused" : (seconds ? `${seconds}s left` : "Waiting");
    const time = root.querySelector("[data-time]");
    const timeCopy = root.querySelector("[data-time-copy]");
    const phaseEl = root.querySelector("[data-phase]");
    const phaseName = root.querySelector("[data-phase-name]");
    const barEl = root.querySelector("[data-bar]");
    const last = root.querySelector("[data-last]");
    if (time) time.textContent = round.paused ? "Paused" : `${seconds || 0}s`;
    if (timeCopy) timeCopy.textContent = timeText;
    if (phaseEl) phaseEl.textContent = phase;
    if (phaseName) phaseName.textContent = phase;
    if (barEl) barEl.style.width = `${bar || 0}%`;
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
    if (row?.kind === "joined") return `<li>${time}<span><strong>${name}</strong> joined</span></li>`;
    if (row?.kind === "prepared" && row.item === "bait") {
      return `<li class="is-honey">${time}<span><strong>${name}</strong> used Honey to help everyone’s catch rate</span></li>`;
    }
    if (row?.kind === "prepared") return `<li>${time}<span><strong>${name}</strong> used ${window.playEscapeAttr(window.playItemLabel(row.item))}</span></li>`;
    if (row?.kind === "threw") return `<li>${time}<span><strong>${name}</strong> threw a ${window.playEscapeAttr(window.playItemLabel(row.item))}</span></li>`;
    if (row?.kind === "pause") return `<li>${time}<span>Encounter paused</span></li>`;
    if (row?.kind === "resume") return `<li>${time}<span>Encounter resumed</span></li>`;
    if (row?.kind === "gift") {
      return `<li>${time}<span>${row.message ? window.playEscapeAttr(row.message) : `Staff sent +1 ${window.playEscapeAttr(window.playItemLabel(row.item))}`}</span></li>`;
    }
    if (row?.message) return `<li>${time}<span>${window.playEscapeAttr(row.message)}</span></li>`;
    return `<li>${time}<span><strong>${name}</strong></span></li>`;
  };

  window.playRenderLiveFeed = function playRenderLiveFeed(source, targetId) {
    const list = document.getElementById(targetId || "live-feed");
    if (!list) return;
    const rows = Array.isArray(source) ? source : (Array.isArray(source?.activity) ? source.activity : []);
    if (!rows.length) {
      list.innerHTML = `<li class="muted">Waiting for trainers to join, use Honey or a Berry, and throw a ball.</li>`;
      return;
    }
    list.innerHTML = rows.map((row) => window.playConsoleLine(row)).join("");
  };
})();
