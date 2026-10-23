# CODEX-153 — Populated Helpdesk clipping correction

Reviewed actual Helpdesk controller/CSS with fictional staff/player responses, a valid 120-character unbroken subject, a 99-character reference, long message/audit text and a UUID. Only fictional list/get requests are allowed; mutations and recovery email are refused. No production connection, ticket submission or staff action occurred.

## Confirmed defect and correction

A long reference forced the conversation card to approximately 1,413 px inside a 375 px viewport. The page itself still reported 375 px: document-level overflow checks alone did not reveal the clipped component. The reference paragraph's scroll width was 2,992 px. Baseline component evidence is retained in the private fixture and public summary.

Cards now permit shrinking and wrap long text. The narrow grid uses `minmax(0,1fr)` so intrinsic content cannot expand its column. No content is truncated or removed. Existing status/subcategory codes now display the same friendly labels used by the filter and creation forms: “Waiting for staff,” “Waiting for player,” “Missing reward,” etc. Unknown labels keep the existing escaped fallback.

## Evidence and limits

32 local rendered cases: 24 staff/player list/conversation/empty/denied states, four expanded staff account/audit states, and four populated new-ticket dialog widths. Final conversation cards fit their viewport with no internal horizontal overflow. Dialogs fit at all four widths; the draft was cancelled. Player responses in this fixture omit internal notes by construction; this does not replace prior real server privacy acceptance.

Initial fixture script had a newline quoting error, corrected before measurements. A frame click did not activate the case; the current accessible native button did. Neither issue was reported as a product defect. An intermediate measurement array was discarded after an orchestration closure retained the old binding; final saved measurements use per-case returned arrays and contain all 24 intended cases.

108/108 non-writing STATIC/LOCAL suites, 11 Helpdesk race/mutation-boundary scenarios and build 31 HTML/464 references pass. Runtime publication scope is only `css/support.css` and `js/support.js` under CODEX-78. Private artifact directory: LOCALAPPDATA/PokemonStreamLink/security/codex153. No SQL, permissions, ticket/recovery action, provider, spending or APP stamp. Sora NO; Twinkle NO; PlayTester unchanged.

Follow-up visual reviews should check component bounds as well as page scroll width. Existing earlier shell evidence remains accurately scoped; it is not a blanket clipping certification.
