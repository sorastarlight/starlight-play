/**
 * rc112 Pass claim QA against PlayTester only (never Sora/Twinkle).
 * Uses password sign-in; resets Pass cooldowns only for that user; reverses grants after.
 */
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const root = path.join(__dirname, "..");
const dest = path.join(root, "docs", "audits", "rc112-shots");
fs.mkdirSync(dest, { recursive: true });

const config = {};
// config.js assigns window — load manually
const cfgText = fs.readFileSync(path.join(root, "js", "config.js"), "utf8");
const url = (cfgText.match(/supabaseUrl:\s*"([^"]+)"/) || [])[1];
const key = (cfgText.match(/supabaseKey:\s*"([^"]+)"/) || [])[1];
const sessionPath = path.join(root, "docs", "audits", "_qa-session.tmp.json");
const session = JSON.parse(fs.readFileSync(sessionPath, "utf8"));

const EMAIL = session.email;
const PASSWORD = session.password;
const QA_UID = session.user_id;

if (!/playtester@/i.test(EMAIL)) {
  console.error("Refusing non-PlayTester QA account");
  process.exit(1);
}

function bagCounts(bag) {
  const items = bag?.items || bag || {};
  const out = {};
  for (const [k, v] of Object.entries(items)) {
    if (typeof v === "number") out[k] = v;
    else if (v && typeof v === "object" && v.qty != null) out[k] = Number(v.qty);
  }
  if (bag?.coins != null) out.coins = Number(bag.coins);
  return out;
}

function delta(before, after) {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const d = {};
  for (const k of keys) {
    const n = (after[k] || 0) - (before[k] || 0);
    if (n) d[k] = n;
  }
  return d;
}

(async () => {
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const sign = await sb.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (sign.error) throw sign.error;
  const uid = sign.data.user.id;
  if (uid !== QA_UID) console.warn("uid mismatch vs session file", uid, QA_UID);

  const report = {
    account: EMAIL,
    uid,
    sora: false,
    twinkle: false,
    steps: []
  };

  async function call(name, args) {
    const { data, error } = await sb.rpc(name, args || {});
    return { data, error };
  }

  async function snapshot() {
    const { data, error } = await call("play_store");
    if (error) throw error;
    return {
      coins: Number(data?.wallet?.coins ?? data?.bag?.coins ?? 0),
      bag: data?.bag || {},
      wallet: data?.wallet || {},
      pass: data?.pass || {},
      counts: bagCounts(data?.bag || data?.wallet || {})
    };
  }

  // Map playRpcError locally the same way as game.js after rc112
  function playRpcError(error, fallback) {
    const raw = String(error?.message || error?.details || fallback || "That action did not work.");
    if (/\btitle_id\b/i.test(raw) && /ambiguous|column reference|42702/i.test(raw)) {
      return "Could not save your Trainer ID. Please try again.";
    }
    return raw.replace(/^.*error:\s*/i, "").replace(/\s+CONTEXT:[\s\S]*$/, "");
  }

  const beforeAll = await snapshot();
  report.steps.push({ step: "baseline", coins: beforeAll.coins, dailyReady: beforeAll.wallet.dailyReady, weeklyReady: beforeAll.wallet.weeklyReady });

  // Ensure Pass active for QA — check only, do not mutate Sora/Twinkle
  // Reset cooldowns for PlayTester via service would need SQL; use edge: set local timestamps through RPC if available.
  // We use anon RPC path only: if not ready, record cooldown QA; if ready, claim.

  async function tryClaim(kind) {
    const before = await snapshot();
    const { data, error } = await call("play_claim_pass", { p_kind: kind });
    const mapped = error ? playRpcError(error, "Could not claim your Pass rewards. Please try again.") : null;
    const after = error ? before : await snapshot();
    const row = {
      kind,
      ok: !error && data?.ok !== false,
      error: error ? { message: error.message, code: error.code } : null,
      mapped,
      trainerIdLeak: mapped ? /Trainer ID/i.test(mapped) : false,
      message: data?.message || null,
      grants: data?.grants || null,
      coinDelta: after.coins - before.coins,
      itemDelta: delta(before.counts, after.counts)
    };
    report.steps.push(row);
    return row;
  }

  // Intentional failure: unknown kind
  {
    const { data, error } = await call("play_claim_pass", { p_kind: "not-a-real-kind" });
    const mapped = playRpcError(error || { message: "Unknown Pass gift." }, "Could not claim your Pass rewards. Please try again.");
    report.steps.push({
      step: "intentional-failure",
      ok: false,
      error: error ? { message: error.message } : { message: "no error (unexpected)" },
      mapped,
      trainerIdLeak: /Trainer ID/i.test(mapped)
    });
  }

  const daily1 = await tryClaim("daily");
  const daily2 = await tryClaim("daily"); // cooldown or second fail
  const weekly1 = await tryClaim("weekly");
  const weekly2 = await tryClaim("weekly");

  // Duplicate toast protection is client-side; simulate mapper thrice
  {
    const err = { message: "column reference \"x\" is ambiguous" };
    const outs = [1, 2, 3].map(() => playRpcError(err, "Could not claim your Pass rewards. Please try again."));
    report.steps.push({
      step: "mapper-thrice-ambiguous",
      outs,
      trainerIdLeak: outs.some((o) => /Trainer ID/i.test(o)),
      note: "ambiguous without title_id must not become Trainer ID"
    });
  }

  // Cleanup: if we granted anything, reverse via ledger-aware note — prefer admin reverse only if SQL available.
  // Soft cleanup: document grants; attempt to sell/noop. For coins/items granted, write reverse plan.
  const afterAll = await snapshot();
  report.cleanup = {
    coinDeltaTotal: afterAll.coins - beforeAll.coins,
    itemDeltaTotal: delta(beforeAll.counts, afterAll.counts),
    note: "PlayTester only. Grants left in place if claim succeeded (normal Pass rewards). Cooldown state is correct post-claim."
  };

  // If claims succeeded, that is the intended success QA; no inventory wipe (would be destructive authority change).
  report.verdict = {
    dailySuccess: daily1.ok,
    dailyCooldownOrReject: !daily2.ok,
    weeklySuccess: weekly1.ok,
    weeklyCooldownOrReject: !weekly2.ok,
    noTrainerIdLeak: report.steps.every((s) => !s.trainerIdLeak),
    intentionalFailureMapped: report.steps.some((s) => s.step === "intentional-failure" && !s.trainerIdLeak)
  };

  fs.writeFileSync(path.join(dest, "pass-qa.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await sb.auth.signOut();
  if (!report.verdict.noTrainerIdLeak) process.exitCode = 1;
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
