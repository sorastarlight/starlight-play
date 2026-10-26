# CODEX-258: Reviewed Staff access

Native Trainer record / Staff access replaces the unaudited old role setter. It shows the current role, allowed choices, before/after review, required reason and the latest 20 changes. Existing policy stays: owner can grant Admin; owner/Admin can grant Moderator or remove staff access; Admin may demote another Admin; self/owner changes are forbidden. Owner detection remains the confirmed Twitch/identity helper.

Installed migration20261026002948. All four source hashes and API/private-helper permissions match the tested candidates. Audit row count0; no production role change or authenticated application request performed. New private audit table has RLS/no browser privileges. Context revisions, a serialized writer, one-use receipts and fresh authority checks prevent stale reviewed writes and duplicate actions. Old setter now refuses with native workflow guidance.

Validation:142 regression suites/build;12 schema-only SQL groups using real role helpers;12 rendered owner/moderator/error states at320/390/768/1024;review/cancel restores keyboard focus;fictional save focuses confirmation. Original archived schema unchanged;local database stopped/deleted. Private packet/evidence:C:/Users/FET/AppData/Local/PokemonStreamLink/security/codex258/ . Git recovery packet:supabase/unapplied/hub-staff-access/ . Guarded rollback preserves every role and audit row;it restores the unaudited old setter and requires security review.

Published main b7193a0e / Pages40249712073 success;100 monitored and5 changed sources match. Exact five runtime files only. No owner notice, real role action, provider test, protected mutation, cleanup or APP stamp. Real staff acceptance is not claimed by local fixtures.
