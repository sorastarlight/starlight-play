/* D80 launch-guard and selector-split rehearsal.
 * Disposable LOCAL cluster only. Copies the hosted round_phase / round_is_active
 * bodies and a one-expression correction. It does not settle a catch, spend an
 * item, or connect to hosted Supabase.
 * The QA selector functions are a design model, not an installable migration.
 */
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const { refuseHosted, BANNED } = require("./a19-schema-rehearsal.js");

const CACHE = path.join(__dirname, ".cache", "d54-pg-harness");
const HOST = "127.0.0.1";
const PORT = 55450;
const USER = "postgres";
const PASSWORD = "d80-guard-local-only";
const QA = "1d36e67c-298d-4657-8685-19363af9b7cc";
const STRANGER = "33333333-3333-4333-8333-333333333333";

const results = [];
function record(name, passed, detail) {
  results.push({ name, passed, detail: detail || "" });
  console.log(`${passed ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}
function assert(cond, detail) {
  if (!cond) throw new Error(detail || "failed");
}

const SCHEMA = `
CREATE TABLE public.encounter_rounds (
  id uuid PRIMARY KEY,
  source_id text,
  phase text NOT NULL DEFAULT 'closed',
  ends_at timestamptz,
  hidden boolean NOT NULL DEFAULT true,
  dex integer,
  name text,
  started_at timestamptz,
  deadlines jsonb,
  rules jsonb,
  resolved boolean NOT NULL DEFAULT false,
  cancelled boolean NOT NULL DEFAULT false,
  paused_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.play_console_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  round_id uuid NOT NULL,
  message text NOT NULL
);
CREATE TABLE private.qa_allow (
  round_id uuid PRIMARY KEY,
  trainer_id uuid NOT NULL,
  enabled boolean NOT NULL
);

CREATE FUNCTION private.deadlines_complete(d jsonb) RETURNS boolean
LANGUAGE sql IMMUTABLE AS $$
  SELECT d IS NOT NULL
    AND nullif(d->>'join', '') IS NOT NULL
    AND nullif(d->>'prepare', '') IS NOT NULL
    AND nullif(d->>'throw', '') IS NOT NULL
    AND nullif(d->>'reveal', '') IS NOT NULL
$$;

CREATE FUNCTION private.round_phase(r public.encounter_rounds) RETURNS text
LANGUAGE plpgsql STABLE AS $$
DECLARE clk timestamptz;
BEGIN
  IF r IS NULL OR r.cancelled THEN
    RETURN 'closed';
  END IF;
  IF NOT private.deadlines_complete(r.deadlines) THEN
    RETURN coalesce(nullif(r.phase, ''), 'closed');
  END IF;
  clk := coalesce(r.paused_at, now());
  RETURN CASE
    WHEN clk < (r.deadlines->>'join')::timestamptz THEN 'join'
    WHEN clk < (r.deadlines->>'prepare')::timestamptz THEN 'prepare'
    WHEN clk < (r.deadlines->>'throw')::timestamptz THEN 'throw'
    WHEN clk < (r.deadlines->>'reveal')::timestamptz THEN 'reveal'
    ELSE 'closed'
  END;
END
$$;

CREATE FUNCTION private.round_is_active(r public.encounter_rounds) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT r IS NOT NULL AND NOT r.cancelled AND private.round_phase(r) <> 'closed'
$$;

CREATE FUNCTION private.round_is_active_fixed(r public.encounter_rounds) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT r.id IS NOT NULL AND NOT r.cancelled AND private.round_phase(r) <> 'closed'
$$;

CREATE FUNCTION private.latest_round() RETURNS public.encounter_rounds
LANGUAGE sql STABLE AS $$
  SELECT r.*
  FROM public.encounter_rounds r
  ORDER BY
    CASE
      WHEN coalesce(r.cancelled, false) = false AND private.round_phase(r) <> 'closed' THEN 0
      ELSE 1
    END,
    coalesce(r.started_at, r.updated_at) DESC,
    r.updated_at DESC
  LIMIT 1
$$;

CREATE FUNCTION private.open_deadlines() RETURNS jsonb
LANGUAGE sql STABLE AS $$
  SELECT jsonb_build_object(
    'join', now() + interval '30 seconds',
    'prepare', now() + interval '60 seconds',
    'throw', now() + interval '90 seconds',
    'reveal', now() + interval '105 seconds'
  )
$$;

CREATE FUNCTION private.launch_fixed(p_id uuid) RETURNS uuid
LANGUAGE plpgsql AS $$
DECLARE r public.encounter_rounds;
BEGIN
  PERFORM pg_advisory_xact_lock(87231001);
  SELECT * INTO r FROM private.latest_round();
  IF r.id IS NOT NULL AND NOT r.cancelled AND r.deadlines IS NOT NULL
     AND now() >= (r.deadlines->>'throw')::timestamptz THEN
    UPDATE public.encounter_rounds
       SET resolved = true,
           phase = CASE
             WHEN now() >= (r.deadlines->>'reveal')::timestamptz THEN 'closed'
             ELSE phase
           END,
           updated_at = now()
     WHERE id = r.id;
    SELECT * INTO r FROM public.encounter_rounds WHERE id = r.id;
  END IF;
  IF private.round_is_active_fixed(r) THEN
    RAISE EXCEPTION 'A community round is already running.';
  END IF;
  INSERT INTO public.encounter_rounds (id, phase, deadlines, started_at, source_id, paused_at)
  VALUES (p_id, 'join', private.open_deadlines(), now(), NULL, NULL);
  RETURN p_id;
END
$$;

CREATE FUNCTION private.launch_fixed_slow(p_id uuid) RETURNS uuid
LANGUAGE plpgsql AS $$
DECLARE launched uuid;
BEGIN
  launched := private.launch_fixed(p_id);
  PERFORM pg_sleep(0.4);
  RETURN launched;
END
$$;

CREATE FUNCTION private.public_latest() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT r.id
  FROM public.encounter_rounds r
  WHERE coalesce(r.rules->>'lane', 'public') <> 'qa'
  ORDER BY
    CASE WHEN coalesce(r.cancelled, false) = false AND private.round_phase(r) <> 'closed' THEN 0 ELSE 1 END,
    coalesce(r.started_at, r.updated_at) DESC
  LIMIT 1
$$;

CREATE FUNCTION private.qa_visible(p_round uuid, p_uid uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM private.qa_allow a
    WHERE a.round_id = p_round AND a.enabled AND a.trainer_id = p_uid
  )
$$;
`;

function deadlines(pastThrow) {
  if (!pastThrow) return null;
  return JSON.stringify({
    join: new Date(Date.now() - 90000).toISOString(),
    prepare: new Date(Date.now() - 60000).toISOString(),
    throw: new Date(Date.now() - 1000).toISOString(),
    reveal: new Date(Date.now() + 15000).toISOString()
  });
}

async function main() {
  let admin;
  let cluster = null;
  const clients = [];
  refuseHosted();
  console.log(`D80 GUARD TARGET: ${HOST}:${PORT} (embedded local; NOT supabase)`);
  console.log("LIMIT: launch and selector model. Production settle_if_needed, odds, and spending were not executed.");
  const embedPath = path.join(CACHE, "node_modules", "embedded-postgres", "dist", "index.js");
  if (!fs.existsSync(embedPath)) throw new Error("embedded-postgres missing");
  const EmbeddedPostgres = (await import(pathToFileURL(embedPath).href)).default;
  const dataDir = path.join(CACHE, "d80-data");
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
    assert(!BANNED.test(String(target.rows[0].addr || "")), "non-loopback");
    record("guard model runs on loopback Postgres", true, `${HOST}:${PORT} PostgreSQL ${target.rows[0].version}`);
    await cluster.createDatabase("d80_guard");
    const client = cluster.getPgClient("d80_guard", HOST);
    await client.connect();
    clients.push(client);
    await client.query("CREATE SCHEMA private");
    await client.query(SCHEMA);

    const empty = await client.query("SELECT private.round_is_active(NULL::public.encounter_rounds) AS old, private.round_is_active_fixed(NULL::public.encounter_rounds) AS fixed");
    assert(empty.rows[0].old !== true && empty.rows[0].fixed !== true);
    record("no round: both active checks stay false", true);

    await client.query(`
      INSERT INTO public.encounter_rounds (id, phase, deadlines, started_at, source_id, paused_at)
      VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'join', private.open_deadlines(), now(), NULL, NULL)
    `);
    const sparse = await client.query(`
      SELECT private.round_phase(r) AS phase,
             private.round_is_active(r) AS old,
             private.round_is_active_fixed(r) AS fixed,
             (r IS NOT NULL) AS row_not_null,
             r.id IS NOT NULL AS id_present
      FROM public.encounter_rounds r
      WHERE id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
    `);
    assert(sparse.rows[0].phase === "join", JSON.stringify(sparse.rows[0]));
    assert(sparse.rows[0].row_not_null === false && sparse.rows[0].id_present === true);
    assert(sparse.rows[0].old === false && sparse.rows[0].fixed === true);
    record("open round with null optional columns: hosted check is false, id check is true", true);

    await client.query(`
      INSERT INTO public.encounter_rounds (
        id, source_id, phase, ends_at, hidden, dex, name, started_at, deadlines, rules,
        resolved, cancelled, paused_at
      ) VALUES (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'src', 'join', now() + interval '105 seconds',
        false, 1, 'Bulbasaur', now(), private.open_deadlines(), '{"lane":"public"}'::jsonb,
        false, false, now() - interval '1 second'
      )
    `);
    const full = await client.query(`
      SELECT (r IS NOT NULL) AS row_not_null,
             private.round_phase(r) AS phase,
             private.round_is_active(r) AS old,
             private.round_is_active_fixed(r) AS fixed
      FROM public.encounter_rounds r
      WHERE id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'
    `);
    assert(full.rows[0].row_not_null === true && full.rows[0].phase === "join");
    assert(full.rows[0].old === true && full.rows[0].fixed === true);
    record("fully populated open round: hosted check and id check both true", true);

    const paused = await client.query(`
      SELECT private.round_phase(r) AS phase, r.paused_at IS NOT NULL AS paused, private.round_is_active_fixed(r) AS fixed
      FROM public.encounter_rounds r
      WHERE id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'
    `);
    assert(paused.rows[0].paused === true && paused.rows[0].phase === "join" && paused.rows[0].fixed === true);
    record("paused clock still inside the join window stays active under the id check", true);

    await client.query(`
      INSERT INTO public.encounter_rounds (id, phase, cancelled, deadlines, started_at)
      VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 'join', true, private.open_deadlines(), now())
    `);
    const cancelled = await client.query(`
      SELECT private.round_phase(r) AS phase, private.round_is_active_fixed(r) AS fixed
      FROM public.encounter_rounds r WHERE id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3'
    `);
    assert(cancelled.rows[0].phase === "closed" && cancelled.rows[0].fixed === false);
    record("cancelled round is not active", true);

    await client.query("DELETE FROM public.encounter_rounds");
    await client.query(`
      INSERT INTO public.encounter_rounds (id, phase, deadlines, started_at, resolved)
      VALUES (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', 'reveal', $1::jsonb, now() - interval '2 minutes', true
      )
    `, [JSON.stringify({
      join: new Date(Date.now() - 120000).toISOString(),
      prepare: new Date(Date.now() - 90000).toISOString(),
      throw: new Date(Date.now() - 60000).toISOString(),
      reveal: new Date(Date.now() - 1000).toISOString()
    })]);
    const closed = await client.query(`
      SELECT private.round_phase(r) AS phase, private.round_is_active_fixed(r) AS fixed
      FROM public.encounter_rounds r WHERE id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4'
    `);
    assert(closed.rows[0].phase === "closed" && closed.rows[0].fixed === false);
    record("round past its reveal deadline is not active", true);

    await client.query("DELETE FROM public.encounter_rounds");
    const first = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1";
    const second = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2";
    await client.query("SELECT private.launch_fixed($1)", [first]);
    let blocked = false;
    try {
      await client.query("SELECT private.launch_fixed($1)", [second]);
    } catch (error) {
      blocked = /already running/.test(error.message);
    }
    assert(blocked);
    const count = await client.query("SELECT count(*)::int AS n FROM public.encounter_rounds");
    assert(count.rows[0].n === 1);
    record("a second launch raises while the first open round exists", true);

    const other = cluster.getPgClient("d80_guard", HOST);
    await other.connect();
    clients.push(other);
    await client.query("DELETE FROM public.encounter_rounds");
    const left = "cccccccc-cccc-4ccc-8ccc-ccccccccccc1";
    const right = "cccccccc-cccc-4ccc-8ccc-ccccccccccc2";
    const pair = await Promise.allSettled([
      client.query("SELECT private.launch_fixed_slow($1)", [left]),
      other.query("SELECT private.launch_fixed($1)", [right])
    ]);
    const ok = pair.filter((row) => row.status === "fulfilled").length;
    const rejected = pair.filter((row) => row.status === "rejected" && /already running/.test(row.reason.message)).length;
    assert(ok === 1 && rejected === 1, JSON.stringify(pair.map((row) => row.status)));
    record("two overlapping launches: the advisory lock lets one insert and the other raises", true);

    await client.query("DELETE FROM public.encounter_rounds");
    await client.query(`
      INSERT INTO public.encounter_rounds (id, phase, deadlines, started_at)
      VALUES ('dddddddd-dddd-4ddd-8ddd-ddddddddddd1', 'throw', $1::jsonb, now() - interval '2 minutes')
    `, [deadlines(true)]);
    const duringReveal = await client.query(`
      SELECT private.round_phase(r) AS phase, private.round_is_active_fixed(r) AS fixed
      FROM public.encounter_rounds r
      WHERE id = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1'
    `);
    assert(duringReveal.rows[0].phase === "reveal" && duringReveal.rows[0].fixed === true, JSON.stringify(duringReveal.rows[0]));
    let revealBlocks = false;
    try {
      await client.query("SELECT private.launch_fixed($1)", ["dddddddd-dddd-4ddd-8ddd-ddddddddddd2"]);
    } catch (error) {
      revealBlocks = /already running/.test(error.message);
    }
    assert(revealBlocks);
    record("a round inside its reveal window still blocks the next launch", true, "deadlines decide the phase; the failed launch rolls back");

    await client.query("DELETE FROM public.encounter_rounds");
    await client.query(`
      INSERT INTO public.encounter_rounds (id, phase, cancelled, resolved, deadlines, started_at)
      VALUES ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1', 'closed', true, true, private.open_deadlines(), now() - interval '5 minutes')
    `);
    const fresh = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2";
    await client.query("SELECT private.launch_fixed($1)", [fresh]);
    const picked = await client.query("SELECT id FROM private.latest_round()");
    assert(picked.rows[0].id === fresh);
    record("after closure, latest_round selects the new public round", true);

    const orderBefore = await client.query("SELECT pg_get_functiondef('private.latest_round()'::regprocedure) AS def");
    assert(!orderBefore.rows[0].def.includes("round_is_active"));
    record("public latest_round does not consult the active boolean", true);

    await client.query("DELETE FROM public.encounter_rounds");
    await client.query(`
      INSERT INTO public.encounter_rounds (id, phase, deadlines, started_at, rules)
      VALUES
        ('f1111111-1111-4111-8111-111111111111', 'join', private.open_deadlines(), now() - interval '5 seconds', '{"lane":"public"}'::jsonb),
        ('f2222222-2222-4222-8222-222222222222', 'join', private.open_deadlines(), now(), '{"lane":"qa"}'::jsonb)
    `);
    await client.query(
      "INSERT INTO private.qa_allow (round_id, trainer_id, enabled) VALUES ('f2222222-2222-4222-8222-222222222222', $1, true)",
      [QA]
    );
    await client.query(
      "INSERT INTO public.play_console_log (round_id, message) VALUES ('f2222222-2222-4222-8222-222222222222', 'qa line'), ('f1111111-1111-4111-8111-111111111111', 'public line')"
    );
    const pub = await client.query("SELECT private.public_latest() AS id");
    assert(pub.rows[0].id === "f1111111-1111-4111-8111-111111111111");
    const globalLatest = await client.query("SELECT id FROM private.latest_round()");
    assert(globalLatest.rows[0].id === "f2222222-2222-4222-8222-222222222222");
    const allowed = await client.query("SELECT private.qa_visible('f2222222-2222-4222-8222-222222222222', $1) AS ok", [QA]);
    const denied = await client.query("SELECT private.qa_visible('f2222222-2222-4222-8222-222222222222', $1) AS ok", [STRANGER]);
    assert(allowed.rows[0].ok === true && denied.rows[0].ok === false);
    const leaked = await client.query(`
      SELECT count(*)::int AS n FROM public.play_console_log
      WHERE message = 'qa line'
    `);
    assert(leaked.rows[0].n === 1);
    record("unfiltered latest_round prefers the newer QA row; a lane filter keeps the public row", true);
    record("allow-list admits PlayerQA and rejects another trainer", true);
    record("an unfiltered console read still returns the QA line", true, "design model; RLS was not installed");

    const missed = results.filter((row) => !row.passed);
    console.log(`D80 GUARD ${results.length - missed.length}/${results.length}`);
    if (missed.length) process.exitCode = 1;
  } finally {
    await Promise.all(clients.map((client) => client.end().catch(() => {})));
    if (admin) await admin.end().catch(() => {});
    if (cluster) await cluster.stop().catch(() => {});
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
