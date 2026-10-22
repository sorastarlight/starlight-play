# CODEX-119 — automatic recovery packet integrity

Recovery packets now have a local, read-only integrity check integrated into `node tools/validate-build.js`. Run it separately with `node tools/check-recovery-packets.js`. It reads files only; it never connects to Supabase, executes SQL, restores data or changes credentials.

The manifest `recovery-packets.json` pins both INSTALL and ROLLBACK files for all five documented post-drill migrations: CODEX-73, both CODEX-96 migrations, CODEX-116 and CODEX-118. The check validates raw SHA256, LF bytes, safe workspace paths, unique chronological migration versions, complete install/rollback pairs, and agreement with the recovery delta inventory. When a newly approved delta is documented, its reviewed packet hashes and migration version must be added to the manifest. Never regenerate hashes merely to silence unexplained drift.

Twenty LOCAL filesystem cases pass, covering successful loading and rejection of content/EOL drift, missing files, malformed metadata, duplicate/traversing paths, incomplete pairs, wrong migration order/version and inconsistent inventory coverage. All 10 actual packet files pass, including copies reconstructed through Git checkout-index. The older configuration-access packet lacked explicit LF rules; both paths are now pinned. Their bytes still match original commit dc8e1c7d exactly. No SQL source changed. Evidence: `evidence/codex119-recovery-integrity.json`.

Build validation passes for 31 HTML pages and 464 first-party references. The latest full frontend regression run remains the 100 suites in CODEX-114; no unchanged full rerun or new real-device/provider acceptance is claimed. The new filesystem suite is `node tests/recovery-packet-integrity-tests.js`; it removes its temporary fictional fixture after execution.

An independent read-only catalog check confirms `profiles_username_lower_uidx` uniquely indexes lower(username) for non-null usernames. This is source/index evidence, not an account mutation, concurrent signup test or broad Auth certification.

No production runtime, SQL, grants, account/player records, provider, email, spending, scheduling, APP stamp or final launch action. Sora and Twinkle were not mutated; PlayTester permissions unchanged. Main remains 739fbc19. Twitch testing stays held, real mobile/assistive acceptance remains required, and older recovery snapshots still need their matching guarded deltas. Packet integrity is not a new backup or physical restore certificate.

Two additional child-process tests verify the standalone CLI and actual build entry point both exit unsuccessfully on fictional packet drift, before unrelated build steps. Total20local filesystem/CLI cases.
