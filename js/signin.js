(() => {
  const params = new URLSearchParams(location.search);
  const banner = document.getElementById("signin-banner");
  const status = document.getElementById("signin-status");
  const form = document.getElementById("signin-form");
  const resetBox = document.getElementById("reset-box");
  const usernameBox = document.getElementById("username-box");
  const warn = document.getElementById("twitch-warn");

  function showBanner(text, kind) {
    if (!banner) return;
    banner.hidden = !text;
    banner.textContent = text || "";
    banner.classList.toggle("notice-bad", kind === "bad");
  }

  if (params.get("denied") === "1") {
    showBanner("That Twitch account is linked as a bot or utility identity and cannot sign in. Use your Primary Twitch account or email login.", "bad");
  } else if (params.get("verified") === "1") {
    showBanner("Email verified. Sign in to continue.");
  }

  if (params.has("reset") && resetBox) resetBox.hidden = false;
  if (params.has("username") && usernameBox) usernameBox.hidden = false;

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
    const allowed = await window.playGuardTwitchLogin();
    if (!allowed) return false;
    const { data: profile } = await window.playSupabase
      .from("profiles")
      .select("display_name, twitch_login, avatar_url, username")
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
    const identifier = document.getElementById("signin-id")?.value;
    const password = document.getElementById("signin-password")?.value;
    const result = await window.playSignInIdentifier(identifier, password);
    if (!result.ok) {
      if (status) status.textContent = result.message;
      return;
    }
    if (status) status.textContent = "Signed in. Opening Play…";
    window.location.assign("./");
  });

  document.getElementById("signin-twitch")?.addEventListener("click", () => {
    if (typeof warn?.showModal === "function") warn.showModal();
    else startTwitch();
  });
  document.getElementById("twitch-warn-go")?.addEventListener("click", (event) => {
    event.preventDefault();
    warn?.close?.("yes");
    startTwitch();
  });

  async function startTwitch() {
    if (status) status.textContent = "Opening Twitch…";
    const result = await window.playSignInWithTwitch({ intent: "login" });
    if (result && !result.ok && status) status.textContent = result.message;
  }

  document.getElementById("reset-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.getElementById("reset-email")?.value;
    const node = document.getElementById("reset-status");
    if (node) node.textContent = "Sending…";
    const result = await window.playResetPassword(email);
    if (node) node.textContent = result.message;
  });

  document.getElementById("username-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.getElementById("username-email")?.value;
    const node = document.getElementById("username-status");
    if (node) node.textContent = "Sending…";
    const result = await window.playRequestUsername(email);
    if (node) node.textContent = result.message;
  });

  window.playSupabase.auth.onAuthStateChange((event) => {
    if (window.playAuthNoise(event)) return;
    showNav();
  });

  showNav().then((signedIn) => {
    if (signedIn && !params.get("denied")) {
      window.location.assign("./");
    }
  });
})();
