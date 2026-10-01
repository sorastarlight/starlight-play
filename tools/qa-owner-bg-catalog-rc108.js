const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const t = fs.readFileSync(path.join(ROOT, "js", "trainers.js"), "utf8");
const assets = [...t.matchAll(/"asset": "(images\/team-bgs\/owner\/[^"]+)"/g)].map((m) => m[1]);
const missing = assets.filter((a) => !fs.existsSync(path.join(ROOT, a)));
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "docs", "audits", "owner-bg-rc108", "manifest.json"), "utf8"));
const disk = fs.readdirSync(path.join(ROOT, "images", "team-bgs", "owner")).filter((n) => /\.png$/i.test(n) && !n.startsWith("_"));
const inManifestNotDisk = manifest.rows.filter((r) => !disk.includes(r.file)).map((r) => r.file);
const onDiskNotCatalog = disk.filter((f) => !assets.some((a) => a.endsWith("/" + f)));
console.log(JSON.stringify({
  catalogOwnerAssets: assets.length,
  diskOwnerPng: disk.length,
  missingFiles: missing,
  invalidDim: manifest.broken,
  inManifestNotDisk,
  onDiskNotCatalog
}, null, 2));
