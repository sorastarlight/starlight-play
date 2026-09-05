(() => {
  window.playRenderBagStrip = function playRenderBagStrip(bag) {
    const items = [
      ["berry", "Berry"],
      ["bait", "Bait"],
      ["pokeball", "Poké Ball"],
      ["greatball", "Great"],
      ["ultraball", "Ultra"]
    ];
    if (!bag) {
      return `<p class="muted">Sign in to see your test bag.</p>`;
    }
    return `<ul class="bag-strip">${items.map(([key, label]) => (
      `<li><span>${label}</span><strong>${bag[key] ?? 0}</strong></li>`
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
    const shiny = String(round.variant || "").includes("shiny") ? `<span class="chip shiny">Shiny</span>` : "";
    const results = round.resolved && round.results
      ? `<p class="result-line">Caught ${round.results.caught || 0} · Escaped ${round.results.escaped || 0} · No throw ${round.results.noThrow || 0}</p>`
      : "";
    return `
      <div class="dex-head">
        <span class="dex-no">No. ${String(round.dex || 0).padStart(3, "0")}</span>
        ${hidden}${shiny}
      </div>
      <div class="dex-stage">
        ${sprite ? `<img src="${sprite}" alt="${name}">` : ""}
        <div class="dex-copy">
          <p class="wild-label">A wild</p>
          <h2>${name}</h2>
          <p class="muted">${round.gender || "Unknown"} · ${phase}${round.phase !== "closed" && seconds ? ` · ${seconds}s` : ""}</p>
        </div>
      </div>
      <div class="phase-bar" aria-hidden="true"><i style="width:${opts.bar || 0}%"></i></div>
      <dl class="dex-stats">
        <div><dt>Trainers</dt><dd>${round.participants || 0}</dd></div>
        <div><dt>Prepared</dt><dd>${round.prepared || 0}</dd></div>
        <div><dt>Thrown</dt><dd>${round.thrown || 0}</dd></div>
        <div><dt>Bait bonus</dt><dd>+${round.baitBonusPercent || 0}%</dd></div>
      </dl>
      ${round.lastAction ? `<p class="last-action">${round.lastAction}</p>` : ""}
      ${results}`;
  };
})();
