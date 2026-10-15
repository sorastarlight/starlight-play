/* Isolated A19-WIRE settle integration rehearsal (epic #18, D47).
 * Disposable LOCAL cluster only. Synthetic accounts only.
 * Exercises private.settle_if_needed, not just materialize in isolation.
 * Failure injection lives in local/040_test_inject.sql, never in 003.
 */
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const { refuseHosted, splitSql, BANNED } = require("./a19-schema-rehearsal.js");

const ROOT = path.join(__dirname, "..");
const CACHE23 = path.join(__dirname, ".cache", "a23-pg-harness");
const CACHE = path.join(__dirname, ".cache", "a46-pg-harness");
const SCHEMA = path.join(ROOT, "supabase", "unapplied", "a19-schema");
const GENVAL = path.join(ROOT, "supabase", "unapplied", "a19-genval");
const WIRE = path.join(ROOT, "supabase", "unapplied", "a19-wire");
const SEED = path.join(SCHEMA, "seed");
const HOST = "127.0.0.1";
const PORT = 55436;
const USER = "postgres";
const PASSWORD = "a19-wire-settle-local-only";
const DB_MAIN = "a19_wire_settle";
const CONTENT_BUILD = "sl-ref-20261013-227b573";
const USER_OAK = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const USER_LEAF = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const USER_BLUE = "01010101-0101-0101-0101-010101010101";

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
  for (const stmt of splitSql(sql)) {
    await client.query(stmt);
  }
}

function embedModule() {
  const candidates = [
    path.join(CACHE, "node_modules", "embedded-postgres", "dist", "index.js"),
    path.join(CACHE23, "node_modules", "embedded-postgres", "dist", "index.js")
  ];
  const found = candidates.find((rel) => fs.existsSync(rel));
  if (!found) {
    throw new Error("embedded-postgres missing under tools/.cache");
  }
  return found;
}

async function openRound(client, id, opts = {}) {
  await client.query(
    `SELECT public.rehearsal_open_round($1,$2,$3,$4,$5,$6,$7)`,
    [
      id,
      opts.dex || 1,
      opts.formId || 1,
      opts.outcome || "catch",
      opts.variant || "normal",
      opts.gender || "Male",
      opts.level || 5
    ]
  );
}

async function joinThrow(client, userId, roundId, ball = "pokeball", prep = null) {
  await client.query(`SELECT public.play_join_as($1,$2)`, [userId, roundId]);
  if (prep) {
    await client.query(`SELECT public.play_prepare_as($1,$2,$3)`, [userId, prep, roundId]);
  }
  await client.query(`SELECT public.play_throw_as($1,$2,$3)`, [userId, ball, roundId]);
}

async function settle(client, roundId) {
  const { rows } = await client.query(
    `SELECT * FROM private.settle_if_needed((SELECT r FROM public.encounter_rounds r WHERE id = $1))`,
    [roundId]
  );
  return rows[0];
}

async function inv(client, userId) {
  const { rows } = await client.query(
    `SELECT pokeball, greatball, berry, bait FROM public.inventories WHERE user_id = $1`,
    [userId]
  );
  return rows[0];
}

async function xp(client, userId) {
  const { rows } = await client.query(
    `SELECT xp FROM public.trainer_xp WHERE user_id = $1`,
    [userId]
  );
  return rows[0].xp;
}

