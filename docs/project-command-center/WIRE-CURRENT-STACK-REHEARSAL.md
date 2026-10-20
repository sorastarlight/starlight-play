# Current-stack WIRE rehearsal — CODEX-30

2026-10-20. Owner requested autonomous continuation, with important decisions brought back for review. This batch implements the local follow-up from CODEX-29. It does not enable hosted WIRE.

## Result

**19/19 REAL LOCAL SQL checks passed** in disposable loopback PostgreSQL17.5.112 function bodies were hash-verified against current read-only hosted catalog captures. All six actual catch triggers ran. Nine used reference tables match hosted row counts and canonical content checksums (UTC timestamp serialization, C collation ordering).

Command: `node tools/wire-current-stack-rehearsal.js --local-only`.

Coverage: WIRE off/on; generated IV/EV/AV, nature, ordinary ability, HP/moves and OT/met metadata; insertion timestamp within settlement; both timestamp freezes; XP, candy, older mastery points and Pokédex notices; Familiarity queueing; replay; owned escape; free borrowed catch; concurrent settlement; rollback on failed persistence; safe local retry; queue-error isolation and idempotent explicit local note retry; disabling restores legacy writes without altering generated specimens. All seven final fictional catches had one pending outbox row, with no delivery attempts.

The concrete proposed activation transaction was exercised locally: a deliberately stale hash caused rollback without enabling; the valid transaction enabled the local switch; the existing setter disabled it again. A combined setter/readback expression initially observed its pre-write SQL snapshot and rejected locally; splitting the write and verification into separate statements corrected the proposal. No hosted operation used that proposal.

Process guards: no opt-in and hosted-environment URL both exit1 before starting a cluster. No current-stack cluster directories remain. Evidence is [result](evidence/wire-current-stack-result.json), [guards](evidence/wire-current-stack-guards.json), [catalog](evidence/wire-combined-catalog-20261020.json), [table metadata](evidence/wire-combined-tables-20261020.json), [reference checksums](evidence/wire-reference-checksums-20261020.json).

## Replica corrections and limits

Initial local setup failures were missing expression-index helper, JSON-array serialization, identity-column metadata and missing local role/ACL fixtures. Each was fixed in the replica; no hosted function body was changed. Reference checksum differences came from local timestamp time zone and collation, not changed move rows; canonical UTC/C serialization resolved them. These failed setup runs are not counted as successful checks.

This is a focused integration environment, not a full production clone. It includes catalog columns, defaults, identity columns, NOT NULL, non-FK constraints and indexes. Foreign keys, RLS, real authentication, nested triggers on other tables and the full production progression configuration are excluded. All actual catch triggers and their qualified-call function closure are present. The local TEST outcome fixtures deliberately force catch/escape with expired deadlines while rewardMode live allows the actual catch reward triggers; this does not establish natural odds or timing. Earlier D85 and historical D58 evidence cover their own narrower claims.

Familiarity note is best effort: a queue error intentionally does not abort a catch. Local explicit note retry was tested; no hosted reconciliation, delivery or scheduler was run or authorized. This milestone does not certify those later stages or the whole public release.

## Next important decision

I recommend **WIRE activation only**, after fresh read-only drift checks. This globally enables the existing Gen IX writer for future ordinary catches; it does not add later-generation species to encounters, alter old specimens, backfill missing stats or deliver Familiarity rewards. No new hosted encounter or QA account mutation is included.

The reviewable [activation proposal](evidence/wire-activation-proposal.sql) is NOT EXECUTED. It uses the existing setter, with no migration. It checks all112 captured function signatures/body hashes, client denial on the switch setter, all six enabled trigger definitions, an already-active Familiarity singleton, WIRE currently false and zero unresolved non-cancelled rounds. A short encounter-table share lock prevents a round from being inserted/updated during that transaction. Any mismatch/error aborts; do not retry blindly. Reference checksums and privileges must also be refreshed read-only immediately before an approved execution.

After an explicit owner decision: run the guarded activation once, independently verify enabled=true and unchanged Familiarity cutoff/lifecycle, record the result and stop. No automatic encounter, gameplay smoke, delivery, schedule, reset or stamp follows.

Rollback if needed is the existing `private.streamlink_wire_set_enabled(false)` with independent readback; it restores the legacy writer for future catches. It does not erase generated Pokémon or reverse recorded progress. No promise of trainer-only isolation is made: this is a global switch.

The last hosted read-only check at17:46:48Z found WIRE false, zero unresolved non-cancelled rounds and Familiarity active. That is a dated snapshot, not a permanent guarantee. Separate WIRE activation approval is required by CODEX-RUNNER.md's gameplay/database boundary and the owner's important-decision preference.

Sora mutated NO; Twinkle mutated NO; PlayTester/PlayerQA/EmailQA untouched. No real trainer rows read. No hosted write, schema/role change, gameplay RPC, spending or APP stamp. APP20261008-rc133; final release smoke paused.
