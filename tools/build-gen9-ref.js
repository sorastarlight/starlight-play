#!/usr/bin/env node
/**
 * Build the offline Gen IX StreamLink reference pin.
 * Build-time only. Downloads pinned PokéAPI CSVs into tools/.cache/ (gitignored).
 * Runtime catch / admin paths must never call this or pokeapi.co.
 *
 *   node tools/build-gen9-ref.js
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.join(__dirname, "..");
const PIN_DIR = path.join(ROOT, "data", "gen9-ref");
const UNAPPLIED = path.join(ROOT, "supabase", "unapplied", "a19-ref");
const FORMS_SEED = path.join(ROOT, "data", "pokemon-forms-seed.json");

const POKEAPI_COMMIT = "227b573712414a86ba299d322fa398fbb2893edc";
const POKEAPI_REPO = "https://github.com/PokeAPI/pokeapi";
const RAW_BASE = `https://raw.githubusercontent.com/PokeAPI/pokeapi/${POKEAPI_COMMIT}/data/v2/csv`;
const CACHE = path.join(ROOT, "tools", ".cache", "pokeapi", POKEAPI_COMMIT);

const CSV_FILES = [
  "version_groups.csv",
  "pokemon_move_methods.csv",
  "types.csv",
  "stats.csv",
  "natures.csv",
  "nature_names.csv",
  "abilities.csv",
  "moves.csv",
  "pokemon_species.csv",
  "pokemon.csv",
  "pokemon_stats.csv",
  "pokemon_types.csv",
  "pokemon_abilities.csv",
  "pokemon_moves.csv",
  "pokemon_evolution.csv",
  "evolution_triggers.csv"
];

const STAT_SLUG = { 1: "hp", 2: "atk", 3: "def", 4: "spa", 5: "spd", 6: "spe" };
const SPECIAL_DEX = new Set([144, 145, 146, 150, 151]);

function sha256(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function splitCsvLine(line) {
  const out = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (ch === "," && !quoted) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function parseCsv(text) {
  const lines = String(text).split(/\r?\n/).filter((line) => line.length);
  if (!lines.length) return [];
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cols = splitCsvLine(line);
    const row = {};
    headers.forEach((h, i) => {
      row[h] = cols[i] === undefined ? "" : cols[i];
    });
    return row;
  });
}

function indexBy(rows, key) {
  const map = new Map();
  for (const row of rows) map.set(String(row[key]), row);
  return map;
}

function groupBy(rows, key) {
  const map = new Map();
  for (const row of rows) {
    const k = String(row[key]);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(row);
  }
  return map;
}

async function downloadCsv(name) {
  fs.mkdirSync(CACHE, { recursive: true });
  const dest = path.join(CACHE, name);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
    return fs.readFileSync(dest, "utf8");
  }
  const url = `${RAW_BASE}/${name}`;
  const res = await fetch(url, { headers: { Accept: "text/csv" } });
  if (!res.ok) throw new Error(`download failed ${res.status} ${url}`);
  const text = await res.text();
  fs.writeFileSync(dest, text);
  return text;
}

function historicalCandidates(form) {
  const kind = String(form.kind || "").toLowerCase();
  const key = String(form.form_key || "").toLowerCase();
  const label = String(form.form_label || "").toLowerCase();
  const blob = `${kind} ${key} ${label}`;
  const list = [];
  if (blob.includes("alola")) {
    list.push("ultra-sun-ultra-moon", "sun-moon", "lets-go-pikachu-lets-go-eevee");
  }
  if (blob.includes("galar")) list.push("sword-shield");
  if (blob.includes("hisui")) list.push("legends-arceus");
  if (blob.includes("paldea")) list.push("scarlet-violet");
  if (kind === "mega" || key.startsWith("mega") || blob.includes("mega")) {
    list.push("omega-ruby-alpha-sapphire", "x-y");
  }
  if (kind === "gigantamax" || blob.includes("gigantamax") || blob.includes("gmax")) {
    list.push("sword-shield");
  }
  if (kind === "cosplay") list.push("omega-ruby-alpha-sapphire");
  if (kind === "starter") list.push("lets-go-pikachu-lets-go-eevee");
  if (blob.includes("totem")) list.push("ultra-sun-ultra-moon", "sun-moon");
  if (form.is_base) {
    list.push("lets-go-pikachu-lets-go-eevee", "ultra-sun-ultra-moon", "brilliant-diamond-shining-pearl");
  }
  return list;
}

function candidateVersionGroups(form) {
  const seen = new Set();
  const ordered = [];
  function add(name) {
    if (!name || seen.has(name)) return;
    seen.add(name);
    ordered.push(name);
  }
  add("scarlet-violet");
  add("sword-shield");
  historicalCandidates(form).forEach(add);
  return ordered;
}

function resolutionLabel(form, vg) {
  if (!vg) return "unresolved";
  if (vg === "scarlet-violet") return "sv";
  if (vg === "sword-shield") return "swsh-verified";
  return "historical-exception";
}

function historicalReason(form, vg) {
  if (!vg || vg === "scarlet-violet") return null;
  if (vg === "sword-shield") return `form ${form.pokemon_form_id} has verified sword-shield rows and no scarlet-violet rows`;
  const kind = String(form.kind || form.form_key || "");
  return `form ${form.pokemon_form_id} (${form.form_key}/${form.kind}) has no SV/SWSH rows; using verified ${vg} rows for ${kind}`;
}

function obtainChannel(form, species) {
  if (!form.is_base) return "event";
  if (SPECIAL_DEX.has(Number(form.dex)) || species?.isLegendary || species?.isMythical) return "special";
  if (form.normal_encounter_enabled) return "ordinary";
  return "grant";
}

function writeJson(name, value) {
  const abs = path.join(PIN_DIR, name);
  const text = `${JSON.stringify(value, null, 2)}\n`;
  fs.writeFileSync(abs, text);
  return { name, sha256: sha256(text), bytes: Buffer.byteLength(text) };
}

function sqlQuote(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return `'${String(value).replace(/'/g, "''")}'`;
}

function emitInsert(table, columns, rows) {
  if (!rows.length) return `-- ${table}: 0 rows\n`;
  const lines = [`INSERT INTO ${table} (${columns.join(", ")}) VALUES`];
  rows.forEach((row, i) => {
    const vals = columns.map((col) => sqlQuote(row[col]));
    lines.push(`  (${vals.join(", ")})${i === rows.length - 1 ? ";" : ","}`);
  });
  return `${lines.join("\n")}\n`;
}

async function main() {
  if (!fs.existsSync(FORMS_SEED)) throw new Error("missing data/pokemon-forms-seed.json");
  const catalog = JSON.parse(fs.readFileSync(FORMS_SEED, "utf8"));
  const kantoForms = catalog.filter((row) => Number(row.dex) >= 1 && Number(row.dex) <= 151);
  if (!kantoForms.length) throw new Error("no Kanto forms in seed");

  console.log(`A19-REF: ${kantoForms.length} Kanto catalog forms. Pinning PokéAPI ${POKEAPI_COMMIT}`);
  const csvText = {};
  const csvHash = {};
  for (const name of CSV_FILES) {
    const text = await downloadCsv(name);
    csvText[name] = text;
    csvHash[name] = sha256(text);
    console.log(`  cached ${name} ${text.length} bytes`);
  }

  const versionGroups = parseCsv(csvText["version_groups.csv"]);
  const vgById = new Map(versionGroups.map((row) => [String(row.id), row.identifier]));
  const vgBySlug = new Map(versionGroups.map((row) => [row.identifier, String(row.id)]));
  const methods = parseCsv(csvText["pokemon_move_methods.csv"]);
  const methodById = new Map(methods.map((row) => [String(row.id), row.identifier]));
  const types = parseCsv(csvText["types.csv"]);
  const typeById = new Map(types.map((row) => [String(row.id), row.identifier]));
  const naturesCsv = parseCsv(csvText["natures.csv"]);
  const natureNames = parseCsv(csvText["nature_names.csv"]).filter((row) => row.local_language_id === "9");
  const natureNameById = new Map(natureNames.map((row) => [String(row.nature_id), row.name]));
  const abilitiesCsv = parseCsv(csvText["abilities.csv"]);
  const movesCsv = parseCsv(csvText["moves.csv"]);
  const speciesCsv = parseCsv(csvText["pokemon_species.csv"]);
  const pokemonCsv = parseCsv(csvText["pokemon.csv"]);
  const pokemonById = indexBy(pokemonCsv, "id");
  const speciesById = indexBy(speciesCsv, "id");
  const statsByPokemon = groupBy(parseCsv(csvText["pokemon_stats.csv"]), "pokemon_id");
  const typesByPokemon = groupBy(parseCsv(csvText["pokemon_types.csv"]), "pokemon_id");
  const absByPokemon = groupBy(parseCsv(csvText["pokemon_abilities.csv"]), "pokemon_id");
  const evoCsv = parseCsv(csvText["pokemon_evolution.csv"]);
  const evoTriggerById = new Map(parseCsv(csvText["evolution_triggers.csv"]).map((row) => [String(row.id), row.identifier]));

  const neededPokemonIds = new Set(kantoForms.map((row) => String(row.pokemon_form_id)));
  const allMoves = parseCsv(csvText["pokemon_moves.csv"]);
  const movesByPokemon = new Map();
  for (const row of allMoves) {
    if (!neededPokemonIds.has(String(row.pokemon_id))) continue;
    const pid = String(row.pokemon_id);
    if (!movesByPokemon.has(pid)) movesByPokemon.set(pid, []);
    movesByPokemon.get(pid).push(row);
  }

  const natures = naturesCsv.map((row) => {
    const up = STAT_SLUG[Number(row.increased_stat_id)] || null;
    const down = STAT_SLUG[Number(row.decreased_stat_id)] || null;
    const neutral = !up || !down || up === down;
    return {
      id: Number(row.id),
      slug: row.identifier,
      name: natureNameById.get(String(row.id)) || row.identifier,
      upStat: neutral ? null : up,
      downStat: neutral ? null : down
    };
  }).sort((a, b) => a.id - b.id);

  const species = [];
  for (let dex = 1; dex <= 151; dex++) {
    const row = speciesById.get(String(dex));
    if (!row) {
      species.push({
        dex,
        slug: null,
        genderRate: null,
        baseFriendship: null,
        captureRate: null,
        hatchCounter: null,
        isLegendary: false,
        isMythical: false,
        mappingStatus: "missing-species"
      });
      continue;
    }
    species.push({
      dex,
      slug: row.identifier,
      genderRate: Number(row.gender_rate),
      baseFriendship: Number(row.base_happiness),
      captureRate: Number(row.capture_rate),
      hatchCounter: Number(row.hatch_counter),
      isLegendary: row.is_legendary === "1",
      isMythical: row.is_mythical === "1",
      mappingStatus: "ok"
    });
  }

  const usedAbilityIds = new Set();
  const usedMoveIds = new Set();
  const forms = [];
  const formAbilities = [];
  const learnsets = [];
  const exceptions = [];
  const obtain = [];

  for (const form of kantoForms) {
    const formId = Number(form.pokemon_form_id);
    const poke = pokemonById.get(String(formId));
    const spec = species.find((s) => s.dex === Number(form.dex));
    const mappingStatus = poke ? "ok" : "missing-pokemon";
    const pokeapiPokemonId = poke ? Number(poke.id) : null;
    const statRows = statsByPokemon.get(String(formId)) || [];
    const stats = { hp: null, atk: null, def: null, spa: null, spd: null, spe: null };
    for (const st of statRows) {
      const slug = STAT_SLUG[Number(st.stat_id)];
      if (slug) stats[slug] = Number(st.base_stat);
    }
    const typeRows = (typesByPokemon.get(String(formId)) || [])
      .sort((a, b) => Number(a.slot) - Number(b.slot))
      .map((row) => typeById.get(String(row.type_id)))
      .filter(Boolean);
    const abilityRows = (absByPokemon.get(String(formId)) || [])
      .sort((a, b) => Number(a.slot) - Number(b.slot));
    for (const ab of abilityRows) {
      usedAbilityIds.add(Number(ab.ability_id));
      formAbilities.push({
        formId,
        slot: ab.is_hidden === "1" ? "hidden" : String(ab.slot),
        abilityId: Number(ab.ability_id),
        isHidden: ab.is_hidden === "1"
      });
    }

    const byVg = new Map();
    for (const row of movesByPokemon.get(String(formId)) || []) {
      const vg = vgById.get(String(row.version_group_id));
      if (!vg) continue;
      if (!byVg.has(vg)) byVg.set(vg, []);
      byVg.get(vg).push(row);
    }
    const tried = candidateVersionGroups(form);
    let chosen = null;
    for (const vg of tried) {
      const rows = byVg.get(vg) || [];
      if (rows.length) {
        chosen = vg;
        break;
      }
    }
    const status = chosen ? "resolved" : "unresolved";
    const resolution = resolutionLabel(form, chosen);
    if (chosen) {
      for (const row of byVg.get(chosen) || []) {
        const moveId = Number(row.move_id);
        usedMoveIds.add(moveId);
        learnsets.push({
          formId,
          versionGroup: chosen,
          method: methodById.get(String(row.pokemon_move_method_id)) || "unknown",
          level: Number(row.level || 0),
          order: Number(row.order || 0),
          moveId
        });
      }
    }

    const presentGroups = [...byVg.keys()].sort();
    exceptions.push({
      formId,
      dex: Number(form.dex),
      formKey: form.form_key,
      kind: form.kind,
      isBase: !!form.is_base,
      mappingStatus,
      pokeapiPokemonId,
      learnsetStatus: status,
      chosenVersionGroup: chosen,
      resolution,
      historicalReason: historicalReason(form, chosen),
      inheritedFromBase: false,
      candidateGroupsTried: tried,
      versionGroupsPresent: presentGroups,
      levelUpCount: chosen ? (byVg.get(chosen) || []).filter((r) => methodById.get(String(r.pokemon_move_method_id)) === "level-up").length : 0,
      machineCount: chosen ? (byVg.get(chosen) || []).filter((r) => methodById.get(String(r.pokemon_move_method_id)) === "machine").length : 0
    });

    obtain.push({
      formId,
      dex: Number(form.dex),
      channel: obtainChannel(form, spec),
      normalEncounterEnabled: !!form.normal_encounter_enabled,
      adminTargetable: !!form.admin_targetable,
      eventTargetable: !!form.event_targetable,
      enabled: true
    });

    forms.push({
      formId,
      dex: Number(form.dex),
      formKey: form.form_key,
      formLabel: form.form_label,
      kind: form.kind,
      isBase: !!form.is_base,
      pokeapiPokemonId,
      mappingStatus,
      types: typeRows,
      heightM: poke && poke.height !== "" ? Number(poke.height) / 10 : null,
      weightKg: poke && poke.weight !== "" ? Number(poke.weight) / 10 : null,
      hp: stats.hp,
      atk: stats.atk,
      def: stats.def,
      spa: stats.spa,
      spd: stats.spd,
      spe: stats.spe,
      learnsetStatus: status,
      learnsetVersionGroup: chosen,
      learnsetResolution: resolution
    });
  }

  const abilities = abilitiesCsv
    .filter((row) => usedAbilityIds.has(Number(row.id)))
    .map((row) => ({
      abilityId: Number(row.id),
      slug: row.identifier,
      generation: Number(row.generation_id),
      isMainSeries: row.is_main_series === "1"
    }))
    .sort((a, b) => a.abilityId - b.abilityId);

  const moves = movesCsv
    .filter((row) => usedMoveIds.has(Number(row.id)))
    .map((row) => ({
      moveId: Number(row.id),
      slug: row.identifier,
      type: typeById.get(String(row.type_id)) || null,
      damageClass: Number(row.damage_class_id) === 2 ? "physical" : Number(row.damage_class_id) === 3 ? "special" : "status",
      pp: row.pp === "" ? null : Number(row.pp),
      power: row.power === "" ? null : Number(row.power),
      accuracy: row.accuracy === "" ? null : Number(row.accuracy)
    }))
    .sort((a, b) => a.moveId - b.moveId);

  const evolutions = [];
  for (const row of evoCsv) {
    const toDex = Number(row.evolved_species_id);
    const toSpec = speciesById.get(String(toDex));
    const fromDex = toSpec && toSpec.evolves_from_species_id ? Number(toSpec.evolves_from_species_id) : null;
    if (!fromDex || fromDex < 1 || fromDex > 151 || toDex < 1 || toDex > 151) continue;
    evolutions.push({
      fromDex,
      toDex,
      trigger: evoTriggerById.get(String(row.evolution_trigger_id)) || null,
      minLevel: row.minimum_level === "" ? null : Number(row.minimum_level),
      itemId: row.evolution_item_id === "" ? null : Number(row.evolution_item_id),
      heldItemId: row.held_item_id === "" ? null : Number(row.held_item_id),
      tradeSpeciesId: row.trade_species_id === "" ? null : Number(row.trade_species_id)
    });
  }

  const byKind = {};
  for (const ex of exceptions) {
    const kind = ex.kind || "unknown";
    if (!byKind[kind]) byKind[kind] = { total: 0, resolved: 0, unresolved: 0, sv: 0, swsh: 0, historical: 0, missingPokemon: 0 };
    byKind[kind].total += 1;
    if (ex.mappingStatus !== "ok") byKind[kind].missingPokemon += 1;
    if (ex.learnsetStatus === "resolved") byKind[kind].resolved += 1;
    else byKind[kind].unresolved += 1;
    if (ex.resolution === "sv") byKind[kind].sv += 1;
    if (ex.resolution === "swsh-verified") byKind[kind].swsh += 1;
    if (ex.resolution === "historical-exception") byKind[kind].historical += 1;
  }

  const coverage = {
    roster: "kanto-1-151-plus-catalog-forms",
    species: species.length,
    forms: forms.length,
    natures: natures.length,
    abilities: abilities.length,
    moves: moves.length,
    learnsetRows: learnsets.length,
    evolutions: evolutions.length,
    resolvedLearnsets: exceptions.filter((e) => e.learnsetStatus === "resolved").length,
    unresolvedLearnsets: exceptions.filter((e) => e.learnsetStatus === "unresolved").length,
    byKind,
    johtoPlaceholder: {
      dex: 179,
      slug: "mareep",
      inV1: false,
      note: "Out of Kanto v1 roster. Validator must fail closed until a later region pin."
    },
    rules: {
      neverInventMoves: true,
      neverInheritBaseLearnset: true,
      scarletVioletPreferred: true,
      swordShieldOnlyIfFormHasRows: true,
      wildSlice: "level-up at or below encounter level from chosen version-group only"
    }
  };

  const builtAt = new Date().toISOString();
  const meta = {
    contentBuild: `sl-ref-20261013-${POKEAPI_COMMIT.slice(0, 7)}`,
    rulesetId: "streamlink-gen9-xgen",
    pokeapiCommit: POKEAPI_COMMIT,
    pokeapiRepo: POKEAPI_REPO,
    pokeapiDocs: "https://pokeapi.co/docs/v2",
    pokeapiCsvPath: "data/v2/csv",
    licenseNote: "PokéAPI code is MIT. The CSV extract is a fan compilation of factual game data, not a Nintendo product, and does not grant HOME/cartridge legality.",
    builtAt,
    extractor: "tools/build-gen9-ref.js",
    runtimeNetwork: false,
    appliedToSupabase: false,
    sourceCsvSha256: csvHash
  };

  fs.mkdirSync(PIN_DIR, { recursive: true });
  const written = [
    writeJson("meta.json", meta),
    writeJson("natures.json", natures),
    writeJson("species.json", species),
    writeJson("forms.json", forms),
    writeJson("form-abilities.json", formAbilities),
    writeJson("abilities.json", abilities),
    writeJson("moves.json", moves),
    writeJson("learnsets.json", learnsets),
    writeJson("evolutions.json", evolutions),
    writeJson("obtain.json", obtain),
    writeJson("exceptions.json", exceptions),
    writeJson("coverage.json", coverage)
  ];
  const manifest = {
    contentBuild: meta.contentBuild,
    algorithm: "sha256",
    files: Object.fromEntries(written.map((row) => [row.name, row.sha256])),
    bytes: Object.fromEntries(written.map((row) => [row.name, row.bytes]))
  };
  writeJson("manifest.json", manifest);
  manifest.files["manifest.json"] = sha256(`${JSON.stringify(manifest, null, 2)}\n`);
  writeJson("manifest.json", manifest);

  const readme = `# Offline Gen IX reference pin

**Do not apply this data to live Supabase from this folder.** Seed SQL lives in \`supabase/unapplied/a19-ref/\` and is review-only.

| Field | Value |
|---|---|
| content_build | ${meta.contentBuild} |
| ruleset | ${meta.rulesetId} |
| upstream | ${POKEAPI_REPO}/commit/${POKEAPI_COMMIT} |
| docs | https://pokeapi.co/docs/v2 |
| roster | Kanto 1–151 + catalog forms from \`data/pokemon-forms-seed.json\` |
| runtime network | never |

## Rebuild

\`\`\`
node tools/build-gen9-ref.js
node tests/gen9-ref-tests.js
\`\`\`

Downloads CSVs into \`tools/.cache/pokeapi/${POKEAPI_COMMIT}/\` (gitignored). Tests read only \`data/gen9-ref/\`.

## Resolution

1. Use \`scarlet-violet\` learnset rows for **that form id** if any exist.
2. Else use \`sword-shield\` only if **that form** has SWSH rows.
3. Else use a kind-specific historical group (Alola → USUM/SM/LGPE, Mega → ORAS/XY, Hisui → Legends Arceus, Gmax → SWSH) **only if that form has rows**.
4. Else \`unresolved\`. Never invent Tackle. Never copy the base form's learnset onto Mega/regional/Gmax/costume forms.

Wild slices may use **level-up** moves at or below the encounter level from the chosen group only.

## Counts (this build)

See \`coverage.json\`. Forms: ${forms.length}. Resolved learnsets: ${coverage.resolvedLearnsets}. Unresolved: ${coverage.unresolvedLearnsets}.
`;
  fs.writeFileSync(path.join(PIN_DIR, "README.md"), readme);

  fs.mkdirSync(UNAPPLIED, { recursive: true });
  const createSql = `-- A19-REF UNAPPLIED ARTIFACT
-- DO NOT RUN against live Supabase or any connected project.
-- Not a migration. Must never be copied into supabase/migrations/ without A19-SCHEMA.
-- Source of truth until then: data/gen9-ref/*.json

BEGIN;

CREATE TABLE IF NOT EXISTS ref_meta (
  content_build text PRIMARY KEY,
  ruleset_id text NOT NULL,
  pokeapi_commit text NOT NULL,
  built_at timestamptz NOT NULL,
  applied_to_live boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS ref_natures (
  id integer PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  up_stat text,
  down_stat text
);

CREATE TABLE IF NOT EXISTS ref_species (
  dex integer PRIMARY KEY,
  slug text,
  gender_rate integer,
  base_friendship integer,
  capture_rate integer,
  hatch_counter integer,
  is_legendary boolean NOT NULL DEFAULT false,
  is_mythical boolean NOT NULL DEFAULT false,
  mapping_status text NOT NULL
);

CREATE TABLE IF NOT EXISTS ref_forms (
  form_id integer PRIMARY KEY,
  dex integer NOT NULL REFERENCES ref_species(dex),
  form_key text NOT NULL,
  form_label text,
  kind text,
  is_base boolean NOT NULL,
  pokeapi_pokemon_id integer,
  mapping_status text NOT NULL,
  types text[] NOT NULL DEFAULT '{}',
  height_m numeric,
  weight_kg numeric,
  hp integer, atk integer, def integer, spa integer, spd integer, spe integer,
  learnset_status text NOT NULL,
  learnset_version_group text,
  learnset_resolution text
);

CREATE TABLE IF NOT EXISTS ref_abilities (
  ability_id integer PRIMARY KEY,
  slug text NOT NULL,
  generation integer,
  is_main_series boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS ref_form_abilities (
  form_id integer NOT NULL REFERENCES ref_forms(form_id),
  slot text NOT NULL,
  ability_id integer NOT NULL REFERENCES ref_abilities(ability_id),
  is_hidden boolean NOT NULL,
  PRIMARY KEY (form_id, slot, ability_id)
);

CREATE TABLE IF NOT EXISTS ref_moves (
  move_id integer PRIMARY KEY,
  slug text NOT NULL,
  type text,
  damage_class text,
  pp integer,
  power integer,
  accuracy integer
);

CREATE TABLE IF NOT EXISTS ref_learnsets (
  form_id integer NOT NULL REFERENCES ref_forms(form_id),
  version_group text NOT NULL,
  method text NOT NULL,
  level integer NOT NULL DEFAULT 0,
  move_id integer NOT NULL REFERENCES ref_moves(move_id),
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ref_evolutions (
  from_dex integer NOT NULL REFERENCES ref_species(dex),
  to_dex integer NOT NULL REFERENCES ref_species(dex),
  trigger text,
  min_level integer,
  item_id integer,
  held_item_id integer,
  trade_species_id integer
);

CREATE TABLE IF NOT EXISTS ref_obtain (
  form_id integer PRIMARY KEY REFERENCES ref_forms(form_id),
  dex integer NOT NULL,
  channel text NOT NULL,
  normal_encounter_enabled boolean NOT NULL,
  admin_targetable boolean NOT NULL,
  event_targetable boolean NOT NULL,
  enabled boolean NOT NULL DEFAULT true
);

COMMIT;
`;
  fs.writeFileSync(path.join(UNAPPLIED, "001_create_ref_tables.sql"), createSql);

  const seedSql = [
    "-- A19-REF UNAPPLIED SEED (small tables only).",
    "-- DO NOT RUN against live Supabase.",
    "-- Full learnsets remain in data/gen9-ref/learnsets.json until A19-SCHEMA.",
    "",
    "BEGIN;",
    emitInsert("ref_meta", ["content_build", "ruleset_id", "pokeapi_commit", "built_at", "applied_to_live"], [{
      content_build: meta.contentBuild,
      ruleset_id: meta.rulesetId,
      pokeapi_commit: meta.pokeapiCommit,
      built_at: meta.builtAt,
      applied_to_live: false
    }]),
    emitInsert("ref_natures", ["id", "slug", "name", "up_stat", "down_stat"], natures.map((n) => ({
      id: n.id, slug: n.slug, name: n.name, up_stat: n.upStat, down_stat: n.downStat
    }))),
    emitInsert("ref_species", ["dex", "slug", "gender_rate", "base_friendship", "capture_rate", "hatch_counter", "is_legendary", "is_mythical", "mapping_status"], species.map((s) => ({
      dex: s.dex, slug: s.slug, gender_rate: s.genderRate, base_friendship: s.baseFriendship,
      capture_rate: s.captureRate, hatch_counter: s.hatchCounter, is_legendary: s.isLegendary,
      is_mythical: s.isMythical, mapping_status: s.mappingStatus
    }))),
    "COMMIT;",
    ""
  ].join("\n");
  fs.writeFileSync(path.join(UNAPPLIED, "002_seed_meta_natures_species.sql"), seedSql);

  fs.writeFileSync(path.join(UNAPPLIED, "DO-NOT-APPLY.md"), `# Do not apply

These SQL files are **review artifacts** for A19-REF.

- Not listed in \`supabase/migrations/\`
- Must not be run with Supabase MCP \`apply_migration\` / \`execute_sql\`
- Must not be applied to project \`dtflmlbjhttoewqgkujf\`
- A19-SCHEMA is required before any live DDL

Pin JSON: \`data/gen9-ref/\`
`);

  console.log(`Wrote pin ${meta.contentBuild}`);
  console.log(`  forms ${forms.length} resolved ${coverage.resolvedLearnsets} unresolved ${coverage.unresolvedLearnsets}`);
  console.log(`  learnset rows ${learnsets.length}`);
  console.log("  SQL artifacts in supabase/unapplied/a19-ref/ (NOT APPLIED)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
