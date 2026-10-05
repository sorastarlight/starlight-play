const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const root = path.join(__dirname, "..");
const cfg = fs.readFileSync(path.join(root, "js", "config.js"), "utf8");
const url = (cfg.match(/supabaseUrl:\s*"([^"]+)"/) || [])[1];
const key = (cfg.match(/supabaseKey:\s*"([^"]+)"/) || [])[1];
const s = JSON.parse(fs.readFileSync(path.join(root, "docs", "audits", "_qa-session.tmp.json"), "utf8"));
(async () => {
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  await sb.auth.signInWithPassword({ email: s.email, password: s.password });
  const store = await sb.rpc("play_store");
  const qa = await sb.rpc("admin_qa_grant_pass_reward", { p_kind: "daily" });
  const out = {
    isAdmin: Boolean(store.data?.isAdmin),
    unauthorized: Boolean(qa.error),
    error: qa.error?.message || null
  };
  fs.writeFileSync(path.join(root, "docs", "audits", "rc113-shots", "unauthorized-pass-qa.json"), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out));
})().catch((e) => { console.error(e); process.exit(1); });
