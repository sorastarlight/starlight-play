/* D71 integration design rehearsal.
 * Disposable LOCAL cluster only. Synthetic trainers only.
 * Does not read hosted URLs and does not call settle_if_needed.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { pathToFileURL } = require("url");
const { refuseHosted, splitSql, BANNED } = require("./a19-schema-rehearsal.js");

const ROOT = path.join(__dirname, "..");
const CACHE = path.join(__dirname, ".cache", "d54-pg-harness");
const FILES = [
  path.join(ROOT, "supabase", "unapplied", "d64-mastery", "001_species_mastery_events.sql"),
  path.join(ROOT, "supabase", "unapplied", "d65-mastery", "002_species_mastery_hardening.sql"),
  path.join(ROOT, "supabase", "unapplied", "d66-mastery", "003_species_mastery_lifecycle.sql"),
  path.join(ROOT, "supabase", "unapplied", "d67-mastery", "004_species_mastery_catch_safety.sql")
];
const HOST = "127.0.0.1";
const PORT = 55444;
const USER = "postgres";
const PASSWORD = "d71-mastery-local-only";
const A = "aaaaaaaa-0000-4000-8000-000000000071";

const results = [];
function record(name, passed, detail) {
  results.push({ name, passed, detail: detail || "" });
  console.log(`${passed ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}
function assert(cond, detail) {
  if (!cond) throw new Error(detail || "failed");
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
END $$;
GRANT USAGE ON SCHEMA auth, public TO authenticated, anon;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, anon;
CREATE TABLE public.profiles (id uuid PRIMARY KEY);
CREATE TABLE public.encounter_rounds (
  id uuid PRIMARY KEY, dex integer, rules jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE TABLE public.catches (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dex integer NOT NULL,
  variant text NOT NULL DEFAULT 'normal',
  gender text NOT NULL DEFAULT 'Unknown',
  source_key text,
  round_id uuid,
  obtained_method text NOT NULL DEFAULT 'CAPTURE',
  caught_at timestamptz,
  level integer,
  public_id text,
  iv_hp integer,
  friendship integer
);
CREATE TABLE public.capture_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  round_id uuid, user_id uuid, dex integer, success boolean
);
CREATE TABLE public.catch_present_log (catch_id uuid PRIMARY KEY);
CREATE TABLE public.trainer_xp (user_id uuid PRIMARY KEY, xp integer NOT NULL DEFAULT 0);
CREATE TABLE public.species_mastery (
  user_id uuid NOT NULL, dex integer NOT NULL,
  points integer NOT NULL DEFAULT 0, rank integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, dex)
);
CREATE FUNCTION private.round_is_test(p_round uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT coalesce((SELECT rules->>'rewardMode' FROM public.encounter_rounds WHERE id = p_round), 'live') = 'test'
     AND coalesce((SELECT rules->>'testRewards' FROM public.encounter_rounds WHERE id = p_round), '') IS DISTINCT FROM 'true'
$$;
CREATE FUNCTION private.stamp_catch_row(c public.catches) RETURNS public.catches
LANGUAGE plpgsql AS $fn$
BEGIN
  IF c.public_id IS NULL THEN c.public_id := 'LG' || substr(md5(c.id::text), 1, 8); END IF;
  IF c.level IS NULL THEN c.level := 5; END IF;
  IF c.friendship IS NULL THEN c.friendship := 0; END IF;
  RETURN c;
END $fn$;
CREATE FUNCTION private.catches_before_write() RETURNS trigger
LANGUAGE plpgsql AS $fn$
BEGIN
  IF NEW.id IS NULL THEN NEW.id := gen_random_uuid(); END IF;
  NEW := private.stamp_catch_row(NEW);
  RETURN NEW;
END $fn$;
CREATE TRIGGER catches_before_write
  BEFORE INSERT OR UPDATE OF dex, level, iv_hp ON public.catches
  FOR EACH ROW EXECUTE FUNCTION private.catches_before_write();
CREATE FUNCTION private.after_catch_present() RETURNS trigger
LANGUAGE plpgsql AS $fn$
BEGIN
  INSERT INTO public.catch_present_log (catch_id) VALUES (NEW.id);
  RETURN NULL;
END $fn$;
CREATE TRIGGER catches_after_present AFTER INSERT ON public.catches
  FOR EACH ROW EXECUTE FUNCTION private.after_catch_present();
CREATE FUNCTION private.after_catch_xp() RETURNS trigger
LANGUAGE plpgsql AS $fn$
BEGIN
  INSERT INTO public.trainer_xp (user_id, xp) VALUES (NEW.user_id, 1)
  ON CONFLICT (user_id) DO UPDATE SET xp = public.trainer_xp.xp + 1;
  RETURN NULL;
END $fn$;
CREATE TRIGGER catches_xp AFTER INSERT ON public.catches
  FOR EACH ROW EXECUTE FUNCTION private.after_catch_xp();
INSERT INTO public.profiles (id) VALUES ('${A}');
INSERT INTO public.species_mastery (user_id, dex, points, rank) VALUES ('${A}', 1, 7, 2);
`;

async function applyFiles(client) {
  for (const full of FILES) {
    for (const stmt of splitSql(fs.readFileSync(full, "utf8"))) await client.query(stmt);
  }
}

async function playCatch(client, dex) {
  const id = crypto.randomUUID();
  const round = crypto.randomUUID();
  await client.query(
    "INSERT INTO public.encounter_rounds (id, dex, rules) VALUES ($1, $2, '{\"rewardMode\":\"live\"}'::jsonb)",
    [round, dex]
  );
  await client.query(
    `INSERT INTO public.catches (id, user_id, dex, source_key, round_id)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, A, dex, `play:${round}:${A}`, round]
  );
  await client.query(
    "INSERT INTO public.capture_log (round_id, user_id, dex, success) VALUES ($1, $2, $3, true)",
    [round, A, dex]
  );
  return id;
}

async function specimen(client, id) {
  const { rows } = await client.query(
    `SELECT public_id, level, server_inserted_at, source_key
     FROM public.catches WHERE id = $1`,
    [id]
  );
  return rows[0];
}

async function main() {
  let admin;
  let cluster = null;
  const clients = [];
  refuseHosted();
  console.log(`D71 MASTERY REHEARSAL TARGET: ${HOST}:${PORT} (embedded local; NOT supabase)`);
  const embedPath = path.join(CACHE, "node_modules", "embedded-postgres", "dist", "index.js");
  if (!fs.existsSync(embedPath)) throw new Error("embedded-postgres missing under tools/.cache/d54-pg-harness");
  const EmbeddedPostgres = (await import(pathToFileURL(embedPath).href)).default;
  const dataDir = path.join(CACHE, "d71-data");
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
    onLog: () => {}
  });

  try {
    await cluster.initialise();
    await cluster.start();
    admin = cluster.getPgClient("postgres", HOST);
    await admin.connect();
    const { rows: targetRows } = await admin.query(
      "SELECT current_database() AS db, inet_server_addr()::text AS addr, current_setting('server_version') AS version"
    );
    assert(targetRows[0].db !== "dtflmlbjhttoewqgkujf");
    assert(!BANNED.test(String(targetRows[0].addr || "")));
    const version = targetRows[0].version;
    record("isolation target is loopback embedded Postgres", true, `${HOST}:${PORT} PostgreSQL ${version}`);

    await cluster.createDatabase("d71_design");
    const client = cluster.getPgClient("d71_design", HOST);
    await client.connect();
    clients.push(client);
    await client.query(FIXTURE);
    await client.query("BEGIN");
    await applyFiles(client);
    await client.query("COMMIT");

    const inactive = await client.query(
      "SELECT activated_at IS NULL AS inactive, lifecycle FROM private.species_mastery_activation"
    );
    assert(inactive.rows[0].inactive === true && inactive.rows[0].lifecycle === "inactive");
    record("installed chain stays inactive until an explicit activation call", true);

    const early = await playCatch(client, 1);
    const earlyBefore = await specimen(client, early);
    await client.query("SELECT private.activate_species_mastery_events()");
    const notedEarly = await client.query(
      "SELECT private.note_species_mastery_catch($1::uuid) AS ok",
      [early]
    );
    const deliveredEarly = await client.query(
      "SELECT private.deliver_species_mastery_outbox(5) AS n"
    );
    const earlyStatus = await client.query(
      "SELECT status FROM private.species_mastery_outbox WHERE catch_id = $1",
      [early]
    );
    const earlyAfter = await specimen(client, early);
    assert(notedEarly.rows[0].ok === true);
    assert(Number(deliveredEarly.rows[0].n) === 0);
    assert(earlyStatus.rows[0].status === "rejected");
    assert(earlyAfter.public_id === earlyBefore.public_id);
    assert(String(earlyAfter.server_inserted_at) === String(earlyBefore.server_inserted_at));
    record("a catch from before activation is rejected without changing the specimen", true);

    const live = await playCatch(client, 1);
    const liveBefore = await specimen(client, live);
    const noted = await client.query(
      "SELECT private.note_species_mastery_catch($1::uuid) AS ok",
      [live]
    );
    const notedAgain = await client.query(
      "SELECT private.note_species_mastery_catch($1::uuid) AS ok",
      [live]
    );
    const outboxCount = await client.query(
      "SELECT count(*)::int AS n FROM private.species_mastery_outbox WHERE catch_id = $1",
      [live]
    );
    const delivered = await client.query("SELECT private.deliver_species_mastery_outbox(5) AS n");
    const deliveredAgain = await client.query("SELECT private.deliver_species_mastery_outbox(5) AS n");
    const progress = await client.query(
      "SELECT eligible_captures, tier_name FROM public.species_mastery_progress WHERE trainer_id = $1 AND dex = 1",
      [A]
    );
    const points = await client.query(
      "SELECT points, rank FROM public.species_mastery WHERE user_id = $1 AND dex = 1",
      [A]
    );
    assert(noted.rows[0].ok === true && notedAgain.rows[0].ok === true);
    assert(outboxCount.rows[0].n === 1);
    assert(Number(delivered.rows[0].n) === 1 && Number(deliveredAgain.rows[0].n) === 0);
    assert(progress.rows[0].eligible_captures === 1 && progress.rows[0].tier_name === "Familiar");
    assert(points.rows[0].points === 7 && points.rows[0].rank === 2);
    record("post-commit note is idempotent and does not change mastery points", true, "Familiar from 1 eligible catch");

    const saved = await client.query(
      "SELECT pg_get_functiondef('private.enqueue_species_mastery_event(uuid)'::regprocedure) AS def"
    );
    await client.query(`
      CREATE OR REPLACE FUNCTION private.enqueue_species_mastery_event(p_catch_id uuid)
      RETURNS uuid LANGUAGE plpgsql AS $fn$
      BEGIN
        RAISE EXCEPTION 'injected outbox failure' USING ERRCODE = '55000';
      END $fn$
    `);
    const missed = crypto.randomUUID();
    const missedRound = crypto.randomUUID();
    await client.query("BEGIN");
    await client.query(
      "INSERT INTO public.encounter_rounds (id, dex, rules) VALUES ($1, 4, '{\"rewardMode\":\"live\"}'::jsonb)",
      [missedRound]
    );
    await client.query(
      `INSERT INTO public.catches (id, user_id, dex, source_key, round_id)
       VALUES ($1, $2, 4, $3, $4)`,
      [missed, A, `play:${missedRound}:${A}`, missedRound]
    );
    await client.query(
      "INSERT INTO public.capture_log (round_id, user_id, dex, success) VALUES ($1, $2, 4, true)",
      [missedRound, A]
    );
    await client.query(`
      DO $do$
      BEGIN
        PERFORM private.note_species_mastery_catch('${missed}'::uuid);
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END $do$
    `);
    await client.query("COMMIT");
    const missedRow = await specimen(client, missed);
    const missedQueue = await client.query(
      "SELECT count(*)::int AS n FROM private.species_mastery_outbox WHERE catch_id = $1",
      [missed]
    );
    assert(missedRow && missedRow.public_id.startsWith("LG"));
    assert(missedQueue.rows[0].n === 0);
    await client.query(saved.rows[0].def);
    const recovered = await client.query("SELECT private.reconcile_species_mastery_outbox(10) AS n");
    const missedAfter = await specimen(client, missed);
    const queued = await client.query(
      "SELECT status FROM private.species_mastery_outbox WHERE catch_id = $1",
      [missed]
    );
    assert(Number(recovered.rows[0].n) === 1);
    assert(queued.rows[0].status === "pending");
    assert(String(missedAfter.server_inserted_at) === String(missedRow.server_inserted_at));
    assert(missedAfter.public_id === missedRow.public_id);
    record("a failed note keeps the committed catch and reconcile queues the same id", true);

    const grantRound = crypto.randomUUID();
    const grantId = crypto.randomUUID();
    await client.query(
      "INSERT INTO public.encounter_rounds (id, dex, rules) VALUES ($1, 7, '{\"rewardMode\":\"live\"}'::jsonb)",
      [grantRound]
    );
    await client.query(
      `INSERT INTO public.catches (id, user_id, dex, source_key, round_id)
       VALUES ($1, $2, 7, $3, $4)`,
      [grantId, A, `grant:${grantRound}:${A}`, grantRound]
    );
    const grantReconcile = await client.query("SELECT private.reconcile_species_mastery_outbox(10) AS n");
    const grantQueued = await client.query(
      "SELECT count(*)::int AS n FROM private.species_mastery_outbox WHERE catch_id = $1",
      [grantId]
    );
    assert(Number(grantReconcile.rows[0].n) === 0 && grantQueued.rows[0].n === 0);
    record("reconcile does not queue an ineligible grant source", true);

    await client.query("SELECT private.pause_species_mastery_delivery()");
    const paused = await client.query("SELECT private.deliver_species_mastery_outbox(5) AS n");
    assert(Number(paused.rows[0].n) === 0);
    await client.query("SELECT private.resume_species_mastery_delivery()");
    const resumed = await client.query("SELECT private.deliver_species_mastery_outbox(5) AS n");
    assert(Number(resumed.rows[0].n) === 1);
    record("pause stops delivery and resume delivers the same pending catch", true);

    const failed = results.filter((row) => !row.passed);
    console.log(`\n${results.filter((row) => row.passed).length}/${results.length} REAL SQL checks passed`);
    console.log(`POSTGRES ${version}`);
    console.log("CLASS: REAL SQL on disposable loopback Postgres. settle_if_needed was not called. Not production.");
    if (failed.length) process.exitCode = 1;
  } finally {
    for (const client of clients) {
      try { await client.end(); } catch (_) { /* ignore */ }
    }
    try { if (admin) await admin.end(); } catch (_) { /* ignore */ }
    try { if (cluster) await cluster.stop(); } catch (_) { /* ignore */ }
    try { fs.rmSync(path.join(CACHE, "d71-data"), { recursive: true, force: true }); } catch (_) { /* ignore */ }
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("D71 REHEARSAL FAILED:", error.message);
    process.exit(1);
  });
}
