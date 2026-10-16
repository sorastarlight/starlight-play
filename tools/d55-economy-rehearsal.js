/* Isolated D55 encounter-economy rehearsal.
 * Disposable LOCAL cluster only. Synthetic trainer only.
 * Does not read hosted URLs. Does not apply SQL to production.
 */
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const { refuseHosted, splitSql, BANNED } = require("./a19-schema-rehearsal.js");
const { borrowedBallDecision } = require("./lib/borrowed-ball-rules");

const ROOT = path.join(__dirname, "..");
const CACHE = path.join(__dirname, ".cache", "d54-pg-harness");
const SQL = path.join(ROOT, "supabase", "unapplied", "d55-economy", "001_spend_rules.sql");
const HOST = "127.0.0.1";
const PORT = 55438;
const USER = "postgres";
const PASSWORD = "d55-economy-local-only";
const DB_MAIN = "d55_economy";
const ROUND = "d5500000-0000-4000-8000-000000000001";
const TRAINER = "c0ffee00-0000-4000-8000-000000000055";

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

INSERT INTO public.inventories (user_id, pokeball, berry, bait)
VALUES ('${TRAINER}', 13, 5, 1);
INSERT INTO public.encounter_players (round_id, user_id, ball)
VALUES ('${ROUND}', '${TRAINER}', 'pokeball');
`;

async function bag(client) {
  const { rows } = await client.query(
    `SELECT pokeball, berry, bait, berries, balls FROM public.inventories WHERE user_id = $1`,
    [TRAINER]
  );
  return rows[0];
}

async function ledger(client) {
  const { rows } = await client.query(
    `SELECT item_key, amount, reason FROM public.item_ledger
     WHERE user_id = $1 ORDER BY created_at, reason, item_key`,
    [TRAINER]
  );
  return rows;
}

async function player(client) {
  const { rows } = await client.query(
    `SELECT ball, result, result_reason, throw_processed
     FROM public.encounter_players WHERE round_id = $1 AND user_id = $2`,
    [ROUND, TRAINER]
  );
  return rows[0];
}

async function resetRound(client, qty) {
  await client.query("DELETE FROM public.item_ledger WHERE user_id = $1", [TRAINER]);
  await client.query("DELETE FROM public.play_console_log WHERE user_id = $1", [TRAINER]);
  await client.query(
    `UPDATE public.inventories
     SET pokeball = $2, berry = 5, bait = 1, berries = '{}'::jsonb, balls = '{}'::jsonb
     WHERE user_id = $1`,
    [TRAINER, qty]
  );
  await client.query(
    `UPDATE public.encounter_players
     SET ball = NULL, throw_processed = false, result = NULL, result_reason = NULL
     WHERE round_id = $1 AND user_id = $2`,
    [ROUND, TRAINER]
  );
}

async function chooseAndAnnounce(client, item, qty, throwable, result) {
  const decision = borrowedBallDecision(item, qty, throwable);
  assert(decision.ok, `expected an accepted throw for ${item}`);
  await client.query(
    `UPDATE public.inventories SET pokeball = $2 WHERE user_id = $1`,
    [TRAINER, qty]
  );
  await client.query(
    `UPDATE public.encounter_players
     SET ball = $2, result = $3, result_reason = $4, throw_processed = false
     WHERE round_id = $5 AND user_id = $1`,
    [TRAINER, decision.ball, result, decision.borrowed ? "standard_throw" : null, ROUND]
  );
  await client.query(`SELECT private.announce_throws($1::uuid)`, [ROUND]);
  return decision;
}

async function main() {
  let admin;
  let client;
  let clientB;
  let cluster = null;
  refuseHosted();
  console.log(`D55 ECONOMY REHEARSAL TARGET: ${HOST}:${PORT}/${DB_MAIN} (embedded local; NOT supabase)`);
  const embedPath = path.join(CACHE, "node_modules", "embedded-postgres", "dist", "index.js");
  if (!fs.existsSync(embedPath)) {
    throw new Error("embedded-postgres missing under tools/.cache/d54-pg-harness");
  }
  const EmbeddedPostgres = (await import(pathToFileURL(embedPath).href)).default;
  const dataDir = path.join(CACHE, "d55-data");
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
    record("D55 spend rules installed locally", true);

    let decision = await chooseAndAnnounce(client, "pokeball", 13, 13, "Caught");
    assert(decision.spends === true);
    let inv = await bag(client);
    let rows = await ledger(client);
    let state = await player(client);
    assert(inv.pokeball === 12 && rows.length === 1 && rows[0].amount === -1 && rows[0].reason === "BAG_SPEND");
    assert(state.result === "Caught" && state.throw_processed === true);
    record("an owned catch debits one Poké Ball and writes BAG_SPEND", true, "13 -> 12");

    await client.query(
      `INSERT INTO public.item_ledger (user_id, item_key, amount, reason, idempotency)
       VALUES ($1, 'pokeball', 1, 'STREAM_ATTENDANCE', 'stream-ball:synthetic:d55')`,
      [TRAINER]
    );
    await client.query(`UPDATE public.inventories SET pokeball = pokeball + 1 WHERE user_id = $1`, [TRAINER]);
    inv = await bag(client);
    rows = await ledger(client);
    assert(inv.pokeball === 13 && rows.length === 2);
    assert(rows.some((row) => row.reason === "BAG_SPEND" && row.amount === -1));
    assert(rows.some((row) => row.reason === "STREAM_ATTENDANCE" && row.amount === 1));
    record("attendance +1 stays a separate ledger row", true);

    const ownedBeforeReplay = (await bag(client)).pokeball;
    await client.query(`SELECT private.announce_throws($1::uuid)`, [ROUND]);
    inv = await bag(client);
    rows = await ledger(client);
    assert(inv.pokeball === ownedBeforeReplay && rows.filter((row) => row.reason === "BAG_SPEND").length === 1);
    record("replaying an owned throw does not spend again", true);

    await resetRound(client, 13);
    decision = await chooseAndAnnounce(client, "pokeball", 13, 13, "Escaped");
    assert(decision.spends === true);
    inv = await bag(client);
    rows = await ledger(client);
    state = await player(client);
    assert(inv.pokeball === 12 && rows.length === 1 && state.result === "Escaped");
    record("an owned escape spends the same way as a catch", true);

    await resetRound(client, 0);
    decision = await chooseAndAnnounce(client, "pokeball", 0, 0, "Caught");
    assert(decision.borrowed === true && decision.spends === false);
    inv = await bag(client);
    rows = await ledger(client);
    state = await player(client);
    assert(inv.pokeball === 0 && rows.length === 0);
    assert(state.result_reason === "standard_throw" && state.throw_processed === true && state.result === "Caught");
    record("a borrowed catch with no owned ball writes no debit", true);

    await client.query(`SELECT private.announce_throws($1::uuid)`, [ROUND]);
    inv = await bag(client);
    rows = await ledger(client);
    assert(inv.pokeball === 0 && rows.length === 0);
    record("replaying a borrowed throw still writes no debit", true);

    await resetRound(client, 0);
    decision = await chooseAndAnnounce(client, "standard", 0, 0, "Escaped");
    assert(decision.borrowed === true);
    inv = await bag(client);
    state = await player(client);
    assert(inv.pokeball === 0 && (await ledger(client)).length === 0 && state.result === "Escaped");
    record("a borrowed escape with no owned ball writes no debit", true);

    await resetRound(client, 5);
    decision = await chooseAndAnnounce(client, "standard", 5, 5, "Caught");
    assert(decision.borrowed === true && decision.spends === false);
    inv = await bag(client);
    assert(inv.pokeball === 5 && (await ledger(client)).length === 0);
    record("the live standard item stays a free safety-net mark", true, "qty 5 unchanged");

    await resetRound(client, 0);
    await client.query(
      `UPDATE public.encounter_players
       SET ball = 'pokeball', result_reason = NULL, throw_processed = false
       WHERE round_id = $1`,
      [ROUND]
    );
    await client.query(`SELECT private.announce_throws($1::uuid)`, [ROUND]);
    state = await player(client);
    assert(state.result_reason === "no_ball_left" && state.throw_processed === true);
    assert((await bag(client)).pokeball === 0 && (await ledger(client)).length === 0);
    record("an empty owned throw becomes no_ball_left and writes no debit", true);

    await resetRound(client, 4);
    await client.query(`
      CREATE FUNCTION public.rehearsal_reject_ledger()
      RETURNS trigger LANGUAGE plpgsql AS $fn$
      BEGIN
        IF NEW.reason = 'BAG_SPEND' THEN
          RAISE EXCEPTION 'injected ledger failure';
        END IF;
        RETURN NEW;
      END;
      $fn$
    `);
    await client.query(`
      CREATE TRIGGER rehearsal_reject_ledger
      BEFORE INSERT ON public.item_ledger
      FOR EACH ROW EXECUTE FUNCTION public.rehearsal_reject_ledger()
    `);
    await client.query(
      `UPDATE public.encounter_players
       SET ball = 'pokeball', result_reason = NULL, throw_processed = false, result = 'Caught'
       WHERE round_id = $1`,
      [ROUND]
    );
    let ledgerFailed = false;
    try {
      await client.query(`SELECT private.announce_throws($1::uuid)`, [ROUND]);
    } catch (error) {
      ledgerFailed = /injected ledger failure/.test(error.message);
    }
    assert(ledgerFailed);
    inv = await bag(client);
    state = await player(client);
    assert(inv.pokeball === 4 && (await ledger(client)).length === 0);
    assert(state.throw_processed === false && state.result_reason == null);
    await client.query("DROP TRIGGER rehearsal_reject_ledger ON public.item_ledger");
    record("a ledger insert failure aborts and does not become no_ball_left", true);

    await client.query(`
      CREATE OR REPLACE FUNCTION private.extra_ball_keys()
      RETURNS text[] LANGUAGE sql AS $$ SELECT ARRAY['duskball']::text[] $$
    `);
    await client.query(
      `UPDATE public.inventories SET balls = '{"duskball":1}'::jsonb WHERE user_id = $1`,
      [TRAINER]
    );
    clientB = cluster.getPgClient(DB_MAIN, HOST);
    await clientB.connect();
    await client.query("BEGIN");
    await client.query(`SELECT private.spend_bag_item($1, 'duskball')`, [TRAINER]);
    const pending = clientB.query("BEGIN").then(() => clientB.query(
      `SELECT private.spend_bag_item($1, 'duskball')`,
      [TRAINER]
    ));
    await client.query("COMMIT");
    let secondRejected = false;
    try {
      await pending;
    } catch (error) {
      secondRejected = /no duskball left/i.test(error.message);
    }
    assert(secondRejected);
    await clientB.query("ROLLBACK");
    inv = await bag(client);
    rows = await ledger(client);
    assert(Number(inv.balls.duskball) === 0);
    assert(rows.filter((row) => row.item_key === "duskball" && row.amount === -1).length === 1);
    record("two overlapping extra-ball spends consume one item and one ledger row", true);

    const failed = results.filter((row) => !row.passed);
    console.log(`\n${results.filter((row) => row.passed).length}/${results.length} REAL SQL checks passed`);
    console.log("CLASS: REAL SQL on disposable loopback Postgres. Not a browser test. Not production.");
    if (failed.length) process.exitCode = 1;
  } finally {
    try { if (clientB) await clientB.end(); } catch (_) { /* ignore */ }
    try { if (client) await client.end(); } catch (_) { /* ignore */ }
    try { if (admin) await admin.end(); } catch (_) { /* ignore */ }
    try { if (cluster) await cluster.stop(); } catch (_) { /* ignore */ }
    try { fs.rmSync(path.join(CACHE, "d55-data"), { recursive: true, force: true }); } catch (_) { /* ignore */ }
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("D55 REHEARSAL FAILED:", error.message);
    process.exit(1);
  });
}
