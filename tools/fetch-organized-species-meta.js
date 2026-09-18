/**
 * Fetch PokeAPI metadata for Organized base species and write
 * data/organized-species-meta.json for the national roster migration.
 *
 * Usage: node tools/fetch-organized-species-meta.js
 */
const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT = path.join(__dirname, "..");
const seedPath = path.join(ROOT, "data", "organized-base-species-seed.json");
const outPath = path.join(ROOT, "data", "organized-species-meta.json");

function getJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "starlight-play-importer/1.0" } }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        getJson(res.headers.location).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        res.resume();
        return;
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
        } catch (err) {
          reject(err);
        }
      });
    }).on("error", reject);
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const seed = JSON.parse(fs.readFileSync(seedPath, "utf8"));
  const rows = [];
  let i = 0;
  for (const sp of seed.species) {
    i += 1;
    const url = `https://pokeapi.co/api/v2/pokemon-species/${sp.dex}/`;
    let species;
    try {
      species = await getJson(url);
    } catch (err) {
      console.error(`fail dex ${sp.dex}: ${err.message}`);
      rows.push({
        dex: sp.dex,
        name: sp.name,
        slug: sp.slug,
        generation: sp.generation,
        catch_rate: 45,
        is_legendary: false,
        mythical: false,
        types: [],
        error: err.message
      });
      await sleep(120);
      continue;
    }

    let types = [];
    try {
      const mon = await getJson(`https://pokeapi.co/api/v2/pokemon/${sp.dex}/`);
      types = (mon.types || [])
        .sort((a, b) => a.slot - b.slot)
        .map((t) => t.type.name);
    } catch {
      types = [];
    }

    const genUrl = species.generation?.url || "";
    const genMatch = /\/generation\/(\d+)\//.exec(genUrl);
    const generation = genMatch ? Number(genMatch[1]) : sp.generation;

    rows.push({
      dex: sp.dex,
      name: sp.name,
      slug: sp.slug,
      generation,
      catch_rate: Number(species.capture_rate) || 45,
      is_legendary: !!species.is_legendary,
      mythical: !!species.is_mythical,
      types
    });

    if (i % 50 === 0) console.error(`fetched ${i}/${seed.species.length}`);
    await sleep(60);
  }

  fs.writeFileSync(outPath, `${JSON.stringify({ fetchedAt: new Date().toISOString(), rows }, null, 2)}\n`);
  console.log(JSON.stringify({
    count: rows.length,
    legendaries: rows.filter((r) => r.is_legendary).length,
    mythicals: rows.filter((r) => r.mythical).length,
    errors: rows.filter((r) => r.error).length,
    out: outPath
  }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
