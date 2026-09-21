#!/usr/bin/env node
/**
 * Build js/pokedex-reference.js from PokéAPI (upstream source of truth).
 * Runtime Pokédex reads ONLY this local file — never pokeapi.co.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const FORMS_PATH = path.join(ROOT, "js", "forms.js");
const CAPTURE_PATH = path.join(ROOT, "tools", "capture_data.json");
const OUT_PATH = path.join(ROOT, "js", "pokedex-reference.js");
const API = "https://pokeapi.co/api/v2";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(url, retries = 4) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (res.status === 429) {
        await sleep(800 * (i + 1));
        continue;
      }
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return await res.json();
    } catch (err) {
      if (i === retries - 1) throw err;
      await sleep(400 * (i + 1));
    }
  }
  return null;
}

function loadFormIds() {
  const src = fs.readFileSync(FORMS_PATH, "utf8");
  const byMatch = src.match(/window\.PLAY_FORM_BY_DEX\s*=\s*(\{[\s\S]*?\});/);
  if (!byMatch) throw new Error("PLAY_FORM_BY_DEX not found");
  const byDex = Function(`return (${byMatch[1]})`)();
  const ids = new Set();
  for (let d = 1; d <= 151; d++) {
    const list = byDex[d] || byDex[String(d)] || [];
    list.forEach((id) => ids.add(Number(id)));
  }
  return [...ids].sort((a, b) => a - b);
}

function pickFlavor(entries) {
  const en = (entries || []).filter((e) => e.language?.name === "en");
  if (!en.length) return "";
  const prefer = ["legends-za", "legends-arceus", "scarlet", "violet", "sword", "shield", "ultra-sun", "ultra-moon", "sun", "moon", "x", "y", "black-2", "white-2", "black", "white", "heartgold", "soulsilver", "platinum", "diamond", "pearl", "firered", "leafgreen", "emerald", "ruby", "sapphire", "crystal", "gold", "silver", "yellow", "red", "blue"];
  for (const vg of prefer) {
    const hit = [...en].reverse().find((e) => e.version?.name === vg || e.version_group?.name === vg);
    if (hit?.flavor_text) return hit.flavor_text.replace(/\s+/g, " ").trim();
  }
  return String(en[en.length - 1].flavor_text || "").replace(/\s+/g, " ").trim();
}

function pickGenus(genera) {
  const en = (genera || []).find((g) => g.language?.name === "en");
  return en?.genus ? String(en.genus).trim() : "";
}

function mapPokemon(data) {
  return {
    types: (data.types || []).map((t) => t.type?.name).filter(Boolean),
    heightM: data.height != null ? Number(data.height) / 10 : null,
    weightKg: data.weight != null ? Number(data.weight) / 10 : null,
    stats: Object.fromEntries((data.stats || []).map((s) => [s.stat?.name, Number(s.base_stat)])),
    abilities: (data.abilities || []).map((a) => ({
      name: a.ability?.name,
      hidden: !!a.is_hidden
    }))
  };
}

async function mapPool(items, concurrency, worker) {
  const out = new Array(items.length);
  let i = 0;
  async function run() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await worker(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => run()));
  return out;
}

async function main() {
  const formIds = loadFormIds();
  console.log(`Building Pokédex reference for ${formIds.length} Kanto form ids…`);

  const capture = JSON.parse(fs.readFileSync(CAPTURE_PATH, "utf8"));
  const evoByDex = {};
  for (const sp of capture.species || []) {
    const fam = (sp.evolution_family || [])
      .map((slug) => (capture.species || []).find((s) => s.slug === slug)?.dex)
      .filter((d) => Number.isFinite(d) && d >= 1 && d <= 151);
    evoByDex[sp.dex] = fam.length ? fam : [sp.dex];
  }

  const species = {};
  await mapPool(Array.from({ length: 151 }, (_, i) => i + 1), 6, async (dex) => {
    const data = await fetchJson(`${API}/pokemon-species/${dex}`);
    species[dex] = {
      genus: pickGenus(data.genera),
      flavor: pickFlavor(data.flavor_text_entries),
      generation: Number(String(data.generation?.url || "").match(/\/(\d+)\/?$/)?.[1] || 1) || 1,
      evoFamily: evoByDex[dex] || [dex]
    };
    if (dex % 25 === 0) console.log(`  species ${dex}/151`);
  });

  const forms = {};
  await mapPool(formIds, 8, async (id, idx) => {
    const data = await fetchJson(`${API}/pokemon/${id}`);
    forms[id] = mapPokemon(data);
    if ((idx + 1) % 40 === 0) console.log(`  forms ${idx + 1}/${formIds.length}`);
  });

  // Sanity: Charizard mega-x / Articuno galarian
  const cx = forms[10034];
  const ga = forms[10169];
  if (!cx?.types?.includes("dragon")) {
    console.warn("WARN: Mega Charizard X types unexpected", cx?.types);
  }
  if (!ga?.types?.includes("psychic")) {
    console.warn("WARN: Galarian Articuno types unexpected", ga?.types);
  }

  const payload = {
    builtAt: new Date().toISOString(),
    source: "pokeapi.co (synced)",
    species,
    forms
  };

  const body = [
    "/* generated by tools/build-pokedex-reference.js — do not hand-edit */",
    "/* Upstream: PokéAPI. Runtime: this file only. */",
    `window.PLAY_POKEDEX_REF = ${JSON.stringify(payload)};`,
    `window.playPokedexRef = function playPokedexRef(formId, dex) {`,
    `  const root = window.PLAY_POKEDEX_REF || {};`,
    `  const fid = Number(formId) || Number(dex) || 0;`,
    `  const d = Number(dex) || 0;`,
    `  const form = (root.forms && root.forms[fid]) || (root.forms && root.forms[d]) || null;`,
    `  const sp = (root.species && root.species[d]) || null;`,
    `  if (!form && !sp) return null;`,
    `  return {`,
    `    types: form?.types || [],`,
    `    heightM: form?.heightM ?? null,`,
    `    weightKg: form?.weightKg ?? null,`,
    `    stats: form?.stats || {},`,
    `    abilities: form?.abilities || [],`,
    `    genus: sp?.genus || "",`,
    `    flavor: sp?.flavor || "",`,
    `    generation: sp?.generation || 1,`,
    `    evoFamily: sp?.evoFamily || (d ? [d] : [])`,
    `  };`,
    `};`,
    ""
  ].join("\n");

  fs.writeFileSync(OUT_PATH, body);
  const kb = Math.round(fs.statSync(OUT_PATH).size / 1024);
  console.log(`Wrote ${OUT_PATH} (${kb} KB)`);
  console.log(`forms=${Object.keys(forms).length} species=${Object.keys(species).length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
