# CODEX-203 — Mart floor ordering proposal

Prepared for owner review; no implementation or publication approval is assumed.

The existing controller uses admin_store_reorder with p_kind category and a complete list of category IDs. Its Up/Down buttons immediately save. This is source evidence only; installed permissions, transaction behavior and receipt shape must be catalog-reviewed before any integration. No endpoint was invoked.

Proposed next slice: explicitly load existing floors, move eligible non-system PokéCoin floors with named Up/Down buttons, then review the complete before/after order and save once. Retain hidden floors in the list with a Hidden label; filtering must not remove IDs from the submitted order. Keep system and other-currency floors in their existing slots. Moving a PokéCoin floor past a fixed slot changes only the relative eligible-floor order. No drag-only interaction.

Boundary buttons disabled at the first/last eligible position. Keyboard focus stays on the moved floor's corresponding button. Announce the new position. Reset/discard restores the loaded order. Review names each position, with a warning that concurrent staff ordering is not locked. Missing/duplicate IDs, unavailable data, changed identity or unsupported contracts disable submission. After any save attempt, require reload before another save; never automatically retry.

Excluded: creation/deletion, product order or movement, prices/rewards, Bits/avatar/Pass settings, uploads/icons, SQL changes, production reads/saves and publication. If existing endpoint cannot preserve complete identity and fixed positions, stop integration and prepare a separate server proposal. Do not invent a client-side security boundary.

Decision for owner return: approve this design and local integration/source inspection only, or choose a different floor-ordering scope. No prompt is sent while the owner is away; independent acceptance continues.

Disconnected prototype: design-reset/hub-mart-order-review.html. Fictional IDs/names, connect-src none, no SDK/Auth. Its Apply action changes only the demo. It is not the production editor.

## Local proposal acceptance

Actual disconnected DOM: one eligible floor moved across a fixed system slot; hidden floor retained; corresponding button focused. Before/after comparison preserved every fictional floor. Escape restored Review focus. Discard restored order; unavailable state disabled all mutations. Visual widths 320,375,1024 inspected. No programmatic overflow measurement is claimed: cross-frame DOM access was unavailable in the browser tool. This is proposal evidence only. Temporary fixture server/tab closed.

## Subsequent owner approval and implementation

The owner approved this design and local implementation on October24. CODEX-211 completes both local editors after fresh source/ACL closure,122local suites,rendered checks and guarded frontend rollback. See LAUNCH-CODEX211-LOCAL-ORDER-LIMITS.md. Earlier design-held language is historical;production publication and live application calls/saves remain held.
