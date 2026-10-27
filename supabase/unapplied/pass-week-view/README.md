# Pass weekly calendar and reward presentation

Status: locally implemented and tested; production installation/publication held for the exact decision.

The Mart presents one outer rewards panel: Monday–Sunday UTC calendar, today's Pass supplies, weekly bonus, and the existing free Trainer supply. Eligible missed days offer a confirmation to visit My PC Items. Crates retain their existing oldest-first opening order and must still be withdrawn into My Bag before use. Their original calendar day becomes claimed after its ledger state becomes opened. Unverified days are not called missed. Browser Back refreshes the restored Mart state.

The single-function SQL replacement adds seven bounded daily states to private.pass_period_wallet(uuid), using the existing trainer-scoped ledger. It changes no eligibility, grants, claim timing, crate handling, permissions or rows. INSTALL guards the captured function hash and ACL; ROLLBACK restores the exact definition with a candidate guard. No new endpoint/table is created.

Check subscription investigation: store.js rejects every session without provider_token before invoking refresh-pass. Deployed refresh-pass version7 already supports the confirmed broadcaster without that token and validates ordinary subscriber tokens server-side. The candidate removes only that premature browser rejection; the server still decides. It also restores the check's result message after rendering the refreshed panel. No provider credential, scope, server authorization or account changes are proposed. The last-24-hour log query returned no matching refresh-pass entries; this does not prove which path the user's browser took. No actual provider check was performed.

Reward claims now use one headline and sprite reward cards instead of repeating a joined item list three times. Existing confirmation/focus/motion mechanisms remain.

Validation:171 regression suites;13 new local PostgreSQL checks including exact rollback, repeat-install refusal, UTC boundaries, trainer isolation, missing verification and opened-crate calendar state. The replay also passed37berry/drop/overflow and24existing Pass checks. Four rendered widths320/390/768/1024had no horizontal overflow. Fictional claim reveal and missed-crate confirmation were exercised. Build validation passes; APP unchanged.

Production scope requested:one private function replacement and five frontend files: store.html, js/store.js, js/pass-calendar.js, js/play-present.js, css/play.css. Recheck the current source/ACL and deployed Edge contract first, then source-only verification. No live claims, grants, owner notices, provider invocation or gameplay testing.

Private rendered evidence and replay logs:C:/Users/FET/AppData/Local/PokemonStreamLink/security/pass-week-view/.
