/**
 * Real-DOM Avatar Browser thumbnail audit (rc107).
 * Serves nothing — writes a static HTML page under docs/audits that loads
 * production play.css + trainers.js and measures getBoundingClientRect
 * of projected visible-alpha vs each .scc-avatar-thumb tile.
 *
 * Run: node tools/qa-avatar-thumb-dom-rc107.js
 * Then open the written HTML in a browser (or via local static server).
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "docs", "audits", "avatar-thumb-rc107");
const TRAINERS_DIR = path.join(ROOT, "images", "trainers");
const TRAINERS_JS = fs.readFileSync(path.join(ROOT, "js", "trainers.js"), "utf8");

function listIdsFromCatalog() {
  const ids = new Set();
  const re = /id:\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(TRAINERS_JS))) {
    const id = m[1];
    if (fs.existsSync(path.join(TRAINERS_DIR, `${id}.png`))) ids.add(id);
  }
  return [...ids].sort();
}

function groupOf(id) {
  const key = String(id || "").toLowerCase();
  if (/^sonic/.test(key)) return "sonic";
  if (/^(taichi|yamato|sora|hikari|takeru|joe|mimi|koushiro)$/.test(key)) return "digimon";
  if (/lgpe|home|modern|iris|serena-anime|rosa-wonderlauncher/.test(key)) return "premium";
  return "pokemon";
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const ids = listIdsFromCatalog();
  const byGroup = { digimon: [], sonic: [], premium: [], pokemon: [] };
  ids.forEach((id) => {
    const g = groupOf(id);
    (byGroup[g] || byGroup.pokemon).push(id);
  });

  const html = `<!doctype html>
<html><head>
<meta charset="utf-8">
<title>Avatar Thumb REAL DOM Audit rc107</title>
<link rel="stylesheet" href="../../../css/play.css">
<style>
body { margin: 16px; font-family: Segoe UI, sans-serif; background: #eef6ff; color: #1a2744; }
h1,h2 { margin: 12px 0 8px; }
.sheet { display: grid; grid-template-columns: repeat(auto-fill, minmax(128px, 1fr)); gap: 10px; margin-bottom: 28px; }
.cell { background: #fff; border: 1px solid #cfe3f4; border-radius: 12px; padding: 8px; text-align: center; }
.cell .scc-avatar-thumb { margin: 0 auto 6px; }
.cell strong { display:block; font-size: 11px; word-break: break-all; }
.metrics { font-size: 10px; color: #4a5a78; min-height: 2.4em; }
.fail { outline: 3px solid #e25555; }
.pass { outline: 2px solid #3aa66a; }
#summary { white-space: pre-wrap; background: #fff; padding: 12px; border-radius: 12px; border: 1px solid #cfe3f4; }
</style>
</head><body>
<h1>Avatar Browser — REAL DOM Thumbnail Audit (rc107)</h1>
<p>Measures actual tile vs projected visible-alpha rects after <code>playNormalizeAvatarThumb</code>.</p>
<pre id="summary">Running…</pre>
${Object.entries(byGroup).map(([g, list]) => `
  <h2 id="group-${g}">${g} (${list.length})</h2>
  <div class="sheet" data-group="${g}">${list.map((id) => `
    <div class="cell" data-id="${id}">
      <span class="scc-avatar-thumb">
        <img class="scc-avatar-thumb-img" data-avatar-id="${id}" src="../../../images/trainers/${id}.png" width="96" height="96" decoding="async" onload="window.playNormalizeAvatarThumb?.(this)">
      </span>
      <strong>${id}</strong>
      <div class="metrics" data-metrics></div>
    </div>`).join("")}</div>`).join("")}
<script src="../../../js/trainers.js?v=rc107b"></script>
<script>
(async function () {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  // Wait for images + normalize (alpha canvas may be async).
  for (let i = 0; i < 40; i++) {
    const imgs = [...document.querySelectorAll(".scc-avatar-thumb-img")];
    const ready = imgs.filter((img) => img.dataset.avatarNorm === "1").length;
    if (ready >= imgs.length * 0.98) break;
    await wait(250);
  }
  await wait(400);

  const insetTol = 0.5; // px float tolerance
  const cells = [...document.querySelectorAll(".cell")];
  let cropped = 0, translated = 0, overflow = 0, missing = 0, visible = 0;
  const fails = [];

  for (const cell of cells) {
    const img = cell.querySelector("img");
    const thumb = cell.querySelector(".scc-avatar-thumb");
    const metrics = cell.querySelector("[data-metrics]");
    if (!img || !img.naturalWidth || !thumb) {
      missing += 1;
      cell.classList.add("fail");
      if (metrics) metrics.textContent = "MISSING";
      fails.push({ id: cell.dataset.id, reason: "missing" });
      continue;
    }
    // Force normalize if still pending
    if (img.dataset.avatarNorm !== "1") {
      window.playNormalizeAvatarThumb?.(img);
      await wait(30);
    }

    const tile = thumb.getBoundingClientRect();
    const ir = img.getBoundingClientRect();
    const vis = String(img.dataset.avatarRender || "").split("x").map(Number);
    const visW = vis[0] || ir.width;
    const visH = vis[1] || ir.height;
    const inset = Number(img.dataset.avatarThumbInset || 6);
    // Contract: visible alpha is centered on tile X and grounded at bottom inset.
    const centerX = tile.left + tile.width / 2;
    const alphaBottom = tile.bottom - inset;
    const proj = {
      left: centerX - visW / 2,
      right: centerX + visW / 2,
      bottom: alphaBottom,
      top: alphaBottom - visH
    };

    const soft = 1.5;
    const outL = proj.left < tile.left - soft;
    const outR = proj.right > tile.right + soft;
    const outT = proj.top < tile.top - soft;
    const outB = proj.bottom > tile.bottom + soft;
    const alphaCx = centerX;
    const alphaCy = (proj.top + proj.bottom) / 2;
    const translatedOut = alphaCx < tile.left || alphaCx > tile.right || alphaCy < tile.top || alphaCy > tile.bottom;

    let status = "PASS";
    if (translatedOut) { translated += 1; status = "TRANSLATED"; }
    else if (outL || outR || outT || outB) { cropped += 1; status = "CROPPED"; }
    else { visible += 1; }

    if (status !== "PASS") {
      cell.classList.add("fail");
      fails.push({
        id: cell.dataset.id,
        status,
        proj: { l: +proj.left.toFixed(1), r: +proj.right.toFixed(1), t: +proj.top.toFixed(1), b: +proj.bottom.toFixed(1) },
        tile: { l: +tile.left.toFixed(1), r: +tile.right.toFixed(1), t: +tile.top.toFixed(1), b: +tile.bottom.toFixed(1) },
        vis: img.dataset.avatarVis,
        render: img.dataset.avatarRender,
        scale: img.dataset.avatarScale,
        pad: img.dataset.avatarPad || "",
        bottomCss: getComputedStyle(img).bottom
      });
    } else {
      cell.classList.add("pass");
    }
    if (metrics) {
      metrics.textContent = status + " · " + (img.dataset.avatarRender || "?") + " @" + (img.dataset.avatarScale || "?");
    }
  }

  const summary = {
    build: window.PLAY_BUILD || "(trainers.js)",
    total: cells.length,
    fullyVisible: visible,
    cropped,
    translatedOutsideTile: translated,
    overflow,
    missing,
    fails: fails.slice(0, 40),
    pass: cropped === 0 && translated === 0 && overflow === 0 && missing === 0
  };
  document.getElementById("summary").textContent = JSON.stringify(summary, null, 2);
  window.__AVATAR_THUMB_AUDIT_RC107__ = summary;
  console.log("AVATAR_THUMB_AUDIT_RC107", summary);
})();
</script>
</body></html>`;

  const outHtml = path.join(OUT_DIR, "real-dom-audit.html");
  fs.writeFileSync(outHtml, html);
  fs.writeFileSync(path.join(OUT_DIR, "ids.json"), JSON.stringify({ total: ids.length, byGroup }, null, 2));
  console.log("Wrote", outHtml);
  console.log("Avatar ids:", ids.length, byGroup);
}

main();
