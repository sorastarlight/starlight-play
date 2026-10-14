/* node tests/admin-hub-overhaul-tests.js */
const fs = require("fs");
const path = require("path");
const trainers = require("../js/admin-next-trainers.js");

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
function read(rel) {
  return fs.readFileSync(path.join(__dirname, "..", rel), "utf8");
}

const nextHtml = read("admin-next.html");
const nextJs = read("js/admin-next.js");
const trainerJs = read("js/admin-next-trainers.js");
const fixtureHtml = read("admin-next-trainers-fixture.html");
const adminHtml = read("admin.html");
const liveJs = read("js/admin-live.js");
const commandCenter = read("STREAMLINK_CURSOR_COMMAND_CENTER.md");

test("Command center documents and project rule exist", () => {
  [
    "docs/project-command-center/README.md",
    "docs/project-command-center/ROADMAP.md",
    "docs/project-command-center/TASKS.md",
    "docs/project-command-center/TASKS.json",
    "docs/project-command-center/DECISIONS.md",
    "docs/project-command-center/RISKS.md",
    "docs/project-command-center/TEST-MATRIX.md",
    "docs/project-command-center/RUN-LOG.md",
    "docs/project-command-center/ADMIN-HUB-INVENTORY.md",
    "docs/project-command-center/ADMIN-HUB-IA.md",
    "docs/project-command-center/DESIGN-RESET-ISSUE-6.md",
    "docs/project-command-center/DESIGN-RESET-DECISION.md",
    "docs/project-command-center/design-reset/index.html",
    "docs/project-command-center/design-reset/proposal-a.html",
    "docs/project-command-center/design-reset/proposal-b.html",
    "docs/project-command-center/DESIGN-SPEC-ISSUE-7.md",
    "docs/project-command-center/design-reset/hub-a.html",
    "docs/project-command-center/VISUAL-STYLE-GUIDE-ISSUE-8.md",
    "docs/project-command-center/design-reset/hub-a-visual-v2.html",
    "docs/project-command-center/POKEMON-UX-ISSUE-9.md",
    "docs/project-command-center/design-reset/hub-a-visual-v3.html",
    "docs/project-command-center/TRAINER-UX-ISSUE-10.md",
    "docs/project-command-center/design-reset/hub-a-visual-v4.html",
    "docs/project-command-center/POKEMON-LEGALITY-AUDIT-ISSUE-16.md",
    "docs/project-command-center/GEN-IX-REBUILD-PLAN-ISSUE-19.md",
    "docs/project-command-center/GEN-IX-REF-ISSUE-20.md",
    "docs/project-command-center/GEN-IX-REF-READINESS-REVIEW.md",
    "docs/project-command-center/GEN-IX-SCHEMA-ISSUE-22.md",
    "docs/project-command-center/GEN-IX-SCHEMA-REHEARSAL.md",
    "docs/project-command-center/GEN-IX-PRODUCTION-PREFLIGHT.md",
    "docs/project-command-center/GEN-IX-APPLY-CHECKLIST.md",
    "docs/project-command-center/GEN-IX-APPLY-DECISION.md",
    "docs/project-command-center/GEN-IX-APPLY-HANDOFF.md",
    "docs/project-command-center/GEN-IX-APPLY-REPORT.md",
    "data/gen9-ref/meta.json",
    "supabase/unapplied/a19-ref/DO-NOT-APPLY.md",
    "supabase/unapplied/a19-ref-review/DO-NOT-APPLY.md",
    "supabase/unapplied/a19-schema/DO-NOT-APPLY.md",
    ".cursor/rules/streamlink-project.mdc"
  ].forEach((rel) => assert(fs.existsSync(path.join(__dirname, "..", rel)), rel));
  assert(commandCenter.includes("First execution boundary"));
});

test("Overview dossier no longer repeats ranking, coins, or Twitch", () => {
  const html = trainers.profileHtml(trainers.presentProfile({
    account: {
      user: { displayName: "Ash", login: "ash", emailLogin: false, role: "player" },
      bag: { coins: 99 },
      health: { primaryTwitch: "ash" },
      mons: [],
      candy: [],
      connections: []
    },
    identity: {
      ok: true,
      trainer: { level: 9, title: "Champ" },
      rankingVisible: true,
      rankingEligible: false,
      cosmetics: [],
      titles: [],
      badges: [],
      catalog: [],
      ownedAvatarPacks: []
    },
    pane: "overview"
  }));
  assert(html.includes("Account") && html.includes("Registration"));
  assert(html.includes("Password login present"));
  assert(html.includes("admin-next-dossier-jumps"));
  assert(!html.includes("Ranking visible"));
  assert(!html.includes("Primary Twitch"));
  assert(!html.includes("Champ"));
});

