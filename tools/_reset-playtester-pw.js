const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const root = path.join(__dirname, "..");
const env = fs.readFileSync(path.join(root, ".env.local"), "utf8");
function get(k) {
  const m = env.match(new RegExp("^" + k + "=(.*)$", "m"));
  return m ? m[1].trim().replace(/^["']|["']$/g, "") : "";
}
const cfg = fs.readFileSync(path.join(root, "js", "config.js"), "utf8");
const pubUrl = (cfg.match(/supabaseUrl:\s*"([^"]+)"/) || [])[1];
const pubKey = (cfg.match(/supabaseKey:\s*"([^"]+)"/) || [])[1];
const url = get("SUPABASE_URL") || get("NEXT_PUBLIC_SUPABASE_URL") || pubUrl;
const service = get("SUPABASE_SERVICE_ROLE_KEY") || get("PLAY_SERVICE_ROLE_KEY");
if (!service) {
  console.error("missing service role");
  process.exit(1);
}
const sessionPath = path.join(root, "docs", "audits", "_qa-session.tmp.json");
const session = JSON.parse(fs.readFileSync(sessionPath, "utf8"));
if (!/playtester@/i.test(session.email)) {
  console.error("refusing non-playtester");
  process.exit(1);
}
const NEW = "QaRc113!" + Date.now().toString(36);

(async () => {
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await admin.auth.admin.updateUserById(session.user_id, { password: NEW });
  if (error) throw error;
  session.password = NEW;
  fs.writeFileSync(sessionPath, JSON.stringify(session, null, 2));
  const user = createClient(pubUrl, pubKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const sign = await user.auth.signInWithPassword({ email: session.email, password: NEW });
  if (sign.error) throw sign.error;
  console.log("playtester login ok", sign.data.user.id);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
