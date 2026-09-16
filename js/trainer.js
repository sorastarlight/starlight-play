(() => {
  const supabase = window.playSupabase;
  const gate = document.getElementById("gate");
  const profileBox = document.getElementById("profile");
  const hero = document.getElementById("hero");
  const caught = document.getElementById("caught-grid");
  const title = document.getElementById("page-title");
  const face = document.getElementById("profile-face");
  const customize = document.getElementById("customize");
  const customPicks = document.getElementById("custom-picks");
  const customHint = document.getElementById("custom-hint");
  const editStatus = document.getElementById("edit-status");
  let card = null;
  let savedCard = null;
  let cosmetics = [];
  let titles = [];
  let badges = [];
  let mine = false;
  let tab = "avatar";
  let draft = null;
  let ownedPacks = [];
  let prog = null;
  let recentLog = [];
  let achievements = [];

  window.playBindAccountNav();

  function esc(value) {
    return window.playEscapeAttr(value);
  }

  function previewCard() {
    if (!card || !draft) return card;
    return {
      ...card,
      trainerSprite: draft.sprite || card.trainerSprite,
      cardBg: draft.bg || card.cardBg,
      cardFrame: draft.frame || card.cardFrame,
      title: (titles.find((row) => row.id === draft.titleId) || {}).name || (draft.titleId ? card.title : ""),
      activeTitleId: draft.titleId || "",
      badges: (badges || []).filter((row) => (draft.badgeIds || []).includes(row.id)).slice(0, 3)
        .map((row) => ({ id: row.id, name: row.name })),
      showcase: {
        ...(card.showcase || {}),
        shinyCatchId: draft.shinyCatchId || "",
        achievementId: draft.achievementId || "",
        shinyCatch: (recentLog || []).find((row) => String(row.id) === String(draft.shinyCatchId)) || card.showcase?.shinyCatch,
        achievementName: (achievements.find((row) => row.id === draft.achievementId) || {}).name || card.showcase?.achievementName
      },
      favoriteDex: draft.favoriteDex ?? card.favoriteDex,
      favoriteVariant: draft.favoriteVariant || card.favoriteVariant
    };
  }

  function dirty() {
    if (!savedCard || !draft) return false;
    return draft.sprite !== savedCard.trainerSprite
      || draft.bg !== savedCard.cardBg
      || draft.frame !== (savedCard.cardFrame || "plain")
      || (draft.titleId || "") !== (savedCard.activeTitleId || "")
      || JSON.stringify(draft.badgeIds || []) !== JSON.stringify(savedCard.featuredBadgeIds || savedCard.badges?.map((row) => row.id) || [])
      || (draft.shinyCatchId || "") !== (savedCard.showcase?.shinyCatch?.id || savedCard.showcase?.shinyCatchId || "")
      || (draft.achievementId || "") !== (savedCard.showcase?.achievementId || "")
      || Number(draft.favoriteDex || 0) !== Number(savedCard.favoriteDex || 0);
  }

  async function loadNav() {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session) {
      window.playSetAccountNav(null);
      return session;
    }
    const { data: profile } = await supabase.from("profiles").select("display_name, twitch_login, avatar_url, username").eq("id", session.user.id).maybeSingle();
    let extras = {};
    try {
      const snapshot = await window.playCall("play_state");
      extras = { isAdmin: Boolean(snapshot?.isAdmin), trainer: snapshot?.trainer, twitchLinked: snapshot?.twitchLinked };
    } catch (_) {}
    window.playSetAccountNav(session, profile, extras);
    return { session, profile };
  }

  function renderProgress(view) {
    const extra = document.getElementById("trainer-progress");
    if (!extra) return;
    const kanto = view.kanto || {};
    extra.innerHTML = `
      <h2>Progression</h2>
      ${window.playXpProgressHtml(view)}
      <p>Kanto Pokédex: ${kanto.caught || view.species || 0} / ${kanto.total || 151} · ${kanto.percent || 0}%</p>
      <p class="muted">XP comes from encounters, catches, new Pokédex registrations, Shinies, Evolution, and Achievements the server actually grants.</p>
      <div class="links">
        <a class="button secondary" href="./achievements.html">Achievements</a>
        <a class="button secondary" href="./pokedex.html">Pokédex</a>
      </div>`;
  }

  function renderShowcase(view) {
    const box = document.getElementById("trainer-showcase");
    if (!box) return;
    const showcase = view.showcase || {};
    const favDex = showcase.favoriteDex || view.favoriteDex;
    const favVar = showcase.favoriteVariant || view.favoriteVariant || "normal";
    const shiny = showcase.shinyCatch;
    const parts = [];
    if (favDex) {
      parts.push(`<article class="caught-card"><img src="${window.playSpriteUrl(favDex, favVar)}" alt="" width="72" height="72" loading="lazy"><strong>Favorite</strong><span>${esc(window.playSpeciesName?.(favDex) || `No. ${favDex}`)}</span></article>`);
    }
    if (shiny && String(shiny.dex) !== String(favDex)) {
      parts.push(`<article class="caught-card"><img src="${window.playSpriteUrl(shiny.dex, shiny.variant)}" alt="" width="72" height="72" loading="lazy"><strong>Favorite Shiny</strong><span>${window.playCaughtName(shiny)}</span></article>`);
    }
    if (showcase.achievementName) {
      parts.push(`<article class="caught-card"><strong>Proudest Achievement</strong><span>${esc(showcase.achievementName)}</span></article>`);
    }
    const mastery = (view.masteryTop || []).map((row) => `
      <article class="caught-card">
        <img src="${window.playSpriteUrl(row.dex, "normal")}" alt="" width="72" height="72" loading="lazy">
        <strong>${esc(window.playSpeciesName?.(row.dex) || `No. ${row.dex}`)}</strong>
        <span>Mastery ${esc(row.points || 0)}</span>
      </article>`).join("");
    box.innerHTML = `
      <h2>Showcase</h2>
      <div class="caught-grid">${parts.join("") || `<p class="muted">No showcase yet.</p>`}</div>
      ${mastery ? `<h3>Top mastered species</h3><div class="caught-grid">${mastery}</div>` : ""}`;
  }

  function renderStats(view) {
    const box = document.getElementById("trainer-stats");
    if (!box) return;
    const variants = view.variants || {};
    box.innerHTML = `
      <h2>Statistics</h2>
      <dl class="sim-grid">
        <div><dt>Caught</dt><dd>${view.caught || 0}</dd></div>
        <div><dt>Shiny species</dt><dd>${variants.shinySpecies || 0}</dd></div>
        <div><dt>Shiny catches</dt><dd>${view.shinyCaught || 0}</dd></div>
        <div><dt>Evolved</dt><dd>${view.evolved || 0}</dd></div>
        <div><dt>Species mastered</dt><dd>${view.speciesMastered || 0}</dd></div>
        <div><dt>Female variants</dt><dd>${variants.femaleVariants || 0}</dd></div>
      </dl>`;
  }

  function pickState(row, equipped) {
    if (!row.unlocked) return "locked";
    if (equipped) return "equipped";
    if (row.isNew) return "new";
    return "owned";
  }

  function renderPicks() {
    if (!customPicks) return;
    const view = previewCard();
    if (tab === "avatar") {
      customPicks.innerHTML = (window.PLAY_TRAINERS || []).map((group) => {
        const lockedPack = Boolean(group.premium) && !ownedPacks.includes(group.key);
        return `<section class="trainer-gen${lockedPack ? " is-locked" : ""}">
          <h3>${esc(group.label)}</h3>
          <p class="muted">${esc(group.games)}${lockedPack ? " · Unlock in Premium Avatars on the Store." : ""}</p>
          <div class="trainer-gen-row">
            ${window.playTrainerLooks(group).map((look) => {
              const equipped = look.id === view.trainerSprite;
              const state = lockedPack ? "locked" : (equipped ? "equipped" : "owned");
              return `<button type="button" class="trainer-opt is-${state}" data-sprite="${esc(look.id)}" ${lockedPack ? "" : ""} aria-pressed="${equipped}" aria-label="${esc(look.name)} ${state}">
                <img src="${window.playTrainerSpriteUrl(look.id)}" alt="" width="72" height="72" loading="lazy">
                <strong>${esc(look.name)}</strong>
                <span class="id-state">${state}</span>
              </button>`;
            }).join("")}
          </div>
        </section>`;
      }).join("");
      customHint.textContent = "Trainer Avatars are cosmetic. Premium series stay locked until purchased.";
      return;
    }
    if (tab === "background" || tab === "frame") {
      const kind = tab;
      const rows = cosmetics.filter((row) => row.kind === kind);
      customPicks.innerHTML = `<div class="prog-pick-grid">${rows.map((row) => {
        const equipped = kind === "background" ? row.asset === view.cardBg : row.asset === view.cardFrame;
        const state = pickState(row, equipped);
        return `<button type="button" class="prog-pick is-${state}" data-cosmetic="${esc(row.id)}" aria-pressed="${equipped}" aria-label="${esc(row.name)} ${state}">
          <strong>${esc(row.name)}</strong>
          <span class="id-state">${state}</span>
          <span>${esc(row.unlocked ? row.description : row.howTo)}</span>
        </button>`;
      }).join("")}</div>`;
      customHint.textContent = tab === "frame" ? "Frames are cosmetic borders. They do not change catch rates." : "Backgrounds are cosmetic.";
      return;
    }
    if (tab === "title") {
      customPicks.innerHTML = `<div class="prog-pick-grid">${(titles || []).map((row) => {
        const equipped = row.id === (draft?.titleId || "");
        const state = pickState(row, equipped);
        return `<button type="button" class="prog-pick is-${state}" data-title="${esc(row.id)}" aria-pressed="${equipped}" ${row.unlocked ? "" : ""} aria-label="${esc(row.name)} ${state}">
          <strong>${esc(row.name)}</strong>
          <span class="id-state">${state}</span>
          <span>${esc(row.unlocked ? row.description : (row.howTo || row.description))}</span>
        </button>`;
      }).join("")}</div>`;
      customHint.textContent = "Wear one title. Locked titles stay visible so you can see how to unlock them.";
      return;
    }
    customPicks.innerHTML = `<div class="prog-pick-grid">${(badges || []).map((row) => {
      const equipped = (draft?.badgeIds || []).includes(row.id);
      const state = pickState(row, equipped);
      return `<button type="button" class="prog-pick is-${state}" data-badge="${esc(row.id)}" aria-pressed="${equipped}" aria-label="${esc(row.name)} ${state}">
        <strong>${esc(row.name)}</strong>
        <span class="id-state">${state}</span>
        <span>${esc(row.unlocked ? row.description : (row.howTo || row.description))}</span>
      </button>`;
    }).join("")}</div>`;
    if (tab === "showcase") {
      const shinies = (recentLog || []).filter((row) => String(row.variant || "").includes("shiny"));
      const done = (achievements || []).filter((row) => row.unlocked);
      const team = card?.team || [];
      customPicks.innerHTML = `
        <div class="id-showcase-edit">
          <label class="field">Favorite Pokémon
            <select id="showcase-fav">
              <option value="">Use Pokédex favorite</option>
              ${team.map((row) => `<option value="${esc(row.dex)}:${esc(row.variant || "normal")}" ${Number(draft.favoriteDex) === Number(row.dex) ? "selected" : ""}>${window.playCaughtName(row)}</option>`).join("")}
            </select>
          </label>
          <label class="field">Favorite Shiny
            <select id="showcase-shiny">
              <option value="">None</option>
              ${shinies.map((row) => `<option value="${esc(row.id)}" ${String(draft.shinyCatchId) === String(row.id) ? "selected" : ""}>${window.playCaughtName(row)}</option>`).join("")}
            </select>
          </label>
          <label class="field">Proudest Achievement
            <select id="showcase-ach">
              <option value="">None</option>
              ${done.map((row) => `<option value="${esc(row.id)}" ${draft.achievementId === row.id ? "selected" : ""}>${esc(row.name)}</option>`).join("")}
            </select>
          </label>
        </div>`;
      customHint.textContent = "Showcase references Pokémon you already own. It does not duplicate them.";
      return;
    }
    customHint.textContent = "Feature up to three badges on your Trainer ID.";
  }

  function render(view, recent) {
    title.textContent = view.displayName;
    if (face) {
      face.hidden = false;
      face.className = "twitch-face twitch-face-lg";
      face.innerHTML = window.playTwitchFaceInner(view.avatar, view.displayName, Boolean(view.twitchLinked));
      face.classList.toggle("has-twitch", Boolean(view.twitchLinked));
    }
    hero.innerHTML = window.playRenderIdCard(view);
    renderProgress(view);
    renderShowcase(view);
    renderStats(view);
    const nameNote = document.getElementById("name-edit-note");
    if (nameNote) nameNote.hidden = !mine;
    if (customize) customize.hidden = !mine;
    if (mine) renderPicks();
    if (recent) recentLog = recent;
    caught.innerHTML = (recentLog || []).map((row) => {
      const when = row.caughtAt ? new Date(row.caughtAt) : null;
      const stamp = when && !Number.isNaN(when.getTime()) ? when.toLocaleString() : "";
      return `
      <article class="caught-card">
        <img src="${window.playSpriteUrl(row.dex, row.variant)}" alt="" width="72" height="72" loading="lazy">
        <strong>${window.playCaughtName(row)}</strong>
        <span>${window.playCaughtBlurb(row)}</span>
        ${stamp ? `<span class="muted">${esc(stamp)}</span>` : ""}
      </article>`;
    }).join("") || `<p class="muted">No adventure log yet.</p>`;
  }

  function snapshotDraft(next) {
    const featured = Array.isArray(next.featuredBadgeIds)
      ? next.featuredBadgeIds
      : (next.badges || []).map((row) => row.id);
    draft = {
      sprite: next.trainerSprite,
      bg: next.cardBg,
      frame: next.cardFrame || "plain",
      titleId: next.activeTitleId || "",
      badgeIds: featured.slice(0, 3),
      shinyCatchId: next.showcase?.shinyCatch?.id || next.showcase?.shinyCatchId || "",
      achievementId: next.showcase?.achievementId || "",
      favoriteDex: next.favoriteDex || next.showcase?.favoriteDex || null,
      favoriteVariant: next.favoriteVariant || next.showcase?.favoriteVariant || "normal"
    };
  }

  async function loadProgression() {
    if (!mine) return;
    try {
      prog = await window.playCall("play_progression");
      titles = prog?.titles || [];
      badges = prog?.badges || [];
      achievements = prog?.achievements || [];
      cosmetics = prog?.cosmetics || cosmetics;
      ownedPacks = prog?.ownedAvatarPacks || ownedPacks;
      if (prog?.trainer) {
        card = { ...card, ...prog.trainer };
        savedCard = { ...card };
        snapshotDraft(card);
      }
    } catch (_) {}
  }

  async function load() {
    const nav = await loadNav();
    const login = new URLSearchParams(location.search).get("u")
      || nav?.profile?.twitch_login
      || nav?.profile?.username
      || "";
    if (!login) {
      gate.textContent = "Sign in, or open a trainer from Rankings.";
      return;
    }
    try {
      if (window.playTrainerCatalogReady) await window.playTrainerCatalogReady;
      const data = await window.playCall("play_trainer", { p_login: login });
      card = data.trainer;
      savedCard = { ...card };
      mine = Boolean(data.mine);
      cosmetics = data.cosmetics || [];
      ownedPacks = data.ownedAvatarPacks || [];
      snapshotDraft(card);
      recentLog = data.recent || [];
      await loadProgression();
      render(previewCard(), recentLog);
      if (mine) {
        window.playCall("play_ack_cosmetics", { p_ids: null }).catch(() => {});
      }
      gate.hidden = true;
      profileBox.hidden = false;
    } catch (error) {
      gate.textContent = window.playRpcError(error, "No Trainer ID for that login yet.");
    }
  }

  customize?.querySelector(".id-customize-tabs")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-custom-tab]");
    if (!button) return;
    tab = button.dataset.customTab;
    customize.querySelectorAll("[data-custom-tab]").forEach((item) => {
      item.setAttribute("aria-pressed", item === button ? "true" : "false");
    });
    renderPicks();
  });

  customPicks?.addEventListener("click", (event) => {
    const sprite = event.target.closest("[data-sprite]");
    const cosmetic = event.target.closest("[data-cosmetic]");
    const titleBtn = event.target.closest("[data-title]");
    const badgeBtn = event.target.closest("[data-badge]");
    if (sprite) {
      const group = window.PLAY_TRAINERS.find((row) => window.playTrainerLooks(row).some((look) => look.id === sprite.dataset.sprite));
      if (group?.premium && !ownedPacks.includes(group.key)) {
        customHint.textContent = `${group.label} is locked. Unlock this series in Premium Avatars on the Store.`;
        return;
      }
      draft.sprite = sprite.dataset.sprite;
    } else if (cosmetic) {
      const row = cosmetics.find((item) => item.id === cosmetic.dataset.cosmetic);
      if (!row?.unlocked) {
        customHint.textContent = `${row?.name || "This look"} is locked. ${row?.howTo || ""}`.trim();
        return;
      }
      if (row.kind === "background") draft.bg = row.asset;
      if (row.kind === "frame") draft.frame = row.asset;
    } else if (titleBtn) {
      const row = titles.find((item) => item.id === titleBtn.dataset.title);
      if (!row?.unlocked) {
        customHint.textContent = `${row?.name || "This title"} is locked. ${row?.howTo || row?.description || ""}`.trim();
        return;
      }
      draft.titleId = draft.titleId === row.id ? "" : row.id;
    } else if (badgeBtn) {
      const row = badges.find((item) => item.id === badgeBtn.dataset.badge);
      if (!row?.unlocked) {
        customHint.textContent = `${row?.name || "This badge"} is locked. ${row?.howTo || row?.description || ""}`.trim();
        return;
      }
      const next = new Set(draft.badgeIds || []);
      if (next.has(row.id)) next.delete(row.id);
      else {
        if (next.size >= 3) {
          customHint.textContent = "Feature up to three badges.";
          return;
        }
        next.add(row.id);
      }
      draft.badgeIds = Array.from(next);
    } else {
      return;
    }
    render(previewCard(), recentLog);
  });

  customPicks?.addEventListener("change", (event) => {
    if (event.target.id === "showcase-fav") {
      const [dex, variant] = String(event.target.value || "").split(":");
      draft.favoriteDex = dex ? Number(dex) : null;
      draft.favoriteVariant = variant || "normal";
    } else if (event.target.id === "showcase-shiny") {
      draft.shinyCatchId = event.target.value || "";
    } else if (event.target.id === "showcase-ach") {
      draft.achievementId = event.target.value || "";
    } else {
      return;
    }
    render(previewCard(), recentLog);
  });

  document.getElementById("revert-id")?.addEventListener("click", () => {
    if (!savedCard) return;
    card = { ...savedCard };
    snapshotDraft(savedCard);
    render(previewCard(), recentLog);
    if (editStatus) editStatus.textContent = "Reverted to the saved Trainer ID.";
  });

  document.getElementById("save-id")?.addEventListener("click", async () => {
    if (!mine || !draft) return;
    if (editStatus) editStatus.textContent = "Saving Trainer ID…";
    try {
      const saved = await window.playCall("play_save_trainer_id", {
        p_sprite: draft.sprite,
        p_bg: draft.bg,
        p_frame: draft.frame,
        p_title: draft.titleId || "",
        p_badges: draft.badgeIds || [],
        p_favorite_dex: draft.favoriteDex ?? null,
        p_favorite_variant: draft.favoriteVariant || "normal",
        p_showcase: {
          shinyCatchId: draft.shinyCatchId || "",
          achievementId: draft.achievementId || ""
        }
      });
      card = saved.trainer;
      savedCard = { ...card };
      cosmetics = saved.cosmetics || cosmetics;
      snapshotDraft(card);
      render(previewCard(), recentLog);
      if (editStatus) editStatus.textContent = saved.message || "Trainer ID saved.";
    } catch (error) {
      if (editStatus) editStatus.textContent = window.playRpcError(error);
    }
  });

  supabase.auth.onAuthStateChange((event) => {
    if (window.playAuthNoise(event)) return;
    load();
  });
  load();
})();
