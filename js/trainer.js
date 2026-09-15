(() => {
  const supabase = window.playSupabase;
  const gate = document.getElementById("gate");
  const profileBox = document.getElementById("profile");
  const hero = document.getElementById("hero");
  const caught = document.getElementById("caught-grid");
  const title = document.getElementById("page-title");
  const face = document.getElementById("profile-face");
  let card = null;

  window.playBindAccountNav();

  async function loadNav() {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session) {
      window.playSetAccountNav(null);
      return session;
    }
    const { data: profile } = await supabase.from("profiles").select("display_name, twitch_login, avatar_url, username").eq("id", session.user.id).maybeSingle();
    let extras = {};
    try {
      const snapshot = await window.playCall("play_state");
      extras = { isAdmin: Boolean(snapshot?.isAdmin), trainer: snapshot?.trainer, twitchLinked: snapshot?.twitchLinked };
    } catch (_) {}
    window.playSetAccountNav(session, profile, extras);
    return { session, profile };
  }

  function render(card, recent, mine) {
    title.textContent = card.displayName;
    if (face) {
      face.hidden = false;
      face.className = "twitch-face twitch-face-lg";
      face.innerHTML = window.playTwitchFaceInner(card.avatar, card.displayName, Boolean(card.twitchLinked));
      face.classList.toggle("has-twitch", Boolean(card.twitchLinked));
    }
    hero.innerHTML = window.playRenderIdCard(card);
    const kanto = card.kanto || {};
    const variants = card.variants || {};
    const badges = (card.badges || []).slice(0, 5).map((row) => `<span class="chip">${window.playEscapeAttr(row.name)}</span>`).join("");
    const extra = document.getElementById("trainer-progress");
    if (extra) {
      extra.innerHTML = `
        <h2>${window.playEscapeAttr(card.displayName || "Trainer")}</h2>
        <p class="muted">${window.playEscapeAttr(card.title || "Trainer")} · Lv. ${card.level || 1}</p>
        <p>Kanto Pokédex: ${kanto.caught || card.species || 0} / ${kanto.total || 151} · ${kanto.percent || 0}%</p>
        <p>Total catches: ${card.caught || 0} · Shinies: ${variants.shinySpecies || 0} · Female variants: ${variants.femaleVariants || 0}</p>
        <p>Evolved: ${card.evolved || 0} · Trades: ${card.tradesDone || 0} · Species mastered: ${card.speciesMastered || 0}</p>
        ${badges ? `<p>Featured badges: ${badges}</p>` : ""}`;
    }
    const nameEdit = document.getElementById("name-edit");
    const nameInput = document.getElementById("trainer-display-name");
    if (nameEdit) nameEdit.hidden = !mine;
    if (mine && nameInput && !nameInput.dataset.dirty) nameInput.value = card.displayName || "";
    caught.innerHTML = (recent || []).map((row) => {
      const when = row.caughtAt ? new Date(row.caughtAt) : null;
      const stamp = when && !Number.isNaN(when.getTime()) ? when.toLocaleString() : "";
      return `
      <article class="caught-card">
        <img src="${window.playSpriteUrl(row.dex, row.variant)}" alt="" width="72" height="72" loading="lazy">
        <strong>${window.playCaughtName(row)}</strong>
        <span>${window.playCaughtBlurb(row)}</span>
        ${stamp ? `<span class="muted">${window.playEscapeAttr(stamp)}</span>` : ""}
      </article>`;
    }).join("") || `<p class="muted">No adventure log yet.</p>`;
  }

  async function load() {
    const nav = await loadNav();
    const login = new URLSearchParams(location.search).get("u")
      || nav?.profile?.twitch_login
      || nav?.profile?.username
      || "";
    if (!login) {
      gate.textContent = "Sign in, or open a trainer from Rankings.";
      return;
    }
    try {
      const data = await window.playCall("play_trainer", { p_login: login });
      card = data.trainer;
      render(data.trainer, data.recent, Boolean(data.mine));
      gate.hidden = true;
      profileBox.hidden = false;
    } catch (error) {
      gate.textContent = window.playRpcError(error, "No Trainer ID for that login yet.");
    }
  }

  document.getElementById("trainer-display-name")?.addEventListener("input", (event) => {
    event.target.dataset.dirty = "1";
  });
  document.getElementById("save-display-name")?.addEventListener("click", async () => {
    const input = document.getElementById("trainer-display-name");
    const status = document.getElementById("name-status");
    if (status) status.textContent = "Saving…";
    try {
      const data = await window.playCall("play_update_profile", {
        p_display_name: input?.value || "",
        p_favorite_dex: card?.favoriteDex ?? null,
        p_favorite_variant: card?.favoriteVariant || "normal"
      });
      if (input) input.dataset.dirty = "";
      if (status) status.textContent = data?.message || "Display name saved. This name is used everywhere on Play.";
      await load();
    } catch (error) {
      if (status) status.textContent = window.playRpcError(error);
    }
  });

  supabase.auth.onAuthStateChange((event) => {
    if (window.playAuthNoise(event)) return;
    load();
  });
  load();
})();
