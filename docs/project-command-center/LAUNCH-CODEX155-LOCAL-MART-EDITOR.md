# CODEX-155 — Existing Mart product editor, local candidate

Owner decision on October 23: **Approve design and local implementation** of ADMIN-HUB-MART-NEXT-SLICE.md. This authorizes local implementation and tests only. Production publication, hosted saves, SQL, uploads, deletion, new products and Bits/avatar workflow changes remain held.

## Result

The new Admin Hub's Mart & Content panel now has a local candidate for existing single-reward PokéCoin products: name/SKU/description search, floor filtering, public name and descriptions, integer price and quantity, draft/published status, visibility and featured placement. A player preview uses existing local item artwork. Review shows only changed fields, identifies the product and returns keyboard focus on cancellation. Switching products or reloading with a draft requires explicit discard; switching Hub sections retains the mounted draft.

Unsupported floors/product types, multi-reward products, ambiguous identities and malformed reward/publication data remain read-only with the current editor handoff. No creation, deletion, reorder, floor edit, upload, Bits or avatar editing was added. SKU/category/sort/artwork/Bits/unknown row fields and unknown extra fields are preserved in the outgoing row. Only approved fields plus the existing duplicate status/detail representations are updated.

A dedicated two-command adapter calls the existing `admin_store_get` and `admin_store_save_item` contracts after the current staff gate and a current-session identity check. The generic seven-command read allowlist is unchanged. The server still determines whether that staff member may read/save; this does not grant moderators new authority. Account changes clear the controller and obsolete asynchronous responses are ignored.

Writes are single-flight and never retried automatically. Acknowledged and uncertain saves both require a fresh catalog load before further editing. An uncertain result retains and disables the draft until explicit reload/discard. Explicit permission denial clears product data. No new revision/locking contract is claimed: another staff edit since loading can still be overwritten, and the review says so.

## Evidence and limits

- **STATIC / LOCAL HARNESS:** 109/109 suites pass. New tests execute the actual adapter and controller, checking field preservation, numeric/status validation, denied access, wrong account, duplicate save prevention, stale reads, reset during a pending save and lost receipts. Two historical shell assertions were narrowed for the approved dedicated adapter; the generic dispatcher remains constrained.
- **REAL DOM, isolated fictional data:** 20 measured editor/long-text/review width cases, including eight checks after final dialog changes, have no reviewed component overflow. Initial measured non-checkbox controls are at least 44 px high. Search by SKU, unsupported handoff, empty/denied catalog, explicit discard, Escape/opener focus, one acknowledged fictional save and one lost-receipt simulation were exercised. These are component fixtures, not authenticated Supabase acceptance or a physical phone/screenreader test.
- Build passes: 31 root HTML pages, 466 first-party references, APP unchanged at `20261008-rc133`. Recovery packet integrity passes for 20 files; no SQL executed.
- `tools/admin-mart-local-fixture.html` contains only fictional products and a mocked transport. CSP blocks connections and form submission. No Auth/SDK/secret is loaded by the fixture.

Private screenshot: LOCALAPPDATA/PokemonStreamLink/security/codex155/mart-confirmation.png. Tracked measurements: evidence/codex155-widths.json and evidence/codex155-regressions.json.

Final integration check used the actual admin-next.html and admin-next.js with only a fictional staff gate/catalog and CSP-blocked connections: the Mart panel mounted, its reviewed components fit, and switching to System & Access then back retained the edited price. No hosted call or real sign-in was used. A keyboard test found focus could leave the iframe dialog after its final action; explicit Tab/Shift+Tab wrapping was added and retested successfully, followed by Escape returning to Review changes. Interaction evidence is in evidence/codex155-interactions.json; contextual screenshot is private codex155/mart-shell-confirmation.png. Temporary review tabs/servers were closed after acceptance.

## Exact publication boundary and rollback

Candidate runtime files are **admin-next.html**, **js/admin-next.js**, **js/admin-next-mart.js** and **css/admin-mart.css**. They have not been published. Tests, local fixture and command-center records are not runtime publication scope. No protected legacy source changed.

Frontend rollback restores admin-next.html and js/admin-next.js from pre-candidate feature commit `5dbf054f`, removes their new module/style references, and removes the unused new Mart module/style from any eventual scoped publication. Apply only the Mart hunks to a publication branch; do not whole-merge feature or replace unrelated main history. No catalog/data rollback is needed because no hosted save ran.

Before any publication, review exact runtime diff against the then-current main and revalidate existing Pages histories. Hosted save acceptance requires a separate bounded catalog decision; publication alone must not be treated as permission to edit a live product. Sora NO; Twinkle NO; PlayTester role unchanged; no gameplay, SQL, provider, real email, spending, APP stamp or final launch.
