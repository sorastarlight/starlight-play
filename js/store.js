(() => {
  const supabase = window.playSupabase;
  const els = {
    status: document.getElementById("pass-status"),
    check: document.getElementById("check-pass")
  };

  window.playBindAccountNav({
    onSignOut() {
      els.status.textContent = "Sign in to check your pass.";
    }
  });

  function describePass(pass) {
    if (!pass) return "Sign in to check your pass.";
    if (pass.active) {
      const source = pass.source === "twitch-sub" ? "Twitch subscription" : pass.source === "admin" ? "staff grant" : "Play";
      return `Starlight Pass is active (${source}).`;
    }
    return "No Starlight Pass yet. Subscribe on Twitch, then check again.";
  }

  async function load() {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session) {
      window.playSetAccountNav(null);
      els.status.textContent = "Sign in to check your pass.";
      return;
    }
    const { data: profile } = await supabase.from("profiles").select("display_name, twitch_login, avatar_url, starlight_pass, pass_source, pass_checked_at").eq("id", session.user.id).maybeSingle();
    let isAdmin = false;
    try {
      const snapshot = await window.playCall("play_state");
      isAdmin = Boolean(snapshot?.isAdmin);
      els.status.textContent = describePass(snapshot?.pass || {
        active: profile?.starlight_pass,
        source: profile?.pass_source
      });
    } catch (_) {
      els.status.textContent = describePass({
        active: profile?.starlight_pass,
        source: profile?.pass_source
      });
    }
    window.playSetAccountNav(session, profile, { isAdmin });
  }

  async function checkPass() {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session) {
      els.status.textContent = "Sign in with Twitch first.";
      return;
    }
    els.status.textContent = "Checking Twitch…";
    const { data, error } = await supabase.functions.invoke("refresh-pass", {
      body: { accessToken: session.provider_token || "" }
    });
    if (error) {
      els.status.textContent = error.message || "Automatic sub check is not live yet. Staff can grant the pass from the hub.";
      return;
    }
    if (data?.active) els.status.textContent = "Starlight Pass is active from your Twitch subscription.";
    else els.status.textContent = data?.message || "Twitch says you are not subscribed right now.";
  }

  els.check.addEventListener("click", checkPass);
  supabase.auth.onAuthStateChange(() => { load(); });
  load();
})();
