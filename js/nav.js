window.playAccountName = function playAccountName(session, profile) {
  return profile?.display_name || session?.user?.user_metadata?.preferred_username || session?.user?.user_metadata?.name || "Trainer";
};

window.playAccountAvatar = function playAccountAvatar(session, profile) {
  return profile?.avatar_url || session?.user?.user_metadata?.avatar_url || session?.user?.user_metadata?.picture || "";
};

window.playBindAccountNav = function playBindAccountNav(options) {
  const els = {
    signIn: document.getElementById("sign-in"),
    account: document.getElementById("account"),
    button: document.getElementById("account-button"),
    menu: document.getElementById("account-menu"),
    avatar: document.getElementById("account-avatar"),
    fallback: document.getElementById("account-fallback"),
    name: document.getElementById("account-name"),
    handle: document.getElementById("account-handle"),
    signOut: document.getElementById("sign-out"),
    status: document.getElementById("auth-status")
  };

  function closeMenu() {
    if (!els.menu || !els.button) return;
    els.menu.hidden = true;
    els.button.setAttribute("aria-expanded", "false");
  }

  function toggleMenu() {
    if (!els.menu || !els.button) return;
    const open = els.menu.hidden;
    els.menu.hidden = !open;
    els.button.setAttribute("aria-expanded", open ? "true" : "false");
  }

  window.playSetAccountNav = function playSetAccountNav(session, profile) {
    const signedIn = Boolean(session);
    if (els.signIn) els.signIn.hidden = signedIn;
    if (els.account) els.account.hidden = !signedIn;
    closeMenu();
    if (!signedIn) {
      if (els.status) els.status.textContent = "Not signed in.";
      if (els.avatar) {
        els.avatar.removeAttribute("src");
        els.avatar.hidden = true;
      }
      if (els.fallback) els.fallback.hidden = true;
      return;
    }
    const name = window.playAccountName(session, profile);
    const avatar = window.playAccountAvatar(session, profile);
    const handle = profile?.twitch_login || session.user.user_metadata?.preferred_username || "";
    if (els.name) els.name.textContent = name;
    if (els.handle) els.handle.textContent = handle ? `@${handle}` : name;
    if (els.status) els.status.textContent = `Signed in as ${name}.`;
    if (avatar && els.avatar) {
      els.avatar.hidden = false;
      els.avatar.src = avatar;
      els.avatar.alt = name;
      if (els.fallback) els.fallback.hidden = true;
    } else if (els.fallback) {
      if (els.avatar) {
        els.avatar.hidden = true;
        els.avatar.removeAttribute("src");
      }
      els.fallback.hidden = false;
      els.fallback.textContent = name.slice(0, 1).toUpperCase();
    }
  };

  if (els.signIn) {
    els.signIn.addEventListener("click", async () => {
      const result = await window.playSignInWithTwitch();
      if (result && !result.ok && els.status) els.status.textContent = result.message;
    });
  }
  if (els.button) els.button.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleMenu();
  });
  if (els.signOut) {
    els.signOut.addEventListener("click", async () => {
      closeMenu();
      await window.playSignOut();
      window.playSetAccountNav(null);
      if (options && typeof options.onSignOut === "function") options.onSignOut();
    });
  }
  document.addEventListener("click", (event) => {
    if (!els.account || els.account.hidden) return;
    if (!els.account.contains(event.target)) closeMenu();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });
};
