# CODEX-208 — Helpdesk read and reset acceptance

The actual Support module was mounted with fictional staff identity and read-only controls. Network connections were blocked. The fixture accepted only list/get reads and recorded zero write calls.

Ten local browser checks covered clearing the previous conversation during loading, rejecting out-of-order case data, keyboard retry and focus, mock account change, unmount before inbox completion, list and conversation failures, permission denial, empty results and successful retry. No stale conversation reappeared after account change or unmount.

A read failure previously claimed a draft had been kept even when no draft existed. The one-expression copy correction gives list/get failures a neutral load-error message. Permission-denied wording and the existing mutation-failure/draft-preservation message are unchanged. Transport, request, permission and ticket-state logic are unchanged.

All 121 LOCAL HARNESS suites pass, including 11 actual-source mocked Helpdesk boundary checks. Build validation passes with 31 HTML pages and 475 references; APP remains `20261008-rc133`. Evidence is in `evidence/codex208-browser-checks.json` and `evidence/codex208-regressions.json`. The private fixture and screenshot remain under `LOCALAPPDATA/PokemonStreamLink/security/codex208/`. The temporary server and tab are closed.

This tests shared read/reset paths in a read-only staff mount, not the full hosted staff write workflow. No production application call, authenticated navigation, notice, ticket/reply/note, email, SQL, Auth/provider change, protected-account mutation or spending occurred. Sora NO; Twinkle NO; PlayTester role unchanged.

Runtime scope is only `js/support.js`, under CODEX-78 routine copy maintenance. Publication source verification is complete.

## Publication

CODEX-208 published at main 6d740c21427687e3bf727895b0667ce78ce4602a. Pages 40125318465 succeeded; all 100 monitored and one changed versioned source match. All 121 local suites and build validation pass. Ten local browser read/reset cases passed with zero fictional writes. No hosted support call, ticket action, Auth/provider change, SQL or APP stamp occurred.

Evidence: `evidence/codex208-publication.json`. Runtime diff is one expression in one file; source proof does not certify hosted ticket behavior.
