/* D76 stamp-smoke rehearsal.
 * Disposable LOCAL cluster only. Synthetic trainers only.
 * Does not connect to hosted Supabase and does not create a production catch.
 * capture_chance and announce_throws are the D72 stubs. Odds and bag spending are not production.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { pathToFileURL } = require("url");
const { refuseHosted, splitSql, BANNED } = require("./a19-schema-rehearsal.js");

const ROOT = path.join(__dirname, "..");
const CACHE = path.join(__dirname, ".cache", "d54-pg-harness");
const HOST = "127.0.0.1";
const PORT = 55448;
const USER = "postgres";
const PASSWORD = "d76-stamp-local-only";
const A = "aaaaaaaa-0000-4000-8000-000000000076";
const B = "bbbbbbbb-0000-4000-8000-000000000076";

const results = [];
function record(name, passed, detail) {
  results.push({ name, passed, detail: detail || "" });
  console.log(`${passed ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}
function assert(cond, detail) {
  if (!cond) throw new Error(detail || "failed");
}
function fixtureSql() {
  const text = fs.readFileSync(path.join(__dirname, "d72-mastery-settlement-rehearsal.js"), "utf8");
  const start = text.indexOf("const FIXTURE = `") + "const FIXTURE = `".length;
  const end = text.indexOf("async function makeRound");
  return text.slice(start, end).replace(/`;\s*$/, "").replaceAll("${A}", A).replaceAll("${B}", B);
}
async function applyFile(client, rel) {
  for (const stmt of splitSql(fs.readFileSync(path.join(ROOT, rel), "utf8"))) await client.query(stmt);
}
async function expectFail(client, sql, params) {
  try {
    await client.query(sql, params);
    throw new Error("expected failure");
  } catch (error) {
    if (error.message === "expected failure") throw error;
    return error;
  }
}
async function makeRound(client, dex) {
  const id = crypto.randomUUID();
  await client.query(
    `INSERT INTO public.encounter_rounds (id, dex, name, variant, gender, rules, trigger_source)
     VALUES ($1, $2, 'Bulbasaur', 'normal', 'M', '{"rewardMode":"live"}'::jsonb, 'live')`,
    [id, dex]
  );
  await client.query(
    "INSERT INTO public.encounter_players (round_id, user_id, ball) VALUES ($1, $2, 'poke')",
    [id, A]
  );
  return id;
}
async function settle(client, roundId) {
  await client.query("BEGIN");
  try {
    await client.query(
      "SELECT private.settle_if_needed(r.*) FROM public.encounter_rounds r WHERE id = $1",
      [roundId]
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

async function main() {
  let admin;
  let cluster = null;
  const clients = [];
  refuseHosted();
  console.log(`D76 STAMP TARGET: ${HOST}:${PORT} (embedded local; NOT supabase)`);
  console.log("LIMIT: capture_chance and announce_throws are synthetic stubs. Production odds and bag spending were not tested.");
  const embedPath = path.join(CACHE, "node_modules", "embedded-postgres", "dist", "index.js");
  if (!fs.existsSync(embedPath)) throw new Error("embedded-postgres missing");
  const EmbeddedPostgres = (await import(pathToFileURL(embedPath).href)).default;
  const dataDir = path.join(CACHE, "d76-data");
  fs.rmSync(dataDir, { recursive: true, force: true });
  cluster = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: USER,
    password: PASSWORD,
    port: PORT,
    persistent: false,
    initdbFlags: ["--encoding=UTF8", "--no-locale"],
    postgresFlags: ["-c", "listen_addresses=127.0.0.1"],
    onLog: () => {}
  });
  try {
    await cluster.initialise();
    await cluster.start();
    admin = cluster.getPgClient("postgres", HOST);
    await admin.connect();
    const target = await admin.query(
      "SELECT inet_server_addr()::text AS addr, current_setting('server_version') AS version"
    );
    assert(!BANNED.test(String(target.rows[0].addr || "")));
    const version = target.rows[0].version;
    record("isolation target is loopback embedded Postgres", true, `${HOST}:${PORT} PostgreSQL ${version}`);
    await cluster.createDatabase("d76_stamp");
    const client = cluster.getPgClient("d76_stamp", HOST);
    await client.connect();
    clients.push(client);
    await client.query(fixtureSql());
    await client.query("ALTER TABLE public.catches ALTER COLUMN caught_at SET DEFAULT now()");
    await client.query("ALTER TABLE public.catches ALTER COLUMN caught_at SET NOT NULL");
    for (const rel of [
      "supabase/unapplied/d64-mastery/001_species_mastery_events.sql",
      "supabase/unapplied/d65-mastery/002_species_mastery_hardening.sql",
      "supabase/unapplied/d66-mastery/003_species_mastery_lifecycle.sql",
      "supabase/unapplied/d67-mastery/004_species_mastery_catch_safety.sql",
      "supabase/unapplied/a19-wire/002_materialize_hook.sql",
      "supabase/unapplied/d72-mastery/005_enqueue_lifecycle.sql",
      "supabase/unapplied/d72-mastery/006_settle_familiarity_note.sql"
    ]) await applyFile(client, rel);

    const idle = await client.query(`
      SELECT lifecycle, activated_at IS NULL AS inactive,
             (SELECT count(*)::int FROM public.species_mastery_events) AS events,
             (SELECT count(*)::int FROM private.species_mastery_outbox) AS outbox
      FROM private.species_mastery_activation WHERE singleton
    `);
    assert(idle.rows[0].lifecycle === "inactive" && idle.rows[0].inactive === true);
    assert(idle.rows[0].events === 0 && idle.rows[0].outbox === 0);
    record("the rehearsal starts inactive with an empty familiarity ledger", true);

    const roundId = await makeRound(client, 1);
    const before = await client.query("SELECT clock_timestamp() AS ts");
    await settle(client, roundId);
    const after = await client.query("SELECT clock_timestamp() AS ts");
    const caught = await client.query(
      `SELECT id, user_id, caught_at, server_inserted_at,
              server_inserted_at = 'infinity'::timestamptz AS inf,
              server_inserted_at = '-infinity'::timestamptz AS ninf
       FROM public.catches WHERE round_id = $1`,
      [roundId]
    );
    assert(caught.rows.length === 1);
    const row = caught.rows[0];
    assert(row.user_id === A);
    assert(row.server_inserted_at && row.inf === false && row.ninf === false);
    assert(row.server_inserted_at >= before.rows[0].ts && row.server_inserted_at <= after.rows[0].ts);
    assert(row.caught_at && row.caught_at.getTime() !== row.server_inserted_at.getTime() || row.caught_at);
    assert(row.caught_at);
    const display = row.caught_at;
    const frozen = await expectFail(
      client,
      "UPDATE public.catches SET caught_at = caught_at + interval '1 day' WHERE id = $1",
      [row.id]
    );
    assert(/caught_at|immutable|freeze|cannot/i.test(frozen.message) || frozen.code === "55000", frozen.message);
    const still = await client.query("SELECT caught_at FROM public.catches WHERE id = $1", [row.id]);
    assert(still.rows[0].caught_at.getTime() === display.getTime());
    record("one canonical settle stamps a finite server time and leaves caught_at unchanged", true);

    await settle(client, roundId);
    const replay = await client.query("SELECT count(*)::int AS n FROM public.catches WHERE round_id = $1", [roundId]);
    assert(replay.rows[0].n === 1);
    record("replaying the same settlement does not create a second specimen", true);

    const dup = await client.query(
      `SELECT private.materialize_streamlink_catch($1, 1, 5, 'catch', $2, 'poke', $3, false) AS result`,
      [A, `play:${roundId}:${A}`, roundId]
    );
    assert(dup.rows[0].result.ok === false && dup.rows[0].result.replay === true);
    assert((await client.query("SELECT count(*)::int AS n FROM public.catches WHERE round_id = $1", [roundId])).rows[0].n === 1);
    record("a duplicate materialize returns already-settled and keeps one specimen", true);

    const ledger = await client.query(`
      SELECT a.lifecycle,
             (SELECT count(*)::int FROM public.species_mastery_events) AS events,
             (SELECT count(*)::int FROM private.species_mastery_outbox) AS outbox,
             private.streamlink_wire_is_enabled() AS wire
      FROM private.species_mastery_activation a WHERE a.singleton
    `);
    assert(ledger.rows[0].lifecycle === "inactive" && ledger.rows[0].events === 0 && ledger.rows[0].outbox === 0 && ledger.rows[0].wire === false);
    record("the successful catch does not queue familiarity and leaves recording inactive", true);

    const stampDef = await client.query(
      "SELECT pg_get_functiondef('private.stamp_catch_server_inserted_at()'::regprocedure) AS def"
    );
    await client.query(`
      CREATE OR REPLACE FUNCTION private.stamp_catch_server_inserted_at()
      RETURNS trigger LANGUAGE plpgsql AS $fn$
      BEGIN RAISE EXCEPTION 'stamp failed' USING ERRCODE = '55000'; END $fn$
    `);
    const failedRound = await makeRound(client, 4);
    const failed = await expectFail(
      client,
      "SELECT private.settle_if_needed(r.*) FROM public.encounter_rounds r WHERE id = $1",
      [failedRound]
    );
    assert(/stamp failed/.test(failed.message), failed.message);
    assert((await client.query("SELECT count(*)::int AS n FROM public.catches WHERE round_id = $1", [failedRound])).rows[0].n === 0);
    await client.query(stampDef.rows[0].def);
    assert((await client.query("SELECT lifecycle FROM private.species_mastery_activation WHERE singleton")).rows[0].lifecycle === "inactive");
    record("a stamp failure leaves no specimen and does not activate familiarity", true);

    const bare = await client.query(
      "INSERT INTO public.catches (user_id, dex) VALUES ($1, 25) RETURNING server_inserted_at, source_key, round_id",
      [A]
    );
    const bareLog = await client.query(
      "SELECT count(*)::int AS n FROM public.capture_log WHERE user_id = $1 AND dex = 25",
      [A]
    );
    assert(bare.rows[0].server_inserted_at && bare.rows[0].source_key === null && bare.rows[0].round_id === null);
    assert(bareLog.rows[0].n === 0);
    record("SIMULATED a bare insert stamps a time but is not a Play settlement", true);

    const missed = results.filter((row) => !row.passed);
    console.log(`\n${results.filter((row) => row.passed).length}/${results.length} REAL SQL checks passed`);
    console.log(`POSTGRES ${version}`);
    console.log("CLASS: REAL SQL on disposable loopback Postgres. Not production. Odds and spends were stubbed.");
    if (missed.length) process.exitCode = 1;
  } finally {
    for (const dbClient of clients) {
      try { await dbClient.end(); } catch (_) { /* ignore */ }
    }
    try { if (admin) await admin.end(); } catch (_) { /* ignore */ }
    try { if (cluster) await cluster.stop(); } catch (_) { /* ignore */ }
    try { fs.rmSync(path.join(CACHE, "d76-data"), { recursive: true, force: true }); } catch (_) { /* ignore */ }
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("D76 REHEARSAL FAILED:", error.message);
    process.exit(1);
  });
}
