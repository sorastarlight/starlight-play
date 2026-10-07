/**
 * rc119 My PC move-stay UX — PlayTester only. Restores layout afterward.
 */
const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");
const { createClient } = require("@supabase/supabase-js");

const root = path.join(__dirname, "..");
const PORT = 4199;
const BASE = `http://127.0.0.1:${PORT}`;
const session = JSON.parse(fs.readFileSync(path.join(root, "docs", "audits", "_qa-session.tmp.json"), "utf8"));
if (!/playtester@/i.test(session.email)) throw new Error("PlayTester only");
const cfg = fs.readFileSync(path.join(root, "js", "config.js"), "utf8");
const sbUrl = (cfg.match(/supabaseUrl:\s*"([^"]+)"/) || [])[1];
const sbKey = (cfg.match(/supabaseKey:\s*"([^"]+)"/) || [])[1];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function filled(layout, i) {
  return (layout?.boxes?.[i]?.slots || []).filter(Boolean).length;
}
function hasId(layout, i, id) {
  return (layout?.boxes?.[i]?.slots || []).some((slot) => slot && String(slot) === String(id));
}

(async () => {
  const sb = createClient(sbUrl, sbKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const sign = await sb.auth.signInWithPassword({ email: session.email, password: session.password });
  if (sign.error) throw sign.error;
  async function call(name, args) {
    const { data, error } = await sb.rpc(name, args || {});
    return { data, error };
  }
  const baseline = await call("play_storage");
  if (baseline.error) throw baseline.error;
  const restoreLayout = JSON.parse(JSON.stringify(baseline.data.layout));
  const mons = baseline.data.mons || [];
  if (mons.length < 2) throw new Error("Need at least 2 Pokémon");
  const a = String(mons[0].id);
  const b = String(mons[1].id);
  let boxes = (restoreLayout.boxes || []).map((box) => ({
    name: String(box.name || "BOX").slice(0, 12),
    slots: Array.from({ length: 30 }, (_, i) => box.slots?.[i] || null)
  }));
  while (boxes.length < 3) boxes.push({ name: `BOX ${boxes.length + 1}`, slots: Array(30).fill(null) });
  boxes = boxes.map((box) => ({ ...box, slots: Array.from({ length: 30 }, () => null) }));
  mons.forEach((mon, i) => {
    boxes[0].slots[i] = String(mon.id);
  });
  const planted = await call("play_save_pc", { p_layout: { boxes } });
  if (planted.error) throw planted.error;

  const child = spawn(process.execPath, [
    path.join(root, "node_modules", "http-server", "bin", "http-server"),
    root, "-p", String(PORT), "-c-1", "--silent"
  ], { cwd: root, stdio: "ignore", windowsHide: true });
  for (let i = 0; i < 40; i++) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`${BASE}/storage.html`, (res) => { res.resume(); resolve(); });
        req.on("error", reject);
      });
      break;
    } catch (_) { await wait(250); }
  }

  const puppeteer = require("puppeteer");
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE}/storage.html`, { waitUntil: "domcontentloaded" });
  const storageKey = await page.evaluate(() => {
    const ref = String((window.PLAY_CONFIG || {}).supabaseUrl || "").split("//")[1]?.split(".")[0] || "supabase";
    return `sb-${ref}-auth-token`;
  });
  await page.evaluate((key, sess) => localStorage.setItem(key, JSON.stringify(sess)), storageKey, sign.data.session);
  await page.reload({ waitUntil: "networkidle2", timeout: 60000 });
  await page.waitForSelector(".pc-slot[data-id], #gate", { timeout: 20000 });
  await wait(800);

  async function view() {
    return page.evaluate(() => {
      const on = document.querySelector(".pc-tab.is-on");
      const tabs = [...document.querySelectorAll(".pc-tab[data-box]")].map((tab) => ({
        name: tab.textContent.trim(),
        on: tab.classList.contains("is-on"),
        cap: tab.getAttribute("data-capacity")
      }));
      const ids = [...document.querySelectorAll(".pc-slot[data-id]")].map((el) => el.dataset.id);
      const selected = document.querySelector(".pc-slot.is-selected")?.dataset.id || "";
      const empty = Boolean(document.querySelector(".pc-inspect-empty"));
      const dialog = Boolean(document.getElementById("pc-move-dialog"));
      return { box: on?.textContent.trim() || "", tabs, ids, selected, empty, dialog };
    });
  }

  async function openMoveAndPick(destIndex) {
    await page.click("#move-mon");
    await page.waitForSelector("#pc-move-dialog .pc-move-option:not([disabled])", { timeout: 8000 });
    const dest = await page.$(`.pc-move-option[data-box="${destIndex}"]:not([disabled])`);
    if (!dest) throw new Error(`no dest ${destIndex}`);
    await dest.click();
    await wait(900);
  }

  const report = { account: session.email, soraMutated: false, twinkleMutated: false, steps: [] };

  await page.click(`.pc-slot[data-id="${a}"]`);
  await wait(200);
  const beforeA = await view();
  await openMoveAndPick(1);
  const afterA = await view();
  const rpcA = await call("play_storage");
  report.steps.push({
    step: "box1-to-box2",
    remained: afterA.box === beforeA.box && /BOX 1/i.test(afterA.box),
    disappeared: !afterA.ids.includes(a),
    selectionCleared: afterA.empty === true && !afterA.selected,
    dialogClosed: afterA.dialog === false,
    counts: afterA.tabs.map((t) => t.cap),
    rpcDestHasA: hasId(rpcA.data.layout, 1, a),
    rpcSrcLacksA: !hasId(rpcA.data.layout, 0, a),
    box0: filled(rpcA.data.layout, 0),
    box1: filled(rpcA.data.layout, 1)
  });

  await page.click('.pc-tab[data-box="1"]');
  await wait(400);
  await page.click(`.pc-slot[data-id="${a}"]`);
  await wait(200);
  const beforeB = await view();
  await openMoveAndPick(0);
  const afterB = await view();
  const rpcB = await call("play_storage");
  report.steps.push({
    step: "box2-to-box1",
    remained: afterB.box === beforeB.box,
    disappeared: !afterB.ids.includes(a),
    selectionCleared: afterB.empty === true,
    rpcSrcLacksA: !hasId(rpcB.data.layout, 1, a),
    rpcDestHasA: hasId(rpcB.data.layout, 0, a)
  });

  await page.click('.pc-tab[data-box="0"]');
  await wait(400);
  await page.click(`.pc-slot[data-id="${b}"]`);
  await wait(200);
  const beforeC = await view();
  await openMoveAndPick(2);
  const afterC = await view();
  const rpcC = await call("play_storage");
  report.steps.push({
    step: "box1-to-box3",
    remained: /BOX 1/i.test(afterC.box) && afterC.box === beforeC.box,
    disappeared: !afterC.ids.includes(b),
    rpcDestHasB: hasId(rpcC.data.layout, 2, b)
  });

  const same = await call("play_move_pc_mon", { p_catch_id: a, p_to_box: 0 });
  report.steps.push({
    step: "same-box",
    noMutation: same.data?.moved === false,
    ok: !same.error
  });

  const stale = await call("play_move_pc_mon", { p_catch_id: "00000000-0000-0000-0000-000000000001", p_to_box: 1 });
  const afterStale = await view();
  report.steps.push({
    step: "invalid",
    rejected: Boolean(stale.error),
    remainedBox1: /BOX 1/i.test(afterStale.box)
  });

  await page.click('.pc-tab[data-box="0"]');
  await wait(300);
  const beforeArrange = await view();
  await page.click("#pc-auto-arrange");
  await wait(900);
  const afterArrange = await view();
  report.steps.push({
    step: "auto-arrange-after-move",
    remained: afterArrange.box === beforeArrange.box,
    stillBox1: /BOX 1/i.test(afterArrange.box)
  });

  const restored = await call("play_save_pc", { p_layout: restoreLayout });
  report.steps.push({ step: "restore", ok: !restored.error });

  fs.mkdirSync(path.join(root, "docs", "audits"), { recursive: true });
  fs.writeFileSync(path.join(root, "docs", "audits", "rc119-move-stay-qa.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  try { child.kill(); } catch (_) {}
  const failed = report.steps.filter((row) => {
    if (row.step === "box1-to-box2") return !(row.remained && row.disappeared && row.selectionCleared && row.rpcDestHasA && row.rpcSrcLacksA);
    if (row.step === "box2-to-box1") return !(row.remained && row.disappeared && row.rpcDestHasA);
    if (row.step === "box1-to-box3") return !(row.remained && row.disappeared && row.rpcDestHasB);
    if (row.step === "same-box") return !row.ok || !row.noMutation;
    if (row.step === "invalid") return !row.rejected || !row.remainedBox1;
    if (row.step === "auto-arrange-after-move") return !row.stillBox1;
    if (row.step === "restore") return !row.ok;
    return false;
  });
  if (failed.length) {
    console.error(JSON.stringify(failed, null, 2));
    process.exit(1);
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
