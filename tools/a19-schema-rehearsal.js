/* Isolated A19-SCHEMA PostgreSQL rehearsal (issue #23).
 * Disposable LOCAL cluster only. Synthetic trainers only.
 * Does not read SUPABASE_URL / DATABASE_URL. Does not touch live catches.
 * Does not start GENVAL, WIRE, or any reset.
 */
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

const ROOT = path.join(__dirname, "..");
const CACHE = path.join(__dirname, ".cache", "a23-pg-harness");
const SCHEMA = path.join(ROOT, "supabase", "unapplied", "a19-schema");
const SEED = path.join(SCHEMA, "seed");
const HOST = "127.0.0.1";
const PORT = 55432;
const USER = "postgres";
const PASSWORD = "a19-rehearsal-local-only";
const DB_MAIN = "a19_rehearsal";
const DB_CLONE = "a19_rollback_clone";
const CONTENT_BUILD = "sl-ref-20261013-227b573";
const EXPECTED = {
  natures: 25,
  species: 151,
  forms: 236,
  abilities: 135,
  formAbilities: 576,
  moves: 556,
  learnsets: 14048,
  evolutions: 88,
  obtain: 236,
  formPolicies: 16
};
const SYN_BULB = "11111111-1111-1111-1111-111111111111";
const SYN_PIKA = "22222222-2222-2222-2222-222222222222";
const BANNED = /supabase\.co|dtflmlbjhttoewqgkujf|pooler\.supabase|supabase\.in/i;

