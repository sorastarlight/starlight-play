# Task queue

Statuses: `todo` · `doing` · `done` · `blocked`. Machine copy: [TASKS.json](./TASKS.json).

| ID | Status | Scope | Deps | Approval | Next action |
|---|---|---|---|---|---|
| CODEX-11 | done | Owner-only masked account diagnostics in Connections | CODEX-10 | Owner confirmed proceeding | Recovery-email safeguards; real Auth inspection unverified |
| CODEX-10 | done | Isolated password recovery; accurate username guidance | CODEX-9 | Owner accepted proposal and proceeded | Owner-only masked diagnostics; real email QA pending |
| CODEX-9 | done | I13 recovery design; existing owner-disconnect guard repair; Support copy | CODEX-8 | Routine continuation; no new recovery capability | I14 design; review recovery proposal |
| CODEX-8 | done | Retire Trainer ID frames sitewide; disable frame catalog | CODEX-7 | Explicit owner removal request | Frames remain retired |
| CODEX-7 | done | Search remaining gift lists; explicit selection; empty results | CODEX-6 | Routine continuation authorized | Continue routine maintenance; actual grant unverified |
| CODEX-6 | done | Separate gift types; candy/ribbon art; candy/Oak audit | CODEX-5 | Explicit owner request | Visual direction accepted; actual grant unverified |
| CODEX-5 | done | Sprite picker/search/generations; accurate labels; visual confirmation with reason | CODEX-4 | Explicit owner UI request | Owner visual/function review |
| CODEX-4 | done | Trainer UI fixes; Pass monitoring/overrides/re-grants; audited gifts | CODEX-3 | Explicit owner feature request | Owner visual/function review; authenticated action unverified |
| CODEX-3 | done | Implement and publish owner-selected v5 Trainer record direction | CODEX-2 | Owner selected proposed layout | Visual/functional acceptance remains open; no database or write scope |
| CODEX-2 | done | Live guide review; restore Trainer dossier keyboard focus | CODEX-1 | Routine maintenance | Owner visual acceptance; authenticated staff not exercised |
| CODEX-1 | done | Codex runner trial; reconcile legacy static checks | Owner instruction | Routine maintenance authorized | Visual/interaction review of published guide and read-only hub; D86 remains unauthorized |
| CC-1 | done | Command center docs + `streamlink-project.mdc` | — | none | Maintain on each batch |
| CC-2 | done | Admin Hub inventory + IA | CC-1 | none | Owner reads A3 grant-canonical question |
| A | done | Gate 2A visual/UX: Find button, focus, directory rows | CC-2 | none | Owner visual A1 |
| B | done | Dossier: Overview = account only; other panes canonical | A | none | Owner visual A1 |
| C | done | Duplicate-action inventory; Support is preview doorway | CC-2 | **A3** for write consolidation | Do not implement writes |
| D | done | Trainers no longer deep-links grants; Support copy clarified | C | none | Owner visual A1 |
| E | done | `tests/admin-hub-overhaul-tests.js` + existing hub suites | A–D | none | Re-run after further UI edits |
| I2 | done | Issue #2 local visual QA + dossier polish | A–E | none | A1 still open |
| I3 | done | Issue #3 Trainer dossier redesign (container layout + cards) | I2 | none | Owner visual A1 still open |
| I4 | done | Issue #4 directory sizing + dossier section spacing | I3 | none | Owner visual A1 still open |
| I5 | done | Issue #5 Trainer Workspace 2.0 prototype (table + full-width profile) | I4 | none | Owner chooses direction; A1 still open |
| I6 | done | Issue #6 design reset: journeys, IA, two annotated wireframes, field map | I5 | **A8** | A8 approved Proposal A |
| I7 | done | Issue #7 integrated hub spec + static Proposal A prototype | I6 | **A9** to implement | Owner reviews spec; do not replace UI |
| I8 | done | Issue #8 visual refinement: StreamLink-polished comparison prototype | I7 | **A10** visual | Owner reviews v2; do not implement |
| I9 | done | Issue #9 Pokémon collection rows + read-only detail | I8 | **A10** visual | Owner reviews v3; do not implement |
| I10 | done | Issue #10 PNG art, raised nav, full-row directory | I9 | **A10** visual | Owner reviews v4; do not implement |
| I12 | done | Issue #12 trainer record IA v5 (header, Connections, Inventory, Unlockables, Tickets) | I10, epic #11 | **A10** visual | Owner reviews v5; do not implement |
| I16 | done | Issue #16 Pokémon legality source audit + editor design | epic #11 | superseded by D15–D17 | Historical snapshot; see #19 |
| I19 | done | Issue #19 Gen IX rebuild architecture + reset plan | epic #18, D17 | Superseded by #20 / D21; **A19-RESET-GO** to wipe | Plan remains architecture source |
| I20 | done | Issue #20 offline Gen IX reference pin + unapplied SQL | I19, D20 | **A19-SCHEMA** still blocked | Pin delivered unapplied |
| I21 | done | Issue #21 A19-REF readiness review (Gmax, Champions, friendship, SQL) | I20 | D24 accepted G1/C1/F1 | Historical review |
| I22 | done | Issue #22 A19-SCHEMA unapplied private.ref_* + catch extensions | I21, D25 | Historical; live apply is D35 | Historical artifacts |
| I23 | done | Issue #23 disposable local Postgres rehearsal of A19-SCHEMA | I22, D27 | Historical REAL SQL | Live apply later delivered as D35 |
| I24 | done | Issue #24 preflight + go/no-go handoff | I23, D29 | Historical D34 | Superseded by D35 apply |
| I24A | done | Issue #24 owner GO schema-only apply (`001` → seed `00`–`10` → `002`) | I24, D35 | **APPLIED** schema-only | Historical; spec is I25 / D36 |
| I25 | done | A19-GENVAL specification + offline synthetic test plan | I24A, D35 | Historical D36 | Superseded by I25A / D37 |
| I25A | done | A19-GENVAL branch-only SQL + local REAL SQL rehearsal | I25, D37 | Historical D37 | Superseded by I25B / D38 |
| I25B | done | A19-GENVAL security corrections (tickets, entropy, validator, moves) | I25A, D38 | Historical D38 | Superseded by I25C / D39 |
| I25C | done | A19-GENVAL specimen binding + additive production SQL + local fixtures | I25B, D39 | Historical D39 | Superseded by I25D / D40 |
| I25D | done | A19-GENVAL read-only production compatibility + GENVAL-APPLY checklist | I25C, D40 | Historical D40 | Superseded by I25E / D41 |
| I25E | done | A19-GENVAL recovery-runbook correction (no automatic restore) | I25D, D41 | Historical D41 | Superseded by I25F / D42 |
| I25F | done | GENVAL-APPLY gate check; incomplete template STOP | I25E, D42 | Historical D42 | Superseded by I25G / D43 apply |
| I25G | done | Owner GO applied hashed GENVAL `001`; reset packet unapplied | I25F, D43 | Historical D43 | Superseded by I25H / D44 |
| I25H | done | GENVAL reconciliation + WIRE plan + reset rehearsal spec | I25G, D44 | Historical D44 | Superseded by I25I / D45 |
| I25I | done | A19-WIRE persist SQL + local REAL SQL + local RESET-TEST | I25H, D45 | Historical D45 | Superseded by I25J / D46 |
| I25J | done | A19-WIRE settle integration + local REAL SQL | I25I, D46 | Historical D46 | Superseded by I25K / D47 |
| I25K | done | A19-WIRE production-parity + hook isolation | I25J, D47 | Historical D47 | Superseded by I25L / D48 |
| I25L | done | A19-WIRE-APPLY GO request (not authorization) | I25K, D48 | Historical D48 | Superseded by I25M / D49 |
| I25M | done | Owner GO applied hashed WIRE `001`→`002`→`003` | I25L, D49 | Historical D49 | Superseded by I25N / D50 |
| I25N | done | A19-WIRE-GO one-catch readiness (not authorization) | I25M, D50 | Historical D50 | Superseded by I25O / D51 |
| I25O | done | Recover PlayTester login path + propose WIRE-GO | I25N, D51 | Historical D51 | Superseded by I25P / D52 |
| I25P | done | Cursor browser E2E probe; gameplay not run | I25O, D52 | Historical D52 | Superseded by I25Q / D53 |
| I25Q | done | A19-WIRE-GO PlayTester Bulbasaur catch, then switch off | I25P, D53 | Catch kept; switch **false** | Superseded by I25R / D54 |
| I25R | done | D54 encounter economy branch fix + local REAL SQL | I25Q, D54 | Not applied | Superseded by I25S / D55 |
| I25S | done | D55 economy final review; safety-net kept | I25R, D55 | Not applied | Superseded by I25T / D56 |
| I25T | done | D55-ECONOMY-APPLY handoff; not a GO | I25S, D56 | Historical D56 | Superseded by I25U / D57 |
| I25U | done | Owner GO installed D55 spend rules | I25T, D57 | Installed | Superseded by I25V / D58 |
| I25V | done | D58 PlayTester live economy test | I25U, D58 | Catches kept; WIRE **false** | STOP. No further gameplay |
| I26 | done | D59 New Trainer onboarding | I25V, D59 | Branch only | Deploy still unauthorized |
| I27 | done | D63 onboarding verification and mastery schema audit | I26, D63 | Report only | Superseded by I28 |
| I28 | done | D64 mastery event ledger draft and local rehearsal | I27, D64 | Not applied | Superseded by I29 |
| I29 | done | D65 mastery cutoff, outbox, and rollback design | I28, D65 | Not applied | Superseded by I30 |
| I30 | done | D66 timestamp authority and outbox lifecycle | I29, D66 | Not applied | Superseded by I31 |
| I31 | done | D67 catch preservation and insert-clock safety | I30, D67 | Not applied | Superseded by I32 |
| I32 | done | D68 mastery install readiness review | I31, D68 | Not applied | Superseded by I33 |
| I33 | done | D69 mastery schema GO packet | I32, D69 | Not installed | Superseded by I34 |
| I34 | done | D70 mastery schema install | I33, D70 | Installed, inactive | Superseded by I35 |
| I35 | done | D71 mastery integration plan | I34, D71 | Inactive; plan only | Superseded by I36 |
| I36 | done | D72 familiarity settlement draft | I35, D72 | Unapplied | Superseded by I37 |
| I37 | done | D73 familiarity install readiness | I36, D73 | Packet only; not installed | Superseded by I38 |
| I38 | done | D74 familiarity integration install | I37, D74 | Installed, inactive | Superseded by I39 |
| I39 | done | D75 familiarity activation readiness | I38, D75 | Plan only; not activated | Superseded by I40 |
| I40 | done | D76 stamp-smoke readiness | I39, D76 | Packet only; QA unspecified | Superseded by I41 |
| I41 | done | D77 PlayerQA provisioning | I40, D77 | Blocked; account not created | Superseded by I42 |
| I42 | done | D77-R1 PlayerQA registration | I41, D77-R1 | Blocked; password channel missing | Superseded by I43 |
| I43 | done | D77-R2 PlayerQA verification | I42, D77-R2 | Verified; encounter not run | Superseded by I44 |
| I44 | done | D78 PlayerQA stamp smoke | I43, D78 | Blocked; public round is shared | Superseded by I45 |
| I45 | done | D79 QA encounter isolation | I44, D79 | No-go; selector is global | Superseded by I46 |
| I46 | done | D80 encounter safety review | I45, D80 | Review ready; nothing installed | Superseded by I47 |
| I47 | done | D81 launch-guard readiness | I46, D81 | Packet ready; not installed | Superseded by I48 |
| I48 | done | D82 launch-guard security gate | I47, D82 | Gate passed; install still needs a GO | Superseded by I49 |
| I49 | done | D83 launch-guard install | I48, D83 | Installed; no encounter | Superseded by I50 |
| I50 | done | D84 verification plan | I49, D84 | Plan only; stamp still blocked | Superseded by I51 |
| I51 | blocked | D85 local stamp rehearsal | I50, D85 | Stopped; debit and odds fingerprints drifted | STOP. Do not start D86 |
| HANDOFF-1 | done | Gemini planning handoff | I51 | Documentation only; development paused | Wait for an owner or Gemini task |
| I13 | done | Issue #13 owner account recovery design | epic #11 | security design | Design complete; see ACCOUNT-RECOVERY-ISSUE-13.md |
| I14 | todo | Issue #14 helpdesk architecture | epic #11 | architecture | Not started this batch |
| F | blocked | Privileged operations | A3, new owner prompt | **required** | Stop |

