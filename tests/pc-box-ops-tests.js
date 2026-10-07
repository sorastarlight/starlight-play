/* node tests/pc-box-ops-tests.js */
const fs = require("fs");
const path = require("path");

const results = [];
function test(name, fn) {
  try {
    fn();
    results.push({ name, passed: true });
  } catch (error) {
    results.push({ name, passed: false, detail: error.message });
  }
}
function assert(cond, detail) {
  if (!cond) throw new Error(detail || "failed");
}

const root = path.join(__dirname, "..");
const storageJs = fs.readFileSync(path.join(root, "js", "storage.js"), "utf8");
const uxJs = fs.readFileSync(path.join(root, "js", "play-ux.js"), "utf8");
const presentJs = fs.readFileSync(path.join(root, "js", "play-present.js"), "utf8");
const sql = fs.readFileSync(path.join(root, "supabase", "migrations", "20261007140000_rc118_pc_box_ops_stale_slots.sql"), "utf8");

test("Move uses owned catch UUID, not box-slot index", () => {
  assert(/play_move_pc_mon/.test(storageJs));
  assert(/p_catch_id:\s*catchId/.test(storageJs), "client must send p_catch_id");
  assert(/p_to_box:\s*toBoxIndex/.test(storageJs), "client must send destination box index");
  assert(!/p_slot_id|p_box_slot/.test(storageJs), "must not send a box-slot UUID as the Pokémon");
});

test("Auto-Arrange uses current box index only", () => {
  assert(/play_pc_auto_arrange/.test(storageJs));
  assert(/p_box:\s*boxIndex/.test(storageJs));
});

test("RPC helper resolves live catches.id, not public_id", () => {
  assert(/private\.pc_live_catch_id/.test(sql));
  assert(/c\.id = slot_id/.test(sql));
  assert(/c\.transferred_at is null/.test(sql));
  assert(!/c\.public_id = slot_id/.test(sql));
});

test("Auto-Arrange skips stale slots instead of aborting the box", () => {
  const arrange = sql.split("play_pc_auto_arrange")[2] || sql;
  assert(/live_id := private\.pc_live_catch_id/.test(sql));
  assert(!/raise exception 'A box slot is not one of your Pokémon.'/.test(arrange), arrange.slice(0, 200));
  assert(/kept := kept \|\| live_id/.test(sql));
});

test("Auto-Arrange preserves relative order and current box only", () => {
  assert(/for j in 0 \.\. 29 loop/.test(sql));
  assert(/if i = dest then/.test(sql));
  assert(/jsonb_build_array\(box->'slots'->j\)/.test(sql), "other boxes copied as stored");
  assert(!/order by .*dex|order by .*name|order by .*level/i.test(sql));
});

test("Move rewrites storage of the same catch UUID", () => {
  assert(/p_catch_id uuid, p_to_box integer/.test(sql));
  assert(/jsonb_build_array\(p_catch_id\)/.test(sql));
  assert(/That Pokémon could not be moved/.test(sql));
});

test("Stale leftover slots do not abort Move", () => {
  const moveFn = sql.split("play_move_pc_mon")[2] || "";
  assert(!/raise exception 'A box slot is not one of your Pokémon.'/.test(moveFn));
  assert(/That storage slot is no longer available/.test(sql));
});

test("Client keeps selection on catch identity after arrange", () => {
  assert(/const keepId = selectedId/.test(storageJs));
  assert(/selectedId = String\(keepId\)/.test(storageJs));
});

test("Move stays on the source box and clears selection", () => {
  assert(/const sourceBox = boxIndex/.test(storageJs));
  assert(!/else if \(next\?\.moved\) boxIndex = toBoxIndex/.test(storageJs), "must not navigate to destination");
  assert(/boxIndex = Number\.isFinite\(Number\(opts\.stayOnBox\)\) \? Number\(opts\.stayOnBox\) : sourceBox/.test(storageJs));
  assert(/if \(next\?\.moved\) \{\s*selectedId = ""/.test(storageJs));
  assert(/emptyInspectOnce = true/.test(storageJs));
});

test("One failed box action uses a single error presenter", () => {
  assert(/boxOpBusy/.test(storageJs));
  assert(/presentBoxError/.test(storageJs));
  const arrangeCatch = storageJs.match(/async function runAutoArrange[\s\S]*?finally \{\s*boxOpBusy = false;/);
  assert(arrangeCatch, "auto-arrange single-flight");
  assert((arrangeCatch[0].match(/presentBoxError/g) || []).length === 1, "one error presentation for arrange");
  assert(/lastErrorKey/.test(presentJs));
  assert(/now - lastErrorAt < 1600/.test(presentJs));
});

test("Friendly PC errors do not expose SQL internals", () => {
  assert(/Your PC changed while this action was being completed/.test(uxJs));
  assert(/That Pokémon could not be moved/.test(uxJs));
  assert(/That storage slot is no longer available/.test(uxJs));
});

const failed = results.filter((row) => !row.passed);
if (failed.length) {
  failed.forEach((row) => console.error(`FAIL ${row.name}: ${row.detail}`));
  process.exit(1);
}
results.forEach((row) => console.log(`PASS ${row.name}`));
console.log(`${results.length} tests ok`);
