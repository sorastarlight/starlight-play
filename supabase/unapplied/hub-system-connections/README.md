# System connections recovery

CODEX-250 migrates existing owner connection controls into the primary Admin Hub and adds a bounded staff status read. INSTALL guards the three original writer definitions and owner helpers. Channel patches use a revision and all writers serialize and recheck owner access after waiting. Saved secrets never return through the read API or private audit. The existing bridge-token issuer, Bits delivery and all permission helpers remain unchanged.

Local validation: 13 connection groups, two observed concurrency checks and four guarded rollback checks on the existing isolated schema-only PostgreSQL17 replay. No production data import or connection. All 139 regression suites and build pass. Composed local UI: 28 responsive owner/moderator/error states; entered-key clearing, owner-switch late response denial, masked one-time token clearing, and fictional Bits retry verification.

Rollback is source guarded. It restores the three original writer definitions and disables the two new browser APIs. It retains settings, credentials, token hashes and private audit; it does not restore previous credential values or undo operational changes. The old channel writer invokes the broad gameplay snapshot and old credential writers could acknowledge a missing storage row, so rollback requires reviewing those known limitations.

No actual channel/key save, bridge token rotation, provider call, Bits retry, grant or authenticated page navigation is part of installation/source verification. Production Bits purchases stay off.
