(() => {
  const supabase = window.playSupabase;
  const body = document.getElementById("rank-body");
  const status = document.getElementById("rank-status");

  window.playBindAccountNav();

  async function loadNav() {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session) {
      window.playSetAccountNav(null);
      return;
    }
    const { data: profile } = await supabase.from("profiles").select("display_name, twitch_login, avatar_url").eq("id", session.user.id).maybeSingle();
    let trainer = null;
    let isAdmin = false;
    try {
      const snapshot = await window.playCall("play_state");
      trainer = snapshot?.trainer;
      isAdmin = Boolean(snapshot?.isAdmin);
    } catch (_) {}
    window.playSetAccountNav(session, profile, { isAdmin, trainer });
  }

  async function loadRanks() {
    try {
      const data = await window.playCall("play_rankings");
      const rows = data?.trainers || [];
      status.textContent = rows.length ? `${rows.length} trainers` : "No trainers ranked yet.";
      body.innerHTML = rows.map((row, index) => {
        const fav = row.favoriteDex
          ? `<img class="rank-fav" src="${window.playSpriteUrl(row.favoriteDex, row.favoriteVariant)}" alt="">`
          : "";
        return `
        <tr>
          <td class="num">${index + 1}</td>
          <td class="rank-trainer">${fav}<a href="./trainer.html?u=${encodeURIComponent(row.login)}">${row.displayName}</a>${row.pass ? ' <span class="chip pass">Pass</span>' : ""}<div class="muted">@${row.login}</div></td>
          <td class="num">${row.level}</td>
          <td class="num">${row.caught}</td>
          <td class="num">${window.playWatchHours(row.watchSeconds)}</td>
          <td>${row.online ? "Online" : "Away"}</td>
        </tr>`;
      }).join("");
    } catch (error) {
      status.textContent = window.playRpcError(error, "Rankings are not live yet.");
    }
  }

  supabase.auth.onAuthStateChange((event) => { if (window.playAuthNoise(event)) return; loadNav(); });
  loadNav();
  loadRanks();
})();
