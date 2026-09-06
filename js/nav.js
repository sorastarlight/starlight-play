window.playAccountName = function playAccountName(session, profile) {
  return profile?.display_name || session?.user?.user_metadata?.preferred_username || session?.user?.user_metadata?.name || "Trainer";
};

window.playAccountAvatar = function playAccountAvatar(session, profile) {
  return profile?.avatar_url || session?.user?.user_metadata?.avatar_url || session?.user?.user_metadata?.picture || "";
};

window.playBindAccountNav = function playBindAccountNav(options) {
  const page = document.body?.dataset?.page || "";
  const els = {
    links: document.getElementById("topnav-links"),
    signIn: document.getElementById("sign-in"),
    account: document.getElementById("account"),
    button: document.getElementById("account-button"),
    menu: document.getElementById("account-menu"),
    avatar: document.getElementById("account-avatar"),
    fallback: document.getElementById("account-fallback"),
    name: document.getElementById("account-name"),
    level: document.getElementById("account-level"),
    trainer: document.getElementById("account-trainer"),
    handle: document.getElementById("account-handle"),
    card: document.getElementById("account-card"),
    settings: document.getElementById("account-settings"),
    staff: document.getElementById("account-staff"),
    signOut: document.getElementById("sign-out"),
    status: document.getElementById("auth-status")
  };

  const links = [
    { href: "./", id: "play", label: "Play" },
    { href: "./inventory.html", id: "inventory", label: "My Inventory" },
    { href: "./pokedex.html", id: "pokedex", label: "My Pokédex" },
    { href: "./rankings.html", id: "rankings", label: "Rankings" },
    { href: "./store.html", id: "store", label: "Store" },
    { href: "./events.html", id: "events", label: "Events" }
  ];

  function renderLinks(isAdmin) {
    if (!els.links) return;
    const items = links.slice();
    if (isAdmin) items.push({ href: "./admin.html", id: "admin", label: "Staff" });
    els.links.innerHTML = items.map((item) => {
      const current = item.id === page ? " aria-current=\"page\"" : "";
      return `<a class="topnav-link" href="${item.href}"${current}>${item.label}</a>`;
    }).join("");
  }

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

  if (els.signIn) els.signIn.hidden = true;
  renderLinks(false);

  window.playSetAccountNav = function playSetAccountNav(session, profile, extras) {
    const signedIn = Boolean(session);
    const isAdmin = Boolean(extras?.isAdmin);
    const trainer = extras?.trainer;
    renderLinks(isAdmin);
    if (els.signIn) els.signIn.hidden = signedIn;
    if (els.account) els.account.hidden = !signedIn;
    if (els.staff) els.staff.hidden = !isAdmin;
    if (!signedIn) closeMenu();
    if (!signedIn) {
      if (els.status) els.status.textContent = "Not signed in.";
      if (els.avatar) {
        els.avatar.removeAttribute("src");
        els.avatar.hidden = true;
      }
      if (els.fallback) els.fallback.hidden = true;
      if (els.level) {
        els.level.hidden = true;
        els.level.textContent = "";
      }
      if (els.trainer) {
        els.trainer.hidden = true;
        els.trainer.innerHTML = "";
      }
      return;
    }
    const name = window.playAccountName(session, profile);
    const avatar = window.playAccountAvatar(session, profile);
    const handle = profile?.twitch_login || session.user.user_metadata?.preferred_username || "";
    if (els.name) els.name.textContent = name;
    if (els.handle) els.handle.textContent = handle ? `@${handle}` : name;
    if (els.card) {
      els.card.href = handle ? `./trainer.html?u=${encodeURIComponent(handle)}` : "./trainer.html";
      els.card.setAttribute("aria-current", page === "trainer" ? "page" : "false");
    }
    if (els.settings) {
      els.settings.setAttribute("aria-current", page === "settings" ? "page" : "false");
    }
    if (els.status) els.status.textContent = `Signed in as ${name}.`;
    if (els.level) {
      if (trainer?.level) {
        els.level.hidden = false;
        els.level.textContent = `Lv. ${trainer.level}`;
      } else {
        els.level.hidden = true;
      }
    }
    if (els.trainer) {
      if (trainer) {
        const pct = Math.max(0, Math.min(100, Math.round((trainer.xpInto / Math.max(1, trainer.xpNeed)) * 100)));
        els.trainer.hidden = false;
        els.trainer.innerHTML = `
          <strong>Trainer Lv. ${trainer.level}</strong>
          <div>${trainer.caught || 0} caught · ${window.playWatchHours(trainer.watchSeconds)} watched</div>
          <div class="xp-bar" aria-hidden="true"><i style="width:${pct}%"></i></div>`;
      } else {
        els.trainer.hidden = true;
      }
    }
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
