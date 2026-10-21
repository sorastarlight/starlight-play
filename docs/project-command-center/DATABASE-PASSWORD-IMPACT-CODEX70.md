# CODEX-70 - Database password reset impact audit

READ-ONLY audit for starlight-play,dtflmlbjhttoewqgkujf. Owner authorizes checking connections only;current password must remain unchanged. No reset,credential replacement,decryption,native authentication retry,export,restore,job execution or production configuration change occurred. No credential values were printed. Evidence: evidence/database-password-impact-codex70.json.

## What would need updating

| Component | Finding | Manual action after a separately approved reset |
|---|---|---|
|Local recovery preflight|Only confirmed local consumer of the project's postgres password. Uses the existing outside-Git DPAPI-protected credential and verified-TLS session pooler. Prior stored value was rejected and stays inactive.|Human enters the new current password locally through prepare-local-recovery-access.ps1 -ReplaceStoredCredential;then separately run the read-only preflight after permission to resume native access. No password in chat or Git.|
|Frontend/Admin Hub|Static GitHub Pages site;Supabase HTTPS client URL/API key. No native Postgres URI in js/config.js. Local .env.local contains only SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.|No database-password replacement identified. Preserve API keys and Auth configuration.|
|Nine deployed Edge Functions|All current deployed sources inspected:Supabase JS clients and URL/anon/service-role environment keys. No native Postgres URL/driver/socket marker. Names,versions and source findings in evidence.|No application database-password setting identified. Do not rotate unrelated API,Twitch or SMTP keys.|
|MixItUp bridge and Bits helper|Sibling source uses urllib HTTPS REST RPC. Data/play-bridge.json keys are supabaseUrl,supabaseKey,token;project matches;no native Postgres URI. Bridge dependencies and .miucommand sources have no native DB marker.|No bridge credential update identified. Preserve its API key/token and do not restart or trigger commands merely to test.|
|GitHub publication|Pages serves main/root with managed legacy build. Repository and github-pages environment both return no Actions secrets or variables. No checked-in custom deployment workflow.|No DB secret found to update.|
|Supabase managed services|Active internal service roles and three local-target postgres cron jobs observed. Supabase documents automatic managed-service password propagation.|No manual internal credential edit proposed;verify service/cron health afterward.|
|Local SQL rehearsals|A19 scripts pin loopback and reject hosted project targets. Their test credentials belong to fictional embedded databases.|No update;never replace fictional rehearsal credentials with production credentials.|
|CLI connection cache|supabase/.temp/pooler-url references this project and contains no embedded password.|No stored password in that URL to replace.|

## External-client limits

No PostgreSQL variables were found in the current process or persistent Windows User/Machine environment names. Standard pgpass,pgAdmin database,DBeaver General data-source and project VS Code settings paths were absent. No psql/pg_dump/pg_restore/DBeaver/pgAdmin/DataGrip process or established local TCP connection to5432/6543 was observed. The database-side snapshot showed no additional postgres client backend beyond this read-only connector inspection;internal pg_net is not an external password consumer.

This is not proof that no disconnected computer,alternate desktop profile,scheduled task,external CI/provider or manually saved connection exists. Such native clients using the postgres role would need their stored password updated before reconnecting. Application names/IP addresses/query text/password hashes and actual secret values were not exported. One active bridge lock file could not be read and was skipped;bridge source/config inspection did not require it. No process was stopped.

## Proposed sequence - not executed or authorized by this audit

1. Owner separately decides to reset the database password and performs the dashboard entry/confirmation. Save it in their password manager. Only the database password changes;no JWT/API/provider/SMTP credential rotation.
2. Owner supplies the new current password to the existing secure local helper,using -ReplaceStoredCredential. The helper preserves the rejected prior blob and stores the replacement under the current Windows user outside Git.
3. With native access resumed explicitly,verify TLS and a read-only native login against the pinned project;stop on mismatch or failure rather than reset again.
4. Verify browser Data API/account-page access,connector access,Edge Function health and future scheduled cron successes. Inspect bridge heartbeat/read-only status;do not generate gameplay or reissue its token. Sending an email,granting rewards or launching encounters is not part of password verification.
5. Only then resume the separately approved bounded recovery drill. No claim that an unchanged-password audit completes recovery validation.

Supabase's [Postgres Roles documentation](https://supabase.com/docs/guides/database/postgres/roles#changing-your-project-password) says managed services update automatically while external username/password clients require manual updates. Its [connection guide](https://supabase.com/docs/guides/database/connecting-to-postgres) distinguishes frontend API access from native connection strings. The [reset troubleshooting guide](https://supabase.com/docs/guides/troubleshooting/how-do-i-reset-my-supabase-database-password-oTs5sB) notes possible transient shared-pooler authentication failures after rotation;do not interpret one immediate failure as permission for repeated password changes.

No production password,player data,permissions,Auth policy,SMTP setting,APP stamp,job or bridge process changed. Sora NO;Twinkle NO;PlayTester role unchanged.
