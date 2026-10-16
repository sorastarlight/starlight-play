/* Isolated D54 encounter-economy rehearsal.
 * Disposable LOCAL cluster only. Synthetic trainer only.
 * Does not read hosted URLs. Does not apply SQL to production.
 */
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const { refuseHosted, splitSql, BANNED } = require("./a19-schema-rehearsal.js");

const ROOT = path.join(__dirname, "..");
const CACHE = path.join(__dirname, ".cache", "d54-pg-harness");
const SQL = path.join(ROOT, "supabase", "unapplied", "d54-economy", "001_spend_ledger.sql");
const HOST = "127.0.0.1";
const PORT = 55437;
const USER = "postgres";
const PASSWORD = "d54-economy-local-only";
const DB_MAIN = "d54_economy";
const ROUND = "d5400000-0000-4000-8000-000000000001";
const TRAINER = "c0ffee00-0000-4000-8000-000000000054";

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
  for (const stmt of splitSql(sql)) {
    await client.query(stmt);
  }
}

const FIXTURE = `
CREATE SCHEMA IF NOT EXISTS private;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE public.inventories (
  user_id uuid PRIMARY KEY,
  pokeball int NOT NULL DEFAULT 0,
  berry int NOT NULL DEFAULT 0,
  bait int NOT NULL DEFAULT 0,
  greatball int NOT NULL DEFAULT 0,
  ultraball int NOT NULL DEFAULT 0,
  berries jsonb NOT NULL DEFAULT '{}'::jsonb,
  balls jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.item_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_key text NOT NULL,
  amount int NOT NULL,
  reason text NOT NULL,
  source_id text,
  idempotency text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX item_ledger_idem_uidx
  ON public.item_ledger (user_id, idempotency)
  WHERE idempotency IS NOT NULL;

CREATE TABLE public.encounter_players (
  round_id uuid NOT NULL,
  user_id uuid NOT NULL,
  ball text,
  prep text,
  result text,
  result_reason text,
  throw_processed boolean NOT NULL DEFAULT false,
  PRIMARY KEY (round_id, user_id)
);

CREATE TABLE public.play_console_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid,
  user_id uuid,
  display_name text,
  kind text,
  item text,
  message text,
  UNIQUE (round_id, user_id, kind)
);

CREATE FUNCTION private.item_label(p_item text) RETURNS text LANGUAGE sql AS $$ SELECT p_item $$;
CREATE FUNCTION private.a_or_an(p_label text) RETURNS text LANGUAGE sql AS $$ SELECT 'a ' || p_label $$;
CREATE FUNCTION private.trainer_label(p_uid uuid) RETURNS text LANGUAGE sql AS $$ SELECT 'Synthetic trainer' $$;
CREATE FUNCTION private.is_capture_berry(p_item text) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
CREATE FUNCTION private.extra_ball_keys() RETURNS text[] LANGUAGE sql AS $$ SELECT ARRAY[]::text[] $$;
CREATE FUNCTION private.log_activity(p_round uuid, p_uid uuid, p_kind text, p_item text)
RETURNS void LANGUAGE sql AS $$ SELECT NULL::void $$;

INSERT INTO public.inventories (user_id, pokeball, berry, bait, greatball, ultraball)
VALUES ('${TRAINER}', 13, 5, 1, 1, 0);

INSERT INTO public.encounter_players (round_id, user_id, ball, prep, result_reason)
VALUES ('${ROUND}', '${TRAINER}', 'pokeball', NULL, NULL);
`;

async function bag(client) {
  const { rows } = await client.query(
    `SELECT pokeball, berry, bait, greatball, ultraball, berries, balls
     FROM public.inventories WHERE user_id = $1`,
    [TRAINER]
  );
  return rows[0];
}

async function ledger(client) {
  const { rows } = await client.query(
    `SELECT item_key, amount, reason FROM public.item_ledger
     WHERE user_id = $1 ORDER BY created_at, item_key`,
    [TRAINER]
  );
  return rows;
}

async function resetThrow(client, qty, reason) {
  await client.query("DELETE FROM public.item_ledger WHERE user_id = $1", [TRAINER]);
  await client.query("DELETE FROM public.play_console_log WHERE user_id = $1", [TRAINER]);
  await client.query(
    `UPDATE public.inventories
     SET pokeball = $2, berry = 5, bait = 1, greatball = 1, ultraball = 0,
         berries = '{}'::jsonb, balls = '{}'::jsonb
     WHERE user_id = $1`,
    [TRAINER, qty]
  );
  await client.query(
    `UPDATE public.encounter_players
     SET ball = 'pokeball', throw_processed = false, result = NULL, result_reason = $2, prep = NULL
     WHERE round_id = $3 AND user_id = $1`,
    [TRAINER, reason, ROUND]
  );
}

