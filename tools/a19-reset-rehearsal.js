/* Isolated A19-RESET local rehearsal (issues #25 / #18, D45).
 * Disposable LOCAL cluster only. Synthetic accounts and catches only.
 * Does not read SUPABASE_URL / DATABASE_URL. Does not touch live catches.
 * Production A19-RESET-GO remains unapproved.
 */
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const { refuseHosted, splitSql, BANNED } = require("./a19-schema-rehearsal.js");

const ROOT = path.join(__dirname, "..");
const CACHE23 = path.join(__dirname, ".cache", "a23-pg-harness");
const CACHE25 = path.join(__dirname, ".cache", "a25-pg-harness");
const CACHE = path.join(__dirname, ".cache", "a45-reset-pg-harness");
const RESET = path.join(ROOT, "supabase", "unapplied", "a19-reset");
const HOST = "127.0.0.1";
const PORT = 55435;
const USER = "postgres";
const PASSWORD = "a19-reset-local-only";
const DB_MAIN = "a19_reset";
const PROT_A = "ccccccc1-cccc-cccc-cccc-ccccccccccc1";
const PROT_B = "ccccccc2-cccc-cccc-cccc-ccccccccccc2";
const OAK = "ddddddd1-dddd-dddd-dddd-ddddddddddd1";
const LEAF = "ddddddd2-dddd-dddd-dddd-ddddddddddd2";
const PROT_CATCH = "aaaa0000-0000-0000-0000-000000000001";
const DISP_CATCH = "bbbb0000-0000-0000-0000-000000000001";

