(() => {
  const supabase = window.playSupabase;
  const els = {
    gate: document.getElementById("gate"),
    app: document.getElementById("dex-app"),
    summary: document.getElementById("dex-summary"),
    notice: document.getElementById("dex-boundary-notice"),
    grid: document.getElementById("dex-grid"),
    search: document.getElementById("dex-search"),
    form: document.getElementById("filter-form"),
    gender: document.getElementById("filter-gender"),
    status: document.getElementById("filter-status"),
    team: document.getElementById("team-slots"),
    teamStatus: document.getElementById("team-status"),
    variants: document.getElementById("dex-variants")
  };
  let dexData = null;
  let collection = null;
  const announcedEvents = new Set([144, 145, 146, 150]);

  window.playBindAccountNav({
    onSignOut() {
      els.app.hidden = true;
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
    const seen = seenSet.has(dex) || (data.caught || []).some((row) => Number(row.dex) === dex);
    const catches = (data.caught || []).filter((row) => row.dex === dex);
    const caught = catches.length > 0;
    const forms = {
      normal: catches.some((row) => !String(row.variant || "normal").includes("shiny") && !String(row.variant || "").includes("female")),
      female: catches.some((row) => String(row.variant || "").includes("female")),
      shiny: catches.some((row) => String(row.variant || "").includes("shiny")),
      shinyFemale: catches.some((row) => String(row.variant || "").includes("shiny") && String(row.variant || "").includes("female"))
    };
    const genders = {
      Male: catches.some((row) => row.gender === "Male"),
      Female: catches.some((row) => row.gender === "Female"),
      Genderless: catches.some((row) => row.gender === "Genderless")
    };
    const mastery = (collection?.mastery || []).find((row) => Number(row.dex) === dex);
    const familyCandy = (collection?.candy || []).find((row) => Number(row.baseDex) === dex || Number(row.familyId) === dex);
    const ownedNow = (collection?.owned || []).filter((row) => Number(row.dex) === dex).length;
    return { dex, name, seen, caught, forms, genders, catches, mastery, familyCandy, ownedNow };
  }

  function matches(entry) {
    const form = els.form?.value || "all";
    const gender = els.gender?.value || "all";
    const status = els.status?.value || "all";
    const q = String(els.search?.value || "").trim();
    if (status === "caught" && !entry.caught) return false;
    if (status === "seen" && (!entry.seen || entry.caught)) return false;
    if (status === "unknown" && entry.seen) return false;
    if (form === "normal" && entry.caught && !entry.forms.normal && !entry.forms.female) return false;
    if (form === "female" && !entry.forms.female) return false;
    if (form === "shiny" && !entry.forms.shiny) return false;
    if (gender !== "all" && !entry.genders[gender]) return false;
    if (q) {
      const hits = window.playParseSpeciesQuery
        ? window.playParseSpeciesQuery(q, { releasedOnly: true })
        : [];
      // Empty released-only parse = no Kanto hit (blocks Chikorita / #152 / etc.).
      if (!hits.length) return false;
      return hits.some((hit) => Number(hit.dex) === entry.dex);
    }
    return true;
  }

  function spriteFor(entry) {
    const form = els.form?.value || "all";
    const gender = els.gender?.value || "all";
    const wantShiny = form === "shiny";
    const wantFemale = form === "female" || gender === "Female";
    if (wantShiny && wantFemale) return window.playSpriteUrl(entry.dex, "shiny-female");
    if (wantShiny) return window.playSpriteUrl(entry.dex, entry.forms.shinyFemale && !entry.catches.some((row) => row.variant === "shiny") ? "shiny-female" : "shiny");
    if (wantFemale) return window.playSpriteUrl(entry.dex, "female");
    if (form === "all" && gender === "all" && entry.forms.shiny && !entry.forms.normal) {
      return window.playSpriteUrl(entry.dex, entry.forms.shinyFemale ? "shiny-female" : "shiny");
    }
    if (form === "all" && gender === "all" && entry.forms.female && !entry.forms.normal) {
      return window.playSpriteUrl(entry.dex, "female");
    }
    return window.playSpriteUrl(entry.dex, "normal");
  }

  function renderTeam() {
    window.playRenderTeamSlots(els.team, dexData?.team, { mine: Boolean(dexData?.mine) });
  }

  function showBoundaryNotice(show) {
    if (!els.notice) return;
    els.notice.hidden = !show;
    if (show) els.notice.textContent = "This Pokédex entry isn't currently available.";
  }

  function clearUnreleasedRoute() {
    try {
      const url = new URL(window.location.href);
      let dirty = false;
      ["pokemon", "dex", "species", "id"].forEach((key) => {
        if (!url.searchParams.has(key)) return;
        const value = Number(url.searchParams.get(key));
        if (!isReleasedDex(value)) {
          url.searchParams.delete(key);
          dirty = true;
        }
      });
      if (url.hash) {
        const hashDex = Number(String(url.hash).replace(/^#0*/, ""));
        if (Number.isFinite(hashDex) && hashDex > 0 && !isReleasedDex(hashDex)) {
          url.hash = "";
          dirty = true;
        }
      }
      if (dirty) {
        window.history.replaceState(null, "", url);
        showBoundaryNotice(true);
        return true;
      }
    } catch (_) {}
    return false;
  }

  function render() {
    if (!dexData) return;
    renderTeam();
    const total = releasedTotal();
    const dexList = releasedDexList();
    const entries = dexList.map((dex) => entryFor(dex, dexData));
    const visible = entries.filter(matches);
    const caught = entries.filter((row) => row.caught).length;
    const seen = entries.filter((row) => row.seen).length;
    const pct = total ? (caught / total * 100).toFixed(1) : "0.0";
    const v = dexData.variants || {};
    const kantoCaught = v.kantoCaught != null ? v.kantoCaught : caught;
    const kantoTotal = v.kantoTotal || total;
    const q = String(els.search?.value || "").trim();
    const searchHits = q
      ? (window.playParseSpeciesQuery?.(q, { releasedOnly: true }) || [])
      : null;
    if (els.summary) {
      if (q && searchHits && !searchHits.length) {
        els.summary.textContent = `No Kanto Pokédex results for “${q}”.`;
      } else {
        els.summary.textContent = caught
          ? `Kanto Pokédex ${kantoCaught}/${kantoTotal} · ${pct}% · ${seen} seen · ${Math.max(0, kantoTotal - seen)} unknown`
          : `Kanto Pokédex 0/${kantoTotal} · Catch Pokémon during streams to register them here.`;
      }
    }
    if (els.variants) {
      els.variants.innerHTML = caught
        ? `
        <h2>Collection variants</h2>
        <p class="muted">Forms and variants stay under their Kanto species. They do not add extra Pokédex slots.</p>
        <dl class="sim-grid">
          <div><dt>Kanto</dt><dd>${kantoCaught} / ${kantoTotal}</dd></div>
          <div><dt>Shinies</dt><dd>${v.shinySpecies || 0} / ${v.shinyEligible || kantoTotal} eligible</dd></div>
          <div><dt>Female variants</dt><dd>${v.femaleVariants || 0} / ${v.femaleEligible || 0} eligible</dd></div>
          <div><dt>Shiny female</dt><dd>${v.shinyFemale || 0}</dd></div>
        </dl>`
        : `
        <div class="dex-empty-banner">
          <strong>Your Pokédex is waiting</strong>
          <p class="muted">Wild Pokémon appear during Sora's stream. Join an encounter on Play to register your first species.</p>
          <p><a class="button" href="./">Play</a></p>
        </div>`;
    }
    els.grid.innerHTML = visible.map((entry) => {
      const state = entry.caught ? "caught" : entry.seen ? "seen" : "unseen";
      const label = entry.caught ? window.playEscapeAttr(entry.name) : entry.seen ? `${window.playEscapeAttr(entry.name)}?` : "?????";
      const ready = (collection?.ready || []).some((row) => Number(row.dex) === entry.dex && (row.available || (row.haveCandy >= row.candyCost && row.haveItem)));
      const badges = [
        entry.forms.shiny ? `<span class="chip shiny">Shiny</span>` : "",
        entry.forms.female ? `<span class="chip">♀</span>` : "",
        ready ? `<span class="chip">Ready to evolve</span>` : "",
        entry.caught && !entry.ownedNow ? `<span class="chip">Pokédex: Caught</span>` : "",
        !entry.caught && announcedEvents.has(entry.dex) ? `<span class="chip">EVENT ENCOUNTER</span>` : ""
      ].join("");
      const mark = entry.caught
        ? `<img class="dex-caught-mark" src="${window.playItemSprite("pokeball")}" alt="Caught">`
        : "";
      const spriteClass = state === "unseen" ? "silhouette" : state === "seen" ? "seen-sprite" : "";
      const owned = entry.caught
        ? ` · ${entry.ownedNow || 0} owned`
        : "";
      const candy = entry.familyCandy ? ` · ${entry.familyCandy.qty} Evolution Candy` : "";
      const stars = entry.mastery ? ` · ${"★".repeat(entry.mastery.rank || 0)}${"☆".repeat(Math.max(0, 5 - (entry.mastery.rank || 0)))}` : "";
      const note = badges || owned || candy || stars || (state === "unseen" ? "Not seen" : "");
      return `<article class="dex-cell ${state}" data-dex="${entry.dex}" title="${entry.caught || entry.seen ? `${window.playEscapeAttr(entry.name)}${owned}${candy}${stars}` : "Not seen yet"}">
        ${mark}
        <span class="dex-no">No. ${window.playPadDex(entry.dex)}</span>
        <img src="${spriteFor(entry)}" alt="" class="${spriteClass}">
        <strong>${label}</strong>
        ${note ? `<span>${note}</span>` : ""}
      </article>`;
    }).join("") || (q
      ? `<p class="muted dex-empty-search">No Kanto Pokédex results.</p>`
      : "");
    if (caught > 0 && entries.some((row) => row.mastery && Number(row.mastery.points || row.mastery.rank || 0) > 0)
      && typeof window.playTipHtml === "function"
      && !window.playTipDone?.("first-mastery")) {
      const tip = window.playTipHtml("first-mastery", "Duplicate catches still matter. Catching the same species builds Species Mastery.");
      if (tip && els.variants) els.variants.insertAdjacentHTML("beforeend", tip);
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
      window.playRestoreGate(els.gate, "Sign in to open your Pokédex.");
      return;
    }
    window.playSetLoadingGate(els.gate, els.app, { soft: !els.app?.hidden });
    try {
      clearUnreleasedRoute();
      dexData = await window.playCall("play_pokedex", { p_login: null });
      try { collection = await window.playCall("play_collection"); } catch (_) { collection = null; }
      try {
        const events = await window.playCall("play_special_events");
        (events?.upcoming || []).concat(events?.live ? [events.live] : []).forEach((row) => {
          const dex = Number(row?.dex);
          if (isReleasedDex(dex)) announcedEvents.add(dex);
        });
      } catch (_) {}
      els.gate.hidden = true;
      els.app.hidden = false;
      render();
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
  ["form", "gender", "status"].forEach((key) => {
    els[key]?.addEventListener("change", render);
  });
  els.search?.addEventListener("input", () => {
    showBoundaryNotice(false);
    render();
  });
  window.addEventListener("hashchange", () => {
    if (clearUnreleasedRoute()) render();
  });
  supabase.auth.onAuthStateChange((event) => { if (window.playAuthNoise(event)) return; load(); });
  load();
})();
