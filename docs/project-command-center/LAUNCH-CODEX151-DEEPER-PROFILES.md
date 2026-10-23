# CODEX-151 — Populated profiles and nested Trainer records

Continued the owner-requested visual review using actual controllers and presenters on loopback, fictional data, removed SDK/config scripts, CSP `connect-src 'none'`, and a strict fictional read map. Unknown/mutating RPCs are refused. No hosted account, notice, staff or gameplay endpoint was called.

## Corrections

- Populated achievement completion chips, ribbon reward buttons, public featured-ribbon buttons and journal tabs now have 44 px mobile targets. Initial measurement caught a later chip rule overriding the first candidate; the final selector matches its specificity.
- Public Trainer pages use neutral “Trainer ID” and “Team” headings. The returned owner flag retains “My Trainer ID,” “My Team” and the customize link for the owner. Before the response arrives, copy remains neutral. No ownership or access decision changes.
- Nested staff Pokémon details resolve known ball codes/aliases to friendly names and expand known gender values. Unknown values remain escaped; missing values remain unavailable. This introduces no network, permissions or gameplay logic.

## Evidence

24 completed-load populated/empty/error cases for public Trainer and Achievements at 1280/768/390/320 CSS px, plus 16 nested staff record cases: stored battle data, coin detail, locked background and connection diagnostics. Final cases have no document-wide overflow or measured visible mobile controls below 44 px. One additional fictional owner view confirms owner-specific headings.

The enriched staff fixture includes HP 0/32, an IV of zero, zero EVs and a missing Defense IV. The actual table preserves the distinction. Fixture public ID/date/showcase fields were corrected to the existing presenter contract before final measurements; their initial fallback values were not product defects. Research hidden-row text is fictional placeholder copy, not evidence of a server disclosure.

Known-ball labeling reproduced as a failing actual-renderer test before correction. Final 107/107 non-writing STATIC/LOCAL suites and build 31 HTML/464 references pass. Existing exact-copy test updated for the neutral fallback; behavior tests verify public headings, current-team inspection, escaping, missing values and authority boundaries. Initial 106/107 was the old copy expectation, before publication.

Exact runtime publication scope: `css/play.css`, `js/admin-next-record.js`, `js/trainer.js`, `trainer.html`. Private fixtures, measurements and screenshots: LOCALAPPDATA/PokemonStreamLink/security/codex151. No SQL, Auth/provider settings, rewards, player mutation, spending or APP stamp. Sora NO; Twinkle NO; PlayTester unchanged. This is routine maintenance, not completion of the remaining Admin Hub workflow migrations or real device/provider acceptance.

Published exact4runtime files to mainee54b763;Pages39954449578success.100monitored+4changed versioned sources match. Initial versioned admin-next-record.js returned HTTP503;focused retry returned200/exact bytes. Original transient recorded in evidence/codex151-publication.json.
