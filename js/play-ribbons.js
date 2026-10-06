(() => {
  const root = window;
  const MAX = 5;
  root.PLAY_FEATURED_RIBBON_MAX = MAX;

  function catalog() {
    return root.PLAY_RIBBON_CATALOG?.ribbons || [];
  }

  function mapDoc() {
    return root.PLAY_ACHIEVEMENT_RIBBON_MAP || { mappings: [], legacyBadgeAliases: {} };
  }

  function ribbonById(id) {
    const key = String(id || "");
    return catalog().find((row) => row.id === key) || null;
  }

  function mappingForAchievement(achId) {
    return (mapDoc().mappings || []).find((row) => row.achievementId === achId) || null;
  }

  function ribbonForBadge(badge) {
    if (!badge) return null;
    if (badge.ribbonId) return ribbonById(badge.ribbonId) || Object.assign({}, badge, { id: badge.ribbonId });
    const alias = mapDoc().legacyBadgeAliases?.[badge.id];
    if (alias?.ribbonId) return ribbonById(alias.ribbonId);
    const fromAch = (mapDoc().mappings || []).find((row) => row.achievementId === badge.id);
    if (fromAch) return ribbonById(fromAch.ribbonId);
    return ribbonById(badge.id);
  }

  function ribbonForAchievement(ach) {
    const map = mappingForAchievement(ach?.id);
    if (map) return ribbonById(map.ribbonId);
    const badgeId = ach?.rewards?.badge;
    if (badgeId) {
      const alias = mapDoc().legacyBadgeAliases?.[badgeId];
      if (alias?.ribbonId) return ribbonById(alias.ribbonId);
      return ribbonById(badgeId);
    }
    return null;
  }

  function ribbonName(row, fallback) {
    return row?.name || fallback || "Ribbon";
  }

  function ribbonIcon(row, opts) {
    const locked = Boolean(opts?.locked);
    const src = row?.icon || (row?.id ? `images/ribbons/${row.id}.png` : "");
    const name = ribbonName(row, opts?.name);
    if (!src) {
      return `<span class="ribbon-icon is-empty${locked ? " is-locked" : ""}" aria-hidden="true">◆</span>`;
    }
    return `<img class="ribbon-icon-img${locked ? " is-locked" : ""}" src="${root.playEscapeAttr?.(src) || src}" alt="${root.playEscapeAttr?.(name) || name}" width="${opts?.size || 40}" height="${opts?.size || 40}" decoding="async">`;
  }

  function closeRibbonDetail() {
    const dlg = document.getElementById("ribbon-detail");
    if (!dlg) return;
    if (typeof dlg.close === "function" && dlg.open) dlg.close();
    else dlg.hidden = true;
  }

  function ensureDialog() {
    let dlg = document.getElementById("ribbon-detail");
    if (dlg) return dlg;
    dlg = document.createElement("dialog");
    dlg.id = "ribbon-detail";
    dlg.className = "play-modal ribbon-detail";
    dlg.innerHTML = `<form class="play-modal-card ribbon-detail-card" method="dialog">
      <header class="play-modal-head">
        <h2 id="ribbon-detail-title">Ribbon</h2>
        <button type="submit" class="play-modal-close" aria-label="Close">×</button>
      </header>
      <div id="ribbon-detail-body" class="ribbon-detail-body"></div>
    </form>`;
    document.body.appendChild(dlg);
    dlg.addEventListener("click", (event) => {
      if (event.target === dlg) closeRibbonDetail();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && dlg.open) closeRibbonDetail();
    });
    return dlg;
  }

  function mappingForBadge(badgeId) {
    const key = String(badgeId || "");
    if (!key) return null;
    const rows = mapDoc().mappings || [];
    return rows.find((row) => row.badgeId === key) || rows.find((row) => row.achievementId === key) || null;
  }

  // Player-facing Ribbon copy is StreamLink-only: achievement name + requirement.
  // Canonical flavor (server badge description / ribbon_flavor / origin) is never shown.
  function ribbonCopy(payload) {
    const p = payload || {};
    const badgeId = p.badge?.id || p.badgeId || "";
    const map = (p.achievementId && mappingForAchievement(p.achievementId)) || mappingForBadge(badgeId);
    if (map) {
      return {
        achievementName: String(p.achievementName || map.achievementName || ""),
        requirement: String(p.requirement || map.streamLinkDescription || ""),
        mapped: true
      };
    }
    const level = String(badgeId).match(/^level-(\d+)$/);
    if (level) {
      return { achievementName: `Trainer Level ${level[1]}`, requirement: `Reach Trainer Level ${level[1]}.`, mapped: true };
    }
    return {
      achievementName: String(p.achievementName || ""),
      requirement: String(p.requirement || "Earned through StreamLink progression."),
      mapped: false
    };
  }

  function openRibbonDetail(payload) {
    const ribbon = payload?.ribbon || ribbonById(payload?.ribbonId) || ribbonForBadge(payload?.badge);
    if (!ribbon && !payload?.name) return;
    const esc = (value) => root.playEscapeAttr?.(value) || String(value || "");
    const dlg = ensureDialog();
    const title = dlg.querySelector("#ribbon-detail-title");
    const body = dlg.querySelector("#ribbon-detail-body");
    const name = ribbonName(ribbon, payload?.name);
    if (title) title.textContent = name;
    const locked = Boolean(payload?.locked);
    const copy = ribbonCopy(payload);
    if (body) {
      body.innerHTML = `
        <div class="ribbon-detail-art">${ribbonIcon(ribbon, { name, size: 160, locked })}</div>
        <p class="ribbon-detail-state ${locked ? "is-locked" : "is-earned"}">${locked ? "Locked" : "Earned"}</p>
        ${copy.achievementName ? `<p class="ribbon-detail-ach"><span>Awarded for</span> <strong>${esc(copy.achievementName)}</strong></p>` : ""}
        ${copy.requirement ? `<p class="ribbon-detail-req">${esc(copy.requirement)}</p>` : ""}
        <div class="ribbon-detail-actions"><button type="submit" class="secondary ribbon-detail-close">Close</button></div>`;
    }
    if (typeof dlg.showModal === "function") dlg.showModal();
    else dlg.hidden = false;
    dlg.querySelector(".play-modal-close")?.focus();
  }

  document.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-ribbon-open]");
    if (!btn) return;
    const id = btn.getAttribute("data-ribbon-open");
    const badge = { id, name: btn.getAttribute("aria-label") || id };
    openRibbonDetail({
      badge,
      ribbon: ribbonForBadge(badge) || ribbonById(id)
    });
  });
  root.playRibbonById = ribbonById;
  root.playRibbonForBadge = ribbonForBadge;
  root.playRibbonForAchievement = ribbonForAchievement;
  root.playRibbonMapping = mappingForAchievement;
  root.playRibbonMappingForBadge = mappingForBadge;
  root.playRibbonCopy = ribbonCopy;
  root.playRibbonIconHtml = ribbonIcon;
  root.playRibbonName = ribbonName;
  root.playOpenRibbonDetail = openRibbonDetail;
  root.playCloseRibbonDetail = closeRibbonDetail;
})();