async function main() {
  refuseHosted();
  console.log(`WIRE SETTLE REHEARSAL TARGET: ${HOST}:${PORT}/${DB_MAIN} (embedded local; NOT supabase)`);

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
    initdbFlags: ["--encoding=UTF8", "--no-locale"],
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
    assert(targetRows[0].db !== "dtflmlbjhttoewqgkujf");
    assert(!BANNED.test(String(targetRows[0].addr || "")));
    record("isolation target is loopback embedded Postgres", true, `${HOST}:${PORT}/${DB_MAIN}`);

    client = cluster.getPgClient(DB_MAIN, HOST);
    await client.connect();
    await client.query("SET client_encoding TO 'UTF8'");
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
    await applyFile(client, path.join(WIRE, "001_wire_switch_and_persist.sql"));
    await applyFile(client, path.join(WIRE, "002_materialize_hook.sql"));
    await applyFile(client, path.join(WIRE, "local", "030_settle_world.sql"));
    await applyFile(client, path.join(WIRE, "003_settle_integration.sql"));
    const { rows: settleSrc } = await client.query(
      `SELECT prosrc FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'private' AND p.proname = 'settle_if_needed'`
    );
    assert(settleSrc[0].prosrc.includes("materialize_streamlink_catch"));
    assert(settleSrc[0].prosrc.includes("already-settled-without-catch"));
    assert(!settleSrc[0].prosrc.includes("streamlink_after_materialize_hook"));
    assert(!/insert into public.catches \(user_id, dex, name, variant, gender, ball, round_id, source_key, pokemon_form_id\)/i.test(settleSrc[0].prosrc));
    record("003 wired settle_if_needed to materialize; no production test hook", true);
    await applyFile(client, path.join(WIRE, "local", "040_test_inject.sql"));
    const { rows: hookOnly } = await client.query(
      `SELECT to_regprocedure('private.streamlink_after_materialize_hook()') IS NOT NULL AS hook`
    );
    assert(hookOnly[0].hook === true);
    const { rows: settleAfterHook } = await client.query(
      `SELECT prosrc FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'private' AND p.proname = 'settle_if_needed'`
    );
    assert(!settleAfterHook[0].prosrc.includes("streamlink_after_materialize_hook"));
    record("local 040 inject is installed without rewriting production settle", true);

    const { rows: odds } = await client.query(
      `SELECT
         (private.capture_chance(1,'pokeball',null,0,1,false,false,false)->>'finalChance')::numeric AS poke,
         (private.capture_chance(1,'greatball',null,0,1,false,false,false)->>'finalChance')::numeric AS great,
         (private.capture_chance(1,'pokeball','berry',0,1,false,false,false)->>'finalChance')::numeric AS berry,
         (private.capture_chance(1,'pokeball',null,2,2,true,false,false)->>'finalChance')::numeric AS honey`
    );
    assert(Number(odds[0].great) > Number(odds[0].poke), "great ball should beat poke");
    assert(Number(odds[0].berry) > Number(odds[0].poke), "berry should raise odds");
    assert(Number(odds[0].honey) > Number(odds[0].poke), "honey should raise odds");
    record("capture_chance still applies ball/berry/honey multipliers", true, JSON.stringify(odds[0]));

    const offRound = "10000000-0000-0000-0000-000000000001";
    const oakBalls = (await inv(client, USER_OAK)).pokeball;
    const oakXp = await xp(client, USER_OAK);
    await openRound(client, offRound);
    await joinThrow(client, USER_OAK, offRound, "pokeball", "berry");
    const oakBerryAfterPrep = (await inv(client, USER_OAK)).berry;
    assert(oakBerryAfterPrep === 4, `berry spend at prepare ${oakBerryAfterPrep}`);
    const off = await settle(client, offRound);
    assert(off.resolved === true, JSON.stringify(off));
    const { rows: offCatch } = await client.query(
      `SELECT public_id, nature_id, content_build, ball, source_key, iv_hp FROM public.catches WHERE round_id = $1 AND user_id = $2`,
      [offRound, USER_OAK]
    );
    assert(offCatch.length === 1);
    assert(String(offCatch[0].public_id).startsWith("LG"));
    assert(offCatch[0].nature_id === null && offCatch[0].content_build === null);
    assert(offCatch[0].ball === "pokeball");
    assert(offCatch[0].source_key === `play:${offRound}:${USER_OAK}`);
    assert((await inv(client, USER_OAK)).pokeball === oakBalls - 1);
    assert((await xp(client, USER_OAK)) === oakXp + 10 + 50);
    const { rows: offPlayer } = await client.query(
      `SELECT result, caught FROM public.encounter_players WHERE round_id = $1 AND user_id = $2`,
      [offRound, USER_OAK]
    );
    assert(offPlayer[0].result === "Caught" && offPlayer[0].caught === true);
    record("switch-off settle matches legacy stamp path (LG, NULL GENVAL, spend+XP)", true, offCatch[0].public_id);

    await client.query("SELECT private.streamlink_wire_set_enabled(true)");
    const onRound = "10000000-0000-0000-0000-000000000002";
    const leafBalls = (await inv(client, USER_LEAF)).pokeball;
    const leafXp = await xp(client, USER_LEAF);
    await openRound(client, onRound, { outcome: "catch" });
    await joinThrow(client, USER_LEAF, onRound, "greatball");
    await settle(client, onRound);
    const { rows: onCatch } = await client.query(
      `SELECT public_id, nature_id, content_build, ability_slot, hp_max, friendship, ball
       FROM public.catches WHERE round_id = $1 AND user_id = $2`,
      [onRound, USER_LEAF]
    );
    assert(onCatch.length === 1);
    assert(String(onCatch[0].public_id).startsWith("SL"));
    assert(onCatch[0].nature_id >= 1 && onCatch[0].nature_id <= 25);
    assert(onCatch[0].content_build === CONTENT_BUILD);
    assert(["1", "2"].includes(onCatch[0].ability_slot));
    assert(onCatch[0].hp_max > 0 && onCatch[0].friendship === 50);
    assert(onCatch[0].ball === "greatball");
    assert((await inv(client, USER_LEAF)).pokeball === leafBalls);
    assert((await inv(client, USER_LEAF)).greatball === 3);
    assert((await xp(client, USER_LEAF)) === leafXp + 10 + 75);
    record("switch-on settle persists GENVAL + SL and still spends/rewards", true, onCatch[0].public_id);

    const escRound = "10000000-0000-0000-0000-000000000003";
    const blueBalls = (await inv(client, USER_BLUE)).pokeball;
    const blueXp = await xp(client, USER_BLUE);
    await openRound(client, escRound, { outcome: "escape" });
    await joinThrow(client, USER_BLUE, escRound);
    await settle(client, escRound);
    const { rows: escCatch } = await client.query(
      `SELECT count(*)::int AS n FROM public.catches WHERE round_id = $1`,
      [escRound]
    );
    assert(escCatch[0].n === 0);
    assert((await inv(client, USER_BLUE)).pokeball === blueBalls - 1);
    assert((await xp(client, USER_BLUE)) === blueXp + 10);
    const { rows: escPlayer } = await client.query(
      `SELECT result FROM public.encounter_players WHERE round_id = $1`,
      [escRound]
    );
    assert(escPlayer[0].result === "Escaped");
    record("escape still spends the ball, grants join XP only, writes Escaped", true);

    const leafXpAfterOn = await xp(client, USER_LEAF);
    const leafInvAfterOn = await inv(client, USER_LEAF);
    const replay = await settle(client, onRound);
    assert(replay.resolved === true);
    const { rows: replayN } = await client.query(
      `SELECT count(*)::int AS n FROM public.catches WHERE round_id = $1`,
      [onRound]
    );
    assert(replayN[0].n === 1);
    const { rows: replayPlayer } = await client.query(
      `SELECT result, caught FROM public.encounter_players WHERE round_id = $1 AND user_id = $2`,
      [onRound, USER_LEAF]
    );
    assert(replayPlayer[0].result === "Caught" && replayPlayer[0].caught === true);
    assert((await xp(client, USER_LEAF)) === leafXpAfterOn);
    assert((await inv(client, USER_LEAF)).greatball === leafInvAfterOn.greatball);
    record("duplicate settle is exactly-once with stable Caught + no extra XP/spend", true);

    const existRound = "10000000-0000-0000-0000-00000000000a";
    await openRound(client, existRound);
    await joinThrow(client, USER_BLUE, existRound);
    const blueXpPre = await xp(client, USER_BLUE);
    const blueBallsPre = (await inv(client, USER_BLUE)).pokeball;
    await client.query(
      `INSERT INTO public.catches (user_id, dex, name, variant, gender, ball, round_id, source_key, pokemon_form_id)
       VALUES ($1, 1, 'Bulbasaur', 'normal', 'Male', 'pokeball', $2, $3, 1)`,
      [USER_BLUE, existRound, `play:${existRound}:${USER_BLUE}`]
    );
    const blueXpAfterPre = await xp(client, USER_BLUE);
    assert(blueXpAfterPre > blueXpPre, "pre-insert must grant catch XP once");
    const exist = await settle(client, existRound);
    assert(exist.resolved === true);
    const { rows: existCatch } = await client.query(
      `SELECT count(*)::int AS n FROM public.catches WHERE round_id = $1 AND user_id = $2`,
      [existRound, USER_BLUE]
    );
    const { rows: existPlayer } = await client.query(
      `SELECT result, caught FROM public.encounter_players WHERE round_id = $1 AND user_id = $2`,
      [existRound, USER_BLUE]
    );
    assert(existCatch[0].n === 1);
    assert(existPlayer[0].result === "Caught" && existPlayer[0].caught === true);
    assert((await xp(client, USER_BLUE)) === blueXpAfterPre);
    assert((await inv(client, USER_BLUE)).pokeball === blueBallsPre - 1);
    record("pre-existing matching catch: Caught has a row, no duplicate XP", true);

    const collideRound = "10000000-0000-0000-0000-00000000000b";
    const collideKey = `play:${collideRound}:${USER_OAK}`;
    await client.query(
      `INSERT INTO public.catches (user_id, dex, name, variant, gender, ball, round_id, source_key, pokemon_form_id)
       VALUES ($1, 1, 'Bulbasaur', 'normal', 'Male', 'pokeball', 'ffffffff-ffff-ffff-ffff-ffffffffffff', $2, 1)`,
      [USER_OAK, collideKey]
    );
    const { rows: issuedCollide } = await client.query(
      `SELECT private.issue_streamlink_hidden_ticket(1, 'grant', $1, 3600) AS r`,
      [CONTENT_BUILD]
    );
    const collideTicket = issuedCollide[0].r.ticketId;
    const oakBeforeCollide = await inv(client, USER_OAK);
    const oakXpBeforeCollide = await xp(client, USER_OAK);
    await openRound(client, collideRound);
    await joinThrow(client, USER_OAK, collideRound);
    let collided = false;
    try {
      await settle(client, collideRound);
    } catch (error) {
      collided = /already-settled-without-catch/i.test(String(error.message || error));
      try { await client.query("ROLLBACK"); } catch (_) { /* ignore */ }
    }
    assert(collided, "source-key collision without matching catch must raise");
    const { rows: collideCatch } = await client.query(
      `SELECT count(*)::int AS n FROM public.catches WHERE round_id = $1`,
      [collideRound]
    );
    const { rows: collidePlayer } = await client.query(
      `SELECT result, caught FROM public.encounter_players WHERE round_id = $1 AND user_id = $2`,
      [collideRound, USER_OAK]
    );
    const { rows: collideRoundRow } = await client.query(
      `SELECT resolved FROM public.encounter_rounds WHERE id = $1`,
      [collideRound]
    );
    const { rows: collideTicketRow } = await client.query(
      `SELECT redeemed_at IS NOT NULL AS redeemed FROM private.streamlink_hidden_tickets WHERE ticket_id = $1`,
      [collideTicket]
    );
    assert(collideCatch[0].n === 0);
    assert(collidePlayer[0].result === null && collidePlayer[0].caught === null);
    assert(collideRoundRow[0].resolved === false);
    assert(collideTicketRow[0].redeemed === false);
    assert((await inv(client, USER_OAK)).pokeball === oakBeforeCollide.pokeball);
    assert((await xp(client, USER_OAK)) === oakXpBeforeCollide + 10);
    record("source-key conflict without a matching catch rolls back Caught/spend/ticket", true);

    const twoRound = "10000000-0000-0000-0000-000000000004";
    await openRound(client, twoRound);
    await joinThrow(client, USER_OAK, twoRound);
    await joinThrow(client, USER_LEAF, twoRound);
    clientB = cluster.getPgClient(DB_MAIN, HOST);
    await clientB.connect();
    await clientB.query("SET client_encoding TO 'UTF8'");
    const raced = await Promise.allSettled([
      settle(client, twoRound),
      settle(clientB, twoRound)
    ]);
    const { rows: racedRound } = await client.query(
      `SELECT resolved FROM public.encounter_rounds WHERE id = $1`,
      [twoRound]
    );
    assert(racedRound[0].resolved === true, JSON.stringify(raced));
    const { rows: twoN } = await client.query(
      `SELECT user_id, public_id, nature_id FROM public.catches WHERE round_id = $1 ORDER BY user_id`,
      [twoRound]
    );
    assert(twoN.length === 2, `expected 2 catches, got ${twoN.length}`);
    assert(twoN[0].nature_id !== twoN[1].nature_id || twoN[0].public_id !== twoN[1].public_id);
    record("concurrent settle of one round: one catch per trainer, no duplicates", true, twoN.map((r) => r.public_id).join(","));

    const failRound = "10000000-0000-0000-0000-000000000005";
    const oakBeforeFail = await inv(client, USER_OAK);
    const oakXpBeforeFail = await xp(client, USER_OAK);
    await openRound(client, failRound, { formId: 10195, dex: 1, outcome: "catch" });
    await joinThrow(client, USER_OAK, failRound);
    let failed = false;
    try {
      await settle(client, failRound);
    } catch (error) {
      failed = /wire-materialize-failed|g1-c1-blocked/i.test(String(error.message || error));
      try { await client.query("ROLLBACK"); } catch (_) { /* ignore */ }
    }
    assert(failed, "G1 persist must raise out of settle");
    const { rows: failCatch } = await client.query(
      `SELECT count(*)::int AS n FROM public.catches WHERE round_id = $1`,
      [failRound]
    );
    assert(failCatch[0].n === 0);
    assert((await inv(client, USER_OAK)).pokeball === oakBeforeFail.pokeball);
    assert((await xp(client, USER_OAK)) === oakXpBeforeFail + 10);
    record("unexpected persist failure rolls back ball spend and catch XP", true);

    const injectRound = "10000000-0000-0000-0000-000000000006";
    const leafBeforeInj = await inv(client, USER_LEAF);
    const leafXpBeforeInj = await xp(client, USER_LEAF);
    await openRound(client, injectRound);
    await joinThrow(client, USER_LEAF, injectRound);
    await client.query("SELECT set_config('starlight.wire_test_fail', 'after-materialize', false)");
    let injected = false;
    try {
      await settle(client, injectRound);
    } catch (error) {
      injected = /injected-after-materialize/i.test(String(error.message || error));
      try { await client.query("ROLLBACK"); } catch (_) { /* ignore */ }
    }
    await client.query("SELECT set_config('starlight.wire_test_fail', '', false)");
    assert(injected, "hook must fire");
    const { rows: injCatch } = await client.query(
      `SELECT count(*)::int AS n FROM public.catches WHERE round_id = $1`,
      [injectRound]
    );
    assert(injCatch[0].n === 0);
    assert((await inv(client, USER_LEAF)).greatball === leafBeforeInj.greatball);
    assert((await inv(client, USER_LEAF)).pokeball === leafBeforeInj.pokeball);
    assert((await xp(client, USER_LEAF)) === leafXpBeforeInj + 10);
    record("injected error after materialize rolls back catch, XP, and bag spend", true);

    const { rows: issued } = await client.query(
      `SELECT private.issue_streamlink_hidden_ticket(1, 'grant', $1, 3600) AS r`,
      [CONTENT_BUILD]
    );
    const ticketId = issued[0].r.ticketId;
    await client.query("SELECT set_config('starlight.wire_test_fail', 'after-materialize', false)");
    await client.query("BEGIN");
    let haRolled = false;
    try {
      await client.query(
        `SELECT private.materialize_streamlink_catch($1,1,12,'grant',$2,'poke',null,false,$3,$4,'normal',null,null) AS r`,
        [USER_BLUE, `grant:ha:${ticketId}`, CONTENT_BUILD, ticketId]
      );
      await client.query("COMMIT");
    } catch (error) {
      haRolled = /injected-after-materialize/i.test(String(error.message || error));
      try { await client.query("ROLLBACK"); } catch (_) { /* ignore */ }
    }
    await client.query("SELECT set_config('starlight.wire_test_fail', '', false)");
    assert(haRolled);
    const { rows: haTicket } = await client.query(
      `SELECT redeemed_at IS NOT NULL AS redeemed, specimen_id
       FROM private.streamlink_hidden_tickets WHERE ticket_id = $1`,
      [ticketId]
    );
    assert(haTicket[0].redeemed === false && haTicket[0].specimen_id === null);
    const { rows: haCatch } = await client.query(
      `SELECT count(*)::int AS n FROM public.catches WHERE source_key = $1`,
      [`grant:ha:${ticketId}`]
    );
    assert(haCatch[0].n === 0);
    record("failed HA persist leaves ticket unredeemed and grants no catch", true);

    const { rows: issued2 } = await client.query(
      `SELECT private.issue_streamlink_hidden_ticket(1, 'grant', $1, 3600) AS r`,
      [CONTENT_BUILD]
    );
    const t2 = issued2[0].r.ticketId;
    const { rows: haOk } = await client.query(
      `SELECT private.materialize_streamlink_catch($1,1,12,'grant',$2,'poke',null,false,$3,$4) AS r`,
      [USER_BLUE, `grant:ha-ok:${t2}`, CONTENT_BUILD, t2]
    );
    assert(haOk[0].r.ok === true);
    const { rows: bound } = await client.query(
      `SELECT specimen_id FROM private.streamlink_hidden_tickets WHERE ticket_id = $1`,
      [t2]
    );
    assert(bound[0].specimen_id === haOk[0].r.catchId);
    const { rows: replayHa } = await client.query(
      `SELECT private.materialize_streamlink_catch($1,1,12,'grant',$2,'poke',null,false,$3,$4) AS r`,
      [USER_BLUE, `grant:ha-replay:${t2}`, CONTENT_BUILD, t2]
    );
    assert(replayHa[0].r.ok === false && replayHa[0].r.errors.includes("hidden-ticket-replay"));
    const { rows: forged } = await client.query(
      `SELECT private.materialize_streamlink_catch($1,1,12,'grant','grant:forged','poke',null,false,$2,'00000000-0000-0000-0000-000000000099') AS r`,
      [USER_BLUE, CONTENT_BUILD]
    );
    assert(forged[0].r.ok === false);
    const { rows: wrongCtx } = await client.query(
      `SELECT private.issue_streamlink_hidden_ticket(1, 'event', $1, 3600) AS r`,
      [CONTENT_BUILD]
    );
    const tEvt = wrongCtx[0].r.ticketId;
    const { rows: mismatch } = await client.query(
      `SELECT private.materialize_streamlink_catch($1,1,12,'grant',$2,'poke',null,false,$3,$4) AS r`,
      [USER_BLUE, `grant:mismatch:${tEvt}`, CONTENT_BUILD, tEvt]
    );
    assert(mismatch[0].r.ok === false && mismatch[0].r.errors.includes("hidden-not-authorized"));
    record("HA bind is 1:1; replay/forged/wrong-ctx rejected", true, haOk[0].r.catchId);

    const { rows: src } = await client.query(
      `SELECT prosrc FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'private' AND p.proname = 'stamp_catch_row'`
    );
    assert(src[0].prosrc.includes("'LG' || lpad"));
    assert(!src[0].prosrc.includes("nature_id"));
    record("stamp_catch_row replica still null-only and unused as the writer", true);

    const failedRows = results.filter((row) => !row.passed);
    if (failedRows.length) throw new Error(`${failedRows.length} recorded failures`);
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
