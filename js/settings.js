(() => {
  const supabase = window.playSupabase;
  const els = {
    gate: document.getElementById("gate"),
    box: document.getElementById("settings"),
    login: document.getElementById("twitch-login"),
    status: document.getElementById("edit-status"),
    view: document.getElementById("view-id"),
    pass: document.getElementById("pass-status"),
    check: document.getElementById("check-pass"),
    lookImg: document.getElementById("trainer-look-img"),
    lookLabel: document.getElementById("trainer-look-label"),
    chooseLook: document.getElementById("choose-look"),
    lookStatus: document.getElementById("look-status"),
    team: document.getElementById("team-slots"),
    teamStatus: document.getElementById("team-status"),
    preview: document.getElementById("id-preview"),
    bgs: document.getElementById("card-bg-picks"),
    bgStatus: document.getElementById("bg-status"),
    favorites: document.getElementById("favorite-balls"),
    favoriteEmpty: document.getElementById("favorite-empty"),
    defaultPrep: document.getElementById("default-prep"),
    autoPrep: document.getElementById("auto-prep"),
    autoThrow: document.getElementById("auto-throw"),
    confirmRare: document.getElementById("confirm-rare"),
    saveEncounter: document.getElementById("save-encounter"),
    encounterStatus: document.getElementById("encounter-status"),
    perfPicks: document.getElementById("perf-picks"),
    perfStatus: document.getElementById("perf-status"),
    nameInput: document.getElementById("trainer-display-name"),
    nameSave: document.getElementById("save-display-name"),
    nameStatus: document.getElementById("name-status")
  };
  let card = null;
  let catches = [];
  let bag = {};
  let encounter = window.playEncounterSettings();
  let nameBusy = false;

  window.playBindAccountNav({
    onSignOut() {
      els.box.hidden = true;
      window.playRestoreGate(els.gate, "Sign in to edit your Trainer look and encounter settings.");
    }
  });

  function fillLook(nextCard) {
    const look = window.playTrainerLook(nextCard?.trainerSprite);
    if (els.lookImg) els.lookImg.src = window.playTrainerSpriteUrl(look.trainer.id);
    if (els.lookLabel) {
      const bits = [look.trainer.name, look.trainer.outfit, look.label, look.gender].filter(Boolean);
      els.lookLabel.textContent = bits.join(" · ");
    }
  }

  function fillPreview(nextCard) {
    if (els.preview) els.preview.innerHTML = nextCard ? window.playRenderIdCard(nextCard) : "";
  }

  function fillBgs(nextCard) {
    if (!els.bgs) return;
    const current = window.playCardBg(nextCard?.cardBg).id;
    const groups = [
      { title: "Regions", items: window.PLAY_CARD_BGS.filter((row) => row.group === "region") },
      { title: "Cute", items: window.PLAY_CARD_BGS.filter((row) => row.group === "cute") },
      { title: "Pride", items: window.PLAY_CARD_BGS.filter((row) => row.group === "pride") }
    ];
    els.bgs.innerHTML = groups.map((group) => `
      <div class="card-bg-group">
        <h3>${group.title}</h3>
        <div class="card-bg-picks">
          ${group.items.map((row) => `
            <button type="button" class="card-bg-opt" data-bg="${row.id}" aria-pressed="${row.id === current ? "true" : "false"}">
              <img src="${window.playCardBgUrl(row.id)}" alt="">
              <span>${row.name}</span>
            </button>`).join("")}
        </div>
      </div>`).join("");
  }

  function fillTeam(nextCard) {
    window.playRenderTeamSlots(els.team, nextCard?.team, { mine: true });
  }

  function fillEncounter(syncForm) {
    if (syncForm !== false) {
      encounter = window.playEncounterSettings(encounter);
      if (els.defaultPrep) els.defaultPrep.value = encounter.defaultPrep;
      if (els.autoPrep) els.autoPrep.checked = encounter.autoPrep;
      if (els.autoThrow) els.autoThrow.checked = encounter.autoThrow;
      if (els.confirmRare) els.confirmRare.checked = window.playConfirmRare?.() !== false;
    }
    if (!els.favorites) return;
    const owned = window.playOwnedBalls(bag);
    if (els.favoriteEmpty) els.favoriteEmpty.hidden = owned.length > 0;
    if (!owned.length) {
      els.favorites.innerHTML = "";
      return;
    }
    els.favorites.innerHTML = owned.map((row) => {
      const on = encounter.favoriteBalls.includes(row.key);
      const qty = Number(bag[row.key] || 0);
      return `<button type="button" class="ball-tile" data-fav="${row.key}" aria-pressed="${on ? "true" : "false"}">
        <img src="${window.playItemSprite(row.key)}" alt="">
        <strong>${row.name}</strong>
        <span class="muted">${qty} owned${on ? " · favorite" : ""}</span>
      </button>`;
    }).join("");
  }

  function fillPerf() {
    const pref = window.playPerfPref?.() || "auto";
    const mode = window.playPerfMode?.() || pref;
    els.perfPicks?.querySelectorAll("[name=perf-mode]").forEach((input) => {
      input.checked = input.value === pref;
    });
    if (els.perfStatus) {
      els.perfStatus.textContent = pref === "auto" ? `AUTO is using ${String(mode).toUpperCase()} on this device.` : `${String(pref).toUpperCase()} is on.`;
    }
  }

  function describePass(pass) {
    if (!pass) return "Sign in to check your pass.";
    const checked = pass.checkedAt ? ` Last checked ${new Date(pass.checkedAt).toLocaleString()}.` : "";
    if (pass.active) {
      if (pass.source === "twitch-sub") return `Starlight Pass is active from your Twitch subscription.${checked}`;
      if (pass.source === "admin") return `Starlight Pass is active (staff grant).${checked}`;
      if (pass.source === "broadcaster") return `Starlight Pass is active because this is the channel account.${checked}`;
      return `Starlight Pass is active.${checked}`;
    }
    return `No Starlight Pass yet. Subscribe on Twitch, then check again.${checked}`;
  }

  async function functionMessage(error, fallback) {
    try {
      const ctx = error?.context;
      if (ctx && typeof ctx.json === "function") {
        const body = await ctx.json();
        if (body?.message) return body.message;
      }
    } catch (_) {}
    if (String(error?.message || "").includes("non-2xx")) return fallback;
    return error?.message || fallback;
  }

  async function load() {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session) {
      window.playSetAccountNav(null);
      els.box.hidden = true;
      window.playRestoreGate(els.gate, "Sign in to edit your Trainer look and encounter settings.");
      return;
    }
    window.playSetLoadingGate(els.gate, els.box);
    if (window.playTrainerCatalogReady) await window.playTrainerCatalogReady;
    const { data: profile } = await supabase.from("profiles").select("display_name, twitch_login, avatar_url, username").eq("id", session.user.id).maybeSingle();
    const login = profile?.twitch_login || profile?.username || "";
    let extras = {};
    try {
      const snapshot = await window.playCall("play_state");
      extras = { isAdmin: Boolean(snapshot?.isAdmin), trainer: snapshot?.trainer, twitchLinked: snapshot?.twitchLinked };
      window._playOwnedAvatarPacks = snapshot?.ownedAvatarPacks || [];
      bag = snapshot?.bag || {};
      encounter = window.playEncounterSettings(snapshot?.encounterSettings);
      els.pass.textContent = describePass(snapshot?.pass);
    } catch (_) {
      els.pass.textContent = "Pass status is not available right now.";
    }
    window.playSetAccountNav(session, profile, extras);
    if (!login) {
      els.gate.textContent = "Sign in to edit your Trainer ID look and encounter settings.";
      els.box.hidden = true;
      els.gate.hidden = false;
      return;
    }
    try {
      const data = await window.playCall("play_trainer", { p_login: login });
      card = data.trainer;
      catches = data.catches || [];
    } catch (error) {
      els.gate.textContent = window.playRpcError(error, "Could not load your Trainer ID.");
      els.box.hidden = true;
      els.gate.hidden = false;
      return;
    }
    if (els.login) els.login.textContent = profile?.twitch_login ? `@${profile.twitch_login}` : "not linked";
    if (els.view) els.view.href = `./trainer.html?u=${encodeURIComponent(login)}`;
    if (els.nameInput && !els.nameInput.dataset.dirty) els.nameInput.value = card?.displayName || "";
    fillLook(card);
    fillTeam(card);
    fillBgs(card);
    fillPreview(card);
    fillEncounter();
    fillPerf();
    els.gate.hidden = true;
    els.box.hidden = false;
  }

  window.playBindTeamSlots(
    els.team,
    () => ({ team: card?.team || [], caught: catches }),
    async (ids) => {
      const data = await window.playCall("play_set_team", { p_catch_ids: ids });
      if (data?.trainer) card = data.trainer;
      else if (data?.team && card) card.team = data.team;
      fillTeam(card);
      fillPreview(card);
      return data;
    },
    els.teamStatus
  );

  els.nameInput?.addEventListener("input", (event) => {
    event.target.dataset.dirty = "1";
  });

  els.nameSave?.addEventListener("click", async () => {
    if (nameBusy) return;
    nameBusy = true;
    if (els.nameSave) els.nameSave.disabled = true;
    if (els.nameStatus) els.nameStatus.textContent = "Saving…";
    try {
      const data = await window.playCall("play_update_profile", {
        p_display_name: els.nameInput?.value || "",
        p_favorite_dex: card?.favoriteDex ?? null,
        p_favorite_variant: card?.favoriteVariant || "normal"
      });
      if (els.nameInput) els.nameInput.dataset.dirty = "";
      if (els.nameStatus) els.nameStatus.textContent = data?.message || "Display name saved. This name is used everywhere on Play.";
      if (typeof window.playToast === "function") {
        window.playToast({ kind: "success", title: "Profile updated", body: "Display name saved." });
      }
      await load();
    } catch (error) {
      if (els.nameStatus) els.nameStatus.textContent = window.playHumanRpcError
        ? window.playHumanRpcError(error, "Could not save that display name.")
        : window.playRpcError(error);
    } finally {
      nameBusy = false;
      if (els.nameSave) els.nameSave.disabled = false;
    }
  });

  els.bgs?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-bg]");
    if (!button) return;
    els.bgStatus.textContent = "Saving background…";
    try {
      const data = await window.playCall("play_set_card_bg", { p_bg: button.dataset.bg });
      if (data?.trainer) card = data.trainer;
      fillBgs(card);
      fillPreview(card);
      els.bgStatus.textContent = data.message || "Card background saved.";
    } catch (error) {
      els.bgStatus.textContent = window.playRpcError(error);
    }
  });

  els.chooseLook?.addEventListener("click", () => {
    window.playOpenTrainerPicker(card?.trainerSprite, async (id) => {
      els.lookStatus.textContent = "Saving look…";
      try {
        const data = await window.playCall("play_set_trainer_sprite", { p_sprite: id });
        if (data?.trainer) card = data.trainer;
        fillLook(card);
        fillPreview(card);
        els.lookStatus.textContent = data.message || "Trainer look saved.";
      } catch (error) {
        els.lookStatus.textContent = window.playRpcError(error);
      }
    }, { ownedPacks: window._playOwnedAvatarPacks || [] });
  });

  els.confirmRare?.addEventListener("change", () => {
    window.playSetConfirmRare?.(Boolean(els.confirmRare.checked));
  });

  els.favorites?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-fav]");
    if (!button) return;
    const key = button.dataset.fav;
    const on = encounter.favoriteBalls.includes(key);
    encounter.favoriteBalls = on
      ? encounter.favoriteBalls.filter((item) => item !== key)
      : encounter.favoriteBalls.concat(key).slice(0, 6);
    if (!encounter.favoriteBalls.length) encounter.favoriteBalls = [key];
    fillEncounter(false);
  });

  els.saveEncounter?.addEventListener("click", async () => {
    els.encounterStatus.textContent = "Saving…";
    try {
      const data = await window.playCall("play_set_encounter_settings", {
        p_settings: {
          favoriteBalls: encounter.favoriteBalls,
          defaultPrep: els.defaultPrep?.value || "ask",
          autoPrep: Boolean(els.autoPrep?.checked),
          autoThrow: Boolean(els.autoThrow?.checked)
        }
      });
      encounter = window.playEncounterSettings(data?.encounterSettings);
      window.playSetConfirmRare?.(Boolean(els.confirmRare?.checked));
      fillEncounter();
      els.encounterStatus.textContent = data.message || "Encounter settings saved.";
    } catch (error) {
      els.encounterStatus.textContent = window.playRpcError(error);
    }
  });

  els.check.addEventListener("click", async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session) {
      els.pass.textContent = "Sign in first.";
      return;
    }
    if (!session.provider_token) {
      els.pass.textContent = "Twitch did not keep a session token. Sign out, sign in again, then check immediately.";
      return;
    }
    els.pass.textContent = "Checking Twitch…";
    const { data, error } = await supabase.functions.invoke("refresh-pass", {
      body: { accessToken: session.provider_token }
    });
    if (error) {
      els.pass.textContent = await functionMessage(error, "Could not check your subscription right now.");
      return;
    }
    els.pass.textContent = data?.message || (data?.active ? "Starlight Pass is active." : "Twitch says you are not subscribed right now.");
    await load();
  });

  els.perfPicks?.addEventListener("change", (event) => {
    const input = event.target.closest("[name=perf-mode]");
    if (!input) return;
    const applied = window.playSetPerfPref?.(input.value) || { pref: input.value, mode: input.value };
    if (els.perfStatus) {
      els.perfStatus.textContent = applied.pref === "auto"
        ? `AUTO is using ${String(applied.mode).toUpperCase()} on this device.`
        : `${String(applied.pref).toUpperCase()} is on.`;
    }
  });

  supabase.auth.onAuthStateChange((event) => {
    if (window.playAuthNoise(event)) return;
    load();
  });
  load();
})();
