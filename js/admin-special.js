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
    let pickFilter = "all";
    let pickQ = "";
    let pending = false;

    function emptyDraft() {
      return {
        id: "",
        dex: 144,
        formId: 144,
        gender: "Genderless",
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

    function normalizeGender(dex, preferred) {
      const opts = typeof root.playGenderOptions === "function" ? root.playGenderOptions(dex) : ["Male", "Female"];
      if (preferred && opts.includes(preferred)) return preferred;
      return opts[0] || "Genderless";
    }

    function applySpecies(dex, keepForm) {
      const next = Number(dex) || 1;
      draft.dex = next;
      if (!keepForm) draft.formId = next;
      const forms = typeof root.playFormsForDex === "function"
        ? root.playFormsForDex(next, { event: true })
        : [{ formId: next, isBase: true }];
      const ok = forms.some((f) => Number(f.formId) === Number(draft.formId));
      if (!ok) draft.formId = next;
      draft.gender = normalizeGender(next, draft.gender);
      const row = data?.presets?.[String(next)] || {};
      if (!draft.id) {
        draft.eventType = row.eventType || (root.playSpecialDex?.has?.(next) ? (next === 151 ? "MYTHICAL" : "LEGENDARY") : draft.eventType);
        draft.variantPolicy = row.variantPolicy || draft.variantPolicy || "NORMAL_ROLL";
        draft.visibility = row.visibility || draft.visibility || "PUBLIC";
        draft.title = row.title || draft.title;
        draft.announcement = row.announcement || draft.announcement;
        draft.locationKey = row.locationKey || draft.locationKey;
        draft.locationLabel = row.locationLabel || draft.locationLabel;
        draft.encounterCount = Number(row.encounterCount || draft.encounterCount || 1);
        draft.repeatPolicy = row.repeatPolicy || draft.repeatPolicy || "ADMIN";
      }
      draft.subtitle = typeof root.playFormDisplayName === "function"
        ? root.playFormDisplayName(next, draft.formId)
        : (root.playSpeciesName?.(next) || draft.subtitle);
    }

    async function load() {
      const status = byId("special-status");
      try {
        data = await root.playCall("admin_special_event_command", { p_action: "list", p_payload: {} });
        try {
          data.analytics = await root.playCall("admin_special_event_analytics", {});
        } catch (_) {}
        if (status && !status.dataset.keep) status.textContent = "";
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
        if (status) {
          status.dataset.keep = "1";
          status.textContent = "Working…";
        }
        try {
          const result = await root.playCall("admin_special_event_command", { p_action: action, p_payload: payload || {} });
          await load();
          if (status) {
            status.textContent = result?.message || "Updated.";
            delete status.dataset.keep;
          }
          render();
        } catch (error) {
          if (status) {
            status.textContent = root.playHumanRpcError ? root.playHumanRpcError(error) : String(error.message || error);
            delete status.dataset.keep;
          }
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
        gender: draft.gender,
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
        repeatPolicy: draft.repeatPolicy,
        presentation: { gender: draft.gender }
      };
    }

    function speciesOptionsHtml() {
      const rows = typeof root.playSpecialFilterSpecies === "function"
        ? root.playSpecialFilterSpecies(pickFilter, pickQ)
        : [];
      if (!rows.length) return `<option value="">No Pokémon match</option>`;
      return rows.map((row) => {
        const pad = root.playPadDex ? root.playPadDex(row.dex) : String(row.dex).padStart(3, "0");
        return `<option value="${row.dex}"${Number(draft.dex) === row.dex ? " selected" : ""}>${esc(pad)} — ${esc(row.name)}</option>`;
      }).join("");
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

    function genderOptionsHtml(dex) {
      const opts = typeof root.playGenderOptions === "function" ? root.playGenderOptions(dex) : ["Male", "Female"];
      draft.gender = normalizeGender(dex, draft.gender);
      return opts.map((g) => `<option value="${esc(g)}"${draft.gender === g ? " selected" : ""}>${esc(g)}</option>`).join("");
    }

    function previewHtml() {
      const dex = Number(draft.dex);
      const formId = Number(draft.formId) || dex;
      const shiny = draft.variantPolicy === "FORCED_SHINY";
      const variant = typeof root.playSpecialPreviewVariant === "function"
        ? root.playSpecialPreviewVariant({ dex, gender: draft.gender, shiny, variantPolicy: draft.variantPolicy })
        : (shiny ? "shiny" : "normal");
      const display = typeof root.playFormDisplayName === "function" ? root.playFormDisplayName(dex, formId) : (root.playSpeciesName?.(dex) || "");
      const meta = typeof root.playFormMeta === "function" ? root.playFormMeta(formId) : null;
      const hasArt = meta?.isBase || meta?.hasFront || formId === dex;
      const url = typeof root.playSpriteUrl === "function" ? root.playSpriteUrl(dex, variant, formId) : "";
      const props = [];
      if (shiny) props.push("✨ Shiny");
      if (draft.gender === "Female") props.push("♀ Female");
      if (draft.gender === "Male") props.push("♂ Male");
      if (!hasArt && formId !== dex) {
        return `<div class="se-preview se-preview-missing" role="status">
          <p><strong>${esc(display)}</strong></p>
          <p class="notice">Missing Front artwork for this form. Gameplay identity is unchanged.</p>
        </div>`;
      }
      return `<div class="se-preview" data-se-live-preview>
        ${url ? `<img src="${esc(url)}" alt="" width="96" height="96" onerror="window.playSpriteOnError && window.playSpriteOnError(this)">` : ""}
        <div>
          <p class="se-preview-name"><strong>${esc(display)}</strong></p>
          ${props.length ? `<p class="muted">${esc(props.join(" · "))}</p>` : ""}
        </div>
      </div>`;
    }

    function filterOptionsHtml() {
      const filters = root.playSpecialFilters || [
        { id: "all", label: "All Kanto" },
        { id: "normal", label: "Normal Spawn" }
      ];
      return filters.map((f) => `<option value="${esc(f.id)}"${pickFilter === f.id ? " selected" : ""}>${esc(f.label)}</option>`).join("");
    }

    function renderToolbar() {
      const tools = byId("special-picker-tools");
      if (!tools) return;
      const tz = root.playSpecialTimezone ? root.playSpecialTimezone() : "local";
      tools.innerHTML = `
        <div class="se-toolbar">
          <label class="field" for="special-filter">Filter
            <select id="special-filter">${filterOptionsHtml()}</select>
          </label>
          <label class="field se-species-field" for="se-species">Pokémon
            <input id="special-q" type="search" placeholder="Type to narrow…" value="${esc(pickQ)}" aria-controls="se-species">
            <select id="se-species" size="1">${speciesOptionsHtml()}</select>
          </label>
          <button id="special-refresh" class="se-icon-btn secondary" type="button" title="Refresh events" aria-label="Refresh events">↻</button>
        </div>
        <p class="muted se-tz-hint">Event times are saved in UTC and shown in your local timezone. Your timezone: <strong>${esc(tz)}</strong></p>`;
    }

    function renderForm() {
      const form = byId("special-form");
      if (!form) return;
      const tz = root.playSpecialTimezone ? root.playSpecialTimezone() : "local";
      const dex = Number(draft.dex);
      form.innerHTML = `
        ${previewHtml()}
        <div class="hub-num-row">
          <label class="field">Form
            <select id="se-form">${formOptionsHtml(dex)}</select>
          </label>
          <label class="field">Gender
            <select id="se-gender">${genderOptionsHtml(dex)}</select>
          </label>
          <label class="field">Shiny
            <select id="se-shiny">
              <option value="NORMAL_ROLL"${draft.variantPolicy === "NORMAL_ROLL" ? " selected" : ""}>Normal roll</option>
              <option value="DISABLED"${draft.variantPolicy === "DISABLED" ? " selected" : ""}>Disabled</option>
              <option value="FORCED_SHINY"${draft.variantPolicy === "FORCED_SHINY" ? " selected" : ""}>Forced shiny</option>
            </select>
          </label>
        </div>
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
          <label class="field">Encounters
            <input id="se-count" type="number" min="1" max="12" value="${esc(draft.encounterCount)}">
          </label>
        </div>
        <label class="field">Background
          <select id="se-bg">${BACKGROUNDS.map(([key, label]) => `<option value="${key}"${draft.locationKey === key ? " selected" : ""}>${esc(label)}</option>`).join("")}</select>
        </label>
        <div class="hub-num-row se-schedule-row">
          <label class="field">Starts
            <input id="se-start" type="datetime-local" value="${esc(draft.startsAtLocal)}">
          </label>
          <label class="field">Ends
            <input id="se-end" type="datetime-local" value="${esc(draft.endsAtLocal)}">
          </label>
        </div>
        <p class="muted se-schedule-blurb">Saved as UTC · shown as local (${esc(tz)})</p>
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
        const props = [name, shiny ? "✨ Shiny" : "", gender === "Female" ? "♀ Female" : gender === "Male" ? "♂ Male" : ""]
          .filter(Boolean)
          .join(" · ");
        return `<article class="special-admin-row">
          <div class="special-admin-main">
            ${art ? `<img class="special-admin-art" src="${esc(art)}" alt="" width="64" height="64" onerror="window.playSpriteOnError && window.playSpriteOnError(this)">` : ""}
            <div>
              <p class="eyebrow">${esc(root.playSpecialStatusLabel?.(row.status) || row.status)} · ${esc(root.playSpecialTypeLabel?.(row.eventType) || row.eventType)}</p>
              <h3>${esc(row.title)}</h3>
              <p>${esc(props)}</p>
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

    function readForm() {
      draft.title = byId("se-title")?.value || draft.title;
      draft.subtitle = byId("se-sub")?.value || draft.subtitle;
      draft.announcement = byId("se-ann")?.value || draft.announcement;
      draft.eventType = byId("se-type")?.value || draft.eventType;
      draft.visibility = byId("se-vis")?.value || draft.visibility;
      draft.variantPolicy = byId("se-shiny")?.value || draft.variantPolicy;
      if (byId("se-form")) draft.formId = Number(byId("se-form").value) || draft.dex;
      if (byId("se-gender")) draft.gender = byId("se-gender").value || draft.gender;
      if (byId("se-species")) {
        const next = Number(byId("se-species").value);
        if (next && next !== Number(draft.dex)) applySpecies(next, false);
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
      // Ensure current species remains valid for filter; if not, keep draft but list still works.
      renderHealth();
      renderToolbar();
      renderForm();
      renderList();
      const grid = byId("special-species");
      if (grid) {
        grid.hidden = true;
        grid.innerHTML = "";
      }
    }

    host.addEventListener("input", (event) => {
      if (event.target.id === "special-q") {
        pickQ = event.target.value || "";
        const sel = byId("se-species");
        if (sel) sel.innerHTML = speciesOptionsHtml();
      }
    });

    host.addEventListener("change", (event) => {
      if (event.target.id === "special-filter") {
        pickFilter = event.target.value || "all";
        const sel = byId("se-species");
        if (sel) sel.innerHTML = speciesOptionsHtml();
        return;
      }
      if (event.target.id === "se-species") {
        applySpecies(Number(event.target.value), false);
        renderForm();
        return;
      }
      if (event.target.id === "se-form") {
        draft.formId = Number(event.target.value) || draft.dex;
        draft.subtitle = typeof root.playFormDisplayName === "function"
          ? root.playFormDisplayName(draft.dex, draft.formId)
          : draft.subtitle;
        renderForm();
        return;
      }
      if (event.target.id === "se-gender") {
        draft.gender = event.target.value || draft.gender;
        renderForm();
        return;
      }
      if (event.target.id === "se-shiny") {
        draft.variantPolicy = event.target.value || draft.variantPolicy;
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
        draft = {
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
          dex: draft.dex,
          formId: draft.formId,
          gender: draft.gender,
          variantPolicy: draft.variantPolicy,
          shiny: draft.variantPolicy === "FORCED_SHINY",
          title: draft.title,
          eventType: draft.eventType,
          startsAt: fromLocalInput(draft.startsAtLocal) || undefined,
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
      const name = actBtn.dataset.seName || draft.title || draft.subtitle || "this event";
      if (act === "save") {
        await cmd("save", payloadFromDraft());
        return;
      }
      if (act === "schedule") {
        await cmd("schedule", { ...payloadFromDraft(), id: id || undefined });
        return;
      }
      if (act === "delete") {
        const mon = actBtn.dataset.seMon || draft.subtitle || "Pokémon";
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
      await cmd(act, { id, confirm: true, ...payloadFromDraft() }, danger);
    });

    applySpecies(draft.dex, true);
    load();
  };
})();