async function main() {
  let admin;
  let client;
  let clientB;
  let cluster = null;
  refuseHosted();
  console.log(`D54 ECONOMY REHEARSAL TARGET: ${HOST}:${PORT}/${DB_MAIN} (embedded local; NOT supabase)`);
  const embedPath = path.join(CACHE, "node_modules", "embedded-postgres", "dist", "index.js");
  if (!fs.existsSync(embedPath)) {
    throw new Error("embedded-postgres missing under tools/.cache/d54-pg-harness");
  }
  const EmbeddedPostgres = (await import(pathToFileURL(embedPath).href)).default;
  const dataDir = path.join(CACHE, "data");
  fs.mkdirSync(CACHE, { recursive: true });
  fs.rmSync(dataDir, { recursive: true, force: true });

  cluster = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: USER,
    password: PASSWORD,
    port: PORT,
    persistent: false,
    initdbFlags: ["--encoding=UTF8", "--no-locale"],
    postgresFlags: ["-c", "listen_addresses=127.0.0.1"],
    onLog: (msg) => {
      const text = String(msg);
      if (/ERROR|FATAL|PANIC/i.test(text)) console.error("[pg]", text.trim());
    }
  });

  try {
    await cluster.initialise();
    await cluster.start();
    await cluster.createDatabase(DB_MAIN);
    admin = cluster.getPgClient("postgres", HOST);
    await admin.connect();
    const { rows: targetRows } = await admin.query(
      "SELECT current_database() AS db, inet_server_addr()::text AS addr"
    );
    assert(targetRows[0].db !== "dtflmlbjhttoewqgkujf");
    assert(!BANNED.test(String(targetRows[0].addr || "")));
    record("isolation target is loopback embedded Postgres", true, `${HOST}:${PORT}/${DB_MAIN}`);

    client = cluster.getPgClient(DB_MAIN, HOST);
    await client.connect();
    await client.query("SET statement_timeout = '60s'");
    await client.query(FIXTURE);
    await applyFile(client, SQL);
    record("branch spend_bag_item and announce_throws installed locally", true);

    await client.query(`SELECT private.announce_throws($1::uuid)`, [ROUND]);
    let inv = await bag(client);
    let rows = await ledger(client);
    assert(inv.pokeball === 12, `expected 12 after one throw, got ${inv.pokeball}`);
    assert(rows.length === 1 && rows[0].item_key === "pokeball" && rows[0].amount === -1 && rows[0].reason === "BAG_SPEND");
    record("successful throw debits one Poké Ball and writes one BAG_SPEND row", true, "13 -> 12");

    await client.query(
      `INSERT INTO public.item_ledger (user_id, item_key, amount, reason, idempotency)
       VALUES ($1, 'pokeball', 1, 'STREAM_ATTENDANCE', 'stream-ball:synthetic:day')`,
      [TRAINER]
    );
    await client.query(
      `UPDATE public.inventories SET pokeball = pokeball + 1 WHERE user_id = $1`,
      [TRAINER]
    );
    inv = await bag(client);
    rows = await ledger(client);
    assert(inv.pokeball === 13, `attendance should net back to 13, got ${inv.pokeball}`);
    assert(rows.length === 2);
    assert(rows.some((row) => row.reason === "BAG_SPEND" && row.amount === -1));
    assert(rows.some((row) => row.reason === "STREAM_ATTENDANCE" && row.amount === 1));
    record("attendance +1 is a separate ledger row and can hide the bag net", true, "12 -> 13");

    await resetThrow(client, 13, null);
    await client.query(
      `UPDATE public.encounter_players SET result = 'Escaped' WHERE round_id = $1`,
      [ROUND]
    );
    await client.query(`SELECT private.announce_throws($1::uuid)`, [ROUND]);
    inv = await bag(client);
    rows = await ledger(client);
    const { rows: escaped } = await client.query(
      `SELECT result, throw_processed FROM public.encounter_players WHERE round_id = $1`,
      [ROUND]
    );
    assert(inv.pokeball === 12);
    assert(rows.length === 1 && rows[0].amount === -1);
    assert(escaped[0].result === "Escaped" && escaped[0].throw_processed === true);
    record("an escaped throw still consumes the ball", true);

    await resetThrow(client, 0, null);
    await client.query(`SELECT private.announce_throws($1::uuid)`, [ROUND]);
    inv = await bag(client);
    rows = await ledger(client);
    const { rows: empty } = await client.query(
      `SELECT result_reason, throw_processed FROM public.encounter_players WHERE round_id = $1`,
      [ROUND]
    );
    assert(inv.pokeball === 0);
    assert(rows.length === 0);
    assert(empty[0].result_reason === "no_ball_left" && empty[0].throw_processed === true);
    record("an empty bag writes no debit and blocks the throw", true);

    await resetThrow(client, 13, "standard_throw");
    await client.query(`SELECT private.announce_throws($1::uuid)`, [ROUND]);
    inv = await bag(client);
    rows = await ledger(client);
    assert(inv.pokeball === 12 && rows.length === 1);
    record("a recorded standard throw still spends the owned ball", true);

    const beforeReplay = inv.pokeball;
    await client.query(`SELECT private.announce_throws($1::uuid)`, [ROUND]);
    inv = await bag(client);
    rows = await ledger(client);
    assert(inv.pokeball === beforeReplay && rows.length === 1);
    record("replaying announce_throws does not spend again", true);

    await resetThrow(client, 1, null);
    clientB = cluster.getPgClient(DB_MAIN, HOST);
    await clientB.connect();
    await client.query("BEGIN");
    await client.query(`SELECT private.announce_throws($1::uuid)`, [ROUND]);
    const pending = clientB.query("BEGIN").then(() => clientB.query(
      `SELECT private.announce_throws($1::uuid)`,
      [ROUND]
    ));
    await client.query("COMMIT");
    await pending;
    await clientB.query("COMMIT");
    inv = await bag(client);
    rows = await ledger(client);
    assert(inv.pokeball === 0 && rows.length === 1, `concurrent spend qty=${inv.pokeball} rows=${rows.length}`);
    record("two overlapping announce calls spend one ball", true);

    await resetThrow(client, 13, null);
    await client.query("BEGIN");
    await client.query(`SELECT private.announce_throws($1::uuid)`, [ROUND]);
    let raised = false;
    try {
      await client.query("SELECT 1/0");
    } catch (error) {
      raised = /division by zero/.test(error.message);
    }
    assert(raised);
    await client.query("ROLLBACK");
    inv = await bag(client);
    rows = await ledger(client);
    const { rows: rolled } = await client.query(
      `SELECT throw_processed FROM public.encounter_players WHERE round_id = $1`,
      [ROUND]
    );
    assert(inv.pokeball === 13 && rows.length === 0 && rolled[0].throw_processed === false);
    record("a persistence failure rolls the debit and the ledger back", true);

    await client.query(`
      CREATE FUNCTION public.rehearsal_fail_after_spend(p_round uuid)
      RETURNS void LANGUAGE plpgsql AS $fn$
      BEGIN
        PERFORM private.announce_throws(p_round);
        RAISE EXCEPTION 'injected settlement failure';
      END;
      $fn$
    `);
    raised = false;
    try {
      await client.query(`SELECT public.rehearsal_fail_after_spend($1::uuid)`, [ROUND]);
    } catch (error) {
      raised = /injected settlement failure/.test(error.message);
    }
    assert(raised);
    inv = await bag(client);
    rows = await ledger(client);
    assert(inv.pokeball === 13 && rows.length === 0);
    record("an injected settlement error leaves inventory and ledger unchanged", true);

    await client.query(
      `UPDATE public.inventories
       SET berries = '{"oran":1}'::jsonb, balls = '{"duskball":1}'::jsonb
       WHERE user_id = $1`,
      [TRAINER]
    );
    await client.query(`
      CREATE OR REPLACE FUNCTION private.is_capture_berry(p_item text)
      RETURNS boolean LANGUAGE sql AS $$ SELECT p_item = 'oran' $$
    `);
    await client.query(`
      CREATE OR REPLACE FUNCTION private.extra_ball_keys()
      RETURNS text[] LANGUAGE sql AS $$ SELECT ARRAY['duskball']::text[] $$
    `);
    await client.query(`SELECT private.spend_bag_item($1, 'berry')`, [TRAINER]);
    await client.query(`SELECT private.spend_bag_item($1, 'bait')`, [TRAINER]);
    await client.query(`SELECT private.spend_bag_item($1, 'oran')`, [TRAINER]);
    await client.query(`SELECT private.spend_bag_item($1, 'duskball')`, [TRAINER]);
    inv = await bag(client);
    rows = await ledger(client);
    assert(inv.berry === 4 && inv.bait === 0);
    assert(Number(inv.berries.oran) === 0);
    assert(Number(inv.balls.duskball) === 0);
    assert(rows.filter((row) => row.reason === "BAG_SPEND").length === 4);
    record("berry, honey, and extra-ball spends each write their own debit", true);

    const failed = results.filter((row) => !row.passed);
    console.log(`\n${results.filter((row) => row.passed).length}/${results.length} REAL SQL checks passed`);
    console.log("CLASS: REAL SQL on disposable loopback Postgres. Not a browser test. Not production.");
    if (failed.length) process.exitCode = 1;
  } finally {
    try { if (clientB) await clientB.end(); } catch (_) { /* ignore */ }
    try { if (client) await client.end(); } catch (_) { /* ignore */ }
    try { if (admin) await admin.end(); } catch (_) { /* ignore */ }
    try { await cluster.stop(); } catch (_) { /* ignore */ }
    try { fs.rmSync(path.join(CACHE, "data"), { recursive: true, force: true }); } catch (_) { /* ignore */ }
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("D54 REHEARSAL FAILED:", error.message);
    process.exit(1);
  });
}
