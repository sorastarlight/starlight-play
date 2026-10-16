(() => {
  const root = typeof window !== "undefined" ? window : globalThis;

  const STEPS = [
    {
      id: "account",
      title: "Your Trainer account",
      body: "Create an account with a username, email, and password. It keeps your Pokémon, Pokédex, and bag together. Linking Twitch is optional, and ordinary site access works without it.",
      links: [{ href: "./register.html", label: "Create a Trainer account" }]
    },
    {
      id: "twitch",
      title: "Twitch can wait",
      body: "Connect Twitch from Settings when you want the RPG to recognize you in chat and on stream. Play, My PC, the Pokédex, and the Mart do not require a linked Twitch account.",
      links: [{ href: "./settings.html", label: "Open Settings" }]
    },
    {
      id: "join",
      title: "Join the encounter",
      body: "When a wild Pokémon appears on Play, choose Join Encounter before the timer ends. You can join right away. This guide does not have to be finished first."
    },
    {
      id: "prepare",
      title: "Berries and Honey",
      body: "An Oran Berry helps only your catch. Other capture berries do the same for you alone. Honey helps the whole encounter and does not replace your Poké Ball. Choosing No Item is fine."
    },
    {
      id: "ball",
      title: "Choose a Poké Ball",
      body: "Choose a Poké Ball from your bag. An owned ball is spent whether you catch the Pokémon or it escapes. If you have none, the game may provide a borrowed standard throw as a safety net; it is not added to your inventory. A catch is not guaranteed."
    },
    {
      id: "after",
      title: "PC, Pokédex, and supplies",
      body: "Caught Pokémon are stored in My PC. Your Pokédex records the species. An escape leaves no Pokémon. Restock Balls, Berries, and Honey at the Mart, from Daily Trainer Supply, or by playing.",
      links: [
        { href: "./storage.html", label: "My PC" },
        { href: "./pokedex.html", label: "My Pokédex" },
        { href: "./store.html", label: "Mart" }
      ]
    }
  ];

  function storageKey(scopeId) {
    return `play-onboarding:v1:${scopeId ? String(scopeId) : "anon"}`;
  }

  function blank() {
    return { version: 1, step: 0, status: "active", touched: false };
  }

  function clampStep(step) {
    const n = Number(step);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(STEPS.length - 1, Math.floor(n)));
  }

  function normalize(raw) {
    const status = raw?.status === "skipped" || raw?.status === "done" ? raw.status : "active";
    const step = clampStep(raw?.step);
    return {
      version: 1,
      step,
      status,
      touched: Boolean(raw?.touched) || status !== "active" || step > 0
    };
  }

  function readStore(store, key) {
    try {
      const raw = store.getItem(key);
      if (!raw) return null;
      return normalize(JSON.parse(raw));
    } catch (_) {
      return null;
    }
  }

  function writeStore(store, key, state) {
    const next = normalize(state);
    store.setItem(key, JSON.stringify(next));
    return next;
  }

  function esc(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  root.playOnboardingSteps = function playOnboardingSteps() {
    return STEPS.map((step) => ({
      id: step.id,
      title: step.title,
      body: step.body,
      links: (step.links || []).map((link) => ({ href: link.href, label: link.label }))
    }));
  };

  root.playOnboardingLoad = function playOnboardingLoad(store, scopeId) {
    const key = storageKey(scopeId || "anon");
    const found = readStore(store, key);
    if (found) return found;
    if (scopeId && String(scopeId) !== "anon") {
      const anon = readStore(store, storageKey("anon"));
      if (anon) return writeStore(store, key, anon);
    }
    return blank();
  };

  root.playOnboardingSave = function playOnboardingSave(store, scopeId, state) {
    return writeStore(store, storageKey(scopeId || "anon"), state);
  };

  root.playOnboardingReduce = function playOnboardingReduce(state, action) {
    const next = normalize(state);
    const last = STEPS.length - 1;
    if (action === "next") {
      next.touched = true;
      if (next.step >= last) next.status = "done";
      else next.step += 1;
    } else if (action === "back") {
      next.touched = true;
      next.step = Math.max(0, next.step - 1);
      if (next.status === "done") next.status = "active";
    } else if (action === "skip") {
      next.touched = true;
      next.status = "skipped";
    } else if (action === "reopen") {
      next.touched = true;
      if (next.status === "done") next.step = 0;
      next.status = "active";
    }
    return next;
  };

  root.playOnboardingAppearance = function playOnboardingAppearance(state, options) {
    const opts = options || {};
    const current = normalize(state);
    if (opts.place === "play" && opts.known === false) return "hidden";
    if (opts.place === "play" && opts.liveRound) return "chip";
    if (opts.force || opts.holdOpen) return "expanded";
    if (opts.place === "help") return "chip";
    if (current.status === "active" && !opts.liveRound && !(Number(opts.catches) > 0)) return "expanded";
    if (!current.touched && Number(opts.catches) > 0) return "hidden";
    if (current.status === "skipped" || current.status === "done" || current.touched) return "chip";
    if (opts.liveRound) return "chip";
    return "hidden";
  };

  root.playOnboardingHtml = function playOnboardingHtml(state, options) {
    const opts = options || {};
    const current = normalize(state);
    const mode = opts.appearance || "expanded";
    if (mode === "hidden") return "";
    if (mode === "chip") {
      const note = current.status === "done"
        ? "Guide finished. Open it again any time."
        : current.status === "skipped"
          ? "Guide paused. Joining an encounter does not require it."
          : "Optional. You can join an encounter without finishing it.";
      return `<section class="trainer-guide is-collapsed" data-onboarding-status="${esc(current.status)}" aria-label="Trainer guide">
        <p class="trainer-guide-resume">
          <button type="button" class="secondary" data-onboarding="reopen" aria-expanded="false">Trainer guide</button>
          <span>${esc(note)}</span>
        </p>
      </section>`;
    }
    const step = STEPS[current.step];
    const links = (step.links || []).map((link) => (
      `<a class="button secondary" href="${esc(link.href)}">${esc(link.label)}</a>`
    )).join("");
    const back = current.step > 0
      ? `<button type="button" class="secondary" data-onboarding="back">Back</button>`
      : "";
    const nextLabel = current.step >= STEPS.length - 1 ? "Finish" : "Next";
    return `<section class="trainer-guide" data-onboarding-status="active" data-onboarding-step="${esc(step.id)}" aria-labelledby="trainer-guide-title">
      <p class="trainer-guide-progress">Step ${current.step + 1} of ${STEPS.length}</p>
      <h2 id="trainer-guide-title" tabindex="-1">${esc(step.title)}</h2>
      <p>${esc(step.body)}</p>
      ${links ? `<p class="trainer-guide-go">${links}</p>` : ""}
      <div class="trainer-guide-actions">
        ${back}
        <button type="button" data-onboarding="next">${nextLabel}</button>
        <button type="button" class="secondary" data-onboarding="skip">Skip guide</button>
      </div>
    </section>`;
  };

  root.playOnboardingBoot = function playOnboardingBoot(options) {
    const opts = options || {};
    const el = opts.root || (typeof document !== "undefined" ? document.getElementById(opts.rootId || "trainer-guide") : null);
    if (!el) return null;
    const store = opts.store || localStorage;
    const memory = {
      scopeId: opts.userId ? String(opts.userId) : "anon",
      catches: opts.catches,
      liveRound: Boolean(opts.liveRound),
      place: opts.place || "",
      force: Boolean(opts.force),
      holdOpen: Boolean(opts.holdOpen || opts.force),
      known: Object.prototype.hasOwnProperty.call(opts, "catches") || opts.place !== "play",
      moved: false
    };

    function context() {
      return {
        catches: memory.catches,
        liveRound: memory.liveRound,
        place: memory.place,
        force: memory.force,
        holdOpen: memory.holdOpen,
        known: memory.known
      };
    }

    function paint() {
      const state = root.playOnboardingLoad(store, memory.scopeId);
      const appearance = root.playOnboardingAppearance(state, context());
      el.hidden = appearance === "hidden";
      el.innerHTML = root.playOnboardingHtml(state, { appearance });
      if (!memory.moved) return;
      const focusTarget = el.querySelector("#trainer-guide-title") || el.querySelector("[data-onboarding='reopen']");
      if (focusTarget && typeof focusTarget.focus === "function") focusTarget.focus();
    }

    el.addEventListener("click", (event) => {
      const btn = event.target.closest ? event.target.closest("[data-onboarding]") : null;
      if (!btn || !el.contains(btn)) return;
      const action = btn.getAttribute("data-onboarding");
      if (action === "reopen" || action === "next" || action === "back") memory.holdOpen = true;
      if (action === "skip") memory.holdOpen = false;
      let state = root.playOnboardingLoad(store, memory.scopeId);
      state = root.playOnboardingReduce(state, action);
      if (action === "next" && state.status === "done") memory.holdOpen = false;
      root.playOnboardingSave(store, memory.scopeId, state);
      memory.moved = true;
      memory.force = false;
      paint();
    });

    paint();

    return {
      sync(next) {
        const incoming = next || {};
        if (incoming.userId) {
          const previous = memory.scopeId;
          memory.scopeId = String(incoming.userId);
          if (previous !== memory.scopeId) root.playOnboardingLoad(store, memory.scopeId);
        }
        if (Object.prototype.hasOwnProperty.call(incoming, "catches")) {
          memory.catches = incoming.catches;
          memory.known = true;
        }
        if (Object.prototype.hasOwnProperty.call(incoming, "liveRound")) memory.liveRound = Boolean(incoming.liveRound);
        paint();
      },
      paint
    };
  };

  function bootFromDom() {
    if (typeof document === "undefined" || root.playOnboardingControl) return;
    const el = document.getElementById("trainer-guide");
    if (!el) return;
    const page = document.body?.dataset?.page || "";
    if (page !== "play" && page !== "help") return;
    const hashed = typeof location !== "undefined" && location.hash === "#trainer-guide";
    root.playOnboardingControl = root.playOnboardingBoot({
      place: page,
      force: page === "help" && hashed,
      holdOpen: page === "help" && hashed
    });
    if (hashed && typeof el.scrollIntoView === "function") el.scrollIntoView({ block: "nearest" });
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bootFromDom);
    else bootFromDom();
  }
})();
