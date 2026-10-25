# CODEX-234 — Gift confirmation wrapping

Valid 20-character trainer names caused internal horizontal overflow in gift confirmations at 320px and 390px. The recipient text made the review grid wider than its dialog. Two CSS rules scoped to the existing “Review staff action” dialog allow the grid and hero to shrink and long text to wrap. Gift payloads, quantities, permissions, transport and confirmation behavior are unchanged.

## Evidence

- REAL LOCAL DOM: 36 states across 320/390/768/1024px, PokéCoins/items/100-Pokémon batch, ordinary and maximum-length names, and clear-after-review. Six baseline internal overflows become zero; expected reviews open and cleared reviews stay closed.
- Native Escape closes the standalone review and restores enabled Review gift focus.
- LOCAL HARNESS: all 126 existing suites pass. Read-only feature build validates 31 HTML pages and 481 stamped references; APP stays 20261008-rc133.
- Private hash-guarded rollback refuses drift before writes and restores the exact baseline in an isolated file copy.

[Browser evidence](evidence/codex234-browser.json) · [regressions](evidence/codex234-regressions.json) · [scope](evidence/codex234-scope.json). Private fixture and rollback: Windows local security/codex234 outside Git.

Initial fixture runs omitted the batch capability and item selection; those runs were discarded. The final 36-state baseline/candidate use valid quantities and selections and assert every expected review exists. All transport data is fictional, preview submission is disabled, network connections are blocked, and no grant transport exists. No hosted navigation/notices, gifts, application reads or protected-account action ran. Sora NO; Twinkle NO; PlayTester unchanged. Real device/assistive/provider acceptance remains separate.

Routine one-CSS publication fits CODEX-78; exact main diff and static deployed-source verification follow.

## Publication verified

CODEX-234 gift confirmation wrapping is published at main **5aa6b86c**, Pages **40184787606 succeeded**;100monitored+one versioned source match. Two scoped CSS rules fix six long-name overflow cases. All36local states,126suites,feature31HTML481refs and isolated main30HTML479refs validation pass. APP20261008-rc133 unchanged. Gift quantities,payloads,permissions and behavior stay unchanged;no hosted gift/application call. [Static source evidence](evidence/codex234-publication.json). Feature implementation347f0161;exact one-CSS main publication.
