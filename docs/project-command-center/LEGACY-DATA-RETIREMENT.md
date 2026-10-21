# CODEX-40 — Legacy model and data retirement

Owner requested October20,2026 EDT: remove legacy data unnecessary in the new system; old Let's Go/CP preservation is not a product requirement. This is a required pre-launch workstream, not permission to delete arbitrary records.

## Read-only hosted inventory

117 catch rows:110 have null ruleset/content-build and no stored HP/nature;7 use streamlink-gen9-xgen/sl-ref-20261013-227b573 with HP/nature present. Counts include all retained rows, not a claim of110 active owned specimens or safe-to-delete rows. No account identities exported. Old rows cannot become valid WIRE specimens simply by changing their ruleset label.

Current serializer still reads lgpe_species for types and legacy calculations/CP, including before its WIRE stat override. Staff renderer still exposes Awakening values. Both new catch and staff-gift writers still reference AV columns. stamp_catch_row and encounter/event/trade paths still use lgpe-named helpers for habitat, level bounds, gender and move fallback. These names alone do not establish obsolescence; preserve the underlying required game behavior while replacing its dependencies.

## Completed first cleanup

Removed unused window.playMonCp from js/game.js. Repository-wide caller search found only its own declaration; no current caller required it. This removes a browser-side CP formula and invented fallback values. No server payload, stored data or gameplay authority changed.

## Required sequence before launch

1. Finish dependency inventory: live function bodies, table/column/default/trigger/view/constraint dependencies, imports and all UI/payload consumers. Capture source hashes and aggregate specimen/ownership/listing/reference counts. Historical migrations/evidence stay intact as audit records.
2. Prepare and locally test one coherent removal packet: retire CP response generation and AV presentation/writes; source required types, gender, habitats, moves and level bounds from validated current references. Verify storage, gifts, trades, events and catch settlement without calling production gameplay. Remove dead current-runtime code, not historical evidence.
3. Prepare legacy-row disposition with exact aggregate affected counts and reference constraints. Default proposal is retire obsolete test specimens rather than invent missing WIRE stats; explicitly identify preservation requirements for ownership, economy, trade/audit history and Familiarity cutoff. Do not fabricate retrospective eligible catches or reset progression.
4. Produce a concrete transactional install and rollback/recovery plan, with backup availability checked. Obtain a narrow owner decision before irreversible deletion or broader specimen conversion. This is the important decision gate, not a repeated question about retaining CP.
5. Apply approved scope, verify surviving WIRE specimens and related records, then retire unused columns/tables/functions only after no callers remain and rollback requirements are satisfied. Recheck authenticated UI and relevant permissions.

Exit criterion: current runtime uses only the supported stat model; no obsolete CP/AV feature or unnecessary legacy records remain; any temporarily retained legacy dependency has a named removal task. Never DROP CASCADE as a shortcut. No deletion, conversion, table drop, protected-account mutation, gameplay, scheduler, reset or stamp occurred in CODEX-40.

Validation: STATIC source/caller audit; JS syntax check;61 focused checks passed (35 Play UX,19 presentation,7 WIRE source checks). Build passed31 HTML/423 references; APP20261008-rc133 unchanged. Read-only hosted inventory evidence: evidence/legacy-retirement-inventory.json. No gameplay RPC or hosted mutation test performed.
