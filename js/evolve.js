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
    search: document.getElementById("evo-search"),
    note: document.getElementById("evo-ready-note"),
    modal: document.getElementById("evo-modal"),
    title: document.getElementById("evo-title"),
    detail: document.getElementById("evo-detail"),
    go: document.getElementById("evo-go"),
    skip: document.getElementById("evo-skip"),
    status: document.getElementById("evo-status")
  };
  let data = null;
  let pick = null;

  window.playBindAccountNav({
    onSignOut() {
      els.app.hidden = true;
      window.playRestoreGate(els.gate, "Sign in to evolve your Pokémon.");
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
    const q = String(els.search?.value || "").trim().toLowerCase();
    if (q && ![row.name, row.toName, row.familyName].some((bit) => String(bit || "").toLowerCase().includes(q))) return false;
    if (filter === "ready") return canEvolve(row);
    if (filter === "candy") return Number(row.candyCost || 0) > Number(row.haveCandy || 0);
    if (filter === "item") return Boolean(row.item) && !row.haveItem && !row.tradeReady;
    if (filter === "shiny") return isShiny(row);
    if (filter === "favorites") return Boolean(row.favorite);
    return true;
  }

  function renderReady() {
    const rows = (data?.ready || []).filter(matches);
    const readyCount = (data?.ready || []).filter(canEvolve).length;
    const tradeDex = new Set([64, 67, 75, 93]);
    const tradeTip = (data?.ready || []).some((row) => row.tradeReady || tradeDex.has(Number(row.dex)))
      ? (typeof window.playTipHtml === "function"
        ? window.playTipHtml("first-trade-evo", "Some Pokémon can evolve after being traded. A Linking Cord can also trigger this evolution.")
        : "")
      : "";
    if (els.note) {
      els.note.innerHTML = (readyCount
        ? `${readyCount} evolution${readyCount === 1 ? "" : "s"} ready.`
        : "No Pokémon are ready to evolve yet. Catch duplicates to earn Evolution Candy and collect Evolution Items.")
        + (tradeTip || "");
    }
    const cards = rows.map((row) => {
      const shiny = isShiny(row);
      const ready = canEvolve(row);
      const need = Math.max(0, Number(row.candyCost || 0) - Number(row.haveCandy || 0));
      const cost = row.tradeReady && Number(row.candyCost) === 0
        ? "Trade Evolution Ready — no Candy or Linking Cord"
        : `${row.haveCandy} / ${row.candyCost} Evolution Candy${row.item ? ` · ${itemLabel(row.item)} ${row.haveItem ? "✓" : ""}` : ""}${!ready && need ? ` · ${need} more needed` : ""}`;
      return `
      <article class="ach-card ${ready ? "is-done" : ""}">
        <img src="${window.playSpriteUrl(row.dex, row.variant)}" alt="" width="72" height="72">
        <strong>${shiny ? "✨ Shiny " : ""}${window.playEscapeAttr(row.name)}</strong>
        <p>→ ${window.playEscapeAttr(row.toName)}</p>
        <span>${cost}</span>
        ${row.tradeReady ? `<span class="chip">Trade Evolution Ready</span>` : ""}
        ${row.reasonUnavailable ? `<span class="muted">${window.playEscapeAttr(row.reasonUnavailable)}</span>` : ""}
        <button type="button" data-evo="${row.catchId}" data-rule="${row.ruleId}" ${ready ? "" : "disabled"}>${ready ? "Evolve" : "Not ready"}</button>
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
    const empty = (els.filter?.value || "ready") === "ready"
      ? `<p class="muted">No Pokémon are ready to evolve yet.</p><p class="muted">Catch duplicates to earn Evolution Candy and collect Evolution Items.</p>`
      : (els.filter?.value === "item"
        ? `<p class="muted">No trade evolutions are currently ready, and no Evolution Items are missing right now.</p>`
        : `<p class="muted">Nothing in this filter right now.</p>`);
    els.grid.innerHTML = cards.join("") || empty;
  }

  function renderFamilies() {
    if (!els.families) return;
    const families = data?.families || [];
    els.families.innerHTML = families.map((fam) => {
      const members = fam.members || [];
      const line = members.map((member, index) => {
        const next = members[index + 1];
        const node = `<button type="button" class="evo-node${member.owned ? " is-owned" : ""}" data-evo-dex="${member.dex}">
          <img src="${window.playSpriteUrl(member.dex, "normal")}" alt="" width="56" height="56" loading="lazy">
          <strong>${window.playEscapeAttr(member.name)}</strong>
          <span>${member.pokedex ? "Pokédex" : "Unseen"} · ${member.owned || 0}</span>
        </button>`;
        const arrow = next ? `<span class="evo-arrow" aria-hidden="true">↓</span>` : "";
        return `${node}${arrow}`;
      }).join("");
      const next = (fam.next || []).map((rule) => {
        const need = Math.max(0, Number(rule.cost || 0) - Number(fam.candy || 0));
        return `<p>${window.playEscapeAttr(rule.fromName)} → ${window.playEscapeAttr(rule.toName)}: ${rule.cost} Evolution Candy${rule.item ? ` + ${itemLabel(rule.item)}` : ""}${need ? ` · ${need} more needed.` : " · ready if you have the Pokémon."}</p>`;
      }).join("");
      return `
        <article class="card body family-card">
          <h3>${window.playEscapeAttr(fam.name)} Evolution Line</h3>
          <p><strong>Evolution Candy:</strong> ${fam.candy || 0}</p>
          <div class="evo-line">${line || "<p class=\"muted\">No stages to show.</p>"}</div>
          ${next || "<p class=\"muted\">No evolution currently available.</p>"}
        </article>`;
    }).join("") || `<p class="muted">Catch a Pokémon with an enabled Evolution Line to see it here.</p>`;
  }

  function renderRareCandy() {
    const qty = Number(data?.items?.rarecandy || data?.bag?.rarecandy || 0);
    const families = (data?.families || []).filter((fam) => (fam.next || []).length);
    if (els.rarePanel) els.rarePanel.hidden = qty < 1 && families.length < 1;
    if (els.rareFamily) {
      els.rareFamily.innerHTML = families.map((fam) => `<option value="${fam.familyId}">${window.playEscapeAttr(fam.name)} · ${fam.candy || 0} Evolution Candy</option>`).join("");
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
      </article>`).join("") || `<p class="muted">Catch Pokémon from an Evolution Line to earn Evolution Candy.</p>`;
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
    if (els.title) els.title.textContent = `Evolve ${isShiny(row) ? "Shiny " : ""}${row.name}?`;
    const costLines = [];
    if (row.tradeReady && Number(row.candyCost) === 0) {
      costLines.push(`<p>This ${window.playEscapeAttr(row.name)} has been traded and can evolve. No Candy or Linking Cord will be used.</p>`);
    } else {
      const afterCandy = Math.max(0, Number(row.haveCandy || 0) - Number(row.candyCost || 0));
      const afterItem = row.item ? Math.max(0, Number(row.haveItemQty || (row.haveItem ? 1 : 0)) - 1) : null;
      costLines.push(`<p>Cost: ${row.candyCost} Evolution Candy${row.item ? `<br>1 ${itemLabel(row.item)}` : ""}</p>`);
      costLines.push(`<p>After evolution: ${afterCandy} Evolution Candy${row.item ? ` · ${afterItem} ${itemLabel(row.item)}` : ""}</p>`);
    }
    els.detail.innerHTML = `
      <p><img src="${window.playSpriteUrl(row.dex, row.variant)}" alt="${window.playEscapeAttr(fromName)}"> → <img src="${window.playSpriteUrl(row.toDex, row.variant)}" alt="${window.playEscapeAttr(toName)}"></p>
      <p><strong>${window.playEscapeAttr(fromName)}</strong><br>→<br><strong>${window.playEscapeAttr(toName)}</strong></p>
      ${costLines.join("")}
      ${shiny ? `<p><strong>Shiny status is kept.</strong> ${toName} stays shiny.</p>` : ""}
      ${row.favorite ? `<p class="muted">This is a favorite. Evolution still transforms this exact Pokémon.</p>` : ""}
      <p>This cannot be reversed.</p>`;
    els.status.textContent = "";
    if (els.skip) els.skip.hidden = window.playPerfReduced?.() || window.playPerfMode?.() === "low";
    window.playShowDialog(els.modal);
  }

  function showEvoFanfare(fromName, toName, fromSrc, toSrc) {
    if (window.playPerfReduced?.() || window.playPerfMode?.() === "low") return Promise.resolve();
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "evo-fanfare";
      overlay.setAttribute("role", "dialog");
      overlay.innerHTML = `
        <div>
          <p>What?</p>
          <img src="${window.playEscapeAttr(fromSrc)}" alt="">
          <p><strong>${window.playEscapeAttr(fromName)} is evolving!</strong></p>
          <p><button type="button" class="secondary" data-evo-skip>Skip animation</button></p>
        </div>`;
      document.body.append(overlay);
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        overlay.remove();
        resolve();
      };
      overlay.addEventListener("click", (event) => {
        if (event.target.closest("[data-evo-skip]")) finish();
      });
      window.setTimeout(() => {
        overlay.innerHTML = `
          <div>
            <p>Congratulations!</p>
            <img src="${window.playEscapeAttr(toSrc)}" alt="">
            <p><strong>Your ${window.playEscapeAttr(fromName)} evolved into ${window.playEscapeAttr(toName)}!</strong></p>
            <p><button type="button" data-evo-skip>Continue</button></p>
          </div>`;
        window.setTimeout(finish, 3200);
      }, 1600);
    });
  }

  async function load() {
    const session = await loadNav();
    if (!session) {
      els.app.hidden = true;
      window.playRestoreGate(els.gate, "Sign in to evolve your Pokémon.");
      return;
    }
    window.playSetLoadingGate(els.gate, els.app);
    try {
      data = await window.playCall("play_collection");
      els.gate.hidden = true;
      els.app.hidden = false;
      render();
    } catch (error) {
      els.gate.hidden = false;
      els.app.hidden = true;
      els.gate.textContent = window.playHumanRpcError
        ? window.playHumanRpcError(error, "Evolution is not live yet.")
        : window.playRpcError(error, "Evolution is not live yet.");
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
      extras = { isAdmin: Boolean(snapshot?.isAdmin), trainer: snapshot?.trainer, twitchLinked: snapshot?.twitchLinked };
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
      const fromName = pick.name;
      const toName = pick.toName;
      const fromSrc = window.playSpriteUrl(pick.dex, pick.variant);
      const toSrc = window.playSpriteUrl(pick.toDex, pick.variant);
      if (typeof els.modal.close === "function") els.modal.close();
      else els.modal.removeAttribute("open");
      await showEvoFanfare(fromName, toName, fromSrc, toSrc);
      if (typeof window.playShowNotices === "function") window.playShowNotices();
      await load();
    } catch (error) {
      const raw = window.playHumanRpcError ? window.playHumanRpcError(error) : window.playRpcError(error);
      els.status.textContent = /artwork|sprite|asset/i.test(String(raw || ""))
        ? "Evolution unavailable right now. The required artwork is missing."
        : raw;
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
  els.search?.addEventListener("input", renderReady);
  els.skip?.addEventListener("click", () => {
    document.querySelector(".evo-fanfare [data-evo-skip]")?.click();
  });
  window.playBindTips?.(document.body);
  supabase.auth.onAuthStateChange((event) => { if (window.playAuthNoise(event)) return; load(); });
  load();
})();
