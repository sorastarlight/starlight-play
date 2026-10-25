# CODEX-219 — Local Starlight Pass bundle editor

The owner approved CODEX-218's design and local implementation. The new Game Configuration workspace now edits independent daily and weekly bundles, with searchable selection of the eight existing core rewards, sprites, positive whole quantities and complete current/proposed review.

**Local implementation complete; production publication and hosted reads/saves remain held.** Production stays at main `10eeb1d6`, Pages `40162962338`, APP `20261008-rc133`.

## Scope

Exactly four frontend files are proposed for later publication:

- `admin-next.html`
- `js/admin-next.js`
- `js/admin-next-pass.js`
- `css/admin-pass.css`

The editor mounts closed and requires an explicit load. Its dedicated adapter permits only `admin_content_studio` and `admin_save_pass_rewards`, checks the same staff identity before and after transport, retains only the two bundle projections, and resets on the shell's access/account transitions. Server owner/admin permissions remain authoritative.

Daily and weekly add/remove actions are isolated. Each bundle must contain at least one supported reward. Quantities are whole numbers from 1 to 2,147,483,647. Unsupported, partial, malformed or empty returned contents disable editing; client defaults never replace failed reads. Search uses friendly names and canonical local sprites.

The review shows both current and proposed bundles and explains site-wide impact, in-flight claims and concurrent staff edits. Reload/discard and ordinary navigation protect an unsaved local draft. Browser exit also warns while dirty. Save is single-flight and sent once. Acknowledged or uncertain results lock editing until explicit reload; malformed/mismatched receipts are uncertain. Explicit denial/session changes clear data; epochs reject late results.

Existing server behavior replaces the entire `starlightPass` object with `{daily,weekly}` while preserving other root game-settings keys. This editor neither preserves undocumented Pass subfields nor supplies a concurrency revision token. It changes no eligibility, intervals, claim clocks, overrides, regrants or reward delivery code.

## Validation

- **LOCAL HARNESS:** 125 suites pass. Added semantic validation, allowed-command/payload checks, session race, isolated bag editing, exact receipt, duplicate-save, denial and stale-completion coverage. The actual shell reset test now asserts that the Pass workspace is reset.
- **REAL DOM, fictional localhost only:** searchable picker, scoped removal, retained quantity, before/after review, long-dialog heading focus, Escape focus restoration, canceled navigation, successful lock, unsupported/empty bags, pending-load/reset, lost receipt and denied-save clearing observed. Eight editor/review states at 320/390/768/1024 pixels report no horizontal page/dialog overflow or broken visible sprites. These are not physical-device or screen-reader evidence.
- **BUILD:** 31 HTML pages, 481 first-party references. APP unchanged.
- **RECOVERY TOOLING:** existing 26 SQL packet files verify; no SQL executed. Four-file frontend rollback refuses drift across all candidates before writing, restores exact baselines and removes only the two explicitly named newly added files in an isolated fixture.

Evidence: [regressions](evidence/codex219-regressions.json), [browser](evidence/codex219-browser.json), [scope and rollback](evidence/codex219-runtime-scope.json). Private fixture, screenshot and guarded rollback are outside Git at `C:\Users\FET\AppData\Local\PokemonStreamLink\security\codex219`.

## Next decision

Publication of these four frontend files plus deployed-source-only verification requires a separate owner decision under `.cursor/rules/streamlink-project.mdc` and CODEX-RUNNER. Recheck the inspected read/save dependency and permission contracts before publication; stop on drift. No SQL, authenticated navigation/notices, live configuration read/save, claim, provider test, grant, APP stamp or final launch is included.

Sora NO · Twinkle NO · PlayTester role unchanged. Heartbeat remains paused. Existing launch acceptance gaps and post-CODEX-215 physical backup observation remain recorded in the matrix; this slice does not close them.
