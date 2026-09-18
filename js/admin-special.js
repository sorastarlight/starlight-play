(() => {
  const root = typeof window !== "undefined" ? window : globalThis;

  function esc(value) {
    return typeof root.playEscapeAttr === "function" ? root.playEscapeAttr(value) : String(value ?? "");
  }

  function byId(id) {
    return document.getElementById(id);
  }

  const TYPES = ["LEGENDARY", "MYTHICAL", "SPECIAL", "CELEBRATION", "SEASONAL", "COMMUNITY", "ADMIN_TEST"];
  const BACKGROUNDS = [
    ["seafoam-islands", "Seafoam Islands"],
    ["power-plant", "Power Plant"],
    ["victory-road", "Victory Road"],
    ["cerulean-cave", "Cerulean Cave"],
    ["faraway-place", "Faraway place"]
  ];

  window.playBindAdminSpecial = function playBindAdminSpecial() {
    const host = byId("special-events-app");
    if (!host || host.dataset.bound === "1") return;
    host.dataset.bound = "1";
    let data = null;
    let draft = emptyDraft();
    let pickFilter = "special";
    let pickQ = "";
    let pending = false;

    function emptyDraft() {
      return {
        id: "",
        dex: 144,
        formId: 144,
        eventType: "LEGENDARY",
        variantPolicy: "NORMAL_ROLL",
        visibility: "PUBLIC",
        title: "THE FROZEN LEGEND AWAKENS",
        subtitle: "Articuno",
        announcement: "A Legendary encounter is scheduled. Join during the stream to participate.",
        locationKey: "seafoam-islands",
        locationLabel: "Seafoam Islands",
        encounterCount: 3,
        autoAdvance: true,
        startsAtLocal: "",
        endsAtLocal: "",
        repeatPolicy: "SEASONAL"
      };
    }

    function toLocalInput(iso) {
      if (!iso) return "";
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return "";
      const pad = (n) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    function fromLocalInput(value) {
      if (!value) return "";
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return "";
      return d.toISOString();
    }

    function applyPreset(dex) {
      const row = data?.presets?.[String(dex)] || {};
      draft.dex = dex;
      // Phase 10 / presets always BASE form (formId = NationalDex).
      draft.formId = dex;
      draft.eventType = row.eventType || draft.eventType;
      draft.variantPolicy = row.variantPolicy || "NORMAL_ROLL";
      draft.visibility = row.visibility || "PUBLIC";
      draft.title = row.title || draft.title;
      draft.subtitle = row.subtitle || (typeof root.playSpeciesName === "function" ? root.playSpeciesName(dex) : "");
      draft.announcement = row.announcement || draft.announcement;
      draft.locationKey = row.locationKey || draft.locationKey;
      draft.locationLabel = row.locationLabel || draft.locationLabel;
      draft.encounterCount = Number(row.encounterCount || draft.encounterCount || 1);
      draft.repeatPolicy = row.repeatPolicy || "ADMIN";
    }

    function availabilityFor(dex) {
      const lists = data?.availability || {};
      if ((lists.special || []).some((row) => Number(row.dex) === Number(dex))) return "SPECIAL";
      if ((lists.evolutionOnly || []).some((row) => Number(row.dex) === Number(dex))) return "EVOLUTION";
      if ((lists.unavailable || []).some((row) => Number(row.dex) === Number(dex))) return "UNAVAILABLE";
      return "NORMAL";
    }

    async function load() {
      const status = byId("special-status");
      try {
        data = await root.playCall("admin_special_event_command", { p_action: "list", p_payload: {} });
        try {
          data.analytics = await root.playCall("admin_special_event_analytics", {});
        } catch (_) {}
        if (status) status.textContent = `Server ${root.playSpecialFormatWhen?.(data.serverNow, true) || ""}`;
        render();
      } catch (error) {
        if (status) status.textContent = root.playHumanRpcError ? root.playHumanRpcError(error) : String(error.message || error);
      }
    }

    async function cmd(action, payload, confirmOpts) {
      if (pending) return;
      const run = async () => {
        pending = true;
        const status = byId("special-status");
        if (status) status.textContent = "Working…";
        try {
          const result = await root.playCall("admin_special_event_command", { p_action: action, p_payload: payload || {} });
          await load();
          if (status) status.textContent = result?.message || "Updated.";
          render();
        } catch (error) {
          if (status) status.textContent = root.playHumanRpcError ? root.playHumanRpcError(error) : String(error.message || error);
        } finally {
          pending = false;
        }
      };
      if (confirmOpts) {
        const ok = typeof root.playPresentConfirm === "function"
          ? await root.playPresentConfirm({
            title: confirmOpts.title,
            body: confirmOpts.body,
            confirmLabel: confirmOpts.go || "Confirm",
            danger: true
          })
          : window.confirm(confirmOpts.body);
        if (!ok) return;
      }
      await run();
    }

    function payloadFromDraft() {
      const dex = Number(draft.dex);
      const formId = Number(draft.formId) || dex;
      return {
        id: draft.id || undefined,
        dex,
        formId,
        eventType: draft.eventType,
        variantPolicy: draft.variantPolicy,
        visibility: draft.visibility,
        title: draft.title,
        subtitle: draft.subtitle,
        announcement: draft.announcement,
        locationKey: draft.locationKey,
        locationLabel: draft.locationLabel,
        encounterCount: Number(draft.encounterCount || 1),
        autoAdvance: Boolean(draft.autoAdvance),
        startsAt: fromLocalInput(draft.startsAtLocal) || null,
        endsAt: fromLocalInput(draft.endsAtLocal) || null,
        repeatPolicy: draft.repeatPolicy
      };
    }

    function speciesRows() {
      const names = root.PLAY_SPECIES || [];
      const variants = root.PLAY_VARIANTS || {};
      return Object.keys(variants).map(Number).filter((n) => Number.isFinite(n)).sort((a, b) => a - b).map((dex) => {
        const name = names[dex - 1] || `Dex ${dex}`;
        return { dex, name, availability: availabilityFor(dex) };
      }).filter((row) => {
        if (pickFilter === "special" && row.availability !== "SPECIAL") return false;
        if (pickFilter === "normal" && row.availability !== "NORMAL") return false;
        if (pickFilter === "evolution" && row.availability !== "EVOLUTION") return false;
        if (pickFilter === "unavailable" && row.availability !== "UNAVAILABLE") return false;
        if (pickQ) {
          const q = pickQ.toLowerCase();
          return String(row.dex).includes(q) || String(row.name).toLowerCase().includes(q);
        }
        return true;
      });
    }

    function renderPicker() {
      const grid = byId("special-species");
      if (!grid) return;
      const rows = speciesRows();
      grid.innerHTML = rows.slice(0, 400).map((row) => {
        const art = typeof root.playSpriteUrl === "function" ? root.playSpriteUrl(row.dex, "normal", row.dex) : "";
        return `<button type="button" class="special-species${Number(draft.dex) === row.dex ? " is-on" : ""}" data-special-dex="${row.dex}">
          ${art ? `<img src="${esc(art)}" alt="" onerror="window.playSpriteOnError && window.playSpriteOnError(this)">` : ""}
          <strong>${esc(root.playPadDex ? root.playPadDex(row.dex) : row.dex)} ${esc(row.name)}</strong>
          <span>${esc(row.availability)}</span>
        </button>`;
      }).join("") || "<p class='muted'>No species match.</p>";
    }

    function formOptionsHtml(dex) {
      const forms = typeof root.playFormsForDex === "function"
        ? root.playFormsForDex(dex, { event: true })
        : [{ formId: dex, formLabel: "Base", isBase: true }];
      const selected = Number(draft.formId) || dex;
      const ok = forms.some((f) => Number(f.formId) === selected);
      if (!ok) draft.formId = dex;
      return forms.map((f) => (
        `<option value="${f.formId}"${Number(f.formId) === Number(draft.formId || dex) ? " selected" : ""}>${esc(f.isBase ? "Base" : f.formLabel)}</option>`
      )).join("");
    }

    function renderForm() {
      const form = byId("special-form");
      if (!form) return;
      const tz = root.playSpecialTimezone ? root.playSpecialTimezone() : "local";
      const dex = Number(draft.dex);
      const formId = Number(draft.formId) || dex;
      const display = typeof root.playFormDisplayName === "function" ? root.playFormDisplayName(dex, formId) : (root.playSpeciesName?.(dex) || "");
      const preview = typeof root.playSpriteUrl === "function" ? root.playSpriteUrl(dex, "normal", formId) : "";
      form.innerHTML = `
        <p class="muted">Times are stored in UTC and shown in your timezone: <strong>${esc(tz)}</strong></p>
        <div class="form-preview" style="margin-bottom:0.75rem">
          ${preview ? `<img src="${esc(preview)}" alt="" onerror="window.playSpriteOnError && window.playSpriteOnError(this)">` : ""}
          <p class="muted">${esc(display)} · FormId ${esc(formId)}</p>
        </div>
        <label class="field">Form
          <select id="se-form">${formOptionsHtml(dex)}</select>
        </label>
        <label class="field">Title
          <input id="se-title" value="${esc(draft.title)}">
        </label>
        <label class="field">Subtitle
          <input id="se-sub" value="${esc(draft.subtitle)}">
        </label>
        <label class="field">Announcement
          <textarea id="se-ann">${esc(draft.announcement)}</textarea>
        </label>
        <div class="hub-num-row">
          <label class="field">Type
            <select id="se-type">${TYPES.map((t) => `<option value="${t}"${draft.eventType === t ? " selected" : ""}>${esc(root.playSpecialTypeLabel?.(t) || t)}</option>`).join("")}</select>
          </label>
          <label class="field">Visibility
            <select id="se-vis">
              <option value="PUBLIC"${draft.visibility === "PUBLIC" ? " selected" : ""}>Public</option>
              <option value="HIDDEN"${draft.visibility === "HIDDEN" ? " selected" : ""}>Hidden / surprise</option>
            </select>
          </label>
        </div>
        <div class="hub-num-row">
          <label class="field">Shiny policy
            <select id="se-shiny">
              <option value="NORMAL_ROLL"${draft.variantPolicy === "NORMAL_ROLL" ? " selected" : ""}>Normal shiny roll</option>
              <option value="DISABLED"${draft.variantPolicy === "DISABLED" ? " selected" : ""}>Shiny disabled</option>
              <option value="FORCED_SHINY"${draft.variantPolicy === "FORCED_SHINY" ? " selected" : ""}>Forced shiny (free event)</option>
            </select>
          </label>
          <label class="field">Encounters
            <input id="se-count" type="number" min="1" max="12" value="${esc(draft.encounterCount)}">
          </label>
        </div>
        <label class="field">Background
          <select id="se-bg">${BACKGROUNDS.map(([key, label]) => `<option value="${key}"${draft.locationKey === key ? " selected" : ""}>${esc(label)}</option>`).join("")}</select>
        </label>
        <div class="hub-num-row">
          <label class="field">Starts (${esc(tz)})
            <input id="se-start" type="datetime-local" value="${esc(draft.startsAtLocal)}">
          </label>
          <label class="field">Ends (${esc(tz)})
            <input id="se-end" type="datetime-local" value="${esc(draft.endsAtLocal)}">
          </label>
        </div>
        <label class="field check">Auto-advance remaining encounters
          <input id="se-auto" type="checkbox"${draft.autoAdvance ? " checked" : ""}>
        </label>
        <div class="links">
          <button type="button" data-se-act="save">Save draft</button>
          <button type="button" class="secondary" data-se-act="schedule">Schedule</button>
          <button type="button" class="gold" data-se-act="start_now">Start now</button>
        </div>`;
    }

    function renderList() {
      const list = byId("special-list");
      if (!list) return;
      const rows = data?.events || [];
      if (!rows.length) {
        list.innerHTML = "<p class='muted'>No Special Events yet. Create a draft from the species browser.</p>";
        return;
      }
      list.innerHTML = rows.map((row) => {
        const liveWarn = row.collision ? `<p class="notice">Another event is already LIVE.</p>` : "";
        return `<article class="special-admin-row">
          <div>
            <p class="eyebrow">${esc(root.playSpecialStatusLabel?.(row.status) || row.status)} · ${esc(root.playSpecialTypeLabel?.(row.eventType) || row.eventType)}</p>
            <h3>${esc(row.title)}</h3>
            <p>${esc(row.displayName || row.speciesName || row.name)} · ${esc(row.formLabel || "Base")} · ${esc(row.roundsLaunched)}/${esc(row.encounterCount)} encounters · ${esc(row.visibility)}</p>
            <p class="muted">${esc(root.playSpecialFormatWhen?.(row.startsAt, true) || "Unscheduled")}</p>
            ${liveWarn}
          </div>
          <div class="links">
            <button type="button" class="secondary" data-se-edit="${esc(row.id)}">Edit</button>
            <button type="button" data-se-act="start_now" data-se-id="${esc(row.id)}" data-se-name="${esc(row.name)}">Start now</button>
            <button type="button" class="secondary" data-se-act="repeat" data-se-id="${esc(row.id)}" data-se-name="${esc(row.name)}">Repeat encounter</button>
            <button type="button" class="secondary" data-se-act="end" data-se-id="${esc(row.id)}" data-se-name="${esc(row.name)}">End</button>
            <button type="button" class="danger" data-se-act="cancel" data-se-id="${esc(row.id)}" data-se-name="${esc(row.name)}">Cancel</button>
          </div>
        </article>`;
      }).join("");
    }

    function renderHealth() {
      const box = byId("special-health");
      if (!box) return;
      const live = data?.live || {};
      const stats = data?.analytics?.stats || data?.analytics || {};
      box.innerHTML = `
        <p><strong>Active:</strong> ${esc(live.active?.name || "None")}</p>
        <p><strong>Next scheduled:</strong> ${esc(live.nextScheduled?.title || "None")}</p>
        <p><strong>Stuck / waiting:</strong> ${esc(live.stuck?.status || "None")}</p>
        <p><strong>Analytics:</strong> ${esc(stats.eventsHeld || 0)} events · ${esc(stats.participants || 0)} participants · ${esc(stats.captures || 0)} captures</p>
        <p class="muted">Kanto path: ${esc(data?.availability?.counts?.normal || 146)} normal · ${esc(data?.availability?.counts?.special || 5)} special event. Times shown in ${esc(root.playSpecialTimezone?.() || "local")}.</p>`;
    }

    function readForm() {
      draft.title = byId("se-title")?.value || draft.title;
      draft.subtitle = byId("se-sub")?.value || draft.subtitle;
      draft.announcement = byId("se-ann")?.value || draft.announcement;
      draft.eventType = byId("se-type")?.value || draft.eventType;
      draft.visibility = byId("se-vis")?.value || draft.visibility;
      draft.variantPolicy = byId("se-shiny")?.value || draft.variantPolicy;
      if (byId("se-form")) {
        draft.formId = Number(byId("se-form").value) || draft.dex;
      }
      draft.encounterCount = Number(byId("se-count")?.value || draft.encounterCount);
      draft.locationKey = byId("se-bg")?.value || draft.locationKey;
      const bg = BACKGROUNDS.find((row) => row[0] === draft.locationKey);
      if (bg) draft.locationLabel = bg[1];
      draft.startsAtLocal = byId("se-start")?.value || "";
      draft.endsAtLocal = byId("se-end")?.value || "";
      draft.autoAdvance = Boolean(byId("se-auto")?.checked);
    }

    function render() {
      renderHealth();
      renderPicker();
      renderForm();
      renderList();
    }

    host.addEventListener("input", (event) => {
      if (event.target.id === "special-q") {
        pickQ = event.target.value || "";
        renderPicker();
      }
    });
    host.addEventListener("change", (event) => {
      if (event.target.id === "special-filter") {
        pickFilter = event.target.value || "special";
        renderPicker();
      }
      if (event.target.id === "se-form") {
        draft.formId = Number(event.target.value) || draft.dex;
        const label = typeof root.playFormDisplayName === "function"
          ? root.playFormDisplayName(draft.dex, draft.formId)
          : root.playSpeciesName?.(draft.dex);
        if (label && !draft.id) draft.subtitle = label;
        renderForm();
      }
    });
    host.addEventListener("click", async (event) => {
      const species = event.target.closest("[data-special-dex]");
      if (species) {
        applyPreset(Number(species.dataset.specialDex));
        draft.id = "";
        render();
        return;
      }
      const edit = event.target.closest("[data-se-edit]");
      if (edit) {
        const row = (data?.events || []).find((item) => item.id === edit.dataset.seEdit);
        if (!row) return;
        draft = {
          id: row.id,
          dex: row.dex,
          formId: Number(row.formId || row.dex),
          eventType: row.eventType,
          variantPolicy: row.variantPolicy,
          visibility: row.visibility,
          title: row.title,
          subtitle: row.subtitle,
          announcement: row.announcement,
          locationKey: row.locationKey,
          locationLabel: row.locationLabel,
          encounterCount: row.encounterCount,
          autoAdvance: row.autoAdvance,
          startsAtLocal: toLocalInput(row.startsAt),
          endsAtLocal: toLocalInput(row.endsAt),
          repeatPolicy: row.repeatPolicy
        };
        render();
        return;
      }
      const preview = event.target.closest("[data-se-preview]");
      if (preview) {
        readForm();
        const kind = preview.dataset.sePreview;
        const raw = root.playSpecialPresentation?.(kind, {
          species: draft.dex,
          title: draft.title,
          eventType: draft.eventType,
          remainingRounds: Math.max(0, Number(draft.encounterCount) - 1)
        });
        if (raw && typeof root.playPresentEnqueue === "function") {
          root.playPresentEnqueue([{ ...raw, preview: true }], { preview: true, noSummary: true, source: "lab" });
        }
        const status = byId("special-status");
        if (status) status.textContent = "Visual-only preview. No Pokémon granted.";
        return;
      }
      const actBtn = event.target.closest("[data-se-act]");
      if (!actBtn) return;
      readForm();
      const act = actBtn.dataset.seAct;
      const id = actBtn.dataset.seId || draft.id;
      const name = actBtn.dataset.seName || draft.subtitle || "this event";
      if (act === "save") {
        await cmd("save", payloadFromDraft());
        return;
      }
      if (act === "schedule") {
        await cmd("schedule", { ...payloadFromDraft(), id: id || undefined });
        return;
      }
      const danger = {
        start_now: { title: `Start ${name} now?`, body: `This starts a live Special Encounter for ${name}. It cannot be undone by clicking again.`, go: "Start now" },
        repeat: { title: `Repeat ${name}?`, body: `This starts another independent encounter for ${name}.`, go: "Repeat encounter" },
        cancel: { title: `Cancel ${name}?`, body: `This cancels the Special Event. It will not start automatically.`, go: "Cancel event" },
        end: { title: `End ${name}?`, body: `This ends the live Special Event. Remaining scheduled rounds will not run.`, go: "End event" }
      }[act];
      await cmd(act, { id, confirm: true, ...payloadFromDraft() }, danger);
    });

    byId("special-refresh")?.addEventListener("click", load);
    load();
  };
})();