Branch: `admin-hub-overhaul`. D35 schema-only apply is live. D43 applied hashed GENVAL `001`. D49 applied hashed WIRE `001`→`002`→`003`. D53 ran one PlayTester Bulbasaur catch and turned the switch **false**. Catch kept. D58 ran three PlayTester encounters and turned WIRE **false**. D59 added a skippable Trainer guide on the branch only. D63 verified D59–D62 and audited mastery compatibility. D64 drafted an unapplied capture-event ledger and rehearsed it on local Postgres only. D65 added an inactive cutoff, an outbox, and local rollback checks. D66 checked the hosted timestamp catalog and drafted an insert clock plus outbox lifecycle. D67 drafted an unapplied stamp on the specimen so optional mastery bookkeeping cannot roll a catch back. D68 reviewed the 001–004 chain on local Postgres and left it unapplied. D69 prepared a read-only GO packet. D70 installed the four hashed files and left recording inactive. D71 verified that catalog and wrote an integration plan without connecting settlement. D72 drafted the note, lifecycle gate, and progress-view grant fix, and left them unapplied. D73 compared that draft with the live settle function and did not install it. D74 installed the three hashed files and left recording inactive. D75 wrote an activation plan and rehearsed it on local Postgres only. D76 prepared a stamp-smoke packet and did not run a hosted catch. D77 stopped before creating PlayerQA because email and password were not supplied. D77-R1 received the email and stopped because the password was not available through a secure channel. D77-R2 verified the owner-registered PlayerQA account and did not start an encounter. D78 stopped before a throw because a canonical round is public. D79 found that Play selects one global round and did not add a QA mechanism. D80 confirmed the launch-guard boolean misses an ordinary open round and left both fixes unapplied. D81 drafted the one-function replacement and did not install it. D82 checked grants and PostgREST exposure and did not install it. D83 installed the unchanged `round_is_active` replacement and did not open a round. D84 planned the next check and did not run it. D85 stopped before a local catch because the spend, announce, and capture-chance fingerprints no longer match the recorded ones. Gemini handoff documentation paused further RPG development. D86 is not authorized. Species Familiarity is not active. A19-RESET-GO remains **UNAPPROVED**. Pin `sl-ref-20261013-227b573`. No merge, deploy, or APP stamp. A8 + D10–D85. A10 visual still open. A9 still required before hub implementation. #13/#14/#15/#17 not started. A1 open. A7 not approved.

## COORD-1 — repository handoff setup (2026-10-18)

Done: owner-approved protocol, issue template, Cursor coordination rule and command-center links/tracking. Branch: admin-hub-overhaul; implementation commit: commit adding this entry (git history). STATIC validation only. No shared job posted, monitor enabled or Cursor run. Next: separate approval for monitoring/pilot. A later owner message authorized the unchanged launch-guard install, recorded as D83.
