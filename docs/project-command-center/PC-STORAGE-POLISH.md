# My Bag and PC transfer polish

2026-10-26. User-requested routine frontend maintenance under CODEX-78.

- My Inventory is now My Bag in navigation, page titles and headings. Removed the redundant storage promotion card.
- PC transfers use an explicit direction, item selection and bounded quantity with 1/5/Max shortcuts. The bag chooser closes after selection.
- Confirmed transfers refresh quantities in place; arrangement saves update slots without reloading the workspace. Search and workspace remain mounted. Uncertain transfers retain their original request ID; stale reads block further transfers until refreshed.
- Existing bottom-right playToast confirms item transfers/arrangement and Pokemon layout saves; existing Pokemon move/auto-arrange feedback remains.
- Integrated tab strip and corrected Pokemon search row sizing/icon alignment.

Validation: 165 regression suites passed; focused transfer suites rerun after final chooser adjustment; build validation passed, APP unchanged. Real local browser with fictional data: deposit, withdrawal, mouse drag, auto-arrange, tab switching, desktop and 390px layout. Unit cases cover duplicate clicks, account switch, uncertain retry, failed post-transfer read, and unchanged workspace markup. No hosted player reads or mutations, no SQL.

Runtime scope: bag.html, inventory.html, storage.html, js/inventory.js, js/nav.js, js/pc-items.js, js/storage.js, css/pc-items.css. Publication/source evidence follows in RUN-LOG.

## Immediate item dragging follow-up

Items now move visually before the save completes, with the same dragging/drop-target classes as Pokemon. A single background writer serializes/coalesces rapid moves using each confirmed layout as the next expected value. Success does not redraw the grid, disable controls or rebuild the inspector. Transfers/refresh wait for arrangement completion. Failure reloads authoritative slots or marks the view stale; account changes discard old completions. Dragging preserves the selected inspector item.

166 suites pass; focused queue/transfer checks rerun after inspector-identity adjustment. Real local pointer test with a deliberate 1.5-second save delay shows the item in its destination while Saving arrangement remains visible and controls stay enabled. No hosted player calls. One-file js/pc-items.js publication.

## Sprite-preserving arrangement correction

The previous immediate-drag change still used grid.innerHTML on drop, recreating all30 cells/images. Layout-only moves now reorder existing nodes and update slot indices without replacing sprites. Confirmed in the actual local browser with pointer drag and auto-arrange: all cell/image identities survive while a1.5-second fictional save is pending.167 regression suites pass, including node identity and ordered save/failure tests. No hosted player mutations.
