(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PLAY_ADMIN_NEXT_ANALYTICS = api;
})(typeof window === "undefined" ? globalThis : window, function () {
  "use strict";
  const commands = Object.freeze({ captures: "admin_capture_report", progression: "admin_progression_overview", evolution: "admin_collection_overview", economy: "admin_economy_overview" });
  const titles = Object.freeze({ health: "Health", captures: "Captures", progression: "Progression", evolution: "Evolution & Trading", economy: "Economy" });
  const contexts = Object.freeze({
    captures: "Capture counts and rates use this window. Retained QA activity is included by the existing report. Collection totals are not part of this window.",
    progression: "Current all-account snapshot, including staff and QA profiles. Recorded species use catch records, not current ownership or a living Pokédex.",
    evolution: "Evolution totals use retained history; Candy and open listings are current. Direct trade requests include every status, including pending requests, and exclude GTS exchanges.",
    economy: "Balances are current. Today uses the game’s configured time zone; retained all-time ledger totals are separate. This report is not a full accounting invariant check."
  });
  const esc = value => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  const number = value => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
  const format = value => value === null ? "Unavailable" : value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  const rate = value => number(value) !== null && value <= 1 ? `${(value * 100).toFixed(1)}%` : "—";
  function validDays(value) { return Number.isInteger(value) && value >= 1 && value <= 365; }
  function accessError() { return Object.assign(Error("Staff session changed."), { code: "REPORT_ACCESS_CHANGED" }); }
  // The adapter accepts no generic RPC name or unreviewed arguments. Server authorization remains authoritative.
  function adapter({ session, identity, allowed, call }) {
    return async function read(view, days) {
      if (!Object.hasOwn(commands, view) || (view === "captures" && !validDays(days))) throw Error("Unsupported report request.");
      const expected = identity();
      const check = await session();
      if (!expected || !allowed() || check.error || check.data?.session?.user?.id !== expected || identity() !== expected) throw accessError();
      let result;
      try { result = await call(commands[view], view === "captures" ? { p_days: days } : undefined); }
      catch (error) { if (error?.code === "42501" || /permission denied|not allowed/i.test(error?.message || "")) throw accessError(); throw error; }
      const after = await session();
      if (!allowed() || identity() !== expected || after.error || after.data?.session?.user?.id !== expected) throw accessError();
      return result;
    };
  }
  function project(view, raw) {
    if (!raw || typeof raw !== "object" || raw.ok !== true) throw Error("Report unavailable.");
    const cards = [], tables = [];
    const add = (label, value, scope) => cards.push({ label, value: number(value), scope });
    const distribution = (title, object, keys) => tables.push({ title, headings: ["Range", "Trainers"], rows: keys.map(key => [key === "51-100" ? "51+" : key, format(number(object?.[key]))]) });
    if (view === "captures") {
      add("Throws", raw.overall?.throws, "Selected capture window");
      add("Successful catches", raw.overall?.caught, "Selected capture window");
      cards.push({ label: "Capture success", text: rate(raw.overall?.rate), value: number(raw.overall?.rate), scope: "Unavailable when no throws are recorded" });
      for (const [key, title, label] of [["bySpecies", "By Pokémon", "name"], ["byBall", "By Poké Ball", "name"], ["byBerry", "By berry", "name"], ["byCatchRateTier", "By catch-rate tier", "tier"]]) {
        tables.push({ title, headings: [title.replace(/^By /, ""), "Throws", "Catches", "Success"], rows: Array.isArray(raw[key]) ? raw[key].map(row => [typeof row?.[label] === "string" ? row[label] : "Unavailable", format(number(row?.throws)), format(number(row?.caught)), rate(row?.rate)]) : null });
      }
    } else if (view === "progression") {
      add("Registered trainers", raw.trainers, "All profiles, not recently active players");
      add("Average trainer level", raw.averageLevel, "Current profile XP converted to level");
      add("Median trainer level", raw.medianLevel, "Current profile population");
      add("Average recorded species", raw.averageSpecies, "Catch-record population; excludes profiles without catch records");
      distribution("Trainer levels", raw.levelBuckets, ["1-10", "11-25", "26-50", "51-100"]);
      distribution("Recorded species per profile", raw.dexDistribution, ["0-25", "26-50", "51-75", "76-100", "101-125", "126-140", "141-150", "151"]);
    } else if (view === "evolution") {
      add("Recorded evolutions", raw.evolutions, "Retained evolution log entries");
      add("Open GTS listings", raw.openGts, "Currently marked open");
      add("Direct trade requests", raw.directTrades, "Every status; excludes GTS exchanges");
      add("Evolution Candy held", raw.candyTotal, "Current balances across trainers");
      add("Trainers holding Candy", raw.candyTrainers, "Trainers with a positive Candy balance");
    } else if (view === "economy") {
      add("PokéCoins held", raw.circulation, "Current inventory balances");
      add("Average balance", raw.averageBalance, "Current inventories");
      add("Median balance", raw.medianBalance, "Current inventories");
      add("Created today", raw.createdToday, "Positive ledger entries · game time zone");
      add("Spent today", raw.spentToday, "Negative ledger entries · game time zone");
      add("Mart revenue today", raw.storeRevenueToday, "Store purchases · game time zone");
      add("Created, all time", raw.inflation?.created, "All retained positive ledger entries");
      add("Spent, all time", raw.inflation?.destroyed, "All retained negative ledger entries");
      distribution("Current PokéCoin balances", raw.distribution, ["0-499", "500-999", "1000-2499", "2500-4999", "5000-9999", "10000+"]);
    } else throw Error("Unsupported report.");
    const since = view === "captures" && typeof raw.since === "string" && Number.isFinite(Date.parse(raw.since)) ? new Date(raw.since).toISOString() : null;
    const partial = cards.some(card => card.value === null && !(view === "captures" && card.label === "Capture success" && raw.overall?.throws === 0)) || tables.some(table => table.rows === null || table.rows.some(row => row.includes("Unavailable"))) || (view === "captures" && !since);
    // Deliberately return no raw report, configuration, account identity or recent trainer names.
    return { cards, tables, since, partial };
  }
  function controller(read, update = () => {}) {
    let epoch = 0, serial = 0, active = false;
    const state = { view: "health", days: 30, phase: "closed", report: null, observed: null };
    const cache = new Map();
    async function load(force = false) {
      if (!active || state.view === "health") return;
      if (state.phase === "loading" && !force) return;
      // Refresh is single-flight; changing view/range invalidates that request separately.
      if (state.phase === "loading") return;
      const key = `${state.view}:${state.days}`, cached = cache.get(key);
      if (cached && !force) { Object.assign(state, cached); update(state); return; }
      const currentEpoch = epoch, request = ++serial, view = state.view, days = state.days;
      Object.assign(state, { phase: "loading", report: null, observed: null }); update(state);
      try {
        const raw = await read(view, days);
        if (!active || epoch !== currentEpoch || request !== serial) return;
        const report = project(view, raw);
        const result = { phase: report.partial ? "partial" : "ready", report, observed: new Date().toISOString() };
        cache.set(key, result); Object.assign(state, result);
      } catch (error) {
        if (!active || epoch !== currentEpoch || request !== serial) return;
        if (error?.code === "REPORT_ACCESS_CHANGED") cache.clear();
        Object.assign(state, { phase: "error", report: null, observed: null });
      }
      update(state);
    }
    return { state, open() { active = true; if (state.phase === "closed") state.phase = "idle"; update(state); return load(); },
      select(view) { if (!Object.hasOwn(titles, view) || !active) return; if (view === state.view) return load(); serial++; Object.assign(state, { view, phase: "idle", report: null, observed: null }); update(state); return load(); },
      range(days) { if (!validDays(days)) return false; if (days === state.days) return true; serial++; Object.assign(state, { days, phase: "idle", report: null, observed: null }); if (state.view === "captures") load(); return true; },
      refresh() { return load(true); }, reset() { epoch++; serial++; active = false; cache.clear(); Object.assign(state, { view: "health", days: 30, phase: "closed", report: null, observed: null }); update(state); } };
  }
  function mount(root, read, health, openHealth) {
    if (!root || !health) return null;
    root.innerHTML = `<div class="analytics-tabs" role="tablist" aria-label="Game reports">${Object.entries(titles).map(([key, title]) => `<button type="button" role="tab" id="report-tab-${key}" aria-controls="${key === "health" ? "next-analytics-health" : "report-panel"}" data-report="${key}" aria-selected="${key === "health"}" tabindex="${key === "health" ? 0 : -1}">${esc(title)}</button>`).join("")}</div><section id="report-panel" role="tabpanel" tabindex="0" hidden><h3 id="report-heading"></h3><p class="analytics-context"></p><form class="analytics-toolbar"><label>Capture range (days)<input name="days" type="number" min="1" max="365" step="1" required value="30"></label><button type="submit">Apply range</button><button type="button" data-refresh>Refresh report</button></form><p class="analytics-status" role="status"></p><div class="analytics-results"></div></section>`;
    const panel = root.querySelector("#report-panel"), form = root.querySelector("form"), input = form.elements.days;
    const status = root.querySelector(".analytics-status"), results = root.querySelector(".analytics-results"), refresh = root.querySelector("[data-refresh]");
    health.setAttribute("role", "tabpanel"); health.setAttribute("aria-labelledby", "report-tab-health"); health.tabIndex = 0;
    const ui = controller(read, state => {
      health.hidden = state.view !== "health"; panel.hidden = state.view === "health";
      const focusedTab = root.contains(root.ownerDocument.activeElement) && root.ownerDocument.activeElement.matches?.("[data-report]") ? root.ownerDocument.activeElement.dataset.report : null;
      root.querySelectorAll("[data-report]").forEach(button => { const selected = button.dataset.report === state.view; button.setAttribute("aria-selected", String(selected)); button.tabIndex = (focusedTab ? button.dataset.report === focusedTab : selected) ? 0 : -1; });
      panel.setAttribute("aria-labelledby", `report-tab-${state.view}`);
      root.querySelector("#report-heading").textContent = titles[state.view]; root.querySelector(".analytics-context").textContent = contexts[state.view] || "";
      form.querySelector("label").hidden = state.view !== "captures"; form.querySelector("[type=submit]").hidden = state.view !== "captures";
      refresh.setAttribute("aria-disabled", String(state.phase === "loading")); panel.setAttribute("aria-busy", String(state.phase === "loading"));
      status.textContent = state.phase === "loading" ? "Loading report…" : state.phase === "error" ? "Report unavailable. Refresh to try again; no values have been substituted with zero." : state.report ? `${state.report.partial ? "Partial report. Some values are unavailable. " : ""}Retrieved ${state.observed} (browser clock).${state.view === "captures" ? ` Requested range: ${state.days} days. Server window starts ${state.report.since || "Unavailable"}.` : ""}` : "No report loaded.";
      results.innerHTML = state.report ? `<div class="analytics-metrics">${state.report.cards.map(card => `<article class="analytics-metric"><p>${esc(card.label)}</p><strong>${esc(card.text ?? format(card.value))}</strong><small>${esc(card.scope)}</small></article>`).join("")}</div>${state.report.tables.map(table => `<div class="analytics-table-wrap"><table><caption>${esc(table.title)}</caption><thead><tr>${table.headings.map(heading => `<th scope="col">${esc(heading)}</th>`).join("")}</tr></thead><tbody>${table.rows === null ? `<tr><td colspan="${table.headings.length}">Unavailable</td></tr>` : table.rows.length ? table.rows.map(row => `<tr>${row.map(cell => `<td>${esc(cell)}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${table.headings.length}">No recorded activity in this window.</td></tr>`}</tbody></table></div>`).join("")}` : "";
    });
    root.querySelector("[role=tablist]").addEventListener("click", event => { const button = event.target.closest("[data-report]"); if (!button) return; ui.select(button.dataset.report); if (button.dataset.report === "health") openHealth(); });
    root.querySelector("[role=tablist]").addEventListener("keydown", event => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const buttons = [...root.querySelectorAll("[data-report]")], index = buttons.indexOf(event.target);
      if (index < 0) return;
      const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : event.key === "ArrowRight" ? (index + 1) % buttons.length : event.key === "ArrowLeft" ? (index + buttons.length - 1) % buttons.length : -1;
      if (next >= 0) { event.preventDefault(); buttons.forEach((button, i) => { button.tabIndex = i === next ? 0 : -1; }); buttons[next].focus(); }
    });
    form.addEventListener("submit", event => { event.preventDefault(); if (form.reportValidity()) ui.range(Number(input.value)); });
    refresh.addEventListener("click", () => ui.refresh());
    ui.reset();
    return { state: ui.state, open() { ui.open(); if (ui.state.view === "health") openHealth(); }, reset() { input.value = "30"; ui.reset(); } };
  }
  return Object.freeze({ commands, adapter, project, controller, mount, esc });
});
