(() => {
  const root = typeof window !== "undefined" ? window : globalThis;
  const LEGENDARY_MYTHICAL = new Set([144, 145, 146, 150, 151]);
  const FILTERS = [
    { id: "all", label: "All Kanto" },
    { id: "normal", label: "Normal Spawn" },
    { id: "legendary", label: "Legendary & Mythical" },
    { id: "regional", label: "Regional Forms" },
    { id: "mega", label: "Mega Evolutions" },
    { id: "gigantamax", label: "Gigantamax" },
    { id: "pikachu", label: "Pikachu Forms" },
    { id: "other", label: "Other Alternate Forms" }
  ];

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

  function shortTz(date) {
    try {
      const parts = new Intl.DateTimeFormat(undefined, { timeZoneName: "short" }).formatToParts(date);
      return parts.find((p) => p.type === "timeZoneName")?.value || "";
    } catch (_) {
      return "";
    }
  }

  function formatWhen(iso, withTz) {
    if (!iso) return "TBD";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "TBD";
    const text = d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
    if (!withTz) return text;
    const abbr = shortTz(d);
    return abbr ? `${text} ${abbr}` : text;
  }

  function formatWhenCompact(iso) {
    return formatWhen(iso, true) === "TBD" ? "" : formatWhen(iso, true);
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
      SPECIAL: "Special Event",
      CELEBRATION: "Celebration",
      SEASONAL: "Seasonal",
      COMMUNITY: "Community",
      ADMIN_TEST: "Admin test"
    })[String(type || "").toUpperCase()] || "Special Event";
  }

  function statusLabel(status) {
    return String(status || "").replace(/_/g, " ");
  }

  function padDex(dex) {
    return typeof root.playPadDex === "function" ? root.playPadDex(dex) : String(dex).padStart(3, "0");
  }

  function speciesName(dex) {
    return (typeof root.playSpeciesName === "function" ? root.playSpeciesName(dex) : "") || `No. ${dex}`;
  }

  function formMeta(formId) {
    return typeof root.playFormMeta === "function" ? root.playFormMeta(formId) : null;
  }

  function formsForDex(dex) {
    if (typeof root.playFormsForDex === "function") {
      return root.playFormsForDex(dex, { event: true }) || [];
    }
    return [{ formId: Number(dex), formLabel: "Base", isBase: true, kind: "base", dex: Number(dex) }];
  }

  function displayName(dex, formId) {
    if (typeof root.playFormDisplayName === "function") return root.playFormDisplayName(dex, formId);
    return speciesName(dex);
  }

  function isKantoDex(dex) {
    const n = Number(dex);
    return Number.isFinite(n) && n >= 1 && n <= 151;
  }

  function isNormalSpawnDex(dex) {
    const n = Number(dex);
    return isKantoDex(n) && !LEGENDARY_MYTHICAL.has(n);
  }

  /** Deterministic UI category for alternate forms (not raw DB kind alone). */
  function uiCategory(form) {
    if (!form || form.isBase) return "base";
    const kind = String(form.kind || "").toLowerCase();
    const key = String(form.formKey || "").toLowerCase();
    const label = String(form.formLabel || "").toLowerCase();
    const blob = `${kind} ${key} ${label}`;
    if (kind === "mega" || /\bmega\b/.test(blob)) return "mega";
    if (kind === "gigantamax" || /gigantamax|gmax/.test(blob)) return "gigantamax";
    if (Number(form.dex) === 25 && (kind === "costume" || /cap|cosplay|belle|libre|phd|rock|pop|starter|partner/.test(blob))) {
      return "pikachu";
    }
    if (kind === "costume") return "costume";
    // Totem / Alolan Totem / Galarian / Hisuian / Paldean → Regional
    if (
      kind === "regional" ||
      /alolan|galarian|hisuian|paldean|totem/.test(blob)
    ) {
      return "regional";
    }
    return "other";
  }

  function formCategoryBadge(meta) {
    const cat = uiCategory(meta);
    if (cat === "mega") {
      const lab = String(meta?.formLabel || "");
      if (/x$/i.test(lab) || /\bx\b/i.test(lab)) return { code: "MEGA X", className: "se-badge-mega" };
      if (/y$/i.test(lab) || /\by\b/i.test(lab)) return { code: "MEGA Y", className: "se-badge-mega" };
      return { code: "MEGA", className: "se-badge-mega" };
    }
    if (cat === "regional") {
      const lab = String(meta?.formLabel || meta?.formKey || "");
      if (/alola/i.test(lab)) return { code: "ALOLAN", className: "se-badge-regional", sub: "REGIONAL" };
      if (/galar/i.test(lab)) return { code: "GALARIAN", className: "se-badge-regional", sub: "REGIONAL" };
      if (/hisui/i.test(lab)) return { code: "HISUIAN", className: "se-badge-regional", sub: "REGIONAL" };
      if (/paldea/i.test(lab)) return { code: "PALDEAN", className: "se-badge-regional", sub: "REGIONAL" };
      if (/totem/i.test(lab)) return { code: "TOTEM", className: "se-badge-regional", sub: "REGIONAL" };
      return { code: "REGIONAL", className: "se-badge-regional" };
    }
    if (cat === "gigantamax") return { code: "GIGANTAMAX", className: "se-badge-gmax" };
    if (cat === "pikachu" || cat === "costume") {
      if (/cap/i.test(String(meta?.formLabel || meta?.formKey || ""))) {
        return { code: "CAP", className: "se-badge-costume" };
      }
      return { code: "COSTUME", className: "se-badge-costume" };
    }
    if (cat === "other") return { code: "ALTERNATE", className: "se-badge-other" };
    return null;
  }

  function kantoAlternateForms() {
    const catalog = root.PLAY_FORMS || {};
    return Object.values(catalog).filter((f) => {
      if (!f || f.isBase) return false;
      if (!f.eventTargetable) return false;
      if (!isKantoDex(f.dex)) return false;
      if (f.originGen1 === false) return false;
      const key = String(f.formKey || "").toLowerCase();
      if (key === "back" || /facing|back/.test(key)) return false;
      return true;
    });
  }

  function formMatchesFilter(form, filterId) {
    const cat = uiCategory(form);
    if (filterId === "regional") return cat === "regional";
    if (filterId === "mega") return cat === "mega";
    if (filterId === "gigantamax") return cat === "gigantamax";
    if (filterId === "pikachu") return Number(form.dex) === 25 && !form.isBase;
    if (filterId === "other") return cat === "other";
    return true;
  }

  function speciesHasFilterForms(dex, filterId) {
    return formsForDex(dex).some((f) => !f.isBase && formMatchesFilter(f, filterId));
  }

  function formsForFilter(dex, filterId) {
    const all = formsForDex(dex);
    const filter = String(filterId || "all");
    if (["regional", "mega", "gigantamax", "pikachu"].includes(filter)) {
      const alts = all.filter((f) => !f.isBase && formMatchesFilter(f, filter));
      return alts.length ? alts : all.filter((f) => !f.isBase);
    }
    if (filter === "other") {
      const alts = all.filter((f) => !f.isBase && formMatchesFilter(f, "other"));
      return alts.length ? alts : all;
    }
    return all;
  }

  function defaultFormForFilter(dex, filterId) {
    const forms = formsForFilter(dex, filterId);
    if (!forms.length) return Number(dex);
    if (["regional", "mega", "gigantamax", "pikachu", "other"].includes(String(filterId || ""))) {
      const alt = forms.find((f) => !f.isBase);
      if (alt) return Number(alt.formId);
    }
    const base = forms.find((f) => f.isBase);
    return Number((base || forms[0]).formId);
  }

  function kantoBaseSpecies() {
    const out = [];
    for (let dex = 1; dex <= 151; dex += 1) out.push({ dex, name: speciesName(dex) });
    return out;
  }

  function filterSpeciesList(filterId, query) {
    const filter = String(filterId || "all");
    const q = String(query || "").trim().toLowerCase();
    let rows = kantoBaseSpecies();
    if (filter === "normal") rows = rows.filter((r) => isNormalSpawnDex(r.dex));
    else if (filter === "legendary") rows = rows.filter((r) => LEGENDARY_MYTHICAL.has(r.dex));
    else if (filter === "regional") rows = rows.filter((r) => speciesHasFilterForms(r.dex, "regional"));
    else if (filter === "mega") rows = rows.filter((r) => speciesHasFilterForms(r.dex, "mega"));
    else if (filter === "gigantamax") rows = rows.filter((r) => speciesHasFilterForms(r.dex, "gigantamax"));
    else if (filter === "pikachu") rows = rows.filter((r) => r.dex === 25);
    else if (filter === "other") rows = rows.filter((r) => speciesHasFilterForms(r.dex, "other"));
    else rows = rows.filter((r) => isKantoDex(r.dex));

    if (q) {
      rows = rows.filter((r) =>
        String(r.dex).includes(q) || String(r.name).toLowerCase().includes(q) || padDex(r.dex).includes(q)
      );
    }
    return rows.sort((a, b) => a.dex - b.dex);
  }

  /**
   * Reconcile selection against filter. Pure function for tests.
   * Returns { dex, formId, changed }.
   */
  function reconcileSelection(state) {
    const filter = String(state?.filter || "all");
    const query = String(state?.query || "");
    const rows = filterSpeciesList(filter, query);
    let dex = Number(state?.dex) || 0;
    let formId = Number(state?.formId) || dex;
    let changed = false;
    if (!rows.some((r) => r.dex === dex)) {
      dex = rows[0]?.dex || 1;
      formId = defaultFormForFilter(dex, filter);
      changed = true;
    } else {
      const allowed = formsForFilter(dex, filter);
      if (!allowed.some((f) => Number(f.formId) === formId)) {
        formId = defaultFormForFilter(dex, filter);
        changed = true;
      }
    }
    return { dex, formId, changed, rows };
  }

  function filterCounts() {
    const alts = kantoAlternateForms();
    return {
      allKantoBase: 151,
      allKantoAlternate: alts.length,
      normalSpawn: filterSpeciesList("normal").length,
      legendary: filterSpeciesList("legendary").length,
      regional: alts.filter((f) => uiCategory(f) === "regional").length,
      mega: alts.filter((f) => uiCategory(f) === "mega").length,
      gigantamax: alts.filter((f) => uiCategory(f) === "gigantamax").length,
      pikachuForms: alts.filter((f) => Number(f.dex) === 25 && !f.isBase).length,
      other: alts.filter((f) => uiCategory(f) === "other").length,
      dexOver151: alts.filter((f) => Number(f.dex) > 151).length
    };
  }

  function classificationAudit() {
    return kantoAlternateForms()
      .slice()
      .sort((a, b) => a.dex - b.dex || a.formId - b.formId)
      .map((f) => ({
        dex: f.dex,
        species: speciesName(f.dex),
        formId: f.formId,
        formLabel: f.formLabel,
        formKey: f.formKey,
        kind: f.kind,
        uiCategory: uiCategory(f)
      }));
  }

  function badgeHtml(badges) {
    const rows = (badges || []).filter(Boolean);
    if (!rows.length) return "";
    return `<div class="se-badge-row" role="list">${rows.map((b) => {
      const sub = b.sub ? `<span class="se-badge-sub">${esc(b.sub)}</span>` : "";
      const icon = b.icon ? `<span class="se-badge-icon" aria-hidden="true">${esc(b.icon)}</span>` : "";
      return `<span class="se-badge ${esc(b.className || "")}" role="listitem">${icon}<span class="se-badge-label">${esc(b.code)}</span>${sub}</span>`;
    }).join("")}</div>`;
  }

  function selectionBadges(opts) {
    const o = opts || {};
    const dex = Number(o.dex);
    const formId = Number(o.formId || dex);
    const meta = formMeta(formId);
    const badges = [];
    if (LEGENDARY_MYTHICAL.has(dex)) {
      badges.push(dex === 151
        ? { code: "MYTHICAL", className: "se-badge-mythical", icon: "✦" }
        : { code: "LEGENDARY", className: "se-badge-legendary", icon: "★" });
    }
    const formBadge = formCategoryBadge(meta);
    if (formBadge && !meta?.isBase && formId !== dex) badges.push(formBadge);
    if (o.shiny || String(o.variantPolicy || "").toUpperCase() === "FORCED_SHINY") {
      badges.push({ code: "SHINY", className: "se-badge-shiny", icon: "✨" });
    }
    if (o.gender === "Female") badges.push({ code: "FEMALE", className: "se-badge-female", icon: "♀" });
    if (o.gender === "Male") badges.push({ code: "MALE", className: "se-badge-male", icon: "♂" });
    return badges;
  }

  function previewVariant(opts) {
    const shiny = Boolean(opts?.shiny) || String(opts?.variantPolicy || "").toUpperCase() === "FORCED_SHINY";
    const gender = opts?.gender || "";
    if (typeof root.playSpriteVariant === "function") {
      return root.playSpriteVariant(opts?.dex, gender, shiny);
    }
    return shiny ? "shiny" : "normal";
  }

  function sprite(event) {
    const dex = Number(event?.dex || event?.species || 0);
    if (!dex || typeof root.playSpriteUrl !== "function") return "";
    const formId = Number(event?.formId || event?.pokemonFormId || dex);
    const variant = previewVariant({
      dex,
      gender: event?.gender || event?.presentation?.gender,
      shiny: event?.shiny,
      variantPolicy: event?.variantPolicy
    });
    return root.playSpriteUrl(dex, variant, formId);
  }

  function isSpecialRound(round) {
    return Boolean(round?.specialEvent?.id) || String(round?.triggerSource || "") === "SPECIAL_EVENT";
  }

  function remainingHint(event, escaped) {
    const left = Number(event?.remainingRounds || 0);
    if (!escaped) return "";
    if (left > 0) return "This Pokémon may appear again later in tonight's event.";
    return "";
  }

  function identityLines(event) {
    const dex = Number(event?.dex || event?.species || 0);
    const formId = Number(event?.formId || event?.pokemonFormId || dex);
    const name = event?.displayName || displayName(dex, formId);
    const meta = formMeta(formId);
    const cat = formCategoryBadge(meta)?.code || "";
    const shiny = Boolean(event?.shiny) || String(event?.variantPolicy || "").toUpperCase() === "FORCED_SHINY" || /shiny/i.test(String(event?.variant || ""));
    const gender = event?.gender || event?.presentation?.gender || "";
    const bits = [];
    if (shiny) bits.push("✨ Shiny");
    if (gender === "Female") bits.push("♀ Female");
    if (gender === "Male") bits.push("♂ Male");
    return { dex, formId, name, cat, shiny, gender, props: bits.join(" · ") };
  }

  function cardHtml(event, opts) {
    const options = opts || {};
    if (!event) return "";
    const live = String(event.status || "").toUpperCase() === "LIVE";
    const art = sprite(event);
    const when = live ? "LIVE NOW" : formatWhen(event.startsAt, true);
    const count = countdown(event.startsAt, event.serverNow);
    const kind = typeLabel(event.eventType);
    const idn = identityLines(event);
    const badges = badgeHtml(selectionBadges({
      dex: idn.dex,
      formId: idn.formId,
      gender: idn.gender,
      shiny: idn.shiny,
      variantPolicy: event.variantPolicy
    }));
    return `<article class="special-event-card${live ? " is-live" : ""}${options.compact ? " is-compact" : ""}">
      <div class="special-event-art" aria-hidden="true">
        ${art ? `<img src="${esc(art)}" alt="" onerror="window.playSpriteOnError && window.playSpriteOnError(this)">` : "<span>?</span>"}
      </div>
      <div class="special-event-copy">
        <p class="eyebrow">${esc(kind)}${live ? " · LIVE" : (count ? ` · ${esc(count)}` : "")}</p>
        <h3>${esc(event.title || "Special Event")}</h3>
        <p><strong>${esc(idn.name)}</strong></p>
        ${badges}
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
    const formId = Number(o.formId || o.pokemonFormId || dex);
    const name = o.displayName || displayName(dex, formId);
    const title = o.title || "SPECIAL EVENT";
    const type = String(o.eventType || (dex === 151 ? "MYTHICAL" : "LEGENDARY")).toUpperCase();
    const meta = formMeta(formId);
    const formBadge = formCategoryBadge(meta);
    const shiny = Boolean(o.shiny) || String(o.variantPolicy || "").toUpperCase() === "FORCED_SHINY" || /shiny/i.test(String(o.variant || ""));
    const gender = o.gender || "";
    const when = formatWhenCompact(o.startsAt) || o.whenText || "";
    const props = [];
    if (shiny) props.push("✨ Shiny");
    if (gender === "Female") props.push("♀ Female");
    if (gender === "Male") props.push("♂ Male");
    const propLine = props.join(" · ");
    const variant = previewVariant({ dex, gender, shiny, variantPolicy: o.variantPolicy });

    const base = {
      type: "special-event",
      species: dex,
      formId,
      displayName: name,
      formCategory: formBadge?.code || "",
      variant,
      gender,
      shiny,
      eventType: type,
      title,
      subtitle: name,
      body: propLine,
      whenText: when,
      badges: selectionBadges({ dex, formId, gender, shiny, variantPolicy: o.variantPolicy })
    };

    const map = {
      upcoming: {
        ...base,
        id: "lab:special-upcoming",
        kind: "special-announced",
        theme: "announced",
        kicker: "SPECIAL EVENT",
        lifecycle: "EVENT ANNOUNCED",
        body: [propLine, when ? `Begins ${when}` : ""].filter(Boolean).join(" · ")
      },
      starting: {
        ...base,
        id: "lab:special-starting",
        kind: "special-starting",
        theme: "live",
        kicker: "EVENT STARTING",
        lifecycle: "EVENT STARTING",
        body: [propLine, when].filter(Boolean).join(" · ")
      },
      incoming: {
        ...base,
        id: "lab:special-incoming",
        kind: "special-live",
        theme: "live",
        kicker: "SPECIAL EVENT LIVE",
        lifecycle: "SPECIAL EVENT LIVE",
        body: propLine || title
      },
      caught: {
        ...base,
        id: "lab:special-caught",
        kind: "special-caught",
        theme: "caught",
        kicker: "CAUGHT!",
        lifecycle: "EVENT COMPLETE",
        title: name,
        subtitle: `Caught · #${padDex(dex)}`,
        body: propLine
      },
      escaped: {
        ...base,
        id: "lab:special-escaped",
        kind: "special-escaped",
        theme: "escaped",
        kicker: "ESCAPED!",
        lifecycle: "EVENT COMPLETE",
        title: `${name} escaped!`,
        subtitle: remainingHint({ remainingRounds: Number(o.remainingRounds || 0) }, true) || "The encounter has ended.",
        body: propLine
      },
      complete: {
        ...base,
        id: "lab:special-complete",
        kind: "special-complete",
        theme: "complete",
        kicker: "EVENT COMPLETE",
        lifecycle: "EVENT COMPLETE",
        body: propLine || "This Special Event has ended."
      }
    };
    return map[kind] || map.upcoming;
  }

  root.playSpecialDex = LEGENDARY_MYTHICAL;
  root.playSpecialFilters = FILTERS;
  root.playSpecialIsRound = isSpecialRound;
  root.playSpecialTypeLabel = typeLabel;
  root.playSpecialStatusLabel = statusLabel;
  root.playSpecialFormatWhen = formatWhen;
  root.playSpecialFormatWhenCompact = formatWhenCompact;
  root.playSpecialTimezone = tzName;
  root.playSpecialShortTimezone = shortTz;
  root.playSpecialCountdown = countdown;
  root.playSpecialCardHtml = cardHtml;
  root.playSpecialListHtml = listHtml;
  root.playSpecialMount = mountPlayer;
  root.playSpecialRemainingHint = remainingHint;
  root.playSpecialPresentation = presentationEvents;
  root.playSpecialFilterSpecies = filterSpeciesList;
  root.playSpecialFilterCounts = filterCounts;
  root.playSpecialKantoAlternateForms = kantoAlternateForms;
  root.playSpecialIsNormalSpawnDex = isNormalSpawnDex;
  root.playSpecialIsKantoDex = isKantoDex;
  root.playSpecialPreviewVariant = previewVariant;
  root.playSpecialIdentityLines = identityLines;
  root.playSpecialUiCategory = uiCategory;
  root.playSpecialFormsForFilter = formsForFilter;
  root.playSpecialDefaultFormForFilter = defaultFormForFilter;
  root.playSpecialReconcileSelection = reconcileSelection;
  root.playSpecialClassificationAudit = classificationAudit;
  root.playSpecialSelectionBadges = selectionBadges;
  root.playSpecialBadgeHtml = badgeHtml;
})();
