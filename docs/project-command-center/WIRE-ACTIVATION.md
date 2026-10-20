# WIRE activation — CODEX-31

2026-10-20. Owner explicitly answered **Approve WIRE activation only** to the published CODEX-30 proposal at commit e25a220d. Scope: enable the existing global switch for future catches, verify, record and stop.

**WIRE enabled at2026-10-20T18:11:02.180774+00:00 (2:11 PM EDT).** Independent verification at18:11:12Z confirmed enabled=true and the same updated_at. Familiarity remains active with its unchanged cutoff2026-10-20T16:55:59.896904+00:00 and unchanged full singleton state. Zero unresolved non-cancelled encounters were observed before and after.

Before execution, read-only checks confirmed all nine used reference-table checksums and row counts still matched the tested baseline; anon/authenticated direct EXECUTE remained denied for the setter, generator, persist and materialize. The guarded transaction checked all112 captured function signatures/body hashes, all six enabled catch-trigger definitions, WIRE false, active Familiarity and no unresolved encounters. It held a short encounter-table share lock and the switch row lock, called the existing setter exactly once, verified true and unchanged Familiarity, then committed. No retry was performed.

Evidence: [executed transaction](evidence/wire-activation-executed.sql) and [preflight, commit and independent verification](evidence/wire-activation-result.json). The executed transaction retains its original proposal comment header as an archival byte-for-byte copy; the actual execution status is recorded here and in the result JSON. Do not rerun it. [Combined local evidence](WIRE-CURRENT-STACK-REHEARSAL.md) remains19 SQL checks, not a new live catch validation.

The global switch now selects the existing Gen IX generator/writer for future ordinary catches. Existing specimens were not selected, edited or backfilled. This does not introduce later-generation species or activate Familiarity delivery. Disabling via the existing setter can restore legacy writes for future catches; it does not erase already generated specimens or reverse progress.

No encounter, throw, catch insertion, reconciliation, delivery, scheduling, schema/role/grant change, collection reset, spending, protected-account mutation or APP stamp. Sora mutated NO; Twinkle mutated NO; PlayTester/PlayerQA/EmailQA untouched. No real trainer records read. APP20261008-rc133; final release smoke remains paused. No new live gameplay result is claimed. Operator stopped after verification and audit publication as approved.
