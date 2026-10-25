# CODEX-242 — Admin redesign and expanded editing

Owner authorized full implementation on October 25, with destructive production cleanup held for exact review. Work remains in progress.

## Frontend slice

Service Desk and Items & Economy names; shop categories replace visible floor wording in migrated modules. Products, Add product, Categories and Category order use keyboard-operated views rather than one long stack. Product drafts survive view changes. Service Desk filters and assignment are compact disclosures; conversation has a keyboard-focusable scroll region; reply templates and activity use familiar language. Ten runtime files form the scoped publication packet; APP unchanged.

LOCAL: 128 suites passed, build 31 HTML / 483 references. REAL LOCAL DOM: product draft survived Categories and Home/Enter return; selected panel alone exposed. Service Desk populated case has no page/detail overflow, retains internal-note distinction, no fictional writes. Ten-file guarded rollback reproduced production baselines in a private fixture.

## Expanded functionality, local only

Shared catalog/picker supports item, candy, Pokemon, currency and capacity types. Disconnected catalog preview includes 294 entries (64 ball/berry records, 151 Kanto specimens, 79 candy families); this is not a complete production-eligibility claim. Other item families and production adapters remain to integrate. Four widths 320/390/768/1024 fit without page overflow. Selected Pokemon exposes quantity, level, Shiny and Secret Gift. Gift-box SVG loaded in real browser. Server prototype hides the actual secret identity, quantity and options before returning a player preview. JavaScript validation and 27 fictional PostgreSQL checks pass, including aggregate limits, unknown fields, denied public execution, and Master Ball policy.

Owner decision: Master Balls permitted for staff gifts and Pass rewards, excluded from Mart purchases. This decision is encoded in local model and SQL prototype; no production policy changed.

Direct-correction model/UI has exact resulting balances, before/after review, reason, single-flight handling, uncertain-save lockout, account reset, capacity floor and exact selected specimen IDs. Favorite/locked/trading specimens are rejected. Production read/write endpoints, server revision/ledger enforcement, removal archive/pointer cleanup and capacity semantics remain to implement. No direct edit is wired into the live Hub.

## Server findings

Read-only pg_proc/schema/catalog inspection only. Current Pass save uses validate_store_grants; its eight core keys extend to evolution items, extra balls and berries, but not typed family candy/Pokemon. Current claim serializes inventory and checks duplicate delivery. It must retain these guarantees when moving to typed bundles. Public reward previews require server concealment; CSS hiding is insufficient. Stored snapshots are private outside Git.

## Next

Complete typed delivery and every public preview caller; catalog eligibility and legacy-product mapping; direct correction endpoints with atomic audit and stale-state rejection; actual new UI integration. Prepare exact install/rollback and cleanup scope. No production SQL, account edits, grants, claims, protected-account changes or cleanup occurred in this batch. Sora NO; Twinkle NO; PlayTester unchanged.

## Published first slice

PRODUCTION static source verification: main 799b804393c9c7c48ad0a57d63c4d36845d686bb, Pages 40229491912 succeeded; 100 monitored and 10 changed versioned sources match. No authenticated navigation or application calls. Only the ten-file compact layout/copy slice is live. The typed reward catalog, picker, Pass draft controller and trainer correction model remain local and are not production workflows.

Follow-up LOCAL: 130/130 suites pass. Picker context carries the Master Ball restriction to shop selection, while staff/Pass remain eligible; teardown removes listeners before remount. Typed daily/weekly draft controller checks aggregate limits, keeps separate lists, freezes the reviewed request by copying, prevents parallel saves, validates receipts, locks uncertain outcomes and ignores stale account reads. Complete delivery integration remains outstanding. Additional category wording in the legacy admin-store surface is locally corrected, not yet published.
