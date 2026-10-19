# Codex Trainer record implementation

The owner selected **Advance proposed Trainer record layout** in response to the v5 comparison question. Together with the current Codex runner and GitHub publication instructions, this authorizes this frontend implementation and publication. It supersedes the historical A9 stop for this slice; final visual acceptance is still open. This is not authority for database or gameplay work.

## Implemented

- Full-width directory OR full-width record at all viewport sizes. Directory omits coins and uses explicit Starlight Pass wording, avatar/initial, role, Pokémon count and last seen.
- All trainers restores query/page state, selected-row focus and directory scroll. Existing asynchronous generation guards and 50-row contract are preserved.
- Simplified identity header, six record tabs, read-only Support doorway with account context copied from the last inspect. Sign-out/denial clears that context.
- Pokémon summary list and detail view from the returned newest-40 snapshot. Local Kanto HOME PNGs for normal/shiny variants; unknown variants do not silently receive base art. No claim of full PC access, moves, stats, locked/favorite state or box position.
- Inventory category → item → quantity detail, with zero distinct from unavailable. Progression retains level/ranking facts plus grouped Unlockables and owned/locked/equipped states only where returned. Catalog presence alone never proves ownership.
- Connections retain existing identity cards and explain flags. Tickets explicitly unavailable; no fake counts or cases, ticket writes, account grants or unlink controls.
- Escape returns one drill level. Focus survives opening, tab selection, drill navigation and return to directory.

## Implementation

`js/admin-next-record.js` composes the established account presenter with no network/storage/authority calls. `css/admin-record.css` scopes the new layout to the record workspace and is loaded only by the next hub and its sanitized fixture. The controller keeps its existing read allowlist. Legacy admin files, database artifacts and APP identity are unchanged. Overview/Connections reuse the base presenter body through a checked header boundary; a regression check ensures there is exactly one tablist and the shared account fields remain present. The base presenter stays compatible with older fixtures and cached clients.

## Evidence and limits

- STATIC / LOCAL HARNESS: 70 non-writing suites passed, including new record presenter tests; build validation passed. Two artifact-writing suites remain excluded.
- REAL DOM: sanitized fixture at 1440 / 1024 / 720 / 390; directory and record have no horizontal overflow, and the directory is hidden while inspecting. Inventory drill-in, explicit zero quantity, Escape, grouped owned/locked/equipped cosmetics, Pokémon detail, local shiny artwork loading, Tickets and Connections were exercised.
- All 151 normal and 151 shiny Kanto PNG paths used by this view exist locally.
- Authenticated staff RPCs, live trainer values and production account operations were not exercised. Published source checks are not authenticated runtime proof. Screenshots show invented fixture trainers only.
- Sora NO; Twinkle NO; PlayTester NO; PlayerQA NO. Roles unverified. No SQL, gameplay RPC, activation, build stamp or spending. D85 remains blocked; D86 unauthorized.

Next: owner visual/functional review of the published record layout. Ticket/recovery/security work requires its own design and authority decisions. The production build remains `20261008-rc133`; hard-refresh an existing admin tab after publication to replace cached assets.
