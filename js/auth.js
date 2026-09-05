(() => {
  const { supabaseUrl, supabaseKey } = window.PLAY_CONFIG;
  window.playSupabase = window.supabase.createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      detectSessionInUrl: true,
      flowType: "pkce"
    }
  });

  window.playRedirectTo = function playRedirectTo() {
    return window.location.href.split("#")[0];
  };

  window.playTwitchParent = function playTwitchParent() {
    return window.location.hostname;
  };

  window.playSignInWithTwitch = async function playSignInWithTwitch() {
    const { data, error } = await window.playSupabase.auth.signInWithOAuth({
      provider: "twitch",
      options: {
        redirectTo: window.playRedirectTo(),
        scopes: "user:read:email user:read:subscriptions",
        skipBrowserRedirect: true
      }
    });
    if (error || !data?.url) {
      return { ok: false, message: "Twitch sign-in is not enabled yet." };
    }
    try {
      const probe = await fetch(data.url, { redirect: "manual" });
      const body = await probe.text();
      if (body.includes("provider is not enabled") || body.includes("validation_failed")) {
        return { ok: false, message: "Twitch sign-in is not enabled yet." };
      }
    } catch (_) {
      // Cross-origin probes can fail; continue to Twitch if the URL looks valid.
    }
    window.location.assign(data.url);
    return { ok: true };
  };

  window.playSignOut = function playSignOut() {
    return window.playSupabase.auth.signOut();
  };
})();
