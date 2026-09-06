(() => {
  const supabase = window.playSupabase;
  const els = {
    gate: document.getElementById("gate"),
    app: document.getElementById("dex-app"),
    summary: document.getElementById("dex-summary"),
    grid: document.getElementById("dex-grid"),
    region: document.getElementById("filter-region"),
    gen: document.getElementById("filter-gen"),
    form: document.getElementById("filter-form"),
    gender: document.getElementById("filter-gender"),
    status: document.getElementById("filter-status")
  };
  let dexData = null;

  window.playBindAccountNav({
    onSignOut() {
      els.app.hidden = true;
      els.gate.hidden = false;
    }
  });

  function entryFor(dex, data) {
    const name = window.playSpeciesName(dex);
    const seenSet = new Set((data.seen || []).map(Number));
    const seen = seenSet.has(dex) || (data.caught || []).some((row) => Number(row.dex) === dex);
    const catches = (data.caught || []).filter((row) => row.dex === dex);
    const caught = catches.length > 0;
    const forms = {
      normal: catches.some((row) => !String(row.variant || "normal").includes("shiny") && row.variant !== "female"),
      female: catches.some((row) => row.variant === "female"),
      shiny: catches.some((row) => String(row.variant || "").includes("shiny"))
    };
    const genders = {
      Male: catches.some((row) => row.gender === "Male"),
      Female: catches.some((row) => row.gender === "Female"),
      Genderless: catches.some((row) => row.gender === "Genderless")
    };
    return { dex, name, seen, caught, forms, genders, catches };
  }

  function matches(entry) {
    const form = els.form.value;
    const gender = els.gender.value;
    const status = els.status.value;
    if (status === "caught" && !entry.caught) return false;
    if (status === "not-caught" && entry.caught) return false;
    if (status === "unseen" && entry.seen) return false;
    if (status === "owned-normal" && !entry.forms.normal) return false;
    if (status === "owned-shiny" && !entry.forms.shiny) return false;
    if (form === "normal" && entry.caught && !entry.forms.normal && !entry.forms.female) return false;
    if (form === "female" && !entry.forms.female) return false;
    if (form === "shiny" && !entry.forms.shiny) return false;
    if (gender !== "all" && !entry.genders[gender]) return false;
    return true;
  }

  function spriteFor(entry) {
    const form = els.form.value;
    if (form === "shiny" || (form === "all" && entry.forms.shiny && !entry.forms.normal)) {
      return window.playSpriteUrl(entry.dex, "shiny");
    }
    if (form === "female" || entry.forms.female && !entry.forms.normal) {
      return window.playSpriteUrl(entry.dex, "female");
    }
    return window.playSpriteUrl(entry.dex, "normal");
  }

  function render() {
    if (!dexData) return;
    const names = window.PLAY_SPECIES || [];
    const entries = names.map((_, index) => entryFor(index + 1, dexData));
    const visible = entries.filter(matches);
    const caught = entries.filter((row) => row.caught).length;
    const seen = entries.filter((row) => row.seen).length;
    els.summary.textContent = `${caught}/151 caught · ${seen} seen · ${151 - seen} not seen yet`;
    els.grid.innerHTML = visible.map((entry) => {
      const state = entry.caught ? "caught" : entry.seen ? "seen" : "unseen";
      const label = entry.caught ? entry.name : entry.seen ? `${entry.name}?` : "?????";
      const badges = [
        entry.forms.shiny ? `<span class="chip shiny">Shiny</span>` : "",
        entry.forms.female ? `<span class="chip">♀</span>` : ""
      ].join("");
      return `<article class="dex-cell ${state}" title="${entry.caught || entry.seen ? entry.name : "Not seen yet"}">
        <span class="dex-no">No. ${window.playPadDex(entry.dex)}</span>
        <img src="${spriteFor(entry)}" alt="" class="${state === "unseen" ? "silhouette" : ""}">
        <strong>${label}</strong>
        <span>${badges || (state === "unseen" ? "Not seen" : state === "seen" ? "Seen" : "Caught")}</span>
      </article>`;
    }).join("");
  }

  async function loadNav() {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session) {
      window.playSetAccountNav(null);
      return session;
    }
    const { data: profile } = await supabase.from("profiles").select("display_name, twitch_login, avatar_url").eq("id", session.user.id).maybeSingle();
    let extras = {};
    try {
      const snapshot = await window.playCall("play_state");
      extras = { isAdmin: Boolean(snapshot?.isAdmin), trainer: snapshot?.trainer };
    } catch (_) {}
    window.playSetAccountNav(session, profile, extras);
    return session;
  }

  async function load() {
    const session = await loadNav();
    if (!session) {
      els.app.hidden = true;
      els.gate.hidden = false;
      return;
    }
    try {
      dexData = await window.playCall("play_pokedex", { p_login: null });
      els.gate.hidden = true;
      els.app.hidden = false;
      render();
    } catch (error) {
      els.gate.hidden = false;
      els.app.hidden = true;
      els.gate.textContent = window.playRpcError(error, "Pokédex is not live yet.");
    }
  }

  ["region", "gen", "form", "gender", "status"].forEach((key) => {
    els[key].addEventListener("change", render);
  });
  supabase.auth.onAuthStateChange(() => { load(); });
  load();
})();
