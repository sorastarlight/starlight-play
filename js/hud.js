(() => {
  window.playRenderBagStrip = function playRenderBagStrip(bag) {
    const items = [
      ["coins", "Coins"],
      ["berry", "Berry"],
      ["bait", "Bait"],
      ["pokeball", "Poké Ball"],
      ["greatball", "Great"],
      ["ultraball", "Ultra"],
      ["lure", "Lure"]
    ];
    if (!bag) {
      return `<p class="muted">Sign in to see your inventory.</p>`;
    }
    return `<ul class="bag-strip inv-strip">${items.map(([key, label]) => (
      `<li><img src="${window.playItemSprite(key)}" alt=""><span>${label}</span><strong>${bag[key] ?? 0}</strong></li>`
    )).join("")}</ul>`;
  };

  window.playRenderEncounter = function playRenderEncounter(round, options) {
    const opts = options || {};
    if (!round) {
      return `
        <div class="dex-empty">
          <p>No wild Pokémon right now.</p>
          <p class="muted">${opts.emptyNote || "When Sora starts a community encounter, it will appear here."}</p>
        </div>`;
    }
    const name = window.playDisplayName(round);
    const phase = window.playPhaseLabel(round.phase);
    const seconds = window.playSecondsLeft(round.endsAt);
    const sprite = window.playSpriteUrl(round.dex, round.variant);
    const hidden = round.hidden ? `<span class="chip warn">Hidden</span>` : "";
    const live = round.source === "mixitup" ? `<span class="chip">Live</span>` : "";
    const shiny = String(round.variant || "").includes("shiny") ? `<span class="chip shiny">Shiny</span>` : "";
    const female = String(round.variant || "") === "female" ? `<span class="chip">Female</span>` : "";
    const results = round.resolved && round.results
      ? `<p class="result-line" data-results>Caught ${round.results.caught || 0} · Escaped ${round.results.escaped || 0} · No throw ${round.results.noThrow || 0}</p>`
      : "";
    return `
      <div class="dex-head">
        <span class="dex-no">No. ${String(round.dex || 0).padStart(3, "0")}</span>
        ${hidden}${live}${shiny}${female}
      </div>
      <div class="dex-stage">
        ${sprite ? `<img src="${sprite}" alt="${name}" onerror="this.onerror=null;this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${Number(round.dex)}.png'">` : ""}
        <div class="dex-copy">
          <p class="wild-label">A wild</p>
          <h2>${name}</h2>
          <p class="muted">${round.gender || "Unknown"} · <span data-phase>${phase}</span>${round.phase !== "closed" ? ` · <span data-time>${seconds || 0}s</span>` : ""}</p>
        </div>
      </div>
      <div class="phase-wrap">
        <div class="phase-label"><span data-phase-name>${phase}</span><span data-time-copy>${seconds ? `${seconds}s left` : "Waiting"}</span></div>
        <div class="phase-bar" aria-hidden="true"><i data-bar style="width:${opts.bar || 0}%"></i></div>
      </div>
      <dl class="dex-stats">
        <div><dt>Trainers</dt><dd data-stat="participants">${round.participants || 0}</dd></div>
        <div><dt>Prepared</dt><dd data-stat="prepared">${round.prepared || 0}</dd></div>
        <div><dt>Throws</dt><dd data-stat="thrown">${round.thrown || 0}</dd></div>
        <div><dt>Bait bonus</dt><dd data-stat="bait">+${round.baitBonusPercent || 0}%</dd></div>
      </dl>
      ${round.lastAction ? `<p class="last-action" data-last>${round.lastAction}</p>` : `<p class="last-action" data-last hidden></p>`}
      ${results}`;
  };

  window.playPatchEncounter = function playPatchEncounter(root, round, bar) {
    if (!root || !round) return false;
    const seconds = window.playSecondsLeft(round.endsAt);
    const phase = window.playPhaseLabel(round.phase);
    const time = root.querySelector("[data-time]");
    const timeCopy = root.querySelector("[data-time-copy]");
    const phaseEl = root.querySelector("[data-phase]");
    const phaseName = root.querySelector("[data-phase-name]");
    const barEl = root.querySelector("[data-bar]");
    const last = root.querySelector("[data-last]");
    if (time) time.textContent = `${seconds || 0}s`;
    if (timeCopy) timeCopy.textContent = seconds ? `${seconds}s left` : "Waiting";
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
})();
