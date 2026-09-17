(() => {
  const root = typeof window !== "undefined" ? window : globalThis;
  const SEEN_KEY = "play-present-seen";
  const MAX_SEEN = 240;
  const MAX_TOASTS = 4;
  const TOAST_LIFE = 4200;

  const TIER = { toast: "toast", card: "card", moment: "moment" };

  const TYPE_RANK = {
    pokedex: 0,
    level: 1,
    achievement: 2,
    unlock: 3,
    item: 4,
    summary: 5,
    purchase: 6,
    mastery: 7,
    xp: 8,
    coins: 9,
    evolution: 10,
    support: 11,
    info: 12,
    error: 13
  };

  const env = {
    instant: false,
    perf: "",
    reducedMotion: null,
    preview: false
  };

  const seenMem = new Set();
  const presented = [];
  const blocking = [];
  const toastQ = [];
  let running = false;
  let pumpPromise = null;
  let current = null;
  let noticeBusy = false;
  let lastFocus = null;
  let overlayEl = null;
  let liveEl = null;
  let confirmBusy = false;
  let settlePanel = null;

  function doc() {
    return typeof document !== "undefined" ? document : null;
  }

  function esc(value) {
    if (typeof root.playEscapeAttr === "function") return root.playEscapeAttr(value);
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;");
  }

  function pageId() {
    const el = doc()?.body;
    return String(el?.dataset?.page || "");
  }

  function overlayPage() {
    return pageId() === "overlay";
  }

  function perfMode() {
    if (env.perf) return env.perf;
    if (typeof root.playPerfMode === "function") return root.playPerfMode();
    return "balanced";
  }

  function isReduced() {
    if (env.reducedMotion === true) return true;
    if (env.reducedMotion === false) return false;
    if (typeof root.playPerfReduced === "function") return root.playPerfReduced();
    try {
      return Boolean(root.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
    } catch (_) {
      return false;
    }
  }

  function cue(name) {
    try {
      const fn = root.playSfx || root.playCue || root.playSound;
      if (typeof fn === "function") fn(name);
    } catch (_) {}
  }

  function wait(ms) {
    const n = Number(ms) || 0;
    if (env.instant || n <= 0) return Promise.resolve();
    let hold = n;
    if (isReduced()) hold = Math.min(hold, 80);
    else if (perfMode() === "low") hold = Math.min(hold, 160);
    else if (perfMode() === "balanced") hold = Math.round(hold * 0.72);
    return new Promise((resolve) => setTimeout(resolve, hold));
  }

  function readSeen() {
    const out = new Set(seenMem);
    try {
      const raw = JSON.parse(root.sessionStorage?.getItem(SEEN_KEY) || "[]");
      if (Array.isArray(raw)) raw.forEach((id) => { if (id) out.add(String(id)); });
    } catch (_) {}
    return out;
  }

  function writeSeen(set) {
    seenMem.clear();
    const list = [];
    set.forEach((id) => {
      seenMem.add(id);
      list.push(id);
    });
    try {
      root.sessionStorage?.setItem(SEEN_KEY, JSON.stringify(list.slice(-MAX_SEEN)));
    } catch (_) {}
  }

  function isPreviewId(id) {
    return String(id || "").startsWith("lab:");
  }

  function markSeen(id) {
    const key = String(id || "");
    if (!key || isPreviewId(key)) return;
    const set = readSeen();
    set.add(key);
    writeSeen(set);
  }

  function hasSeen(id) {
    const key = String(id || "");
    if (!key || isPreviewId(key)) return false;
    return readSeen().has(key);
  }

  function speciesName(dex) {
    if (typeof root.playSpeciesName === "function") return root.playSpeciesName(dex);
    return dex ? `#${dex}` : "Pokémon";
  }

  function itemLabel(key) {
    if (typeof root.playItemLabel === "function") return root.playItemLabel(key);
    return String(key || "Item");
  }

  function spriteUrl(dex, variant, gender) {
    const shiny = String(variant || "").toLowerCase().includes("shiny");
    const art = typeof root.playSpriteVariant === "function"
      ? root.playSpriteVariant(dex, gender, shiny)
      : (shiny ? "shiny" : "normal");
    if (typeof root.playSpriteUrl === "function") return root.playSpriteUrl(dex, art);
    return "";
  }

  function itemSprite(key) {
    if (typeof root.playItemSprite === "function") return root.playItemSprite(key);
    return "";
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function rewardList(raw) {
    if (Array.isArray(raw)) {
      return raw.map((row) => {
        if (!row || typeof row !== "object") return null;
        const type = String(row.type || row.key || "");
        const amount = row.amount != null ? Number(row.amount) : row.qty != null ? Number(row.qty) : 0;
        return type ? { type, amount: Number.isFinite(amount) ? amount : 0, label: row.label || "" } : null;
      }).filter(Boolean);
    }
    if (raw && typeof raw === "object") {
      return Object.entries(raw)
        .filter(([key, value]) => value && !["idempotency", "key", "label", "reason"].includes(key))
        .map(([type, amount]) => {
          if (type === "title") return { type, amount: 0, label: "Title" };
          if (type === "badge") return { type, amount: 0, label: "Badge" };
          if (type === "cosmetic") return { type, amount: 0, label: "Trainer ID cosmetic" };
          return { type, amount: Number(amount) || 0, label: "" };
        });
    }
    return [];
  }

  function rewardLine(row) {
    const type = String(row?.type || "");
    const n = Number(row?.amount || 0);
    if (row?.label) return row.label;
    if (type === "xp") return `+${n} XP`;
    if (type === "coins") return `+${n} PokéCoins`;
    if (type === "candy" || type === "evolutioncandy") return `+${n} Evolution Candy`;
    if (type === "mastery") return `+${n} Species Mastery`;
    if (n) return `+${n} ${itemLabel(type)}`;
    return itemLabel(type);
  }

  function classify(event) {
    const type = String(event?.type || "info");
    if (event?.tier === TIER.toast || event?.tier === TIER.card || event?.tier === TIER.moment) {
      return event.tier;
    }
    if (type === "pokedex" || type === "level" || type === "evolution") return TIER.moment;
    if (type === "support") {
      const round = root.playCurrentRound?.() || root.PLAY_ROUND;
      const busy = Boolean(round && round.phase && round.phase !== "closed" && !round.resolved && !round.cancelled);
      return busy ? TIER.toast : TIER.card;
    }
    if (type === "achievement" || type === "unlock" || type === "summary" || type === "purchase") return TIER.card;
    if (type === "item") {
      const rare = Boolean(event?.rare) || /rare|stone|linkingcord|masterball|rarecandy/i.test(String(event?.item || event?.title || ""));
      const qty = Number(event?.qty || event?.rewards?.[0]?.amount || 0);
      if (rare || qty >= 5) return TIER.card;
      return TIER.toast;
    }
    if (type === "error" || type === "warning") return TIER.toast;
    return TIER.toast;
  }

  function typeFromKind(kind, title, body) {
    const k = String(kind || "").toLowerCase();
    const text = `${title || ""} ${body || ""}`.toLowerCase();
    if (k === "pokedex" || (/new pokédex|new pokedex|new pokémon|new pokemon|new variant/.test(text) && k !== "achievement")) {
      if (k === "dex" && /\/151/.test(text)) return "unlock";
      return "pokedex";
    }
    if (k === "dex") return "unlock";
    if (k === "level") return "level";
    if (k === "achievement") return "achievement";
    if (k === "title" || k === "badge" || k === "unlock" || k === "cosmetic" || k === "background" || k === "frame") return "unlock";
    if (k === "loot-rare") return "item";
    if (k === "loot" || k === "choice") return "item";
    if (k === "evolution") return "evolution";
    if (k === "support" || k === "bits") return "support";
    if (k === "xp") return "xp";
    if (k === "mastery") return "mastery";
    if (/level up/.test(text)) return "level";
    if (/achievement/.test(text)) return "achievement";
    if (/\bxp\b/.test(text)) return "xp";
    if (/coin/.test(text)) return "coins";
    if (/candy|mastery/.test(text)) return "mastery";
    return k || "info";
  }

  function normalize(raw, context) {
    if (!raw || typeof raw !== "object") return null;
    const ctx = context || {};
    const payload = raw.payload && typeof raw.payload === "object" ? raw.payload : {};
    const rewards = rewardList(raw.rewards || payload.rewards || payload.grants);
    const type = String(raw.type || payload.type || typeFromKind(raw.kind, raw.title, raw.body) || "info");
    const species = Number(raw.species || payload.species || payload.to || ctx.species || 0) || 0;
    const variantRaw = String(raw.variant || payload.variant || ctx.variant || "normal") || "normal";
    const shiny = /shiny/i.test(variantRaw) || Boolean(payload.shiny) || Boolean(raw.shiny);
    const variant = shiny ? (variantRaw.includes("shiny") ? variantRaw : "shiny") : (variantRaw === "female" ? "normal" : variantRaw || "normal");
    const gender = String(raw.gender || payload.gender || ctx.gender || "");
    const id = String(raw.id || raw.key || `${type}:${species || raw.title || payload.eventId || "x"}:${raw.body || ""}`);
    const event = {
      id,
      type,
      kind: String(raw.kind || type),
      title: String(raw.title || defaultTitle(type, shiny)),
      subtitle: String(raw.subtitle || raw.body || payload.name || payload.description || ""),
      body: String(raw.body || payload.description || ""),
      species,
      variant,
      gender,
      shiny,
      item: String(raw.item || payload.item || payload.item_key || ""),
      qty: Number(raw.qty || payload.qty || 0) || 0,
      rare: Boolean(raw.rare || raw.kind === "loot-rare"),
      rewards,
      source: String(raw.source || ctx.source || payload.source || ""),
      from: Number(payload.from || raw.from || 0) || 0,
      to: Number(payload.to || payload.level || raw.to || 0) || 0,
      unlockName: String(payload.name || raw.unlockName || ""),
      unlockKind: String(raw.unlockKind || payload.kind || (raw.kind === "badge" ? "badge" : raw.kind === "title" ? "title" : raw.kind === "background" ? "background" : raw.kind === "frame" ? "frame" : "")),
      cosmeticId: String(payload.cosmeticId || payload.titleId || payload.badgeId || payload.id || raw.cosmeticId || ""),
      news: asArray(raw.news),
      severity: String(raw.severity || (type === "error" ? "error" : type === "warning" ? "warning" : "info")),
      preview: Boolean(raw.preview || ctx.preview || isPreviewId(id)),
      payload
    };
    if (type === "support") {
      event.unlockName = event.unlockName || String(payload.name || "");
      event.body = event.body || (payload.bits ? `Supported with ${payload.bits} Bits.` : "Added to Trainer inventory.");
      if (!event.item) {
        const first = rewards.find((row) => row.type && !["title", "badge", "cosmetic"].includes(row.type));
        if (first?.type) event.item = first.type;
      }
    }
    event.tier = classify(event);
    if (!event.subtitle && species) {
      const num = String(species).padStart(3, "0");
      event.subtitle = `#${num} ${speciesName(species)}`;
    }
    return event;
  }

  function defaultTitle(type, shiny) {
    if (type === "pokedex") return shiny ? "✨ SHINY REGISTERED ✨" : "New Pokédex Entry!";
    if (type === "level") return "TRAINER LEVEL UP!";
    if (type === "achievement") return "ACHIEVEMENT UNLOCKED";
    if (type === "unlock") return "NEW TRAINER REWARD!";
    if (type === "item") return "Item added";
    if (type === "purchase") return "PURCHASE COMPLETE";
    if (type === "summary") return "REWARDS";
    if (type === "evolution") return "Congratulations!";
    if (type === "support") return "THANK YOU! ★";
    return "Reward";
  }

  function rank(event) {
    const type = String(event?.type || "info");
    const base = TYPE_RANK[type];
    const n = Number.isFinite(base) ? base : 20;
    const tierBoost = event?.tier === TIER.moment ? 0 : event?.tier === TIER.card ? 0.2 : 1;
    return n + tierBoost;
  }

  function order(events) {
    return asArray(events).slice().sort((a, b) => rank(a) - rank(b) || String(a.id).localeCompare(String(b.id)));
  }

  function collapse(events) {
    const out = [];
    const seen = new Set();
    asArray(events).forEach((event) => {
      if (!event) return;
      const key = event.type === "pokedex"
        ? `pokedex:${event.species}:${event.shiny ? "shiny" : "normal"}`
        : event.type === "achievement"
          ? `achievement:${event.payload?.id || event.subtitle || event.id}`
          : event.type === "level"
            ? `level:${event.to || event.subtitle}`
            : event.type === "unlock"
              ? `unlock:${event.cosmeticId || event.payload?.cosmeticId || event.payload?.titleId || event.payload?.badgeId || event.id}`
              : `${event.type}:${event.id}`;
      if (seen.has(key)) return;
      seen.add(key);
      out.push(event);
    });
    return out;
  }

  function allowed(event, opts) {
    if (!event) return false;
    const suppressKinds = new Set(asArray(opts?.suppressKinds).map((v) => String(v)));
    const suppressTypes = new Set(asArray(opts?.suppressTypes).map((v) => String(v)));
    if (suppressKinds.has(event.kind) || suppressTypes.has(event.type)) return false;
    if (opts?.source === "evolution" && event.type === "evolution") return false;
    if (event.type === "evolution" && pageId() === "evolve") return false;
    if (!event.preview && hasSeen(event.id)) return false;
    return true;
  }

  function summaryEvent(events, opts) {
    const rows = asArray(events).filter((row) => row && row.type !== "summary" && row.type !== "error");
    if (rows.length < 2) return null;
    if (opts?.source === "evolution") return null;
    const rewards = [];
    const news = [];
    rows.forEach((row) => {
      asArray(row.rewards).forEach((bit) => rewards.push(bit));
      if (row.type === "pokedex") news.push(`Pokédex: ${row.subtitle || speciesName(row.species)}`);
      if (row.type === "achievement") news.push(`Achievement: ${row.subtitle || row.body}`);
      if (row.type === "level") news.push(`Trainer Level ${row.to || ""}`.trim());
      if (row.type === "item" && row.item) news.push(`${itemLabel(row.item)}${row.qty ? ` ×${row.qty}` : ""}`);
    });
    return normalize({
      id: `summary:${opts?.source || "batch"}:${rows.map((row) => row.id).join("+")}`.slice(0, 180),
      type: "summary",
      title: opts?.source === "capture" ? "ENCOUNTER COMPLETE" : "REWARDS",
      subtitle: opts?.caughtName || "",
      rewards,
      news,
      source: opts?.source || "",
      preview: Boolean(opts?.preview)
    });
  }

  function liveHost() {
    const d = doc();
    if (!d) return null;
    let host = d.getElementById("play-present-live");
    if (host) return host;
    host = d.createElement("div");
    host.id = "play-present-live";
    host.className = "play-present-live";
    host.setAttribute("aria-live", "polite");
    host.setAttribute("aria-atomic", "true");
    d.body?.append(host);
    liveEl = host;
    return host;
  }

  function announce(text) {
    const host = liveHost();
    if (!host) return;
    host.textContent = "";
    host.textContent = String(text || "");
  }

  function toastHost() {
    if (typeof root.playToast === "function") return true;
    const d = doc();
    if (!d) return false;
    let host = d.getElementById("play-notice-host");
    if (host) return host;
    host = d.createElement("div");
    host.id = "play-notice-host";
    host.className = "play-notice-host";
    host.setAttribute("aria-live", "polite");
    d.body?.append(host);
    return host;
  }

  function showToast(event) {
    presented.push({ ...event, presentedAs: "toast" });
    if (overlayPage()) return;
    const severity = event.severity === "error" || event.severity === "warning" || event.severity === "success"
      ? event.severity
      : (event.type === "error" ? "error" : "info");
    cue(severity === "error" ? "error" : "reward.small");
    announce(`${event.title}. ${event.subtitle || event.body || ""}`.trim());
    const notice = {
      kind: event.kind || event.type || "info",
      title: event.title,
      body: event.subtitle || event.body || (event.qty ? `${itemLabel(event.item)} ×${event.qty}` : ""),
      severity
    };
    const d = doc();
    if (typeof root.playToast === "function" && d) {
      const host = d.getElementById("play-notice-host");
      const before = host ? host.children.length : 0;
      root.playToast(notice);
      const card = host?.lastElementChild;
      if (card) {
        card.classList.add(`play-toast-${notice.kind}`, `play-toast-${severity}`);
        while (host.children.length > MAX_TOASTS) host.firstElementChild.remove();
      } else if (before >= MAX_TOASTS && host?.firstElementChild) {
        host.firstElementChild.remove();
      }
      return;
    }
    const host = toastHost();
    if (!host || host === true) return;
    const card = d.createElement("article");
    card.className = `play-toast play-toast-${notice.kind} play-toast-${severity}`;
    card.innerHTML = `<strong>${esc(notice.title)}</strong><p>${esc(notice.body)}</p>`;
    host.append(card);
    while (host.children.length > MAX_TOASTS) host.firstElementChild.remove();
    setTimeout(() => card.classList.add("is-out"), TOAST_LIFE);
    setTimeout(() => card.remove(), TOAST_LIFE + 800);
  }

  function blockingRoot() {
    const d = doc();
    if (!d?.body) return null;
    if (overlayEl?.isConnected) return overlayEl;
    const el = d.createElement("div");
    el.className = "play-present-root";
    el.hidden = true;
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.innerHTML = `<div class="play-present-scrim" data-present-scrim></div>
      <div class="play-present-stage" data-present-stage tabindex="-1"></div>`;
    d.body.append(el);
    overlayEl = el;
    return el;
  }

  function closeBlocking() {
    const d = doc();
    if (overlayEl) {
      overlayEl.hidden = true;
      overlayEl.classList.remove("is-open");
      const stage = overlayEl.querySelector("[data-present-stage]");
      if (stage) stage.innerHTML = "";
    }
    d?.body?.classList.remove("is-presenting");
    const focus = lastFocus;
    lastFocus = null;
    current = null;
    if (focus && typeof focus.focus === "function") {
      try { focus.focus(); } catch (_) {}
    }
  }

  function bindBlockingKeys(stage, onContinue, onSkip) {
    const d = doc();
    const onKey = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        (onSkip || onContinue)();
        return;
      }
      if (event.key === "Enter" && event.target === stage) {
        event.preventDefault();
        onContinue();
      }
    };
    d?.addEventListener("keydown", onKey);
    return () => d?.removeEventListener("keydown", onKey);
  }

  function continueHtml(label) {
    return `<div class="play-present-actions">
      <button type="button" class="play-present-continue" data-present-continue>${esc(label || "Continue")}</button>
    </div>`;
  }

  function unlockKindLabel(kind) {
    if (kind === "background") return "Trainer ID Background";
    if (kind === "frame") return "Trainer ID Frame";
    if (kind === "title") return "Trainer Title";
    if (kind === "badge") return "Trainer Badge";
    if (kind === "avatar") return "Trainer Avatar";
    return "Trainer Reward";
  }

  function unlockActions(event) {
    const kind = event.unlockKind || event.payload?.kind || "";
    const id = event.cosmeticId || event.payload?.cosmeticId || event.payload?.titleId || event.payload?.badgeId || event.payload?.id || "";
    const canEquip = event.type === "unlock" && Boolean(id) && ["background", "frame", "title", "badge"].includes(kind);
    if (!canEquip) return continueHtml();
    return `<div class="play-present-actions">
      <button type="button" class="play-present-continue" data-present-equip data-equip-id="${esc(id)}" data-equip-kind="${esc(kind)}">Equip now</button>
      <button type="button" class="secondary" data-present-continue>Later</button>
    </div>`;
  }

  async function equipUnlock(event) {
    if (event.preview || !root.playCall) return;
    const kind = event.unlockKind || event.payload?.kind || "";
    const id = event.cosmeticId || event.payload?.cosmeticId || event.payload?.titleId || event.payload?.badgeId || event.payload?.id || "";
    if (!id) return;
    try {
      if (kind === "title") await root.playCall("play_set_title", { p_title: id });
      else await root.playCall("play_equip_cosmetic", { p_id: id });
    } catch (error) {
      presentError(error, "Could not equip that reward.");
    }
  }

  function fxHtml(kind) {
    if (isReduced() || perfMode() === "low") return "";
    const n = perfMode() === "high" ? 8 : 4;
    const extra = kind === "support" ? " is-star" : "";
    return `<span class="play-present-fx${extra}" aria-hidden="true">${"<i></i>".repeat(n)}</span>`;
  }

  function rewardHtml(event) {
    const lines = asArray(event.rewards).map((row) => `<li>${esc(rewardLine(row))}</li>`).join("");
    return lines ? `<ul class="play-present-rewards">${lines}</ul>` : "";
  }

  function artBox(event) {
    const src = event.species ? spriteUrl(event.species, event.variant, event.gender) : (event.item ? itemSprite(event.item) : "");
    return `<div class="play-present-art" data-present-art>
      ${src ? `<img src="${esc(src)}" alt="" width="128" height="128" decoding="async">` : `<span class="play-present-art-fallback" aria-hidden="true"></span>`}
    </div>`;
  }

  function runPanel(event, html, opts) {
    return new Promise((resolve) => {
      presented.push({ ...event, presentedAs: event.tier });
      if (env.instant || overlayPage() || !doc()?.body) {
        resolve();
        return;
      }
      const rootEl = blockingRoot();
      const stage = rootEl?.querySelector?.("[data-present-stage]");
      if (!rootEl || !stage) {
        resolve();
        return;
      }
      lastFocus = doc().activeElement;
      rootEl.hidden = false;
      rootEl.classList.add("is-open");
      rootEl.setAttribute("aria-label", event.title || "Reward");
      doc().body.classList.add("is-presenting");
      stage.innerHTML = html;
      stage.dataset.tier = event.tier;
      stage.dataset.type = event.type;
      const reduced = isReduced() || perfMode() === "low";
      stage.dataset.motion = reduced ? "static" : (perfMode() === "high" ? "full" : "soft");
      const done = () => {
        if (settlePanel === done) settlePanel = null;
        unbind();
        closeBlocking();
        resolve();
      };
      settlePanel = done;
      const skip = () => {
        if (stage.dataset) stage.dataset.stage = "done";
        done();
      };
      let unbind = () => {};
      unbind = bindBlockingKeys(stage, done, opts?.skipToEnd ? skip : done);
      stage.querySelector?.("[data-present-continue]")?.addEventListener?.("click", (ev) => {
        ev.preventDefault();
        done();
      });
      stage.querySelector?.("[data-present-equip]")?.addEventListener?.("click", (ev) => {
        ev.preventDefault();
        Promise.resolve(equipUnlock(event)).finally(done);
      });
      stage.querySelector?.("[data-present-skip]")?.addEventListener?.("click", (ev) => {
        ev.preventDefault();
        skip();
      });
      const focusTarget = stage.querySelector?.("[data-present-equip], [data-present-continue], [data-present-skip], button");
      (focusTarget || stage).focus?.();
      announce(`${event.title}. ${event.subtitle || ""}`.trim());
      if (typeof opts?.animate === "function") {
        Promise.resolve(opts.animate(stage, { skip, done, reduced })).catch(() => {});
      }
    });
  }

  async function presentPokedex(event) {
    const num = event.species ? `#${String(event.species).padStart(3, "0")}` : "";
    const name = speciesName(event.species).toUpperCase();
    const shiny = Boolean(event.shiny);
    cue("pokedex.register");
    const html = `<article class="play-present-moment play-present-dex" data-present-panel>
      ${fxHtml()}
      <p class="play-present-kicker" data-dex-kicker>Pokédex</p>
      <div class="play-present-dex-frame">
        <div class="play-present-art is-sil" data-present-art>
          ${event.species ? `<img src="${esc(spriteUrl(event.species, event.variant, event.gender))}" alt="" width="128" height="128" decoding="async">` : ""}
        </div>
        <p class="play-present-status" data-dex-status>REGISTERING…</p>
      </div>
      <h2 data-dex-title></h2>
      <p class="play-present-sub" data-dex-sub></p>
      ${rewardHtml(event)}
      <div class="play-present-actions">
        <button type="button" class="secondary play-present-skip" data-present-skip>Skip</button>
        <button type="button" class="play-present-continue" data-present-continue hidden>Continue</button>
      </div>
    </article>`;
    await runPanel(event, html, {
      skipToEnd: true,
      async animate(stage, ctl) {
        const q = (sel) => (stage && typeof stage.querySelector === "function" ? stage.querySelector(sel) : null);
        const art = q("[data-present-art]");
        const status = q("[data-dex-status]");
        const title = q("[data-dex-title]");
        const sub = q("[data-dex-sub]");
        const go = q("[data-present-continue]");
        const skip = q("[data-present-skip]");
        const finish = () => {
          art?.classList.remove("is-sil");
          if (status) status.textContent = shiny ? "✨ SHINY REGISTERED ✨" : "REGISTERED";
          if (title) title.textContent = shiny ? "✨ SHINY REGISTERED ✨" : "NEW POKÉDEX ENTRY!";
          if (sub) sub.textContent = `${num} ${name}`.trim();
          if (go) go.hidden = false;
          if (skip) skip.hidden = true;
          go?.focus();
        };
        if (ctl.reduced) {
          finish();
          return;
        }
        stage.dataset.stage = "enter";
        await wait(420);
        if (stage.dataset.stage === "done") return finish();
        stage.dataset.stage = "register";
        await wait(720);
        if (stage.dataset.stage === "done") return finish();
        art?.classList.remove("is-sil");
        stage.dataset.stage = "reveal";
        if (status) status.textContent = "REGISTERED";
        await wait(480);
        if (stage.dataset.stage === "done") return finish();
        finish();
      }
    });
  }

  async function presentLevel(event) {
    const from = event.from || Math.max(1, (event.to || 1) - 1);
    const to = event.to || from + 1;
    cue("level.up");
    const unlocks = asArray(event.payload?.reward?.grants ? Object.keys(event.payload.reward.grants) : [])
      .concat(event.unlockName ? [event.unlockName] : []);
    const unlockHtml = unlocks.length
      ? `<div class="play-present-unlocks"><p class="play-present-kicker">UNLOCKED</p>${unlocks.map((row) => `<p>${esc(String(row))}</p>`).join("")}</div>`
      : "";
    const html = `<article class="play-present-moment play-present-level" data-present-panel>
      ${fxHtml()}
      <p class="play-present-kicker">Trainer</p>
      <h2>TRAINER LEVEL UP!</h2>
      <div class="play-present-levels" aria-hidden="true">
        <span data-level-from>${esc(from)}</span>
        <span class="play-present-levels-arrow">→</span>
        <span data-level-to>${esc(to)}</span>
      </div>
      <div class="play-present-xp" aria-hidden="true"><i data-level-bar></i></div>
      <p class="play-present-sub">LEVEL ${esc(to)}</p>
      ${unlockHtml}
      ${rewardHtml(event)}
      ${continueHtml()}
    </article>`;
    await runPanel(event, html, {
      async animate(stage, ctl) {
        const bar = typeof stage?.querySelector === "function" ? stage.querySelector("[data-level-bar]") : null;
        if (!bar) return;
        if (ctl.reduced) {
          bar.style.width = "100%";
          return;
        }
        bar.style.width = "8%";
        await wait(80);
        bar.style.width = "100%";
      }
    });
  }

  async function presentCard(event) {
    if (event.type === "achievement") cue("achievement.unlock");
    else if (event.type === "support") cue("support.thankyou");
    else if (event.rare || event.type === "item") cue(event.rare ? "item.rare" : "reward.small");
    else cue("reward.major");
    const kicker = event.type === "achievement"
      ? "ACHIEVEMENT UNLOCKED"
      : event.type === "unlock"
        ? "NEW TRAINER REWARD!"
        : event.type === "purchase"
          ? "PURCHASE COMPLETE"
          : event.type === "support"
            ? "SUPPORT RECEIVED!"
            : event.type === "summary"
              ? event.title
              : event.title;
    const name = event.type === "achievement" ? (event.subtitle || event.unlockName) : (event.unlockName || event.subtitle);
    const news = asArray(event.news || event.payload?.news).map((line) => `<li>${esc(line)}</li>`).join("");
    const kindLine = event.type === "unlock" ? unlockKindLabel(event.unlockKind || event.payload?.kind) : "";
    const body = event.body || (event.type === "achievement" ? event.payload?.description : "") || kindLine;
    const html = `<article class="play-present-card${event.type === "support" ? " is-support" : ""}" data-present-panel data-type="${esc(event.type)}">
      ${fxHtml(event.type)}
      <p class="play-present-kicker">${esc(kicker)}</p>
      ${event.species || event.item ? artBox(event) : ""}
      <h2>${esc(name || event.title)}</h2>
      <p class="play-present-sub">${esc(body)}</p>
      ${event.type === "unlock" ? `<p class="play-present-kicker">UNLOCKED</p>` : ""}
      ${rewardHtml(event)}
      ${news ? `<ul class="play-present-news">${news}</ul>` : ""}
      ${event.type === "unlock" ? unlockActions(event) : continueHtml()}
    </article>`;
    await runPanel(event, html);
  }

  async function presentOne(event) {
    current = event;
    markSeen(event.id);
    if (event.tier === TIER.toast) {
      showToast(event);
      return;
    }
    if (event.type === "pokedex") return presentPokedex(event);
    if (event.type === "level") return presentLevel(event);
    return presentCard(event);
  }

  async function pump() {
    if (running) return;
    running = true;
    try {
      while (toastQ.length) showToast(toastQ.shift());
      while (blocking.length) {
        const next = blocking.shift();
        await presentOne(next);
        while (toastQ.length) showToast(toastQ.shift());
      }
    } finally {
      running = false;
      current = null;
      if (toastQ.length || blocking.length) pump();
    }
  }

  function enqueue(list, opts) {
    const context = opts || {};
    const incoming = collapse(order(asArray(list).map((row) => normalize(row, context)).filter((row) => allowed(row, context))));
    const extra = context.noSummary ? null : summaryEvent(incoming, context);
    const events = extra ? incoming.concat(extra) : incoming;
    events.forEach((event) => {
      markSeen(event.id);
      if (event.tier === TIER.toast) toastQ.push(event);
      else blocking.push(event);
    });
    if (!pumpPromise) {
      pumpPromise = Promise.resolve().then(pump).finally(() => {
        pumpPromise = null;
      });
    }
    return events;
  }

  async function showNotices(opts) {
    if (noticeBusy || overlayPage()) return [];
    if (!root.playCall || !root.playSupabase) return [];
    noticeBusy = true;
    try {
      const data = await root.playCall("play_notices");
      const notices = asArray(data?.notices);
      return enqueue(notices, opts || {});
    } catch (_) {
      return [];
    } finally {
      noticeBusy = false;
    }
  }

  function severityOf(error, fallback) {
    const text = String(error?.message || fallback || "");
    if (/not enough|don't have|do not have|no .+ left|locked|expired|phase/i.test(text)) return "warning";
    return "error";
  }

  function presentError(error, fallback) {
    const body = typeof root.playHumanRpcError === "function"
      ? root.playHumanRpcError(error, fallback)
      : (error?.message || fallback || "That action did not work.");
    const event = normalize({
      id: `error:${body}`.slice(0, 160),
      type: "error",
      kind: "error",
      title: /sign in|session/i.test(body) ? "Session expired" : "Can't do that",
      body,
      severity: severityOf(error, body),
      preview: env.preview
    });
    event.tier = TIER.toast;
    showToast(event);
    if (typeof console !== "undefined" && error && (error.code || error.details || error.hint)) {
      console.warn("[play]", error);
    }
    return body;
  }

  function presentConfirm(opts) {
    const d = doc();
    if (!d?.body) return Promise.resolve(false);
    if (confirmBusy) return Promise.resolve(false);
    confirmBusy = true;
    return new Promise((resolve) => {
      const dialog = d.createElement("dialog");
      const danger = Boolean(opts?.danger);
      dialog.className = `play-modal play-modal-confirm${danger ? " is-danger" : ""}`;
      dialog.innerHTML = `<form class="play-modal-card" method="dialog">
        <header class="play-modal-head">
          <h3>${esc(opts?.title || "Confirm")}</h3>
          <button class="secondary" value="cancel" type="submit">${esc(opts?.cancelLabel || "Cancel")}</button>
        </header>
        <p>${esc(opts?.body || "")}</p>
        <div class="links">
          <button value="confirm" type="submit">${esc(opts?.confirmLabel || "Confirm")}</button>
        </div>
      </form>`;
      d.body.append(dialog);
      let settled = false;
      const finish = (ok) => {
        if (settled) return;
        settled = true;
        confirmBusy = false;
        try { dialog.close?.(); } catch (_) {}
        dialog.remove();
        resolve(Boolean(ok));
      };
      dialog.addEventListener("cancel", (event) => {
        event.preventDefault();
        finish(false);
      });
      dialog.addEventListener("close", () => finish(dialog.returnValue === "confirm"));
      dialog.querySelector("form")?.addEventListener("submit", (event) => {
        event.preventDefault();
        const value = event.submitter?.value || "cancel";
        finish(value === "confirm");
      });
      if (typeof root.playShowDialog === "function") root.playShowDialog(dialog);
      else if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
      const focusBtn = danger
        ? dialog.querySelector("button[value='cancel']")
        : dialog.querySelector("button[value='confirm']");
      focusBtn?.focus();
    });
  }

  const PREVIEWS = {
    toast: () => ({ id: "lab:toast", type: "xp", title: "+5 XP", body: "Trainer XP", rewards: [{ type: "xp", amount: 5 }] }),
    card: () => ({ id: "lab:card", type: "item", title: "Rare item found!", item: "thunderstone", qty: 1, rare: true, body: "Thunder Stone ×1 — added to your Bag." }),
    pokedex: (opts) => ({
      id: "lab:pokedex",
      type: "pokedex",
      species: Number(opts?.species || 25),
      variant: opts?.variant || "normal",
      gender: opts?.gender || "",
      rewards: [{ type: "xp", amount: 25 }, { type: "coins", amount: 100 }]
    }),
    level: () => ({ id: "lab:level", type: "level", title: "TRAINER LEVEL UP!", from: 24, to: 25, payload: { from: 24, to: 25, reward: { label: "Kanto Starfield", grants: { "Trainer ID Background": 1 } } } }),
    achievement: () => ({
      id: "lab:achievement",
      type: "achievement",
      title: "ACHIEVEMENT UNLOCKED",
      subtitle: "Shocking Discovery",
      body: "Register Pikachu in your Pokédex.",
      payload: { id: "lab-shock", name: "Shocking Discovery", description: "Register Pikachu in your Pokédex.", rewards: { coins: 100 } },
      rewards: [{ type: "coins", amount: 100 }]
    }),
    unlock: () => ({
      id: "lab:unlock",
      type: "unlock",
      title: "NEW TRAINER REWARD!",
      unlockName: "Starlight Sky",
      body: "Trainer ID Background",
      unlockKind: "background",
      payload: { cosmeticId: "bg-starlight", kind: "background", name: "Starlight Sky", equip: true }
    }),
    title: () => ({
      id: "lab:title",
      type: "unlock",
      title: "NEW TRAINER REWARD!",
      unlockName: "Kanto Collector",
      body: "Trainer Title",
      unlockKind: "title",
      payload: { titleId: "kanto-collector", kind: "title", name: "Kanto Collector", equip: true }
    }),
    badge: () => ({
      id: "lab:badge",
      type: "unlock",
      title: "NEW TRAINER REWARD!",
      unlockName: "Kanto Master",
      body: "Trainer Badge",
      unlockKind: "badge",
      payload: { badgeId: "kanto-master", kind: "badge", name: "Kanto Master", equip: true }
    }),
    avatar: () => ({
      id: "lab:avatar",
      type: "unlock",
      title: "NEW TRAINER REWARD!",
      unlockName: "Red",
      body: "Trainer Avatar",
      unlockKind: "avatar",
      payload: { kind: "avatar", name: "Red" }
    }),
    background: () => ({
      id: "lab:background",
      type: "unlock",
      title: "NEW TRAINER REWARD!",
      unlockName: "Starlight Sky",
      body: "Trainer ID Background",
      unlockKind: "background",
      payload: { cosmeticId: "bg-starlight", kind: "background", name: "Starlight Sky", equip: true }
    }),
    frame: () => ({
      id: "lab:frame",
      type: "unlock",
      title: "NEW TRAINER REWARD!",
      unlockName: "Kanto Master Frame",
      body: "Trainer ID Frame",
      unlockKind: "frame",
      payload: { cosmeticId: "frame-kanto", kind: "frame", name: "Kanto Master Frame", equip: true }
    }),
    item: (opts) => ({
      id: "lab:item",
      type: "item",
      item: opts?.item || "ultraball",
      qty: Number(opts?.qty || 5),
      title: "PURCHASE COMPLETE",
      body: `${itemLabel(opts?.item || "ultraball")} ×${Number(opts?.qty || 5)}`
    }),
    summary: () => ({
      id: "lab:summary",
      type: "summary",
      title: "ENCOUNTER COMPLETE",
      subtitle: "Pikachu",
      rewards: [
        { type: "xp", amount: 25 },
        { type: "mastery", amount: 5 },
        { type: "candy", amount: 3 },
        { type: "coins", amount: 100 }
      ],
      news: ["Pokédex Entry", "Achievement: Shocking Discovery"]
    }),
    error: () => ({ id: "lab:error", type: "error", title: "Can't do that", body: "Not enough PokéCoins.", severity: "warning" }),
    support: () => ({
      id: "lab:support",
      type: "support",
      kind: "support",
      title: "THANK YOU! ★",
      body: "Adventure Pack added to your bag.",
      payload: {
        type: "support",
        name: "Adventure Pack",
        bits: 200,
        grants: { greatball: 10, berry: 3, bait: 2 }
      }
    })
  };

  function preview(kind, opts) {
    const key = String(kind || "toast");
    const factory = PREVIEWS[key] || PREVIEWS.toast;
    const raw = factory(opts || {});
    raw.preview = true;
    env.preview = true;
    if (opts?.perf) env.perf = opts.perf;
    if (opts?.reducedMotion != null) env.reducedMotion = Boolean(opts.reducedMotion);
    const events = enqueue([raw], { preview: true, noSummary: true, source: "lab" });
    env.preview = false;
    return events;
  }

  function reset(allSeen) {
    blocking.length = 0;
    toastQ.length = 0;
    presented.length = 0;
    running = false;
    current = null;
    env.instant = false;
    env.perf = "";
    env.reducedMotion = null;
    env.preview = false;
    const stop = settlePanel;
    settlePanel = null;
    closeBlocking();
    if (stop) {
      try { stop(); } catch (_) {}
    }
    if (allSeen) {
      seenMem.clear();
      try { root.sessionStorage?.removeItem(SEEN_KEY); } catch (_) {}
    }
  }

  root.playPresentTiers = TIER;
  root.playPresentNormalize = normalize;
  root.playPresentClassify = classify;
  root.playPresentOrder = order;
  root.playPresentCollapse = collapse;
  root.playPresentRank = rank;
  root.playPresentEnqueue = enqueue;
  root.playPresentShowNotices = showNotices;
  root.playPresentPreview = preview;
  root.playPresentError = presentError;
  root.playPresentConfirm = presentConfirm;
  root.playPresentRewardLine = rewardLine;
  root.playPresentCue = cue;
  root.playPresentReset = reset;
  root.playPresentHasSeen = hasSeen;
  root.playPresentMarkSeen = markSeen;
  root.playPresentSnapshot = function playPresentSnapshot() {
    return {
      blocking: blocking.map((row) => row.id),
      toasts: toastQ.map((row) => row.id),
      presented: presented.map((row) => ({ id: row.id, type: row.type, tier: row.tier, as: row.presentedAs })),
      running,
      current: current?.id || null
    };
  };
  root.playPresentSetEnv = function playPresentSetEnv(next) {
    Object.assign(env, next || {});
  };
  root.playPresentPump = pump;
  root.playPresentFlush = function playPresentFlush() {
    return pumpPromise || Promise.resolve();
  };
  root.playPresentPreviews = Object.keys(PREVIEWS);

  const prevShow = root.playShowNotices;
  root.playShowNotices = function playShowNotices(opts) {
    if (typeof showNotices === "function") return showNotices(opts);
    if (typeof prevShow === "function") return prevShow(opts);
  };

  const prevToast = root.playToast;
  if (typeof prevToast === "function") {
    root.playToast = function playToast(notice) {
      const cardReady = Boolean(doc()?.body);
      if (!cardReady) return prevToast(notice);
      return prevToast(notice);
    };
  }
})();
