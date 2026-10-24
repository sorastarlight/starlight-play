# CODEX-200 — Existing Mart floor presentation review

Preparation only. The disconnected local mock at design-reset/hub-mart-floor-review.html contains one fictional floor and no Auth client, backend transport or persistence; CSP blocks connections and form submission. No production catalog was loaded or saved. It is feature-only and not published.

## Proposed next slice

Add an existing-floor presentation editor alongside the current Mart product editor. Eligible scope: existing, non-system PokéCoin floors only. Edit public name, short description and catalog visibility; keep ID, kind, icon, sort, extra/perks and unknown fields unchanged. Show a floor-heading preview and compare only edited fields. A hidden floor is a presentation state; do not promise it blocks direct purchases without proving the actual server behavior.

No creation, deletion, duplication, reordering, icon changes/uploads, product movement, currency conversion, Bits/avatar/Pass floor editing or reward-policy change. System floors stay in current tools. Server staff permissions must remain authoritative; the design does not grant access or assume a moderator may edit.

## Existing source contract and preconditions

The old source uses admin_store_get and admin_store_save_category with p_row. js/admin-store.js saveCategory builds id/name/blurb/kind/icon/visible/sort/extra, merging existing extra before submitting. This client source is evidence of an integration path, not proof of the current database implementation or permissions. Before local implementation, inspect the installed save/read source and relevant permission/helper closure using catalog-only reads; stop on drift, unexpected mutation in a read path or a need for new SQL. Do not invoke either endpoint to discover its behavior.

A dedicated adapter must restrict itself to the reviewed two contracts, check current staff identity before/after transport, retain the selected existing floor ID and preserve every unedited field. Never reconstruct defaults from an unavailable response. Reject unsupported/system/ambiguous rows. Confirm whether the server requires full rows, then preserve unedited values without claiming concurrent-edit protection. There is no proposed revision/CAS contract.

## Implementation acceptance after design approval

Test denied/loading/unavailable/partial data, unknown-field preservation, exact payload keys, name/description validation against the inspected contract, empty/unchanged edits, visibility preview and changed-fields-only confirmation. Include account switches, stale replies, unsaved navigation/discard, keyboard focus, narrow layouts and long names/descriptions. Send once on save; uncertain outcomes disable further saves until a deliberate fresh read, with no automatic retry. Clear drafts and close dialogs on access reset. Neither a new SQL endpoint nor a live save is authorized by this proposal.

## Local design evidence

Eight rendered editor/review measurements cover requested1280/768/390/320 CSSpx (actual narrow client widths375/305). No full-page horizontal overflow; dialogs fit; measured visible buttons/text inputs/selects are at least44px high. Unavailable disables editing; Back has dialog autofocus; Escape restores Review changes. The comparison omits unchanged fields. Evidence:evidence/codex200-floor-layouts.json. This is not actual-device or real staff/backend acceptance.

The mock is a visual review, not application implementation. Its local reset/apply controls do not send anything. A future implementation must add proper dirty/discard and one-shot save handling; mock behavior is not a substitute for those tests.

## Decision boundary

Proposed decision: design and local implementation/testing only, including catalog-source inspection. Production SQL, publication, live catalog reads/saves, provider actions, rewards and APP stamp remain excluded. A new privileged workflow falls outside CODEX-78 routine maintenance under .cursor/rules/streamlink-project.mdc and CODEX-RUNNER.md. Publication and any hosted save need separate concrete decisions after the implementation is reviewed.

Frontend rollback would remove this added editor and restore the existing Mart handoff; it must not change catalog data. Do not migrate whole legacy controllers into the new Hub.


## Subsequent owner decision

Owner approved this exact design and local implementation. CODEX-201 completes it locally with121suites/build31/475 and isolated browser evidence. Earlier design/local-implementation held wording is historical for this slice. Publication and live operations remain held; see LAUNCH-CODEX201-LOCAL-MART-FLOORS.md.
