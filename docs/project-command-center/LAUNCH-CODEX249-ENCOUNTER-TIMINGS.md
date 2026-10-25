# CODEX-249 — Audited encounter timing migration

Status: locally complete; guarded install and scoped publication next under the owner's full Admin Hub migration/go-live direction.

Game settings gains four existing timing controls with plain phase names and seconds. Saves are revision-checked and serialized on the settings row. A before/after audit is private. When a bridge is configured, the existing settings command is queued atomically; without one, Play saves normally. A queue error rolls back the whole save. No encounter is started. The old broad save route is retired.

The old save explicitly set Bits purchases off; a separate keep_bits_off trigger also enforces that existing policy. The new save writes only timing keys and leaves that policy intact. This migration does not authorize enabling Bits, issuing bridge credentials or changing any current setting. Bits/provider activation remains an important launch decision.

Validation:137 suites/build;11 PostgreSQL timing groups,2 observed concurrency cases and4 guarded rollback checks in isolated schema-only PostgreSQL17. Real recovered schema only;fictional users, no application/Auth data import and no production connection. Four rendered widths320/390/768/1024 fit. Native review/cancel retains draft; fictional connected receipt confirms one save. Existing production timing shapes passed a read-only compatibility check. No hosted timing RPC, stream command, encounter, grant, notice or protected-account action was invoked.

Recovery: supabase/unapplied/hub-encounter-timings/README.md. Exact source drift is refused. Rollback restores the old function, disables new browser APIs and retains audit/queued commands. It does not undo settings or commands and restores the old function's explicit Bits-off behavior; review that consequence before use.

Frontend scope:admin-next.html,css/admin-config.css,js/admin-next.js,js/admin-next-timings.js. Exact four-file rollback passes. Remaining migration:additional economy controls, Director/encounter tools, System/integrations and any old QA tools which remain relevant.
