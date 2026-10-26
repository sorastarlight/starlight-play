# Native Trainer styles

Owner-authorized Admin Hub migration. Adds a private change/receipt table, a private row projector and two staff-edit-only endpoints. Supports create-only registration from a registered Trainer image, bounded metadata edits and portrait assignment from registered portraits. New styles start hidden/unassigned. Collection membership, source sprite identity, sort, existing purchases and profiles are preserved. No existing writer or player endpoint is replaced.

Actor-scoped request receipts, current row revisions, staff reasons, NOWAIT row locks and request/style advisory locks protect edits. The change table has RLS and no browser/service table grants. Public handlers require the existing owner/admin permission helper and a real Auth user. Public execution is revoked; authenticated/service execution is explicit. Functions use empty search_path and qualified data references.

Eleven isolated PostgreSQL check groups pass, including actual role helpers, create/replay/duplicate refusal, image/path checks, metadata preservation, portrait bounds, private audits, concurrent row denial and guarded rollback. Rollback disables only the new handlers/helper; it retains every style, portrait and audit. Re-enabling requires a reviewed source/ACL check; do not rerun the create-table install.

The matching four-file frontend rollback restores the prior Hub. No agent style edit, upload, profile change or hosted application call was used for acceptance.
