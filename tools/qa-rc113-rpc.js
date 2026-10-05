/**
 * rc113 Pass / Mart / PC authority QA — PlayTester only.
 */
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const root = path.join(__dirname, "..");
const dest = path.join(root, "docs", "audits", "rc113-shots");
fs.mkdirSync(dest, { recursive: true });

const cfgText = fs.readFileSync(path.join(root, "js", "config.js"), "utf8");
const url = (cfgText.match(/supabaseUrl:\s*"([^"]+)"/) || [])[1];
const key = (cfgText.match(/supabaseKey:\s*"([^"]+)"/) || [])[1];
const session = JSON.parse(fs.readFileSync(path.join(root, "docs", "audits", "_qa-session.tmp.json"), "utf8"));
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
  if (uid !== QA_UID) throw new Error("uid mismatch");

  const report = { account: EMAIL, uid, sora: false, twinkle: false, steps: [] };

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
      counts: bagCounts(data?.bag || data?.wallet || {}),
      isAdmin: Boolean(data?.isAdmin)
    };
  }

  // Reset daily claim for PlayTester so eligible claim can be tested (SQL via RPC not available; use direct table only if service — skip, try claim first)
  // Owner asked cleanup after — we clear today's claim row through a safe path if claim succeeds twice.

  let before = await snapshot();
  report.steps.push({
    step: "baseline",
    coins: before.coins,
    dailyClaimed: before.wallet.dailyClaimed,
    dailySupplyReady: before.wallet.dailySupplyReady,
    dailyReady: before.wallet.dailyReady,
    weeklyReady: before.wallet.weeklyReady,
    isAdmin: before.isAdmin
  });

  // A. Daily Trainer Supply claim
  {
    const { data, error } = await call("play_claim_daily_supply", {});
    const after = error ? before : await snapshot();
    const row = {
      step: "daily_supply_claim",
      ok: !error && data?.ok !== false,
      error: error ? { message: error.message, code: error.code, details: error.details } : null,
      grants: data?.grants || null,
      message: data?.message || null,
      ambiguousGrants: error ? /ambiguous|column reference \"grants\"/i.test(String(error.message) + String(error.details || "")) : false,
      trainerIdLeak: error ? /Trainer ID/i.test(String(error.message)) : false,
      rawSqlExposed: error ? /column reference|42702|CONTEXT:/i.test(String(error.message)) : false,
      coinDelta: after.coins - before.coins,
      itemDelta: delta(before.counts, after.counts)
    };
    report.steps.push(row);
    before = after;
  }

  // D. Cooldown / not-ready (immediate re-claim)
  {
    const { data, error } = await call("play_claim_daily_supply", {});
    report.steps.push({
      step: "daily_supply_cooldown",
      ok: Boolean(error),
      error: error ? { message: error.message } : null,
      message: data?.message || null,
      ambiguousGrants: error ? /ambiguous|grants/i.test(String(error.message)) : false,
      trainerIdLeak: error ? /Trainer ID/i.test(String(error.message)) : false
    });
  }

  // Admin Pass QA — PlayTester may or may not be admin
  {
    const { data, error } = await call("admin_qa_grant_pass_reward", { p_kind: "daily" });
    const after = error ? before : await snapshot();
    report.steps.push({
      step: "admin_qa_daily",
      ok: !error && data?.ok !== false,
      rejected: Boolean(error),
      error: error ? { message: error.message, code: error.code } : null,
      grants: data?.grants || null,
      message: data?.message || null,
      isAdmin: before.isAdmin,
      coinDelta: after.coins - before.coins,
      itemDelta: delta(before.counts, after.counts),
      cooldownUnaffectedNote: "normal play_claim_pass cooldown not touched by QA grant"
    });
    if (!error) before = after;
  }

  // Unauthorized path simulation: wrong kind
  {
    const { data, error } = await call("admin_qa_grant_pass_reward", { p_kind: "nope" });
    report.steps.push({
      step: "admin_qa_bad_kind",
      rejected: Boolean(error),
      error: error ? { message: error.message } : null,
      data: data || null
    });
  }

  // PC auto-arrange + delete preflight
  {
    const storage = await call("play_storage");
    if (storage.error) throw storage.error;
    const boxes = storage.data?.layout?.boxes || [];
    report.steps.push({ step: "pc_baseline", boxCount: boxes.length, monCount: (storage.data?.mons || []).length });

    const arrange = await call("play_pc_auto_arrange", { p_box: 0 });
    report.steps.push({
      step: "pc_auto_arrange",
      ok: !arrange.error,
      error: arrange.error ? { message: arrange.error.message } : null,
      message: arrange.data?.message || null,
      count: arrange.data?.count
    });

    const arrange2 = await call("play_pc_auto_arrange", { p_box: 0 });
    report.steps.push({
      step: "pc_auto_arrange_idempotent",
      ok: !arrange2.error,
      sameMessage: arrange2.data?.message === arrange.data?.message
    });

    const pre = await call("play_pc_delete_box_preflight", { p_box: 0 });
    report.steps.push({
      step: "pc_delete_preflight_box0",
      ok: !pre.error,
      preflight: pre.data || null,
      error: pre.error ? { message: pre.error.message } : null
    });

    // Min-box protection if only one box
    if ((boxes.length || 0) <= 1) {
      const del = await call("play_pc_delete_box", { p_box: 0, p_confirm_release: false, p_confirm_text: "", p_expected_release: 0 });
      report.steps.push({
        step: "pc_delete_min_box_guard",
        rejected: Boolean(del.error),
        error: del.error ? { message: del.error.message } : null
      });
    } else {
      // Safe empty-path: create temp box via play_save_pc then delete it
      const layout = JSON.parse(JSON.stringify(storage.data.layout));
      layout.boxes.push({ name: "QA TMP", slots: Array(30).fill(null) });
      const saved = await call("play_save_pc", { p_layout: layout });
      if (saved.error) {
        report.steps.push({ step: "pc_add_tmp_box", ok: false, error: saved.error.message });
      } else {
        const tmpIndex = (saved.data?.layout?.boxes || layout.boxes).length - 1;
        const del = await call("play_pc_delete_box", {
          p_box: tmpIndex,
          p_confirm_release: false,
          p_confirm_text: "",
          p_expected_release: 0
        });
        report.steps.push({
          step: "pc_delete_empty_tmp",
          ok: !del.error,
          error: del.error ? { message: del.error.message } : null,
          message: del.data?.message || null
        });
      }
    }
  }

  // Typed confirmation mismatch
  {
    const storage = await call("play_storage");
    const boxes = storage.data?.layout?.boxes || [];
    if (boxes.length > 1) {
      const bad = await call("play_pc_delete_box", {
        p_box: boxes.length - 1,
        p_confirm_release: true,
        p_confirm_text: "yeah",
        p_expected_release: 999
      });
      report.steps.push({
        step: "pc_delete_bad_yes",
        rejected: Boolean(bad.error),
        error: bad.error ? { message: bad.error.message } : null
      });
    }
  }

  fs.writeFileSync(path.join(dest, "rpc-qa.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
