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

window.playShowDialog = function playShowDialog(dialog) {
  if (!dialog) return;
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
};

window.playSetLoadingGate = function playSetLoadingGate(gate, app) {
  if (gate) {
    if (!gate.dataset.idle) gate.dataset.idle = gate.textContent || "";
    gate.hidden = false;
    gate.textContent = "Loading…";
  }
  if (app) app.hidden = true;
};

window.playRestoreGate = function playRestoreGate(gate, fallback) {
  if (!gate) return;
  gate.hidden = false;
  gate.textContent = gate.dataset.idle || fallback || "Sign in to continue.";
};

window.playTwitchLinked = function playTwitchLinked(profile, extras) {
  if (extras?.twitchLinked === true || extras?.trainer?.twitchLinked === true) return true;
  if (extras?.twitchLinked === false || extras?.trainer?.twitchLinked === false) return false;
  if (Array.isArray(extras?.connections)) {
    return extras.connections.some((row) => {
      const type = String(row?.type || row?.connection_type || "");
      return row?.confirmed !== false && (type === "player" || type === "secondary");
    });
  }
  if (typeof window._playTwitchLinked === "boolean") return window._playTwitchLinked;
  return false;
};

window.playTwitchFaceInner = function playTwitchFaceInner(url, name, linked) {
  const label = String(name || "Trainer").slice(0, 1).toUpperCase() || "T";
  const inner = url
    ? `<img class="avatar" src="${window.playEscapeAttr(url)}" alt="" width="40" height="40">`
    : `<span class="avatar-fallback">${window.playEscapeAttr(label)}</span>`;
  const badge = linked ? `<i class="twitch-badge" title="Twitch linked" aria-hidden="true"></i>` : "";
  return `${inner}${badge}`;
};

