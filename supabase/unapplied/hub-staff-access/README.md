# Reviewed staff access

Preserves the existing Player / Moderator / Admin role rules. Only the confirmed stream owner can grant Admin; existing Admin demotion rights are unchanged. Self and owner changes are forbidden. No role assignments occur during installation.

New private audit table (RLS and no browser grants), exact actor/target/revision review, reason and one-use receipt. Missing role rows are serialized through the existing configuration row. Owner identity continues to use the existing confirmed Twitch/identity helper, not editable profile fields. Old unaudited setter is retired.

Local schema-only rehearsal: 12 SQL check groups with real role helpers, plus 142 regression suites and 12 rendered owner/moderator/error layouts. No imported application data or production role changes. Rollback checks all four source definitions, restores the old setter, revokes the new browser APIs and retains role/audit data. Restoring the old unaudited setter requires care. No automatic reversal of prior role changes.
