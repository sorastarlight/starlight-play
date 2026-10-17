/* D75 activation rehearsal.
 * Disposable LOCAL cluster only. Synthetic trainers only.
 * Does not connect to hosted Supabase and does not activate production.
 * capture_chance and announce_throws are the D72 stubs. Odds and spends are not production.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { pathToFileURL } = require("url");
const { refuseHosted, splitSql, BANNED } = require("./a19-schema-rehearsal.js");

const ROOT = path.join(__dirname, "..");
const CACHE = path.join(__dirname, ".cache", "d54-pg-harness");
const HOST = "127.0.0.1";
const PORT = 55447;
const USER = "postgres";
const PASSWORD = "d75-mastery-local-only";
const A = "aaaaaaaa-0000-4000-8000-000000000075";
const B = "bbbbbbbb-0000-4000-8000-000000000075";

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
async function makeRound(client, dex, rules) {
  const id = crypto.randomUUID();
  await client.query(
    `INSERT INTO public.encounter_rounds (id, dex, name, variant, gender, rules, trigger_source)
     VALUES ($1, $2, 'Bulbasaur', 'normal', 'M', $3::jsonb, 'live')`,
    [id, dex, JSON.stringify(rules || { rewardMode: "live" })]
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
async function catchFor(client, roundId) {
  const { rows } = await client.query(
    "SELECT id, server_inserted_at FROM public.catches WHERE round_id = $1",
    [roundId]
  );
  return rows;
}
async function outboxCount(client, catchId) {
  const { rows } = await client.query(
    "SELECT count(*)::int AS n FROM private.species_mastery_outbox WHERE catch_id = $1",
    [catchId]
  );
  return rows[0].n;
}
async function eventCount(client, catchId) {
  const { rows } = await client.query(
    "SELECT count(*)::int AS n FROM public.species_mastery_events WHERE catch_id = $1",
    [catchId]
  );
  return rows[0].n;
}
async function economy(client) {
  const points = await client.query(
    "SELECT points, rank FROM public.species_mastery WHERE user_id = $1 AND dex = 1",
    [A]
  );
  const board = await client.query("SELECT score FROM public.rankings WHERE board = 'mastery'");
  const bag = await client.query("SELECT qty FROM public.trainer_items WHERE user_id = $1", [A]);
  return {
    points: points.rows[0].points,
    rank: points.rows[0].rank,
    score: board.rows[0].score,
    qty: bag.rows[0].qty
  };
}

async function main() {
  let admin;
  let cluster = null;
  const clients = [];
  refuseHosted();
  console.log(`D75 ACTIVATION TARGET: ${HOST}:${PORT} (embedded local; NOT supabase)`);
  console.log("LIMIT: capture_chance and announce_throws are synthetic stubs. Production odds and bag spending were not tested.");
  const embedPath = path.join(CACHE, "node_modules", "embedded-postgres", "dist", "index.js");
  if (!fs.existsSync(embedPath)) throw new Error("embedded-postgres missing");
  const EmbeddedPostgres = (await import(pathToFileURL(embedPath).href)).default;
  const dataDir = path.join(CACHE, "d75-data");
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
    await cluster.createDatabase("d75_ready");
    async function open() {
      const client = cluster.getPgClient("d75_ready", HOST);
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
      "supabase/unapplied/d72-mastery/005_enqueue_lifecycle.sql",
      "supabase/unapplied/d72-mastery/006_settle_familiarity_note.sql",
      "supabase/unapplied/d72-mastery/007_progress_view_grants.sql"
    ]) await applyFile(client, rel);

    const installed = await client.query(`
      SELECT lifecycle, activated_at IS NULL AS inactive,
             (SELECT count(*)::int FROM public.species_mastery_events) AS events,
             (SELECT count(*)::int FROM private.species_mastery_outbox) AS outbox
      FROM private.species_mastery_activation WHERE singleton
    `);
    assert(installed.rows[0].lifecycle === "inactive" && installed.rows[0].inactive === true);
    assert(installed.rows[0].events === 0 && installed.rows[0].outbox === 0);
    const before = await economy(client);
    assert(before.points === 7 && before.rank === 2 && before.score === 7 && before.qty === 4);
    record("schema installs inactive with an empty ledger", true);

    const preRound = await makeRound(client, 1);
    await settle(client, preRound);
    const preCatch = await catchFor(client, preRound);
    assert(preCatch.length === 1 && preCatch[0].server_inserted_at);
    assert(await outboxCount(client, preCatch[0].id) === 0);
    assert(await eventCount(client, preCatch[0].id) === 0);
    assert((await client.query("SELECT private.reconcile_species_mastery_outbox(25) AS n")).rows[0].n === 0);
    await settle(client, preRound);
    assert((await catchFor(client, preRound)).length === 1);
    record("a capture before activation is kept and is not eligible", true);

    const opened = await client.query("SELECT private.activate_species_mastery_events() AS opened");
    assert(opened.rows[0].opened);
    const active = await client.query("SELECT lifecycle, activated_at FROM private.species_mastery_activation WHERE singleton");
    assert(active.rows[0].lifecycle === "active" && active.rows[0].activated_at);
    assert((await client.query("SELECT private.reconcile_species_mastery_outbox(25) AS n")).rows[0].n === 0);
    assert(await eventCount(client, preCatch[0].id) === 0);
    record("activation leaves the earlier specimen ineligible", true);

    const liveRound = await makeRound(client, 1);
    await settle(client, liveRound);
    const liveCatch = await catchFor(client, liveRound);
    const queued = await client.query(
      "SELECT status FROM private.species_mastery_outbox WHERE catch_id = $1",
      [liveCatch[0].id]
    );
    assert(liveCatch.length === 1 && queued.rows.length === 1 && queued.rows[0].status === "pending");
    assert(await eventCount(client, liveCatch[0].id) === 0);
    record("one post-activation Play capture queues its catch id", true);

    const delivered = await client.query("SELECT private.deliver_species_mastery_outbox(25) AS n");
    assert(delivered.rows[0].n === 1);
    const progress = await client.query(
      "SELECT eligible_captures, tier_level, tier_name FROM public.species_mastery_progress WHERE trainer_id = $1 AND dex = 1",
      [A]
    );
    assert(progress.rows[0].eligible_captures === 1 && progress.rows[0].tier_level === 1 && progress.rows[0].tier_name === "Familiar");
    record("delivery records Familiar for one eligible catch", true);

    await settle(client, liveRound);
    assert(await eventCount(client, liveCatch[0].id) === 1);
    assert(await outboxCount(client, liveCatch[0].id) === 1);
    assert((await client.query("SELECT private.deliver_species_mastery_outbox(25) AS n")).rows[0].n === 0);
    record("replaying settlement does not record a second event", true);

    const noteDef = await client.query(
      "SELECT pg_get_functiondef('private.note_species_mastery_catch(uuid)'::regprocedure) AS def"
    );
    await client.query(`
      CREATE OR REPLACE FUNCTION private.note_species_mastery_catch(p_catch_id uuid)
      RETURNS boolean LANGUAGE plpgsql AS $fn$
      BEGIN RAISE EXCEPTION 'note failed'; END $fn$
    `);
    const noteRound = await makeRound(client, 4);
    await settle(client, noteRound);
    const noteCatch = await catchFor(client, noteRound);
    assert(noteCatch.length === 1 && await outboxCount(client, noteCatch[0].id) === 0);
    record("a failing optional note keeps the catch and does not queue it", true);

    const enqueueDef = await client.query(
      "SELECT pg_get_functiondef('private.enqueue_species_mastery_event(uuid)'::regprocedure) AS def"
    );
    await client.query(noteDef.rows[0].def);
    await client.query(`
      CREATE OR REPLACE FUNCTION private.enqueue_species_mastery_event(p_catch_id uuid)
      RETURNS uuid LANGUAGE plpgsql AS $fn$
      BEGIN RAISE EXCEPTION 'outbox unavailable'; END $fn$
    `);
    const outboxRound = await makeRound(client, 5);
    await settle(client, outboxRound);
    const outboxCatch = await catchFor(client, outboxRound);
    assert(outboxCatch.length === 1 && await outboxCount(client, outboxCatch[0].id) === 0);
    await client.query(enqueueDef.rows[0].def);
    record("an unavailable outbox keeps the catch", true);

    const recovered = await client.query("SELECT private.reconcile_species_mastery_outbox(25) AS n");
    assert(recovered.rows[0].n === 2);
    const recoveredDelivered = await client.query("SELECT private.deliver_species_mastery_outbox(25) AS n");
    assert(recoveredDelivered.rows[0].n === 2);
    assert(await eventCount(client, noteCatch[0].id) === 1);
    assert(await eventCount(client, outboxCatch[0].id) === 1);
    record("reconciliation creates exactly one event for each missed catch", true);

    const matDef = await client.query(
      "SELECT pg_get_functiondef('private.materialize_streamlink_catch(uuid,integer,integer,text,text,text,uuid,boolean,text,text,text,text,text)'::regprocedure) AS def"
    );
    await client.query(`
      CREATE OR REPLACE FUNCTION private.materialize_streamlink_catch(
        p_user_id uuid, p_form_id integer, p_level integer, p_ctx text, p_source_key text,
        p_ball text DEFAULT 'poke', p_round_id uuid DEFAULT NULL, p_shiny boolean DEFAULT false,
        p_content_build text DEFAULT 'sl-ref-20261013-227b573', p_hidden_ticket text DEFAULT NULL,
        p_variant text DEFAULT 'normal', p_name text DEFAULT NULL, p_gender text DEFAULT NULL
      ) RETURNS jsonb LANGUAGE plpgsql AS $fn$
      DECLARE new_id uuid := gen_random_uuid();
      BEGIN
        INSERT INTO public.catches (id, user_id, dex, source_key, round_id, ball)
        VALUES (new_id, p_user_id, 3, p_source_key, p_round_id, p_ball);
        RETURN jsonb_build_object('ok', true, 'catchId', 'not-a-uuid');
      END $fn$
    `);
    const badIdRound = await makeRound(client, 3, { rewardMode: "test" });
    await settle(client, badIdRound);
    const badCatch = await catchFor(client, badIdRound);
    assert(badCatch.length === 1 && await outboxCount(client, badCatch[0].id) === 0);
    await client.query(matDef.rows[0].def);
    assert((await client.query("SELECT private.reconcile_species_mastery_outbox(25) AS n")).rows[0].n === 0);
    record("a malformed catch id does not abort settlement or enter the ledger", true);

    await client.query("SET ROLE authenticated");
    const denied = await expectFail(client, "SELECT private.note_species_mastery_catch($1)", [liveCatch[0].id]);
    await client.query("RESET ROLE");
    assert(denied.code === "42501" || /permission denied/i.test(denied.message));
    record("authenticated cannot invoke the note", true);

    const peerA = await makeRound(client, 10);
    const peerB = await makeRound(other, 11);
    await Promise.all([settle(client, peerA), settle(other, peerB)]);
    const peerCatches = await client.query(
      "SELECT id FROM public.catches WHERE round_id = ANY($1::uuid[])",
      [[peerA, peerB]]
    );
    assert(peerCatches.rows.length === 2);
    for (const row of peerCatches.rows) assert(await outboxCount(client, row.id) === 1);
    assert((await client.query("SELECT private.deliver_species_mastery_outbox(25) AS n")).rows[0].n === 2);
    for (const row of peerCatches.rows) assert(await eventCount(client, row.id) === 1);
    record("concurrent settlements each queue once and do not duplicate", true);

    await client.query("SELECT private.pause_species_mastery_delivery()");
    const pausedRound = await makeRound(client, 7);
    await settle(client, pausedRound);
    const pausedCatch = await catchFor(client, pausedRound);
    const pausedBox = await client.query(
      "SELECT status FROM private.species_mastery_outbox WHERE catch_id = $1",
      [pausedCatch[0].id]
    );
    assert(pausedBox.rows[0].status === "pending");
    assert((await client.query("SELECT private.deliver_species_mastery_outbox(25) AS n")).rows[0].n === 0);
    assert(await eventCount(client, pausedCatch[0].id) === 0);
    record("pause allows a new queue row and blocks delivery", true);

    await client.query("SELECT private.resume_species_mastery_delivery()");
    assert((await client.query("SELECT lifecycle FROM private.species_mastery_activation WHERE singleton")).rows[0].lifecycle === "active");
    record("resume returns the same activation period to active", true);

    await client.query("BEGIN");
    await client.query("SELECT lifecycle FROM private.species_mastery_activation WHERE singleton FOR UPDATE");
    const started = Date.now();
    const drainRound = await makeRound(other, 9);
    const waiting = other.query("BEGIN").then(() => other.query(
      "SELECT private.settle_if_needed(r.*) FROM public.encounter_rounds r WHERE id = $1",
      [drainRound]
    ));
    await new Promise((resolve) => setTimeout(resolve, 300));
    await client.query("SELECT private.begin_species_mastery_drain()");
    await client.query("COMMIT");
    await waiting;
    await other.query("COMMIT");
    assert(Date.now() - started >= 250);
    const drainCatch = await catchFor(client, drainRound);
    assert(drainCatch.length === 1 && await outboxCount(client, drainCatch[0].id) === 0);
    const drained = await client.query("SELECT private.deliver_species_mastery_outbox(25) AS n");
    assert(drained.rows[0].n === 1);
    assert(await eventCount(client, pausedCatch[0].id) === 1);
    assert(await eventCount(client, drainCatch[0].id) === 0);
    assert((await client.query("SELECT private.deliver_species_mastery_outbox(25) AS n")).rows[0].n === 0);
    record("drain finishes the queued row, keeps the in-flight catch, and skips a new note", true);

    await client.query("SELECT private.close_species_mastery_activation()");
    const closed = await client.query("SELECT lifecycle, activated_at, closed_at FROM private.species_mastery_activation WHERE singleton");
    assert(closed.rows[0].lifecycle === "closed" && closed.rows[0].activated_at && closed.rows[0].closed_at);
    const second = await expectFail(client, "SELECT private.activate_species_mastery_events()");
    assert(second.code === "55000" || /already activated/.test(second.message));
    assert((await client.query("SELECT activated_at FROM private.species_mastery_activation WHERE singleton")).rows[0].activated_at.getTime() === closed.rows[0].activated_at.getTime());
    record("close is permanent and a second activation is rejected", true);

    const stampDef = await client.query(
      "SELECT pg_get_functiondef('private.stamp_catch_server_inserted_at()'::regprocedure) AS def"
    );
    await client.query(`
      CREATE OR REPLACE FUNCTION private.stamp_catch_server_inserted_at()
      RETURNS trigger LANGUAGE plpgsql AS $fn$
      BEGIN RAISE EXCEPTION 'stamp failed' USING ERRCODE = '55000'; END $fn$
    `);
    const stampRound = await makeRound(client, 13);
    const stamped = await expectFail(
      client,
      "SELECT private.settle_if_needed(r.*) FROM public.encounter_rounds r WHERE id = $1",
      [stampRound]
    );
    assert(/stamp failed/.test(stamped.message), stamped.message);
    assert((await catchFor(client, stampRound)).length === 0);
    await client.query(stampDef.rows[0].def);
    record("a stamp trigger failure aborts the catch and is not swallowed by the note", true);

    const after = await economy(client);
    assert(after.points === 7 && after.rank === 2 && after.score === 7 && after.qty === 4);
    record("cosmetic bookkeeping leaves points, Rankings, and the bag unchanged", true);

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
    try { fs.rmSync(path.join(CACHE, "d75-data"), { recursive: true, force: true }); } catch (_) { /* ignore */ }
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("D75 REHEARSAL FAILED:", error.message);
    process.exit(1);
  });
}
