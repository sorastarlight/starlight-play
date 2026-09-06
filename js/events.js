(() => {
  const supabase = window.playSupabase;
  const els = {
    title: document.getElementById("cal-title"),
    calendar: document.getElementById("calendar"),
    list: document.getElementById("event-list"),
    status: document.getElementById("event-status"),
    prev: document.getElementById("cal-prev"),
    next: document.getElementById("cal-next"),
    staff: document.getElementById("event-staff"),
    save: document.getElementById("event-save"),
    saveStatus: document.getElementById("event-save-status"),
    eventTitle: document.getElementById("event-title"),
    kind: document.getElementById("event-kind"),
    start: document.getElementById("event-start"),
    end: document.getElementById("event-end"),
    blurb: document.getElementById("event-blurb")
  };
  let cursor = new Date();
  cursor.setDate(1);
  let events = [];
  let isAdmin = false;

  window.playBindAccountNav();

  function monthLabel(date) {
    return date.toLocaleString(undefined, { month: "long", year: "numeric" });
  }

  function ymd(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function dayEvents(date) {
    const key = ymd(date);
    return events.filter((event) => {
      const start = new Date(event.startsAt);
      const end = event.endsAt ? new Date(event.endsAt) : start;
      const from = ymd(start);
      const to = ymd(end);
      return key >= from && key <= to;
    });
  }

  function renderCalendar() {
    els.title.textContent = monthLabel(cursor);
    const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const skip = start.getDay();
    const days = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const cells = [];
    ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach((name) => {
      cells.push(`<div class="cal-dow">${name}</div>`);
    });
    for (let i = 0; i < skip; i += 1) cells.push(`<div class="cal-day empty"></div>`);
    for (let day = 1; day <= days; day += 1) {
      const date = new Date(cursor.getFullYear(), cursor.getMonth(), day);
      const listed = dayEvents(date);
      const marks = listed.map((event) => `<i class="cal-dot ${event.kind}" title="${event.title}"></i>`).join("");
      cells.push(`<div class="cal-day${listed.length ? " has-event" : ""}"><strong>${day}</strong><span>${marks}</span></div>`);
    }
    els.calendar.innerHTML = cells.join("");
  }

  function kindLabel(kind) {
    return ({ community: "Community", shiny: "Shiny hunt", raid: "Raid", stream: "Stream", other: "Event" })[kind] || "Event";
  }

  function renderList() {
    if (!events.length) {
      els.status.textContent = "No upcoming events posted yet.";
      els.list.innerHTML = "";
      return;
    }
    els.status.textContent = `${events.length} event${events.length === 1 ? "" : "s"}`;
    els.list.innerHTML = events.map((event) => {
      const when = new Date(event.startsAt).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
      const remove = isAdmin ? `<button type="button" class="secondary" data-del="${event.id}">Remove</button>` : "";
      return `<article class="event-card">
        <span class="chip">${kindLabel(event.kind)}</span>
        <strong>${event.title}</strong>
        <p>${when}</p>
        <p class="muted">${event.blurb || ""}</p>
        ${remove}
      </article>`;
    }).join("");
  }

  async function loadNav() {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session) {
      window.playSetAccountNav(null);
      return;
    }
    const { data: profile } = await supabase.from("profiles").select("display_name, twitch_login, avatar_url").eq("id", session.user.id).maybeSingle();
    let extras = {};
    try {
      const snapshot = await window.playCall("play_state");
      extras = { isAdmin: Boolean(snapshot?.isAdmin), trainer: snapshot?.trainer };
    } catch (_) {}
    window.playSetAccountNav(session, profile, extras);
  }

  async function load() {
    await loadNav();
    try {
      const data = await window.playCall("play_events");
      events = data?.events || [];
      isAdmin = Boolean(data?.isAdmin);
      els.staff.hidden = !isAdmin;
      renderCalendar();
      renderList();
    } catch (error) {
      els.status.textContent = window.playRpcError(error, "Events calendar is not live yet.");
    }
  }

  els.prev.addEventListener("click", () => {
    cursor.setMonth(cursor.getMonth() - 1);
    renderCalendar();
  });
  els.next.addEventListener("click", () => {
    cursor.setMonth(cursor.getMonth() + 1);
    renderCalendar();
  });
  els.save.addEventListener("click", async () => {
    els.saveStatus.textContent = "Saving…";
    try {
      const data = await window.playCall("admin_save_event", {
        p_id: null,
        p_title: els.eventTitle.value,
        p_blurb: els.blurb.value,
        p_kind: els.kind.value,
        p_starts_at: els.start.value ? new Date(els.start.value).toISOString() : null,
        p_ends_at: els.end.value ? new Date(els.end.value).toISOString() : null
      });
      els.saveStatus.textContent = data.message || "Saved.";
      els.eventTitle.value = "";
      els.blurb.value = "";
      await load();
    } catch (error) {
      els.saveStatus.textContent = window.playRpcError(error);
    }
  });
  els.list.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-del]");
    if (!button) return;
    try {
      await window.playCall("admin_delete_event", { p_id: button.dataset.del });
      await load();
    } catch (error) {
      els.status.textContent = window.playRpcError(error);
    }
  });

  supabase.auth.onAuthStateChange((event) => { if (window.playAuthNoise(event)) return; load(); });
  load();
})();
