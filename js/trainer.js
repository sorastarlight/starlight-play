(() => {
  const supabase = window.playSupabase;
  const gate = document.getElementById("gate");
  const profileBox = document.getElementById("profile");
  const hero = document.getElementById("hero");
  const caught = document.getElementById("caught-grid");
  const title = document.getElementById("page-title");
  const ownerCustomize = document.getElementById("owner-customize");
  let card = null;
  let mine = false;
  let recentLog = [];

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

  function render(view, recent) {
    title.textContent = view?.displayName ? `${view.displayName}` : "Trainer ID";
    if (ownerCustomize) ownerCustomize.hidden = !mine;
    if (hero) {
      hero.innerHTML = window.playRenderIdCard(view, { mode: "public", variant: "hero" });
      hero.classList.remove("is-revealed");
      requestAnimationFrame(() => {
        requestAnimationFrame(() => hero.classList.add("is-revealed"));
      });
    }
    const showcaseBody = document.getElementById("trainer-showcase-body");
    if (showcaseBody) showcaseBody.innerHTML = window.playRenderTrainerShowcaseHtml(view);
    const teamBody = document.getElementById("trainer-team-body");
    if (teamBody) teamBody.innerHTML = window.playRenderTrainerPartyHtml(view);
    const progressBody = document.getElementById("trainer-progress-body");
    if (progressBody) progressBody.innerHTML = window.playRenderTrainerProgressHtml(view);
    const statsBody = document.getElementById("trainer-stats-body");
    if (statsBody) statsBody.innerHTML = window.playRenderTrainerStatsHtml(view);
    if (recent) recentLog = recent;
    if (caught) caught.innerHTML = window.playRenderAdventureLogHtml(recentLog);
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
      if (window.playTrainerCatalogReady) await window.playTrainerCatalogReady;
      const data = await window.playCall("play_trainer", { p_login: login });
      card = data.trainer;
      mine = Boolean(data.mine);
      recentLog = data.recent || [];
      render(card, recentLog);
      if (mine && typeof window.playSpecialMount === "function") {
        try {
          const special = await window.playCall("play_special_events");
          window.playSpecialMount(document.getElementById("special-upcoming"), special);
        } catch (_) {}
      }
      if (mine) {
        window.playCall("play_ack_cosmetics", { p_ids: null }).catch(() => {});
      }
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
