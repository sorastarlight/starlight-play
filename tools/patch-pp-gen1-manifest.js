/**
 * Patch ProjectPokemon Gen1 manifest.csv after manual asset corrections.
 * Updates File/Bytes/SHA256 for known keys; inserts missing rows; removes stale .gif rows replaced by .png.
 */
const fs = require("fs");
const path = require("path");

const root = process.argv[2];
const opsPath = process.argv[3] || path.join(process.env.TEMP || ".", "pp-patch-ops.json");
if (!root) {
  console.error("usage: node tools/patch-pp-gen1-manifest.js <source-root> [ops.json]");
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

function csvEscape(value) {
  const s = String(value ?? "");
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return `"${s}"`;
}

function rowKey(row) {
  return [row.Dex, row.Form, row.Facing, row.Color, row.Gender].join("|");
}

const ops = JSON.parse(fs.readFileSync(opsPath, "utf8"));
const manifestPath = path.join(root, "manifest.csv");
const text = fs.readFileSync(manifestPath, "utf8").replace(/^\uFEFF/, "");
const lines = text.trim().split(/\r?\n/);
const headers = splitCsvLine(lines[0]);
const rows = lines.slice(1).filter(Boolean).map((line) => {
  const cols = splitCsvLine(line);
  const row = {};
  headers.forEach((h, i) => { row[h] = cols[i] ?? ""; });
  return row;
});

const byKey = new Map(rows.map((r) => [rowKey(r), r]));
let updated = 0;
let inserted = 0;
let removed = 0;

for (const op of ops) {
  const key = [String(op.Dex), op.Form, op.Facing, op.Color, op.Gender].join("|");
  const fileWin = String(op.File).replace(/\//g, "\\");
  const abs = path.join(root, fileWin);
  if (!fs.existsSync(abs)) throw new Error(`missing patched file: ${fileWin}`);
  const st = fs.statSync(abs);
  const sha = require("crypto").createHash("sha256").update(fs.readFileSync(abs)).digest("hex").toUpperCase();
  const existing = byKey.get(key);
  const sourceUrl = op.SourceURL
    || existing?.SourceURL
    || "";
  const next = {
    Dex: String(op.Dex),
    Pokemon: op.Pokemon,
    Form: op.Form,
    Facing: op.Facing,
    Color: op.Color,
    Gender: op.Gender,
    File: fileWin,
    Bytes: String(st.size),
    SHA256: sha,
    SourceURL: sourceUrl
  };
  if (existing) {
    Object.assign(existing, next);
    updated += 1;
  } else {
    rows.push(next);
    byKey.set(key, next);
    inserted += 1;
  }
  // Drop stale mislabeled .gif if we moved to .png
  if (op.OldGif) {
    const oldWin = String(op.OldGif).replace(/\//g, "\\");
    const before = rows.length;
    for (let i = rows.length - 1; i >= 0; i -= 1) {
      if (String(rows[i].File).replace(/\//g, "\\") === oldWin && rowKey(rows[i]) === key) {
        // same key already updated to png — skip
        continue;
      }
      if (String(rows[i].File).replace(/\//g, "\\") === oldWin) {
        rows.splice(i, 1);
        removed += 1;
      }
    }
    // Also remove any row still pointing at old gif path for this key (should already be overwritten)
    void before;
    const oldAbs = path.join(root, oldWin);
    if (fs.existsSync(oldAbs)) fs.unlinkSync(oldAbs);
  }
}

// Sort for stability
rows.sort((a, b) => {
  const da = Number(a.Dex) - Number(b.Dex);
  if (da) return da;
  return rowKey(a).localeCompare(rowKey(b));
});

const out = [
  headers.map(csvEscape).join(","),
  ...rows.map((row) => headers.map((h) => csvEscape(row[h] ?? "")).join(","))
].join("\r\n") + "\r\n";

fs.writeFileSync(manifestPath, out);
console.log(JSON.stringify({
  root,
  rows: rows.length,
  updated,
  inserted,
  removedStaleGifRows: removed
}, null, 2));
