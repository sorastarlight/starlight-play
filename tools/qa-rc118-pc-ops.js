/**
 * rc118 My PC box-ops QA — PlayTester only. Restores layout afterward.
 */
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const root = path.join(__dirname, "..");
const cfgText = fs.readFileSync(path.join(root, "js", "config.js"), "utf8");
const url = (cfgText.match(/supabaseUrl:\s*"([^"]+)"/) || [])[1];
const key = (cfgText.match(/supabaseKey:\s*"([^"]+)"/) || [])[1];
const session = JSON.parse(fs.readFileSync(path.join(root, "docs", "audits", "_qa-session.tmp.json"), "utf8"));
if (!/playtester@/i.test(session.email)) {
  console.error("Refusing non-PlayTester QA account");
  process.exit(1);
}

const BOX = 30;
const report = {
  account: session.email,
  uid: session.user_id,
  soraMutated: false,
  twinkleMutated: false,
  steps: []
};

function slotsOf(layout, index) {
  const box = layout?.boxes?.[index];
  const slots = Array.from({ length: BOX }, (_, i) => {
    const id = box?.slots?.[i];
    return id ? String(id) : null;
  });
  return slots;
}

function occupied(slots) {
  return slots.map((id, i) => (id ? { slot: i + 1, id } : null)).filter(Boolean);
}

function metaOf(mons, id) {
  const mon = (mons || []).find((row) => String(row.id) === String(id));
  if (!mon) return null;
  return {
    id: String(mon.id),
    dex: mon.dex,
    formId: mon.formId ?? mon.pokemon_form_id ?? null,
    shiny: Boolean(String(mon.variant || "").includes("shiny") || mon.shiny),
    gender: mon.gender || null,
    nickname: mon.nickname || null,
    level: mon.level,
    favorite: Boolean(mon.favorite),
    locked: Boolean(mon.locked),
    ball: mon.ball || null,
    ot: mon.ot || mon.originalTrainer || null
  };
}

