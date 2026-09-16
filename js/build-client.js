(() => {
  const root = typeof window !== "undefined" ? window : globalThis;
  const RELOAD_KEY = "playBuildReloadFor";

  function storageGet(key) {
    try {
      return root.sessionStorage ? root.sessionStorage.getItem(key) : null;
    } catch (_) {
      return null;
    }
  }

  function storageSet(key, value) {
    try {
      if (root.sessionStorage) root.sessionStorage.setItem(key, String(value));
    } catch (_) {}
  }

  root.playLogAssetEvent = function playLogAssetEvent(event) {
    const row = {
      at: Date.now(),
      kind: event?.kind || "fail",
      requestedUrl: event?.requestedUrl || event?.url || "",
      fallbackUrl: event?.fallbackUrl || event?.fallback || "",
      assetBuild: event?.assetBuild || "",
      species: event?.species || event?.dex || "",
      location: event?.location || event?.locationKey || "",
      variant: event?.variant || ""
    };
    root.__playAssetFails = root.__playAssetFails || [];
    root.__playAssetFails.push(row);
    if (root.__playAssetFails.length > 40) root.__playAssetFails.shift();
    if (typeof console !== "undefined" && console.warn) {
      console.warn("[play] asset", row.kind, row.requestedUrl || row.location || row.species, row.fallbackUrl || "");
    }
    return row;
  };

  root.playBuildMismatch = function playBuildMismatch(required) {
    const need = String(required || "").trim();
    const have = String(root.PLAY_BUILD || "").trim();
    return Boolean(need && have && need !== have);
  };

  root.playEncounterProtectsReload = function playEncounterProtectsReload(round, opts) {
    if (opts?.busy) return true;
    if (!round) return false;
    const phase = String(round.phase || "");
    if (phase && phase !== "closed") return true;
    if (typeof root.playRoundIdleAt === "function") {
      const idleAt = root.playRoundIdleAt(round);
      const now = typeof root.playRoundNowMs === "function" ? root.playRoundNowMs(round) : Date.now();
      if (idleAt && now < idleAt) return true;
    }
    return false;
  };

  root.playApplyClientUpdate = function playApplyClientUpdate(required, opts) {
    const need = String(required || "").trim();
    if (!need) return { action: "none" };
    if (storageGet(RELOAD_KEY) === need) {
      return { action: "blocked", reason: "reload-loop" };
    }
    storageSet(RELOAD_KEY, need);
    if (opts?.navigate === false) return { action: "queued", required: need };
    try {
      const href = (root.location && root.location.href) || "";
      const url = new URL(href);
      url.searchParams.set("app", need);
      if (typeof root.location.replace === "function") root.location.replace(url.toString());
      else root.location.href = url.toString();
    } catch (_) {
      if (root.location && typeof root.location.reload === "function") root.location.reload();
    }
    return { action: "navigate", required: need };
  };

  root.playRenderBuildNotice = function playRenderBuildNotice(opts) {
    const el = opts?.el;
    if (!el) return { shown: false };
    const required = opts?.required;
    const mismatch = root.playBuildMismatch(required);
    if (!mismatch) {
      el.hidden = true;
      el.classList.remove("is-deferred", "is-loop");
      return { shown: false, mismatch: false };
    }
    el.hidden = false;
    const msg = el.querySelector("#play-update-msg");
    const btn = el.querySelector("#play-update-btn");
    const protectedEnc = root.playEncounterProtectsReload(opts?.round, { busy: opts?.busy });
    const looped = storageGet(RELOAD_KEY) === String(required);
    el.classList.toggle("is-deferred", protectedEnc);
    el.classList.toggle("is-loop", Boolean(looped && !protectedEnc));
    const setMsg = (text) => {
      if (msg) msg.textContent = text;
    };
    if (protectedEnc) {
      setMsg("Update ready — we'll keep your current encounter safe.");
      if (btn) btn.hidden = true;
      return { shown: true, deferred: true, mismatch: true };
    }
    if (looped) {
      setMsg("This tab still has an older page. Press Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac) to load the update.");
      if (btn) btn.hidden = true;
      return { shown: true, loop: true, mismatch: true };
    }
    setMsg("✨ A new ST★RLIGHT RPG update is ready.");
    if (btn) {
      btn.hidden = false;
      btn.textContent = "Update now";
      btn.onclick = () => root.playApplyClientUpdate(required);
    }
    return { shown: true, idle: true, mismatch: true };
  };

  root.playBuildHealthView = function playBuildHealthView(server) {
    const app = String(root.PLAY_BUILD || "").trim();
    const required = String(server?.clientBuild || root.__playServerBuild || "").trim();
    const mismatch = Boolean(app && required && app !== required);
    return {
      appBuild: app,
      spriteBuild: String(root.PLAY_SPRITE_BUILD || "").trim(),
      locationBuild: String(root.PLAY_LOCATION_BUILD || "").trim(),
      gitCommit: String(root.PLAY_GIT_COMMIT || "").trim(),
      deployedAt: String(root.PLAY_DEPLOYED_AT || "").trim(),
      clientBuild: required,
      dbMigration: String(server?.dbMigration || root.__playDbMigration || "").trim(),
      status: !app || !required ? "UNKNOWN" : (mismatch ? "STALE CLIENT" : "HEALTHY"),
      mismatch
    };
  };

  root.__starlightBuildInfo = function starlightBuildInfo() {
    const scripts = [];
    const styles = [];
    try {
      if (typeof document !== "undefined") {
        document.querySelectorAll("script[src]").forEach((node) => {
          const src = node.getAttribute("src") || "";
          if (src && !/^https?:\/\//i.test(src)) scripts.push(src);
        });
        document.querySelectorAll("link[rel=stylesheet]").forEach((node) => {
          const href = node.getAttribute("href") || "";
          if (href && !/^https?:\/\//i.test(href)) styles.push(href);
        });
      }
    } catch (_) {}
    return {
      appBuild: root.PLAY_BUILD || "",
      spriteBuild: root.PLAY_SPRITE_BUILD || "",
      locationBuild: root.PLAY_LOCATION_BUILD || "",
      gitCommit: root.PLAY_GIT_COMMIT || "",
      deployedAt: root.PLAY_DEPLOYED_AT || "",
      serverBuild: root.__playServerBuild || "",
      dbMigration: root.__playDbMigration || "",
      page: (root.location && root.location.pathname) || "",
      scripts,
      styles,
      assetFails: (root.__playAssetFails || []).slice(-20),
      browser: (root.navigator && root.navigator.userAgent) || "",
      performanceMode: typeof root.playPerfMode === "function" ? root.playPerfMode() : "",
      debug: false
    };
  };
})();
