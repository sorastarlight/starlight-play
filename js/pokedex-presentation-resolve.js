(() => {
  const data = window.PLAY_POKEDEX_PRESENTATION;
  if (!data) return;

  const SCALE = {
    minOccH: 0.4,
    maxOccH: 0.9,
    refHeightM: 1.2,
    refOccH: 0.68,
    power: 0.45,
    extremeBoostH: 10,
    extremeOccH: 0.94
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
    if (!raw?.url && !(raw?.w || raw?.h)) return null;
    return {
      class: raw.class || "battle",
      render: raw.render || (raw.class === "battle" || raw.class === "stadium2" ? "pixelated" : "auto"),
      url: raw.url || "",
      w: Number(raw.w) || 96,
      h: Number(raw.h) || 96,
      bounds: raw.bounds || [0, 0, Number(raw.w) || 96, Number(raw.h) || 96],
      frameCount: Number(raw.frameCount) || 1,
      assetKey
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

    // Form stems already encode costume sex; do not layer female/ path.
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
        if (hasCatalogVariant(dex, formId, "shiny")) {
          female = false;
        } else if (hasCatalogVariant(dex, formId, "female")) {
          shiny = false;
        } else {
          shiny = false;
          female = false;
        }
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

  function heightToOccupancy(heightM, envelopeScale = 1) {
    const env = data.envelope || {};
    const minH = Number(env.minOccupancyH) || SCALE.minOccH;
    const maxH = Number(env.maxOccupancyH) || SCALE.maxOccH;
    const refH = Number(env.refHeightM) || SCALE.refHeightM;
    const refOcc = Number(env.refOccupancyH) || SCALE.refOccH;
    const power = Number(env.scalePower) || SCALE.power;
    const h = Math.max(0.1, Number(heightM) || refH);
    const ratio = Math.pow(h / refH, power);
    let occH = refOcc * ratio;
    if (h >= (Number(env.extremeBoostH) || SCALE.extremeBoostH)) {
      occH = Math.max(occH, Number(env.extremeOccupancyH) || SCALE.extremeOccH);
    }
    occH = Math.min(maxH, Math.max(minH, occH));
    occH *= Math.max(0.35, Math.min(1.15, Number(envelopeScale) || 1));
    occH = Math.min(maxH, Math.max(minH * 0.85, occH));
    const occW = Math.min(0.94, Math.max(0.52, occH * 1.12 + 0.06));
    return {
      occupancyH: Math.round(occH * 1000) / 1000,
      occupancyW: Math.round(occW * 1000) / 1000,
      heightM: h
    };
  }

  window.pokedexPresentationOccupancy = heightToOccupancy;

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

    if (base.animatedAsset) return asAsset(base.animatedAsset, `${key}:anim`);
    if (base.class === "battle" || /\.gif(\?|$)/i.test(base.url || "")) {
      return asAsset(base, `${key}:anim`);
    }

    const home = asAsset(base.homeAsset, `${key}:home`);
    if (home) return home;
    const oa = asAsset(base.officialArtworkAsset, `${key}:oa`);
    if (oa) return oa;
    return asAsset(base, key);
  }

  /** Catalog meta (bounds) only — URL always comes from exact identity axes. */
  function catalogMeta(dex, formId, shiny, female) {
    const id = Number(dex);
    const fid = Number(formId || id);
    const isBase = !fid || fid === id;
    const key = isBase ? String(id) : `${id}:${fid}`;
    const row = data.assets[key];
    const wantStatic = preferStatic();

    if (female && shiny && row?.shinyFemale) {
      return asAsset(row.shinyFemale, `${key}:shiny-female`);
    }
    if (female && row?.female) {
      // Bounds envelope only when shinyFemale missing — URL still exact shiny-female.
      const f = asAsset(row.female, `${key}:female-bounds`);
      if (f && !shiny) return f;
      if (f && shiny) {
        return { ...f, assetKey: `${key}:shiny-female-bounds` };
      }
    }

    const picked = pickFromRow(row, key, shiny, wantStatic);
    if (picked) return picked;
    return {
      class: "battle",
      render: "pixelated",
      url: "",
      w: 96,
      h: 96,
      bounds: [0, 0, 96, 96],
      frameCount: 1,
      assetKey: `${key}:synth`
    };
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
    const margin = Number(data.envelope?.margin) || 0.08;
    const meta = catalogMeta(dex, formId, shiny, female);
    const url = typeof window.playSpriteUrl === "function"
      ? window.playSpriteUrl(dex, variant, formId)
      : meta.url;
    const asset = {
      ...meta,
      url: url || meta.url,
      assetKey: `${identity.isBase ? dex : `${dex}:${formId}`}:${variant}`
    };

    const bounds = padBounds(asset.bounds, asset.w, asset.h, margin);
    const heightM = resolveHeightM(opts, formId, dex);
    const scale = heightToOccupancy(heightM, opts.envelopeScale);
    const render = asset.render || "pixelated";

    return {
      url: stamp(asset.url),
      assetClass: asset.class || "battle",
      renderMode: render,
      sourceW: asset.w,
      sourceH: asset.h,
      frameCount: asset.frameCount || 1,
      bounds: { x: bounds[0], y: bounds[1], w: bounds[2], h: bounds[3] },
      identity: {
        formId,
        shiny,
        female,
        variant,
        forcedGender: identity.forcedGender
      },
      heightM: scale.heightM,
      occupancyH: scale.occupancyH,
      occupancyW: scale.occupancyW,
      cssVars: {
        ...viewBoxCss(bounds, asset.w, asset.h),
        "--dex-art-render": render === "pixelated" ? "pixelated" : "auto",
        "--dex-occ-h": String(scale.occupancyH),
        "--dex-occ-w": String(scale.occupancyW)
      },
      assetKey: asset.assetKey
    };
  };
})();
