(() => {
  const status = document.getElementById("status");
  const hash = new URLSearchParams((window.__playBitsHash || "").replace(/^#/, ""));
  const query = new URLSearchParams(window.location.search);
  const accessToken = hash.get("access_token") || "";
  const twitchError = hash.get("error_description") || hash.get("error") || query.get("error_description") || query.get("error") || "";

  async function functionMessage(error, fallback) {
    try {
      const ctx = error?.context;
      if (ctx && typeof ctx.json === "function") {
        const body = await ctx.json();
        if (body?.message) return body.message;
      }
    } catch (_) {}
    if (String(error?.message || "").includes("non-2xx")) return fallback;
    return error?.message || fallback;
  }

  async function connect(token) {
    const supabase = window.playSupabase;
    const { data, error } = await supabase.functions.invoke("bits-connect", {
      body: { accessToken: token }
    });
    if (error) {
      status.textContent = await functionMessage(error, "Twitch would not enable Bits auto-credit. Click Turn on Bits auto-credit on the staff hub again.");
      return;
    }
    status.textContent = data?.message || "Bits auto-credit is on.";
    if (data?.ok) {
      window.setTimeout(() => { window.location.replace("./admin-tools.html"); }, 1200);
    }
  }

  async function run() {
    if (twitchError) {
      status.textContent = twitchError.replace(/\+/g, " ");
      return;
    }
    const supabase = window.playSupabase;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = accessToken || sessionData.session?.provider_token || "";
    if (!sessionData.session) {
      status.textContent = "Sign into Play with the stream Twitch account first, then click Turn on Bits auto-credit.";
      return;
    }
    if (!token) {
      status.textContent = "Twitch did not send a Bits token. Open the staff hub and click Turn on Bits auto-credit again.";
      return;
    }
    await connect(token);
  }

  run().catch((error) => {
    status.textContent = error?.message || "Could not connect Bits auto-credit.";
  });
})();
