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
| I4 | Issue #4 directory sizing + section spacing | Local frontend | **DONE** — owner A1 still open |
| I5 | Issue #5 Trainer Workspace 2.0 prototype | Local frontend prototype | **DONE** — not wired into `admin-next.html` |
| I6 | Issue #6 design reset / two IA proposals | Design only | **DONE** — A8 later approved A |
| I7 | Issue #7 integrated hub spec + static prototype | Design only | **DONE** — not wired into `admin-next.html` |
| I8 | Issue #8 visual refinement of Proposal A | Design only | **DONE** — comparison prototype only |
| I9 | Issue #9 Pokémon collection + detail | Design only | **DONE** — comparison prototype only |
| I10 | Issue #10 PNG art, raised nav, full-row directory | Design only | **DONE** — comparison prototype only |
| I12 | Issue #12 trainer record IA v5 | Design only | **DONE** — comparison prototype only |
| I16 | Issue #16 Pokémon legality source audit | Design / source audit | **DONE** — current-state snapshot; LGPE errata added |
| I19 | Issue #19 Gen IX rebuild plan | Architecture / reset planning | **DONE** — stop for owner review; no SQL/wipe |
| I20 | Issue #20 offline Gen IX reference pin | A19-REF development | **DONE** — unapplied SQL; stop before SCHEMA |
| I21 | Issue #21 A19-REF readiness review | Review / fixtures / proposed SQL | **DONE** — G1/C1/F1 later approved as D24 |
| I22 | Issue #22 A19-SCHEMA unapplied artifacts | Branch-only DDL + seed | **DONE** — not applied; stop before GENVAL |
| I23 | Issue #23 A19-SCHEMA local Postgres rehearsal | Disposable synthetic DB only | **DONE** — REAL SQL on localhost; live apply still blocked |
| I24 | Issue #24 A19-APPLY preflight + go/no-go handoff | Metadata + LIVE API + STATIC checksums | **DONE** — historical D34 BLOCKED snapshot |
| I24A | Issue #24 owner GO schema-only apply | Live DDL/DML `001` → seed `00`–`10` → `002` | **DONE** — D35 APPLIED; catalog PASS |
| I13 | Issue #13 owner recovery design | Design / security | **TODO** — not this batch |
| I14 | Issue #14 helpdesk architecture | Design | **TODO** — not this batch |
| F | Privileged operations | **NOT AUTHORIZED** | Blocked pending owner approval |

## Sequence

1. Command center + inventory + IA (bootstrap).
2. A–E on `admin-next.html` / presenters / CSS / fixture / tests.
3. Stop. Owner visual review of the local preview, then separately decide staff QA, merge, or Batch F.

## Out of scope until a new prompt

Production APP stamp, A19-GENVAL+, `003_rollback.sql`, restore of the 14 Oct 2026 backup, grants, RLS policy edits, staff promotion, live staff RPCs, Gate 3 Support mutations, encounter/director/economy writes, legacy admin edits, catch-row rewrites, generator/validator, collection reset (A19-RESET-GO). A19-APPLY schema-only is D35.
