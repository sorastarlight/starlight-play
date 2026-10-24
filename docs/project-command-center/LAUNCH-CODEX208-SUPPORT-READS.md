# CODEX-208 — Helpdesk read and reset acceptance

The actual Support module was mounted with fictional staff identity and read-only controls. Network connections were blocked; the fixture accepted only list/get reads and recorded zero write calls.

Ten local browser checks covered clearing the previous conversation during loading, rejecting out-of-order case data, keyboard retry/focus, mock account change, unmount before inbox completion, list/conversation failures, permission denial, empty results and successful retry. No stale conversation reappeared after account change or unmount.

A read failure previously claimed a draft had been kept even when no draft existed. The one-expression copy correction gives list/get failures a neutral load-error message. Permission-denied wording and the existing mutation-failure/draft-preservation message are unchanged. No transport,request,permission or ticket-state logic changed.

All121 LOCAL HARNESS suites pass,including11actual-source mocked Helpdesk boundary checks. Build validation passes with31HTMLpages/475references;APP remains20261008-rc133. Evidence:evidence/codex208-browser-checks.json andevidence/codex208-regressions.json. Private fixture/screenshot remain underLOCALAPPDATA/PokemonStreamLink/security/codex208/. Temporary server andtab closed.

This tests shared read/reset paths in a read-only staff mount,not the full hosted staff write workflow. No production application call,authenticated navigation,notice,ticket/reply/note,email,SQL,Auth/provider,protected-account orspending action ran. Sora NO;Twinkle NO;PlayTester role unchanged.

Runtime scope:js/support.js only. RoutineCODEX78copymaintenance;publication/sourceverification next.
