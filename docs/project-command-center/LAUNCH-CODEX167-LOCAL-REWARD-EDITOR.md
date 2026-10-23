# CODEX-167 — local six-field reward editor

Owner approved CODEX-165's design and local implementation/tests only. The editor is locally complete, **not published**. No live reward/configuration read, save, player grant, SQL or provider operation was performed.

## Result

Game Configuration now has the six approved existing PokéCoin amounts in the local candidate. The dedicated adapter permits only admin_economy_overview and admin_economy_save after the current staff gate and matching session identity, checked before/after transport. The generic read gateway and server permissions remain unchanged. Reads project only the six scalar fields; unrelated report data and configuration are not retained. Missing/invalid fields disable editing with an unavailable state; no defaults are substituted.

The save payload contains only changed approved reward keys under p_balance. Supplies, prices, first-female rewards, rarity multipliers, milestones, versions and unknown future fields are never sent back. Existing server merge behavior is used; no concurrent revision/CAS guarantee is claimed. Native/explicit validation rejects empty, negative, fractional, exponent-form and out-of-range values; zero remains zero in review. All selected fields must be valid before review.

Before/after confirmation states the site-wide impact. Discard/reload prompts protect a local draft; leaving the document uses the normal unsaved-change warning. Moving between Hub sections retains the local draft rather than discarding it. Saves are single-flight and never automatically retried. An acknowledged or uncertain receipt locks editing until reload; an uncertain receipt retains the local draft for comparison. Denial/session change clears configuration data. Staff/account resets invalidate late reads and save receipts. A save receipt must include all six valid fields and match the requested changes before it is described as acknowledged.

## Validation

- **STATIC / LOCAL HARNESS:**116/116 non-writing suites pass; the new actual module tests cover strict fields/amounts, purpose-selected projection, exact changed-key payloads, adapter restrictions, pre/post session affinity, missing data, single-flight loads, late load/save reset, no retry, matching/missing receipts and denial clearing. Additional race assertions in the new suite were run successfully after the full run; runtime code did not change.
- **REAL DOM, fictional only:**12 editor/review/cancel states at requested1280/768/390/320 widths fit with no measured container overflow. Visible measured controls >=44px. Review preserves0PokéCoins, native Escape returns focus to Review changes and retains the draft. Nine load/save states cover unavailable, missing, denied gate, pending/completed load, pending/acknowledged save, lost receipt and denied save. The simulated save log contains exactly p_balance.captureReward=26, with no other fields. Lost receipt keeps six disabled fields; denied save removes them. No Auth/configuration endpoint was contacted.
- **BUILD:**31 HTML pages /470 first-party references; APP20261008-rc133 unchanged. Protected admin.html and js/admin-live.js unchanged.

Evidence:evidence/codex167-real-dom.json and evidence/codex167-regressions.json. Reproduce from the canonical checkout with `node tools/serve-admin-config-fixture.cjs`, open localhost51567. This isolated actual-Hub fixture strips real Auth/config/game/navigation scripts and injects fictional sessions/configuration/save receipts with CSP connect-src none. Private preview:LOCALAPPDATA/PokemonStreamLink/security/codex167/reward-editor.png. It does not prove authenticated production behavior, save semantics, real devices or server permission decisions.

## Publication boundary

The only proposed runtime publication files are admin-next.html, js/admin-next.js, js/admin-next-config.js and css/admin-config.css. Tests/fixtures/records stay on feature history. Compare these exact files against then-current main; do not merge the entire feature branch. New privileged editor publication is outside CODEX-78 and was explicitly excluded from the local-implementation approval. Publication requires its separate decision; live reads/saves and reward changes remain separately held. A future rollback restores the configuration handoff/removes this editor without writing configuration or player data.

Sora NO · Twinkle NO · PlayTester role unchanged. No encounter, provider, reward, SQL, spending, APP stamp or final-launch action occurred.
