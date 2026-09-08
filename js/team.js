(() => {
  function ensureModals() {
    if (document.getElementById("play-picker")) return document.getElementById("play-picker");
    const dialog = document.createElement("dialog");
    dialog.id = "play-picker";
    dialog.className = "play-modal";
    dialog.innerHTML = `
      <form class="play-modal-card" method="dialog">
        <header class="play-modal-head">
          <h3 id="play-picker-title">Choose</h3>
          <button type="submit" value="close" class="secondary">Close</button>
        </header>
        <div id="play-picker-body"></div>
      </form>`;
    document.body.appendChild(dialog);
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
    return dialog;
  }

  function openPicker(title, html, extraClass) {
    const dialog = ensureModals();
    dialog.className = extraClass ? `play-modal ${extraClass}` : "play-modal";
    document.getElementById("play-picker-title").textContent = title;
    document.getElementById("play-picker-body").innerHTML = html;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    return dialog;
  }

  window.playOpenCatchPicker = function playOpenCatchPicker(caught, usedIds, onPick) {
    const used = new Set((usedIds || []).map(String));
    const rows = (caught || []).filter((row) => row?.id && !used.has(String(row.id)));
    const html = rows.length
      ? `<div class="picker-grid">${rows.map((row) => `
          <button type="button" class="picker-mon" data-id="${row.id}">
            <img src="${window.playSpriteUrl(row.dex, row.variant)}" alt="">
            <strong>${window.playCaughtName(row)}</strong>
            <span>${window.playCaughtBlurb(row)}</span>
          </button>`).join("")}</div>`
      : `<p class="muted">Catch Pokémon on Play, then add them here. Ones already on the team won’t show again.</p>`;
    const dialog = openPicker("Add to My Team", html);
    dialog.querySelectorAll(".picker-mon").forEach((button) => {
      button.addEventListener("click", () => {
        const row = rows.find((item) => String(item.id) === button.dataset.id);
        dialog.close();
        if (row) onPick(row);
      });
    });
  };

  window.playOpenTrainerPicker = function playOpenTrainerPicker(current, onPick) {
    const html = `<div class="trainer-pick-list">${window.PLAY_TRAINERS.map((row) => `
      <section class="trainer-gen">
        <h4>${row.label}</h4>
        <p class="muted">${row.games}</p>
        <div class="trainer-gen-row">
          ${window.playTrainerLooks(row).map((look) => {
            const pressed = look.id === current ? "true" : "false";
            return `<button type="button" class="trainer-opt" data-id="${look.id}" aria-pressed="${pressed}">
              <img src="${window.playTrainerSpriteUrl(look.id)}" alt="">
              <strong>${look.name}</strong>
              ${look.gender ? `<span>${look.gender}</span>` : ""}
            </button>`;
          }).join("")}
        </div>
      </section>`).join("")}</div>`;
    const dialog = openPicker("Choose a trainer look", html, "play-modal-wide");
    dialog.querySelectorAll(".trainer-opt").forEach((button) => {
      button.addEventListener("click", () => {
        dialog.close();
        onPick(button.dataset.id);
      });
    });
  };

  window.playRenderTeamSlots = function playRenderTeamSlots(el, team, options) {
    if (!el) return;
    const mine = Boolean(options?.mine);
    const slots = Array.from({ length: 6 }, (_, i) => (team || [])[i] || null);
    el.innerHTML = slots.map((mon, index) => {
      if (!mon) {
        return `<button type="button" class="team-slot empty" data-add="${index}" ${mine ? "" : "disabled"}>
          <span class="team-slot-no">${index + 1}</span>
          <strong>${mine ? "Add" : "Empty"}</strong>
        </button>`;
      }
      return `<article class="team-slot filled">
        <span class="team-slot-no">${index + 1}</span>
        <img src="${window.playSpriteUrl(mon.dex, mon.variant)}" alt="">
        <strong>${window.playCaughtName(mon)}</strong>
        <span>${window.playCaughtBlurb(mon)}</span>
        ${mine ? `<div class="team-slot-actions">
          <button type="button" data-move="${index}" data-dir="-1" ${index === 0 ? "disabled" : ""}>◀</button>
          <button type="button" data-move="${index}" data-dir="1" ${index === 5 || !slots[index + 1] ? "disabled" : ""}>▶</button>
          <button type="button" data-remove="${index}">Remove</button>
        </div>` : ""}
      </article>`;
    }).join("");
  };

  window.playBindTeamSlots = function playBindTeamSlots(el, getState, saveTeam, statusEl) {
    if (!el) return;
    el.addEventListener("click", async (event) => {
      const add = event.target.closest("[data-add]");
      const remove = event.target.closest("[data-remove]");
      const move = event.target.closest("[data-move]");
      const state = getState();
      const team = (state.team || []).slice();
      const ids = () => team.map((row) => row.id).filter(Boolean);
      try {
        if (add) {
          if (team.length >= 6) {
            if (statusEl) statusEl.textContent = "Your team already has six Pokémon.";
            return;
          }
          window.playOpenCatchPicker(state.caught || [], ids(), async (row) => {
            try {
              team.push(row);
              if (statusEl) statusEl.textContent = "Saving team…";
              const data = await saveTeam(ids());
              if (statusEl) statusEl.textContent = data?.message || "Team updated.";
            } catch (error) {
              if (statusEl) statusEl.textContent = window.playRpcError(error);
            }
          });
          return;
        }
        if (remove) {
          team.splice(Number(remove.dataset.remove), 1);
          if (statusEl) statusEl.textContent = "Saving team…";
          const data = await saveTeam(ids());
          if (statusEl) statusEl.textContent = data?.message || "Team updated.";
          return;
        }
        if (move) {
          const index = Number(move.dataset.move);
          const next = index + Number(move.dataset.dir);
          if (next < 0 || next >= team.length) return;
          const swap = team[index];
          team[index] = team[next];
          team[next] = swap;
          if (statusEl) statusEl.textContent = "Saving team…";
          const data = await saveTeam(ids());
          if (statusEl) statusEl.textContent = data?.message || "Team updated.";
        }
      } catch (error) {
        if (statusEl) statusEl.textContent = window.playRpcError(error);
      }
    });
  };
})();
