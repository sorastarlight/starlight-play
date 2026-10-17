/* D72 settlement-draft rehearsal.
 * Disposable LOCAL cluster only. Synthetic trainers only.
 * Does not read hosted URLs and does not apply SQL to production.
 * capture_chance, announce_throws, and reference lookups are local stubs.
 * The settle body is the unapplied draft, which is the live function plus the note.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { pathToFileURL } = require("url");
const { refuseHosted, splitSql, BANNED } = require("./a19-schema-rehearsal.js");

const ROOT = path.join(__dirname, "..");
const CACHE = path.join(__dirname, ".cache", "d54-pg-harness");
const HOST = "127.0.0.1";
const PORT = 55445;
const USER = "postgres";
const PASSWORD = "d72-mastery-local-only";
const A = "aaaaaaaa-0000-4000-8000-000000000072";
const B = "bbbbbbbb-0000-4000-8000-000000000072";

const results = [];
function record(name, passed, detail) {
  results.push({ name, passed, detail: detail || "" });
  console.log(`${passed ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}
function assert(cond, detail) {
  if (!cond) throw new Error(detail || "failed");
}
async function applyFile(client, full) {
  for (const stmt of splitSql(fs.readFileSync(full, "utf8"))) await client.query(stmt);
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
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
END $$;
GRANT USAGE ON SCHEMA auth, public, private TO authenticated, anon;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, anon;
CREATE TABLE public.profiles (id uuid PRIMARY KEY);
CREATE TABLE public.encounter_rounds (
  id uuid PRIMARY KEY,
  dex integer,
  name text,
  variant text,
  gender text,
  pokemon_form_id integer,
  rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  trigger_source text,
  deadlines jsonb,
  cancelled boolean NOT NULL DEFAULT false,
  paused_at timestamptz,
  resolved boolean NOT NULL DEFAULT false,
  hidden boolean NOT NULL DEFAULT false,
  phase text,
  last_action text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.encounter_players (
  round_id uuid NOT NULL REFERENCES public.encounter_rounds(id),
  user_id uuid NOT NULL,
  result text,
  prep text,
  ball text,
  result_reason text,
  ball_at timestamptz,
  chance numeric,
  roll numeric,
  caught boolean,
  PRIMARY KEY (round_id, user_id)
);
CREATE TABLE public.catches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dex integer NOT NULL,
  name text,
  variant text NOT NULL DEFAULT 'normal',
  gender text NOT NULL DEFAULT 'Unknown',
  ball text,
  source_key text,
  round_id uuid,
  pokemon_form_id integer,
  obtained_method text NOT NULL DEFAULT 'CAPTURE',
  caught_at timestamptz,
  level integer,
  public_id text,
  iv_hp integer,
  friendship integer
);
CREATE UNIQUE INDEX catches_round_user_uidx ON public.catches (round_id, user_id) WHERE round_id IS NOT NULL;
CREATE TABLE public.capture_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  round_id uuid,
  user_id uuid,
  dex integer,
  species_name text,
  variant text,
  gender text,
  is_shiny boolean,
  is_female boolean,
  canonical_catch_rate integer,
  base_chance numeric,
  ball_key text,
  ball_multiplier numeric,
  ball_condition_met boolean,
  berry_key text,
  berry_multiplier numeric,
  honey_contributors integer,
  honey_participants integer,
  honey_multiplier numeric,
  honey_contributor_multiplier numeric,
  shiny_multiplier numeric,
  event_multiplier numeric,
  other_multiplier numeric,
  raw_chance numeric,
  final_chance numeric,
  capture_roll numeric,
  success boolean,
  detail jsonb,
  UNIQUE (round_id, user_id)
);
CREATE TABLE public.play_console_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  round_id uuid,
  user_id uuid,
  display_name text,
  kind text,
  item text,
  message text
);
CREATE TABLE public.catch_present_log (catch_id uuid PRIMARY KEY);
CREATE TABLE public.trainer_xp (user_id uuid PRIMARY KEY, xp integer NOT NULL DEFAULT 0);
CREATE TABLE public.species_mastery (
  user_id uuid NOT NULL, dex integer NOT NULL,
  points integer NOT NULL DEFAULT 0, rank integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, dex)
);
CREATE TABLE public.rankings (board text PRIMARY KEY, score integer NOT NULL);
CREATE TABLE public.trainer_items (user_id uuid PRIMARY KEY, qty integer NOT NULL);
CREATE TABLE private.ref_forms (content_build text, form_id integer, dex integer);
CREATE TABLE private.ref_species (content_build text, dex integer, slug text);
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
CREATE FUNCTION private.after_catch_present() RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN INSERT INTO public.catch_present_log (catch_id) VALUES (NEW.id); RETURN NULL; END $fn$;
CREATE TRIGGER catches_after_present AFTER INSERT ON public.catches
  FOR EACH ROW EXECUTE FUNCTION private.after_catch_present();
CREATE FUNCTION private.after_catch_xp() RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  INSERT INTO public.trainer_xp (user_id, xp) VALUES (NEW.user_id, 1)
  ON CONFLICT (user_id) DO UPDATE SET xp = public.trainer_xp.xp + 1;
  RETURN NULL;
END $fn$;
CREATE TRIGGER catches_xp AFTER INSERT ON public.catches
  FOR EACH ROW EXECUTE FUNCTION private.after_catch_xp();
CREATE FUNCTION private.canonical_form_id(p_dex integer, p_form integer) RETURNS integer
LANGUAGE sql IMMUTABLE AS $$ SELECT coalesce(p_form, p_dex) $$;
CREATE FUNCTION private.form_display_name(p_dex integer, p_form integer) RETURNS text
LANGUAGE sql IMMUTABLE AS $$ SELECT 'Bulbasaur' $$;
CREATE FUNCTION private.phase_banner(p_round uuid, p_phase text, p_message text) RETURNS void
LANGUAGE sql AS $$ SELECT NULL::void $$;
CREATE FUNCTION private.round_phase(r public.encounter_rounds) RETURNS text
LANGUAGE sql STABLE AS $$ SELECT 'results' $$;
CREATE FUNCTION private.announce_throws(p_round uuid) RETURNS text
LANGUAGE sql AS $$ SELECT NULL::text $$;
CREATE FUNCTION private.capture_config() RETURNS jsonb LANGUAGE sql AS $$ SELECT '{}'::jsonb $$;
CREATE FUNCTION private.capture_throw_context(r public.encounter_rounds, p_uid uuid, p_at timestamptz)
RETURNS jsonb LANGUAGE sql AS $$ SELECT '{}'::jsonb $$;
CREATE FUNCTION private.variant_is_shiny(p_variant text) RETURNS boolean
LANGUAGE sql IMMUTABLE AS $$ SELECT coalesce(p_variant, '') = 'shiny' $$;
CREATE FUNCTION private.secure_random() RETURNS numeric LANGUAGE sql AS $$ SELECT 0.5 $$;
CREATE FUNCTION private.trainer_label(p_uid uuid) RETURNS text LANGUAGE sql AS $$ SELECT 'Tester' $$;
CREATE FUNCTION private.encounter_pokemon_level(p_dex integer, p_round uuid) RETURNS integer
LANGUAGE sql AS $$ SELECT 5 $$;
CREATE FUNCTION private.capture_chance(
  p_dex integer, p_ball text, p_prep text, p_bait integer, p_players integer, p_used_bait boolean,
  p_owns boolean, p_shiny boolean, p_other numeric, p_clk timestamptz, p_cfg jsonb
) RETURNS jsonb LANGUAGE plpgsql STABLE AS $fn$
DECLARE mode text := coalesce(current_setting('d72.outcome', true), 'catch');
BEGIN
  IF mode = 'escape' THEN
    RETURN jsonb_build_object(
      'finalChance', 0, 'guaranteed', false, 'catchRate', 45, 'baseChance', 0, 'rawChance', 0,
      'ball', jsonb_build_object('key','poke','multiplier',1,'conditionMet',true),
      'berry', jsonb_build_object('key', null, 'multiplier', 1),
      'honey', jsonb_build_object('contributors', 0, 'participants', 0, 'multiplier', 1),
      'honeyContributorMultiplier', 1, 'shinyMultiplier', 1, 'eventMultiplier', 1, 'otherMultiplier', 1
    );
  END IF;
  RETURN jsonb_build_object(
    'finalChance', 1, 'guaranteed', true, 'catchRate', 45, 'baseChance', 1, 'rawChance', 1,
    'ball', jsonb_build_object('key','poke','multiplier',1,'conditionMet',true),
    'berry', jsonb_build_object('key', null, 'multiplier', 1),
    'honey', jsonb_build_object('contributors', 0, 'participants', 0, 'multiplier', 1),
    'honeyContributorMultiplier', 1, 'shinyMultiplier', 1, 'eventMultiplier', 1, 'otherMultiplier', 1
  );
END $fn$;
CREATE FUNCTION private.streamlink_wire_is_enabled() RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
CREATE FUNCTION private.streamlink_protected_trainer(p_uid uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
CREATE FUNCTION private.persist_streamlink_catch(
  p_user_id uuid, p_form_id integer, p_level integer, p_ctx text, p_source_key text, p_ball text,
  p_round_id uuid, p_shiny boolean, p_content_build text, p_hidden_ticket text, p_variant text,
  p_name text, p_gender text
) RETURNS jsonb LANGUAGE plpgsql AS $fn$
BEGIN
  RAISE EXCEPTION 'persist stub must not run while WIRE is off' USING ERRCODE = '55000';
END $fn$;
INSERT INTO public.profiles (id) VALUES ('${A}'), ('${B}');
INSERT INTO public.species_mastery (user_id, dex, points, rank) VALUES ('${A}', 1, 7, 2);
INSERT INTO public.rankings (board, score) VALUES ('mastery', 7);
INSERT INTO public.trainer_items (user_id, qty) VALUES ('${A}', 4);
`;

async function makeRound(client, trainer, dex, rules) {
  const id = crypto.randomUUID();
  await client.query(
    `INSERT INTO public.encounter_rounds (id, dex, name, variant, gender, rules, trigger_source)
     VALUES ($1, $2, 'Bulbasaur', 'normal', 'M', $3::jsonb, 'live')`,
    [id, dex, JSON.stringify(rules || { rewardMode: "live" })]
  );
  await client.query(
    "INSERT INTO public.encounter_players (round_id, user_id, ball) VALUES ($1, $2, 'poke')",
    [id, trainer]
  );
  return id;
}
async function settle(client, roundId) {
  await client.query("BEGIN");
  await client.query(
    "SELECT private.settle_if_needed(r.*) FROM public.encounter_rounds r WHERE id = $1",
    [roundId]
  );
  await client.query("COMMIT");
}
async function catchesFor(client, roundId) {
  const { rows } = await client.query(
    "SELECT id, public_id, server_inserted_at, source_key FROM public.catches WHERE round_id = $1",
    [roundId]
  );
  return rows;
}
async function outboxFor(client, catchId) {
  const { rows } = await client.query(
    "SELECT status FROM private.species_mastery_outbox WHERE catch_id = $1",
    [catchId]
  );
  return rows;
}
async function baseline(client) {
  const { rows } = await client.query(`
    SELECT
      (SELECT points FROM public.species_mastery WHERE user_id = '${A}' AND dex = 1) AS points,
      (SELECT rank FROM public.species_mastery WHERE user_id = '${A}' AND dex = 1) AS rank,
      (SELECT score FROM public.rankings WHERE board = 'mastery') AS ranking,
      (SELECT qty FROM public.trainer_items WHERE user_id = '${A}') AS qty
  `);
  return rows[0];
}

async function main() {
  let admin;
  let cluster = null;
  const clients = [];
  refuseHosted();
  console.log(`D72 MASTERY REHEARSAL TARGET: ${HOST}:${PORT} (embedded local; NOT supabase)`);
  console.log("LIMIT: capture_chance and announce_throws are synthetic stubs. settle_if_needed is the unapplied draft of the live body.");
  const embedPath = path.join(CACHE, "node_modules", "embedded-postgres", "dist", "index.js");
  if (!fs.existsSync(embedPath)) throw new Error("embedded-postgres missing under tools/.cache/d54-pg-harness");
  const EmbeddedPostgres = (await import(pathToFileURL(embedPath).href)).default;
  const dataDir = path.join(CACHE, "d72-data");
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
    assert(!BANNED.test(String(targetRows[0].addr || "")));
    const version = targetRows[0].version;
    record("isolation target is loopback embedded Postgres", true, `${HOST}:${PORT} PostgreSQL ${version}`);

    await cluster.createDatabase("d72_design");
    async function open() {
      const client = cluster.getPgClient("d72_design", HOST);
      await client.connect();
      clients.push(client);
      return client;
    }
    const client = await open();
    const other = await open();
    await client.query(FIXTURE);
    for (const rel of [
      "supabase/unapplied/d64-mastery/001_species_mastery_events.sql",
      "supabase/unapplied/d65-mastery/002_species_mastery_hardening.sql",
      "supabase/unapplied/d66-mastery/003_species_mastery_lifecycle.sql",
      "supabase/unapplied/d67-mastery/004_species_mastery_catch_safety.sql",
      "supabase/unapplied/a19-wire/002_materialize_hook.sql",
      "supabase/unapplied/d72-mastery/005_enqueue_lifecycle.sql",
      "supabase/unapplied/d72-mastery/006_settle_familiarity_note.sql"
    ]) {
      await applyFile(client, path.join(ROOT, rel));
    }
    await client.query("GRANT ALL ON TABLE public.species_mastery_progress TO authenticated");
    await applyFile(client, path.join(ROOT, "supabase/unapplied/d72-mastery/007_progress_view_grants.sql"));

    const shape = await client.query(`
      SELECT pg_get_function_result('private.settle_if_needed(public.encounter_rounds)'::regprocedure) AS result_type,
             (SELECT count(*) FROM regexp_matches(prosrc, 'v_mat := private.materialize_streamlink_catch', 'g')) AS mat_calls,
             (SELECT count(*) FROM regexp_matches(prosrc, 'EXCEPTION WHEN OTHERS', 'g')) AS handlers
      FROM pg_proc WHERE oid = 'private.settle_if_needed(public.encounter_rounds)'::regprocedure
    `);
    const src = (await client.query("SELECT prosrc FROM pg_proc WHERE oid = 'private.settle_if_needed(public.encounter_rounds)'::regprocedure")).rows[0].prosrc;
    assert(shape.rows[0].result_type === "encounter_rounds");
    assert(Number(shape.rows[0].mat_calls) === 1);
    assert(Number(shape.rows[0].handlers) === 1);
    assert(src.indexOf("wire-materialize-failed") < src.indexOf("EXCEPTION WHEN OTHERS"));
    assert(src.indexOf("capture_chance") < src.indexOf("EXCEPTION WHEN OTHERS"));
    record("settlement return and the single materialize call stay outside the note handler", true);

    const earlyRound = await makeRound(client, A, 1);
    await settle(client, earlyRound);
    const early = await catchesFor(client, earlyRound);
    assert(early.length === 1 && early[0].public_id.startsWith("LG"));
    assert((await outboxFor(client, early[0].id)).length === 0);
    const inactiveEnqueue = await expectFail(
      client,
      "SELECT private.enqueue_species_mastery_event($1::uuid)",
      [early[0].id]
    );
    assert(inactiveEnqueue.code === "23514");
    record("inactive lifecycle keeps the catch and rejects a new outbox row", true);

    const opened = await client.query("SELECT private.activate_species_mastery_events() AS opened");
    const cutoff = opened.rows[0].opened;
    const reconciledEarly = await client.query("SELECT private.reconcile_species_mastery_outbox(10) AS n");
    assert(Number(reconciledEarly.rows[0].n) === 0);
    assert((await outboxFor(client, early[0].id)).length === 0);
    record("a catch from before activation stays ineligible", true, String(cutoff));

    await client.query("SELECT set_config('d72.outcome', 'escape', false)");
    const missedRound = await makeRound(client, A, 4);
    await settle(client, missedRound);
    assert((await catchesFor(client, missedRound)).length === 0);
    record("a failed catch queues no familiarity event", true);

    await client.query("SELECT set_config('d72.outcome', 'catch', false)");
    const liveRound = await makeRound(client, A, 1);
    await settle(client, liveRound);
    const live = await catchesFor(client, liveRound);
    const queued = await outboxFor(client, live[0].id);
    assert(live.length === 1 && queued.length === 1 && queued[0].status === "pending");
    assert(live[0].source_key === `play:${liveRound}:${A}`);
    record("an active Play catch materializes one id and queues that same id", true, live[0].id);

    await settle(client, liveRound);
    assert((await catchesFor(client, liveRound)).length === 1);
    assert((await outboxFor(client, live[0].id)).length === 1);
    record("a repeated settlement does not create a second catch or outbox row", true);

    const raceRound = await makeRound(client, A, 7);
    await Promise.all([
      (async () => { await other.query("BEGIN"); await other.query("SELECT private.settle_if_needed(r.*) FROM public.encounter_rounds r WHERE id = $1", [raceRound]); await other.query("COMMIT"); })(),
      (async () => { await client.query("BEGIN"); await client.query("SELECT private.settle_if_needed(r.*) FROM public.encounter_rounds r WHERE id = $1", [raceRound]); await client.query("COMMIT"); })()
    ]);
    assert((await catchesFor(client, raceRound)).length === 1);
    record("concurrent settlement still leaves one catch", true);

    const savedMat = await client.query(
      "SELECT pg_get_functiondef('private.materialize_streamlink_catch(uuid,integer,integer,text,text,text,uuid,boolean,text,text,text,text,text)'::regprocedure) AS def"
    );
    await client.query(`
      CREATE OR REPLACE FUNCTION private.materialize_streamlink_catch(
        p_user_id uuid, p_form_id integer, p_level integer, p_ctx text, p_source_key text,
        p_ball text DEFAULT 'poke', p_round_id uuid DEFAULT NULL, p_shiny boolean DEFAULT false,
        p_content_build text DEFAULT 'sl-ref-20261013-227b573', p_hidden_ticket text DEFAULT NULL,
        p_variant text DEFAULT 'normal', p_name text DEFAULT NULL, p_gender text DEFAULT NULL
      ) RETURNS jsonb LANGUAGE plpgsql AS $fn$
      DECLARE inserted uuid;
      BEGIN
        INSERT INTO public.catches (user_id, dex, name, variant, gender, ball, round_id, source_key, level)
        VALUES (p_user_id, 1, 'Bulbasaur', 'normal', coalesce(p_gender, 'M'), 'poke', p_round_id, p_source_key, 5)
        RETURNING id INTO inserted;
        RETURN jsonb_build_object('ok', true, 'catchId', 'not-a-uuid');
      END $fn$
    `);
    const badRound = await makeRound(client, A, 10);
    await settle(client, badRound);
    const bad = await catchesFor(client, badRound);
    assert(bad.length === 1 && (await outboxFor(client, bad[0].id)).length === 0);
    await client.query(`
      CREATE OR REPLACE FUNCTION private.materialize_streamlink_catch(
        p_user_id uuid, p_form_id integer, p_level integer, p_ctx text, p_source_key text,
        p_ball text DEFAULT 'poke', p_round_id uuid DEFAULT NULL, p_shiny boolean DEFAULT false,
        p_content_build text DEFAULT 'sl-ref-20261013-227b573', p_hidden_ticket text DEFAULT NULL,
        p_variant text DEFAULT 'normal', p_name text DEFAULT NULL, p_gender text DEFAULT NULL
      ) RETURNS jsonb LANGUAGE plpgsql AS $fn$
      BEGIN
        INSERT INTO public.catches (user_id, dex, name, variant, gender, ball, round_id, source_key, level)
        VALUES (p_user_id, 1, 'Bulbasaur', 'normal', coalesce(p_gender, 'M'), 'poke', p_round_id, p_source_key, 5);
        RETURN jsonb_build_object('ok', true);
      END $fn$
    `);
    const bareRound = await makeRound(client, A, 11);
    await settle(client, bareRound);
    const bare = await catchesFor(client, bareRound);
    assert(bare.length === 1 && (await outboxFor(client, bare[0].id)).length === 0);
    await client.query(savedMat.rows[0].def);
    record("a missing or malformed catch id does not abort the catch", true);

    const savedNote = await client.query(
      "SELECT pg_get_functiondef('private.note_species_mastery_catch(uuid)'::regprocedure) AS def"
    );
    await client.query(`
      CREATE OR REPLACE FUNCTION private.note_species_mastery_catch(p_catch_id uuid)
      RETURNS boolean LANGUAGE plpgsql AS $fn$
      BEGIN
        RAISE EXCEPTION 'injected note failure' USING ERRCODE = '55000';
      END $fn$
    `);
    const survivedRound = await makeRound(client, A, 13);
    await settle(client, survivedRound);
    const survived = await catchesFor(client, survivedRound);
    const survivedBefore = survived[0].server_inserted_at;
    assert(survived.length === 1 && (await outboxFor(client, survived[0].id)).length === 0);
    await client.query(savedNote.rows[0].def);
    const recovered = await client.query("SELECT private.reconcile_species_mastery_outbox(25) AS n");
    const survivedAfter = await catchesFor(client, survivedRound);
    assert(Number(recovered.rows[0].n) >= 1);
    assert((await outboxFor(client, survived[0].id))[0].status === "pending");
    assert(String(survivedAfter[0].server_inserted_at) === String(survivedBefore));
    assert(survivedAfter[0].public_id === survived[0].public_id);
    record("a raising note keeps the catch, and reconcile queues the same id", true);

    await client.query("BEGIN");
    await client.query("SELECT lifecycle FROM private.species_mastery_activation WHERE singleton FOR UPDATE");
    const started = Date.now();
    const blocked = other.query("SELECT private.enqueue_species_mastery_event($1::uuid)", [live[0].id]);
    await new Promise((resolve) => setTimeout(resolve, 300));
    await client.query("ROLLBACK");
    await blocked;
    assert(Date.now() - started >= 250);
    record("enqueue waits on the activation row lock", true);

    async function foreignCatch(prefix) {
      const id = crypto.randomUUID();
      const round = crypto.randomUUID();
      await client.query(
        "INSERT INTO public.encounter_rounds (id, dex, rules) VALUES ($1, 25, '{\"rewardMode\":\"live\"}'::jsonb)",
        [round]
      );
      await client.query(
        `INSERT INTO public.catches (id, user_id, dex, source_key, round_id)
         VALUES ($1, $2, 25, $3, $4)`,
        [id, A, `${prefix}:${round}:${A}`, round]
      );
      await client.query(
        "INSERT INTO public.capture_log (round_id, user_id, dex, success) VALUES ($1, $2, 25, true)",
        [round, A]
      );
      return id;
    }
    const grantId = await foreignCatch("grant");
    const importId = await foreignCatch("import");
    const resetId = await foreignCatch("reset");
    assert(Number((await client.query(
      `SELECT count(*)::int AS n FROM private.species_mastery_outbox
       WHERE catch_id = ANY($1::uuid[])`,
      [[grantId, importId, resetId]]
    )).rows[0].n) === 0);
    await client.query("SELECT private.reconcile_species_mastery_outbox(25)");
    assert(Number((await client.query(
      `SELECT count(*)::int AS n FROM private.species_mastery_outbox
       WHERE catch_id = ANY($1::uuid[])`,
      [[grantId, importId, resetId]]
    )).rows[0].n) === 0);
    for (const id of [grantId, importId, resetId]) {
      assert((await client.query("SELECT private.note_species_mastery_catch($1::uuid) AS ok", [id])).rows[0].ok === true);
      await client.query("SELECT private.deliver_species_mastery_outbox(200)");
      assert((await outboxFor(client, id))[0].status === "rejected");
      assert(Number((await client.query("SELECT count(*)::int AS n FROM public.species_mastery_events WHERE catch_id = $1", [id])).rows[0].n) === 0);
    }
    const testRound = await makeRound(client, A, 25, { rewardMode: "test" });
    await settle(client, testRound);
    const testCatch = (await catchesFor(client, testRound))[0];
    assert(testCatch);
    assert(Number((await client.query("SELECT private.deliver_species_mastery_outbox(200) AS n")).rows[0].n) === 0);
    assert((await outboxFor(client, testCatch.id))[0].status === "rejected");
    record("grant, import, reset, and test-round catches do not become familiarity events", true);

    await client.query("SELECT private.pause_species_mastery_delivery()");
    const pausedRound = await makeRound(client, A, 16);
    await settle(client, pausedRound);
    const pausedCatch = (await catchesFor(client, pausedRound))[0];
    assert((await outboxFor(client, pausedCatch.id))[0].status === "pending");
    assert(Number((await client.query("SELECT private.deliver_species_mastery_outbox(10) AS n")).rows[0].n) === 0);
    await client.query("SELECT private.resume_species_mastery_delivery()");
    const resumed = Number((await client.query("SELECT private.deliver_species_mastery_outbox(25) AS n")).rows[0].n);
    assert(resumed >= 1);
    record("paused recording still queues, and delivery waits until resume", true);

    const beforeDrain = await client.query("SELECT activated_at FROM private.species_mastery_activation");
    await client.query("SELECT private.begin_species_mastery_drain()");
    const drainRound = await makeRound(client, A, 19);
    await settle(client, drainRound);
    const drainCatch = (await catchesFor(client, drainRound))[0];
    assert((await outboxFor(client, drainCatch.id)).length === 0);
    const afterDrain = await client.query("SELECT activated_at FROM private.species_mastery_activation");
    assert(String(beforeDrain.rows[0].activated_at) === String(afterDrain.rows[0].activated_at));
    record("draining rejects new work and keeps the activation cutoff", true);

    await client.query("SELECT private.close_species_mastery_activation()");
    const closedEnqueue = await expectFail(
      client,
      "SELECT private.enqueue_species_mastery_event($1::uuid)",
      [drainCatch.id]
    );
    const closedRound = await makeRound(client, A, 21);
    await settle(client, closedRound);
    const closedCatch = (await catchesFor(client, closedRound))[0];
    assert(closedEnqueue.code === "23514");
    assert((await outboxFor(client, closedCatch.id)).length === 0);
    assert(Number((await client.query("SELECT private.deliver_species_mastery_outbox(10) AS n")).rows[0].n) === 0);
    record("closed recording rejects new work and does not deliver it", true);

    const reactivate = await expectFail(client, "SELECT private.activate_species_mastery_events()");
    assert(reactivate.code === "55000");
    record("a closed period cannot be activated again", true);

    const delivered = await client.query(
      "SELECT private.deliver_species_mastery_outbox(50) AS n"
    );
    assert(Number(delivered.rows[0].n) === 0);
    const ownEvent = await client.query(
      "SELECT count(*)::int AS n FROM public.species_mastery_events WHERE trainer_id = $1",
      [A]
    );
    assert(ownEvent.rows[0].n >= 1, `events ${ownEvent.rows[0].n}`);
    const privileges = await client.query(`
      SELECT
        has_table_privilege('authenticated', 'public.species_mastery_progress', 'SELECT') AS can_select,
        has_table_privilege('authenticated', 'public.species_mastery_progress', 'INSERT') AS can_insert,
        has_table_privilege('authenticated', 'public.species_mastery_progress', 'UPDATE') AS can_update,
        has_table_privilege('authenticated', 'public.species_mastery_progress', 'DELETE') AS can_delete,
        has_table_privilege('authenticated', 'public.species_mastery_progress', 'TRUNCATE') AS can_truncate,
        has_function_privilege('authenticated', 'private.note_species_mastery_catch(uuid)'::regprocedure, 'execute') AS note_exec,
        has_function_privilege('anon', 'private.enqueue_species_mastery_event(uuid)'::regprocedure, 'execute') AS enqueue_exec
    `);
    assert(privileges.rows[0].can_select === true, "select");
    assert(privileges.rows[0].can_insert === false, "insert");
    assert(privileges.rows[0].can_update === false, "update");
    assert(privileges.rows[0].can_delete === false, "delete");
    assert(privileges.rows[0].can_truncate === false, "truncate");
    assert(privileges.rows[0].note_exec === false && privileges.rows[0].enqueue_exec === false, "execute");
    const options = await client.query(
      "SELECT reloptions FROM pg_class WHERE oid = 'public.species_mastery_progress'::regclass"
    );
    assert((options.rows[0].reloptions || []).includes("security_invoker=true"));

    await client.query("BEGIN");
    await client.query("SET LOCAL ROLE authenticated");
    await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [B]);
    const hidden = await client.query("SELECT count(*)::int AS n FROM public.species_mastery_progress");
    await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [A]);
    const visible = await client.query("SELECT tier_name FROM public.species_mastery_progress WHERE dex = 1");
    await client.query("SAVEPOINT progress_write");
    const write = await expectFail(
      client,
      "INSERT INTO public.species_mastery_progress (trainer_id, dex, eligible_captures, tier_level, tier_name) VALUES ($1, 1, 9, 1, 'Familiar')",
      [A]
    );
    await client.query("ROLLBACK TO SAVEPOINT progress_write");
    const denied = await expectFail(client, "SELECT private.note_species_mastery_catch($1::uuid)", [live[0].id]);
    await client.query("ROLLBACK");
    assert(hidden.rows[0].n === 0, `hidden ${hidden.rows[0].n}`);
    assert(visible.rows.length === 1, `visible ${visible.rows.length}`);
    assert(write.code === "42501" || write.code === "55000", write.code || write.message);
    assert(denied.code === "42501", `${denied.code} ${denied.message}`);
    record("authenticated clients can read only their own progress and cannot write it", true, `insert ${write.code}`);

    const end = await baseline(client);
    const startPoints = { points: 7, rank: 2, ranking: 7, qty: 4 };
    assert(end.points === startPoints.points && end.rank === startPoints.rank, JSON.stringify(end));
    assert(end.ranking === startPoints.ranking && end.qty === startPoints.qty, JSON.stringify(end));
    record("points, Rankings, and the synthetic item count stay unchanged", true, `events ${ownEvent.rows[0].n}`);

    const failed = results.filter((row) => !row.passed);
    console.log(`\n${results.filter((row) => row.passed).length}/${results.length} REAL SQL checks passed`);
    console.log(`POSTGRES ${version}`);
    console.log("CLASS: REAL SQL on disposable loopback Postgres. Not production. Not installed.");
    console.log("LIMIT: production capture_chance, announce_throws, and persist were not executed.");
    if (failed.length) process.exitCode = 1;
  } finally {
    for (const dbClient of clients) {
      try { await dbClient.end(); } catch (_) { /* ignore */ }
    }
    try { if (admin) await admin.end(); } catch (_) { /* ignore */ }
    try { if (cluster) await cluster.stop(); } catch (_) { /* ignore */ }
    try { fs.rmSync(path.join(CACHE, "d72-data"), { recursive: true, force: true }); } catch (_) { /* ignore */ }
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("D72 REHEARSAL FAILED:", error.message);
    process.exit(1);
  });
}
