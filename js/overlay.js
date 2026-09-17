(() => {
  const stage = document.getElementById("stage");
  const sprite = document.getElementById("sprite");
  const supportEl = document.getElementById("support-alert");
  const supportWho = document.getElementById("support-who");
  const supportPack = document.getElementById("support-pack");
  const cfg = window.PLAY_CONFIG || {};
  let lastIdentity = "";
  let lastPhase = "";
  let lastSupport = "";

  function showSupport(alert, live) {
    if (!supportEl) return;
    const busy = Boolean(live);
    if (!alert || busy) {
      supportEl.hidden = true;
      return;
    }
    const key = `${alert.at}:${alert.packName}:${alert.displayName}`;
    if (key !== lastSupport) {
      lastSupport = key;
      const who = alert.anonymous ? "A supporter" : String(alert.displayName || "A supporter");
      supportWho.textContent = `${who} supported with ${Number(alert.bits) || 0} Bits!`;
      supportPack.textContent = String(alert.packName || "Starlight pack");
    }
    supportEl.hidden = false;
  }

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
      showSupport(data && data.supportAlert, live);
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
