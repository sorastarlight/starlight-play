/* D66 insert-authority and outbox lifecycle.
 * Disposable LOCAL cluster only. Synthetic trainers only.
 * Does not read hosted URLs. Does not apply SQL to production.
 * note/reconcile/deliver are a simulated integration, not settlement.
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
const ROLLBACK = path.join(ROOT, "supabase", "unapplied", "d66-mastery", "rollback-before-activation.sql");
const HOST = "127.0.0.1";
const PORT = 55441;
const USER = "postgres";
const PASSWORD = "d66-mastery-local-only";
const DB_MAIN = "d66_mastery";
const A = "aaaaaaaa-0000-4000-8000-000000000066";
const B = "bbbbbbbb-0000-4000-8000-000000000066";

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

const FIXTURE = `
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS private;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
END $$;
GRANT USAGE ON SCHEMA auth, public TO authenticated, anon;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, anon;
CREATE TABLE public.profiles (id uuid PRIMARY KEY);
CREATE TABLE public.encounter_rounds (
  id uuid PRIMARY KEY,
  dex integer,
  rules jsonb NOT NULL DEFAULT '{}'::jsonb
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
CREATE TABLE public.capture_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  round_id uuid,
  user_id uuid,
  dex integer,
  success boolean
);
CREATE TABLE public.species_mastery (
  user_id uuid NOT NULL,
  dex integer NOT NULL,
  points integer NOT NULL DEFAULT 0,
  rank integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, dex)
);
CREATE TABLE public.mastery_ledger (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid,
  dex integer,
  amount integer,
  idempotency text
);
CREATE FUNCTION private.round_is_test(p_round uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT coalesce((SELECT rules->>'rewardMode' FROM public.encounter_rounds WHERE id = p_round), 'live') = 'test'
     AND coalesce((SELECT rules->>'testRewards' FROM public.encounter_rounds WHERE id = p_round), '') IS DISTINCT FROM 'true'
$$;
INSERT INTO public.profiles (id) VALUES ('${A}'), ('${B}');
INSERT INTO public.species_mastery (user_id, dex, points, rank) VALUES ('${A}', 1, 7, 2);
INSERT INTO public.mastery_ledger (user_id, dex, amount, idempotency)
VALUES ('${A}', 1, 1, 'mastery-catch:d66-fixture');
`;

async function specimen(client, opts) {
  const trainer = opts.trainer;
  const dex = opts.dex;
  const round = crypto.randomUUID();
  const catchId = crypto.randomUUID();
  let source = opts.source;
  if (source === undefined) source = `play:${round}:${trainer}`;
  const rules = opts.test ? { rewardMode: "test" } : { rewardMode: "live" };
  await client.query(
    "INSERT INTO public.encounter_rounds (id, dex, rules) VALUES ($1, $2, $3::jsonb)",
    [round, dex, JSON.stringify(rules)]
  );
  const useClock = opts.caughtAt === undefined;
  const values = [catchId, trainer, dex, opts.variant || "normal", source, round, opts.method || "CAPTURE"];
  if (!useClock) values.push(opts.caughtAt);
  await client.query(
    `INSERT INTO public.catches
      (id, user_id, dex, variant, gender, source_key, round_id, obtained_method, caught_at)
     VALUES ($1, $2, $3, $4, 'Unknown', $5, $6, $7, ${useClock ? "clock_timestamp()" : "$8::timestamptz"})`,
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

async function progress(client, trainer) {
  await client.query("BEGIN");
  try {
    await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [trainer]);
    await client.query("SET LOCAL ROLE authenticated");
    const { rows } = await client.query(
      "SELECT dex, eligible_captures, tier_name FROM public.species_mastery_progress ORDER BY dex"
    );
    await client.query("COMMIT");
    return rows;
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch (_) { /* ignore */ }
    throw error;
  }
}

