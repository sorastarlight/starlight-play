(() => {
  const form = document.getElementById("trainer-login-form");
  const status = document.getElementById("trainer-login-status");
  const email = document.getElementById("trainer-email");
  const password = document.getElementById("trainer-password");

  window.playBindAccountNav({
    onSignOut() {
      if (status) status.textContent = "Signed out.";
    }
  });

  async function showNav() {
    const { data: sessionData } = await window.playSupabase.auth.getSession();
    const session = sessionData.session;
    if (!session) {
      window.playSetAccountNav(null);
      return false;
    }
    const { data: profile } = await window.playSupabase
      .from("profiles")
      .select("display_name, twitch_login, avatar_url")
      .eq("id", session.user.id)
      .maybeSingle();
    let extras = {};
    try {
      const snapshot = await window.playCall("play_sync");
      extras = { isAdmin: Boolean(snapshot?.isAdmin), trainer: snapshot?.trainer };
    } catch (_) {}
    window.playSetAccountNav(session, profile, extras);
    return true;
  }

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (status) status.textContent = "Signing in…";
    const result = await window.playSignInWithPassword(email?.value, password?.value);
    if (!result.ok) {
      if (status) status.textContent = result.message;
      return;
    }
    if (status) status.textContent = "Signed in. Opening Play…";
    window.location.assign("./");
  });

  window.playSupabase.auth.onAuthStateChange((event) => {
    if (window.playAuthNoise(event)) return;
    showNav();
  });
  showNav().then((signedIn) => {
    if (signedIn && status && !status.textContent) {
      status.textContent = "Already signed in. Open Play to join encounters.";
    }
  });
})();
