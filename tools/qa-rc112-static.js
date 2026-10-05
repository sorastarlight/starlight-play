const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const dest = path.join(root, "docs", "audits", "rc112-shots");
fs.mkdirSync(dest, { recursive: true });

const RPG_RE = /ST★RLIGHT\s+Pokémon\s+RPG|ST★RLIGHT\s+RPG/g;
const playerFacing = [
  "index.html", "help.html", "rankings.html", "achievements.html", "register.html",
  "store.html", "pokedex.html", "evolve.html", "signin.html", "settings.html",
  "trainer.html", "inventory.html", "storage.html", "events.html", "trade.html",
  "js/build-client.js", "js/store.js", "js/pokedex.js", "js/nav.js", "js/hud.js",
  "js/play-ux.js", "js/rankings.js"
];

function scanFile(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) return null;
  const t = fs.readFileSync(full, "utf8");
  const rpg = [...t.matchAll(RPG_RE)].map((m) => m[0]);
  return {
    file: rel,
    rpgHits: rpg,
    fffd: (t.match(/\uFFFD/g) || []).length,
    mojibake: (t.match(/ST\?RLIGHT|PokÃ©|PokÃ©mon|â€”|Ã—/g) || []).length,
    streamLink: (t.match(/Pokémon StreamLink/g) || []).length
  };
}

const beforeNote = {
  note: "rc111 baseline player-facing ST★RLIGHT RPG / ST★RLIGHT Pokémon RPG hits were in index, help, rankings, achievements, build-client (5 files / 7 phrases).",
  count: 7
};

const after = playerFacing.map(scanFile).filter(Boolean);
const rpgAfter = after.reduce((n, row) => n + row.rpgHits.length, 0);
const fffd = after.reduce((n, row) => n + row.fffd, 0);
const mojibake = after.reduce((n, row) => n + row.mojibake, 0);
const streamLinkPlacements = after.filter((row) => row.streamLink).map((row) => ({
  file: row.file,
  count: row.streamLink
}));

const missing = [];
const broken = [];
for (let i = 1; i <= 151; i++) {
  const p = path.join(root, "images", "pokemon", `${i}.gif`);
  if (!fs.existsSync(p)) missing.push(i);
  else {
    const b = fs.readFileSync(p);
    if (b.length < 40 || b[0] !== 0x47 || b[1] !== 0x49 || b[2] !== 0x46) broken.push(i);
  }
}

const game = fs.readFileSync(path.join(root, "js", "game.js"), "utf8");
const store = fs.readFileSync(path.join(root, "js", "store.js"), "utf8");
const present = fs.readFileSync(path.join(root, "js", "play-present.js"), "utf8");
const pokedex = fs.readFileSync(path.join(root, "js", "pokedex.js"), "utf8");

const checks = {
  rpcRemapNarrow: /title_id[\s\S]{0,80}ambiguous|ambiguous[\s\S]{0,80}title_id/.test(game)
    && !/column reference\|ambiguous\|42702\|P0001\.\*title_id/.test(game),
  toastDedupe: /_playToastDedupeKey/.test(game),
  passToastClaim: /Weekly Pass rewards claimed!/.test(store) && /tier:\s*"toast"/.test(store),
  noAmericaNewYorkUi: !/America\/New_York/.test(store) || /Daily Trainer Supply refreshes at 12:00 AM Eastern Time/.test(store),
  eastFriendly: /12:00 AM Eastern Time/.test(store),
  buySellInWorkspace: /mart-mode-workspace/.test(store),
  noKickerModeMount: !fs.readFileSync(path.join(root, "store.html"), "utf8").includes('id="mart-mode-mount"'),
  dexNameClass: /class="dex-name"/.test(pokedex),
  presentErrorContext: /Could not save your Trainer ID/.test(present) && /preferred/.test(present)
};

const report = {
  brand: {
    before: beforeNote,
    afterRpgCount: rpgAfter,
    afterHits: after.filter((r) => r.rpgHits.length),
    streamLinkPlacements,
    fffd,
    mojibake
  },
  silhouette: {
    expected: 151,
    valid: 151 - missing.length - broken.length,
    missing,
    broken,
    "071": {
      exists: fs.existsSync(path.join(root, "images", "pokemon", "71.gif")),
      bytes: fs.existsSync(path.join(root, "images", "pokemon", "71.gif"))
        ? fs.statSync(path.join(root, "images", "pokemon", "71.gif")).size
        : 0
    }
  },
  checks
};

fs.writeFileSync(path.join(dest, "static-report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (rpgAfter > 0 || fffd > 0 || mojibake > 0 || !checks.rpcRemapNarrow || !checks.passToastClaim) {
  process.exitCode = 1;
}
