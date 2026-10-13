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

Cursor operating limits: `.cursor/rules/streamlink-project.mdc`. That file does not schedule unattended work.

**Safety defaults:** no merge, no production deploy, APP `20261008-rc133`, smoke paused, Sora/Twinkle protected, PlayTester nonstaff, legacy `admin.html` / `js/admin-live.js` untouched.
