(() => {
  const kind = document.getElementById("lab-kind");
  const species = document.getElementById("lab-species");
  const variant = document.getElementById("lab-variant");
  const gender = document.getElementById("lab-gender");
  const qty = document.getElementById("lab-qty");
  const perf = document.getElementById("lab-perf");
  const reduced = document.getElementById("lab-reduced");
  const status = document.getElementById("lab-status");
  if (!kind) return;

  function opts() {
    return {
      species: Number(species?.value || 25),
      variant: variant?.value || "normal",
      gender: gender?.value || "",
      qty: Number(qty?.value || 5),
      item: "ultraball",
      perf: perf?.value || "",
      reducedMotion: Boolean(reduced?.checked)
    };
  }

  function note(text) {
    if (status) status.textContent = text;
  }

  document.getElementById("lab-run")?.addEventListener("click", () => {
    const preview = String(kind.value || "toast");
    if (typeof window.playPresentPreview !== "function") {
      note("Presentation system is not loaded.");
      return;
    }
    window.playPresentPreview(preview, opts());
    note(`Previewing ${preview}. Visual only — nothing was granted.`);
  });

  document.getElementById("lab-queue")?.addEventListener("click", () => {
    if (typeof window.playPresentEnqueue !== "function") return;
    const o = opts();
    window.playPresentSetEnv?.({ perf: o.perf, reducedMotion: o.reducedMotion });
    window.playPresentEnqueue([
      { id: "lab:q-dex", type: "pokedex", species: o.species, variant: o.variant, gender: o.gender, preview: true },
      { id: "lab:q-level", type: "level", from: 24, to: 25, preview: true },
      { id: "lab:q-ach", type: "achievement", subtitle: "Shocking Discovery", body: "Register Pikachu in your Pokédex.", rewards: [{ type: "coins", amount: 100 }], preview: true },
      { id: "lab:q-xp", type: "xp", title: "+25 XP", body: "Trainer XP", preview: true }
    ], { source: "capture", preview: true, caughtName: window.playSpeciesName?.(o.species) || "Pikachu" });
    note("Queued Pokédex → Level Up → Achievement → summary. Visual only.");
  });

  document.getElementById("lab-confirm")?.addEventListener("click", async () => {
    const ok = typeof window.playPresentConfirm === "function"
      ? await window.playPresentConfirm({ title: "Confirm purchase", body: "Ultra Ball ×5 for 2,500 PokéCoins?", confirmLabel: "Buy" })
      : false;
    note(ok ? "Confirm preview: Buy" : "Confirm preview: Cancel");
  });

  document.getElementById("lab-reset")?.addEventListener("click", () => {
    window.playPresentReset?.(false);
    window.playPresentSetEnv?.({ perf: "", reducedMotion: null, instant: false, preview: false });
    note("Preview reset. No economy mutations occurred.");
  });
})();
