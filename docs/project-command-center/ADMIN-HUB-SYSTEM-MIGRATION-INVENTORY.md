# CODEX-198 — System migration inventory and local sequencing review

Source-only review of admin.html, js/admin-tools.js and js/admin.js. Protected legacy files were not edited or opened in an authenticated browser. No application endpoint or provider was invoked.

| Current tool | Existing path | Migration boundary |
| --- | --- | --- |
| Channel and Twitch app configuration | admin_save_channel; optional separate admin_save_twitch_client_secret | Owner configuration and secret writes; explicit authority and independent outcomes required. Never echo saved secrets. |
| Stream PC token | admin_issue_bridge_token | Credential issuance, not a status refresh. No token creation for inspection. |
| Bits | bits-connect Edge Function, Twitch OAuth, admin_bits_health/events/retry | Separate provider consent, read contracts and delivery retries. Retrying fulfillment is a mutation. |
| Asset hosting | admin_save_github_token | Owner credential storage; do not fetch credentials to populate a card. |
| Old Pass tools | admin_set_pass and admin_qa_grant_pass_reward | Do not copy self-grant QA controls into general System. Current Trainer Pass/Gifts are the audited destination. |
| Maintenance lock repair | admin_unlock_catch | Mutates transactional state; belongs in a bounded recovery workflow, not general health. |
| Staff roles | admin_set_role in Trainer tools | Authority changes need explicit role design; not a simple system status action. |

The legacy controller's refreshOverview calls admin_overview, a known write-risk path. Do not reuse it as a read-only System loader. Any future health-only slice must inspect a bounded read contract before implementation. No new System module is proposed for automatic publication.

## Confirmed local partial-save defect

The current channel form awaits a helper that catches channel-save failure without returning a result, then continues to the optional secret save. A fictional extracted-handler test confirms the second call and success status masking the first error. This is a sequencing/feedback defect; no permission bypass or actual partial production save is asserted.

A private candidate returns a boolean outcome and stops before the secret unless channel save and its refresh completed. Five local cases pass: full success, channel failure, refresh failure, secret failure and empty secret. No real values were used. Existing independent callers ignore the added return value. It does not make the two operations transactional; a later secret failure can still leave an already-saved channel, and must remain visibly reported.

Private baseline, candidate, review and test results: LOCALAPPDATA/PokemonStreamLink/security/codex198/. Evidence and normalized hashes: evidence/codex198-system-source-review.json. Candidate remains outside repository runtime and is not published. Publishing the credential-flow correction requires an owner decision under CODEX-RUNNER.md; no database/provider/credential mutation test is included. Rollback would restore only the unchanged baseline after checking the candidate hash, not restore credentials.

## Copy migration hazard

Legacy Live detection copy says Twitch LIVE starts the RPG automatically. The new reviewed Operations flow says LIVE permits an explicit staff Start. Do not carry the old wording into migrated System content. admin.html remains protected and unchanged.

Candidate follow-up: all 119 local/static regression suites pass with only test reads of js/admin-tools.js substituted by private candidate bytes. This is not hosted acceptance; the repository runtime remains unchanged. Full results stay private beside the candidate.
