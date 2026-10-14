/* Isolated A19-GENVAL PostgreSQL rehearsal (issue #25).
 * Disposable LOCAL cluster only. Synthetic fixtures only.
 * Does not read SUPABASE_URL / DATABASE_URL. Does not touch live catches.
 * Does not replace stamp_catch_row. Does not start WIRE or any reset.
 */
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const { refuseHosted, splitSql, BANNED } = require("./a19-schema-rehearsal.js");
const {
  CONTENT_BUILD,
  expectedGenerate,
  assertMonFromFixture,
  loadPin,
  hpMax
} = require("./lib/a19-genval-oracle");

const ROOT = path.join(__dirname, "..");
const CACHE23 = path.join(__dirname, ".cache", "a23-pg-harness");
const CACHE = path.join(__dirname, ".cache", "a25-pg-harness");
const SCHEMA = path.join(ROOT, "supabase", "unapplied", "a19-schema");
const GENVAL = path.join(ROOT, "supabase", "unapplied", "a19-genval");
const SEED = path.join(SCHEMA, "seed");
const HOST = "127.0.0.1";
const PORT = 55433;
const USER = "postgres";
const PASSWORD = "a19-genval-local-only";
const DB_MAIN = "a19_genval";
const SYN_BULB = "11111111-1111-1111-1111-111111111111";

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
  const stmts = splitSql(sql);
  for (const stmt of stmts) {
    await client.query(stmt);
  }
  return stmts.length;
}

function embedModule() {
  const candidates = [
    path.join(CACHE, "node_modules", "embedded-postgres", "dist", "index.js"),
    path.join(CACHE23, "node_modules", "embedded-postgres", "dist", "index.js")
  ];
  const found = candidates.find((rel) => fs.existsSync(rel));
  if (!found) {
    throw new Error("embedded-postgres missing under tools/.cache (run schema rehearsal install first)");
  }
  return found;
}

