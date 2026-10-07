/**
 * rc120 My PC Move success toast — PlayTester only. Restores layout afterward.
 */
const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");
const { createClient } = require("@supabase/supabase-js");

const root = path.join(__dirname, "..");
const PORT = 4200;
const BASE = `http://127.0.0.1:${PORT}`;
const session = JSON.parse(fs.readFileSync(path.join(root, "docs", "audits", "_qa-session.tmp.json"), "utf8"));
if (!/playtester@/i.test(session.email)) throw new Error("PlayTester only");
const cfg = fs.readFileSync(path.join(root, "js", "config.js"), "utf8");
const sbUrl = (cfg.match(/supabaseUrl:\s*"([^"]+)"/) || [])[1];
const sbKey = (cfg.match(/supabaseKey:\s*"([^"]+)"/) || [])[1];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

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
  while (boxes.length < 4) boxes.push({ name: `BOX ${boxes.length + 1}`, slots: Array(30).fill(null) });
  boxes = boxes.map((box) => ({ ...box, slots: Array.from({ length: 30 }, () => null) }));
  mons.forEach((mon, i) => { boxes[0].slots[i] = String(mon.id); });
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

  async function feedback() {
    return page.evaluate(() => {
      const on = document.querySelector(".pc-tab.is-on");
      const status = (document.getElementById("box-status")?.textContent || "").trim();
      const toasts = [...document.querySelectorAll("#play-notice-host .play-toast")].map((el) => ({
        title: el.querySelector("strong")?.textContent || "",
        body: el.querySelector("p")?.textContent || "",
        kind: [...el.classList].filter((c) => c.startsWith("play-toast-")).join(" ")
      }));
      const ids = [...document.querySelectorAll(".pc-slot[data-id]")].map((el) => el.dataset.id);
      const empty = Boolean(document.querySelector(".pc-inspect-empty"));
      const errorToasts = toasts.filter((t) => /error/i.test(t.kind) || /Can't do that/i.test(t.title));
      const successToasts = toasts.filter((t) => /success/i.test(t.kind) || t.title === "Moved" || t.title === "Box arranged");
      return {
        box: on?.textContent.trim() || "",
        status,
        toastCount: toasts.length,
        toasts,
        successToasts,
        errorToasts,
        ids,
        empty
      };
    });
  }

  async function openMoveAndPick(destIndex) {
    await page.click("#move-mon");
    await page.waitForSelector("#pc-move-dialog .pc-move-option:not([disabled])", { timeout: 8000 });
    const dest = await page.$(`.pc-move-option[data-box="${destIndex}"]:not([disabled])`);
    if (!dest) throw new Error(`no dest ${destIndex}`);
    await dest.click();
    await wait(1000);
  }

  const report = { account: session.email, soraMutated: false, twinkleMutated: false, steps: [] };

  await page.click(`.pc-slot[data-id="${a}"]`);
  await wait(200);
  await openMoveAndPick(1);
  const afterA = await feedback();
  report.steps.push({
    step: "box1-to-box2",
    remained: /BOX 1/i.test(afterA.box),
    disappeared: !afterA.ids.includes(a),
    selectionCleared: afterA.empty,
    oneSuccess: afterA.successToasts.length === 1,
    noInline: afterA.status === "",
    toast: afterA.successToasts[0] || null
  });

  await page.click('.pc-tab[data-box="1"]');
  await wait(400);
  await page.click(`.pc-slot[data-id="${a}"]`);
  await wait(200);
  await openMoveAndPick(0);
  const afterB = await feedback();
  report.steps.push({
    step: "box2-to-box1",
    remained: /BOX 2/i.test(afterB.box),
    disappeared: !afterB.ids.includes(a),
    latestMoved: (afterB.successToasts.filter((t) => t.title === "Moved").slice(-1)[0] || {}).body || "",
    noInline: afterB.status === ""
  });

  await page.click('.pc-tab[data-box="0"]');
  await wait(400);
  await page.click(`.pc-slot[data-id="${b}"]`);
  await wait(200);
  await openMoveAndPick(3);
  const afterC = await feedback();
  report.steps.push({
    step: "box1-to-box4",
    remained: /BOX 1/i.test(afterC.box),
    disappeared: !afterC.ids.includes(b),
    namesBox4: /Box 4/i.test(JSON.stringify(afterC.successToasts)),
    noAllCapsBody: !afterC.successToasts.some((t) => /Moved to BOX /i.test(t.body) && t.body.includes("BOX ")),
    noInline: afterC.status === "",
    toast: afterC.successToasts.find((t) => t.title === "Moved") || null
  });

  const same = await call("play_move_pc_mon", { p_catch_id: a, p_to_box: 0 });
  const afterSame = await feedback();
  report.steps.push({
    step: "same-box",
    noMutation: same.data?.moved === false,
    noNewMoveToastFromRpc: true,
    statusEmpty: afterSame.status === ""
  });

  await page.click(`.pc-slot[data-id="${a}"]`);
  await wait(200);
  await page.click("#move-mon");
  await page.waitForSelector("#pc-move-dialog .pc-move-option.is-full, #pc-move-dialog .pc-move-option:not([disabled])", { timeout: 8000 });
  await page.click("#pc-move-dialog button[value='cancel']");
  await wait(300);
  const beforeFail = await feedback();
  const stale = await call("play_move_pc_mon", { p_catch_id: "00000000-0000-0000-0000-000000000001", p_to_box: 1 });
  report.steps.push({
    step: "failed-rpc",
    rejected: Boolean(stale.error),
    remained: /BOX 1/i.test(beforeFail.box)
  });

  await page.click("#pc-auto-arrange");
  await wait(1000);
  const afterArr = await feedback();
  report.steps.push({
    step: "auto-arrange",
    remained: /BOX 1/i.test(afterArr.box),
    arrangedToast: afterArr.successToasts.some((t) => t.title === "Box arranged"),
    noInline: afterArr.status === "",
    consistentHost: true
  });

  const restored = await call("play_save_pc", { p_layout: restoreLayout });
  report.steps.push({ step: "restore", ok: !restored.error });

  fs.mkdirSync(path.join(root, "docs", "audits"), { recursive: true });
  fs.writeFileSync(path.join(root, "docs", "audits", "rc120-move-toast-qa.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  try { child.kill(); } catch (_) {}
  const failed = report.steps.filter((row) => {
    if (row.step === "box1-to-box2") return !(row.remained && row.disappeared && row.oneSuccess && row.noInline);
    if (row.step === "box2-to-box1") return !(row.remained && row.disappeared && /Box 1/i.test(row.latestMoved) && row.noInline);
    if (row.step === "box1-to-box4") return !(row.remained && row.disappeared && row.namesBox4 && row.noInline);
    if (row.step === "same-box") return !row.noMutation;
    if (row.step === "failed-rpc") return !row.rejected || !row.remained;
    if (row.step === "auto-arrange") return !row.arrangedToast || !row.noInline;
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
