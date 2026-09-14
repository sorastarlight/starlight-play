(() => {
  const stage = document.getElementById("stage");
  const sprite = document.getElementById("sprite");
  const cfg = window.PLAY_CONFIG || {};
  let lastKey = "";

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
      const key = live ? `${round.id}:${round.variant}:${round.dex}` : "idle";
      if (key === lastKey) return;
      lastKey = key;
      if (!live) {
        stage.classList.remove("shown");
        sprite.removeAttribute("src");
        return;
      }
      sprite.alt = round.name || "Pokémon";
      sprite.src = window.playSpriteUrl(round.dex, round.variant);
      stage.classList.add("shown");
    } catch (_) {}
  }

  tick();
  setInterval(tick, 1000);
})();
