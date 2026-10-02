const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const file = path.join(ROOT, "js", "settings.js");
let text = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");

const start = text.indexOf("  function selectedTeamBgRow() {");
const end = text.indexOf("  function openTeamBgModal() {");
if (start < 0 || end < 0) {
  console.error("markers missing", start, end);
  process.exit(1);
}

const replacement = `  function selectedTeamBgRow() {
    const view = previewCard();
    const key = window.playNormalizeTeamBgId?.(view.teamBg) || view.teamBg || "pallet-town";
    return teamBgRows().find((row) => row.asset === key)
      || teamBgRows().find((row) => row.asset === "pallet-town")
      || teamBgRows()[0];
  }

  function cycleTeamBg(dir) {
    const owned = ownedTeamBgCycle();
    if (!owned.length) return;
    const current = selectedTeamBgRow()?.asset || "pallet-town";
    let idx = owned.findIndex((row) => row.asset === current);
    if (idx < 0) idx = 0;
    const next = owned[(idx + dir + owned.length) % owned.length];
    if (!next?.unlocked) return;
    draft.teamBg = next.asset;
    updateTeamBgSelection();
  }

  function renderTeamBgCompact() {
    const selected = selectedTeamBgRow();
    const thumbStyle = teamBgThumbStyle(selected);
    const locked = selected && !selected.unlocked;
    return \`
      <section class="scc-team-bg-compact" aria-label="Team background">
        <div class="scc-team-bg-compact-head">
          <p class="scc-module-kicker">TEAM BACKGROUND</p>
          <button type="button" class="scc-team-bg-browse" data-team-bg-browse="1">Browse All Backgrounds</button>
        </div>
        <div class="scc-team-bg-carousel" role="group" aria-label="Background selector">
          <button type="button" class="scc-team-bg-nav" data-team-bg-cycle="-1" aria-label="Previous background">‹</button>
          <button type="button" class="scc-team-bg-current\${locked ? " is-locked" : ""}" data-team-bg="\${esc(selected?.asset || "pallet-town")}" aria-label="Selected \${esc(selected?.name || "Background")}">
            <span class="scc-team-bg-current-thumb \${esc(selected?.cssClass || "")}"\${thumbStyle} aria-hidden="true"></span>
            <strong class="scc-team-bg-current-name">\${esc(selected?.name || "Pallet Town")}</strong>
            \${locked ? \`<span class="id-state">LOCKED</span>\` : ""}
          </button>
          <button type="button" class="scc-team-bg-nav" data-team-bg-cycle="1" aria-label="Next background">›</button>
        </div>
        <p class="muted scc-team-bg-hint">Preview updates instantly. Persist with <strong>Save Trainer ID</strong>.</p>
      </section>\`;
  }

  function renderTeamBgModalBody() {
    const view = previewCard();
    const key = window.playNormalizeTeamBgId?.(view.teamBg) || view.teamBg || "pallet-town";
    const chromeFilters = TEAM_BG_FILTERS.map(([id, label]) => \`<button type="button" class="scc-scope\${teamBgFilter === id ? " is-on" : ""}" data-team-bg-filter="\${esc(id)}" aria-pressed="\${teamBgFilter === id}">\${esc(label)}</button>\`).join("");
    if (teamBgFilter === "retro") {
      return \`
      <div class="scc-team-bg-modal-chrome">
        <div class="scc-scope-row" role="group" aria-label="Background categories">\${chromeFilters}</div>
        <label class="field scc-browser-search" for="team-bg-search">Search
          <input id="team-bg-search" type="search" placeholder="Viridian, Route, Forest…" value="\${esc(teamBgQuery || "")}">
        </label>
        <div class="scc-team-bg-modal-viewport">
          <div class="scc-team-bg-coming-soon" role="status">
            <p class="scc-module-kicker">RETRO BACKGROUNDS</p>
            <strong>Coming Soon</strong>
            <p class="muted">Classic-era Team scenes are resting in the PC for a future update.</p>
          </div>
        </div>
      </div>\`;
    }
    const rows = teamBgRows().filter((row) => teamBgMatchesFilter(row, teamBgFilter));
    const q = String(teamBgQuery || "").trim().toLowerCase();
    const filtered = q
      ? rows.filter((row) => \`\${row.name} \${row.category} \${row.filter}\`.toLowerCase().includes(q))
      : rows;
    return \`
      <div class="scc-team-bg-modal-chrome">
        <div class="scc-scope-row" role="group" aria-label="Background categories">\${chromeFilters}</div>
        <label class="field scc-browser-search" for="team-bg-search">Search
          <input id="team-bg-search" type="search" placeholder="Viridian, Route, Forest…" value="\${esc(teamBgQuery || "")}">
        </label>
        <div class="scc-team-bg-modal-viewport">
          <div class="scc-team-bg-modal-grid">
            \${filtered.map((row) => {
              const equipped = row.asset === key;
              const state = pickState(row, equipped);
              const labelExtra = state === "locked" ? " locked" : (equipped ? " selected" : "");
              return \`<button type="button" class="scc-compact-bg-opt team-bg-opt is-\${state}" data-team-bg="\${esc(row.asset)}" aria-pressed="\${equipped}" aria-label="\${esc(row.name)}\${labelExtra}">
                <span class="scc-compact-bg-thumb team-bg-thumb \${esc(row.cssClass || "")}"\${teamBgThumbStyle(row)} aria-hidden="true"></span>
                <strong class="scc-compact-bg-name">\${esc(row.name)}</strong>
                \${state === "locked" ? \`<span class="id-state">LOCKED</span>\` : \`<span class="id-state is-silent" aria-hidden="true"></span>\`}
              </button>\`;
            }).join("") || \`<p class="muted scc-team-bg-empty">No backgrounds match.</p>\`}
          </div>
        </div>
      </div>\`;
  }

`;

