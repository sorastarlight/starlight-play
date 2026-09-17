/* node tests/phase8-bits-tests.js */
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
function read(rel) {
  return fs.readFileSync(path.join(__dirname, "..", rel), "utf8");
}

const fulfill = read("supabase/migrations/20260917050000_phase8_bits_fulfillment.sql");
const ops = read("supabase/migrations/20260917051000_phase8_bits_ops.sql");
const drafts = read("supabase/migrations/20260917052000_phase8_bits_drafts_selftest.sql");
const eventsub = read("supabase/functions/twitch-eventsub/index.ts");
const store = read("js/store.js");
const overlay = read("js/overlay.js");
const present = read("js/play-present.js");
const studio = read("js/admin-studio.js");
const tools = read("js/admin-tools.js");
const admin = read("js/admin.js");

test("EventSub only fulfills Custom Power-Up redemptions", () => {
  assert(eventsub.includes("channel.custom_power_up_redemption.add"), "power-up subscription missing");
  assert(eventsub.includes("timingSafeEqual"), "HMAC compare missing");
  assert(eventsub.includes("sha256="), "Twitch signature missing");
  assert(eventsub.includes('subscription.type !== "channel.custom_power_up_redemption.add"'), "other EventSub types not ignored");
  assert(!/subscribe.*channel\.cheer/.test(eventsub), "channel.cheer should not be subscribed");
});

test("credit_bits_from_twitch is not browser-callable", () => {
  assert(fulfill.includes("revoke all on function public.credit_bits_from_twitch"), "revoke missing");
  assert(fulfill.includes("grant execute on function public.credit_bits_from_twitch") && fulfill.includes("service_role"), "service_role grant missing");
  assert(drafts.includes("has_function_privilege('anon'"), "anon privilege check missing");
  assert(drafts.includes("has_function_privilege('authenticated'"), "authenticated privilege check missing");
});

test("duplicate EventSub events cannot double-grant", () => {
  assert(fulfill.includes("on conflict (event_id) do nothing"), "event id idempotency missing");
  assert(fulfill.includes("'bits:' || p_event_id"), "grant idempotency missing");
  assert(fulfill.includes("'duplicate'"), "duplicate status missing");
});

test("unlinked support is queued, not granted to a lookalike", () => {
  assert(fulfill.includes("insert into private.bits_pending"), "pending queue missing");
  assert(fulfill.includes("status = 'pending'"), "pending status missing");
  assert(!/username.?match/i.test(fulfill), "insecure username matching");
  assert(ops.includes("flush_bits_pending"), "claim on link missing");
});

test("bot identities cannot receive player inventory", () => {
  assert(fulfill.includes("skipped_bot"), "bot skip missing");
  assert(fulfill.includes("find_trainer(ident, login, false)"), "bot lookup missing");
  assert(ops.includes("not c.gameplay_enabled"), "pending flush bot guard missing");
});

test("Bits products reject random rewards, Pokémon, Shinies, and Master Ball", () => {
  assert(fulfill.includes("Bits products cannot grant Pokémon"), "pokemon reject missing");
  assert(fulfill.includes("masterball"), "masterball reject missing");
  assert(fulfill.includes("odds|random|chance"), "odds reject missing");
  assert(ops.includes("Live Bits products need a Bits cost greater than 0"), "zero bits reject missing");
  assert(ops.includes("at least one Twitch Power-Up title"), "title require missing");
});

test("general cheers are not Store checkout", () => {
  assert(fulfill.includes("'general', true") || fulfill.includes("status = 'ignored'"), "unmatched ignore missing");
  assert(store.includes("general cheer is not a Mart checkout"), store);
  assert(store.includes("mode === \"bits\" ? \"\" : addButton"), "Bits Add button should be hidden");
});

test("admin retry reuses the original verified event", () => {
  assert(ops.includes("admin_bits_retry"), "retry RPC missing");
  assert(ops.includes("credit_bits_from_twitch(ev.event_id, ev.twitch_login, ev.title, ev.bits"), "retry must reuse original bits/title");
  assert(ops.includes("Already fulfilled. Retry will not grant again"), "fulfilled retry guard missing");
  assert(ops.includes("QA Bits events must use a qa- identity"), "QA identity guard missing");
});

test("Game Health and Studio expose Bits fulfillment", () => {
  assert(ops.includes("admin_bits_health"), "health RPC missing");
  assert(ops.includes("when last_at is null then 'UNKNOWN'"), "UNKNOWN distinct from BROKEN missing");
  assert(admin.includes("Bits / Support"), "Game Health card missing");
  assert(studio.includes("Bits products"), "studio Bits nav missing");
  assert(studio.includes("pack-bits-titles"), "Power-Up titles missing");
  assert(studio.includes("previewAlertHtml"), "stream preview missing");
  assert(tools.includes("admin_bits_retry"), "retry UI missing");
});

test("overlay supporter alerts never wait on Encounter", () => {
  assert(overlay.includes("showSupport(data && data.supportAlert, live)"), "overlay support missing");
  assert(overlay.includes("if (!alert || busy)"), "hide during encounter missing");
  assert(present.includes("support: 11"), "support rank missing");
  assert(present.includes("busy ? TIER.toast : TIER.card"), "encounter toast fallback missing");
  assert(present.includes("cue(\"support.thankyou\")"), "SFX hook missing");
});

test("draft packs stay unpublished", () => {
  assert(drafts.includes("status', 'draft'"), "draft status missing");
  assert(drafts.includes("bits-community"), "community draft missing");
  assert(drafts.includes("bits-evo"), "evo draft missing");
  assert(drafts.includes("draft packs are live"), "live-draft guard missing");
  assert(!/masterball/.test(drafts.split("phase8_bits_selftest")[0]), "draft catalog includes Master Ball");
});

test("Star Bits are not invented as a 1:1 Bits conversion", () => {
  assert(!/1 twitch bit = 1 star bit/i.test(fulfill + ops + store), "invented conversion");
  assert(!/star_bits/.test(fulfill + ops), "star_bits ledger should not exist in Phase 8");
});

const failed = results.filter((row) => !row.passed);
results.forEach((row) => {
  console.log(`${row.passed ? "PASS" : "FAIL"} ${row.name}${row.detail ? ` — ${row.detail}` : ""}`);
});
console.log(`${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
