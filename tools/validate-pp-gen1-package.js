/**
 * Pre-mutation integrity check for ProjectPokemon Gen1 sprite package.
 * Exit 0 only if package is safe to replace the current library.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const sourceRoot = process.argv[2];
if (!sourceRoot || !fs.existsSync(path.join(sourceRoot, "manifest.csv"))) {
  console.error("usage: node tools/validate-pp-gen1-package.js <extracted-source-root>");
  process.exit(2);
}

function splitCsvLine(line) {
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i += 1; }
      else inQ = !inQ;
      continue;
    }
    if (ch === "," && !inQ) { out.push(cur); cur = ""; continue; }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, "").trim().split(/\r?\n/);
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).filter(Boolean).map((line) => {
    const cols = splitCsvLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = cols[i] ?? ""; });
    return row;
  });
}

function sha256File(abs) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(abs));
  return hash.digest("hex").toUpperCase();
}

function isGif(buf) {
  return buf.length >= 6 && buf.slice(0, 3).toString("ascii") === "GIF"
    && (buf.slice(3, 6).toString("ascii") === "87a" || buf.slice(3, 6).toString("ascii") === "89a");
}

function isPng(buf) {
  return buf.length >= 8
    && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47
    && buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a;
}

function formatMatchesExtension(abs, buf) {
  const ext = path.extname(abs).toLowerCase();
  if (ext === ".gif") return isGif(buf) ? null : "expected GIF magic, got non-GIF";
  if (ext === ".png") return isPng(buf) ? null : "expected PNG magic, got non-PNG";
  return `unsupported extension ${ext}`;
}

const rows = parseCsv(fs.readFileSync(path.join(sourceRoot, "manifest.csv"), "utf8"));
const gifFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs);
    else if (/\.(gif|png)$/i.test(entry.name)) gifFiles.push(abs);
  }
}
walk(sourceRoot);

const missingFiles = [];
const byteFailures = [];
const checksumFailures = [];
const corruptGifs = [];
const keyMap = new Map();
const duplicateKeys = [];

for (const row of rows) {
  const rel = String(row.File || "").replace(/\\/g, path.sep);
  const abs = path.join(sourceRoot, rel);
  const key = [row.Dex, row.Form, row.Facing, row.Color, row.Gender].join("|");
  if (keyMap.has(key)) duplicateKeys.push({ key, first: keyMap.get(key), second: rel });
  else keyMap.set(key, rel);

  if (!fs.existsSync(abs)) {
    missingFiles.push(rel);
    continue;
  }
  const st = fs.statSync(abs);
  const expectedBytes = Number(row.Bytes);
  if (Number.isFinite(expectedBytes) && st.size !== expectedBytes) {
    byteFailures.push({ file: rel, expected: expectedBytes, actual: st.size });
  }
  const expectedSha = String(row.SHA256 || "").toUpperCase();
  if (expectedSha) {
    const actualSha = sha256File(abs);
    if (actualSha !== expectedSha) {
      checksumFailures.push({ file: rel, expected: expectedSha, actual: actualSha });
    }
  }
  const buf = fs.readFileSync(abs);
  const formatError = formatMatchesExtension(abs, buf);
  if (formatError) corruptGifs.push(`${rel} (${formatError})`);
}

function has(dex, form, facing, color, gender) {
  return keyMap.has([String(dex), form, facing, color, gender].join("|"));
}

function entry(dex, form, facing, color, gender) {
  const key = [String(dex), form, facing, color, gender].join("|");
  const rel = keyMap.get(key);
  if (!rel) return null;
  const row = rows.find((r) => String(r.File || "").replace(/\\/g, path.sep) === rel
    || [r.Dex, r.Form, r.Facing, r.Color, r.Gender].join("|") === key);
  return { key, file: rel, row };
}

const missingBaseFront = [];
for (let dex = 1; dex <= 151; dex += 1) {
  if (!has(dex, "base", "Front", "Normal", "Default")) missingBaseFront.push({ dex, slot: "Front Normal Default" });
  if (!has(dex, "base", "Front", "Shiny", "Default")) missingBaseFront.push({ dex, slot: "Front Shiny Default" });
}

const backCoverage = { normal: 0, shiny: 0, missingNormal: [], missingShiny: [] };
for (let dex = 1; dex <= 151; dex += 1) {
  if (has(dex, "base", "Back", "Normal", "Default")) backCoverage.normal += 1;
  else backCoverage.missingNormal.push(dex);
  if (has(dex, "base", "Back", "Shiny", "Default")) backCoverage.shiny += 1;
  else backCoverage.missingShiny.push(dex);
}

const corrected = {};
for (const dex of [29, 32, 122]) {
  corrected[dex] = {
    frontNormal: entry(dex, "base", "Front", "Normal", "Default"),
    frontShiny: entry(dex, "base", "Front", "Shiny", "Default"),
    backNormal: entry(dex, "base", "Back", "Normal", "Default"),
    backShiny: entry(dex, "base", "Back", "Shiny", "Default")
  };
}

const specialForms = new Set();
for (const row of rows) {
  const form = String(row.Form || "base").toLowerCase();
  if (form && form !== "base") specialForms.add(`${row.Dex}:${form}`);
}

const ok = missingFiles.length === 0
  && byteFailures.length === 0
  && checksumFailures.length === 0
  && corruptGifs.length === 0
  && duplicateKeys.length === 0
  && missingBaseFront.length === 0
  && Boolean(corrected[29].frontNormal && corrected[29].frontShiny)
  && Boolean(corrected[32].frontNormal && corrected[32].frontShiny)
  && Boolean(corrected[122].frontNormal && corrected[122].frontShiny);

const report = {
  ok,
  sourceRoot,
  manifestRows: rows.length,
  gifFiles: gifFiles.length,
  missingManifestFiles: missingFiles.length,
  byteFailures: byteFailures.length,
  checksumFailures: checksumFailures.length,
  corruptGifs: corruptGifs.length,
  duplicateCanonicalKeys: duplicateKeys.length,
  frontNormal151: 151 - missingBaseFront.filter((r) => r.slot.includes("Normal")).length,
  frontShiny151: 151 - missingBaseFront.filter((r) => r.slot.includes("Shiny")).length,
  missingBaseFront,
  backCoverage,
  corrected,
  nonBaseFormKeys: specialForms.size,
  sampleDuplicates: duplicateKeys.slice(0, 5),
  sampleMissingFiles: missingFiles.slice(0, 5),
  sampleChecksumFailures: checksumFailures.slice(0, 5)
};

fs.writeFileSync(path.join(process.env.TEMP || ".", "pp-gen1-package-validation.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exit(ok ? 0 : 1);
