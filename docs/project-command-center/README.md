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
| [ADMIN-HUB-IA.md](./ADMIN-HUB-IA.md) | Proposed next-hub information architecture |

Cursor operating limits: `.cursor/rules/streamlink-project.mdc`. That file does not schedule unattended work.

**Safety defaults:** no merge, no production deploy, APP `20261008-rc133`, smoke paused, Sora/Twinkle protected, PlayTester nonstaff, legacy `admin.html` / `js/admin-live.js` untouched.
