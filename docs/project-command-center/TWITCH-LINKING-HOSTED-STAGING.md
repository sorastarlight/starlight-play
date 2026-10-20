# Twitch policy — disabled hosted installation

CODEX-21, 2026-10-19 local / 2026-10-20 UTC. Owner explicitly approved disabled installation, aggregate conflict inspection and EmailQA-only testing. After installation the owner clarified no separate Twitch test accounts are available. **Provider QA is therefore unperformed; the policy remains disabled. The owner Twitch identity is not a substitute QA account.**

Installed migration records:

- `20261020010913` — `twitch_link_policy_disabled_guard`
- `20261020010922` — `twitch_verified_disconnect_disabled_staging`

Verified hosted state: `enabled=false`, `qa_user=NULL`, EmailQA policy inactive. Zero exceptions, zero disconnect requests and zero mutex rows. No QA enforcement was enabled; no provider link/unlink, sign-in, role promotion, trainer/economy mutation, email or gameplay call occurred.

The existing disconnect body was preserved under the private disabled-policy delegate with unchanged body MD5 `9eb6275c39191242b6789697a6e419ce`. Its exact execute ACL is stored for rollback. The public wrapper delegates to it while disabled. All four new private tables have RLS enabled and no authenticated SELECT/INSERT/UPDATE/DELETE grants. Anonymous prepare/exception execution is denied; the private legacy delegate cannot be executed by authenticated players. Read-only catalog preflight confirmed required existing helpers before installation.

Aggregate inspection only:3 application connection rows,3 Twitch Auth identities,1 trainer with multiple identities,0 cross-trainer numeric collisions,0 missing Auth/application counterparts and0 nonnumeric legacy connections. No individual legacy identity was selected for cleanup; existing links remain intact.

Security advisors were inspected. The four deny-by-default private tables produce expected informational “RLS enabled/no policy” findings. Authenticated `SECURITY DEFINER` RPC exposure produces generic warnings; these endpoints intentionally validate active actor/session and, where applicable, recent password/owner authorization. New functions have pinned search paths. Broader historical advisor findings remain unresolved; this is not a clean-project security verdict.

Supabase URL configuration was inspected read-only: existing allowlist has root, GitHub Pages root, admin, signin and reset-password URLs. No QA callback URL was added, no Auth configuration changed and no test provider redirect was attempted. EmailQA readiness inspection was limited to the authorized target and returned verified-email/password-configured booleans, no credentials.

Evidence: `evidence/twitch-policy-disabled-install.json`. Local coverage remains65 REAL LOCAL SQL checks and19 SYNTHETIC SDK/RPC checks; real provider callback semantics, final UI, full intent handling and legacy gameplay attribution remain incomplete. General activation, D86 and production gameplay remain held. Sora mutated NO; Twinkle mutated NO; PlayTester role unchanged; APPrc133.

Next independent work: issue #15 static Trainer UI cleanup. Do not request creation of extra Twitch accounts or use protected owner identities to bypass this QA limitation.
