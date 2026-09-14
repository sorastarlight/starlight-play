(() => {
  const stage = document.getElementById("stage");
  const sprite = document.getElementById("sprite");
  const cfg = window.PLAY_CONFIG || {};
  let lastIdentity = "";
  let lastPhase = "";

  async function tick() {
    try {
      const res = await fetch(`${String(cfg.supabaseUrl || "").replace(/\/$/, "")}/rest/v1/rpc/play_sync`, {
        method: "POST",
        headers: {
          apikey: cfg.supabaseKey,
          Authorization: `Bearer ${cfg.supabaseKey}`,
          "Content-Type": "application/json"
        },
        body: "{}"
      });
      const data = await res.json();
      const round = data && data.round;
      const isTest = String(round && round.triggerSource || "") === "TEST";
      const live = Boolean(round && !round.cancelled && round.phase && round.phase !== "closed" && (!round.hidden || isTest));
      const identity = live ? `${round.id}:${round.variant}:${round.dex}` : "idle";
      const phaseKey = live ? `${round.phase}:${round.paused || 0}:${round.resolved || 0}` : "idle";
      if (identity !== lastIdentity) {
        lastIdentity = identity;
        lastPhase = "";
        if (!live) {
          stage.className = "";
          sprite.removeAttribute("src");
          return;
        }
        sprite.alt = round.name || "Pokémon";
        sprite.src = window.playSpriteUrl(round.dex, round.variant);
        stage.classList.add("shown");
      }
      if (!live || phaseKey === lastPhase) return;
      lastPhase = phaseKey;
      stage.classList.toggle("shown", true);
      stage.classList.toggle("is-capture", round.phase === "reveal");
      stage.classList.toggle("is-paused", Boolean(round.paused));
      stage.classList.toggle("is-result", Boolean(round.resolved));
    } catch (_) {}
  }

  tick();
  setInterval(tick, 1000);
})();
