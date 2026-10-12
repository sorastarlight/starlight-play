# Pokémon StreamLink — Cursor Command Center Bootstrap

## Purpose
Create a persistent, GitHub-backed project command center so Cursor can execute approved development batches, track evidence, and report exceptions without repeated manual handoffs.

## Known baseline (verify before work)
- Repository: `sorastarlight/starlight-play`; working implementation branch `gate-2a-trainer-management`, reported commit `7f14716`.
- Production APP: `20261008-rc133`; production DB project: `dtflmlbjhttoewqgkujf`.
- Gate 2A read-only Trainer Management implemented locally but not deployed.
- R21 closed for `public.admin_identity_inspect` after reported runtime verification; R1, R2, R18 open.
- PlayTester nonstaff. Sora and Twinkle protected; no mutations or impersonation.
- Final release smoke PAUSED. Legacy `admin.html` and `js/admin-live.js` unchanged.

## Bootstrap tasks
1. Verify repository state and branch; never silently merge, switch production, or overwrite concurrent work.
2. Create `docs/project-command-center/README.md`, `ROADMAP.md`, `TASKS.md`, `DECISIONS.md`, `RISKS.md`, `TEST-MATRIX.md`, and `RUN-LOG.md`. Link from existing project documentation without rewriting historical audit records.
3. Create `.cursor/rules/streamlink-project.mdc` (or the supported Cursor project rules equivalent) describing operating limits, approval gates, and reporting format. Do not claim Cursor rules create unattended scheduling or autonomous background execution.
4. Build a traceable Admin Hub inventory from actual source: navigation, trainer profile sections, duplicate grant/adjustment actions, read-only and mutating RPCs, and existing tests. Mark unknowns instead of assuming.
5. Propose a consolidated Admin Hub information architecture, with a single trainer dossier and one canonical entry point per privileged action. Do not implement new write capabilities or rewire risky RPCs.
6. Convert the overhaul into independent batches with acceptance criteria and test plans: (A) visual/UX review of Gate 2A, (B) trainer profile organization, (C) duplicate-action inventory and consolidation design, (D) navigation/operations coherence, (E) regression automation, (F) separately gated privileged operations.
7. Execute safe, local, frontend-only batches A–E where requirements are clear. Use sanitized fixtures and automated tests. Iterate locally on ordinary UI bugs without asking for permission after every fix.
8. Maintain a machine-readable task index (e.g. `TASKS.json`) if useful, but keep Markdown readable. Every task: id, status, scope, dependencies, branch/commit, evidence, test results, next action, approval requirement.
9. Commit changes on a dedicated feature branch and push it if authorized by existing repo workflow. Do not merge or deploy.
10. Finish with a concise dashboard: completed, blocked, next recommended batch, tests, branch/commit, and explicit approvals needed.

## Non-negotiable safety rules
- No production deployment, SQL migrations, database grants/RLS changes, staff-role changes, or production trainer mutations without new explicit owner authorization.
- Never impersonate or mutate Sora or Twinkle. PlayTester remains nonstaff unless separately approved for a narrowly scoped test with mandatory cleanup.
- Do not touch encounters, director, economy, inventory balances, or progression state as part of UI restructuring.
- Do not alter the legacy admin interface or its JS. Preserve feature flag and production APP RC133.
- Do not call known unsafe admin RPCs; inspect catalog definitions without executing write-risk RPCs.
- Keep R1/R2/R18 open until separately remediated and verified. Do not reopen R21 without evidence.
- Keep final release smoke paused.
- Avoid silent background automation: Cursor can work through a batch in one session, but unattended recurring execution needs a separately configured supported runner.
- Stop for newly discovered write paths, authorization weaknesses, required schema changes, missing production data, destructive changes, or unclear user-facing design decisions.

## Definition of done for each batch
- Scope and affected files recorded; no out-of-scope changes.
- Static tests, UI fixture tests, and appropriate regression checks pass.
- Accessible desktop/mobile behavior checked.
- No privileged RPC additions or accidental data writes.
- Screenshots or reproducible UI evidence where possible.
- Updated task queue and run log with branch/commit.
- Clear distinction between mocked tests, actual runtime checks, and untested production paths.

## First execution boundary
Start by creating the command center, auditing current Admin Hub architecture, designing the unified Trainer Profile, and improving the local read-only UI on a feature branch. Run tests and fix local regressions. Stop before merge, production deployment, live staff testing, or any privileged operation. Report only decisions requiring owner approval.
