# CODEX-154 — Component bounds and the next Admin Hub slice

Following the Helpdesk finding, inspected component bounds on six populated screens at four widths: public Trainer, Achievements, Mart, Oak, Pokédex and the Trainer directory. This is a scoped 24-case component sweep, not every hidden panel or dialog.

## Routine correction

At a 305 px viewport, the Trainer directory was 244 px wide but its implicit grid track expanded to 311.2 px. Rows were consequently clipped despite a passing document-width check. The directory now uses an explicit `minmax(0,1fr)` track. Four focused width checks confirm rows fit their directory; the final 24-case sweep has no oversized reviewed components or internal horizontal overflow. No fields, filtering, requests or permissions changed.

108/108 non-writing STATIC/LOCAL suites, build 31 HTML/464 references and 20 recovery packet file checks pass. Runtime publication scope is **only `css/admin-record.css`**. Sora NO; Twinkle NO; PlayTester unchanged. No SQL, Auth/provider, staff action, gameplay, spending or APP stamp.

## Separate design proposal — not published or connected

Prepared `design-reset/hub-mart-editor-review.html` and `ADMIN-HUB-MART-NEXT-SLICE.md` on the feature branch. The review uses fictional products with product/floor search, local editing, a player preview, discard and before/after comparison. Eight editor/dialog width cases fit their containers. No-match filtering, local price preview, comparison and cancellation were exercised. Scripts parse; no backend or persistence APIs exist. CSP blocks network connections and form submission. Standard existing Google Fonts are permitted only for presentation.

The proposed implementation edits existing single-reward PokéCoin products using the current catalog/save contracts and server permissions. Unsupported product kinds, uploads, deletion, floor changes and new products remain in existing tools. Scope, field preservation, uncertain-save handling, local validation and rollback are described in the proposal.

This is a new privileged workflow, outside CODEX-78 routine publication. Owner design/scope approval is required before connecting and implementing its save flow. No production publication, hosted save/QA or SQL is included in that design decision. The review page and proposal are deliberately excluded from main's routine CSS-only publication.

Private screenshots and measurements: LOCALAPPDATA/PokemonStreamLink/security/codex154. Prototype and component evidence are distinct from production acceptance. Real devices/provider checks and the remaining overhaul migrations remain open.
