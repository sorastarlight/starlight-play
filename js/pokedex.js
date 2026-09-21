(() => {
  const supabase = window.playSupabase;
  const els = {
    gate: document.getElementById("gate"),
    app: document.getElementById("dex-app"),
    summary: document.getElementById("dex-summary"),
    counters: document.getElementById("dex-counters"),
    notice: document.getElementById("dex-boundary-notice"),
    grid: document.getElementById("dex-grid"),
    search: document.getElementById("dex-search"),
    status: document.getElementById("filter-status"),
    team: document.getElementById("team-slots"),
    teamStatus: document.getElementById("team-status"),
    variants: document.getElementById("dex-variants")
  };

  let dexData = null;
  let detailState = null;
  let collectionCache = null;
  let openerEl = null;
  let scrollLockY = 0;
  let scrollLocked = false;
  let historyClosing = false;

  const LEGENDARY = new Set([144, 145, 146, 150]);
  const MYTHICAL = new Set([151]);
  const TABS = [
    { id: "overview", label: "Overview" },
    { id: "forms", label: "Forms" },
    { id: "evolution", label: "Evolution" },
    { id: "research", label: "Your Research" }
  ];
  const TAB_IDS = new Set(TABS.map((t) => t.id));

  // Compact Kanto evolution edge labels (display only; Oak owns readiness).
  const EVO_EDGE = {
    "1>2": "Lv. 16 · 40 Candy",
    "2>3": "Lv. 32 · 80 Candy",
    "4>5": "Lv. 16 · 40 Candy",
    "5>6": "Lv. 36 · 80 Candy",
    "7>8": "Lv. 16 · 40 Candy",
    "8>9": "Lv. 36 · 80 Candy",
    "10>11": "Lv. 7 · 25 Candy",
    "11>12": "Lv. 10 · 50 Candy",
    "13>14": "Lv. 7 · 25 Candy",
    "14>15": "Lv. 10 · 50 Candy",
    "16>17": "Lv. 18 · 40 Candy",
    "17>18": "Lv. 36 · 80 Candy",
    "19>20": "Lv. 20 · 40 Candy",
    "21>22": "Lv. 20 · 40 Candy",
    "23>24": "Lv. 22 · 40 Candy",
    "25>26": "Thunder Stone · 40 Candy",
    "27>28": "Lv. 22 · 40 Candy",
    "29>30": "Lv. 16 · 40 Candy",
    "30>31": "Moon Stone · 40 Candy",
    "32>33": "Lv. 16 · 40 Candy",
    "33>34": "Moon Stone · 40 Candy",
    "35>36": "Moon Stone · 40 Candy",
    "37>38": "Fire Stone · 40 Candy",
    "39>40": "Moon Stone · 40 Candy",
    "41>42": "Lv. 22 · 40 Candy",
    "43>44": "Lv. 21 · 40 Candy",
    "44>45": "Leaf Stone · 40 Candy",
    "46>47": "Lv. 24 · 40 Candy",
    "48>49": "Lv. 31 · 40 Candy",
    "50>51": "Lv. 26 · 40 Candy",
    "52>53": "Lv. 28 · 40 Candy",
    "54>55": "Lv. 33 · 40 Candy",
    "56>57": "Lv. 28 · 40 Candy",
    "58>59": "Fire Stone · 40 Candy",
    "60>61": "Lv. 25 · 40 Candy",
    "61>62": "Water Stone · 40 Candy",
    "63>64": "Lv. 16 · 40 Candy",
    "64>65": "Trade / Linking Cord · 40 Candy",
    "66>67": "Lv. 28 · 40 Candy",
    "67>68": "Trade / Linking Cord · 40 Candy",
    "69>70": "Lv. 21 · 40 Candy",
    "70>71": "Leaf Stone · 40 Candy",
    "72>73": "Lv. 30 · 40 Candy",
    "74>75": "Lv. 25 · 40 Candy",
    "75>76": "Trade / Linking Cord · 40 Candy",
    "77>78": "Lv. 40 · 40 Candy",
    "79>80": "Lv. 37 · 40 Candy",
    "81>82": "Lv. 30 · 40 Candy",
    "84>85": "Lv. 31 · 40 Candy",
    "86>87": "Lv. 34 · 40 Candy",
    "88>89": "Lv. 38 · 40 Candy",
    "90>91": "Water Stone · 40 Candy",
    "92>93": "Lv. 25 · 40 Candy",
    "93>94": "Trade / Linking Cord · 40 Candy",
    "95>208": null,
    "96>97": "Lv. 26 · 40 Candy",
    "98>99": "Lv. 28 · 40 Candy",
    "100>101": "Lv. 30 · 40 Candy",
    "102>103": "Leaf Stone · 40 Candy",
    "104>105": "Lv. 28 · 40 Candy",
    "108>463": null,
    "109>110": "Lv. 35 · 40 Candy",
    "111>112": "Lv. 42 · 40 Candy",
    "112>464": null,
    "113>242": null,
    "116>117": "Lv. 32 · 40 Candy",
    "117>230": null,
    "118>119": "Lv. 33 · 40 Candy",
    "120>121": "Water Stone · 40 Candy",
    "123>212": null,
    "125>466": null,
    "126>467": null,
    "129>130": "Lv. 20 · 40 Candy",
    "133>134": "Water Stone · 40 Candy",
    "133>135": "Thunder Stone · 40 Candy",
    "133>136": "Fire Stone · 40 Candy",
    "137>233": null,
    "138>139": "Lv. 40 · 40 Candy",
    "140>141": "Lv. 40 · 40 Candy",
    "147>148": "Lv. 30 · 40 Candy",
    "148>149": "Lv. 55 · 80 Candy"
  };

  function normalizeTab(id) {
    const key = String(id || "").toLowerCase();
    if (key === "stats") return "overview";
    if (TAB_IDS.has(key)) return key;
    return "overview";
  }

  function routeTabHint() {
    try {
      const url = new URL(window.location.href);
      const tab = url.searchParams.get("tab") || url.searchParams.get("dexTab");
      if (tab) return normalizeTab(tab);
      const hash = String(url.hash || "").replace(/^#/, "");
      if (/^tab[=-]?stats$/i.test(hash) || hash === "stats") return "overview";
      const m = hash.match(/^tab[=-]?([a-z]+)/i);
      if (m) return normalizeTab(m[1]);
    } catch (_) {}
    return null;
  }

  function evoEdgeLabel(fromDex, toDex) {
    return EVO_EDGE[`${Number(fromDex)}>${Number(toDex)}`] || null;
  }

  const overlay = document.createElement("div");
  overlay.id = "dex-overlay";
  overlay.className = "dex-overlay";
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="dex-overlay-backdrop" data-dex-close="1" aria-hidden="true"></div>
    <div class="dex-overlay-panel" role="dialog" aria-modal="true" aria-labelledby="dex-overlay-title" tabindex="-1">
      <div class="dex-overlay-chrome">
        <div class="dex-overlay-brand">
          <span class="dex-overlay-brand-mark" aria-hidden="true"></span>
          <span>Pokédex</span>
        </div>
        <div class="dex-overlay-nav">
          <button type="button" class="dex-overlay-step" data-dex-prev hidden>← Previous</button>
          <button type="button" class="dex-overlay-step" data-dex-next hidden>Next →</button>
        </div>
        <button type="button" class="dex-overlay-close" data-dex-close="1" aria-label="Close Pokédex entry">
          <span aria-hidden="true">×</span>
        </button>
      </div>
      <div class="dex-overlay-scan" aria-hidden="true"></div>
      <div class="dex-overlay-body" id="dex-overlay-body"></div>
      <div class="dex-overlay-tabs" role="tablist" aria-label="Pokédex modes"></div>
    </div>`;
  document.body.appendChild(overlay);

  const panel = overlay.querySelector(".dex-overlay-panel");
  const bodyEl = overlay.querySelector("#dex-overlay-body");
  const tabsEl = overlay.querySelector(".dex-overlay-tabs");
  const prevBtn = overlay.querySelector("[data-dex-prev]");
  const nextBtn = overlay.querySelector("[data-dex-next]");

  window.playBindAccountNav({
    onSignOut() {
      els.app.hidden = true;
      closeDetail({ clearRoute: true, fromAuth: true });
      window.playRestoreGate(els.gate, "Sign in to open your Pokédex.");
    }
  });

  function releasedDexList() {
    return window.playReleasedDexList ? window.playReleasedDexList() : Array.from({ length: 151 }, (_, i) => i + 1);
  }

  function isReleasedDex(dex) {
    return window.playIsReleasedDex ? window.playIsReleasedDex(dex) : (Number(dex) >= 1 && Number(dex) <= 151);
  }

  function releasedTotal() {
    return window.playReleasedDexTotal ? window.playReleasedDexTotal() : 151;
  }

  function entryFor(dex, data) {
    const name = window.playSpeciesName(dex);
    const seenSet = new Set((data.seen || []).map(Number));
    const catches = (data.caught || []).filter((row) => Number(row.dex) === dex);
    const caught = catches.length > 0;
    const seen = caught || seenSet.has(dex);
    return { dex, name, seen, caught, catches };
  }

  function matches(entry) {
    const status = els.status?.value || "all";
    const q = String(els.search?.value || "").trim();
    if (status === "caught" && !entry.caught) return false;
    if (status === "seen" && (!entry.seen || entry.caught)) return false;
    if (status === "unknown" && entry.seen) return false;
    if (q) {
      const hits = window.playParseSpeciesQuery
        ? window.playParseSpeciesQuery(q, { releasedOnly: true })
        : [];
      if (!hits.length) return false;
      return hits.some((hit) => Number(hit.dex) === entry.dex);
    }
    return true;
  }

  function showNotice(text) {
    if (!els.notice) return;
    els.notice.hidden = !text;
    els.notice.textContent = text || "";
  }

  function clearUnreleasedRoute() {
    try {
      const url = new URL(window.location.href);
      let dirty = false;
      let rejected = null;
      ["pokemon", "dex", "species", "id"].forEach((key) => {
        if (!url.searchParams.has(key)) return;
        const value = Number(url.searchParams.get(key));
        if (!isReleasedDex(value)) {
          url.searchParams.delete(key);
          dirty = true;
          rejected = "unreleased";
        }
      });
      if (url.hash) {
        const hashDex = Number(String(url.hash).replace(/^#0*/, ""));
        if (Number.isFinite(hashDex) && hashDex > 0 && !isReleasedDex(hashDex)) {
          url.hash = "";
          dirty = true;
          rejected = "unreleased";
        }
      }
      if (dirty) {
        window.history.replaceState(window.history.state, "", url);
        showNotice(rejected === "unreleased"
          ? "This Pokédex entry isn't currently available."
          : "You haven't discovered this Pokémon yet.");
        return true;
      }
    } catch (_) {}
    return false;
  }

  function routeDex() {
    try {
      const url = new URL(window.location.href);
      for (const key of ["pokemon", "dex", "species", "id"]) {
        if (!url.searchParams.has(key)) continue;
        const value = Number(url.searchParams.get(key));
        if (Number.isFinite(value) && value > 0) return value;
      }
      if (url.hash) {
        const hashDex = Number(String(url.hash).replace(/^#0*/, ""));
        if (Number.isFinite(hashDex) && hashDex > 0) return hashDex;
      }
    } catch (_) {}
    return null;
  }

  function buildEntryUrl(dex) {
    const url = new URL(window.location.href);
    ["pokemon", "dex", "species", "id"].forEach((key) => url.searchParams.delete(key));
    url.hash = "";
    if (dex) url.searchParams.set("pokemon", String(dex));
    return url;
  }

  function setRouteDex(dex, mode = "replace") {
    try {
      const url = buildEntryUrl(dex);
      const state = dex ? { pokedexModal: Number(dex) } : { pokedexModal: null };
      if (mode === "push") window.history.pushState(state, "", url);
      else window.history.replaceState(state, "", url);
    } catch (_) {}
  }

  function lockPageScroll() {
    if (scrollLocked) return;
    scrollLockY = window.scrollY || window.pageYOffset || 0;
    const sb = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
    document.documentElement.style.setProperty("--dex-sb", `${sb}px`);
    document.body.classList.add("dex-scroll-locked");
    document.body.style.top = `-${scrollLockY}px`;
    scrollLocked = true;
  }

  function unlockPageScroll() {
    if (!scrollLocked) return;
    document.body.classList.remove("dex-scroll-locked");
    document.body.style.top = "";
    document.documentElement.style.removeProperty("--dex-sb");
    window.scrollTo(0, scrollLockY);
    scrollLocked = false;
  }

  function focusables() {
    if (!panel) return [];
    return [...panel.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )].filter((el) => el.offsetParent !== null || el === panel);
  }

  function trapFocus(event) {
    if (!detailState || event.key !== "Tab") return;
    const list = focusables();
    if (!list.length) return;
    const first = list[0];
    const last = list[list.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function titleCaseType(t) {
    const s = String(t || "");
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
  }

  function formatHeight(m) {
    if (m == null || !Number.isFinite(Number(m))) return "—";
    const meters = Number(m);
    const totalIn = meters * 39.3700787;
    let ft = Math.floor(totalIn / 12);
    let inches = Math.round(totalIn % 12);
    if (inches === 12) { ft += 1; inches = 0; }
    return `${ft}'${String(inches).padStart(2, "0")}" / ${meters.toFixed(1).replace(/\.0$/, "")} m`;
  }

  function formatWeight(kg) {
    if (kg == null || !Number.isFinite(Number(kg))) return "—";
    const kilos = Number(kg);
    const lb = kilos * 2.20462262;
    return `${lb.toFixed(1)} lb / ${kilos.toFixed(1).replace(/\.0$/, "")} kg`;
  }

  function abilityLabel(a) {
    const name = String(a?.name || "").replace(/-/g, " ");
    const pretty = name.replace(/\b\w/g, (c) => c.toUpperCase());
    return pretty + (a?.hidden ? " (Hidden)" : "");
  }

  function localRef(formId, dex) {
    if (typeof window.playPokedexRef === "function") return window.playPokedexRef(formId, dex);
    const root = window.PLAY_POKEDEX_REF || {};
    const fid = Number(formId) || Number(dex) || 0;
    const d = Number(dex) || 0;
    const form = root.forms?.[fid] || root.forms?.[d] || null;
    const sp = root.species?.[d] || null;
    if (!form && !sp) return null;
    return {
      types: form?.types || [],
      heightM: form?.heightM ?? null,
      weightKg: form?.weightKg ?? null,
      stats: form?.stats || {},
      abilities: form?.abilities || [],
      genus: sp?.genus || "",
      flavor: sp?.flavor || "",
      generation: sp?.generation || 1,
      evoFamily: sp?.evoFamily || (d ? [d] : [])
    };
  }

  function discoveredDexes() {
    if (!dexData) return [];
    const seen = new Set((dexData.seen || []).map(Number));
    (dexData.caught || []).forEach((row) => seen.add(Number(row.dex)));
    return releasedDexList().filter((d) => seen.has(d));
  }

  function neighborDex(current, dir) {
    const list = discoveredDexes();
    const idx = list.indexOf(Number(current));
    if (idx < 0) return null;
    return list[idx + dir] || null;
  }

  function renderTeam() {
    window.playRenderTeamSlots(els.team, dexData?.team, { mine: Boolean(dexData?.mine) });
  }

  function renderCounters(entries) {
    const total = releasedTotal();
    const caught = entries.filter((row) => row.caught).length;
    const seen = entries.filter((row) => row.seen).length;
    const seenN = dexData?.seenCount != null ? Number(dexData.seenCount) : seen;
    const caughtN = dexData?.caughtCount != null ? Number(dexData.caughtCount) : caught;
    if (els.counters) {
      els.counters.innerHTML = `
        <div class="dex-counter"><span class="dex-counter-label">Seen</span><strong>${seenN} / ${total}</strong></div>
        <div class="dex-counter"><span class="dex-counter-label">Caught</span><strong>${caughtN} / ${total}</strong></div>`;
    }
    if (els.summary) {
      const q = String(els.search?.value || "").trim();
      const searchHits = q
        ? (window.playParseSpeciesQuery?.(q, { releasedOnly: true }) || [])
        : null;
      if (q && searchHits && !searchHits.length) {
        els.summary.textContent = `No Kanto Pokédex results for “${q}”.`;
      } else {
        els.summary.textContent = "Kanto Pokédex — discovery grid. Open a Seen or Caught species for forms and research.";
      }
    }
  }

  function renderVariantsBanner(caughtN) {
    if (!els.variants) return;
    els.variants.innerHTML = caughtN
      ? `
        <h2>How this Pokédex works</h2>
        <p class="muted">The grid tracks species discovery. Forms, Shinies, and detailed research live in each species entry. Manage owned Pokémon in My PC, and evolution readiness in Prof. Oak's Lab.</p>`
      : `
        <div class="dex-empty-banner">
          <strong>Your Pokédex is waiting</strong>
          <p class="muted">Wild Pokémon appear during Sora's stream. Join an encounter on Play to discover your first species.</p>
          <p><a class="button" href="./">Play</a></p>
        </div>`;
  }

  function renderGrid() {
    if (!dexData) return;
    renderTeam();
    const entries = releasedDexList().map((dex) => entryFor(dex, dexData));
    const visible = entries.filter(matches);
    const caughtN = entries.filter((row) => row.caught).length;
    renderCounters(entries);
    renderVariantsBanner(caughtN);
    const q = String(els.search?.value || "").trim();
    els.grid.innerHTML = visible.map((entry) => {
      const state = entry.caught ? "caught" : entry.seen ? "seen" : "unseen";
      const openable = entry.seen;
      const label = entry.seen ? window.playEscapeAttr(entry.name) : "???";
      const sprite = window.playSpriteUrl(entry.dex, "normal");
      const spriteClass = state === "unseen" ? "silhouette" : state === "seen" ? "seen-sprite" : "";
      const mark = entry.caught
        ? `<img class="dex-caught-mark" src="${window.playItemSprite("pokeball")}" alt="" title="Caught">`
        : entry.seen
          ? `<span class="dex-seen-mark" title="Seen" aria-hidden="true"></span>`
          : "";
      const interactive = openable
        ? `tabindex="0" role="button" data-open="1" aria-label="Open ${window.playEscapeAttr(entry.name)} Pokédex entry"`
        : `aria-disabled="true" title="Not discovered yet"`;
      return `<article class="dex-cell ${state}${openable ? " dex-openable" : ""}" data-dex="${entry.dex}" ${interactive}>
        ${mark}
        <span class="dex-no">No. ${window.playPadDex(entry.dex)}</span>
        <img src="${sprite}" alt="" class="${spriteClass}" draggable="false">
        <strong>${label}</strong>
      </article>`;
    }).join("") || (q
      ? `<p class="muted dex-empty-search">No Kanto Pokédex results.</p>`
      : "");
  }

  function render() {
    renderGrid();
  }

  function formBadgeMeta(form) {
    const kind = String(form?.kind || form?.formKey || "").toLowerCase();
    const lab = String(form?.formLabel || form?.formKey || "");
    if (kind === "mega" || /mega/.test(kind)) {
      if (/x/i.test(lab)) return { code: "MEGA X", className: "se-badge-mega" };
      if (/y/i.test(lab)) return { code: "MEGA Y", className: "se-badge-mega" };
      return { code: "MEGA", className: "se-badge-mega" };
    }
    if (kind === "regional" || /alol|galar|hisui|paldea|totem/.test(kind + lab)) {
      if (/alola/i.test(lab + kind)) return { code: "ALOLAN", className: "se-badge-regional", sub: "REGIONAL" };
      if (/galar/i.test(lab + kind)) return { code: "GALARIAN", className: "se-badge-regional", sub: "REGIONAL" };
      return { code: "REGIONAL", className: "se-badge-regional" };
    }
    if (kind === "gigantamax" || /gmax|gigantamax/.test(kind)) return { code: "GIGANTAMAX", className: "se-badge-gmax" };
    if (kind === "cosplay") return { code: "COSPLAY", className: "se-badge-cosplay" };
    if (kind === "cap" || /cap/.test(kind + lab)) return { code: "CAP", className: "se-badge-costume" };
    if (kind === "starter") return { code: "STARTER", className: "se-badge-costume" };
    if (kind && kind !== "base") return { code: lab.toUpperCase() || "FORM", className: "se-badge-other" };
    return null;
  }

  function hasFemaleVisual(dex, form) {
    if (form && form.hasFemaleFront) return true;
    if (form && !form.isBase) return false;
    const allowed = typeof window.playAllowedVariants === "function" ? window.playAllowedVariants(dex) : [];
    return allowed.includes("female") || allowed.includes("shiny-female");
  }

  function collectionFlags(entry, formId, shiny, female) {
    const rows = entry?.catches || [];
    const formCaught = rows.some((row) => Number(row.formId || row.dex) === Number(formId));
    const shinyCaught = rows.some((row) => row.shiny || String(row.variant || "").includes("shiny"));
    const femaleCaught = rows.some((row) => row.female || row.gender === "Female" || String(row.variant || "").includes("female"));
    const combo = rows.some((row) => {
      const fid = Number(row.formId || entry.dex);
      const isShiny = row.shiny || String(row.variant || "").includes("shiny");
      const isFemale = row.female || row.gender === "Female" || String(row.variant || "").includes("female");
      if (fid !== Number(formId)) return false;
      if (Boolean(shiny) !== Boolean(isShiny)) return false;
      if (female && !isFemale) return false;
      return true;
    });
    return { formCaught, shinyCaught, femaleCaught, combo };
  }

  function pill(label, opts = {}) {
    const {
      active = false,
      registered = null,
      kind = "variant",
      value = "",
      axis = "",
      title = ""
    } = opts;
    const reg = registered == null
      ? ""
      : `<span class="dex-pill-reg" title="${registered ? "Registered" : "Not registered"}">${registered ? "✓" : "·"}</span>`;
    return `<button type="button" class="dex-pill ${kind}${active ? " is-active" : ""}${registered ? " is-registered" : ""}"
      data-axis="${axis}" data-value="${window.playEscapeAttr(String(value))}"
      aria-pressed="${active ? "true" : "false"}" title="${window.playEscapeAttr(title || label)}">
      <span class="dex-pill-label">${label}</span>${reg}
    </button>`;
  }

  function infoBadge(code, className, sub) {
    if (!code) return "";
    return `<span class="se-badge ${className || ""}"><span class="se-badge-icon" aria-hidden="true"></span>${window.playEscapeAttr(code)}${sub ? `<span class="se-badge-sub">${window.playEscapeAttr(sub)}</span>` : ""}</span>`;
  }

  function typeBadgesHtml(types) {
    const list = (types || []).map(titleCaseType).filter(Boolean);
    if (typeof window.playTypeChipHtml === "function") return window.playTypeChipHtml(list);
    return list.map((t) => `<span class="type-chip">${window.playEscapeAttr(t)}</span>`).join("");
  }

  function headerDisplayName(entry, form) {
    const base = String(entry.name || "").toUpperCase();
    if (!form || form.isBase) return base;
    const lab = String(form.formLabel || form.formKey || "").toUpperCase();
    return lab ? `${base} — ${lab}` : base;
  }

  function paintTabs() {
    const tab = normalizeTab(detailState?.tab || "overview");
    if (detailState) detailState.tab = tab;
    tabsEl.innerHTML = TABS.map((row) => `
      <button type="button" class="dex-mode-tab${tab === row.id ? " is-active" : ""}"
        role="tab" id="dex-tab-${row.id}" aria-selected="${tab === row.id ? "true" : "false"}"
        aria-controls="dex-overlay-body" data-dex-tab="${row.id}">${row.label}</button>`).join("");
  }

  function paintNav() {
    if (!detailState?.entry) {
      prevBtn.hidden = true;
      nextBtn.hidden = true;
      return;
    }
    const prev = neighborDex(detailState.entry.dex, -1);
    const next = neighborDex(detailState.entry.dex, 1);
    prevBtn.hidden = !prev;
    nextBtn.hidden = !next;
    prevBtn.dataset.dex = prev || "";
    nextBtn.dataset.dex = next || "";
  }

  function viewerHtml(ctx, opts = {}) {
    const { entry, displayName, classBadges, sprite } = ctx;
    const sub = opts.subtitle ? `<p class="dex-viewer-sub">${window.playEscapeAttr(opts.subtitle)}</p>` : "";
    const titleId = opts.titleId ? ` id="${opts.titleId}"` : "";
    const badges = (opts.showBadges !== false && classBadges?.length)
      ? `<div class="se-badge-row dex-za-badges">${classBadges.join("")}</div>`
      : "";
    return `
      <div class="dex-viewer">
        <div class="dex-viewer-stage">
          <img class="dex-viewer-sil" src="${sprite}" alt="" aria-hidden="true">
          <div class="dex-viewer-frame">
            <img class="dex-viewer-sprite" src="${sprite}" alt="">
          </div>
        </div>
        <div class="dex-viewer-meta">
          <p class="dex-za-no"${titleId}>No. ${window.playPadDex(entry.dex)}</p>
          <h2 class="dex-za-name">${window.playEscapeAttr(displayName)}</h2>
          ${sub}
          ${badges}
        </div>
      </div>`;
  }

  function overviewHtml(ctx) {
    const { entry, ref, displayName, types, height, weight, classBadges } = ctx;
    const abilities = (ref?.abilities || []).map(abilityLabel).join(", ") || "—";
    const flavor = ref?.flavor || "Pokédex data syncing…";
    const genus = ref?.genus || "";
    const status = entry.caught ? "Caught" : "Seen";
    return `
      <div class="dex-screen">
        <div class="dex-compose dex-compose-overview">
          <div class="dex-info">
            <p class="dex-za-no" id="dex-overlay-title">No. ${window.playPadDex(entry.dex)}</p>
            <h2 class="dex-za-name">${window.playEscapeAttr(displayName)}</h2>
            ${genus ? `<p class="dex-za-genus">${window.playEscapeAttr(genus)}</p>` : ""}
            <div class="se-badge-row dex-za-badges">${classBadges.join("") || `<span class="dex-status-chip">${status}</span>`}</div>
            <div class="dex-za-types">${typeBadgesHtml(types)}</div>
            <dl class="dex-za-facts">
              <div><dt>Height</dt><dd>${formatHeight(height)}</dd></div>
              <div><dt>Weight</dt><dd>${formatWeight(weight)}</dd></div>
              <div><dt>Ability</dt><dd>${window.playEscapeAttr(abilities)}</dd></div>
              <div><dt>Generation</dt><dd>${Number(ref?.generation) || 1}</dd></div>
            </dl>
            <blockquote class="dex-za-flavor"><span class="dex-za-flavor-rule" aria-hidden="true"></span><p>${window.playEscapeAttr(flavor)}</p></blockquote>
          </div>
          <div class="dex-viewer dex-viewer-overview">
            <div class="dex-viewer-stage">
              <img class="dex-viewer-sil" src="${ctx.sprite}" alt="" aria-hidden="true">
              <div class="dex-viewer-frame">
                <img class="dex-viewer-sprite" src="${ctx.sprite}" alt="">
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }

  function formsHtml(ctx) {
    const { forms, form, formPills, shinyPills, genderPills, showGender, classBadges } = ctx;
    const subtitle = (!form?.isBase && (form?.formLabel || form?.formKey))
      ? String(form.formLabel || form.formKey)
      : "";
    return `
      <div class="dex-screen">
        <div class="dex-compose dex-compose-forms">
          ${viewerHtml(ctx, { subtitle, showBadges: true })}
          <div class="dex-controls">
            ${forms.length > 1 ? `<section class="dex-axis"><h3>Form</h3><div class="dex-pill-row">${formPills}</div></section>` : ""}
            <section class="dex-axis"><h3>Appearance</h3><div class="dex-pill-row">${shinyPills}</div></section>
            ${showGender ? `<section class="dex-axis"><h3>Gender</h3><div class="dex-pill-row">${genderPills}</div></section>` : ""}
            <p class="dex-entry-note">Form changes types, abilities, and size. Shiny and gender change appearance only.</p>
          </div>
        </div>
      </div>`;
  }

  function evoNodeHtml(dex, opts = {}) {
    const seenSet = new Set(discoveredDexes());
    const known = seenSet.has(dex);
    const current = dex === Number(opts.currentDex);
    const name = known ? window.playSpeciesName(dex) : "???";
    const sprite = window.playSpriteUrl(dex, "normal");
    return `
      <article class="dex-evo-node${current ? " is-current" : ""}${known ? "" : " is-unknown"}">
        <div class="dex-evo-art"><img src="${sprite}" alt="" class="${known ? "" : "silhouette"}"></div>
        <span class="dex-evo-no">No. ${window.playPadDex(dex)}</span>
        <strong class="dex-evo-name">${window.playEscapeAttr(name)}</strong>
      </article>`;
  }

  function evoConnectorHtml(req, dir = "h") {
    return `
      <div class="dex-evo-link dex-evo-link-${dir}">
        <span class="dex-evo-arrow" aria-hidden="true">${dir === "v" ? "↓" : "→"}</span>
        ${req ? `<span class="dex-evo-req">${window.playEscapeAttr(req)}</span>` : ""}
      </div>`;
  }

  function evolutionHtml(ctx) {
    const family = (ctx.ref?.evoFamily || [ctx.entry.dex]).map(Number).filter((d) => isReleasedDex(d));
    const current = Number(ctx.entry.dex);
    const branching = family.length >= 4 && family[0] === Math.min(...family);
    let tree = "";
    if (branching) {
      const root = family[0];
      const branches = family.slice(1);
      tree = `
        <div class="dex-evo-tree is-branch">
          <div class="dex-evo-tree-root">${evoNodeHtml(root, { currentDex: current })}</div>
          <div class="dex-evo-branches">
            ${branches.map((dex) => `
              <div class="dex-evo-branch">
                ${evoConnectorHtml(evoEdgeLabel(root, dex), "v")}
                ${evoNodeHtml(dex, { currentDex: current })}
              </div>`).join("")}
          </div>
        </div>`;
    } else {
      tree = `<div class="dex-evo-tree is-linear">${family.map((dex, i) => {
        const prev = family[i - 1];
        const req = prev != null ? evoEdgeLabel(prev, dex) : null;
        return `${i > 0 ? evoConnectorHtml(req, "h") : ""}${evoNodeHtml(dex, { currentDex: current })}`;
      }).join("")}</div>`;
    }
    const showLab = family.length > 1 && ctx.entry.caught;
    return `
      <div class="dex-screen">
        <div class="dex-compose dex-compose-evo">
          <div class="dex-evo-stage">${tree}</div>
          <div class="dex-evo-footer">
            <p class="dex-entry-note">Kanto evolution family only. Later-generation relatives stay outside this Pokédex.</p>
            ${showLab
              ? `<a class="button secondary dex-evo-lab" href="./evolve.html">View in Professor Oak's Lab</a>`
              : `<p class="dex-entry-note">Catch this species to research evolution readiness in Professor Oak's Lab.</p>`}
          </div>
        </div>
      </div>`;
  }

  function researchHtml(ctx) {
    const entry = ctx.entry;
    const catches = entry.catches || [];
    const formSeen = new Set((entry.formSeen || []).map(Number));
    const forms = (entry.forms || []).filter((f) => f && f.assetStatus === "ready");
    const shinyN = catches.filter((r) => r.shiny || String(r.variant || "").includes("shiny")).length;
    const femaleN = catches.filter((r) => r.female || r.gender === "Female" || String(r.variant || "").includes("female")).length;
    const maleN = catches.filter((r) => r.gender === "Male" || (!r.female && !String(r.variant || "").includes("female") && r.gender !== "Genderless")).length;
    const formsReg = forms.filter((f) => formSeen.has(Number(f.formId)) || catches.some((c) => Number(c.formId || entry.dex) === Number(f.formId))).length;
    const fam = collectionCache?.families?.find((f) => (f.members || f.species || []).some?.((m) => Number(m.dex || m) === entry.dex))
      || collectionCache?.families?.find((f) => Number(f.baseDex) === entry.dex);
    const mastery = (collectionCache?.mastery || []).find((m) => Number(m.dex) === entry.dex);
    const candy = fam ? Number(fam.candy || 0) : null;
    const metric = (label, value, tone = "") =>
      `<div class="dex-metric${tone ? ` ${tone}` : ""}"><dt>${label}</dt><dd>${value}</dd></div>`;
    return `
      <div class="dex-screen">
        <div class="dex-compose dex-compose-research">
          <header class="dex-research-head">
            <p class="dex-za-no">No. ${window.playPadDex(entry.dex)} · ${window.playEscapeAttr(entry.name || "")}</p>
            <h3 class="dex-research-heading">Your Research</h3>
          </header>
          <dl class="dex-research-primary">
            ${metric("Status", entry.caught ? "Caught" : "Seen", "is-primary")}
            ${metric("Caught", String(catches.length), "is-primary")}
            ${metric("Forms", `${formsReg} / ${Math.max(forms.length, 1)}`, "is-primary")}
            ${metric("Mastery", mastery ? `${mastery.rank || mastery.stars || "—"} · ${mastery.points || 0} pts` : "—", "is-primary")}
          </dl>
          <dl class="dex-research-secondary">
            ${metric("Shiny", shinyN ? `Yes (${shinyN})` : "No")}
            ${metric("♂ / ♀", `${maleN || 0} / ${femaleN || 0}`)}
            ${metric("Evo Candy", candy != null ? String(candy) : "—")}
          </dl>
          <div class="dex-research-footer">
            <p class="dex-entry-note">Manage owned Pokémon in <a href="./storage.html">My PC</a>.</p>
            <p class="dex-entry-note">Evolution readiness in <a href="./evolve.html">Professor Oak's Lab</a>.</p>
          </div>
        </div>
      </div>`;
  }

  function paintDetail() {
    if (!detailState?.entry?.unlocked) return;
    const entry = detailState.entry;
    const forms = (entry.forms || []).filter((f) => f && f.assetStatus === "ready");
    const form = forms.find((f) => Number(f.formId) === Number(detailState.formId)) || forms[0];
    const formId = Number(form?.formId || entry.dex);
    detailState.formId = formId;
    const shiny = !!detailState.shiny;
    const female = !!detailState.female && hasFemaleVisual(entry.dex, form);
    detailState.female = female;
    const variant = shiny && female ? "shiny-female" : shiny ? "shiny" : female ? "female" : "normal";
    const sprite = window.playSpriteUrl(entry.dex, variant, formId);
    const displayName = headerDisplayName(entry, form);
    const formSeenSet = new Set((entry.formSeen || []).map(Number));
    const ref = localRef(formId, entry.dex) || {};
    const types = (ref.types?.length ? ref.types : entry.types) || [];
    const height = ref.heightM ?? entry.heightM;
    const weight = ref.weightKg ?? entry.weightKg;

    const classBadges = [];
    if (entry.isLegendary || LEGENDARY.has(entry.dex)) classBadges.push(infoBadge("LEGENDARY", "se-badge-legendary", null));
    if (entry.isMythical || MYTHICAL.has(entry.dex)) classBadges.push(infoBadge("MYTHICAL", "se-badge-mythical", null));
    const formBadge = formBadgeMeta(form);
    if (formBadge) classBadges.push(infoBadge(formBadge.code, formBadge.className, formBadge.sub));
    if (shiny) classBadges.push(infoBadge("SHINY", "se-badge-shiny", null));

    const hasRegional = forms.some((f) => {
      const kind = String(f.kind || "").toLowerCase();
      if (kind === "regional") return true;
      const key = String(f.formKey || "").toLowerCase();
      return key === "alolan" || key === "galarian" || key === "hisuian" || key === "paldean" || key === "totem";
    });
    const formPills = forms.map((f) => {
      let label = f.formLabel || "Form";
      if (f.isBase) label = hasRegional ? "Kanto" : "Base";
      const registered = formSeenSet.has(Number(f.formId)) || collectionFlags(entry, f.formId, false, false).formCaught;
      return pill(label, {
        active: Number(f.formId) === formId,
        registered,
        axis: "form",
        value: f.formId,
        title: f.formLabel
      });
    }).join("");

    const showGender = hasFemaleVisual(entry.dex, form);
    const genderPills = showGender
      ? [
          pill("♂ Male", { active: !female, registered: collectionFlags(entry, formId, shiny, false).combo, axis: "gender", value: "male" }),
          pill("♀ Female", { active: female, registered: collectionFlags(entry, formId, shiny, true).combo, axis: "gender", value: "female" })
        ].join("")
      : "";

    const shinyPills = [
      pill("Normal", { active: !shiny, registered: collectionFlags(entry, formId, false, female).combo, axis: "shiny", value: "normal" }),
      pill("★ Shiny", { active: shiny, registered: collectionFlags(entry, formId, true, female).combo, axis: "shiny", value: "shiny", kind: "variant shiny" })
    ].join("");

    const ctx = {
      entry, forms, form, formId, shiny, female, showGender,
      formPills, shinyPills, genderPills, classBadges,
      displayName, sprite, ref, types, height, weight
    };

    const tab = normalizeTab(detailState.tab || routeTabHint() || "overview");
    detailState.tab = tab;
    let html = "";
    if (tab === "forms") html = formsHtml(ctx);
    else if (tab === "evolution") html = evolutionHtml(ctx);
    else if (tab === "research") html = researchHtml(ctx);
    else html = overviewHtml(ctx);

    bodyEl.innerHTML = html;
    paintTabs();
    paintNav();
  }

  function restoreOpenerFocus() {
    const el = openerEl;
    openerEl = null;
    if (!el || !document.contains(el)) return;
    try {
      el.focus({ preventScroll: true });
    } catch (_) {
      try { el.focus(); } catch (__) {}
    }
  }

  function closeDetail(opts = {}) {
    const { clearRoute = true, fromPop = false, fromAuth = false } = opts;
    if (!detailState && overlay.hidden) {
      if (clearRoute && !fromPop) setRouteDex(null, "replace");
      return;
    }
    detailState = null;
    overlay.hidden = true;
    overlay.classList.remove("is-open");
    unlockPageScroll();
    restoreOpenerFocus();
    if (clearRoute && !fromPop) {
      if (!fromAuth && window.history.state && window.history.state.pokedexModal != null) {
        historyClosing = true;
        window.history.back();
        return;
      }
      setRouteDex(null, "replace");
    }
  }

  async function ensureCollection() {
    if (collectionCache) return collectionCache;
    try {
      collectionCache = await window.playCall("play_collection");
    } catch (_) {
      collectionCache = { families: [], mastery: [] };
    }
    return collectionCache;
  }

  async function openDetail(dex, opts = {}) {
    const id = Number(dex);
    const { fromPop = false, opener = null } = opts;
    if (!isReleasedDex(id)) {
      showNotice("This Pokédex entry isn't currently available.");
      setRouteDex(null, "replace");
      closeDetail({ clearRoute: false, fromPop: true });
      return;
    }
    showNotice("");
    if (opener) openerEl = opener;
    else if (!openerEl) {
      openerEl = els.grid?.querySelector(`.dex-cell[data-dex="${id}"]`) || null;
    }

    lockPageScroll();
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add("is-open"));
    bodyEl.innerHTML = `<p class="dex-overlay-loading">Loading Pokédex entry…</p>`;
    tabsEl.innerHTML = "";
    paintNav();

    if (!fromPop) {
      const already = routeDex() === id && window.history.state?.pokedexModal === id;
      setRouteDex(id, already ? "replace" : "push");
    } else {
      setRouteDex(id, "replace");
    }

    try {
      const entry = await window.playCall("play_pokedex_entry", { p_dex: id });
      if (!entry?.unlocked) {
        showNotice(entry?.message || (entry?.reason === "unreleased"
          ? "This Pokédex entry isn't currently available."
          : "You haven't discovered this Pokémon yet."));
        closeDetail({ clearRoute: true, fromPop });
        return;
      }
      if (dexData) {
        const seenSet = new Set((dexData.seen || []).map(Number));
        if (!seenSet.has(id)) {
          dexData.seen = [...(dexData.seen || []), id];
          dexData.seenCount = (Number(dexData.seenCount) || seenSet.size) + 1;
          renderGrid();
        }
      }
      const forms = entry.forms || [];
      const base = forms.find((f) => f.isBase) || forms[0];
      detailState = {
        entry,
        formId: Number(base?.formId || id),
        shiny: false,
        female: false,
        tab: normalizeTab(routeTabHint() || "overview")
      };
      ensureCollection().then(() => {
        if (detailState?.entry?.dex === id && detailState.tab === "research") paintDetail();
      });
      paintDetail();
      const closeBtn = overlay.querySelector(".dex-overlay-close");
      (closeBtn || panel)?.focus({ preventScroll: true });
    } catch (error) {
      showNotice(window.playRpcError?.(error, "Could not open that Pokédex entry.") || "Could not open that Pokédex entry.");
      closeDetail({ clearRoute: true, fromPop });
    }
  }

  async function loadNav() {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session) {
      window.playSetAccountNav(null);
      return session;
    }
    const { data: profile } = await supabase.from("profiles").select("display_name, twitch_login, avatar_url").eq("id", session.user.id).maybeSingle();
    let extras = {};
    try {
      const snapshot = await window.playCall("play_state");
      extras = { isAdmin: Boolean(snapshot?.isAdmin), trainer: snapshot?.trainer };
    } catch (_) {}
    window.playSetAccountNav(session, profile, extras);
    return session;
  }

  async function load() {
    const session = await loadNav();
    if (!session) {
      els.app.hidden = true;
      closeDetail({ clearRoute: true, fromAuth: true });
      window.playRestoreGate(els.gate, "Sign in to open your Pokédex.");
      return;
    }
    window.playSetLoadingGate(els.gate, els.app, { soft: !els.app?.hidden });
    try {
      clearUnreleasedRoute();
      dexData = await window.playCall("play_pokedex", { p_login: null });
      collectionCache = null;
      els.gate.hidden = true;
      els.app.hidden = false;
      render();
      const deep = routeDex();
      if (deep) await openDetail(deep, { fromPop: true });
    } catch (error) {
      els.gate.hidden = false;
      els.app.hidden = true;
      els.gate.textContent = window.playRpcError(error, "Pokédex is not live yet.");
    }
  }

  window.playBindTeamSlots(
    els.team,
    () => ({ team: dexData?.team || [], caught: dexData?.caught || [] }),
    async (ids) => {
      const data = await window.playCall("play_set_team", { p_catch_ids: ids });
      if (dexData) dexData.team = data.team || [];
      renderTeam();
      return data;
    },
    els.teamStatus
  );

  window.playBindTips?.(document.body);
  els.status?.addEventListener("change", render);
  els.search?.addEventListener("input", () => {
    showNotice("");
    render();
  });
  els.grid?.addEventListener("click", (event) => {
    const cell = event.target.closest(".dex-cell[data-open='1']");
    if (!cell) return;
    openDetail(Number(cell.dataset.dex), { opener: cell });
  });
  els.grid?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const cell = event.target.closest(".dex-cell[data-open='1']");
    if (!cell) return;
    event.preventDefault();
    openDetail(Number(cell.dataset.dex), { opener: cell });
  });

  overlay.addEventListener("click", (event) => {
    if (event.target.closest("[data-dex-close='1']")) {
      event.preventDefault();
      closeDetail({ clearRoute: true });
      return;
    }
    const tabBtn = event.target.closest("[data-dex-tab]");
    if (tabBtn && detailState) {
      detailState.tab = normalizeTab(tabBtn.dataset.dexTab);
      if (detailState.tab === "research") ensureCollection().then(() => paintDetail());
      else paintDetail();
      return;
    }
    const step = event.target.closest("[data-dex-prev], [data-dex-next]");
    if (step && step.dataset.dex) {
      openDetail(Number(step.dataset.dex), { opener: openerEl });
      return;
    }
    const pillBtn = event.target.closest(".dex-pill[data-axis]");
    if (pillBtn && detailState) {
      const axis = pillBtn.dataset.axis;
      const value = pillBtn.dataset.value;
      if (axis === "form") detailState.formId = Number(value);
      if (axis === "shiny") detailState.shiny = value === "shiny";
      if (axis === "gender") detailState.female = value === "female";
      paintDetail();
    }
  });

  panel.addEventListener("keydown", trapFocus);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && detailState && !overlay.hidden) {
      event.preventDefault();
      closeDetail({ clearRoute: true });
    }
  });

  window.addEventListener("popstate", () => {
    if (historyClosing) {
      historyClosing = false;
      setRouteDex(null, "replace");
      return;
    }
    const deep = routeDex();
    if (deep && isReleasedDex(deep)) openDetail(deep, { fromPop: true });
    else closeDetail({ clearRoute: false, fromPop: true });
  });

  window.addEventListener("hashchange", () => {
    if (clearUnreleasedRoute()) render();
    else {
      const deep = routeDex();
      if (deep) openDetail(deep, { fromPop: true });
    }
  });

  supabase.auth.onAuthStateChange((event) => { if (window.playAuthNoise(event)) return; load(); });
  load();
})();
