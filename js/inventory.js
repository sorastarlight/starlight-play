(() => {
  const supabase = window.playSupabase;
  const els = {
    gate: document.getElementById("gate"),
    trainer: document.getElementById("trainer"),
    card: document.getElementById("trainer-card"),
    bag: document.getElementById("bag-grid"),
    caught: document.getElementById("caught-grid"),
    note: document.getElementById("caught-note"),
    capacity: document.getElementById("capacity-note"),
    status: document.getElementById("inv-status"),
    lure: document.getElementById("use-lure")
  };

  window.playBindAccountNav({
    onSignOut() {
      els.trainer.hidden = true;
      els.gate.hidden = false;
    }
  });

  function renderCard(trainer) {
    if (!trainer) {
      els.card.innerHTML = "";
      return;
    }
    const pct = Math.max(0, Math.min(100, Math.round((trainer.xpInto / Math.max(1, trainer.xpNeed)) * 100)));
    const avatar = trainer.avatar
      ? `<img src="${trainer.avatar}" alt="">`
      : `<span class="avatar-fallback">${(trainer.displayName || "T").slice(0, 1)}</span>`;
    els.card.innerHTML = `
      ${avatar}
      <div>
        <h2>${trainer.displayName} ${trainer.pass ? '<span class="chip pass">Pass</span>' : ""}</h2>
        <p class="muted">@${trainer.login || "trainer"} · ${trainer.online ? "Online on Play" : "Away"}</p>
        <p><strong>Lv. ${trainer.level}</strong> · ${trainer.caught} caught · ${trainer.species}/151 · ${window.playWatchHours(trainer.watchSeconds)} watched</p>
        <div class="xp-bar" aria-hidden="true"><i style="width:${pct}%"></i></div>
      </div>`;
  }

  function renderBag(bag) {
    const items = [
      ["coins", "PokéCoins", "Earned in play. No cash value."],
      ["berry", "Berry", "Personal catch boost during prepare."],
      ["bait", "Bait", "Shared bonus during prepare."],
      ["pokeball", "Poké Ball", "Normal throw."],
      ["greatball", "Great Ball", "Better ball, still a normal throw."],
      ["ultraball", "Ultra Ball", "Best ball, still a normal throw."],
      ["lure", "Lure", "Auto-join the next encounter."]
    ];
    els.capacity.textContent = bag
      ? `${bag.used || 0} / ${bag.capacity || 50} item space${bag.lureArmed ? " · Lure armed" : ""}`
      : "";
      els.bag.innerHTML = items.map(([key, label, hint]) => (
      `<article class="bag-card">
        <img class="item-sprite" src="${window.playItemSprite(key)}" alt="">
        <span>${label}</span>
        <strong>${bag?.[key] ?? 0}</strong>
        <p class="muted">${hint}</p>
      </article>`
    )).join("");
  }

  function renderCaught(rows) {
    if (!rows?.length) {
      els.note.textContent = "Nothing caught yet. Join a Play encounter when one is live.";
      els.caught.innerHTML = "";
      return;
    }
    const species = new Set(rows.map((row) => row.dex)).size;
    els.note.textContent = `${rows.length} caught · ${species} species`;
    els.caught.innerHTML = rows.map((row) => {
      const name = String(row.variant || "").includes("shiny") ? `Shiny ${row.name}` : row.name;
      return `<article class="caught-card">
        <img src="${window.playSpriteUrl(row.dex, row.variant)}" alt="">
        <strong>${name}</strong>
        <span>${window.playItemLabel(row.ball) || "Ball"} · ${row.gender || ""}</span>
      </article>`;
    }).join("");
  }

  async function load() {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session) {
      els.trainer.hidden = true;
      els.gate.hidden = false;
      window.playSetAccountNav(null);
      return;
    }
    const { data: profile } = await supabase.from("profiles").select("display_name, twitch_login, avatar_url").eq("id", session.user.id).maybeSingle();
    let snapshot = null;
    try {
      snapshot = await window.playCall("play_state");
    } catch (_) {
      snapshot = null;
    }
    window.playSetAccountNav(session, profile, { isAdmin: Boolean(snapshot?.isAdmin), trainer: snapshot?.trainer });
    renderCard(snapshot?.trainer);
    renderBag(snapshot?.bag);
    const { data: catches } = await supabase.from("catches").select("dex, name, variant, gender, ball, caught_at").order("caught_at", { ascending: false });
    renderCaught(catches || []);
    els.gate.hidden = true;
    els.trainer.hidden = false;
  }

  els.lure.addEventListener("click", async () => {
    els.status.textContent = "Arming Lure…";
    try {
      const data = await window.playCall("play_use_lure");
      els.status.textContent = data.message || "Lure armed.";
      renderBag(data.bag);
    } catch (error) {
      els.status.textContent = window.playRpcError(error);
    }
  });

  supabase.auth.onAuthStateChange((event) => { if (window.playAuthNoise(event)) return; load(); });
  load();
})();
