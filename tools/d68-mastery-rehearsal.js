/* D68 install-readiness review.
 * Disposable LOCAL cluster only. Synthetic trainers only.
 * Does not read hosted URLs and does not apply SQL to production.
 * Writer shapes are local stand-ins. settle_if_needed is not called.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { pathToFileURL } = require("url");
const { refuseHosted, splitSql, BANNED } = require("./a19-schema-rehearsal.js");

const ROOT = path.join(__dirname, "..");
const CACHE = path.join(__dirname, ".cache", "d54-pg-harness");
const FILES = [
  ["001", path.join(ROOT, "supabase", "unapplied", "d64-mastery", "001_species_mastery_events.sql")],
  ["002", path.join(ROOT, "supabase", "unapplied", "d65-mastery", "002_species_mastery_hardening.sql")],
  ["003", path.join(ROOT, "supabase", "unapplied", "d66-mastery", "003_species_mastery_lifecycle.sql")],
  ["004", path.join(ROOT, "supabase", "unapplied", "d67-mastery", "004_species_mastery_catch_safety.sql")]
];
const ROLLBACK = path.join(ROOT, "supabase", "unapplied", "d67-mastery", "rollback-before-activation.sql");
const HOST = "127.0.0.1";
const PORT = 55443;
const USER = "postgres";
const PASSWORD = "d68-mastery-local-only";
const A = "aaaaaaaa-0000-4000-8000-000000000068";
const B = "bbbbbbbb-0000-4000-8000-000000000068";
const C = "cccccccc-0000-4000-8000-000000000068";

const results = [];
function record(name, passed, detail) {
  results.push({ name, passed, detail: detail || "" });
  console.log(`${passed ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}
function assert(cond, detail) {
  if (!cond) throw new Error(detail || "failed");
}
function statements(full) {
  return splitSql(fs.readFileSync(full, "utf8"));
}
async function applyFile(client, full) {
  for (const stmt of statements(full)) await client.query(stmt);
}
async function applyUntilColumn(client, full) {
  let n = 0;
  for (const stmt of statements(full)) {
    await client.query(stmt);
    n += 1;
    if (stmt.includes("ADD COLUMN server_inserted_at")) return n;
  }
  throw new Error("column statement not found");
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

function fixtureSql() {
  return `
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
  transferred_at timestamptz,
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
CREATE TABLE public.rankings (board text PRIMARY KEY, score integer NOT NULL);
CREATE VIEW public.rankings_mastery AS
  SELECT user_id, sum(points)::integer AS mastery_points
  FROM public.species_mastery GROUP BY user_id;
CREATE TABLE public.mastery_ledger (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid, dex integer, amount integer, idempotency text
);
CREATE FUNCTION private.round_is_test(p_round uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT coalesce((SELECT rules->>'rewardMode' FROM public.encounter_rounds WHERE id = p_round), 'live') = 'test'
     AND coalesce((SELECT rules->>'testRewards' FROM public.encounter_rounds WHERE id = p_round), '') IS DISTINCT FROM 'true'
$$;
CREATE FUNCTION private.stamp_catch_row(c public.catches) RETURNS public.catches
LANGUAGE plpgsql AS $fn$
BEGIN
  IF c.public_id IS NULL THEN
    c.public_id := 'LG' || substr(md5(c.id::text), 1, 8);
  END IF;
  IF c.level IS NULL THEN
    c.level := 5;
  END IF;
  IF c.friendship IS NULL THEN
    c.friendship := 0;
  END IF;
  RETURN c;
END
$fn$;
CREATE FUNCTION private.catches_before_write() RETURNS trigger
LANGUAGE plpgsql AS $fn$
BEGIN
  IF NEW.id IS NULL THEN NEW.id := gen_random_uuid(); END IF;
  NEW := private.stamp_catch_row(NEW);
  RETURN NEW;
END
$fn$;
CREATE TRIGGER catches_before_write
  BEFORE INSERT OR UPDATE OF dex, level, iv_hp ON public.catches
  FOR EACH ROW EXECUTE FUNCTION private.catches_before_write();
CREATE FUNCTION private.after_catch_present() RETURNS trigger
LANGUAGE plpgsql AS $fn$
BEGIN
  INSERT INTO public.catch_present_log (catch_id) VALUES (NEW.id);
  RETURN NULL;
END
$fn$;
CREATE TRIGGER catches_after_present
  AFTER INSERT ON public.catches
  FOR EACH ROW EXECUTE FUNCTION private.after_catch_present();
CREATE FUNCTION private.after_catch_xp() RETURNS trigger
LANGUAGE plpgsql AS $fn$
BEGIN
  INSERT INTO public.trainer_xp (user_id, xp) VALUES (NEW.user_id, 1)
  ON CONFLICT (user_id) DO UPDATE SET xp = public.trainer_xp.xp + 1;
  RETURN NULL;
END
$fn$;
CREATE TRIGGER catches_xp
  AFTER INSERT ON public.catches
  FOR EACH ROW EXECUTE FUNCTION private.after_catch_xp();
ALTER TABLE public.catches ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_can_read_own_catches ON public.catches
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
GRANT SELECT, INSERT, UPDATE ON public.catches TO authenticated, anon;
INSERT INTO public.profiles (id) VALUES ('${A}'), ('${B}'), ('${C}');
INSERT INTO public.species_mastery (user_id, dex, points, rank) VALUES ('${A}', 1, 7, 2);
INSERT INTO public.rankings (board, score) VALUES ('mastery', 7);
INSERT INTO public.mastery_ledger (user_id, dex, amount, idempotency)
VALUES ('${A}', 1, 1, 'mastery-catch:d68-fixture');
INSERT INTO public.trainer_xp (user_id, xp) VALUES ('${A}', 3), ('${B}', 1);
`;
}

async function playShape(client, trainer, dex) {
  const id = crypto.randomUUID();
  const round = crypto.randomUUID();
  await client.query(
    "INSERT INTO public.encounter_rounds (id, dex, rules) VALUES ($1, $2, '{\"rewardMode\":\"live\"}'::jsonb)",
    [round, dex]
  );
  await client.query(
    `INSERT INTO public.catches
      (id, user_id, dex, variant, gender, source_key, round_id, obtained_method)
     VALUES ($1, $2, $3, 'normal', 'Unknown', $4, $5, 'CAPTURE')`,
    [id, trainer, dex, `play:${round}:${trainer}`, round]
  );
  await client.query(
    "INSERT INTO public.capture_log (round_id, user_id, dex, success) VALUES ($1, $2, $3, true)",
    [round, trainer, dex]
  );
  return { id, round };
}

async function state(client) {
  const { rows } = await client.query(`
    SELECT
      to_regclass('public.species_mastery_events') AS events,
      (SELECT count(*)::int FROM pg_trigger
        WHERE tgname = 'catch_insert_authority' AND tgrelid = 'public.catches'::regclass) AS authority_trigger,
      (SELECT count(*)::int FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'catches' AND column_name = 'server_inserted_at') AS clock_col,
      (SELECT count(*)::int FROM pg_trigger
        WHERE tgname = 'catch_server_inserted_at' AND tgrelid = 'public.catches'::regclass) AS stamp_trigger,
      (SELECT count(*)::int FROM public.catches) AS catches,
      (SELECT points FROM public.species_mastery WHERE user_id = '${A}' AND dex = 1) AS points,
      (SELECT score FROM public.rankings WHERE board = 'mastery') AS ranking
  `);
  return rows[0];
}

async function main() {
  let admin;
  let cluster = null;
  const clients = [];
  refuseHosted();
  console.log(`D68 MASTERY REHEARSAL TARGET: ${HOST}:${PORT} (embedded local; NOT supabase)`);
  for (const [, full] of FILES) {
    const hash = crypto.createHash("sha256").update(fs.readFileSync(full)).digest("hex").slice(0, 12);
    console.log(`FILE ${path.basename(full)} ${hash}`);
  }
  const embedPath = path.join(CACHE, "node_modules", "embedded-postgres", "dist", "index.js");
  if (!fs.existsSync(embedPath)) throw new Error("embedded-postgres missing under tools/.cache/d54-pg-harness");
  const EmbeddedPostgres = (await import(pathToFileURL(embedPath).href)).default;
  const dataDir = path.join(CACHE, "d68-data");
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
      if (/ERROR|FATAL|PANIC/i.test(text) && !/injected |mastery |server insertion|null value|permission denied|already exists|duplicate key/i.test(text)) {
        console.error("[pg]", text.trim());
      }
    }
  });

  async function open(db) {
    const client = cluster.getPgClient(db, HOST);
    await client.connect();
    await client.query("SET statement_timeout = '20s'");
    clients.push(client);
    return client;
  }

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

    await cluster.createDatabase("d68_tx");
    await cluster.createDatabase("d68_chain");
    await cluster.createDatabase("d68_auto");
    const tx = await open("d68_tx");
    const chain = await open("d68_chain");
    const auto = await open("d68_auto");
    await tx.query(fixtureSql());
    await chain.query(fixtureSql());
    await auto.query(fixtureSql());

    const historical = crypto.randomUUID();
    const historicalRound = crypto.randomUUID();
    await tx.query(
      "INSERT INTO public.encounter_rounds (id, dex, rules) VALUES ($1, 1, '{\"rewardMode\":\"live\"}'::jsonb)",
      [historicalRound]
    );
    await tx.query(
      `INSERT INTO public.catches
        (id, user_id, dex, variant, gender, source_key, round_id, obtained_method, caught_at, public_id)
       VALUES ($1, $2, 1, 'shiny', 'Unknown', $3, $4, 'CAPTURE', '2001-01-01', 'LGHIST')`,
      [historical, A, `play:${historicalRound}:${A}`, historicalRound]
    );

    for (const [, full] of FILES.slice(0, 3)) await applyFile(tx, full);
    let before = await state(tx);
    assert(before.authority_trigger === 1 && before.clock_col === 0);
    await tx.query("BEGIN");
    const applied = await applyUntilColumn(tx, FILES[3][1]);
    const injected = await expectFail(tx, "DO $$ BEGIN RAISE EXCEPTION 'injected migration failure'; END $$");
    assert(/injected migration failure/.test(injected.message));
    await tx.query("ROLLBACK");
    let rolled = await state(tx);
    assert(rolled.authority_trigger === 1 && rolled.clock_col === 0 && rolled.stamp_trigger === 0);
    assert(rolled.catches === 1 && rolled.points === 7 && rolled.ranking === 7);
    record(
      "a failed 004 transaction restores the authority trigger and drops nothing",
      true,
      `${applied} statements rolled back`
    );

    await tx.query("BEGIN");
    await applyFile(tx, FILES[3][1]);
    await tx.query("COMMIT");
    const installed = await state(tx);
    const activation = await tx.query(
      "SELECT activated_at, lifecycle FROM private.species_mastery_activation"
    );
    const bodies = await tx.query(`
      SELECT proname, position('catch_insert_authority' in prosrc) AS old_ref,
             position('server_inserted_at' in prosrc) AS clock_ref
      FROM pg_proc
      WHERE proname IN ('species_mastery_events_guard', 'reconcile_species_mastery_outbox', 'record_catch_insert_authority')
    `);
    const guard = bodies.rows.find((row) => row.proname === "species_mastery_events_guard");
    const reconcile = bodies.rows.find((row) => row.proname === "reconcile_species_mastery_outbox");
    const retired = bodies.rows.find((row) => row.proname === "record_catch_insert_authority");
    assert(installed.authority_trigger === 0 && installed.stamp_trigger === 1 && installed.clock_col === 1);
    assert(activation.rows[0].activated_at == null && activation.rows[0].lifecycle === "inactive");
    assert(guard.old_ref === 0 && guard.clock_ref > 0);
    assert(reconcile.old_ref === 0 && reconcile.clock_ref > 0);
    assert(retired.old_ref === 0 && !/insert into/i.test(
      (await tx.query("SELECT prosrc FROM pg_proc WHERE proname = 'record_catch_insert_authority'")).rows[0].prosrc
    ));
    record("clean 001-004 retry leaves recording inactive and ignores the authority table", true);

    const order = await tx.query(`
      SELECT tgname FROM pg_trigger
      WHERE tgrelid = 'public.catches'::regclass AND NOT tgisinternal
        AND (tgtype & 4) = 4 AND (tgtype & 2) = 2
      ORDER BY tgname
    `);
    const play = await playShape(tx, A, 1);
    const playRow = await tx.query(
      `SELECT public_id, level, friendship, server_inserted_at, caught_at, variant,
              (SELECT count(*)::int FROM public.catch_present_log p WHERE p.catch_id = c.id) AS presented,
              (SELECT xp FROM public.trainer_xp WHERE user_id = c.user_id) AS xp
       FROM public.catches c WHERE c.id = $1`,
      [play.id]
    );
    if (!(playRow.rows[0].public_id || "").startsWith("LG")
      || playRow.rows[0].level !== 5
      || playRow.rows[0].friendship !== 0
      || playRow.rows[0].presented !== 1
      || playRow.rows[0].xp !== 5
      || new Date(playRow.rows[0].server_inserted_at).getUTCFullYear() < 2026
      || playRow.rows[0].caught_at != null) {
      throw new Error(`play row ${JSON.stringify(playRow.rows[0])}`);
    }
    record(
      "ordinary play-shaped insert keeps the catch and the server clock",
      true,
      `before-insert order ${order.rows.map((row) => row.tgname).join(", ")}`
    );

    const imported = crypto.randomUUID();
    const importRound = crypto.randomUUID();
    await tx.query(
      "INSERT INTO public.encounter_rounds (id, dex, rules) VALUES ($1, 25, '{}'::jsonb)",
      [importRound]
    );
    await tx.query(
      `INSERT INTO public.catches
        (id, user_id, dex, variant, gender, source_key, round_id, obtained_method, caught_at, server_inserted_at)
       VALUES ($1, $2, 25, 'normal', 'Unknown', $3, $4, 'CAPTURE', '1999-05-01', '2099-01-01')`,
      [imported, A, `import:${crypto.randomUUID()}:${A}`, importRound]
    );
    const importRow = await tx.query(
      "SELECT caught_at, server_inserted_at, public_id FROM public.catches WHERE id = $1",
      [imported]
    );
    assert(new Date(importRow.rows[0].caught_at).getUTCFullYear() === 1999);
    assert(new Date(importRow.rows[0].server_inserted_at).getUTCFullYear() >= 2026);
    assert(importRow.rows[0].public_id.startsWith("LG"));
    record("bridge-shaped import commits and cannot keep a client insertion clock", true);

    const granted = crypto.randomUUID();
    const grantRound = crypto.randomUUID();
    await tx.query(
      "INSERT INTO public.encounter_rounds (id, dex, rules) VALUES ($1, 4, '{}'::jsonb)",
      [grantRound]
    );
    await tx.query(
      `INSERT INTO public.catches
        (id, user_id, dex, variant, gender, source_key, round_id, obtained_method, caught_at)
       VALUES ($1, $2, 4, 'normal', 'Unknown', $3, $4, 'GRANT', '2010-01-01')`,
      [granted, A, `grant:${crypto.randomUUID()}:${A}`, grantRound]
    );
    assert(await catchCount(tx, granted) === 1);
    record("admin-grant-shaped insert commits", true);

    const missingUser = await expectFail(
      tx,
      "INSERT INTO public.catches (id, dex) VALUES ($1, 1)",
      [crypto.randomUUID()]
    );
    assert(/null value in column "user_id"/i.test(missingUser.message));
    await tx.query("ALTER TABLE public.catches DISABLE TRIGGER catch_server_inserted_at");
    const missingWithoutStamp = await expectFail(
      tx,
      "INSERT INTO public.catches (id, dex) VALUES ($1, 1)",
      [crypto.randomUUID()]
    );
    await tx.query("ALTER TABLE public.catches ENABLE TRIGGER catch_server_inserted_at");
    assert(/null value in column "user_id"/i.test(missingWithoutStamp.message));
    await tx.query("BEGIN");
    await tx.query(`
      CREATE OR REPLACE FUNCTION private.after_catch_xp() RETURNS trigger LANGUAGE plpgsql AS $fn$
      BEGIN
        RAISE EXCEPTION 'injected canonical trigger failure' USING ERRCODE = '23503';
      END $fn$
    `);
    const canonicalId = crypto.randomUUID();
    const canonical = await expectFail(
      tx,
      `INSERT INTO public.catches (id, user_id, dex) VALUES ($1, $2, 1)`,
      [canonicalId, A]
    );
    assert(/injected canonical trigger failure/.test(canonical.message));
    await tx.query("ROLLBACK");
    assert(await catchCount(tx, canonicalId) === 0 && await catchCount(tx, play.id) === 1);
    record("malformed input and an existing trigger failure are not mastery failures", true);

    const noted = await playShape(tx, A, 7);
    const quiet = await tx.query(
      "SELECT private.note_species_mastery_catch($1::uuid) AS ok",
      [noted.id]
    );
    assert(quiet.rows[0].ok === false && await catchCount(tx, noted.id) === 1);
    await tx.query("SELECT private.activate_species_mastery_events()");
    await tx.query(`
      CREATE FUNCTION public.rehearsal_fail_enqueue() RETURNS trigger LANGUAGE plpgsql AS $fn$
      BEGIN
        RAISE EXCEPTION 'injected mastery bookkeeping failure' USING ERRCODE = '40001';
      END $fn$
    `);
    await tx.query(`
      CREATE TRIGGER rehearsal_fail_enqueue
      BEFORE INSERT ON private.species_mastery_outbox
      FOR EACH ROW EXECUTE FUNCTION public.rehearsal_fail_enqueue()
    `);
    const booked = await playShape(tx, A, 8);
    await tx.query("BEGIN");
    const failedNote = await tx.query(
      "SELECT private.note_species_mastery_catch($1::uuid) AS ok",
      [booked.id]
    );
    assert(failedNote.rows[0].ok === false);
    await tx.query("COMMIT");
    assert(await catchCount(tx, booked.id) === 1);
    await tx.query("DROP TRIGGER rehearsal_fail_enqueue ON private.species_mastery_outbox");
    record("optional mastery failure keeps the committed catch", true, "local activation only; settle_if_needed was not called");

    await tx.query("ALTER TABLE private.catch_insert_authority RENAME TO catch_insert_authority_aside");
    const eligible = await playShape(tx, A, 3);
    const earned = await tx.query(
      "SELECT private.record_species_mastery_event($1::uuid) AS id",
      [eligible.id]
    );
    const old = await expectFail(tx, "SELECT private.record_species_mastery_event($1::uuid)", [historical]);
    const lateImport = crypto.randomUUID();
    const lateImportRound = crypto.randomUUID();
    const lateGrant = crypto.randomUUID();
    const lateGrantRound = crypto.randomUUID();
    await tx.query(
      "INSERT INTO public.encounter_rounds (id, dex, rules) VALUES ($1, 25, '{}'::jsonb), ($2, 4, '{}'::jsonb)",
      [lateImportRound, lateGrantRound]
    );
    await tx.query(
      `INSERT INTO public.catches
        (id, user_id, dex, source_key, round_id, obtained_method)
       VALUES ($1, $2, 25, $3, $4, 'CAPTURE'), ($5, $2, 4, $6, $7, 'GRANT')`,
      [lateImport, A, `import:${crypto.randomUUID()}:${A}`, lateImportRound, lateGrant, `grant:${crypto.randomUUID()}:${A}`, lateGrantRound]
    );
    const importedReject = await expectFail(tx, "SELECT private.record_species_mastery_event($1::uuid)", [lateImport]);
    const grantedReject = await expectFail(tx, "SELECT private.record_species_mastery_event($1::uuid)", [lateGrant]);
    if (earned.rows[0].id !== eligible.id) throw new Error(`earned ${earned.rows[0].id}`);
    if (!/not server-authoritative/.test(old.message)) throw new Error(`historical ${old.message.split("\n")[0]}`);
    if (!/source key/.test(importedReject.message)) throw new Error(`import ${importedReject.message.split("\n")[0]}`);
    if (!/source key/.test(grantedReject.message)) throw new Error(`grant ${grantedReject.message.split("\n")[0]}`);
    await tx.query("ALTER TABLE private.catch_insert_authority_aside RENAME TO catch_insert_authority");
    const hist = await tx.query(
      "SELECT variant, public_id, caught_at, server_inserted_at FROM public.catches WHERE id = $1",
      [historical]
    );
    assert(hist.rows[0].variant === "shiny" && hist.rows[0].public_id === "LGHIST");
    assert(hist.rows[0].server_inserted_at == null);
    assert(new Date(hist.rows[0].caught_at).getUTCFullYear() === 2001);
    record("historical, import, and grant rows stay ineligible without the authority table", true);

    const late = await expectFail(
      tx,
      "UPDATE public.catches SET server_inserted_at = clock_timestamp() WHERE id = $1",
      [historical]
    );
    assert(/server insertion time is immutable/.test(late.message));
    async function asTrainer(sql, params) {
      await tx.query("BEGIN");
      await tx.query("SET LOCAL ROLE authenticated");
      await tx.query(`SELECT set_config('request.jwt.claim.sub', '${A}', true)`);
      const error = await expectFail(tx, sql, params);
      await tx.query("ROLLBACK");
      return error;
    }
    const selfAward = await asTrainer("SELECT private.record_species_mastery_event($1::uuid)", [play.id]);
    const selfInsert = await asTrainer(
      `INSERT INTO public.species_mastery_events (catch_id, trainer_id, dex, round_id, source_key)
       VALUES ($1, $2, 1, $3, 'play:forged')`,
      [play.id, A, play.round]
    );
    await tx.query("BEGIN");
    await tx.query("SET LOCAL ROLE authenticated");
    await tx.query(`SELECT set_config('request.jwt.claim.sub', '${A}', true)`);
    const selfUpdate = await tx.query(
      "UPDATE public.catches SET server_inserted_at = clock_timestamp() WHERE id = $1",
      [play.id]
    );
    await tx.query("ROLLBACK");
    assert(selfAward.code === "42501" && selfInsert.code === "42501");
    assert(selfUpdate.rowCount === 0);
    const privileges = await tx.query(`
      SELECT proname, prosecdef,
             has_function_privilege('authenticated', oid, 'execute') AS auth_exec,
             has_function_privilege('anon', oid, 'execute') AS anon_exec
      FROM pg_proc
      WHERE pronamespace = 'private'::regnamespace
        AND (proname LIKE '%mastery%' OR proname LIKE '%stamp_catch_server%' OR proname = 'record_catch_insert_authority')
    `);
    assert(privileges.rows.length > 0);
    assert(privileges.rows.every((row) => row.auth_exec === false && row.anon_exec === false));
    const stampDef = privileges.rows.find((row) => row.proname === "stamp_catch_server_inserted_at");
    assert(stampDef && stampDef.prosecdef === false);
    record("authenticated clients cannot award mastery or change the insertion clock", true);

    await tx.query("BEGIN");
    await tx.query(`
      CREATE OR REPLACE FUNCTION private.stamp_catch_server_inserted_at()
      RETURNS trigger LANGUAGE plpgsql SET search_path TO pg_catalog AS $fn$
      BEGIN
        RAISE EXCEPTION 'injected stamp failure' USING ERRCODE = '55000';
      END $fn$
    `);
    const lostId = crypto.randomUUID();
    const lostRound = crypto.randomUUID();
    await tx.query(
      "INSERT INTO public.encounter_rounds (id, dex, rules) VALUES ($1, 9, '{}'::jsonb)",
      [lostRound]
    );
    const lost = await expectFail(
      tx,
      `INSERT INTO public.catches (id, user_id, dex, source_key, round_id)
       VALUES ($1, $2, 9, $3, $4)`,
      [lostId, A, `play:${lostRound}:${A}`, lostRound]
    );
    assert(/injected stamp failure/.test(lost.message));
    await tx.query("ROLLBACK");
    const restored = await playShape(tx, A, 9);
    assert(await catchCount(tx, lostId) === 0 && await catchCount(tx, restored.id) === 1);
    record("a replaced stamp function can abort a catch; the shipped function does not", true);

    const finalPoints = await tx.query(
      "SELECT points, rank FROM public.species_mastery WHERE user_id = $1 AND dex = 1",
      [A]
    );
    const finalRank = await tx.query("SELECT score FROM public.rankings WHERE board = 'mastery'");
    const finalView = await tx.query(
      "SELECT mastery_points FROM public.rankings_mastery WHERE user_id = $1",
      [A]
    );
    assert(finalPoints.rows[0].points === 7 && finalPoints.rows[0].rank === 2);
    assert(finalRank.rows[0].score === 7 && finalView.rows[0].mastery_points === 7);
    record("points mastery and Rankings stay unchanged", true, "points 7 rank 2 ranking 7");

    await chain.query("BEGIN");
    for (const [, full] of FILES.slice(0, 3)) await applyFile(chain, full);
    await applyUntilColumn(chain, FILES[3][1]);
    const chainFail = await expectFail(chain, "DO $$ BEGIN RAISE EXCEPTION 'injected migration failure'; END $$");
    assert(/injected migration failure/.test(chainFail.message));
    await chain.query("ROLLBACK");
    const chainEmpty = await state(chain);
    assert(chainEmpty.events == null && chainEmpty.authority_trigger === 0 && chainEmpty.clock_col === 0);
    assert(chainEmpty.points === 7 && chainEmpty.ranking === 7);
    await chain.query("BEGIN");
    for (const [, full] of FILES) await applyFile(chain, full);
    await chain.query("COMMIT");
    const chainReady = await state(chain);
    const chainPlay = await playShape(chain, B, 1);
    const chainRow = await chain.query(
      "SELECT server_inserted_at IS NOT NULL AS stamped, public_id FROM public.catches WHERE id = $1",
      [chainPlay.id]
    );
    const chainActivation = await chain.query(
      "SELECT activated_at IS NULL AS inactive FROM private.species_mastery_activation"
    );
    assert(chainReady.stamp_trigger === 1 && chainReady.authority_trigger === 0);
    assert(chainRow.rows[0].stamped === true && chainRow.rows[0].public_id.startsWith("LG"));
    assert(chainActivation.rows[0].inactive === true);
    record("one failed chain transaction needs no repair before a clean install", true);

    for (const [, full] of FILES.slice(0, 3)) await applyFile(auto, full);
    await applyUntilColumn(auto, FILES[3][1]);
    const partial = await state(auto);
    assert(partial.authority_trigger === 0 && partial.clock_col === 1 && partial.stamp_trigger === 0);
    let retryMessage = "";
    try {
      await applyFile(auto, FILES[3][1]);
    } catch (error) {
      retryMessage = error.message.split("\n")[0];
    }
    assert(/already exists/.test(retryMessage));
    await applyFile(auto, ROLLBACK);
    const cleared = await state(auto);
    assert(cleared.events == null && cleared.clock_col === 0 && cleared.points === 7);
    await auto.query("BEGIN");
    for (const [, full] of FILES) await applyFile(auto, full);
    await auto.query("COMMIT");
    const autoPlay = await playShape(auto, A, 2);
    assert(await catchCount(auto, autoPlay.id) === 1);
    record("statement-by-statement 004 survives a crash and the drafted rollback recovers it", true, retryMessage);

    const failed = results.filter((row) => !row.passed);
    console.log(`\n${results.filter((row) => row.passed).length}/${results.length} REAL SQL checks passed`);
    console.log(`POSTGRES ${version}`);
    console.log("CLASS: REAL SQL on disposable loopback Postgres. Not production. Not an install approval.");
    if (failed.length) process.exitCode = 1;
  } finally {
    for (const client of clients) {
      try { await client.end(); } catch (_) { /* ignore */ }
    }
    try { if (admin) await admin.end(); } catch (_) { /* ignore */ }
    try { if (cluster) await cluster.stop(); } catch (_) { /* ignore */ }
    try { fs.rmSync(path.join(CACHE, "d68-data"), { recursive: true, force: true }); } catch (_) { /* ignore */ }
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("D68 REHEARSAL FAILED:", error.message);
    process.exit(1);
  });
}
