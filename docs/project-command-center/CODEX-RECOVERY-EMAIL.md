# Owner recovery email — CODEX-12

The owner accepted continuing the recovery work, requested customized Supabase email and asked to investigate the GoDaddy domain. This slice adds the guarded email-request boundary and recipient-browser recovery support. **Staff sending is disabled** until delivery, receipt retention/privacy and dedicated end-to-end QA are resolved. No actual mail was sent or password changed.

## Implemented

- Owner-only prepare/confirm flow; verified Auth getUser, current database owner role, an existing unexpired Auth session and a signed AMR password/OAuth/TOTP/WebAuthn authentication event within five minutes. Token refresh alone cannot satisfy freshness. Challenges bind actor, session, target and HMAC revision for five minutes.
- Server-selected existing verified email only. No destination editing or caller redirect. Protected targets remain blocked. Auth details rechecked immediately before dispatch. No credentials, recovery links or full email in staff responses or audit rows.
- Private RLS-protected challenge/receipt/settings tables, no client table grants. Durable reservation precedes external dispatch. Request UUID is bound to actor/target/challenge/reason/case reference; modified replay fails. One challenge can dispatch once. Service-only finalization; no claim of delivery from provider acceptance.
- Global serialized reservations; 60-second actor/target cooldown, three requests per actor per hour and two per target per hour. Dispatching/uncertain outcomes block new target sends pending investigation. No automatic retry or background sender is installed. The receipt records are audit history, not a queued worker. Retention remains an activation prerequisite; no personal recovery records have been created.
- Recipient links use a one-use recovery token hash in a fragment. The page captures and scrubs it before third-party assets load, waits for explicit Continue, verifies via Auth verifyOtp(type=recovery), and keeps the resulting session in memory. Existing PKCE resets remain supported; implicit bearer fragments and other token types remain rejected. No staff-created session enters Play.
- Branded lilac/pearl reset-email source at supabase/templates/recovery.html; sanitized visual preview at design-reset/recovery-email-preview.html. Hosted template installed after verified publication of recipient support; full editor source matched the repository before save, and Supabase confirmed the save. Subject: Reset your Trainer Account password. Previous template retained as recovery.previous.html.

## Hosted evidence

- Applied migration 20261019122815_owner_recovery_email_guarded_disabled from supabase/owner-recovery-email.sql. Settings enabled=false; zero challenges and zero receipts verified.
- owner-recovery-email Edge version 1 ACTIVE, verify_jwt=true; all three deployed files match checkout. Unauthenticated POST returns HTTP 401. No real target invoked.
- Security advisors: private RLS tables intentionally have no direct policies/access; owner-gated SECURITY DEFINER entries are intentional. [RLS advisory](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [function advisory](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
- Dashboard access supplied by owner: original reset template used ConfirmationURL. Custom SMTP is not configured. Original Site URL was http://localhost:3000; corrected to https://play.sorastarlight.net/. Added exact signin.html and reset-password.html redirects, preserving the three existing entries. Verified five total URLs after save.
- Public sorastarlight.net DNS: GoDaddy nameservers ns37/ns38.domaincontrol.com; no MX, root SPF or _dmarc TXT record observed. No GoDaddy/DNS edits or purchases. Owner attempted sign-in, but GoDaddy rejected the embedded browser as unusual. No regular-browser connection is available to inspect purchased email products; product entitlement remains unknown.

## Validation and limits

75 nonwriting static suites/build passed; APP remains 20261008-rc133. 23 disposable real PostgreSQL authorization/replay/cooldown checks, 13 synthetic email-boundary checks and 20 reset checks (including actual SDK with mocked HTTP). Browser fixtures verified explicit recipient Continue and staff confirmation with reason plus truthful acceptance feedback. No hosted email, real password, protected trainer or gameplay test occurred. D86, WIRE/Familiarity activation, build stamps and spending remain excluded.

Supabase's default test mailer is team-address-only and currently limited to two messages per hour. Production delivery requires custom SMTP; Supabase still owns Auth and templates. [Official SMTP documentation](https://supabase.com/docs/guides/auth/auth-smtp). Domain ownership alone does not provide mail transport.

Publication: 08cd43b7, Pages run 39252515663 succeeded; all four reset/sender application files checked against served content. A preview-only fixture query suffix initially failed the strict build checker and was corrected in 08cd43b7; all 75 suites/build then passed. No production APP stamp changed.

Next: inspect existing GoDaddy email entitlement using the owner's regular browser or supplied product name; choose an existing suitable sender without spending. Do not enable the staff sender until SMTP and isolated live QA/receipt policy are resolved.

Live boundary smoke: unauthenticated POST HTTP 401; OPTIONS booted the deployed handler and returned HTTP 204 with the exact production CORS origin and no-store. No target or Auth user lookup was used for that smoke.

## SMTP prerequisite resolved

CODEX-13 connected Resend after the owner added DNS and confirmed scoped credential creation/storage. See RESEND-SMTP-CONNECTION.md for persisted settings and one provider simulator Delivered event. This supersedes the earlier absent-SMTP snapshot only; staff sends remain disabled pending actual Supabase Auth recovery QA and receipt-retention/privacy resolution.

## CODEX-15 staged lifecycle safeguards

Owner authorized completing recovery and continuing helpdesk. Public EmailQA recovery succeeded per ACCOUNT-EMAIL-TEMPLATES.md. Staff path remains disabled. owner-recovery-retention.sql is source only, not applied: unset retention fails gate closed, optional qa_target constrains gate/prepare/reserve to EmailQA during rollout, prune function never removes uncertain/dispatching receipts and is not client-callable. Expanded local harness29 checks passed. No scheduled cleanup installed; hosted pg_cron absent. Owner retention choice and fresh owner authentication are pending, so no real staff email or activation attempted. Next apply approved policy with actual cleanup scheduling, enable EmailQA-only, verify one actual privileged send and replay, then activate general eligible targets after successful evidence. No global owner sign-in bypass or role promotion.
