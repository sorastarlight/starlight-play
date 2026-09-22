(() => {
  const data = window.PLAY_POKEDEX_PRESENTATION;
  if (!data) return;

  function stamp(url) {
    if (!url) return "";
    const s = window.PLAY_SPRITE_BUILD;
    if (!s) return url;
    return url.includes("?") ? url : `${url}?v=${s}`;
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

  function pickAsset(dex, formId, shiny, female) {
    const id = Number(dex);
    const fid = Number(formId || id);
    const isBase = !fid || fid === id;
    const key = isBase ? String(id) : `${id}:${fid}`;
    const row = data.assets[key];

    if (female) {
      if (isBase && row?.female) return { ...row.female, assetKey: `${key}:female` };
      if (typeof window.playSpriteUrl === "function") {
        const variant = shiny ? "shiny-female" : "female";
        const fb = row?.battleFallback || row || { w: 96, h: 96, bounds: [0, 0, 96, 96] };
        return {
          class: "battle",
          render: "pixelated",
          url: window.playSpriteUrl(id, variant, fid),
          w: fb.w,
          h: fb.h,
          bounds: fb.bounds || [0, 0, fb.w, fb.h],
          assetKey: `${key}:${variant}`
        };
      }
    }

    if (!row) {
      if (typeof window.playSpriteUrl === "function") {
        return {
          class: "battle",
          render: "pixelated",
          url: window.playSpriteUrl(id, shiny ? "shiny" : "normal", fid),
          w: 96,
          h: 96,
          bounds: [0, 0, 96, 96],
          assetKey: `${key}:synth`
        };
      }
      return null;
    }

    if (shiny && row.shinyUrl) {
      const sb = row.shiny || row;
      return {
        class: row.class,
        render: row.render,
        url: row.shinyUrl,
        w: sb.w,
        h: sb.h,
        bounds: sb.bounds || row.bounds,
        assetKey: `${key}:shiny`
      };
    }

    if (shiny && typeof window.playSpriteUrl === "function") {
      const fb = row.battleFallback || { w: row.w, h: row.h, bounds: row.bounds };
      return {
        class: "battle",
        render: "pixelated",
        url: window.playSpriteUrl(id, "shiny", fid),
        w: fb.w,
        h: fb.h,
        bounds: fb.bounds || row.bounds,
        assetKey: `${key}:shiny-battle`
      };
    }

    return {
      class: row.class,
      render: row.render,
      url: row.url,
      w: row.w,
      h: row.h,
      bounds: row.bounds,
      assetKey: key
    };
  }

  window.resolvePokedexPresentation = function resolvePokedexPresentation(opts = {}) {
    const dex = Number(opts.dex);
    const formId = Number(opts.formId || dex);
    const shiny = !!opts.shiny;
    const female = !!opts.female;
    const margin = Number(data.envelope?.margin) || 0.06;
    let asset = pickAsset(dex, formId, shiny, female);
    if (!asset) {
      asset = {
        class: "battle",
        render: "pixelated",
        url: typeof window.playSpriteUrl === "function" ? window.playSpriteUrl(dex, "normal", formId) : "",
        w: 96,
        h: 96,
        bounds: [0, 0, 96, 96],
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
      bounds: { x: bounds[0], y: bounds[1], w: bounds[2], h: bounds[3] },
      cssVars: {
        ...viewBoxCss(bounds, asset.w, asset.h),
        "--dex-art-render": asset.render === "pixelated" ? "pixelated" : "auto"
      },
      assetKey: asset.assetKey
    };
  };
})();
