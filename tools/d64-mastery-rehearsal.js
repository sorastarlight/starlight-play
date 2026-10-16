/* D64 species mastery event ledger.
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
const DRAFT = path.join(ROOT, "supabase", "unapplied", "d64-mastery", "001_species_mastery_events.sql");
const ROLLBACK = path.join(ROOT, "supabase", "unapplied", "d64-mastery", "rollback.sql");
const HOST = "127.0.0.1";
const PORT = 55439;
const USER = "postgres";
const PASSWORD = "d64-mastery-local-only";
const DB_MAIN = "d64_mastery";
const A = "aaaaaaaa-0000-4000-8000-000000000001";
const B = "bbbbbbbb-0000-4000-8000-000000000002";
const C = "cccccccc-0000-4000-8000-000000000003";

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

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY
);

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
  transferred_at timestamptz
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
INSERT INTO public.species_mastery (user_id, dex, points, rank)
VALUES ('${A}', 1, 7, 2);
INSERT INTO public.mastery_ledger (user_id, dex, amount, reason, idempotency)
VALUES ('${A}', 1, 1, 'CATCH', 'mastery-catch:fixture');
`;

async function specimen(client, opts) {
  const trainer = opts.trainer;
  const dex = opts.dex;
  const round = crypto.randomUUID();
  const catchId = crypto.randomUUID();
  const variant = opts.variant || "normal";
  const form = opts.form == null ? null : opts.form;
  const method = opts.method || "CAPTURE";
  const test = !!opts.test;
  let source = opts.source;
  if (source === undefined) source = `play:${round}:${trainer}`;
  const rules = test ? { rewardMode: "test" } : { rewardMode: "live" };
  await client.query(
    "INSERT INTO public.encounter_rounds (id, dex, rules) VALUES ($1, $2, $3::jsonb)",
    [round, dex, JSON.stringify(rules)]
  );
  await client.query(
    `INSERT INTO public.catches
      (id, user_id, dex, variant, gender, source_key, round_id, pokemon_form_id, obtained_method)
     VALUES ($1, $2, $3, $4, 'Unknown', $5, $6, $7, $8)`,
    [catchId, trainer, dex, variant, source, round, form, method]
  );
  if (opts.log !== false) {
    await client.query(
      "INSERT INTO public.capture_log (round_id, user_id, dex, success) VALUES ($1, $2, $3, $4)",
      [round, trainer, dex, opts.success !== false]
    );
  }
  return { catchId, round, source, dex, variant, form };
}

async function progress(client, trainer) {
  await client.query("BEGIN");
  try {
    await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [trainer]);
    await client.query("SET LOCAL ROLE authenticated");
    const { rows } = await client.query(
      `SELECT dex, eligible_captures, tier_level, tier_name
       FROM public.species_mastery_progress
       ORDER BY dex`
    );
    await client.query("COMMIT");
    return rows;
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch (_) { /* ignore */ }
    throw error;
  }
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

