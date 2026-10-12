# Roadmap

Working branch: `admin-hub-overhaul` (from `gate-2a-trainer-management`). Do not merge or deploy.

| Batch | Name | Authorization | Status |
|---|---|---|---|
| A | Visual / UX review of Gate 2A Trainer Management | Local frontend | **DONE** this session |
| B | Trainer profile organization (single dossier) | Local frontend | **DONE** this session |
| C | Duplicate-action inventory and consolidation design | Design only; no writes | **DONE** this session |
| D | Navigation and operations coherence | Local frontend | **DONE** this session |
| E | Safe frontend regression automation | Local tests | **DONE** this session |
| I2 | Issue #2 local visual QA | Local frontend | **DONE** |
| I3 | Issue #3 Trainer dossier redesign | Local frontend | **DONE** — owner A1 still open |
| F | Privileged operations | **NOT AUTHORIZED** | Blocked pending owner approval |

## Sequence

1. Command center + inventory + IA (bootstrap).
2. A–E on `admin-next.html` / presenters / CSS / fixture / tests.
3. Stop. Owner visual review of the local preview, then separately decide staff QA, merge, or Batch F.

## Out of scope until a new prompt

Production APP stamp, SQL, grants, RLS, staff promotion, live staff RPCs, Gate 3 Support mutations, encounter/director/economy writes, legacy admin edits.
