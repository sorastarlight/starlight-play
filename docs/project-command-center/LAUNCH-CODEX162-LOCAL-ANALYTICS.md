# CODEX-162 — local read-only Analytics workspace

Owner approved CODEX-160's reviewed design and local implementation/tests on October23. The five-view workspace is implemented locally: Health, Captures, Progression, Evolution & Trading, and Economy. **Not published; no production report endpoint was called.**

## Result and meanings

The new module uses only the four reviewed report commands through a dedicated adapter. The existing seven-command generic read gateway and two health reads remain unchanged. The adapter checks the existing staff gate and matching session identity before and after a report request. Account/gate resets clear report state/cache and invalidate late replies. Report views load on selection or manual refresh, without automatic polling; duplicate refreshes are single-flight. Capture range is an integer1–365 days, with the applied range and returned server start explicitly shown. Changing view/range invalidates earlier replies. Refresh failures clear visible report values; missing values remain unavailable, valid zeros remain zero, and a no-throw rate remains unavailable.

Registered trainers means all profiles. Direct trade requests includes every direct-trade status, not completed GTS exchanges. Recorded-species averages describe catch records rather than current ownership, and exclude profiles without catch records in that average. Current balances, today's configured-time-zone ledger, and retained all-time totals remain distinct. The reported highest level bucket is displayed51+ because the existing SQL predicate is >=51. Only selected fields are retained/displayed; raw configuration, recent trainer names and identity data are omitted. No legacy Admin controller is bootstrapped.

Keyboard controls use one selected tab stop, Left/Right/Home/End focus movement and native Enter/Space activation. Result updates retain control focus. Responsive cards and wrapped tables preserve readable labels at narrow widths. The shared report panel's accessible name follows the selected report; Health keeps its own named panel.

## Validation and limits

- **STATIC / LOCAL HARNESS:**113/113 non-writing regression suites pass. New tests exercise actual adapter/controller/projection code: command/range restrictions; denied/mismatched sessions before dispatch; identity changes during dispatch; cache clearing on access failure; null/zero/invalid types; selected-field omission; escaping; single-flight; stale view/range responses; reset/cache disposal; unavailable results. Existing shell gate test now explicitly recognizes only this dedicated restricted transport. Existing health-loader fixture supplies the new reset dependency.
- **REAL DOM, fictional only:**20 report/width combinations at requested1280/768/390/320 px fit their report containers, with no measured clipped components and visible controls >=44 px. Four capture states cover empty, unavailable, partial and hostile returned text; hostile markup remains text with zero injected image nodes. Two actual-shell staff-gate cases hide staff data and make zero simulated report calls. Keyboard checks confirm focus-only arrows/Home/End and native range validation:366 is rejected without replacing the last applied7-day report.
- **BUILD:**31 HTML pages /468 first-party references; APP20261008-rc133 unchanged. Protected admin.html and js/admin-live.js unchanged.
- **NOT VERIFIED:**production report results/performance, owner acceptance, real assistive/device evidence, and hosted Analytics behavior. Fictional fixtures do not establish server authorization or provider functionality. Existing Twitch hold and launch gates remain.

Evidence: evidence/codex162-regressions.json and evidence/codex162-real-dom.json. Private screenshot: LOCALAPPDATA/PokemonStreamLink/security/codex162/analytics-local.png. Reproduce the isolated actual-Hub fixture from the canonical checkout with `node tools/serve-admin-analytics-fixture.cjs`, then open localhost51562. The fixture strips real Auth/config/game/navigation scripts, injects fictional sessions/reports, and blocks connections using CSP. Its test-only data and flags are not runtime dependencies or publication candidates.

## Exact publication candidate and held decision

Only these four runtime files belong in a possible later scoped publication:

1. admin-next.html
2. js/admin-next.js
3. js/admin-next-analytics.js (new)
4. css/admin-analytics.css (new)

Tests, fixtures, evidence and records stay on the feature history. Do not merge the whole feature branch. Review the exact diff against then-current main before publication, preserve separate histories, and verify deployed source bytes without navigating an authenticated application page or invoking reports/notices. Publication requires a new owner decision because the explicit approval excluded it and this is a new multi-report workflow outside CODEX-78. No SQL, saves, hosted report calls, provider test, gameplay, grants, credentials, spending, APP stamp or final launch is authorized here.

Sora NO · Twinkle NO · PlayTester role unchanged. Local implementation complete; production publication held.

## Publication — owner approved and verified

The owner separately approved exact four-file publication and source-only verification. Main7f0bd440 / Pages39981888624 completed successfully. All100monitored sources and4changed versioned URLs match the exact published commit (CRLF normalized). Main build31/468 passed;APP20261008-rc133 unchanged. Candidate runtime bytes match featurec04f6704. No authenticated application navigation, production report call, notice, save, SQL, provider/gameplay, grant or protected-account action occurred. Evidence:evidence/codex162-publication.json. Publication approval spent; real report/owner acceptance remains separate. Earlier local-only/publication-held language above records the state before this subsequent decision.