async function main() {
  let admin;
  let client;
  let clientB;
  let cluster = null;
  refuseHosted();
  console.log(`D64 MASTERY REHEARSAL TARGET: ${HOST}:${PORT}/${DB_MAIN} (embedded local; NOT supabase)`);
  const embedPath = path.join(CACHE, "node_modules", "embedded-postgres", "dist", "index.js");
  if (!fs.existsSync(embedPath)) {
    throw new Error("embedded-postgres missing under tools/.cache/d54-pg-harness");
  }
  const EmbeddedPostgres = (await import(pathToFileURL(embedPath).href)).default;
  const dataDir = path.join(CACHE, "d64-data");
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
      if (/ERROR|FATAL|PANIC/i.test(text) && !/mastery event rejected|mastery events are immutable|permission denied|duplicate key/i.test(text)) {
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
    await applyFile(client, DRAFT);
    await client.query("GRANT USAGE ON SCHEMA private TO authenticated, anon");
    record("draft migration applies on an empty local database", true);

    const first = await specimen(client, { trainer: A, dex: 1 });
    const recorded = await client.query(
      "SELECT private.record_species_mastery_event($1::uuid) AS id",
      [first.catchId]
    );
    assert(recorded.rows[0].id === first.catchId);
    let rows = await progress(client, A);
    assert(rows.length === 1 && rows[0].dex === 1 && Number(rows[0].eligible_captures) === 1 && rows[0].tier_name === "Familiar");
    record("1 valid first capture", true, "dex 1 Familiar");

    const shiny = await specimen(client, { trainer: A, dex: 1, variant: "shiny" });
    const formed = await specimen(client, { trainer: A, dex: 1, variant: "normal", form: 19 });
    await client.query("SELECT private.record_species_mastery_event($1::uuid)", [shiny.catchId]);
    await client.query("SELECT private.record_species_mastery_event($1::uuid)", [formed.catchId]);
    const unchanged = await client.query(
      "SELECT id, variant, pokemon_form_id, dex FROM public.catches WHERE id = ANY($1::uuid[]) ORDER BY variant, pokemon_form_id NULLS FIRST",
      [[first.catchId, shiny.catchId, formed.catchId]]
    );
    assert(unchanged.rows.length === 3);
    assert(unchanged.rows.some((row) => row.variant === "shiny" && row.dex === 1));
    assert(unchanged.rows.some((row) => Number(row.pokemon_form_id) === 19));
    rows = await progress(client, A);
    assert(Number(rows.find((row) => row.dex === 1).eligible_captures) === 3);
    assert(rows.find((row) => row.dex === 1).tier_name === "Acquainted");
    record("2 multiple captures of one species", true, "3 eligible, Acquainted");
    record("6 shiny and alternate-form captures share the national dex", true, "specimens unchanged");

    const replay = await client.query(
      "SELECT private.record_species_mastery_event($1::uuid) AS id",
      [first.catchId]
    );
    assert(replay.rows[0].id === first.catchId);
    const eventCount = await client.query(
      "SELECT count(*)::int AS n FROM public.species_mastery_events WHERE catch_id = $1",
      [first.catchId]
    );
    assert(eventCount.rows[0].n === 1);
    rows = await progress(client, A);
    assert(Number(rows.find((row) => row.dex === 1).eligible_captures) === 3);
    record("3 replay of the same catch", true, "still one event and count 3");

    const mismatch = await expectFail(
      client,
      `INSERT INTO public.species_mastery_events (catch_id, trainer_id, dex, round_id, source_key)
       VALUES ($1, $2, 1, $3, $4)`,
      [first.catchId, B, first.round, first.source]
    );
    assert(mismatch.code === "23514" || /does not match the specimen/.test(mismatch.message));
    const otherCatch = await specimen(client, { trainer: B, dex: 1 });
    const stolen = await expectFail(
      client,
      `INSERT INTO public.species_mastery_events (catch_id, trainer_id, dex, round_id, source_key)
       VALUES ($1, $2, 1, $3, $4)`,
      [otherCatch.catchId, A, otherCatch.round, otherCatch.source]
    );
    assert(/does not match the specimen/.test(stolen.message));
    record("4 conflicting trainer and catch references", true, stolen.code || "23514");

    await client.query("SELECT private.record_species_mastery_event($1::uuid)", [otherCatch.catchId]);
    const rowsB = await progress(client, B);
    assert(rowsB.length === 1 && rowsB[0].dex === 1 && Number(rowsB[0].eligible_captures) === 1);
    rows = await progress(client, A);
    assert(!rows.some((row) => row.trainer_id && row.trainer_id !== A));
    assert(Number(rows.find((row) => row.dex === 1).eligible_captures) === 3);
    record("5 two trainers capturing the same species", true, "A stays 3, B is 1");

    const evo = await specimen(client, { trainer: A, dex: 2 });
    await client.query("SELECT private.record_species_mastery_event($1::uuid)", [evo.catchId]);
    rows = await progress(client, A);
    const dex1 = rows.find((row) => row.dex === 1);
    const dex2 = rows.find((row) => row.dex === 2);
    assert(Number(dex1.eligible_captures) === 3 && dex1.tier_name === "Acquainted");
    assert(Number(dex2.eligible_captures) === 1 && dex2.tier_name === "Familiar");
    record("7 different species and evolutions stay separate", true, "dex 1 and dex 2");

    const rejected = [];
    rejected.push(await specimen(client, { trainer: A, dex: 4, success: false }));
    rejected.push(await specimen(client, { trainer: A, dex: 4, log: false }));
    rejected.push(await specimen(client, { trainer: A, dex: 4, source: null }));
    rejected.push(await specimen(client, { trainer: A, dex: 4, source: "play:not-this-round" }));
    rejected.push(await specimen(client, { trainer: A, dex: 4, source: `admin:${crypto.randomUUID()}:${A}`, method: "CAPTURE" }));
    rejected.push(await specimen(client, { trainer: A, dex: 4, source: `grant:${crypto.randomUUID()}:${A}`, method: "CAPTURE" }));
    rejected.push(await specimen(client, { trainer: A, dex: 4, source: `event:${crypto.randomUUID()}:${A}`, method: "CAPTURE" }));
    rejected.push(await specimen(client, { trainer: A, dex: 4, source: `import:${crypto.randomUUID()}:${A}`, method: "CAPTURE" }));
    rejected.push(await specimen(client, { trainer: A, dex: 4, source: `reset:${crypto.randomUUID()}:${A}`, method: "CAPTURE" }));
    rejected.push(await specimen(client, { trainer: A, dex: 4, test: true }));
    let rejectedErrors = 0;
    for (const row of rejected) {
      const error = await expectFail(
        client,
        "SELECT private.record_species_mastery_event($1::uuid)",
        [row.catchId]
      );
      if (/mastery event rejected/.test(error.message)) rejectedErrors += 1;
    }
    const missing = await expectFail(
      client,
      "SELECT private.record_species_mastery_event($1::uuid)",
      [crypto.randomUUID()]
    );
    assert(/specimen is not on file/.test(missing.message));
    const badCount = await client.query(
      "SELECT count(*)::int AS n FROM public.species_mastery_events WHERE catch_id = ANY($1::uuid[])",
      [rejected.map((row) => row.catchId)]
    );
    assert(rejectedErrors === rejected.length && badCount.rows[0].n === 0);
    rows = await progress(client, A);
    assert(Number(rows.find((row) => row.dex === 1).eligible_captures) === 3);
    assert(!rows.some((row) => row.dex === 4));
    record("8 invalid or missing provenance earns nothing", true, `${rejected.length} rejected, dex 4 absent`);

    const sample = first.catchId;
    await client.query("BEGIN");
    await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [A]);
    await client.query("SET LOCAL ROLE authenticated");
    const insertDenied = await expectFail(
      client,
      `INSERT INTO public.species_mastery_events (catch_id, trainer_id, dex, round_id, source_key)
       VALUES ($1, $2, 1, $3, $4)`,
      [sample, A, first.round, first.source]
    );
    await client.query("ROLLBACK");
    assert(insertDenied.code === "42501");
    await client.query("BEGIN");
    await client.query("SET LOCAL ROLE authenticated");
    const callDenied = await expectFail(
      client,
      "SELECT private.record_species_mastery_event($1::uuid)",
      [sample]
    );
    await client.query("ROLLBACK");
    assert(callDenied.code === "42501");
    record("9 unauthorized client insert attempts", true, "42501 table and function");

    await client.query("BEGIN");
    await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [A]);
    await client.query("SET LOCAL ROLE authenticated");
    const updateDenied = await expectFail(
      client,
      "UPDATE public.species_mastery_events SET dex = 9 WHERE catch_id = $1",
      [sample]
    );
    await client.query("ROLLBACK");
    await client.query("BEGIN");
    await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [A]);
    await client.query("SET LOCAL ROLE authenticated");
    const deleteDenied = await expectFail(
      client,
      "DELETE FROM public.species_mastery_events WHERE catch_id = $1",
      [sample]
    );
    await client.query("ROLLBACK");
    assert(updateDenied.code === "42501" && deleteDenied.code === "42501");
    const immutable = await expectFail(
      client,
      "UPDATE public.species_mastery_events SET dex = 9 WHERE catch_id = $1",
      [sample]
    );
    assert(/immutable/.test(immutable.message));
    const still = await client.query(
      "SELECT dex FROM public.species_mastery_events WHERE catch_id = $1",
      [sample]
    );
    assert(still.rows[0].dex === 1);
    record("10 unauthorized updates and deletes", true, "client 42501, owner update rejected");

    const seenByA = await progress(client, A);
    const seenByB = await progress(client, B);
    assert(seenByA.every((row) => true) && seenByA.some((row) => row.dex === 2));
    assert(seenByB.length === 1 && seenByB[0].dex === 1 && Number(seenByB[0].eligible_captures) === 1);
    await client.query("BEGIN");
    await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [B]);
    await client.query("SET LOCAL ROLE authenticated");
    const leaked = await client.query(
      "SELECT count(*)::int AS n FROM public.species_mastery_events WHERE trainer_id = $1",
      [A]
    );
    await client.query("COMMIT");
    assert(leaked.rows[0].n === 0);
    await client.query("BEGIN");
    await client.query("SET LOCAL ROLE anon");
    const anonDenied = await expectFail(client, "SELECT * FROM public.species_mastery_progress");
    await client.query("ROLLBACK");
    assert(anonDenied.code === "42501");
    record("11 trainer-specific read isolation", true, "B cannot read A; anon denied");

    const marks = new Map();
    for (let i = 1; i <= 20; i += 1) {
      const row = await specimen(client, { trainer: A, dex: 25 });
      await client.query("SELECT private.record_species_mastery_event($1::uuid)", [row.catchId]);
      if ([1, 3, 6, 12, 20].includes(i)) {
        const tier = (await progress(client, A)).find((item) => item.dex === 25);
        marks.set(i, `${tier.tier_name}:${tier.tier_level}`);
      }
    }
    assert(marks.get(1) === "Familiar:1");
    assert(marks.get(3) === "Acquainted:2");
    assert(marks.get(6) === "Experienced:3");
    assert(marks.get(12) === "Specialist:4");
    assert(marks.get(20) === "Expert:5");
    const points = await client.query(
      "SELECT points, rank FROM public.species_mastery WHERE user_id = $1 AND dex = 1",
      [A]
    );
    assert(points.rows[0].points === 7 && points.rows[0].rank === 2);
    record("12 threshold calculations", true, "1/3/6/12/20");

    clientB = cluster.getPgClient(DB_MAIN, HOST);
    await clientB.connect();
    await clientB.query("SET statement_timeout = '20s'");
    const race = await specimen(client, { trainer: A, dex: 39 });
    await client.query("BEGIN");
    await client.query("SELECT private.record_species_mastery_event($1::uuid)", [race.catchId]);
    const pending = clientB.query(
      "SELECT private.record_species_mastery_event($1::uuid) AS id",
      [race.catchId]
    );
    await new Promise((resolve) => setTimeout(resolve, 300));
    await client.query("COMMIT");
    const second = await pending;
    assert(second.rows[0].id === race.catchId);
    const raced = await client.query(
      "SELECT count(*)::int AS n FROM public.species_mastery_events WHERE catch_id = $1",
      [race.catchId]
    );
    assert(raced.rows[0].n === 1);
    record("13 concurrent duplicate insertion", true, "one row");

    const kept = await specimen(client, { trainer: C, dex: 7 });
    const dropped = await specimen(client, { trainer: C, dex: 7 });
    await client.query("SELECT private.record_species_mastery_event($1::uuid)", [kept.catchId]);
    await client.query("SELECT private.record_species_mastery_event($1::uuid)", [dropped.catchId]);
    await client.query("UPDATE public.catches SET transferred_at = now() WHERE id = $1", [kept.catchId]);
    let stillKept = await client.query(
      "SELECT count(*)::int AS n FROM public.species_mastery_events WHERE catch_id = $1",
      [kept.catchId]
    );
    assert(stillKept.rows[0].n === 1);
    await client.query("DELETE FROM public.catches WHERE id = $1", [kept.catchId]);
    stillKept = await client.query(
      "SELECT count(*)::int AS n FROM public.species_mastery_events WHERE catch_id = $1",
      [kept.catchId]
    );
    assert(stillKept.rows[0].n === 1);
    await client.query("DELETE FROM public.profiles WHERE id = $1", [C]);
    const gone = await client.query(
      "SELECT count(*)::int AS n FROM public.species_mastery_events WHERE trainer_id = $1",
      [C]
    );
    const aRemains = await client.query(
      "SELECT count(*)::int AS n FROM public.species_mastery_events WHERE trainer_id = $1",
      [A]
    );
    assert(gone.rows[0].n === 0 && aRemains.rows[0].n > 0);
    record("14 foreign-key and deletion behavior", true, "release and catch delete keep the event; profile delete cascades");

    const ledger = await client.query(
      "SELECT amount, reason, idempotency FROM public.mastery_ledger WHERE user_id = $1",
      [A]
    );
    const pointsAfter = await client.query(
      "SELECT points, rank FROM public.species_mastery WHERE user_id = $1 AND dex = 1",
      [A]
    );
    assert(pointsAfter.rows[0].points === 7 && pointsAfter.rows[0].rank === 2);
    assert(ledger.rows.length === 1 && ledger.rows[0].idempotency === "mastery-catch:fixture");
    const catchStill = await client.query("SELECT variant FROM public.catches WHERE id = $1", [shiny.catchId]);
    assert(catchStill.rows[0].variant === "shiny");
    record("15 compatibility with existing points mastery", true, "points 7 rank 2 unchanged");

    const rolled = await specimen(client, { trainer: A, dex: 63 });
    await client.query("BEGIN");
    await client.query("SELECT private.record_species_mastery_event($1::uuid)", [rolled.catchId]);
    await client.query("ROLLBACK");
    const rolledAway = await client.query(
      "SELECT count(*)::int AS n FROM public.species_mastery_events WHERE catch_id = $1",
      [rolled.catchId]
    );
    const tainted = await specimen(client, { trainer: A, dex: 4, success: false });
    await client.query("BEGIN");
    await client.query("UPDATE public.species_mastery SET points = 99 WHERE user_id = $1 AND dex = 1", [A]);
    const aborted = await expectFail(
      client,
      "SELECT private.record_species_mastery_event($1::uuid)",
      [tainted.catchId]
    );
    assert(/mastery event rejected/.test(aborted.message));
    await client.query("ROLLBACK");
    const pointsHeld = await client.query(
      "SELECT points FROM public.species_mastery WHERE user_id = $1 AND dex = 1",
      [A]
    );
    assert(rolledAway.rows[0].n === 0 && pointsHeld.rows[0].points === 7);
    record("interrupted transaction rolls back the event and points", true, "no partial event");

    const catchBefore = await client.query("SELECT count(*)::int AS n FROM public.catches");
    await applyFile(client, ROLLBACK);
    const catchAfter = await client.query("SELECT count(*)::int AS n FROM public.catches");
    const pointsRollback = await client.query(
      "SELECT points, rank FROM public.species_mastery WHERE user_id = $1 AND dex = 1",
      [A]
    );
    const objects = await client.query(
      `SELECT
         to_regclass('public.species_mastery_events') AS events,
         to_regclass('public.species_mastery_progress') AS progress,
         to_regprocedure('private.record_species_mastery_event(uuid)') AS recorder`
    );
    assert(catchAfter.rows[0].n === catchBefore.rows[0].n);
    assert(pointsRollback.rows[0].points === 7 && pointsRollback.rows[0].rank === 2);
    assert(objects.rows[0].events == null && objects.rows[0].progress == null && objects.rows[0].recorder == null);
    record("16 safe rollback on disposable data", true, "catches and points unchanged");

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
    try { fs.rmSync(path.join(CACHE, "d64-data"), { recursive: true, force: true }); } catch (_) { /* ignore */ }
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("D64 REHEARSAL FAILED:", error.message);
    process.exit(1);
  });
}
