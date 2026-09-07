(() => {
  const status = document.getElementById("status");
  const hash = new URLSearchParams((window.__playBitsHash || "").replace(/^#/, ""));
  const accessToken = hash.get("access_token") || "";
  const twitchError = hash.get("error_description") || hash.get("error") || "";

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

  async function run() {
    if (twitchError) {
      status.textContent = twitchError.replace(/\+/g, " ");
      return;
    }
    if (!accessToken) {
      status.textContent = "Twitch did not send a Bits token. Open the staff hub and click Turn on Bits auto-credit again.";
      return;
    }
    const supabase = window.playSupabase;
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      status.textContent = "Sign into Play with the stream Twitch account first, then click Turn on Bits auto-credit.";
      return;
    }
    const { data, error } = await supabase.functions.invoke("bits-connect", {
      body: { accessToken }
    });
    if (error) {
      status.textContent = await functionMessage(error, "Twitch would not enable Bits auto-credit. Add the bits-connect.html redirect on the Starlight Play app, then try again.");
      return;
    }
    status.textContent = data?.message || "Bits auto-credit is on.";
    if (data?.ok) {
      window.setTimeout(() => { window.location.replace("./admin.html"); }, 1200);
    }
  }

  run().catch((error) => {
    status.textContent = error?.message || "Could not connect Bits auto-credit.";
  });
})();
