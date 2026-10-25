(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PLAY_ADMIN_NEXT_CONFIG = api;
})(typeof window === "undefined" ? globalThis : window, function () {
  "use strict";
  const fields = Object.freeze({ participationReward: "Encounter participation", captureReward: "Successful capture", newDexReward: "New Pokédex entry", shinyReward: "Shiny capture", legendaryReward: "Legendary capture", streamAttendanceReward: "Stream attendance", rewardBonusCoins: "Pinap Berry bonus" });
  const commands = Object.freeze(["admin_economy_overview", "admin_economy_save"]);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function amount(value) {
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 2147483647) throw Error("Use whole PokéCoin amounts from 0 to 2,147,483,647.");
    return value;
  }
  function project(raw) {
    if (raw?.ok !== true || !raw.config || typeof raw.config !== "object") throw Error("Configuration unavailable.");
    return Object.fromEntries(Object.keys(fields).map(key => [key, amount(raw.config[key])]));
  }
  function patch(current, draft) {
    if (!current || !draft || Object.keys(draft).some(key => !Object.hasOwn(fields, key))) throw Error("Unsupported reward field.");
    const next = {};
    for (const key of Object.keys(fields)) {
      if (!/^\d+$/.test(String(draft[key]))) throw Error("Use whole PokéCoin amounts from 0 to 2,147,483,647.");
      const value = amount(Number(draft[key]));
      if (value !== amount(current[key])) next[key] = value;
    }
    return next;
  }
  function adapter({ session, identity, allowed, call }) {
    return async (command, args) => {
      if (!commands.includes(command)) throw Error("Unsupported configuration operation.");
      if (command === "admin_economy_save" && (!args || Object.keys(args).join() !== "p_balance" || !args.p_balance || !Object.keys(args.p_balance).length || Object.keys(args.p_balance).some(key => !Object.hasOwn(fields, key)))) throw Error("Unsupported configuration payload.");
      if (command === "admin_economy_save") Object.values(args.p_balance).forEach(amount);
      const expected = identity(), before = await session();
      if (!expected || !allowed() || before.error || before.data?.session?.user?.id !== expected || identity() !== expected) throw Object.assign(Error("Staff session changed."), { code: "42501" });
      const result = await call(command, command === "admin_economy_save" ? args : undefined);
      const after = await session();
      if (!allowed() || identity() !== expected || after.error || after.data?.session?.user?.id !== expected) throw Object.assign(Error("Staff session changed."), { code: "42501" });
      return result;
    };
  }
  function controller(transport, notify = () => {}) {
    let epoch = 0, active = false;
    const state = { phase: "closed", current: null, draft: null, uncertain: false, message: "" };
    const emit = () => notify(state);
    function reset() { epoch++; active = false; Object.assign(state, { phase: "closed", current: null, draft: null, uncertain: false, message: "" }); emit(); }
    function dirty() { return !!state.draft && Object.keys(fields).some(key => state.draft[key] !== String(state.current[key])); }
    async function load() {
      if (!active || ["loading", "saving"].includes(state.phase)) return;
      const request = ++epoch;
      Object.assign(state, { phase: "loading", current: null, draft: null, uncertain: false, message: "Loading reward configuration…" }); emit();
      try {
        const raw = await transport("admin_economy_overview");
        if (!active || request !== epoch) return;
        const current = project(raw);
        Object.assign(state, { phase: "ready", current, draft: Object.fromEntries(Object.entries(current).map(([key, value]) => [key, String(value)])), message: "Current reward amounts loaded. Review changes before saving." });
      } catch (_) {
        if (!active || request !== epoch) return;
        Object.assign(state, { phase: "error", current: null, draft: null, message: "Reward configuration unavailable or access denied. No defaults were substituted. Reload to try again." });
      }
      emit();
    }
    async function save() {
      if (!active || state.phase !== "ready" || state.uncertain) return;
      const changes = patch(state.current, state.draft);
      if (!Object.keys(changes).length) throw Error("No changes to review.");
      const request = epoch;
      state.phase = "saving"; state.message = "Saving once…"; emit();
      try {
        const receipt = await transport("admin_economy_save", { p_balance: changes });
        if (!active || request !== epoch) return;
        const returned = project(receipt);
        if (Object.keys(changes).some(key => returned[key] !== changes[key])) throw Error("Unconfirmed receipt.");
        state.message = "Save acknowledged. Reload to verify the stored reward settings before editing again.";
      } catch (error) {
        if (!active || request !== epoch) return;
        if (["42501", "401", "403"].includes(String(error?.code || error?.status))) {
          Object.assign(state, { phase: "error", current: null, draft: null, uncertain: false, message: "Access denied or session changed. Configuration data was cleared. Reload after checking your staff access." }); emit(); return;
        }
        state.message = "Save could not be confirmed. Do not retry: reload and compare the stored settings first. Your local draft remains below.";
      }
      state.phase = "ready"; state.uncertain = true; emit();
    }
    return { state, reset, dirty, load, save, open() { active = true; return load(); } };
  }
  function mount(root, transport) {
    if (!root) return null;
    let returnFocus = null;
    const ui = controller(transport, render);
    function render() {
      const s = ui.state, focused = root.contains(root.ownerDocument.activeElement) && s.phase !== "closed";
      root.querySelector("dialog")?.close();
      root.innerHTML = `<p class="config-status" role="status" tabindex="-1">${esc(s.message)}</p><button type="button" data-config-reload ${["closed", "loading", "saving"].includes(s.phase) ? "disabled" : ""}>Reload reward settings</button>${s.draft ? `<form data-config-form><fieldset ${s.phase === "saving" || s.uncertain ? "disabled" : ""}><div class="config-fields">${Object.entries(fields).map(([key, label]) => `<label>${esc(label)}<input type="number" name="${key}" value="${esc(s.draft[key])}" min="0" max="2147483647" step="1" required><small>PokéCoins · existing reward amount</small></label>`).join("")}</div><p role="alert" data-config-validation></p><div class="config-actions"><button type="button" data-config-discard>Discard local edits</button><button type="submit">Review changes</button></div></fieldset></form>` : ""}`;
      if (focused) root.querySelector(".config-status")?.focus({ preventScroll: true });
    }
    function dialog(title, content, action, label) {
      returnFocus = root.ownerDocument.activeElement;
      const dlg = root.ownerDocument.createElement("dialog"); dlg.className = "config-dialog";
      dlg.setAttribute("aria-labelledby", "config-dialog-title");
      dlg.innerHTML = `<h3 id="config-dialog-title">${esc(title)}</h3>${content}<div class="config-actions"><button type="button" data-config-cancel autofocus>Back to editing</button><button type="button" data-config-confirm>${esc(label)}</button></div>`;
      root.append(dlg); dlg.querySelector("[data-config-cancel]").onclick = () => dlg.close();
      dlg.querySelector("[data-config-confirm]").onclick = () => { dlg.close(); action(); };
      dlg.onclose = () => { dlg.remove(); if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true }); };
      dlg.showModal(); if (dlg.scrollHeight > dlg.clientHeight) { const heading = dlg.querySelector('h3'); heading.tabIndex = -1; heading.focus({ preventScroll: true }); dlg.scrollTop = 0; }
    }
    root.addEventListener("input", event => {
      if (ui.state.phase === "ready" && !ui.state.uncertain && Object.hasOwn(fields, event.target.name)) ui.state.draft[event.target.name] = event.target.value;
    });
    root.addEventListener("click", event => {
      const reload = event.target.closest("[data-config-reload]"), discard = event.target.closest("[data-config-discard]");
      if (!reload && !discard) return;
      const action = () => reload ? ui.load() : (Object.assign(ui.state.draft, Object.fromEntries(Object.entries(ui.state.current).map(([key, value]) => [key, String(value)]))), render());
      if (ui.dirty()) dialog("Discard this local draft?", "<p>Unsaved edits will be lost. Reloading reads the stored settings; it does not repeat a save.</p>", action, "Discard and continue");
      else action();
    });
    root.addEventListener("submit", event => {
      if (!event.target.matches("[data-config-form]")) return; event.preventDefault();
      try {
        const changes = patch(ui.state.current, ui.state.draft);
        if (!Object.keys(changes).length) throw Error("No changes to review.");
        dialog("Review reward changes", `<p>This updates site-wide reward rules. It does not grant PokéCoins or repair past rewards.</p><dl class="config-comparison">${Object.entries(changes).map(([key, value]) => `<div><dt>${esc(fields[key])}</dt><dd><span>Current: ${ui.state.current[key].toLocaleString("en-US")} PokéCoins</span><strong>Proposed: ${value.toLocaleString("en-US")} PokéCoins</strong></dd></div>`).join("")}</dl><p>Another staff member may have edited since loading. This editor does not lock settings. Save once, then reload to verify.</p>`, () => ui.save(), "Save reward settings");
      } catch (error) { root.querySelector("[data-config-validation]").textContent = error.message; }
    });
    root.ownerDocument.defaultView.addEventListener("beforeunload", event => { if (ui.dirty()) { event.preventDefault(); event.returnValue = ""; } });
    render(); return ui;
  }
  return Object.freeze({ fields, commands, amount, project, patch, adapter, controller, mount });
});
