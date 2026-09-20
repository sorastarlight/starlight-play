(() => {
  const root = typeof window !== "undefined" ? window : globalThis;

  const OAK_SPRITE = "images/trainers/oak.png";
  const BALL_SPRITE = "images/items/poke-ball.png";
  const OAK_COMPLETE_SFX = "sounds/oak-wonderful.wav";

  function esc(value) {
    return root.playEscapeAttr ? root.playEscapeAttr(value) : String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /** Oak research complete sting — fails soft if autoplay is blocked. */
  function playCompleteSfx() {
    try {
      const AudioCtor = root.Audio || (typeof Audio !== "undefined" ? Audio : null);
      if (!AudioCtor) return null;
      const audio = new AudioCtor(OAK_COMPLETE_SFX);
      audio.volume = 0.5;
      const played = audio.play();
      if (played && typeof played.catch === "function") played.catch(() => {});
      return audio;
    } catch (_) {
      return null;
    }
  }

  function reducedMotion() {
    if (root.playPerfReduced?.()) return true;
    const mode = root.playPerfMode?.();
    if (mode === "low" || mode === "reduced") return true;
    try {
      return Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
    } catch (_) {
      return false;
    }
  }

  function isShiny(mon) {
    if (typeof root.playEvoView?.isShiny === "function") return Boolean(root.playEvoView.isShiny(mon));
    return String(mon?.variant || "").toLowerCase().includes("shiny");
  }

  function genderMark(gender) {
    const g = String(gender || "").toLowerCase();
    if (g === "female") return "♀";
    if (g === "male") return "♂";
    return "";
  }

  function spriteUrl(mon) {
    if (!mon) return "";
    const dex = Number(mon.dex);
    const variant = mon.variant || "normal";
    const formId = mon.formId || mon.pokemon_form_id || mon.pokemonFormId || null;
    const gender = mon.gender;
    if (typeof root.playEvoView?.displayVariant === "function") {
      const resolved = root.playEvoView.displayVariant({ variant, gender }, dex);
      return root.playSpriteUrl(dex, resolved, formId);
    }
    return root.playSpriteUrl(dex, variant, formId);
  }

  function monName(mon) {
    return String(mon?.nickname || mon?.name || "Pokémon");
  }

  function monCaption(mon) {
    const shiny = isShiny(mon) ? "✨ " : "";
    const gender = genderMark(mon?.gender);
    return `${shiny}${monName(mon)}${gender ? ` ${gender}` : ""}`.trim();
  }

  function candyArt(rowOrFamilyId, families) {
    if (rowOrFamilyId && typeof rowOrFamilyId === "object") {
      const base = Number(rowOrFamilyId.candyBaseDex || rowOrFamilyId.baseDex || 0);
      if (base && typeof root.playSpriteUrl === "function") return root.playSpriteUrl(base, "normal");
      const fam = Number(rowOrFamilyId.familyId || 0);
      const match = (families || []).find((f) => Number(f.familyId) === fam);
      const fromFam = Number(match?.baseDex || match?.representativeDex || 0);
      if (fromFam && typeof root.playSpriteUrl === "function") return root.playSpriteUrl(fromFam, "normal");
      return BALL_SPRITE;
    }
    const fam = Number(rowOrFamilyId);
    const match = (families || []).find((f) => Number(f.familyId) === fam);
    const base = Number(match?.baseDex || 0);
    if (base && typeof root.playSpriteUrl === "function") return root.playSpriteUrl(base, "normal");
    return BALL_SPRITE;
  }

  function candyLabel(rowOrFamilyId, families) {
    if (rowOrFamilyId && typeof rowOrFamilyId === "object") {
      if (rowOrFamilyId.candyName) return String(rowOrFamilyId.candyName);
      const fam = Number(rowOrFamilyId.familyId || 0);
      const match = (families || []).find((f) => Number(f.familyId) === fam);
      if (match?.name) {
        const bare = String(match.name).replace(/\s+Candy$/i, "");
        return `${bare} Evolution Candy`;
      }
      const base = Number(rowOrFamilyId.candyBaseDex || match?.baseDex || 0);
      const species = base ? root.playSpeciesName?.(base) : "";
      if (species) return `${species} Evolution Candy`;
      return "Evolution Candy";
    }
    const fam = Number(rowOrFamilyId);
    const match = (families || []).find((f) => Number(f.familyId) === fam);
    if (match?.name) {
      const bare = String(match.name).replace(/\s+Candy$/i, "");
      return `${bare} Evolution Candy`;
    }
    const base = Number(match?.baseDex || 0);
    const species = base ? root.playSpeciesName?.(base) : "";
    if (species) return `${species} Evolution Candy`;
    return "Evolution Candy";
  }

  /** Pure helper: summarize authoritative transfer results for reward UI. */
  function rewardSummary(results, families) {
    const rows = Array.isArray(results) ? results.filter((row) => row && row.ok !== false) : [];
    const byFamily = new Map();
    for (const row of rows) {
      const fam = Number(row.familyId || 0);
      const amt = Number(row.candyGranted || 0);
      if (!fam || amt < 1) continue;
      const prev = byFamily.get(fam) || {
        familyId: fam,
        qty: 0,
        candyBaseDex: Number(row.candyBaseDex || 0),
        candyName: row.candyName || ""
      };
      prev.qty += amt;
      if (!prev.candyBaseDex && row.candyBaseDex) prev.candyBaseDex = Number(row.candyBaseDex);
      if (!prev.candyName && row.candyName) prev.candyName = row.candyName;
      byFamily.set(fam, prev);
    }
    return [...byFamily.values()].map((row) => ({
      familyId: row.familyId,
      qty: row.qty,
      candyBaseDex: row.candyBaseDex,
      label: candyLabel(row, families),
      art: candyArt(row, families)
    }));
  }

  /** Pure helper: confirmation copy never invents candy totals. */
  function confirmModel(mons) {
    const list = Array.isArray(mons) ? mons : [];
    return {
      count: list.length,
      title: "Transfer to Professor Oak?",
      names: list.map(monName),
      rewardHint: list.length > 1
        ? "You'll get Evolution Candy for each Evolution Line."
        : "You'll get Evolution Candy for this Evolution Line.",
      leaveHint: list.length > 1
        ? "They leave your collection. This can't be undone."
        : "It leaves your collection. This can't be undone."
    };
  }

  function planSequence(results) {
    const ok = Array.isArray(results) ? results.filter((row) => row && row.ok !== false && row.mon) : [];
    return {
      mode: ok.length > 1 ? "batch" : "single",
      count: ok.length,
      results: ok
    };
  }

  /** Pure helper: stage order for presentation tests (not millisecond timing). */
  function stageOrder({ mode, reduced } = {}) {
    if (reduced) return ["prepare", "arrive", "oak", "reward"];
    if (mode === "batch") return ["prepare", "link", "transfer", "arrive", "oak", "reward"];
    return ["prepare", "link", "highlight", "transfer", "arrive", "oak", "reward"];
  }

  /** Player-facing label: display name, else username/login. Never Twitch face art. */
  function resolvePlayerLabel(opts = {}) {
    const trainer = opts.trainer || {};
    const display = String(
      opts.displayName
      || trainer.displayName
      || trainer.display_name
      || root._playTrainerName
      || ""
    ).trim();
    const login = String(
      opts.username
      || opts.login
      || trainer.twitchLogin
      || trainer.twitch_login
      || trainer.username
      || trainer.login
      || root._playTrainerLogin
      || ""
    ).trim().replace(/^@/, "");
    if (display) return display;
    if (login) return login;
    const raw = opts.trainerSprite
      || root._playTrainerSprite
      || trainer.trainerSprite
      || "";
    const look = typeof root.playTrainerLook === "function"
      ? root.playTrainerLook(String(raw || "red-gen1").trim() || "red-gen1")
      : null;
    return look?.trainer?.name || "Trainer";
  }

  /**
   * Authoritative equipped Trainer avatar for transfer presentation.
   * Uses playTrainerSpriteUrl (falls back to red-gen1). Never Twitch face.
   */
  function resolvePlayerTrainer(opts = {}) {
    const raw = opts.trainerSprite
      || root._playTrainerSprite
      || root.playLastTrainer?.trainerSprite
      || opts.trainer?.trainerSprite
      || "";
    const id = String(raw || "").trim();
    const url = typeof root.playTrainerSpriteUrl === "function"
      ? root.playTrainerSpriteUrl(id || "red-gen1")
      : (id ? `images/trainers/${id}.png` : "images/trainers/red-gen1.png");
    const label = resolvePlayerLabel(opts);
    return { id: id || "red-gen1", url, label, omitted: false };
  }

  function playerTrainerHtml(trainer) {
    if (!trainer || trainer.omitted || !trainer.url) return "";
    return `<div class="oak-xfer-avatar oak-xfer-player" data-oak-player-trainer>
      <img src="${esc(trainer.url)}" alt="" width="72" height="72" decoding="async"
        style="image-rendering:pixelated"
        onerror="this.closest('[data-oak-player-trainer]')?.remove()">
      <span class="oak-xfer-avatar-tag">${esc(trainer.label || "Trainer")}</span>
    </div>`;
  }

  function gameboyHtml({ side, art, name, empty }) {
    const screen = empty
      ? `<div class="oak-gameboy-screen is-standby" data-oak-screen-${side}>
           <span class="oak-gameboy-standby">READY</span>
         </div>`
      : `<div class="oak-gameboy-screen" data-oak-screen-${side}>
           <img class="oak-gameboy-mon" data-oak-${side}-mon src="${esc(art)}" alt="${esc(name)}" width="64" height="64" decoding="async">
         </div>`;
    return `<div class="oak-gameboy oak-gameboy-${side}" data-oak-gb-${side} aria-hidden="true">
      <div class="oak-gameboy-shell">
        <div class="oak-gameboy-bezel">
          ${screen}
        </div>
        <div class="oak-gameboy-controls">
          <span class="oak-gameboy-dpad"></span>
          <span class="oak-gameboy-btns"><i></i><i></i></span>
        </div>
        <div class="oak-gameboy-speaker"></div>
        <span class="oak-gameboy-led" data-oak-led-${side}></span>
        <span class="oak-gameboy-port"></span>
      </div>
    </div>`;
  }

  function buildOverlay({ mode, count, first, trainerSprite, trainer }) {
    const name = monName(first?.mon);
    const art = spriteUrl(first?.mon);
    const player = resolvePlayerTrainer({ trainerSprite, trainer });
    const overlay = document.createElement("div");
    overlay.className = "oak-gb-fanfare oak-link-fanfare";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Transfer to Professor Oak");
    overlay.innerHTML = `
      <div class="oak-transfer-stage oak-xfer-stage" data-oak-root tabindex="0">
        <p class="oak-transfer-progress" data-oak-progress hidden></p>
        <div class="oak-transfer-field">
          <div class="oak-transfer-side is-player">
            ${playerTrainerHtml(player)}
            ${gameboyHtml({ side: "player", art, name, empty: false })}
          </div>
          <div class="oak-link-cable" aria-hidden="true">
            <span class="oak-link-wire"></span>
            <span class="oak-link-wire is-accent"></span>
            <span class="oak-link-node"></span>
            <img class="oak-transfer-token" data-oak-token src="${esc(art)}" alt="" width="36" height="36" hidden>
          </div>
          <div class="oak-transfer-side is-oak" data-oak-receiver>
            ${gameboyHtml({ side: "oak", art, name, empty: true })}
            <div class="oak-xfer-avatar oak-xfer-oak">
              <img class="oak-receiver-oak" src="${OAK_SPRITE}" alt="" width="72" height="72" decoding="async">
              <span class="oak-xfer-avatar-tag">Oak</span>
            </div>
          </div>
        </div>
        <div class="oak-transfer-textbox" aria-live="polite">
          <p data-oak-line></p>
        </div>
        <button type="button" class="oak-gb-skip" data-oak-skip>Skip</button>
      </div>
      <div class="oak-xfer-reward oak-gb-reward" data-oak-reward hidden>
        <p class="eyebrow">TRANSFER COMPLETE!</p>
        <h2 data-oak-reward-title>Professor Oak received ${esc(name)}!</h2>
        <div class="oak-xfer-reward-hero">
          <img src="${OAK_SPRITE}" alt="" width="72" height="72" decoding="async">
          <div class="oak-xfer-stamp" aria-hidden="true">Research Completed!</div>
        </div>
        <p class="oak-xfer-reward-kicker">PROFESSOR OAK'S RESEARCH RESULTS</p>
        <ul class="oak-gb-reward-list" data-oak-reward-list></ul>
        <button type="button" class="oak-gb-continue" data-oak-continue>Continue</button>
      </div>`;
    if (mode === "batch") {
      const progress = overlay.querySelector("[data-oak-progress]");
      if (progress) {
        progress.hidden = false;
        progress.textContent = `TRANSFER 0 / ${count}`;
      }
    }
    return overlay;
  }

  async function typeLine(el, text, instant) {
    if (!el) return;
    const value = String(text || "");
    const box = el.closest?.(".oak-transfer-textbox");
    if (instant) {
      el.textContent = value;
      box?.classList.remove("is-line-fade");
      return;
    }
    box?.classList.add("is-line-fade");
    await wait(140);
    el.textContent = "";
    box?.classList.remove("is-line-fade");
    for (let i = 0; i < value.length; i += 1) {
      el.textContent = value.slice(0, i + 1);
      await wait(16);
      if (el.dataset.skip === "1") {
        el.textContent = value;
        return;
      }
    }
  }

  async function softSetScreen(overlay, side, mon, { empty, reduced, quick } = {}) {
    const screen = overlay.querySelector(`[data-oak-screen-${side}]`);
    const fadeMs = reduced ? 0 : quick ? 160 : 340;
    if (screen && fadeMs) {
      screen.classList.add("is-fading");
      screen.classList.remove("is-appearing", "is-highlight", "is-flash");
      await wait(fadeMs);
    }
    setScreenMon(overlay, side, mon, { empty });
    if (screen) {
      screen.classList.remove("is-fading");
      if (fadeMs) {
        screen.classList.add("is-appearing");
        await wait(fadeMs);
        screen.classList.remove("is-appearing");
      }
    }
  }

  function fillRewards(overlay, summary, results) {
    const title = overlay.querySelector("[data-oak-reward-title]");
    const list = overlay.querySelector("[data-oak-reward-list]");
    const count = results.length;
    if (title) {
      title.textContent = count > 1
        ? `Professor Oak received ${count} Pokémon!`
        : `Professor Oak received ${monName(results[0]?.mon)}!`;
    }
    if (!list) return;
    if (!summary.length) {
      list.innerHTML = `<li><span>Evolution Candy Received</span><strong>×?</strong></li>`;
      return;
    }
    list.innerHTML = summary.map((row) => {
      const received = / Received$/i.test(row.label) ? row.label : `${row.label} Received`;
      return `
      <li>
        <img src="${esc(row.art)}" alt="" width="40" height="40" decoding="async">
        <span>${esc(received)}</span>
        <strong aria-label="quantity">×${row.qty}</strong>
      </li>`;
    }).join("");
  }

  function setScreenMon(overlay, side, mon, { empty } = {}) {
    const screen = overlay.querySelector(`[data-oak-screen-${side}]`);
    const img = overlay.querySelector(`[data-oak-${side}-mon]`);
    if (!screen) return;
    if (empty || !mon) {
      screen.classList.add("is-standby");
      // Keep a fixed slot so READY and Pokémon never change screen geometry.
      screen.innerHTML = `<span class="oak-gameboy-standby">READY</span>`;
      return;
    }
    const art = spriteUrl(mon);
    const name = monName(mon);
    if (img) {
      screen.classList.remove("is-standby");
      img.src = art;
      img.alt = name;
      img.hidden = false;
      return;
    }
    screen.classList.remove("is-standby");
    screen.innerHTML = `
      <img class="oak-gameboy-mon" data-oak-${side}-mon src="${esc(art)}" alt="${esc(name)}" width="64" height="64" decoding="async">`;
  }

  /**
   * Presentation only. Call AFTER authoritative Oak transfer success.
   * Never grants candy or deletes catches.
   */
  async function runSequence({ results, families, onDone, trainerSprite, trainer } = {}) {
    const plan = planSequence(results);
    if (!plan.count || typeof document === "undefined") {
      onDone?.();
      return { skipped: true };
    }
    const reduced = reducedMotion();
    const overlay = buildOverlay({
      mode: plan.mode,
      count: plan.count,
      first: plan.results[0],
      trainerSprite,
      trainer
    });
    document.body.classList.add("oak-gb-playing");
    document.body.append(overlay);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => overlay.classList.add("is-ready"));
    });
    const rootEl = overlay.querySelector("[data-oak-root]");
    const rewardEl = overlay.querySelector("[data-oak-reward]");
    const lineEl = overlay.querySelector("[data-oak-line]");
    const token = overlay.querySelector("[data-oak-token]");
    const cable = overlay.querySelector(".oak-link-cable");
    const oakReceiver = overlay.querySelector("[data-oak-receiver]");
    const progressEl = overlay.querySelector("[data-oak-progress]");
    const skipBtn = overlay.querySelector("[data-oak-skip]");
    const continueBtn = overlay.querySelector("[data-oak-continue]");
    const ledPlayer = overlay.querySelector("[data-oak-led-player]");
    const ledOak = overlay.querySelector("[data-oak-led-oak]");
    rootEl?.focus();

    let aborted = false;
    let finished = false;
    let sfxPlayed = false;
    const summary = rewardSummary(plan.results, families);
    let resolveDone;
    const donePromise = new Promise((resolve) => { resolveDone = resolve; });

    const playDoneSfx = () => {
      if (sfxPlayed) return;
      sfxPlayed = true;
      playCompleteSfx();
    };

    const setStage = (name) => {
      if (rootEl) rootEl.dataset.stage = name;
      overlay.dataset.stage = name;
    };

    const finish = () => {
      if (finished) return;
      finished = true;
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("oak-gb-playing");
      overlay.remove();
      onDone?.();
      resolveDone({ ok: true, mode: plan.mode, count: plan.count, summary, stages: stageOrder({ mode: plan.mode, reduced }) });
    };

    const revealReward = async () => {
      setStage("reward");
      playDoneSfx();
      fillRewards(overlay, summary, plan.results);
      if (rootEl) rootEl.classList.add("is-exit");
      if (rewardEl) {
        rewardEl.hidden = false;
        rewardEl.classList.remove("is-visible");
        // Paint stacked in the same grid cell, then fade in place (no bottom→center jump).
        requestAnimationFrame(() => {
          requestAnimationFrame(() => rewardEl.classList.add("is-visible"));
        });
      }
      if (!reduced) await wait(480);
      if (rootEl) rootEl.hidden = true;
      continueBtn?.focus();
    };

    const jumpReward = () => {
      aborted = true;
      if (lineEl) lineEl.dataset.skip = "1";
      revealReward();
    };

    const onKey = (event) => {
      if (event.key === "Escape" || event.key === "Enter" || event.key === " ") {
        if (overlay.dataset.stage === "reward") return;
        event.preventDefault();
        jumpReward();
      }
    };
    document.addEventListener("keydown", onKey);
    skipBtn?.addEventListener("click", (event) => {
      event.preventDefault();
      jumpReward();
    });
    continueBtn?.addEventListener("click", (event) => {
      event.preventDefault();
      finish();
    });

    const playOne = async (row, opts = {}) => {
      const quick = Boolean(opts.quick);
      const mon = row.mon;
      const name = monName(mon);
      const art = spriteUrl(mon);

      await softSetScreen(overlay, "player", mon, { reduced, quick });
      await softSetScreen(overlay, "oak", null, { empty: true, reduced, quick });
      if (token) {
        token.hidden = true;
        token.src = art;
        token.classList.remove("is-moving");
      }
      oakReceiver?.classList.remove("is-receive");
      cable?.classList.remove("is-active");
      ledPlayer?.classList.remove("is-on");
      ledOak?.classList.remove("is-on");

      if (progressEl && plan.mode === "batch") {
        progressEl.hidden = false;
        progressEl.textContent = `TRANSFER ${opts.index} / ${plan.count}`;
      }

      setStage("prepare");
      if (!aborted) {
        await typeLine(lineEl, `Sending ${name} to Professor Oak...`, reduced || quick);
      }
      if (aborted) return;
      await wait(reduced ? 80 : quick ? 280 : 900);
      if (aborted) return;

      if (!reduced) {
        setStage("link");
        cable?.classList.add("is-active");
        ledPlayer?.classList.add("is-on");
        ledOak?.classList.add("is-on");
        await wait(quick ? 360 : 1000);
        if (aborted) return;

        if (!quick) {
          setStage("highlight");
          overlay.querySelector("[data-oak-screen-player]")?.classList.add("is-highlight");
          await wait(780);
          overlay.querySelector("[data-oak-screen-player]")?.classList.remove("is-highlight");
          if (aborted) return;
        }

        setStage("transfer");
        await softSetScreen(overlay, "player", null, { empty: true, reduced, quick });
        if (token) {
          token.hidden = false;
          // restart travel animation cleanly
          token.classList.remove("is-moving");
          void token.offsetWidth;
          token.classList.add("is-moving");
        }
        await wait(quick ? 1000 : 2600);
        if (aborted) return;
        if (token) {
          token.hidden = true;
          token.classList.remove("is-moving");
        }
      } else {
        await softSetScreen(overlay, "player", null, { empty: true, reduced, quick });
        await wait(120);
      }

      setStage("arrive");
      await softSetScreen(overlay, "oak", mon, { reduced, quick });
      overlay.querySelector("[data-oak-screen-oak]")?.classList.add("is-flash");
      await typeLine(lineEl, `${name} arrived at Professor Oak's Lab!`, reduced || quick);
      await wait(reduced ? 160 : quick ? 520 : 1100);
      overlay.querySelector("[data-oak-screen-oak]")?.classList.remove("is-flash");
      if (aborted) return;

      setStage("oak");
      oakReceiver?.classList.add("is-receive");
      await typeLine(lineEl, `Professor Oak received ${name}!`, reduced || quick);
      await wait(reduced ? 160 : quick ? 460 : 950);
    };

    try {
      if (plan.mode === "single") {
        await playOne(plan.results[0], { first: true, index: 1 });
      } else {
        setStage("prepare");
        await typeLine(lineEl, `Sending ${plan.count} Pokémon to Professor Oak...`, reduced);
        cable?.classList.add("is-active");
        ledPlayer?.classList.add("is-on");
        ledOak?.classList.add("is-on");
        await wait(reduced ? 120 : 560);
        for (let i = 0; i < plan.results.length; i += 1) {
          if (aborted) break;
          await playOne(plan.results[i], { quick: true, first: i === 0, index: i + 1 });
        }
        if (!aborted) {
          await typeLine(lineEl, `Professor Oak received ${plan.count} Pokémon!`, reduced);
          await wait(reduced ? 140 : 420);
        }
      }
    } catch (_) {
      // Presentation failure must not undo server success.
    }

    if (!aborted && !finished) {
      await revealReward();
    }

    return donePromise;
  }

  const api = {
    OAK_SPRITE,
    BALL_SPRITE,
    OAK_COMPLETE_SFX,
    spriteUrl,
    monName,
    monCaption,
    isShiny,
    genderMark,
    candyArt,
    candyLabel,
    rewardSummary,
    confirmModel,
    resolvePlayerLabel,
    planSequence,
    stageOrder,
    gameboyHtml,
    resolvePlayerTrainer,
    playerTrainerHtml,
    buildOverlay,
    playCompleteSfx,
    runSequence,
    reducedMotion
  };

  root.playOakTransfer = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
