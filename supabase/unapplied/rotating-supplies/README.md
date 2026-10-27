# Rotating Pass supplies and Oak streak gifts

Owner approved the exact packet at commit88543618. Installed 20261027131755;all15functionsource/ACLs,private table access and3indexes verified. Six-file main 7dea2ff35078b2183afde0c3166a043baad3d1b3 publication is deployed and source verified: Pages40510990734 SUCCESS,6/6matches. No live claim or grant.

See [reward design](../../../docs/project-command-center/ROTATING-SUPPLIES.md) and [schedule](../../../data/supply-rotation-proposal.json).

## Exact scope

- Six replacements: `play_store()`, `play_claim_daily_supply()`, `private.pass_period_wallet(uuid)`, `private.record_pass_verification()`, `admin_pass_rewards_read()` and `admin_pass_rewards_save(uuid,text,jsonb,jsonb)`.
- Six new private helpers for schedule selection, public item previews and Oak progress/completion.
- Three new authenticated endpoints: `play_oak_checkin_state()`, `play_claim_oak_completion(uuid,date,integer)` and `admin_pass_rotation_mode(uuid,text,boolean)`. The mode endpoint preserves the existing owner/admin edit guard.
- One private configuration table and one private earned-gift ledger, both with RLS enabled and no client table grants. A partial index supports pending gifts; request uniqueness and row locks prevent duplicate claims.
- Publish only `css/play.css`, `evolve.html`, `js/pass-calendar.js`, `js/oak-daily.js`, `js/admin-pass-editor.js` and `js/admin-reward-bundles.js`.

`INSTALL.sql` is atomic, checks exact baseline source/ACLs and absence of the new objects, and validates upcoming scheduled bundles against the current catalog. Exact function definitions are encoded to preserve reviewed source bytes. No existing player, claim, provider or balance row is changed by installation. The first new daily period starts at the next UTC midnight; a new weekly bundle starts in the next eligible Monday period. Oak streak eligibility starts at the next Eastern calendar day. Existing recorded Pass bundles keep their contents.

`ROLLBACK.sql` checks the installed source/ACLs, pauses new automatic supplies/streak gifts and restores the six original functions. It retains earned gifts, Candy receipts, tables and the endpoints needed to redeem pending gifts. `RESUME.sql` is separately guarded and restarts future periods/streaks without backfill. Neither packet deletes rewards or reverses grants.

LOCAL SQL: 28 check groups, including 140 schedule dates compared with the pure JS schedule, all 30 stone/ball combinations, verified snapshots, preview agreement, concurrency, retries, full Bag/PC delivery, owner-repeat exclusion, missed-day reset, cutoff, permissions, staff mode switching, rollback/redemption, resume and exact fresh install. See `local-evidence.json`. Tests used a new isolated schema-only PostgreSQL fixture with fictional player rows; no production claim or grant ran.

Frontend: 183 regression suites and build validation pass. REAL LOCAL DOM: 320/390/768/1024 calendar widths, narrow Candy dialog, choice/confirmation, real reveal engine and native Admin reward-mode review. The reward arithmetic checks use listed in-game item values, not real-money conversion or long-term economic proof.

Completed under the exact owner approval: contracts checked, packet installed, all function/ACL/table/index contracts verified and six frontend files published/source verified. No claims, gifts, provider checks, owner notices or authenticated navigation were invoked. Any subsequent rollback/resume or hosted gameplay test needs its own appropriate authority. No scheduler, purchase, live gameplay test, destructive cleanup or APP stamp is included.

