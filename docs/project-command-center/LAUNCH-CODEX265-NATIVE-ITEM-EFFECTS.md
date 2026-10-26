# CODEX-265: Native Item effects

Items & Economy now has a compact searchable Poké Ball/berry library and a selected-item editor with Details and Capture effects tabs. It reads raw stored descriptions, rather than copying generated effect prose into the editable description as the old Studio did. Default shelf price/availability is clearly separated from individual product prices. No old-editor handoff or disclosure triangle is used.

Friendly condition controls cover target types, night hours, existing species ownership, early/late throw windows, Trainer levels, target gender, catch-rate/Speed thresholds, Moon Stone families and weight tiers. The highest matching weight tier wins; duplicate thresholds are refused. Inactive unsupported conditions can retain their current data but cannot be newly authored;this does not activate unavailable items or later-generation gameplay. Guaranteed-capture flags and enabled/release flags are not editable. Master Balls remain excluded from standard shelf sale.

Reviewed saves send changed fields,staff reason,exact revision and request reference. Server field/range checks, NOWAIT target locks, a global concurrent-edit refusal and immutable private receipts prevent stale/partial/duplicate edits. The old unreviewed item writer is retired. Existing capture computation, checkout and grant code remain unchanged.

Migration20261026043859 installed. Four exact source/ACL matches,seven unchanged controls,complete ball/berry row hashes unchanged;new audit RLS enabled,authenticated table read denied and0rows. No production item definition was edited. The former writer has no other database-function callers.

Validation:149 regression suites;feature31HTML510stamps;40 disconnected layouts across320/390/768/1024 for Details,review,types,weight tiers,Master Ball,berries,night,inactive condition,empty and error. Native keyboard tabs,field synchronization,before/after review,cancel focus,pending disable and late-save reset checked. Complete Hub loads the raw description through the actual adapter and a held read stays discarded after an ordinary-account switch. No authenticated hosted navigation or application call occurred.

Ten real schema-only PostgreSQL groups test raw READ ONLY loading,actual permissions,null-description preservation,revision/idempotency,canonical matching-type calculation,invalid/no-op/ambiguous-tier refusal,Master Ball restriction,berry storage,private audit,observed concurrent connection refusal and byte-exact guarded rollback. An initial local CASE-expression parse error and an incorrect fictional Master Ball starting-state assertion were corrected before installation. Isolated runtime stopped;original archive unchanged;no new export or production data import.

Fifty-two install/rollback files verified. Git recovery packet:supabase/unapplied/hub-item-definitions/ . Private proofs:C:/Users/FET/AppData/Local/PokemonStreamLink/security/codex265/ . Rollback retains every item/audit row and restores the old unaudited writer;it does not reverse deliberate staff item edits.

Publication pending:admin-next.html,js/admin-next.js,js/admin-item-definitions.js,css/admin-item-definitions.css only. APP20261008-rc133 unchanged. No real item edit,product save,purchase,grant,encounter,provider/credential action,protected-account mutation,destructive cleanup or final launch declaration.
