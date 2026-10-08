/**
 * Download the verified Pokémon GO PokéCoin icon into the local item library.
 * Run at build/development time. The site never hotlinks this asset at runtime.
 *
 * Usage: node tools/import-pokecoin-asset.js
 */
const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT = path.join(__dirname, "..");
const DEST = path.join(ROOT, "images", "items", "pokecoin.png");
const REPORT = path.join(ROOT, "docs", "audits", "rc126-pokecoin", "import.json");
const SOURCE =
  "https://gitea.sickgaming.net/CopyBot/PokemonGO-Assets/raw/commit/2a80eb3204817ef2b2e7171ebfa83da999034d73/items-icons/PokeCoin.png";

function fetchBuf(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "StreamLink-RC126" } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchBuf(res.headers.location).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
    }).on("error", reject);
  });
}

(async () => {
  const buf = await fetchBuf(SOURCE);
  if (buf.slice(0, 8).toString("hex") !== "89504e470d0a1a0a") {
    throw new Error("Downloaded file is not a PNG");
  }
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const colorType = buf[25];
  if (width < 32 || height < 32) throw new Error(`PokéCoin too small: ${width}x${height}`);
  fs.mkdirSync(path.dirname(DEST), { recursive: true });
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(DEST, buf);
  const report = {
    source: SOURCE,
    dest: "images/items/pokecoin.png",
    bytes: buf.length,
    width,
    height,
    alpha: colorType === 4 || colorType === 6,
    importedAt: new Date().toISOString()
  };
  fs.writeFileSync(REPORT, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Wrote ${DEST} (${width}x${height}, ${buf.length} bytes)`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
