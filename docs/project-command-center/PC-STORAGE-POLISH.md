# My Bag and PC transfer polish

2026-10-26. User-requested routine frontend maintenance under CODEX-78.

- My Inventory is now My Bag in navigation, page titles and headings. Removed the redundant storage promotion card.
- PC transfers use an explicit direction, item selection and bounded quantity with 1/5/Max shortcuts. The bag chooser closes after selection.
- Confirmed transfers refresh quantities in place; arrangement saves update slots without reloading the workspace. Search and workspace remain mounted. Uncertain transfers retain their original request ID; stale reads block further transfers until refreshed.
- Existing bottom-right playToast confirms item transfers/arrangement and Pokemon layout saves; existing Pokemon move/auto-arrange feedback remains.
- Integrated tab strip and corrected Pokemon search row sizing/icon alignment.

Validation: 165 regression suites passed; focused transfer suites rerun after final chooser adjustment; build validation passed, APP unchanged. Real local browser with fictional data: deposit, withdrawal, mouse drag, auto-arrange, tab switching, desktop and 390px layout. Unit cases cover duplicate clicks, account switch, uncertain retry, failed post-transfer read, and unchanged workspace markup. No hosted player reads or mutations, no SQL.

Runtime scope: bag.html, inventory.html, storage.html, js/inventory.js, js/nav.js, js/pc-items.js, js/storage.js, css/pc-items.css. Publication/source evidence follows in RUN-LOG.
