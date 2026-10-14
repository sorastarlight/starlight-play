# Pokémon StreamLink — project command center

Persistent working set for approved development batches. Historical audits stay in `docs/audits/` and are not rewritten here.

**Bootstrap source:** [`STREAMLINK_CURSOR_COMMAND_CENTER.md`](../../STREAMLINK_CURSOR_COMMAND_CENTER.md)

| Document | Role |
|---|---|
| [ROADMAP.md](./ROADMAP.md) | Batches A–F and sequencing |
| [TASKS.md](./TASKS.md) | Human-readable queue |
| [TASKS.json](./TASKS.json) | Machine-readable index |
| [DECISIONS.md](./DECISIONS.md) | Recorded choices and owner approvals needed |
| [RISKS.md](./RISKS.md) | Open/closed risks including R1/R2/R18/R21 |
| [TEST-MATRIX.md](./TEST-MATRIX.md) | What is automated vs untested |
| [RUN-LOG.md](./RUN-LOG.md) | Session evidence |
| [ADMIN-HUB-INVENTORY.md](./ADMIN-HUB-INVENTORY.md) | Source-traced Admin Hub map |
| [ADMIN-HUB-IA.md](./ADMIN-HUB-IA.md) | Proposed next-hub information architecture (implemented preview) |
| [DESIGN-RESET-ISSUE-6.md](./DESIGN-RESET-ISSUE-6.md) | Issue #6 research, journeys, field map |
| [DESIGN-RESET-DECISION.md](./DESIGN-RESET-DECISION.md) | A vs B owner choice (A8) |
| [design-reset/](./design-reset/index.html) | Annotated wireframes for proposals A and B |
| [DESIGN-SPEC-ISSUE-7.md](./DESIGN-SPEC-ISSUE-7.md) | A8 Proposal A implementation spec |
| [design-reset/hub-a.html](./design-reset/hub-a.html) | Integrated hub static prototype |
| [VISUAL-STYLE-GUIDE-ISSUE-8.md](./VISUAL-STYLE-GUIDE-ISSUE-8.md) | Issue #8 tokens and before/after |
| [design-reset/hub-a-visual-v2.html](./design-reset/hub-a-visual-v2.html) | Polished Proposal A comparison prototype |
| [POKEMON-UX-ISSUE-9.md](./POKEMON-UX-ISSUE-9.md) | Issue #9 collection rows and detail contract |
| [design-reset/hub-a-visual-v3.html](./design-reset/hub-a-visual-v3.html) | Pokémon collection comparison prototype |
| [TRAINER-UX-ISSUE-10.md](./TRAINER-UX-ISSUE-10.md) | Issue #10 art source, raised nav, full-row directory |
| [design-reset/hub-a-visual-v4.html](./design-reset/hub-a-visual-v4.html) | Trainer UX polish comparison prototype |
| [TRAINER-RECORD-ISSUE-12.md](./TRAINER-RECORD-ISSUE-12.md) | Issue #12 field matrix, header, Connections, Inventory, Unlockables, Tickets |
| [design-reset/hub-a-visual-v5.html](./design-reset/hub-a-visual-v5.html) | Trainer record IA comparison prototype |
| [POKEMON-LEGALITY-AUDIT-ISSUE-16.md](./POKEMON-LEGALITY-AUDIT-ISSUE-16.md) | Issue #16 catch schema, legality matrix; errata: LGPE has natures |
| [GEN-IX-REBUILD-PLAN-ISSUE-19.md](./GEN-IX-REBUILD-PLAN-ISSUE-19.md) | Issue #19 Gen IX cross-gen rebuild plan, validator, reset playbook |
| [GEN-IX-REF-ISSUE-20.md](./GEN-IX-REF-ISSUE-20.md) | Issue #20 offline pin, checksums, Mega/regional coverage |
| [GEN-IX-REF-READINESS-REVIEW.md](./GEN-IX-REF-READINESS-REVIEW.md) | Issue #21 Gmax, Champions, friendship, secure SQL review |
| [GEN-IX-SCHEMA-ISSUE-22.md](./GEN-IX-SCHEMA-ISSUE-22.md) | Issue #22 unapplied private.ref_* + catch extensions |
| [GEN-IX-SCHEMA-REHEARSAL.md](./GEN-IX-SCHEMA-REHEARSAL.md) | Issue #23 disposable local Postgres rehearsal |
| [GEN-IX-PRODUCTION-PREFLIGHT.md](./GEN-IX-PRODUCTION-PREFLIGHT.md) | Issue #24 read-only production catalog + PostgREST preflight |
| [GEN-IX-APPLY-CHECKLIST.md](./GEN-IX-APPLY-CHECKLIST.md) | Controlled A19-APPLY go/no-go (UNAPPROVED) |
| [GEN-IX-APPLY-DECISION.md](./GEN-IX-APPLY-DECISION.md) | A19-APPLY packet; backup recorded; apply UNAPPROVED |
| [GEN-IX-APPLY-HANDOFF.md](./GEN-IX-APPLY-HANDOFF.md) | Final go/no-go handoff; **BLOCKED** pending owner decision |

Cursor operating limits: `.cursor/rules/streamlink-project.mdc`. That file does not schedule unattended work.

**Safety defaults:** no merge, no production deploy, APP `20261008-rc133`, smoke paused, Sora/Twinkle protected, PlayTester nonstaff, legacy `admin.html` / `js/admin-live.js` untouched.
