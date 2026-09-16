(() => {
  const KEY = "play-perf";
  const root = typeof window !== "undefined" ? window : globalThis;

  function motionReduced() {
    try {
      return Boolean(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    } catch (_) {
      return false;
    }
  }

  function detectAuto() {
    if (motionReduced()) return "low";
    const cores = Number(typeof navigator !== "undefined" ? navigator.hardwareConcurrency : 0) || 0;
    const mem = Number(typeof navigator !== "undefined" ? navigator.deviceMemory : 0);
    const memKnown = Number.isFinite(mem) && mem > 0;
    if (memKnown && mem <= 4) return "balanced";
    if (cores > 0 && cores <= 4) return "balanced";
    if (memKnown && mem >= 8 && cores >= 6) return "high";
    return "balanced";
  }

  function readPref() {
    try {
      const raw = String(localStorage.getItem(KEY) || "auto");
      if (raw === "auto" || raw === "high" || raw === "balanced" || raw === "low") return raw;
    } catch (_) {}
    return "auto";
  }

  function effective(pref) {
    return (pref || readPref()) === "auto" ? detectAuto() : (pref || readPref());
  }

  function apply(pref) {
    const chosen = pref || readPref();
    const mode = effective(chosen);
    if (typeof document === "undefined") return { pref: chosen, mode, reducedMotion: motionReduced() };
    const html = document.documentElement;
    if (!html) return { pref: chosen, mode, reducedMotion: motionReduced() };
    html.dataset.perfPref = chosen;
    html.dataset.perf = mode;
    const reduced = motionReduced();
    html.dataset.reducedMotion = reduced ? "1" : "0";
    if (document.body) {
      document.body.classList.toggle("is-perf-low", mode === "low");
      document.body.classList.toggle("is-perf-balanced", mode === "balanced");
      document.body.classList.toggle("is-perf-high", mode === "high");
    }
    return { pref: chosen, mode, reducedMotion: reduced };
  }

  root.playPerfPref = readPref;
  root.playPerfMode = function playPerfMode() {
    return effective(readPref());
  };
  root.playPerfReduced = function playPerfReduced() {
    return motionReduced();
  };
  root.playSetPerfPref = function playSetPerfPref(pref) {
    const next = pref === "high" || pref === "balanced" || pref === "low" || pref === "auto" ? pref : "auto";
    try { localStorage.setItem(KEY, next); } catch (_) {}
    return apply(next);
  };
  root.playApplyPerf = apply;
  root.playLazyAttr = function playLazyAttr(priority) {
    if (priority === "eager") return ' loading="eager" decoding="async"';
    return ' loading="lazy" decoding="async"';
  };

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => apply());
    }
    apply();
  }
})();
