#!/usr/bin/env node
/**
 * PokéAPI item catalog sync.
 * Upserts reference metadata + sprites. NEVER resets gameplay policy flags.
 *
 * Usage:
 *   node tools/sync-pokeapi-item-catalog.js
 *   node tools/sync-pokeapi-item-catalog.js --limit 50
 *   node tools/sync-pokeapi-item-catalog.js --dry-run
 *
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (or play-site/.env.local).
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.join(__dirname, "..");
const SPRITE_DIR = path.join(ROOT, "images", "items", "pokeapi");
const AUDIT_DIR = path.join(ROOT, "docs", "audits");
const INDEX_URL = "https://pokeapi.co/api/v2/item?limit=200";

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const limitArg = args.find((a) => a.startsWith("--limit="));
const LIMIT = limitArg
  ? Number(limitArg.split("=")[1])
  : (args.includes("--limit") ? Number(args[args.indexOf("--limit") + 1]) : 0);

function loadEnv() {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

function gameKey(pokeapiName) {
  return String(pokeapiName || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function downloadSprite(url, dest) {
  if (!url) return { ok: false };
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
    const buf = fs.readFileSync(dest);
    return { ok: true, checksum: crypto.createHash("sha256").update(buf).digest("hex"), bytes: buf.length, cached: true };
  }
  const res = await fetch(url);
  if (!res.ok) return { ok: false };
  const buf = Buffer.from(await res.arrayBuffer());
  if (!buf.length) return { ok: false };
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (!DRY) fs.writeFileSync(dest, buf);
  return { ok: true, checksum: crypto.createHash("sha256").update(buf).digest("hex"), bytes: buf.length };
}

function restClient() {
  const url = (process.env.SUPABASE_URL || process.env.PLAY_SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.PLAY_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json"
  };
  return {
    async selectSlugs() {
      const out = new Set();
      let from = 0;
      const page = 1000;
      for (;;) {
        const res = await fetch(`${url}/rest/v1/item_catalog?select=slug&offset=${from}&limit=${page}`, { headers });
        if (!res.ok) throw new Error(`select item_catalog: ${res.status} ${await res.text()}`);
        const rows = await res.json();
        rows.forEach((r) => out.add(r.slug));
        if (rows.length < page) break;
        from += page;
      }
      return out;
    },
    async upsertCatalog(row) {
      const res = await fetch(`${url}/rest/v1/item_catalog?on_conflict=slug`, {
        method: "POST",
        headers: { ...headers, Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(row)
      });
      if (!res.ok) throw new Error(`upsert catalog ${row.slug}: ${res.status} ${await res.text()}`);
    },
    async ensurePolicy(slug) {
      // Insert-only defaults — never overwrite gameplay flags.
      const res = await fetch(`${url}/rest/v1/item_policy?on_conflict=item_slug`, {
        method: "POST",
        headers: { ...headers, Prefer: "resolution=ignore-duplicates,return=minimal" },
        body: JSON.stringify({
          item_slug: slug,
          inventory_enabled: false,
          obtainable: false,
          usable: false,
          mart_buy_enabled: false,
          mart_sell_enabled: false,
          research_reward_enabled: false,
          admin_grant_enabled: false,
          bits_enabled: false
        })
      });
      if (!res.ok) throw new Error(`ensure policy ${slug}: ${res.status} ${await res.text()}`);
    },
    async upsertPrices(rows) {
      if (!rows.length) return;
      const res = await fetch(`${url}/rest/v1/item_prices?on_conflict=item_slug,version_group,currency`, {
        method: "POST",
        headers: { ...headers, Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(rows)
      });
      if (!res.ok) throw new Error(`upsert prices: ${res.status} ${await res.text()}`);
    }
  };
}

async function fetchAllItems() {
  const results = [];
  let url = INDEX_URL;
  while (url) {
    const page = await fetchJson(url);
    results.push(...(page.results || []));
    url = page.next || null;
    if (LIMIT > 0 && results.length >= LIMIT) break;
  }
  return LIMIT > 0 ? results.slice(0, LIMIT) : results;
}

async function main() {
  loadEnv();
  fs.mkdirSync(SPRITE_DIR, { recursive: true });
  fs.mkdirSync(AUDIT_DIR, { recursive: true });

  const report = {
    startedAt: new Date().toISOString(),
    totalItems: 0,
    fetched: 0,
    upserted: 0,
    uniqueSlugs: 0,
    spritesOk: 0,
    spritesDownloaded: 0,
    spritesReused: 0,
    spritesMissing: 0,
    localSpriteFiles: 0,
    aliasesSkipped: [],
    newSlugs: [],
    changed: [],
    unchanged: 0,
    categories: new Set(),
    pockets: new Set(),
    valuableCandidates: [],
    errors: []
  };
  const seenSlugs = new Map(); // slug -> first pokeapi id

  console.log("Fetching PokéAPI item index…");
  const list = await fetchAllItems();
  report.totalItems = list.length;
  console.log(`Processing ${list.length} items`);

  let sb = null;
  if (!DRY) {
    try {
      sb = restClient();
      console.log("PostgREST client ready");
    } catch (err) {
      console.warn("Supabase client unavailable — writing audit only:", err.message);
    }
  }

  const csvRows = [["slug", "pokeapi_id", "name", "category", "sprite_available", "game_key"]];
  const existing = sb ? await sb.selectSlugs() : new Set();

  for (let i = 0; i < list.length; i += 1) {
    const entry = list[i];
    try {
      const item = await fetchJson(entry.url);
      report.fetched += 1;
      const pokeapiName = item.name;
      const slug = gameKey(pokeapiName);
      if (seenSlugs.has(slug)) {
        const primaryId = seenSlugs.get(slug);
        report.aliasesSkipped.push({
          slug,
          pokeapiId: item.id,
          pokeapiName,
          primaryPokeapiId: primaryId,
          reason: "duplicate_canonical_key"
        });
        // Do not double-count sprites or upsert again for alias IDs.
        continue;
      }
      seenSlugs.set(slug, item.id);

      const display = (item.names || []).find((n) => n.language?.name === "en")?.name || pokeapiName;
      const category = item.category?.name || "";
      let pocketSlug = item.category?.pocket?.name || "";
      if (!pocketSlug && item.category?.url) {
        try {
          const cat = await fetchJson(item.category.url);
          pocketSlug = cat.pocket?.name || "";
        } catch (_) {}
      }
      report.categories.add(category);
      if (pocketSlug) report.pockets.add(pocketSlug);

      const effect = (item.effect_entries || []).find((e) => e.language?.name === "en")?.short_effect || "";
      const flavors = (item.flavor_text_entries || []).filter((f) => f.language?.name === "en");
      const flavor = (flavors[flavors.length - 1]?.text || "").replace(/\s+/g, " ").trim();
      const spriteUrl = item.sprites?.default || null;
      const localName = `${pokeapiName}.png`;
      const localPath = path.join(SPRITE_DIR, localName);
      const relPath = `images/items/pokeapi/${localName}`;
      let spriteAvailable = false;
      let checksum = null;
      if (spriteUrl) {
        const dl = await downloadSprite(spriteUrl, localPath);
        spriteAvailable = Boolean(dl.ok);
        checksum = dl.checksum || null;
        if (dl.ok) {
          report.spritesOk += 1;
          if (dl.cached) report.spritesReused += 1;
          else report.spritesDownloaded += 1;
        } else {
          report.spritesMissing += 1;
        }
      } else {
        report.spritesMissing += 1;
      }

      const prices = Array.isArray(item.prices) ? item.prices : [];
      // Fallback: classic cost field when prices[] absent
      if (!prices.length && item.cost != null) {
        prices.push({ version_group: { name: "legacy-cost" }, currency: "pokedollars", buy: item.cost, sell: Math.floor(Number(item.cost) / 2) });
      }
      const attrs = (item.attributes || []).map((a) => a.name);
      const heldBy = (item.held_by_pokemon || []).slice(0, 40).map((h) => h.pokemon?.name).filter(Boolean);
      const gen = item.game_indices?.[0]?.generation?.name?.replace("generation-", "") || null;
      const genNum = gen ? Number(String(gen).replace(/[^0-9]/g, "")) || null : null;

      if (/nugget|pearl|stardust|star-piece|comet|mushroom|rare-bone|relic|bottle-cap|pretty-wing/i.test(pokeapiName) || category === "loot") {
        report.valuableCandidates.push(slug);
      }

      const row = {
        slug,
        pokeapi_item_id: item.id,
        pokeapi_name: pokeapiName,
        display_name: display,
        category_slug: category || null,
        pocket_slug: pocketSlug || null,
        short_effect: effect || null,
        flavor_text: flavor || null,
        fling_power: item.fling_power ?? null,
        fling_effect: item.fling_effect?.name || null,
        attributes: attrs,
        held_by: heldBy,
        baby_trigger: Boolean(item.baby_trigger_for),
        generation_introduced: genNum,
        sprite_path: relPath,
        sprite_source_url: spriteUrl,
        sprite_available: spriteAvailable,
        sprite_checksum: checksum,
        source: "POKEAPI",
        source_url: entry.url,
        raw: {
          id: item.id,
          name: pokeapiName,
          category,
          pocket: pocketSlug,
          priceCount: prices.length
        },
        updated_at: new Date().toISOString()
      };

      csvRows.push([slug, item.id, display, category, spriteAvailable, slug]);

      if (!existing.has(slug)) report.newSlugs.push(slug);
      else report.changed.push(slug);

      if (sb && !DRY) {
        await sb.upsertCatalog(row);
        await sb.ensurePolicy(slug);
        const priceRows = prices.map((price) => {
          const vg = price.version_group?.name || price.version_group || "unknown";
          return {
            item_slug: slug,
            version_group: String(vg),
            currency: price.currency || "pokedollars",
            purchase_price: price.buy ?? price.purchase_price ?? null,
            sell_price: price.sell ?? price.sell_price ?? null,
            source: "pokeapi"
          };
        });
        await sb.upsertPrices(priceRows);
        report.upserted += 1;
      }

      if ((i + 1) % 25 === 0) {
        console.log(`… ${i + 1}/${list.length}`);
        await new Promise((r) => setTimeout(r, 120));
      }
    } catch (err) {
      report.errors.push({ name: entry.name, error: String(err.message || err) });
      console.warn("ERR", entry.name, err.message || err);
    }
  }

  report.uniqueSlugs = seenSlugs.size;
  report.unchanged = Math.max(0, report.upserted - report.newSlugs.length);
  try {
    report.localSpriteFiles = fs.readdirSync(SPRITE_DIR).filter((f) => f.endsWith(".png")).length;
  } catch (_) {
    report.localSpriteFiles = 0;
  }

  const finishedAt = new Date().toISOString();
  const aliasLines = report.aliasesSkipped.length
    ? report.aliasesSkipped
        .slice(0, 40)
        .map(
          (a) =>
            `- ${a.pokeapiName} (id ${a.pokeapiId}) → slug \`${a.slug}\` skipped; primary id ${a.primaryPokeapiId} (${a.reason})`
        )
        .join("\n")
    : "- none";
  const md = [
    "# PokéAPI item sync report",
    "",
    `- Started: ${report.startedAt}`,
    `- Finished: ${finishedAt}`,
    `- Dry run: ${DRY}`,
    `- Upstream processed: ${report.totalItems}`,
    `- Fetched: ${report.fetched}`,
    `- Unique canonical keys: ${report.uniqueSlugs}`,
    `- DB upserted: ${report.upserted}`,
    `- New slugs: ${report.newSlugs.length}`,
    `- Changed/seen existing: ${report.changed.length}`,
    `- Unchanged estimate: ${report.unchanged}`,
    `- Aliases/skipped: ${report.aliasesSkipped.length}`,
    `- Sprites ok (unique items): ${report.spritesOk}`,
    `- Sprites downloaded: ${report.spritesDownloaded}`,
    `- Sprites reused (local cache): ${report.spritesReused}`,
    `- Sprites missing: ${report.spritesMissing}`,
    `- Local sprite files: ${report.localSpriteFiles}`,
    `- Categories: ${[...report.categories].sort().join(", ")}`,
    `- Pockets: ${[...report.pockets].sort().join(", ")}`,
    `- Valuable candidates (heuristic): ${report.valuableCandidates.length}`,
    `- Errors: ${report.errors.length}`,
    "",
    "## Invariants",
    "",
    "- `upstream processed - unique keys = aliases/skipped` (PokéAPI may list duplicate names that collapse to one game key).",
    "- `sprites ok` counts unique catalog items with a usable sprite, not upstream index length.",
    "- `local sprite files` is the on-disk PNG count under `images/items/pokeapi/`.",
    "- Gameplay policy flags are never reset by this sync.",
    "- New items receive catalog-only defaults (all gameplay flags false).",
    "",
    "## Aliases / skipped duplicates",
    "",
    aliasLines,
    "",
    report.errors.length ? "## Errors\n\n" + report.errors.slice(0, 40).map((e) => `- ${e.name}: ${e.error}`).join("\n") : ""
  ].filter(Boolean).join("\n");

  fs.writeFileSync(path.join(AUDIT_DIR, "pokeapi-item-sync-report.md"), md);
  fs.writeFileSync(
    path.join(AUDIT_DIR, "pokeapi-item-catalog.csv"),
    csvRows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")
  );
  fs.writeFileSync(
    path.join(AUDIT_DIR, "pokeapi-item-sync-report.json"),
    JSON.stringify(
      {
        ...report,
        categories: [...report.categories],
        pockets: [...report.pockets],
        finishedAt
      },
      null,
      2
    )
  );
  console.log(md);
  console.log("Wrote docs/audits/pokeapi-item-sync-report.md, .json, and pokeapi-item-catalog.csv");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
