/* D65 mastery cutoff, outbox recovery, and rollback.
 * Disposable LOCAL cluster only. Synthetic trainers only.
 * Does not read hosted URLs. Does not apply SQL to production.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { pathToFileURL } = require("url");
const { refuseHosted, splitSql, BANNED } = require("./a19-schema-rehearsal.js");

const ROOT = path.join(__dirname, "..");
const CACHE = path.join(__dirname, ".cache", "d54-pg-harness");
const DRAFT64 = path.join(ROOT, "supabase", "unapplied", "d64-mastery", "001_species_mastery_events.sql");
const HARDEN = path.join(ROOT, "supabase", "unapplied", "d65-mastery", "002_species_mastery_hardening.sql");
const QUIET = path.join(ROOT, "supabase", "unapplied", "d65-mastery", "rollback-before-activation.sql");
const DESTRUCTIVE = path.join(ROOT, "supabase", "unapplied", "d65-mastery", "rollback-destructive.sql");
const HOST = "127.0.0.1";
const PORT = 55440;
const USER = "postgres";
const PASSWORD = "d65-mastery-local-only";
const DB_MAIN = "d65_mastery";
const A = "aaaaaaaa-0000-4000-8000-0000000000a1";
const B = "bbbbbbbb-0000-4000-8000-0000000000b2";
const C = "cccccccc-0000-4000-8000-0000000000c3";

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

const FIXTURE = `
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS private;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE AS $$
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
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  dex integer NOT NULL,
  variant text NOT NULL DEFAULT 'normal',
  gender text NOT NULL DEFAULT 'Unknown',
  source_key text,
  round_id uuid,
  pokemon_form_id integer,
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
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, dex)
);
CREATE TABLE public.mastery_ledger (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL,
  dex integer NOT NULL,
  amount integer NOT NULL,
  reason text,
  idempotency text
);
CREATE FUNCTION private.round_is_test(p_round uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT coalesce((SELECT rules->>'rewardMode' FROM public.encounter_rounds WHERE id = p_round), 'live') = 'test'
     AND coalesce((SELECT rules->>'testRewards' FROM public.encounter_rounds WHERE id = p_round), '') IS DISTINCT FROM 'true'
$$;
INSERT INTO public.profiles (id) VALUES ('${A}'), ('${B}'), ('${C}');
INSERT INTO public.species_mastery (user_id, dex, points, rank) VALUES ('${A}', 1, 7, 2);
INSERT INTO public.mastery_ledger (user_id, dex, amount, reason, idempotency)
VALUES ('${A}', 1, 1, 'CATCH', 'mastery-catch:d65-fixture');
`;

async function specimen(client, opts) {
  const trainer = opts.trainer;
  const dex = opts.dex;
  const round = crypto.randomUUID();
  const catchId = crypto.randomUUID();
  const variant = opts.variant || "normal";
  const method = opts.method || "CAPTURE";
  let source = opts.source;
  if (source === undefined) source = `play:${round}:${trainer}`;
  const rules = opts.test ? { rewardMode: "test" } : { rewardMode: "live" };
  await client.query(
    "INSERT INTO public.encounter_rounds (id, dex, rules) VALUES ($1, $2, $3::jsonb)",
    [round, dex, JSON.stringify(rules)]
  );
  const form = opts.form == null ? null : opts.form;
  const useClock = opts.caughtAt === undefined;
  const values = [catchId, trainer, dex, variant, source, round, form, method];
  if (!useClock) values.push(opts.caughtAt);
  await client.query(
    `INSERT INTO public.catches
      (id, user_id, dex, variant, gender, source_key, round_id, pokemon_form_id, obtained_method, caught_at)
     VALUES ($1, $2, $3, $4, 'Unknown', $5, $6, $7, $8, ${useClock ? "clock_timestamp()" : "$9::timestamptz"})`,
    values
  );
  if (opts.log !== false) {
    await client.query(
      "INSERT INTO public.capture_log (round_id, user_id, dex, success) VALUES ($1, $2, $3, $4)",
      [round, trainer, dex, opts.success !== false]
    );
  }
  return { catchId, round, source, dex };
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

async function pointsOf(client) {
  const { rows } = await client.query(
    "SELECT points, rank FROM public.species_mastery WHERE user_id = $1 AND dex = 1",
    [A]
  );
  return rows[0];
}

async function main() {
  let admin;
  let client;
  let clientB = null;
  let cluster = null;
  refuseHosted();
  console.log(`D65 MASTERY REHEARSAL TARGET: ${HOST}:${PORT}/${DB_MAIN} (embedded local; NOT supabase)`);
  const embedPath = path.join(CACHE, "node_modules", "embedded-postgres", "dist", "index.js");
  if (!fs.existsSync(embedPath)) throw new Error("embedded-postgres missing under tools/.cache/d54-pg-harness");
  const EmbeddedPostgres = (await import(pathToFileURL(embedPath).href)).default;
  const dataDir = path.join(CACHE, "d65-data");
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
      if (/ERROR|FATAL|PANIC/i.test(text) && !/mastery |capture timestamp|permission denied|duplicate key|injected /i.test(text)) {
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
    await applyFile(client, HARDEN);
    await client.query("GRANT USAGE ON SCHEMA private TO authenticated, anon");
    const inactive = await client.query(
      "SELECT activated_at, disabled_at FROM private.species_mastery_activation"
    );
    assert(inactive.rows[0].activated_at == null && inactive.rows[0].disabled_at == null);
    record("install leaves recording inactive", true, "activated_at is null");

    const catchesBeforeRollback = await client.query("SELECT count(*)::int AS n FROM public.catches");
    await applyFile(client, QUIET);
    const afterQuiet = await client.query(
      `SELECT to_regclass('public.species_mastery_events') AS events,
              to_regclass('private.species_mastery_activation') AS activation,
              (SELECT points FROM public.species_mastery WHERE user_id = $1 AND dex = 1) AS points,
              (SELECT count(*)::int FROM public.catches) AS catches`,
      [A]
    );
    assert(afterQuiet.rows[0].events == null && afterQuiet.rows[0].activation == null);
    assert(afterQuiet.rows[0].points === 7);
    assert(afterQuiet.rows[0].catches === catchesBeforeRollback.rows[0].n);
    record("before activation an empty draft can be removed", true, "points and catches kept");

    await applyFile(client, DRAFT64);
    await applyFile(client, HARDEN);
    await client.query("GRANT USAGE ON SCHEMA private TO authenticated, anon");

    const pre = await specimen(client, { trainer: A, dex: 1, caughtAt: "2001-01-01T00:00:00Z" });
    const tooSoon = await expectFail(
      client,
      "SELECT private.record_species_mastery_event($1::uuid)",
      [pre.catchId]
    );
    assert(/recording is not active/.test(tooSoon.message));

    const opened = await client.query("SELECT private.activate_species_mastery_events() AS at");
    assert(opened.rows[0].at);
    const again = await expectFail(client, "SELECT private.activate_species_mastery_events()");
    assert(/already activated/.test(again.message));
    const forged = await expectFail(
      client,
      "UPDATE private.species_mastery_activation SET activated_at = '2001-01-01T00:00:00Z'"
    );
    assert(/cutoff is immutable|must be the server clock/.test(forged.message));
    const stillOpen = await client.query("SELECT activated_at FROM private.species_mastery_activation");
    assert(new Date(stillOpen.rows[0].activated_at).getUTCFullYear() >= 2026);
    const oldReplay = await expectFail(
      client,
      "SELECT private.record_species_mastery_event($1::uuid)",
      [pre.catchId]
    );
    assert(/predates activation/.test(oldReplay.message));
    const oldEvents = await client.query(
      "SELECT count(*)::int AS n FROM public.species_mastery_events WHERE catch_id = $1",
      [pre.catchId]
    );
    assert(oldEvents.rows[0].n === 0);
    record("1 historical catch is rejected after activation", true, "also rejected while the draft was inactive");
    const frozen = await expectFail(
      client,
      "UPDATE public.catches SET caught_at = clock_timestamp() WHERE id = $1",
      [pre.catchId]
    );
    assert(/capture timestamp is immutable/.test(frozen.message));
    await client.query(
      "UPDATE public.catches SET caught_at = caught_at, transferred_at = clock_timestamp() WHERE id = $1",
      [pre.catchId]
    );
    record("4 activation cutoff cannot be client-manipulated or backdated", true, "no timestamp argument; rewrite rejected");

    const fresh = await specimen(client, { trainer: A, dex: 1 });
    const recorded = await client.query(
      "SELECT private.record_species_mastery_event($1::uuid) AS id",
      [fresh.catchId]
    );
    assert(recorded.rows[0].id === fresh.catchId);
    let rows = await progress(client, A);
    assert(Number(rows[0].eligible_captures) === 1 && rows[0].tier_name === "Familiar");
    record("2 new eligible catch accepted after activation", true, "Familiar");

    const replay = await client.query(
      "SELECT private.record_species_mastery_event($1::uuid) AS id",
      [fresh.catchId]
    );
    assert(replay.rows[0].id === fresh.catchId);
    const one = await client.query(
      "SELECT count(*)::int AS n FROM public.species_mastery_events WHERE catch_id = $1",
      [fresh.catchId]
    );
    assert(one.rows[0].n === 1);
    record("3 replay remains idempotent", true, "one event");

    const ambiguous = [];
    ambiguous.push(await specimen(client, { trainer: A, dex: 4, caughtAt: null }));
    ambiguous.push(await specimen(client, { trainer: A, dex: 4, caughtAt: "infinity" }));
    ambiguous.push(await specimen(client, { trainer: A, dex: 4, caughtAt: "-infinity" }));
    ambiguous.push(await specimen(client, { trainer: A, dex: 4, caughtAt: "2999-01-01T00:00:00Z" }));
    let ambiguousRejected = 0;
    for (const row of ambiguous) {
      const error = await expectFail(client, "SELECT private.record_species_mastery_event($1::uuid)", [row.catchId]);
      if (/missing or ambiguous|predates activation/.test(error.message)) ambiguousRejected += 1;
      const kept = await client.query("SELECT count(*)::int AS n FROM public.catches WHERE id = $1", [row.catchId]);
      assert(kept.rows[0].n === 1);
    }
    assert(ambiguousRejected === ambiguous.length);
    record("5 malformed or ambiguous capture timestamps fail safely", true, "4 rejected; specimens kept");

    const shiny = await specimen(client, { trainer: A, dex: 1, variant: "shiny" });
    const formed = await specimen(client, { trainer: A, dex: 1, form: 19 });
    await client.query("SELECT private.record_species_mastery_event($1::uuid)", [shiny.catchId]);
    await client.query("SELECT private.record_species_mastery_event($1::uuid)", [formed.catchId]);
    const other = await specimen(client, { trainer: B, dex: 1 });
    await client.query("SELECT private.record_species_mastery_event($1::uuid)", [other.catchId]);
    const mismatch = await expectFail(
      client,
      `INSERT INTO public.species_mastery_events (catch_id, trainer_id, dex, round_id, source_key)
       VALUES ($1, $2, 1, $3, $4)`,
      [fresh.catchId, B, fresh.round, fresh.source]
    );
    assert(/does not match the specimen/.test(mismatch.message));
    const grant = await specimen(client, {
      trainer: A,
      dex: 4,
      source: `grant:${crypto.randomUUID()}:${A}`,
      method: "CAPTURE"
    });
    const grantError = await expectFail(client, "SELECT private.record_species_mastery_event($1::uuid)", [grant.catchId]);
    assert(/source key is not this play capture/.test(grantError.message));
    rows = await progress(client, A);
    const seenB = await progress(client, B);
    assert(Number(rows.find((row) => row.dex === 1).eligible_captures) === 3);
    assert(rows.find((row) => row.dex === 1).tier_name === "Acquainted");
    assert(seenB.length === 1 && Number(seenB[0].eligible_captures) === 1);
    await client.query("BEGIN");
    await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [B]);
    await client.query("SET LOCAL ROLE authenticated");
    const leaked = await client.query(
      "SELECT count(*)::int AS n FROM public.species_mastery_events WHERE trainer_id = $1",
      [A]
    );
    const insertDenied = await expectFail(
      client,
      `INSERT INTO public.species_mastery_events (catch_id, trainer_id, dex, round_id, source_key)
       VALUES ($1, $2, 1, $3, $4)`,
      [fresh.catchId, B, fresh.round, fresh.source]
    );
    await client.query("ROLLBACK");
    assert(leaked.rows[0].n === 0 && insertDenied.code === "42501");
    record("12 cross-trainer read and write isolation", true, "B sees only B; insert 42501");

    clientB = cluster.getPgClient(DB_MAIN, HOST);
    await clientB.connect();
    await clientB.query("SET statement_timeout = '20s'");
    const race = await specimen(client, { trainer: A, dex: 39 });
    await client.query("BEGIN");
    await client.query("SELECT private.record_species_mastery_event($1::uuid)", [race.catchId]);
    const pendingRace = clientB.query(
      "SELECT private.record_species_mastery_event($1::uuid) AS id",
      [race.catchId]
    );
    await new Promise((resolve) => setTimeout(resolve, 300));
    await client.query("COMMIT");
    const raced = await pendingRace;
    assert(raced.rows[0].id === race.catchId);
    const raceCount = await client.query(
      "SELECT count(*)::int AS n FROM public.species_mastery_events WHERE catch_id = $1",
      [race.catchId]
    );
    assert(raceCount.rows[0].n === 1);
    record("6 duplicate insert under concurrency", true, "one row");

    const unsafe = await specimen(client, { trainer: A, dex: 52 });
    await client.query(`
      CREATE FUNCTION public.rehearsal_fail_mastery() RETURNS trigger
      LANGUAGE plpgsql AS $fn$
      BEGIN
        RAISE EXCEPTION 'injected mastery failure' USING ERRCODE = '40001';
      END
      $fn$
    `);
    await client.query(`
      CREATE TRIGGER rehearsal_fail_mastery
      BEFORE INSERT ON public.species_mastery_events
      FOR EACH ROW EXECUTE FUNCTION public.rehearsal_fail_mastery()
    `);
    await client.query("BEGIN");
    const unsafeResult = await expectFail(
      client,
      "SELECT private.record_species_mastery_event($1::uuid)",
      [unsafe.catchId]
    );
    assert(/injected mastery failure/.test(unsafeResult.message));
    await client.query("ROLLBACK");
    const unsafeKept = await client.query("SELECT count(*)::int AS n FROM public.catches WHERE id = $1", [unsafe.catchId]);
    assert(unsafeKept.rows[0].n === 1);
    await client.query("BEGIN");
    await client.query("SAVEPOINT mastery_optional");
    const isolated = await expectFail(
      client,
      "SELECT private.record_species_mastery_event($1::uuid)",
      [unsafe.catchId]
    );
    assert(/injected mastery failure/.test(isolated.message));
    await client.query("ROLLBACK TO SAVEPOINT mastery_optional");
    await client.query("COMMIT");
    const afterSavepoint = await client.query(
      `SELECT
         (SELECT count(*)::int FROM public.catches WHERE id = $1) AS catches,
         (SELECT count(*)::int FROM public.species_mastery_events WHERE catch_id = $1) AS events`,
      [unsafe.catchId]
    );
    assert(afterSavepoint.rows[0].catches === 1 && afterSavepoint.rows[0].events === 0);
    record("7 failed mastery processing does not remove the catch", true, "savepoint keeps the specimen and writes no event");

    await client.query("DROP TRIGGER rehearsal_fail_mastery ON public.species_mastery_events");
    await client.query(`
      CREATE FUNCTION public.rehearsal_fail_enqueue() RETURNS trigger
      LANGUAGE plpgsql AS $fn$
      BEGIN
        RAISE EXCEPTION 'injected enqueue failure' USING ERRCODE = '40001';
      END
      $fn$
    `);
    await client.query(`
      CREATE TRIGGER rehearsal_fail_enqueue
      BEFORE INSERT ON private.species_mastery_outbox
      FOR EACH ROW EXECUTE FUNCTION public.rehearsal_fail_enqueue()
    `);
    const recovered = await specimen(client, { trainer: A, dex: 63 });
    await client.query("BEGIN");
    const noted = await client.query(
      "SELECT private.note_species_mastery_catch($1::uuid) AS ok",
      [recovered.catchId]
    );
    assert(noted.rows[0].ok === false);
    await client.query("COMMIT");
    const notedState = await client.query(
      `SELECT
         (SELECT count(*)::int FROM public.catches WHERE id = $1) AS catches,
         (SELECT count(*)::int FROM private.species_mastery_outbox WHERE catch_id = $1) AS queued,
         (SELECT count(*)::int FROM public.species_mastery_events WHERE catch_id = $1) AS events`,
      [recovered.catchId]
    );
    assert(notedState.rows[0].catches === 1 && notedState.rows[0].queued === 0 && notedState.rows[0].events === 0);
    await client.query("DROP TRIGGER rehearsal_fail_enqueue ON private.species_mastery_outbox");
    const queued = await client.query("SELECT private.reconcile_species_mastery_outbox(50) AS n");
    assert(Number(queued.rows[0].n) >= 1);
    const historicalQueued = await client.query(
      "SELECT count(*)::int AS n FROM private.species_mastery_outbox WHERE catch_id = $1",
      [pre.catchId]
    );
    assert(historicalQueued.rows[0].n === 0);
    await client.query(`
      CREATE TRIGGER rehearsal_fail_mastery
      BEFORE INSERT ON public.species_mastery_events
      FOR EACH ROW EXECUTE FUNCTION public.rehearsal_fail_mastery()
    `);
    const paused = await client.query("SELECT private.deliver_species_mastery_outbox(50) AS n");
    assert(Number(paused.rows[0].n) === 0);
    const waiting = await client.query(
      "SELECT status, attempts FROM private.species_mastery_outbox WHERE catch_id = $1",
      [recovered.catchId]
    );
    assert(waiting.rows[0].status === "pending" && waiting.rows[0].attempts >= 1);
    const stillThere = await client.query("SELECT count(*)::int AS n FROM public.catches WHERE id = $1", [recovered.catchId]);
    assert(stillThere.rows[0].n === 1);
    await client.query("DROP TRIGGER rehearsal_fail_mastery ON public.species_mastery_events");
    const delivered = await client.query("SELECT private.deliver_species_mastery_outbox(50) AS n");
    assert(Number(delivered.rows[0].n) >= 1);
    const recoveredEvent = await client.query(
      "SELECT count(*)::int AS n FROM public.species_mastery_events WHERE catch_id = $1",
      [recovered.catchId]
    );
    assert(recoveredEvent.rows[0].n === 1);
    const grantBox = await client.query(
      "SELECT status FROM private.species_mastery_outbox WHERE catch_id = $1",
      [grant.catchId]
    );
    if (grantBox.rows[0]) assert(grantBox.rows[0].status === "rejected");
    record("8 interrupted processing retries from the outbox without backfilling history", true, "historical catch stayed unqueued");

    async function denied(sql, params) {
      await client.query("BEGIN");
      await client.query("SET LOCAL ROLE authenticated");
      const error = await expectFail(client, sql, params);
      await client.query("ROLLBACK");
      return error;
    }
    const deniedActivate = await denied("SELECT private.activate_species_mastery_events()");
    const deniedDeliver = await denied("SELECT private.deliver_species_mastery_outbox(1)");
    const deniedRecord = await denied(
      "SELECT private.record_species_mastery_event($1::uuid)",
      [fresh.catchId]
    );
    assert(
      deniedActivate.code === "42501" && deniedDeliver.code === "42501" && deniedRecord.code === "42501",
      `${deniedActivate.code} ${deniedDeliver.code} ${deniedRecord.code}`
    );
    const privileges = await client.query(
      `SELECT proname,
              has_function_privilege('authenticated', oid, 'execute') AS authenticated_exec,
              prosecdef,
              proconfig::text AS config
       FROM pg_proc
       WHERE pronamespace = 'private'::regnamespace
         AND proname IN (
           'record_species_mastery_event',
           'activate_species_mastery_events',
           'deliver_species_mastery_outbox',
           'reconcile_species_mastery_outbox'
         )`
    );
    assert(privileges.rows.every((row) => row.authenticated_exec === false && row.prosecdef === true));
    assert(privileges.rows.every((row) => /search_path=pg_catalog, public, private/.test(row.config)));
    record("11 unauthorized function invocation", true, "authenticated execute is false");

    const ownerC = await specimen(client, { trainer: C, dex: 7 });
    await client.query("SELECT private.record_species_mastery_event($1::uuid)", [ownerC.catchId]);
    await client.query("UPDATE public.catches SET transferred_at = clock_timestamp() WHERE id = $1", [ownerC.catchId]);
    await client.query("DELETE FROM public.catches WHERE id = $1", [ownerC.catchId]);
    const eventAfterCatchDelete = await client.query(
      "SELECT count(*)::int AS n FROM public.species_mastery_events WHERE catch_id = $1",
      [ownerC.catchId]
    );
    assert(eventAfterCatchDelete.rows[0].n === 1);
    const ownerC2 = await specimen(client, { trainer: C, dex: 8 });
    await client.query("SELECT private.record_species_mastery_event($1::uuid)", [ownerC2.catchId]);
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
    record("release, catch delete, and profile delete follow the D64 retention rules", true, "C cascaded; A kept");

    const beforeDisable = await client.query("SELECT count(*)::int AS n FROM public.species_mastery_events");
    await client.query("SELECT private.disable_species_mastery_recording()");
    const afterCutoff = await specimen(client, { trainer: A, dex: 77 });
    const disabled = await expectFail(
      client,
      "SELECT private.record_species_mastery_event($1::uuid)",
      [afterCutoff.catchId]
    );
    assert(/recording is not active/.test(disabled.message));
    const afterDisable = await client.query("SELECT count(*)::int AS n FROM public.species_mastery_events");
    const points = await pointsOf(client);
    const ledger = await client.query(
      "SELECT idempotency FROM public.mastery_ledger WHERE user_id = $1",
      [A]
    );
    assert(afterDisable.rows[0].n === beforeDisable.rows[0].n);
    assert(points.points === 7 && points.rank === 2);
    assert(ledger.rows[0].idempotency === "mastery-catch:d65-fixture");
    const keptCatch = await client.query("SELECT variant FROM public.catches WHERE id = $1", [shiny.catchId]);
    assert(keptCatch.rows[0].variant === "shiny");
    record("9 non-destructive disable retains earned events", true, "new recording stopped");
    record("10 existing mastery points stay untouched", true, "points 7 rank 2");

    let quietRefused = false;
    try {
      await applyFile(client, QUIET);
    } catch (error) {
      quietRefused = /mastery recording was activated|mastery events exist/.test(error.message);
    }
    assert(quietRefused);
    const eventsRemain = await client.query("SELECT count(*)::int AS n FROM public.species_mastery_events");
    assert(eventsRemain.rows[0].n === beforeDisable.rows[0].n);
    record("routine rollback refuses once events or activation exist", true, "events kept");

    let destructiveRefused = false;
    try {
      await applyFile(client, DESTRUCTIVE);
    } catch (error) {
      destructiveRefused = /backup confirmation is missing/.test(error.message);
    }
    assert(destructiveRefused);
    const stillEvents = await client.query("SELECT count(*)::int AS n FROM public.species_mastery_events");
    assert(stillEvents.rows[0].n === beforeDisable.rows[0].n);
    record("destructive rollback refuses without backup confirmation", true);

    const catchCount = await client.query("SELECT count(*)::int AS n FROM public.catches");
    await client.query("SET starlight.confirm_mastery_destructive_rollback = 'BACKUP_VERIFIED'");
    await applyFile(client, DESTRUCTIVE);
    const gone = await client.query(
      `SELECT to_regclass('public.species_mastery_events') AS events,
              to_regclass('private.species_mastery_outbox') AS outbox,
              (SELECT count(*)::int FROM public.catches) AS catches,
              (SELECT points FROM public.species_mastery WHERE user_id = $1 AND dex = 1) AS points`,
      [A]
    );
    const freeze = await client.query(
      `SELECT count(*)::int AS n FROM pg_trigger WHERE tgname = 'species_mastery_caught_at_freeze'`
    );
    assert(gone.rows[0].events == null && gone.rows[0].outbox == null);
    assert(gone.rows[0].catches === catchCount.rows[0].n && gone.rows[0].points === 7);
    assert(freeze.rows[0].n === 0);
    record("confirmed destructive rollback drops only the new ledger", true, "catches and points kept");

    const failed = results.filter((row) => !row.passed);
    console.log(`\n${results.filter((row) => row.passed).length}/${results.length} REAL SQL checks passed`);
    console.log(`POSTGRES ${version}`);
    console.log("CLASS: REAL SQL on disposable loopback Postgres. Not a browser test. Not production.");
    if (failed.length) process.exitCode = 1;
  } finally {
    try { if (clientB) await clientB.end(); } catch (_) { /* ignore */ }
    try { if (client) await client.end(); } catch (_) { /* ignore */ }
    try { if (admin) await admin.end(); } catch (_) { /* ignore */ }
    try { if (cluster) await cluster.stop(); } catch (_) { /* ignore */ }
    try { fs.rmSync(path.join(CACHE, "d65-data"), { recursive: true, force: true }); } catch (_) { /* ignore */ }
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("D65 REHEARSAL FAILED:", error.message);
    process.exit(1);
  });
}
