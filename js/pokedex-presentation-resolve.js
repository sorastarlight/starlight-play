(() => {
  const data = window.PLAY_POKEDEX_PRESENTATION;
  if (!data) return;

  const FALLBACK = {
    minOccH: 0.36,
    maxOccH: 0.92,
    refHeightM: 1.2,
    refCoreOcc: 0.58,
    power: 0.42,
    safeInset: { top: 0.045, right: 0.05, bottom: 0.13, left: 0.05 }
  };

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

  function asRect(raw, fallbackW, fallbackH) {
    if (Array.isArray(raw) && raw.length >= 4) {
      return {
        x: Number(raw[0]) || 0,
        y: Number(raw[1]) || 0,
        w: Math.max(1, Number(raw[2]) || fallbackW),
        h: Math.max(1, Number(raw[3]) || fallbackH)
      };
    }
    return { x: 0, y: 0, w: fallbackW, h: fallbackH };
  }

  function padRect(rect, canvasW, canvasH, px) {
    const p = Math.max(0, Number(px) || 0);
    const x0 = Math.max(0, rect.x - p);
    const y0 = Math.max(0, rect.y - p);
    const x1 = Math.min(canvasW, rect.x + rect.w + p);
    const y1 = Math.min(canvasH, rect.y + rect.h + p);
    return { x: x0, y: y0, w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0) };
  }

  function viewBoxCss(rect, canvasW, canvasH) {
    const { x, y, w, h } = rect;
    return {
      "--ovb-t": `${((y / canvasH) * 100).toFixed(3)}%`,
      "--ovb-r": `${(((canvasW - x - w) / canvasW) * 100).toFixed(3)}%`,
      "--ovb-b": `${(((canvasH - y - h) / canvasH) * 100).toFixed(3)}%`,
      "--ovb-l": `${((x / canvasW) * 100).toFixed(3)}%`
    };
  }

  function variantKey(shiny, female) {
    if (shiny && female) return "shiny-female";
    if (shiny) return "shiny";
    if (female) return "female";
    return "normal";
  }

  function stemExists(stem) {
    const ext = window.PLAY_SPRITE_EXT;
    if (!ext || !stem) return true;
    return Object.prototype.hasOwnProperty.call(ext, stem);
  }

  function hasCatalogVariant(dex, formId, variant) {
    const id = Number(dex);
    const fid = Number(formId || id);
    const isBase = !fid || fid === id;
    if (variant === "normal") return true;

    if (!isBase) {
      const form = typeof window.playFormMeta === "function" ? window.playFormMeta(fid) : null;
      if (variant === "shiny") {
        if (form && form.hasShinyFront === false) return false;
        const stem = typeof window.playSpriteStem === "function"
          ? window.playSpriteStem(id, "shiny", fid)
          : `forms/shiny/${fid}`;
        return stemExists(stem);
      }
      if (variant === "female" || variant === "shiny-female") {
        if (form && !form.hasFemaleFront) return false;
        const stem = typeof window.playSpriteStem === "function"
          ? window.playSpriteStem(id, variant, fid)
          : null;
        return stem ? stemExists(stem) : false;
      }
      return false;
    }

    const allowed = typeof window.playAllowedVariants === "function"
      ? window.playAllowedVariants(id)
      : (window.PLAY_VARIANTS?.[id] || []);
    if (variant === "shiny") return allowed.includes("shiny");
    if (variant === "female") return allowed.includes("female");
    if (variant === "shiny-female") return allowed.includes("shiny-female");
    return true;
  }

  window.playPokedexVariantAvailable = hasCatalogVariant;

  function normalizeIdentity(opts = {}) {
    const dex = Number(opts.dex);
    const formId = Number(opts.formId || dex);
    const form = typeof window.playFormMeta === "function" ? window.playFormMeta(formId) : null;
    const isBase = !form || form.isBase || formId === dex;
    let shiny = !!opts.shiny;
    let female = !!opts.female;

    if (form?.forcedGender === "Female" || form?.forcedGender === "Male") {
      female = false;
    } else if (!isBase && !form?.hasFemaleFront) {
      female = false;
    } else if (isBase) {
      const allowed = typeof window.playAllowedVariants === "function"
        ? window.playAllowedVariants(dex)
        : (window.PLAY_VARIANTS?.[dex] || []);
      if (!allowed.includes("female") && !allowed.includes("shiny-female")) female = false;
    }

    let variant = variantKey(shiny, female);
    if (!hasCatalogVariant(dex, formId, variant)) {
      if (shiny && female) {
        if (hasCatalogVariant(dex, formId, "shiny")) female = false;
        else if (hasCatalogVariant(dex, formId, "female")) shiny = false;
        else { shiny = false; female = false; }
      } else if (shiny && !hasCatalogVariant(dex, formId, "shiny")) {
        shiny = false;
      } else if (female && !hasCatalogVariant(dex, formId, "female")) {
        female = false;
      }
      variant = variantKey(shiny, female);
    }

    return {
      dex,
      formId,
      shiny,
      female,
      variant,
      forcedGender: form?.forcedGender || null,
      isBase: !!isBase
    };
  }

  window.normalizePokedexAppearance = normalizeIdentity;

  function desiredCoreOccupancy(heightM) {
    const env = data.envelope || {};
    const minC = Number(env.minCoreOccupancy) || 0.36;
    const maxC = Number(env.maxCoreOccupancy) || 0.86;
    const h = Math.max(0.1, Number(heightM) || FALLBACK.refHeightM);
    const bands = [
      [0.1, 0.38], [0.3, 0.42], [0.4, 0.45], [0.5, 0.47], [0.8, 0.52],
      [0.9, 0.53], [1.0, 0.56], [1.2, 0.58], [1.5, 0.62], [1.7, 0.66],
      [2.0, 0.69], [2.4, 0.72], [3.0, 0.74], [5.0, 0.77], [8.0, 0.79],
      [12.0, 0.82], [21.0, 0.85], [30.0, 0.86]
    ];
    if (h <= bands[0][0]) return bands[0][1];
    if (h >= bands[bands.length - 1][0]) return bands[bands.length - 1][1];
    for (let i = 1; i < bands.length; i += 1) {
      const [h0, o0] = bands[i - 1];
      const [h1, o1] = bands[i];
      if (h >= h0 && h <= h1) {
        let t = (h - h0) / Math.max(1e-6, h1 - h0);
        t = t * t * (3 - 2 * t);
        return Math.min(maxC, Math.max(minC, o0 + (o1 - o0) * t));
      }
    }
    return FALLBACK.refCoreOcc;
  }

  function runtimeFit(asset, heightM, envelopeScale) {
    const env = data.envelope || {};
    const pre = asset.composition;
    const inset = (pre && pre.safeInset)
      || env.safeInset
      || FALLBACK.safeInset;
    const usableW = 1 - (inset.left || 0.05) - (inset.right || 0.05);
    const usableH = 1 - (inset.top || 0.045) - (inset.bottom || 0.13);
    const maxOcc = Number(env.maxOccupancyH) || FALLBACK.maxOccH;
    const minOcc = Number(env.minOccupancyH) || FALLBACK.minOccH;

    const canvasW = Math.max(1, asset.w);
    const canvasH = Math.max(1, asset.h);
    const safe = asRect(asset.safeBounds || asset.bounds, canvasW, canvasH);
    const core = asRect(asset.coreBounds || asset.bounds, canvasW, canvasH);
    const aspect = safe.w / Math.max(1, safe.h);
    const coreOfSafe = Math.max(0.25, core.h / Math.max(1, safe.h));

    if (pre && pre.finalScaleH != null && pre.finalScaleW != null && !envelopeScale) {
      return {
        occupancyH: Number(pre.finalScaleH),
        occupancyW: Number(pre.finalScaleW),
        coreOccupancy: Number(pre.coreOccupancy) || Number(pre.finalScaleH) * coreOfSafe,
        fullEnvelopeOccupancy: Number(pre.fullEnvelopeOccupancy) || Number(pre.finalScaleH),
        desiredCoreOccupancy: Number(pre.desiredCoreOccupancy) || desiredCoreOccupancy(heightM),
        anchorType: pre.anchorType || asset.anchorType || "ground",
        xOffset: Number(pre.xOffset) || 0,
        yOffset: Number(pre.yOffset) || 0,
        heightM: heightM ?? pre.canonicalHeightM ?? null,
        safeInset: inset,
        fromManifest: true
      };
    }

    let desire = desiredCoreOccupancy(heightM);
    const candidateH = desire / coreOfSafe;
    const maxHFromWidth = usableW / aspect;
    const safeMaxH = Math.min(usableH, maxHFromWidth, maxOcc);
    let finalH = Math.min(candidateH, safeMaxH);
    finalH = Math.max(minOcc, Math.min(finalH, safeMaxH));
    if (finalH >= safeMaxH * 0.995) finalH *= 0.985;
    let finalW = finalH * aspect;
    if (finalW > usableW) {
      finalW = usableW;
      finalH = finalW / aspect;
    }
    if (envelopeScale && Number(envelopeScale) > 0) {
      finalH *= Math.min(1.15, Math.max(0.35, Number(envelopeScale)));
      finalW = finalH * aspect;
      if (finalH > safeMaxH) {
        finalH = safeMaxH;
        finalW = finalH * aspect;
      }
      if (finalW > usableW) {
        finalW = usableW;
        finalH = finalW / aspect;
      }
    }

    return {
      occupancyH: Math.round(finalH * 1000) / 1000,
      occupancyW: Math.round(finalW * 1000) / 1000,
      coreOccupancy: Math.round(finalH * coreOfSafe * 1000) / 1000,
      fullEnvelopeOccupancy: Math.round(finalH * 1000) / 1000,
      desiredCoreOccupancy: Math.round(desire * 1000) / 1000,
      anchorType: asset.anchorType || "ground",
      xOffset: 0,
      yOffset: 0,
      heightM,
      safeInset: inset,
      fromManifest: false
    };
  }

  window.pokedexPresentationOccupancy = function (heightM, envelopeScale) {
    const fit = runtimeFit({
      w: 96, h: 96,
      bounds: [0, 0, 96, 96],
      safeBounds: [0, 0, 96, 96],
      coreBounds: [16, 16, 64, 64]
    }, heightM, envelopeScale);
    return {
      occupancyH: fit.occupancyH,
      occupancyW: fit.occupancyW,
      heightM: fit.heightM
    };
  };

  function pickLayer(row, shiny, female) {
    if (!row) return null;
    if (female && shiny && row.shinyFemale) return row.shinyFemale;
    if (female && row.female) return row.female;
    if (shiny && row.shiny) return row.shiny;
    return row;
  }

  function enrichAsset(layer, row, key, shiny, female, wantStatic) {
    const base = layer || row || {};
    const composition = base.composition
      || base.animatedAsset?.composition
      || row?.composition
      || null;

    if (wantStatic) {
      const home = base.homeAsset || row?.homeAsset;
      if (home?.url) {
        return {
          class: home.class || "home",
          render: home.render || "auto",
          url: home.url,
          w: home.w || 512,
          h: home.h || 512,
          bounds: home.bounds || [0, 0, home.w || 512, home.h || 512],
          safeBounds: home.safeBounds || home.bounds,
          coreBounds: home.coreBounds || home.bounds,
          alphaBounds: home.alphaBounds || home.bounds,
          frameCount: 1,
          composition: home.composition || composition,
          anchorType: home.anchorType || "ground",
          visualCenterX: home.visualCenterX,
          visualCenterY: home.visualCenterY,
          groundY: home.groundY,
          assetKey: `${key}:home`
        };
      }
    }

    const anim = base.animatedAsset || (base.class === "battle" || /\.gif(\?|$)/i.test(base.url || "") ? base : null);
    if (anim) {
      return {
        class: anim.class || "battle",
        render: anim.render || "pixelated",
        url: anim.url || base.url || row?.url,
        w: anim.w || base.w || 96,
        h: anim.h || base.h || 96,
        bounds: anim.bounds || base.bounds,
        safeBounds: anim.safeBounds || base.safeBounds || anim.bounds || base.bounds,
        coreBounds: anim.coreBounds || base.coreBounds || anim.bounds || base.bounds,
        alphaBounds: anim.alphaBounds || base.alphaBounds || anim.bounds || base.bounds,
        frameCount: anim.frameCount || base.frameCount || 1,
        composition: anim.composition || composition,
        anchorType: anim.anchorType || base.anchorType || composition?.anchorType || "ground",
        visualCenterX: anim.visualCenterX ?? base.visualCenterX,
        visualCenterY: anim.visualCenterY ?? base.visualCenterY,
        groundY: anim.groundY ?? base.groundY,
        assetKey: `${key}:${shiny && female ? "shiny-female" : shiny ? "shiny" : female ? "female" : "anim"}`
      };
    }

    return {
      class: base.class || "battle",
      render: base.render || "pixelated",
      url: base.url || "",
      w: base.w || 96,
      h: base.h || 96,
      bounds: base.bounds || [0, 0, 96, 96],
      safeBounds: base.safeBounds || base.bounds,
      coreBounds: base.coreBounds || base.bounds,
      alphaBounds: base.alphaBounds || base.bounds,
      frameCount: base.frameCount || 1,
      composition,
      anchorType: base.anchorType || "ground",
      assetKey: `${key}:raw`
    };
  }

  function catalogMeta(dex, formId, shiny, female) {
    const id = Number(dex);
    const fid = Number(formId || id);
    const isBase = !fid || fid === id;
    const key = isBase ? String(id) : `${id}:${fid}`;
    const row = data.assets[key];
    const wantStatic = preferStatic();
    const layer = pickLayer(row, shiny, female);
    return enrichAsset(layer, row, key, shiny, female, wantStatic);
  }

  function resolveHeightM(opts, formId, dex) {
    if (opts.heightM != null && Number.isFinite(Number(opts.heightM))) {
      return Number(opts.heightM);
    }
    if (typeof window.playPokedexRef === "function") {
      const ref = window.playPokedexRef(formId, dex);
      if (ref?.heightM != null) return Number(ref.heightM);
    }
    const root = window.PLAY_POKEDEX_REF || {};
    const form = root.forms?.[formId] || root.forms?.[dex];
    if (form?.heightM != null) return Number(form.heightM);
    return null;
  }

  window.resolvePokedexPresentation = function resolvePokedexPresentation(opts = {}) {
    const identity = normalizeIdentity(opts);
    const { dex, formId, shiny, female, variant } = identity;
    const meta = catalogMeta(dex, formId, shiny, female);
    const url = typeof window.playSpriteUrl === "function"
      ? window.playSpriteUrl(dex, variant, formId)
      : meta.url;
    const asset = {
      ...meta,
      url: url || meta.url,
      assetKey: `${identity.isBase ? dex : `${dex}:${formId}`}:${variant}`
    };

    const canvasW = Math.max(1, asset.w || 96);
    const canvasH = Math.max(1, asset.h || 96);
    const safe = padRect(asRect(asset.safeBounds || asset.bounds, canvasW, canvasH), canvasW, canvasH, 1);
    const core = asRect(asset.coreBounds || asset.bounds, canvasW, canvasH);
    const heightM = resolveHeightM(opts, formId, dex);
    const fit = runtimeFit(asset, heightM, opts.envelopeScale);
    const render = asset.render || "pixelated";
    const inset = fit.safeInset
      || (data.envelope && data.envelope.safeInset)
      || FALLBACK.safeInset;

    return {
      url: stamp(asset.url),
      assetClass: asset.class || "battle",
      renderMode: render,
      sourceW: canvasW,
      sourceH: canvasH,
      frameCount: asset.frameCount || 1,
      bounds: safe,
      alphaBounds: asRect(asset.alphaBounds || asset.bounds, canvasW, canvasH),
      coreBounds: core,
      safeBounds: safe,
      identity: {
        formId,
        shiny,
        female,
        variant,
        forcedGender: identity.forcedGender
      },
      heightM: fit.heightM,
      occupancyH: fit.occupancyH,
      occupancyW: fit.occupancyW,
      coreOccupancy: fit.coreOccupancy,
      fullEnvelopeOccupancy: fit.fullEnvelopeOccupancy,
      desiredCoreOccupancy: fit.desiredCoreOccupancy,
      anchorType: fit.anchorType,
      cssVars: {
        ...viewBoxCss(safe, canvasW, canvasH),
        "--dex-art-render": render === "pixelated" ? "pixelated" : "auto",
        "--dex-occ-h": String(fit.occupancyH),
        "--dex-occ-w": String(fit.occupancyW),
        "--dex-safe-t": String(inset.top ?? 0.045),
        "--dex-safe-r": String(inset.right ?? 0.05),
        "--dex-safe-b": String(inset.bottom ?? 0.13),
        "--dex-safe-l": String(inset.left ?? 0.05),
        "--dex-x-off": String(fit.xOffset || 0),
        "--dex-y-off": String(fit.yOffset || 0)
      },
      assetKey: asset.assetKey
    };
  };
})();
