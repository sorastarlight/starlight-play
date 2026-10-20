# D85 fingerprint reconciliation — CODEX-17

Verdict: **the three reported mismatches are different hash inputs, not evidence of changed function definitions.** Read-only live catalog inspection on2026-10-19 found that every historical “src_md5” exactly equals today's md5(pg_get_functiondef(oid)). D85 compared those values with md5(prosrc). Those quantities are different by definition.

| Function | Historical value = current full-definition MD5 | Current body MD5 |
|---|---|---|
| private.spend_bag_item(uuid,text) |5419a99d0c1735f44564b84338e32578|b30712a5a082f00ce45fd2c214e7029d|
| private.announce_throws(uuid) |0cd4a8e2a647ba388ce19b14b6f5a8c4|1145a36f2a1a2e93f9d99e91c4d24916|
| private.capture_chance(...) |8fa515e574a89165c0adf11339ed73ba|205d43359e90971f790816cf6e45c889|

The current body fingerprints also equal the “live” column in the original D85 report. No new drift was observed. The historical labels did not identify the hash input accurately. Preserve that original report as a record of the justified stop at the time; its apparent gameplay-definition mismatch is now explained.

## Source and provenance checks

- spend_bag_item and announce_throws bodies exactly match supabase/unapplied/d55-economy/001_spend_rules.sql after normalizing CRLF file newlines to LF. They also exactly match the stored statements of installed migration20261016042345 d55_economy_001_spend_rules. The historical directory name is not an assertion that this migration is still unapplied.
- capture_chance body exactly matches supabase/migrations/20260913033000_capture_service.sql after newline normalization. That version was not present under the same number in hosted migration history; provenance here is repository source plus the exact historical full-definition hash, not a claimed migration-history match.
- supabase/unapplied/a19-wire/local/030_settle_world.sql contains a deliberately simplified capture_chance fixture. It hardcodes basic ball modifiers and a honey curve rather than calling the production ball/berry/honey modifier helpers. It is **not** a production-equivalent odds implementation. Do not use it as the authoritative capture function in the future stamp rehearsal. Do not change that existing fixture merely to make a fingerprint pass.
- Snapshots: evidence/d85-current-function-catalog.json (full definitions, body/full MD5 and full SHA256) and evidence/d85-d55-installed-migration.json (installed D55 statements). No player rows, inventory, Auth credentials or tokens captured.

## Recommendation

Use the existing D55 spend/announce definitions and existing capture-service definition as the authoritative baseline for the next isolated D85 rehearsal. This is a recommendation to pin what is already installed and source-matched, **not** to replace production functions or silently change an approval baseline. Record body hashes and full-definition hashes in distinct, explicitly named fields. Newline normalization is for source-file comparison only; retain raw live hashes.

The unexplained fingerprint blocker is resolved. **The stamp rehearsal itself remains unperformed**, so D85 is not a gameplay/stamp pass. Next prepare/run the separately scoped disposable local rehearsal with production-equivalent helper dependencies. Do not advance D86, activate WIRE/Familiarity, open hosted encounters, issue throws, reset collections or stamp APP on the strength of this report. No new owner decision between competing function bodies is needed to explain these hashes; there are no competing bodies evidenced by this mismatch.

## Verification

node tools/d85-fingerprint-reconcile.js:3/3 definitions reconciled, including snapshot SHA256, explicit historical full-definition hashes, current body hashes, repository body equality and D55 installed-migration equality. This verifier reads checked-in snapshots only and never connects to a database. Re-running it does not refresh hosted evidence.

Live work consisted only of catalog/function-definition and migration-history SELECTs. No function under investigation was executed, no cluster started, no gameplay/data/schema write or email/spending occurred. Sora/Twinkle/PlayTester/PlayerQA unchanged. APP20261008-rc133 retained. Documentation and read-only verifier published through normal authorized GitHub workflow.