const results = [];
function record(name, passed, detail) {
  results.push({ name, passed, detail: detail || "" });
  console.log(`${passed ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}
function assert(cond, detail) {
  if (!cond) throw new Error(detail || "failed");
}

function refuseHosted() {
  const envHits = ["SUPABASE_URL", "DATABASE_URL", "SUPABASE_DB_URL", "POSTGRES_URL"]
    .map((key) => process.env[key])
    .filter(Boolean);
  envHits.forEach((value) => {
    if (BANNED.test(value)) {
      throw new Error("refusing hosted Supabase / live DATABASE_URL");
    }
  });
  if (!["127.0.0.1", "localhost", "::1"].includes(HOST)) {
    throw new Error("host must be loopback");
  }
  if (BANNED.test(HOST) || BANNED.test(DB_MAIN)) {
    throw new Error("refusing banned target name");
  }
}

function splitSql(sql) {
  const stmts = [];
  let i = 0;
  let buf = "";
  const n = sql.length;
  while (i < n) {
    if (sql[i] === "-" && sql[i + 1] === "-") {
      while (i < n && sql[i] !== "\n") i += 1;
      continue;
    }
    if (sql[i] === "/" && sql[i + 1] === "*") {
      i += 2;
      while (i < n && !(sql[i] === "*" && sql[i + 1] === "/")) i += 1;
      i += 2;
      continue;
    }
    if (sql[i] === "$") {
      const m = sql.slice(i).match(/^\$[A-Za-z0-9_]*\$/);
      if (m) {
        const tag = m[0];
        const end = sql.indexOf(tag, i + tag.length);
        if (end < 0) throw new Error("unclosed dollar quote");
        buf += sql.slice(i, end + tag.length);
        i = end + tag.length;
        continue;
      }
    }
    if (sql[i] === "'") {
      buf += sql[i];
      i += 1;
      while (i < n) {
        if (sql[i] === "'" && sql[i + 1] === "'") {
          buf += "''";
          i += 2;
          continue;
        }
        buf += sql[i];
        if (sql[i] === "'") {
          i += 1;
          break;
        }
        i += 1;
      }
      continue;
    }
    if (sql[i] === ";") {
      const trimmed = buf.trim();
      if (trimmed) stmts.push(trimmed);
      buf = "";
      i += 1;
      continue;
    }
    buf += sql[i];
    i += 1;
  }
  const tail = buf.trim();
  if (tail) stmts.push(tail);
  return stmts;
}

async function applyFile(client, rel) {
  const full = path.isAbsolute(rel) ? rel : path.join(SCHEMA, rel);
  const sql = fs.readFileSync(full, "utf8");
  const stmts = splitSql(sql);
  for (const stmt of stmts) {
    await client.query(stmt);
  }
  return stmts.length;
}

async function expectFail(client, sql, label) {
  try {
    await client.query(sql);
    throw new Error(`${label}: expected constraint/permission failure`);
  } catch (error) {
    if (/expected constraint/.test(error.message)) throw error;
    return error.code || error.message;
  }
}

async function countBuild(client, table) {
  const { rows } = await client.query(
    `SELECT count(*)::int AS n FROM private.${table} WHERE content_build = $1`,
    [CONTENT_BUILD]
  );
  return rows[0].n;
}

async function main() {
  refuseHosted();
  console.log(
    `REHEARSAL TARGET: ${HOST}:${PORT}/${DB_MAIN} (embedded local; NOT supabase; NOT dtflmlbjhttoewqgkujf)`
  );

  const embedPath = path.join(CACHE, "node_modules", "embedded-postgres", "dist", "index.js");
  if (!fs.existsSync(embedPath)) {
    throw new Error("embedded-postgres missing under tools/.cache/a23-pg-harness (gitignored local install)");
  }
  const EmbeddedPostgres = (await import(pathToFileURL(embedPath).href)).default;
  const dataDir = path.join(CACHE, "data");
  fs.rmSync(dataDir, { recursive: true, force: true });

  const cluster = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: USER,
    password: PASSWORD,
    port: PORT,
    persistent: false,
    postgresFlags: ["-c", "listen_addresses=127.0.0.1"],
    onLog: (msg) => {
      const text = String(msg);
      if (/ERROR|FATAL|PANIC/i.test(text)) console.error("[pg]", text.trim());
    }
  });

  let admin;
  let client;
  let clone;
  try {
    await cluster.initialise();
    await cluster.start();
    await cluster.createDatabase(DB_MAIN);

    admin = cluster.getPgClient("postgres", HOST);
    await admin.connect();
    const { rows: targetRows } = await admin.query("SELECT current_database() AS db, inet_server_addr()::text AS addr");
    assert(targetRows[0].db !== "dtflmlbjhttoewqgkujf", "refused live project db name");
    assert(!BANNED.test(String(targetRows[0].addr || "")), "server address looks hosted");
    record("isolation target is loopback embedded Postgres", true, `${HOST}:${PORT}/${DB_MAIN}`);

    client = cluster.getPgClient(DB_MAIN, HOST);
    await client.connect();
    await client.query("SET statement_timeout = '180s'");

    await applyFile(client, path.join(SCHEMA, "rehearsal", "000_synthetic_baseline.sql"));
    const { rows: pre } = await client.query(
      `SELECT id, dex, iv_hp, friendship, moves, height_m, weight_kg
       FROM public.catches ORDER BY dex`
    );
    assert(pre.length === 2, `expected 2 synthetic catches, got ${pre.length}`);
    assert(pre[0].id === SYN_BULB && pre[0].iv_hp === 10 && pre[0].friendship === 70);
    assert(Array.isArray(pre[0].moves) && pre[0].moves.includes("vine-whip"));
    const { rows: lgpePre } = await client.query("SELECT count(*)::int AS n FROM public.lgpe_species");
    assert(lgpePre[0].n === 2, "synthetic lgpe_species");
    record("synthetic baseline (Oak/Leaf stand-ins, not Sora/Twinkle)", true, "2 catches + 2 lgpe_species");

    await applyFile(client, "001_private_ref_tables.sql");
    const { rows: tables } = await client.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'private' AND table_name LIKE 'ref_%' ORDER BY 1`
    );
    assert(tables.length === 11, `expected 11 ref_* tables, got ${tables.length}`);
    record("001 private.ref_* created", true, tables.map((r) => r.table_name).join(","));

    const seedFiles = [
      "00_meta.sql", "01_natures.sql", "02_species.sql", "03_forms.sql",
      "04_abilities.sql", "05_form_abilities.sql", "06_moves.sql",
      "07_learnsets.sql", "08_evolutions.sql", "09_obtain.sql", "10_form_policies.sql"
    ];
    for (const name of seedFiles) {
      await applyFile(client, path.join(SEED, name));
    }

    const counts = {
      natures: await countBuild(client, "ref_natures"),
      species: await countBuild(client, "ref_species"),
      forms: await countBuild(client, "ref_forms"),
      abilities: await countBuild(client, "ref_abilities"),
      formAbilities: await countBuild(client, "ref_form_abilities"),
      moves: await countBuild(client, "ref_moves"),
      learnsets: await countBuild(client, "ref_learnsets"),
      evolutions: await countBuild(client, "ref_evolutions"),
      obtain: await countBuild(client, "ref_obtain"),
      formPolicies: await countBuild(client, "ref_form_policies")
    };
    Object.keys(EXPECTED).forEach((key) => {
      assert(counts[key] === EXPECTED[key], `${key}: ${counts[key]} !== ${EXPECTED[key]}`);
    });
    record("seed counts match manifest", true, JSON.stringify(counts));

    const { rows: bulb } = await client.query(
      `SELECT pokeapi_base_friendship, streamlink_base_friendship
       FROM private.ref_species WHERE dex = 1 AND content_build = $1`,
      [CONTENT_BUILD]
    );
    const { rows: clef } = await client.query(
      `SELECT pokeapi_base_friendship, streamlink_base_friendship
       FROM private.ref_species WHERE slug = 'clefable' AND content_build = $1`,
      [CONTENT_BUILD]
    );
    assert(bulb[0].pokeapi_base_friendship === 70 && bulb[0].streamlink_base_friendship === 50);
    assert(clef[0].pokeapi_base_friendship === 140 && clef[0].streamlink_base_friendship === 140);
    record("F1 dual friendship (70→50 derived, 140 stays)", true);

    const { rows: policies } = await client.query(
      `SELECT form_id, policy_id, persist_as, wild_allowed, grant_allowed
       FROM private.ref_form_policies WHERE content_build = $1 ORDER BY form_id`,
      [CONTENT_BUILD]
    );
    assert(policies.length === 16);
    assert(policies.filter((p) => p.policy_id === "G1").length === 12);
    assert(policies.filter((p) => p.policy_id === "C1").length === 4);
    assert(policies.every((p) => p.persist_as === "base" && p.wild_allowed === false && p.grant_allowed === false));
    record("G1/C1 16 policies fail-closed wild/grant", true);

    await applyFile(client, "002_catches_nullable_extensions.sql");
    const { rows: extCols } = await client.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'catches'
         AND column_name IN (
           'nature_id','ability_id','ability_slot','ev_hp','ev_atk','ev_def','ev_spa','ev_spd','ev_spe',
           'move_slots','ruleset_id','content_build','hp_current','hp_max','status','held_item','gigantamax_factor'
         )`
    );
    assert(extCols.length === 17, `expected 17 extension columns, got ${extCols.length}`);
    record("002 catch extensions added", true, "17 nullable columns");

    const { rows: legacy } = await client.query(
      `SELECT iv_hp, iv_spe, friendship, moves, nature_id, ability_id, ev_hp, move_slots,
              ruleset_id, content_build, gigantamax_factor
       FROM public.catches WHERE id = $1`,
      [SYN_BULB]
    );
    assert(legacy[0].iv_hp === 10 && legacy[0].iv_spe === 15 && legacy[0].friendship === 70);
    assert(legacy[0].moves.includes("vine-whip"));
    assert(legacy[0].nature_id === null && legacy[0].ability_id === null && legacy[0].ev_hp === null);
    assert(legacy[0].move_slots === null && legacy[0].content_build === null && legacy[0].gigantamax_factor === null);
    const { rows: lgpeMid } = await client.query("SELECT count(*)::int AS n FROM public.lgpe_species");
    assert(lgpeMid[0].n === 2);
    record("legacy synthetic catches keep IVs/moves/friendship; new cols NULL", true);

    await expectFail(
      client,
      `INSERT INTO private.ref_meta (content_build, ruleset_id, pokeapi_commit, built_at, source_kind)
       VALUES ('bad-kind', 'x', 'x', now(), 'applied-to-live')`,
      "source_kind"
    );
    await expectFail(
      client,
      `INSERT INTO private.ref_species (content_build, dex, slug, gender_rate, pokeapi_base_friendship, streamlink_base_friendship, mapping_status)
       VALUES ('${CONTENT_BUILD}', 999, 'too-friendly', 4, 70, 256, 'ok')`,
      "friendship"
    );
    await expectFail(
      client,
      `INSERT INTO private.ref_natures (content_build, id, slug, name, up_stat, down_stat)
       VALUES ('${CONTENT_BUILD}', 99, 'hardy', 'Dup', NULL, NULL)`,
      "unique nature slug"
    );
    await expectFail(
      client,
      `INSERT INTO private.ref_form_policies (content_build, form_id, policy_id, persist_as, wild_allowed, grant_allowed)
       VALUES ('${CONTENT_BUILD}', 1, 'G1', 'wild-form', false, false)`,
      "persist_as"
    );
    await expectFail(
      client,
      `INSERT INTO private.ref_learnsets (content_build, form_id, version_group, method, level, move_id, sort_order)
       VALUES ('${CONTENT_BUILD}', 1, 'scarlet-violet', 'level-up', 99, 999999, 0)`,
      "learnset FK"
    );
    await expectFail(client, `UPDATE public.catches SET nature_id = 99 WHERE id = '${SYN_BULB}'`, "nature range");
    await expectFail(client, `UPDATE public.catches SET ability_slot = '3' WHERE id = '${SYN_BULB}'`, "ability slot");
    await expectFail(client, `UPDATE public.catches SET ev_hp = 300 WHERE id = '${SYN_PIKA}'`, "ev range");
    await expectFail(
      client,
      `UPDATE public.catches SET ev_hp=100, ev_atk=100, ev_def=100, ev_spa=100, ev_spd=100, ev_spe=100 WHERE id = '${SYN_PIKA}'`,
      "ev total"
    );
    await expectFail(
      client,
      `UPDATE public.catches SET move_slots = '[1,2,3,4,5]'::jsonb WHERE id = '${SYN_BULB}'`,
      "move_slots length"
    );
    await expectFail(
      client,
      `UPDATE public.catches SET hp_max = 10, hp_current = 11 WHERE id = '${SYN_BULB}'`,
      "hp check"
    );
    record("CHECK / UNIQUE / FK fail-closed", true, "source_kind, friendship, slug, persist_as, learnset FK, catch CHECKs");

    const { rows: idx } = await client.query(
      `SELECT indexname FROM pg_indexes WHERE schemaname = 'private' AND indexname LIKE 'ref_%' ORDER BY 1`
    );
    const needed = [
      "ref_forms_dex_idx",
      "ref_learnsets_form_vg_idx",
      "ref_form_abilities_form_idx",
      "ref_obtain_channel_idx",
      "ref_evolutions_from_idx"
    ];
    needed.forEach((name) => assert(idx.some((r) => r.indexname === name), name));
    record("reference indexes present", true, needed.join(","));

    const { rows: rls } = await client.query(
      `SELECT c.relname, c.relrowsecurity
       FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'private' AND c.relname LIKE 'ref_%' AND c.relkind = 'r'`
    );
    assert(rls.length === 11 && rls.every((r) => r.relrowsecurity === true));
    record("RLS enabled on all private.ref_* tables", true, "Postgres RLS; not PostgREST schema exposure");

    await client.query("GRANT USAGE ON SCHEMA private TO anon");
    await client.query("SET ROLE anon");
    const revokeCode = await expectFail(client, "SELECT count(*) FROM private.ref_meta", "anon revoke");
    await client.query("RESET ROLE");
    assert(/42501|permission denied/i.test(String(revokeCode)), `expected 42501, got ${revokeCode}`);
    record("REVOKE blocks anon SELECT (permission denied)", true, String(revokeCode));

    await client.query("GRANT SELECT ON private.ref_meta TO anon");
    await client.query("SET ROLE anon");
    const { rows: rlsRows } = await client.query("SELECT count(*)::int AS n FROM private.ref_meta");
    await client.query("RESET ROLE");
    assert(rlsRows[0].n === 0, `RLS should hide rows from anon after GRANT SELECT, got ${rlsRows[0].n}`);
    await client.query("REVOKE SELECT ON private.ref_meta FROM anon");
    await client.query("REVOKE USAGE ON SCHEMA private FROM anon");
    record("RLS hides rows from anon after test-only GRANT SELECT", true, "0 rows; Postgres RLS distinct from REVOKE");

    await applyFile(client, "001_private_ref_tables.sql");
    for (const name of seedFiles) {
      await applyFile(client, path.join(SEED, name));
    }
    await applyFile(client, "002_catches_nullable_extensions.sql");
    const counts2 = {
      natures: await countBuild(client, "ref_natures"),
      learnsets: await countBuild(client, "ref_learnsets"),
      formPolicies: await countBuild(client, "ref_form_policies")
    };
    assert(counts2.natures === 25 && counts2.learnsets === 14048 && counts2.formPolicies === 16);
    const { rows: legacy2 } = await client.query(
      `SELECT iv_hp, friendship, nature_id FROM public.catches WHERE id = $1`,
      [SYN_BULB]
    );
    assert(legacy2[0].iv_hp === 10 && legacy2[0].friendship === 70 && legacy2[0].nature_id === null);
    record("idempotent re-apply of 001 + seed + 002", true);

    await client.end();
    client = null;
    await admin.query(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity
       WHERE datname = $1 AND pid <> pg_backend_pid()`,
      [DB_MAIN]
    );
    await admin.query(`CREATE DATABASE ${DB_CLONE} TEMPLATE ${DB_MAIN}`);
    record("rollback clone created from TEMPLATE", true, DB_CLONE);

    clone = cluster.getPgClient(DB_CLONE, HOST);
    await clone.connect();
    await applyFile(clone, "003_rollback.sql");
    const { rows: gone } = await clone.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'private' AND table_name LIKE 'ref_%'`
    );
    assert(gone.length === 0, `ref_* still present after rollback: ${gone.map((r) => r.table_name)}`);
    const { rows: droppedCols } = await clone.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'catches' AND column_name = 'nature_id'`
    );
    assert(droppedCols.length === 0, "nature_id should be gone after rollback");
    const { rows: afterRb } = await clone.query(
      `SELECT iv_hp, friendship, moves FROM public.catches WHERE id = $1`,
      [SYN_BULB]
    );
    assert(afterRb[0].iv_hp === 10 && afterRb[0].friendship === 70 && afterRb[0].moves.includes("vine-whip"));
    const { rows: lgpeRb } = await clone.query("SELECT count(*)::int AS n FROM public.lgpe_species");
    assert(lgpeRb[0].n === 2);
    record("003 rollback drops ref_* + extensions; keeps legacy catches and lgpe_species", true);

    const mainStill = cluster.getPgClient(DB_MAIN, HOST);
    await mainStill.connect();
    const { rows: mainKeep } = await mainStill.query(
      `SELECT count(*)::int AS n FROM private.ref_learnsets WHERE content_build = $1`,
      [CONTENT_BUILD]
    );
    assert(mainKeep[0].n === 14048, "primary rehearsal DB must survive clone rollback");
    await mainStill.end();
    record("primary rehearsal DB unchanged after clone rollback", true);

    const failed = results.filter((row) => !row.passed);
    console.log(`\n${results.filter((r) => r.passed).length}/${results.length} REAL SQL checks passed`);
    if (failed.length) {
      process.exitCode = 1;
    }
    return { passed: failed.length === 0, results, counts, target: `${HOST}:${PORT}/${DB_MAIN}` };
  } finally {
    try { if (clone) await clone.end(); } catch (_) { /* ignore */ }
    try { if (client) await client.end(); } catch (_) { /* ignore */ }
    try { if (admin) await admin.end(); } catch (_) { /* ignore */ }
    try { await cluster.stop(); } catch (_) { /* ignore */ }
    try { fs.rmSync(path.join(CACHE, "data"), { recursive: true, force: true }); } catch (_) { /* ignore */ }
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("REHEARSAL FAILED:", error.message);
    process.exit(1);
  });
}

module.exports = { refuseHosted, splitSql, BANNED, HOST, PORT, DB_MAIN, EXPECTED };
