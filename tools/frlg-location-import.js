#!/usr/bin/env node
/* Discover FireRed/LeafGreen maps and import only curated encounter backgrounds. */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DATA_PATH = path.join(ROOT, "data", "location-visuals.json");
const JS_DATA_PATH = path.join(ROOT, "js", "location-visuals-data.js");
const OUT_DIR = path.join(ROOT, "images", "encounters", "locations", "frlg");
const ORIGINAL_DIR = path.join(OUT_DIR, "original");
const CACHE_DIR = path.join(ROOT, "tools", ".cache", "frlg");
const API = "https://archives.bulbagarden.net/w/api.php";
const UA = "StarlightPlayLocationImport/1.0 (https://play.sorastarlight.net; FRLG encounter backgrounds)";

const AUTHORITATIVE_LOCATIONS = [
  "Pallet Town",
  "Viridian Forest",
  "Route 1",
  "Route 2",
  "Route 3",
  "Route 4",
  "Route 6",
  "Route 7",
  "Route 8",
  "Route 10",
  "Route 11",
  "Route 12",
  "Route 13",
  "Route 17",
  "Route 18",
  "Route 19",
  "Route 22",
  "Mt. Moon",
  "Diglett's Cave",
  "Rock Tunnel",
  "Seafoam Islands",
  "Power Plant",
  "Pokémon Mansion",
  "Pokémon Tower",
  "Victory Road",
  "Safari Zone",
  "Saffron City",
  "Silph Co.",
  "Cinnabar Lab",
  "Cerulean Cave",
  "Faraway place",
  "Kanto"
];

const CURATED = {
  "pallet-town": { file: "Pallet Town FRLG.png", x: 50, y: 42, notes: "Outdoor town map; not Red's House." },
  "viridian-forest": { file: "Viridian Forest FRLG.png", x: 48, y: 38, notes: "Playable forest over FL town-map icon." },
  "route-1": { file: "Kanto Route 1 FRLG.png", x: 50, y: 40, notes: "Token-exact Route 1 map." },
  "route-2": { file: "Kanto Route 2 FRLG.png", x: 50, y: 36, notes: "Token-exact Route 2 map." },
  "route-3": { file: "Kanto Route 3 FRLG.png", x: 50, y: 42, notes: "Token-exact Route 3 map." },
  "route-4": { file: "Kanto Route 4 FRLG.png", x: 50, y: 42, notes: "Token-exact Route 4 map." },
  "route-6": { file: "Kanto Route 6 FRLG.png", x: 50, y: 40, notes: "Token-exact Route 6 map." },
  "route-7": { file: "Kanto Route 7 FRLG.png", x: 50, y: 45, notes: "Token-exact Route 7 map." },
  "route-8": { file: "Kanto Route 8 FRLG.png", x: 50, y: 45, notes: "Token-exact Route 8 map." },
  "route-10": { file: "Kanto Route 10 FRLG.png", x: 50, y: 36, notes: "Token-exact Route 10 map." },
  "route-11": { file: "Kanto Route 11 FRLG.png", x: 50, y: 45, notes: "Token-exact Route 11 map." },
  "route-12": { file: "Kanto Route 12 FRLG.png", x: 50, y: 28, notes: "Tall route; bias toward a land slice." },
  "route-13": { file: "Kanto Route 13 FRLG.png", x: 50, y: 45, notes: "Token-exact Route 13 map." },
  "route-17": { file: "Kanto Route 17 FRLG.png", x: 50, y: 30, notes: "Tall Cycling Road; bias toward a road slice." },
  "route-18": { file: "Kanto Route 18 FRLG.png", x: 50, y: 45, notes: "Token-exact Route 18 map." },
  "route-19": { file: "Kanto Route 19 FRLG.png", x: 50, y: 40, notes: "Token-exact Route 19 map." },
  "route-22": { file: "Kanto Route 22 FRLG.png", x: 50, y: 45, notes: "Token-exact Route 22 map." },
  "mt-moon": { file: "Mt Moon 1F FRLG.png", x: 50, y: 40, notes: "Preferred 1F playable floor; FL Mt Moon is a town-map icon." },
  "digletts-cave": { file: "Diglett Cave FRLG.png", x: 50, y: 40, notes: "Main cave map, not Route 2/11 entrances." },
  "rock-tunnel": { file: "Rock Tunnel 1F FRLG.png", x: 50, y: 40, notes: "Preferred 1F playable floor." },
  "seafoam-islands": { file: "Seafoam Islands 1F FRLG.png", x: 50, y: 40, notes: "Preferred 1F playable floor." },
  "power-plant": { file: "Power Plant interior FRLG.png", x: 50, y: 40, notes: "Playable interior over the small exterior/FL icon." },
  "pokemon-mansion": { file: "Pokémon Mansion 1F FRLG.png", x: 50, y: 40, notes: "Preferred 1F playable floor." },
  "pokemon-tower": { file: "Pokémon Tower 3F FRLG.png", x: 50, y: 40, notes: "Representative wild floor; 1F is the lobby." },
  "victory-road": { file: "Victory Road 1F FRLG.png", x: 50, y: 40, notes: "Preferred 1F playable floor." },
  "safari-zone": { file: "Safari Zone area 1 FRLG.png", x: 50, y: 40, notes: "Playable Area 1 over the town-map schematic." },
  "saffron-city": { file: "Saffron City FRLG.png", x: 50, y: 42, notes: "Outdoor city; not Gym or Silph interiors." },
  "silph-co": { file: "Silph Co 1F FRLG.png", x: 50, y: 40, notes: "Preferred 1F playable floor." },
  "cinnabar-lab": { file: "Pokémon Lab Testing Room FRLG.png", x: 50, y: 45, notes: "Cinnabar Lab has no outdoor FRLG map. The tiny Lab icon is 112×72; the Testing Room is the fossil-revival floor." },
  "cerulean-cave": { file: "Cerulean Cave 1F FRLG.png", x: 50, y: 40, notes: "Preferred 1F; 2F/B1F remain available later." },
  "faraway-place": { file: "Birth Island FRLG.png", x: 50, y: 42, notes: "Mew’s FRLG event island; no Faraway Place map exists." },
  "kanto": { file: "FRLG Kanto.png", x: 50, y: 45, notes: "Generic region fallback, not a wild habitat." }
};

