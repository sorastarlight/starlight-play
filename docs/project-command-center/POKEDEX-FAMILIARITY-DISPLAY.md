# Pokédex Familiarity display — CODEX-33

2026-10-20. Routine continuation of the D71 presentation plan after current-stack local delivery validation. This slice adds the species-wide read-only line to Pokédex Your Research. My PC is a later slice.

The existing Mastery points and Evolution Candy metrics remain separate. Species Familiarity reads only the signed-in trainer's row for the selected Kanto species from the existing species_mastery_progress view. The backend tier/count are displayed directly, not computed from inventory, points or catch history. Forms share the species dex key. No read is made for an undiscovered/unreleased entry.

No-row results say Not recorded yet, with a processing explanation. Failed or malformed reads say Unavailable; they are never converted into zero or a tier. Reads are deduplicated/cached within the current page session and cleared on load/sign-out. Owner epochs reject late responses after account changes. Entry/load generations also prevent late entry/collection responses from repainting a closed or changed entry. Familiarity arrival updates its own text nodes, avoiding an extra whole-panel redraw. The existing Research flex panel now scrolls rather than compressing/clipping its species heading in a short desktop window.

## Validation

- LOCAL HARNESS:11 reader cases cover own-owner filtering, scoped SELECT, Kanto boundary, caching/deduplication, empty versus failed data, malformed rows, late success/error after owner changes, logout and displayed server tiers.
- STATIC:5 Kanto boundary and21 discovery checks passed. Syntax and git diff checks passed.
- BUILD:31 HTML pages /423 first-party references; APP20261008-rc133 unchanged.
- REAL DOM: actual Pokédex HTML/JS/CSS with fictional controllers, no Supabase SDK/config/Auth script, connect-src none CSP.1280x720 desktop and390px iframe checked. Research heading and complete progress card are readable; no horizontal panel overflow at desktop. Narrow layout inspected visually after scrolling.
- REAL DOM states: Experienced/6, empty Not recorded yet, error Unavailable, delayed account switch to Expert/20, delayed Bulbasaur-to-Pikachu navigation retaining Acquainted/3, and sign-out closing the pane. Fixture request logs contained only scoped progress reads and no JavaScript errors.

Reproduce: node tools/create-familiarity-ui-fixture.js, then serve the checkout and open /tools/.cache/familiarity-pokedex-qa.html?dex=1&tab=research. Optional case=empty, case=error or delay=2500. Mobile fixture: /tools/.cache/familiarity-pokedex-mobile-qa.html. Fixtures are ignored and not published.

Local screenshots saved in this chat's visualization folder: familiarity-pokedex-desktop.png and familiarity-pokedex-mobile.png. All displayed counts are fictional. No authenticated hosted trainer read/display or production data flow was tested. Cached progress refreshes on page/auth reload, not realtime. Delivery remains unscheduled and separately gated; this display does not process catches or award progress.

## Testing incident

An initial server-location check opened the local Play landing page, then closed it without using gameplay controls. That page's signed-out play_sync path can call director_tick_if_due; therefore this batch does not claim zero browser gameplay-RPC traffic. A subsequent read-only aggregate check at19:09:58Z showed0 unresolved encounters and the latest encounter updated_at still2026-10-18T16:30:18.236701Z. No encounter row changed during this visit; director internal state was not audited. Subsequent UI QA used the isolated network-blocked fixtures. No encounter/catch/throw/delivery action or authenticated account mutation was requested.

No schema, role, grant, gameplay calculation, inventory, Familiarity delivery/scheduler or APP stamp change. Sora/Twinkle were not targeted; PlayTester/PlayerQA/EmailQA were not used. Final release smoke remains paused. GitHub publication is within the existing routine-development authorization.

## Publication verification

Runtime commit4b26c3a0 published successfully through Pages run39481327850. At19:13:54Z, public static HTTP responses for pokedex.html, js/pokedex.js, js/species-familiarity.js and css/play.css were200 and exactly matched the checkout after line-ending normalization. No scripts were executed for that check. Evidence: evidence/pokedex-familiarity-published.json. Authenticated hosted rendering remains unverified.
