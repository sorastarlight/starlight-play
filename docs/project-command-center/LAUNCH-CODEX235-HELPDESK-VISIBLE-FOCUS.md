# CODEX-235 — Helpdesk populated states and visible focus

Loading older messages focused the conversation heading while explicitly preventing scrolling. In the native local check the focused heading was 1,573px above the viewport, leaving keyboard users looking at a different part of the conversation. The one-expression correction permits the browser to bring the existing focus target into view. After Enter on Older messages, the heading is focused at173px in the720px viewport and the oldest returned message appears first.

## Scope and evidence

- Runtime: only js/support.js, replacing the heading's focus({preventScroll:true}) with focus(). No request, permission, message, mutation, retry or account-state logic changes. Routine accessibility maintenance fits CODEX-78.
- REAL LOCAL DOM: 24 populated states across320/390/768/1024px × player/staff/nonstaff-read-only × first/older pages.120-character unbroken subjects,100-character references and near-limit long messages fit without horizontal overflow. HTML-like bodies remain literal text with no injected image/script nodes. Older messages remain ordered and exhausted cursor removes the paging button. Staff controls/fixture internal-note styling and nonstaff/read-only controls match their modes.
- Native Enter: existing heading remains the focus target and is now visibly on screen after older-page load. Screenshot retained privately. Multi-iframe measurements are layout evidence,not native focus certification.
- LOCAL HARNESS:11existing support loading/race cases pass;all126regression suites pass. Feature read-only build31HTML481refs;APP20261008-rc133 unchanged.
- Private rollback tested on an isolated file:drift refused before writes and exact baseline restored.

[Rendered/scope evidence](evidence/codex235-helpdesk.json) · [126 suites](evidence/codex235-regressions.json). Private fixture/security/codex235 stays outside Git. An initial fixture auto-mounted player mode before remounting staff;the final run uses a separate host and asserts exactly one fictional list call per state.

No hosted app navigation/notices,calls,tickets/replies,transitions,triage,recovery mail or protected-account mutation. Source review confirms the browser renders only messages returned by the backend;the fictional player data intentionally excludes internal notes,so this does not repeat hosted privacy acceptance. Sora NO;Twinkle NO;PlayTester unchanged. Real device/assistive/provider requirements remain open. Exact one-file publication and deployed static source verification follow.
