(() => {
  const root = typeof window !== "undefined" ? window : globalThis;
  const SPECIAL_DEX = new Set([144, 145, 146, 150, 151]);

  function esc(value) {
    return typeof root.playEscapeAttr === "function"
      ? root.playEscapeAttr(value)
      : String(value ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  }

  function tzName() {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "local";
    } catch (_) {
      return "local";
    }
  }

  function formatWhen(iso, withTz) {
    if (!iso) return "TBD";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "TBD";
    const text = d.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
    return withTz ? `${text} · ${tzName()}` : text;
  }

  function countdown(iso, nowIso) {
    if (!iso) return "";
    const now = nowIso ? Date.parse(nowIso) : Date.now();
    const ms = Date.parse(iso) - now;
    if (!Number.isFinite(ms)) return "";
    if (ms <= 0) return "Starting soon";
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${Math.max(1, m)}m`;
  }

  function typeLabel(type) {
    return ({
      LEGENDARY: "Legendary",
      MYTHICAL: "Mythical",
      SPECIAL: "Special",
      CELEBRATION: "Celebration",
      SEASONAL: "Seasonal",
      COMMUNITY: "Community",
      ADMIN_TEST: "Admin test"
    })[String(type || "").toUpperCase()] || "Special";
  }

  function statusLabel(status) {
    return String(status || "").replace(/_/g, " ");
  }

  function sprite(event) {
    const dex = Number(event?.dex || 0);
    if (!dex || typeof root.playSpriteUrl !== "function") return "";
    return root.playSpriteUrl(dex, "normal");
  }

  function isSpecialRound(round) {
    return Boolean(round?.specialEvent?.id) || String(round?.triggerSource || "") === "SPECIAL_EVENT";
  }

  function remainingHint(event, escaped) {
    const left = Number(event?.remainingRounds || 0);
    if (!escaped) return "";
    if (left > 0) return "The Legendary may appear again later in tonight's event.";
    return "";
  }

  function cardHtml(event, opts) {
    const options = opts || {};
    if (!event) return "";
    const live = String(event.status || "").toUpperCase() === "LIVE";
    const art = sprite(event);
    const when = live ? "LIVE NOW" : formatWhen(event.startsAt, true);
    const count = countdown(event.startsAt, event.serverNow);
    const kind = typeLabel(event.eventType);
    return `<article class="special-event-card${live ? " is-live" : ""}${options.compact ? " is-compact" : ""}">
      <div class="special-event-art" aria-hidden="true">
        ${art ? `<img src="${esc(art)}" alt="" onerror="window.playSpriteOnError && window.playSpriteOnError(this)">` : "<span>?</span>"}
      </div>
      <div class="special-event-copy">
        <p class="eyebrow">${esc(kind)}${live ? " · LIVE" : (count ? ` · ${esc(count)}` : "")}</p>
        <h3>${esc(event.title || "Special Encounter")}</h3>
        <p>${esc(event.subtitle || event.name || "")}</p>
        <p class="muted">${esc(when)}</p>
      </div>
    </article>`;
  }

  function listHtml(payload, opts) {
    const upcoming = Array.isArray(payload?.upcoming) ? payload.upcoming.filter(Boolean) : [];
    const live = payload?.live || null;
    if (!live && !upcoming.length) return "";
    const rows = [];
    if (live) rows.push(cardHtml(live, opts));
    upcoming.forEach((row) => {
      if (live && row.id === live.id) return;
      rows.push(cardHtml(row, opts));
    });
    if (!rows.length) return "";
    return `<section class="special-event-upcoming" aria-label="Upcoming special events">
      <p class="eyebrow">Upcoming events</p>
      ${rows.join("")}
    </section>`;
  }

  function mountPlayer(host, payload) {
    if (!host) return;
    const html = listHtml(payload, { compact: true });
    host.hidden = !html;
    host.innerHTML = html || "";
  }

  function presentationEvents(kind, opts) {
    const o = opts || {};
    const dex = Number(o.species || o.dex || 144);
    const name = (typeof root.playSpeciesName === "function" ? root.playSpeciesName(dex) : "") || "Articuno";
    const title = o.title || "THE FROZEN LEGEND AWAKENS";
    const type = String(o.eventType || (dex === 151 ? "MYTHICAL" : "LEGENDARY")).toUpperCase();
    const registered = type === "MYTHICAL" ? "MYTHICAL REGISTERED" : "LEGENDARY REGISTERED";
    const map = {
      upcoming: {
        id: "lab:special-upcoming",
        type: "unlock",
        kind: "special-upcoming",
        title: "UPCOMING EVENT",
        subtitle: title,
        body: formatWhen(o.startsAt || new Date(Date.now() + 86400000).toISOString(), true),
        species: dex
      },
      starting: {
        id: "lab:special-starting",
        type: "unlock",
        kind: "special-starting",
        title: "EVENT STARTING",
        subtitle: title,
        body: name,
        species: dex
      },
      incoming: {
        id: "lab:special-incoming",
        type: type === "MYTHICAL" ? "mythical" : "legendary",
        kind: "legendary-incoming",
        title: type === "MYTHICAL" ? "MYTHICAL INCOMING" : "LEGENDARY INCOMING",
        subtitle: name,
        body: title,
        species: dex,
        variant: o.variant || "normal"
      },
      caught: {
        id: "lab:special-caught",
        type: type === "MYTHICAL" ? "mythical" : "legendary",
        kind: "legendary-registered",
        title: registered,
        subtitle: `#${String(dex).padStart(3, "0")} ${name}`,
        body: registered,
        species: dex,
        variant: o.variant || "normal"
      },
      escaped: {
        id: "lab:special-escaped",
        type: "unlock",
        kind: "legendary-escaped",
        title: `${name} escaped!`,
        subtitle: remainingHint({ remainingRounds: Number(o.remainingRounds || 0) }, true) || "The encounter has ended.",
        species: dex
      }
    };
    return map[kind] || map.upcoming;
  }

  root.playSpecialDex = SPECIAL_DEX;
  root.playSpecialIsRound = isSpecialRound;
  root.playSpecialTypeLabel = typeLabel;
  root.playSpecialStatusLabel = statusLabel;
  root.playSpecialFormatWhen = formatWhen;
  root.playSpecialTimezone = tzName;
  root.playSpecialCountdown = countdown;
  root.playSpecialCardHtml = cardHtml;
  root.playSpecialListHtml = listHtml;
  root.playSpecialMount = mountPlayer;
  root.playSpecialRemainingHint = remainingHint;
  root.playSpecialPresentation = presentationEvents;
})();