(async () => {
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const sign = await sb.auth.signInWithPassword({ email: session.email, password: session.password });
  if (sign.error) throw sign.error;
  if (sign.data.user.id !== session.user_id) throw new Error("uid mismatch");

  async function call(name, args) {
    const { data, error } = await sb.rpc(name, args || {});
    return { data, error };
  }

  const baseline = await call("play_storage");
  if (baseline.error) throw baseline.error;
  const restoreLayout = JSON.parse(JSON.stringify(baseline.data.layout));
  const mons = baseline.data.mons || [];
  if (mons.length < 3) throw new Error("Play Tester needs at least 3 live Pokémon");
  const ids = mons.slice(0, 5).map((row) => String(row.id));
  const a = ids[0];
  const b = ids[1];
  const c = ids[2];
  const d = ids[3] || null;

  let boxes = Array.isArray(restoreLayout?.boxes) ? restoreLayout.boxes.map((box) => ({
    name: String(box.name || "BOX").slice(0, 12),
    slots: Array.from({ length: BOX }, (_, i) => box.slots?.[i] || null)
  })) : [];
  if (boxes.length < 2) {
    boxes.push({ name: `BOX ${boxes.length + 1}`, slots: Array(BOX).fill(null) });
  }
  boxes = boxes.map((box) => ({
    ...box,
    slots: Array.from({ length: BOX }, () => null)
  }));
  boxes[0].slots[0] = a;
  boxes[0].slots[2] = b;
  boxes[0].slots[4] = c;
  const overflow = boxes[2] || boxes[1];
  mons.forEach((mon) => {
    const id = String(mon.id);
    if (id === a || id === b || id === c) return;
    if (boxes.some((box) => (box.slots || []).includes(id))) return;
    const hole = overflow.slots.indexOf(null);
    if (hole >= 0) overflow.slots[hole] = id;
  });

  const planted = await call("play_save_pc", { p_layout: { boxes } });
  if (planted.error) throw planted.error;
  report.steps.push({
    step: "plant-holes",
    box0: occupied(slotsOf(planted.data.layout, 0)).slice(0, 5)
  });

  const beforeArrange = slotsOf(planted.data.layout, 0);
  const box1Before = slotsOf(planted.data.layout, 1);
  const arrange = await call("play_pc_auto_arrange", { p_box: 0 });
  if (arrange.error) throw arrange.error;
  const after1 = slotsOf(arrange.data.layout, 0);
  const box1AfterArrange = slotsOf(arrange.data.layout, 1);
  const compactOk = after1[0] === a && after1[1] === b && after1[2] === c;
  const identityOk = [a, b, c].every((id) => after1.includes(id));
  const box1Unchanged = JSON.stringify(box1Before) === JSON.stringify(box1AfterArrange);
  report.steps.push({
    step: "auto-arrange",
    before: occupied(beforeArrange).slice(0, 6),
    after: occupied(after1).slice(0, 6),
    compactOk,
    identityOk,
    currentBoxOnly: box1Unchanged,
    error: arrange.error || null
  });

  const arrange2 = await call("play_pc_auto_arrange", { p_box: 0 });
  if (arrange2.error) throw arrange2.error;
  const after2 = slotsOf(arrange2.data.layout, 0);
  report.steps.push({
    step: "auto-arrange-idempotent",
    ok: JSON.stringify(after1) === JSON.stringify(after2)
  });

  const emptyArrange = await call("play_pc_auto_arrange", { p_box: 1 });
  report.steps.push({
    step: "auto-arrange-other-box",
    ok: !emptyArrange.error,
    error: emptyArrange.error?.message || null
  });

  const beforeMoveMeta = metaOf(arrange2.data.mons, a);
  const move = await call("play_move_pc_mon", { p_catch_id: a, p_to_box: 1 });
  if (move.error) throw move.error;
  const srcAfter = slotsOf(move.data.layout, 0);
  const destAfter = slotsOf(move.data.layout, 1);
  const afterMoveMeta = metaOf(move.data.mons, a);
  report.steps.push({
    step: "move-box1",
    sameId: destAfter.includes(a) && !srcAfter.includes(a),
    destHasA: destAfter.includes(a),
    sourceCleared: !srcAfter.includes(a),
    metaUnchanged: JSON.stringify(beforeMoveMeta) === JSON.stringify(afterMoveMeta),
    beforeMeta: beforeMoveMeta,
    afterMeta: afterMoveMeta
  });

  const sameBox = await call("play_move_pc_mon", { p_catch_id: b, p_to_box: 0 });
  report.steps.push({
    step: "move-same-box",
    moved: sameBox.data?.moved === false,
    ok: !sameBox.error
  });

  const unauthorized = await call("play_move_pc_mon", {
    p_catch_id: "00000000-0000-0000-0000-000000000001",
    p_to_box: 1
  });
  report.steps.push({
    step: "unauthorized-move",
    rejected: Boolean(unauthorized.error),
    message: unauthorized.error?.message || null
  });

  const staleBox = await call("play_move_pc_mon", { p_catch_id: c, p_to_box: 99 });
  report.steps.push({
    step: "invalid-destination",
    rejected: Boolean(staleBox.error),
    message: staleBox.error?.message || null
  });

  const restored = await call("play_save_pc", { p_layout: restoreLayout });
  report.steps.push({
    step: "restore",
    ok: !restored.error,
    error: restored.error?.message || null
  });

  const out = path.join(root, "docs", "audits", "rc118-pc-ops-qa.json");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
  const failed = report.steps.filter((row) => {
    if (row.step === "auto-arrange") return !(row.compactOk && row.identityOk && row.currentBoxOnly);
    if (row.step === "auto-arrange-idempotent") return !row.ok;
    if (row.step === "auto-arrange-other-box") return !row.ok;
    if (row.step === "move-box1") return !(row.sameId && row.metaUnchanged);
    if (row.step === "move-same-box") return !row.ok;
    if (row.step === "unauthorized-move") return !row.rejected;
    if (row.step === "invalid-destination") return !row.rejected;
    if (row.step === "restore") return !row.ok;
    return false;
  });
  if (failed.length) {
    console.error(JSON.stringify({ failed, report }, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify(report, null, 2));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
