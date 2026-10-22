# Real provider acceptance prerequisites — CODEX-103

Requirement is real acceptance before launch (CODEX-100), not a new test authorization. No provider/account/credential action has been executed here.

## Identity and branch coverage

refresh-pass version7 has an intentional trusted broadcaster-ID exemption. When the trainer's confirmed Twitch numeric ID matches the configured broadcaster ID, it saves broadcaster entitlement and returns before token validation/subscription lookup. That branch can verify broadcaster behavior but cannot prove ordinary subscriber/non-subscriber integration. Do not label a channel-owner-only check as a real subscriber test.

Ordinary subscription-path evidence needs an existing controlled, confirmed non-broadcaster Twitch identity and its legitimate consent/token context. The owner previously said extra Twitch test identities are unavailable; do not ask them to manufacture accounts again. A willing real reviewer with an existing account is an access prerequisite, not implicit permission to message anyone or link their identity. No token/password should enter chat, repository or logs.

For each future packet, pin the exact trainer/confirmed identity, expected subscription state, single UI action, possible profile Pass/source/check timestamp writes, preserved staff override, maximum attempts and failure stops. Protected owner identity requires its own explicit approval; it does not solve the ordinary-identity coverage gap. No unlink/relink/exception, reward claim/grant, reset or automatic retry is included. Keep the new one-link policy disabled.

## Other provider paths

Real OAuth consent/refresh requires the user/reviewer to handle sign-in/consent. Signed EventSub/Bits receipt checks may affect real economy or need provider delivery; do not synthesize production events or buy Bits. Asset-uploader acceptance writes GitHub/assets; requires an exact harmless image/destination/cleanup packet and explicit bounded approval before any upload. Existing handler mocks/source/JWT verification remain useful separate evidence.

Prepare concrete packets once access exists. Current full real-provider requirement is retained; neither inability to access an identity nor another mock run counts as acceptance. This document grants no protected-account, provider, upload, gameplay, spending or final-release authority.

CODEX-106 update:owner explicitly reports no tester available currently. Treat ordinary subscriber acceptance as blocked on access;do not repeatedly ask the same availability question. No launch deferral or protected identity permission follows.
