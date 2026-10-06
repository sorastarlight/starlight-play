/**
 * rc114 build-time Ribbon importer.
 * PokéAPI has no dedicated Ribbon resource (ribbons are not bag items).
 * Sprites: pokesprite misc/ribbon (extracted in-game graphics, cached locally).
 */
const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "images", "ribbons");
const DATA_DIR = path.join(ROOT, "data");
const BASE = "https://raw.githubusercontent.com/msikma/pokesprite/master/misc/ribbon";

const RIBBONS = [
  { id: "effort-ribbon", name: "Effort Ribbon", origin: "Generation III — Hoenn", prestige: "low", flavor: "A Ribbon for Pokémon that put forth a great deal of effort." },
  { id: "footprint-ribbon", name: "Footprint Ribbon", origin: "Generation IV — Sinnoh", prestige: "low", flavor: "A Ribbon awarded for leaving a lasting footprint on a journey." },
  { id: "alert-ribbon", name: "Alert Ribbon", origin: "Generation IV — Sinnoh memorial", prestige: "low", flavor: "A memorial Ribbon for a Pokémon that lived alertly." },
  { id: "shock-ribbon", name: "Shock Ribbon", origin: "Generation IV — Sinnoh memorial", prestige: "low", flavor: "A memorial Ribbon for a Pokémon that lived through shock." },
  { id: "downcast-ribbon", name: "Downcast Ribbon", origin: "Generation IV — Sinnoh memorial", prestige: "low", flavor: "A memorial Ribbon for a Pokémon that lived through melancholy." },
  { id: "careless-ribbon", name: "Careless Ribbon", origin: "Generation IV — Sinnoh memorial", prestige: "low", flavor: "A memorial Ribbon for a Pokémon that lived carelessly." },
  { id: "relax-ribbon", name: "Relax Ribbon", origin: "Generation IV — Sinnoh memorial", prestige: "low", flavor: "A memorial Ribbon for a Pokémon that lived relaxedly." },
  { id: "snooze-ribbon", name: "Snooze Ribbon", origin: "Generation IV — Sinnoh memorial", prestige: "low", flavor: "A memorial Ribbon for a Pokémon that lived sleepily." },
  { id: "smile-ribbon", name: "Smile Ribbon", origin: "Generation IV — Sinnoh memorial", prestige: "low", flavor: "A memorial Ribbon for a Pokémon that lived with a smile." },
  { id: "gorgeous-ribbon", name: "Gorgeous Ribbon", origin: "Generation IV — Sinnoh", prestige: "mid", flavor: "An extraordinarily gorgeous and extravagant Ribbon." },
  { id: "royal-ribbon", name: "Royal Ribbon", origin: "Generation IV — Sinnoh", prestige: "mid", flavor: "An incredibly regal Ribbon with an air of nobility." },
  { id: "gorgeous-royal-ribbon", name: "Gorgeous Royal Ribbon", origin: "Generation IV — Sinnoh", prestige: "high", flavor: "A gorgeous and regal Ribbon that is the highest of luxury." },
  { id: "artist-ribbon", name: "Artist Ribbon", origin: "Generation III — Hoenn Contests", prestige: "mid", flavor: "A Ribbon awarded for being chosen as a super Contest star in Hoenn." },
  { id: "record-ribbon", name: "Record Ribbon", origin: "Generation IV", prestige: "mid", flavor: "A Ribbon awarded for setting an incredible record." },
  { id: "legend-ribbon", name: "Legend Ribbon", origin: "Generation IV", prestige: "high", flavor: "A Ribbon awarded for setting a legendary record." },
  { id: "country-ribbon", name: "Country Ribbon", origin: "Generation III — Hoenn Tower", prestige: "low", flavor: "A Ribbon awarded for winning at a Pokémon League Tower challenge." },
  { id: "national-ribbon", name: "National Ribbon", origin: "Generation III — Hoenn", prestige: "mid", flavor: "A Ribbon awarded for overcoming all difficult challenges." },
  { id: "earth-ribbon", name: "Earth Ribbon", origin: "Generation III — Hoenn Battle Tower", prestige: "high", flavor: "A Ribbon awarded for winning 100 consecutive times at the Battle Tower." },
  { id: "world-ribbon", name: "World Ribbon", origin: "Generation III — Hoenn Tower", prestige: "high", flavor: "A Ribbon awarded for being World Champions." },
  { id: "champion-ribbon", name: "Champion Ribbon", origin: "Generation III — Hoenn League", prestige: "high", flavor: "A Ribbon awarded for beating the Champion and entering the Hall of Fame." },
  { id: "winning-ribbon", name: "Winning Ribbon", origin: "Generation III — Hoenn Battle Tower", prestige: "mid", flavor: "A Ribbon awarded for clearing Hoenn's Battle Tower's Lv. 50 challenge." },
  { id: "victory-ribbon", name: "Victory Ribbon", origin: "Generation III — Hoenn Battle Tower", prestige: "high", flavor: "A Ribbon awarded for clearing Hoenn's Battle Tower's Lv. 100 challenge." },
  { id: "marine-ribbon", name: "Marine Ribbon", origin: "Generation III — Hoenn souvenir", prestige: "low", flavor: "A souvenir Ribbon from a marine-themed place." },
  { id: "land-ribbon", name: "Land Ribbon", origin: "Generation III — Hoenn souvenir", prestige: "low", flavor: "A souvenir Ribbon from a land-themed place." },
  { id: "sky-ribbon", name: "Sky Ribbon", origin: "Generation III — Hoenn souvenir", prestige: "low", flavor: "A souvenir Ribbon from a sky-themed place." },
  { id: "cool-ribbon-hoenn", name: "Cool Ribbon", origin: "Generation III — Hoenn Contests", prestige: "low", flavor: "A Ribbon awarded for winning the Cool Contest Normal Rank in Hoenn." },
  { id: "cool-ribbon-super-hoenn", name: "Cool Ribbon Super", origin: "Generation III — Hoenn Contests", prestige: "mid", flavor: "A Ribbon awarded for winning the Cool Contest Super Rank in Hoenn." },
  { id: "cool-ribbon-hyper-hoenn", name: "Cool Ribbon Hyper", origin: "Generation III — Hoenn Contests", prestige: "mid", flavor: "A Ribbon awarded for winning the Cool Contest Hyper Rank in Hoenn." },
  { id: "cool-ribbon-master-hoenn", name: "Cool Ribbon Master", origin: "Generation III — Hoenn Contests", prestige: "high", flavor: "A Ribbon awarded for winning the Cool Contest Master Rank in Hoenn." },
  { id: "beauty-ribbon-hoenn", name: "Beauty Ribbon", origin: "Generation III — Hoenn Contests", prestige: "low", flavor: "A Ribbon awarded for winning the Beauty Contest Normal Rank in Hoenn." },
  { id: "beauty-ribbon-super-hoenn", name: "Beauty Ribbon Super", origin: "Generation III — Hoenn Contests", prestige: "mid", flavor: "A Ribbon awarded for winning the Beauty Contest Super Rank in Hoenn." },
  { id: "beauty-ribbon-hyper-hoenn", name: "Beauty Ribbon Hyper", origin: "Generation III — Hoenn Contests", prestige: "mid", flavor: "A Ribbon awarded for winning the Beauty Contest Hyper Rank in Hoenn." },
  { id: "beauty-ribbon-master-hoenn", name: "Beauty Ribbon Master", origin: "Generation III — Hoenn Contests", prestige: "high", flavor: "A Ribbon awarded for winning the Beauty Contest Master Rank in Hoenn." },
  { id: "cute-ribbon-hoenn", name: "Cute Ribbon", origin: "Generation III — Hoenn Contests", prestige: "low", flavor: "A Ribbon awarded for winning the Cute Contest Normal Rank in Hoenn." },
  { id: "cute-ribbon-super-hoenn", name: "Cute Ribbon Super", origin: "Generation III — Hoenn Contests", prestige: "mid", flavor: "A Ribbon awarded for winning the Cute Contest Super Rank in Hoenn." },
  { id: "cute-ribbon-master-hoenn", name: "Cute Ribbon Master", origin: "Generation III — Hoenn Contests", prestige: "high", flavor: "A Ribbon awarded for winning the Cute Contest Master Rank in Hoenn." },
  { id: "smart-ribbon-hoenn", name: "Smart Ribbon", origin: "Generation III — Hoenn Contests", prestige: "low", flavor: "A Ribbon awarded for winning the Smart Contest Normal Rank in Hoenn." },
  { id: "smart-ribbon-super-hoenn", name: "Smart Ribbon Super", origin: "Generation III — Hoenn Contests", prestige: "mid", flavor: "A Ribbon awarded for winning the Smart Contest Super Rank in Hoenn." },
  { id: "smart-ribbon-hyper-hoenn", name: "Smart Ribbon Hyper", origin: "Generation III — Hoenn Contests", prestige: "mid", flavor: "A Ribbon awarded for winning the Smart Contest Hyper Rank in Hoenn." },
  { id: "tough-ribbon-hoenn", name: "Tough Ribbon", origin: "Generation III — Hoenn Contests", prestige: "low", flavor: "A Ribbon awarded for winning the Tough Contest Normal Rank in Hoenn." },
  { id: "tough-ribbon-super-hoenn", name: "Tough Ribbon Super", origin: "Generation III — Hoenn Contests", prestige: "mid", flavor: "A Ribbon awarded for winning the Tough Contest Super Rank in Hoenn." },
  { id: "tough-ribbon-hyper-hoenn", name: "Tough Ribbon Hyper", origin: "Generation III — Hoenn Contests", prestige: "mid", flavor: "A Ribbon awarded for winning the Tough Contest Hyper Rank in Hoenn." },
  { id: "sinnoh-champion-ribbon", name: "Sinnoh Champion Ribbon", origin: "Generation IV — Sinnoh League", prestige: "high", flavor: "A Ribbon awarded for beating the Sinnoh Champion and entering the Hall of Fame." },
  { id: "kalos-champion-ribbon", name: "Kalos Champion Ribbon", origin: "Generation VI — Kalos League", prestige: "high", flavor: "A Ribbon awarded for becoming the Kalos Champion." },
  { id: "hoenn-champion-ribbon", name: "Hoenn Champion Ribbon", origin: "Generation VI — Omega Ruby / Alpha Sapphire", prestige: "high", flavor: "A Ribbon awarded for becoming the Hoenn Champion." },
  { id: "contest-memory-ribbon", name: "Contest Memory Ribbon", origin: "Generation VI", prestige: "mid", flavor: "A Ribbon commemorating participation in Pokémon Contests." },
  { id: "battle-memory-ribbon", name: "Battle Memory Ribbon", origin: "Generation VI", prestige: "mid", flavor: "A Ribbon commemorating participation in battles." },
  { id: "contest-memory-ribbon-gold", name: "Contest Memory Ribbon (Gold)", origin: "Generation VI", prestige: "high", flavor: "A gold Ribbon commemorating outstanding Contest accomplishments." },
  { id: "battle-memory-ribbon-gold", name: "Battle Memory Ribbon (Gold)", origin: "Generation VI", prestige: "high", flavor: "A gold Ribbon commemorating outstanding battle accomplishments." },
  { id: "skillful-battler-ribbon", name: "Skillful Battler Ribbon", origin: "Generation VI — Battle Maison", prestige: "mid", flavor: "A Ribbon awarded for defeating the Battle Chatelaine at the Battle Maison." },
  { id: "expert-battler-ribbon", name: "Expert Battler Ribbon", origin: "Generation VI — Battle Maison", prestige: "high", flavor: "A Ribbon awarded for defeating the Battle Chatelaine in Super Battles." },
  { id: "best-friends-ribbon", name: "Best Friends Ribbon", origin: "Generation VI", prestige: "low", flavor: "A Ribbon that can be given to a Pokémon with which you share a close bond." },
  { id: "training-ribbon", name: "Training Ribbon", origin: "Generation VI — Super Training", prestige: "low", flavor: "A Ribbon awarded for completing all Secret Super Training regimens." },
  { id: "battle-champion-ribbon", name: "Battle Champion Ribbon", origin: "Generation IV — World Championships", prestige: "high", flavor: "A Ribbon awarded to a Battle Competition Champion." },
  { id: "regional-champion-ribbon", name: "Regional Champion Ribbon", origin: "Generation IV — World Championships", prestige: "high", flavor: "A Ribbon awarded to a Regional Champion." },
  { id: "national-champion-ribbon", name: "National Champion Ribbon", origin: "Generation IV — World Championships", prestige: "high", flavor: "A Ribbon awarded to a National Champion." },
  { id: "world-champion-ribbon", name: "World Champion Ribbon", origin: "Generation IV — World Championships", prestige: "high", flavor: "A Ribbon awarded to a World Champion." },
  { id: "contest-star-ribbon", name: "Contest Star Ribbon", origin: "Generation VI — Hoenn Contests", prestige: "high", flavor: "A Ribbon awarded for becoming a Contest Star." },
  { id: "beauty-master-ribbon", name: "Beauty Master Ribbon", origin: "Generation VI — Pokémon Contests", prestige: "high", flavor: "A Ribbon awarded for becoming a Beauty Contest Master." },
  { id: "tower-master-ribbon", name: "Tower Master Ribbon", origin: "Generation VIII — Battle Tower", prestige: "high", flavor: "A Ribbon awarded for becoming a Battle Tower Master." },
  { id: "history-ribbon", name: "History Ribbon", origin: "Generation IV", prestige: "low", flavor: "A Ribbon awarded for making history." },
  { id: "blue-ribbon", name: "Blue Ribbon", origin: "Generation III souvenir", prestige: "low", flavor: "A souvenir Blue Ribbon." },
  { id: "battle-tree-great-ribbon", name: "Battle Tree Great Ribbon", origin: "Generation VII — Battle Tree", prestige: "mid", flavor: "A Ribbon awarded for a great showing at the Battle Tree." },
  { id: "premier-ribbon", name: "Premier Ribbon", origin: "Generation IV — event", prestige: "mid", flavor: "A special Ribbon from a special occasion." },
  { id: "event-ribbon", name: "Event Ribbon", origin: "Generation IV — event", prestige: "mid", flavor: "A Ribbon awarded for participating in a special Pokémon event." },
  { id: "special-ribbon", name: "Special Ribbon", origin: "Generation IV — event", prestige: "high", flavor: "A special Ribbon for a special occasion." },
  { id: "carnival-ribbon", name: "Carnival Ribbon", origin: "Generation IV — event", prestige: "mid", flavor: "A Ribbon awarded during a Carnival event." },
  { id: "festival-ribbon", name: "Festival Ribbon", origin: "Generation IV — event", prestige: "mid", flavor: "A Ribbon awarded during a Festival event." },
  { id: "classic-ribbon", name: "Classic Ribbon", origin: "Generation IV — event", prestige: "mid", flavor: "A Ribbon awarded during a Classic competition." },
  { id: "souvenir-ribbon", name: "Souvenir Ribbon", origin: "Generation IV — event", prestige: "low", flavor: "A souvenir Ribbon from a special location." },
  { id: "wishing-ribbon", name: "Wishing Ribbon", origin: "Generation IV — event", prestige: "high", flavor: "A Ribbon said to make a wish come true." },
  { id: "birthday-ribbon", name: "Birthday Ribbon", origin: "Generation IV — event", prestige: "low", flavor: "A Ribbon awarded on a birthday." }
];

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "streamlink-ribbon-import/rc114" } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return get(res.headers.location).then(resolve, reject);
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const buf = Buffer.concat(chunks);
        if (res.statusCode !== 200) {
          const err = new Error(`${url} -> ${res.statusCode}`);
          err.status = res.statusCode;
          return reject(err);
        }
        resolve(buf);
      });
    }).on("error", reject);
  });
}

