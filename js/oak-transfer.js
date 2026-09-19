(() => {
  const root = typeof window !== "undefined" ? window : globalThis;

  const OAK_SPRITE = "images/trainers/oak.png";
  const BALL_SPRITE = "images/items/poke-ball.png";

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

  function candyArt(familyId) {
    const id = Number(familyId);
    if (!id) return BALL_SPRITE;
    if (typeof root.playItemSprite === "function") return root.playItemSprite(`species-${id}`);
    if (typeof root.playEvolutionCandyFallback === "function") return root.playEvolutionCandyFallback(id);
    return root.playSpriteUrl?.(id, "normal") || "";
  }

  function candyLabel(familyId, families) {
    const id = Number(familyId);
    const fam = (families || []).find((row) => Number(row.familyId) === id);
    if (fam?.name) return `${fam.name} Evolution Candy`;
    const species = root.playSpeciesName?.(id);
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
      byFamily.set(fam, (byFamily.get(fam) || 0) + amt);
    }
    return [...byFamily.entries()].map(([familyId, qty]) => ({
      familyId,
      qty,
      label: candyLabel(familyId, families),
      art: candyArt(familyId)
    }));
  }

  /** Pure helper: confirmation copy never invents candy totals. */
  function confirmModel(mons) {
    const list = Array.isArray(mons) ? mons : [];
    return {
      count: list.length,
      title: list.length > 1 ? "SEND TO PROFESSOR OAK?" : "SEND TO PROFESSOR OAK?",
      names: list.map(monName),
      rewardHint: "You'll receive Evolution Candy for this Evolution Line.",
      leaveHint: list.length > 1
        ? "These Pokémon will leave your collection."
        : "This Pokémon will leave your collection."
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

  function machineHtml() {
    return `<div class="oak-gb-machine" aria-hidden="true">
      <div class="oak-gb-machine-pod">
        <div class="oak-gb-machine-chamber" data-oak-chamber></div>
        <div class="oak-gb-machine-base"></div>
      </div>
      <div class="oak-gb-machine-panel"></div>
    </div>`;
  }

  function buildOverlay({ mode, count, first }) {
    const name = monName(first?.mon);
    const art = spriteUrl(first?.mon);
    const overlay = document.createElement("div");
    overlay.className = "oak-gb-fanfare";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Transfer to Professor Oak");
    overlay.innerHTML = `
      <div class="oak-gb-stage" data-oak-root tabindex="0">
        <div class="oak-gb-field">
          <div class="oak-gb-side is-player">
            <img class="oak-gb-mon" data-oak-player-mon src="${esc(art)}" alt="${esc(name)}" width="72" height="72" decoding="async">
            <span class="oak-gb-label">YOU</span>
          </div>
          <div class="oak-gb-cable" aria-hidden="true">
            <i class="oak-gb-beam"></i>
            <img class="oak-gb-ball" data-oak-ball src="${BALL_SPRITE}" alt="" width="24" height="24" hidden>
          </div>
          <div class="oak-gb-side is-oak">
            ${machineHtml()}
            <img class="oak-gb-oak" src="${OAK_SPRITE}" alt="" width="72" height="72" decoding="async">
            <img class="oak-gb-received" data-oak-received src="${esc(art)}" alt="" width="56" height="56" hidden>
            <span class="oak-gb-label">OAK</span>
          </div>
        </div>
        <div class="oak-gb-textbox" aria-live="polite">
          <p data-oak-line></p>
        </div>
        <button type="button" class="oak-gb-skip" data-oak-skip>Skip</button>
      </div>
      <div class="oak-gb-reward" data-oak-reward hidden>
        <h2 data-oak-reward-title>Professor Oak received ${esc(name)}!</h2>
        <p class="muted">You received:</p>
        <ul class="oak-gb-reward-list" data-oak-reward-list></ul>
        <button type="button" class="oak-gb-continue" data-oak-continue>Continue</button>
      </div>`;
    if (mode === "batch") {
      const line = overlay.querySelector("[data-oak-line]");
      if (line) line.textContent = `Sending ${count} Pokémon to Professor Oak...`;
    }
    return overlay;
  }

  async function typeLine(el, text, instant) {
    if (!el) return;
    const value = String(text || "");
    if (instant) {
      el.textContent = value;
      return;
    }
    el.textContent = "";
    for (let i = 0; i < value.length; i += 1) {
      el.textContent = value.slice(0, i + 1);
      await wait(18);
      if (el.dataset.skip === "1") {
        el.textContent = value;
        return;
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
      list.innerHTML = `<li><span>Evolution Candy</span><strong>×?</strong></li>`;
      return;
    }
    list.innerHTML = summary.map((row) => `
      <li>
        <img src="${esc(row.art)}" alt="" width="40" height="40" decoding="async">
        <span>${esc(row.label)}</span>
        <strong>×${row.qty}</strong>
      </li>`).join("");
  }

  /**
   * Presentation only. Call AFTER authoritative Oak transfer success.
   * Never grants candy or deletes catches.
   */
  async function runSequence({ results, families, onDone } = {}) {
    const plan = planSequence(results);
    if (!plan.count || typeof document === "undefined") {
      onDone?.();
      return { skipped: true };
    }
    const reduced = reducedMotion();
    const overlay = buildOverlay({
      mode: plan.mode,
      count: plan.count,
      first: plan.results[0]
    });
    document.body.classList.add("oak-gb-playing");
    document.body.append(overlay);
    const rootEl = overlay.querySelector("[data-oak-root]");
    const rewardEl = overlay.querySelector("[data-oak-reward]");
    const lineEl = overlay.querySelector("[data-oak-line]");
    const playerMon = overlay.querySelector("[data-oak-player-mon]");
    const ball = overlay.querySelector("[data-oak-ball]");
    const received = overlay.querySelector("[data-oak-received]");
    const chamber = overlay.querySelector("[data-oak-chamber]");
    const skipBtn = overlay.querySelector("[data-oak-skip]");
    const continueBtn = overlay.querySelector("[data-oak-continue]");
    rootEl?.focus();

    let aborted = false;
    let finished = false;
    const summary = rewardSummary(plan.results, families);
    let resolveDone;
    const donePromise = new Promise((resolve) => { resolveDone = resolve; });

    const finish = () => {
      if (finished) return;
      finished = true;
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("oak-gb-playing");
      overlay.remove();
      onDone?.();
      resolveDone({ ok: true, mode: plan.mode, count: plan.count, summary });
    };

    const jumpReward = () => {
      aborted = true;
      if (lineEl) lineEl.dataset.skip = "1";
      overlay.dataset.stage = "reward";
      if (rootEl) rootEl.hidden = true;
      fillRewards(overlay, summary, plan.results);
      if (rewardEl) rewardEl.hidden = false;
      continueBtn?.focus();
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
      const name = monName(row.mon);
      const art = spriteUrl(row.mon);
      if (playerMon) {
        playerMon.src = art;
        playerMon.alt = name;
        playerMon.hidden = false;
        playerMon.classList.remove("is-gone");
      }
      if (received) {
        received.hidden = true;
        received.src = art;
      }
      if (ball) {
        ball.hidden = true;
        ball.style.removeProperty("--oak-travel");
        ball.classList.remove("is-moving");
      }
      chamber?.classList.remove("is-active");

      if (!aborted) {
        await typeLine(lineEl, plan.mode === "batch" && !opts.first
          ? `Sending ${name}...`
          : `Sending ${name} to Professor Oak...`, reduced || quick);
      }
      if (aborted) return;
      await wait(reduced ? 120 : quick ? 180 : 420);
      if (aborted) return;

      playerMon?.classList.add("is-flash");
      await wait(reduced ? 80 : quick ? 120 : 220);
      playerMon?.classList.remove("is-flash");
      playerMon?.classList.add("is-gone");
      if (ball) {
        ball.hidden = false;
        ball.classList.add("is-moving");
      }
      if (lineEl && !reduced) lineEl.textContent = "…";
      await wait(reduced ? 160 : quick ? 280 : 900);
      if (aborted) return;

      if (ball) ball.hidden = true;
      chamber?.classList.add("is-active");
      if (received) received.hidden = false;
      await typeLine(lineEl, `Professor Oak received ${name}!`, reduced || quick);
      await wait(reduced ? 200 : quick ? 260 : 520);
    };

    try {
      if (plan.mode === "single") {
        await playOne(plan.results[0], { first: true });
      } else {
        await typeLine(lineEl, `Sending ${plan.count} Pokémon to Professor Oak...`, reduced);
        await wait(reduced ? 160 : 360);
        for (let i = 0; i < plan.results.length; i += 1) {
          if (aborted) break;
          await playOne(plan.results[i], { quick: true, first: i === 0 });
        }
        if (!aborted) {
          await typeLine(lineEl, `Professor Oak received ${plan.count} Pokémon!`, reduced);
          await wait(reduced ? 180 : 360);
        }
      }
    } catch (_) {
      // Presentation failure must not undo server success.
    }

    if (!aborted && !finished) {
      overlay.dataset.stage = "reward";
      if (rootEl) rootEl.hidden = true;
      fillRewards(overlay, summary, plan.results);
      if (rewardEl) rewardEl.hidden = false;
      continueBtn?.focus();
    }

    return donePromise;
  }

  const api = {
    OAK_SPRITE,
    BALL_SPRITE,
    spriteUrl,
    monName,
    candyArt,
    candyLabel,
    rewardSummary,
    confirmModel,
    planSequence,
    runSequence,
    reducedMotion
  };

  root.playOakTransfer = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
