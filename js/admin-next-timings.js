(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PLAY_ADMIN_TIMINGS = api;
})(typeof window === "undefined" ? globalThis : window, function () {
  "use strict";
  const fields=Object.freeze({joinSeconds:"Joining window",prepareSeconds:"Preparation window",throwSeconds:"Throwing window",revealSeconds:"Results display"});
  const limits=Object.freeze(Object.fromEntries(Object.keys(fields).map(k=>[k,[5,180,1]])));
  const descriptions={joinSeconds:"Seconds to join an encounter.",prepareSeconds:"Seconds to prepare before throwing.",throwSeconds:"Seconds for the throwing phase.",revealSeconds:"Seconds to display the outcome."};
  const commands = Object.freeze(["admin_encounter_timings_read", "admin_encounter_timings_save"]);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function amount(value,key){if(!Object.hasOwn(fields,key)||typeof value!=="number"||!Number.isInteger(value)||value<5||value>180)throw Error("Use whole seconds from 5 to 180.");return value;}
  function project(raw) {
    if (raw?.ok !== true || !raw.config || typeof raw.config !== "object" || !/^[a-f0-9]{32}$/.test(raw.revision||"")) throw Error("Configuration unavailable.");
    return Object.fromEntries(Object.keys(fields).map(key => [key, amount(raw.config[key],key)]));
  }
  function patch(current, draft) {
    if (!current || !draft || Object.keys(draft).some(key => !Object.hasOwn(fields, key))) throw Error("Unsupported timing.");
    const next = {};
    for (const key of Object.keys(fields)) {
      if (!/^\d+(?:\.\d+)?$/.test(String(draft[key]))) throw Error("Enter a valid timing.");
      const value = amount(Number(draft[key]),key);
      if (value !== amount(current[key],key)) next[key] = value;
    }
    return next;
  }
  function adapter({ session, identity, allowed, call }) {
    return async (command, args) => {
      if (!commands.includes(command)) throw Error("Unsupported configuration operation.");
      if (command === "admin_encounter_timings_save" && (!args || Object.keys(args).sort().join() !== "p_revision,p_settings" || !/^[a-f0-9]{32}$/.test(args.p_revision||"") || !args.p_settings || !Object.keys(args.p_settings).length || Object.keys(args.p_settings).some(key => !Object.hasOwn(fields, key)))) throw Error("Unsupported configuration payload.");
      if (command === "admin_encounter_timings_save") Object.entries(args.p_settings).forEach(([key,value])=>amount(value,key));
      const expected = identity(); let before; try { before=await session(); } catch (_) { throw Object.assign(Error('Staff session unavailable.'),{code:'42501',sent:false}); }
      if (!expected || !allowed() || before.error || before.data?.session?.user?.id !== expected || identity() !== expected) throw Object.assign(Error("Staff session changed."), { code: "42501" });
      const result = await call(command, command === "admin_encounter_timings_save" ? args : undefined);
      let after; try { after=await session(); } catch (_) { throw Object.assign(Error('Staff session unavailable.'),{code:'42501',sent:command===commands[1]}); }
      if (!allowed() || identity() !== expected || after.error || after.data?.session?.user?.id !== expected) throw Object.assign(Error("Staff session changed."), { code: "42501", sent:command===commands[1] });
      return result;
    };
  }
  function controller(transport, notify = () => {}) {
    let epoch = 0, active = false;
    const state = { phase: "closed", current: null, draft: null, revision:null, uncertain: false, message: "" };
    const emit = () => notify(state);
    function reset() { epoch++; active = false; Object.assign(state, { phase: "closed", current: null, draft: null, revision:null, uncertain: false, message: "" }); emit(); }
    function dirty() { return !!state.draft && Object.keys(fields).some(key => state.draft[key] !== String(state.current[key])); }
    async function load() {
      if (!active || ["loading", "saving"].includes(state.phase)) return;
      const request = ++epoch;
      Object.assign(state, { phase: "loading", current: null, draft: null, revision:null, uncertain: false, message: "Loading encounter timings…" }); emit();
      try {
        const raw = await transport("admin_encounter_timings_read");
        if (!active || request !== epoch) return;
        const current = project(raw); state.revision=raw.revision;
        Object.assign(state, { phase: "ready", current, draft: Object.fromEntries(Object.entries(current).map(([key, value]) => [key, String(value)])), message: "Current encounter timings loaded. Review changes before saving." });
      } catch (_) {
        if (!active || request !== epoch) return;
        Object.assign(state, { phase: "error", current: null, draft: null, message: "encounter timings unavailable or access denied. No defaults were substituted. Reload to try again." });
      }
      emit();
    }
    function review() { if (!active || state.phase !== "ready" || state.uncertain) throw Error("Reload timings before reviewing changes."); const changes=patch(state.current,state.draft); if(!Object.keys(changes).length)throw Error("No changes to review."); return Object.freeze({epoch,revision:state.revision,current:JSON.stringify(state.current),changes:JSON.stringify(changes)}); }
    async function save(reviewed) {
      if (!active || state.phase !== "ready" || state.uncertain) return;
      const changes = patch(state.current, state.draft);
      if (!Object.keys(changes).length) throw Error("No changes to review.");
      if(reviewed&&(reviewed.epoch!==epoch||reviewed.revision!==state.revision||reviewed.current!==JSON.stringify(state.current)||reviewed.changes!==JSON.stringify(changes)))throw Error("Timings changed after review. Review them again before saving.");
      const request = epoch;
      state.phase = "saving"; state.message = "Saving once…"; let sent=false;
      try {
        emit(); sent=true;
        const receipt = await transport("admin_encounter_timings_save", { p_revision:state.revision,p_settings: changes });
        if (!active || request !== epoch) return;
        const returned = project(receipt);if(typeof receipt.commandQueued!=="boolean")throw Error("Unconfirmed timing receipt.");
        if (Object.keys(changes).some(key => returned[key] !== changes[key])) throw Error("Unconfirmed receipt.");
        state.message = receipt.commandQueued?"Timings saved; a stream PC settings update was queued. Reload to verify.":"Timings saved on Play. No stream PC connection is configured. Reload to verify.";
      } catch (error) {
        if (!active || request !== epoch) return;
        if(!sent){state.phase="ready";state.uncertain=false;state.message="Nothing was sent. Review your changes again before saving.";try{emit();}catch(_){}return;}
        if (["42501", "401", "403"].includes(String(error?.code || error?.status))) {
          Object.assign(state, { phase: "error", current: null, draft: null, revision:null, uncertain: error.sent===true, message: error.sent===true?"Save could not be confirmed after the staff session changed. Do not retry; reload and inspect stored timings.":"Access denied or session changed before saving. Configuration data was cleared. Reload after checking your staff access." }); try{emit();}catch(_){} return;
        }
        state.message = String(error?.code)==="40001"?"Encounter timings changed since loading. Reload and review again.":"Save could not be confirmed. Do not retry: reload and compare the stored settings first. Your local draft remains below.";
      }
      state.phase = "ready"; state.uncertain = true; try{emit();}catch(_){}
    }
    return { state, reset, dirty, load, review, save, open() { active = true; return load(); } };
  }
  function mount(root, transport) {
    if (!root) return null;
    let returnFocus = null, activeDialog = null;
    const ui = controller(transport, render);
    function render() {
      const s = ui.state, focused = root.contains(root.ownerDocument.activeElement) && s.phase !== "closed";
      root.querySelector("dialog")?.close();
      root.innerHTML = `<p class="config-status" role="status" tabindex="-1">${esc(s.message)}</p><button type="button" data-timings-reload ${["loading", "saving"].includes(s.phase) ? "disabled" : ""}>${s.phase==='closed'?'Load':'Reload'} encounter timings</button>${s.draft ? `<form data-timings-form><fieldset ${s.phase === "saving" || s.uncertain ? "disabled" : ""}><div class="config-fields">${Object.entries(fields).map(([key, label]) => `<label>${esc(label)}<input type="number" name="${key}" value="${esc(s.draft[key])}" min="${limits[key][0]}" max="${limits[key][1]}" step="${limits[key][2]}" required><small>${esc(descriptions[key])}</small></label>`).join("")}</div><p role="alert" data-timings-validation></p><div class="config-actions"><button type="button" data-timings-discard>Discard local edits</button><button type="submit">Review changes</button></div></fieldset></form>` : ""}`;
      if (focused) root.querySelector(".config-status")?.focus({ preventScroll: true });
    }
    function dialog(title, content, action, label) {
      if(activeDialog)return; const stamp=JSON.stringify(ui.state);
      returnFocus = root.ownerDocument.activeElement;
      const dlg = root.ownerDocument.createElement("dialog"); dlg.className = "config-dialog"; activeDialog=dlg;
      dlg.setAttribute("aria-labelledby", "timings-dialog-title");
      dlg.innerHTML = `<h3 id="timings-dialog-title">${esc(title)}</h3>${content}<div class="config-actions"><button type="button" data-timings-cancel autofocus>Back to editing</button><button type="button" data-timings-confirm>${esc(label)}</button></div>`;
      root.append(dlg); dlg.querySelector("[data-timings-cancel]").onclick = () => dlg.close();
      dlg.querySelector("[data-timings-confirm]").onclick = async () => { if(activeDialog!==dlg||!dlg.open)return; if(stamp!==JSON.stringify(ui.state)){dlg.close();const output=root.querySelector("[data-timings-validation]");if(output)output.textContent="This draft changed after review. Review it again before continuing.";return;}dlg.close();try{await action();}catch(error){const output=root.querySelector("[data-timings-validation]");if(output)output.textContent=error.message;} };
      dlg.onclose = () => { dlg.remove(); if(activeDialog===dlg)activeDialog=null; if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true }); };
      dlg.showModal(); if (dlg.scrollHeight > dlg.clientHeight) { const heading = dlg.querySelector('h3'); heading.tabIndex = -1; heading.focus({ preventScroll: true }); dlg.scrollTop = 0; }
    }
    root.addEventListener("input", event => {
      if (ui.state.phase === "ready" && !ui.state.uncertain && Object.hasOwn(fields, event.target.name)) ui.state.draft[event.target.name] = event.target.value;
    });
    root.addEventListener("click", event => {
      const reload = event.target.closest("[data-timings-reload]"), discard = event.target.closest("[data-timings-discard]");
      if (!reload && !discard) return;
      const action = () => reload ? (ui.state.phase === "closed" ? ui.open() : ui.load()) : (Object.assign(ui.state.draft, Object.fromEntries(Object.entries(ui.state.current).map(([key, value]) => [key, String(value)]))), render());
      if (ui.dirty()&&!ui.state.uncertain) dialog("Discard this local draft?", "<p>Unsaved edits will be lost. Reloading reads the stored settings; it does not repeat a save.</p>", action, "Discard and continue");
      else action();
    });
    root.addEventListener("submit", event => {
      if (!event.target.matches("[data-timings-form]")) return; event.preventDefault();
      try {
        const reviewed=ui.review(),changes = patch(ui.state.current, ui.state.draft);
        if (!Object.keys(changes).length) throw Error("No changes to review.");
        dialog("Review encounter timings", `<p>Applies to future encounters. If a stream PC connection exists, a settings update will be queued. This action does not start an encounter.</p><dl class="config-comparison">${Object.entries(changes).map(([key, value]) => `<div><dt>${esc(fields[key])}</dt><dd><span>Current: ${ui.state.current[key].toLocaleString("en-US")} seconds</span><strong>Proposed: ${value.toLocaleString("en-US")} seconds</strong></dd></div>`).join("")}</dl><p>Saving checks for changes made by other staff. Reload if the settings have changed.</p>`, () => ui.save(reviewed), "Save encounter timings");
      } catch (error) { root.querySelector("[data-timings-validation]").textContent = error.message; }
    });
    root.ownerDocument.defaultView.addEventListener("beforeunload", event => { if (ui.dirty()) { event.preventDefault(); event.returnValue = ""; } });
    render(); return ui;
  }
  return Object.freeze({ fields, limits, commands, amount, project, patch, adapter, controller, mount });
});
