/* Isolated A19-WIRE PostgreSQL rehearsal (issues #25 / #18, D45).
 * Disposable LOCAL cluster only. Synthetic accounts and catches only.
 * Does not read SUPABASE_URL / DATABASE_URL. Does not touch live catches.
 * Does not apply to hosted Supabase. Does not flip production switch.
 * Does not use real Sora/Twinkle records.
 */
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const { refuseHosted, splitSql, BANNED } = require("./a19-schema-rehearsal.js");

const ROOT = path.join(__dirname, "..");
const CACHE23 = path.join(__dirname, ".cache", "a23-pg-harness");
const CACHE25 = path.join(__dirname, ".cache", "a25-pg-harness");
const CACHE = path.join(__dirname, ".cache", "a45-pg-harness");
const SCHEMA = path.join(ROOT, "supabase", "unapplied", "a19-schema");
const GENVAL = path.join(ROOT, "supabase", "unapplied", "a19-genval");
const WIRE = path.join(ROOT, "supabase", "unapplied", "a19-wire");
const SEED = path.join(SCHEMA, "seed");
const HOST = "127.0.0.1";
const PORT = 55434;
const USER = "postgres";
const PASSWORD = "a19-wire-local-only";
const DB_MAIN = "a19_wire";
const CONTENT_BUILD = "sl-ref-20261013-227b573";
const SYN_BULB = "11111111-1111-1111-1111-111111111111";
const USER_OAK = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const USER_LEAF = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const USER_BLUE = "01010101-0101-0101-0101-010101010101";
const USER_RED = "02020202-0202-0202-0202-020202020202";
const USER_PROT_A = "ccccccc1-cccc-cccc-cccc-ccccccccccc1";
const ROUND = "99999999-9999-9999-9999-999999999999";

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
    path.join(CACHE25, "node_modules", "embedded-postgres", "dist", "index.js"),
    path.join(CACHE23, "node_modules", "embedded-postgres", "dist", "index.js")
  ];
  const found = candidates.find((rel) => fs.existsSync(rel));
  if (!found) {
    throw new Error("embedded-postgres missing under tools/.cache (run schema rehearsal install first)");
  }
  return found;
}

function persistSql(userId, formId, level, ctx, sourceKey, extra = {}) {
  return {
    text: `SELECT private.persist_streamlink_catch($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) AS r`,
    values: [
      userId,
      formId,
      level,
      ctx,
      sourceKey,
      extra.ball || "poke",
      extra.roundId || null,
      extra.shiny === true,
      extra.build || CONTENT_BUILD,
      extra.ticket || null,
      extra.variant || "normal",
      extra.name || null,
      extra.gender || null
    ]
  };
}

function materializeSql(userId, formId, level, ctx, sourceKey, extra = {}) {
  return {
    text: `SELECT private.materialize_streamlink_catch($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) AS r`,
    values: persistSql(userId, formId, level, ctx, sourceKey, extra).values
  };
}

