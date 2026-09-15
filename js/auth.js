(() => {
  const { supabaseUrl, supabaseKey } = window.PLAY_CONFIG;
  window.playSupabase = window.supabase.createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      detectSessionInUrl: true,
      flowType: "pkce"
    }
  });

  const TWITCH_SCOPES = "user:read:email user:read:subscriptions";
  const INTENT_KEY = "playOAuthIntent";
  const TARGET_KEY = "playOAuthTarget";

  window.playRedirectTo = function playRedirectTo() {
    return window.location.href.split("#")[0];
  };

  window.playTwitchParent = function playTwitchParent() {
    return window.location.hostname;
  };

  window.playAuthNoise = function playAuthNoise(event) {
    return event === "TOKEN_REFRESHED" || event === "USER_UPDATED";
  };

  window.playSetOAuthIntent = function playSetOAuthIntent(intent, targetId) {
    try {
      sessionStorage.setItem(INTENT_KEY, String(intent || "login"));
      if (targetId) sessionStorage.setItem(TARGET_KEY, String(targetId));
      else sessionStorage.removeItem(TARGET_KEY);
    } catch (_) {}
  };

  window.playReadOAuthIntent = function playReadOAuthIntent() {
    try {
      return {
        intent: sessionStorage.getItem(INTENT_KEY) || "",
        target: sessionStorage.getItem(TARGET_KEY) || ""
      };
    } catch (_) {
      return { intent: "", target: "" };
    }
  };

  window.playClearOAuthIntent = function playClearOAuthIntent() {
    try {
      sessionStorage.removeItem(INTENT_KEY);
      sessionStorage.removeItem(TARGET_KEY);
    } catch (_) {}
  };

  window.playClearLocalAuth = function playClearLocalAuth() {
    window.playClearOAuthIntent();
    try {
      ["playBitsConnect", "playDebug"].forEach((key) => {
        if (key !== "playDebug") sessionStorage.removeItem(key);
      });
    } catch (_) {}
  };

  async function twitchOAuthUrl(options) {
    const redirectTo = options?.redirectTo || window.playRedirectTo();
    const method = options?.link ? "linkIdentity" : "signInWithOAuth";
    const args = {
      provider: "twitch",
      options: {
        redirectTo,
        scopes: TWITCH_SCOPES,
        skipBrowserRedirect: true
      }
    };
    const { data, error } = options?.link
      ? await window.playSupabase.auth.linkIdentity(args)
      : await window.playSupabase.auth.signInWithOAuth(args);
    if (error || !data?.url) {
      return { ok: false, message: error?.message || "Twitch sign-in is not enabled yet." };
    }
    try {
      const probe = await fetch(data.url, { redirect: "manual" });
      const body = await probe.text();
      if (body.includes("provider is not enabled") || body.includes("validation_failed")) {
        return { ok: false, message: "Twitch sign-in is not enabled yet." };
      }
    } catch (_) {}
    return { ok: true, url: data.url };
  }

  window.playSignInWithTwitch = async function playSignInWithTwitch(options) {
    window.playSetOAuthIntent(options?.intent || "login", options?.target);
    try {
      await window.playCall?.("play_start_oauth_intent", {
        p_intent: options?.intent || "login",
        p_target_twitch_user_id: options?.target || null
      });
    } catch (_) {}
    const result = await twitchOAuthUrl({
      link: Boolean(options?.link),
      redirectTo: options?.redirectTo || window.playRedirectTo()
    });
    if (!result.ok) return result;
    window.location.assign(result.url);
    return { ok: true };
  };

  window.playLinkTwitch = function playLinkTwitch(options) {
    return window.playSignInWithTwitch({
      intent: options?.intent || "link",
      link: true,
      target: options?.target,
      redirectTo: options?.redirectTo || `${window.location.origin}${window.location.pathname.replace(/[^/]+$/, "")}account.html`
    });
  };

  window.playSignInWithPassword = async function playSignInWithPassword(email, password) {
    const login = String(email || "").trim();
    if (!login || !password) {
      return { ok: false, message: "Enter the trainer email and password." };
    }
    const { data, error } = await window.playSupabase.auth.signInWithPassword({
      email: login,
      password
    });
    if (error || !data?.session) {
      const raw = String(error?.message || "");
      if (/email logins are disabled/i.test(raw) || /unsupported provider/i.test(raw)) {
        return { ok: false, message: "Trainer login is not enabled yet." };
      }
      return { ok: false, message: "That trainer login did not work." };
    }
    return { ok: true };
  };

  window.playSignInIdentifier = async function playSignInIdentifier(identifier, password) {
    const value = String(identifier || "").trim();
    if (!value || !password) {
      return { ok: false, message: "Enter your username or email, and your password." };
    }
    if (value.includes("@")) return window.playSignInWithPassword(value, password);
    try {
      const { data, error } = await window.playSupabase.functions.invoke("trainer-session", {
        body: { identifier: value, password }
      });
      if (error || !data?.session) {
        return { ok: false, message: "That trainer login did not work." };
      }
      const { error: setError } = await window.playSupabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token
      });
      if (setError) return { ok: false, message: "That trainer login did not work." };
      return { ok: true };
    } catch (_) {
      return { ok: false, message: "That trainer login did not work." };
    }
  };

  window.playRegisterTrainer = async function playRegisterTrainer(fields) {
    const email = String(fields?.email || "").trim();
    const password = String(fields?.password || "");
    const confirm = String(fields?.confirm || "");
    const username = String(fields?.username || "").trim().toLowerCase();
    const displayName = String(fields?.displayName || "").trim();
    if (!email || !password || !username) {
      return { ok: false, message: "Username, email, and password are required." };
    }
    if (password !== confirm) {
      return { ok: false, message: "Passwords do not match." };
    }
    if (password.length < 8) {
      return { ok: false, message: "Use at least 8 characters for your password." };
    }
    const available = await (typeof window.playCall === "function"
      ? window.playCall("play_username_available", { p_username: username })
      : window.playSupabase.rpc("play_username_available", { p_username: username }).then(({ data, error }) => {
        if (error) throw error;
        return data;
      })
    ).catch(() => ({ available: false }));
    if (!available?.available) {
      return { ok: false, message: "That username is not available." };
    }
    const redirectTo = `${window.location.origin}${window.location.pathname.replace(/[^/]+$/, "")}signin.html`;
    const { data, error } = await window.playSupabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: { username, name: displayName || username, preferred_username: username }
      }
    });
    if (error) {
      return { ok: false, message: "Could not create that Trainer account. Try a different email." };
    }
    if (data?.user && !data.session) {
      return { ok: true, verify: true, message: "Trainer account created. Check your email to verify, then sign in." };
    }
    if (data?.session && username) {
      try { await window.playCall("play_set_username", { p_username: username }); } catch (_) {}
    }
    return { ok: true, verify: false, message: "Trainer account created." };
  };

  async function playRpc(name, args) {
    if (typeof window.playCall === "function") return window.playCall(name, args);
    const { data, error } = await window.playSupabase.rpc(name, args || {});
    if (error) throw error;
    return data;
  }

  window.playTwitchConnectionKind = function playTwitchConnectionKind(conn) {
    const type = String(conn?.type || "");
    if (type === "bot" || type === "utility") return "bot";
    if (conn?.primary) return "primary";
    return "linked";
  };

  window.playTwitchConnectionKindLabel = function playTwitchConnectionKindLabel(conn) {
    const kind = window.playTwitchConnectionKind(conn);
    if (kind === "bot") return "Bot / Utility";
    if (kind === "primary") return "Primary Twitch account";
    return "Linked Twitch account";
  };

  window.playResetPassword = async function playResetPassword(email) {
    const value = String(email || "").trim();
    const message = "If an account exists for that email address, a password reset link has been sent.";
    if (!value || !value.includes("@")) return { ok: true, message };
    const redirectTo = `${window.location.origin}${window.location.pathname.replace(/[^/]+$/, "")}signin.html`;
    try {
      await window.playSupabase.auth.resetPasswordForEmail(value, { redirectTo });
    } catch (_) {}
    return { ok: true, message };
  };

  window.playRequestUsername = async function playRequestUsername(email) {
    const value = String(email || "").trim();
    const fallback = "If an account exists for that email address, we sent recovery mail. After you sign in, your Trainer username is on My Account.";
    try {
      const data = await playRpc("play_request_username_reminder", { p_email: value });
      return { ok: true, message: data?.message || fallback };
    } catch (_) {
      return { ok: true, message: fallback };
    }
  };

  window.playClaimEmailPassword = async function playClaimEmailPassword(email, password) {
    const login = String(email || "").trim();
    const pass = String(password || "");
    if (!login || !pass) return { ok: false, message: "Enter an email and a new password." };
    if (pass.length < 8) return { ok: false, message: "Use at least 8 characters for your password." };
    const { error } = await window.playSupabase.auth.updateUser({ email: login, password: pass });
    if (error) return { ok: false, message: "Could not add that login method. Try a different email." };
    return { ok: true, message: "Login method added to this Trainer Account. Check email if verification is required." };
  };

  window.playGuardTwitchLogin = async function playGuardTwitchLogin() {
    const { data } = await window.playSupabase.auth.getSession();
    if (!data?.session) return true;
    const intent = window.playReadOAuthIntent().intent;
    if (intent === "link" || intent === "reauthorize") return true;
    try {
      const state = await playRpc("play_account_state");
      if (state && state.allowed === false) {
        await window.playSupabase.auth.signOut();
        window.playClearLocalAuth();
        const next = new URL("./signin.html", window.location.href);
        next.searchParams.set("denied", "1");
        window.location.assign(next.href);
        return false;
      }
    } catch (_) {}
    return true;
  };

  window.playSignOut = async function playSignOut() {
    window.playClearLocalAuth();
    return window.playSupabase.auth.signOut();
  };
})();