text = text.slice(0, start) + replacement + text.slice(end);

text = text.replace(
  `<form method="dialog" class="play-modal-card">
        <header class="play-modal-head">
          <h2>Choose Team Background</h2>`,
  `<form method="dialog" class="play-modal-card scc-team-bg-modal-card">
        <header class="play-modal-head">
          <h2>Team Backgrounds</h2>`
);

text = text.replace(
  `<div class="play-modal-body" id="team-bg-modal-body">\${renderTeamBgModalBody()}</div>`,
  `<div class="play-modal-body scc-team-bg-modal-body" id="team-bg-modal-body">\${renderTeamBgModalBody()}</div>`
);

text = text.replace(
  `if (name) name.textContent = selected.name || "ST★RLIGHT Gradient";`,
  `if (name) name.textContent = selected.name || "Pallet Town";
      const stateEl = current.querySelector(".id-state");
      if (stateEl) {
        if (!selected.unlocked) stateEl.textContent = "LOCKED";
        else stateEl.remove();
      }`
);

// Soft save refresh for avatar tab
const saveOld = `      card = saved.trainer;
      savedCard = { ...card };
      cosmetics = saved.cosmetics || cosmetics;
      snapshotDraft(card, { force: true });
      setSaveBusy(false);
      renderProfileWorkspace();
      markDirtyFlag();
      flashEditStatus(saved.message || "Trainer ID saved.");
      return true;`;

const saveNew = `      const savedSprite = draft.sprite;
      const galleryEl = document.getElementById("avatar-results");
      const galleryTop = galleryEl ? galleryEl.scrollTop : null;
      const keepAvatarDom = profileTab === "avatar"
        && savedSprite
        && String(saved.trainer?.trainerSprite || savedSprite) === String(savedSprite);
      card = saved.trainer;
      savedCard = { ...card };
      cosmetics = saved.cosmetics || cosmetics;
      snapshotDraft(card, { force: true });
      setSaveBusy(false);
      if (keepAvatarDom) {
        softRefreshAvatarAfterSave(galleryTop);
      } else {
        renderProfileWorkspace();
      }
      markDirtyFlag();
      flashEditStatus(saved.message || "Trainer ID saved.");
      return true;`;

if (!text.includes(saveOld)) {
  console.error("saveTrainerId block missing");
  process.exit(1);
}
text = text.replace(saveOld, saveNew);

const softFn = `
  function softRefreshAvatarAfterSave(galleryTop) {
    const stage = els.workspace?.querySelector(".scc-stage-body");
    const stageImg = stage?.querySelector("img.scc-stage-sprite");
    const currentId = draft?.sprite || card?.trainerSprite || "";
    if (stageImg && stageImg.dataset.avatarId === currentId) {
      // Keep the already-stable stage image; only refresh labels.
      const look = window.playTrainerLook?.(currentId);
      const name = stage.querySelector(".scc-stage-name");
      if (name) name.textContent = look?.trainer?.name || "Trainer";
    } else if (stage) {
      stage.innerHTML = avatarStageHtml();
    }
    const box = document.getElementById("avatar-results");
    if (box) {
      // Update selection classes without rebuilding tile DOM / re-decoding thumbs.
      box.querySelectorAll(".scc-avatar-card[data-sprite]").forEach((btn) => {
        const equipped = btn.dataset.sprite === currentId;
        btn.classList.toggle("is-equipped", equipped);
        btn.classList.toggle("is-owned", !equipped);
        btn.setAttribute("aria-pressed", equipped ? "true" : "false");
        const state = btn.querySelector(".id-state");
        if (state) state.textContent = equipped ? "Equipped" : "Owned";
      });
      if (galleryTop != null) box.scrollTop = galleryTop;
    }
    const count = document.getElementById("avatar-count");
    if (count) count.textContent = avatarCountText();
  }

`;

if (!text.includes("function softRefreshAvatarAfterSave")) {
  text = text.replace("  async function saveTrainerId() {", softFn + "  async function saveTrainerId() {");
}

fs.writeFileSync(file, text.replace(/\n/g, "\r\n"));
console.log("settings-b applied");
