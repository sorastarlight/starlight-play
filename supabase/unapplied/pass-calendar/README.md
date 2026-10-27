# UTC Pass supplies and missed-period crates

Status: **installed and published with explicit owner approval**. Migration `20261027043338` (`verified_utc_pass_supply_crates`); main `facb67ed`. All nine source/ACL contracts, two private RLS tables and verification trigger checked. Six of six hosted frontend files match. No live claim, crate opening or provider check ran.

Owner decisions: one daily period at midnight UTC, one weekly period beginning Monday at midnight UTC; eligibility only for periods containing a successful active Pass verification. Do not infer eligibility for offline days or backfill old checks.

The proposed receipt ledger snapshots each period's configured reward bundle on its first successful verification. Subsequent checks cannot replace that bundle. A claimed period cannot also become a crate. Existing claims in the current period are respected at the transition. Only trusted subscription-check writes can establish eligibility; browser profile edits and staff override toggles cannot fabricate verification.

After an eligible period ends, its unclaimed supply becomes a single stacked Starlight Pass Supply Crate in My PC. Materialization happens on the next Mart/PC visit, without a background schedule. A full 30-type box holds the new type safely pending. Withdraw a crate into My Bag before opening it. Opening consumes one crate and delivers the oldest outstanding saved bundle atomically; ordinary overflow applies to the contents. Failed or retried openings cannot lose or duplicate rewards. A later subscription lapse does not erase an already-earned crate.

Owner subsequently approved this exact installation and six-file publication with source-only verification. No hosted claim, grant, provider invocation, player-data repair, historical backfill or scheduler was run.

## Evidence and recovery

24 local PostgreSQL check groups pass against schema replay plus the captured current `play_store` definition. Tests include UTC/DST/week-year boundaries, trusted verification only, immutable bundle configuration, duplicate/concurrent opening, cross-account denial, full Bag/30-slot PC/pending promotion, failed delivery rollback, existing-claim transition and ordinary PC/Mart calls. The prior berry/drop/overflow suite also passed37groups during replay. No real trainer data was imported.

`INSTALL.sql` guards the eight inspected function source/ACL contracts and refuses an existing ledger. It creates two private RLS tables, four private helpers, one profile verification trigger and one authenticated crate-opening endpoint, and replaces four existing functions. There are no public tables, scheduled jobs or historical backfill. Provider credentials, scopes and Edge Functions stay unchanged.

`ROLLBACK.sql` is an early rollback: it refuses once any eligibility/claim records exist, so it cannot delete earned rewards. `STOP.sql` is the post-use stop: it disables new verification recording, materialization and claims while retaining earned records, PC stacks and crate-opening support. Both were tested locally. Saved item identities are checked before delivery; a changed/disabled catalog entry retains the supply for Service Desk investigation instead of consuming it.

Frontend scope: `inventory.html`, `js/game.js`, `js/inventory.js`, `js/pass-crates.js`, `js/play-ux.js`, `js/store.js`. Crate opening persists its request before sending, retries uncertain results with the same ID, suppresses prior-account responses and fails closed if local storage is unavailable. Existing Bag behavior remains available if the optional crate module fails to load.

Missed supplies materialize in batches of at most100on a Mart/PC visit. No offline periods are inferred and no previous Pass checks are backfilled. Existing staff overrides still control Pass status but do not fabricate Twitch verification.

170 JavaScript regression suites and build validation pass. Local responsive checks at320/390/768/1024widths show no horizontal overflow. The local browser exercised a fictional crate opening and confirmed claimed/ready/secret-reward displays. These are local checks, not hosted acceptance.

GitHub Pages run `40450284486` completed successfully. APP remains `20261008-rc133`.
