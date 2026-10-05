const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const root = path.join(__dirname, "..");
const cfg = fs.readFileSync(path.join(root, "js", "config.js"), "utf8");
const url = (cfg.match(/supabaseUrl:\s*"([^"]+)"/) || [])[1];
const key = (cfg.match(/supabaseKey:\s*"([^"]+)"/) || [])[1];
const session = JSON.parse(fs.readFileSync(path.join(root, "docs", "audits", "_qa-session.tmp.json"), "utf8"));
if (!/playtester@/i.test(session.email)) process.exit(1);

(async () => {
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const sign = await sb.auth.signInWithPassword({ email: session.email, password: session.password });
  if (sign.error) throw sign.error;

  async function call(name, args) {
    return sb.rpc(name, args || {});
  }

  const before = await call("play_store");
  const coinsBefore = Number(before.data?.wallet?.coins || 0);
  const daily = await call("admin_qa_grant_pass_reward", { p_kind: "daily" });
  const mid = await call("play_store");
  const weekly = await call("admin_qa_grant_pass_reward", { p_kind: "weekly" });
  const after = await call("play_store");
  const report = {
    isAdmin: Boolean(before.data?.isAdmin),
    daily: { ok: !daily.error, error: daily.error?.message, grants: daily.data?.grants, message: daily.data?.message },
    weekly: { ok: !weekly.error, error: weekly.error?.message, grants: weekly.data?.grants, message: weekly.data?.message },
    coinDelta: Number(after.data?.wallet?.coins || 0) - coinsBefore,
    passStill: after.data?.pass || null,
    cooldownDailyReady: after.data?.wallet?.dailyReady,
    cooldownWeeklyReady: after.data?.wallet?.weeklyReady
  };
  fs.writeFileSync(path.join(root, "docs", "audits", "rc113-shots", "admin-pass-qa.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
})().catch((e) => { console.error(e); process.exit(1); });
