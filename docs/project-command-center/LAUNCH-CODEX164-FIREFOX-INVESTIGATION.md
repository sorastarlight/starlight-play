# CODEX-164 — subscriber acceptance and Firefox investigation

October23,2026: owner explicitly reports ShinoTheWolf linked successfully and Starlight Pass active in Chrome. Record this as **HUMAN-REPORTED real ordinary-subscriber positive-path acceptance**. The agent did not invoke linking, subscription checks or claims, inspect the tester's account, or change their working connection. Browser/device versions and reload/token-refresh evidence were not supplied. This does not certify non-subscriber denial, expiration, refresh, Firefox, all providers or final launch.

## Firefox attribution remains unresolved

The tester previously reported no Twitch authorization popup in Firefox. Current source uses linkIdentity with skipBrowserRedirect followed by location.assign in the current tab, not window.open. Only IAB/MCP Apps are available through this session's browser controls; no Firefox surface is available. No real Firefox test was performed. Do not claim Firefox was fixed or conclusively defective.

A bounded read-only aggregate Auth-log review from16:00–16:28UTC found6manual_linking_disabled failures and1identity_linked event, alongside signup/confirmation activity. No browser/actor identifiers, email, token, IP or request URL were selected. These aggregates corroborate the known setting blocker but cannot attribute an individual event to Firefox or the tester. Chrome success followed CODEX-163 enabling manual linking; browser switch and configuration change are confounded. It is not established that popup protection caused the issue. Do not recommend weakening Firefox protections or clearing the working Chrome session.

## Separate local redirect-stall finding

The actual twitchOAuthUrl function fetches the SDK-generated OAuth URL with redirect:manual and awaits its response body before navigating. This extra probe has no timeout. A local VM executing the actual source confirms an unresolved probe leaves the helper unresolved even after the SDK supplied a valid URL. This is browser-independent failure potential, **not proof of the tester's Firefox root cause**. Rejecting the fetch is caught; a pending fetch is not.

A private candidate removes only that pre-navigation probe and its unused variable, leaving SDK linking/login selection, PKCE client setup, scopes, redirect target and skipBrowserRedirect unchanged.11actual-source/candidate local cases pass: current pending-probe reproduction; candidate link/login with pending/rejected/normal fake fetch, SDK errors and absent URL. No runtime source was edited or published. Candidate stays private at LOCALAPPDATA/PokemonStreamLink/security/codex164/candidate-function.js. It needs full integration review and a separate Auth-flow publication decision before installation; CODEX-78 does not authorize changing Auth flows. No approval is inferred from this investigation.

Evidence:evidence/codex164-provider-observation.json and evidence/codex164-oauth-local.json. Current auth.js fingerprint is retained in the observation. No SQL, provider setting, one-link policy, account mutation, consent, reward, spending or APP stamp occurred. CODEX-163's earlier explicit setting approval remains spent.

## Remaining readiness

Keep the successful ordinary-subscriber Chrome outcome rather than repeatedly asking for it. Firefox needs a real post-setting-change retry when convenient; fresh-account creation/unlinking is unnecessary. Collect a sanitized visible error/Firefox version if it fails, without URL tokens or passwords. Device/assistive evidence, remaining provider branches, authenticated Mart/Analytics acceptance and final configuration/go-no-go remain separate. Physical backup observation from CODEX-161 still postdates the latest recorded database correction; no new backend change or new backup-due condition arose here.

Follow-up preparation:full-file candidate and exact rollback/fingerprint manifest now retained privately in codex164.9additional LOCAL VM cases execute the actual link/login/reauthorization workflow functions from that full-file candidate with fake SDK/RPC/location.20total local cases pass. The current feature/main auth.js sources match. No runtime change or publication occurred. See private codex164/README.md.

Independent recovery-readiness follow-up:20reviewed SQL packet files still pass the read-only local integrity checker. Auth manual-linking configuration is now recorded separately as a recovery/rebuild dependency;database archives are not assumed to capture it. No export,restore or SQL execution performed. The provider matrix current row now reflects the human-reported Chrome positive result instead of stale no-integration-evidence wording.
