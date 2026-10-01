const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const dir = path.join(ROOT, "images", "team-bgs", "owner");
const files = fs.readdirSync(dir).filter((n) => /\.png$/i.test(n) && !n.startsWith("_")).sort();
const outDir = path.join(ROOT, "docs", "audits", "owner-bg-rc108");
fs.mkdirSync(outDir, { recursive: true });

const rows = files.map((file) => {
  const full = path.join(dir, file);
  const buf = fs.readFileSync(full);
  // PNG IHDR width/height
  let width = 0;
  let height = 0;
  if (buf[0] === 0x89 && buf.toString("ascii", 1, 4) === "PNG") {
    width = buf.readUInt32BE(16);
    height = buf.readUInt32BE(20);
  }
  return {
    file,
    path: `images/team-bgs/owner/${file}`,
    bytes: buf.length,
    width,
    height,
    valid: width > 0 && height > 0
  };
});

fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify({ total: rows.length, broken: rows.filter((r) => !r.valid), rows }, null, 2));

const html = `<!doctype html>
<html><head><meta charset="utf-8"><base href="/"><title>Owner BG contact sheet rc108</title>
<style>
body{margin:16px;font-family:Segoe UI,sans-serif;background:#eef6ff;color:#1a2744}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}
.card{background:#fff;border:1px solid #cfe3f4;border-radius:12px;padding:8px}
.card img{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:8px;background:#ddd;image-rendering:auto}
.bad{outline:3px solid #e25555}
meta{font-size:11px;color:#4a5a78}
</style></head><body>
<h1>Owner-imported Team backgrounds (${rows.length})</h1>
<pre id="sum"></pre>
<div class="grid">${rows.map((r) => `
  <article class="card${r.valid ? "" : " bad"}" data-file="${r.file}">
    <img src="${r.path}" alt="${r.file}" loading="eager">
    <strong>${r.file}</strong>
    <div class="meta">${r.width}×${r.height} · ${r.bytes} bytes</div>
  </article>`).join("")}</div>
<script>
(async () => {
  const cards = [...document.querySelectorAll('.card')];
  let ok=0, bad=0;
  await Promise.all(cards.map(async (card) => {
    const img = card.querySelector('img');
    await new Promise((res) => { if (img.complete) res(); else img.onload = img.onerror = res; });
    if (img.naturalWidth > 0) ok++; else { bad++; card.classList.add('bad'); }
  }));
  const summary = { total: cards.length, naturalOk: ok, naturalBad: bad, pass: bad===0 };
  document.getElementById('sum').textContent = JSON.stringify(summary, null, 2);
  window.__OWNER_BG_SHEET__ = summary;
})();
</script>
</body></html>`;
fs.writeFileSync(path.join(outDir, "contact-sheet.html"), html);
console.log(JSON.stringify({ total: rows.length, invalidDim: rows.filter((r) => !r.valid).map((r) => r.file) }, null, 2));
