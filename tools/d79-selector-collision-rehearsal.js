/* D79 selector-collision rehearsal.
 * Disposable LOCAL cluster only. This models hosted latest_round / launch guard /
 * join-by-id / public console visibility. It is not the encounter engine.
 * Odds, spending, settlement, and the stamp are not present.
 */
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const { refuseHosted, BANNED } = require("./a19-schema-rehearsal.js");

const CACHE = path.join(__dirname, ".cache", "d54-pg-harness");
const HOST = "127.0.0.1";
const PORT = 55449;
const USER = "postgres";
const PASSWORD = "d79-selector-local-only";
const PUBLIC_ID = "11111111-1111-4111-8111-111111111111";
const QA_ID = "22222222-2222-4222-8222-222222222222";
const STRANGER = "33333333-3333-4333-8333-333333333333";

const results = [];
function record(name, passed, detail) {
  results.push({ name, passed, detail: detail || "" });
  console.log(`${passed ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

const SCHEMA = `
CREATE TABLE public.encounter_rounds (
  id uuid PRIMARY KEY,
  cancelled boolean NOT NULL DEFAULT false,
  resolved boolean NOT NULL DEFAULT false,
  hidden boolean NOT NULL DEFAULT false,
  started_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  last_action text
);
CREATE TABLE public.play_console_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  round_id uuid,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE FUNCTION private.round_phase(r public.encounter_rounds) RETURNS text
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF r.cancelled OR r.resolved THEN
    RETURN 'closed';
  END IF;
  RETURN 'join';
END
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
CREATE FUNCTION private.round_is_active(r public.encounter_rounds) RETURNS boolean
LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN r IS NOT NULL AND NOT r.cancelled AND private.round_phase(r) <> 'closed';
END
$$;
CREATE FUNCTION private.launch_guard() RETURNS void
LANGUAGE plpgsql AS $$
DECLARE r public.encounter_rounds;
BEGIN
  r := private.latest_round();
  IF private.round_is_active(r) THEN
    RAISE EXCEPTION 'A community round is already running.';
  END IF;
END
$$;
`;

async function main() {
  let admin;
  let cluster = null;
  const clients = [];
  refuseHosted();
  console.log(`D79 SELECTOR TARGET: ${HOST}:${PORT} (embedded local; NOT supabase)`);
  console.log("LIMIT: SIMULATED selector model. Production odds, spending, settlement, and the stamp were not executed.");
  const embedPath = path.join(CACHE, "node_modules", "embedded-postgres", "dist", "index.js");
  if (!fs.existsSync(embedPath)) throw new Error("embedded-postgres missing");
  const EmbeddedPostgres = (await import(pathToFileURL(embedPath).href)).default;
  const dataDir = path.join(CACHE, "d79-data");
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
    if (BANNED.test(String(target.rows[0].addr || ""))) throw new Error("refusing non-loopback");
    const version = target.rows[0].version;
    record("selector model runs on loopback Postgres", true, `${HOST}:${PORT} PostgreSQL ${version}`);
    await cluster.createDatabase("d79_selector");
    const client = cluster.getPgClient("d79_selector", HOST);
    await client.connect();
    clients.push(client);
    await client.query("CREATE SCHEMA private");
    await client.query(SCHEMA);

    await client.query(
      "INSERT INTO public.encounter_rounds (id, started_at) VALUES ($1, clock_timestamp() - interval '5 seconds')",
      [PUBLIC_ID]
    );
    let latest = await client.query("SELECT id FROM private.latest_round()");
    if (latest.rows[0].id !== PUBLIC_ID) throw new Error("public round was not selected");
    record("one open public round is the global latest round", true);

    const diag = await client.query(`
      SELECT private.round_phase(r) AS ph,
             private.round_is_active(r) AS active
      FROM public.encounter_rounds r
    `);
    if (diag.rows[0]?.ph !== "join" || diag.rows[0]?.active !== false) {
      throw new Error(`expected an open row to fail the composite active test: ${JSON.stringify(diag.rows)}`);
    }
    record("round_is_active is false for an open row that still has null columns", true);

    let blocked = false;
    try {
      await client.query("SELECT private.launch_guard()");
    } catch (error) {
      blocked = /already running/.test(error.message);
    }
    if (blocked) throw new Error("launch guard rejected a round the active test does not see");
    record("the launch guard does not reject that open row", true);

    await client.query(
      "INSERT INTO public.encounter_rounds (id, hidden, last_action) VALUES ($1, true, 'qa')",
      [QA_ID]
    );
    latest = await client.query("SELECT id FROM private.latest_round()");
    if (latest.rows[0].id !== QA_ID) throw new Error("qa row did not replace the selector");
    record("a newer open row replaces the public round in latest_round, even when hidden", true);

    const byId = await client.query("SELECT id, last_action FROM public.encounter_rounds WHERE id = $1", [QA_ID]);
    if (byId.rows.length !== 1 || byId.rows[0].last_action !== "qa") throw new Error("id lookup failed");
    record("a round id can be read with no trainer allow-list", true, `stranger model ${STRANGER}`);

    await client.query(
      "INSERT INTO public.play_console_log (round_id, message) VALUES ($1, 'PlayerQA joined the qa round')",
      [QA_ID]
    );
    const consoleRows = await client.query(
      "SELECT message FROM public.play_console_log ORDER BY created_at DESC LIMIT 100"
    );
    if (!consoleRows.rows.some((row) => row.message.includes("qa round"))) throw new Error("console hid the qa line");
    record("the public console read returns the qa line", true);

    await client.query("UPDATE public.encounter_rounds SET resolved = true WHERE id = $1", [QA_ID]);
    latest = await client.query("SELECT id FROM private.latest_round()");
    if (latest.rows[0].id !== PUBLIC_ID) throw new Error("public round did not return");
    record("closing the newer row returns selection to the older public round", true);

    const failed = results.filter((row) => !row.passed);
    console.log(`D79 SELECTOR ${results.length - failed.length}/${results.length}`);
    if (failed.length) process.exitCode = 1;
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
