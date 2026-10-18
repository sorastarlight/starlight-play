/* D81 launch-guard rehearsal.
 * Disposable LOCAL cluster only. Applies the unapplied D81 files.
 * Does not connect to hosted Supabase and does not use a hosted trainer.
 * Director pause, cancel, dashboard status, and gift-joined are models of the
 * hosted control flow. settle_if_needed, odds, and production grant_items are absent.
 */
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const { refuseHosted, BANNED } = require("./a19-schema-rehearsal.js");

const ROOT = path.join(__dirname, "..");
const CACHE = path.join(__dirname, ".cache", "d54-pg-harness");
const HOST = "127.0.0.1";
const PORT = 55451;
const USER = "postgres";
const PASSWORD = "d81-guard-local-only";
const HOSTED_MD5 = "5732cc462502e346843eedb76fada494";
const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

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
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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
  last_action text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.encounter_players (
  round_id uuid NOT NULL,
  user_id uuid NOT NULL,
  prep text,
  ball text,
  throw_processed boolean NOT NULL DEFAULT false,
  result_reason text,
  PRIMARY KEY (round_id, user_id)
);
CREATE TABLE public.inventories (
  user_id uuid PRIMARY KEY,
  berry integer NOT NULL DEFAULT 0,
  pokeball integer NOT NULL DEFAULT 0
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
  select r is not null and not r.cancelled and private.round_phase(r) <> 'closed';
$$;
CREATE FUNCTION private.deadlines_for(p_phase text) RETURNS jsonb
LANGUAGE sql STABLE AS $$
  SELECT CASE p_phase
    WHEN 'join' THEN jsonb_build_object(
      'join', now() + interval '30 seconds',
      'prepare', now() + interval '60 seconds',
      'throw', now() + interval '90 seconds',
      'reveal', now() + interval '105 seconds')
    WHEN 'prepare' THEN jsonb_build_object(
      'join', now() - interval '1 second',
      'prepare', now() + interval '30 seconds',
      'throw', now() + interval '60 seconds',
      'reveal', now() + interval '75 seconds')
    WHEN 'throw' THEN jsonb_build_object(
      'join', now() - interval '60 seconds',
      'prepare', now() - interval '1 second',
      'throw', now() + interval '30 seconds',
      'reveal', now() + interval '45 seconds')
    WHEN 'reveal' THEN jsonb_build_object(
      'join', now() - interval '90 seconds',
      'prepare', now() - interval '60 seconds',
      'throw', now() - interval '1 second',
      'reveal', now() + interval '15 seconds')
    ELSE jsonb_build_object(
      'join', now() - interval '120 seconds',
      'prepare', now() - interval '90 seconds',
      'throw', now() - interval '60 seconds',
      'reveal', now() - interval '1 second')
  END
$$;
CREATE FUNCTION private.latest_round() RETURNS public.encounter_rounds
LANGUAGE sql STABLE AS $$
  SELECT r.*
  FROM public.encounter_rounds r
  ORDER BY
    CASE WHEN coalesce(r.cancelled, false) = false AND private.round_phase(r) <> 'closed' THEN 0 ELSE 1 END,
    coalesce(r.started_at, r.updated_at) DESC
  LIMIT 1
$$;
CREATE FUNCTION private.director_active_round() RETURNS public.encounter_rounds
LANGUAGE plpgsql STABLE AS $$
DECLARE r public.encounter_rounds;
BEGIN
  SELECT * INTO r FROM private.latest_round();
  IF private.round_is_active(r) THEN
    RETURN r;
  END IF;
  RETURN NULL;
END
$$;
CREATE FUNCTION private.dashboard_status(r public.encounter_rounds) RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT CASE
    WHEN r.cancelled THEN 'Cancelled'
    WHEN r.resolved THEN 'Complete'
    WHEN private.round_is_active(r) THEN 'Active'
    ELSE 'Closed'
  END
$$;
CREATE FUNCTION private.restore_bag_item(p_uid uuid, p_item text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  IF p_item IS NULL OR p_uid IS NULL THEN
    RETURN;
  END IF;
  IF p_item = 'berry' THEN
    UPDATE public.inventories SET berry = berry + 1 WHERE user_id = p_uid;
  ELSIF p_item = 'pokeball' THEN
    UPDATE public.inventories SET pokeball = pokeball + 1 WHERE user_id = p_uid;
  END IF;
END
$$;
CREATE FUNCTION private.director_pause_round(p_round uuid) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE r public.encounter_rounds;
BEGIN
  SELECT * INTO r FROM public.encounter_rounds WHERE id = p_round;
  IF r IS NULL OR r.cancelled OR r.resolved OR NOT private.round_is_active(r) THEN
    RETURN;
  END IF;
  UPDATE public.encounter_rounds
     SET paused_at = coalesce(paused_at, now()), updated_at = now()
   WHERE id = r.id;
END
$$;
CREATE FUNCTION private.director_cancel_active_round(p_message text) RETURNS boolean
LANGUAGE plpgsql AS $$
DECLARE
  r public.encounter_rounds;
  rec public.encounter_players%rowtype;
BEGIN
  r := private.director_active_round();
  IF r IS NULL OR coalesce(r.cancelled, false) THEN
    RETURN false;
  END IF;
  IF NOT coalesce(r.resolved, false) THEN
    FOR rec IN SELECT * FROM public.encounter_players WHERE round_id = r.id
    LOOP
      PERFORM private.restore_bag_item(rec.user_id, rec.prep);
      IF rec.throw_processed AND rec.result_reason IS DISTINCT FROM 'no_ball_left' THEN
        PERFORM private.restore_bag_item(rec.user_id, rec.ball);
      END IF;
    END LOOP;
  END IF;
  UPDATE public.encounter_rounds
     SET cancelled = true, resolved = true, phase = 'closed', updated_at = now()
   WHERE id = r.id;
  RETURN true;
END
$$;
CREATE FUNCTION private.require_hub() RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  IF current_setting('d81.staff', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
  END IF;
END
$$;
CREATE FUNCTION public.admin_gift_joined(p_key text) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
  r public.encounter_rounds;
  joiners integer;
BEGIN
  PERFORM private.require_hub();
  IF p_key <> 'pokeball' THEN
    RAISE EXCEPTION 'That item cannot be gifted.';
  END IF;
  SELECT * INTO r FROM private.latest_round();
  IF NOT private.round_is_active(r) THEN
    RAISE EXCEPTION 'Start an encounter first.';
  END IF;
  SELECT count(*)::int INTO joiners FROM public.encounter_players WHERE round_id = r.id;
  IF joiners < 1 THEN
    RAISE EXCEPTION 'No trainers have joined this encounter yet.';
  END IF;
  UPDATE public.inventories
     SET pokeball = pokeball + 1
   WHERE user_id IN (SELECT user_id FROM public.encounter_players WHERE round_id = r.id);
END
$$;
CREATE FUNCTION private.launch_one(p_id uuid) RETURNS uuid
LANGUAGE plpgsql AS $$
DECLARE r public.encounter_rounds;
BEGIN
  PERFORM pg_advisory_xact_lock(87231001);
  SELECT * INTO r FROM private.latest_round();
  IF private.round_is_active(r) THEN
    RAISE EXCEPTION 'A community round is already running.';
  END IF;
  INSERT INTO public.encounter_rounds (id, phase, deadlines, started_at, source_id, paused_at)
  VALUES (p_id, 'join', private.deadlines_for('join'), now(), NULL, NULL);
  RETURN p_id;
END
$$;
CREATE FUNCTION private.launch_one_slow(p_id uuid) RETURNS uuid
LANGUAGE plpgsql AS $$
DECLARE launched uuid;
BEGIN
  launched := private.launch_one(p_id);
  PERFORM pg_sleep(0.4);
  RETURN launched;
END
$$;
`;

async function phaseOf(client, id) {
  const row = await client.query(
    "SELECT private.round_phase(r) AS phase, private.round_is_active(r) AS active FROM public.encounter_rounds r WHERE id = $1",
    [id]
  );
  return row.rows[0];
}
async function insertPhase(client, id, phase, extra = "") {
  await client.query(
    `INSERT INTO public.encounter_rounds (id, phase, deadlines, started_at, source_id, paused_at ${extra ? "," + extra.split("=")[0] : ""})
     VALUES ($1, $2, private.deadlines_for($2), now(), NULL, NULL)`,
    [id, phase]
  );
}

async function main() {
  let admin;
  let cluster = null;
  const clients = [];
  refuseHosted();
  console.log(`D81 GUARD TARGET: ${HOST}:${PORT} (embedded local; NOT supabase)`);
  console.log("LIMIT: pause, cancel, dashboard status, and gift-joined are control-flow models. Production settle_if_needed was not called.");
  const embedPath = path.join(CACHE, "node_modules", "embedded-postgres", "dist", "index.js");
  if (!fs.existsSync(embedPath)) throw new Error("embedded-postgres missing");
  const EmbeddedPostgres = (await import(pathToFileURL(embedPath).href)).default;
  const dataDir = path.join(CACHE, "d81-data");
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
    record("rehearsal runs on loopback Postgres", true, `${HOST}:${PORT} PostgreSQL ${target.rows[0].version}`);
    await cluster.createDatabase("d81_guard");
    const client = cluster.getPgClient("d81_guard", HOST);
    await client.connect();
    clients.push(client);
    await client.query("CREATE SCHEMA private");
    await client.query(SCHEMA);
    const beforeMd5 = await client.query("SELECT md5(prosrc) AS md5 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'private' AND p.proname = 'round_is_active'");
    assert(beforeMd5.rows[0].md5 === HOSTED_MD5, beforeMd5.rows[0].md5);
    record("local starting body matches the hosted prosrc md5", true, HOSTED_MD5);

    await insertPhase(client, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1", "join");
    const beforeActive = await phaseOf(client, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1");
    assert(beforeActive.phase === "join" && beforeActive.active === false);
    await client.query("SELECT private.director_pause_round('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1')");
    const beforePause = await client.query("SELECT paused_at IS NULL AS still FROM public.encounter_rounds WHERE id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'");
    assert(beforePause.rows[0].still === true);
    const beforeCancel = await client.query("SELECT private.director_cancel_active_round('stop') AS ok");
    assert(beforeCancel.rows[0].ok === false);
    record("before the correction an ordinary open row is inactive, so pause and cancel do nothing", true);

    await client.query(fs.readFileSync(path.join(ROOT, "supabase/unapplied/d81-encounter/001_round_is_active.sql"), "utf8"));
    const attrs = await client.query(`
      SELECT p.prosecdef, p.provolatile, p.proconfig, l.lanname, pg_get_function_identity_arguments(p.oid) AS args,
             pg_get_function_result(p.oid) AS result, r.rolname AS owner
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      JOIN pg_language l ON l.oid = p.prolang
      JOIN pg_roles r ON r.oid = p.proowner
      WHERE n.nspname = 'private' AND p.proname = 'round_is_active'
    `);
    assert(attrs.rows[0].prosecdef === false && attrs.rows[0].provolatile === "s" && attrs.rows[0].proconfig === null);
    assert(attrs.rows[0].lanname === "sql" && attrs.rows[0].result === "boolean" && attrs.rows[0].owner === "postgres");
    assert(attrs.rows[0].args === "r encounter_rounds");
    record("replacement keeps sql, stable, security invoker, boolean, and the same signature", true);

    const nil = await client.query("SELECT private.round_is_active(NULL::public.encounter_rounds) AS active");
    assert(nil.rows[0].active !== true);
    record("null argument stays inactive", true);

    await client.query("DELETE FROM public.encounter_rounds");
    for (const [id, phase] of [
      ["bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1", "join"],
      ["bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2", "prepare"],
      ["bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3", "throw"],
      ["bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4", "reveal"]
    ]) {
      await insertPhase(client, id, phase);
      const row = await phaseOf(client, id);
      assert(row.phase === phase && row.active === true, JSON.stringify(row));
    }
    record("open join, prepare, throw, and reveal rows with null optional columns are active", true);

    await client.query(`
      INSERT INTO public.encounter_rounds (id, phase, deadlines, started_at, paused_at, source_id)
      VALUES ('cccccccc-cccc-4ccc-8ccc-ccccccccccc1', 'join', private.deadlines_for('join'), now(), now() - interval '1 second', NULL)
    `);
    const paused = await phaseOf(client, "cccccccc-cccc-4ccc-8ccc-ccccccccccc1");
    assert(paused.phase === "join" && paused.active === true);
    await client.query("SELECT private.director_pause_round('cccccccc-cccc-4ccc-8ccc-ccccccccccc1')");
    const pausedAt = await client.query("SELECT paused_at IS NOT NULL AS paused FROM public.encounter_rounds WHERE id = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1'");
    assert(pausedAt.rows[0].paused === true);
    record("a paused join row stays active and the pause model sets paused_at", true);

    await client.query(`
      INSERT INTO public.encounter_rounds (id, phase, deadlines, started_at, cancelled)
      VALUES ('cccccccc-cccc-4ccc-8ccc-ccccccccccc2', 'join', private.deadlines_for('join'), now(), true)
    `);
    const cancelled = await phaseOf(client, "cccccccc-cccc-4ccc-8ccc-ccccccccccc2");
    assert(cancelled.phase === "closed" && cancelled.active === false);
    record("a cancelled row is not active", true);

    await client.query(`
      INSERT INTO public.encounter_rounds (id, phase, deadlines, started_at)
      VALUES ('cccccccc-cccc-4ccc-8ccc-ccccccccccc3', 'join', private.deadlines_for('expired'), now() - interval '3 minutes')
    `);
    const expired = await phaseOf(client, "cccccccc-cccc-4ccc-8ccc-ccccccccccc3");
    assert(expired.phase === "closed" && expired.active === false);
    record("expired deadlines close the row even when the stored phase says join", true);

    const status = await client.query(`
      SELECT private.dashboard_status(r) AS status
      FROM public.encounter_rounds r
      WHERE id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'
    `);
    assert(status.rows[0].status === "Active");
    record("dashboard status predicate reports Active for the open join row", true);

    await client.query("DELETE FROM public.encounter_rounds");
    await client.query("DELETE FROM public.encounter_players");
    await client.query("DELETE FROM public.inventories");
    await client.query(
      "INSERT INTO public.inventories (user_id, berry, pokeball) VALUES ($1, 1, 1), ($2, 0, 1)",
      [A, B]
    );
    await insertPhase(client, "dddddddd-dddd-4ddd-8ddd-ddddddddddd1", "throw");
    await client.query(`
      INSERT INTO public.encounter_players (round_id, user_id, prep, ball, throw_processed, result_reason)
      VALUES
        ('dddddddd-dddd-4ddd-8ddd-ddddddddddd1', $1, 'berry', 'pokeball', true, 'caught'),
        ('dddddddd-dddd-4ddd-8ddd-ddddddddddd1', $2, NULL, 'pokeball', true, 'no_ball_left')
    `, [A, B]);
    const cancel = await client.query("SELECT private.director_cancel_active_round('stop') AS ok");
    assert(cancel.rows[0].ok === true);
    const bags = await client.query("SELECT user_id::text, berry, pokeball FROM public.inventories ORDER BY user_id");
    const bagA = bags.rows.find((row) => row.user_id === A);
    const bagB = bags.rows.find((row) => row.user_id === B);
    assert(bagA.berry === 2 && bagA.pokeball === 2, JSON.stringify(bagA));
    assert(bagB.berry === 0 && bagB.pokeball === 1, JSON.stringify(bagB));
    record("cancel restores the spent berry and ball, and skips a no-ball throw", true, "synthetic trainers only");

    await client.query("DELETE FROM public.encounter_rounds");
    await client.query("DELETE FROM public.encounter_players");
    await client.query("SELECT set_config('d81.staff', 'off', false)");
    let denied = false;
    try {
      await client.query("SELECT public.admin_gift_joined('pokeball')");
    } catch (error) {
      denied = error.code === "42501";
    }
    assert(denied);
    await insertPhase(client, "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1", "join");
    await client.query("SELECT set_config('d81.staff', 'on', false)");
    let emptyJoin = false;
    try {
      await client.query("SELECT public.admin_gift_joined('pokeball')");
    } catch (error) {
      emptyJoin = /No trainers have joined/.test(error.message);
    }
    assert(emptyJoin);
    await client.query(
      "INSERT INTO public.encounter_players (round_id, user_id) VALUES ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1', $1)",
      [A]
    );
    await client.query("UPDATE public.inventories SET pokeball = 1 WHERE user_id = $1", [A]);
    await client.query("SELECT public.admin_gift_joined('pokeball')");
    const gifted = await client.query("SELECT pokeball FROM public.inventories WHERE user_id = $1", [A]);
    assert(gifted.rows[0].pokeball === 2);
    record("gift-joined still requires the staff gate, then recognizes the open round", true, "grant_items was not called");

    await client.query("DELETE FROM public.encounter_rounds");
    await client.query("SELECT private.launch_one('f1111111-1111-4111-8111-111111111111')");
    let blocked = false;
    try {
      await client.query("SELECT private.launch_one('f1111111-1111-4111-8111-111111111112')");
    } catch (error) {
      blocked = /already running/.test(error.message);
    }
    assert(blocked);
    const one = await client.query("SELECT count(*)::int AS n FROM public.encounter_rounds");
    assert(one.rows[0].n === 1);
    record("one launch succeeds and a second launch raises while that row is open", true);

    const other = cluster.getPgClient("d81_guard", HOST);
    await other.connect();
    clients.push(other);
    await client.query("DELETE FROM public.encounter_rounds");
    const pair = await Promise.allSettled([
      client.query("SELECT private.launch_one_slow('f2222222-2222-4222-8222-222222222221')"),
      other.query("SELECT private.launch_one('f2222222-2222-4222-8222-222222222222')")
    ]);
    const ok = pair.filter((row) => row.status === "fulfilled").length;
    const rejected = pair.filter((row) => row.status === "rejected" && /already running/.test(row.reason.message)).length;
    assert(ok === 1 && rejected === 1);
    record("overlapping launches serialize on the advisory lock", true);

    await client.query("DELETE FROM public.encounter_rounds");
    await client.query(`
      INSERT INTO public.encounter_rounds (id, phase, deadlines, started_at, resolved)
      VALUES ('f3333333-3333-4333-8333-333333333331', 'reveal', private.deadlines_for('expired'), now() - interval '4 minutes', true)
    `);
    await client.query("SELECT private.launch_one('f3333333-3333-4333-8333-333333333332')");
    const picked = await client.query("SELECT id FROM private.latest_round()");
    assert(picked.rows[0].id === "f3333333-3333-4333-8333-333333333332");
    const latestDef = await client.query("SELECT pg_get_functiondef('private.latest_round()'::regprocedure) AS def");
    assert(!latestDef.rows[0].def.includes("round_is_active"));
    record("after a closed row, latest_round selects the new launch and still ignores the boolean", true);

    const next = await client.query("SELECT md5(prosrc) AS md5 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'private' AND p.proname = 'round_is_active'");
    record("replacement prosrc md5", true, next.rows[0].md5);

    await client.query(fs.readFileSync(path.join(ROOT, "supabase/unapplied/d81-encounter/002_round_is_active_rollback.sql"), "utf8"));
    const rolled = await client.query("SELECT md5(prosrc) AS md5 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'private' AND p.proname = 'round_is_active'");
    assert(rolled.rows[0].md5 === HOSTED_MD5, rolled.rows[0].md5);
    record("rollback restores the hosted prosrc md5", true, HOSTED_MD5);

    const missed = results.filter((row) => !row.passed);
    console.log(`D81 GUARD ${results.length - missed.length}/${results.length}`);
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