test("Progression remains the canonical ranking and cosmetic pane", () => {
  const html = trainers.profileHtml(trainers.presentProfile({
    account: { user: { displayName: "Ash" }, bag: {}, mons: [], candy: [], connections: [] },
    identity: {
      ok: true,
      trainer: { level: 9 },
      rankingVisible: true,
      rankingEligible: false,
      cosmetics: [{ id: "bg-kanto", name: "Kanto", kind: "background", unlocked: true }],
      titles: [],
      badges: [],
      catalog: [{ id: "bg-kanto", name: "Kanto", kind: "background" }],
      ownedAvatarPacks: []
    },
    pane: "progression"
  }));
  assert(html.includes("Ranking visible"));
  assert(html.includes("Available catalog"));
  assert(html.includes("Enabled catalog matches the unlock list above"));
});

test("Directory status and pager hide when a single page is shown", () => {
  const view = trainers.presentDirectory({
    data: { total: 2, offset: 0, users: [{ id: "a", displayName: "Ash", login: "ash" }, { id: "b", displayName: "Blue", login: "blue" }] }
  });
  assert(view.status === "2 trainers.");
  assert(view.showPager === false);
  const empty = trainers.presentDirectory({ data: { total: 0, offset: 0, users: [] }, query: "zzz" });
  assert(empty.empty && empty.status.includes("No trainers match"));
});

test("Overview omits username when it matches login", () => {
  const html = trainers.profileHtml(trainers.presentProfile({
    account: { user: { displayName: "Ash", login: "ash", username: "ash", emailLogin: false }, bag: {}, mons: [], candy: [], connections: [] },
    identity: { ok: true, trainer: {}, cosmetics: [], titles: [], badges: [], catalog: [], ownedAvatarPacks: [] },
    pane: "overview"
  }));
  assert(html.includes("Login"));
  assert(!html.includes("<dt>Username</dt>"));
});

test("Fixture stays local, blocks live RPCs, and exposes QA states", () => {
  assert(fixtureHtml.includes("LOCAL FIXTURE"));
  assert(fixtureHtml.includes("data-fixture-state=\"empty\""));
  assert(fixtureHtml.includes("data-fixture-state=\"denied\""));
  assert(fixtureHtml.includes("data-fixture-state=\"loading\""));
  assert(!fixtureHtml.includes("playCall("));
  assert(!fixtureHtml.includes("service_role"));
  assert(!fixtureHtml.includes("admin_overview"));
});

test("Support is the only next-hub grant doorway", () => {
  const trainersPanel = nextHtml.split('data-next-panel="trainers"')[1].split('data-next-panel="support"')[0];
  assert(!trainersPanel.includes('href="./admin.html?section=trainers"'));
  assert(trainersPanel.includes("section=support"));
  assert(nextHtml.includes("Canonical grants, coins, unlinks, and roles"));
  assert(nextHtml.includes("Canonical Oak QA"));
});

test("Dossier uses cards and container-based layout instead of overlapping columns", () => {
  const css = read("css/play.css");
  assert(css.includes("container-type: inline-size"));
  assert(css.includes("@container trainers"));
  assert(css.includes("overflow-wrap: anywhere"));
  const pokemon = trainers.profileHtml(trainers.presentProfile({
    account: {
      user: { displayName: "Ash" },
      bag: { coins: 4, pokeball: 1, used: 1, capacity: 20 },
      mons: [{ name: "Pikachu", dex: 25, variant: "Normal", level: 12, ball: "poke", caughtAt: "2026-01-01T00:00:00Z" }],
      candy: [],
      connections: [{ type: "twitch", login: "ash", displayName: "Ash", twitchUserId: "1" }]
    },
    identity: { ok: true, trainer: {}, cosmetics: [], titles: [], badges: [], catalog: [], ownedAvatarPacks: [] },
    pane: "pokemon"
  }));
  assert(pokemon.includes("admin-next-mon-card"));
  assert(!pokemon.includes("<table"));
  const connections = trainers.profileHtml(trainers.presentProfile({
    account: {
      user: { displayName: "Ash" },
      bag: {},
      mons: [],
      candy: [],
      connections: [{ type: "twitch", login: "ash", displayName: "Ash", twitchUserId: "1" }]
    },
    identity: { ok: true, trainer: {}, cosmetics: [], titles: [], badges: [], catalog: [], ownedAvatarPacks: [] },
    pane: "connections"
  }));
  assert(connections.includes("admin-next-link-card"));
  assert(!connections.includes("admin-next-ops-card"));
  const dirSplit = fixtureHtml.split('data-trainers-dir')[1].split("data-trainers-detail")[0];
  assert(!dirSplit.includes("data-fixture-state"));
  assert(fixtureHtml.includes("Fixture developer tools"));
});

