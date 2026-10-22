# CODEX-83 — Private asset uploader review

Read-only deployed source/catalog review found two confirmed upload-boundary defects. Baseline reproduced and a narrow candidate/rollback prepared outside Git in LOCALAPPDATA/PokemonStreamLink/security/codex83.21 LOCAL mocked actual-handler checks pass;no real upload,GitHub write,credential read,account mutation or hosted endpoint invocation. Details held privately until remediation.

Production correction requires explicit owner authorization under streamlink-project.mdc/CODEX-RUNNER.md because it changes server upload authorization. Routine frontend publication scope does not authorize it. No deployment or SQL performed. Final security/launch review remains held pending the decision and other recorded limits.

## Approved correction verified

Owner approved deploying the single-function candidate. Baseline4 exact source/JWT checked before deployment;store-asset5 ACTIVE retrieved afterward with verify_jwt=true and exact candidate SHA2563b6303df53bf911ddd44f570bf0a9655f2d8c89da80971db6ad8842ab5578753. No uploader invocation,GitHub upload,credential value read or account change.

Upload permission now requires the existing server-derived canEdit===true decision from caller-scoped admin_user_account before credential access/GitHub requests. This aligns owner/admin permission with admin_store_register_asset;catalog-only moderator access no longer authorizes a GitHub write. Filename shortening now preserves the allowed raster extension and truncates only the stem;long double extensions cannot become HTML filenames. Normal item/trainer/portrait paths and existing MIME/size limits retained. No full image decoding/content safety claim.

21 actual-handler mocked cases pass;91 STATIC/LOCAL suites and build31HTML464refs pass. APP20261008-rc133 unchanged. Corrected source/tests tracked after remediation;private baseline reproduction/rollback retained outside Git. Source verification is not a real upload integration test. Sora NO;Twinkle NO;PlayTester role unchanged. Evidence:evidence/asset-upload-codex83-hosted.json;evidence/codex83-regressions.json.
