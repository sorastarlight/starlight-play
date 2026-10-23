# Next Admin Hub slice: existing Mart product editing

Status: owner approved design and local implementation on October 23. CODEX-155 implements and locally tests this slice; it is not published and no hosted save ran. See LAUNCH-CODEX155-LOCAL-MART-EDITOR.md. The existing Content Studio and current Mart handoff remain available.

## Concrete review

Open `design-reset/hub-mart-editor-review.html`. It uses fictional products, the existing visual direction, local form edits, product/floor search, a player-facing preview and a before/after comparison. It has no Auth client, backend transport, save action or local persistence. Network connections and form submission are blocked by CSP. Screenshots and eight editor/comparison width cases are retained in CODEX-154 evidence.

## Proposed first implementation scope

Move **editing of existing single-reward PokéCoin products** into Mart & Content. Keep product identity fixed. Expose public name, short description, detail, price, existing reward quantity, draft/published status, visibility and featured placement. Product search and floor filtering stay beside the editor; the preview updates with local edits; review changes before saving.

Use the existing `admin_store_get` and `admin_store_save_item` contracts. These are verified in the current `js/admin-store.js` integration, not newly created APIs. Reuse the server's existing permission decisions. A dedicated store adapter should expose only these two operations after the current staff gate; do not broaden a generic read or write gateway. Denied/loading/error states must not reveal stale catalog data or leave active save controls.

Preserve SKU, category, sort, sprite, thumbnail, Bits settings, `extra` and all unedited fields when round-tripping an eligible row. Unsupported or ambiguous rows stay read-only with a link to the existing editor. Do not silently convert multi-reward, Bits, avatar or cosmetic products. Add no schema, permission, role, pricing-rule or reward-policy changes.

The proposed slice excludes new products, deletion, duplication, reordering, floor editing, asset upload, avatar packs, Bits products and integration credentials. Those continue through the current tools. The mock's reward item is read-only; quantity changes apply to that existing reward key only.

## Required local checks before any production proposal

- Exact load/save payload parity and preservation of unedited/unknown fields.
- Owner/admin denial behavior consistent with the existing server; no assumed moderator edit access.
- Stale selection/read responses, account changes, unsaved drafts and keyboard/dialog focus.
- Save pending/error/uncertain receipts: retain the draft, avoid automatic write retries, reload the exact product before another attempt.
- Invalid quantity/price, draft/visible combinations, empty/no-match/unsupported products and long text at four widths.
- Actual rendered before/after review and cancellation, plus appropriate regressions.

Do not claim transactional concurrent-edit protection: no new server revision contract is introduced by this proposal. If implementation reveals a requirement for new SQL or changed authority, prepare a separate packet. Hosted saves/QA need a separate bounded decision; no protected account or live catalog edits are authorized here.

## Decision and rollback boundaries

Owner design/scope approval is needed to implement and locally test this new privileged workflow. The standing CODEX-78 policy covers routine maintenance, not this workflow migration. Production publication remains held until the implementation and exact runtime diff are reviewed. No new SQL or actual hosted save follows from design approval.

Frontend rollback would restore the Mart & Content handoff and remove the new adapter/module. It must not delete or repair catalog data. Existing Content Studio remains usable throughout.
