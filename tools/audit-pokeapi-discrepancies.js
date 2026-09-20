#!/usr/bin/env node
/** Explain PokéAPI catalog / sprite count discrepancies. */
const fs = require("fs");
const path = require("path");

function gameKey(n) {
  return String(n || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

async function fetchAll() {
  const all = [];
  let url = "https://pokeapi.co/api/v2/item?limit=200";
  while (url) {
    const page = await fetch(url).then((r) => r.json());
    all.push(...(page.results || []));
    url = page.next;
  }
  return all;
}

async function restGet(pathQuery) {
  const base = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const res = await fetch(`${base}/rest/v1/${pathQuery}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

async function main() {
  loadEnv();
  const upstream = await fetchAll();
  const byKey = new Map();
  for (const e of upstream) {
    const k = gameKey(e.name);
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k).push(e);
  }
  const collisions = [...byKey.entries()].filter(([, v]) => v.length > 1);

  const dbRows = [];
  for (let from = 0; ; from += 1000) {
    const chunk = await restGet(`item_catalog?select=slug,pokeapi_item_id,pokeapi_name,sprite_available,sprite_path&offset=${from}&limit=1000`);
    dbRows.push(...chunk);
    if (chunk.length < 1000) break;
  }
  const dbIds = new Set(dbRows.map((r) => r.pokeapi_item_id));
  const dbSlugs = new Set(dbRows.map((r) => r.slug));

  const missingFromDb = [];
  for (const e of upstream) {
    // We need IDs — fetch only for collision group or check by slug presence
    const k = gameKey(e.name);
    if (!dbSlugs.has(k)) missingFromDb.push({ name: e.name, key: k, url: e.url });
  }

  // For collisions, fetch IDs of losers (entries after first that share key)
  const aliasDetails = [];
  for (const [key, entries] of collisions) {
    const details = [];
    for (const e of entries) {
      const item = await fetch(e.url).then((r) => r.json());
      details.push({ id: item.id, name: item.name, key, inDb: dbIds.has(item.id) || dbSlugs.has(key) });
    }
    // which IDs are not primary?
    const primary = details[0];
    const losers = details.slice(1);
    aliasDetails.push({ key, primary, losers, all: details });
  }

  const spriteDir = path.join(__dirname, "..", "images", "items", "pokeapi");
  const files = fs.existsSync(spriteDir)
    ? fs.readdirSync(spriteDir).filter((f) => f.endsWith(".png"))
    : [];
  const fileSet = new Set(files);
  const spriteOk = dbRows.filter((r) => r.sprite_available);
  const missingFiles = spriteOk.filter((r) => {
    const base = path.basename(r.sprite_path || "");
    return base && !fileSet.has(base);
  });
  const orphanFiles = files.filter((f) => !dbRows.some((r) => path.basename(r.sprite_path || "") === f));

  // Shared sprite paths
  const byPath = new Map();
  for (const r of spriteOk) {
    const p = r.sprite_path || "";
    if (!byPath.has(p)) byPath.set(p, []);
    byPath.get(p).push(r.slug);
  }
  const sharedPaths = [...byPath.entries()].filter(([, slugs]) => slugs.length > 1);

  const out = {
    upstreamCount: upstream.length,
    uniqueKeys: byKey.size,
    dbRows: dbRows.length,
    difference: upstream.length - dbRows.length,
    collisions: aliasDetails,
    missingSlugKeys: missingFromDb,
    sprites: {
      dbSpriteAvailable: spriteOk.length,
      localFiles: files.length,
      difference: spriteOk.length - files.length,
      missingFiles: missingFiles.map((r) => ({ slug: r.slug, path: r.sprite_path, pokeapi: r.pokeapi_name })),
      orphanFiles: orphanFiles.slice(0, 20),
      orphanFileCount: orphanFiles.length,
      sharedPaths: sharedPaths.map(([p, slugs]) => ({ path: p, slugs }))
    }
  };
  console.log(JSON.stringify(out, null, 2));
  fs.writeFileSync(path.join(__dirname, "..", "docs", "audits", "pokeapi-discrepancy-audit.json"), JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
