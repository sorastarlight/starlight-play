(() => {
  const supabase = window.playSupabase;
  const els = {
    gate: document.getElementById("gate"),
    app: document.getElementById("evo-app"),
    grid: document.getElementById("evo-grid"),
    candy: document.getElementById("candy-list"),
    rarePanel: document.getElementById("rare-candy-panel"),
    rareFamily: document.getElementById("rare-candy-family"),
    rareUse: document.getElementById("rare-candy-use"),
    rareStatus: document.getElementById("rare-candy-status"),
    families: document.getElementById("family-list"),
    mastery: document.getElementById("mastery-list"),
    filter: document.getElementById("evo-filter"),
    note: document.getElementById("evo-ready-note"),
    modal: document.getElementById("evo-modal"),
    title: document.getElementById("evo-title"),
    detail: document.getElementById("evo-detail"),
    go: document.getElementById("evo-go"),
    status: document.getElementById("evo-status")
  };
  let data = null;
  let pick = null;

  window.playBindAccountNav({
    onSignOut() {
      els.app.hidden = true;
      els.gate.hidden = false;
    }
  });

  function stars(rank) {
    return "★".repeat(rank || 0) + "☆".repeat(Math.max(0, 5 - (rank || 0)));
  }

  function isShiny(row) {
    return String(row?.variant || "").includes("shiny");
  }

  function itemLabel(key) {
    return window.playItemLabel ? window.playItemLabel(key) : key;
  }

  function canEvolve(row) {
    if (row.available != null) return Boolean(row.available);
    return row.haveCandy >= row.candyCost && row.haveItem && !row.locked;
  }

  function matches(row) {
    const filter = els.filter?.value || "ready";
    if (filter === "ready") return canEvolve(row);
    if (filter === "candy") return Number(row.candyCost || 0) > Number(row.haveCandy || 0);
    if (filter === "item") return Boolean(row.item) && !row.haveItem && !row.tradeReady;
    if (filter === "shiny") return isShiny(row);
    return true;
  }

  function renderReady() {
    const rows = (data?.ready || []).filter(matches);
    const readyCount = (data?.ready || []).filter(canEvolve).length;
    if (els.note) {
      els.note.textContent = readyCount
        ? `${readyCount} evolution${readyCount === 1 ? "" : "s"} ready.`
        : "Keep catching family members to earn Candy.";
    }
    const cards = rows.map((row) => {
      const shiny = isShiny(row);
      const cost = row.tradeReady && Number(row.candyCost) === 0
        ? "Trade evolution — no Candy or Linking Cord"
        : `${row.haveCandy} / ${row.candyCost} Candy${row.item ? ` · ${itemLabel(row.item)}` : ""}`;
      return `
      <article class="ach-card ${canEvolve(row) ? "is-done" : ""}">
        <img src="${window.playSpriteUrl(row.dex, row.variant)}" alt="" width="72" height="72">
        <strong>${shiny ? "✨ Shiny " : ""}${window.playEscapeAttr(row.name)}</strong>
        <p>→ ${window.playEscapeAttr(row.toName)}</p>
        <span>${cost}</span>
        ${row.reasonUnavailable ? `<span class="muted">${window.playEscapeAttr(row.reasonUnavailable)}</span>` : ""}
        <button type="button" data-evo="${row.catchId}" data-rule="${row.ruleId}" ${canEvolve(row) ? "" : "disabled"}>Evolve</button>
      </article>`;
    });
    if ((els.filter?.value || "ready") === "all") {
      const terminals = (data?.owned || []).filter((mon) => !mon.canEvolve);
      terminals.forEach((mon) => {
        cards.push(`
        <article class="ach-card">
          <img src="${window.playSpriteUrl(mon.dex, mon.variant)}" alt="" width="72" height="72">
          <strong>${isShiny(mon) ? "✨ Shiny " : ""}${window.playEscapeAttr(mon.name)}</strong>
          <p>No evolution currently available.</p>
        </article>`);
      });
    }
    els.grid.innerHTML = cards.join("") || `<p class="muted">Nothing in this filter right now.</p>`;
  }

  function renderFamilies() {
    if (!els.families) return;
    const families = data?.families || [];
    els.families.innerHTML = families.map((fam) => {
      const members = (fam.members || []).map((member) => `
        <li>
          <img src="${window.playSpriteUrl(member.dex, "normal")}" alt="" width="40" height="40">
          <strong>${window.playEscapeAttr(member.name)}</strong>
          <span>${member.pokedex ? "✓ Pokédex" : "□ Pokédex"} · Owned: ${member.owned || 0}</span>
        </li>`).join("");
      const next = (fam.next || []).map((rule) => {
        const need = Math.max(0, Number(rule.cost || 0) - Number(fam.candy || 0));
        return `<p>${window.playEscapeAttr(rule.fromName)} → ${window.playEscapeAttr(rule.toName)}: ${rule.cost} required${rule.item ? ` + ${itemLabel(rule.item)}` : ""}${need ? ` · ${need} more Candy needed.` : " · ready if you have the Pokémon."}</p>`;
      }).join("");
      return `
        <article class="card body family-card">
          <h3>${window.playEscapeAttr(fam.name)} family</h3>
          <p><strong>${window.playEscapeAttr(fam.name)} Candy:</strong> ${fam.candy || 0}</p>
          <ol class="family-line">${members}</ol>
          ${next || "<p class=\"muted\">No evolution currently available.</p>"}
        </article>`;
    }).join("") || `<p class="muted">Catch a Pokémon with an enabled family to see its line here.</p>`;
  }

  function renderRareCandy() {
    const qty = Number(data?.items?.rarecandy || data?.bag?.rarecandy || 0);
    const families = (data?.families || []).filter((fam) => (fam.next || []).length);
    if (els.rarePanel) els.rarePanel.hidden = qty < 1 && families.length < 1;
    if (els.rareFamily) {
      els.rareFamily.innerHTML = families.map((fam) => `<option value="${fam.familyId}">${window.playEscapeAttr(fam.name)} · ${fam.candy || 0} Candy</option>`).join("");
    }
    if (els.rareUse) els.rareUse.disabled = qty < 1 || !families.length;
    if (els.rareStatus && qty) els.rareStatus.textContent = `${qty} Rare Candy ready.`;
  }

  function render() {
    renderReady();
    renderFamilies();
    renderRareCandy();
    els.candy.innerHTML = (data?.candy || []).map((row) => `
      <article class="prog-pick">
        <img src="${window.playSpriteUrl(row.baseDex, "normal")}" alt="" width="48" height="48">
        <strong>${window.playEscapeAttr(row.name)}</strong>
        <span>${row.qty}</span>
      </article>`).join("") || `<p class="muted">Catch Pokémon in evolving families to earn Candy.</p>`;
    els.mastery.innerHTML = (data?.mastery || []).map((row) => `
      <article class="prog-pick">
        <img src="${window.playSpriteUrl(row.dex, "normal")}" alt="" width="48" height="48">
        <strong>${window.playSpeciesName(row.dex)}</strong>
        <span>${stars(row.rank)} · ${row.points} pts · ${row.lifetime || 0} caught</span>
      </article>`).join("") || `<p class="muted">Catch Pokémon to begin Species Mastery.</p>`;
  }

  function openModal(row) {
    pick = row;
    const shiny = isShiny(row);
    const fromName = `${shiny ? "✨ SHINY " : ""}${row.name}`;
    const toName = `${shiny ? "✨ SHINY " : ""}${row.toName}`;
    if (els.title) els.title.textContent = `Evolve ${row.name}?`;
    const costLines = [];
    if (row.tradeReady && Number(row.candyCost) === 0) {
      costLines.push(`<p>This Pokémon was traded. Evolution spends no Candy and no Linking Cord.</p>`);
    } else {
      costLines.push(`<p>Cost: ${row.candyCost} ${window.playEscapeAttr(row.familyName || "family Candy")}${row.item ? `<br>1 ${itemLabel(row.item)}` : ""}</p>`);
      costLines.push(`<p>Current: ${row.haveCandy} Candy${row.item ? ` · ${row.haveItem ? "item in bag" : "item missing"}` : ""}</p>`);
    }
    els.detail.innerHTML = `
      <p><img src="${window.playSpriteUrl(row.dex, row.variant)}" alt="${window.playEscapeAttr(fromName)}"> → <img src="${window.playSpriteUrl(row.toDex, row.variant)}" alt="${window.playEscapeAttr(toName)}"></p>
      <p><strong>${window.playEscapeAttr(fromName)}</strong><br>→<br><strong>${window.playEscapeAttr(toName)}</strong></p>
      ${costLines.join("")}
      ${shiny ? `<p><strong>Shiny status is kept.</strong> ${toName} stays shiny.</p>` : ""}
      ${row.favorite ? `<p class="muted">This is a favorite. Evolution still transforms this exact Pokémon.</p>` : ""}
      <p>This cannot be reversed.</p>`;
    els.status.textContent = "";
    els.modal.showModal();
  }

  async function load() {
    const session = await loadNav();
    if (!session) {
      els.app.hidden = true;
      els.gate.hidden = false;
      return;
    }
    try {
      data = await window.playCall("play_collection");
      els.gate.hidden = true;
      els.app.hidden = false;
      render();
    } catch (error) {
      els.gate.hidden = false;
      els.app.hidden = true;
      els.gate.textContent = window.playRpcError(error, "Evolution is not live yet.");
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

  els.grid?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-evo]");
    if (!button) return;
    const row = (data?.ready || []).find((item) => item.catchId === button.dataset.evo && item.ruleId === button.dataset.rule);
    if (row) openModal(row);
  });
  els.go?.addEventListener("click", async () => {
    if (!pick) return;
    els.status.textContent = "Evolving…";
    try {
      const result = await window.playCall("play_evolve", { p_catch: pick.catchId, p_rule: pick.ruleId });
      els.status.textContent = result.message || "Evolved!";
      if (typeof window.playShowNotices === "function") window.playShowNotices();
      els.modal.close();
      await load();
    } catch (error) {
      els.status.textContent = window.playRpcError(error);
    }
  });
  els.rareUse?.addEventListener("click", async () => {
    const family = Number(els.rareFamily?.value || 0);
    if (!family) return;
    if (els.rareStatus) els.rareStatus.textContent = "Using Rare Candy…";
    try {
      const result = await window.playCall("play_use_rare_candy", { p_family: family });
      if (els.rareStatus) els.rareStatus.textContent = result.message || "Rare Candy used.";
      await load();
    } catch (error) {
      if (els.rareStatus) els.rareStatus.textContent = window.playRpcError(error);
    }
  });
  els.filter?.addEventListener("change", renderReady);
  supabase.auth.onAuthStateChange((event) => { if (window.playAuthNoise(event)) return; load(); });
  load();
})();
