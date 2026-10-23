# CODEX-165 — Game Configuration migration review

Preparation only, October23,2026. No configuration editor is implemented in the new Hub, no live configuration values were queried, no application read/save endpoint was invoked, and no SQL/provider setting or player record changed. The existing protected legacy Admin sources were read only.

## Contract inspection and migration boundaries

Catalog-only SELECT inspected four installed public save functions and four private helpers. Fingerprints/ACL metadata are retained in evidence/codex165-config-contracts.json; raw definitions stay private under LOCALAPPDATA/PokemonStreamLink/security/codex165. These selected definitions are not a complete dependency/security certification. The previously reviewed economy read report/helper closure remains CODEX-160 evidence; it was not executed here.

| Existing function | Source behavior relevant to migration |
|---|---|
| admin_economy_save(p_balance) | Existing staff guard; merges supplied values over economy configuration and updates site_config.game_settings.economyBalance; returns configuration receipt. Explicit nonnegative validation checks participation/capture rewards only. A new UI must validate every exposed reward rather than assume all six are validated server-side. This review does not alter server validation. |
| admin_progression_save(p_balance) | Existing staff guard; merges progression settings; validates base/max level and forbids Trainer Level changing capture chance. Do not invent a catch-bonus switch or silently change XP/milestone rules. |
| admin_capture_save_balance(p_balance) | Existing staff guard; merges capture balance, checks min/max probability and reserves guaranteed capture for Master Ball. Keep outside the first editor. |
| admin_save_game_settings(p_settings) | Saves four encounter timing values, **also sets bits_store_enabled=false**, and returns private.play_snapshot. Legacy UI may additionally queue stream settings. It is not an isolated timing-save contract and must not be casually transplanted into the new Hub. No invocation or new side effect occurred here. |

private.is_play_admin checks whether the server returns a staff role, not an owner-only assumption. Preserve existing permissions; no role/grant/ACL change is proposed. No revision/CAS contract exists in the inspected economy save. Concurrent same-configuration edits can overwrite stale values; do not advertise locking or transactional compare-and-save protection. A revision-aware backend would require a separately reviewed SQL decision.

## Concrete first-slice proposal

Move only the existing six scalar PokéCoin rewards into Game Configuration: encounter participation, successful capture, new Pokédex entry, Shiny capture, Legendary capture, and stream attendance. Preserve their existing field meanings; do not calculate or invent combined payout estimates. All other values—first-female reward, prices, sale rates, rarity multipliers, supplies, milestones, versions and unknown fields—remain outside editing. Use the installed read/save contracts through a dedicated two-command adapter after the current staff gate. The generic read gateway stays unchanged.

Use admin_economy_overview only to obtain its configuration; discard unrelated report/identity fields. Never load the legacy Admin controller or admin_overview. Keep missing/invalid values unavailable and editing disabled; never substitute defaults into a failed read. Validate each exposed value as a whole nonnegative signed32-bit amount before review. Preserve zero as zero in preview/comparison. Construct only the explicit edited reward fields for p_balance and rely on the existing server merge; never send a raw JSON editor or restore stale unrelated fields.

The editor must provide before/after review, a site-wide impact statement, discard confirmation for navigation/reload, keyboard focus restoration and mobile containment. Saving settings changes rules used by server calculations; this review makes no promise that pending encounters freeze their original rewards. No save or balance test is part of this proposal. A future live save needs a separate bounded decision.

On a save, send once; do not retry a lost receipt. Disable edits until the catalog/configuration is reloaded and checked. Clear sensitive state on sign-out/denial/account changes and ignore late replies. Display uncertain receipts explicitly. No concurrent-edit guarantee may be claimed without a new server contract. Existing configuration tools remain available.

## Fictional visual review

design-reset/hub-config-review.html is a standalone local-only proposal with no Auth client, persistence or transport. CSP blocks network connections/form submission. It shows six fictional amounts, local editing, an explicit before/after dialog, discard/reset and an unavailable state. No production defaults or current balances were queried to populate it. Its local demo action is not a server save.

Four editor widths and four review widths were measured at requested1280/768/390/320 CSSpx: no report-container overflow/clipped controls and measured visible targets >=44px. Zero-value comparison remains0PokéCoins. Closing review returns focus to its opener. These are real rendered local checks, not physical phone/assistive or authenticated editor acceptance. Evidence:evidence/codex165-config-prototype.json; private screenshot codex165/config-review.png.

## Approval scope and exclusions

The proposed decision is **design and local implementation/tests only** for these six existing reward fields, preserving existing staff permissions and server contracts. Test strict adapter restrictions/session identity; unknown-field preservation; missing/partial/error/denied states; zero/negative/fractional/overflow input; stale replies; one-shot writes/uncertain receipts; keyboard/dialog behavior; responsive long text; and actual payload keys. Fictional/local transports only.

No SQL, reward-policy change, live configuration read/save, player/economy action, encounter/provider test, production publication, APP stamp or final-launch authority follows. The new privileged workflow is outside CODEX-78 routine maintenance and needs owner approval before local implementation. Publication and hosted saves remain later distinct decisions. Encounter timings, capture balance, XP, loot, simulations, Bits and owner credentials remain held in their current tools. Do not silently broaden this slice after approval.

Rollback for an eventual frontend implementation restores the Game Configuration handoff and removes the new editor/module; it does not undo settings, repair rewards or change players. The current review changes only documentation and an isolated fictional prototype.
