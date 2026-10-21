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

## CODEX-40 dependency replacement phase — prepared October20 EDT

Owner explicitly requested replacing legacy dependencies and preparing cleanup, autonomously. Five-function guarded packet and exact rollback are in supabase/unapplied/legacy-retirement; current execution status will be recorded below. No blanket specimen deletion follows. Frontend removes obsolete Awakening column; IV/EV remain.

14 REAL LOCAL SQL checks pass, including actual catch/gift writer and before-write trigger with fictional generator/authorization stubs, WIRE stat preservation, missing pins, old rows unavailable, removal of legacy species table for formatter execution, source-drift rejection and exact five-function rollback.78 non-writing regression suites and31 HTML/423 reference build pass; APP unchanged. Hosted writes/gameplay were not used as tests.

Deeper aggregate audit:110 legacy specimens across3 owners,65 not transferred;55 Oak rows reference44 specimens;63 specimens have candy ledger references,30 evolution history,1 listing,1 favorite,1 showcase.46 provisional unreferenced rows are NOT a deletion allow-list. See CLEANUP_PLAN.md and read-only CLEANUP_REVIEW.sql. Managed backup availability unverified; no secret/profile dump committed. Habitat/level/gender remain required configuration; move fallback and WIRE-off legacy generation still need coordinated retirement before dropping old tables/columns.

## Dependency phase installed and verified

Migration20261021023001 (`retire_legacy_cp_av_runtime`) installed the reviewed five-function packet under the owner's current replacement instruction. Independent full specimen-table count/hash unchanged:117 /643c21b94d5a008b8f0584c1ef26468d. Five signatures/ACLs/security/search-path/volatility attributes unchanged and replacement hashes match manifest. QA Caterpie response has22/7/9/7/7/12,types[bug],no cp/avs fields. Actual authenticated EmailQA My PC reload shows BUG and correct stats; no management/gameplay control clicked. Screenshot task visualization emailqa-pc-legacy-retired.png.78 suites/build pass; Pages230cad9d succeeded. Advisor counts unchanged270/78/196/46/1; broader security notices remain open.

The directory named unapplied is historical packaging: INSTALL.sql is now applied and source guards prevent rerunning. ROLLBACK.sql is the tested body rollback for this phase, not specimen restoration. Evidence: legacy-retirement-hosted-verification.json. No stored Pokémon, profile, inventory or ledger data was changed by this DDL.

Recovery dashboard inspection:7 scheduled physical backups visible, latest October20,2026 07:44:37 UTC (03:44:37 EDT); PITR is not enabled (paid add-on offered). No restore/add-on clicked or spending incurred. This backup predates the evening QA catch and is not sufficient evidence for safe selective restore; local archive/restore rehearsal is still required.

Important cleanup scope finding:95 legacy specimens belong to1 protected-name-matching owner;15 to2 other owners. Protected identity match is an initial aggregate name check, not an authorization or complete identity audit. Owner direction is needed on whether to include these95 specimens in the destructive cleanup proposal. No deletion requested/executed yet. History must not be erased accidentally.