test("Directory cards stay bounded and dossier sections use a stacked gap token", () => {
  const css = read("css/play.css");
  assert(css.includes("--admin-next-section-gap: 16px"));
  assert(css.includes("--admin-next-dir-card: 300px"));
  assert(css.includes("repeat(auto-fill, minmax(min(100%, 260px), var(--admin-next-dir-card)))"));
  assert(css.includes(".admin-next-dossier-stack"));
  const inventory = trainers.profileHtml(trainers.presentProfile({
    account: {
      user: { displayName: "Ash" },
      bag: { coins: 0, pokeball: 0, greatball: 0, ultraball: 0, masterball: 0, berry: 0, bait: 0, lure: 0, used: 0, capacity: 20 },
      candy: [],
      mons: [],
      connections: []
    },
    identity: { ok: true, trainer: {}, cosmetics: [], titles: [], badges: [], catalog: [], ownedAvatarPacks: [] },
    pane: "inventory"
  }));
  assert(inventory.includes("admin-next-dossier-stack"));
  assert(inventory.includes("Currency and bag"));
  assert(inventory.includes("Poké Balls"));
  assert(inventory.includes("Consumables"));
  assert(inventory.includes("Family candy"));
  assert(inventory.includes("admin-next-empty"));
  assert(inventory.includes("is-empty"));
  const progression = trainers.profileHtml(trainers.presentProfile({
    account: { user: { displayName: "Ash" }, bag: {}, mons: [], candy: [], connections: [] },
    identity: { ok: true, trainer: {}, cosmetics: [], titles: [], badges: [], catalog: [], ownedAvatarPacks: [] },
    pane: "progression"
  }));
  assert(progression.includes("admin-next-dossier-stack"));
  assert((progression.match(/admin-next-dossier-card/g) || []).length >= 5);
});

test("Preview still has no privileged writes and legacy entry points stay put", () => {
  [
    "admin_grant_pokemon",
    "admin_set_coins",
    "admin_set_role",
    "admin_overview",
    "admin_oak_qa",
    "evaluate_cosmetics"
  ].forEach((name) => assert(!nextJs.includes(name) && !trainerJs.includes(name), name));
  assert(adminHtml.includes("js/admin-live.js"));
  assert(liveJs.includes("admin_live_dashboard"));
  assert(fixtureHtml.includes("LOCAL FIXTURE"));
  assert(fixtureHtml.includes("127.0.0.1"));
  assert(!fixtureHtml.includes("service_role"));
});

test("Issue 6 wireframes exist and stay unwired", () => {
  const a = read("docs/project-command-center/design-reset/proposal-a.html");
  const b = read("docs/project-command-center/design-reset/proposal-b.html");
  const decision = read("docs/project-command-center/DESIGN-RESET-DECISION.md");
  ["playCall", "admin_overview", "service_role", "admin_grant_"].forEach((name) => {
    assert(!a.includes(name) && !b.includes(name), name);
  });
  assert(a.includes("Proposal A") && b.includes("Proposal B"));
  assert(a.includes("admin_list_users") && b.includes("p_query"));
  assert(decision.includes("A8") && decision.includes("NOT APPROVED"));
});

test("Issue 7 hub prototype stays unwired and records A8 without A9", () => {
  const hub = read("docs/project-command-center/design-reset/hub-a.html");
  const spec = read("docs/project-command-center/DESIGN-SPEC-ISSUE-7.md");
  const decisions = read("docs/project-command-center/DECISIONS.md");
  ["playCall", "admin_overview", "service_role", "admin_grant_"].forEach((name) => {
    assert(!hub.includes(name), name);
  });
  assert(hub.includes("Admin Hub") && hub.includes("All trainers") && hub.includes("Open Support with this trainer"));
  assert(spec.includes("A9") && spec.includes("admin-next.html"));
  assert(decisions.includes("APPROVED") && decisions.includes("A9"));
});

