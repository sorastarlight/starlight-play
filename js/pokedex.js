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
    variants: document.getElementById("dex-variants"),
    detail: document.getElementById("dex-detail"),
    detailPanel: document.getElementById("dex-detail-panel"),
    detailClose: document.getElementById("dex-detail-close")
  };

  let dexData = null;
  let detailState = null;
  const pokeCache = new Map();
  const LEGENDARY = new Set([144, 145, 146, 150]);
  const MYTHICAL = new Set([151]);

  window.playBindAccountNav({
    onSignOut() {
      els.app.hidden = true;
      closeDetail(true);
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
    // Authoritative Seen comes from species_seen; caught implies seen.
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
        window.history.replaceState(null, "", url);
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

  function setRouteDex(dex) {
    try {
      const url = new URL(window.location.href);
      ["pokemon", "dex", "species", "id"].forEach((key) => url.searchParams.delete(key));
      url.hash = "";
      if (dex) url.searchParams.set("pokemon", String(dex));
      window.history.replaceState(null, "", url);
    } catch (_) {}
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

  async function fetchPokeRef(formId) {
    const id = Number(formId);
    if (!id) return null;
    if (pokeCache.has(id)) return pokeCache.get(id);
    try {
      const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
      if (!res.ok) throw new Error("pokeapi");
      const data = await res.json();
      const ref = {
        types: (data.types || []).map((t) => t.type?.name).filter(Boolean),
        heightM: data.height != null ? Number(data.height) / 10 : null,
        weightKg: data.weight != null ? Number(data.weight) / 10 : null,
        stats: Object.fromEntries((data.stats || []).map((s) => [s.stat?.name, s.base_stat])),
        abilities: (data.abilities || []).map((a) => ({
          name: a.ability?.name,
          hidden: !!a.is_hidden
        }))
      };
      pokeCache.set(id, ref);
      return ref;
    } catch (_) {
      pokeCache.set(id, null);
      return null;
    }
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
      : `<span class="dex-pill-reg">${registered ? "Registered" : "Not registered"}</span>`;
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

  async function paintDetail() {
    if (!els.detailPanel || !detailState?.entry?.unlocked) return;
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
    const displayName = window.playFormDisplayName?.(entry.dex, formId) || entry.name;
    const formSeenSet = new Set((entry.formSeen || []).map(Number));
    const poke = await fetchPokeRef(formId);
    const types = (poke?.types?.length ? poke.types : entry.types) || [];
    const height = poke?.heightM ?? entry.heightM;
    const weight = poke?.weightKg ?? entry.weightKg;
    const stats = poke?.stats || {};
    const abilities = poke?.abilities || [];

    const classBadges = [];
    if (entry.isLegendary || LEGENDARY.has(entry.dex)) classBadges.push(infoBadge("LEGENDARY", "se-badge-legendary", null));
    if (entry.isMythical || MYTHICAL.has(entry.dex)) classBadges.push(infoBadge("MYTHICAL", "se-badge-mythical", null));
    const formBadge = formBadgeMeta(form);
    if (formBadge) classBadges.push(infoBadge(formBadge.code, formBadge.className, formBadge.sub));
    if (shiny) classBadges.push(infoBadge("SHINY", "se-badge-shiny", null));

    const hasRegional = forms.some((f) => String(f.kind || "").toLowerCase() === "regional" || /alol|galar|hisui|paldea/i.test(String(f.formKey || f.formLabel || "")));
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

    const statRows = ["hp", "attack", "defense", "special-attack", "special-defense", "speed"]
      .filter((key) => stats[key] != null)
      .map((key) => {
        const label = key.replace("special-", "Sp. ").replace("attack", "Atk").replace("defense", "Def").replace("hp", "HP").replace("speed", "Spe");
        return `<div class="dex-stat"><span>${label}</span><strong>${stats[key]}</strong></div>`;
      }).join("");

    els.detailPanel.innerHTML = `
      <div class="dex-entry-hero">
        <img class="dex-entry-sprite" src="${sprite}" alt="">
        <div class="dex-entry-copy">
          <p class="dex-entry-no">No. ${window.playPadDex(entry.dex)}</p>
          <h2>${window.playEscapeAttr(displayName)}</h2>
          <div class="se-badge-row">${classBadges.join("") || `<span class="muted">${entry.caught ? "Caught" : "Seen"}</span>`}</div>
          <p class="muted dex-entry-status">${entry.caught ? "Registered in your Pokédex." : "Seen — not yet caught."}</p>
        </div>
      </div>
      <div class="dex-entry-types">${types.map((t) => `<span class="dex-type dex-type-${window.playEscapeAttr(t)}">${window.playEscapeAttr(t)}</span>`).join("")}</div>
      <dl class="dex-entry-facts">
        <div><dt>Height</dt><dd>${height != null ? `${height} m` : "—"}</dd></div>
        <div><dt>Weight</dt><dd>${weight != null ? `${weight} kg` : "—"}</dd></div>
        <div><dt>Ability</dt><dd>${abilities.length ? abilities.map((a) => window.playEscapeAttr(String(a.name || "").replace(/-/g, " ")) + (a.hidden ? " (hidden)" : "")).join(", ") : "—"}</dd></div>
      </dl>
      ${statRows ? `<div class="dex-entry-stats">${statRows}</div>` : ""}
      ${forms.length > 1 ? `<section class="dex-axis"><h3>Form</h3><div class="dex-pill-row">${formPills}</div></section>` : ""}
      ${showGender ? `<section class="dex-axis"><h3>Gender</h3><div class="dex-pill-row">${genderPills}</div></section>` : ""}
      <section class="dex-axis"><h3>Appearance</h3><div class="dex-pill-row">${shinyPills}</div></section>
      <p class="muted dex-entry-note">PC manages individual Pokémon. Prof. Oak's Lab handles evolution readiness.</p>
    `;
  }

  function closeDetail(clearRoute) {
    detailState = null;
    if (els.detail) els.detail.hidden = true;
    if (clearRoute) setRouteDex(null);
  }

  async function openDetail(dex, opts = {}) {
    const id = Number(dex);
    if (!isReleasedDex(id)) {
      showNotice("This Pokédex entry isn't currently available.");
      setRouteDex(null);
      closeDetail(false);
      return;
    }
    showNotice("");
    setRouteDex(id);
    if (els.detail) els.detail.hidden = false;
    if (els.detailPanel) els.detailPanel.innerHTML = `<p class="muted">Loading Pokédex entry…</p>`;
    try {
      const entry = await window.playCall("play_pokedex_entry", { p_dex: id });
      if (!entry?.unlocked) {
        showNotice(entry?.message || (entry?.reason === "unreleased"
          ? "This Pokédex entry isn't currently available."
          : "You haven't discovered this Pokémon yet."));
        closeDetail(true);
        return;
      }
      // Refresh local grid state if RPC proved Seen/Caught.
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
        female: false
      };
      await paintDetail();
      els.detail?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      showNotice(window.playRpcError?.(error, "Could not open that Pokédex entry.") || "Could not open that Pokédex entry.");
      closeDetail(true);
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
      closeDetail(true);
      window.playRestoreGate(els.gate, "Sign in to open your Pokédex.");
      return;
    }
    window.playSetLoadingGate(els.gate, els.app, { soft: !els.app?.hidden });
    try {
      clearUnreleasedRoute();
      dexData = await window.playCall("play_pokedex", { p_login: null });
      els.gate.hidden = true;
      els.app.hidden = false;
      render();
      const deep = routeDex();
      if (deep) await openDetail(deep);
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
    openDetail(Number(cell.dataset.dex));
  });
  els.grid?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const cell = event.target.closest(".dex-cell[data-open='1']");
    if (!cell) return;
    event.preventDefault();
    openDetail(Number(cell.dataset.dex));
  });
  els.detailClose?.addEventListener("click", () => closeDetail(true));
  els.detailPanel?.addEventListener("click", async (event) => {
    const btn = event.target.closest(".dex-pill[data-axis]");
    if (!btn || !detailState) return;
    const axis = btn.dataset.axis;
    const value = btn.dataset.value;
    if (axis === "form") detailState.formId = Number(value);
    if (axis === "shiny") detailState.shiny = value === "shiny";
    if (axis === "gender") detailState.female = value === "female";
    await paintDetail();
  });
  window.addEventListener("hashchange", () => {
    if (clearUnreleasedRoute()) render();
    else {
      const deep = routeDex();
      if (deep) openDetail(deep);
    }
  });
  supabase.auth.onAuthStateChange((event) => { if (window.playAuthNoise(event)) return; load(); });
  load();
})();