const results = [];
function record(name, passed, detail) {
  results.push({ name, passed, detail: detail || "" });
  console.log(`${passed ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}
function assert(cond, detail) {
  if (!cond) throw new Error(detail || "failed");
}

async function applyFile(client, full) {
  const sql = fs.readFileSync(full, "utf8");
  const stmts = splitSql(sql);
  for (const stmt of stmts) {
    await client.query(stmt);
  }
  return stmts.length;
}

function embedModule() {
  const candidates = [
    path.join(CACHE, "node_modules", "embedded-postgres", "dist", "index.js"),
    path.join(CACHE25, "node_modules", "embedded-postgres", "dist", "index.js"),
    path.join(CACHE23, "node_modules", "embedded-postgres", "dist", "index.js")
  ];
  const found = candidates.find((rel) => fs.existsSync(rel));
  if (!found) {
    throw new Error("embedded-postgres missing under tools/.cache (run schema rehearsal install first)");
  }
  return found;
}

async function counts(client) {
  const { rows } = await client.query(
    `SELECT
       (SELECT count(*)::int FROM public.catches) AS catches,
       (SELECT count(*)::int FROM public.catches WHERE user_id IN ($1,$2)) AS protected_catches,
       (SELECT count(*)::int FROM public.catches WHERE user_id IN ($3,$4)) AS disposable_catches,
       (SELECT count(*)::int FROM public.species_seen) AS seen,
       (SELECT poke_coins FROM public.trainer_inventory WHERE user_id = $3) AS oak_coins,
       (SELECT poke_coins FROM public.trainer_inventory WHERE user_id = $1) AS prot_coins,
       (SELECT count(*)::int FROM public.profiles) AS profiles`,
    [PROT_A, PROT_B, OAK, LEAF]
  );
  return rows[0];
}

async function main() {
  refuseHosted();
  console.log(`RESET REHEARSAL TARGET: ${HOST}:${PORT}/${DB_MAIN} (embedded local; NOT supabase)`);

  const EmbeddedPostgres = (await import(pathToFileURL(embedModule()).href)).default;
  const dataDir = path.join(CACHE, "data");
  fs.mkdirSync(CACHE, { recursive: true });
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
    await applyFile(client, path.join(RESET, "local", "000_synthetic_reset_world.sql"));
    const before = await counts(client);
    assert(before.catches === 110, `catches ${before.catches}`);
    assert(before.protected_catches === 98 && before.disposable_catches === 12, JSON.stringify(before));
    assert(before.oak_coins === 777 && before.prot_coins === 999);
    record("synthetic 98 protected / 12 disposable loaded", true, JSON.stringify(before));

    let refused = false;
    try {
      await applyFile(client, path.join(RESET, "001_ra_pokemon_progression.sql"));
    } catch (error) {
      refused = /A19-RESET refused/i.test(String(error.message || error));
      try { await client.query("ROLLBACK"); } catch (_) { /* ignore */ }
    }
    assert(refused, "GUC-less apply must fail closed");
    const afterRefuse = await counts(client);
    assert(afterRefuse.catches === 110, "GUC-less apply mutated catches");
    record("script fails closed without starlight.reset_confirm", true);

    await client.query("SELECT set_config('starlight.reset_confirm', 'A19-RESET-GO', false)");
    await applyFile(client, path.join(RESET, "001_ra_pokemon_progression.sql"));
    const after = await counts(client);
    assert(after.catches === 98, `remaining ${after.catches}`);
    assert(after.protected_catches === 98 && after.disposable_catches === 0);
    assert(after.profiles === 4, "profiles must survive");
    assert(after.seen === 2, "species_seen must survive");
    assert(after.oak_coins === 777 && after.prot_coins === 999, "economy must survive");
    record("RESET-TEST deletes 12 disposable catches and keeps 98 protected", true);

    const { rows: prot } = await client.query(
      `SELECT id, team_ids, showcase FROM public.profiles WHERE id IN ($1,$2) ORDER BY twitch_login`,
      [PROT_A, PROT_B]
    );
    const sora = prot.find((row) => row.id === PROT_A);
    assert(sora.team_ids.length === 1 && sora.team_ids[0] === PROT_CATCH, JSON.stringify(sora.team_ids));
    assert(sora.showcase.achievementId === "syn-ach-keep", JSON.stringify(sora.showcase));
    assert(sora.showcase.shinyCatchId === PROT_CATCH, "protected showcase pointing at kept catch must remain");
    record("protected team/showcase kept except leaked reset ids", true, JSON.stringify(sora));

    const { rows: oak } = await client.query(
      `SELECT team_ids, pc_layout, showcase FROM public.profiles WHERE id = $1`,
      [OAK]
    );
    assert(Array.isArray(oak[0].team_ids) && oak[0].team_ids.length === 0, JSON.stringify(oak[0].team_ids));
    assert(JSON.stringify(oak[0].pc_layout) === "{}", JSON.stringify(oak[0].pc_layout));
    assert(oak[0].showcase.achievementId === "syn-ach-oak", JSON.stringify(oak[0].showcase));
    assert(oak[0].showcase.shinyCatchId === undefined, "stale disposable shinyCatchId must be stripped");
    record("disposable showcase.shinyCatchId stripped; achievementId kept", true);

    const { rows: leftover } = await client.query(
      `SELECT count(*)::int AS n FROM public.catches WHERE id = $1`,
      [DISP_CATCH]
    );
    assert(leftover[0].n === 0);
    const { rows: protKept } = await client.query(
      `SELECT count(*)::int AS n FROM public.catches WHERE id = $1`,
      [PROT_CATCH]
    );
    assert(protKept[0].n === 1);
    const { rows: ledger } = await client.query(
      `SELECT related_catch IS NULL AS cleared FROM public.candy_ledger WHERE amount = 3`
    );
    assert(ledger[0].cleared === true);
    const { rows: tickets } = await client.query(
      `SELECT count(*)::int AS n FROM private.streamlink_hidden_tickets`
    );
    assert(tickets[0].n === 0);
    record("protected/non-protected separation and soft-ref cleanup hold", true);

    const failed = results.filter((row) => !row.passed);
    if (failed.length) {
      throw new Error(`${failed.length} recorded failures`);
    }
    console.log(`\nREAL SQL ${results.length}/${results.length} PASS on ${HOST}:${PORT}/${DB_MAIN}`);
  } finally {
    try { if (client) await client.end(); } catch (_) { /* ignore */ }
    try { if (admin) await admin.end(); } catch (_) { /* ignore */ }
    try { await cluster.stop(); } catch (_) { /* ignore */ }
  }
}

module.exports = { HOST, PORT, DB_MAIN, BANNED, refuseHosted };

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
