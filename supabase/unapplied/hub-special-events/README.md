# Native reviewed Special Events

Migrates existing Special Event draft/save/schedule/start/repeat/cancel/end behavior into reviewed,revision-pinned,one-use Hub actions. Existing staff permissions and canonical dispatch/generation remain. No destructive delete action is exposed. Installation creates no event,schedule,round,reward or job.

New private audit/receipt table has RLS and no browser privileges. Writer takes Director/ad/event locks,checks the expected event revision and recorded request,then delegates a private copy of the canonical dispatcher. Old public mutation route refuses;its read/preview compatibility remains. Only an unused private self-test references the old public writer inside the database.

Fixes the existing upsert's ambiguous local variable/column named presentation by renaming only that local variable and its references. Local tests reproduce original error42702. Random gender can clear the old preferred gender while retaining other presentation metadata. Forms use event eligibility/art readiness and the Kanto boundary. Scheduling requires a saved future start time. Current event limits remain1–12.

14 schema-only SQL groups with real role/form/upsert/schedule/cancel helpers,observed competing-connection NOWAIT refusal,read-only list execution and guarded rollback. Launch/repeat execution is explicitly a fictional boundary;no hosted generation/gameplay is certified.146 local regression suites and rendered state/keyboard/session checks accompany the frontend. Private evidence:C:/Users/FET/AppData/Local/PokemonStreamLink/security/codex262/ .

Rollback restores both old functions byte-exactly (including original CRLF source),revokes the new APIs and retains all event definitions,schedules and audits. It restores the old unaudited actions and the original edit ambiguity:security/function review is required before using it. E-string source encoding keeps the rollback file LF-only. No data reversal/cleanup is automatic.