test("Issue 8 visual v2 stays unwired and keeps Proposal A IA", () => {
  const v2 = read("docs/project-command-center/design-reset/hub-a-visual-v2.html");
  const guide = read("docs/project-command-center/VISUAL-STYLE-GUIDE-ISSUE-8.md");
  const hub = read("docs/project-command-center/design-reset/hub-a.html");
  ["playCall", "admin_overview", "service_role", "admin_grant_"].forEach((name) => {
    assert(!v2.includes(name), name);
  });
  assert(v2.includes("All trainers") && v2.includes("Open Support with this trainer"));
  assert(v2.includes("Fredoka") && v2.includes("prefers-reduced-motion"));
  assert(guide.includes("Before / after") && guide.includes("D10"));
  assert(hub.includes("Proposal A hub prototype"));
});

test("Issue 9 Pokémon collection stays unwired and uses mons contract fields only", () => {
  const v3 = read("docs/project-command-center/design-reset/hub-a-visual-v3.html");
  const guide = read("docs/project-command-center/POKEMON-UX-ISSUE-9.md");
  const v2 = read("docs/project-command-center/design-reset/hub-a-visual-v2.html");
  ["playCall", "admin_overview", "service_role", "admin_grant_"].forEach((name) => {
    assert(!v3.includes(name), name);
  });
  assert(v3.includes("Back to Pokémon") && v3.includes("data-mon") && v3.includes("Newest 40"));
  assert(!v3.includes("Lv. 36 ·") && !v3.includes("playCall") && !v3.includes("admin_trainer_pc"));
  assert(guide.includes("mons[]") && guide.includes("D11"));
  assert(v2.includes("Proposal A · visual v2"));
});

test("Issue 10 trainer UX stays unwired and keeps Proposal A IA", () => {
  const v4 = read("docs/project-command-center/design-reset/hub-a-visual-v4.html");
  const guide = read("docs/project-command-center/TRAINER-UX-ISSUE-10.md");
  const v3 = read("docs/project-command-center/design-reset/hub-a-visual-v3.html");
  ["playCall", "admin_overview", "service_role", "admin_grant_"].forEach((name) => {
    assert(!v4.includes(name), name);
  });
  assert(v4.includes("official-artwork") && v4.includes("dir-hit") && v4.includes("btn-nav"));
  assert(v4.includes("All trainers") && v4.includes("Back to Pokémon") && v4.includes("Newest 40"));
  assert(!v4.includes('role="row"') && !v4.includes("admin_trainer_pc"));
  assert(guide.includes("D12") && guide.includes("playSpriteUrl"));
  assert(v3.includes("Proposal A · visual v3"));
});

test("Issue 12 trainer record IA stays unwired and keeps Proposal A layout", () => {
  const v5 = read("docs/project-command-center/design-reset/hub-a-visual-v5.html");
  const guide = read("docs/project-command-center/TRAINER-RECORD-ISSUE-12.md");
  const v4 = read("docs/project-command-center/design-reset/hub-a-visual-v4.html");
  ["playCall", "admin_overview", "service_role", "admin_grant_"].forEach((name) => {
    assert(!v5.includes(name), name);
  });
  assert(v5.includes("All trainers") && v5.includes("Open Support with this trainer"));
  assert(v5.includes("Starlight Pass") && v5.includes("Unlockables") && v5.includes("Storyboard only"));
  assert(v5.includes("loginEnabled") && v5.includes("no ticket RPC") && v5.includes("disabled"));
  assert(v5.includes("Newest 40") && v5.includes("no Pokédex overlay"));
  assert(!v5.includes('role="row"'));
  assert(guide.includes("D13") && guide.includes("newest 40") && guide.includes("Future scope"));
  assert(v4.includes("Proposal A · visual v4"));
});

