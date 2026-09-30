/**
 * Local QA: Avatar Browser thumbnail contain audit + contact sheets.
 * Opens a headless-friendly page using the same thumb renderer rules.
 * Run: node tools/qa-avatar-thumb-audit.js
 * Requires: play-site served locally OR file paths resolved relative to play-site.
 */
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "docs", "audits", "avatar-thumb-rc106");
const TRAINERS_DIR = path.join(ROOT, "images", "trainers");

function listTrainerPngs() {
  return fs.readdirSync(TRAINERS_DIR)
    .filter((name) => /\.png$/i.test(name) && !name.includes("portrait"))
    .map((name) => name.replace(/\.png$/i, ""))
    .sort();
}

function groupOf(id) {
  const key = String(id || "").toLowerCase();
  if (/^sonic/.test(key)) return "sonic";
  if (/^(taichi|yamato|sora|hikari|takeru|joe|mimi|koushiro)$/.test(key)) return "digimon";
  if (/modern|home|render|official/.test(key)) return "premium";
  return "pokemon";
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const ids = listTrainerPngs();
  const byGroup = { pokemon: [], digimon: [], sonic: [], premium: [] };
  ids.forEach((id) => {
    const g = groupOf(id);
    (byGroup[g] || byGroup.pokemon).push(id);
  });

  const html = `<!doctype html>
<html><head>
<meta charset="utf-8">
<title>Avatar Thumb Audit rc106</title>
<link rel="stylesheet" href="../css/play.css">
<style>
body { margin: 16px; font-family: Segoe UI, sans-serif; background: #eef6ff; }
h1,h2 { color: #1a2744; }
.sheet { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px; margin-bottom: 28px; }
.cell { background: #fff; border: 1px solid #cfe3f4; border-radius: 12px; padding: 8px; text-align: center; }
.cell .scc-avatar-thumb { margin: 0 auto 6px; }
.cell strong { display:block; font-size: 11px; }
.metrics { font-size: 10px; color: #4a5a78; }
.fail { outline: 2px solid #e25555; }
.pass { outline: 2px solid #3aa66a; }
#summary { white-space: pre-wrap; background: #fff; padding: 12px; border-radius: 12px; border: 1px solid #cfe3f4; }
</style>
</head><body>
<h1>Avatar Browser Thumbnail Audit</h1>
<pre id="summary">Running…</pre>
${Object.entries(byGroup).map(([g, list]) => `
  <h2>${g} (${list.length})</h2>
  <div class="sheet" data-group="${g}">${list.map((id) => `
    <div class="cell" data-id="${id}">
      <span class="scc-avatar-thumb">
        <img class="scc-avatar-thumb-img" data-avatar-id="${id}" src="../images/trainers/${id}.png" width="96" height="96" onload="window.playNormalizeAvatarThumb?.(this)">
      </span>
      <strong>${id}</strong>
      <div class="metrics" data-metrics></div>
    </div>`).join("")}</div>`).join("")}
<script src="../js/trainers.js"></script>
<script>
(async function () {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await wait(800);
  const cells = [...document.querySelectorAll(".cell")];
  let cropped = 0, overflow = 0, missing = 0, visible = 0;
  const rows = [];
  for (const cell of cells) {
    const img = cell.querySelector("img");
    const metrics = cell.querySelector("[data-metrics]");
    if (!img || !img.naturalWidth) {
      missing += 1;
      cell.classList.add("fail");
      metrics.textContent = "MISSING";
      rows.push({ id: cell.dataset.id, status: "missing" });
      continue;
    }
    // Force normalize once more after layout.
    window.playNormalizeAvatarThumb?.(img);
    await wait(0);
    const thumb = cell.querySelector(".scc-avatar-thumb");
    const [rw, rh] = String(img.dataset.avatarRender || "0x0").split("x").map(Number);
    const pad = 2;
    const fitsH = rh <= thumb.clientHeight - pad;
    const fitsW = rw <= thumb.clientWidth - pad;
    const stagePct = Number(img.dataset.avatarStagePct || 0);
    const isCrop = !fitsH || !fitsW || stagePct > 96;
    const isOverflow = rh > thumb.clientHeight + 1 || rw > thumb.clientWidth + 1;
    if (isCrop) cropped += 1;
    if (isOverflow) overflow += 1;
    if (!isCrop && !isOverflow) {
      visible += 1;
      cell.classList.add("pass");
    } else cell.classList.add("fail");
    const line = {
      id: cell.dataset.id,
      family: img.dataset.avatarFamily,
      mode: img.dataset.avatarMode,
      strategy: img.dataset.avatarStrategy,
      src: img.dataset.avatarSrcW + "x" + img.dataset.avatarSrcH,
      vis: img.dataset.avatarVis,
      render: img.dataset.avatarRender,
      stagePct: img.dataset.avatarStagePct,
      cropped: isCrop,
      overflow: isOverflow,
      fitsH, fitsW, stagePct
    };
    rows.push(line);
    metrics.textContent = (img.dataset.avatarFamily || "?") + " · " + (img.dataset.avatarStagePct || "?") + "% · " + (isCrop ? "CROP" : "OK");
  }
  const summary = {
    total: cells.length,
    fullyVisible: visible,
    cropped,
    overflow,
    missing,
    invalid: 0,
    pass: cropped === 0 && overflow === 0 && missing === 0
  };
  document.getElementById("summary").textContent = JSON.stringify(summary, null, 2);
  window.__THUMB_AUDIT__ = { summary, rows };
})();
</script>
</body></html>`;

  const outHtml = path.join(OUT, "thumb-audit.html");
  fs.writeFileSync(outHtml, html, "utf8");
  // Copy relative expectation: place under play-site/docs/audits so ../css and ../js are wrong.
  // Rewrite to use absolute-from-play-site paths via a sibling under play-site root tmp.
  const served = path.join(ROOT, "tmp-avatar-thumb-audit.html");
  const htmlServed = html
    .replace(/href="\.\.\/css\/play\.css"/g, 'href="css/play.css"')
    .replace(/src="\.\.\/js\/trainers\.js"/g, 'src="js/trainers.js"')
    .replace(/src="\.\.\/images\/trainers\//g, 'src="images/trainers/');
  fs.writeFileSync(served, htmlServed, "utf8");
  fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify({
    totalFiles: ids.length,
    groups: Object.fromEntries(Object.entries(byGroup).map(([k, v]) => [k, v.length])),
    html: pathToFileURL(served).href,
    note: "Open via local static server or file URL; evaluate window.__THUMB_AUDIT__"
  }, null, 2));
  console.log(JSON.stringify({
    ok: true,
    total: ids.length,
    groups: Object.fromEntries(Object.entries(byGroup).map(([k, v]) => [k, v.length])),
    served,
    out: OUT
  }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
