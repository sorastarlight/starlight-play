(() => {
  const form = document.getElementById("register-form");
  const status = document.getElementById("register-status");

  window.playBindAccountNav();

  async function showNav() {
    const { data: sessionData } = await window.playSupabase.auth.getSession();
    const session = sessionData.session;
    if (!session) {
      window.playSetAccountNav(null);
      return;
    }
    const { data: profile } = await window.playSupabase
      .from("profiles")
      .select("display_name, twitch_login, avatar_url, username")
      .eq("id", session.user.id)
      .maybeSingle();
    window.playSetAccountNav(session, profile);
  }

  function showCreated(verify) {
    const card = form?.closest(".card");
    if (!card) return;
    card.innerHTML = `
      <h2>Trainer Account created!</h2>
      <p>${verify
        ? "Check your email for a verification link, then sign in. Connect Twitch when you are ready to join stream features."
        : "Your Trainer Account keeps your Pokémon, Pokédex, inventory, and Twitch connections together."}</p>
      <p class="muted">Twitch is not required for ordinary website features. Stream encounters and Bits need a linked Twitch identity.</p>
      <div class="links">
        ${verify
          ? `<a class="button" href="./signin.html">Sign in</a>`
          : `<a class="button" href="./account.html#connections">Connect Twitch</a>
             <a class="button secondary" href="./">I'll do this later</a>`}
      </div>`;
  }

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (status) status.textContent = "Creating your Trainer Account…";
    const result = await window.playRegisterTrainer({
      username: document.getElementById("reg-username")?.value,
      email: document.getElementById("reg-email")?.value,
      password: document.getElementById("reg-password")?.value,
      confirm: document.getElementById("reg-confirm")?.value
    });
    if (!result.ok) {
      if (status) status.textContent = result.message;
      return;
    }
    showCreated(Boolean(result.verify));
  });

  window.playSupabase.auth.onAuthStateChange((event) => {
    if (window.playAuthNoise(event)) return;
    showNav();
  });
  showNav();
})();