async function main() {
  let admin;
  let client;
  let clientB = null;
  let cluster = null;
  refuseHosted();
  console.log(`D66 MASTERY REHEARSAL TARGET: ${HOST}:${PORT}/${DB_MAIN} (embedded local; NOT supabase)`);
  const embedPath = path.join(CACHE, "node_modules", "embedded-postgres", "dist", "index.js");
  if (!fs.existsSync(embedPath)) throw new Error("embedded-postgres missing under tools/.cache/d54-pg-harness");
  const EmbeddedPostgres = (await import(pathToFileURL(embedPath).href)).default;
  const dataDir = path.join(CACHE, "d66-data");
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
      if (/ERROR|FATAL|PANIC/i.test(text) && !/mastery |insertion authority|capture timestamp|permission denied|duplicate key|injected /i.test(text)) {
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
    await applyFile(client, DRAFT64);
    await applyFile(client, DRAFT65);
    await applyFile(client, DRAFT66);
    await applyFile(client, ROLLBACK);
    const rolled = await client.query(
      `SELECT to_regclass('private.catch_insert_authority') AS authority,
              (SELECT count(*)::int FROM public.catches) AS catches,
              (SELECT points FROM public.species_mastery WHERE user_id = $1) AS points`,
      [A]
    );
    assert(rolled.rows[0].authority == null && rolled.rows[0].catches === 0 && rolled.rows[0].points === 7);
    record("inactive empty draft rolls back without touching points", true);
    await applyFile(client, DRAFT64);
    await applyFile(client, DRAFT65);
    const orphan = await specimen(client, { trainer: A, dex: 1, caughtAt: "2099-01-01T00:00:00Z" });
    await applyFile(client, DRAFT66);
    await client.query("GRANT USAGE ON SCHEMA private TO authenticated, anon");

    const before = await expectFail(client, "SELECT private.record_species_mastery_event($1::uuid)", [orphan.catchId]);
    assert(/recording is not active/.test(before.message));
    await client.query("SELECT private.activate_species_mastery_events()");
    const again = await expectFail(client, "SELECT private.activate_species_mastery_events()");
    assert(/already activated/.test(again.message));
    const old = await expectFail(client, "SELECT private.record_species_mastery_event($1::uuid)", [orphan.catchId]);
    assert(/not server-authoritative|specimen predates activation/.test(old.message));
    const forgedAuthority = await expectFail(
      client,
      "INSERT INTO private.catch_insert_authority (catch_id, inserted_at) VALUES ($1, clock_timestamp())",
      [orphan.catchId]
    );
    assert(/recorded with the specimen/.test(forgedAuthority.message));
    const rewritten = await expectFail(
      client,
      "UPDATE public.catches SET caught_at = clock_timestamp() WHERE id = $1",
      [orphan.catchId]
    );
    assert(/capture timestamp is immutable/.test(rewritten.message));
    const stillForged = await client.query("SELECT caught_at FROM public.catches WHERE id = $1", [orphan.catchId]);
    assert(new Date(stillForged.rows[0].caught_at).getUTCFullYear() === 2099);
    record("historical capture is rejected after activation", true, "no authority row");
    record("manipulated timestamp does not create eligibility", true, "caught_at stayed in 2099");

    const fresh = await specimen(client, { trainer: A, dex: 1, variant: "shiny", caughtAt: "2001-06-01T00:00:00Z" });
    const recorded = await client.query(
      "SELECT private.record_species_mastery_event($1::uuid) AS id",
      [fresh.catchId]
    );
    assert(recorded.rows[0].id === fresh.catchId);
    const stored = await client.query(
      `SELECT c.caught_at, c.variant, a.inserted_at
       FROM public.catches c
       JOIN private.catch_insert_authority a ON a.catch_id = c.id
       WHERE c.id = $1`,
      [fresh.catchId]
    );
    assert(new Date(stored.rows[0].caught_at).getUTCFullYear() === 2001);
    assert(stored.rows[0].variant === "shiny");
    assert(new Date(stored.rows[0].inserted_at).getUTCFullYear() >= 2026);
    await client.query(
      "UPDATE public.catches SET caught_at = caught_at, dex = dex WHERE id = $1",
      [fresh.catchId]
    );
    const rows = await progress(client, A);
    assert(rows[0].tier_name === "Familiar" && Number(rows[0].eligible_captures) === 1);
    record("normal post-activation capture is accepted", true, "display timestamp was not rewritten");

    for (let i = 0; i < 30; i += 1) {
      const kind = i % 3;
      if (kind === 0) await specimen(client, { trainer: A, dex: 4, source: `grant:${crypto.randomUUID()}:${A}` });
      else if (kind === 1) await specimen(client, { trainer: A, dex: 4, test: true });
      else await specimen(client, { trainer: A, dex: 4, success: false });
    }
    const good = await specimen(client, { trainer: A, dex: 25 });
    const queued = await client.query("SELECT private.reconcile_species_mastery_outbox(1) AS n");
    assert(Number(queued.rows[0].n) === 1);
    const onlyGood = await client.query(
      "SELECT catch_id, status FROM private.species_mastery_outbox WHERE status = 'pending'"
    );
    assert(onlyGood.rows.length === 1 && onlyGood.rows[0].catch_id === good.catchId);
    record("invalid rows do not crowd reconciliation", true, "30 rejected shapes left the one play catch");

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
    const firstTry = await client.query("SELECT private.deliver_species_mastery_outbox(5) AS n");
    assert(Number(firstTry.rows[0].n) === 0);
    const waiting = await client.query(
      "SELECT status, attempts FROM private.species_mastery_outbox WHERE catch_id = $1",
      [good.catchId]
    );
    assert(waiting.rows[0].status === "pending" && waiting.rows[0].attempts === 1);
    const kept = await client.query("SELECT count(*)::int AS n FROM public.catches WHERE id = $1", [good.catchId]);
    assert(kept.rows[0].n === 1);
    await client.query("DROP TRIGGER rehearsal_fail_mastery ON public.species_mastery_events");
    const secondTry = await client.query("SELECT private.deliver_species_mastery_outbox(5) AS n");
    assert(Number(secondTry.rows[0].n) === 1);
    record("transient delivery error retries without losing the specimen", true);

    const tired = await specimen(client, { trainer: A, dex: 39 });
    await client.query("SELECT private.enqueue_species_mastery_event($1::uuid)", [tired.catchId]);
    await client.query(`
      CREATE TRIGGER rehearsal_fail_mastery
      BEFORE INSERT ON public.species_mastery_events
      FOR EACH ROW EXECUTE FUNCTION public.rehearsal_fail_mastery()
    `);
    for (let i = 0; i < 8; i += 1) {
      await client.query("SELECT private.deliver_species_mastery_outbox(1)");
    }
    const exhausted = await client.query(
      "SELECT status, attempts FROM private.species_mastery_outbox WHERE catch_id = $1",
      [tired.catchId]
    );
    assert(exhausted.rows[0].status === "exhausted" && exhausted.rows[0].attempts === 8);
    await client.query("DROP TRIGGER rehearsal_fail_mastery ON public.species_mastery_events");
    const stopped = await client.query("SELECT private.deliver_species_mastery_outbox(5) AS n");
    assert(Number(stopped.rows[0].n) === 0);
    await client.query("SELECT private.requeue_species_mastery_outbox($1::uuid)", [tired.catchId]);
    const recovered = await client.query("SELECT private.deliver_species_mastery_outbox(5) AS n");
    assert(Number(recovered.rows[0].n) === 1);
    record("retry limit leaves an observable exhausted row that can be requeued", true);

    const grant = await specimen(client, { trainer: A, dex: 4, source: `import:${crypto.randomUUID()}:${A}` });
    await client.query(
      "INSERT INTO private.species_mastery_outbox (catch_id) VALUES ($1)",
      [grant.catchId]
    );
    const rejected = await client.query("SELECT private.deliver_species_mastery_outbox(5) AS n");
    assert(Number(rejected.rows[0].n) === 0);
    const grantState = await client.query(
      "SELECT status FROM private.species_mastery_outbox WHERE catch_id = $1",
      [grant.catchId]
    );
    assert(grantState.rows[0].status === "rejected");
    const grantEvent = await client.query(
      "SELECT count(*)::int AS n FROM public.species_mastery_events WHERE catch_id = $1",
      [grant.catchId]
    );
    assert(grantEvent.rows[0].n === 0);
    record("ineligible work is permanently rejected", true, "import source");

    clientB = cluster.getPgClient(DB_MAIN, HOST);
    await clientB.connect();
    await clientB.query("SET statement_timeout = '20s'");
    const race = await specimen(client, { trainer: A, dex: 52 });
    await client.query("SELECT private.enqueue_species_mastery_event($1::uuid)", [race.catchId]);
    await client.query("BEGIN");
    const firstDeliver = await client.query("SELECT private.deliver_species_mastery_outbox(5) AS n");
    assert(Number(firstDeliver.rows[0].n) === 1);
    const otherDeliver = clientB.query("SELECT private.deliver_species_mastery_outbox(5) AS n");
    await new Promise((resolve) => setTimeout(resolve, 200));
    await client.query("COMMIT");
    const secondDeliver = await otherDeliver;
    assert(Number(secondDeliver.rows[0].n) === 0);
    const raceEvents = await client.query(
      "SELECT count(*)::int AS n FROM public.species_mastery_events WHERE catch_id = $1",
      [race.catchId]
    );
    assert(raceEvents.rows[0].n === 1);
    record("concurrent delivery records one event", true);

    const other = await specimen(client, { trainer: B, dex: 1 });
    await client.query("SELECT private.record_species_mastery_event($1::uuid)", [other.catchId]);
    const seenB = await progress(client, B);
    await client.query("BEGIN");
    await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [B]);
    await client.query("SET LOCAL ROLE authenticated");
    const leaked = await client.query(
      "SELECT count(*)::int AS n FROM public.species_mastery_events WHERE trainer_id = $1",
      [A]
    );
    const denied = await expectFail(client, "SELECT private.pause_species_mastery_delivery()");
    await client.query("ROLLBACK");
    assert(seenB.length === 1 && leaked.rows[0].n === 0 && denied.code === "42501");
    record("cross-trainer isolation and client lifecycle calls", true);

    const pausedCatch = await specimen(client, { trainer: A, dex: 63 });
    await client.query("SELECT private.enqueue_species_mastery_event($1::uuid)", [pausedCatch.catchId]);
    await client.query("SELECT private.pause_species_mastery_delivery()");
    const paused = await client.query("SELECT private.deliver_species_mastery_outbox(5) AS n");
    assert(Number(paused.rows[0].n) === 0);
    const stillPending = await client.query(
      "SELECT status FROM private.species_mastery_outbox WHERE catch_id = $1",
      [pausedCatch.catchId]
    );
    assert(stillPending.rows[0].status === "pending");
    await client.query("SELECT private.resume_species_mastery_delivery()");
    const resumed = await client.query("SELECT private.deliver_species_mastery_outbox(5) AS n");
    assert(Number(resumed.rows[0].n) === 1);
    const sameClock = await client.query("SELECT activated_at, lifecycle FROM private.species_mastery_activation");
    assert(sameClock.rows[0].lifecycle === "active");
    record("paused delivery keeps the pending event and resumes the same cutoff", true);

    const drainCatch = await specimen(client, { trainer: A, dex: 77 });
    const holdCatch = await specimen(client, { trainer: A, dex: 79 });
    await client.query("SELECT private.enqueue_species_mastery_event($1::uuid)", [drainCatch.catchId]);
    await client.query("SELECT private.enqueue_species_mastery_event($1::uuid)", [holdCatch.catchId]);
    await client.query("SELECT private.begin_species_mastery_drain()");
    const duringDrain = await specimen(client, { trainer: A, dex: 80 });
    await client.query("BEGIN");
    const noted = await client.query(
      "SELECT private.note_species_mastery_catch($1::uuid) AS ok",
      [duringDrain.catchId]
    );
    assert(noted.rows[0].ok === false);
    await client.query("COMMIT");
    const drainPass = await client.query("SELECT private.deliver_species_mastery_outbox(1) AS n");
    assert(Number(drainPass.rows[0].n) === 1);
    const held = await client.query(
      "SELECT status FROM private.species_mastery_outbox WHERE catch_id = $1",
      [holdCatch.catchId]
    );
    assert(held.rows[0].status === "pending");
    await client.query("SELECT private.close_species_mastery_activation()");
    const closed = await client.query("SELECT private.deliver_species_mastery_outbox(5) AS n");
    assert(Number(closed.rows[0].n) === 0);
    const heldAfter = await client.query(
      `SELECT o.status,
              (SELECT count(*)::int FROM public.species_mastery_events e WHERE e.catch_id = o.catch_id) AS events,
              (SELECT count(*)::int FROM public.catches c WHERE c.id = o.catch_id) AS catches
       FROM private.species_mastery_outbox o WHERE o.catch_id = $1`,
      [holdCatch.catchId]
    );
    assert(heldAfter.rows[0].status === "pending" && heldAfter.rows[0].events === 0 && heldAfter.rows[0].catches === 1);
    const reopen = await expectFail(client, "SELECT private.activate_species_mastery_events()");
    const unpause = await expectFail(client, "SELECT private.resume_species_mastery_delivery()");
    assert(/already activated/.test(reopen.message) && /only from a pause/.test(unpause.message));
    record("drain finishes queued work and permanent close preserves the rest", true);

    const points = await client.query(
      "SELECT points, rank FROM public.species_mastery WHERE user_id = $1 AND dex = 1",
      [A]
    );
    const shiny = await client.query("SELECT variant, caught_at FROM public.catches WHERE id = $1", [fresh.catchId]);
    assert(points.rows[0].points === 7 && points.rows[0].rank === 2);
    assert(shiny.rows[0].variant === "shiny");
    assert(new Date(shiny.rows[0].caught_at).getUTCFullYear() === 2001);
    record("points mastery and specimens stay unchanged", true, "points 7 rank 2");

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
    try { fs.rmSync(path.join(CACHE, "d66-data"), { recursive: true, force: true }); } catch (_) { /* ignore */ }
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("D66 REHEARSAL FAILED:", error.message);
    process.exit(1);
  });
}
