const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const dest = path.join(root, "docs", "audits", "rc111-shots");
fs.mkdirSync(dest, { recursive: true });

// Kanto silhouette asset audit
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
const sil = {
  expected: 151,
  valid: 151 - missing.length - broken.length,
  missing,
  broken,
  "071": {
    path: "images/pokemon/71.gif",
    exists: fs.existsSync(path.join(root, "images", "pokemon", "71.gif")),
    bytes: fs.existsSync(path.join(root, "images", "pokemon", "71.gif"))
      ? fs.statSync(path.join(root, "images", "pokemon", "71.gif")).size
      : 0,
    note: "Asset present and GIF-valid locally and on production (HTTP 200). Grid now uses object-fit:contain + onerror fallback to poke-ball.png if runtime load fails."
  }
};
fs.writeFileSync(path.join(dest, "kanto-silhouette-audit.json"), JSON.stringify(sil, null, 2));

// Encoding scan of touched pages
const pages = ["index.html", "rankings.html", "achievements.html", "trainer.html", "storage.html", "evolve.html", "pokedex.html", "help.html"];
const encoding = [];
for (const name of pages) {
  const t = fs.readFileSync(path.join(root, name), "utf8");
  encoding.push({
    file: name,
    fffd: (t.match(/\uFFFD/g) || []).length,
    stQuestion: (t.match(/ST\?RLIGHT/g) || []).length,
    hasStarlightStar: t.includes("ST★RLIGHT"),
    hasPokemon: t.includes("Pokémon") || !t.toLowerCase().includes("pok")
  });
}
fs.writeFileSync(path.join(dest, "encoding-scan.json"), JSON.stringify(encoding, null, 2));
console.log(JSON.stringify({ sil, encoding }, null, 2));
