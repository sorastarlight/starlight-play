/**
 * rc107 presentation patches: rebuild PLAY_TEAM_BACKGROUNDS catalog from
 * owner imports + original ST★RLIGHT gen CSS entries.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const ownerRows = JSON.parse(fs.readFileSync(path.join(__dirname, "_owner-bg-rows.json"), "utf8"));

const filterMap = {
  cities: "cities",
  routes: "routes",
  landmarks: "landmarks",
  battle: "battle"
};

const catalog = [];
let sort = 10;

function push(row) {
  catalog.push({ sort: sort++, ...row });
}

// ST★RLIGHT originals + generation-inspired CSS
[
  ["starlight-gradient", "ST★RLIGHT Gradient", "starlight", "starlight", true, "css", "team-bg-starlight-gradient"],
  ["pokedex-grid", "Pokédex Grid", "starlight", "starlight", true, "css", "team-bg-pokedex-grid"],
  ["research-lab", "Research Lab", "starlight", "starlight", true, "css", "team-bg-research-lab"],
  ["battle-stage", "Battle Stage", "battle", "starlight", true, "css", "team-bg-battle-stage"],
  ["gen1-mono", "ST★RLIGHT — Gen I", "retro", "gen1", true, "css", "team-bg-gen1-mono"],
  ["gen2-color", "ST★RLIGHT — Gen II", "retro", "gen2", true, "css", "team-bg-gen2-color"],
  ["gen3-gba", "ST★RLIGHT — Gen III", "retro", "gen3", true, "css", "team-bg-gen3-gba"],
  ["gen4-ds", "ST★RLIGHT — Gen IV", "retro", "gen4", true, "css", "team-bg-gen4-ds"],
  ["retro-battle", "ST★RLIGHT — Retro Battle", "battle", "gen3", true, "css", "team-bg-retro-battle"],
  ["kanto-route", "ST★RLIGHT — Kanto Route", "routes", "gen1", true, "css", "team-bg-kanto-route"]
].forEach(([id, name, filter, gen, free, style, cssClass]) => {
  push({
    id, name, category: filter === "retro" ? "Retro" : (filter === "battle" ? "Battle" : "ST★RLIGHT"),
    filter, region: "", source: "ST★RLIGHT", style, cssClass, free,
    renderMode: style === "css" ? "css" : "cover",
    generationStyle: gen, focalX: 0.5, focalY: 0.55
  });
});

// Existing FRLG
[
  ["pallet-town", "Pallet Town", "kanto", "cities", true],
  ["viridian-forest", "Viridian Forest", "kanto", "landmarks", true],
  ["route-1", "Route 1", "routes", "routes", true],
  ["route-2", "Route 2", "routes", "routes", false],
  ["mt-moon", "Mt. Moon", "landmarks", "landmarks", true],
  ["cerulean-cave", "Cerulean Cave", "landmarks", "landmarks", false],
  ["digletts-cave", "Diglett's Cave", "landmarks", "landmarks", false],
  ["rock-tunnel", "Rock Tunnel", "landmarks", "landmarks", false],
  ["seafoam-islands", "Seafoam Islands", "landmarks", "landmarks", false],
  ["saffron-city", "Saffron City", "cities", "cities", false],
  ["cinnabar-lab", "Cinnabar Lab", "special", "special", false],
  ["safari-zone", "Safari Zone", "special", "special", true],
  ["power-plant", "Power Plant", "special", "special", false],
  ["victory-road", "Victory Road", "battle", "battle", false]
].forEach(([id, name, filter, cat, free]) => {
  push({
    id, name,
    category: cat === "cities" ? "Cities" : cat === "routes" ? "Routes" : cat === "landmarks" ? "Landmarks" : cat === "battle" ? "Battle" : cat === "special" ? "Special" : "Kanto",
    filter, region: "Kanto", source: "FRLG", style: "image",
    asset: `images/encounters/locations/frlg/${id}.png`,
    cssClass: "team-bg-image", free,
    renderMode: "pixel-cover", generationStyle: "gen3", focalX: 0.5, focalY: 0.45
  });
});

// Owner-attached modern scene art
ownerRows.forEach((row) => {
  push({
    id: row.id,
    name: row.name,
    category: row.filter === "cities" ? "Cities" : row.filter === "routes" ? "Routes" : row.filter === "battle" ? "Battle" : "Landmarks",
    filter: row.filter,
    region: "",
    source: "Owner",
    style: "image",
    asset: `images/team-bgs/owner/${row.file}`,
    cssClass: "team-bg-image",
    free: Boolean(row.free),
    renderMode: "cover",
    generationStyle: row.gen || "modern",
    focalX: 0.5,
    focalY: 0.55
  });
});

fs.writeFileSync(path.join(__dirname, "_team-bg-catalog.json"), JSON.stringify(catalog, null, 2));
const free = catalog.filter((r) => r.free);
console.log(JSON.stringify({
  total: catalog.length,
  free: free.length,
  freeIds: free.map((r) => r.id),
  filters: [...new Set(catalog.map((r) => r.filter))]
}, null, 2));
