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
        items: [
          ["coins", "PokéCoins", "Earned by joining and catching. Spend them on the Store. No cash value, no trading."]
        ]
      },
      {
        title: "Prepare",
        items: [
          ["berry", "Berry", "Use one during Prepare. Adds 10 percentage points to your catch chance this encounter."],
          ["bait", "Honey", "Use one during Prepare. Helps everyone’s catch chance, up to +15% based on how many people use Honey."]
        ]
      },
      {
        title: "Throw",
        items: [
          ["pokeball", "Poké Ball", "Throw during the catch phase. 45% base chance. Berry and Honey can still raise it."],
          ["greatball", "Great Ball", "Throw during the catch phase. 60% base chance. A steadier throw than a Poké Ball."],
          ["ultraball", "Ultra Ball", "Throw during the catch phase. 75% base chance. The best catch rate in Play."],
          ...((window.PLAY_BALLS || [])
            .filter((row) => row.extra && Number(bag?.[row.key] || 0) > 0)
            .map((row) => [
              row.key,
              row.name,
              `${Math.round(row.rate * 100)}% catch. Looks different; no extra catch effects.`
            ]))
        ]
      }
    ];
    const used = bag?.used || 0;
    const cap = bag?.capacity || 50;
    const pct = Math.round((used / Math.max(1, cap)) * 100);
    els.capacity.textContent = `${used} / ${cap} item space`;
    if (els.capacityBar) els.capacityBar.style.width = `${Math.min(100, pct)}%`;
    window.playFillLurePanel(bag);
    els.bag.innerHTML = groups.map((group) => `
      <section class="bag-group">
        <h3>${group.title}</h3>
        <div class="bag-rows">
          ${group.items.map(([key, label, hint]) => `
            <article class="bag-row${key === "coins" ? " coins" : ""}">
              <img class="item-sprite" src="${window.playItemSprite(key)}" alt="">
              <div class="bag-copy">
                <h3>${label}</h3>
                <p>${hint}</p>
              </div>
              <strong class="bag-qty">${bag?.[key] ?? 0}</strong>
            </article>`).join("")}
        </div>
      </section>`).join("");
  }

  function renderCaught(rows, teamIds) {
    if (!rows?.length) {
      els.note.textContent = "Nothing caught yet. Join a Play encounter when one is live.";
      els.caught.innerHTML = "";
      return;
    }
    const species = new Set(rows.map((row) => row.dex)).size;
    els.note.textContent = `${rows.length} caught · ${species} species · open Storage for stats, nicknames, and Oak`;
    els.caught.innerHTML = rows.slice(0, 18).map((row) => {
      const slot = (teamIds || []).findIndex((id) => String(id) === String(row.id)) + 1;
      const cp = Number(row.cp) || window.playMonCp?.(row) || "";
      return `<a class="lgpe-mon" href="./storage.html">
        ${slot ? `<span class="lgpe-party">${slot}</span>` : ""}
        ${slot === 1 ? `<span class="lgpe-heart" aria-hidden="true">♥</span>` : ""}
        <span class="lgpe-sprite"><img src="${window.playSpriteUrl(row.dex, row.variant)}" alt=""></span>
        ${cp ? `<strong class="lgpe-cp">${cp}</strong>` : ""}
      </a>`;
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
    try {
      const storage = await window.playCall("play_storage");
      renderCaught(storage?.mons || [], storage?.teamIds || []);
    } catch (_) {
      const { data: catches } = await supabase.from("catches").select("id, dex, name, variant, gender, ball, caught_at").order("caught_at", { ascending: false });
      renderCaught(catches || [], snapshot?.trainer?.teamIds || []);
    }
    els.gate.hidden = true;
    els.trainer.hidden = false;
    if (invChannel) supabase.removeChannel(invChannel);
    invChannel = supabase.channel("play-inv")
      .on("postgres_changes", { event: "*", schema: "public", table: "inventories", filter: `user_id=eq.${session.user.id}` }, async () => {
        try {
          const snap = await window.playCall("play_state");
          renderCard(snap?.trainer);
          renderBag(snap?.bag);
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