async function main() {
  refuseHosted();
  if (!["127.0.0.1", "localhost", "::1"].includes(HOST)) {
    throw new Error("host must be loopback");
  }
  console.log(`GENVAL REHEARSAL TARGET: ${HOST}:${PORT}/${DB_MAIN} (embedded local; NOT supabase)`);

  const pin = loadPin();
  const matrix = JSON.parse(fs.readFileSync(path.join(ROOT, "tests", "fixtures", "a19-genval", "matrix.json"), "utf8"));
  const EmbeddedPostgres = (await import(pathToFileURL(embedModule()).href)).default;
  const dataDir = path.join(CACHE, "data");
  fs.mkdirSync(CACHE, { recursive: true });
  fs.rmSync(dataDir, { recursive: true, force: true });

  const cluster = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: USER,
    password: PASSWORD,
    port: PORT,
    persistent: false,
    postgresFlags: ["-c", "listen_addresses=127.0.0.1"],
    onLog: (msg) => {
      const text = String(msg);
      if (/ERROR|FATAL|PANIC/i.test(text)) console.error("[pg]", text.trim());
    }
  });

  let admin;
  let client;
  try {
    await cluster.initialise();
    await cluster.start();
    await cluster.createDatabase(DB_MAIN);
    admin = cluster.getPgClient("postgres", HOST);
    await admin.connect();
    const { rows: targetRows } = await admin.query("SELECT current_database() AS db, inet_server_addr()::text AS addr");
    assert(targetRows[0].db !== "dtflmlbjhttoewqgkujf", "refused live project db name");
    assert(!BANNED.test(String(targetRows[0].addr || "")), "server address looks hosted");
    record("isolation target is loopback embedded Postgres", true, `${HOST}:${PORT}/${DB_MAIN}`);

    client = cluster.getPgClient(DB_MAIN, HOST);
    await client.connect();
    await client.query("SET statement_timeout = '180s'");
    await applyFile(client, path.join(SCHEMA, "rehearsal", "000_synthetic_baseline.sql"));
    await applyFile(client, path.join(SCHEMA, "001_private_ref_tables.sql"));
    for (const name of [
      "00_meta.sql", "01_natures.sql", "02_species.sql", "03_forms.sql",
      "04_abilities.sql", "05_form_abilities.sql", "06_moves.sql",
      "07_learnsets.sql", "08_evolutions.sql", "09_obtain.sql", "10_form_policies.sql"
    ]) {
      await applyFile(client, path.join(SEED, name));
    }
    await applyFile(client, path.join(SCHEMA, "002_catches_nullable_extensions.sql"));
    const { rows: learn } = await client.query(
      `SELECT count(*)::int AS n FROM private.ref_learnsets WHERE content_build = $1`,
      [CONTENT_BUILD]
    );
    assert(learn[0].n === 14048, `learnsets ${learn[0].n}`);
    record("schema+seed loaded on disposable DB", true, "14048 learnsets");

    await applyFile(client, path.join(GENVAL, "001_generate_and_assert.sql"));
    const { rows: fns } = await client.query(
      `SELECT p.proname
       FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'private'
         AND p.proname IN ('generate_streamlink_mon', 'assert_streamlink_legal', 'generate_streamlink_mon_fixture')`
    );
    const names = fns.map((r) => r.proname).sort();
    assert(names.includes("generate_streamlink_mon") && names.includes("assert_streamlink_legal"), `functions ${names}`);
    assert(!names.includes("generate_streamlink_mon_fixture"), "production 001 must not create fixture generate");
    record("production GENVAL functions created without fixture entrypoint", true);

    const { rows: issuedKeep } = await client.query(
      `SELECT private.issue_streamlink_hidden_ticket(1, 'grant', $1, 3600) AS r`,
      [CONTENT_BUILD]
    );
    const keepTicket = issuedKeep[0].r.ticketId;
    assert(keepTicket, JSON.stringify(issuedKeep[0].r));
    await applyFile(client, path.join(GENVAL, "001_generate_and_assert.sql"));
    const { rows: kept } = await client.query(
      `SELECT count(*)::int AS n, count(*) FILTER (WHERE ticket_id = $1)::int AS kept
       FROM private.streamlink_hidden_tickets`,
      [keepTicket]
    );
    assert(kept[0].kept === 1 && kept[0].n === 1, "reapply must not drop tickets");
    record("production SQL reapply is idempotent and keeps tickets", true);

    await applyFile(client, path.join(GENVAL, "local", "010_fixture.sql"));
    const { rows: fixFn } = await client.query(
      `SELECT count(*)::int AS n FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'private' AND p.proname = 'generate_streamlink_mon_fixture'`
    );
    assert(fixFn[0].n === 1);
    record("local fixture helpers loaded after production install", true);

    const { rows: stamp } = await client.query(
      `SELECT count(*)::int AS n FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'private' AND p.proname = 'stamp_catch_row'`
    );
    assert(stamp[0].n === 0, "rehearsal must not invent stamp_catch_row");
    const { rows: pre } = await client.query(
      `SELECT iv_hp, friendship, nature_id FROM public.catches WHERE id = $1`,
      [SYN_BULB]
    );
    assert(pre[0].iv_hp === 10 && pre[0].friendship === 70 && pre[0].nature_id === null);
    record("synthetic catch unchanged; stamp_catch_row absent", true);

    const { rows: priv } = await client.query(
      `SELECT has_function_privilege('anon', 'private.generate_streamlink_mon(integer, integer, text, text, boolean, boolean, text, text)', 'execute') AS anon_gen,
              has_function_privilege('authenticated', 'private.generate_streamlink_mon(integer, integer, text, text, boolean, boolean, text, text)', 'execute') AS auth_gen,
              has_function_privilege('anon', 'private.assert_streamlink_legal(jsonb, text, uuid)', 'execute') AS anon_assert,
              has_function_privilege('anon', 'private.generate_streamlink_mon_fixture(integer, integer, text, text, boolean, boolean, text, text)', 'execute') AS anon_fix,
              has_function_privilege('anon', 'private.issue_streamlink_hidden_ticket(integer, text, text, integer)', 'execute') AS anon_issue,
              has_function_privilege('authenticated', 'private.streamlink_bind_hidden_ticket(uuid, uuid, bytea)', 'execute') AS auth_bind`
    );
    assert(
      priv[0].anon_gen === false &&
      priv[0].auth_gen === false &&
      priv[0].anon_assert === false &&
      priv[0].anon_fix === false &&
      priv[0].anon_issue === false &&
      priv[0].auth_bind === false
    );
    const { rows: helperPriv } = await client.query(
      `SELECT p.proname,
              bool_or(has_function_privilege('anon', p.oid, 'execute')) AS anon_exec,
              bool_or(p.prosecdef) AS secdef,
              bool_or(coalesce(c.unnest, '') LIKE 'search_path=pg_catalog') AS fixed_path
       FROM pg_proc p
       JOIN pg_namespace n ON n.oid = p.pronamespace
       LEFT JOIN LATERAL unnest(coalesce(p.proconfig, ARRAY[]::text[])) c(unnest) ON true
       WHERE n.nspname = 'private'
         AND (p.proname LIKE 'streamlink%' OR p.proname LIKE 'generate_streamlink%' OR p.proname = 'assert_streamlink_legal')
       GROUP BY p.proname`
    );
    assert(helperPriv.length > 0 && helperPriv.every((row) => row.anon_exec === false), "anon must not execute helpers");
    assert(helperPriv.filter((row) => /generate_streamlink_mon$|assert_streamlink_legal|issue_streamlink_hidden_ticket/.test(row.proname)).every((row) => row.secdef && row.fixed_path));
    const { rows: wrappers } = await client.query(
      `SELECT count(*)::int AS n
       FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'public'
         AND (p.proname ILIKE '%streamlink%mon%' OR p.prosrc ILIKE '%generate_streamlink_mon%')`
    );
    assert(wrappers[0].n === 0, "public wrappers must not expose GENVAL");
    record("anon/authenticated cannot EXECUTE generate/assert/issue; no public wrappers", true);

    for (const row of matrix.cases) {
      const mon = assertMonFromFixture(pin, row);
      const { rows } = await client.query(
        `SELECT private.assert_streamlink_legal($1::jsonb, $2) AS r`,
        [mon, row.ctx]
      );
      const ok = rows[0].r.ok === true;
      const expectPass = row.expect === "pass";
      assert(ok === expectPass, `${row.id} ok=${ok} errors=${JSON.stringify(rows[0].r.errors)}`);
    }
    record("matrix assert_streamlink_legal matches fixture expect", true, `${matrix.cases.length} cases`);

    const seedA = "catcher-alpha";
    const seedB = "catcher-beta";
    const { rows: genA } = await client.query(
      `SELECT private.generate_streamlink_mon_fixture(1, 5, 'catch', $1, true, false, $2, NULL) AS r`,
      [seedA, CONTENT_BUILD]
    );
    const { rows: genA2 } = await client.query(
      `SELECT private.generate_streamlink_mon_fixture(1, 5, 'catch', $1, true, false, $2, NULL) AS r`,
      [seedA, CONTENT_BUILD]
    );
    const { rows: genB } = await client.query(
      `SELECT private.generate_streamlink_mon_fixture(1, 5, 'catch', $1, false, false, $2, NULL) AS r`,
      [seedB, CONTENT_BUILD]
    );
    assert(genA[0].r.ok === true && genB[0].r.ok === true, JSON.stringify(genA[0].r.errors || genB[0].r.errors));
    assert(genA[0].r.abilitySlot !== "hidden", "flag must not grant hidden");
    assert(JSON.stringify(genA[0].r) === JSON.stringify(genA2[0].r), "same seed must be deterministic");
    const oracleA = expectedGenerate(pin, 1, 5, seedA);
    assert(genA[0].r.natureId === oracleA.natureId, `nature ${genA[0].r.natureId} vs ${oracleA.natureId}`);
    assert(genA[0].r.ivs.hp === oracleA.ivs.hp && genA[0].r.ivs.spe === oracleA.ivs.spe);
    assert(genA[0].r.abilityId === oracleA.abilityId && genA[0].r.abilitySlot === oracleA.abilitySlot);
    assert(genA[0].r.gender === oracleA.gender);
    assert(genA[0].r.friendship === 50);
    const sqlMoves = (genA[0].r.moveSlots || []).map((m) => Number(m.moveId));
    assert(JSON.stringify(sqlMoves) === JSON.stringify(oracleA.moveIds), `moves ${sqlMoves} vs ${oracleA.moveIds}`);
    assert(genA[0].r.hpMax === oracleA.hpMax);
    const { rows: legalA } = await client.query(
      `SELECT private.assert_streamlink_legal($1::jsonb, 'catch') AS r`,
      [genA[0].r]
    );
    assert(legalA[0].r.ok === true, JSON.stringify(legalA[0].r.errors));
    const differ = genA[0].r.natureId !== genB[0].r.natureId || JSON.stringify(genA[0].r.ivs) !== JSON.stringify(genB[0].r.ivs);
    assert(differ, "different seeds should be allowed to differ");
    record("generate matches JS oracle; flag ignored; seeds differ", true, `seedA nature=${genA[0].r.natureId}`);

    const { rows: gmax } = await client.query(
      `SELECT private.generate_streamlink_mon_fixture(10195, 50, 'grant', 'x', true, false, $1, NULL) AS r`,
      [CONTENT_BUILD]
    );
    const { rows: c1 } = await client.query(
      `SELECT private.generate_streamlink_mon_fixture(10278, 50, 'grant', 'x', true, false, $1, NULL) AS r`,
      [CONTENT_BUILD]
    );
    assert(gmax[0].r.ok === false && (gmax[0].r.errors || []).includes("g1-c1-blocked"));
    assert(c1[0].r.ok === false && (c1[0].r.errors || []).includes("g1-c1-blocked"));
    record("G1/C1 generate fail closed (no remap)", true);

    const { rows: art } = await client.query(
      `SELECT private.generate_streamlink_mon_fixture(144, 50, 'catch', 'x', false, false, $1, NULL) AS r`,
      [CONTENT_BUILD]
    );
    const { rows: artG } = await client.query(
      `SELECT private.generate_streamlink_mon_fixture(144, 50, 'grant', 'x', false, false, $1, NULL) AS r`,
      [CONTENT_BUILD]
    );
    assert(art[0].r.ok === false && (art[0].r.errors || []).includes("obtain-denied"));
    assert(artG[0].r.ok === true && artG[0].r.friendship === 35, JSON.stringify(artG[0].r.errors));
    record("Articuno catch denied; grant friendship 35", true);

    const { rows: haNo } = await client.query(
      `SELECT private.generate_streamlink_mon_fixture(1, 5, 'grant', 'ha-seed', true, false, $1, NULL) AS r`,
      [CONTENT_BUILD]
    );
    const { rows: issued } = await client.query(
      `SELECT private.issue_streamlink_hidden_ticket(1, 'grant', $1, 3600) AS r`,
      [CONTENT_BUILD]
    );
    assert(issued[0].r.ok === true && issued[0].r.ticketId, JSON.stringify(issued[0].r));
    const ticketId = issued[0].r.ticketId;
    const { rows: haYes } = await client.query(
      `SELECT private.generate_streamlink_mon_fixture(1, 5, 'grant', 'ha-seed', false, false, $1, $2) AS r`,
      [CONTENT_BUILD, ticketId]
    );
    assert(haNo[0].r.ok === true && haNo[0].r.abilitySlot !== "hidden");
    assert(haYes[0].r.ok === true && haYes[0].r.abilitySlot === "hidden" && haYes[0].r.abilityId === 34, JSON.stringify(haYes[0].r));
    const { rows: haForge } = await client.query(
      `SELECT private.assert_streamlink_legal($1::jsonb, 'grant') AS r`,
      [haYes[0].r]
    );
    assert(haForge[0].r.ok === false && (haForge[0].r.errors || []).includes("hidden-not-authorized"), "hiddenGrant in JSON must not authorize");
    const { rows: haLegal } = await client.query(
      `SELECT private.assert_streamlink_legal($1::jsonb, 'grant', $2::uuid) AS r`,
      [haYes[0].r, ticketId]
    );
    assert(haLegal[0].r.ok === true, JSON.stringify(haLegal[0].r.errors));
    const forged = JSON.parse(JSON.stringify(haYes[0].r));
    const nextHp = (Number(forged.ivs.hp) + 1) % 32;
    forged.ivs.hp = nextHp;
    forged.hpMax = hpMax(pin.forms.find((row) => Number(row.formId) === 1).hp, nextHp, 0, 5);
    forged.hpCurrent = forged.hpMax;
    delete forged.hiddenGrant;
    delete forged.hiddenTicketId;
    delete forged.hiddenSpecimenId;
    const { rows: cross } = await client.query(
      `SELECT private.assert_streamlink_legal($1::jsonb, 'grant', $2::uuid) AS r`,
      [forged, ticketId]
    );
    assert(cross[0].r.ok === false && (cross[0].r.errors || []).includes("hidden-not-authorized"), "cross-specimen reuse must fail");
    const { rows: stillOrig } = await client.query(
      `SELECT private.assert_streamlink_legal($1::jsonb, 'grant', $2::uuid) AS r`,
      [haYes[0].r, ticketId]
    );
    assert(stillOrig[0].r.ok === true, JSON.stringify(stillOrig[0].r.errors));
    await client.query(
      `UPDATE private.streamlink_hidden_tickets
          SET issued_at = now() - interval '2 hours',
              expires_at = now() - interval '1 hour'
        WHERE ticket_id = $1`,
      [ticketId]
    );
    const { rows: postExp } = await client.query(
      `SELECT private.assert_streamlink_legal($1::jsonb, 'grant', $2::uuid) AS r`,
      [haYes[0].r, ticketId]
    );
    assert(postExp[0].r.ok === true, "already-bound specimen remains valid after ticket expiry");
    const { rows: failThen } = await client.query(
      `SELECT private.issue_streamlink_hidden_ticket(1, 'grant', $1, 3600) AS r`,
      [CONTENT_BUILD]
    );
    const failTicket = failThen[0].r.ticketId;
    const { rows: lvFail } = await client.query(
      `SELECT private.generate_streamlink_mon_fixture(1, 0, 'grant', 'ha-seed', false, false, $1, $2) AS r`,
      [CONTENT_BUILD, failTicket]
    );
    assert(lvFail[0].r.ok === false && (lvFail[0].r.errors || []).includes("bad-level"));
    const { rows: unused } = await client.query(
      `SELECT redeemed_at IS NULL AS open FROM private.streamlink_hidden_tickets WHERE ticket_id = $1`,
      [failTicket]
    );
    assert(unused[0].open === true, "failed generate must not consume the ticket");
    const { rows: afterFail } = await client.query(
      `SELECT private.generate_streamlink_mon_fixture(1, 5, 'grant', 'ha-seed', false, false, $1, $2) AS r`,
      [CONTENT_BUILD, failTicket]
    );
    assert(afterFail[0].r.ok === true && afterFail[0].r.abilitySlot === "hidden", JSON.stringify(afterFail[0].r.errors));
    const { rows: haReplay } = await client.query(
      `SELECT private.generate_streamlink_mon_fixture(1, 5, 'grant', 'ha-seed', false, false, $1, $2) AS r`,
      [CONTENT_BUILD, ticketId]
    );
    assert(haReplay[0].r.ok === false && (haReplay[0].r.errors || []).includes("hidden-ticket-replay"));
    const { rows: issuedCatch } = await client.query(
      `SELECT private.issue_streamlink_hidden_ticket(1, 'grant', $1, 3600) AS r`,
      [CONTENT_BUILD]
    );
    const { rows: haWrongCtx } = await client.query(
      `SELECT private.generate_streamlink_mon_fixture(1, 5, 'catch', 'ha-seed', true, false, $1, $2) AS r`,
      [CONTENT_BUILD, issuedCatch[0].r.ticketId]
    );
    assert(haWrongCtx[0].r.ok === false && (haWrongCtx[0].r.errors || []).includes("hidden-not-authorized"));
    const { rows: issuedExp } = await client.query(
      `SELECT private.issue_streamlink_hidden_ticket(1, 'grant', $1, 3600) AS r`,
      [CONTENT_BUILD]
    );
    await client.query(
      `UPDATE private.streamlink_hidden_tickets
          SET issued_at = now() - interval '2 seconds',
              expires_at = now() - interval '1 second'
        WHERE ticket_id = $1`,
      [issuedExp[0].r.ticketId]
    );
    const { rows: haExp } = await client.query(
      `SELECT private.generate_streamlink_mon_fixture(1, 5, 'grant', 'ha-seed', false, false, $1, $2) AS r`,
      [CONTENT_BUILD, issuedExp[0].r.ticketId]
    );
    assert(haExp[0].r.ok === false && (haExp[0].r.errors || []).includes("hidden-ticket-expired"));
    const { rows: issuedRace } = await client.query(
      `SELECT private.issue_streamlink_hidden_ticket(1, 'grant', $1, 3600) AS r`,
      [CONTENT_BUILD]
    );
    const raceTicket = issuedRace[0].r.ticketId;
    const client2 = cluster.getPgClient(DB_MAIN, HOST);
    await client2.connect();
    const raceSql = `SELECT private.generate_streamlink_mon_fixture(1, 5, 'grant', $1, false, false, $2, $3) AS r`;
    const raced = await Promise.all([
      client.query(raceSql, ["race-a", CONTENT_BUILD, raceTicket]),
      client2.query(raceSql, ["race-b", CONTENT_BUILD, raceTicket])
    ]);
    await client2.end();
    const raceResults = raced.map((row) => row.rows[0].r);
    const raceWins = raceResults.filter((row) => row.ok === true);
    const raceFails = raceResults.filter((row) => row.ok === false &&
      ((row.errors || []).includes("hidden-ticket-replay") || (row.errors || []).includes("hidden-not-authorized")));
    assert(raceWins.length === 1 && raceFails.length === 1, JSON.stringify(raceResults.map((row) => row.errors || row.abilitySlot)));
    record("hidden binds one specimen; failed generate does not consume; concurrent redeem is single-winner", true);

    await client.query("SELECT set_config('starlight.genval_mode', 'fixture', false)");
    await client.query("SELECT set_config('starlight.catcher_nonce', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', false)");
    await client.query("SELECT set_config('starlight.round_id', $1, false)", [seedA]);
    const { rows: prod1 } = await client.query(
      `SELECT private.generate_streamlink_mon(1, 5, 'catch', $1, true, false, $2, NULL) AS r`,
      [seedA, CONTENT_BUILD]
    );
    const { rows: prod2 } = await client.query(
      `SELECT private.generate_streamlink_mon(1, 5, 'catch', $1, true, false, $2, NULL) AS r`,
      [seedA, CONTENT_BUILD]
    );
    assert(prod1[0].r.ok === true && prod2[0].r.ok === true, JSON.stringify(prod1[0].r.errors || prod2[0].r.errors));
    assert(prod1[0].r.abilitySlot !== "hidden");
    const oracleA2 = expectedGenerate(pin, 1, 5, seedA);
    const prodMatchesOracle = prod1[0].r.natureId === oracleA2.natureId &&
      JSON.stringify(prod1[0].r.ivs) === JSON.stringify(oracleA2.ivs);
    assert(!prodMatchesOracle, "GUC fixture mode must not steer production generate");
    const prodSame = JSON.stringify(prod1[0].r.ivs) === JSON.stringify(prod2[0].r.ivs) &&
      prod1[0].r.natureId === prod2[0].r.natureId;
    assert(!prodSame, "production generate must not be caller-seed deterministic");
    record("production entropy ignores GUCs and caller seeds", true);

    await client.query(`DROP ROLE IF EXISTS genval_untrusted`);
    await client.query(`CREATE ROLE genval_untrusted NOLOGIN NOSUPERUSER`);
    let insertDenied = false;
    try {
      await client.query("SET ROLE genval_untrusted");
      await client.query(
        `INSERT INTO private.streamlink_hidden_tickets (ticket_id, content_build, form_id, ctx, expires_at)
         VALUES (gen_random_uuid(), $1, 1, 'grant', now() + interval '1 hour')`,
        [CONTENT_BUILD]
      );
    } catch (error) {
      insertDenied = /permission denied|row-level security/i.test(String(error.message));
    } finally {
      await client.query("RESET ROLE");
    }
    assert(insertDenied, "untrusted role must not insert tickets");
    const { rows: badJson } = await client.query(
      `SELECT private.assert_streamlink_legal($1::jsonb, 'catch') AS r`,
      [{ contentBuild: CONTENT_BUILD, rulesetId: "streamlink-gen9-xgen", formId: "1", dex: 1, level: 5 }]
    );
    assert(badJson[0].r.ok === false && (badJson[0].r.errors || []).includes("bad-form-id"));
    const { rows: lv0 } = await client.query(
      `SELECT private.generate_streamlink_mon_fixture(1, 0, 'catch', 'x', false, false, $1, NULL) AS r`,
      [CONTENT_BUILD]
    );
    assert(lv0[0].r.ok === false && (lv0[0].r.errors || []).includes("bad-level"));
    record("untrusted ticket insert denied; malformed JSON and level 0 fail closed", true);

    const { rows: after } = await client.query(
      `SELECT iv_hp, friendship, nature_id, ability_id FROM public.catches WHERE id = $1`,
      [SYN_BULB]
    );
    assert(after[0].iv_hp === 10 && after[0].friendship === 70 && after[0].nature_id === null && after[0].ability_id === null);
    record("no catch writes during GENVAL rehearsal", true);

    const failed = results.filter((row) => !row.passed);
    console.log(`\n${results.filter((r) => r.passed).length}/${results.length} REAL SQL checks passed`);
    if (failed.length) process.exitCode = 1;
    return { passed: failed.length === 0, results, target: `${HOST}:${PORT}/${DB_MAIN}` };
  } finally {
    try { if (client) await client.end(); } catch (_) { /* ignore */ }
    try { if (admin) await admin.end(); } catch (_) { /* ignore */ }
    try { await cluster.stop(); } catch (_) { /* ignore */ }
    try { fs.rmSync(path.join(CACHE, "data"), { recursive: true, force: true }); } catch (_) { /* ignore */ }
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("GENVAL REHEARSAL FAILED:", error.message);
    process.exit(1);
  });
}

module.exports = { refuseHosted, splitSql, BANNED, HOST, PORT, DB_MAIN, main };