test("Issue 16 legality audit stays design-only and does not claim PokéAPI legality", () => {
  const audit = read("docs/project-command-center/POKEMON-LEGALITY-AUDIT-ISSUE-16.md");
  const decisions = read("docs/project-command-center/DECISIONS.md");
  ["implemented & persisted", "only reference source", "absent", "cannot verify"].forEach((token) => {
    assert(audit.includes(token), token);
  });
  assert(audit.includes("LGPE"));
  assert(audit.includes("stamp_catch_row"));
  assert(audit.includes("pokeapi.co/docs/v2"));
  assert(audit.includes("never rewrite old IVs"));
  assert(audit.includes("A16d"));
  assert(audit.includes("DESIGN / SOURCE AUDIT ONLY"));
  assert(!audit.includes("PRODUCTION PASS"));
  assert(decisions.includes("D14") && decisions.includes("A16a"));
  assert(!nextHtml.includes("admin_catch_inspect"));
  assert(!nextJs.includes("admin_catch_inspect"));
});

test("Issue 19 Gen IX rebuild plan stays planning-only and records D17", () => {
  const plan = read("docs/project-command-center/GEN-IX-REBUILD-PLAN-ISSUE-19.md");
  const audit = read("docs/project-command-center/POKEMON-LEGALITY-AUDIT-ISSUE-16.md");
  const decisions = read("docs/project-command-center/DECISIONS.md");
  assert(plan.includes("scarlet-violet"));
  assert(plan.includes("streamlink-gen9-xgen"));
  assert(plan.includes("assert_streamlink_legal"));
  assert(plan.includes("A19-RESET-GO"));
  assert(plan.includes("BLOCKED") || plan.includes("blocked"));
  assert(plan.includes("does not persist"));
  assert(audit.includes("Errata") && audit.includes("does have Natures"));
  assert(decisions.includes("D17") && decisions.includes("D18") && decisions.includes("A19-REF"));
  assert(!plan.includes("PRODUCTION PASS"));
  assert(!nextHtml.includes("generate_streamlink_mon"));
  assert(!nextJs.includes("generate_streamlink_mon"));
});

test("Issue 20 Gen IX pin stays offline and unapplied", () => {
  const report = read("docs/project-command-center/GEN-IX-REF-ISSUE-20.md");
  const meta = read("data/gen9-ref/meta.json");
  const unapplied = read("supabase/unapplied/a19-ref/001_create_ref_tables.sql");
  const decisions = read("docs/project-command-center/DECISIONS.md");
  const migNames = fs.readdirSync(path.join(__dirname, "..", "supabase", "migrations")).join("\n");
  assert(report.includes("unresolved"));
  assert(report.includes("Gigantamax"));
  assert(meta.includes("227b573712414a86ba299d322fa398fbb2893edc"));
  assert(meta.includes("\"appliedToSupabase\": false"));
  assert(unapplied.includes("DO NOT RUN"));
  assert(!migNames.includes("a19-ref"));
  assert(decisions.includes("D20") && decisions.includes("D21"));
  assert(!nextJs.includes("generate_streamlink_mon"));
  assert(!liveJs.includes("generate_streamlink_mon"));
});

test("Issue 21 readiness review stays offline and does not authorize SCHEMA", () => {
  const report = read("docs/project-command-center/GEN-IX-REF-READINESS-REVIEW.md");
  const decisions = read("docs/project-command-center/DECISIONS.md");
  const proposed = read("supabase/unapplied/a19-ref-review/001_proposed_secure_ref_tables.sql");
  const migNames = fs.readdirSync(path.join(__dirname, "..", "supabase", "migrations")).join("\n");
  assert(report.includes("Gigantamax") && report.includes("10278"));
  assert(report.includes("A19-SCHEMA remains **UNAPPROVED**"));
  assert(decisions.includes("D22") && decisions.includes("D23"));
  assert(proposed.includes("DO NOT RUN") && /row level security/i.test(proposed));
  assert(!migNames.includes("a19-ref-review"));
  assert(!nextJs.includes("generate_streamlink_mon"));
  assert(!liveJs.includes("generate_streamlink_mon"));
});

test("Issue 22 schema artifacts stay unapplied and do not start GENVAL", () => {
  const report = read("docs/project-command-center/GEN-IX-SCHEMA-ISSUE-22.md");
  const decisions = read("docs/project-command-center/DECISIONS.md");
  const ddl = read("supabase/unapplied/a19-schema/001_private_ref_tables.sql");
  const catches = read("supabase/unapplied/a19-schema/002_catches_nullable_extensions.sql");
  const migNames = fs.readdirSync(path.join(__dirname, "..", "supabase", "migrations")).join("\n");
  assert(report.includes("private.ref_"));
  assert(report.includes("A19-GENVAL"));
  assert(decisions.includes("D25") && decisions.includes("D26"));
  assert(ddl.includes("private.ref_meta") && /REVOKE ALL/i.test(ddl));
  assert(catches.includes("ADD COLUMN IF NOT EXISTS nature_id"));
  assert(!catches.includes("UPDATE public.catches"));
  assert(!migNames.includes("a19-schema"));
  assert(!nextJs.includes("generate_streamlink_mon"));
  assert(!liveJs.includes("generate_streamlink_mon"));
});

