# CODEX-223 — Roster narrow-dialog and inventory-name consistency

## Findings and routine corrections

The real roster module and stored-stat presenter were rendered with actual repository styles and fictional data. A valid12-character ASCII nickname (`WWWWWWWWWWWW`) caused internal dialog overflow at320px and390px,both with complete and missing battle data. Paging/list/empty/error layouts did not overflow.

`css/admin-record.css` now scopes wrapping and a narrow stacked header to `[data-trainer-roster] .reward-dialog`. Close details remains reachable. Gift/reward dialogs outside the roster are not targeted. No roster behavior or transport changed.

A separate copy inconsistency in `js/admin-next-record.js` displayed the internal aliases Bait/Lure in Consumables. Its one changed line now uses Honey/Poké Radar,matching the canonical names in `js/game.js`. IDs `bait`/`lure` and all quantities remain unchanged.

## Evidence

- REAL LOCAL DOM baseline:24roster states;four narrow dialog-overflow cases reproduced.
- Final candidate:24roster states at320/390/768/1024px,covering40-row first page,three-row second page,empty,error,complete stats and missing stats. No page/dialog overflow or broken sprites.
- Four inventory layouts show Berries2,Honey3,Poké Radar4 with original internal IDs and no horizontal overflow.
- Native interaction:page2 shows41–43;Previous returns1–40;empty search disables both pagination controls;Shiny details use `shiny/1.png`;Escape returns focus to the selected row;pending reads disable controls;reset followed by the late response leaves no roster data. Missing moves/ability/nature/HP and individual stats remain unavailable,with editing disabled.
- A320px rendered screenshot was inspected with the nickname and Close details visible. These fixtures do not certify a physical device,screen reader or authenticated hosted roster call.
-126 LOCAL HARNESS suites pass;build31HTML481refs;APP unchanged. Exact two-file guarded rollback refuses drift before either write and restores baselines in isolation.

[Browser measurements](evidence/codex223-browser.json) · [regressions](evidence/codex223-regressions.json) · [scope and rollback](evidence/codex223-scope.json). Private fixture/screenshot/rollback directory:`C:\Users\FET\AppData\Local\PokemonStreamLink\security\codex223`.

Routine CODEX-78 publication is limited to `css/admin-record.css` and `js/admin-next-record.js`,followed by static-source verification. No SQL,new privileged workflow,authenticated navigation/notices,hosted application call,grant,claim,provider change,protected-account mutation,spending,schedule,APP stamp or final launch. Sora NO;Twinkle NO;PlayTester unchanged. Temporary fixtures are stopped/closed.
