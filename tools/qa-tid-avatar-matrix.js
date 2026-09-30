/**
 * Trainer ID card-mode presence matrix for owner review.
 * Serve play-site and open /tmp-tid-avatar-matrix.html
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const IDS = [
  "red-gen1", "red-gen3", "leaf", "iris", "red-lgpe", "red",
  "sora", "hikari", "takeru", "taichi", "mimi", "yamato",
  "sonic-sonic", "sonic-tails", "sonic-knuckles", "sonic-amy", "sonic-cream"
];

const html = `<!doctype html>
<html><head>
<meta charset="utf-8">
<title>Trainer ID Avatar Matrix rc106</title>
<link rel="stylesheet" href="css/play.css">
<style>
body { margin: 16px; background: #e8f4ff; font-family: Segoe UI, sans-serif; color: #1a2744; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
.card-wrap { background: #fff; border: 1px solid #c5e0f2; border-radius: 14px; padding: 10px; }
.tid-avatar-well {
  position: relative;
  width: 100%;
  height: 360px;
  min-height: 360px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  overflow: hidden;
  border-radius: 12px;
  background: radial-gradient(120% 90% at 50% 15%, #ffffff 0%, #dceeff 45%, #9ed0f0 100%);
  padding: 12px 12px 18px;
  box-sizing: border-box;
}
.meta { font-size: 11px; white-space: pre-wrap; margin-top: 8px; color: #4a5a78; }
h1 { margin: 0 0 12px; }
</style>
</head><body>
<h1>Trainer ID card-mode matrix</h1>
<div class="grid">
${IDS.map((id) => `
  <div class="card-wrap" data-id="${id}">
    <strong>${id}</strong>
    <div class="tid-avatar-well">
      <span class="avatar-stage-shadow" aria-hidden="true"></span>
      <img class="tid-avatar-sprite" data-avatar-id="${id}" src="images/trainers/${id}.png" width="320" height="320"
        onload="window.playNormalizeTrainerAvatar?.(this, { mode: 'card' })"
        onerror="this.onerror=null;this.src='images/trainers/red-gen1.png';window.playNormalizeTrainerAvatar?.(this,{mode:'card'})">
    </div>
    <div class="meta" data-meta>…</div>
  </div>`).join("")}
</div>
<script src="js/trainers.js"></script>
<script>
(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await wait(900);
  const rows = [];
  for (const wrap of document.querySelectorAll(".card-wrap")) {
    const img = wrap.querySelector("img");
    window.playNormalizeTrainerAvatar?.(img, { mode: "card" });
    await wait(0);
    const well = wrap.querySelector(".tid-avatar-well");
    const [rw, rh] = String(img.dataset.avatarRender || "0x0").split("x").map(Number);
    const crop = rh > well.clientHeight - 2 || rw > well.clientWidth - 2;
    const row = {
      id: wrap.dataset.id,
      family: img.dataset.avatarFamily,
      src: (img.dataset.avatarSrcW || "?") + "x" + (img.dataset.avatarSrcH || "?"),
      alpha: img.dataset.avatarVis,
      core: img.dataset.avatarCore,
      render: img.dataset.avatarRender,
      stagePct: img.dataset.avatarStagePct,
      widthPct: img.dataset.avatarWidthPct,
      strategy: img.dataset.avatarStrategy,
      cropped: crop,
      grounded: true
    };
    rows.push(row);
    wrap.querySelector("[data-meta]").textContent =
      [row.family, "src " + row.src, "alpha " + row.alpha, "core " + row.core,
       "render " + row.render, "H " + row.stagePct + "%", "W " + row.widthPct + "%",
       row.strategy, crop ? "CROP" : "OK"].join("\\n");
  }
  window.__TID_MATRIX__ = rows;
  console.table(rows);
})();
</script>
</body></html>`;

fs.writeFileSync(path.join(ROOT, "tmp-tid-avatar-matrix.html"), html);
console.log("wrote tmp-tid-avatar-matrix.html", IDS.length);
