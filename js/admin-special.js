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

    /** One authoritative selection — every control/preview reads from this. */
    const selection = {
      filter: "all",
      query: "",
      dex: 144,
      formId: 144,
      gender: "Genderless",
      variantPolicy: "NORMAL_ROLL",
      id: "",
      eventType: "LEGENDARY",
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

    let data = null;
    let pending = false;
    let refreshing = false;

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

    function normalizeGender(dex, preferred) {
      const opts = typeof root.playGenderOptions === "function" ? root.playGenderOptions(dex) : ["Male", "Female"];
      if (preferred && opts.includes(preferred)) return preferred;
      return opts[0] || "Genderless";
    }

    function applyPresetCopy(dex) {
      const row = data?.presets?.[String(dex)] || {};
      if (selection.id) return;
      selection.eventType = row.eventType
        || (root.playSpecialDex?.has?.(dex) ? (dex === 151 ? "MYTHICAL" : "LEGENDARY") : selection.eventType);
      selection.variantPolicy = row.variantPolicy || selection.variantPolicy || "NORMAL_ROLL";
      selection.visibility = row.visibility || selection.visibility || "PUBLIC";
      selection.title = row.title || selection.title;
      selection.announcement = row.announcement || selection.announcement;
      selection.locationKey = row.locationKey || selection.locationKey;
      selection.locationLabel = row.locationLabel || selection.locationLabel;
      selection.encounterCount = Number(row.encounterCount || selection.encounterCount || 1);
      selection.repeatPolicy = row.repeatPolicy || selection.repeatPolicy || "ADMIN";
    }

    /** Reconcile filter ↔ species ↔ form from ONE state object. */
    function reconcile(opts) {
      const options = opts || {};
      const before = { dex: selection.dex, formId: selection.formId };
      const result = typeof root.playSpecialReconcileSelection === "function"
        ? root.playSpecialReconcileSelection({
          filter: selection.filter,
          query: selection.query,
          dex: selection.dex,
          formId: selection.formId
        })
        : { dex: selection.dex, formId: selection.formId, changed: false };

      if (options.forceSpecies) {
        selection.dex = Number(options.forceSpecies);
        selection.formId = typeof root.playSpecialDefaultFormForFilter === "function"
          ? root.playSpecialDefaultFormForFilter(selection.dex, selection.filter)
          : selection.dex;
      } else {
        selection.dex = Number(result.dex);
        selection.formId = Number(result.formId);
      }

      if (options.resetForm) {
        selection.formId = typeof root.playSpecialDefaultFormForFilter === "function"
          ? root.playSpecialDefaultFormForFilter(selection.dex, selection.filter)
          : selection.dex;
      }

      const allowed = typeof root.playSpecialFormsForFilter === "function"
        ? root.playSpecialFormsForFilter(selection.dex, selection.filter)
        : [{ formId: selection.dex, isBase: true }];
      if (!allowed.some((f) => Number(f.formId) === Number(selection.formId))) {
        selection.formId = Number(allowed[0]?.formId || selection.dex);
      }

      selection.gender = normalizeGender(selection.dex, selection.gender);
      applyPresetCopy(selection.dex);
      selection.subtitle = typeof root.playFormDisplayName === "function"
        ? root.playFormDisplayName(selection.dex, selection.formId)
        : (root.playSpeciesName?.(selection.dex) || selection.subtitle);

      if (options.debugAssert !== false && typeof console !== "undefined") {
        if (Number(before.dex) !== Number(selection.dex) || Number(before.formId) !== Number(selection.formId)) {
          // intentional no-op log gate for tests via dataset
        }
      }
      return selection;
    }

    function setStatus(msg, keep) {
      const status = byId("special-status");
      if (!status) return;
      status.textContent = msg || "";
      if (keep) status.dataset.keep = "1";
      else delete status.dataset.keep;
    }

    async function load() {
      if (refreshing) return;
      refreshing = true;
      const btn = byId("special-refresh");
      if (btn) {
        btn.disabled = true;
        btn.classList.add("is-loading");
        btn.setAttribute("aria-busy", "true");
      }
      setStatus("Refreshing…", true);
      try {
        data = await root.playCall("admin_special_event_command", { p_action: "list", p_payload: {} });
        try {
          data.analytics = await root.playCall("admin_special_event_analytics", {});
        } catch (_) {}
        reconcile();
        setStatus("");
        render();
      } catch (error) {
        const msg = root.playHumanRpcError ? root.playHumanRpcError(error) : String(error.message || error);
        setStatus(`Refresh failed: ${msg}`);
      } finally {
        refreshing = false;
        const refreshBtn = byId("special-refresh");
        if (refreshBtn) {
          refreshBtn.disabled = false;
          refreshBtn.classList.remove("is-loading");
          refreshBtn.removeAttribute("aria-busy");
        }
      }
    }

    async function cmd(action, payload, confirmOpts) {
      if (pending) return;
      const run = async () => {
        pending = true;
        setStatus("Working…", true);
        try {
          const result = await root.playCall("admin_special_event_command", { p_action: action, p_payload: payload || {} });
          await load();
          setStatus(result?.message || "Updated.");
          render();
        } catch (error) {
          setStatus(root.playHumanRpcError ? root.playHumanRpcError(error) : String(error.message || error));
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

    function payloadFromSelection() {
      const dex = Number(selection.dex);
      const formId = Number(selection.formId) || dex;
      return {
        id: selection.id || undefined,
        dex,
        formId,
        gender: selection.gender,
        eventType: selection.eventType,
        variantPolicy: selection.variantPolicy,
        visibility: selection.visibility,
        title: selection.title,
        subtitle: selection.subtitle,
        announcement: selection.announcement,
        locationKey: selection.locationKey,
        locationLabel: selection.locationLabel,
        encounterCount: Number(selection.encounterCount || 1),
        autoAdvance: Boolean(selection.autoAdvance),
        startsAt: fromLocalInput(selection.startsAtLocal) || null,
        endsAt: fromLocalInput(selection.endsAtLocal) || null,
        repeatPolicy: selection.repeatPolicy,
        presentation: { gender: selection.gender }
      };
    }

    function speciesOptionsHtml() {
      const rows = typeof root.playSpecialFilterSpecies === "function"
        ? root.playSpecialFilterSpecies(selection.filter, selection.query)
        : [];
      if (!rows.length) return `<option value="">No Pokémon match</option>`;
      return rows.map((row) => {
        const pad = root.playPadDex ? root.playPadDex(row.dex) : String(row.dex).padStart(3, "0");
        return `<option value="${row.dex}"${Number(selection.dex) === row.dex ? " selected" : ""}>${esc(pad)} — ${esc(row.name)}</option>`;
      }).join("");
    }

    function formOptionsHtml() {
      const forms = typeof root.playSpecialFormsForFilter === "function"
        ? root.playSpecialFormsForFilter(selection.dex, selection.filter)
        : [{ formId: selection.dex, formLabel: "Base", isBase: true }];
      return forms.map((f) => (
        `<option value="${f.formId}"${Number(f.formId) === Number(selection.formId) ? " selected" : ""}>${esc(f.isBase ? "Base" : f.formLabel)}</option>`
      )).join("");
    }

    function genderOptionsHtml() {
      const opts = typeof root.playGenderOptions === "function" ? root.playGenderOptions(selection.dex) : ["Male", "Female"];
      return opts.map((g) => `<option value="${esc(g)}"${selection.gender === g ? " selected" : ""}>${esc(g)}</option>`).join("");
    }

    function previewHtml() {
      const dex = Number(selection.dex);
      const formId = Number(selection.formId) || dex;
      const shiny = selection.variantPolicy === "FORCED_SHINY";
      const variant = typeof root.playSpecialPreviewVariant === "function"
        ? root.playSpecialPreviewVariant({ dex, gender: selection.gender, shiny, variantPolicy: selection.variantPolicy })
        : (shiny ? "shiny" : "normal");
      const display = typeof root.playFormDisplayName === "function"
        ? root.playFormDisplayName(dex, formId)
        : (root.playSpeciesName?.(dex) || "");
      const meta = typeof root.playFormMeta === "function" ? root.playFormMeta(formId) : null;
      const hasArt = meta?.isBase || meta?.hasFront || formId === dex;
      const url = typeof root.playSpriteUrl === "function" ? root.playSpriteUrl(dex, variant, formId) : "";
      const badges = typeof root.playSpecialBadgeHtml === "function"
        ? root.playSpecialBadgeHtml(root.playSpecialSelectionBadges?.({
          dex,
          formId,
          gender: selection.gender,
          shiny,
          variantPolicy: selection.variantPolicy
        }))
        : "";

      // Hard invariant: preview identity must match selection
      const mismatch = Number(byId("se-species")?.value || dex) !== dex;
      if (mismatch && typeof console !== "undefined") {
        console.warn("[special-events] preview/dropdown dex mismatch", byId("se-species")?.value, dex);
      }

      if (!hasArt && formId !== dex) {
        return `<div class="se-preview se-preview-missing" data-se-preview-dex="${dex}" data-se-preview-form="${formId}" role="status">
          <p><strong>${esc(display)}</strong></p>
          <p class="notice">Missing Front artwork for this form. Gameplay identity is unchanged.</p>
          ${badges}
        </div>`;
      }
      return `<div class="se-preview" data-se-live-preview data-se-preview-dex="${dex}" data-se-preview-form="${formId}" data-se-preview-shiny="${shiny ? "1" : "0"}" data-se-preview-gender="${esc(selection.gender)}">
        ${url ? `<img src="${esc(url)}" alt="" width="96" height="96" onerror="window.playSpriteOnError && window.playSpriteOnError(this)">` : ""}
        <div class="se-preview-copy">
          <p class="se-preview-name"><strong>${esc(display)}</strong></p>
          ${badges}
        </div>
      </div>`;
    }

    function filterOptionsHtml() {
      const filters = root.playSpecialFilters || [{ id: "all", label: "All Kanto" }];
      return filters.map((f) => `<option value="${esc(f.id)}"${selection.filter === f.id ? " selected" : ""}>${esc(f.label)}</option>`).join("");
    }

    function renderToolbar() {
      const tools = byId("special-picker-tools");
      if (!tools) return;
      tools.innerHTML = `
        <div class="se-toolbar" role="group" aria-label="Event Pokémon picker">
          <label class="field se-field-filter" for="special-filter">
            <span class="se-field-label">Filter</span>
            <select id="special-filter" class="se-control">${filterOptionsHtml()}</select>
          </label>
          <div class="field se-field-species">
            <span class="se-field-label" id="se-species-label">Pokémon</span>
            <div class="se-species-combo">
              <input id="special-q" class="se-control" type="search" placeholder="Type to narrow…" value="${esc(selection.query)}" aria-labelledby="se-species-label" aria-controls="se-species">
              <select id="se-species" class="se-control" aria-labelledby="se-species-label">${speciesOptionsHtml()}</select>
            </div>
          </div>
          <div class="se-field-refresh">
            <span class="se-field-label se-field-label-spacer" aria-hidden="true">&nbsp;</span>
            <button id="special-refresh" class="se-icon-btn secondary se-control" type="button" title="Refresh events" aria-label="Refresh events">↻</button>
          </div>
        </div>`;
    }

    function renderForm() {
      const form = byId("special-form");
      if (!form) return;
      form.innerHTML = `
        ${previewHtml()}
        <div class="hub-num-row se-identity-row">
          <label class="field">Form
            <select id="se-form" class="se-control">${formOptionsHtml()}</select>
          </label>
          <label class="field">Gender
            <select id="se-gender" class="se-control">${genderOptionsHtml()}</select>
          </label>
          <label class="field">Shiny
            <select id="se-shiny" class="se-control">
              <option value="NORMAL_ROLL"${selection.variantPolicy === "NORMAL_ROLL" ? " selected" : ""}>Normal roll</option>
              <option value="DISABLED"${selection.variantPolicy === "DISABLED" ? " selected" : ""}>Disabled</option>
              <option value="FORCED_SHINY"${selection.variantPolicy === "FORCED_SHINY" ? " selected" : ""}>Forced shiny</option>
            </select>
          </label>
        </div>
        <label class="field">Title
          <input id="se-title" value="${esc(selection.title)}">
        </label>
        <label class="field">Subtitle
          <input id="se-sub" value="${esc(selection.subtitle)}">
        </label>
        <label class="field">Announcement
          <textarea id="se-ann">${esc(selection.announcement)}</textarea>
        </label>
        <div class="hub-num-row">
          <label class="field">Type
            <select id="se-type">${TYPES.map((t) => `<option value="${t}"${selection.eventType === t ? " selected" : ""}>${esc(root.playSpecialTypeLabel?.(t) || t)}</option>`).join("")}</select>
          </label>
          <label class="field">Visibility
            <select id="se-vis">
              <option value="PUBLIC"${selection.visibility === "PUBLIC" ? " selected" : ""}>Public</option>
              <option value="HIDDEN"${selection.visibility === "HIDDEN" ? " selected" : ""}>Hidden / surprise</option>
            </select>
          </label>
          <label class="field">Encounters
            <input id="se-count" type="number" min="1" max="12" value="${esc(selection.encounterCount)}">
          </label>
        </div>
        <label class="field">Background
          <select id="se-bg">${BACKGROUNDS.map(([key, label]) => `<option value="${key}"${selection.locationKey === key ? " selected" : ""}>${esc(label)}</option>`).join("")}</select>
        </label>
        <div class="hub-num-row se-schedule-row">
          <label class="field">Starts
            <input id="se-start" type="datetime-local" value="${esc(selection.startsAtLocal)}">
          </label>
          <label class="field">Ends
            <input id="se-end" type="datetime-local" value="${esc(selection.endsAtLocal)}">
          </label>
        </div>
        <label class="field check">Auto-advance remaining encounters
          <input id="se-auto" type="checkbox"${selection.autoAdvance ? " checked" : ""}>
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
        list.innerHTML = "<p class='muted'>No Special Events yet. Choose an Event Pokémon and save a draft.</p>";
        return;
      }
      list.innerHTML = rows.map((row) => {
        const liveWarn = row.collision ? `<p class="notice">Another event is already LIVE.</p>` : "";
        const formId = Number(row.formId || row.dex);
        const name = row.displayName || (typeof root.playFormDisplayName === "function" ? root.playFormDisplayName(row.dex, formId) : row.speciesName);
        const shiny = String(row.variantPolicy || "").toUpperCase() === "FORCED_SHINY";
        const gender = row.presentation?.gender || row.gender || "";
        const art = typeof root.playSpriteUrl === "function"
          ? root.playSpriteUrl(row.dex, shiny ? "shiny" : "normal", formId)
          : "";
        const canDelete = !["LIVE", "WAITING_FOR_STREAM"].includes(String(row.status || "").toUpperCase());
        const badges = typeof root.playSpecialBadgeHtml === "function"
          ? root.playSpecialBadgeHtml(root.playSpecialSelectionBadges?.({
            dex: row.dex,
            formId,
            gender,
            shiny,
            variantPolicy: row.variantPolicy
          }))
          : "";
        return `<article class="special-admin-row">
          <div class="special-admin-main">
            ${art ? `<img class="special-admin-art" src="${esc(art)}" alt="" width="64" height="64" onerror="window.playSpriteOnError && window.playSpriteOnError(this)">` : ""}
            <div>
              <p class="eyebrow">${esc(root.playSpecialStatusLabel?.(row.status) || row.status)} · ${esc(root.playSpecialTypeLabel?.(row.eventType) || row.eventType)}</p>
              <h3>${esc(row.title)}</h3>
              <p><strong>${esc(name)}</strong></p>
              ${badges}
              <p class="muted">${esc(root.playSpecialFormatWhen?.(row.startsAt, true) || "Unscheduled")} · ${esc(row.roundsLaunched)}/${esc(row.encounterCount)} encounters</p>
              ${liveWarn}
            </div>
          </div>
          <div class="links">
            <button type="button" class="secondary" data-se-edit="${esc(row.id)}">Edit</button>
            <button type="button" data-se-act="start_now" data-se-id="${esc(row.id)}" data-se-name="${esc(row.title || name)}">Start now</button>
            <button type="button" class="secondary" data-se-act="repeat" data-se-id="${esc(row.id)}" data-se-name="${esc(row.title || name)}">Repeat</button>
            <button type="button" class="secondary" data-se-act="end" data-se-id="${esc(row.id)}" data-se-name="${esc(row.title || name)}">End</button>
            <button type="button" class="secondary" data-se-act="cancel" data-se-id="${esc(row.id)}" data-se-name="${esc(row.title || name)}">Cancel</button>
            ${canDelete ? `<button type="button" class="danger" data-se-act="delete" data-se-id="${esc(row.id)}" data-se-name="${esc(row.title || name)}" data-se-mon="${esc(name)}" data-se-when="${esc(root.playSpecialFormatWhen?.(row.startsAt, true) || row.status)}">Delete</button>` : ""}
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
        <p><strong>Active:</strong> ${esc(live.active?.displayName || live.active?.name || "None")}</p>
        <p><strong>Next scheduled:</strong> ${esc(live.nextScheduled?.title || "None")}</p>
        <p><strong>Analytics:</strong> ${esc(stats.eventsHeld || 0)} events · ${esc(stats.participants || 0)} participants · ${esc(stats.captures || 0)} captures</p>`;
    }

    function readMetaFields() {
      selection.title = byId("se-title")?.value || selection.title;
      selection.subtitle = byId("se-sub")?.value || selection.subtitle;
      selection.announcement = byId("se-ann")?.value || selection.announcement;
      selection.eventType = byId("se-type")?.value || selection.eventType;
      selection.visibility = byId("se-vis")?.value || selection.visibility;
      selection.encounterCount = Number(byId("se-count")?.value || selection.encounterCount);
      selection.locationKey = byId("se-bg")?.value || selection.locationKey;
      const bg = BACKGROUNDS.find((row) => row[0] === selection.locationKey);
      if (bg) selection.locationLabel = bg[1];
      selection.startsAtLocal = byId("se-start")?.value || "";
      selection.endsAtLocal = byId("se-end")?.value || "";
      selection.autoAdvance = Boolean(byId("se-auto")?.checked);
    }

    function render() {
      reconcile();
      renderHealth();
      renderToolbar();
      renderForm();
      renderList();
      const grid = byId("special-species");
      if (grid) {
        grid.hidden = true;
        grid.innerHTML = "";
      }
      // Expose for tests / debug
      host.dataset.seDex = String(selection.dex);
      host.dataset.seForm = String(selection.formId);
      host.dataset.seFilter = String(selection.filter);
      root.__playSpecialSelection = { ...selection };
    }

    host.addEventListener("input", (event) => {
      if (event.target.id === "special-q") {
        selection.query = event.target.value || "";
        reconcile();
        const sel = byId("se-species");
        if (sel) sel.innerHTML = speciesOptionsHtml();
        // Keep form/preview in sync if species changed due to empty matches → fallback
        renderForm();
        host.dataset.seDex = String(selection.dex);
        host.dataset.seForm = String(selection.formId);
      }
    });

    host.addEventListener("change", (event) => {
      if (event.target.id === "special-filter") {
        selection.filter = event.target.value || "all";
        reconcile();
        render();
        return;
      }
      if (event.target.id === "se-species") {
        selection.dex = Number(event.target.value) || selection.dex;
        selection.formId = typeof root.playSpecialDefaultFormForFilter === "function"
          ? root.playSpecialDefaultFormForFilter(selection.dex, selection.filter)
          : selection.dex;
        selection.gender = normalizeGender(selection.dex, selection.gender);
        applyPresetCopy(selection.dex);
        selection.subtitle = typeof root.playFormDisplayName === "function"
          ? root.playFormDisplayName(selection.dex, selection.formId)
          : selection.subtitle;
        renderForm();
        host.dataset.seDex = String(selection.dex);
        host.dataset.seForm = String(selection.formId);
        return;
      }
      if (event.target.id === "se-form") {
        selection.formId = Number(event.target.value) || selection.dex;
        selection.subtitle = typeof root.playFormDisplayName === "function"
          ? root.playFormDisplayName(selection.dex, selection.formId)
          : selection.subtitle;
        renderForm();
        host.dataset.seForm = String(selection.formId);
        return;
      }
      if (event.target.id === "se-gender") {
        selection.gender = event.target.value || selection.gender;
        renderForm();
        return;
      }
      if (event.target.id === "se-shiny") {
        selection.variantPolicy = event.target.value || selection.variantPolicy;
        renderForm();
      }
    });

    host.addEventListener("click", async (event) => {
      if (event.target.closest("#special-refresh")) {
        await load();
        return;
      }
      const edit = event.target.closest("[data-se-edit]");
      if (edit) {
        const row = (data?.events || []).find((item) => item.id === edit.dataset.seEdit);
        if (!row) return;
        Object.assign(selection, {
          id: row.id,
          dex: row.dex,
          formId: Number(row.formId || row.dex),
          gender: normalizeGender(row.dex, row.presentation?.gender || row.gender),
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
          repeatPolicy: row.repeatPolicy,
          filter: "all",
          query: ""
        });
        reconcile();
        render();
        return;
      }
      const preview = event.target.closest("[data-se-preview]");
      if (preview) {
        readMetaFields();
        const kind = preview.dataset.sePreview;
        const raw = root.playSpecialPresentation?.(kind, {
          species: selection.dex,
          dex: selection.dex,
          formId: selection.formId,
          gender: selection.gender,
          variantPolicy: selection.variantPolicy,
          shiny: selection.variantPolicy === "FORCED_SHINY",
          title: selection.title,
          eventType: selection.eventType,
          startsAt: fromLocalInput(selection.startsAtLocal) || undefined,
          remainingRounds: Math.max(0, Number(selection.encounterCount) - 1)
        });
        if (raw && typeof root.playPresentEnqueue === "function") {
          root.playPresentEnqueue([{ ...raw, preview: true }], { preview: true, noSummary: true, source: "lab" });
        }
        setStatus("Visual-only preview. No Pokémon granted.");
        return;
      }
      const actBtn = event.target.closest("[data-se-act]");
      if (!actBtn) return;
      readMetaFields();
      const act = actBtn.dataset.seAct;
      const id = actBtn.dataset.seId || selection.id;
      const name = actBtn.dataset.seName || selection.title || selection.subtitle || "this event";
      if (act === "save") {
        await cmd("save", payloadFromSelection());
        return;
      }
      if (act === "schedule") {
        await cmd("schedule", { ...payloadFromSelection(), id: id || undefined });
        return;
      }
      if (act === "delete") {
        const mon = actBtn.dataset.seMon || selection.subtitle || "Pokémon";
        const when = actBtn.dataset.seWhen || "unscheduled";
        await cmd("delete", { id, confirm: true }, {
          title: `Delete "${name}"?`,
          body: `This removes the event definition/schedule for ${mon} (${when}). Completed encounter history will not be deleted.`,
          go: "Delete Event"
        });
        return;
      }
      const danger = {
        start_now: { title: `Start ${name} now?`, body: `This starts a live Special Encounter for ${name}.`, go: "Start now" },
        repeat: { title: `Repeat ${name}?`, body: `This starts another independent encounter for ${name}.`, go: "Repeat encounter" },
        cancel: { title: `Cancel ${name}?`, body: `This cancels the Special Event. It will not start automatically.`, go: "Cancel event" },
        end: { title: `End ${name}?`, body: `This ends the live Special Event. Remaining scheduled rounds will not run.`, go: "End event" }
      }[act];
      await cmd(act, { id, confirm: true, ...payloadFromSelection() }, danger);
    });

    reconcile();
    load();
  };
})();
