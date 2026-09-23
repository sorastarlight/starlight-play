(() => {
  const data = window.PLAY_POKEDEX_PRESENTATION;
  if (!data) return;

  function stamp(url) {
    if (!url) return "";
    const s = window.PLAY_SPRITE_BUILD;
    if (!s) return url;
    return url.includes("?") ? url : `${url}?v=${s}`;
  }

  function preferStatic() {
    try {
      if (typeof document !== "undefined") {
        const html = document.documentElement;
        if (html?.dataset?.reducedMotion === "1") return true;
        if (html?.dataset?.perf === "low") return true;
        if (document.body?.classList?.contains("is-perf-low")) return true;
      }
      if (typeof window.playPerfReduced === "function" && window.playPerfReduced()) return true;
      if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return true;
    } catch (_) {}
    return false;
  }

  function padBounds(bounds, w, h, margin) {
    const [x, y, bw, bh] = bounds || [0, 0, w, h];
    const mx = Math.max(bw * margin, w * 0.02);
    const my = Math.max(bh * margin, h * 0.02);
    const x0 = Math.max(0, x - mx);
    const y0 = Math.max(0, y - my);
    const x1 = Math.min(w, x + bw + mx);
    const y1 = Math.min(h, y + bh + my);
    return [x0, y0, Math.max(1, x1 - x0), Math.max(1, y1 - y0)];
  }

  function viewBoxCss(bounds, w, h) {
    const [x, y, bw, bh] = bounds;
    return {
      "--ovb-t": `${((y / h) * 100).toFixed(3)}%`,
      "--ovb-r": `${(((w - x - bw) / w) * 100).toFixed(3)}%`,
      "--ovb-b": `${(((h - y - bh) / h) * 100).toFixed(3)}%`,
      "--ovb-l": `${((x / w) * 100).toFixed(3)}%`
    };
  }

  function asAsset(raw, assetKey) {
    if (!raw?.url) return null;
    return {
      class: raw.class || "battle",
      render: raw.render || (raw.class === "battle" || raw.class === "stadium2" ? "pixelated" : "auto"),
      url: raw.url,
      w: Number(raw.w) || 96,
      h: Number(raw.h) || 96,
      bounds: raw.bounds || [0, 0, Number(raw.w) || 96, Number(raw.h) || 96],
      frameCount: Number(raw.frameCount) || 1,
      assetKey
    };
  }

  function pickFromRow(row, key, shiny, wantStatic) {
    if (!row) return null;
    const shinyRow = shiny ? (row.shiny || null) : null;
    const base = shiny
      ? {
          class: shinyRow?.class || row.class,
          render: shinyRow?.render || row.render,
          url: row.shinyUrl || shinyRow?.url || row.url,
          w: shinyRow?.w || row.w,
          h: shinyRow?.h || row.h,
          bounds: shinyRow?.bounds || row.bounds,
          frameCount: shinyRow?.frameCount || row.frameCount,
          animatedAsset: shinyRow?.animatedAsset || row.animatedAsset,
          homeAsset: shinyRow?.homeAsset || row.homeAsset,
          officialArtworkAsset: shinyRow?.officialArtworkAsset || row.officialArtworkAsset,
          battleFallback: shinyRow?.battleFallback || row.battleFallback
        }
      : row;

    if (wantStatic) {
      const home = asAsset(base.homeAsset, `${key}:home`);
      if (home) return home;
      const oa = asAsset(base.officialArtworkAsset, `${key}:oa`);
      if (oa) return oa;
    }

    const animated = asAsset(base.animatedAsset || (base.class === "battle" ? base : null), `${key}:anim`);
    if (animated && (base.animatedAsset || base.class === "battle")) {
      if (base.animatedAsset) return asAsset(base.animatedAsset, `${key}:anim`);
      return asAsset(base, `${key}:anim`);
    }

    if (base.class === "battle" || /\.gif(\?|$)/i.test(base.url || "")) {
      return asAsset(base, `${key}:anim`);
    }

    const home = asAsset(base.homeAsset, `${key}:home`);
    if (home) return home;
    const oa = asAsset(base.officialArtworkAsset, `${key}:oa`);
    if (oa) return oa;
    return asAsset(base, key);
  }

  function pickAsset(dex, formId, shiny, female) {
    const id = Number(dex);
    const fid = Number(formId || id);
    const isBase = !fid || fid === id;
    const key = isBase ? String(id) : `${id}:${fid}`;
    const row = data.assets[key];
    const wantStatic = preferStatic();

    if (female) {
      if (isBase && row?.female) {
        const f = asAsset(row.female, `${key}:female`);
        if (f) return f;
      }
      if (typeof window.playSpriteUrl === "function") {
        const variant = shiny ? "shiny-female" : "female";
        const fb = row?.female || row?.animatedAsset || row?.battleFallback || row || { w: 96, h: 96, bounds: [0, 0, 96, 96] };
        return {
          class: "battle",
          render: "pixelated",
          url: window.playSpriteUrl(id, variant, fid),
          w: fb.w,
          h: fb.h,
          bounds: fb.bounds || [0, 0, fb.w, fb.h],
          frameCount: fb.frameCount || 1,
          assetKey: `${key}:${variant}`
        };
      }
    }

    const picked = pickFromRow(row, key, shiny, wantStatic);
    if (picked) return picked;

    if (typeof window.playSpriteUrl === "function") {
      return {
        class: "battle",
        render: "pixelated",
        url: window.playSpriteUrl(id, shiny ? "shiny" : "normal", fid),
        w: 96,
        h: 96,
        bounds: [0, 0, 96, 96],
        frameCount: 1,
        assetKey: `${key}:synth`
      };
    }
    return null;
  }

  window.resolvePokedexPresentation = function resolvePokedexPresentation(opts = {}) {
    const dex = Number(opts.dex);
    const formId = Number(opts.formId || dex);
    const shiny = !!opts.shiny;
    const female = !!opts.female;
    const margin = Number(data.envelope?.margin) || 0.08;
    let asset = pickAsset(dex, formId, shiny, female);
    if (!asset) {
      asset = {
        class: "battle",
        render: "pixelated",
        url: typeof window.playSpriteUrl === "function" ? window.playSpriteUrl(dex, "normal", formId) : "",
        w: 96,
        h: 96,
        bounds: [0, 0, 96, 96],
        frameCount: 1,
        assetKey: "empty"
      };
    }
    const bounds = padBounds(asset.bounds, asset.w, asset.h, margin);
    return {
      url: stamp(asset.url),
      assetClass: asset.class,
      renderMode: asset.render || "auto",
      sourceW: asset.w,
      sourceH: asset.h,
      frameCount: asset.frameCount || 1,
      bounds: { x: bounds[0], y: bounds[1], w: bounds[2], h: bounds[3] },
      cssVars: {
        ...viewBoxCss(bounds, asset.w, asset.h),
        "--dex-art-render": asset.render === "pixelated" ? "pixelated" : "auto"
      },
      assetKey: asset.assetKey
    };
  };
})();
