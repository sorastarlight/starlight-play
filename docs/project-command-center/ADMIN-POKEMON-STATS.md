# Admin Pokémon stored stats

CODEX-24, 2026-10-20. Owner explicitly approved the read-only Supabase stats patch after local review. Installed migration20261020014622 (admin_pokemon_stored_stats).

The old private.admin_account_json response exposed only basic identity/level fields for the newest40 live catches. Stored data already included IVs, legacy Awakening values/moves, and nullable newer EVs, nature/ability, structured moves and HP. This patch adds battleData to those same40 rows through private.admin_catch_battle_json; the public staff RPC, require_hub gate, row selection and staff privileges are unchanged. No new public endpoint or table grant.

UI now shows stored moves, nature, ability, current/maximum HP and a six-stat IV/EV/Awakening table. Missing fields remain Unavailable;0 stays0. Newer nature/ability/move references resolve using the catch's own content_build. Structured move order is retained; legacy move names are used only when structured slots are absent. No Pokémon is generated/backfilled, no values are changed, and Edit stats stays disabled. Derived Attack/Defense totals are not calculated by this change; displayed training values are labeled explicitly.

Validation:
-14 REAL LOCAL PostgreSQL checks with fictional records: zero/null distinction, reference-build isolation, structured order/legacy fallback, empty slots, account-contract integration, transferred-row exclusion, direct anon/authenticated execution rejection and rollback restoration. Disposable loopback PostgreSQL only; source-shaped fixture tables and helper stubs are not a full production clone.
-37 focused JavaScript checks (13 presenter,8 trainer-contract,16 rewards); build31 pages/422 references, APP20261008-rc133.
-REAL DOM local presenter: fictional Scratch/Growl, Solar Power, Hardy,0/20 HP, all6 stat rows and disabled editor verified. Screenshot trainer-stored-stats.png in task visualization folder. No authenticated hosted Trainer record was inspected for this test.
-Hosted read-only catalog verification: account definition MD5 b4a01359724baa0cd3f82a7c645af1ae; public wrapper b873ae8652672154805420d069d0065b and staff gate0d3c14b0c96fbc20f27ca4a85cab5d25 unchanged. Helper STABLE, security invoker, no anon/authenticated direct EXECUTE. Synthetic composite input verified IV HP0, HP0/20, missing nature/ability null and legacy scratch; no actual trainer/catch selected or changed.
-Security advisors inspected: new helper not named; historical project findings remain. This is not a clean-project security verdict.

Install/rollback: supabase/unapplied/admin-pokemon-stats/ (historical authoring path; INSTALL is now applied). Both pin the expected helper definition to stop on drift. Local rollback restores original helper definition exactly and removes the added serializer. No hosted rollback executed.

Sora mutated NO; Twinkle mutated NO; PlayTester/PlayerQA roles unchanged; no gameplay RPC, provider linking, build stamp or spending. Twitch policy remains disabled; D85 stamp proof and D86 remain held. Separate issue15 zoom/motion acceptance checks remain open.