window.playTwitchFaceHtml = function playTwitchFaceHtml(url, name, extraClass, linked) {
  const twitch = linked ? " has-twitch" : "";
  const cls = extraClass ? ` twitch-face ${extraClass}${twitch}` : ` twitch-face${twitch}`;
  return `<span class="${cls.trim()}">${window.playTwitchFaceInner(url, name, linked)}</span>`;
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
    home: document.getElementById("account-home"),
    staff: document.getElementById("account-staff"),
    signOut: document.getElementById("sign-out"),
    status: document.getElementById("auth-status")
  };

  function ensureAccountMenuLinks() {
    if (!els.menu) return;
    const settings = els.settings || document.getElementById("account-settings");
    const card = els.card || document.getElementById("account-card");
    const anchor = settings || card;
    if (!document.getElementById("account-home") && anchor) {
      anchor.insertAdjacentHTML("beforebegin", `<a id="account-home" href="./account.html" role="menuitem">My Account</a>`);
    }
    document.getElementById("account-connections")?.remove();
    els.home = document.getElementById("account-home");
  }

  const links = [
    { href: "./", id: "play", label: "Play" },
    { href: "./storage.html", id: "storage", label: "My PC" },
    { href: "./pokedex.html", id: "pokedex", label: "Pokédex" },
    { href: "./inventory.html", id: "inventory", label: "Inventory" },
    { href: "./evolve.html", id: "evolve", label: "Evolution" },
    { href: "./trainer.html", id: "trainer", label: "Trainer ID" },
    { href: "./rankings.html", id: "rankings", label: "Rankings" },
    { href: "./events.html", id: "events", label: "Events" },
    { href: "./achievements.html", id: "achievements", label: "Achievements" },
    { href: "./trade.html", id: "trade", label: "GTS" },
    { href: "./help.html", id: "help", label: "How to Play" }
  ];

  function renderLinks(isAdmin) {
    if (!els.links) return;
    const items = links.slice();
    items.push({ href: "./store.html", id: "store", label: "Mart" });
    if (!els.links.dataset.ready) {
      els.links.innerHTML = items.map((item, index) => {
        const current = item.id === page ? " aria-current=\"page\"" : "";
        const extra = item.id === "store" ? " topnav-link-store" : "";
        const divider = index < items.length - 1 ? `<span class="topnav-div" aria-hidden="true">|</span>` : "";
        return `<a class="topnav-link${extra}" href="${item.href}" data-nav="${item.id}"${current}>${item.label}</a>${divider}`;
      }).join("");
      els.links.addEventListener("click", (event) => {
        if (event.target.closest("a")) closeNavPanel();
      });
      els.links.dataset.ready = "1";
    } else {
      // Keep labels/hrefs aligned when HTML shipped an older nav snapshot.
      const byId = new Map(items.map((item) => [item.id, item]));
      els.links.querySelectorAll("a[data-nav]").forEach((link) => {
        const item = byId.get(link.dataset.nav);
        if (!item) return;
        if (link.getAttribute("href") !== item.href) link.setAttribute("href", item.href);
        if (link.textContent !== item.label) link.textContent = item.label;
      });
      if (!els.links.querySelector("[data-nav=\"help\"]")) {
        const store = els.links.querySelector("[data-nav=\"store\"]");
        const helpHtml = `<span class="topnav-div" aria-hidden="true">|</span><a class="topnav-link" href="./help.html" data-nav="help">How to Play</a>`;
        if (store) store.insertAdjacentHTML("beforebegin", helpHtml);
        else els.links.insertAdjacentHTML("beforeend", helpHtml);
      }
      const storeLink = els.links.querySelector("[data-nav=\"store\"]");
      if (storeLink && storeLink.textContent !== "Mart") storeLink.textContent = "Mart";
    }
    const adminPage = page === "admin" || page === "admin-live" || page === "admin-tools" || page === "admin-store";
    let adminLink = els.links.querySelector("[data-nav=\"admin\"]");
    if (isAdmin && !adminLink) {
      els.links.insertAdjacentHTML("beforeend", `<span class="topnav-div" data-nav="admin-div" aria-hidden="true">|</span><a class="topnav-link" href="./admin.html" data-nav="admin">Admin Hub</a>`);
      adminLink = els.links.querySelector("[data-nav=\"admin\"]");
    }
    if (adminLink) {
      const div = els.links.querySelector("[data-nav=\"admin-div\"]");
      adminLink.hidden = !isAdmin;
      if (div) div.hidden = !isAdmin;
      if (isAdmin) adminLink.setAttribute("aria-current", adminPage ? "page" : "false");
    }
    els.links.querySelectorAll("a[data-nav]").forEach((link) => {
      if (link.dataset.nav === "admin") return;
      if (link.dataset.nav === page) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
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

  if (els.signIn) {
    els.signIn.hidden = false;
    els.signIn.removeAttribute("title");
    els.signIn.title = "Sign in";
  }
  if (els.status && /Twitch/.test(els.status.textContent || "")) {
    els.status.textContent = "Checking sign-in…";
  }
  ensureAccountMenuLinks();
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
    if (typeof window.playSetTipUser === "function") {
      window.playSetTipUser(signedIn ? session?.user?.id : "");
    }
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
        els.level.hidden = false;
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
    const twitchLinked = window.playTwitchLinked(profile, extras);
    const face = els.button?.querySelector(".twitch-face");
    if (face) face.classList.toggle("has-twitch", twitchLinked);
    const handle = profile?.twitch_login || session.user.user_metadata?.preferred_username || "";
    if (els.name) els.name.textContent = name;
    if (els.handle) els.handle.textContent = handle ? `@${handle}` : name;
    if (els.card) {
      els.card.href = handle ? `./trainer.html?u=${encodeURIComponent(handle)}` : "./trainer.html";
      if (page === "trainer") els.card.setAttribute("aria-current", "page");
      else els.card.removeAttribute("aria-current");
    }
    if (els.home) {
      if (page === "account") els.home.setAttribute("aria-current", "page");
      else els.home.removeAttribute("aria-current");
    }
    if (els.settings) {
      if (page === "settings") els.settings.setAttribute("aria-current", "page");
      else els.settings.removeAttribute("aria-current");
    }
    if (els.status) els.status.textContent = `Signed in as ${name}.`;
    if (els.level) {
      els.level.hidden = false;
      els.level.textContent = trainer?.level ? `Lv. ${trainer.level}` : "";
    }
    if (els.trainer) {
      if (trainer) {
        const pct = Math.max(0, Math.min(100, Math.round((trainer.xpInto / Math.max(1, trainer.xpNeed)) * 100)));
        const national = trainer.variants?.nationalCaught != null
          ? `${trainer.variants.nationalCaught}/${trainer.variants.nationalTotal || window.playNationalTotal?.() || "?"}`
          : `${trainer.species || 0}/${window.playNationalTotal?.() || "?"}`;
        els.trainer.hidden = false;
        els.trainer.innerHTML = `
          <strong>Trainer Lv. ${trainer.level}${trainer.title ? ` · ${trainer.title}` : ""}</strong>
          <div>${national} Pokédex · ${trainer.caught || 0} caught</div>
          <div class="xp-bar" aria-hidden="true"><i style="width:${pct}%"></i></div>`;
      } else {
        els.trainer.hidden = true;
      }
    }
    if (signedIn && typeof window.playShowNotices === "function") {
      window.playShowNotices();
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
    els.signIn.addEventListener("click", () => {
      window.location.assign(new URL("./signin.html", window.location.href).href);
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

  function netBanner() {
    let el = document.getElementById("play-net-banner");
    if (el) return el;
    el = document.createElement("p");
    el.id = "play-net-banner";
    el.className = "play-net-banner";
    el.hidden = true;
    el.setAttribute("role", "status");
    const nav = document.querySelector(".topnav");
    if (nav) nav.after(el);
    else document.body?.prepend(el);
    return el;
  }

  function setNetBanner(kind, text) {
    const el = netBanner();
    if (!text) {
      el.hidden = true;
      el.textContent = "";
      return;
    }
    el.hidden = false;
    el.dataset.kind = kind || "info";
    const onPlay = document.body?.dataset?.page === "play";
    el.textContent = onPlay && kind === "offline"
      ? `${text} Do not refresh during an encounter.`
      : text;
  }

  window.addEventListener("offline", () => {
    setNetBanner("offline", "CONNECTION LOST. We're trying to reconnect.");
  });
  window.addEventListener("online", () => {
    setNetBanner("info", "Connection restored.");
    window.setTimeout(() => {
      if (navigator.onLine) setNetBanner("", "");
    }, 4000);
  });
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    setNetBanner("offline", "CONNECTION LOST. We're trying to reconnect.");
  }
};
