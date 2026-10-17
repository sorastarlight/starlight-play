/* D73 readiness rehearsal.
 * Disposable LOCAL cluster only. Synthetic trainers only.
 * Does not connect to hosted Supabase and does not call production settlement.
 * capture_chance and announce_throws are the D72 stubs.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { pathToFileURL } = require("url");
const { refuseHosted, splitSql, BANNED } = require("./a19-schema-rehearsal.js");

const ROOT = path.join(__dirname, "..");
const CACHE = path.join(__dirname, ".cache", "d54-pg-harness");
const HOST = "127.0.0.1";
const PORT = 55446;
const USER = "postgres";
const PASSWORD = "d73-mastery-local-only";
const A = "aaaaaaaa-0000-4000-8000-000000000073";
const B = "bbbbbbbb-0000-4000-8000-000000000073";

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
  console.log(`D73 READINESS TARGET: ${HOST}:${PORT} (embedded local; NOT supabase)`);
  console.log("LIMIT: capture_chance and announce_throws are synthetic stubs.");
  const embedPath = path.join(CACHE, "node_modules", "embedded-postgres", "dist", "index.js");
  if (!fs.existsSync(embedPath)) throw new Error("embedded-postgres missing");
  const EmbeddedPostgres = (await import(pathToFileURL(embedPath).href)).default;
  const dataDir = path.join(CACHE, "d73-data");
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
    await cluster.createDatabase("d73_ready");
    async function open() {
      const client = cluster.getPgClient("d73_ready", HOST);
      await client.connect();
      clients.push(client);
      return client;
    }
    const client = await open();
    const other = await open();
    await client.query(fixtureSql());
    for (const rel of [
      "supabase/unapplied/d64-mastery/001_species_mastery_events.sql",
      "supabase/unapplied/d65-mastery/002_species_mastery_hardening.sql",
      "supabase/unapplied/d66-mastery/003_species_mastery_lifecycle.sql",
      "supabase/unapplied/d67-mastery/004_species_mastery_catch_safety.sql",
      "supabase/unapplied/a19-wire/002_materialize_hook.sql",
      "supabase/unapplied/a19-wire/003_settle_integration.sql"
    ]) await applyFile(client, rel);

    const before = await client.query(
      "SELECT md5(prosrc) AS src FROM pg_proc WHERE oid = 'private.settle_if_needed(public.encounter_rounds)'::regprocedure"
    );
    const stmts = splitSql(fs.readFileSync(path.join(ROOT, "supabase/unapplied/d72-mastery/006_settle_familiarity_note.sql"), "utf8"));
    assert(stmts[0] === "BEGIN" && stmts[stmts.length - 1] === "COMMIT");
    for (const stmt of stmts.slice(0, -1)) await client.query(stmt);
    const boom = await expectFail(client, "DO $$ BEGIN RAISE EXCEPTION 'injected install failure'; END $$");
    assert(/injected install failure/.test(boom.message));
    await client.query("ROLLBACK");
    const rolled = await client.query(
      "SELECT md5(prosrc) AS src, position('note_species_mastery_catch' in prosrc) > 0 AS noted FROM pg_proc WHERE oid = 'private.settle_if_needed(public.encounter_rounds)'::regprocedure"
    );
    assert(rolled.rows[0].src === before.rows[0].src && rolled.rows[0].noted === false);
    record("a failure inside 006 rolls the settle replacement back", true);

    await applyFile(client, "supabase/unapplied/d72-mastery/005_enqueue_lifecycle.sql");
    const plainId = crypto.randomUUID();
    const plainRound = crypto.randomUUID();
    await client.query(
      "INSERT INTO public.encounter_rounds (id, dex, rules) VALUES ($1, 1, '{\"rewardMode\":\"live\"}'::jsonb)",
      [plainRound]
    );
    await client.query(
      "INSERT INTO public.catches (id, user_id, dex, source_key, round_id) VALUES ($1, $2, 1, $3, $4)",
      [plainId, A, `play:${plainRound}:${A}`, plainRound]
    );
    assert((await client.query("SELECT count(*)::int AS n FROM public.catches WHERE id = $1", [plainId])).rows[0].n === 1);
    record("005 does not fire on a catch insert", true);

    const failed006 = splitSql(fs.readFileSync(path.join(ROOT, "supabase/unapplied/d72-mastery/006_settle_familiarity_note.sql"), "utf8"));
    for (const stmt of failed006.slice(0, -1)) await client.query(stmt);
    await client.query("ROLLBACK");
    assert((await client.query("SELECT position('note_species_mastery_catch' in prosrc) = 0 AS clean FROM pg_proc WHERE proname = 'settle_if_needed'")).rows[0].clean === true);
    assert((await client.query("SELECT count(*)::int AS n FROM pg_trigger WHERE tgname = 'species_mastery_outbox_admit'")).rows[0].n === 1);
    record("005 can commit and a later 006 failure leaves the prior settle body", true);

    await applyFile(client, "supabase/unapplied/d72-mastery/006_settle_familiarity_note.sql");
    await client.query("GRANT ALL ON TABLE public.species_mastery_progress TO authenticated");
    await applyFile(client, "supabase/unapplied/d72-mastery/007_progress_view_grants.sql");
    const attrs = await client.query(`
      SELECT prosecdef, provolatile, pg_get_function_result(oid) AS result_type,
             has_function_privilege('authenticated', oid, 'execute') AS auth_exec,
             position('note_species_mastery_catch' in prosrc) > 0 AS noted
      FROM pg_proc WHERE oid = 'private.settle_if_needed(public.encounter_rounds)'::regprocedure
    `);
    assert(attrs.rows[0].prosecdef === false && attrs.rows[0].provolatile === "v");
    assert(attrs.rows[0].result_type === "encounter_rounds" && attrs.rows[0].auth_exec === true && attrs.rows[0].noted === true);
    const grants = await client.query(`
      SELECT has_table_privilege('authenticated', 'public.species_mastery_progress', 'SELECT') AS sel,
             has_table_privilege('authenticated', 'public.species_mastery_progress', 'INSERT') AS ins,
             has_table_privilege('authenticated', 'public.species_mastery_progress', 'UPDATE') AS upd,
             has_table_privilege('authenticated', 'public.species_mastery_progress', 'DELETE') AS del,
             has_table_privilege('authenticated', 'public.species_mastery_progress', 'TRUNCATE') AS trunc
    `);
    assert(grants.rows[0].sel === true && grants.rows[0].ins === false && grants.rows[0].upd === false && grants.rows[0].del === false && grants.rows[0].trunc === false);
    record("installed draft keeps settle invoker, volatile, and the encounter_rounds return", true);

    await client.query("SELECT private.activate_species_mastery_events()");
    await client.query("DROP FUNCTION private.note_species_mastery_catch(uuid)");
    const missingRound = await makeRound(client, 2);
    await settle(client, missingRound);
    const missing = await client.query("SELECT id FROM public.catches WHERE round_id = $1", [missingRound]);
    assert(missing.rows.length === 1);
    assert((await client.query("SELECT count(*)::int AS n FROM private.species_mastery_outbox WHERE catch_id = $1", [missing.rows[0].id])).rows[0].n === 0);
    record("a missing note function does not abort the catch", true);

    const savedMat = await client.query(
      "SELECT pg_get_functiondef('private.materialize_streamlink_catch(uuid,integer,integer,text,text,text,uuid,boolean,text,text,text,text,text)'::regprocedure) AS def"
    );
    await client.query(`
      CREATE OR REPLACE FUNCTION private.materialize_streamlink_catch(
        p_user_id uuid, p_form_id integer, p_level integer, p_ctx text, p_source_key text,
        p_ball text DEFAULT 'poke', p_round_id uuid DEFAULT NULL, p_shiny boolean DEFAULT false,
        p_content_build text DEFAULT 'sl-ref-20261013-227b573', p_hidden_ticket text DEFAULT NULL,
        p_variant text DEFAULT 'normal', p_name text DEFAULT NULL, p_gender text DEFAULT NULL
      ) RETURNS jsonb LANGUAGE plpgsql AS $fn$
      BEGIN
        RETURN jsonb_build_object('ok', false, 'errors', jsonb_build_array('bad-specimen'));
      END $fn$
    `);
    const badRound = await makeRound(client, 3);
    const raised = await expectFail(client, "SELECT private.settle_if_needed(r.*) FROM public.encounter_rounds r WHERE id = $1", [badRound]);
    assert(/wire-materialize-failed/.test(raised.message), raised.message);
    assert((await client.query("SELECT count(*)::int AS n FROM public.catches WHERE round_id = $1", [badRound])).rows[0].n === 0);
    await client.query(savedMat.rows[0].def);
    record("a materialize failure still raises and does not leave a catch", true);

    await client.query("BEGIN");
    await client.query("SELECT lifecycle FROM private.species_mastery_activation WHERE singleton FOR UPDATE");
    const started = Date.now();
    const waitingRound = await makeRound(other, 4);
    const waiting = other.query("BEGIN").then(() => other.query(
      "SELECT private.settle_if_needed(r.*) FROM public.encounter_rounds r WHERE id = $1",
      [waitingRound]
    ));
    await new Promise((resolve) => setTimeout(resolve, 300));
    await client.query("UPDATE private.species_mastery_activation SET lifecycle = 'draining', drain_started_at = clock_timestamp() WHERE singleton");
    await client.query("COMMIT");
    await waiting;
    await other.query("COMMIT");
    assert(Date.now() - started >= 250);
    const waited = await client.query("SELECT id FROM public.catches WHERE round_id = $1", [waitingRound]);
    const queued = await client.query(
      "SELECT count(*)::int AS n FROM private.species_mastery_outbox WHERE catch_id = $1",
      [waited.rows[0].id]
    );
    assert(waited.rows.length === 1 && queued.rows[0].n === 0);
    record("a lifecycle lock waits, then a committed drain keeps the catch and skips the note", true);

    const failed = results.filter((row) => !row.passed);
    console.log(`\n${results.filter((row) => row.passed).length}/${results.length} REAL SQL checks passed`);
    console.log(`POSTGRES ${version}`);
    console.log("CLASS: REAL SQL on disposable loopback Postgres. Not production. Odds and spends were stubbed.");
    if (failed.length) process.exitCode = 1;
  } finally {
    for (const dbClient of clients) {
      try { await dbClient.end(); } catch (_) { /* ignore */ }
    }
    try { if (admin) await admin.end(); } catch (_) { /* ignore */ }
    try { if (cluster) await cluster.stop(); } catch (_) { /* ignore */ }
    try { fs.rmSync(path.join(CACHE, "d73-data"), { recursive: true, force: true }); } catch (_) { /* ignore */ }
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("D73 REHEARSAL FAILED:", error.message);
    process.exit(1);
  });
}
