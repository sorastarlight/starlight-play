(() => {
  const supabase = window.playSupabase;
  const gate = document.getElementById("gate");
  const profileBox = document.getElementById("profile");
  const hero = document.getElementById("hero");
  const caught = document.getElementById("caught-grid");
  const title = document.getElementById("page-title");

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

  function favoriteSprite(card) {
    if (!card.favoriteDex) return "";
    return `<img class="fav-sprite" src="${window.playSpriteUrl(card.favoriteDex, card.favoriteVariant)}" alt="">`;
  }

  function render(card, recent) {
    const pct = Math.max(0, Math.min(100, Math.round((card.xpInto / Math.max(1, card.xpNeed)) * 100)));
    const avatar = card.avatar
      ? `<img src="${card.avatar}" alt="">`
      : `<span class="avatar-fallback">${(card.displayName || "T").slice(0, 1)}</span>`;
    const favName = card.favoriteDex ? window.playSpeciesName(card.favoriteDex) : "";
    title.textContent = card.displayName;
    hero.innerHTML = `
      ${avatar}
      <div>
        <h2>${card.displayName} ${card.pass ? '<span class="chip pass">Starlight Pass</span>' : ""}</h2>
        <p class="muted">@${card.login} · ${card.online ? "Online on Play" : "Away"}</p>
        ${card.title ? `<p class="trainer-title">${card.title}</p>` : ""}
        <p><strong>Trainer Lv. ${card.level}</strong> · ${card.xp} XP</p>
        <p>${card.caught} caught · ${card.species}/151 in the Pokédex · ${window.playWatchHours(card.watchSeconds)} live watch time</p>
        ${favName ? `<p class="fav-line">${favoriteSprite(card)} Favorite: ${String(card.favoriteVariant || "").includes("shiny") ? "Shiny " : ""}${favName}</p>` : `<p class="muted">No favorite Pokémon set yet.</p>`}
        <div class="xp-bar" aria-hidden="true"><i style="width:${pct}%"></i></div>
      </div>`;
    caught.innerHTML = (recent || []).map((row) => `
      <article class="caught-card">
        <img src="${window.playSpriteUrl(row.dex, row.variant)}" alt="">
        <strong>${String(row.variant || "").includes("shiny") ? `Shiny ${row.name}` : row.name}</strong>
        <span>${window.playItemLabel(row.ball) || ""} · ${row.gender || ""}</span>
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
      gate.textContent = window.playRpcError(error, "No trainer card for that login yet.");
    }
  }

  supabase.auth.onAuthStateChange((event) => {
    if (window.playAuthNoise(event)) return;
    load();
  });
  load();
})();
