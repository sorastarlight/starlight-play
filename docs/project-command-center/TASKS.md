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
| I25 | done | A19-GENVAL specification + offline synthetic test plan | I24A, D35 | Planning only; **UNAPPROVED** to implement | STOP. Need explicit A19-GENVAL go |
| I13 | todo | Issue #13 owner account recovery design | epic #11 | security design | Not started this batch |
| I14 | todo | Issue #14 helpdesk architecture | epic #11 | architecture | Not started this batch |
| F | blocked | Privileged operations | A3, new owner prompt | **required** | Stop |

Branch: `admin-hub-overhaul`. D35 schema-only apply is live. D36 A19-GENVAL **spec** delivered; implementation **UNAPPROVED**. Pin `sl-ref-20261013-227b573`. `stamp_catch_row` still active. No live Pokémon, wipe, or `admin-next.html` changes. A8 + D10–D36. Reset needs A19-RESET-TEST then A19-RESET-GO. A10 visual still open. A9 still required before hub implementation. #13/#14/#15/#17 not started. A1 open. A7 not approved.
