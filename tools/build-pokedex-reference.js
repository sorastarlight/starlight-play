#!/usr/bin/env node
/**
 * Build js/pokedex-reference.js from PokéAPI (upstream source of truth).
 * Runtime Pokédex reads ONLY this local file — never pokeapi.co.
 *
 * Extends form rows with pokemon-form provenance + structured form copy
 * derived only from authoritative fields (no invented lore).
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

function loadFormsCatalog() {
  const src = fs.readFileSync(FORMS_PATH, "utf8");
  const byMatch = src.match(/window\.PLAY_FORM_BY_DEX\s*=\s*(\{[\s\S]*?\});/);
  const formsMatch = src.match(/window\.PLAY_FORMS\s*=\s*(\{[\s\S]*?\});/);
  if (!byMatch) throw new Error("PLAY_FORM_BY_DEX not found");
  const byDex = Function(`return (${byMatch[1]})`)();
  const playForms = formsMatch ? Function(`return (${formsMatch[1]})`)() : {};
  const ids = new Set();
  for (let d = 1; d <= 151; d++) {
    const list = byDex[d] || byDex[String(d)] || [];
    list.forEach((id) => ids.add(Number(id)));
  }
  return { ids: [...ids].sort((a, b) => a - b), byDex, playForms };
}

function titleCaseSlug(slug) {
  return String(slug || "")
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function pickFlavor(entries) {
  const en = (entries || []).filter((e) => e.language?.name === "en");
  if (!en.length) return { text: "", version: "", versionGroup: "" };
  // Prefer canonical Kanto-era entries when present, then deterministic modern fallbacks.
  const prefer = [
    "red", "blue", "yellow", "firered", "leafgreen",
    "gold", "silver", "crystal", "heartgold", "soulsilver",
    "ruby", "sapphire", "emerald", "diamond", "pearl", "platinum",
    "black", "white", "black-2", "white-2",
    "x", "y", "omega-ruby", "alpha-sapphire",
    "sun", "moon", "ultra-sun", "ultra-moon",
    "sword", "shield", "scarlet", "violet",
    "legends-arceus", "legends-za"
  ];
  for (const vg of prefer) {
    const hit = [...en].reverse().find((e) => e.version?.name === vg || e.version_group?.name === vg);
    if (hit?.flavor_text) {
      return {
        text: hit.flavor_text.replace(/\s+/g, " ").trim(),
        version: hit.version?.name || "",
        versionGroup: hit.version_group?.name || hit.version?.name || ""
      };
    }
  }
  const last = en[en.length - 1];
  return {
    text: String(last.flavor_text || "").replace(/\s+/g, " ").trim(),
    version: last.version?.name || "",
    versionGroup: last.version_group?.name || ""
  };
}

function pickGenus(genera) {
  const en = (genera || []).find((g) => g.language?.name === "en");
  return en?.genus ? String(en.genus).trim() : "";
}

function pickFormName(names) {
  const en = (names || []).find((n) => n.language?.name === "en");
  return en?.name ? String(en.name).trim() : "";
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

function generationLabel(n) {
  const map = {
    1: "Generation I",
    2: "Generation II",
    3: "Generation III",
    4: "Generation IV",
    5: "Generation V",
    6: "Generation VI",
    7: "Generation VII",
    8: "Generation VIII",
    9: "Generation IX"
  };
  return map[Number(n)] || (n ? `Generation ${n}` : "");
}

function versionGroupGeneration(vg) {
  const map = {
    "red-blue": 1, yellow: 1,     "firered-leafgreen": 1,
    "gold-silver": 2, crystal: 2, "heartgold-soulsilver": 2,
    "ruby-sapphire": 3, emerald: 3,
    "diamond-pearl": 4, platinum: 4,
    "black-white": 5, "black-2-white-2": 5,
    "x-y": 6, "omega-ruby-alpha-sapphire": 6,
    "sun-moon": 7, "ultra-sun-ultra-moon": 7,
    "sword-shield": 8, "scarlet-violet": 9,
    "lets-go-pikachu-lets-go-eevee": 7,
    "legends-arceus": 8, "colosseum": 3, xd: 3
  };
  return map[String(vg || "")] || null;
}

function megaStoneRequirement(speciesName, formKey) {
  const key = String(formKey || "").toLowerCase();
  const special = {
    mewtwo: "Mewtwonite",
    charizard: "Charizardite",
    venusaur: "Venusaurite",
    blastoise: "Blastoisinite",
    alakazam: "Alakazite",
    gengar: "Gengarite",
    kangaskhan: "Kangaskhanite",
    pinsir: "Pinsirite",
    gyarados: "Gyaradosite",
    aerodactyl: "Aerodactylite"
  };
  const slug = String(speciesName || "").toLowerCase().replace(/[^a-z]/g, "");
  const stoneBase = special[slug] || `${titleCaseSlug(slug)}ite`;
  if (key === "mega-x") return `${stoneBase} X`;
  if (key === "mega-y") return `${stoneBase} Y`;
  if (key === "mega") return stoneBase;
  return null;
}

function structuredFormDescription(meta) {
  const name = meta.displayName || meta.formName || meta.formLabel || "This form";
  const species = titleCaseSlug(String(meta.speciesName || "this-species").replace(/\s+/g, "-"));
  const types = (meta.types || []).map(titleCaseSlug);
  const typeText = types.length ? types.join("/") : "";
  const kind = String(meta.kind || "").toLowerCase();
  if (kind === "mega") {
    let text = `${name} is ${species}'s Mega Evolution`;
    if (meta.requirement) text += ` using ${meta.requirement}`;
    text += ".";
    if (typeText) text += ` Its typing is ${typeText}.`;
    return text;
  }
  if (kind === "gigantamax") {
    let text = `${name} is the Gigantamax form of ${species}.`;
    if (typeText) text += ` Its typing is ${typeText}.`;
    return text;
  }
  if (kind === "regional") {
    const region = titleCaseSlug(meta.formKey || meta.formLabel || "regional");
    let text = `${name} is the ${region} regional form of ${species}.`;
    if (typeText) text += ` Its typing is ${typeText}.`;
    return text;
  }
  if (kind === "cosplay" || kind === "cap" || kind === "costume") {
    return `${name} is a costume form of ${species}.`;
  }
  if (!meta.isDefault && meta.formLabel) {
    let text = `${name} is an alternate form of ${species}.`;
    if (typeText) text += ` Its typing is ${typeText}.`;
    return text;
  }
  return "";
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
  const { ids: formIds, playForms } = loadFormsCatalog();
  console.log(`Building Pokédex reference for ${formIds.length} Kanto form ids…`);

  const capture = JSON.parse(fs.readFileSync(CAPTURE_PATH, "utf8"));
  const evoByDex = {};
  const nameByDex = {};
  for (const sp of capture.species || []) {
    nameByDex[sp.dex] = sp.name || sp.slug;
    const fam = (sp.evolution_family || [])
      .map((slug) => (capture.species || []).find((s) => s.slug === slug)?.dex)
      .filter((d) => Number.isFinite(d) && d >= 1 && d <= 151);
    evoByDex[sp.dex] = fam.length ? fam : [sp.dex];
  }

  const species = {};
  await mapPool(Array.from({ length: 151 }, (_, i) => i + 1), 6, async (dex) => {
    const data = await fetchJson(`${API}/pokemon-species/${dex}`);
    const flavor = pickFlavor(data.flavor_text_entries);
    const formDescriptions = (data.form_descriptions || [])
      .filter((d) => d.language?.name === "en" && d.description)
      .map((d) => ({
        text: String(d.description).replace(/\s+/g, " ").trim(),
        sourceResource: "pokemon-species/form_descriptions"
      }));
    species[dex] = {
      genus: pickGenus(data.genera),
      flavor: flavor.text,
      flavorVersion: flavor.version,
      flavorVersionGroup: flavor.versionGroup,
      generation: Number(String(data.generation?.url || "").match(/\/(\d+)\/?$/)?.[1] || 1) || 1,
      evoFamily: evoByDex[dex] || [dex],
      formDescriptions
    };
    if (dex % 25 === 0) console.log(`  species ${dex}/151`);
  });

  const forms = {};
  await mapPool(formIds, 6, async (id, idx) => {
    const catalog = playForms[id] || playForms[String(id)] || {};
    const dex = Number(catalog.dex) || id;
    const poke = await fetchJson(`${API}/pokemon/${id}`);
    // Pokemon variety id ≠ pokemon-form id for many megas (e.g. 10034 → form 10134).
    // Always prefer the form linked from the pokemon variety.
    let formRes = null;
    const formUrl = poke?.forms?.[0]?.url;
    if (formUrl) {
      formRes = await fetchJson(formUrl).catch(() => null);
    }
    if (!formRes && id !== dex) {
      formRes = await fetchJson(`${API}/pokemon-form/${id}`).catch(() => null);
    }
    const mapped = mapPokemon(poke);
    const vg = formRes?.version_group?.name || "";
    const introducedGen = versionGroupGeneration(vg) || (catalog.kind === "base" || id === dex ? 1 : null);
    const formName = pickFormName(formRes?.names) || catalog.displayName || catalog.formLabel || "";
    const speciesName = titleCaseSlug(nameByDex[dex] || String(poke?.species?.name || ""));
    // Charizardite naming: species "Charizard" → Charizardite
    const stoneSpecies = speciesName.replace(/\s+/g, "");
    const kind = String(catalog.kind || (formRes?.is_mega ? "mega" : "form")).toLowerCase();
    const requirement = kind === "mega"
      ? megaStoneRequirement(stoneSpecies, catalog.formKey)
      : kind === "gigantamax"
        ? "Gigantamax Factor"
        : null;
    const transformation = kind === "mega"
      ? "Mega Evolution"
      : kind === "gigantamax"
        ? "Gigantamax"
        : kind === "regional"
          ? "Regional form"
          : kind === "cosplay" || kind === "cap"
            ? "Costume"
            : kind === "base" || id === dex
              ? "Base form"
              : titleCaseSlug(kind);

    // Prefer species form_descriptions only when a single description exists for multi-form species
    // and this is a non-base form — otherwise use structured facts.
    let description = "";
    let descriptionSource = "";
    const spDesc = species[dex]?.formDescriptions || [];
    if (!catalog.isBase && spDesc.length === 1 && kind !== "mega" && kind !== "gigantamax") {
      description = spDesc[0].text;
      descriptionSource = "pokeapi:pokemon-species/form_descriptions";
    }
    if (!description && (kind === "mega" || kind === "gigantamax" || kind === "regional" || kind === "cosplay" || kind === "cap")) {
      description = structuredFormDescription({
        displayName: catalog.displayName || formName,
        formName,
        formLabel: catalog.formLabel,
        formKey: catalog.formKey,
        kind,
        types: mapped.types,
        speciesName,
        requirement,
        isDefault: !!formRes?.is_default || !!catalog.isBase
      });
      descriptionSource = description ? "structured:authoritative-fields" : "";
    }

    forms[id] = {
      ...mapped,
      formName: formName || null,
      formKey: catalog.formKey || null,
      formLabel: catalog.formLabel || null,
      kind,
      isDefault: catalog.isBase != null ? !!catalog.isBase : !!formRes?.is_default,
      isMega: !!formRes?.is_mega || kind === "mega",
      isBattleOnly: formRes?.is_battle_only != null ? !!formRes.is_battle_only : null,
      versionGroup: vg || null,
      introduced: introducedGen ? generationLabel(introducedGen) : null,
      introducedGeneration: introducedGen,
      transformation: transformation || null,
      requirement: requirement || null,
      description: description || null,
      descriptionSource: descriptionSource || null,
      provenance: {
        source: "pokeapi",
        sourceResource: id === dex ? `pokemon/${id}` : `pokemon-form/${id}`,
        pokemonResource: `pokemon/${id}`,
        versionGroup: vg || null
      }
    };
    if ((idx + 1) % 40 === 0) console.log(`  forms ${idx + 1}/${formIds.length}`);
  });

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
    `    flavorVersion: sp?.flavorVersion || "",`,
    `    flavorVersionGroup: sp?.flavorVersionGroup || "",`,
    `    generation: sp?.generation || 1,`,
    `    evoFamily: sp?.evoFamily || (d ? [d] : []),`,
    `    formName: form?.formName || "",`,
    `    formKey: form?.formKey || "",`,
    `    formLabel: form?.formLabel || "",`,
    `    kind: form?.kind || "",`,
    `    isDefault: form?.isDefault ?? null,`,
    `    isMega: !!form?.isMega,`,
    `    isBattleOnly: form?.isBattleOnly ?? null,`,
    `    versionGroup: form?.versionGroup || "",`,
    `    introduced: form?.introduced || "",`,
    `    introducedGeneration: form?.introducedGeneration ?? null,`,
    `    transformation: form?.transformation || "",`,
    `    requirement: form?.requirement || "",`,
    `    description: form?.description || "",`,
    `    descriptionSource: form?.descriptionSource || "",`,
    `    provenance: form?.provenance || null`,
    `  };`,
    `};`,
    ""
  ].join("\n");

  fs.writeFileSync(OUT_PATH, body);
  const kb = Math.round(fs.statSync(OUT_PATH).size / 1024);
  console.log(`Wrote ${OUT_PATH} (${kb} KB)`);
  console.log(`forms=${Object.keys(forms).length} species=${Object.keys(species).length}`);
  console.log("Mega X sample:", {
    types: cx?.types,
    ability: cx?.abilities?.[0]?.name,
    introduced: cx?.introduced,
    requirement: cx?.requirement,
    description: cx?.description
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
