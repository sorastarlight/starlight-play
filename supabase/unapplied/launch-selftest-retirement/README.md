# CODEX-44 — Historical self-test permission retirement

Prepared under the owner's continuation of launch security work. Six historical private self-tests have no current site/Edge Function/database-routine callers. Their default PUBLIC EXECUTE also permits anon/authenticated roles; private is not exposed via PostgREST, so this is unnecessary privilege and defense-in-depth work, not evidence of a directly callable public endpoint. The Bits test writes synthetic events and the special-event test exercises privileged paths/JWT claims. Neither should be accessible to browser roles.

INSTALL.sql pins exact six source hashes and original null ACLs, and a catalog hash covering every other public/private routine. It removes PUBLIC/anon/authenticated EXECUTE and explicitly preserves service_role's already-effective EXECUTE. Function bodies, owner privileges and all unrelated function attributes stay unchanged. No self-test body is invoked; no trainer/configuration/economy/encounter data is changed. This is a permission reduction, not a new feature, scheduler, staff-role change or permission expansion.

27 REAL LOCAL SQL checks pass: source/ACL drift refusal, three denied roles including inherited membership across all six exact definitions, source/backend preservation and unrelated catalog invariance. These are local checks with fictional roles; no production write-risk RPC testing. A routine still readable in source is not a browser execution permission.

Emergency restoration is not automatic: regranting PUBLIC EXECUTE would reopen unwanted privileges. If a real required caller is later found, review and grant only that trusted caller instead. Keep existing source functions for operator reference; do not rerun historical self-tests on production as validation.
