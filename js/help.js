(() => {
  const client = window.playSupabase;
  let revision = 0;
  window.playBindAccountNav({ onSignOut() { revision += 1; } });

  async function refresh(session, requestRevision) {
    try {
      if (session === undefined) session = (await client.auth.getSession()).data?.session || null;
      if (requestRevision !== revision) return;
      if (!session) {
        window.playSetAccountNav(null);
        return;
      }
      const { data: profile } = await client.from("profiles")
        .select("display_name, twitch_login, avatar_url")
        .eq("id", session.user.id).maybeSingle();
      if (requestRevision !== revision) return;
      window.playSetAccountNav(session, profile);
    } catch (_) {
      if (requestRevision !== revision) return;
      window.playSetAccountNav(null);
      const status = document.getElementById("auth-status");
      if (status) status.textContent = "Sign-in status unavailable. Refresh to try again.";
    }
  }

  if (!client) {
    window.playSetAccountNav(null);
    return;
  }
  client.auth.onAuthStateChange((event, session) => {
    if (window.playAuthNoise?.(event, session)) return;
    const requestRevision = ++revision;
    // Leave the Auth callback before making client requests.
    window.setTimeout(() => refresh(session, requestRevision), 0);
  });
  refresh(undefined, ++revision);
})();
