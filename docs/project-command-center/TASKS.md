# Task queue

Statuses: `todo` · `doing` · `done` · `blocked`. Machine copy: [TASKS.json](./TASKS.json).

| ID | Status | Scope | Deps | Approval | Next action |
|---|---|---|---|---|---|
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
| I30 | done | D66 timestamp authority and outbox lifecycle | I29, D66 | Not applied | STOP. Do not start D67 |
| I13 | todo | Issue #13 owner account recovery design | epic #11 | security design | Not started this batch |
| I14 | todo | Issue #14 helpdesk architecture | epic #11 | architecture | Not started this batch |
| F | blocked | Privileged operations | A3, new owner prompt | **required** | Stop |

Branch: `admin-hub-overhaul`. D35 schema-only apply is live. D43 applied hashed GENVAL `001`. D49 applied hashed WIRE `001`→`002`→`003`. D53 ran one PlayTester Bulbasaur catch and turned the switch **false**. Catch kept. D58 ran three PlayTester encounters and turned WIRE **false**. D59 added a skippable Trainer guide on the branch only. D63 verified D59–D62 and audited mastery compatibility. D64 drafted an unapplied capture-event ledger and rehearsed it on local Postgres only. D65 added an inactive cutoff, an outbox, and local rollback checks. D66 checked the hosted timestamp catalog and drafted an insert clock plus outbox lifecycle. Species Mastery is not live. A19-RESET-GO remains **UNAPPROVED**. Pin `sl-ref-20261013-227b573`. No merge, deploy, or APP stamp. A8 + D10–D66. A10 visual still open. A9 still required before hub implementation. #13/#14/#15/#17 not started. A1 open. A7 not approved.
