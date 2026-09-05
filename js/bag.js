(() => {
  const supabase = window.playSupabase;
  const els = {
    gate: document.getElementById("gate"),
    trainer: document.getElementById("trainer"),
    bag: document.getElementById("bag-grid"),
    caught: document.getElementById("caught-grid"),
    note: document.getElementById("caught-note")
  };

  window.playBindAccountNav({
    onSignOut() {
      els.trainer.hidden = true;
      els.gate.hidden = false;
    }
  });

  function renderBag(bag) {
    const items = [
      ["berry", "Berry", "Raises your own catch chance."],
      ["bait", "Bait", "Shares a small bonus with everyone."],
      ["pokeball", "Poké Ball", "45% base catch chance."],
      ["greatball", "Great Ball", "60% base catch chance."],
      ["ultraball", "Ultra Ball", "75% base catch chance."]
    ];
    els.bag.innerHTML = items.map(([key, label, hint]) => (
      `<article class="bag-card"><span>${label}</span><strong>${bag?.[key] ?? 0}</strong><p class="muted">${hint}</p></article>`
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
    let isAdmin = false;
    try {
      const snapshot = await window.playCall("play_state");
      isAdmin = Boolean(snapshot?.isAdmin);
      renderBag(snapshot?.bag);
    } catch (_) {
      renderBag(null);
    }
    window.playSetAccountNav(session, profile, { isAdmin });
    const { data: catches } = await supabase.from("catches").select("dex, name, variant, gender, ball, caught_at").order("caught_at", { ascending: false });
    renderCaught(catches || []);
    els.gate.hidden = true;
    els.trainer.hidden = false;
  }

  supabase.auth.onAuthStateChange(() => { load(); });
  load();
})();
