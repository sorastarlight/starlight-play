/**
 * PC-specific sprite presentation (storage slots / inspect).
 * Reuses local presentation catalog bounds when available, but applies a
 * narrow PC envelope — NOT the Pokédex canonical-height curve.
 * Runtime: local assets only.
 */
(() => {
  const SLOT_MIN = 0.56;
  const SLOT_MAX = 0.74;
  const SLOT_BASE = 0.64;
  const INSPECT_MIN = 0.62;
  const INSPECT_MAX = 0.82;
  const INSPECT_BASE = 0.72;

  function morphOf(dex, formId) {
    const root = window.PLAY_POKEDEX_PRESENTATION;
    if (!root?.assets) return { morphology: "STANDARD", flags: [] };
    const id = Number(dex);
    const fid = Number(formId || dex);
    const key = fid && fid !== id ? `${id}:${fid}` : String(id);
    const row = root.assets[key] || root.assets[String(id)];
    const asset = row?.animatedAsset || row || {};
    const comp = asset.composition || {};
    return {
      morphology: String(comp.morphology || asset.morphology || "STANDARD").toUpperCase(),
      flags: (comp.morphologyFlags || asset.morphologyFlags || []).map((f) => String(f).toUpperCase())
    };
  }

  function clampScale(base, morph, mode) {
    let s = base;
    const m = morph.morphology;
    const flags = new Set(morph.flags || []);
    if (m === "SMALL_STANDARD") s *= 1.08;
    else if (m === "SERPENTINE" || m === "LONG_BODY" || flags.has("LONG_BODY")) s *= 0.94;
    else if (m === "GIANT_FORM") s *= 0.90;
    else if (m === "WINGED" || flags.has("WINGED")) s *= 0.96;
    else if (m === "FLOATING" || flags.has("FLOATING")) s *= 1.02;
    const lo = mode === "inspect" ? INSPECT_MIN : SLOT_MIN;
    const hi = mode === "inspect" ? INSPECT_MAX : SLOT_MAX;
    return Math.max(lo, Math.min(hi, s));
  }

  function monVariant(mon) {
    const shiny = Boolean(mon?.shiny) || String(mon?.variant || "").toLowerCase().includes("shiny");
    const gender = mon?.gender
      || (String(mon?.variant || "").toLowerCase().includes("female") ? "Female" : "");
    if (typeof window.playSpriteVariant === "function") {
      return window.playSpriteVariant(mon.dex, gender, shiny);
    }
    return mon?.variant || "normal";
  }

  window.playPcSpriteUrl = function playPcSpriteUrl(mon) {
    if (!mon) return "";
    const variant = monVariant(mon);
    return typeof window.playSpriteUrl === "function"
      ? window.playSpriteUrl(mon.dex, variant, mon.formId)
      : "";
  };

  window.resolvePcPresentation = function resolvePcPresentation(mon, mode = "slot") {
    const morph = morphOf(mon?.dex, mon?.formId);
    const base = mode === "inspect" ? INSPECT_BASE : SLOT_BASE;
    const scale = clampScale(base, morph, mode);
    const url = window.playPcSpriteUrl(mon);
    const reduced = document.documentElement.dataset.reducedMotion === "1"
      || document.documentElement.dataset.perf === "low";
    return {
      url,
      mode,
      morphology: morph.morphology,
      morphologyFlags: morph.flags,
      scale,
      reducedMotion: reduced,
      cssVars: {
        "--pc-sprite-scale": String(scale)
      }
    };
  };
})();