test("Issue 23 rehearsal stays local and does not apply live SQL", () => {
  const report = read("docs/project-command-center/GEN-IX-SCHEMA-REHEARSAL.md");
  const decisions = read("docs/project-command-center/DECISIONS.md");
  const harness = read("tools/a19-schema-rehearsal.js");
  const baseline = read("supabase/unapplied/a19-schema/rehearsal/000_synthetic_baseline.sql");
  const migNames = fs.readdirSync(path.join(__dirname, "..", "supabase", "migrations")).join("\n");
  assert(report.includes("127.0.0.1"));
  assert(report.includes("17/17"));
  assert(decisions.includes("D27") && decisions.includes("D28"));
  assert(harness.includes("refusing hosted Supabase"));
  assert(/SYNTHETIC DATA ONLY/i.test(baseline));
  assert(!migNames.includes("a19-schema"));
  assert(!nextJs.includes("generate_streamlink_mon"));
  assert(!liveJs.includes("generate_streamlink_mon"));
});

test("Issue 24 preflight stays read-only and does not approve apply", () => {
  const report = read("docs/project-command-center/GEN-IX-PRODUCTION-PREFLIGHT.md");
  const decisions = read("docs/project-command-center/DECISIONS.md");
  const queries = read("supabase/unapplied/a19-schema/preflight/000_metadata_only.sql");
  const migNames = fs.readdirSync(path.join(__dirname, "..", "supabase", "migrations")).join("\n");
  assert(report.includes("LIVE CATALOG"));
  assert(report.includes("A19-APPLY remains **UNAPPROVED**"));
  assert(decisions.includes("D29") && decisions.includes("D30") && decisions.includes("D31") && decisions.includes("D32") && decisions.includes("D33") && decisions.includes("D34") && decisions.includes("D35"));
  assert(report.includes("PGRST106"));
  assert(read("docs/project-command-center/GEN-IX-APPLY-CHECKLIST.md").includes("A19-APPLY remains **UNAPPROVED**"));
  const decision = read("docs/project-command-center/GEN-IX-APPLY-DECISION.md");
  assert(decision.includes("**Verdict: UNAPPROVED.**"));
  assert(decision.includes("2026-10-14 07:44:26"));
  assert(decision.includes("A19-APPLY remains **UNAPPROVED**"));
  const handoff = read("docs/project-command-center/GEN-IX-APPLY-HANDOFF.md");
  assert(handoff.includes("**Verdict: BLOCKED.**"));
  assert(handoff.includes("A19-APPLY remains **UNAPPROVED**"));
  assert(/DO NOT RUN writes/i.test(queries));
  assert(!migNames.includes("a19-schema"));
  assert(!nextJs.includes("generate_streamlink_mon"));
  assert(!liveJs.includes("generate_streamlink_mon"));
});

test("Issue 24 D35 apply report records schema-only GO without starting GENVAL", () => {
  const report = read("docs/project-command-center/GEN-IX-APPLY-REPORT.md");
  const decisions = read("docs/project-command-center/DECISIONS.md");
  assert(report.includes("**Verdict: APPLIED.**"));
  assert(report.includes("001_private_ref_tables.sql"));
  assert(report.includes("002_catches_nullable_extensions.sql"));
  assert(report.includes("PGRST106"));
  assert(report.includes("sl-ref-20261013-227b573"));
  assert(decisions.includes("D35"));
  assert(/A19-GENVAL[\s\S]{0,200}UNAPPROVED/.test(decisions));
  assert(!report.includes("PRODUCTION PASS"));
});

const failed = results.filter((row) => !row.passed);
results.forEach((row) => {
  console.log(`${row.passed ? "PASS" : "FAIL"} ${row.name}${row.detail ? ` — ${row.detail}` : ""}`);
});
if (failed.length) {
  console.error(`\n${failed.length} failed`);
  process.exit(1);
}
console.log(`\n${results.length} passed`);