async function main() {
  refuseHosted();
  if (!["127.0.0.1", "localhost", "::1"].includes(HOST)) {
    throw new Error("host must be loopback");
  }
  console.log(`WIRE REHEARSAL TARGET: ${HOST}:${PORT}/${DB_MAIN} (embedded local; NOT supabase)`);

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
  let clientB;
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
    await applyFile(client, path.join(GENVAL, "001_generate_and_assert.sql"));
    await applyFile(client, path.join(WIRE, "local", "020_wire_baseline.sql"));
    await applyFile(client, path.join(WIRE, "local", "010_stamp_replica.sql"));
    const { rows: oddsBefore } = await client.query(
      `SELECT md5(p.prosrc) AS src
       FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'private' AND p.proname IN ('ball_catch_chance','berry_catch_bonus','honey_catch_multiplier')
       ORDER BY p.proname`
    );
    await applyFile(client, path.join(WIRE, "001_wire_switch_and_persist.sql"));
    await applyFile(client, path.join(WIRE, "002_materialize_hook.sql"));
    const { rows: oddsAfter } = await client.query(
      `SELECT md5(p.prosrc) AS src
       FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'private' AND p.proname IN ('ball_catch_chance','berry_catch_bonus','honey_catch_multiplier')
       ORDER BY p.proname`
    );
    assert(JSON.stringify(oddsBefore) === JSON.stringify(oddsAfter), "capture helpers rewritten");
    record("schema+GENVAL+WIRE loaded; capture helpers unchanged", true, `${oddsAfter.length} odds functions`);

    const { rows: switchOff } = await client.query("SELECT private.streamlink_wire_is_enabled() AS on");
    assert(switchOff[0].on === false, "switch must default false");
    await client.query("SELECT set_config('starlight.wire_genval', 'on', false)");
    const { rows: gucIgnored } = await client.query("SELECT private.streamlink_wire_is_enabled() AS on");
    assert(gucIgnored[0].on === false, "GUC must not enable WIRE");
    record("switch defaults off and ignores GUC", true);

    const { rows: invBefore } = await client.query(
      `SELECT poke_balls, poke_coins, razz_berries, honey FROM public.trainer_inventory WHERE user_id = $1`,
      [USER_OAK]
    );

    const { rows: stampPath } = await client.query(materializeSql(
      USER_OAK, 1, 5, "catch", `play:${ROUND}:${USER_OAK}:stamp`, { roundId: ROUND }
    ));
    assert(stampPath[0].r.ok === true && stampPath[0].r.path === "stamp", JSON.stringify(stampPath[0].r));
    const { rows: stampRow } = await client.query(
      `SELECT public_id, nature_id, content_build, iv_hp, friendship, ability_slot
       FROM public.catches WHERE id = $1`,
      [stampPath[0].r.catchId]
    );
    assert(String(stampRow[0].public_id).startsWith("LG"), stampRow[0].public_id);
    assert(stampRow[0].nature_id === null && stampRow[0].content_build === null);
    assert(stampRow[0].iv_hp !== null && stampRow[0].friendship === 0);
    record("switch-off materialize uses stamp + LG public_id", true, stampRow[0].public_id);

    const { rows: persistOff } = await client.query(persistSql(
      USER_LEAF, 1, 5, "catch", `play:${ROUND}:${USER_LEAF}:off`
    ));
    assert(persistOff[0].r.ok === false && persistOff[0].r.errors.includes("wire-disabled"), JSON.stringify(persistOff[0].r));
    record("persist refuses while switch is off", true);

    await client.query("SELECT private.streamlink_wire_set_enabled(true)");
    const { rows: switchOn } = await client.query("SELECT private.streamlink_wire_is_enabled() AS on");
    assert(switchOn[0].on === true);
    record("named switch enables WIRE", true);

    const { rows: a } = await client.query(persistSql(
      USER_BLUE, 1, 5, "catch", `play:${ROUND}:${USER_BLUE}`, { roundId: ROUND }
    ));
    const { rows: b } = await client.query(persistSql(
      USER_RED, 1, 5, "catch", `play:${ROUND}:${USER_RED}`, { roundId: ROUND }
    ));
    assert(a[0].r.ok && b[0].r.ok, JSON.stringify({ a: a[0].r, b: b[0].r }));
    const { rows: pair } = await client.query(
      `SELECT id, user_id, public_id, nature_id, iv_hp, iv_atk, iv_def, iv_spa, iv_spd, iv_spe,
              ability_slot, friendship, content_build, ruleset_id, hp_max, hp_current, move_slots
       FROM public.catches WHERE id IN ($1,$2) ORDER BY user_id`,
      [a[0].r.catchId, b[0].r.catchId]
    );
    assert(pair.length === 2);
    assert(pair.every((row) => String(row.public_id).startsWith("SL")));
    assert(pair.every((row) => row.content_build === CONTENT_BUILD));
    assert(pair.every((row) => row.ruleset_id === "streamlink-gen9-xgen"));
    assert(pair.every((row) => row.friendship === 50));
    assert(pair.every((row) => row.hp_max === row.hp_current && row.hp_max > 0));
    assert(pair.every((row) => row.ability_slot === "1" || row.ability_slot === "2"));
    const sameCombat = pair[0].nature_id === pair[1].nature_id
      && pair[0].iv_hp === pair[1].iv_hp
      && pair[0].iv_atk === pair[1].iv_atk
      && pair[0].iv_spe === pair[1].iv_spe;
    assert(!sameCombat, "two catchers must not share the same IV/Nature roll");
    record("two catchers one round get distinct GENVAL rows + SL ids", true, `${pair[0].public_id}/${pair[1].public_id}`);

    const replayKey = `play:${ROUND}:${USER_BLUE}`;
    const { rows: replay } = await client.query(persistSql(
      USER_BLUE, 1, 5, "catch", replayKey, { roundId: ROUND }
    ));
    assert(replay[0].r.ok === false && replay[0].r.errors.includes("already-settled"), JSON.stringify(replay[0].r));
    const { rows: countBlue } = await client.query(
      `SELECT count(*)::int AS n FROM public.catches WHERE user_id = $1 AND source_key = $2`,
      [USER_BLUE, replayKey]
    );
    assert(countBlue[0].n === 1);
    record("source_key + round/user unique indexes block settle replay", true);

    clientB = cluster.getPgClient(DB_MAIN, HOST);
    await clientB.connect();
    const raceKey = `play:${ROUND}:race`;
    const raceA = client.query(persistSql(USER_OAK, 1, 7, "catch", raceKey));
    const raceB = clientB.query(persistSql(USER_LEAF, 1, 7, "catch", raceKey));
    const raced = await Promise.all([raceA, raceB]);
    const raceOk = raced.filter((row) => row.rows[0].r.ok === true);
    const raceFail = raced.filter((row) => row.rows[0].r.ok === false);
    assert(raceOk.length === 1 && raceFail.length === 1, JSON.stringify(raced.map((x) => x.rows[0].r)));
    assert(raceFail[0].rows[0].r.errors.includes("already-settled"));
    record("simultaneous settle/replay: exactly one winner", true);

    const { rows: issued } = await client.query(
      `SELECT private.issue_streamlink_hidden_ticket(1, 'grant', $1, 3600) AS r`,
      [CONTENT_BUILD]
    );
    assert(issued[0].r.ok === true, JSON.stringify(issued[0].r));
    const ticketId = issued[0].r.ticketId;
    const { rows: ha } = await client.query(persistSql(
      USER_LEAF, 1, 12, "grant", `grant:ha:${ticketId}`, { ticket: ticketId }
    ));
    assert(ha[0].r.ok === true, JSON.stringify(ha[0].r));
    assert(ha[0].r.mon.abilitySlot === "hidden", JSON.stringify(ha[0].r.mon));
    const { rows: bound } = await client.query(
      `SELECT specimen_id, redeemed_at IS NOT NULL AS redeemed
       FROM private.streamlink_hidden_tickets WHERE ticket_id = $1`,
      [ticketId]
    );
    assert(bound[0].redeemed === true);
    assert(bound[0].specimen_id === ha[0].r.catchId, `${bound[0].specimen_id} !== ${ha[0].r.catchId}`);
    const { rows: haReplay } = await client.query(persistSql(
      USER_LEAF, 1, 12, "grant", `grant:ha-replay:${ticketId}`, { ticket: ticketId }
    ));
    assert(haReplay[0].r.ok === false && haReplay[0].r.errors.includes("hidden-ticket-replay"), JSON.stringify(haReplay[0].r));
    record("HA ticket binds 1:1 to preallocated catches.id; replay blocked", true, ha[0].r.catchId);

    const { rows: ordinary } = await client.query(persistSql(
      USER_OAK, 1, 8, "catch", `play:ord:${USER_OAK}`
    ));
    assert(ordinary[0].r.ok === true);
    assert(["1", "2"].includes(ordinary[0].r.mon.abilitySlot), ordinary[0].r.mon.abilitySlot);
    assert(ordinary[0].r.mon.abilitySlot !== "hidden");
    record("ordinary catch cannot roll hidden ability", true, ordinary[0].r.mon.abilitySlot);

    const { rows: g1 } = await client.query(persistSql(
      USER_OAK, 10195, 20, "catch", "play:g1"
    ));
    const { rows: c1 } = await client.query(persistSql(
      USER_OAK, 10278, 20, "grant", "grant:c1"
    ));
    assert(g1[0].r.ok === false && (g1[0].r.errors || []).includes("g1-c1-blocked"), JSON.stringify(g1[0].r));
    assert(c1[0].r.ok === false && (c1[0].r.errors || []).includes("g1-c1-blocked"), JSON.stringify(c1[0].r));
    record("G1/C1 requested form ids fail closed", true);

    const { rows: legacyAssert } = await client.query(
      `SELECT private.assert_streamlink_legal(
         jsonb_build_object('dex', 1, 'level', 5, 'formId', 1),
         'catch'
       ) AS r`
    );
    assert(legacyAssert[0].r.ok === false && legacyAssert[0].r.errors.includes("legacy-row"));
    const { rows: legacyRow } = await client.query(
      `SELECT iv_hp, friendship, nature_id, content_build, public_id
       FROM public.catches WHERE id = $1`,
      [SYN_BULB]
    );
    assert(legacyRow[0].iv_hp === 10 && legacyRow[0].friendship === 70);
    assert(legacyRow[0].nature_id === null && legacyRow[0].content_build === null);
    assert(legacyRow[0].public_id === "syn-bulb-1");
    record("legacy catch stays NULL GENVAL; assert returns legacy-row", true);

    const wireCatchId = ordinary[0].r.catchId;
    const { rows: beforeStamp } = await client.query(
      `SELECT iv_hp, nature_id, friendship, public_id, content_build, ability_slot, hp_max
       FROM public.catches WHERE id = $1`,
      [wireCatchId]
    );
    await client.query(`UPDATE public.catches SET level = level WHERE id = $1`, [wireCatchId]);
    const { rows: afterStamp } = await client.query(
      `SELECT iv_hp, nature_id, friendship, public_id, content_build, ability_slot, hp_max
       FROM public.catches WHERE id = $1`,
      [wireCatchId]
    );
    assert(JSON.stringify(beforeStamp[0]) === JSON.stringify(afterStamp[0]), "stamp overwrote GENVAL");
    assert(String(afterStamp[0].public_id).startsWith("SL"));
    record("stamp_catch_row does not overwrite supplied Gen IX attributes", true);

    const { rows: protGrant } = await client.query(persistSql(
      USER_PROT_A, 1, 5, "grant", "grant:protected-denied"
    ));
    assert(protGrant[0].r.ok === false && protGrant[0].r.errors.includes("protected-trainer"), JSON.stringify(protGrant[0].r));
    const { rows: protEvent } = await client.query(persistSql(
      USER_PROT_A, 1, 5, "event", "event:protected-denied"
    ));
    assert(protEvent[0].r.ok === false && protEvent[0].r.errors.includes("protected-trainer"));
    record("grant/event refuse protected denylist logins (synthetic ids)", true);

    const { rows: priv } = await client.query(
      `SELECT has_function_privilege('anon', 'private.persist_streamlink_catch(uuid, integer, integer, text, text, text, uuid, boolean, text, text, text, text, text)', 'execute') AS anon_p,
              has_function_privilege('authenticated', 'private.persist_streamlink_catch(uuid, integer, integer, text, text, text, uuid, boolean, text, text, text, text, text)', 'execute') AS auth_p,
              has_function_privilege('anon', 'private.streamlink_wire_set_enabled(boolean)', 'execute') AS anon_sw,
              has_function_privilege('authenticated', 'private.materialize_streamlink_catch(uuid, integer, integer, text, text, text, uuid, boolean, text, text, text, text, text)', 'execute') AS auth_m`
    );
    assert(priv[0].anon_p === false && priv[0].auth_p === false && priv[0].anon_sw === false && priv[0].auth_m === false);
    record("anon/authenticated cannot EXECUTE persist/materialize/switch", true);

    const { rows: invAfter } = await client.query(
      `SELECT poke_balls, poke_coins, razz_berries, honey FROM public.trainer_inventory WHERE user_id = $1`,
      [USER_OAK]
    );
    assert(JSON.stringify(invBefore[0]) === JSON.stringify(invAfter[0]), "inventory mutated");
    record("persist does not deduct balls, berries, honey, or coins", true, JSON.stringify(invAfter[0]));

    await client.query("SELECT private.streamlink_wire_set_enabled(false)");
    const { rows: offAgain } = await client.query(materializeSql(
      USER_LEAF, 1, 5, "catch", `play:${ROUND}:${USER_LEAF}:stamp2`, { roundId: "88888888-8888-8888-8888-888888888888" }
    ));
    assert(offAgain[0].r.ok === true && offAgain[0].r.path === "stamp");
    const { rows: offRow } = await client.query(
      `SELECT public_id, nature_id FROM public.catches WHERE id = $1`,
      [offAgain[0].r.catchId]
    );
    assert(String(offRow[0].public_id).startsWith("LG"));
    assert(offRow[0].nature_id === null);
    record("turning the switch off returns new inserts to stamp-only fills", true, offRow[0].public_id);

    const failed = results.filter((row) => !row.passed);
    if (failed.length) {
      throw new Error(`${failed.length} recorded failures`);
    }
    console.log(`\nREAL SQL ${results.length}/${results.length} PASS on ${HOST}:${PORT}/${DB_MAIN}`);
  } finally {
    try { if (clientB) await clientB.end(); } catch (_) { /* ignore */ }
    try { if (client) await client.end(); } catch (_) { /* ignore */ }
    try { if (admin) await admin.end(); } catch (_) { /* ignore */ }
    try { await cluster.stop(); } catch (_) { /* ignore */ }
  }
}

module.exports = { HOST, PORT, DB_MAIN, BANNED, refuseHosted };

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
