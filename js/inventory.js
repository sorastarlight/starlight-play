(() => {
  const supabase = window.playSupabase;
  const els = {
    gate: document.getElementById("gate"),
    trainer: document.getElementById("trainer"),
    card: document.getElementById("trainer-card"),
    bag: document.getElementById("bag-grid"),
    capacity: document.getElementById("capacity-note"),
    capacityBar: document.getElementById("capacity-bar"),
    status: document.getElementById("inv-status"),
    lurePanel: document.getElementById("lure-panel")
  };
  let invChannel = null;

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
    els.card.innerHTML = `
      ${window.playTwitchFaceHtml(trainer.avatar, trainer.displayName, "twitch-face-hero")}
      <div>
        <h2>${trainer.displayName}</h2>
        <p class="muted">@${trainer.login || "trainer"} · ${trainer.online ? "Online on Play" : "Away"}</p>
        <p><strong>Lv. ${trainer.level}</strong> · ${trainer.caught} caught · ${trainer.species}/151 · ${window.playWatchHours(trainer.watchSeconds)} watched</p>
        <div class="xp-bar" aria-hidden="true"><i style="width:${pct}%"></i></div>
      </div>`;
  }

  function renderBag(bag) {
    const groups = [
      {
        title: "Wallet",
        note: "Spend these on the Store.",
        items: [
          ["coins", "PokéCoins", "Earned by joining and catching. Spend them on the Store. No cash value, no trading."]
        ]
      },
      {
        title: "Berries",
        note: "One Berry per encounter, used before anyone throws a ball.",
        items: (window.PLAY_BERRIES || [])
          .filter((row) => row.key === "berry" || Number(bag?.[row.key] || 0) > 0)
          .map((row) => [row.key, row.name, row.description])
      },
      {
        title: "Encounter Items",
        note: "Use these after you join, before anyone throws a ball.",
        items: [
          ["bait", "Honey", "Contribute Honey to help every Trainer in the encounter! The more Trainers who contribute, the stronger the community bonus becomes."],
          ["lure", "Poké Radar", "Automatically detects nearby Pokémon and joins you to any encounter that appears. Lasts 30 minutes."]
        ]
      },
      {
        title: "Poké Balls",
        note: "Use these when the encounter is ready to catch.",
        items: (window.PLAY_BALLS || [])
          .filter((row) => !row.extra || Number(bag?.[row.key] || 0) > 0)
          .map((row) => [row.key, row.name, row.effect])
      },
      {
        title: "Evolution Items",
        note: "Used with family Candy on the Evolution page. Candy itself is not sold.",
        items: ["firestone", "waterstone", "thunderstone", "leafstone", "moonstone", "linkingcord"]
          .filter((key) => Number(bag?.[key] || 0) > 0)
          .map((key) => [key, window.playItemLabel(key), ({
            firestone: "A peculiar stone that can trigger certain Fire-type evolutions.",
            waterstone: "A peculiar stone that can trigger certain Water-type evolutions.",
            thunderstone: "A peculiar stone that can trigger certain Electric-type evolutions.",
            leafstone: "A peculiar stone that can trigger certain plant-related evolutions.",
            moonstone: "A mysterious stone associated with certain unusual evolutions.",
            linkingcord: "A mysterious cord that can trigger certain evolutions normally caused by trading."
          })[key]])
      }
    ];
    window.playFillBagMeter(bag);
    window.playFillLurePanel(bag);
    els.bag.innerHTML = groups.map((group) => `
      <section class="bag-group">
        <h3>${group.title}</h3>
        ${group.note ? `<p class="muted bag-group-note">${group.note}</p>` : ""}
        <div class="bag-rows">
          ${group.items.map(([key, label, hint]) => `
            <article class="bag-row${key === "coins" ? " coins" : ""}">
              <img class="item-sprite" src="${window.playItemSprite(key)}" alt="">
              <div class="bag-copy">
                <h3>${label}</h3>
                <p>${hint}</p>
              </div>
              ${key === "coins"
                ? `<strong class="bag-qty">${window.playCoinsHtml(bag?.[key] ?? 0)}</strong>`
                : `<strong class="bag-qty">${bag?.[key] ?? 0}</strong>`}
            </article>`).join("")}
        </div>
      </section>`).join("");
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
    let bag = snapshot?.bag || {};
    try {
      const collection = await window.playCall("play_collection");
      bag = { ...bag, ...(collection?.items || {}) };
    } catch (_) {}
    renderBag(bag);
    els.gate.hidden = true;
    els.trainer.hidden = false;
    if (invChannel) supabase.removeChannel(invChannel);
    invChannel = supabase.channel("play-inv")
      .on("postgres_changes", { event: "*", schema: "public", table: "inventories", filter: `user_id=eq.${session.user.id}` }, async () => {
        try {
          const snap = await window.playCall("play_state");
          renderCard(snap?.trainer);
          let nextBag = snap?.bag || {};
          try {
            const collection = await window.playCall("play_collection");
            nextBag = { ...nextBag, ...(collection?.items || {}) };
          } catch (_) {}
          renderBag(nextBag);
        } catch (_) {}
      })
      .subscribe();
  }

  window.playBindLureButton((data) => {
    renderBag(data.bag);
  });

  supabase.auth.onAuthStateChange((event) => { if (window.playAuthNoise(event)) return; load(); });
  load();
})();
