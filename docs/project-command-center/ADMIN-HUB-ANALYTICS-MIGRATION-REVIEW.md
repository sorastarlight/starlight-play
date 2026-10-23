# CODEX-160 — Analytics migration dependency and meaning review

This is preparation, not a new Analytics implementation or launch clearance. Protected legacy sources were read, not edited. No report endpoint, live-dashboard endpoint, gameplay function or notice function was invoked. Production reads were limited to PostgreSQL function/schema catalog definitions; no player rows or report totals were queried. Raw definitions remain private under LOCALAPPDATA/PokemonStreamLink/security/codex160.

## Current boundary

The new Hub currently offers the existing build/game health snapshot, with CODEX-159 retry/error maintenance. Full legacy Analytics is not migrated. Loading the legacy Admin controller runs refreshOverview, which calls the excluded admin_overview before loading other report data. That is not a safe shortcut for read-only acceptance. Spawn/session views also depend on playHubLiveState populated by legacy live controls; their recent-row counts are not a durable long-term session archive.

## Installed dependency map

Catalog inspection reviewed eight public function definitions and the closure of 21 private helpers, 29 definitions total. The scoped bodies use reads/expressions; no DML, dynamic SQL or network operation was found in that inspected closure. All eight public functions are marked VOLATILE, while helpers are STABLE/IMMUTABLE: those labels alone were not accepted as read-only proof. No permission, volatility or search-path change was made. Exact fingerprints and available attributes are in evidence/codex160-analytics-catalog.json. This is not certification of all public functions, role boundaries, data sensitivity, report performance or live execution.

| Legacy area | Existing installed candidates | Meaning and migration constraint |
|---|---|---|
| Captures | admin_capture_report(integer) | Capture counts/rates use the requested time window. Returned collection summaries are separate current/all-recorded aggregates, not filtered by that window. Preserve null rates when there are no attempts. |
| Progression | admin_progression_overview() | trainers counts all profiles, not recently active trainers. Unique-species summaries read catch records; do not relabel them as a living/owned Pokédex without an explicit contract. |
| Evolution/trading | admin_collection_overview() | directTrades counts all direct_trades rows without a completion/status filter. Current schema includes status default PENDING and completed_at. It is not a completed-trade count. Other fields include historical evolution and open GTS counts. |
| Economy | admin_economy_overview(), admin_economy_health() | Daily ledger and all-time metrics have different scopes. Economy health excludes PlayTester in some cohorts and TEST encounters in some capture measures; the capture report uses different filters. Do not claim these are interchangeable cohorts. HEALTHY in the economy snapshot is not a full accounting invariant check. |
| Content/Bits/events | admin_content_health(), admin_bits_health(), admin_special_event_health() | Existing staff status/configuration summaries; some event payloads include staff notes and schedule data. Keep staff authorization and show only purpose-selected fields, not a raw JSON dump. |

The private authorization helper returns a non-null staff role test; the inspected definitions retain their existing staff guard. This review does not authorize broadening the new Hub's generic read allowlist. Any future adapter must be separately scoped to reviewed report operations and preserve the server's decisions.

## Confirmed presentation risks to avoid carrying forward

1. Legacy renderAnalyticsOverview uses empty objects when a loader has not returned and money(undefined) formats zero. The new workspace must retain unavailable/loading states rather than presenting fabricated zero totals.
2. The label Active Trainers is paired with an all-profiles count. A future migrated label should describe that actual population, or use a separately reviewed active definition.
3. Total trades is paired with a count of direct-trade records, including non-completed statuses, and does not represent completed GTS exchanges. A migrated display must state that exact source or obtain a reviewed completed-trade contract.
4. A selected capture report window must not silently imply every collection/economy card shares the same window, eligibility exclusions or historical coverage.

The absent-data finding was also reproduced by executing the actual legacy renderer locally with missing source objects; its nested health loader was stubbed to prevent any endpoint call. Evidence: evidence/codex160-legacy-missing-data.json. Actual player-total impact was not measured and no player record was inspected or repaired. Changing the definitions of activity, completed trade totals, ownership/discovery cohorts or exclusions would be a separate product/data decision; none was silently changed here.

## Useful next implementation proposal

Prepare one read-only reporting workspace using the accepted Hub layout: explicit sections for captures, progression and collection/evolution; labeled source/time windows; unavailable/empty/partial states; keyboard-accessible controls and the existing 1–365 day UI range. Keep configuration saves, simulators, Bits fulfillment retries and live controls in current tools. Do not bootstrap legacy admin.js, invoke admin_overview, call write-risk notices or introduce automatic report polling. Review the concrete workflow and selected projections before connecting a new adapter. No new SQL is currently proposed by this document.

Remaining launch gates are unchanged: real device/assistive evidence and ordinary-subscriber Twitch acceptance, authenticated Mart acceptance under an appropriately safe scope, final configuration/go-no-go and any APP stamp. This preparation does not require the owner to sign in now.

## Concrete local design and proposed approval scope

`design-reset/hub-analytics-review.html` is an interactive, fictional-data-only proposal. Five report sections, twenty populated section/width cases, and four missing/empty/partial observations were reviewed in a real browser. Reviewed components fit and measured controls meet 44 px. Empty capture data shows zero throws/catches and an unavailable rate; failed reports show Unavailable rather than fabricated zeros. CSP blocks connections/form submission; there is no Auth client or persistence. This is a design demonstration, not a report implementation or permission test. Evidence: evidence/codex160-analytics-prototype.json. Private screenshot: codex160/analytics-review-detail.png.

The proposed implementation decision is **local implementation and tests only** for this whole read-only reporting slice, using existing staff permissions. Keep the existing two health reads. Introduce a dedicated, read-only adapter for only admin_capture_report, admin_progression_overview, admin_collection_overview and admin_economy_overview after the existing staff gate; retain the generic seven-command gateway unchanged. Do not add content/Bits/event administration to this slice.

Project only report-specific fields: capture summaries/breakdowns for the selected 1–365 day window; progression counts/level distributions; evolution/Candy/open-listing/direct-request summaries; and current/today/all-time PokéCoin statistics. Preserve unavailable/null values and the existing meanings/exclusions. Exclude raw configuration objects, identity data and recent trainer names from the first display. No new completed-trade metric, active-player definition, living-Dex definition or QA exclusion is proposed. Those require separate data contracts if desired later.

Local validation must cover denied and stale sessions, changed report/range responses, single-flight reads, partial/unavailable/empty results, friendly labels, escaped returned text, keyboard focus, responsive layout and adapter command restrictions. Do not bootstrap legacy controllers or automatically poll. No SQL, permission changes, report endpoint invocation on production, hosted save, provider testing, spending, APP stamp or production publication follows from this proposed local-implementation decision. CODEX-78 does not by itself authorize this new multi-report workflow; review the concrete design/scope first.

## Owner decision — October23

Owner approved the concrete design and local implementation/tests above. CODEX-162 implements this slice locally. Production report calls, SQL, hosted saves/provider tests and publication remain excluded; earlier proposal-held language is historical for local implementation only.
