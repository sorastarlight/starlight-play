# Encounter timing migration

Creates staff read/save functions with a reviewed timing revision, row serialization and private before/after audit. Saves only the four known timing fields. A linked stream PC receives the existing settings command in the same transaction; without a configured bridge, Play saves without queuing. Queue failure rolls the settings and audit back.

The existing Bits-off trigger is retained. This is not authority to enable Bits or start/cancel an encounter. The old save path is retired; it previously wrote Bits off explicitly and returned a broader gameplay snapshot.

INSTALL refuses source drift/conflicts. ROLLBACK verifies candidate function definitions, restores the old function and revokes new browser entry points. It retains audit and existing stream commands; it never reverses settings or cancels queued commands. Restoring the old function restores its old explicit Bits-off behavior; use rollback only after reviewing that consequence.

Local schema-only PostgreSQL17:11 timing groups,2 concurrency cases and4 rollback checks. Fictional users only; no production settings save or command queue is included in deployment verification. Existing live timing values passed a read-only compatibility check.
