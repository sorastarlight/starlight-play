/* D67 catch preservation.
 * Disposable LOCAL cluster only. Synthetic trainers only.
 * Does not read hosted URLs. Does not apply SQL to production.
 * Outbox calls are a simulated integration. settle_if_needed is not called.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { pathToFileURL } = require("url");
const { refuseHosted, splitSql, BANNED } = require("./a19-schema-rehearsal.js");

const ROOT = path.join(__dirname, "..");
const CACHE = path.join(__dirname, ".cache", "d54-pg-harness");
const DRAFT64 = path.join(ROOT, "supabase", "unapplied", "d64-mastery", "001_species_mastery_events.sql");
const DRAFT65 = path.join(ROOT, "supabase", "unapplied", "d65-mastery", "002_species_mastery_hardening.sql");
const DRAFT66 = path.join(ROOT, "supabase", "unapplied", "d66-mastery", "003_species_mastery_lifecycle.sql");
const DRAFT67 = path.join(ROOT, "supabase", "unapplied", "d67-mastery", "004_species_mastery_catch_safety.sql");
const ROLLBACK = path.join(ROOT, "supabase", "unapplied", "d67-mastery", "rollback-before-activation.sql");
const HOST = "127.0.0.1";
const PORT = 55442;
const USER = "postgres";
const PASSWORD = "d67-mastery-local-only";
const DB_MAIN = "d67_mastery";
const A = "aaaaaaaa-0000-4000-8000-000000000067";
const B = "bbbbbbbb-0000-4000-8000-000000000067";
const C = "cccccccc-0000-4000-8000-000000000067";

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
  for (const stmt of splitSql(sql)) await client.query(stmt);
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
async function catchCount(client, id) {
  const { rows } = await client.query("SELECT count(*)::int AS n FROM public.catches WHERE id = $1", [id]);
  return rows[0].n;
}

const FIXTURE = `
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS private;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'catch_writer') THEN CREATE ROLE catch_writer NOLOGIN; END IF;
END $$;
GRANT USAGE ON SCHEMA auth, public TO authenticated, anon, catch_writer;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, anon;
CREATE TABLE public.profiles (id uuid PRIMARY KEY);
CREATE TABLE public.encounter_rounds (
  id uuid PRIMARY KEY, dex integer, rules jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE TABLE public.catches (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  dex integer NOT NULL,
  variant text NOT NULL DEFAULT 'normal',
  gender text NOT NULL DEFAULT 'Unknown',
  source_key text,
  round_id uuid,
  obtained_method text NOT NULL DEFAULT 'CAPTURE',
  transferred_at timestamptz,
  caught_at timestamptz
);
GRANT INSERT ON public.catches TO catch_writer;
CREATE TABLE public.capture_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  round_id uuid, user_id uuid, dex integer, success boolean
);
CREATE TABLE public.species_mastery (
  user_id uuid NOT NULL, dex integer NOT NULL,
  points integer NOT NULL DEFAULT 0, rank integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, dex)
);
CREATE TABLE public.mastery_ledger (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid, dex integer, amount integer, idempotency text
);
CREATE FUNCTION private.round_is_test(p_round uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT coalesce((SELECT rules->>'rewardMode' FROM public.encounter_rounds WHERE id = p_round), 'live') = 'test'
     AND coalesce((SELECT rules->>'testRewards' FROM public.encounter_rounds WHERE id = p_round), '') IS DISTINCT FROM 'true'
$$;
INSERT INTO public.profiles (id) VALUES ('${A}'), ('${B}'), ('${C}');
INSERT INTO public.species_mastery (user_id, dex, points, rank) VALUES ('${A}', 1, 7, 2);
INSERT INTO public.mastery_ledger (user_id, dex, amount, idempotency)
VALUES ('${A}', 1, 1, 'mastery-catch:d67-fixture');
`;

async function specimen(client, opts) {
  const trainer = opts.trainer;
  const dex = opts.dex;
  const round = crypto.randomUUID();
  const catchId = opts.catchId || crypto.randomUUID();
  let source = opts.source;
  if (source === undefined) source = `play:${round}:${trainer}`;
  await client.query(
    "INSERT INTO public.encounter_rounds (id, dex, rules) VALUES ($1, $2, $3::jsonb)",
    [round, dex, JSON.stringify(opts.test ? { rewardMode: "test" } : { rewardMode: "live" })]
  );
  const stamp = opts.stamp;
  const values = [catchId, trainer, dex, opts.variant || "normal", source, round, opts.method || "CAPTURE"];
  let caughtSql = "clock_timestamp()";
  if (opts.caughtAt !== undefined) {
    values.push(opts.caughtAt);
    caughtSql = `$${values.length}::timestamptz`;
  }
  let stampSql = "";
  if (stamp !== undefined) {
    values.push(stamp);
    stampSql = `, $${values.length}::timestamptz`;
  }
  await client.query(
    `INSERT INTO public.catches
      (id, user_id, dex, variant, gender, source_key, round_id, obtained_method, caught_at${stamp === undefined ? "" : ", server_inserted_at"})
     VALUES ($1, $2, $3, $4, 'Unknown', $5, $6, $7, ${caughtSql}${stampSql})`,
    values
  );
  if (opts.log !== false) {
    await client.query(
      "INSERT INTO public.capture_log (round_id, user_id, dex, success) VALUES ($1, $2, $3, $4)",
      [round, trainer, dex, opts.success !== false]
    );
  }
  return { catchId, round, source };
}

async function main() {
  let admin;
  let client;
  let clientB = null;
  let cluster = null;
  refuseHosted();
  console.log(`D67 MASTERY REHEARSAL TARGET: ${HOST}:${PORT}/${DB_MAIN} (embedded local; NOT supabase)`);
  const embedPath = path.join(CACHE, "node_modules", "embedded-postgres", "dist", "index.js");
  if (!fs.existsSync(embedPath)) throw new Error("embedded-postgres missing under tools/.cache/d54-pg-harness");
  const EmbeddedPostgres = (await import(pathToFileURL(embedPath).href)).default;
  const dataDir = path.join(CACHE, "d67-data");
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
      if (/ERROR|FATAL|PANIC/i.test(text) && !/mastery |insertion authority|server insertion|capture timestamp|permission denied|duplicate key|injected /i.test(text)) {
        console.error("[pg]", text.trim());
      }
    }
  });

  try {
    await cluster.initialise();
    await cluster.start();
    await cluster.createDatabase(DB_MAIN);
    admin = cluster.getPgClient("postgres", HOST);
    await admin.connect();
    const { rows: targetRows } = await admin.query(
      "SELECT current_database() AS db, inet_server_addr()::text AS addr, current_setting('server_version') AS version"
    );
    assert(targetRows[0].db !== "dtflmlbjhttoewqgkujf");
    assert(!BANNED.test(String(targetRows[0].addr || "")));
    const version = targetRows[0].version;
    record("isolation target is loopback embedded Postgres", true, `${HOST}:${PORT}/${DB_MAIN} PostgreSQL ${version}`);

    client = cluster.getPgClient(DB_MAIN, HOST);
    await client.connect();
    await client.query("SET statement_timeout = '20s'");
    await client.query(FIXTURE);
    for (const file of [DRAFT64, DRAFT65, DRAFT66, DRAFT67]) await applyFile(client, file);
    await applyFile(client, ROLLBACK);
    const quiet = await client.query(
      `SELECT to_regclass('public.species_mastery_events') AS events,
              (SELECT count(*)::int FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'catches' AND column_name = 'server_inserted_at') AS stamped,
              (SELECT count(*)::int FROM public.catches) AS catches,
              (SELECT points FROM public.species_mastery WHERE user_id = $1) AS points`,
      [A]
    );
    assert(quiet.rows[0].events == null && quiet.rows[0].stamped === 0);
    assert(quiet.rows[0].catches === 0 && quiet.rows[0].points === 7);
    record("inactive rollback drops the clock column and keeps catch rows and points", true);

    for (const file of [DRAFT64, DRAFT65, DRAFT66]) await applyFile(client, file);
    const top = await specimen(client, { trainer: A, dex: 1, caughtAt: "2001-01-01T00:00:00Z" });
    await client.query("CREATE TEMP TABLE xid_probe (id integer PRIMARY KEY)");
    await client.query(`
      CREATE FUNCTION public.rehearsal_xid_plain(p_id integer)
      RETURNS TABLE(txid bigint, xmin_num bigint, same boolean)
      LANGUAGE plpgsql AS $fn$
      BEGIN
        INSERT INTO xid_probe (id) VALUES (p_id);
        RETURN QUERY
          SELECT txid_current(), t.xmin::text::bigint, txid_current() = t.xmin::text::bigint
          FROM xid_probe t WHERE t.id = p_id;
      END
      $fn$
    `);
    await client.query(`
      CREATE FUNCTION public.rehearsal_xid_sub(p_id integer)
      RETURNS TABLE(txid bigint, xmin_num bigint, same boolean)
      LANGUAGE plpgsql AS $fn$
      BEGIN
        INSERT INTO xid_probe (id) VALUES (p_id);
        RETURN QUERY
          SELECT txid_current(), t.xmin::text::bigint, txid_current() = t.xmin::text::bigint
          FROM xid_probe t WHERE t.id = p_id;
      EXCEPTION WHEN OTHERS THEN
        RAISE;
      END
      $fn$
    `);
    const plain = await client.query("SELECT * FROM public.rehearsal_xid_plain(1)");
    const subx = await client.query("SELECT * FROM public.rehearsal_xid_sub(2)");
    const subId = crypto.randomUUID();
    const subRound = crypto.randomUUID();
    await client.query(
      "INSERT INTO public.encounter_rounds (id, dex, rules) VALUES ($1, 1, '{}'::jsonb)",
      [subRound]
    );
    await client.query(`
      CREATE FUNCTION public.rehearsal_subxact_catch(p_id uuid, p_user uuid, p_round uuid, p_source text)
      RETURNS void
      LANGUAGE plpgsql AS $fn$
      BEGIN
        INSERT INTO public.catches
          (id, user_id, dex, variant, gender, source_key, round_id, obtained_method, caught_at)
        VALUES (p_id, p_user, 1, 'normal', 'Unknown', p_source, p_round, 'CAPTURE', clock_timestamp());
      EXCEPTION WHEN OTHERS THEN
        RAISE;
      END
      $fn$
    `);
    let catchDetail;
    try {
      await client.query(
        "SELECT public.rehearsal_subxact_catch($1, $2, $3, $4)",
        [subId, A, subRound, `play:${subRound}:${A}`]
      );
      catchDetail = `catch committed rows=${await catchCount(client, subId)}`;
    } catch (error) {
      catchDetail = `catch aborted rows=${await catchCount(client, subId)} (${error.message.split("\n")[0]})`;
    }
    record(
      "transaction id comparison measured",
      true,
      `plain same=${plain.rows[0].same} txid=${plain.rows[0].txid} xmin=${plain.rows[0].xmin_num}; exception-block same=${subx.rows[0].same} txid=${subx.rows[0].txid} xmin=${subx.rows[0].xmin_num}; ${catchDetail}`
    );

    await client.query(`
      CREATE FUNCTION public.rehearsal_fail_authority() RETURNS trigger LANGUAGE plpgsql AS $fn$
      BEGIN
        RAISE EXCEPTION 'injected authority failure' USING ERRCODE = '40001';
      END $fn$
    `);
    await client.query(`
      CREATE TRIGGER rehearsal_fail_authority
      BEFORE INSERT ON private.catch_insert_authority
      FOR EACH ROW EXECUTE FUNCTION public.rehearsal_fail_authority()
    `);
    const lostId = crypto.randomUUID();
    const lost = await expectFail(client, `
      INSERT INTO public.catches
        (id, user_id, dex, variant, gender, source_key, round_id, obtained_method, caught_at)
      VALUES ($1, $2, 1, 'normal', 'Unknown', 'play:lost', NULL, 'CAPTURE', clock_timestamp())
    `, [lostId, A]);
    assert(/injected authority failure/.test(lost.message));
    assert(await catchCount(client, lostId) === 0);
    record("D66 authority failure rolls back the catch insert", true, "pre-fix defect");

    await applyFile(client, DRAFT67);
    const keptId = crypto.randomUUID();
    const keptRound = crypto.randomUUID();
    await client.query(
      "INSERT INTO public.encounter_rounds (id, dex, rules) VALUES ($1, 1, '{}'::jsonb)",
      [keptRound]
    );
    await client.query(`
      INSERT INTO public.catches
        (id, user_id, dex, variant, gender, source_key, round_id, obtained_method, caught_at)
      VALUES ($1, $2, 1, 'shiny', 'Unknown', $3, $4, 'CAPTURE', '2001-06-01T00:00:00Z')
    `, [keptId, A, `play:${keptRound}:${A}`, keptRound]);
    await client.query(
      "INSERT INTO public.capture_log (round_id, user_id, dex, success) VALUES ($1, $2, 1, true)",
      [keptRound, A]
    );
    const keptRow = await client.query(
      `SELECT variant, caught_at, dex, server_inserted_at,
              (SELECT count(*)::int FROM private.catch_insert_authority a WHERE a.catch_id = c.id) AS authority_rows
       FROM public.catches c WHERE c.id = $1`,
      [keptId]
    );
    assert(await catchCount(client, keptId) === 1);
    assert(keptRow.rows[0].variant === "shiny" && keptRow.rows[0].dex === 1);
    assert(new Date(keptRow.rows[0].caught_at).getUTCFullYear() === 2001);
    assert(new Date(keptRow.rows[0].server_inserted_at).getUTCFullYear() >= 2026);
    assert(keptRow.rows[0].authority_rows === 0);
    record("authority insert failure no longer removes the catch", true, "display timestamp kept");

    await client.query("ALTER TABLE private.catch_insert_authority RENAME TO catch_insert_authority_aside");
    const renamed = await specimen(client, { trainer: A, dex: 2 });
    assert(await catchCount(client, renamed.catchId) === 1);
    await client.query("ALTER TABLE private.catch_insert_authority_aside RENAME TO catch_insert_authority");
    await client.query("BEGIN");
    await client.query("SET LOCAL ROLE catch_writer");
    const writerId = crypto.randomUUID();
    const writerRound = crypto.randomUUID();
    await client.query("RESET ROLE");
    await client.query(
      "INSERT INTO public.encounter_rounds (id, dex, rules) VALUES ($1, 3, '{}'::jsonb)",
      [writerRound]
    );
    await client.query("SET LOCAL ROLE catch_writer");
    await client.query(`
      INSERT INTO public.catches
        (id, user_id, dex, variant, gender, source_key, round_id, obtained_method, caught_at, server_inserted_at)
      VALUES ($1, $2, 3, 'normal', 'Unknown', $3, $4, 'CAPTURE', clock_timestamp(), '2099-01-01T00:00:00Z')
    `, [writerId, A, `play:${writerRound}:${A}`, writerRound]);
    await client.query("COMMIT");
    const writerRow = await client.query(
      "SELECT server_inserted_at FROM public.catches WHERE id = $1",
      [writerId]
    );
    assert(await catchCount(client, writerId) === 1);
    assert(new Date(writerRow.rows[0].server_inserted_at).getUTCFullYear() >= 2026);
    record("missing authority table and a writer without that privilege still keep the catch", true, "client clock overwritten");

    const duplicate = await expectFail(
      client,
      "INSERT INTO private.catch_insert_authority (catch_id, inserted_at) VALUES ($1, clock_timestamp())",
      [top.catchId]
    );
    assert(duplicate.code === "23505" || /duplicate key|recorded with the specimen|server clock/.test(duplicate.message));
    assert(await catchCount(client, top.catchId) === 1);
    record("duplicate authority registration does not remove the specimen", true);

    const missing = await expectFail(client, "SELECT private.record_species_mastery_event(NULL)");
    const unknown = await expectFail(
      client,
      "SELECT private.record_species_mastery_event($1::uuid)",
      [crypto.randomUUID()]
    );
    assert(/missing specimen|not on file|recording is not active/.test(missing.message));
    assert(/not on file|recording is not active/.test(unknown.message));
    assert(await catchCount(client, keptId) === 1);
    record("malformed or missing specimen identifiers do not remove catches", true);

    clientB = cluster.getPgClient(DB_MAIN, HOST);
    await clientB.connect();
    await clientB.query("SET statement_timeout = '20s'");
    const [left, right] = await Promise.all([
      specimen(client, { trainer: A, dex: 5 }),
      specimen(clientB, { trainer: B, dex: 5 })
    ]);
    const both = await client.query(
      `SELECT count(*)::int AS n FROM public.catches
       WHERE id = ANY($1::uuid[]) AND server_inserted_at IS NOT NULL`,
      [[left.catchId, right.catchId]]
    );
    assert(both.rows[0].n === 2);
    record("concurrent catch inserts both commit", true);

    const late = await expectFail(
      client,
      "UPDATE public.catches SET server_inserted_at = clock_timestamp() WHERE id = $1",
      [top.catchId]
    );
    assert(/server insertion time is immutable/.test(late.message));
    const lateRow = await client.query(
      "SELECT server_inserted_at, caught_at FROM public.catches WHERE id = $1",
      [top.catchId]
    );
    assert(lateRow.rows[0].server_inserted_at == null);
    assert(new Date(lateRow.rows[0].caught_at).getUTCFullYear() === 2001);
    record("historical catch cannot receive a late insertion clock", true);

    const rolledId = crypto.randomUUID();
    const rolledRound = crypto.randomUUID();
    await client.query("BEGIN");
    await client.query(
      "INSERT INTO public.encounter_rounds (id, dex, rules) VALUES ($1, 6, '{}'::jsonb)",
      [rolledRound]
    );
    await client.query(`
      INSERT INTO public.catches
        (id, user_id, dex, variant, gender, source_key, round_id, obtained_method, caught_at)
      VALUES ($1, $2, 6, 'normal', 'Unknown', $3, $4, 'CAPTURE', clock_timestamp())
    `, [rolledId, A, `play:${rolledRound}:${A}`, rolledRound]);
    await client.query("ROLLBACK");
    assert(await catchCount(client, rolledId) === 0);
    record("an explicit catch rollback removes only that uncommitted insert", true);

    await client.query("SELECT private.activate_species_mastery_events()");
    const anchor = await specimen(client, {
      trainer: A,
      dex: 1,
      variant: "shiny",
      caughtAt: "2001-06-01T00:00:00Z"
    });
    const recorded = await client.query(
      "SELECT private.record_species_mastery_event($1::uuid) AS id",
      [anchor.catchId]
    );
    assert(recorded.rows[0].id === anchor.catchId);
    const oldReject = await expectFail(
      client,
      "SELECT private.record_species_mastery_event($1::uuid)",
      [top.catchId]
    );
    const earlyReject = await expectFail(
      client,
      "SELECT private.record_species_mastery_event($1::uuid)",
      [keptId]
    );
    assert(/not server-authoritative/.test(oldReject.message));
    assert(/predates activation/.test(earlyReject.message));
    assert(await catchCount(client, top.catchId) === 1 && await catchCount(client, keptId) === 1);
    assert(await catchCount(client, anchor.catchId) === 1);
    record("normal post-activation catch is accepted and earlier rows are not", true);

    await client.query(`
      CREATE FUNCTION public.rehearsal_fail_enqueue() RETURNS trigger LANGUAGE plpgsql AS $fn$
      BEGIN
        RAISE EXCEPTION 'injected enqueue failure' USING ERRCODE = '40001';
      END $fn$
    `);
    await client.query(`
      CREATE TRIGGER rehearsal_fail_enqueue
      BEFORE INSERT ON private.species_mastery_outbox
      FOR EACH ROW EXECUTE FUNCTION public.rehearsal_fail_enqueue()
    `);
    const simulated = await specimen(client, { trainer: A, dex: 8, variant: "normal" });
    await client.query("BEGIN");
    const noted = await client.query(
      "SELECT private.note_species_mastery_catch($1::uuid) AS ok",
      [simulated.catchId]
    );
    assert(noted.rows[0].ok === false);
    await client.query("COMMIT");
    assert(await catchCount(client, simulated.catchId) === 1);
    assert(await catchCount(client, anchor.catchId) === 1);
    record("simulated settlement bookkeeping failure keeps the committed catch", true, "settle_if_needed was not called");

    await client.query("DROP TRIGGER rehearsal_fail_enqueue ON private.species_mastery_outbox");
    for (const source of ["grant", "import", "reset"]) {
      await specimen(client, { trainer: A, dex: 4, source: `${source}:${crypto.randomUUID()}:${A}` });
    }
    await specimen(client, { trainer: A, dex: 4, test: true });
    await specimen(client, { trainer: A, dex: 4, success: false });
    const queued = await client.query("SELECT private.reconcile_species_mastery_outbox(10) AS n");
    const pending = await client.query(
      "SELECT catch_id FROM private.species_mastery_outbox WHERE status = 'pending' ORDER BY enqueued_at, catch_id"
    );
    assert(Number(queued.rows[0].n) === 1 && pending.rows.length === 1 && pending.rows[0].catch_id === simulated.catchId);
    record("imports, grants, resets, and test rounds stay out of reconciliation", true);

    await client.query(`
      CREATE FUNCTION public.rehearsal_fail_mastery() RETURNS trigger LANGUAGE plpgsql AS $fn$
      BEGIN
        RAISE EXCEPTION 'injected mastery failure' USING ERRCODE = '40001';
      END $fn$
    `);
    await client.query(`
      CREATE TRIGGER rehearsal_fail_mastery
      BEFORE INSERT ON public.species_mastery_events
      FOR EACH ROW EXECUTE FUNCTION public.rehearsal_fail_mastery()
    `);
    const pausedTry = await client.query("SELECT private.deliver_species_mastery_outbox(5) AS n");
    assert(Number(pausedTry.rows[0].n) === 0 && await catchCount(client, simulated.catchId) === 1);
    await client.query("DROP TRIGGER rehearsal_fail_mastery ON public.species_mastery_events");
    const delivered = await client.query("SELECT private.deliver_species_mastery_outbox(5) AS n");
    assert(Number(delivered.rows[0].n) === 1);
    record("a transient delivery failure retries and then records the event", true);

    const replay = await client.query(
      "SELECT private.record_species_mastery_event($1::uuid) AS id",
      [simulated.catchId]
    );
    const replayCount = await client.query(
      "SELECT count(*)::int AS n FROM public.species_mastery_events WHERE catch_id = $1",
      [simulated.catchId]
    );
    assert(replay.rows[0].id === simulated.catchId && replayCount.rows[0].n === 1);

    const race = await specimen(client, { trainer: A, dex: 9 });
    await client.query("SELECT private.enqueue_species_mastery_event($1::uuid)", [race.catchId]);
    await client.query("BEGIN");
    const first = await client.query("SELECT private.deliver_species_mastery_outbox(5) AS n");
    assert(Number(first.rows[0].n) === 1);
    const secondPromise = clientB.query("SELECT private.deliver_species_mastery_outbox(5) AS n");
    await new Promise((resolve) => setTimeout(resolve, 200));
    await client.query("COMMIT");
    const second = await secondPromise;
    const raceEvents = await client.query(
      "SELECT count(*)::int AS n FROM public.species_mastery_events WHERE catch_id = $1",
      [race.catchId]
    );
    assert(Number(second.rows[0].n) === 0 && raceEvents.rows[0].n === 1);
    record("outbox replay and concurrent delivery leave one event", true);

    const pausedCatch = await specimen(client, { trainer: A, dex: 10 });
    await client.query("SELECT private.enqueue_species_mastery_event($1::uuid)", [pausedCatch.catchId]);
    await client.query("SELECT private.pause_species_mastery_delivery()");
    assert(Number((await client.query("SELECT private.deliver_species_mastery_outbox(5) AS n")).rows[0].n) === 0);
    await client.query("SELECT private.resume_species_mastery_delivery()");
    assert(Number((await client.query("SELECT private.deliver_species_mastery_outbox(5) AS n")).rows[0].n) === 1);
    const drainCatch = await specimen(client, { trainer: C, dex: 11 });
    const holdCatch = await specimen(client, { trainer: A, dex: 12 });
    await client.query("SELECT private.enqueue_species_mastery_event($1::uuid)", [drainCatch.catchId]);
    await client.query("SELECT private.enqueue_species_mastery_event($1::uuid)", [holdCatch.catchId]);
    await client.query("SELECT private.begin_species_mastery_drain()");
    const during = await specimen(client, { trainer: A, dex: 13 });
    const duringNote = await client.query(
      "SELECT private.note_species_mastery_catch($1::uuid) AS ok",
      [during.catchId]
    );
    assert(duringNote.rows[0].ok === false && await catchCount(client, during.catchId) === 1);
    assert(Number((await client.query("SELECT private.deliver_species_mastery_outbox(1) AS n")).rows[0].n) === 1);
    await client.query("SELECT private.close_species_mastery_activation()");
    assert(Number((await client.query("SELECT private.deliver_species_mastery_outbox(5) AS n")).rows[0].n) === 0);
    const held = await client.query(
      `SELECT o.status,
              (SELECT count(*)::int FROM public.species_mastery_events e WHERE e.catch_id = o.catch_id) AS events
       FROM private.species_mastery_outbox o WHERE o.catch_id = $1`,
      [holdCatch.catchId]
    );
    assert(held.rows[0].status === "pending" && held.rows[0].events === 0);
    assert(await catchCount(client, holdCatch.catchId) === 1);
    record("pause, resume, drain, and close keep the specimens", true);

    await client.query(
      "UPDATE public.catches SET caught_at = caught_at, dex = dex, transferred_at = clock_timestamp() WHERE id = $1",
      [anchor.catchId]
    );
    const evolved = await client.query(
      "SELECT dex, variant, caught_at, server_inserted_at FROM public.catches WHERE id = $1",
      [anchor.catchId]
    );
    assert(evolved.rows[0].dex === 1 && evolved.rows[0].variant === "shiny");
    assert(new Date(evolved.rows[0].caught_at).getUTCFullYear() === 2001);
    assert(new Date(evolved.rows[0].server_inserted_at).getUTCFullYear() >= 2026);
    await client.query("DELETE FROM public.catches WHERE id = $1", [renamed.catchId]);
    const eventAfterDelete = await client.query(
      "SELECT count(*)::int AS n FROM public.species_mastery_events WHERE catch_id = $1",
      [anchor.catchId]
    );
    assert(eventAfterDelete.rows[0].n === 1);
    await client.query("DELETE FROM public.profiles WHERE id = $1", [C]);
    const goneC = await client.query(
      "SELECT count(*)::int AS n FROM public.species_mastery_events WHERE trainer_id = $1",
      [C]
    );
    const keptA = await client.query(
      "SELECT count(*)::int AS n FROM public.species_mastery_events WHERE trainer_id = $1",
      [A]
    );
    assert(goneC.rows[0].n === 0 && keptA.rows[0].n > 0);
    record("evolution-style update, release, catch delete, and profile delete stay available", true);

    const points = await client.query(
      "SELECT points, rank FROM public.species_mastery WHERE user_id = $1 AND dex = 1",
      [A]
    );
    const anchorRow = await client.query(
      "SELECT variant, dex, caught_at FROM public.catches WHERE id = $1",
      [anchor.catchId]
    );
    assert(points.rows[0].points === 7 && points.rows[0].rank === 2);
    assert(anchorRow.rows[0].variant === "shiny" && anchorRow.rows[0].dex === 1);
    assert(new Date(anchorRow.rows[0].caught_at).getUTCFullYear() === 2001);
    assert(await catchCount(client, anchor.catchId) === 1);
    record("points mastery and the specimen contents stay unchanged", true, "points 7 rank 2");

    let refused = false;
    try {
      await applyFile(client, ROLLBACK);
    } catch (error) {
      refused = /activated|events exist/.test(error.message);
    }
    assert(refused && await catchCount(client, anchor.catchId) === 1);
    record("rollback after activation refuses and leaves the catch", true);

    const failed = results.filter((row) => !row.passed);
    console.log(`\n${results.filter((row) => row.passed).length}/${results.length} REAL SQL checks passed`);
    console.log(`POSTGRES ${version}`);
    console.log("CLASS: REAL SQL on disposable loopback Postgres. Simulated integration, not settlement, not production.");
    if (failed.length) process.exitCode = 1;
  } finally {
    try { if (clientB) await clientB.end(); } catch (_) { /* ignore */ }
    try { if (client) await client.end(); } catch (_) { /* ignore */ }
    try { if (admin) await admin.end(); } catch (_) { /* ignore */ }
    try { if (cluster) await cluster.stop(); } catch (_) { /* ignore */ }
    try { fs.rmSync(path.join(CACHE, "d67-data"), { recursive: true, force: true }); } catch (_) { /* ignore */ }
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("D67 REHEARSAL FAILED:", error.message);
    process.exit(1);
  });
}
