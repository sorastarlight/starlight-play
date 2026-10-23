# CODEX-132 — Bridge token and command boundaries

A catalog navigation scan identified public definer wrappers whose bodies do not contain the common actor/staff helper names. The scan is a heuristic,not a vulnerability count. Five bridge endpoints instead rely on the shared bridge token check. Their exact source plus token/SHA256 helper definitions were captured without invoking any endpoint or reading a real token/configuration row.

Seventeen REAL LOCAL boundary groups pass,including30invalid-token requests across all5endpoints. Null,blank,mismatched,case-altered and whitespace-altered credentials return42501before command,heartbeat or grant writes. Missing configuration row,null hash and malformed hash fail closed. Tests execute actual token hashing with local pgcrypto and only a fictional secret.

Valid fictional credentials exercise bounded8-command pulling,no reclaim of running rows,overlapping pulls with distinct command IDs,locked-row skipping,selected completion/result truncation and bounded error recording. The old catch-import endpoint stays inert even with a valid fixture credential. A grant test uses an instrumented helper;publish intentionally stops at a fictional settlement boundary and its statement rollback preserves heartbeat state. Neither proves actual bridge/provider,round settlement,retired-import rollout or full economy behavior.

No new confirmed defect in this scope. Private exact sources/harness:LOCALAPPDATA/PokemonStreamLink/security/codex132/bridge.cjs. Fictional minimal tables/collaborator helpers;no real secret,bridge heartbeat,command,grant,encounter or external service invoked. Loopback cluster stopped and fixture removed. No production SQL/Auth/provider/credential/player/role/email/spending/scheduling/APPstamp/final launch action. Sora NO;Twinkle NO;PlayTester role unchanged.

Evidence:evidence/codex132-bridge-boundaries.json. Main150c69e6/Pages39881130370and106-suite prior frontend evidence unchanged. Recovery schema-only forward/reverse9-delta proof is CODEX-131;physical backup/full Auth/storage restore still unverified. Required real acceptance remains open;Twitch testing remains held.
