window.playAccountName = function playAccountName(session, profile) {
  return profile?.display_name || session?.user?.user_metadata?.preferred_username || session?.user?.user_metadata?.name || "Trainer";
};

window.playAccountAvatar = function playAccountAvatar(session, profile) {
  return profile?.avatar_url || session?.user?.user_metadata?.avatar_url || session?.user?.user_metadata?.picture || "";
};

window.playEscapeAttr = function playEscapeAttr(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
};

window.playTwitchFaceInner = function playTwitchFaceInner(url, name) {
  const label = String(name || "Trainer").slice(0, 1).toUpperCase() || "T";
  const inner = url
    ? `<img class="avatar" src="${window.playEscapeAttr(url)}" alt="">`
    : `<span class="avatar-fallback">${window.playEscapeAttr(label)}</span>`;
  return `${inner}<i class="twitch-badge" title="Twitch linked" aria-hidden="true"></i>`;
};

window.playTwitchFaceHtml = function playTwitchFaceHtml(url, name, extraClass) {
  const cls = extraClass ? ` twitch-face ${extraClass}` : " twitch-face";
  return `<span class="${cls.trim()}">${window.playTwitchFaceInner(url, name)}</span>`;
};

window.playBindAccountNav = function playBindAccountNav(options) {
  const page = document.body?.dataset?.page || "";
  const els = {
    links: document.getElementById("topnav-links"),
    nav: document.querySelector(".topnav"),
    toggle: document.getElementById("nav-toggle"),
    panel: document.getElementById("topnav-panel"),
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
    { href: "./storage.html", id: "storage", label: "Storage" },
    { href: "./trade.html", id: "trade", label: "Trade" },
    { href: "./rankings.html", id: "rankings", label: "Rankings" },
    { href: "./store.html", id: "store", label: "Store" },
    { href: "./events.html", id: "events", label: "Events" }
  ];

  function renderLinks(isAdmin) {
    if (!els.links) return;
    const items = links.slice();
    if (isAdmin) items.push({ href: "./admin.html", id: "admin", label: "Admin Hub" });
    els.links.innerHTML = items.map((item) => {
      const current = item.id === page ? " aria-current=\"page\"" : "";
      return `<a class="topnav-link" href="${item.href}"${current}>${item.label}</a>`;
    }).join("");
    els.links.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeNavPanel);
    });
  }

  function closeMenu() {
    if (!els.menu || !els.button) return;
    els.menu.hidden = true;
    els.button.setAttribute("aria-expanded", "false");
  }

  function closeNavPanel() {
    if (!els.nav) return;
    els.nav.classList.remove("is-open");
    if (els.toggle) els.toggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("nav-open");
  }

  function toggleNavPanel() {
    if (!els.nav || !els.toggle) return;
    const open = !els.nav.classList.contains("is-open");
    els.nav.classList.toggle("is-open", open);
    els.toggle.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.classList.toggle("nav-open", open);
    if (open) closeMenu();
  }

  function toggleMenu() {
    if (!els.menu || !els.button) return;
    const open = els.menu.hidden;
    els.menu.hidden = !open;
    els.button.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) closeNavPanel();
  }

  function ensureNavTwitchFace() {
    if (!els.avatar) return;
    const parent = els.avatar.parentElement;
    if (parent && parent.classList.contains("twitch-face")) return;
    const wrap = document.createElement("span");
    wrap.className = "twitch-face twitch-face-nav";
    els.avatar.before(wrap);
    wrap.append(els.avatar);
    if (els.fallback) wrap.append(els.fallback);
    const badge = document.createElement("i");
    badge.className = "twitch-badge";
    badge.title = "Twitch linked";
    badge.setAttribute("aria-hidden", "true");
    wrap.append(badge);
  }

  if (els.signIn) els.signIn.hidden = true;
  ensureNavTwitchFace();
  renderLinks(false);
  if (els.toggle) {
    els.toggle.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleNavPanel();
    });
  }
  window.addEventListener("resize", () => {
    if (window.innerWidth > 1040) closeNavPanel();
  });

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
    if (els.nav && els.nav.classList.contains("is-open") && !els.nav.contains(event.target)) closeNavPanel();
    if (!els.account || els.account.hidden) return;
    if (!els.account.contains(event.target)) closeMenu();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu();
      closeNavPanel();
    }
  });
};
