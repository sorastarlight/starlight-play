# CODEX-41 — Approved legacy110 cleanup completed

Owner explicitly approved reviewed cleanup and recovery scope at commit52f7621b. Executed the unchanged ARCHIVE_AND_REMOVE.sql (SHA2565261c55c9246571e4a972a30b292dc89f4d02163a3cb879120a79e04e5d0d729) as migration20261021030704, archive_and_retire_legacy110_specimens, at2026-10-21T03:07:04.988225Z /October20,2026 11:07:04PM EDT.

## Verified outcome

- Exactly110 legacy catches privately archived and removed from active catches. Independent archived full-row hash47123088724a5f1b56e2217df4dcedf7 matches the reviewed manifest. Archive integrity hash verifies.
- All7 WIRE specimens remain byte-for-byte unchanged: hash63b6a3794b396c66107e6ae7d35a2824. Active legacy count0.
-55 linked Oak rows and1 open listing archived/removed, with0 remaining links to retired IDs. No cascade was used.
-2 profile pointer sets archived/cleaned. Independent current-pointer comparison matches saved after-state;0 stale legacy references remain in team IDs, box layouts or showcase. Team removal, null box/showcase pointers and profile updated_at behavior were part of reviewed scope.
- Candy/evolution history retained:63 legacy specimen identities still referenced in candy ledger and30 in evolution history. Transaction checked full protected-table hashes before/after, including inventories, balances/XP/ledgers, discovery/mastery/Familiarity, director and non-pointer profile data. No reconciliation or reward replay.
- Private archive tables have RLS enabled; anon/authenticated SELECT denied. Catch triggers remain enabled. Director remains OFFLINE/manual hold/inactive/no queued or scheduled encounter.
- Actual authenticated EmailQA My PC reload still shows its retained Bug Caterpie,22/7/9/7/7/12. Screenshot: task visualization emailqa-pc-after-cleanup.png. No management/gameplay control clicked. This is not an owner-PC acceptance check.

## Owner identities and audit correction

Read-only final archive/profile join: Sora Starlight95, Play Tester12, twinklephoenixstar3 (Twinkle). The earlier ad-hoc name filter missed Twinkle's full identity. That pre-approval protected-owner summary was incomplete; the approved exact110-row manifest did include these3 specimens and the later user explicitly approved all110. The operator disclosed the correction. Sora mutated YES (approved archival/removal); Twinkle mutated YES (3 specimens in approved set); PlayTester role unchanged. No broader protected-account permission follows. Future owner classification must use canonical protected identities rather than guessed short-name matching.

## Validation and boundaries

19 REAL LOCAL SQL checks passed before execution. Fresh read-only hosted preflight matched the reviewed schema and row hashes. Transaction completed with all invariance checks; independent verification is in evidence/legacy-cleanup-hosted-verification.json. Selective restore was not needed or executed in production. No archive purge, reset, encounters, scheduler, spending, role/grant change or APP stamp. APP20261008-rc133 unchanged. Historical SQL proposal headers/directory names remain for reproducibility; do not rerun ARCHIVE_AND_REMOVE.sql.

Post-DDL security advisors:270 mutable-search-path,78 anon/196 authenticated security-definer notices,48 RLS-without-policy info,1 leaked-password protection notice. Only the2 intentionally deny-all private archive tables account for the RLS info increase from46 to48; no public access policy should be added. Wider security review remains open. Reference: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy

Verdict: PRODUCTION PASS for approved archive/removal scope and retained QA PC read. This is not full launch readiness or proof of production selective recovery. Remaining learnset/WIRE-off fallback and AV-column/legacy-table retirement stay in CODEX-40; no table or required habitat/level/gender configuration was dropped. Private recovery archive remains until a separate reviewed purge decision.