function loadLocationHelpers() {
  global.window = global.window || global;
  require(path.join(ROOT, "js", "location-visuals.js"));
  return global.window;
}

async function api(params) {
  const url = new URL(API);
  url.search = new URLSearchParams({ format: "json", ...params }).toString();
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!res.ok) throw new Error(`MediaWiki ${res.status} ${url}`);
  return res.json();
}

async function listCategoryFiles() {
  const files = [];
  let cmcontinue = "";
  do {
    const data = await api({
      action: "query",
      list: "categorymembers",
      cmtitle: "Category:FireRed_and_LeafGreen_maps",
      cmtype: "file",
      cmlimit: "500",
      ...(cmcontinue ? { cmcontinue } : {})
    });
    const rows = data?.query?.categorymembers || [];
    for (const row of rows) {
      const title = String(row.title || "");
      if (title.startsWith("File:")) files.push(title.slice(5));
    }
    cmcontinue = data?.continue?.cmcontinue || "";
  } while (cmcontinue);
  return files.sort((a, b) => a.localeCompare(b));
}

function chunk(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

async function imageInfo(filenames) {
  const byName = new Map();
  for (const group of chunk(filenames, 40)) {
    const data = await api({
      action: "query",
      titles: group.map((name) => `File:${name}`).join("|"),
      prop: "imageinfo",
      iiprop: "url|size|mime|sha1",
      iiurlwidth: "1400"
    });
    const pages = data?.query?.pages || {};
    for (const page of Object.values(pages)) {
      const info = page.imageinfo && page.imageinfo[0];
      if (!info) continue;
      const filename = String(page.title || "").replace(/^File:/, "");
      byName.set(filename, {
        filename,
        page_url: `https://archives.bulbagarden.net/wiki/File:${encodeURIComponent(filename.replace(/ /g, "_"))}`,
        source_image_url: info.url,
        thumb_url: info.thumburl || info.url,
        width: info.width,
        height: info.height,
        thumbwidth: info.thumbwidth || info.width,
        thumbheight: info.thumbheight || info.height,
        mime: info.mime,
        sha1: info.sha1
      });
    }
  }
  return byName;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

async function download(url, dest) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`Download ${res.status} ${url}`);
  ensureDir(path.dirname(dest));
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

function writeOptimized(input, key) {
  const pngPath = path.join(OUT_DIR, `${key}.png`);
  fs.copyFileSync(input, pngPath);
  return pngPath;
}

function writeManifest(manifest) {
  ensureDir(path.dirname(DATA_PATH));
  fs.writeFileSync(DATA_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(
    JS_DATA_PATH,
    `window.PLAY_LOCATION_VISUALS = ${JSON.stringify(manifest, null, 2)};\n`
  );
}

function report(files, win) {
  const lines = [];
  for (const name of AUTHORITATIVE_LOCATIONS) {
    const key = win.playLocationKey(name);
    const curated = CURATED[key];
    const matches = win.playProposeLocationMatches(name, files);
    lines.push(`\n${name}  [${key}]`);
    lines.push(`  curated: ${curated ? curated.file : "(none)"}`);
    for (const row of matches.slice(0, 8)) {
      const mark = curated && row.filename === curated.file ? "  ← selected" : "";
      lines.push(`  ${row.confidence.padEnd(6)} ${row.filename}${mark}`);
    }
    if (!matches.length) lines.push("  NONE");
  }
  return lines.join("\n");
}

async function main() {
  const mode = process.argv.includes("--import") ? "import" : "discover";
  const win = loadLocationHelpers();
  console.log("Listing FireRed/LeafGreen map category…");
  const files = await listCategoryFiles();
  console.log(`Found ${files.length} files across paginated category results.`);
  const text = report(files, win);
  ensureDir(CACHE_DIR);
  fs.writeFileSync(path.join(CACHE_DIR, "category-files.json"), JSON.stringify(files, null, 2));
  fs.writeFileSync(path.join(CACHE_DIR, "match-report.txt"), text);
  console.log(text);
  if (mode !== "import") {
    console.log("\nDiscover only. Re-run with --import to download curated assets.");
    return;
  }

  const wanted = Object.values(CURATED).map((row) => row.file);
  const missing = wanted.filter((name) => !files.includes(name));
  if (missing.length) {
    throw new Error(`Curated files missing from the archive:\n${missing.join("\n")}`);
  }
  console.log("Resolving image URLs…");
  const info = await imageInfo(wanted);
  ensureDir(OUT_DIR);
  ensureDir(ORIGINAL_DIR);
  const importedAt = new Date().toISOString();
  const locations = {};
  for (const name of AUTHORITATIVE_LOCATIONS) {
    const key = win.playLocationKey(name);
    const curated = CURATED[key];
    const meta = info.get(curated.file);
    if (!meta) throw new Error(`No imageinfo for ${curated.file}`);
    const originalName = curated.file.replace(/[^\w.-]+/g, "-").replace(/-+/g, "-");
    const originalPath = path.join(ORIGINAL_DIR, originalName);
    const thumbPng = path.join(CACHE_DIR, `${key}-1400.png`);
    console.log(`Downloading ${curated.file} (${meta.width}×${meta.height})`);
    await download(meta.source_image_url, originalPath);
    await download(meta.thumb_url, thumbPng);
    const written = writeOptimized(thumbPng, key);
    const local = path.relative(ROOT, written).replace(/\\/g, "/");
    locations[key] = {
      location_key: key,
      display_name: name,
      region: "kanto",
      generation: 1,
      game_style: "frlg",
      source_filename: curated.file,
      local_asset_path: local,
      source_url: meta.page_url,
      source_image_url: meta.source_image_url,
      original_filename: curated.file,
      original_dimensions: `${meta.width}x${meta.height}`,
      imported_at: importedAt,
      background_type: "map",
      background_position_x: curated.x,
      background_position_y: curated.y,
      background_scale: 1,
      preferred_floor: /1F/i.test(curated.file) ? "1F" : "",
      enabled: true,
      fallback_key: key === "kanto" ? "" : "kanto",
      override: true,
      notes: curated.notes
    };
  }
  writeManifest({
    version: 1,
    source_category: "https://archives.bulbagarden.net/wiki/Category:FireRed_and_LeafGreen_maps",
    imported_at: importedAt,
    locations
  });
  console.log(`Wrote ${DATA_PATH}`);
  console.log(`Wrote ${JS_DATA_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
