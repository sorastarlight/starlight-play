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

window.playSetLoadingGate = function playSetLoadingGate(gate, app, opts) {
  const soft = Boolean(opts?.soft || opts?.background);
  if (soft && app && !app.hidden) {
    if (gate && !gate.dataset.idle) gate.dataset.idle = gate.textContent || "";
    return { soft: true };
  }
  if (gate) {
    if (!gate.dataset.idle) gate.dataset.idle = gate.textContent || "";
    gate.hidden = false;
    gate.textContent = "Loading…";
  }
  if (app) app.hidden = true;
  return { soft: false };
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
  const PRESENT_KEY = "play-account-present-v1";
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

  function readPresentCache() {
    try {
      const raw = JSON.parse(sessionStorage.getItem(PRESENT_KEY) || "null");
      if (!raw || typeof raw !== "object") return null;
      return {
        name: String(raw.name || "").slice(0, 48),
        level: Number(raw.level || 0) || 0,
        avatar: String(raw.avatar || "").slice(0, 500),
        letter: String(raw.letter || "·").slice(0, 1)
      };
    } catch (_) {
      return null;
    }
  }

  function writePresentCache(payload) {
    try {
      if (!payload) {
        sessionStorage.removeItem(PRESENT_KEY);
        return;
      }
      sessionStorage.setItem(PRESENT_KEY, JSON.stringify({
        name: String(payload.name || "").slice(0, 48),
        level: Number(payload.level || 0) || 0,
        avatar: String(payload.avatar || "").slice(0, 500),
        letter: String(payload.letter || "·").slice(0, 1)
      }));
    } catch (_) {}
  }

  function setAuthState(state) {
    const next = state === "in" ? "in" : (state === "out" ? "out" : "unknown");
    document.body.dataset.auth = next === "in" ? "signed-in" : (next === "out" ? "signed-out" : "unknown");
    if (els.account) els.account.dataset.auth = next === "in" ? "in" : (next === "out" ? "out" : "unknown");
  }

  function paintAvatar(url, letter) {
    const mark = String(letter || "·").slice(0, 1).toUpperCase() || "·";
    if (url && els.avatar) {
      els.avatar.hidden = false;
      if (els.avatar.getAttribute("src") !== url) els.avatar.src = url;
      if (els.fallback) els.fallback.hidden = true;
      return;
    }
    if (els.avatar) {
      els.avatar.hidden = true;
      els.avatar.removeAttribute("src");
    }
    if (els.fallback) {
      els.fallback.hidden = false;
      els.fallback.textContent = mark;
      els.fallback.setAttribute("aria-hidden", "true");
    }
  }

  function paintUnknownShell() {
    setAuthState("unknown");
    if (els.signIn) {
      els.signIn.hidden = true;
      els.signIn.setAttribute("aria-hidden", "true");
    }
    if (els.account) els.account.hidden = false;
    if (els.button) {
      els.button.disabled = true;
      els.button.setAttribute("aria-busy", "true");
      els.button.setAttribute("aria-expanded", "false");
    }
    closeMenu();
    const cached = readPresentCache();
    if (els.name) els.name.textContent = cached?.name || "Trainer";
    if (els.level) els.level.textContent = cached?.level ? `Lv. ${cached.level}` : "Lv. ·";
    paintAvatar(cached?.avatar || "", cached?.letter || "·");
    if (els.status) els.status.textContent = "Checking sign-in…";
  }

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
    { href: "./evolve.html", id: "evolve", label: "Prof. Oak's Lab" },
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
    if (!els.menu || !els.button || els.button.disabled) return;
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

  ensureAccountMenuLinks();
  ensureNavTwitchFace();
  renderLinks(false);
  paintUnknownShell();
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
    const name = signedIn ? window.playAccountName(session, profile) : "";
    const avatar = signedIn ? window.playAccountAvatar(session, profile) : "";
    const handle = signedIn
      ? (profile?.twitch_login || session?.user?.user_metadata?.preferred_username || "")
      : "";
    const twitchLinked = signedIn ? window.playTwitchLinked(profile, extras) : false;
    const level = trainer?.level || "";
    const title = trainer?.title || "";
    const species = trainer?.species || trainer?.variants?.nationalCaught || "";
    const caught = trainer?.caught || "";
    const xpInto = trainer?.xpInto || 0;
    const xpNeed = trainer?.xpNeed || 0;
    const userId = signedIn ? (session?.user?.id || "") : "";
    const signature = [
      signedIn ? "1" : "0",
      userId,
      isAdmin ? "1" : "0",
      name,
      avatar,
      handle,
      twitchLinked ? "1" : "0",
      level,
      title,
      species,
      caught,
      xpInto,
      xpNeed
    ].join("|");
    const firstPaint = !window.__playAccountNavSig;
    if (window.__playAccountNavSig === signature) return;
    window.__playAccountNavSig = signature;
    if (typeof window.playSetTipUser === "function") {
      window.playSetTipUser(signedIn ? session?.user?.id : "");
    }
    renderLinks(isAdmin);

    if (!signedIn) {
      setAuthState("out");
      writePresentCache(null);
      if (els.signIn) {
        els.signIn.hidden = false;
        els.signIn.removeAttribute("aria-hidden");
      }
      if (els.account) els.account.hidden = true;
      if (els.button) {
        els.button.disabled = true;
        els.button.removeAttribute("aria-busy");
      }
      if (els.staff) els.staff.hidden = true;
      closeMenu();
      if (els.status) els.status.textContent = "Not signed in.";
      return;
    }

    setAuthState("in");
    if (els.signIn) {
      els.signIn.hidden = true;
      els.signIn.setAttribute("aria-hidden", "true");
    }
    if (els.account) els.account.hidden = false;
    if (els.button) {
      els.button.disabled = false;
      els.button.removeAttribute("aria-busy");
      els.button.title = name;
    }
    if (els.staff) els.staff.hidden = !isAdmin;

    const face = els.button?.querySelector(".twitch-face");
    if (face) face.classList.toggle("has-twitch", twitchLinked);
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
      els.level.textContent = trainer?.level ? `Lv. ${trainer.level}` : "Lv. ·";
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
    // Notices only on first signed-in paint — not every soft refresh / tab return.
    if (firstPaint && signedIn && typeof window.playShowNotices === "function") {
      window.playShowNotices();
    }
    const letter = name.slice(0, 1).toUpperCase() || "T";
    paintAvatar(avatar, letter);
    if (els.avatar) els.avatar.alt = name;
    writePresentCache({
      name,
      level: Number(trainer?.level || 0) || 0,
      avatar,
      letter
    });
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
