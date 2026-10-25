# CODEX-215 — local create-only Mart draft implementation

Owner-approved CODEX-213 design and local implementation completed October25. **Production SQL and publication remain held.** Existing production main ae110601 / Pages40145088416 and APP20261008-rc133 are unchanged.

The new Mart section explicitly loads current draft options, then prepares one core inventory product in an existing non-system PokéCoin floor. It displays friendly item names and canonical sprites, normalized item search, quantity and whole PokéCoin price, including explicit free pricing. The complete confirmation shows the product, floor, price, code and description. Creation always means hidden draft/unfeatured; later publication is a separate existing-editor action.

The dedicated adapter permits only the catalog read and create-only operation, checks verified staff identity before and after transport, and adds no generic RPC gateway. Shell access/sign-out/stale-session resets clear the new model. Only floor names/IDs/visibility and existing SKU codes are retained from the catalog response. Missing/ambiguous data fails closed. One request is sent per attempt. Success, duplicate and uncertain outcomes require reload; no automatic retry. Access denial clears the data. Pending results cannot restore a workspace after an account switch.

The new endpoint uses the existing owner/admin guard and validation trigger. Full inspected closure contains ten functions, two base tables, their constraints/indexes and the single item trigger; no additional table trigger or rewrite rule was found. Existing helpers select data without issuing writes. Raw source snapshots stay private. The create operation itself inserts only one catalog row, locks floor classification with FOR SHARE and rejects duplicate SKU through the primary key. The edit/upsert function is unchanged.

## Evidence

- **LOCAL HARNESS:**123 regression suites pass, including the new model/adapter tests and actual shell access-reset test. Build passes31HTML/479first-party references. No APP stamp.
- **REAL LOCAL PostgreSQL:**22 grouped checks, including25 invalid payload variants, owner/admin allow and moderator/ordinary/anonymous/no-session denial, exact bounded receipt, all six sprites, zero/max prices, duplicate preservation, observed concurrent unique-key lock wait, floor update serialization/recheck, guarded install, ACL/schema drift refusal, rollback and forward/reverse replay. Fictional records only; no production application call or credential.
- **REAL LOCAL DOM:**actual mounted module with fictional transport and CSP connect-src none. Native browser interactions verified normalized search/no match, client/server duplicate feedback, successful single send, lost receipt, access denial, empty/unavailable data and account switch during a pending save. Short review autofocus/ESC return and overflowing review heading/scrollTop0 checked. Eight scripted rendered editor/review states at320/390/768/1024 have no horizontal overflow or broken images; nested-frame measurements do not certify actual device or assistive behavior.
- **LOCAL rollback:**exact four-file frontend recovery and drift refusal before any writes. SQL rollback retains created catalog records and removes only the new endpoint after candidate checks.

Evidence:[regressions](evidence/codex215-regressions.json),[SQL](evidence/codex215-sql-checks.json),[DOM](evidence/codex215-browser-checks.json),[runtime scope](evidence/codex215-runtime-scope.json),[source closure](evidence/codex215-source-contracts.json). Private screenshots/harness/source/rollback are in `C:\Users\FET\AppData\Local\PokemonStreamLink\security\codex215\`. Temporary fixture tabs/server and isolated PostgreSQL stop after checks.

## Important next decision

Approve installing only the new function with its guarded explicit EXECUTE grants, and publishing only the four runtime files listed in the scope evidence, followed by deployed-source verification. The local approval explicitly excluded these operations; `.cursor/rules/streamlink-project.mdc` says “No SQL migrations, grants, RLS, staff-role changes, or trainer/economy/encounter/director mutations without a new owner authorization.” CODEX-78 does not cover a new privileged workflow. No live catalog read/create, authenticated navigation/notices, product publication, upload/deletion, Bits/provider test or APP stamp is proposed.

Sora NO · Twinkle NO · PlayTester role unchanged. No live SQL mutation, application endpoint, protected account, email, provider, spending, scheduler or launch action. Other real device/provider/hosted mutation acceptance remains indexed in the matrix. This optional migration slice is not automatically a launch blocker.
