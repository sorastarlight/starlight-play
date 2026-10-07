/**
 * rc118 stale-slot QA — PlayTester only. Restores packed Box 1 afterward.
 */
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const root = path.join(__dirname, "..");
const cfgText = fs.readFileSync(path.join(root, "js", "config.js"), "utf8");
const url = (cfgText.match(/supabaseUrl:\s*"([^"]+)"/) || [])[1];
const key = (cfgText.match(/supabaseKey:\s*"([^"]+)"/) || [])[1];
const session = JSON.parse(fs.readFileSync(path.join(root, "docs", "audits", "_qa-session.tmp.json"), "utf8"));
if (!/playtester@/i.test(session.email)) process.exit(1);

const GHOST = "ffffffff-ffff-ffff-ffff-ffffffffffff";

(async () => {
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const sign = await sb.auth.signInWithPassword({ email: session.email, password: session.password });
  if (sign.error) throw sign.error;
  async function call(name, args) {
    const { data, error } = await sb.rpc(name, args || {});
    return { data, error };
  }
  const before = await call("play_storage");
  if (before.error) throw before.error;
  const hasGhost = JSON.stringify(before.data.layout).includes(GHOST);
  const arrange = await call("play_pc_auto_arrange", { p_box: 0 });
  if (arrange.error) throw new Error(`arrange failed: ${arrange.error.message}`);
  const box0 = (arrange.data.layout.boxes[0].slots || []).map((id) => id || null);
  const liveIds = (arrange.data.mons || []).map((row) => String(row.id));
  const box0Live = box0.filter(Boolean).map(String);
  const ghostGone0 = !JSON.stringify(box0).includes(GHOST);
  const mover = box0Live[0];
  const move = await call("play_move_pc_mon", { p_catch_id: mover, p_to_box: 1 });
  if (move.error) throw new Error(`move failed: ${move.error.message}`);
  const ghostAnywhere = JSON.stringify(move.data.layout).includes(GHOST);
  const destHas = (move.data.layout.boxes[1].slots || []).map(String).includes(mover);
  const srcHas = (move.data.layout.boxes[0].slots || []).map(String).includes(mover);
  const boxes = (move.data.layout.boxes || []).map((box, i) => ({
    name: box.name || `BOX ${i + 1}`,
    slots: Array.from({ length: 30 }, () => null)
  }));
  liveIds.forEach((id, i) => {
    boxes[0].slots[i] = id;
  });
  const restored = await call("play_save_pc", { p_layout: { boxes } });
  if (restored.error) throw restored.error;
  const report = {
    account: session.email,
    hasGhostBefore: hasGhost,
    arrangeOk: true,
    ghostGone0,
    liveCount: box0Live.length,
    moveOk: true,
    destHas,
    sourceCleared: !srcHas,
    ghostClearedByMove: !ghostAnywhere,
    restoredOk: true
  };
  fs.writeFileSync(path.join(root, "docs", "audits", "rc118-ghost-qa.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  if (!hasGhost || !ghostGone0 || !destHas || srcHas || ghostAnywhere) process.exit(1);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
