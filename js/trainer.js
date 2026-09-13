(() => {
  const supabase = window.playSupabase;
  const gate = document.getElementById("gate");
  const profileBox = document.getElementById("profile");
  const hero = document.getElementById("hero");
  const caught = document.getElementById("caught-grid");
  const title = document.getElementById("page-title");
  const face = document.getElementById("profile-face");

  window.playBindAccountNav();

  async function loadNav() {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session) {
      window.playSetAccountNav(null);
      return session;
    }
    const { data: profile } = await supabase.from("profiles").select("display_name, twitch_login, avatar_url").eq("id", session.user.id).maybeSingle();
    let extras = {};
    try {
      const snapshot = await window.playCall("play_state");
      extras = { isAdmin: Boolean(snapshot?.isAdmin), trainer: snapshot?.trainer };
    } catch (_) {}
    window.playSetAccountNav(session, profile, extras);
    return { session, profile };
  }

  function render(card, recent) {
    title.textContent = card.displayName;
    if (face) {
      face.hidden = false;
      face.className = "twitch-face twitch-face-lg";
      face.innerHTML = window.playTwitchFaceInner(card.avatar, card.displayName);
    }
    hero.innerHTML = window.playRenderIdCard(card);
    const kanto = card.kanto || {};
    const variants = card.variants || {};
    const badges = (card.badges || []).slice(0, 5).map((row) => `<span class="chip">${row.name}</span>`).join("");
    const extra = document.getElementById("trainer-progress");
    if (extra) {
      extra.innerHTML = `
        <h2>${card.displayName || "Trainer"}</h2>
        <p class="muted">${card.title || "Trainer"} · Lv. ${card.level || 1}</p>
        <p>Kanto Pokédex: ${kanto.caught || card.species || 0} / ${kanto.total || 151} · ${kanto.percent || 0}%</p>
        <p>Total catches: ${card.caught || 0} · Shinies: ${variants.shinySpecies || 0} · Female variants: ${variants.femaleVariants || 0}</p>
        <p>Evolved: ${card.evolved || 0} · Trades: ${card.tradesDone || 0} · Species mastered: ${card.speciesMastered || 0}</p>
        ${badges ? `<p>Featured badges: ${badges}</p>` : ""}`;
    }
    caught.innerHTML = (recent || []).map((row) => `
      <article class="caught-card">
        <img src="${window.playSpriteUrl(row.dex, row.variant)}" alt="">
        <strong>${window.playCaughtName(row)}</strong>
        <span>${window.playCaughtBlurb(row)}</span>
      </article>`).join("") || `<p class="muted">No catches yet.</p>`;
  }

  async function load() {
    const nav = await loadNav();
    const login = new URLSearchParams(location.search).get("u")
      || nav?.profile?.twitch_login
      || "";
    if (!login) {
      gate.textContent = "Sign in, or open a trainer from Rankings.";
      return;
    }
    try {
      const data = await window.playCall("play_trainer", { p_login: login });
      render(data.trainer, data.recent);
      gate.hidden = true;
      profileBox.hidden = false;
    } catch (error) {
      gate.textContent = window.playRpcError(error, "No Trainer ID for that login yet.");
    }
  }

  supabase.auth.onAuthStateChange((event) => {
    if (window.playAuthNoise(event)) return;
    load();
  });
  load();
})();
