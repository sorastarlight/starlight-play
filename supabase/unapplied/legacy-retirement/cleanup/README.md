# CODEX-41 — Proposal only: all 110 legacy Pokémon

The owner approved including all 110 specimens in this proposal, including Sora's 95. **Execution is not authorized and neither SQL packet has been applied.** Do not infer permission from the enclosing dependency-removal migration, which is a separate completed operation.

## Exact proposed operation

- Match the full legacy specimen row-set hash, 110 rows, and current schema/trigger/runtime source fingerprint in `manifest.json`. Abort on drift; never regenerate the manifest silently at execution time.
- Archive all 110 complete specimen rows in two new restricted private archive tables. RLS is enabled and public/anon/authenticated privileges are revoked. No profile/specimen payload is exported to the repository.
- Archive and remove 55 Oak-transfer rows and the one **open** legacy trade listing before removing their referenced catches. This is explicit linked-data removal, not a cascade. Candy/evolution history remains in its current tables, with the archived specimen identities available for investigation.
- Save and clean the affected pointer fields on two profiles: ten legacy team slots, old UUIDs in PC box slots, and one showcase reference. Box positions/names and unrelated metadata are preserved. A removed JSON reference becomes null; team entries are removed. Existing `profiles.updated_at` behavior is retained.
- Remove exactly the archived 110 rows from active `public.catches`. Preserve all seven current WIRE specimens byte-for-byte, all inventories/balances/XP/ledgers, discovery, mastery, Familiarity activation/outbox, director configuration and non-pointer profile fields. No refunds, replacement Pokémon or retrospective progression.

The specimen row manifest and all linked-row hashes must still match immediately before execution. A new offer, direct trade, mastery event, queue/authority reference, unknown nested pointer, active round, unheld director, or concurrent data/schema change aborts the transaction. Locks have a five-second acquisition timeout; the packet has a 30-second statement timeout. No gameplay RPC, scheduling, build stamp, table drop or paid add-on is included.

## Recovery

`RESTORE.sql` verifies archive integrity and unchanged pointer fields, restores original IDs and complete row JSON, and restores the scoped profile pointers. It refuses to overwrite later pointer edits, conflicting IDs, changed sources, or a prior restoration. It temporarily disables only the six named catch triggers and one listing trigger inside the locked transaction, then restores their enabled state. Foreign keys and replication-role protections stay enabled. Catch timestamps, XP, discovery notices and Familiarity delivery must not be regenerated.

Both archive/removal and restoration are transactional. A simulated failure after catch insertion but before linked-row restoration was verified to roll the inserts and trigger-state changes back together. The archive remains private after successful restoration; no archive purge or retention scheduler is included. Recovery preserves exact specimen and linked-row JSON; profile `updated_at` is touched normally rather than backdated. This selective recovery is not a full database disaster-recovery test.

The dashboard showed seven physical daily backups, latest October 20, 2026 at 07:44:37 UTC / 03:44:37 EDT. That backup predates the evening QA catch. PITR was offered as a paid add-on and was not enabled. No restore, subscription or spending occurred during inspection.

## Validation and limits

19 REAL LOCAL SQL checks pass on isolated loopback PostgreSQL with fictional linked records, actual relevant column types, core foreign keys and actual relevant trigger bodies. Checks cover row/schema drift, active director/encounter, a competing offer, private archive permissions, pointer cleanup, retained history, exact selective restoration, tampering/replay rejection, mid-restore failure and competing-client locking. Full production constraints, all trigger dependencies, Auth/RLS sessions and all reference content are not cloned. Real XP/presentation/stamp bodies are intentionally prevented from firing during restore; protected-state hashes and exact restored rows are checked.

Reproduce locally: `node tools/legacy-cleanup-rehearsal.js`. Generate the reviewed packet from the recorded manifest: `node tools/prepare-legacy-cleanup.js`. `--preflight` prints a read-only inventory query; it does not connect or refresh the manifest itself. No execution helper or automation is provided.

The last runtime change passed 78 regression suites. This proposal changes tools, SQL and records only; syntax/build checks pass with APP `20261008-rc133` unchanged. See `docs/project-command-center/evidence/legacy-cleanup-local-result.json` and `legacy-cleanup-manifest.json`.

Remaining legacy learnset/fallback generation and AV-column/table retirement are separate tasks after the data disposition; this packet does not drop required game configuration or claim the complete legacy system is gone.
