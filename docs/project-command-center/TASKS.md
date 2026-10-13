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
| F | blocked | Privileged operations | A3, new owner prompt | **required** | Stop |

Branch: `admin-hub-overhaul`. Issue #7 is design only. Live Trainers tab unchanged. A8 approved as direction. A9 needed before implementation. A1 open. A7 not approved.
