# Reviewed item definitions

Owner-authorized native Item effects editor for existing capture balls/berries. Read returns raw stored descriptions and current effects. Save accepts only typed fields, a revision, a reason and a one-use request reference; it locks the target, rejects concurrent/stale edits, and privately records before/after data. The old unaudited identity writer refuses. No item/specimen/inventory records change at installation.

Ten actual isolated PostgreSQL groups cover READ ONLY loading, real roles, raw-null preservation, canonical capture-condition calculations, invalid/no-op/ambiguous-tier rejection, exact replay, Master Ball shelf refusal, private audit, observed competing connection refusal and exact rollback. No hosted save or capture test.

Rollback guards all four definitions, restores the old writer byte-exactly, revokes the new APIs and retains all item/audit records. It does not undo deliberate staff item edits. The restored old writer is unaudited; review before use and coordinate frontend rollback.
