/**
 * rc111 — repair UTF-8 mojibake in player-facing HTML/JS sources.
 * Root cause: multi-byte UTF-8 (★ é — · …) was previously damaged to U+FFFD / "?".
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

const REPLACEMENTS = [
  [/ST\?RLIGHT/g, "ST★RLIGHT"],
  [/Pok\uFFFDmon/g, "Pokémon"],
  [/Pok\uFFFDdex/g, "Pokédex"],
  [/Pok\uFFFDCoins/g, "PokéCoins"],
  [/Pok\uFFFD Ball/g, "Poké Ball"],
  [/Flab\uFFFDb\uFFFD/g, "Flabébé"],
  [/RPG \uFFFD catch/g, "RPG — catch"],
  [/ \uFFFD THE STARLIGHT/g, " · THE STARLIGHT"],
  [/Checking sign-in\uFFFD/g, "Checking sign-in…"],
  [/Lv\. \uFFFD/g, "Lv. ·"],
  [/aria-hidden="true">\uFFFD<\/span>/g, 'aria-hidden="true">·</span>'],
  [/Loading the stream player\uFFFD/g, "Loading the stream player…"],
  [/Loading rankings\uFFFD/g, "Loading rankings…"],
  [/New messages \?/g, "New messages ↓"],
  [/\? A new ST★RLIGHT/g, "✨ A new ST★RLIGHT"],
  [/Settings \uFFFD no code/g, "Settings — no code"],
  [/Avatar packs:[^\n]*\uFFFD/g, (m) => m.replace(/\uFFFD/g, "—")]
];

function fixText(text) {
  let out = text;
  for (const [re, to] of REPLACEMENTS) out = out.replace(re, to);
  // Remaining lone replacement chars in HTML titles / muted copy → middle dot or em dash by context
  out = out.replace(/([A-Za-z])\uFFFD([A-Za-z])/g, "$1·$2");
  out = out.replace(/\uFFFD/g, (ch, offset, str) => {
    const before = str.slice(Math.max(0, offset - 12), offset);
    const after = str.slice(offset + 1, offset + 12);
    if (/RPG\s*$/.test(before) && /^\s*catch/.test(after)) return "—";
    if (/sign-in\s*$/i.test(before) || /player\s*$/i.test(before) || /rankings\s*$/i.test(before)) return "…";
    if (/Lv\.\s*$/.test(before)) return "·";
    if (/THE STARLIGHT/.test(after) || /PLAY HUB/.test(after)) return "·";
    return "·";
  });
  return out;
}

const targets = [];
for (const name of fs.readdirSync(ROOT)) {
  if (name.endsWith(".html")) targets.push(path.join(ROOT, name));
}
for (const name of ["settings.js", "rankings.js", "achievements.js", "build-client.js", "store.js", "nav.js"]) {
  const p = path.join(ROOT, "js", name);
  if (fs.existsSync(p)) targets.push(p);
}

const report = [];
for (const file of targets) {
  const before = fs.readFileSync(file);
  const text = before.toString("utf8");
  const after = fixText(text);
  if (after !== text) {
    fs.writeFileSync(file, after, "utf8");
    const rem = (after.match(/\uFFFD/g) || []).length;
    const qStar = (after.match(/ST\?RLIGHT/g) || []).length;
    report.push({ file: path.relative(ROOT, file), rem, qStar });
  }
}

// Explicit Play welcome blurb (authoritative copy)
const indexPath = path.join(ROOT, "index.html");
let index = fs.readFileSync(indexPath, "utf8");
const blurb = `ST★RLIGHT Pokémon RPG — catch Pokémon alongside Sora's livestream. Build your Pokédex, evolve your collection, and customize your Trainer.`;
index = index.replace(
  /(<p class="muted welcome-blurb">)([\s\S]*?)(<\/p>)/,
  `$1${blurb}$3`
);
index = index.replace(
  /(<p id="play-update-msg">)([\s\S]*?)(<\/p>)/,
  `$1✨ A new ST★RLIGHT RPG update is ready.$3`
);
fs.writeFileSync(indexPath, index, "utf8");

console.log(JSON.stringify({ fixed: report.length, report }, null, 2));
