# CODEX-152 — Pass, catalog and research states

Extended fictional local fixtures to active/ready, cooldown, claimed and inactive Pass states; owned/unowned avatar products; Bits delivery history; and populated Oak research with claimed, claimable and locked milestones. Actual controllers and presenters run with removed SDK/config scripts, CSP network blocking and denied unknown/mutating RPCs. No claims, subscription checks, purchases, sales, grants or hosted staff/provider calls were performed.

## Routine corrections

Daily Trainer Supply previously displayed “Claimed” when `dailySupplyReady` was false but `dailyClaimed` was false. It now displays “Cooldown” / “On cooldown” and an accurate explanation. Claimed-today, ready and unspecified states retain their existing enabled/disabled behavior. Copy acknowledges both reset and cooldown rather than promising availability immediately at midnight. Reward amounts, server policy and RPC arguments are unchanged.

The Pass subscription-check timestamp was repeated in status and metadata; it now appears once. Inactive copy does not imply the account never had a Pass. A populated research claim button measured 40 px on mobile; its target now matches the 44 px controls elsewhere.

## Validation

36 completed-load state/width measurements: 16 Pass cases, 8 avatar/Bits cases and 12 research-track/history cases at 1280/768/390/320 CSS px. Final measurements have no document overflow or visible mobile controls below 44 px. The fictional research fixture contains two sample tracks rather than the full production catalog; it does not certify every milestone or the static four-track station label. No evolution or reward confirmation was submitted.

The actual Mart renderer test first reproduced the false “Claimed” label. Nine local scenarios verify ready/claimed/cooldown/unspecified states, unchanged disabled flags, a single timestamp and inactive Pass gift denial. Final 108/108 non-writing STATIC/LOCAL suites and build 31 HTML/464 references pass. Local screenshots and fixture: LOCALAPPDATA/PokemonStreamLink/security/codex152.

Publish only `js/store.js` and `css/play.css` under CODEX-78, then verify exact source. Sora NO; Twinkle NO; PlayTester unchanged. No SQL, Auth/provider settings, economy mutation, spending or APP stamp. Real device/provider acceptance and broader Admin Hub migrations remain separate.