async function mapPool(items, limit, fn) {
  const out = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const rows = await mapPool(RIBBONS, 8, async (row) => {
    const dest = path.join(OUT_DIR, `${row.id}.png`);
    const urls = [`${BASE}/${row.id}.png`, `${BASE}/gen8/${row.id}.png`];
    let fetched = false;
    let spriteUrl = urls[0];
    for (const url of urls) {
      try {
        const png = await get(url);
        fs.writeFileSync(dest, png);
        fetched = true;
        spriteUrl = url;
        break;
      } catch (_) {}
    }
    if (!fetched) console.warn("sprite miss", row.id);
    return {
      id: row.id,
      name: row.name,
      origin: row.origin,
      flavor: row.flavor,
      prestige: row.prestige,
      icon: `images/ribbons/${row.id}.png`,
      spriteFetched: fetched,
      provenance: {
        sprite: spriteUrl,
        source: "pokesprite misc/ribbon (in-game Ribbon graphics, cached locally at build time)",
        pokeapi: "PokéAPI has no dedicated Ribbon endpoint; ribbons are not bag items. Names/flavor follow core-series Ribbon names.",
        note: "StreamLink Achievement mapping is this game's design, not official Pokémon behavior."
      }
    };
  });
  const catalog = {
    generatedAt: new Date().toISOString(),
    source: "pokesprite misc/ribbon + core-series Ribbon names (build-time cache)",
    runtimeExternalCalls: false,
    ribbons: rows
  };
  fs.writeFileSync(path.join(DATA_DIR, "ribbon-catalog.json"), JSON.stringify(catalog, null, 2) + "\n");
  fs.writeFileSync(path.join(ROOT, "js", "ribbon-catalog.js"), `/* generated by tools/import-ribbons-rc114.js — do not hand-edit */\nwindow.PLAY_RIBBON_CATALOG = ${JSON.stringify(catalog)};\n`);
  console.log("ribbons", rows.length, "fetched", rows.filter((r) => r.spriteFetched).length);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
